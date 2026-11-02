/* منصة أسئلة مسار — صفحة المشاركين
   لا تحفظ هذه الصفحة أي شيء عن المشارك: لا مسودات ولا معرفات ولا تتبع. */
(function () {
  "use strict";
  const K = GherasKit, A = MasarAPI, $ = K.$, $$ = K.$$;
  const C = A.C, MAXQ = C.MAX_QUESTION || 600, RECENT_MS = (C.RECENT_HOURS || 24) * 3600e3;
  const PAGE = 20;

  const state = { items: null, loadedAt: 0, tab: null, shown: PAGE, lastSent: 0 };

  // ——— التنقل بين الشاشات (عبر # في الرابط حتى يعمل زر الرجوع في الجوال) ———
  const SCREENS = { "": "screenHome", ask: "screenAsk", questions: "screenList", sent: "screenSent" };
  const TITLES = { ask: "اكتب سؤالك", questions: "أسئلة المشاركين" };
  function show(id) {
    Object.values(SCREENS).forEach((s) => ($("#" + s).hidden = s !== id));
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
    if (h === "questions") { $("#progressFill").style.width = "100%"; loadList(); }
    if (h === "") preloadCount();
  }
  window.addEventListener("hashchange", route);
  $("#backBtn").addEventListener("click", () => { location.hash = ""; });
  $("#againBtn").addEventListener("click", () => { location.hash = "ask"; });
  $("#toListBtn").addEventListener("click", () => { location.hash = "questions"; });

  // ——— اكتب سؤالك ———
  const q = $("#question"), counter = $("#counter"), msg = $("#askMsg");
  function updateCounter() {
    const n = q.value.trim().length;
    counter.textContent = A.toAr(n) + " / " + A.toAr(MAXQ);
    counter.classList.toggle("over", n > MAXQ);
  }
  MasarFX.peek.bind(q, $("#peek"));
  q.addEventListener("input", () => { updateCounter(); q.classList.remove("bad"); msg.textContent = ""; });
  updateCounter();

  $("#askForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = q.value.trim();
    if (text.length < 5) { msg.textContent = "اكتب سؤالك أولا"; q.classList.add("bad"); q.focus(); return; }
    if (text.length > MAXQ) { msg.textContent = "السؤال أطول من الحد المسموح"; q.classList.add("bad"); q.focus(); return; }
    if (Date.now() - state.lastSent < 20000) { K.toast("انتظر قليلا قبل إرسال سؤال آخر"); return; }
    const btn = $("#sendBtn");
    btn.disabled = true;
    MasarFX.plane.start("جار إرسال سؤالك…");
    MasarFX.plane.creep(5, 88);
    let r;
    try { r = await A.call("ask", { question: text, website: $("#website").value }); }
    catch (err) { r = { ok: false, error: "تعذر الإرسال، تأكد من الاتصال وحاول مرة أخرى" }; }
    if (r && r.ok) {
      await MasarFX.plane.finish("وصل سؤالك");
      q.value = ""; updateCounter();
      state.lastSent = Date.now();
      location.hash = "sent";
      await MasarFX.plane.hide();
    } else {
      await MasarFX.plane.hide();
      msg.textContent = (r && r.error) || "تعذر الإرسال، حاول مرة أخرى";
    }
    btn.disabled = false;
  });

  // ——— أسئلة المشاركين ———
  async function fetchItems(force) {
    if (!force && state.items && Date.now() - state.loadedAt < 60000) return state.items;
    const r = await A.call("published");
    if (!r || !r.ok) throw new Error((r && r.error) || "load");
    state.items = (r.items || []).filter((i) => i.q && i.a);
    state.loadedAt = Date.now();
    return state.items;
  }
  const isRecent = (i) => Date.now() - new Date(i.at).getTime() < RECENT_MS;

  async function preloadCount() {
    try {
      const items = await fetchItems();
      const n = items.filter(isRecent).length;
      $("#tileCount").textContent = n ? "إجابات جديدة خلال ٢٤ ساعة: " + A.toAr(n) : "";
    } catch (e) { /* العد اختياري */ }
  }

  async function loadList() {
    const host = $("#listHost");
    if (!state.items) host.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    try { await fetchItems(); }
    catch (e) {
      host.innerHTML = empty("تعذر تحميل الأسئلة", "تأكد من الاتصال ثم حاول مرة أخرى", '<button class="btn btn-primary" type="button" id="retryBtn">إعادة المحاولة</button>');
      $("#retryBtn").addEventListener("click", () => { state.items = null; loadList(); });
      return;
    }
    const recent = state.items.filter(isRecent).length;
    $("#cRecent").textContent = A.toAr(recent);
    $("#cAll").textContent = A.toAr(state.items.length);
    $("#totalNum").textContent = A.toAr(state.items.length);
    if (!state.tab) state.tab = recent ? "recent" : "all";
    setTab(state.tab);
  }

  function setTab(t) {
    state.tab = t; state.shown = PAGE;
    $$(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === t ? "true" : "false"));
    render();
  }
  $$(".tab").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $("#search").addEventListener("input", () => { state.shown = PAGE; render(); });
  $("#moreBtn").addEventListener("click", () => { state.shown += PAGE; render(); });

  const norm = (s) => String(s).toLowerCase().replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه");
  function highlight(text, term) {
    const safe = A.esc(text);
    if (!term) return safe;
    // تظليل بسيط لمطابقة حرفية (بعد الهروب)
    const t = A.esc(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    try { return safe.replace(new RegExp(t, "gi"), (m) => "<mark>" + m + "</mark>"); } catch (e) { return safe; }
  }

  function render() {
    const host = $("#listHost");
    if (!state.items) return;
    const term = $("#search").value.trim();
    let list = state.tab === "recent" ? state.items.filter(isRecent) : state.items.slice();
    if (term) { const n = norm(term); list = list.filter((i) => norm(i.q + " " + i.a).includes(n)); }
    $("#listLead").textContent = state.tab === "recent" ? "أسئلة أجيب عنها خلال آخر ٢٤ ساعة" : "كل الأسئلة التي أجابت عنها إدارة البرنامج";
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
          <p class="qa-a-label"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>رد إدارة البرنامج</p>
          <p>${highlight(i.a, term)}</p>
        </div>
      </article>`).join("");
    $("#moreWrap").hidden = list.length <= state.shown;
  }

  function empty(title, sub, extra = "") {
    return `<div class="empty"><svg viewBox="0 0 110 80" aria-hidden="true"><path class="e2" d="M20 30h40a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H30l-12 9v-9.6A12 12 0 0 1 8 54V42a12 12 0 0 1 12-12Z"/><path class="e1" d="M52 6h36a12 12 0 0 1 12 12v10a12 12 0 0 1-12 12h-2l5 9-12-9H52a12 12 0 0 1-12-12V18A12 12 0 0 1 52 6Z"/></svg><strong>${title}</strong><span>${sub}</span>${extra ? '<div style="margin-top:14px">' + extra + "</div>" : ""}</div>`;
  }

  // ——— البدء ———
  MasarFX.theme.init();
  if (A.PREVIEW) console.info("منصة مسار: وضع المعاينة (لا يوجد رابط Apps Script)");
  route();
})();
