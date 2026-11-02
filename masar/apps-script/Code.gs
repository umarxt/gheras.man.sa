/**
 * منصة أسئلة مسار — يستقبل أسئلة المشاركين ويحفظها في هذا الملف (قوقل شيتس)،
 * ويخدم لوحة الإدارة (اعتماد/حذف/رد) وقائمة الأسئلة المنشورة.
 *
 * السرية: لا يحفظ هذا السكربت أي شيء عن المرسل. Apps Script لا يعطي السكربت عنوان IP
 * ولا هوية الزائر، والموقع يرسل بلا ملفات تعريف. المحفوظ هو نص السؤال ووقت وصوله فقط.
 *
 * طريقة التركيب في masar/README.md
 */

// ===================== الإعدادات =====================
const SETTINGS = {
  // رمز المدير المعتمد: يرى الأسئلة الجديدة ويعتمدها أو يحذفها (غيّره قبل النشر)
  SUPERVISOR_CODE: 'masar-admin-2026',
  // رمز مدير الرد: يرى الأسئلة المعتمدة ويكتب الرد ويرسله (غيّره قبل النشر)
  RESPONDER_CODE: 'masar-reply-2026',
  // بريد يصله تنبيه عند وصول سؤال جديد (اتركه فارغا لإيقاف التنبيه)
  // التنبيه لا يحوي أي معلومة عن المرسل، فقط أن سؤالا جديدا وصل
  NOTIFY_EMAIL: '',
  MAX_QUESTION: 600,
  MAX_ANSWER: 3000,
  // حماية: أقصى عدد للأسئلة الجديدة في الساعة (من الجميع) لمنع الإغراق
  MAX_NEW_PER_HOUR: 300
};

const SHEET = 'الأسئلة';
const HEADERS = ['المعرف', 'وقت الوصول', 'السؤال', 'الحالة', 'وقت الاعتماد', 'الرد', 'وقت النشر', 'نص السؤال قبل التعديل'];
const COL = { id: 1, created: 2, q: 3, status: 4, approved: 5, a: 6, published: 7, original: 8 };
const S = { NEW: 'جديد', APPROVED: 'معتمد', PUBLISHED: 'منشور', DELETED: 'محذوف' };
const PUBLISHED_CACHE = 'published-v1';

// ===================== التهيئة (شغّلها مرة واحدة) =====================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss);
}

function ensureSheet(ss) {
  let sh = ss.getSheetByName(SHEET);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET, 0);
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#15463F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  sh.setColumnWidth(COL.id, 110);
  sh.setColumnWidth(COL.created, 150);
  sh.setColumnWidth(COL.q, 420);
  sh.setColumnWidth(COL.status, 90);
  sh.setColumnWidth(COL.approved, 150);
  sh.setColumnWidth(COL.a, 420);
  sh.setColumnWidth(COL.published, 150);
  sh.setColumnWidth(COL.original, 300);
  sh.getRange('A:H').setWrap(true).setVerticalAlignment('top');
  sh.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('E:E').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('G:G').setNumberFormat('yyyy-mm-dd hh:mm');
  const rule = SpreadsheetApp.newDataValidation().requireValueInList([S.NEW, S.APPROVED, S.PUBLISHED, S.DELETED], true).build();
  sh.getRange(2, COL.status, 1000, 1).setDataValidation(rule);
  const rng = sh.getRange(2, 1, 1000, HEADERS.length);
  const color = (status, bg) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$D2="' + status + '"').setBackground(bg).setRanges([rng]).build();
  sh.setConditionalFormatRules([color(S.NEW, '#EAF4EF'), color(S.APPROVED, '#E6EEF5'), color(S.DELETED, '#F3F3F3')]);
  return sh;
}

