/**
 * تطوع غراس — جمعية غراس لتنمية الطفل
 * الخادم: يستقبل التسجيلات من الموقع، ويحفظها في هذا الملف (قوقل شيتس)، ويحفظ الملفات والوثائق في Google Drive،
 * ويولد الميثاق من قالب Word أو Google Docs، ويرسل الإيميلات من حساب prog@gheras.sa.
 *
 * طريقة التركيب في ملف README.md داخل مجلد volunteer.
 */

// ===================== الإعدادات =====================
const CONFIG = {
  // رمز دخول لوحة الإدارة عند أول تشغيل لـ setup (تقدر تغيّره بعدها من صفحة الإعدادات في اللوحة)
  ADMIN_CODE: 'gheras-2026',
  // بريد التنبيهات الافتراضي (يتغير من لوحة الإدارة)
  ALERT_EMAIL: 'prog@gheras.sa',
  // رابط الموقع على Netlify، مثال: https://tatawwu-gheras.netlify.app/  (تُبنى منه روابط المتابعة في الإيميلات)
  SITE_URL: '',
  // اسم المجلد الرئيسي في Google Drive
  ROOT_FOLDER: 'تطوع غراس',
  ORG_NAME: 'جمعية غراس لتنمية الطفل',
  SENDER_NAME: 'تطوع غراس',
  MAX_FILE_MB: 10,
  TZ: 'Asia/Riyadh'
};

// ===================== الثوابت =====================
const STATUS = {
  EMPLOYER: 'بانتظار وثيقة صاحب العمل',
  PENDING: 'بانتظار الاعتماد',
  CHANGES: 'مطلوب تعديل',
  APPROVED: 'معتمد',
  REJECTED: 'مرفوض'
};
const YES = 'نعم', NO = 'لا';
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const PERSON_FIELDS = [
  ['name', 'الاسم الرباعي', 'الاسم'],
  ['nationalId', 'رقم الهوية أو الإقامة', 'رقم_الهوية'],
  ['nationality', 'الجنسية', 'الجنسية'],
  ['gender', 'الجنس', 'الجنس'],
  ['birthDate', 'تاريخ الميلاد', 'تاريخ_الميلاد'],
  ['phone', 'الجوال', 'الجوال'],
  ['email', 'البريد الإلكتروني', 'البريد'],
  ['city', 'المدينة', 'المدينة'],
  ['district', 'الحي', 'الحي'],
  ['qualification', 'المؤهل الدراسي', 'المؤهل'],
  ['major', 'التخصص', 'التخصص'],
  ['employer', 'جهة العمل', 'جهة_العمل'],
  ['jobTitle', 'المسمى الوظيفي', 'المسمى_الوظيفي']
];
const IMAGE_KEYS = ['توقيع_المتطوع', 'الختم', 'توقيع_المشرف'];
const FOLDERS = {
  templates: 'القوالب',
  signatures: 'التواقيع والختم',
  drafts: 'الميثاق بتوقيع المتطوع',
  employer: 'وثائق صاحب العمل',
  attachments: 'مرفقات المتطوعين',
  approved: 'الوثائق المعتمدة',
  tmp: 'مؤقت'
};

const SHEETS = {
  regs: { name: 'التسجيلات', cols: [
    ['regId', 'رقم التسجيل'], ['created', 'تاريخ التسجيل'], ['status', 'الحالة'], ['programName', 'البرنامج'],
    ['name', 'الاسم'], ['nationalId', 'رقم الهوية'], ['phone', 'الجوال'], ['email', 'البريد'], ['nationality', 'الجنسية'],
    ['employerRequired', 'يحتاج صاحب العمل'], ['answersText', 'الإجابات'], ['finalUrl', 'رابط الوثيقة المعتمدة'],
    ['approvedBy', 'المعتمد'], ['approvedAt', 'تاريخ الاعتماد'], ['note', 'ملاحظة التعديل'], ['reason', 'سبب الرفض'],
    ['updated', 'آخر تحديث'], ['programId', 'معرف البرنامج'], ['token', 'رمز المتابعة'],
    ['person', 'بيانات المتطوع (لا تعدل)'], ['answers', 'الإجابات (لا تعدل)'], ['files', 'المرفقات (لا تعدل)'],
    ['signatureId', 'ملف توقيع المتطوع'], ['draftId', 'ملف الميثاق'], ['employerId', 'ملف صاحب العمل'],
    ['employerMime', 'نوع ملف صاحب العمل'], ['finalId', 'ملف الوثيقة المعتمدة']
  ] },
  programs: { name: 'البرامج', cols: [
    ['id', 'المعرف'], ['order', 'الترتيب'], ['state', 'الحالة'], ['kind', 'النوع'], ['name', 'الاسم'], ['desc', 'الوصف'],
    ['location', 'المكان'], ['startDate', 'تاريخ البداية'], ['endDate', 'تاريخ النهاية'], ['days', 'الأيام'],
    ['timeFrom', 'الوقت من'], ['timeTo', 'الوقت إلى'], ['hours', 'الساعات'], ['seats', 'المقاعد'], ['gender', 'الفئة'],
    ['employerSig', 'توقيع صاحب العمل لغير السعوديين'], ['extras', 'تفاصيل إضافية (لا تعدل)'], ['questions', 'الأسئلة (لا تعدل)'],
    ['templateId', 'معرف القالب'], ['templateName', 'اسم القالب'], ['charterText', 'نص القالب'], ['image', 'الصورة'], ['updated', 'آخر تحديث']
  ] },
  volunteers: { name: 'المتطوعون', cols: PERSON_FIELDS.map(function (f) { return [f[0], f[1]]; })
    .concat([['nationalityName', 'اسم الجنسية'], ['created', 'أول تسجيل'], ['updated', 'آخر تحديث'], ['source', 'المصدر']]) },
  supervisors: { name: 'المشرفون', cols: [
    ['id', 'المعرف'], ['name', 'الاسم'], ['title', 'الصفة'], ['codeHash', 'رمز الاعتماد (مشفر)'],
    ['signatureId', 'ملف التوقيع'], ['active', 'نشط'], ['updated', 'آخر تحديث']
  ] }
};

const GENERAL_QUESTIONS = [
  { id: 'q_interests', label: 'مجالات الاهتمام', type: 'multi', required: true, options: ['تعليمي', 'تربوي', 'إعلامي وتصميم', 'تقني', 'تنظيم فعاليات', 'إداري', 'ميداني'] },
  { id: 'q_skills', label: 'المهارات', type: 'long', required: false, options: [] },
  { id: 'q_prev', label: 'هل لديك خبرات تطوعية سابقة؟', type: 'yesno', required: true, options: [] },
  { id: 'q_prevd', label: 'تفاصيل الخبرات السابقة', type: 'long', required: false, options: [] },
  { id: 'q_days', label: 'الأيام المتاحة', type: 'multi', required: true, options: DAYS.slice() },
  { id: 'q_period', label: 'الفترة المتاحة', type: 'choice', required: true, options: ['صباحية', 'مسائية', 'مرنة'] },
  { id: 'q_hours', label: 'عدد الساعات المتاحة أسبوعيا', type: 'number', required: true, options: [] },
  { id: 'q_mode', label: 'نوع التطوع المفضل', type: 'choice', required: true, options: ['حضوري', 'عن بعد', 'الاثنين'] },
  { id: 'q_add', label: 'ماذا تستطيع أن تضيف للجمعية؟', type: 'long', required: false, options: [] }
];

// ===================== التركيب (شغّلها مرة واحدة) =====================
function setup() {
  const P = props();
  if (!P.getProperty('SALT')) P.setProperty('SALT', Utilities.getUuid());
  if (!P.getProperty('ADMIN_HASH')) P.setProperty('ADMIN_HASH', hash(CONFIG.ADMIN_CODE));
  if (!P.getProperty('ALERT_EMAIL')) P.setProperty('ALERT_EMAIL', CONFIG.ALERT_EMAIL);
  Object.keys(SHEETS).forEach(function (k) { table(k); });
  Object.keys(FOLDERS).forEach(function (k) { folder(k); });
  const progs = table('programs');
  if (!progs.find('id', 'general')) {
    progs.add({ id: 'general', order: '0', state: 'مفتوح', kind: 'general', name: 'التطوع العام',
      desc: 'انضم إلى فريق متطوعي غراس، ونرشحك للفرص المناسبة لاهتماماتك ووقتك.', location: 'الرياض', gender: 'الكل',
      employerSig: YES, extras: '[]', questions: JSON.stringify(GENERAL_QUESTIONS), updated: now() });
  }
  const tpl = defaultTemplate();
  const sheet = SpreadsheetApp.getActive().getSheetByName('Sheet1') || SpreadsheetApp.getActive().getSheetByName('ورقة1');
  if (sheet && SpreadsheetApp.getActive().getSheets().length > 1 && sheet.getLastRow() === 0) SpreadsheetApp.getActive().deleteSheet(sheet);
  Logger.log('تم التركيب. المجلد الرئيسي: ' + rootFolder().getUrl());
  Logger.log('القالب الافتراضي: ' + DriveApp.getFileById(tpl).getUrl());
  Logger.log('رمز دخول اللوحة المبدئي: ' + CONFIG.ADMIN_CODE + ' (غيّره من الإعدادات بعد الدخول)');
}

