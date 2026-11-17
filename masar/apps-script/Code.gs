/**
 * منصة أسئلة مسار — يستقبل أسئلة المشاركين ويحفظها في هذا الملف (قوقل شيتس)،
 * ويخدم لوحة المشرفين (الرد العام والخاص والحذف) وقائمة الأسئلة المنشورة وصفحة «أسئلتي».
 *
 * مسار السؤال:
 *   المشارك يكتب سؤاله ويختار «عام» أو «خاص» ← يصل مباشرة إلى كل المشرفين (لا اعتماد إدارة)
 *   السؤال العام: لا ينشر إلا إذا اختار المشرف «نشر للجميع» مع رده، أو يرد عليه ردا خاصا
 *   السؤال الخاص: لا ينشر أبدا، والرد عليه خاص
 *   الرد الخاص يراه المشارك وحده برمز المتابعة الذي يأخذه عند الإرسال
 *
 * السرية: لا يحفظ هذا السكربت أي شيء عن المرسل. Apps Script لا يعطي السكربت عنوان IP
 * ولا هوية الزائر، والموقع يرسل بلا ملفات تعريف. رمز المتابعة عشوائي ولا يحفظ نصه،
 * بل بصمته فقط، فحتى من يفتح الشيت لا يستطيع استعماله.
 *
 * طريقة التركيب في masar/README.md
 */

// ===================== الإعدادات =====================
// حسابات المشرفين (مقدمي الحقيبة) في ورقة «المشرفون» داخل هذا الملف: الاسم والرمز والبريد وفعال
const SETTINGS = {
  // بريد إضافي يصله تنبيه عند وصول سؤال جديد (اختياري). يصل التنبيه أيضا لكل مشرف كتب بريده في ورقة «المشرفون»
  // التنبيه لا يحوي أي معلومة عن المرسل
  NOTIFY_EMAIL: '',
  MAX_QUESTION: 600,
  MAX_ANSWER: 3000,
  // حماية: أقصى عدد للأسئلة الجديدة في الساعة (من الجميع) لمنع الإغراق
  MAX_NEW_PER_HOUR: 300
};

const SHEET = 'الأسئلة';
const SHEET_OLD = 'الأسئلة (النسخة السابقة)';
const SHEET_SUP = 'المشرفون';
const HEADERS = ['المعرف', 'وقت الوصول', 'السؤال', 'النوع', 'الحالة', 'الرد', 'المشرف', 'وقت الرد', 'بصمة رمز المتابعة', 'نص السؤال قبل التعديل'];
const COL = { id: 1, created: 2, q: 3, type: 4, status: 5, a: 6, by: 7, answered: 8, ticket: 9, original: 10 };
const SUP_HEADERS = ['الاسم', 'الرمز', 'البريد (اختياري)', 'فعال'];
const T = { PUBLIC: 'عام', PRIVATE: 'خاص' };
const S = { NEW: 'جديد', PUBLIC: 'منشور', PRIVATE: 'رد خاص', DELETED: 'محذوف' };
const PUBLISHED_CACHE = 'published-v2';
const SUP_CACHE = 'supervisors-v1';
const TICKET_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ===================== التهيئة (شغّلها مرة واحدة) =====================
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSheet(ss);
  ensureSupervisors(ss);
  salt();
}

function ensureSheet(ss) {
  let sh = ss.getSheetByName(SHEET);
  if (sh) {
    // ترقية من النسخة السابقة (أعمدة الاعتماد) إلى النسخة الحالية
    if (String(sh.getRange(1, 4).getValue()) !== HEADERS[3]) migrate(ss, sh);
    else return sh;
  }
  sh = ss.insertSheet(SHEET, 0);
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
    .setFontWeight('bold').setBackground('#15463F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  [110, 140, 380, 70, 90, 380, 120, 140, 160, 260].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('A:J').setWrap(true).setVerticalAlignment('top');
  sh.getRange('B:B').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange('H:H').setNumberFormat('yyyy-mm-dd hh:mm');
  sh.getRange(2, COL.type, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([T.PUBLIC, T.PRIVATE], true).build());
  sh.getRange(2, COL.status, 1000, 1).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList([S.NEW, S.PUBLIC, S.PRIVATE, S.DELETED], true).build());
  const rng = sh.getRange(2, 1, 1000, HEADERS.length);
  const color = (status, bg) => SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2="' + status + '"').setBackground(bg).setRanges([rng]).build();
  sh.setConditionalFormatRules([color(S.NEW, '#EAF4EF'), color(S.PRIVATE, '#E6EEF5'), color(S.DELETED, '#F3F3F3')]);
  return sh;
}