// ===================== نقاط الاستقبال =====================
function doGet() {
  return json({ ok: true, service: 'masar-questions' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'ask': return json(ask(body));
      case 'published': return json(published());
    }
    // ما بعد هذا يحتاج رمز الإدارة
    const role = roleOf(body.code);
    if (!role) return json({ ok: false, error: role === null ? 'محاولات كثيرة، حاول بعد ١٠ دقائق' : 'رمز الدخول غير صحيح' });
    switch (body.action) {
      case 'login': return json({ ok: true, role: role });
      case 'list': return json(list(role));
      case 'approve': return json(role === 'supervisor' ? approve(body) : denied());
      case 'delete': return json(role === 'supervisor' ? remove(body) : denied());
      case 'unapprove': return json(role === 'supervisor' ? unapprove(body) : denied());
      case 'answer': return json(role === 'responder' ? answer(body) : denied());
    }
    return json({ ok: false, error: 'طلب غير معروف' });
  } catch (err) {
    return json({ ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function denied() { return { ok: false, error: 'هذا الإجراء غير متاح لصلاحيتك' }; }

// يرجع الدور، أو '' إن كان الرمز خاطئا، أو null إن تجاوزت المحاولات الخاطئة الحد (حماية من التخمين)
function roleOf(code) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 20) return null;
  code = String(code || '').trim();
  if (code && code === SETTINGS.SUPERVISOR_CODE) return 'supervisor';
  if (code && code === SETTINGS.RESPONDER_CODE) return 'responder';
  cache.put('fails', String(fails + 1), 600);
  return '';
}

// ===================== المشاركون =====================
function ask(body) {
  if (String(body.website || '')) return { ok: true }; // فخ البرامج الآلية: نتجاهل بصمت
  const q = clean(body.question);
  if (q.length < 5) return { ok: false, error: 'اكتب سؤالك أولا' };
  if (q.length > SETTINGS.MAX_QUESTION) return { ok: false, error: 'السؤال أطول من الحد المسموح' };

  const cache = CacheService.getScriptCache();
  const hourKey = 'n-' + Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyMMddHH');
  const n = Number(cache.get(hourKey) || 0);
  if (n >= SETTINGS.MAX_NEW_PER_HOUR) return { ok: false, error: 'المنصة مشغولة الآن، حاول بعد قليل' };
  cache.put(hourKey, String(n + 1), 3700);

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet(SpreadsheetApp.getActiveSpreadsheet());
    // المعرف عشوائي ولا يرتبط بالمرسل ولا بالوقت
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    // الوقت يحفظ مقربا لأقرب ١٠ دقائق حتى لا يربط أحد السؤال بلحظة إرساله
    const t = new Date(Math.floor(Date.now() / 600000) * 600000);
    sh.appendRow([id, t, q, S.NEW, '', '', '', '']);
  } finally {
    lock.releaseLock();
  }
  if (SETTINGS.NOTIFY_EMAIL) {
    try {
      MailApp.sendEmail(SETTINGS.NOTIFY_EMAIL, 'منصة مسار: سؤال جديد',
        'وصل سؤال جديد إلى منصة أسئلة مسار، ادخل لوحة الإدارة لمراجعته.');
    } catch (e) { /* التنبيه اختياري */ }
  }
  return { ok: true };
}

function published() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(PUBLISHED_CACHE);
  if (hit) return JSON.parse(hit);
  const items = rows()
    .filter(r => r.status === S.PUBLISHED && r.q && r.a)
    .sort((a, b) => b.publishedMs - a.publishedMs)
    .map(r => ({ id: r.id, q: r.q, a: r.a, at: r.published }));
  const out = { ok: true, items: items };
  const s = JSON.stringify(out);
  if (s.length < 95000) cache.put(PUBLISHED_CACHE, s, 60);
  return out;
}

// ===================== الإدارة =====================
function list(role) {
  const all = rows();
  const pick = r => ({ id: r.id, q: r.q, status: r.status, created: r.created, approved: r.approved });
  return {
    ok: true,
    role: role,
    fresh: role === 'supervisor' ? all.filter(r => r.status === S.NEW).sort((a, b) => a.createdMs - b.createdMs).map(pick) : [],
    approved: all.filter(r => r.status === S.APPROVED).sort((a, b) => a.approvedMs - b.approvedMs).map(pick)
  };
}