// ===================== الاستقبال =====================
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ ok: true, name: 'تطوع غراس' })).setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  let out;
  try {
    const p = JSON.parse(e.postData.contents);
    const fn = ROUTES[p.action];
    if (!fn) fail('عملية غير معروفة');
    if (ADMIN_ACTIONS.indexOf(p.action) >= 0) checkAdmin(p.admin);
    out = Object.assign({ ok: true }, fn(p) || {});
  } catch (err) {
    if (!(err && err.user)) console.error(err && err.stack ? err.stack : err);
    out = { ok: false, error: err && err.user ? err.message : 'حدث خطأ في الخادم، حاول مرة أخرى' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
const ROUTES = {
  config: apiConfig, lookupStart: apiLookupStart, lookupVerify: apiLookupVerify, submit: apiSubmit, status: apiStatus, doc: apiDoc,
  uploadEmployer: apiUploadEmployer, resubmit: apiResubmit, resendLinks: apiResendLinks,
  adminLogin: function () { return {}; }, adminLoad: apiAdminLoad, regDetail: apiRegDetail, adminFile: apiAdminFile,
  checkSupervisor: apiCheckSupervisor, approve: apiApprove, requestChanges: apiRequestChanges, reject: apiReject,
  saveProgram: apiSaveProgram, previewTemplate: apiPreviewTemplate, saveSupervisor: apiSaveSupervisor,
  removeSupervisor: apiRemoveSupervisor, saveSettings: apiSaveSettings,
  adminVolunteers: apiAdminVolunteers, importVolunteers: apiImportVolunteers
};
const ADMIN_ACTIONS = ['adminLogin', 'adminLoad', 'regDetail', 'adminFile', 'checkSupervisor', 'approve', 'requestChanges',
  'reject', 'saveProgram', 'previewTemplate', 'saveSupervisor', 'removeSupervisor', 'saveSettings', 'adminVolunteers', 'importVolunteers'];

// ===================== واجهة المتطوع =====================
function apiConfig() {
  const regs = table('regs').all();
  const list = allPrograms().filter(function (p) { return p.state === 'مفتوح'; })
    .sort(function (a, b) { return a.order - b.order; })
    .map(function (p) { const o = publicProgram(p, regs); if (!o.charterText) o.charterText = defaultText(); return o; });
  return { programs: list };
}

// التعرف على متطوع مسجل: يرسل رمزا من ٤ أرقام إلى بريده المسجل (أو يتحقق بجواله إن لم يكن له بريد)
function apiLookupStart(p) {
  const id = digits(p.nationalId);
  if (!/^[12]\d{9}$/.test(id)) return { found: false };
  const v = table('volunteers').find('nationalId', id);
  if (!v) return { found: false };
  if (v.email) {
    const c = CacheService.getScriptCache();
    const last = Number(c.get('otp_t_' + id) || 0);
    if (Date.now() - last > 55000) {
      const sent = Number(c.get('otp_c_' + id) || 0);
      if (sent >= 6) fail('طلبت رموزا كثيرة، حاول بعد ١٠ دقائق');
      const code = String(Math.floor(1000 + Math.random() * 9000));
      c.put('otp_' + id, JSON.stringify({ h: hash('otp|' + id + '|' + code), n: 0 }), 600);
      c.put('otp_t_' + id, String(Date.now()), 600);
      c.put('otp_c_' + id, String(sent + 1), 600);
      mail(v.email, 'رمز التحقق ' + code + ' — تطوع غراس', 'رمز التحقق',
        '<p>أهلا ' + h(firstName(v.name)) + '،</p><p>رمز التحقق لعرض بياناتك في تطوع غراس:</p>' +
        '<p style="font-size:32px;letter-spacing:8px;color:#1C437D;margin:10px 0" dir="ltr">' + code + '</p>' +
        '<p style="color:#6F6F6E;font-size:13px">صالح لمدة ١٠ دقائق. إذا ما طلبته، تجاهل هذه الرسالة.</p>');
    }
    return { found: true, method: 'email', hint: maskEmail(v.email) };
  }
  return v.phone ? { found: true, method: 'phone', hint: maskPhone(v.phone) } : { found: false };
}
function apiLookupVerify(p) {
  const id = digits(p.nationalId);
  const v = table('volunteers').find('nationalId', id);
  if (!v) fail('لم نجد بيانات بهذا الرقم');
  const c = CacheService.getScriptCache();
  if (p.code != null) {
    const o = J(c.get('otp_' + id), null);
    if (!o) fail('انتهت صلاحية الرمز، اضغط «إعادة الإرسال»');
    if (o.n >= 5) fail('محاولات كثيرة، اضغط «إعادة الإرسال» بعد دقيقة');
    if (o.h !== hash('otp|' + id + '|' + digits(p.code))) { o.n++; c.put('otp_' + id, JSON.stringify(o), 600); fail('الرمز غير صحيح'); }
    c.remove('otp_' + id);
  } else {
    if (v.email) fail('تحقق بالرمز المرسل إلى بريدك');
    throttle('ph_' + id);
    if (!v.phone || digits(p.phone) !== v.phone) { failed('ph_' + id); fail('الجوال لا يطابق المسجل'); }
  }
  const vt = newToken();
  c.put('vt_' + vt, id, 21600);
  const person = {};
  PERSON_FIELDS.forEach(function (f) { person[f[0]] = v[f[0]] || ''; });
  person.nationalityName = v.nationalityName || '';
  return { person: person, vtoken: vt };
}
function verifiedFor(vtoken, id) { return !!vtoken && CacheService.getScriptCache().get('vt_' + vtoken) === id; }
function maskEmail(e) { const a = String(e).split('@'); if (a.length < 2) return ''; const d = a[1].split('.'); return a[0].slice(0, 2) + '•••@' + d[0].slice(0, 1) + '•••.' + d.slice(1).join('.'); }
function maskPhone(p) { p = String(p || ''); return p ? p.slice(0, 3) + '•••' + p.slice(-4) : ''; }

function apiSubmit(p) {
  rememberSite(p.siteUrl);
  const person = cleanPerson(p.person);
  const sigB64 = String(p.signature || '').split(',').pop();
  if (!sigB64) fail('التوقيع مطلوب');
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  let reg, prog;
  try {
    prog = getProgram(p.programId);
    if (!prog || prog.state !== 'مفتوح') fail('التسجيل في هذا البرنامج مغلق');
    const regsT = table('regs'), regs = regsT.all();
    const pub = publicProgram(prog, regs);
    if (pub.seatsLeft === 0) fail('اكتملت المقاعد في هذا البرنامج');
    if (prog.gender === 'رجال' && person.gender === 'أنثى') fail('هذا البرنامج للرجال');
    if (prog.gender === 'نساء' && person.gender === 'ذكر') fail('هذا البرنامج للنساء');
    if (regs.some(function (r) { return r.programId === prog.id && r.nationalId === person.nationalId && r.status !== STATUS.REJECTED; }))
      fail('سبق لك التسجيل في هذا البرنامج. افتح رابط المتابعة الذي وصلك بالبريد، أو استعده من الصفحة الرئيسية');
    const emp = prog.employerSig && person.nationality !== 'سعودي';
    if (emp && !person.employer) fail('اكتب جهة العمل، فهذا البرنامج يحتاج توقيع صاحب العمل');
    const regId = nextRegId();
    const answers = cleanAnswers(prog, p.answers);
    reg = {
      regId: regId, created: now(), updated: now(), status: emp ? STATUS.EMPLOYER : STATUS.PENDING,
      programId: prog.id, programName: prog.name, name: person.name, nationalId: person.nationalId, phone: person.phone,
      email: person.email, nationality: nationalityText(person), employerRequired: emp ? YES : NO,
      answersText: answersText(prog, answers), person: JSON.stringify(person), answers: JSON.stringify(answers),
      files: '{}', token: newToken()
    };
    regsT.add(reg);
  } finally { lock.releaseLock(); }

  // الملفات والتوقيع والميثاق (بعد فك القفل)
  const sigFile = folder('signatures').createFile(Utilities.newBlob(Utilities.base64Decode(sigB64), 'image/png', 'توقيع المتطوع - ' + reg.regId + '.png'));
  reg.signatureId = sigFile.getId();
  reg.files = JSON.stringify(saveQuestionFiles(prog, reg, p.files, {}));
  table('regs').put(reg);
  try { ensureDraft(reg, prog); } catch (err) { console.error(err); notifyAdminError('تعذر توليد الميثاق للتسجيل ' + reg.regId, err); }
  upsertVolunteer(JSON.parse(reg.person), verifiedFor(p.vtoken, person.nationalId));
  writeProgramSheet(reg, prog);
  mailVolunteerReceived(reg, prog);
  mailAdmin('تسجيل جديد: ' + reg.name + ' — ' + prog.name, 'تسجيل جديد', regSummaryHtml(reg) +
    (reg.status === STATUS.EMPLOYER ? '<p>بانتظار رفع وثيقة صاحب العمل.</p>' : '<p>التسجيل بانتظار الاعتماد.</p>'));
  return { regId: reg.regId, token: reg.token, status: reg.status };
}

function apiStatus(p) {
  const r = regByToken(p.token), prog = getProgram(r.programId) || { name: r.programName, questions: [] };
  return {
    reg: { regId: r.regId, created: r.created, status: r.status, programName: r.programName, programId: r.programId,
      employerRequired: r.employerRequired === YES, hasEmployer: !!r.employerId, note: r.note, reason: r.reason,
      approvedAt: r.approvedAt, person: J(r.person, {}), answers: J(r.answers, {}) },
    program: (function (o) { if (!o.charterText) o.charterText = defaultText(); return o; })(publicProgram(prog, table('regs').all()))
  };
}

function apiDoc(p) {
  const r = regByToken(p.token);
  if (p.which === 'final') {
    if (!r.finalId || r.status !== STATUS.APPROVED) fail('الوثيقة غير جاهزة بعد');
    return fileOut(DriveApp.getFileById(r.finalId), 'ميثاق التطوع - ' + r.regId + '.pdf');
  }
  ensureDraft(r, getProgram(r.programId));
  return fileOut(DriveApp.getFileById(r.draftId), 'ميثاق التطوع - ' + r.regId + ' - للتوقيع.pdf');
}

function apiUploadEmployer(p) {
  const r = regByToken(p.token);
  if ([STATUS.EMPLOYER, STATUS.CHANGES].indexOf(r.status) < 0) fail('لا يمكن رفع الوثيقة في هذه المرحلة');
  const f = saveUpload(p.file, folder('employer'), 'وثيقة صاحب العمل - ' + r.name + ' - ' + r.regId);
  if (r.employerId) trash(r.employerId);
  r.employerId = f.getId(); r.employerMime = f.getMimeType();
  if (r.status === STATUS.EMPLOYER) r.status = STATUS.PENDING;
  r.updated = now();
  table('regs').put(r);
  writeProgramSheet(r, getProgram(r.programId));
  mailAdmin('وثيقة صاحب العمل: ' + r.name + ' — ' + r.programName, 'رُفعت وثيقة صاحب العمل', regSummaryHtml(r) + '<p>التسجيل جاهز للاعتماد.</p>');
  return { status: r.status };
}

function apiResubmit(p) {
  rememberSite(p.siteUrl);
  const r = regByToken(p.token);
  if (r.status !== STATUS.CHANGES) fail('لا يمكن التعديل في هذه المرحلة');
  const prog = getProgram(r.programId);
  if (!prog) fail('البرنامج غير موجود');
  const person = cleanPerson(p.person);
  if (person.nationalId !== r.nationalId) fail('لا يمكن تغيير رقم الهوية في التعديل');
  const emp = prog.employerSig && person.nationality !== 'سعودي';
  if (emp && !person.employer) fail('اكتب جهة العمل');
  const answers = Object.assign(J(r.answers, {}), cleanAnswers(prog, p.answers));
  r.person = JSON.stringify(person); r.answers = JSON.stringify(answers); r.answersText = answersText(prog, answers);
  r.name = person.name; r.phone = person.phone; r.email = person.email; r.nationality = nationalityText(person);
  r.files = JSON.stringify(saveQuestionFiles(prog, r, p.files, J(r.files, {})));
  const sigB64 = String(p.signature || '').split(',').pop();
  if (sigB64) {
    if (r.signatureId) trash(r.signatureId);
    r.signatureId = folder('signatures').createFile(Utilities.newBlob(Utilities.base64Decode(sigB64), 'image/png', 'توقيع المتطوع - ' + r.regId + '.png')).getId();
  }
  if (p.employerFile && p.employerFile.b64) {
    const f = saveUpload(p.employerFile, folder('employer'), 'وثيقة صاحب العمل - ' + r.name + ' - ' + r.regId);
    if (r.employerId) trash(r.employerId);
    r.employerId = f.getId(); r.employerMime = f.getMimeType();
  }
  r.employerRequired = emp ? YES : NO;
  r.status = emp && !r.employerId ? STATUS.EMPLOYER : STATUS.PENDING;
  r.note = ''; r.updated = now();
  if (r.draftId) { trash(r.draftId); r.draftId = ''; }
  table('regs').put(r);
  try { ensureDraft(r, prog); } catch (err) { console.error(err); }
  upsertVolunteer(person, true);
  writeProgramSheet(r, prog);
  mailAdmin('أعاد الإرسال بعد التعديل: ' + r.name + ' — ' + r.programName, 'أعاد المتطوع الإرسال', regSummaryHtml(r));
  return { status: r.status };
}

function apiResendLinks(p) {
  rememberSite(p.siteUrl);
  const id = digits(p.nationalId), ph = digits(p.phone);
  const list = table('regs').all().filter(function (r) { return r.nationalId === id && r.phone === ph; });
  if (list.length) {
    const rows = list.map(function (r) {
      return '<tr><td style="padding:8px 0">' + h(r.programName) + '<br><small style="color:#6F6F6E">' + h(r.regId) + ' — ' + h(r.status) + '</small></td><td style="padding:8px 0;text-align:left"><a href="' + h(trackLink(r)) + '" style="color:#1C437D">فتح</a></td></tr>';
    }).join('');
    mail(list[0].email, 'روابط متابعة تسجيلاتك — تطوع غراس', 'روابط المتابعة',
      '<p>هذه روابط تسجيلاتك في تطوع غراس:</p><table style="width:100%;border-collapse:collapse">' + rows + '</table>');
  }
  return {};
}

// ===================== لوحة الإدارة =====================
function apiAdminLoad() {
  const regs = table('regs').all();
  const stampId = props().getProperty('STAMP_ID');
  return {
    programs: allPrograms().map(function (p) { const o = publicProgram(p, regs); delete o.charterText; return o; }),
    supervisors: activeSupervisors().map(function (s) { return { id: s.id, name: s.name, title: s.title, hasSignature: !!s.signatureId }; }),
    settings: { alertEmail: alertEmail(), hasStamp: !!stampId, stamp: stampId ? dataUrl(stampId) : '' },
    regs: regs.reverse().map(lightReg)
  };
}

function apiRegDetail(p) {
  const r = regById(p.regId), prog = getProgram(r.programId) || { name: r.programName, questions: [] };
  const files = J(r.files, {});
  const o = lightReg(r);
  Object.assign(o, { person: J(r.person, {}), answers: J(r.answers, {}), note: r.note, reason: r.reason,
    approvedBy: r.approvedBy, approvedAt: r.approvedAt, hasFinal: !!r.finalId, finalUrl: r.finalUrl,
    files: Object.keys(files).map(function (k) { return { key: k }; }), signature: r.signatureId ? dataUrl(r.signatureId) : '' });
  return { reg: o, program: publicProgram(prog, []) };
}

function apiAdminFile(p) {
  const r = regById(p.regId);
  if (p.kind === 'final') { if (!r.finalId) fail('لا توجد وثيقة معتمدة'); return fileOut(DriveApp.getFileById(r.finalId)); }
  if (p.kind === 'draft') { ensureDraft(r, getProgram(r.programId)); return fileOut(DriveApp.getFileById(r.draftId)); }
  if (p.kind === 'employer') { if (!r.employerId) fail('لم تُرفع وثيقة صاحب العمل'); return fileOut(DriveApp.getFileById(r.employerId)); }
  const files = J(r.files, {});
  if (!files[p.kind]) fail('الملف غير موجود');
  return fileOut(DriveApp.getFileById(files[p.kind]));
}

function apiCheckSupervisor(p) {
  const s = checkSupervisor(p.supervisorId, p.code);
  const stampId = props().getProperty('STAMP_ID');
  if (!stampId) fail('لم يُرفع ختم الجمعية بعد، ارفعه من الإعدادات');
  return { name: s.name, title: s.title, signature: dataUrl(s.signatureId), stamp: dataUrl(stampId) };
}

function apiApprove(p) {
  const s = checkSupervisor(p.supervisorId, p.code);
  const r = regById(p.regId);
  if (r.status !== STATUS.PENDING) fail('هذا التسجيل ليس بانتظار الاعتماد');
  const prog = getProgram(r.programId) || { name: r.programName, questions: [] };
  const appr = { name: s.name, title: s.title, signatureId: s.signatureId, date: new Date() };
  let blob;
  if (r.employerId && !p.merged) {
    const charter = buildPdf(r, prog, appr);
    const emp = DriveApp.getFileById(r.employerId).getBlob();
    return { needMerge: true, charter: Utilities.base64Encode(charter.getBytes()),
      employer: { b64: Utilities.base64Encode(emp.getBytes()), mime: emp.getContentType(), name: emp.getName() } };
  }
  blob = p.merged ? Utilities.newBlob(Utilities.base64Decode(String(p.merged).split(',').pop()), 'application/pdf') : buildPdf(r, prog, appr);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const fresh = regById(p.regId);
    if (fresh.status !== STATUS.PENDING) fail('اعتُمد هذا التسجيل أو تغيرت حالته قبل قليل');
    const name = 'ميثاق التطوع - ' + fresh.name + ' - ' + fresh.regId + '.pdf';
    const file = subFolder(folder('approved'), prog.name || fresh.programName).createFile(blob.setName(name));
    fresh.finalId = file.getId(); fresh.finalUrl = file.getUrl();
    fresh.status = STATUS.APPROVED; fresh.approvedBy = s.name + ' — ' + s.title; fresh.approvedAt = now(); fresh.updated = now();
    table('regs').put(fresh);
    writeProgramSheet(fresh, prog);
    mailVolunteerApproved(fresh, prog, file.getBlob());
  } finally { lock.releaseLock(); }
  return { status: STATUS.APPROVED };
}

function apiRequestChanges(p) {
  const r = regById(p.regId);
  if ([STATUS.PENDING, STATUS.EMPLOYER].indexOf(r.status) < 0) fail('لا يمكن طلب تعديل في هذه المرحلة');
  const note = String(p.note || '').trim(); if (!note) fail('اكتب الملاحظة');
  r.status = STATUS.CHANGES; r.note = note.slice(0, 2000); r.updated = now();
  table('regs').put(r);
  writeProgramSheet(r, getProgram(r.programId));
  mail(r.email, 'مطلوب تعديل على تسجيلك — ' + r.programName, 'مطلوب تعديل',
    '<p>أهلا ' + h(firstName(r.name)) + '،</p><p>راجع فريق الجمعية تسجيلك في <strong>' + h(r.programName) + '</strong>، ويحتاج تعديلا بسيطا:</p>' +
    '<p style="background:#F4F6FA;border-right:4px solid #A9CF45;padding:12px 16px;border-radius:10px">' + h(r.note) + '</p>' +
    '<p>افتح الرابط، وعدّل المطلوب، ثم أعد الإرسال.</p>', { text: 'عدّل تسجيلك', url: trackLink(r) });
  return {};
}

function apiReject(p) {
  const r = regById(p.regId);
  if (r.status === STATUS.APPROVED) fail('لا يمكن رفض تسجيل معتمد');
  const reason = String(p.reason || '').trim(); if (!reason) fail('اكتب السبب');
  r.status = STATUS.REJECTED; r.reason = reason.slice(0, 2000); r.updated = now();
  table('regs').put(r);
  writeProgramSheet(r, getProgram(r.programId));
  mail(r.email, 'بخصوص تسجيلك في ' + r.programName, 'شكرا لاهتمامك',
    '<p>أهلا ' + h(firstName(r.name)) + '،</p><p>نشكرك على رغبتك في التطوع معنا في <strong>' + h(r.programName) + '</strong>. نعتذر عن عدم قبول التسجيل هذه المرة، للسبب التالي:</p>' +
    '<p style="background:#F4F6FA;border-right:4px solid #C4332B;padding:12px 16px;border-radius:10px">' + h(r.reason) + '</p><p>يسعدنا تسجيلك في فرص قادمة.</p>');
  return {};
}

function apiSaveProgram(p) {
  const x = p.program || {};
  const t = table('programs');
  let row = x.id ? t.find('id', x.id) : null;
  if (x.id && !row) fail('البرنامج غير موجود');
  const isGeneral = row && row.kind === 'general';
  const name = String(x.name || '').trim(); if (!name) fail('اكتب اسم البرنامج');
  const states = isGeneral ? ['مفتوح', 'مغلق'] : ['مفتوح', 'مغلق', 'مؤرشف'];
  const o = row || { id: 'p' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), kind: 'program', order: String(t.all().length) };
  Object.assign(o, {
    name: name.slice(0, 120), desc: str(x.desc, 1500), state: states.indexOf(x.state) >= 0 ? x.state : 'مغلق',
    location: str(x.location, 300), startDate: str(x.startDate, 10), endDate: str(x.endDate, 10),
    days: (x.days || []).filter(function (d) { return DAYS.indexOf(d) >= 0; }).join('، '),
    timeFrom: str(x.timeFrom, 5), timeTo: str(x.timeTo, 5), hours: digits(x.hours).slice(0, 5), seats: digits(x.seats).slice(0, 5),
    gender: ['الكل', 'رجال', 'نساء'].indexOf(x.gender) >= 0 ? x.gender : 'الكل', employerSig: x.employerSig ? YES : NO,
    extras: JSON.stringify((x.extras || []).filter(function (e) { return e && e.k; }).slice(0, 30).map(function (e) { return { k: str(e.k, 60), v: str(e.v, 1000) }; })),
    questions: JSON.stringify(cleanQuestions(x.questions)),
    image: /^data:image\/(jpeg|png|webp);base64,/.test(x.image || '') && x.image.length < 49000 ? x.image : '',
    updated: now()
  });
  // القالب
  if (p.template && p.template.b64) {
    const doc = convertToDoc(p.template, folder('templates'), 'قالب ميثاق - ' + name);
    o.templateId = doc; o.templateName = p.template.name;
  } else if (p.templateLink) {
    const m = String(p.templateLink).match(/\/d\/([\w-]{20,})/) || String(p.templateLink).match(/^([\w-]{25,})$/);
    if (!m) fail('رابط Google Docs غير صحيح');
    try { DocumentApp.openById(m[1]); } catch (err) { fail('ما قدرنا نفتح ملف Google Docs. تأكد أنه مشارك مع حساب ' + Session.getEffectiveUser().getEmail()); }
    o.templateId = m[1]; o.templateName = DriveApp.getFileById(m[1]).getName();
  }
  if (o.templateId) {
    try { o.charterText = templateText(o.templateId); } catch (err) { fail('تعذر قراءة القالب: تأكد أن الملف موجود ولديك صلاحية عليه'); }
  } else o.charterText = '';
  if (row) t.put(o); else t.add(o);
  return { id: o.id };
}

