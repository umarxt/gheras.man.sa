/* منصة أسئلة مسار — صفحة المشاركين
   لا تحفظ هذه الصفحة أي شيء عن المشارك. الشيء الوحيد المحفوظ في جهازه رموز المتابعة لأسئلته،
   وهي عشوائية ولا تدل عليه، ويستطيع إزالتها من «أسئلتي». */
(function () {
  "use strict";
  const K = GherasKit, A = MasarAPI, $ = K.$, $$ = K.$$;
  const C = A.C, MAXQ = C.MAX_QUESTION || 600, RECENT_MS = (C.RECENT_HOURS || 24) * 3600e3;
  const PAGE = 20;

  const state = { items: null, loadedAt: 0, mine: null, mineAt: 0, tab: null, shown: PAGE, lastSent: 0, lastTicket: "" };

  // ——— رموز المتابعة في هذا الجهاز ———
  const TKEY = "masar-tickets", SEEN = "masar-seen";
  const readJSON = (k, d) => { const v = K.storage((ls) => ls.getItem(k)); try { return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  const tickets = {
    all() { return readJSON(TKEY, []).filter((t) => /^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(t)); },
    add(t) { const l = this.all().filter((x) => x !== t); l.unshift(t); K.storage((ls) => ls.setItem(TKEY, JSON.stringify(l.slice(0, 50)))); },
    remove(t) { K.storage((ls) => ls.setItem(TKEY, JSON.stringify(this.all().filter((x) => x !== t)))); }
  };
  const fmtTicket = (v) => { const t = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); return t.length === 8 ? t.slice(0, 4) + "-" + t.slice(4) : ""; };
  const replyKey = (i) => i.ticket + "|" + i.at;
  const seen = {
    all() { return new Set(readJSON(SEEN, [])); },
    mark(items) { const s = this.all(); items.forEach((i) => i.a && s.add(replyKey(i))); K.storage((ls) => ls.setItem(SEEN, JSON.stringify([...s].slice(-200)))); }
  };
  const unseen = (items) => { const s = seen.all(); return items.filter((i) => i.a && !s.has(replyKey(i))); };

  // ——— التنقل بين الشاشات (عبر # في الرابط حتى يعمل زر الرجوع في الجوال) ———
  const SCREENS = { "": "screenHome", ask: "screenAsk", questions: "screenList", mine: "screenList", sent: "screenSent" };
  const TITLES = { ask: "اكتب سؤالك", questions: "أسئلة المشاركين", mine: "أسئلتي" };
  function show(id) {
    ["screenHome", "screenAsk", "screenList", "screenSent"].forEach((s) => ($("#" + s).hidden = s !== id));
    const stageScreen = id === "screenHome" || id === "screenSent";
    $("#topbar").hidden = stageScreen;
    document.body.classList.toggle("stage-mode", stageScreen);
    window.scrollTo(0, 0);
    stageScreen ? K.stage.start($("#" + id)) : K.stage.stop();
  }
  function route() {
    let h = location.hash.replace("#", "");
    if (h === "sent" && !state.lastSent) h = "";
    if (!(h in SCREENS)) h = "";
    $("#topbarTitle").textContent = TITLES[h] || "";
    show(SCREENS[h]);
    if (h === "ask") { $("#progressFill").style.width = "50%"; setTimeout(() => $("#question").focus({ preventScroll: true }), 350); }
    if (h === "questions" || h === "mine") { $("#progressFill").style.width = "100%"; state.tab = h === "mine" ? "mine" : null; loadList(); }
    if (h === "") preloadCount();
  }
  window.addEventListener("hashchange", route);
  $("#backBtn").addEventListener("click", () => { location.hash = ""; });
  $("#againBtn").addEventListener("click", () => { location.hash = "ask"; });
  $("#toMineBtn").addEventListener("click", () => { location.hash = "mine"; });

  // ——— اكتب سؤالك ———
  const q = $("#question"), counter = $("#counter"), msg = $("#askMsg");
  function updateCounter() {
    const n = q.value.trim().length;
    counter.textContent = A.toAr(n) + " / " + A.toAr(MAXQ);
    counter.classList.toggle("over", n > MAXQ);
  }
  MasarFX.peek.bind(q, $("#peek"));
  K.bindChoices($("#askForm"));
  q.addEventListener("input", () => { updateCounter(); q.classList.remove("bad"); msg.textContent = ""; });
  $("#visBox").addEventListener("change", () => { $("#visBox").classList.remove("bad"); msg.textContent = ""; });
  updateCounter();
  const visibility = () => ($('input[name="visibility"]:checked') || {}).value || "";

  $("#askForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = q.value.trim(), vis = visibility();
    if (text.length < 5) { msg.textContent = "اكتب سؤالك أولا"; q.classList.add("bad"); q.focus(); return; }
    if (text.length > MAXQ) { msg.textContent = "السؤال أطول من الحد المسموح"; q.classList.add("bad"); q.focus(); return; }
    if (!vis) { msg.textContent = "اختر هل سؤالك عام أو خاص"; $("#visBox").classList.add("bad"); $("#visBox").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (Date.now() - state.lastSent < 20000) { K.toast("انتظر قليلا قبل إرسال سؤال آخر"); return; }
    const btn = $("#sendBtn");
    btn.disabled = true;
    MasarFX.plane.start("جار إرسال سؤالك…");
    MasarFX.plane.creep(5, 88);
    let r;
    try { r = await A.call("ask", { question: text, visibility: vis, website: $("#website").value }); }
    catch (err) { r = { ok: false, error: "تعذر الإرسال، تأكد من الاتصال وحاول مرة أخرى" }; }
    if (r && r.ok) {
      const t = fmtTicket(r.ticket);
      if (t) { tickets.add(t); state.mine = null; }
      showSent(t, vis);
      await MasarFX.plane.finish("وصل سؤالك");
      q.value = ""; updateCounter(); q.dispatchEvent(new Event("input"));
      $$('input[name="visibility"]').forEach((i) => { i.checked = false; i.closest("label").classList.remove("checked"); });
      state.lastSent = Date.now();
      location.hash = "sent";
      await MasarFX.plane.hide();
    } else {
      await MasarFX.plane.hide();
      msg.textContent = (r && r.error) || "تعذر الإرسال، حاول مرة أخرى";
    }
    btn.disabled = false;
  });

  function showSent(t, vis) {
    state.lastTicket = t;
    $("#ticketCard").hidden = !t;
    $("#ticketCode").textContent = t;
    $("#sentSub").textContent = vis === "خاص"
      ? "وصل سؤالك الخاص إلى مشرفي البرنامج، والرد يوصلك أنت وحدك في «أسئلتي». لم يحفظ أي شيء يدل عليك."
      : "وصل سؤالك إلى مشرفي البرنامج. إذا وافق المشرف ينشر مع رده في «أسئلة المشاركين»، وتشوف الرد أيضا في «أسئلتي». لم يحفظ أي شيء يدل عليك.";
  }
  $("#copyTicket").addEventListener("click", async () => {
    const t = state.lastTicket;
    try { await navigator.clipboard.writeText(t); K.toast("نُسخ رمز المتابعة"); }
    catch (e) { const r = document.createRange(); r.selectNodeContents($("#ticketCode")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); K.toast("الرمز محدد، انسخه"); }
  });

  // ——— البيانات ———
  async function fetchItems(force) {
    if (!force && state.items && Date.now() - state.loadedAt < 60000) return state.items;
    const r = await A.call("published");
    if (!r || !r.ok) throw new Error((r && r.error) || "load");
    state.items = (r.items || []).filter((i) => i.q && i.a);
    state.loadedAt = Date.now();
    return state.items;
  }
  async function fetchMine(force) {
    const list = tickets.all();
    if (!list.length) { state.mine = []; return state.mine; }
    if (!force && state.mine && Date.now() - state.mineAt < 30000) return state.mine;
    const r = await A.call("mine", { tickets: list });
    if (!r || !r.ok) throw new Error((r && r.error) || "load");
    const order = new Map(list.map((t, i) => [t, i]));
    state.mine = (r.items || []).sort((a, b) => (order.get(a.ticket) ?? 99) - (order.get(b.ticket) ?? 99));
    state.mineAt = Date.now();
    return state.mine;
  }
  const isRecent = (i) => Date.now() - new Date(i.at).getTime() < RECENT_MS;

  // الصفحة الرئيسية: عدد الجديد، وإشعار إذا وصل رد على سؤال من أسئلتي
  async function preloadCount() {
    const parts = [];
    try { const n = (await fetchItems()).filter(isRecent).length; if (n) parts.push("إجابات جديدة خلال ٢٤ ساعة: " + A.toAr(n)); } catch (e) {}
    try {
      const fresh = unseen(await fetchMine());
      if (fresh.length) {
        const n = fresh.length;
        const what = n === 1 ? "وصلك رد على سؤالك" : n === 2 ? "وصلك ردان على أسئلتك" : "وصلك " + A.toAr(n) + (n <= 10 ? " ردود" : " ردا") + " على أسئلتك";
        parts.unshift(what);
        MasarFX.notify(what + "، افتح «أسئلتي»");
      }
    } catch (e) {}
    $("#tileCount").textContent = parts.join(" · ");
  }

  async function loadList() {
    const host = $("#listHost");
    host.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try { await Promise.all([fetchItems(), fetchMine().catch(() => { state.mine = state.mine || []; })]); }
    catch (e) {
      host.innerHTML = empty("تعذر تحميل الأسئلة", "تأكد من الاتصال ثم حاول مرة أخرى", '<button class="btn btn-primary" type="button" id="retryBtn">إعادة المحاولة</button>');
      $("#retryBtn").addEventListener("click", () => { state.items = null; loadList(); });
      return;
    }
    const recent = state.items.filter(isRecent).length;
    $("#cRecent").textContent = A.toAr(recent);
    $("#cAll").textContent = A.toAr(state.items.length);
    updateMineCount();
    if (!state.tab) state.tab = unseen(state.mine).length ? "mine" : recent ? "recent" : "all";
    setTab(state.tab);
  }
  function updateMineCount() {
    const n = unseen(state.mine || []).length;
    $("#cMine").textContent = A.toAr((state.mine || []).length);
    $("#cMine").classList.toggle("hot", n > 0);
  }

  function setTab(t) {
    state.tab = t; state.shown = PAGE;
    $$(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
    const mine = t === "mine";
    $("#searchBox").hidden = mine;
    $("#ticketForm").hidden = !mine;
    $("#topbarTitle").textContent = mine ? "أسئلتي" : "أسئلة المشاركين";
    $("#listEyebrow").textContent = mine ? "أسئلتي" : "أسئلة المشاركين";
    $("#listTitle").textContent = mine ? "أسئلتك وردودها" : "أسئلة وإجابات";
    render();
  }
  $$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#search").addEventListener("input", () => { state.shown = PAGE; render(); });
  $("#moreBtn").addEventListener("click", () => { state.shown += PAGE; render(); });

  const norm = (s) => String(s).toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  function highlight(text, term) {
    const safe = A.esc(text);
    if (!term) return safe;
    const t = A.esc(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { return safe.replace(new RegExp(t, "gi"), (m) => "<mark>" + m + "</mark>"); } catch (e) { return safe; }
  }
  const ICON_REPLY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>';
  const byLabel = (by) => by ? "رد " + A.esc(by) : "رد مشرفي البرنامج";

  function render() {
    if (state.tab === "mine") return renderMine();
    const host = $("#listHost");
    if (!state.items) return;
    const term = $("#search").value.trim();
    let list = state.tab === "recent" ? state.items.filter(isRecent) : state.items.slice();
    if (term) { const n = norm(term); list = list.filter((i) => norm(i.q + " " + i.a + " " + (i.by || "")).includes(n)); }
    $("#listLead").textContent = state.tab === "recent" ? "أسئلة عامة أجيب عنها خلال آخر ٢٤ ساعة" : "كل الأسئلة العامة التي أجاب عنها مشرفو البرنامج";
    $("#totalNum").textContent = A.toAr(state.items.length);
    if (!list.length) {
      host.innerHTML = term
        ? empty("لا نتائج", "جرب كلمة أخرى، أو ابحث في «كل الأسئلة المجابة»")
        : state.tab === "recent"
          ? empty("لا توجد إجابات جديدة خلال ٢٤ ساعة", "تصفح الأسئلة السابقة في الأرشيف", '<button class="btn btn-primary" type="button" id="goAll">كل الأسئلة المجابة</button>')
          : empty("لا توجد أسئلة مجابة بعد", "كن أول من يسأل", '<a class="btn btn-primary" href="#ask" style="text-decoration:none">اكتب سؤالك</a>');
      const g = $("#goAll"); if (g) g.addEventListener("click", () => setTab("all"));
      $("#moreWrap").hidden = true;
      return;
    }
    host.innerHTML = list.slice(0, state.shown).map((i, n) => `
      <article class="qa" style="animation-delay:${Math.min(n, 8) * 40}ms">
        <p class="qa-meta">${isRecent(i) ? '<span class="chip new">جديد</span>' : ""}<span>أجيب ${A.esc(A.ago(i.at))}</span></p>
        <p class="qa-q">${highlight(i.q, term)}</p>
        <div class="qa-a">
          <p class="qa-a-label">${ICON_REPLY}${byLabel(i.by)}</p>
          <p>${highlight(i.a, term)}</p>
        </div>
      </article>`).join("");
    $("#moreWrap").hidden = list.length <= state.shown;
  }

  // ——— أسئلتي ———
  const STATE_CHIP = {
    waiting: '<span class="chip">بانتظار الرد</span>',
    private: '<span class="chip new">وصلك رد خاص</span>',
    public: '<span class="chip new">نُشر مع الرد للجميع</span>',
    closed: '<span class="chip muted">أُغلق دون رد</span>'
  };
  function renderMine() {
    const host = $("#listHost");
    const items = state.mine || [];
    $("#listLead").textContent = "أسئلتك من هذا الجهاز، وما وصلك عليها من ردود. لا يراها غيرك.";
    $("#totalNum").textContent = A.toAr(items.length);
    $("#moreWrap").hidden = true;
    const fresh = new Set(unseen(items).map(replyKey));
    const known = tickets.all();
    const missing = known.filter((t) => !items.some((i) => i.ticket === t));
    if (!items.length) {
      host.innerHTML = empty(known.length ? "ما وجدنا أسئلة بهذه الرموز" : "ما أرسلت أسئلة من هذا الجهاز",
        known.length ? "تأكد من رمز المتابعة، أو اكتب سؤالا جديدا" : "اكتب سؤالك، وتشوف رده هنا",
        '<a class="btn btn-primary" href="#ask" style="text-decoration:none">اكتب سؤالك</a>');
      return;
    }
    host.innerHTML = items.map((i, n) => `
      <article class="qa mine${fresh.has(replyKey(i)) ? " fresh" : ""}" style="animation-delay:${Math.min(n, 8) * 40}ms">
        <p class="qa-meta">${STATE_CHIP[i.state] || ""}<span class="chip ${i.type === "خاص" ? "lock" : "blue"}">${i.type === "خاص" ? "سؤال خاص" : "سؤال عام"}</span><span>أرسلته ${A.esc(A.ago(i.created))}</span></p>
        <p class="qa-q">${A.esc(i.q)}</p>
        ${i.a ? `<div class="qa-a${i.state === "private" ? " private" : ""}">
          <p class="qa-a-label">${ICON_REPLY}${byLabel(i.by)}${i.state === "private" ? ' <span class="lock-note">· لك وحدك</span>' : ""}<span class="qa-a-time">${A.esc(A.ago(i.at))}</span></p>
          <p>${A.esc(i.a)}</p>
        </div>` : ""}
        <div class="mine-foot"><span>رمز المتابعة <bdi dir="ltr">${A.esc(i.ticket)}</bdi></span><button class="link-btn" type="button" data-forget="${A.esc(i.ticket)}">إزالة من هذا الجهاز</button></div>
      </article>`).join("") + (missing.length ? `<p class="hint mine-missing">رموز لم نجد لها أسئلة: <bdi dir="ltr">${missing.map(A.esc).join("، ")}</bdi></p>` : "");
    seen.mark(items);
    setTimeout(updateMineCount, 1500);
  }
  $("#listHost").addEventListener("click", (e) => {
    const b = e.target.closest("[data-forget]");
    if (!b) return;
    tickets.remove(b.dataset.forget);
    state.mine = (state.mine || []).filter((i) => i.ticket !== b.dataset.forget);
    updateMineCount(); renderMine();
    K.toast("أُزيل السؤال من هذا الجهاز");
  });
  $("#ticketForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const t = fmtTicket($("#ticketInput").value), m = $("#ticketMsg");
    if (!t) { m.textContent = "رمز المتابعة ٨ حروف وأرقام، مثل ABCD-EFGH"; return; }
    m.textContent = "";
    tickets.add(t);
    $("#ticketInput").value = "";
    try { await fetchMine(true); } catch (err) { m.textContent = "تعذر التحميل، حاول مرة أخرى"; }
    updateMineCount(); renderMine();
    if ((state.mine || []).some((i) => i.ticket === t)) MasarFX.notify("أُضيف سؤالك إلى «أسئلتي»");
    else m.textContent = "ما وجدنا سؤالا بهذا الرمز. تأكد منه";
  });

  function empty(title, sub, extra = "") {
    return `<div class="empty"><svg viewBox="0 0 110 80" aria-hidden="true"><path class="e2" d="M20 30h40a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H30l-12 9v-9.6A12 12 0 0 1 8 54V42a12 12 0 0 1 12-12Z"/><path class="e1" d="M52 6h36a12 12 0 0 1 12 12v10a12 12 0 0 1-12 12h-2l5 9-12-9H52a12 12 0 0 1-12-12V18A12 12 0 0 1 52 6Z"/></svg><strong>${title}</strong><span>${sub}</span>${extra ? '<div style="margin-top:14px">' + extra + "</div>" : ""}</div>`;
  }

  // ——— البدء ———
  MasarFX.theme.init();
  if (A.PREVIEW) console.info("منصة مسار: وضع المعاينة (لا يوجد رابط Apps Script)");
  route();
})();