function approve(body) {
  return withRow(body.id, S.NEW, (sh, row, r) => {
    const edited = clean(body.question);
    if (edited) {
      if (edited.length > SETTINGS.MAX_QUESTION) return { ok: false, error: 'السؤال أطول من الحد المسموح' };
      if (edited !== r.q) {
        sh.getRange(row, COL.original).setValue(r.q);
        sh.getRange(row, COL.q).setValue(edited);
      }
    }
    sh.getRange(row, COL.status).setValue(S.APPROVED);
    sh.getRange(row, COL.approved).setValue(new Date());
    return { ok: true };
  });
}

// إلغاء الاعتماد: يرجع السؤال إلى «جديد»، ويستعيد نصه الأصلي إن كان المدير عدّله عند الاعتماد
function unapprove(body) {
  return withRow(body.id, S.APPROVED, (sh, row) => {
    const original = String(sh.getRange(row, COL.original).getValue() || '');
    if (original) {
      sh.getRange(row, COL.q).setValue(original);
      sh.getRange(row, COL.original).setValue('');
    }
    sh.getRange(row, COL.status).setValue(S.NEW);
    sh.getRange(row, COL.approved).setValue('');
    return { ok: true, q: original || undefined };
  });
}

function remove(body) {
  return withRow(body.id, S.NEW, (sh, row) => {
    sh.getRange(row, COL.status).setValue(S.DELETED);
    return { ok: true };
  });
}

function answer(body) {
  const a = clean(body.answer);
  if (a.length < 2) return { ok: false, error: 'اكتب الرد أولا' };
  if (a.length > SETTINGS.MAX_ANSWER) return { ok: false, error: 'الرد أطول من الحد المسموح' };
  const res = withRow(body.id, S.APPROVED, (sh, row) => {
    sh.getRange(row, COL.a).setValue(a);
    sh.getRange(row, COL.status).setValue(S.PUBLISHED);
    sh.getRange(row, COL.published).setValue(new Date());
    return { ok: true };
  });
  if (res.ok) CacheService.getScriptCache().remove(PUBLISHED_CACHE);
  return res;
}

// ===================== أدوات =====================
function withRow(id, expected, fn) {
  id = String(id || '');
  if (!id) return { ok: false, error: 'السؤال غير موجود' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet(SpreadsheetApp.getActiveSpreadsheet());
    const last = sh.getLastRow();
    if (last < 2) return { ok: false, error: 'السؤال غير موجود' };
    const ids = sh.getRange(2, COL.id, last - 1, 1).getValues();
    for (let i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === id) {
        const row = i + 2;
        const v = sh.getRange(row, 1, 1, HEADERS.length).getValues()[0];
        const r = toObj(v);
        if (r.status !== expected) return { ok: false, error: 'تغيرت حالة السؤال، حدّث الصفحة' };
        const out = fn(sh, row, r);
        SpreadsheetApp.flush();
        return out;
      }
    }
    return { ok: false, error: 'السؤال غير موجود' };
  } finally {
    lock.releaseLock();
  }
}

function rows() {
  const sh = ensureSheet(SpreadsheetApp.getActiveSpreadsheet());
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, HEADERS.length).getValues().map(toObj).filter(r => r.id);
}

function toObj(v) {
  const iso = d => (d instanceof Date ? d.toISOString() : (d ? new Date(d).toISOString() : ''));
  const ms = d => (d instanceof Date ? d.getTime() : (d ? new Date(d).getTime() : 0));
  return {
    id: String(v[COL.id - 1] || ''),
    created: iso(v[COL.created - 1]), createdMs: ms(v[COL.created - 1]),
    q: String(v[COL.q - 1] || ''),
    status: String(v[COL.status - 1] || ''),
    approved: iso(v[COL.approved - 1]), approvedMs: ms(v[COL.approved - 1]),
    a: String(v[COL.a - 1] || ''),
    published: iso(v[COL.published - 1]), publishedMs: ms(v[COL.published - 1])
  };
}

// تنظيف النص: إزالة المحارف الخفية، ومنع تحويل النص إلى معادلة في الشيت
function clean(s) {
  s = String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏‪-‮⁦-⁩]/g, '').trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