function apiPreviewTemplate(p) {
  const prog = getProgram(p.programId); if (!prog) fail('البرنامج غير موجود');
  const s = activeSupervisors().filter(function (x) { return x.signatureId; })[0];
  const fake = { regId: 'GV-0000', created: now(), employerRequired: prog.employerSig ? YES : NO,
    person: JSON.stringify({ name: 'اسم المتطوع التجريبي', nationalId: '2000000000', nationality: 'غير سعودي', nationalityName: 'مصري',
      gender: 'ذكر', birthDate: '1995-01-01', phone: '0500000000', email: 'test@example.com', city: 'الرياض', district: 'السويدي',
      qualification: 'بكالوريوس', major: 'تربية', employer: 'جهة العمل', jobTitle: 'معلم' }) };
  const pdf = buildPdf(fake, prog, { name: s ? s.name : 'اسم المشرف', title: s ? s.title : 'صفة المشرف', signatureId: s ? s.signatureId : '', date: new Date() });
  return { b64: Utilities.base64Encode(pdf.getBytes()), mime: 'application/pdf', name: 'معاينة الميثاق - ' + prog.name + '.pdf' };
}

function apiSaveSupervisor(p) {
  const x = p.supervisor || {};
  const t = table('supervisors');
  let o = x.id ? t.find('id', x.id) : null;
  const name = str(x.name, 80), title = str(x.title, 80);
  if (!name || !title) fail('اكتب الاسم والصفة');
  if (!o) {
    if (!x.code || String(x.code).length < 4) fail('رمز الاعتماد ٤ خانات على الأقل');
    if (!x.signature) fail('ارفع صورة التوقيع');
    o = { id: 's' + Utilities.getUuid().replace(/-/g, '').slice(0, 8), active: YES };
  }
  o.name = name; o.title = title; o.updated = now();
  if (x.code) { if (String(x.code).length < 4) fail('رمز الاعتماد ٤ خانات على الأقل'); o.codeHash = hash('sup|' + o.id + '|' + x.code); }
  if (x.signature) {
    if (o.signatureId) trash(o.signatureId);
    o.signatureId = folder('signatures').createFile(Utilities.newBlob(Utilities.base64Decode(String(x.signature).split(',').pop()), 'image/png', 'توقيع المشرف - ' + name + '.png')).getId();
  }
  if (o._row) t.put(o); else t.add(o);
  return {};
}

