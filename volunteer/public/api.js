/* تطوع غراس — الاتصال بالخادم (Google Apps Script) وأدوات مشتركة بين واجهة المتطوع ولوحة الإدارة.
   إذا كان APPS_SCRIPT_URL فارغا في config.js يعمل الموقع في وضع التجربة (Mock) داخل المتصفح. */
(function () {
  "use strict";
  const C = window.TG_CONFIG || {};
  const LIVE = !!C.APPS_SCRIPT_URL;

  // ——— ثوابت مشتركة (يطابقها Code.gs) ———
  const STATUS = {
    EMPLOYER: "بانتظار وثيقة صاحب العمل",
    PENDING: "بانتظار الاعتماد",
    CHANGES: "مطلوب تعديل",
    APPROVED: "معتمد",
    REJECTED: "مرفوض"
  };
  const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const PERSON_FIELDS = [
    { k: "name", label: "الاسم الرباعي", ph: "الاسم" },
    { k: "nationalId", label: "رقم الهوية أو الإقامة", ph: "رقم_الهوية" },
    { k: "nationality", label: "الجنسية", ph: "الجنسية" },
    { k: "gender", label: "الجنس", ph: "الجنس" },
    { k: "birthDate", label: "تاريخ الميلاد", ph: "تاريخ_الميلاد" },
    { k: "phone", label: "الجوال", ph: "الجوال" },
    { k: "email", label: "البريد الإلكتروني", ph: "البريد" },
    { k: "city", label: "المدينة", ph: "المدينة" },
    { k: "district", label: "الحي", ph: "الحي" },
    { k: "qualification", label: "المؤهل الدراسي", ph: "المؤهل" },
    { k: "major", label: "التخصص", ph: "التخصص" },
    { k: "employer", label: "جهة العمل", ph: "جهة_العمل" },
    { k: "jobTitle", label: "المسمى الوظيفي", ph: "المسمى_الوظيفي" }
  ];
  const IMAGE_KEYS = ["توقيع_المتطوع", "الختم", "توقيع_المشرف"];
  const PLACEHOLDERS = [
    ["بيانات المتطوع", PERSON_FIELDS.map((f) => f.ph)],
    ["بيانات البرنامج", ["البرنامج", "المكان", "تاريخ_البداية", "تاريخ_النهاية", "الأيام", "الوقت", "الساعات"]],
    ["التسجيل", ["رقم_التسجيل", "تاريخ_التسجيل", "التاريخ"]],
    ["الاعتماد", ["اسم_المشرف", "صفة_المشرف", "تاريخ_الاعتماد"]],
    ["التواقيع (صور)", IMAGE_KEYS]
  ];

  // ——— أدوات ———
  const toAr = (v) => String(v == null ? "" : v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const toEn = (v) => String(v == null ? "" : v).replace(/[٠-٩]/g, (d) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(d)]).replace(/[۰-۹]/g, (d) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(d)]);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n) => String(n).padStart(2, "0");
  function fmtDate(v) { // 2026-11-18 → ١٨/١١/٢٠٢٦
    if (!v) return "";
    const d = v instanceof Date ? v : new Date(String(v).length <= 10 ? v + "T00:00:00" : String(v).replace(" ", "T"));
    if (isNaN(d)) return String(v);
    return toAr(`${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`);
  }
  function fmtTime(v) { // 16:30 → ٤:٣٠ م
    if (!v) return "";
    const [h, m] = String(v).split(":").map(Number);
    if (isNaN(h)) return String(v);
    return toAr(`${((h + 11) % 12) + 1}:${pad(m || 0)}`) + (h < 12 ? " ص" : " م");
  }
  const nationalityText = (p) => (p.nationality === "سعودي" ? "سعودي" : (p.nationalityName || "غير سعودي"));
  const isSaudi = (p) => p.nationality === "سعودي";
  const programTime = (pr) => (pr.timeFrom && pr.timeTo ? `من ${fmtTime(pr.timeFrom)} إلى ${fmtTime(pr.timeTo)}` : "");
  const phKey = (k) => String(k || "").trim().replace(/\s+/g, "_");

  // جدول القيم التي توضع في الميثاق — نفس منطق Code.gs
  function placeholderMap(person, program, reg, appr) {
    person = person || {}; program = program || {}; reg = reg || {};
    const m = {};
    PERSON_FIELDS.forEach((f) => { m[f.ph] = f.k === "nationality" ? nationalityText(person) : f.k === "birthDate" ? fmtDate(person.birthDate) : (person[f.k] || ""); });
    Object.assign(m, {
      "البرنامج": program.name || "",
      "المكان": program.location || "",
      "تاريخ_البداية": fmtDate(program.startDate),
      "تاريخ_النهاية": fmtDate(program.endDate),
      "الأيام": (program.days || []).join("، "),
      "الوقت": programTime(program),
      "الساعات": program.hours ? toAr(program.hours) : "",
      "رقم_التسجيل": reg.regId || "",
      "تاريخ_التسجيل": fmtDate(reg.created || new Date()),
      "التاريخ": fmtDate(new Date()),
      "اسم_المشرف": appr ? appr.name : "",
      "صفة_المشرف": appr ? appr.title : "",
      "تاريخ_الاعتماد": appr ? fmtDate(appr.date || new Date()) : ""
    });
    (program.extras || []).forEach((x) => { if (x && x.k) m[phKey(x.k)] = x.v || ""; });
    return m;
  }
  function fillText(text, map) {
    return String(text || "").replace(/\{([^{}\n]{1,40})\}/g, (all, k) => {
      k = phKey(k);
      if (IMAGE_KEYS.includes(k)) return "";
      return Object.prototype.hasOwnProperty.call(map, k) ? String(map[k]) : "";
    });
  }

  // الملفات
  const readAsDataURL = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  const loadImage = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const dataToB64 = (d) => String(d).split(",")[1] || "";
  function b64ToBlob(b64, mime) {
    const bin = atob(b64), a = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i);
    return new Blob([a], { type: mime || "application/octet-stream" });
  }
  // صورة → JPEG مضغوطة (تعالج صور الجوال الكبيرة وصيغة HEIC في سفاري)
  async function compressImage(file, maxSide = 2000, quality = 0.85, maxChars = 0) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      let side = maxSide, q = quality, out = "";
      for (let i = 0; i < 8; i++) {
        const s = Math.min(1, side / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas");
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        out = c.toDataURL("image/jpeg", q);
        if (!maxChars || out.length <= maxChars) break;
        q = Math.max(0.45, q - 0.1); side = Math.round(side * 0.82);
      }
      return out;
    } finally { URL.revokeObjectURL(url); }
  }
  // صورة توقيع أو ختم → PNG بخلفية شفافة (يزيل البياض)
  async function transparentPng(file, maxSide = 900) {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadImage(url);
      const s = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
      const x = c.getContext("2d"); x.drawImage(img, 0, 0, c.width, c.height);
      const d = x.getImageData(0, 0, c.width, c.height), p = d.data;
      for (let i = 0; i < p.length; i += 4) {
        const l = (p[i] + p[i + 1] + p[i + 2]) / 3;
        if (l > 235) p[i + 3] = 0; else if (l > 200) p[i + 3] = Math.min(p[i + 3], Math.round((235 - l) / 35 * 255));
      }
      x.putImageData(d, 0, 0);
      return c.toDataURL("image/png");
    } finally { URL.revokeObjectURL(url); }
  }
  // ملف مرفوع (صورة أو PDF) → {name, mime, b64}
  async function packFile(file) {
    const maxMb = C.MAX_FILE_MB || 10;
    if (/^image\//.test(file.type) || /\.(heic|heif)$/i.test(file.name)) {
      const d = await compressImage(file);
      return { name: file.name.replace(/\.\w+$/, "") + ".jpg", mime: "image/jpeg", b64: dataToB64(d) };
    }
    if (file.size > maxMb * 1048576) throw new Error(`حجم الملف أكبر من ${toAr(maxMb)} م.ب`);
    return { name: file.name, mime: file.type || "application/octet-stream", b64: dataToB64(await readAsDataURL(file)) };
  }
  let pdfLibP = null;
  function loadPdfLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!pdfLibP) pdfLibP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/pdf-lib.min.js"; s.onload = () => res(window.PDFLib); s.onerror = () => rej(new Error("تعذر تحميل أداة PDF")); document.head.appendChild(s); });
    return pdfLibP;
  }
  // دمج الميثاق مع وثيقة صاحب العمل في ملف واحد
  async function mergePdf(charterB64, extra) {
    const { PDFDocument } = await loadPdfLib();
    const out = await PDFDocument.load(await b64ToBlob(charterB64, "application/pdf").arrayBuffer());
    if (extra && extra.b64) {
      const bytes = await b64ToBlob(extra.b64).arrayBuffer();
      if (/pdf/i.test(extra.mime)) {
        const src = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach((p) => out.addPage(p));
      } else {
        const img = /png/i.test(extra.mime) ? await out.embedPng(bytes) : await out.embedJpg(bytes);
        const W = 595.28, H = 841.89, m = 28, s = Math.min((W - 2 * m) / img.width, (H - 2 * m) / img.height);
        const page = out.addPage([W, H]);
        page.drawImage(img, { x: (W - img.width * s) / 2, y: (H - img.height * s) / 2, width: img.width * s, height: img.height * s });
      }
    }
    return dataToB64(await out.saveAsBase64({ dataUri: true }));
  }

  // ——— العمر ———
  function ageParts(iso) {
    const b = new Date(String(iso || "") + "T00:00:00"), n = new Date();
    if (isNaN(b) || b > n) return null;
    let y = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth(), d = n.getDate() - b.getDate();
    if (d < 0) { m--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y, m, d };
  }
  // العدد مع المعدود بالعربية: ١ سنة، سنتان، ٣ سنوات، ١١ سنة
  function arCount(n, w) {
    if (n === 1) return w[0];
    if (n === 2) return w[1];
    if (n >= 3 && n <= 10) return toAr(n) + " " + w[2];
    return toAr(n) + " " + w[3];
  }
  const W_YEAR = ["سنة", "سنتان", "سنوات", "سنة"], W_MONTH = ["شهر", "شهران", "أشهر", "شهرًا"], W_DAY = ["يوم", "يومان", "أيام", "يومًا"], W_AM = ["عام", "عامان", "أعوام", "عامًا"], W_HOUR = ["ساعة", "ساعتان", "ساعات", "ساعة"];
  function ageSentence(a) {
    const parts = [];
    if (a.y) parts.push(arCount(a.y, W_YEAR));
    if (a.m) parts.push(arCount(a.m, W_MONTH));
    if (a.d) parts.push(arCount(a.d, W_DAY));
    return parts.join(" و") || "يوم واحد";
  }
  const maskEmail = (e) => { const [u, dm] = String(e).split("@"); if (!dm) return ""; const [d1, ...rest] = dm.split("."); return u.slice(0, 2) + "•••@" + d1.slice(0, 1) + "•••." + rest.join("."); };
  const maskPhone = (p) => { p = String(p || ""); return p ? p.slice(0, 3) + "•••" + p.slice(-4) : ""; };

  // ——— Excel ———
  let xlsxP = null;
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxP) xlsxP = new Promise((res, rej) => { const s = document.createElement("script"); s.src = "vendor/xlsx.mini.min.js"; s.onload = () => res(window.XLSX); s.onerror = () => rej(new Error("تعذر تحميل أداة Excel")); document.head.appendChild(s); });
    return xlsxP;
  }
  // أعمدة نموذج رفع المتطوعين (يطابقها الاستيراد)
  const IMPORT_COLUMNS = [
    ["رقم الهوية أو الإقامة", "nationalId"], ["الاسم الرباعي", "name"], ["الجنسية", "nationality"], ["الجنس", "gender"],
    ["تاريخ الميلاد", "birthDate"], ["الجوال", "phone"], ["البريد الإلكتروني", "email"], ["المدينة", "city"], ["الحي", "district"],
    ["المؤهل الدراسي", "qualification"], ["التخصص", "major"], ["جهة العمل", "employer"], ["المسمى الوظيفي", "jobTitle"]
  ];
  function isoDate(v) {
    if (v == null || v === "") return "";
    if (v instanceof Date) { const d = new Date(v.getTime() + 12 * 3600e3); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
    if (typeof v === "number" && v > 1000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()); }
    const t = toEn(v).trim();
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return m[1] + "-" + pad(m[2]) + "-" + pad(m[3]);
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
    if (m) return m[3] + "-" + pad(m[2]) + "-" + pad(m[1]);
    return "";
  }
  // صف من ملف Excel → بيانات متطوع، مع الأخطاء والتنبيهات
  function normalizeImported(row) {
    const g = (k) => String(row[k] == null ? "" : row[k]).trim();
    const p = {}, errors = [], warns = [];
    p.nationalId = toEn(g("nationalId")).replace(/\D/g, "");
    if (!/^[12]\d{9}$/.test(p.nationalId)) errors.push("رقم الهوية غير صحيح");
    p.name = g("name").replace(/\s+/g, " ");
    if (!p.name) errors.push("الاسم فارغ");
    const nat = g("nationality");
    if (/سعود/.test(nat) || (!nat && p.nationalId[0] === "1")) { p.nationality = "سعودي"; p.nationalityName = ""; }
    else { p.nationality = "غير سعودي"; p.nationalityName = nat && !/غير/.test(nat) ? nat : ""; }
    const gd = g("gender");
    p.gender = /ذكر|^m(ale)?$/i.test(gd) ? "ذكر" : /أنث|انث|^f(emale)?$/i.test(gd) ? "أنثى" : "";
    p.birthDate = isoDate(row.birthDate);
    if (g("birthDate") && !p.birthDate) warns.push("تاريخ الميلاد غير مفهوم");
    let ph = toEn(g("phone")).replace(/\D/g, "");
    if (/^9665\d{8}$/.test(ph)) ph = "0" + ph.slice(3);
    if (/^5\d{8}$/.test(ph)) ph = "0" + ph;
    if (ph && !/^05\d{8}$/.test(ph)) { warns.push("الجوال غير صحيح"); ph = ""; }
    p.phone = ph;
    const em = g("email").toLowerCase();
    p.email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? em : "";
    if (em && !p.email) warns.push("البريد غير صحيح");
    ["city", "district", "qualification", "major", "employer", "jobTitle"].forEach((k) => { p[k] = g(k); });
    return { person: p, errors, warns };
  }

  // ——— الاتصال ———
  async function call(action, data) {
    data = data || {};
    if (!LIVE) { await new Promise((r) => setTimeout(r, 350)); return Mock.handle(action, JSON.parse(JSON.stringify(data))); }
    let res;
    try {
      res = await fetch(C.APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(Object.assign({ action }, data)) });
    } catch (e) { throw new Error("تعذر الاتصال، تأكد من الإنترنت وحاول مرة أخرى"); }
    let j;
    try { j = await res.json(); } catch (e) { throw new Error("رد غير متوقع من الخادم"); }
    if (!j || !j.ok) throw new Error((j && j.error) || "حدث خطأ، حاول مرة أخرى");
    return j;
  }

  // ===================== وضع التجربة (بلا خادم) =====================
  const Mock = (function () {
    const KEY = "tg-mock-db";
    const sampleCharter = [
      "ميثاق التطوع — {البرنامج}",
      "",
      "أنا المتطوع/ـة: {الاسم}، {الجنسية}، رقم الهوية أو الإقامة: {رقم_الهوية}، جوال: {الجوال}، أتطوع في {البرنامج} لدى جمعية غراس لتنمية الطفل، وألتزم بما يلي:",
      "١. الحضور في الأيام المحددة ({الأيام}) {الوقت}، بمجموع {الساعات} ساعة تطوعية.",
      "٢. المحافظة على سلامة الأطفال وخصوصيتهم، وعدم تصويرهم أو نشر بياناتهم.",
      "٣. الالتزام بتوجيهات مشرف البرنامج وأنظمة الجمعية وقيمها.",
      "٤. إبلاغ المشرف قبل وقت كاف عند تعذر الحضور.",
      "",
      "مكان التنفيذ: {المكان} — من {تاريخ_البداية} إلى {تاريخ_النهاية}",
      "رقم التسجيل: {رقم_التسجيل} — التاريخ: {التاريخ}",
      "",
      "توقيع المتطوع: {توقيع_المتطوع}",
      "اعتماد الجمعية: {اسم_المشرف} — {صفة_المشرف} — {تاريخ_الاعتماد} {الختم} {توقيع_المشرف}"
    ].join("\n");
    const generalQuestions = [
      { id: "q_interests", label: "مجالات الاهتمام", type: "multi", required: true, options: ["تعليمي", "تربوي", "إعلامي وتصميم", "تقني", "تنظيم فعاليات", "إداري", "ميداني"] },
      { id: "q_skills", label: "المهارات", type: "long", required: false, options: [] },
      { id: "q_prev", label: "هل لديك خبرات تطوعية سابقة؟", type: "yesno", required: true, options: [] },
      { id: "q_prevd", label: "تفاصيل الخبرات السابقة", type: "long", required: false, options: [] },
      { id: "q_days", label: "الأيام المتاحة", type: "multi", required: true, options: DAYS.slice() },
      { id: "q_period", label: "الفترة المتاحة", type: "choice", required: true, options: ["صباحية", "مسائية", "مرنة"] },
      { id: "q_hours", label: "عدد الساعات المتاحة أسبوعيا", type: "number", required: true, options: [] },
      { id: "q_mode", label: "نوع التطوع المفضل", type: "choice", required: true, options: ["حضوري", "عن بعد", "الاثنين"] },
      { id: "q_add", label: "ماذا تستطيع أن تضيف للجمعية؟", type: "long", required: false, options: [] }
    ];
    function seed() {
      return {
        adminCode: "1234",
        settings: { alertEmail: "prog@gheras.sa", stamp: "" },
        supervisors: [{ id: "s1", name: "مشرف تجريبي", title: "مشرف البرامج", code: "1234", signature: "" }],
        programs: [
          { id: "general", kind: "general", state: "مفتوح", order: 0, name: "التطوع العام", desc: "انضم إلى فريق متطوعي غراس، ونرشحك للفرص المناسبة لاهتماماتك ووقتك.", image: "", location: "الرياض", startDate: "", endDate: "", days: [], timeFrom: "", timeTo: "", hours: "", seats: "", gender: "الكل", employerSig: true, extras: [], questions: generalQuestions, templateName: "قالب تجريبي", charterText: sampleCharter },
          { id: "p1", kind: "program", state: "مفتوح", order: 1, name: "برنامج بيان", desc: "برنامج قرائي للأطفال من ٨ إلى ١٢ سنة، يحتاج متطوعين لإدارة حلقات القراءة.", image: "", location: "مقر الجمعية — السويدي الغربي", startDate: "2026-12-06", endDate: "2027-01-28", days: ["الأحد", "الثلاثاء"], timeFrom: "16:00", timeTo: "19:00", hours: "48", seats: "20", gender: "الكل", employerSig: true, extras: [{ k: "المهام", v: "إدارة حلقة قراءة لمجموعة من ٨ أطفال" }, { k: "الزي", v: "رسمي محتشم" }], questions: [{ id: "q1", label: "هل سبق لك العمل مع الأطفال؟", type: "yesno", required: true, options: [] }, { id: "q2", label: "الفئة العمرية المفضلة", type: "choice", required: true, options: ["٨–٩ سنوات", "١٠–١٢ سنة"] }, { id: "q3", label: "السيرة الذاتية", type: "file", required: false, options: [] }], templateName: "قالب تجريبي", charterText: sampleCharter },
          { id: "p2", kind: "program", state: "مفتوح", order: 2, name: "نادي غراس", desc: "أنشطة صيفية رياضية وثقافية للأطفال.", image: "", location: "الرياض", startDate: "2027-06-20", endDate: "2027-07-30", days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء"], timeFrom: "08:00", timeTo: "12:00", hours: "96", seats: "12", gender: "رجال", employerSig: false, extras: [], questions: [{ id: "q1", label: "المهارة الرياضية أو الثقافية التي تجيدها", type: "text", required: true, options: [] }], templateName: "قالب تجريبي", charterText: sampleCharter }
        ],
        volunteers: { "1010101010": { name: "عبدالله محمد صالح العتيبي", nationalId: "1010101010", nationality: "سعودي", nationalityName: "", gender: "ذكر", birthDate: "1976-09-08", phone: "0501112233", email: "abdullah@example.com", city: "الرياض", district: "السويدي", qualification: "بكالوريوس", major: "إدارة أعمال", employer: "", jobTitle: "", source: "ملف" } },
        regs: []
      };
    }
    const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.programs) return d; } catch (e) {} const d = seed(); save(d); return d; };
    const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { throw new Error("امتلأت ذاكرة المتصفح في وضع التجربة"); } };
    const fail = (m) => { throw new Error(m); };
    const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
    const pub = (d, p) => {
      const used = d.regs.filter((r) => r.programId === p.id && r.status !== STATUS.REJECTED).length;
      const o = Object.assign({}, p); o.seatsLeft = p.seats ? Math.max(0, Number(p.seats) - used) : null; o.used = used;
      return o;
    };
    const admin = (d, x) => { if (String(x.admin) !== String(d.adminCode)) fail("رمز الدخول غير صحيح"); };
    const byToken = (d, t) => d.regs.find((r) => r.token === t) || fail("الرابط غير صحيح أو منتهي");
    const byId = (d, id) => d.regs.find((r) => r.regId === id) || fail("التسجيل غير موجود");
    const progOf = (d, id) => d.programs.find((p) => p.id === id) || {};
    const light = (r) => ({ regId: r.regId, created: r.created, status: r.status, programId: r.programId, programName: r.programName, name: r.person.name, nationalId: r.person.nationalId, phone: r.person.phone, nationality: nationalityText(r.person), saudi: isSaudi(r.person), employerRequired: r.employerRequired, hasEmployer: !!r.employerFile, updated: r.updated });

    // توليد وثيقة PDF تقريبية من نص الميثاق (للتجربة فقط؛ الحقيقية تولد من قالب Word في Google Docs)
    async function renderPdf(d, r, appr) {
      const prog = progOf(d, r.programId);
      const text = fillText(prog.charterText || sampleCharter, placeholderMap(r.person, prog, r, appr));
      const { PDFDocument } = await loadPdfLib();
      const pdf = await PDFDocument.create();
      const W = 1240, H = 1754, M = 110;
      const logo = await loadImage("assets/logo.png").catch(() => null);
      const lines = text.split("\n");
      let c, x, y;
      const newPage = async () => {
        if (c) { const png = await pdf.embedPng(c.toDataURL("image/png")); pdf.addPage([595.28, 841.89]).drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 }); }
        c = document.createElement("canvas"); c.width = W; c.height = H; x = c.getContext("2d");
        x.fillStyle = "#fff"; x.fillRect(0, 0, W, H); x.direction = "rtl"; x.textAlign = "right"; x.fillStyle = "#14213A";
        if (logo) x.drawImage(logo, M, 70, 190, 190 * logo.naturalHeight / logo.naturalWidth);
        y = 320;
      };
      await newPage();
      for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        const big = i === 0;
        x.font = `${big ? 46 : 30}px Gheras, Tahoma, sans-serif`;
        if (!t) { y += 22; continue; }
        const words = t.split(/\s+/); let line = "";
        for (const w of words) {
          const test = line ? line + " " + w : w;
          if (x.measureText(test).width > W - 2 * M && line) { x.fillText(line, W - M, y); y += big ? 66 : 52; line = w; if (y > H - 420) await newPage(); }
          else line = test;
        }
        x.fillText(line, W - M, y); y += big ? 90 : 52;
        if (y > H - 420) await newPage();
      }
      // خانات التوقيع
      y = Math.max(y + 30, H - 400);
      const boxes = [["المتطوع", r.signature ? [r.signature] : []], ["صاحب العمل", []], ["الجمعية", appr ? [d.settings.stamp, appr.signature].filter(Boolean) : []]];
      const shown = r.employerRequired ? boxes : [boxes[0], boxes[2]];
      const bw = (W - 2 * M - (shown.length - 1) * 30) / shown.length;
      for (let i = 0; i < shown.length; i++) {
        const bx = W - M - (i + 1) * bw - i * 30;
        x.strokeStyle = "#D5DCE7"; x.lineWidth = 2; x.strokeRect(bx, y, bw, 250);
        x.font = "28px Gheras, Tahoma, sans-serif"; x.fillStyle = "#1C437D"; x.fillText(shown[i][0], bx + bw - 20, y + 44);
        for (const src of shown[i][1]) { const im = await loadImage(src).catch(() => null); if (im) { const s = Math.min((bw - 60) / im.naturalWidth, 170 / im.naturalHeight); x.drawImage(im, bx + (bw - im.naturalWidth * s) / 2, y + 66, im.naturalWidth * s, im.naturalHeight * s); } }
      }
      const png = await pdf.embedPng(c.toDataURL("image/png"));
      pdf.addPage([595.28, 841.89]).drawImage(png, { x: 0, y: 0, width: 595.28, height: 841.89 });
      return dataToB64(await pdf.saveAsBase64({ dataUri: true }));
    }

    async function handle(action, x) {
      const d = load();
      const now = new Date().toISOString();
      switch (action) {
        case "config":
          return { ok: true, programs: d.programs.filter((p) => p.state === "مفتوح").sort((a, b) => a.order - b.order).map((p) => pub(d, p)) };
        case "lookupStart": {
          const v = d.volunteers[toEn(x.nationalId)];
          if (!v) return { ok: true, found: false };
          return v.email ? { ok: true, found: true, method: "email", hint: maskEmail(v.email), demo: "1234" } : { ok: true, found: true, method: "phone", hint: maskPhone(v.phone) };
        }
        case "lookupVerify": {
          const v = d.volunteers[toEn(x.nationalId)];
          if (!v) fail("لم نجد بيانات بهذا الرقم");
          if (x.code != null ? String(x.code) !== "1234" : toEn(x.phone) !== toEn(v.phone)) fail(x.code != null ? "الرمز غير صحيح" : "الجوال لا يطابق المسجل");
          return { ok: true, person: v, vtoken: "demo-" + uid() };
        }
        case "submit": {
          const p = progOf(d, x.programId); if (!p.id || p.state !== "مفتوح") fail("التسجيل في هذا البرنامج مغلق");
          const pp = pub(d, p); if (pp.seatsLeft === 0) fail("اكتملت المقاعد في هذا البرنامج");
          if (d.regs.some((r) => r.programId === p.id && r.person.nationalId === x.person.nationalId && r.status !== STATUS.REJECTED)) fail("سبق لك التسجيل في هذا البرنامج. افتح رابط المتابعة الذي وصلك بالبريد");
          const emp = !!p.employerSig && !isSaudi(x.person);
          const r = { regId: "GV-" + (1001 + d.regs.length), token: uid(), created: now, updated: now, programId: p.id, programName: p.name, person: x.person, answers: x.answers || {}, files: x.files || {}, signature: x.signature, employerRequired: emp, employerFile: null, status: emp ? STATUS.EMPLOYER : STATUS.PENDING, note: "", reason: "", approvedBy: "", approvedAt: "", final: "" };
          d.regs.push(r); d.volunteers[x.person.nationalId] = Object.assign({}, d.volunteers[x.person.nationalId] || {}, x.person); save(d);
          return { ok: true, regId: r.regId, token: r.token, status: r.status };
        }
        case "status": {
          const r = byToken(d, x.token), p = progOf(d, r.programId);
          return { ok: true, reg: { regId: r.regId, created: r.created, status: r.status, programName: r.programName, programId: r.programId, employerRequired: r.employerRequired, hasEmployer: !!r.employerFile, note: r.note, reason: r.reason, approvedAt: r.approvedAt, person: r.person, answers: r.answers }, program: pub(d, p) };
        }
        case "doc": {
          const r = byToken(d, x.token);
          if (x.which === "final") { if (!r.final) fail("الوثيقة غير جاهزة"); return { ok: true, b64: r.final, mime: "application/pdf", name: `ميثاق التطوع - ${r.regId}.pdf` }; }
          return { ok: true, b64: await renderPdf(d, r, null), mime: "application/pdf", name: `ميثاق التطوع - ${r.regId} - للتوقيع.pdf` };
        }
        case "uploadEmployer": {
          const r = byToken(d, x.token);
          if (![STATUS.EMPLOYER, STATUS.CHANGES].includes(r.status)) fail("لا يمكن الرفع في هذه المرحلة");
          r.employerFile = x.file; if (r.status === STATUS.EMPLOYER) r.status = STATUS.PENDING; r.updated = now; save(d);
          return { ok: true, status: r.status };
        }
        case "resubmit": {
          const r = byToken(d, x.token);
          if (r.status !== STATUS.CHANGES) fail("لا يمكن التعديل في هذه المرحلة");
          r.person = x.person; r.answers = x.answers || r.answers; Object.assign(r.files, x.files || {});
          if (x.signature) r.signature = x.signature;
          if (x.employerFile) r.employerFile = x.employerFile;
          r.employerRequired = !!progOf(d, r.programId).employerSig && !isSaudi(r.person);
          r.status = r.employerRequired && !r.employerFile ? STATUS.EMPLOYER : STATUS.PENDING; r.note = ""; r.updated = now;
          d.volunteers[r.person.nationalId] = r.person; save(d);
          return { ok: true, status: r.status };
        }
        case "resendLinks": return { ok: true };
        // ——— الإدارة ———
        case "adminLogin": admin(d, x); return { ok: true };
        case "adminLoad":
          admin(d, x);
          return { ok: true, programs: d.programs.map((p) => pub(d, p)), supervisors: d.supervisors.map((s) => ({ id: s.id, name: s.name, title: s.title, hasSignature: !!s.signature })), settings: { alertEmail: d.settings.alertEmail, stamp: d.settings.stamp }, regs: d.regs.map(light).reverse() };
        case "regDetail": {
          admin(d, x); const r = byId(d, x.regId);
          return { ok: true, reg: Object.assign(light(r), { person: r.person, answers: r.answers, files: Object.keys(r.files || {}).map((k) => ({ key: k, name: r.files[k].name })), note: r.note, reason: r.reason, approvedBy: r.approvedBy, approvedAt: r.approvedAt, hasFinal: !!r.final, signature: r.signature }), program: pub(d, progOf(d, r.programId)) };
        }
        case "adminFile": {
          admin(d, x); const r = byId(d, x.regId);
          if (x.kind === "final") return { ok: true, b64: r.final, mime: "application/pdf", name: `${r.regId}.pdf` };
          if (x.kind === "draft") return { ok: true, b64: await renderPdf(d, r, null), mime: "application/pdf", name: `${r.regId}-مسودة.pdf` };
          if (x.kind === "employer") return { ok: true, b64: r.employerFile.b64, mime: r.employerFile.mime, name: r.employerFile.name };
          const f = r.files[x.kind]; if (!f) fail("الملف غير موجود"); return { ok: true, b64: f.b64, mime: f.mime, name: f.name };
        }
        case "checkSupervisor": {
          admin(d, x); const s = d.supervisors.find((s) => s.id === x.supervisorId);
          if (!s || String(s.code) !== String(x.code)) fail("رمز الاعتماد غير صحيح");
          if (!s.signature) fail("لم يرفع توقيع هذا المشرف بعد، ارفعه من صفحة المشرفين");
          if (!d.settings.stamp) fail("لم يرفع ختم الجمعية بعد، ارفعه من الإعدادات");
          return { ok: true, name: s.name, title: s.title, signature: s.signature, stamp: d.settings.stamp };
        }
        case "approve": {
          admin(d, x); const r = byId(d, x.regId); const s = d.supervisors.find((s) => s.id === x.supervisorId);
          if (!s || String(s.code) !== String(x.code)) fail("رمز الاعتماد غير صحيح");
          if (r.status !== STATUS.PENDING) fail("هذا التسجيل ليس بانتظار الاعتماد");
          const appr = { name: s.name, title: s.title, signature: s.signature, date: now };
          if (r.employerFile && !x.merged) return { ok: true, needMerge: true, charter: await renderPdf(d, r, appr), employer: r.employerFile };
          r.final = x.merged || await renderPdf(d, r, appr);
          r.status = STATUS.APPROVED; r.approvedBy = s.name; r.approvedAt = now; r.updated = now; save(d);
          return { ok: true, status: r.status };
        }
        case "requestChanges": { admin(d, x); const r = byId(d, x.regId); r.status = STATUS.CHANGES; r.note = x.note; r.updated = now; save(d); return { ok: true }; }
        case "reject": { admin(d, x); const r = byId(d, x.regId); r.status = STATUS.REJECTED; r.reason = x.reason; r.updated = now; save(d); return { ok: true }; }
        case "saveProgram": {
          admin(d, x); const p = x.program;
          if (x.template) { p.templateName = x.template.name; p.charterText = p.charterText || sampleCharter; }
          if (!p.id) { p.id = "p" + uid().slice(0, 6); p.order = d.programs.length; p.kind = "program"; d.programs.push(p); }
          else { const i = d.programs.findIndex((q) => q.id === p.id); d.programs[i] = Object.assign(d.programs[i], p); }
          save(d); return { ok: true, id: p.id };
        }
        case "previewTemplate": {
          admin(d, x); const p = progOf(d, x.programId);
          const fake = { regId: "GV-0000", created: now, programId: p.id, signature: "", employerRequired: !!p.employerSig, person: { name: "اسم المتطوع التجريبي", nationalId: "2000000000", nationality: "غير سعودي", nationalityName: "مصري", gender: "ذكر", phone: "0500000000", email: "test@example.com", city: "الرياض" } };
          return { ok: true, b64: await renderPdf(d, fake, { name: "اسم المشرف", title: "صفة المشرف", signature: "", date: now }), mime: "application/pdf", name: "معاينة القالب.pdf" };
        }
        case "saveSupervisor": {
          admin(d, x); const s = x.supervisor;
          let o = d.supervisors.find((q) => q.id === s.id);
          if (!o) { if (!s.code) fail("اكتب رمز الاعتماد"); o = { id: "s" + uid().slice(0, 6) }; d.supervisors.push(o); }
          o.name = s.name; o.title = s.title; if (s.code) o.code = s.code; if (s.signature) o.signature = s.signature;
          save(d); return { ok: true };
        }
        case "removeSupervisor": { admin(d, x); d.supervisors = d.supervisors.filter((s) => s.id !== x.id); save(d); return { ok: true }; }
        case "saveSettings": {
          admin(d, x);
          if (x.alertEmail != null) d.settings.alertEmail = x.alertEmail;
          if (x.stamp) d.settings.stamp = x.stamp;
          if (x.newAdminCode) d.adminCode = x.newAdminCode;
          save(d); return { ok: true };
        }
        case "adminVolunteers": {
          admin(d, x);
          const vols = Object.values(d.volunteers);
          const regs = d.regs.map((r) => { const p = progOf(d, r.programId); return { regId: r.regId, nationalId: r.person.nationalId, programName: r.programName, status: r.status, hours: p.hours || "", startDate: p.startDate || "", endDate: p.endDate || "", created: r.created, approvedAt: r.approvedAt, person: r.person }; });
          return { ok: true, volunteers: vols, regs };
        }
        case "importVolunteers": {
          admin(d, x);
          let added = 0, updated = 0;
          (x.rows || []).forEach((p) => {
            const old = d.volunteers[p.nationalId];
            if (old) { Object.keys(p).forEach((k) => { if (p[k]) old[k] = p[k]; }); updated++; }
            else { d.volunteers[p.nationalId] = Object.assign({ source: "ملف" }, p); added++; }
          });
          save(d); return { ok: true, added, updated };
        }
        default: fail("عملية غير معروفة");
      }
    }
    return { handle, reset: () => localStorage.removeItem(KEY) };
  })();

  window.TG = { ageParts, arCount, ageSentence, W_AM, W_HOUR, maskEmail, maskPhone, loadXlsx, IMPORT_COLUMNS, normalizeImported, isoDate, LIVE, STATUS, DAYS, PERSON_FIELDS, IMAGE_KEYS, PLACEHOLDERS, call, toAr, toEn, esc, fmtDate, fmtTime, programTime, nationalityText, isSaudi, placeholderMap, fillText, phKey, readAsDataURL, compressImage, transparentPng, packFile, b64ToBlob, dataToB64, loadPdfLib, mergePdf, Mock };
})();
