/* منصة الاستبانات — المنطق المشترك بين الواجهة والخادم
   لا يعتمد على المتصفح، ويُنسخ كما هو إلى apps-script/Schema.gs حتى يتحقق الخادم بالقواعد نفسها:
   أنواع الأسئلة، والتحقق من الإجابات، ومسار الأقسام، وتصحيح الاختبار، وأعمدة الشيت، وملخص الردود.
   لا تستخدم هنا ?. ولا ?? حتى يعمل في Apps Script كما يعمل في المتصفح. */
var GSchema = (function () {
  "use strict";

  // q: سؤال يجاب عنه، choice: له خيارات، grade: يصحح في الاختبار، branch: يوجه إلى قسم حسب الإجابة
  var TYPES = {
    short: { label: "إجابة قصيرة", q: true, grade: true },
    paragraph: { label: "فقرة", q: true },
    radio: { label: "اختيار من متعدد", q: true, choice: true, grade: true, branch: true },
    checkbox: { label: "مربعات اختيار", q: true, choice: true, grade: true },
    dropdown: { label: "قائمة منسدلة", q: true, choice: true, grade: true, branch: true },
    scale: { label: "مقياس خطي", q: true },
    rating: { label: "تقييم بالنجوم", q: true },
    grid: { label: "شبكة اختيار من متعدد", q: true, grid: true, grade: true },
    checkgrid: { label: "شبكة مربعات اختيار", q: true, grid: true },
    date: { label: "تاريخ", q: true },
    time: { label: "وقت", q: true },
    file: { label: "رفع ملف", q: true },
    text: { label: "عنوان ووصف" },
    image: { label: "صورة" },
    video: { label: "فيديو" }
  };

  var FILE_KINDS = {
    doc: { label: "مستند", ext: ["doc", "docx", "odt", "rtf", "txt"] },
    sheet: { label: "جدول بيانات", ext: ["xls", "xlsx", "ods", "csv"] },
    slides: { label: "عرض تقديمي", ext: ["ppt", "pptx", "odp", "key"] },
    pdf: { label: "PDF", ext: ["pdf"] },
    image: { label: "صورة", ext: ["jpg", "jpeg", "png", "gif", "webp", "heic", "heif", "svg"] },
    video: { label: "فيديو", ext: ["mp4", "mov", "avi", "mkv", "webm", "3gp"] },
    audio: { label: "صوت", ext: ["mp3", "wav", "m4a", "aac", "ogg", "opus"] }
  };

  var OTHER = "أخرى";
  var MSG = {
    required: "هذا السؤال مطلوب",
    other: "اكتب إجابتك في خانة (أخرى)",
    eachRow: "اختر إجابة في كل صف",
    onePerCol: "لا تكرر العمود نفسه في أكثر من صف",
    number: "أدخل رقما",
    int: "أدخل عددا صحيحا",
    email: "أدخل بريدا إلكترونيا صحيحا",
    url: "أدخل رابطا صحيحا يبدأ بـ https://",
    phone: "أدخل رقم جوال صحيحا مثل 05xxxxxxxx",
    files: "عدد الملفات أكثر من المسموح",
    fileType: "نوع الملف غير مسموح",
    invalid: "الإجابة غير صحيحة"
  };

  // ——— أدوات ———
  function uid(n) {
    var s = "", abc = "abcdefghijkmnpqrstuvwxyz23456789";
    for (var i = 0; i < (n || 8); i++) s += abc.charAt(Math.floor(Math.random() * abc.length));
    return s;
  }
  function digits(v) { // الأرقام العربية والفارسية إلى لاتينية
    return String(v == null ? "" : v).replace(/[٠-٩]/g, function (d) { return String("٠١٢٣٤٥٦٧٨٩".indexOf(d)); })
      .replace(/[۰-۹]/g, function (d) { return String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)); });
  }
  function toAr(v) { return String(v).replace(/\d/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".charAt(+d); }); }
  function norm(s) { return digits(s).trim().replace(/\s+/g, " ").toLowerCase().replace(/[إأآ]/g, "ا").replace(/ة$/g, "ه").replace(/ى/g, "ي"); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function isQ(it) { return !!(TYPES[it.type] && TYPES[it.type].q); }
  function items(survey) {
    var out = [];
    (survey.sections || []).forEach(function (s) { (s.items || []).forEach(function (it) { out.push(it); }); });
    return out;
  }
  function questions(survey) { return items(survey).filter(isQ); }
  function findItem(survey, id) { var all = items(survey); for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i]; return null; }
  function ext(name) { var m = /\.([^.]+)$/.exec(String(name || "")); return m ? m[1].toLowerCase() : ""; }
  function allowedExt(item) {
    var kinds = (item.file && item.file.kinds) || [];
    if (!kinds.length) return null; // كل الأنواع
    var out = [];
    kinds.forEach(function (k) { if (FILE_KINDS[k]) out = out.concat(FILE_KINDS[k].ext); });
    return out;
  }

  // ——— إجابة فارغة؟ ———
  function isEmpty(item, a) {
    if (a == null || a === "") return true;
    switch (item.type) {
      case "radio": case "checkbox": case "dropdown":
        return !((a.c && a.c.length) || a.o != null);
      case "grid": case "checkgrid":
        if (typeof a !== "object") return true;
        return !Object.keys(a).some(function (k) { var v = a[k]; return Array.isArray(v) ? v.length : v; });
      case "file": return !Array.isArray(a) || !a.length;
      case "scale": case "rating": return a === "" || isNaN(Number(a));
      default: return String(a).trim() === "";
    }
  }

  // ——— التحقق من إجابة سؤال: يرجع نص الخطأ أو "" ———
  function check(item, a) {
    if (!isQ(item)) return "";
    var empty = isEmpty(item, a);
    if (empty) return item.required ? MSG.required : "";
    var v = item.validation || {};
    var custom = v.msg ? String(v.msg) : "";
    switch (item.type) {
      case "short": {
        var s = String(a).trim(), d = digits(s);
        if (v.kind === "number") {
          var n = Number(d.replace(/,/g, ""));
          if (d === "" || isNaN(n)) return custom || MSG.number;
          var x = Number(digits(v.a)), y = Number(digits(v.b));
          var ok = {
            isnum: true, int: Math.floor(n) === n,
            gt: n > x, gte: n >= x, lt: n < x, lte: n <= x, eq: n === x, neq: n !== x,
            between: n >= Math.min(x, y) && n <= Math.max(x, y),
            nbetween: n < Math.min(x, y) || n > Math.max(x, y)
          }[v.op || "isnum"];
          if (!ok) return custom || (v.op === "int" ? MSG.int : MSG.invalid);
        } else if (v.kind === "text") {
          if (v.op === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return custom || MSG.email;
          if (v.op === "url" && !/^https?:\/\/[^\s.]+\.[^\s]{2,}/i.test(s)) return custom || MSG.url;
          if (v.op === "phone" && !/^(05\d{8}|(\+|00)?9665\d{8})$/.test(d.replace(/[\s-]/g, ""))) return custom || MSG.phone;
          if (v.op === "contains" && s.indexOf(String(v.a || "")) < 0) return custom || MSG.invalid;
          if (v.op === "ncontains" && v.a && s.indexOf(String(v.a)) >= 0) return custom || MSG.invalid;
        } else if (v.kind === "length") {
          var len = s.length, lim = Number(digits(v.a)) || 0;
          if (v.op === "max" && len > lim) return custom || ("الحد الأقصى " + toAr(lim) + " حرفا");
          if (v.op === "min" && len < lim) return custom || ("الحد الأدنى " + toAr(lim) + " حرفا");
        } else if (v.kind === "regex" && v.a) {
          var re; try { re = new RegExp(v.a); } catch (e) { re = null; }
          if (re && (v.op === "nmatches" ? re.test(s) : !re.test(s))) return custom || MSG.invalid;
        }
        return "";
      }
      case "paragraph": {
        var t = String(a).trim(), l2 = t.length, lim2 = Number(digits(v.a)) || 0;
        if (v.kind === "length" && v.op === "max" && l2 > lim2) return custom || ("الحد الأقصى " + toAr(lim2) + " حرفا");
        if (v.kind === "length" && v.op === "min" && l2 < lim2) return custom || ("الحد الأدنى " + toAr(lim2) + " حرفا");
        if (v.kind === "regex" && v.a) {
          var re2; try { re2 = new RegExp(v.a); } catch (e) { re2 = null; }
          if (re2 && (v.op === "nmatches" ? re2.test(t) : !re2.test(t))) return custom || MSG.invalid;
        }
        return "";
      }
      case "radio": case "dropdown": case "checkbox": {
        if (a.o != null && !String(a.o).trim()) return MSG.other;
        var labels = (item.options || []).map(function (o) { return o.label; });
        var bad = (a.c || []).some(function (c) { return labels.indexOf(c) < 0; });
        if (bad) return MSG.invalid;
        if (item.type !== "checkbox" && (a.c || []).length + (a.o != null ? 1 : 0) > 1) return MSG.invalid;
        if (item.type === "checkbox" && v.kind === "count") {
          var cnt = (a.c || []).length + (a.o != null ? 1 : 0), k = Number(digits(v.a)) || 0;
          if (v.op === "min" && cnt < k) return custom || ("اختر " + toAr(k) + " على الأقل");
          if (v.op === "max" && cnt > k) return custom || ("اختر " + toAr(k) + " على الأكثر");
          if (v.op === "eq" && cnt !== k) return custom || ("اختر " + toAr(k) + " بالضبط");
        }
        return "";
      }
      case "grid": case "checkgrid": {
        var rows = item.rows || [];
        if (item.required && rows.some(function (r) { var x = a[r.id]; return !(Array.isArray(x) ? x.length : x); })) return MSG.eachRow;
        if (item.onePerCol) {
          var used = {}, dup = false;
          rows.forEach(function (r) { [].concat(a[r.id] || []).forEach(function (c) { if (used[c]) dup = true; used[c] = 1; }); });
          if (dup) return MSG.onePerCol;
        }
        return "";
      }
      case "scale": {
        var sc = item.scale || {}, num = Number(a);
        if (num < (sc.min == null ? 1 : sc.min) || num > (sc.max || 5)) return MSG.invalid;
        return "";
      }
      case "rating": {
        var r2 = Number(a);
        if (r2 < 1 || r2 > ((item.rating && item.rating.max) || 5)) return MSG.invalid;
        return "";
      }
      case "file": {
        var max = (item.file && item.file.maxFiles) || 1;
        if (a.length > max) return MSG.files;
        var allow = allowedExt(item);
        if (allow && a.some(function (f) { return allow.indexOf(ext(f.name)) < 0; })) return MSG.fileType;
        return "";
      }
      default: return "";
    }
  }

  // ——— مسار الأقسام: الترتيب الذي يمر به المجيب حسب إجاباته ———
  function nextIndex(survey, idx, answers) {
    var secs = survey.sections || [], sec = secs[idx], target = sec.next || "";
    (sec.items || []).forEach(function (it) {
      if (!it.branch || !TYPES[it.type] || !TYPES[it.type].branch) return;
      var a = answers[it.id];
      if (!a) return;
      if (a.o != null) { if (it.otherGo) target = it.otherGo; return; }
      var lab = (a.c || [])[0];
      (it.options || []).forEach(function (o) { if (o.label === lab && o.go) target = o.go; });
    });
    if (target === "submit") return -1;
    if (target) { for (var i = 0; i < secs.length; i++) if (secs[i].id === target) return i; }
    return idx + 1 < secs.length ? idx + 1 : -1;
  }
  function path(survey, answers) {
    var secs = survey.sections || [], out = [], seen = {}, i = 0;
    while (i >= 0 && i < secs.length && !seen[secs[i].id]) {
      seen[secs[i].id] = 1;
      out.push(secs[i].id);
      i = nextIndex(survey, i, answers || {});
    }
    return out;
  }
  // الإجابات في الأقسام التي مر بها المجيب فقط
  function pathItems(survey, answers) {
    var ids = path(survey, answers), out = [];
    (survey.sections || []).forEach(function (s) { if (ids.indexOf(s.id) >= 0) (s.items || []).forEach(function (it) { out.push(it); }); });
    return out;
  }

  // ——— تحقق كامل قبل الحفظ (يستعمله الخادم) ———
  function validate(survey, answers, email) {
    var st = survey.settings || {};
    if (st.collectEmail === "required" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || "").trim())) return "البريد الإلكتروني مطلوب";
    var list = pathItems(survey, answers);
    for (var i = 0; i < list.length; i++) {
      var err = check(list[i], answers[list[i].id]);
      if (err) return "«" + (list[i].title || "سؤال") + "»: " + err;
    }
    return "";
  }

  // ——— التصحيح ———
  function keyText(item) {
    var q = item.quiz || {};
    if (item.type === "grid") return (item.rows || []).map(function (r) { return r.label + ": " + ((q.gridKey || {})[r.id] || "—"); }).join("، ");
    return (q.key || []).join("، ");
  }
  function grade(survey, answers) {
    var st = survey.settings || {};
    if (!st.quiz || !st.quiz.on) return null;
    var res = { earned: 0, total: 0, items: [] };
    pathItems(survey, answers).forEach(function (it) {
      if (!TYPES[it.type] || !TYPES[it.type].grade) return;
      var q = it.quiz || {}, pts = Number(q.points) || 0;
      var hasKey = it.type === "grid" ? q.gridKey && Object.keys(q.gridKey).length : q.key && q.key.length;
      if (!pts || !hasKey) return;
      var a = answers[it.id], ok = false;
      if (!isEmpty(it, a)) {
        if (it.type === "short") {
          ok = q.key.some(function (k) { return norm(k) === norm(a); });
        } else if (it.type === "radio" || it.type === "dropdown") {
          ok = a.o == null && q.key.indexOf((a.c || [])[0]) >= 0;
        } else if (it.type === "checkbox") {
          var got = (a.c || []).slice().sort().join("\u0001"), want = q.key.slice().sort().join("\u0001");
          ok = a.o == null && got === want;
        } else if (it.type === "grid") {
          ok = (it.rows || []).every(function (r) { return !q.gridKey[r.id] || a[r.id] === q.gridKey[r.id]; });
        }
      }
      res.total += pts;
      if (ok) res.earned += pts;
      res.items.push({ id: it.id, title: it.title, ok: ok, points: pts, earned: ok ? pts : 0, key: keyText(it), fb: ok ? q.fbOk || "" : q.fbBad || "" });
    });
    return res;
  }

  // ——— ما يراه المجيب: بلا مفتاح الإجابات ولا إعدادات الإدارة ———
  function publicView(survey) {
    var s = clone(survey), st = s.settings || {};
    items(s).forEach(function (it) {
      if (it.quiz) it.quiz = { points: Number(it.quiz.points) || 0 };
    });
    s.settings = {
      collectEmail: st.collectEmail || "off", allowEdit: !!st.allowEdit, showProgress: st.showProgress !== false,
      shuffle: !!st.shuffle, confirmation: st.confirmation || "", allowAnother: st.allowAnother !== false,
      showSummary: !!st.showSummary, oneResponse: !!st.oneResponse, numbered: st.numbered !== false, sendCopy: !!st.sendCopy,
      quiz: st.quiz && st.quiz.on ? { on: true, release: st.quiz.release || "now", showPoints: st.quiz.showPoints !== false } : { on: false }
    };
    delete s.owner; delete s.editors;
    s.hasCode = !!st.accessCode;
    return s;
  }

  // ——— أعمدة ورقة الردود ———
  function columns(survey) {
    var cols = [];
    questions(survey).forEach(function (it) {
      if (TYPES[it.type].grid) (it.rows || []).forEach(function (r) { cols.push({ key: it.id + "." + r.id, title: (it.title || "سؤال") + " [" + r.label + "]" }); });
      else cols.push({ key: it.id, title: it.title || "سؤال" });
    });
    return cols;
  }
  function cellText(item, a, rowId) {
    if (isEmpty(item, a)) return "";
    switch (item.type) {
      case "radio": case "dropdown": case "checkbox":
        return (a.c || []).concat(a.o != null ? [a.o] : []).join("، ");
      case "grid": case "checkgrid":
        return [].concat(a[rowId] || []).join("، ");
      case "file": return a.map(function (f) { return f.url || f.name; }).join("\n");
      default: return String(a);
    }
  }
  function cell(item, a, rowId) {
    var t = cellText(item, a, rowId);
    if ((item.type === "scale" || item.type === "rating") && t !== "") return Number(t);
    if (item.type === "short" && item.validation && item.validation.kind === "number" && t !== "" && !isNaN(Number(digits(t)))) return Number(digits(t));
    return t;
  }
  function cellFor(survey, key, answers) {
    var p = key.split("."), it = findItem(survey, p[0]);
    return it ? cell(it, answers[it.id], p[1]) : "";
  }

  // ——— ملخص سؤال من مجموعة ردود ———
  function aggregate(item, list) {
    var out = { id: item.id, type: item.type, title: item.title, n: 0 };
    var answered = list.filter(function (a) { return !isEmpty(item, a); });
    out.n = answered.length;
    if (TYPES[item.type].choice) {
      var counts = (item.options || []).map(function (o) { return { label: o.label, n: 0 }; }), other = 0, others = [];
      answered.forEach(function (a) {
        (a.c || []).forEach(function (c) { counts.forEach(function (x) { if (x.label === c) x.n++; }); });
        if (a.o != null) { other++; others.push(String(a.o)); }
      });
      if (item.other || other) counts.push({ label: OTHER, n: other, other: true });
      out.counts = counts; out.others = others;
    } else if (item.type === "scale" || item.type === "rating") {
      var lo = item.type === "rating" ? 1 : ((item.scale && item.scale.min != null) ? item.scale.min : 1);
      var hi = item.type === "rating" ? ((item.rating && item.rating.max) || 5) : ((item.scale && item.scale.max) || 5);
      var c2 = [], sum = 0;
      for (var v = lo; v <= hi; v++) c2.push({ label: String(v), n: 0 });
      answered.forEach(function (a) { var n = Number(a); sum += n; var x = c2[n - lo]; if (x) x.n++; });
      out.counts = c2; out.avg = answered.length ? sum / answered.length : 0;
    } else if (TYPES[item.type].grid) {
      out.cols = (item.cols || []).map(function (c) { return c.label; });
      out.rows = (item.rows || []).map(function (r) {
        var cs = out.cols.map(function () { return 0; });
        answered.forEach(function (a) { [].concat(a[r.id] || []).forEach(function (c) { var i = out.cols.indexOf(c); if (i >= 0) cs[i]++; }); });
        return { label: r.label, counts: cs };
      });
    } else if (item.type === "file") {
      out.files = [];
      answered.forEach(function (a) { a.forEach(function (f) { out.files.push(f); }); });
    } else {
      out.texts = answered.map(function (a) { return String(a); });
    }
    return out;
  }
  function summary(survey, answerList, choiceOnly) {
    return questions(survey).filter(function (it) {
      return !choiceOnly || TYPES[it.type].choice || TYPES[it.type].grid || it.type === "scale" || it.type === "rating";
    }).map(function (it) {
      return aggregate(it, answerList.map(function (ans) { return (ans || {})[it.id]; }));
    });
  }

  // ——— استبانة جديدة ———
  function blank(title) {
    return {
      id: "", title: title || "استبانة بلا عنوان", description: "", kicker: "استبانة",
      theme: { accent: "navy" },
      settings: {
        accepting: true, opensAt: "", closesAt: "", closedMessage: "", maxResponses: 0,
        collectEmail: "off", oneResponse: false, allowEdit: false, sendCopy: false, accessCode: "",
        showProgress: true, shuffle: false, numbered: true, confirmation: "", allowAnother: true, showSummary: false,
        notifyEmails: "", quiz: { on: false, release: "now", showMissed: true, showCorrect: true, showPoints: true }
      },
      sections: [{ id: uid(), title: "", description: "", next: "", items: [] }]
    };
  }
  function newItem(type) {
    var it = { id: uid(), type: type, title: "", description: "", required: false };
    if (TYPES[type].choice) { it.options = [{ label: "الخيار ١" }]; it.other = false; it.shuffle = false; }
    if (type === "scale") it.scale = { min: 1, max: 5, minLabel: "", maxLabel: "" };
    if (type === "rating") it.rating = { max: 5 };
    if (TYPES[type].grid) { it.rows = [{ id: uid(6), label: "الصف ١" }]; it.cols = [{ label: "العمود ١" }]; it.onePerCol = false; }
    if (type === "date") it.date = { time: false };
    if (type === "time") it.time = { duration: false };
    if (type === "file") it.file = { kinds: [], maxFiles: 1, maxMB: 10 };
    if (type === "image" || type === "video") it.media = { url: "", caption: "" };
    if (TYPES[type].grade) it.quiz = { points: 0, key: [], gridKey: {}, fbOk: "", fbBad: "" };
    return it;
  }

  // هل تستقبل الاستبانة ردودا الآن؟ يرجع "" أو سبب الإغلاق
  function closedReason(survey, count, now) {
    var st = survey.settings || {};
    var t = now || new Date();
    if (!st.accepting) return "closed";
    if (st.opensAt && t < new Date(st.opensAt)) return "notyet";
    if (st.closesAt && t > new Date(st.closesAt)) return "ended";
    if (Number(st.maxResponses) > 0 && Number(count || 0) >= Number(st.maxResponses)) return "full";
    return "";
  }

  return {
    TYPES: TYPES, FILE_KINDS: FILE_KINDS, OTHER: OTHER, MSG: MSG,
    uid: uid, digits: digits, toAr: toAr, clone: clone, isQ: isQ, items: items, questions: questions, findItem: findItem,
    ext: ext, allowedExt: allowedExt, isEmpty: isEmpty, check: check, nextIndex: nextIndex, path: path, pathItems: pathItems,
    validate: validate, grade: grade, publicView: publicView, columns: columns, cell: cell, cellText: cellText, cellFor: cellFor,
    aggregate: aggregate, summary: summary, blank: blank, newItem: newItem, closedReason: closedReason
  };
})();
if (typeof window !== "undefined") window.GSchema = GSchema;
