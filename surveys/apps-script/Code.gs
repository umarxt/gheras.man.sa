/**
 * منصة الاستبانات — جمعية غراس لتنمية الطفل
 * خادم المنصة على Google Apps Script: يحفظ الاستبانات والردود في هذا الملف (قوقل شيتس)،
 * والملفات المرفوعة في Google Drive، ويرسل التنبيهات بالبريد.
 * يحتاج ملف Schema.gs (نسخة من public/schema.js) في المشروع نفسه.
 *
 * طريقة التركيب في surveys/README.md
 */

// ===================== الإعدادات =====================
const SETTINGS = {
  // اسم مجلد الملفات المرفوعة في Google Drive
  FILES_FOLDER: 'منصة الاستبانات — الملفات',
  // الحد الأقصى لحجم الملف الواحد (ميغابايت)
  MAX_FILE_MB: 10,
  // مدة الجلسة بعد الدخول (ثوان، الحد الأعلى ٦ ساعات)
  SESSION_SECONDS: 21600
};

const SH_USERS = 'المستخدمون';
const SH_REG = 'الاستبانات';
const SH_LOG = 'سجل الردود';
const REG_HEAD = ['المعرف', 'العنوان', 'المالك', 'المحررون', 'أنشئت', 'آخر تعديل', 'الردود', 'ورقة الردود', 'أعمدة الردود', 'محذوفة'];
const DEF_COL = REG_HEAD.length + 1;   // أول عمود للتعريف
const DEF_CHUNKS = 10;
const LOG_HEAD = ['رقم المرجع', 'الاستبانة', 'الوقت', 'البريد', 'رمز التعديل', 'الدرجة'];
const ANS_COL = LOG_HEAD.length + 1;   // أول عمود للإجابات
const ANS_CHUNKS = 5;
const CHUNK = 45000;
const FIXED_COLS = ['رقم المرجع', 'وقت الإرسال', 'البريد الإلكتروني', 'الدرجة'];

// ===================== نقاط الاستقبال =====================
function doGet() { return json({ ok: true, service: 'gheras-surveys' }); }

