/**
 * نموذج تقييم البرامج القائمة — جمعية غراس لتنمية الطفل
 * يستقبل الإجابات من الموقع ويكتبها في هذا الملف (قوقل شيتس)، ويحفظ الشواهد في Google Drive،
 * ويحتسب الدرجات بمعادلات حية وفق مفتاح الاحتساب، ويرسل تنبيه السلامة بالبريد.
 *
 * طريقة التركيب في ملف README.md
 */

// ===================== الإعدادات =====================
const SETTINGS = {
  // رمز الدخول الذي يعطى للمعبئين (غيره قبل النشر)
  ACCESS_CODE: 'gheras2026',
  // بريد تنبيه السلامة — اتركه فارغا ليرسل إلى صاحب الحساب الذي نشر السكربت
  ALERT_EMAIL: '',
  // اسم مجلد الشواهد في Google Drive
  EVIDENCE_FOLDER: 'شواهد نموذج تقييم البرامج القائمة',
  // الحد الأقصى لحجم الملف (ميغابايت)
  MAX_FILE_MB: 10
};

// ===================== بنية النموذج =====================
// عدد خيارات كل سؤال (دون لا ينطبق) لكل محور بالترتيب
const AXES = [
  { n: 1, title: 'الاحتياج ومصفوفة القيم', opts: [3, 3, 3] },
  { n: 2, title: 'تصميم المبادرة ومؤشرات النجاح', opts: [3, 3, 3, 4] },
  { n: 3, title: 'إدارة المبادرة', opts: [3, 3, 3, 4, 3, 3, 3] },
  { n: 4, title: 'متابعة المبادرة', opts: [3, 4, 3, 3, 3, 3, 3, 3] },
  { n: 5, title: 'السلامة وحماية الطفل', opts: [3, 3, 3, 4, 3, 3, 3] },
  { n: 6, title: 'قياس الأثر ومؤشرات النجاح', opts: [3, 3, 3, 3, 2, 4] },
  { n: 7, title: 'التطوير المستمر', opts: [3, 2, 3] }
];
const LETTERS = ['أ', 'ب', 'ج', 'د'];
const NA = 'لا ينطبق';
// قيم الخيارات وفق مفتاح الاحتساب
const VALUES = { 4: [1, 0.5, 0.25, 0], 3: [1, 0.5, 0], 2: [1, 0] };
const SAFETY_AXIS = 5;

const SHEET_ANSWERS = 'الإجابات';
const SHEET_SCORES = 'الدرجات';
const SHEET_KEY = 'مفتاح الاحتساب';

const DATA_FIELDS = [
  ['program', 'اسم البرنامج'],
  ['season', 'دورة المبادرة'],
  ['startDate', 'تاريخ البداية'],
  ['endDate', 'تاريخ النهاية'],
  ['manager', 'مدير المبادرة'],
  ['hasPrev', 'سبقت للبرنامج دورة منتهية'],
  ['beneficiary', 'المستفيد'],
  ['age', 'العمر'],
  ['gender', 'الجنس'],
  ['stage', 'المرحلة'],
  ['benefTarget', 'المستفيدون: المستهدف'],
  ['benefRegistered', 'المستفيدون: المسجلون'],
  ['weeks', 'مدة التنفيذ (أسابيع)'],
  ['actPlanned', 'الأنشطة الرئيسة: المخططة'],
  ['actDone', 'الأنشطة الرئيسة: المنفذة'],
  ['cost', 'التكلفة الفعلية (ريال)'],
  ['donor', 'المانح أو الشريك'],
  ['donorName', 'اسم الجهة المانحة'],
  ['donorReports', 'يشترط تقارير'],
  ['size', 'حجم المبادرة'],
  ['filler', 'معبئ النموذج'],
  ['fillerName', 'اسم المعبئ']
];
const NUMERIC_FIELDS = ['benefTarget', 'benefRegistered', 'weeks', 'actPlanned', 'actDone', 'cost'];