// ينقل أسئلة النسخة السابقة: الجديد والمعتمد ← جديد، والمنشور يبقى منشورا، وكلها «عام»
function migrate(ss, oldSh) {
  oldSh.setName(SHEET_OLD);
  const sh = ensureSheet(ss);
  const last = oldSh.getLastRow();
  if (last < 2) return sh;
  const map = { 'جديد': S.NEW, 'معتمد': S.NEW, 'منشور': S.PUBLIC, 'محذوف': S.DELETED };
  const rows = oldSh.getRange(2, 1, last - 1, 8).getValues().filter(r => r[0]).map(r =>
    [r[0], r[1], r[2], T.PUBLIC, map[String(r[3])] || S.NEW, r[5], '', r[6] || '', '', r[7]]);
  if (rows.length) sh.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  return sh;
}

function ensureSupervisors(ss) {
  let sh = ss.getSheetByName(SHEET_SUP);
  if (sh) return sh;
  sh = ss.insertSheet(SHEET_SUP);
  sh.setRightToLeft(true);
  sh.getRange(1, 1, 1, SUP_HEADERS.length).setValues([SUP_HEADERS])
    .setFontWeight('bold').setBackground('#15463F').setFontColor('#FFFFFF');
  sh.setFrozenRows(1);
  [180, 120, 240, 70].forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.getRange('B:B').setNumberFormat('@'); // الرمز نص حتى لا تضيع الأصفار في أوله
  sh.getRange(2, 4, 200, 1).insertCheckboxes();
  // حسابان للبداية: غيّر الأسماء والرموز، وأضف صفا لكل مقدم حقيبة
  sh.getRange(2, 1, 2, 4).setValues([['المشرف ١', '1198', '', true], ['المشرف ٢', '1996', '', true]]);
  return sh;
}

// ملح سري لبصمات رموز المتابعة، يحفظ في خصائص السكربت لا في الشيت
function salt() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('TICKET_SALT');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('TICKET_SALT', s); }
  return s;
}

// ===================== نقاط الاستقبال =====================
function doGet() {
  return json({ ok: true, service: 'masar-questions', version: 2 });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    switch (body.action) {
      case 'ask': return json(ask(body));
      case 'published': return json(published());
      case 'mine': return json(mine(body));
    }
    // ما بعد هذا يحتاج رمز مشرف
    const sup = supervisorOf(body.code);
    if (!sup) return json({ ok: false, error: sup === null ? 'محاولات كثيرة، حاول بعد ١٠ دقائق' : 'رمز الدخول غير صحيح' });
    switch (body.action) {
      case 'login': return json({ ok: true, name: sup.name });
      case 'list': return json(list(sup));
      case 'reply': return json(reply(body, sup));
      case 'delete': return json(remove(body));
      case 'unpublish': return json(unpublish(body));
    }
    return json({ ok: false, error: 'طلب غير معروف' });
  } catch (err) {
    return json({ ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// قائمة المشرفين الفعالين من ورقة «المشرفون» (مخزنة دقيقة واحدة)
function supervisors() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(SUP_CACHE);
  if (hit) return JSON.parse(hit);
  const sh = ensureSupervisors(SpreadsheetApp.getActiveSpreadsheet());
  const last = sh.getLastRow();
  const list = last < 2 ? [] : sh.getRange(2, 1, last - 1, 4).getDisplayValues()
    .map(r => ({ name: String(r[0]).trim(), code: String(r[1]).trim(), email: String(r[2]).trim(), active: String(r[3]).toUpperCase() === 'TRUE' }))
    .filter(s => s.name && s.code && s.active);
  cache.put(SUP_CACHE, JSON.stringify(list), 60);
  return list;
}

// يرجع المشرف، أو '' إن كان الرمز خاطئا، أو null إن تجاوزت المحاولات الخاطئة الحد (حماية من التخمين)
function supervisorOf(code) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 20) return null;
  code = String(code || '').trim();
  const sup = code ? supervisors().find(s => s.code === code) : null;
  if (sup) return sup;
  cache.put('fails', String(fails + 1), 600);
  return '';
}

