/* منصة الاستبانات — الاتصال بالخادم
   إذا ضبط APPS_SCRIPT_URL في config.js تذهب الطلبات إلى Google Apps Script،
   وإلا تعمل المنصة في وضع التجربة بقاعدة بيانات وهمية داخل المتصفح (رمز الدخول 1234). */
(function () {
  "use strict";
  const CFG = window.GHERAS_CONFIG || {};
  const S = window.GSchema;
  const configured = /^https:\/\/script\.google\.com\//.test(CFG.APPS_SCRIPT_URL || "");

  async function remote(payload) {
    const res = await fetch(CFG.APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  // ——— وضع التجربة ———
  const DB_KEY = "gheras-surveys-mock-v1";
  const store = (fn) => { try { return fn(window.localStorage); } catch (e) { return null; } };
  function load() {
    const raw = store((ls) => ls.getItem(DB_KEY));
    if (raw) { try { return JSON.parse(raw); } catch (e) { /* أعد الإنشاء */ } }
    const db = { surveys: {}, log: [], seeded: false };
    return db;
  }
  function save(db) { store((ls) => ls.setItem(DB_KEY, JSON.stringify(db))); }
  const USERS = [{ name: "مدير المنصة", role: "مدير", code: "1234" }, { name: "قسم البرامج", role: "مصمم", code: "5678" }];
  const ref = () => "ST-" + new Date().toISOString().slice(2, 10).replace(/-/g, "") + "-" + S.uid(4).toUpperCase();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function seed(db) {
    if (db.seeded || !window.GSurveyTemplates) return;
    db.seeded = true;
    const t = window.GSurveyTemplates.find((x) => x.id === "satisfaction");
    if (!t) return;
    const s = t.build();
    s.id = "demo01"; s.owner = "مدير المنصة"; s.editors = []; s.created = s.updated = new Date().toISOString();
    db.surveys[s.id] = s;
    // ردود تجريبية حتى يظهر الملخص
    const qs = S.questions(s);
    for (let n = 0; n < 14; n++) {
      const ans = {};
      qs.forEach((q, i) => {
        if (q.type === "scale") ans[q.id] = String(((n * 7 + i * 3) % 5) + 1 > 2 ? ((n + i) % 3) + 3 : 2);
        else if (q.type === "rating") ans[q.id] = String(((n + i) % 3) + 3);
        else if (q.type === "radio" || q.type === "dropdown") ans[q.id] = { c: [q.options[(n + i) % q.options.length].label] };
        else if (q.type === "checkbox") ans[q.id] = { c: q.options.filter((o, k) => (n + k) % 3 === 0).map((o) => o.label) };
        else if (q.type === "grid") { const g = {}; q.rows.forEach((r, k) => (g[r.id] = q.cols[(n + k) % q.cols.length].label)); ans[q.id] = g; }
        else if (q.type === "paragraph" && n % 3 === 0) ans[q.id] = ["البرنامج ممتاز وأتمنى زيادة عدد اللقاءات", "التنظيم رائع والمدربون متعاونون", "نتمنى أن يكون الموعد بعد العصر", "استفاد ابني كثيرا"][n % 4];
      });
      db.log.push({ ref: ref(), survey: s.id, time: new Date(Date.now() - (14 - n) * 86400000).toISOString(), email: "", answers: ans, score: "" });
    }
  }

  function can(user, s) { return user.role === "مدير" || s.owner === user.name || (s.editors || []).includes(user.name); }
  const count = (db, id) => db.log.filter((r) => r.survey === id).length;

  async function mock(p) {
    await sleep(p.action === "upload" ? 500 : 250);
    const db = load();
    seed(db);
    const user = USERS.find((u) => "tok-" + u.code === p.token);
    const needAuth = ["list", "get", "save", "remove", "responses", "delResponse", "users"];
    if (needAuth.includes(p.action) && !user) return { ok: false, auth: true, error: "انتهت الجلسة، ادخل مرة أخرى" };
    const s = p.id ? db.surveys[p.id] : null;
    let out;
    switch (p.action) {
      case "login": {
        const u = USERS.find((x) => x.code === String(p.code || "").trim());
        out = u ? { ok: true, token: "tok-" + u.code, user: { name: u.name, role: u.role } } : { ok: false, error: "رمز الدخول غير صحيح" };
        break;
      }
      case "list":
        out = { ok: true, surveys: Object.values(db.surveys).filter((x) => can(user, x)).map((x) => ({
          id: x.id, title: x.title, owner: x.owner, updated: x.updated, created: x.created, count: count(db, x.id),
          accepting: !!x.settings.accepting, reason: S.closedReason(x, count(db, x.id)), quiz: !!(x.settings.quiz && x.settings.quiz.on),
          questions: S.questions(x).length, accent: (x.theme && x.theme.accent) || "navy"
        })) };
        break;
      case "get":
        out = s && can(user, s) ? { ok: true, survey: s, count: count(db, s.id), sheetUrl: "" } : { ok: false, error: "الاستبانة غير موجودة" };
        break;
      case "save": {
        const x = p.survey;
        if (x.id && db.surveys[x.id] && !can(user, db.surveys[x.id])) { out = { ok: false, error: "لا تملك صلاحية تعديل هذه الاستبانة" }; break; }
        const old = x.id && db.surveys[x.id];
        if (old && p.base && old.updated !== p.base) { out = { ok: false, conflict: true, error: "عدل شخص آخر هذه الاستبانة الآن. حدث الصفحة لترى آخر نسخة" }; break; }
        if (!old) { x.id = x.id || S.uid(6); x.owner = user.name; x.created = new Date().toISOString(); }
        else { x.owner = old.owner; x.created = old.created; }
        x.updated = new Date().toISOString();
        db.surveys[x.id] = x;
        out = { ok: true, id: x.id, updated: x.updated, owner: x.owner };
        break;
      }
      case "remove":
        if (s && can(user, s)) { delete db.surveys[p.id]; db.log = db.log.filter((r) => r.survey !== p.id); out = { ok: true }; }
        else out = { ok: false, error: "الاستبانة غير موجودة" };
        break;
      case "responses":
        out = s && can(user, s) ? { ok: true, list: db.log.filter((r) => r.survey === p.id), sheetUrl: "" } : { ok: false, error: "الاستبانة غير موجودة" };
        break;
      case "delResponse":
        db.log = db.log.filter((r) => !(r.survey === p.id && r.ref === p.ref));
        out = { ok: true };
        break;
      case "users":
        out = { ok: true, users: USERS.map((u) => u.name) };
        break;
      case "form": {
        if (!s) { out = { ok: false, missing: true, error: "الاستبانة غير موجودة أو حذفت" }; break; }
        const reason = S.closedReason(s, count(db, s.id));
        const pub = S.publicView(s);
        if (reason && !p.edit) { out = { ok: true, closed: reason, opens: s.settings.opensAt || "", message: s.settings.closedMessage || "", survey: { title: s.title, kicker: s.kicker, theme: s.theme } }; break; }
        if (s.settings.accessCode && String(p.code || "").trim() !== s.settings.accessCode) {
          out = p.code ? { ok: false, error: "رمز الدخول غير صحيح" } : { ok: true, needCode: true, survey: { title: s.title, kicker: s.kicker, description: s.description, theme: s.theme } };
          break;
        }
        let prev = null;
        if (p.edit) {
          const r = db.log.find((x) => x.survey === s.id && x.token === p.edit);
          if (!r || !s.settings.allowEdit) { out = { ok: false, error: "رابط التعديل غير صالح" }; break; }
          prev = { answers: r.answers, email: r.email, ref: r.ref };
        }
        out = { ok: true, survey: pub, prev };
        break;
      }
      case "upload":
        out = { ok: true, url: "#mock-" + encodeURIComponent(p.name) };
        break;
      case "submit": {
        if (!s) { out = { ok: false, error: "الاستبانة غير موجودة" }; break; }
        const editRow = p.edit ? db.log.find((x) => x.survey === s.id && x.token === p.edit) : null;
        if (!editRow && S.closedReason(s, count(db, s.id))) { out = { ok: false, error: "الاستبانة لا تستقبل ردودا الآن" }; break; }
        if (s.settings.accessCode && String(p.code || "").trim() !== s.settings.accessCode) { out = { ok: false, error: "رمز الدخول غير صحيح" }; break; }
        const err = S.validate(s, p.answers || {}, p.email);
        if (err) { out = { ok: false, error: err }; break; }
        const email = String(p.email || "").trim().toLowerCase();
        if (!editRow && s.settings.oneResponse && email && db.log.some((x) => x.survey === s.id && x.email === email)) { out = { ok: false, error: "سبق أن أُرسل رد بهذا البريد" }; break; }
        const g = S.grade(s, p.answers || {});
        const row = editRow || { ref: ref(), survey: s.id, token: S.uid(16) };
        Object.assign(row, { time: new Date().toISOString(), email, answers: p.answers, score: g ? g.earned + "/" + g.total : "" });
        if (!editRow) db.log.push(row);
        out = { ok: true, ref: row.ref, edit: s.settings.allowEdit ? row.token : "", grade: releaseGrade(s, g) };
        break;
      }
      case "summary": {
        if (!s || !s.settings.showSummary) { out = { ok: false, error: "ملخص الردود غير متاح" }; break; }
        const list = db.log.filter((r) => r.survey === s.id).map((r) => r.answers);
        out = { ok: true, n: list.length, title: s.title, summary: S.summary(s, list, true) };
        break;
      }
      default: out = { ok: false, error: "طلب غير معروف" };
    }
    save(db);
    return JSON.parse(JSON.stringify(out));
  }

  // ما يعود للمجيب من نتيجة الاختبار حسب الإعدادات (نفس منطق الخادم)
  function releaseGrade(s, g) {
    const q = (s.settings && s.settings.quiz) || {};
    if (!g || q.release === "later") return null;
    return { earned: g.earned, total: g.total, items: g.items.map((x) => ({
      id: x.id, title: x.title, ok: x.ok, points: q.showPoints !== false ? x.points : null, earned: q.showPoints !== false ? x.earned : null,
      key: q.showCorrect !== false ? x.key : "", fb: x.fb, show: q.showMissed !== false
    })) };
  }

  window.GApi = { configured, call: (p) => (configured ? remote(p) : mock(p)) };
})();