function apiRemoveSupervisor(p) {
  const t = table('supervisors'), o = t.find('id', p.id);
  if (!o) fail('المشرف غير موجود');
  o.active = NO; o.updated = now(); t.put(o);
  return {};
}

function apiSaveSettings(p) {
  const P = props();
  if (p.alertEmail != null) {
    const em = String(p.alertEmail).trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) fail('البريد غير صحيح');
    P.setProperty('ALERT_EMAIL', em || CONFIG.ALERT_EMAIL);
  }
  if (p.stamp) {
    const old = P.getProperty('STAMP_ID');
    const f = folder('signatures').createFile(Utilities.newBlob(Utilities.base64Decode(String(p.stamp).split(',').pop()), 'image/png', 'ختم الجمعية.png'));
    P.setProperty('STAMP_ID', f.getId());
    if (old) trash(old);
  }
  if (p.newAdminCode) {
    if (String(p.newAdminCode).length < 6) fail('رمز الدخول ٦ خانات على الأقل');
    P.setProperty('ADMIN_HASH', hash(String(p.newAdminCode)));
  }
  return {};
}

function apiAdminVolunteers() {
  const progs = {};
  allPrograms().forEach(function (p) { progs[p.id] = p; });
  const vols = table('volunteers').all().map(function (v) { delete v._row; return v; });
  const regs = table('regs').all().map(function (r) {
    const p = progs[r.programId] || {};
    return { regId: r.regId, nationalId: r.nationalId, programName: r.programName, status: r.status, hours: p.hours || '',
      startDate: p.startDate || '', endDate: p.endDate || '', created: r.created, approvedAt: r.approvedAt, person: J(r.person, {}) };
  });
  return { volunteers: vols, regs: regs };
}

