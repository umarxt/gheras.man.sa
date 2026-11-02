/* الاتصال بـ Google Apps Script — مشترك بين صفحة المشاركين وصفحة الإدارة
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
  const KEY = "masar-preview-db";
  const ROLES = { "1111": "supervisor", "2222": "responder" };
  function db() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!d) {
      const h = 3600e3, now = Date.now(), iso = (ms) => new Date(now - ms).toISOString();
      d = { items: [
        { id: "p1", q: "متى تبدأ الدورة القادمة في البرنامج؟ وهل يمكن التسجيل لمن فاتته الدورة الأولى؟", status: "منشور", created: iso(9 * h), approved: iso(8 * h), a: "تبدأ الدورة القادمة بداية الشهر القادم بإذن الله، والتسجيل متاح للجميع بمن فيهم من فاتته الدورة الأولى. سيصلكم رابط التسجيل عبر المشرفين.", published: iso(3 * h) },
        { id: "p2", q: "هل الأنشطة الميدانية إلزامية لكل المشاركين؟", status: "منشور", created: iso(30 * h), approved: iso(28 * h), a: "الأنشطة الميدانية جزء أساسي من البرنامج، ومن عنده عذر يتواصل مع مشرفه لترتيب بديل مناسب.", published: iso(20 * h) },
        { id: "p3", q: "كيف أعرف مستواي في البرنامج؟", status: "منشور", created: iso(80 * h), approved: iso(75 * h), a: "يرسل لكل مشارك تقرير مختصر بعد كل مرحلة، ويمكنك سؤال مشرفك في أي وقت.", published: iso(70 * h) },
        { id: "p4", q: "هل يمكن أن نقترح موضوعات للقاءات القادمة؟", status: "معتمد", created: iso(5 * h), approved: iso(2 * h), a: "", published: "" },
        { id: "p5", q: "أحس أن وقت اللقاء قصير، هل يمكن تمديده نصف ساعة؟", status: "جديد", created: iso(1 * h), approved: "", a: "", published: "" }
      ] };
      save(d);
    }
    return d;
  }
  function save(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  async function mock(action, x) {
    await new Promise((r) => setTimeout(r, 450));
    const d = db(), find = (id) => d.items.find((i) => i.id === id);
    const role = ROLES[String(x.code || "").trim()];
    const pub = (i) => ({ id: i.id, q: i.q, a: i.a, at: i.published });
    const adm = (i) => ({ id: i.id, q: i.q, status: i.status, created: i.created, approved: i.approved });
    switch (action) {
      case "ask":
        d.items.push({ id: Math.random().toString(36).slice(2, 10), q: String(x.question).trim(), status: "جديد", created: new Date().toISOString(), approved: "", a: "", published: "" });
        save(d); return { ok: true };
      case "published":
        return { ok: true, items: d.items.filter((i) => i.status === "منشور").sort((a, b) => b.published.localeCompare(a.published)).map(pub) };
    }
    if (!role) return { ok: false, error: "رمز الدخول غير صحيح" };
    switch (action) {
      case "login": return { ok: true, role };
      case "list": return { ok: true, role,
        fresh: role === "supervisor" ? d.items.filter((i) => i.status === "جديد").sort((a, b) => a.created.localeCompare(b.created)).map(adm) : [],
        approved: d.items.filter((i) => i.status === "معتمد").sort((a, b) => a.approved.localeCompare(b.approved)).map(adm) };
      case "approve": case "delete": {
        if (role !== "supervisor") return { ok: false, error: "هذا الإجراء للمدير المعتمد فقط" };
        const i = find(x.id); if (!i || i.status !== "جديد") return { ok: false, error: "السؤال غير موجود أو تغيرت حالته" };
        if (action === "approve") { if (x.question) i.q = String(x.question).trim(); i.status = "معتمد"; i.approved = new Date().toISOString(); }
        else i.status = "محذوف";
        save(d); return { ok: true };
      }
      case "answer": {
        const i = find(x.id); if (!i || i.status !== "معتمد") return { ok: false, error: "السؤال غير موجود أو تغيرت حالته" };
        i.a = String(x.answer).trim(); i.status = "منشور"; i.published = new Date().toISOString();
        save(d); return { ok: true };
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