function questionList() {
  const list = [];
  AXES.forEach(a => a.opts.forEach((count, i) => {
    const n = i + 1;
    list.push({ id: 'a' + a.n + 'q' + n, axis: a.n, n: n, count: count, label: toAr(n) + '-' + toAr(a.n) });
  }));
  return list;
}

function toAr(v) { return String(v).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); }

// ===================== نقاط الاستقبال =====================
function doGet() {
  return json({ ok: true, service: 'gheras-evaluation' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (String(body.code || '').trim() !== SETTINGS.ACCESS_CODE) return json({ ok: false, error: 'رمز الدخول غير صحيح' });
    switch (body.action) {
      case 'verify': return json({ ok: true });
      case 'upload': return json(handleUpload(body));
      case 'submit': return json(handleSubmit(body));
      default: return json({ ok: false, error: 'طلب غير معروف' });
    }
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'حدث خطأ في الخادم، حاول مرة أخرى' });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ===================== رفع الشواهد =====================
function handleUpload(body) {
  const bytes = Utilities.base64Decode(String(body.data || ''));
  if (!bytes.length) return { ok: false, error: 'الملف فارغ' };
  if (bytes.length > SETTINGS.MAX_FILE_MB * 1024 * 1024) return { ok: false, error: 'الملف أكبر من الحد المسموح' };
  const q = questionList().find(x => x.id === body.qid);
  const program = clean(body.program, 80) || 'بدون اسم';
  const folder = subFolder(evidenceFolder(), program);
  const name = (q ? q.label + ' - ' : '') + clean(body.name, 120);
  const file = folder.createFile(Utilities.newBlob(bytes, clean(body.type, 100) || 'application/octet-stream', name));
  return { ok: true, url: file.getUrl() };
}

function evidenceFolder() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('EVIDENCE_FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) { /* أعد الإنشاء */ } }
  const folder = DriveApp.createFolder(SETTINGS.EVIDENCE_FOLDER);
  props.setProperty('EVIDENCE_FOLDER_ID', folder.getId());
  return folder;
}

function subFolder(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

// ===================== حفظ التقييم =====================
function handleSubmit(body) {
  const data = body.data || {};
  const answers = body.answers || {};
  const open = body.open || {};
  const qs = questionList();

  if (!clean(data.program) || !clean(data.manager) || !['صغيرة', 'كبيرة'].includes(data.size)) {
    return { ok: false, error: 'بيانات المبادرة ناقصة' };
  }
  for (const q of qs) {
    const a = answers[q.id];
    const allowed = LETTERS.slice(0, q.count).concat(['NA']);
    if (!a || !allowed.includes(a.c)) return { ok: false, error: 'السؤال ' + q.label + ' بلا إجابة صحيحة' };
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    ensureSetup(ss);
    const sh = ss.getSheetByName(SHEET_ANSWERS);
    const id = 'GH-' + Utilities.formatDate(new Date(), 'Asia/Riyadh', 'yyMMdd') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();

    const row = [id, new Date()];
    DATA_FIELDS.forEach(([k]) => {
      const v = data[k];
      if (NUMERIC_FIELDS.includes(k) && v !== '' && v != null && !isNaN(Number(v))) row.push(Number(v));
      else row.push(clean(v, 300));
    });
    qs.forEach(q => {
      const a = answers[q.id];
      row.push(a.c === 'NA' ? NA : a.c);
      row.push(evidenceText(a));
    });
    row.push(clean(open.good, 3000), clean(open.bad, 3000), '', 'مرحلة');

    sh.appendRow(row);
    const r = sh.getLastRow();
    writeScoreRow(ss, r);

    const alerts = qs.filter(q => q.axis === SAFETY_AXIS && answers[q.id].c === LETTERS[q.count - 1]);
    if (alerts.length) sendSafetyAlert(ss, id, data, alerts);
    return { ok: true, id: id };
  } finally {
    lock.releaseLock();
  }
}

function evidenceText(a) {
  if (a.c === 'NA') return 'السبب: ' + clean(a.reason, 500);
  if (a.c !== 'أ') return '';
  const parts = [];
  if (clean(a.ev)) parts.push(clean(a.ev, 1000));
  if (clean(a.link)) parts.push('رابط: ' + clean(a.link, 500));
  (a.files || []).forEach((u, i) => parts.push('ملف ' + toAr(i + 1) + ': ' + clean(u, 500)));
  return parts.join('\n');
}

// يمنع حقن المعادلات ويقص النص الطويل
function clean(v, max) {
  let s = v == null ? '' : String(v).trim();
  if (max && s.length > max) s = s.slice(0, max);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

// ===================== الدرجات (معادلات حية) =====================
// تتبع أعمدة ورقة الإجابات: ٢ ثابتان + حقول البيانات + عمودان لكل سؤال
function answerCol(qIndex) { return 2 + DATA_FIELDS.length + qIndex * 2 + 1; }

const SCORE_FIXED = ['رقم المرجع', 'اسم البرنامج', 'حجم المبادرة', 'وقت الإرسال',
  'المحور الأول', 'المحور الثاني', 'المحور الثالث', 'المحور الرابع', 'المحور الخامس', 'المحور السادس', 'المحور السابع',
  'الدرجة الكلية', 'تنبيه السلامة', 'المحطات المطلوب الرجوع إليها', 'الحالة'];

function writeScoreRow(ss, r) {
  const sc = ss.getSheetByName(SHEET_SCORES);
  const qs = questionList();
  const A = "'" + SHEET_ANSWERS + "'!";
  const ref = (col) => A + colLetter(col) + r;
  const progCol = 3 + DATA_FIELDS.findIndex(f => f[0] === 'program');
  const sizeCol = 3 + DATA_FIELDS.findIndex(f => f[0] === 'size');
  const firstQ = SCORE_FIXED.length + 1;

  const valueFormulas = qs.map((q, i) => {
    const vals = VALUES[q.count];
    const pairs = vals.map((v, k) => '"' + LETTERS[k] + '",' + v).join(',');
    return '=SWITCH(' + ref(answerCol(i)) + ',' + pairs + ',"")';
  });

  const axisFormulas = AXES.map(a => {
    const idx = qs.map((q, i) => (q.axis === a.n ? i : -1)).filter(i => i >= 0);
    const c1 = colLetter(firstQ + idx[0]) + r, c2 = colLetter(firstQ + idx[idx.length - 1]) + r;
    return '=IFERROR(AVERAGE(' + c1 + ':' + c2 + '),"")';
  });

  const safetyChecks = qs.map((q, i) => (q.axis === SAFETY_AXIS ? ref(answerCol(i)) + '="' + LETTERS[q.count - 1] + '"' : null)).filter(Boolean);
  const ax = n => 'E F G H I J K'.split(' ')[n - 1] + r;
  const low = n => 'AND(ISNUMBER(' + ax(n) + '),' + ax(n) + '<0.9)';
  const stations = '=TEXTJOIN("، ",TRUE,' +
    'IF(OR(' + low(1) + ',' + low(2) + '),"المحطتان الأولى والثانية",""),' +
    'IF(' + low(3) + ',"المحطة الثالثة",""),' +
    'IF(OR(' + low(4) + ',' + low(5) + '),"المحطة الرابعة",""),' +
    'IF(' + low(6) + ',"المحطة الخامسة",""),' +
    'IF(' + low(7) + ',"المحطة السادسة",""))';

  const fixed = [
    '=' + ref(1),
    '=' + ref(progCol),
    '=' + ref(sizeCol),
    '=' + ref(2)
  ].concat(axisFormulas, [
    '=IFERROR(AVERAGE(E' + r + ':K' + r + '),"")',
    '=IF(OR(' + safetyChecks.join(',') + '),"⚠ تنبيه سلامة","")',
    stations,
    '=' + ref(answerCol(qs.length - 1) + 5)
  ]);

  sc.getRange(r, 1, 1, fixed.length + valueFormulas.length).setFormulas([fixed.concat(valueFormulas)]);
}

function colLetter(n) {
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}

// ===================== تنبيه السلامة =====================
function sendSafetyAlert(ss, id, data, alerts) {
  const to = SETTINGS.ALERT_EMAIL || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const items = alerts.map(q => '<li>السؤال ' + q.label + ' — اختير الخيار الأخير (' + LETTERS[q.count - 1] + ')</li>').join('');
  const html =
    '<div dir="rtl" style="font-family:Tahoma,Arial;font-size:15px;line-height:1.8">' +
    '<h2 style="color:#1C437D;margin:0 0 8px">تنبيه سلامة وحماية الطفل</h2>' +
    '<p>ورد في تقييم البرنامج <b>' + esc(data.program) + '</b> (' + esc(data.season) + ') اختيار الخيار الأخير في المحور الخامس:</p>' +
    '<ul>' + items + '</ul>' +
    '<p>مدير المبادرة: ' + esc(data.manager) + '<br>حجم المبادرة: ' + esc(data.size) + '<br>رقم المرجع: ' + id + '</p>' +
    '<p><a href="' + ss.getUrl() + '">فتح ملف التقييمات</a></p>' +
    '<p style="color:#6e6e73;font-size:13px">يفتح هذا التنبيه مستقلا مهما كانت الدرجة الكلية، وفق مفتاح الاحتساب وقواعد التصعيد في ن٥-٤.</p></div>';
  MailApp.sendEmail({ to: to, subject: 'تنبيه سلامة: ' + String(data.program || '') + ' — ' + id, htmlBody: html });
}

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// ===================== التهيئة =====================
/** شغل هذه الدالة مرة واحدة من محرر Apps Script لإنشاء الأوراق ومنح الصلاحيات */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ensureSetup(ss, true);
  evidenceFolder();
  Logger.log('تمت التهيئة. بريد التنبيه: ' + (SETTINGS.ALERT_EMAIL || Session.getEffectiveUser().getEmail()));
}

function ensureSetup(ss, force) {
  if (!force && ss.getSheetByName(SHEET_ANSWERS) && ss.getSheetByName(SHEET_SCORES)) return;
  const qs = questionList();
  ss.setSpreadsheetTimeZone('Asia/Riyadh');

  // ورقة الإجابات
  const sh = ss.getSheetByName(SHEET_ANSWERS) || ss.insertSheet(SHEET_ANSWERS);
  const headers = ['رقم المرجع', 'وقت الإرسال'].concat(DATA_FIELDS.map(f => f[1]));
  qs.forEach(q => headers.push(q.label + ' الإجابة', q.label + ' الشاهد / السبب'));
  headers.push('ما الذي نجح ويستحق التعميم', 'ما الذي لم ينجح وسببه', 'ملاحظات التحقق الميداني', 'الحالة');
  sh.getRange(1, 1, 1, headers.length).setValues([headers])
    .setFontWeight('bold').setBackground('#1C437D').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
  sh.setFrozenRows(1);
  sh.setFrozenColumns(3);
  sh.setRightToLeft(true);
  sh.getRange('B2:B').setNumberFormat('yyyy/mm/dd hh:mm');
  // قوائم منسدلة لأعمدة الإجابات ليعدلها فريق الزيارة بالقيم الصحيحة
  qs.forEach((q, i) => {
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(LETTERS.slice(0, q.count).concat([NA]), true).setAllowInvalid(false).build();
    sh.getRange(2, answerCol(i), sh.getMaxRows() - 1, 1).setDataValidation(rule);
    sh.getRange(1, answerCol(i)).setBackground(q.axis === SAFETY_AXIS ? '#27B5C1' : '#1C437D');
  });

  // ورقة الدرجات
  const sc = ss.getSheetByName(SHEET_SCORES) || ss.insertSheet(SHEET_SCORES, 0);
  const sHeaders = SCORE_FIXED.concat(qs.map(q => 'قيمة ' + q.label));
  sc.getRange(1, 1, 1, sHeaders.length).setValues([sHeaders])
    .setFontWeight('bold').setBackground('#1C437D').setFontColor('#ffffff').setWrap(true).setVerticalAlignment('middle');
  sc.getRange(1, SCORE_FIXED.length + 1, 1, qs.length).setBackground('#6F6F6E');
  sc.setFrozenRows(1);
  sc.setFrozenColumns(2);
  sc.setRightToLeft(true);
  sc.getRange('D2:D').setNumberFormat('yyyy/mm/dd');
  sc.getRange('E2:L').setNumberFormat('0%').setHorizontalAlignment('center');
  sc.getRange(2, SCORE_FIXED.length + 1, sc.getMaxRows() - 1, qs.length).setNumberFormat('0%').setFontColor('#6F6F6E');
  sc.setColumnWidth(14, 280);

  const rng = sc.getRange('E2:L');
  const rules = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER(E2),E2>=0.9)').setBackground('#DDF0D3').setFontColor('#2E6B1C').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER(E2),E2>=0.75,E2<0.9)').setBackground('#FCF0C6').setFontColor('#7A5B00').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND(ISNUMBER(E2),E2<0.75)').setBackground('#F8D9D6').setFontColor('#9B231C').setRanges([rng]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=LEN($M2)>0').setBackground('#C4332B').setFontColor('#ffffff').setRanges([sc.getRange('M2:M')]).build()
  ];
  sc.setConditionalFormatRules(rules);

  // ورقة مفتاح الاحتساب (مرجع داخلي)
  const key = ss.getSheetByName(SHEET_KEY) || ss.insertSheet(SHEET_KEY);
  key.clear();
  key.setRightToLeft(true);
  key.getRange(1, 1, 12, 6).setValues([
    ['عدد الخيارات', 'أ', 'ب', 'ج', 'د', 'لا ينطبق'],
    ['أربعة', '100%', '50%', '25%', '0%', 'يستبعد'],
    ['ثلاثة', '100%', '50%', '0%', '—', 'يستبعد'],
    ['خياران', '100%', '0%', '—', '—', 'يستبعد'],
    ['', '', '', '', '', ''],
    ['درجة المحور', 'مجموع قيم الأسئلة المنطبقة ÷ عددها', '', '', '', ''],
    ['الدرجة الكلية', 'متوسط درجات المحاور السبعة (تعرض معها درجة كل محور)', '', '', '', ''],
    ['الألوان', 'أخضر ٩٠٪ فأكثر — أصفر ٧٥٪ إلى أقل من ٩٠٪ — أحمر أقل من ٧٥٪', '', '', '', ''],
    ['تنبيه السلامة', 'الخيار الأخير في أي سؤال من المحور الخامس يفتح تنبيها مستقلا للإدارة', '', '', '', ''],
    ['التحقق', 'إن لم يثبت شاهد (أ) في الزيارة تعدل الإجابة في ورقة الإجابات إلى الخيار التالي وتكتب الملاحظة؛ تتحدث الدرجات تلقائيا', '', '', '', ''],
    ['الرجوع للمحطات', 'الأول والثاني ← الأولى والثانية، الثالث ← الثالثة، الرابع والخامس ← الرابعة، السادس ← الخامسة، السابع ← السادسة', '', '', '', ''],
    ['الحالة', 'تحفظ بيانات كل برنامج بوصفها (مرحلة) وفق المحطة السابعة', '', '', '', '']
  ]);
  key.getRange('A1:F1').setFontWeight('bold').setBackground('#1C437D').setFontColor('#ffffff');
  key.getRange('A6:A12').setFontWeight('bold');
  key.setColumnWidth(2, 520);

  const def = ss.getSheetByName('Sheet1') || ss.getSheetByName('الورقة1') || ss.getSheetByName('ورقة1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);
}