// ===================== المشاركون =====================
function ask(body) {
  if (String(body.website || '')) return { ok: true, ticket: '' }; // فخ البرامج الآلية: نتجاهل بصمت
  const q = clean(body.question);
  const type = body.visibility === T.PRIVATE ? T.PRIVATE : body.visibility === T.PUBLIC ? T.PUBLIC : '';
  if (!type) return { ok: false, error: 'اختر هل سؤالك عام أو خاص' };
  if (q.length < 5) return { ok: false, error: 'اكتب سؤالك أولا' };
  if (q.length > SETTINGS.MAX_QUESTION) return { ok: false, error: 'السؤال أطول من الحد المسموح' };

  const cache = CacheService.getScriptCache();
  const hourKey = 'n-' + Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyMMddHH');
  const n = Number(cache.get(hourKey) || 0);
  if (n >= SETTINGS.MAX_NEW_PER_HOUR) return { ok: false, error: 'المنصة مشغولة الآن، حاول بعد قليل' };
  cache.put(hourKey, String(n + 1), 3700);

  const ticket = newTicket();
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const sh = ensureSheet(SpreadsheetApp.getActiveSpreadsheet());
    // المعرف عشوائي ولا يرتبط بالمرسل ولا بالوقت
    const id = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    // الوقت يحفظ مقربا لأقرب ١٠ دقائق حتى لا يربط أحد السؤال بلحظة إرساله
    const t = new Date(Math.floor(Date.now() / 600000) * 600000);
    sh.appendRow([id, t, q, type, S.NEW, '', '', '', ticketHash(ticket), '']);
  } finally {
    lock.releaseLock();
  }
  notifySupervisors(type);
  return { ok: true, ticket: ticket };
}

function notifySupervisors(type) {
  const to = supervisors().map(s => s.email).filter(e => /@/.test(e));
  if (SETTINGS.NOTIFY_EMAIL) to.push(SETTINGS.NOTIFY_EMAIL);
  if (!to.length) return;
  try {
    MailApp.sendEmail({
      to: to[0], bcc: to.slice(1).join(','),
      subject: 'منصة مسار: سؤال ' + type + ' جديد',
      body: 'وصل سؤال ' + type + ' جديد إلى منصة أسئلة مسار. ادخل لوحة المشرفين برمزك للرد عليه.'
    });
  } catch (e) { /* التنبيه اختياري */ }
}

function published() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(PUBLISHED_CACHE);
  if (hit) return JSON.parse(hit);
  const items = rows()
    .filter(r => r.status === S.PUBLIC && r.q && r.a)
    .sort((a, b) => b.answeredMs - a.answeredMs)
    .map(r => ({ id: r.id, q: r.q, a: r.a, by: r.by, at: r.answered }));
  const out = { ok: true, items: items };
  const s = JSON.stringify(out);
  if (s.length < 95000) cache.put(PUBLISHED_CACHE, s, 60);
  return out;
}

// «أسئلتي»: أسئلة المشارك وردودها برموز المتابعة المحفوظة في جهازه
function mine(body) {
  const tickets = (Array.isArray(body.tickets) ? body.tickets : []).slice(0, 50).map(normTicket).filter(t => t.length === 8);
  if (!tickets.length) return { ok: true, items: [] };
  const byHash = {};
  tickets.forEach(t => { byHash[ticketHash(t)] = fmtTicket(t); });
  const items = rows().filter(r => byHash[r.ticket]).map(r => {
    const answered = r.status === S.PUBLIC || r.status === S.PRIVATE;
    return {
      ticket: byHash[r.ticket], q: r.q, type: r.type, created: r.created,
      state: r.status === S.PUBLIC ? 'public' : r.status === S.PRIVATE ? 'private' : r.status === S.DELETED ? 'closed' : 'waiting',
      a: answered ? r.a : '', by: answered ? r.by : '', at: answered ? r.answered : ''
    };
  });
  return { ok: true, items: items };
}

