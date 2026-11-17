/* الاتصال بـ Google Apps Script — مشترك بين صفحة المشاركين ولوحة المشرفين
   الطلب لا يحمل أي معرف للمرسل: بلا ملفات تعريف (credentials: "omit") وبلا ترويسات وبلا تتبع. */
(function () {
  "use strict";
  const C = window.MASAR_CONFIG || {};
  const PREVIEW = !C.APPS_SCRIPT_URL;

  async function call(action, data = {}) {
    if (PREVIEW) return mock(action, data);
    const res = await fetch(C.APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify(Object.assign({ action }, data)), // نص بلا ترويسات = بلا طلب CORS مسبق
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      redirect: "follow"
    });
    if (!res.ok) throw new Error("http " + res.status);
    return res.json();
  }

  // ——— وضع المعاينة: يحاكي السكربت في هذا المتصفح فقط ———
  const KEY = "masar-preview-db-v2";
  const SUPS = { "1198": "أ. محمد", "1996": "أ. خالد" };
  const ABC = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const normT = (t) => String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const fmtT = (t) => { t = normT(t); return t.slice(0, 4) + "-" + t.slice(4, 8); };
  function db() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!d) {
      const h = 3600e3, now = Date.now(), iso = (ms) => new Date(now - ms).toISOString();
      d = { items: [
        { id: "p1", q: "متى تبدأ الدورة القادمة في البرنامج؟ وهل يمكن التسجيل لمن فاتته الدورة الأولى؟", type: "عام", status: "منشور", created: iso(9 * h), a: "تبدأ الدورة القادمة بداية الشهر القادم بإذن الله، والتسجيل متاح للجميع بمن فيهم من فاتته الدورة الأولى. سيصلكم رابط التسجيل عبر المشرفين.", by: "أ. محمد", at: iso(3 * h), t: "" },
        { id: "p2", q: "هل الأنشطة الميدانية إلزامية لكل المشاركين؟", type: "عام", status: "منشور", created: iso(30 * h), a: "الأنشطة الميدانية جزء أساسي من البرنامج، ومن عنده عذر يتواصل مع مشرفه لترتيب بديل مناسب.", by: "أ. خالد", at: iso(20 * h), t: "" },
        { id: "p3", q: "كيف أعرف مستواي في البرنامج؟", type: "عام", status: "منشور", created: iso(80 * h), a: "يرسل لكل مشارك تقرير مختصر بعد كل مرحلة، ويمكنك سؤال مشرفك في أي وقت.", by: "أ. محمد", at: iso(70 * h), t: "" },
        { id: "p4", q: "هل يمكن أن نقترح موضوعات للقاءات القادمة؟", type: "عام", status: "جديد", created: iso(5 * h), a: "", by: "", at: "", t: "" },
        { id: "p5", q: "عندي ظرف عائلي هالأسبوع وما أقدر أحضر اللقاء، وش أسوي؟", type: "خاص", status: "جديد", created: iso(1 * h), a: "", by: "", at: "", t: "" },
        { id: "p6", q: "أحس أني متأخر عن زملائي في المهام، هل هذا طبيعي؟", type: "خاص", status: "رد خاص", created: iso(26 * h), a: "طبيعي جدا، وكل مشارك يمشي بسرعته. خصص نصف ساعة يوميا للمهام المتأخرة، وإذا احتجت مساعدة اكتب لنا هنا.", by: "أ. خالد", at: iso(22 * h), t: "" }
      ] };
      save(d);
    }
    return d;
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  async function mock(action, x) {
    await new Promise((r) => setTimeout(r, 450));
    const d = db(), find = (id) => d.items.find((i) => i.id === id);
    const now = () => new Date().toISOString();
    switch (action) {
      case "ask": {
        const type = x.visibility === "خاص" ? "خاص" : x.visibility === "عام" ? "عام" : "";
        if (!type) return { ok: false, error: "اختر هل سؤالك عام أو خاص" };
        let t = ""; for (let k = 0; k < 8; k++) t += ABC[Math.floor(Math.random() * ABC.length)];
        d.items.push({ id: Math.random().toString(36).slice(2, 10), q: String(x.question).trim(), type, status: "جديد", created: now(), a: "", by: "", at: "", t });
        save(d); return { ok: true, ticket: fmtT(t) };
      }
      case "published":
        return { ok: true, items: d.items.filter((i) => i.status === "منشور").sort((a, b) => b.at.localeCompare(a.at)).map((i) => ({ id: i.id, q: i.q, a: i.a, by: i.by, at: i.at })) };
      case "mine": {
        const want = new Set((x.tickets || []).map(normT));
        return { ok: true, items: d.items.filter((i) => i.t && want.has(i.t)).map((i) => {
          const done = i.status === "منشور" || i.status === "رد خاص";
          return { ticket: fmtT(i.t), q: i.q, type: i.type, created: i.created,
            state: i.status === "منشور" ? "public" : i.status === "رد خاص" ? "private" : i.status === "محذوف" ? "closed" : "waiting",
            a: done ? i.a : "", by: done ? i.by : "", at: done ? i.at : "" };
        }) };
      }
    }
    const name = SUPS[String(x.code || "").trim()];
    if (!name) return { ok: false, error: "رمز الدخول غير صحيح" };
    switch (action) {
      case "login": return { ok: true, name };
      case "list": return { ok: true, name,
        fresh: d.items.filter((i) => i.status === "جديد").sort((a, b) => a.created.localeCompare(b.created)).map((i) => ({ id: i.id, q: i.q, type: i.type, created: i.created, draft: i.a })),
        done: d.items.filter((i) => i.status === "منشور" || i.status === "رد خاص").sort((a, b) => b.at.localeCompare(a.at))
          .map((i) => ({ id: i.id, q: i.q, type: i.type, status: i.status === "منشور" ? "public" : "private", a: i.a, by: i.by, at: i.at })) };
      case "reply": {
        const i = find(x.id); if (!i || i.status !== "جديد") return { ok: false, error: "تغيرت حالة السؤال، ربما رد عليه مشرف آخر. حدّث الصفحة" };
        const mode = x.mode === "public" ? "public" : "private";
        if (mode === "public" && i.type !== "عام") return { ok: false, error: "هذا السؤال خاص، ولا يمكن نشره" };
        if (mode === "public" && x.question && x.question.trim() !== i.q) { i.orig = i.q; i.q = x.question.trim(); }
        Object.assign(i, { a: String(x.answer).trim(), by: name, at: now(), status: mode === "public" ? "منشور" : "رد خاص" });
        save(d); return { ok: true };
      }
      case "delete": {
        const i = find(x.id); if (!i || i.status !== "جديد") return { ok: false, error: "تغيرت حالة السؤال، حدّث الصفحة" };
        i.status = "محذوف"; save(d); return { ok: true };
      }
      case "unpublish": {
        const i = find(x.id); if (!i || i.status !== "منشور") return { ok: false, error: "تغيرت حالة السؤال، حدّث الصفحة" };
        if (i.orig) { i.q = i.orig; i.orig = ""; }
        Object.assign(i, { status: "جديد", by: "", at: "" });
        save(d); return { ok: true, q: i.q };
      }
    }
    return { ok: false, error: "طلب غير معروف" };
  }

  // ——— أدوات العرض ———
  const toAr = (v) => String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function ago(iso) {
    const t = new Date(iso).getTime();
    if (!t) return "";
    const m = Math.max(0, Math.round((Date.now() - t) / 60000));
    if (m < 1) return "الآن";
    const unit = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? toAr(n) + " " + few : toAr(n) + " " + many);
    if (m < 60) return "قبل " + unit(m, "دقيقة", "دقيقتين", "دقائق", "دقيقة");
    const h = Math.floor(m / 60);
    if (h < 24) return "قبل " + unit(h, "ساعة", "ساعتين", "ساعات", "ساعة");
    const dd = Math.floor(h / 24);
    if (dd < 7) return "قبل " + unit(dd, "يوم", "يومين", "أيام", "يوما");
    return dateAr(iso);
  }
  function dateAr(iso) {
    try { return new Date(iso).toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { day: "numeric", month: "long", year: "numeric" }); }
    catch (e) { return toAr(String(iso).slice(0, 10)); }
  }
  // عرض العد بالعربية: «٣ أسئلة»
  function countQ(n) {
    if (n === 0) return "لا توجد أسئلة";
    if (n === 1) return "سؤال واحد";
    if (n === 2) return "سؤالان";
    return toAr(n) + (n <= 10 ? " أسئلة" : " سؤالا");
  }

  window.MasarAPI = { call, PREVIEW, C, toAr, esc, ago, dateAr, countQ };
})();