// رفع بيانات المتطوعين من ملف Excel (يُقرأ في المتصفح ويصل هنا صفوفا)
function apiImportVolunteers(p) {
  const rows = (p.rows || []).slice(0, 5000);
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const t = table('volunteers'), all = t.all(), idx = {};
    all.forEach(function (o) { idx[o.nationalId] = o; });
    let added = 0, updated = 0;
    const dirty = [], fresh = [];
    rows.forEach(function (x) {
      const q = cleanImported(x); if (!q) return;
      const o = idx[q.nationalId];
      if (o) {
        Object.keys(q).forEach(function (k) { if (q[k]) o[k] = q[k]; });
        o.updated = now(); if (dirty.indexOf(o) < 0) dirty.push(o); updated++;
      } else {
        const n = Object.assign({}, q, { source: 'ملف', created: now(), updated: now() });
        idx[q.nationalId] = n; fresh.push(n); added++;
      }
    });
    t.bulk(dirty, fresh);
    return { added: added, updated: updated };
  } finally { lock.releaseLock(); }
}
function cleanImported(x) {
  x = x || {};
  const q = {};
  PERSON_FIELDS.forEach(function (f) { q[f[0]] = str(x[f[0]], 150); });
  q.nationalityName = str(x.nationalityName, 60);
  q.nationalId = digits(q.nationalId);
  if (!/^[12]\d{9}$/.test(q.nationalId) || !q.name) return null;
  if (['سعودي', 'غير سعودي'].indexOf(q.nationality) < 0) q.nationality = q.nationalId[0] === '1' ? 'سعودي' : 'غير سعودي';
  if (['ذكر', 'أنثى'].indexOf(q.gender) < 0) q.gender = '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(q.birthDate)) q.birthDate = '';
  q.phone = digits(q.phone); if (!/^05\d{8}$/.test(q.phone)) q.phone = '';
  q.email = q.email.toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(q.email)) q.email = '';
  return q;
}

// ===================== الميثاق والوثائق =====================
function ensureDraft(r, prog) {
  if (r.draftId) { try { DriveApp.getFileById(r.draftId); return; } catch (e) { r.draftId = ''; } }
  prog = prog || { name: r.programName, questions: [] };
  const pdf = buildPdf(r, prog, null).setName('الميثاق بتوقيع المتطوع - ' + r.name + ' - ' + r.regId + '.pdf');
  const f = folder('drafts').createFile(pdf);
  r.draftId = f.getId();
  if (r._row) table('regs').put(r);
}

// يولد PDF من القالب: يضع البيانات مكان {الأماكن} والصور مكان {توقيع_المتطوع} {الختم} {توقيع_المشرف}
function buildPdf(r, prog, appr) {
  const tplId = prog.templateId || defaultTemplate();
  const tmp = DriveApp.getFileById(tplId).makeCopy('مؤقت - ' + (r.regId || ''), folder('tmp'));
  try {
    const doc = DocumentApp.openById(tmp.getId());
    const person = J(r.person, {});
    const map = placeholderMap(person, prog, r, appr);
    const stampId = props().getProperty('STAMP_ID');
    const imgs = {
      'توقيع_المتطوع': [r.signatureId ? blobOf(r.signatureId) : null, 150, 70],
      'الختم': [appr && stampId ? blobOf(stampId) : null, 105, 105],
      'توقيع_المشرف': [appr && appr.signatureId ? blobOf(appr.signatureId) : null, 150, 70]
    };
    const parts = [doc.getBody(), doc.getHeader(), doc.getFooter()].filter(function (x) { return x; });
    parts.forEach(function (sec) {
      Object.keys(imgs).forEach(function (k) { putImage(sec, k, imgs[k][0], imgs[k][1], imgs[k][2]); });
      Object.keys(map).forEach(function (k) { sec.replaceText(phRx(k), safeRepl(map[k])); });
      sec.replaceText('\\{[^{}\\n]{1,40}\\}', '');
    });
    doc.saveAndClose();
    return tmp.getAs(MimeType.PDF).setName('ميثاق التطوع - ' + (r.regId || '') + '.pdf');
  } finally { tmp.setTrashed(true); }
}