// ===================== المشرفون =====================
function list(sup) {
  const all = rows();
  return {
    ok: true,
    name: sup.name,
    fresh: all.filter(r => r.status === S.NEW).sort((a, b) => a.createdMs - b.createdMs)
      .map(r => ({ id: r.id, q: r.q, type: r.type, created: r.created, draft: r.a })),
    done: all.filter(r => r.status === S.PUBLIC || r.status === S.PRIVATE).sort((a, b) => b.answeredMs - a.answeredMs).slice(0, 150)
      .map(r => ({ id: r.id, q: r.q, type: r.type, status: r.status === S.PUBLIC ? 'public' : 'private', a: r.a, by: r.by, at: r.answered }))
  };
}

// الرد: mode = public (نشر للجميع مع الرد، للسؤال العام فقط) أو private (رد خاص يراه المشارك وحده)
function reply(body, sup) {
  const a = clean(body.answer);
  const mode = body.mode === 'public' ? 'public' : 'private';
  if (a.length < 2) return { ok: false, error: 'اكتب الرد أولا' };
  if (a.length > SETTINGS.MAX_ANSWER) return { ok: false, error: 'الرد أطول من الحد المسموح' };
  const res = withRow(body.id, S.NEW, (sh, row, r) => {
    if (mode === 'public' && r.type !== T.PUBLIC) return { ok: false, error: 'هذا السؤال خاص، ولا يمكن نشره' };
    if (mode === 'public') {
      const edited = clean(body.question);
      if (edited && edited !== r.q) {
        if (edited.length > SETTINGS.MAX_QUESTION) return { ok: false, error: 'السؤال أطول من الحد المسموح' };
        sh.getRange(row, COL.original).setValue(r.q);
        sh.getRange(row, COL.q).setValue(edited);
      }
    }
    sh.getRange(row, COL.a).setValue(a);
    sh.getRange(row, COL.by).setValue(sup.name);
    sh.getRange(row, COL.answered).setValue(new Date());
    sh.getRange(row, COL.status).setValue(mode === 'public' ? S.PUBLIC : S.PRIVATE);
    return { ok: true };
  });
  if (res.ok) CacheService.getScriptCache().remove(PUBLISHED_CACHE);
  return res;
}

function remove(body) {
  return withRow(body.id, S.NEW, (sh, row) => {
    sh.getRange(row, COL.status).setValue(S.DELETED);
    return { ok: true };
  });
}

// إلغاء النشر: يرجع السؤال إلى «جديد» بنصه الأصلي، ويبقى الرد مسودة يعدلها المشرف
function unpublish(body) {
  const res = withRow(body.id, S.PUBLIC, (sh, row) => {
    const original = String(sh.getRange(row, COL.original).getValue() || '');
    if (original) {
      sh.getRange(row, COL.q).setValue(original);
      sh.getRange(row, COL.original).setValue('');
    }
    sh.getRange(row, COL.status).setValue(S.NEW);
    sh.getRange(row, COL.by).setValue('');
    sh.getRange(row, COL.answered).setValue('');
    return { ok: true, q: original || undefined };
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
        const r = toObj(sh.getRange(row, 1, 1, HEADERS.length).getValues()[0]);
        if (r.status !== expected) return { ok: false, error: 'تغيرت حالة السؤال، ربما رد عليه مشرف آخر. حدّث الصفحة' };
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
    type: String(v[COL.type - 1] || T.PUBLIC),
    status: String(v[COL.status - 1] || ''),
    a: String(v[COL.a - 1] || ''),
    by: String(v[COL.by - 1] || ''),
    answered: iso(v[COL.answered - 1]), answeredMs: ms(v[COL.answered - 1]),
    ticket: String(v[COL.ticket - 1] || '')
  };
}

// رمز المتابعة: ٨ محارف عشوائية بلا محارف متشابهة (مثل O و0)، يعرض هكذا ABCD-EFGH
function newTicket() {
  const hex = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  let t = '';
  for (let i = 0; t.length < 8; i += 2) t += TICKET_ABC[parseInt(hex.substr(i, 2), 16) % TICKET_ABC.length];
  return fmtTicket(t);
}
function normTicket(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function fmtTicket(t) { t = normTicket(t); return t.slice(0, 4) + '-' + t.slice(4, 8); }
function ticketHash(t) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt() + ':' + normTicket(t), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// تنظيف النص: إزالة المحارف الخفية، ومنع تحويل النص إلى معادلة في الشيت
function clean(s) {
  s = String(s || '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F​-‏‪-‮⁦-⁩]/g, '').trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