function doPost(e) {
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const pub = { form: actForm, upload: actUpload, submit: actSubmit, summary: actSummary, login: actLogin };
    const adm = { list: actList, get: actGet, save: actSave, remove: actRemove, responses: actResponses, delResponse: actDelResponse, users: actUsers };
    if (pub[p.action]) return json(pub[p.action](p));
    if (adm[p.action]) {
      const user = session(p.token);
      if (!user) return json({ ok: false, auth: true, error: 'انتهت الجلسة، ادخل مرة أخرى' });
      return json(adm[p.action](p, user));
    }
    return json({ ok: false, error: 'طلب غير معروف' });
  } catch (err) {
    console.error(err && err.stack || err);
    return json({ ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' });
  }
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet(name) { const s = ss().getSheetByName(name); if (!s) throw new Error('شغل الدالة setup أولا'); return s; }

// يمنع حقن المعادلات ويقص النص الطويل
function clean(v, max) {
  let s = v == null ? '' : String(v);
  if (max && s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}
function iso(v) { if (!v) return ''; const d = v instanceof Date ? v : new Date(v); return isNaN(d) ? '' : d.toISOString(); }

// ===================== الدخول والجلسات =====================
function actLogin(p) {
  const code = String(p.code || '').trim();
  if (!code) return { ok: false, error: 'أدخل رمزك الشخصي' };
  const rows = sheet(SH_USERS).getDataRange().getValues().slice(1);
  const r = rows.find(x => String(x[1]).trim() === code && String(x[4]).trim() !== 'لا' && String(x[0]).trim());
  if (!r) { Utilities.sleep(600); return { ok: false, error: 'رمز الدخول غير صحيح' }; }
  const user = { name: String(r[0]).trim(), role: String(r[2]).trim() === 'مدير' ? 'مدير' : 'مصمم', email: String(r[3] || '').trim() };
  const token = Utilities.getUuid() + Utilities.getUuid().slice(0, 8);
  CacheService.getScriptCache().put('s_' + token, JSON.stringify(user), SETTINGS.SESSION_SECONDS);
  return { ok: true, token: token, user: { name: user.name, role: user.role } };
}
function session(token) {
  if (!token) return null;
  const raw = CacheService.getScriptCache().get('s_' + token);
  if (!raw) return null;
  const u = JSON.parse(raw);
  // إذا ألغي المستخدم من الورقة تنتهي جلسته
  const rows = sheet(SH_USERS).getDataRange().getValues().slice(1);
  const r = rows.find(x => String(x[0]).trim() === u.name);
  if (!r || String(r[4]).trim() === 'لا') return null;
  u.role = String(r[2]).trim() === 'مدير' ? 'مدير' : 'مصمم';
  return u;
}
function actUsers() {
  const rows = sheet(SH_USERS).getDataRange().getValues().slice(1);
  return { ok: true, users: rows.filter(x => String(x[0]).trim() && String(x[4]).trim() !== 'لا').map(x => String(x[0]).trim()) };
}
function can(user, rec) { return user.role === 'مدير' || rec.owner === user.name || rec.editors.indexOf(user.name) >= 0; }

// ===================== سجل الاستبانات =====================
function readChunks(row, from, n) { return row.slice(from - 1, from - 1 + n).join(''); }
function chunks(text, n) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(text.slice(i * CHUNK, (i + 1) * CHUNK));
  return out;
}
function regAll() {
  const sh = sheet(SH_REG);
  const last = sh.getLastRow();
  if (last < 2) return [];
  const vals = sh.getRange(2, 1, last - 1, REG_HEAD.length + DEF_CHUNKS).getValues();
  return vals.map((r, i) => ({
    row: i + 2, id: String(r[0]), title: String(r[1]), owner: String(r[2]),
    editors: String(r[3] || '').split('،').map(x => x.trim()).filter(Boolean),
    created: iso(r[4]), updated: iso(r[5]), count: Number(r[6]) || 0, gid: r[7] === '' ? null : Number(r[7]),
    cols: r[8] ? JSON.parse(r[8]) : [], deleted: String(r[9]) === 'نعم', raw: r
  })).filter(x => x.id);
}
function regFind(id) { return regAll().find(x => x.id === String(id || '') && !x.deleted) || null; }
function regSurvey(rec) {
  const s = JSON.parse(readChunks(rec.raw, DEF_COL, DEF_CHUNKS) || '{}');
  s.id = rec.id; s.owner = rec.owner; s.editors = rec.editors; s.created = rec.created; s.updated = rec.updated;
  return normalize(s);
}
function normalize(s) {
  const b = GSchema.blank();
  s.settings = Object.assign(b.settings, s.settings || {});
  s.settings.quiz = Object.assign(b.settings.quiz, s.settings.quiz || {});
  s.theme = Object.assign({ accent: 'navy' }, s.theme || {});
  if (!s.sections || !s.sections.length) s.sections = b.sections;
  return s;
}
function regWrite(rec, survey) {
  const sh = sheet(SH_REG);
  const def = JSON.stringify(Object.assign({}, survey, { owner: undefined, editors: undefined, created: undefined, updated: undefined }));
  if (def.length > CHUNK * DEF_CHUNKS) throw new Error('too big');
  const row = [rec.id, clean(survey.title, 200), rec.owner, rec.editors.join('، '), new Date(rec.created), new Date(rec.updated), rec.count,
    rec.gid == null ? '' : rec.gid, JSON.stringify(rec.cols), rec.deleted ? 'نعم' : ''].concat(chunks(def, DEF_CHUNKS));
  if (!rec.row) rec.row = sh.getLastRow() + 1;
  sh.getRange(rec.row, 1, 1, row.length).setValues([row]);
}

// ===================== أوراق الردود =====================
function sheetName(title, id) {
  return ('ردود ' + String(title || '').replace(/[\[\]\*\?\/\\:']/g, ' ').trim()).slice(0, 80) + ' (' + id + ')';
}
function respSheet(rec, survey) {
  let sh = rec.gid == null ? null : ss().getSheets().find(x => x.getSheetId() === rec.gid);
  if (!sh) {
    sh = ss().insertSheet(sheetName(survey.title, rec.id));
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, FIXED_COLS.length).setValues([FIXED_COLS]);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    sh.getRange('B2:B').setNumberFormat('yyyy/mm/dd hh:mm');
    rec.gid = sh.getSheetId();
    rec.cols = [];
  }
  return sh;
}
// يضيف أعمدة الأسئلة الجديدة ويحدث عناوين الموجودة؛ لا يحذف عمودا حتى لا تضيع ردود سابقة
function syncColumns(rec, survey, sh) {
  const want = GSchema.columns(survey);
  want.forEach(c => { if (!rec.cols.some(x => x.key === c.key)) rec.cols.push({ key: c.key, title: c.title }); });
  const titles = rec.cols.map(c => { const w = want.find(x => x.key === c.key); return w ? w.title : c.title; });
  rec.cols.forEach((c, i) => { c.title = titles[i]; });
  const head = FIXED_COLS.concat(titles);
  if (sh.getMaxColumns() < head.length) sh.insertColumnsAfter(sh.getMaxColumns(), head.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, head.length).setValues([head])
    .setFontWeight('bold').setBackground('#1C437D').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
  const want2 = sheetName(survey.title, rec.id);
  if (sh.getName() !== want2) { try { sh.setName(want2); } catch (e) { /* الاسم مستخدم */ } }
}
function respRow(rec, survey, ref, time, email, grade, answers) {
  return [ref, time, clean(email, 200), grade ? grade.earned + '/' + grade.total : '']
    .concat(rec.cols.map(c => { const v = GSchema.cellFor(survey, c.key, answers); return typeof v === 'number' ? v : clean(v, 5000); }));
}
function findRef(sh, ref) {
  const f = sh.getRange('A:A').createTextFinder(ref).matchEntireCell(true).findNext();
  return f ? f.getRow() : 0;
}

// ===================== الإدارة =====================
function actList(p, user) {
  return { ok: true, surveys: regAll().filter(r => !r.deleted && can(user, r)).map(r => {
    const s = regSurvey(r);
    return { id: r.id, title: s.title, owner: r.owner, updated: r.updated, created: r.created, count: r.count,
      accepting: !!s.settings.accepting, reason: GSchema.closedReason(s, r.count), quiz: !!s.settings.quiz.on,
      questions: GSchema.questions(s).length, accent: s.theme.accent || 'navy' };
  }) };
}
function sheetUrl(rec) { return rec.gid == null ? ss().getUrl() : ss().getUrl() + '#gid=' + rec.gid; }
function actGet(p, user) {
  const rec = regFind(p.id);
  if (!rec || !can(user, rec)) return { ok: false, error: 'الاستبانة غير موجودة أو لا تملك صلاحيتها' };
  return { ok: true, survey: regSurvey(rec), count: rec.count, sheetUrl: sheetUrl(rec) };
}
function actSave(p, user) {
  const s = normalize(p.survey || {});
  delete s._full;
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let rec = s.id ? regFind(s.id) : null;
    if (s.id && !rec) return { ok: false, error: 'الاستبانة غير موجودة' };
    const now = new Date().toISOString();
    if (rec) {
      if (!can(user, rec)) return { ok: false, error: 'لا تملك صلاحية تعديل هذه الاستبانة' };
      if (p.base && rec.updated && Math.abs(new Date(p.base) - new Date(rec.updated)) > 1000) return { ok: false, conflict: true, error: 'عدل شخص آخر هذه الاستبانة الآن' };
      // المالك وحده (أو المدير) يغير المتعاونين
      if (rec.owner === user.name || user.role === 'مدير') rec.editors = (s.editors || []).map(String);
    } else {
      const all = regAll().map(x => x.id);
      let id; do { id = GSchema.uid(6); } while (all.indexOf(id) >= 0);
      rec = { row: 0, id: id, owner: user.name, editors: [], created: now, count: 0, gid: null, cols: [], deleted: false };
      s.id = id;
    }
    rec.updated = now;
    const sh = respSheet(rec, s);
    syncColumns(rec, s, sh);
    try { regWrite(rec, s); } catch (e) { return { ok: false, error: 'الاستبانة كبيرة جدا، قسمها إلى استبانتين' }; }
    return { ok: true, id: rec.id, updated: rec.updated, owner: rec.owner };
  } finally { lock.releaseLock(); }
}
function actRemove(p, user) {
  const rec = regFind(p.id);
  if (!rec || !can(user, rec)) return { ok: false, error: 'الاستبانة غير موجودة' };
  if (rec.owner !== user.name && user.role !== 'مدير') return { ok: false, error: 'يحذف الاستبانة مالكها أو المدير فقط' };
  sheet(SH_REG).getRange(rec.row, REG_HEAD.indexOf('محذوفة') + 1).setValue('نعم');
  const sh = rec.gid == null ? null : ss().getSheets().find(x => x.getSheetId() === rec.gid);
  if (sh) { try { sh.setName(('محذوفة ' + sh.getName()).slice(0, 99)); sh.setTabColor('#6F6F6E'); } catch (e) { /* تجاهل */ } }
  return { ok: true };
}
function logRows(id) {
  const sh = sheet(SH_LOG), last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, LOG_HEAD.length + ANS_CHUNKS).getValues()
    .map((r, i) => ({ row: i + 2, r: r })).filter(x => String(x.r[1]) === id);
}
function actResponses(p, user) {
  const rec = regFind(p.id);
  if (!rec || !can(user, rec)) return { ok: false, error: 'الاستبانة غير موجودة' };
  const list = logRows(rec.id).map(x => ({
    ref: String(x.r[0]), time: iso(x.r[2]), email: String(x.r[3] || ''), score: String(x.r[5] || ''),
    answers: JSON.parse(readChunks(x.r, ANS_COL, ANS_CHUNKS) || '{}')
  }));
  return { ok: true, list: list, sheetUrl: sheetUrl(rec) };
}
function actDelResponse(p, user) {
  const rec = regFind(p.id);
  if (!rec || !can(user, rec)) return { ok: false, error: 'الاستبانة غير موجودة' };
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const hit = logRows(rec.id).find(x => String(x.r[0]) === String(p.ref));
    if (hit) sheet(SH_LOG).deleteRow(hit.row);
    const sh = rec.gid == null ? null : ss().getSheets().find(x => x.getSheetId() === rec.gid);
    if (sh) { const row = findRef(sh, String(p.ref)); if (row > 1) sh.deleteRow(row); }
    rec.count = Math.max(0, logRows(rec.id).length);
    sheet(SH_REG).getRange(rec.row, 7).setValue(rec.count);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

// ===================== المجيب =====================
function actForm(p) {
  const rec = regFind(p.id);
  if (!rec) return { ok: false, missing: true, error: 'الاستبانة غير موجودة أو حذفت' };
  const s = regSurvey(rec), st = s.settings;
  const brief = { title: s.title, kicker: s.kicker, description: s.description, theme: s.theme };
  const reason = GSchema.closedReason(s, rec.count);
  if (reason && !p.edit) return { ok: true, closed: reason, opens: st.opensAt || '', message: st.closedMessage || '', survey: brief };
  if (st.accessCode && String(p.code || '').trim() !== String(st.accessCode).trim()) {
    return p.code ? { ok: false, error: 'رمز الاستبانة غير صحيح' } : { ok: true, needCode: true, survey: brief };
  }
  let prev = null;
  if (p.edit) {
    const hit = st.allowEdit ? logRows(rec.id).find(x => String(x.r[4]) === String(p.edit)) : null;
    if (!hit) return { ok: false, error: 'رابط التعديل غير صالح' };
    prev = { ref: String(hit.r[0]), email: String(hit.r[3] || ''), answers: JSON.parse(readChunks(hit.r, ANS_COL, ANS_CHUNKS) || '{}') };
  }
  return { ok: true, survey: GSchema.publicView(s), prev: prev };
}

function filesFolder(rec, survey) {
  const props = PropertiesService.getScriptProperties();
  let root = null;
  const id = props.getProperty('FILES_FOLDER_ID');
  if (id) { try { root = DriveApp.getFolderById(id); } catch (e) { root = null; } }
  if (!root) { root = DriveApp.createFolder(SETTINGS.FILES_FOLDER); props.setProperty('FILES_FOLDER_ID', root.getId()); }
  const name = String(survey.title || 'استبانة').replace(/[\\/]/g, ' ').slice(0, 80) + ' (' + rec.id + ')';
  const it = root.getFoldersByName(name);
  return it.hasNext() ? it.next() : root.createFolder(name);
}
function actUpload(p) {
  const rec = regFind(p.id);
  if (!rec) return { ok: false, error: 'الاستبانة غير موجودة' };
  const s = regSurvey(rec);
  if (GSchema.closedReason(s, rec.count) && !p.edit) return { ok: false, error: 'الاستبانة لا تستقبل ردودا الآن' };
  if (s.settings.accessCode && String(p.code || '').trim() !== String(s.settings.accessCode).trim()) return { ok: false, error: 'رمز الاستبانة غير صحيح' };
  const it = GSchema.findItem(s, p.item);
  if (!it || it.type !== 'file') return { ok: false, error: 'سؤال الملف غير موجود' };
  const allow = GSchema.allowedExt(it);
  if (allow && allow.indexOf(GSchema.ext(p.name)) < 0) return { ok: false, error: 'نوع الملف غير مسموح' };
  const bytes = Utilities.base64Decode(String(p.data || ''));
  const maxMB = Math.min((it.file && it.file.maxMB) || 10, SETTINGS.MAX_FILE_MB);
  if (!bytes.length) return { ok: false, error: 'الملف فارغ' };
  if (bytes.length > maxMB * 1024 * 1024) return { ok: false, error: 'الملف أكبر من الحد المسموح' };
  const name = String(it.title || 'ملف').slice(0, 60) + ' - ' + String(p.name || 'ملف').slice(0, 120);
  const file = filesFolder(rec, s).createFile(Utilities.newBlob(bytes, String(p.type || 'application/octet-stream').slice(0, 100), name));
  return { ok: true, url: file.getUrl() };
}

function actSubmit(p) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  let mail = null;
  try {
    const rec = regFind(p.id);
    if (!rec) return { ok: false, error: 'الاستبانة غير موجودة' };
    const s = regSurvey(rec), st = s.settings;
    const logs = logRows(rec.id);
    const editHit = p.edit && st.allowEdit ? logs.find(x => String(x.r[4]) === String(p.edit)) : null;
    if (p.edit && !editHit) return { ok: false, error: 'رابط التعديل غير صالح' };
    if (!editHit && GSchema.closedReason(s, rec.count)) return { ok: false, error: 'الاستبانة لا تستقبل ردودا الآن' };
    if (st.accessCode && String(p.code || '').trim() !== String(st.accessCode).trim()) return { ok: false, error: 'رمز الاستبانة غير صحيح' };

    // لا نحفظ إلا إجابات الأسئلة الموجودة في المسار الذي مر به المجيب
    const raw = p.answers || {}, answers = {};
    GSchema.pathItems(s, raw).forEach(it => { if (GSchema.isQ(it) && raw[it.id] != null) answers[it.id] = trimAnswer(raw[it.id]); });
    const err = GSchema.validate(s, answers, p.email);
    if (err) return { ok: false, error: err };
    const email = String(p.email || '').trim().toLowerCase().slice(0, 200);
    if (!editHit && st.oneResponse && email && logs.some(x => String(x.r[3]).toLowerCase() === email)) return { ok: false, error: 'سبق أن أرسل رد بهذا البريد' };
    const ansJson = JSON.stringify(answers);
    if (ansJson.length > CHUNK * ANS_CHUNKS) return { ok: false, error: 'الرد طويل جدا' };

    const grade = GSchema.grade(s, answers);
    const now = new Date();
    const ref = editHit ? String(editHit.r[0]) : 'ST-' + Utilities.formatDate(now, 'Asia/Riyadh', 'yyMMdd') + '-' + GSchema.uid(4).toUpperCase();
    const tok = editHit ? String(editHit.r[4]) : GSchema.uid(20);
    const logRow = [ref, rec.id, now, email, tok, grade ? grade.earned + '/' + grade.total : ''].concat(chunks(ansJson, ANS_CHUNKS));

    const sh = respSheet(rec, s);
    syncColumns(rec, s, sh);
    const row = respRow(rec, s, ref, now, email, grade, answers);
    if (editHit) {
      sheet(SH_LOG).getRange(editHit.row, 1, 1, logRow.length).setValues([logRow]);
      const r = findRef(sh, ref);
      if (r > 1) sh.getRange(r, 1, 1, row.length).setValues([row]); else sh.appendRow(row);
    } else {
      sheet(SH_LOG).appendRow(logRow);
      sh.appendRow(row);
      rec.count = logs.length + 1;
    }
    regWrite(rec, s);
    mail = { s: s, rec: rec, ref: ref, email: email, answers: answers, grade: grade, edited: !!editHit };
    return { ok: true, ref: ref, edit: st.allowEdit ? tok : '', grade: releaseGrade(s, grade) };
  } finally {
    lock.releaseLock();
    if (mail) { try { sendMails(mail); } catch (e) { console.error(e); } }
  }
}
// يقص النصوص الطويلة داخل الإجابة
function trimAnswer(a) {
  if (typeof a === 'string') return a.slice(0, 5000);
  if (Array.isArray(a)) return a.slice(0, 20).map(x => (typeof x === 'object' && x ? { name: String(x.name || '').slice(0, 200), url: String(x.url || '').slice(0, 500) } : String(x).slice(0, 500)));
  if (a && typeof a === 'object') {
    const o = {};
    Object.keys(a).slice(0, 100).forEach(k => { o[k] = trimAnswer(a[k]); });
    return o;
  }
  return a;
}
function releaseGrade(s, g) {
  const q = s.settings.quiz || {};
  if (!g || q.release === 'later') return null;
  return { earned: g.earned, total: g.total, items: g.items.map(x => ({
    id: x.id, title: x.title, ok: x.ok, points: q.showPoints !== false ? x.points : null, earned: q.showPoints !== false ? x.earned : null,
    key: q.showCorrect !== false ? x.key : '', fb: x.fb, show: q.showMissed !== false
  })) };
}
function actSummary(p) {
  const rec = regFind(p.id);
  if (!rec) return { ok: false, error: 'الاستبانة غير موجودة' };
  const s = regSurvey(rec);
  if (!s.settings.showSummary) return { ok: false, error: 'ملخص الردود غير متاح لهذه الاستبانة' };
  const list = logRows(rec.id).map(x => JSON.parse(readChunks(x.r, ANS_COL, ANS_CHUNKS) || '{}'));
  return { ok: true, n: list.length, title: s.title, theme: s.theme, summary: GSchema.summary(s, list, true) };
}

// ===================== البريد =====================
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
function answersHtml(s, answers) {
  return '<table style="border-collapse:collapse;width:100%">' + GSchema.questions(s).filter(it => answers[it.id] != null).map(it => {
    let v;
    if (GSchema.TYPES[it.type].grid) v = (it.rows || []).map(r => r.label + ': ' + GSchema.cellText(it, answers[it.id], r.id)).join('<br>');
    else v = esc(GSchema.cellText(it, answers[it.id])).replace(/\n/g, '<br>');
    return '<tr><td style="padding:8px;border-bottom:1px solid #E6EAF1;color:#6F6F6E;vertical-align:top;width:40%">' + esc(it.title) + '</td><td style="padding:8px;border-bottom:1px solid #E6EAF1">' + v + '</td></tr>';
  }).join('') + '</table>';
}
function sendMails(m) {
  const st = m.s.settings;
  const wrap = (title, body) => '<div dir="rtl" style="font-family:Tahoma,Arial;font-size:15px;line-height:1.8;color:#14213A"><h2 style="color:#1C437D;margin:0 0 8px">' + esc(title) + '</h2>' + body +
    '<p style="color:#6F6F6E;font-size:13px">جمعية غراس لتنمية الطفل — منصة الاستبانات</p></div>';
  const to = String(st.notifyEmails || '').split(/[,،;\s]+/).filter(x => /@/.test(x)).slice(0, 10);
  if (to.length) {
    MailApp.sendEmail({ to: to.join(','), subject: (m.edited ? 'تعديل رد: ' : 'رد جديد: ') + m.s.title + ' — ' + m.ref,
      htmlBody: wrap((m.edited ? 'عدل مجيب رده على ' : 'رد جديد على ') + m.s.title,
        '<p>رقم المرجع: ' + m.ref + (m.email ? '<br>البريد: ' + esc(m.email) : '') + (m.grade ? '<br>الدرجة: ' + m.grade.earned + ' من ' + m.grade.total : '') + '<br>عدد الردود: ' + m.rec.count + '</p>' +
        answersHtml(m.s, m.answers) + '<p><a href="' + sheetUrl(m.rec) + '">فتح ورقة الردود</a></p>') });
  }
  if (st.sendCopy && m.email) {
    MailApp.sendEmail({ to: m.email, subject: 'نسخة من ردك: ' + m.s.title,
      htmlBody: wrap('نسخة من ردك', '<p>' + esc(m.s.title) + '<br>رقم المرجع: ' + m.ref + '</p>' + answersHtml(m.s, m.answers)) });
  }
}

// ===================== التهيئة =====================
/** شغل هذه الدالة مرة واحدة من المحرر لإنشاء الأوراق ومنح الصلاحيات */
function setup() {
  const book = ss();
  book.setSpreadsheetTimeZone('Asia/Riyadh');
  const head = (sh, h, color) => {
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground(color || '#1C437D').setFontColor('#ffffff');
    sh.setFrozenRows(1); sh.setRightToLeft(true);
  };
  let u = book.getSheetByName(SH_USERS);
  if (!u) {
    u = book.insertSheet(SH_USERS, 0);
    head(u, ['الاسم', 'الرمز الشخصي', 'الدور (مدير / مصمم)', 'البريد', 'مفعل (نعم / لا)']);
    const code = 'gheras-' + GSchema.uid(6);
    u.getRange(2, 1, 1, 5).setValues([['مدير المنصة', code, 'مدير', Session.getEffectiveUser().getEmail(), 'نعم']]);
    u.setColumnWidths(1, 5, 180);
    Logger.log('رمز دخول مدير المنصة: ' + code + ' (غيره من ورقة المستخدمين)');
  }
  u.getRange('C2:C').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['مدير', 'مصمم'], true).build());
  u.getRange('E2:E').setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['نعم', 'لا'], true).build());
  let r = book.getSheetByName(SH_REG);
  if (!r) { r = book.insertSheet(SH_REG); head(r, REG_HEAD.concat(['التعريف'])); r.getRange('E2:F').setNumberFormat('yyyy/mm/dd hh:mm'); }
  let l = book.getSheetByName(SH_LOG);
  if (!l) { l = book.insertSheet(SH_LOG); head(l, LOG_HEAD.concat(['الإجابات']), '#6F6F6E'); l.getRange('C2:C').setNumberFormat('yyyy/mm/dd hh:mm'); }
  r.hideSheet(); l.hideSheet();
  const def = book.getSheetByName('Sheet1') || book.getSheetByName('الورقة1') || book.getSheetByName('ورقة1');
  if (def && book.getSheets().length > 1 && def.getLastRow() === 0) book.deleteSheet(def);
  DriveApp.getRootFolder();
  MailApp.getRemainingDailyQuota();
  Logger.log('تمت التهيئة.');
}