function phRx(k) {
  return '\\{\\s*' + k.split('_').map(function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('[ _]') + '\\s*\\}';
}
function safeRepl(v) { return String(v == null ? '' : v).replace(/\$/g, '＄').replace(/\\/g, '／'); }

function putImage(sec, key, blob, maxW, maxH) {
  const pat = phRx(key);
  let found = sec.findText(pat), guard = 0;
  while (found && guard++ < 30) {
    const t = found.getElement().asText();
    const s = found.getStartOffset(), e = found.getEndOffsetInclusive();
    const par = t.getParent();
    const ptype = par.getType();
    const full = t.getText();
    const tail = full.substring(e + 1);
    let attrs = null;
    try { attrs = t.getAttributes(Math.max(0, s - 1)); } catch (x) {}
    // احذف من بداية المكان إلى نهاية النص، ثم أعد الذيل بعد الصورة
    t.deleteText(s, full.length - 1);
    if (blob && (ptype === DocumentApp.ElementType.PARAGRAPH || ptype === DocumentApp.ElementType.LIST_ITEM)) {
      const idx = par.getChildIndex(t);
      const img = par.insertInlineImage(idx + 1, blob);
      const w = img.getWidth(), hh = img.getHeight(), k = Math.min(maxW / w, maxH / hh, 1.5);
      img.setWidth(Math.round(w * k)).setHeight(Math.round(hh * k));
      if (tail) { const nt = par.insertText(idx + 2, tail); if (attrs) { try { nt.setAttributes(attrs); } catch (x) {} } }
    } else if (tail) {
      t.appendText(tail);
    }
    found = sec.findText(pat);
  }
}

function placeholderMap(person, prog, r, appr) {
  const m = {};
  PERSON_FIELDS.forEach(function (f) {
    m[f[2]] = f[0] === 'nationality' ? nationalityText(person) : f[0] === 'birthDate' ? fmtDate(person.birthDate) : (person[f[0]] || '');
  });
  m['البرنامج'] = prog.name || '';
  m['المكان'] = prog.location || '';
  m['تاريخ_البداية'] = fmtDate(prog.startDate);
  m['تاريخ_النهاية'] = fmtDate(prog.endDate);
  m['الأيام'] = (prog.days || []).join('، ');
  m['الوقت'] = programTime(prog);
  m['الساعات'] = prog.hours ? toAr(prog.hours) : '';
  m['رقم_التسجيل'] = r.regId || '';
  m['تاريخ_التسجيل'] = fmtDate(r.created || new Date());
  m['التاريخ'] = fmtDate(new Date());
  m['اسم_المشرف'] = appr ? appr.name : '';
  m['صفة_المشرف'] = appr ? appr.title : '';
  m['تاريخ_الاعتماد'] = appr ? fmtDate(appr.date || new Date()) : '';
  (prog.extras || []).forEach(function (x) { if (x && x.k) m[String(x.k).trim().replace(/\s+/g, '_')] = x.v || ''; });
  return m;
}

// تحويل ملف Word إلى Google Docs داخل مجلد القوالب
function convertToDoc(file, parent, name) {
  const bytes = Utilities.base64Decode(String(file.b64).split(',').pop());
  if (bytes.length > CONFIG.MAX_FILE_MB * 1048576) fail('ملف القالب كبير');
  const boundary = 'gheras' + Date.now();
  const meta = JSON.stringify({ name: name, mimeType: MimeType.GOOGLE_DOCS, parents: [parent.getId()] });
  const head = Utilities.newBlob('--' + boundary + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + meta +
    '\r\n--' + boundary + '\r\nContent-Type: ' + (file.mime || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') + '\r\n\r\n').getBytes();
  const tail = Utilities.newBlob('\r\n--' + boundary + '--').getBytes();
  const res = UrlFetchApp.fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
    method: 'post', contentType: 'multipart/related; boundary=' + boundary, payload: head.concat(bytes).concat(tail),
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) { console.error(res.getContentText()); fail('تعذر تحويل القالب. تأكد أنه ملف Word صالح (.docx)'); }
  return JSON.parse(res.getContentText()).id;
}
// نص القالب الافتراضي (يُعرض للمتطوع في البرامج التي ليس لها قالب خاص)
function defaultText() {
  const c = CacheService.getScriptCache(), k = 'default_text', v = c.get(k);
  if (v) return v;
  let t = '';
  try { t = templateText(defaultTemplate()); } catch (e) { console.error(e); }
  try { c.put(k, t, 3600); } catch (e) {}
  return t;
}
function templateText(id) {
  const d = DocumentApp.openById(id);
  return d.getBody().getText().slice(0, 45000);
}

// القالب الافتراضي (ينشأ مرة واحدة، وتقدر تعدله من Drive)
function defaultTemplate() {
  const P = props(), id = P.getProperty('DEFAULT_TPL');
  if (id) { try { if (!DriveApp.getFileById(id).isTrashed()) return id; } catch (e) {} }
  const doc = DocumentApp.create('قالب ميثاق التطوع (الافتراضي)');
  const b = doc.getBody();
  b.setMarginTop(50).setMarginBottom(50).setMarginLeft(60).setMarginRight(60);
  const para = function (text, opt) {
    opt = opt || {};
    const p = b.appendParagraph(text);
    p.setLeftToRight(false).setAlignment(opt.center ? DocumentApp.HorizontalAlignment.CENTER : DocumentApp.HorizontalAlignment.RIGHT)
      .setSpacingAfter(opt.after == null ? 6 : opt.after).setLineSpacing(1.4);
    p.editAsText().setFontFamily('Arial').setFontSize(opt.size || 12).setForegroundColor(opt.color || '#14213A').setBold(!!opt.bold);
    return p;
  };
  b.getParagraphs()[0].setText(CONFIG.ORG_NAME).setLeftToRight(false).setAlignment(DocumentApp.HorizontalAlignment.RIGHT)
    .editAsText().setFontFamily('Arial').setFontSize(11).setForegroundColor('#27B5C1');
  para('ميثاق التطوع — {البرنامج}', { size: 20, color: '#1C437D', after: 14 });
  para('أنا المتطوع/ـة: {الاسم}، الجنسية: {الجنسية}، رقم الهوية أو الإقامة: {رقم_الهوية}، الجوال: {الجوال}، البريد: {البريد}.');
  para('أرغب في التطوع لدى ' + CONFIG.ORG_NAME + ' في {البرنامج}، وأقر بأني قرأت هذا الميثاق، وألتزم بما يلي:', { after: 10 });
  [
    'الحضور في الأيام والأوقات المحددة: {الأيام} {الوقت}، بمجموع {الساعات} ساعة تطوعية.',
    'المحافظة على سلامة الأطفال وخصوصيتهم، وعدم تصويرهم أو نشر صورهم أو بياناتهم.',
    'الالتزام بتوجيهات مشرف البرنامج وأنظمة الجمعية وقيمها، وحسن التعامل مع الجميع.',
    'المحافظة على سرية المعلومات التي أطّلع عليها أثناء التطوع.',
    'إبلاغ المشرف قبل وقت كاف عند تعذر الحضور أو الرغبة في الانسحاب.'
  ].forEach(function (t, i) { para(toAr(i + 1) + '. ' + t); });
  para('مكان التنفيذ: {المكان} — المدة: من {تاريخ_البداية} إلى {تاريخ_النهاية}', { after: 4 });
  para('رقم التسجيل: {رقم_التسجيل} — تاريخ التسجيل: {تاريخ_التسجيل}', { after: 18, color: '#6F6F6E', size: 10 });
  // جدول التواقيع: الأعمدة من اليسار إلى اليمين (الجمعية، صاحب العمل، المتطوع) ليقرأ من اليمين
  const tbl = b.appendTable([
    ['اعتماد الجمعية', 'صاحب العمل (لغير السعوديين عند الطلب)', 'المتطوع'],
    ['{الختم} {توقيع_المشرف}', '\n\n\n', '{توقيع_المتطوع}'],
    ['{اسم_المشرف}\n{صفة_المشرف}\n{تاريخ_الاعتماد}', 'الاسم والتوقيع والختم', '{الاسم}\n{التاريخ}']
  ]);
  tbl.setBorderColor('#D5DCE7');
  for (let i = 0; i < tbl.getNumRows(); i++) {
    for (let j = 0; j < tbl.getRow(i).getNumCells(); j++) {
      const c = tbl.getCell(i, j);
      c.setPaddingTop(6).setPaddingBottom(6);
      for (let k = 0; k < c.getNumChildren(); k++) {
        const ch = c.getChild(k);
        if (ch.getType() === DocumentApp.ElementType.PARAGRAPH) {
          ch.asParagraph().setLeftToRight(false).setAlignment(DocumentApp.HorizontalAlignment.CENTER)
            .editAsText().setFontFamily('Arial').setFontSize(i === 0 ? 11 : 10).setForegroundColor(i === 0 ? '#1C437D' : '#14213A');
        }
      }
    }
  }
  doc.saveAndClose();
  const f = DriveApp.getFileById(doc.getId());
  f.moveTo(folder('templates'));
  P.setProperty('DEFAULT_TPL', f.getId());
  return f.getId();
}

// ===================== الإيميلات =====================
function mailVolunteerReceived(r, prog) {
  const emp = r.status === STATUS.EMPLOYER;
  const att = [];
  if (emp && r.draftId) { try { att.push(DriveApp.getFileById(r.draftId).getBlob()); } catch (e) {} }
  const body = '<p>أهلا ' + h(firstName(r.name)) + '،</p><p>وصلنا تسجيلك في <strong>' + h(prog.name) + '</strong>، ورقم تسجيلك <strong dir="ltr">' + h(r.regId) + '</strong>.</p>' +
    (emp
      ? '<p><strong>باقي خطوة وحدة:</strong> أرفقنا لك الميثاق بتوقيعك. اطبعه، وخذ توقيع صاحب العمل وختمه، ثم صوّره وارفعه من رابط المتابعة.</p>'
      : '<p>تسجيلك الآن عند فريق الجمعية للمراجعة والاعتماد، وتوصلك الوثيقة المعتمدة على هذا البريد.</p>') +
    '<p style="color:#6F6F6E;font-size:13px">احتفظ بهذا الإيميل؛ الرابط خاص بك ويفتح تسجيلك من أي جهاز.</p>';
  mail(r.email, 'وصل تسجيلك في ' + prog.name + ' — تطوع غراس', emp ? 'خطوة أخيرة: توقيع صاحب العمل' : 'وصل تسجيلك',
    body, { text: emp ? 'ارفع وثيقة صاحب العمل' : 'متابعة التسجيل', url: trackLink(r) }, att);
}
function mailVolunteerApproved(r, prog, pdf) {
  mail(r.email, 'اعتُمد تسجيلك في ' + prog.name + ' — تطوع غراس', 'مبروك، اعتُمد تسجيلك',
    '<p>أهلا ' + h(firstName(r.name)) + '،</p><p>اعتمدت الجمعية تسجيلك في <strong>' + h(prog.name) + '</strong>. أرفقنا لك ميثاق التطوع موقعا ومختوما من جميع الأطراف.</p>' +
    (prog.startDate ? '<p>يبدأ البرنامج في ' + fmtDate(prog.startDate) + (prog.location ? ' — ' + h(prog.location) : '') + '.</p>' : '') +
    '<p>نتطلع لأثرك معنا.</p>', { text: 'متابعة التسجيل', url: trackLink(r) }, [pdf]);
}
function mailAdmin(subject, title, html) {
  const base = siteBase();
  mail(alertEmail(), subject, title, html, base ? { text: 'فتح لوحة الإدارة', url: base + 'admin.html' } : null);
}
function notifyAdminError(subject, err) {
  try { MailApp.sendEmail({ to: alertEmail(), subject: 'تنبيه: ' + subject, body: String(err && err.stack ? err.stack : err) }); } catch (e) {}
}
function regSummaryHtml(r) {
  const row = function (k, v) { return v ? '<tr><td style="padding:4px 0;color:#6F6F6E;width:130px">' + k + '</td><td style="padding:4px 0">' + h(v) + '</td></tr>' : ''; };
  return '<table style="width:100%;border-collapse:collapse;margin:0 0 12px">' + row('الاسم', r.name) + row('البرنامج', r.programName) +
    row('رقم التسجيل', r.regId) + row('الجنسية', r.nationality) + row('الجوال', r.phone) + row('البريد', r.email) + row('الحالة', r.status) + '</table>';
}
function mail(to, subject, title, html, button, attachments) {
  if (!to) return;
  const base = siteBase();
  const logo = base ? '<img src="' + h(base) + 'assets/logo.png" alt="غراس" width="110" style="display:block;margin:0 0 18px">' : '<div style="color:#27B5C1;margin-bottom:12px">' + CONFIG.ORG_NAME + '</div>';
  const btn = button && button.url ? '<p style="margin:22px 0"><a href="' + h(button.url) + '" style="display:inline-block;background:#1C437D;color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:16px">' + h(button.text) + '</a></p>' : '';
  const htmlBody = '<div dir="rtl" style="background:#EEF1F6;padding:24px 12px;font-family:Tahoma,Arial,sans-serif">' +
    '<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:18px;overflow:hidden">' +
    '<div style="height:6px;background:#27B5C1;background:linear-gradient(90deg,#27B5C1,#6CBD53)"></div>' +
    '<div style="padding:28px 28px 10px;color:#14213A;font-size:15px;line-height:1.9;text-align:right">' + logo +
    '<h1 style="font-size:22px;font-weight:normal;color:#1C437D;margin:0 0 14px">' + h(title) + '</h1>' + html + btn + '</div>' +
    '<div style="padding:16px 28px;background:#F4F6FA;color:#6F6F6E;font-size:12px;text-align:right">' + CONFIG.ORG_NAME +
    ' — الرياض، السويدي الغربي — 0555432555 — www.Gheras.sa</div></div></div>';
  const opt = { to: to, subject: subject, htmlBody: htmlBody, name: CONFIG.SENDER_NAME };
  if (attachments && attachments.length) opt.attachments = attachments;
  try { MailApp.sendEmail(opt); } catch (e) { console.error('تعذر الإرسال إلى ' + to + ': ' + e); }
}

// ===================== ورقة كل برنامج =====================
function writeProgramSheet(r, prog) {
  if (!prog || !prog.id) return;
  try {
    const ss = SpreadsheetApp.getActive(), P = props();
    let sh = null;
    const sid = P.getProperty('PSHEET_' + prog.id);
    if (sid) sh = ss.getSheets().filter(function (s) { return String(s.getSheetId()) === sid; })[0] || null;
    if (!sh) {
      let name = ('برنامج - ' + prog.name).replace(/[\[\]*?\/\\:]/g, ' ').slice(0, 90);
      if (ss.getSheetByName(name)) name = (name + ' ' + prog.id).slice(0, 99);
      sh = ss.insertSheet(name);
      sh.setRightToLeft(true);
      sh.getRange(1, 1, 1, 8).setValues([['رقم التسجيل', 'تاريخ التسجيل', 'الحالة', 'الاسم', 'رقم الهوية', 'الجوال', 'البريد', 'الجنسية']]);
      styleHeader(sh, 8);
      sh.getRange('A:Z').setNumberFormat('@');
      P.setProperty('PSHEET_' + prog.id, String(sh.getSheetId()));
    }
    const answers = J(r.answers, {});
    let headers = sh.getRange(1, 1, 1, Math.max(8, sh.getLastColumn())).getValues()[0].map(String);
    (prog.questions || []).forEach(function (q) {
      if (headers.indexOf(q.label) < 0) {
        headers.push(q.label);
        sh.getRange(1, headers.length).setValue(q.label);
        styleHeader(sh, headers.length);
        sh.getRange(1, headers.length, sh.getMaxRows(), 1).setNumberFormat('@');
      }
    });
    const row = headers.map(function () { return ''; });
    const base = [r.regId, r.created, r.status, r.name, r.nationalId, r.phone, r.email, r.nationality];
    base.forEach(function (v, i) { row[i] = String(v || ''); });
    (prog.questions || []).forEach(function (q) {
      const v = answers[q.id];
      row[headers.indexOf(q.label)] = Array.isArray(v) ? v.join('، ') : String(v == null ? '' : v);
    });
    const ids = sh.getLastRow() > 1 ? sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().map(function (x) { return String(x[0]); }) : [];
    const at = ids.indexOf(r.regId);
    const rowNum = at >= 0 ? at + 2 : sh.getLastRow() + 1;
    sh.getRange(rowNum, 1, 1, row.length).setNumberFormat('@').setValues([row]);
  } catch (e) { console.error(e); }
}

// ===================== أدوات البيانات =====================
function table(key) {
  const def = SHEETS[key];
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(def.name);
  if (!sh) {
    sh = ss.insertSheet(def.name);
    sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, def.cols.length).setValues([def.cols.map(function (c) { return c[1]; })]);
    styleHeader(sh, def.cols.length);
    sh.getRange(1, 1, sh.getMaxRows(), def.cols.length).setNumberFormat('@');
  }
  const n = def.cols.length;
  if (sh.getLastColumn() < n) { // أعمدة جديدة أضيفت بعد التركيب
    sh.getRange(1, 1, 1, n).setValues([def.cols.map(function (c) { return c[1]; })]);
    styleHeader(sh, n);
    sh.getRange(1, 1, sh.getMaxRows(), n).setNumberFormat('@');
  }
  return {
    all: function () {
      const last = sh.getLastRow();
      if (last < 2) return [];
      return sh.getRange(2, 1, last - 1, n).getValues().map(function (r, i) {
        const o = { _row: i + 2 };
        def.cols.forEach(function (c, j) { o[c[0]] = cell(r[j]); });
        return o;
      }).filter(function (o) { return o[def.cols[0][0]]; });
    },
    find: function (k, v) { return this.all().filter(function (o) { return o[k] === String(v); })[0] || null; },
    add: function (o) {
      const r = sh.getLastRow() + 1;
      sh.getRange(r, 1, 1, n).setNumberFormat('@').setValues([def.cols.map(function (c) { return clip(o[c[0]]); })]);
      o._row = r; return o;
    },
    put: function (o) { sh.getRange(o._row, 1, 1, n).setValues([def.cols.map(function (c) { return clip(o[c[0]]); })]); },
    // تحديث صفوف موجودة وإضافة صفوف جديدة بكتابة واحدة
    bulk: function (changed, added) {
      const toRow = function (o) { return def.cols.map(function (c) { return clip(o[c[0]]); }); };
      const last = sh.getLastRow();
      if (changed.length && last >= 2) {
        const block = sh.getRange(2, 1, last - 1, n).getValues();
        changed.forEach(function (o) { block[o._row - 2] = toRow(o); });
        sh.getRange(2, 1, last - 1, n).setNumberFormat('@').setValues(block);
      }
      if (added.length) sh.getRange(Math.max(2, last + 1), 1, added.length, n).setNumberFormat('@').setValues(added.map(toRow));
    }
  };
}
function cell(v) {
  if (v instanceof Date) return Utilities.formatDate(v, CONFIG.TZ, v.getFullYear() < 1901 ? 'HH:mm' : 'yyyy-MM-dd');
  return v == null ? '' : String(v);
}
function clip(v) { return v == null ? '' : String(v).slice(0, 49500); }
function styleHeader(sh, n) {
  sh.getRange(1, 1, 1, n).setBackground('#1C437D').setFontColor('#FFFFFF').setFontWeight('bold');
  sh.setFrozenRows(1);
}
function props() { return PropertiesService.getScriptProperties(); }
function rootFolder() {
  const P = props(), id = P.getProperty('ROOT_FOLDER');
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const f = DriveApp.createFolder(CONFIG.ROOT_FOLDER);
  P.setProperty('ROOT_FOLDER', f.getId());
  return f;
}
function folder(key) {
  const P = props(), pk = 'FOLDER_' + key, id = P.getProperty(pk);
  if (id) { try { const f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  const f = rootFolder().createFolder(FOLDERS[key]);
  P.setProperty(pk, f.getId());
  return f;
}
function subFolder(parent, name) {
  name = String(name || 'عام').replace(/[\/\\]/g, ' ').slice(0, 100);
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}
function allPrograms() { return table('programs').all().map(programFromRow); }
function getProgram(id) { const o = table('programs').find('id', id); return o ? programFromRow(o) : null; }
function programFromRow(o) {
  return {
    id: o.id, order: Number(o.order) || 0, state: o.state || 'مغلق', kind: o.kind || 'program', name: o.name, desc: o.desc,
    location: o.location, startDate: o.startDate, endDate: o.endDate,
    days: o.days ? o.days.split('،').map(function (s) { return s.trim(); }).filter(function (s) { return s; }) : [],
    timeFrom: o.timeFrom, timeTo: o.timeTo, hours: o.hours, seats: o.seats, gender: o.gender || 'الكل',
    employerSig: o.employerSig === YES, extras: J(o.extras, []), questions: J(o.questions, []),
    templateId: o.templateId, templateName: o.templateName, charterText: o.charterText, image: o.image
  };
}
function publicProgram(p, regs) {
  const used = regs.filter(function (r) { return r.programId === p.id && r.status !== STATUS.REJECTED; }).length;
  const o = Object.assign({}, p);
  delete o.templateId;
  o.used = used;
  o.seatsLeft = p.seats ? Math.max(0, Number(p.seats) - used) : null;
  return o;
}
function lightReg(r) {
  return { regId: r.regId, created: r.created, status: r.status, programId: r.programId, programName: r.programName, name: r.name,
    nationalId: r.nationalId, phone: r.phone, nationality: r.nationality, saudi: r.nationality === 'سعودي',
    employerRequired: r.employerRequired === YES, hasEmployer: !!r.employerId, updated: r.updated };
}
function regByToken(t) {
  t = String(t || '');
  if (!/^[a-f0-9]{32,}$/.test(t)) fail('الرابط غير صحيح');
  const r = table('regs').find('token', t);
  if (!r) fail('الرابط غير صحيح أو منتهي');
  return r;
}
function regById(id) { const r = table('regs').find('regId', id); if (!r) fail('التسجيل غير موجود'); return r; }
function activeSupervisors() { return table('supervisors').all().filter(function (s) { return s.active !== NO; }); }
function checkSupervisor(id, code) {
  throttle('sup');
  const s = table('supervisors').find('id', id);
  if (!s || s.active === NO || !code || s.codeHash !== hash('sup|' + s.id + '|' + code)) { failed('sup'); fail('رمز الاعتماد غير صحيح'); }
  if (!s.signatureId) fail('لم يُرفع توقيع هذا المشرف، ارفعه من صفحة المشرفين');
  return s;
}
function checkAdmin(code) {
  throttle('admin');
  if (!code || hash(String(code)) !== props().getProperty('ADMIN_HASH')) { failed('admin'); fail('رمز الدخول غير صحيح'); }
}
// حماية من التخمين: أكثر من ١٥ محاولة خاطئة خلال ١٠ دقائق توقف الدخول مؤقتا
function throttle(k) { const n = Number(CacheService.getScriptCache().get('fail_' + k) || 0); if (n >= 15) fail('محاولات كثيرة خاطئة، حاول بعد ١٠ دقائق'); }
function failed(k) { const c = CacheService.getScriptCache(), n = Number(c.get('fail_' + k) || 0) + 1; c.put('fail_' + k, String(n), 600); Utilities.sleep(600); }

function cleanPerson(x) {
  x = x || {};
  const p = {};
  PERSON_FIELDS.forEach(function (f) { p[f[0]] = str(x[f[0]], 150); });
  p.nationalityName = str(x.nationalityName, 60);
  p.nationalId = digits(p.nationalId); p.phone = digits(p.phone);
  p.email = p.email.toLowerCase();
  if (!/^[12]\d{9}$/.test(p.nationalId)) fail('رقم الهوية أو الإقامة غير صحيح');
  if (!/^05\d{8}$/.test(p.phone)) fail('رقم الجوال غير صحيح');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email)) fail('البريد الإلكتروني غير صحيح');
  if (p.name.split(/\s+/).filter(function (s) { return s; }).length < 3) fail('اكتب الاسم كاملا');
  if (['سعودي', 'غير سعودي'].indexOf(p.nationality) < 0) fail('اختر الجنسية');
  if (p.nationality === 'سعودي' && p.nationalId[0] !== '1') fail('رقم الهوية الوطنية يبدأ بـ ١');
  if (p.nationality === 'غير سعودي' && p.nationalId[0] !== '2') fail('رقم الإقامة يبدأ بـ ٢');
  if (['ذكر', 'أنثى'].indexOf(p.gender) < 0) fail('اختر الجنس');
  if (p.nationality === 'سعودي') p.nationalityName = '';
  return p;
}
function cleanQuestions(list) {
  const types = ['text', 'long', 'number', 'choice', 'multi', 'yesno', 'date', 'file'];
  return (list || []).filter(function (q) { return q && q.label; }).slice(0, 40).map(function (q) {
    return { id: /^[\w-]{1,30}$/.test(q.id || '') ? q.id : 'q' + Utilities.getUuid().slice(0, 6), label: str(q.label, 200),
      type: types.indexOf(q.type) >= 0 ? q.type : 'text', required: !!q.required,
      options: (q.options || []).map(function (o) { return str(o, 120); }).filter(function (o) { return o; }).slice(0, 40) };
  });
}
function cleanAnswers(prog, a) {
  a = a || {};
  const out = {};
  (prog.questions || []).forEach(function (q) {
    let v = a[q.id];
    if (q.type === 'multi') v = (Array.isArray(v) ? v : []).map(function (x) { return str(x, 120); }).filter(function (x) { return q.options.indexOf(x) >= 0; });
    else v = str(v, 3000);
    out[q.id] = v;
  });
  return out;
}
function answersText(prog, a) {
  return (prog.questions || []).map(function (q) {
    const v = a[q.id]; const t = Array.isArray(v) ? v.join('، ') : (v || '—');
    return q.label + ': ' + t;
  }).join('\n');
}
function saveQuestionFiles(prog, r, files, prev) {
  const out = Object.assign({}, prev || {});
  (prog.questions || []).filter(function (q) { return q.type === 'file'; }).forEach(function (q) {
    const f = files && files[q.id];
    if (f && f.b64) {
      if (out[q.id]) trash(out[q.id]);
      out[q.id] = saveUpload(f, subFolder(folder('attachments'), prog.name), q.label + ' - ' + r.name + ' - ' + r.regId).getId();
    }
  });
  return out;
}
function saveUpload(f, parent, name) {
  if (!f || !f.b64) fail('الملف مفقود');
  const mime = /^(image\/(jpeg|png|webp)|application\/pdf)$/.test(f.mime) ? f.mime : '';
  if (!mime) fail('نوع الملف غير مدعوم، ارفع صورة أو PDF');
  const bytes = Utilities.base64Decode(String(f.b64).split(',').pop());
  if (bytes.length > CONFIG.MAX_FILE_MB * 1048576) fail('حجم الملف أكبر من ' + toAr(CONFIG.MAX_FILE_MB) + ' م.ب');
  const ext = mime === 'application/pdf' ? '.pdf' : mime === 'image/png' ? '.png' : '.jpg';
  return parent.createFile(Utilities.newBlob(bytes, mime, name + ext));
}
function upsertVolunteer(p, verified) {
  const t = table('volunteers'), o = t.find('nationalId', p.nationalId);
  if (o && o.phone && o.phone !== p.phone && !verified) return; // لا نغير بيانات شخص آخر بنفس الهوية دون تحقق
  const row = o || { created: now(), source: 'تسجيل' };
  Object.assign(row, p, { updated: now() });
  if (o) t.put(row); else t.add(row);
}
function nextRegId() {
  const P = props(), n = Number(P.getProperty('SEQ') || 1000) + 1;
  P.setProperty('SEQ', String(n));
  return 'GV-' + n;
}
function newToken() { return (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, ''); }
function fileOut(file, name) {
  const b = file.getBlob();
  return { b64: Utilities.base64Encode(b.getBytes()), mime: b.getContentType(), name: name || file.getName() };
}
function blobOf(id) { try { return DriveApp.getFileById(id).getBlob(); } catch (e) { return null; } }
function dataUrl(id) { const b = blobOf(id); return b ? 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) : ''; }
function trash(id) { try { DriveApp.getFileById(id).setTrashed(true); } catch (e) {} }
function alertEmail() { return props().getProperty('ALERT_EMAIL') || CONFIG.ALERT_EMAIL; }
function rememberSite(u) { u = String(u || ''); if (!CONFIG.SITE_URL && /^https:\/\/[^\s"'<>]+$/.test(u)) props().setProperty('SITE_URL', u); }
function siteBase() { const u = CONFIG.SITE_URL || props().getProperty('SITE_URL') || ''; return u ? u.replace(/[?#].*$/, '').replace(/[^\/]*$/, '') : ''; }
function trackLink(r) { const b = siteBase(); return (b || '') + 'index.html#t=' + r.token; }

// ===================== أدوات عامة =====================
function fail(msg) { const e = new Error(msg); e.user = true; throw e; }
function J(s, d) { try { const v = JSON.parse(s); return v == null ? d : v; } catch (e) { return d; } }
function str(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n || 500); }
function digits(v) {
  return String(v == null ? '' : v).replace(/[٠-٩]/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'.indexOf(d); })
    .replace(/[۰-۹]/g, function (d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); }).replace(/\D/g, '');
}
function h(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function hash(s) { const salt = props().getProperty('SALT') || ''; return Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8)); }
function now() { return Utilities.formatDate(new Date(), CONFIG.TZ, 'yyyy-MM-dd HH:mm'); }
function toAr(v) { return String(v == null ? '' : v).replace(/\d/g, function (d) { return '٠١٢٣٤٥٦٧٨٩'[d]; }); }
function pad2(n) { return ('0' + n).slice(-2); }
function fmtDate(v) {
  if (!v) return '';
  let d = v;
  if (!(v instanceof Date)) {
    const m = String(v).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return String(v);
    return toAr(m[3] + '/' + m[2] + '/' + m[1]);
  }
  return toAr(Utilities.formatDate(d, CONFIG.TZ, 'dd/MM/yyyy'));
}
function fmtTime(v) {
  if (!v) return '';
  const p = String(v).split(':'), hh = Number(p[0]), mm = Number(p[1] || 0);
  if (isNaN(hh)) return String(v);
  return toAr(((hh + 11) % 12 + 1) + ':' + pad2(mm)) + (hh < 12 ? ' ص' : ' م');
}
function programTime(p) { return p.timeFrom && p.timeTo ? 'من ' + fmtTime(p.timeFrom) + ' إلى ' + fmtTime(p.timeTo) : ''; }
function nationalityText(p) { return p.nationality === 'سعودي' ? 'سعودي' : (p.nationalityName || 'غير سعودي'); }
function firstName(n) { return String(n || '').split(/\s+/)[0] || ''; }
