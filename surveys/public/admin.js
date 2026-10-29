/* منصة الاستبانات — صفحة الإدارة
   الدخول برمز شخصي، ثم: قائمة الاستبانات والقوالب، ومحرر الأسئلة والأقسام، والإعدادات، والردود، والمشاركة.
   الحفظ تلقائي إلى Google Apps Script (أو قاعدة التجربة في المتصفح). */
(function () {
  "use strict";
  const S = window.GSchema, U = window.GUI, K = window.GherasKit, API = window.GApi;
  const { $, $$ } = K;
  const { esc, toAr, icon } = U;
  const TYPES = S.TYPES;
  const TOKEN_KEY = "gheras-surveys-token";

  let token = "", user = null, users = [];
  let surveys = [], filter = "all", query = "";
  let cur = null;          // { survey, count, sheetUrl, base }
  let tab = "questions", activeId = null, keyMode = null;
  const ui = { desc: new Set(), val: new Set() }; // إظهار الوصف والتحقق لكل سؤال
  let dirty = false, saving = false, saveTimer = null, retryTimer = null;
  let resp = null, respView = "summary", respIdx = 0, respQ = "";
  let lastDeleted = null;

  // ——— أدوات ———
  function toast(msg, ms = 2800, act) {
    const t = $("#toast");
    t.innerHTML = esc(msg) + (act ? `<button class="toast-act" type="button">${esc(act.label)}</button>` : "");
    if (act) t.querySelector(".toast-act").onclick = () => { t.classList.remove("show"); act.fn(); };
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), ms);
  }
  async function call(p) {
    let r;
    try { r = await API.call({ ...p, token }); }
    catch (e) { return { ok: false, net: true, error: "تعذر الاتصال، تأكد من الإنترنت وحاول مرة أخرى" }; }
    if (r && r.auth) { logout(true); }
    return r || { ok: false, error: "رد غير متوقع من الخادم" };
  }
  const plural = (n, one, two, few, many) => (n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? few : many);
  const qCount = (n) => toAr(n) + " " + plural(n, "سؤال", "سؤالان", "أسئلة", "سؤالا");
  const rCount = (n) => plural(n, "رد", "ردان", "ردود", "ردا");

  function status(s) {
    const r = s.reason;
    if (!r) return `<span class="chip on"><i class="dot"></i>تستقبل الردود</span>`;
    return { closed: `<span class="chip off"><i class="dot"></i>مغلقة</span>`, notyet: `<span class="chip"><i class="dot"></i>مجدولة</span>`, ended: `<span class="chip off"><i class="dot"></i>انتهت مدتها</span>`, full: `<span class="chip off"><i class="dot"></i>اكتمل العدد</span>` }[r] || "";
  }
  function setSave(text, keep) {
    const el = $("#saveState");
    el.textContent = text;
    el.style.opacity = text ? 1 : 0;
    clearTimeout(el._h);
    if (!keep && text) el._h = setTimeout(() => (el.style.opacity = 0.55), 2200);
  }

  // ——— الشاشات ———
  function show(mode) {
    const app = mode === "app";
    $("#screenGate").hidden = app;
    $("#screenApp").hidden = !app;
    $("#topbar").hidden = !app;
    document.body.classList.toggle("stage-mode", !app);
    document.querySelector('meta[name="theme-color"]').content = app ? getComputedStyle(document.body).backgroundColor : "#0D2142";
    if (app) K.stage.stop(); else K.stage.start($("#screenGate"));
  }
  function logout(expired) {
    token = ""; user = null;
    K.storage((ls) => ls.removeItem(TOKEN_KEY));
    show("gate");
    if (expired) $("#gateMsg").textContent = "انتهت الجلسة، ادخل مرة أخرى";
    setTimeout(() => $("#accessCode").focus({ preventScroll: true }), 200);
  }

  // ——— التوجيه ———
  function route() {
    if (!token) return;
    const m = /^#\/s\/([\w-]+)(?:\/(\w+))?/.exec(location.hash);
    if (m) openSurvey(m[1], m[2] || "questions");
    else { leaveEditor(); renderList(); }
  }
  function go(hash) { if (location.hash === hash) route(); else location.hash = hash; }

  function topActions(html) { $("#topActions").innerHTML = html; }

  // ——— القائمة ———
  async function loadList() {
    const r = await call({ action: "list" });
    if (!r.ok) { if (!r.auth) toast(r.error || "تعذر تحميل الاستبانات"); return false; }
    surveys = r.surveys.sort((a, b) => String(b.updated).localeCompare(String(a.updated)));
    return true;
  }
  async function renderList() {
    document.documentElement.dataset.accent = "navy";
    document.title = "منصة الاستبانات — غراس";
    $("#backBtn").hidden = true;
    $("#topbarTitle").textContent = "منصة الاستبانات";
    setSave("");
    topActions(`<span class="user-chip">${icon("user", 16)} ${esc(user.name)}</span><button class="icon-btn" type="button" data-act="logout" aria-label="خروج" title="خروج">${icon("logout")}</button>`);
    const host = $("#screenApp");
    if (!host.querySelector(".list-view")) host.innerHTML = `<div class="wrap list-view step"><div class="empty">${icon("refresh", 30)}<p>جار التحميل…</p></div></div>`;
    await loadList();
    if (location.hash.startsWith("#/s/")) return;
    const T = window.GSurveyTemplates || [];
    host.innerHTML = `<div class="wrap list-view step">
      <div class="step-hero">
        <div>
          <p class="eyebrow">منصة الاستبانات</p>
          <h1>استبانات غراس</h1>
          <p class="lead">ابن الاستبانة كما تريد، وشارك رابطها، وتصلك الردود في قوقل شيتس مباشرة</p>
        </div>
        <div class="axis-num" aria-hidden="true">${toAr(surveys.length)}</div>
      </div>
      <div class="band" aria-hidden="true"></div>
      <div class="section-label"><h2>قوالب الإدارة الرسمية</h2></div>
      <div class="tpl-row" role="list">${T.filter((t) => t.official).map((t) => `<button class="tpl-card official" type="button" data-tpl="${t.id}" role="listitem">
          <span class="tpl-icon">${icon(t.icon, 24)}</span><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span><span class="chip lock-chip">${icon("lock", 14)} رسمي</span></button>`).join("")}</div>
      <div class="section-label"><h2>ابدأ استبانة جديدة</h2></div>
      <div class="tpl-row" role="list">${T.filter((t) => !t.official).map((t) => `<button class="tpl-card ${t.id === "blank" ? "blank" : ""}" type="button" data-tpl="${t.id}" role="listitem">
          <span class="tpl-icon">${icon(t.icon, 24)}</span><strong>${esc(t.title)}</strong><span>${esc(t.desc)}</span></button>`).join("")}</div>
      <div class="section-label"><h2>الاستبانات</h2></div>
      <div class="toolbar">
        <label class="search">${icon("search")}<input class="input" type="search" id="listSearch" placeholder="ابحث بالعنوان" value="${esc(query)}" aria-label="بحث"></label>
        <div class="seg" role="radiogroup" aria-label="تصفية">${[["all", "الكل"], ["open", "تستقبل الردود"], ["closed", "مغلقة"]].map(([v, l]) => `<label class="${filter === v ? "checked" : ""}"><input type="radio" name="listFilter" value="${v}" ${filter === v ? "checked" : ""}>${l}</label>`).join("")}</div>
      </div>
      <div id="sGrid"></div>
    </div>`;
    renderGrid();
  }
  function renderGrid() {
    const q = query.trim().toLowerCase();
    const list = surveys.filter((s) => (!q || String(s.title).toLowerCase().includes(q)) && (filter === "all" || (filter === "open" ? !s.reason : !!s.reason)));
    $("#sGrid").innerHTML = list.length ? `<div class="s-grid">${list.map((s, i) => `<article class="s-card" data-accent="${esc(s.accent || "navy")}" style="animation-delay:${Math.min(i, 8) * 40}ms">
        <div class="s-top">${status(s)}${s.official ? `<span class="chip">${icon("lock", 14)} رسمي</span>` : ""}${s.quiz ? `<span class="chip">${icon("quiz", 14)} اختبار</span>` : ""}</div>
        <h3 class="s-title" data-open="${s.id}" tabindex="0" role="link">${esc(s.title || "بلا عنوان")}</h3>
        <div class="s-count">${toAr(s.count)}<small>${rCount(s.count)}</small></div>
        <div class="s-meta"><span>${icon("list", 14)} ${qCount(s.questions || 0)}</span><span>${icon("clock", 14)} ${U.fmtDate(s.updated)}</span>${user.role === "مدير" && s.owner ? `<span>${icon("user", 14)} ${esc(s.owner)}</span>` : ""}</div>
        <div class="s-actions">
          <button class="icon-btn" type="button" data-open="${s.id}" aria-label="تحرير" title="تحرير">${icon("edit")}</button>
          <button class="icon-btn" type="button" data-open="${s.id}" data-tab="responses" aria-label="الردود" title="الردود">${icon("chart")}</button>
          <button class="icon-btn" type="button" data-share="${s.id}" aria-label="مشاركة" title="مشاركة">${icon("send")}</button>
          <span class="grow"></span>
          <button class="icon-btn" type="button" data-cardmenu="${s.id}" aria-label="المزيد" title="المزيد">${icon("more")}</button>
        </div></article>`).join("")}</div>`
      : `<div class="card empty">${icon("list", 34)}<p>${surveys.length ? "لا توجد استبانات تطابق البحث" : "لا توجد استبانات بعد. اختر قالبا من الأعلى لتبدأ"}</p></div>`;
  }

  async function createFrom(tplId) {
    const t = (window.GSurveyTemplates || []).find((x) => x.id === tplId);
    if (!t) return;
    const s = t.build();
    s.id = "";
    const r = await call({ action: "save", survey: s });
    if (!r.ok) return toast(r.error || "تعذر إنشاء الاستبانة");
    activeId = null;
    go(`#/s/${r.id}/questions`);
  }
  async function duplicate(id) {
    const r = await call({ action: "get", id });
    if (!r.ok) return toast(r.error);
    const s = S.clone(r.survey);
    s.id = ""; s.title = "نسخة من " + (s.title || "");
    delete s.owner; delete s.created; delete s.updated;
    const r2 = await call({ action: "save", survey: s });
    if (!r2.ok) return toast(r2.error || "تعذر النسخ");
    toast("أنشئت نسخة جديدة");
    renderList();
  }
  async function removeSurvey(id, title) {
    const ok = await U.confirmBox("حذف الاستبانة؟", `ستحذف «${title || "بلا عنوان"}» من المنصة ويتوقف رابطها. تبقى ردودها المحفوظة في قوقل شيتس.`, "حذف", true);
    if (!ok) return;
    const r = await call({ action: "remove", id });
    if (!r.ok) return toast(r.error || "تعذر الحذف");
    toast("حذفت الاستبانة");
    if (cur && cur.survey.id === id) { cur = null; dirty = false; }
    go("#/");
  }

  // ——— قائمة صغيرة منبثقة ———
  let menuEl = null;
  function closeMenu() { if (menuEl) { menuEl.remove(); menuEl = null; } }
  function openMenu(anchor, items) {
    closeMenu();
    const m = document.createElement("div");
    m.className = "menu";
    m.setAttribute("role", "menu");
    m.innerHTML = items.map((it) => it === "-" ? "<hr>" : `<button type="button" role="menuitem" data-mi="${it.id}" class="${it.on ? "on" : ""} ${it.danger ? "danger" : ""}">${it.icon ? icon(it.icon, 18) : ""}<span>${esc(it.label)}</span>${it.check ? `<span class="tick">${icon("check", 18)}</span>` : ""}</button>`).join("");
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    let left = r.left; if (left + mw > innerWidth - 12) left = innerWidth - mw - 12; if (left < 12) left = 12;
    let top = r.bottom + 6; if (top + mh > innerHeight - 12) top = Math.max(12, r.top - mh - 6);
    m.style.left = left + "px"; m.style.top = top + "px";
    m.addEventListener("click", (e) => {
      const b = e.target.closest("[data-mi]");
      if (!b) return;
      const it = items.find((x) => x !== "-" && x.id === b.dataset.mi);
      closeMenu();
      if (it && it.fn) it.fn();
    });
    menuEl = m;
    m._at = Date.now();
    const first = m.querySelector("button"); if (first) first.focus({ preventScroll: true });
  }
  document.addEventListener("pointerdown", (e) => { if (menuEl && !menuEl.contains(e.target) && !e.target.closest("[data-cardmenu],[data-more],[data-typemenu],[data-secmenu]")) closeMenu(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  window.addEventListener("scroll", () => { if (menuEl && Date.now() - menuEl._at > 700) closeMenu(); }, { passive: true });

  // ——— فتح الاستبانة ———
  async function openSurvey(id, t) {
    tab = ["questions", "responses", "settings"].includes(t) ? t : "questions";
    if (!cur || cur.survey.id !== id) {
      await flushSave();
      $("#screenApp").innerHTML = `<div class="wrap step"><div class="empty">${icon("refresh", 30)}<p>جار فتح الاستبانة…</p></div></div>`;
      const r = await call({ action: "get", id });
      if (!r.ok) { if (!r.auth) { toast(r.error || "تعذر فتح الاستبانة"); go("#/"); } return; }
      cur = { survey: r.survey, count: r.count || 0, sheetUrl: r.sheetUrl || "", base: r.survey.updated };
      normalize(cur.survey);
      resp = null; keyMode = null; ui.desc.clear(); ui.val.clear();
      if (!activeId || !S.findItem(cur.survey, activeId)) activeId = null;
      if (!users.length) call({ action: "users" }).then((u) => { if (u.ok) users = u.users; });
    }
    renderEditor();
  }
  function normalize(s) {
    const b = S.blank();
    s.settings = Object.assign(b.settings, s.settings || {});
    s.settings.quiz = Object.assign(b.settings.quiz, s.settings.quiz || {});
    s.theme = Object.assign({ accent: "navy" }, s.theme || {});
    if (!s.sections || !s.sections.length) s.sections = b.sections;
    S.items(s).forEach((it) => { if (it.description) ui.desc.add(it.id); if (it.validation && it.validation.kind) ui.val.add(it.id); });
  }
  function leaveEditor() { if (cur) flushSave(); cur = null; resp = null; }

  function renderEditor() {
    const s = cur.survey;
    document.documentElement.dataset.accent = s.theme.accent || "navy";
    document.title = (s.title || "استبانة") + " — منصة الاستبانات";
    $("#backBtn").hidden = false;
    $("#topbarTitle").textContent = s.title || "بلا عنوان";
    topActions(`<button class="icon-btn" type="button" data-act="preview" aria-label="معاينة" title="معاينة">${icon("eye")}</button>
      <button class="btn btn-primary btn-sm" type="button" data-act="share">${icon("send", 18)}<span class="btn-label-text">مشاركة</span></button>`);
    const tabs = [["questions", "الأسئلة", "list"], ["responses", "الردود", "chart"], ["settings", "الإعدادات", "settings"]];
    $("#screenApp").innerHTML = `<div class="tabs-bar"><nav class="tabs" role="tablist">${tabs.map(([v, l, ic]) => `<button type="button" role="tab" aria-selected="${tab === v}" class="${tab === v ? "on" : ""}" data-tab-go="${v}">${icon(ic, 18)}${l}${v === "responses" && cur.count ? `<span class="badge">${toAr(cur.count)}</span>` : ""}</button>`).join("")}</nav></div>
      <div id="tabHost"></div>`;
    renderTab();
  }
  function renderTab() {
    if (tab === "questions") renderQuestions();
    else if (tab === "settings") renderSettings();
    else renderResponses();
  }

  // ——— الحفظ التلقائي ———
  function markDirty() {
    dirty = true;
    setSave("لم يحفظ بعد", true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 1200);
  }
  async function doSave() {
    clearTimeout(saveTimer); clearTimeout(retryTimer);
    if (!cur || !dirty) return;
    if (saving) { saveTimer = setTimeout(doSave, 600); return; }
    saving = true; dirty = false;
    setSave("جار الحفظ…", true);
    const snapshot = S.clone(cur.survey);
    const r = await call({ action: "save", survey: snapshot, base: cur.base });
    saving = false;
    if (r.ok) {
      if (cur && cur.survey.id === r.id) { cur.base = r.updated; cur.survey.updated = r.updated; }
      setSave(dirty ? "لم يحفظ بعد" : "حفظت كل التغييرات", dirty);
      if (dirty) saveTimer = setTimeout(doSave, 800);
    } else if (r.conflict) {
      dirty = true;
      setSave("لم يحفظ: تعارض", true);
      const ok = await U.confirmBox("عدل غيرك هذه الاستبانة", "حفظ شخص آخر نسخة أحدث الآن. حدث الصفحة لترى نسخته، أو احفظ نسختك فوقها.", "احفظ نسختي");
      if (ok && cur) { cur.base = ""; doSave(); }
    } else if (r.net) {
      dirty = true;
      setSave("تعذر الحفظ، نعيد المحاولة…", true);
      retryTimer = setTimeout(doSave, 5000);
    } else if (!r.auth) {
      dirty = true;
      setSave("لم يحفظ", true);
      toast(r.error || "تعذر الحفظ", 5000);
    }
  }
  async function flushSave() { if (dirty) await doSave(); while (saving) await K.wait(100); }
  window.addEventListener("beforeunload", (e) => { if (dirty || saving) { e.preventDefault(); e.returnValue = ""; } });

  // ——— المحرر: الأسئلة ———
  function locate(id) {
    const secs = cur.survey.sections;
    for (let si = 0; si < secs.length; si++) {
      const ii = secs[si].items.findIndex((x) => x.id === id);
      if (ii >= 0) return { sec: secs[si], si, ii, item: secs[si].items[ii] };
    }
    return null;
  }
  const secOptions = (sel, self, withNext = true) => {
    const secs = cur.survey.sections;
    return (withNext ? `<option value="" ${!sel ? "selected" : ""}>الانتقال إلى القسم التالي</option>` : "") +
      secs.map((x, i) => x.id === self ? "" : `<option value="${x.id}" ${sel === x.id ? "selected" : ""}>الانتقال إلى القسم ${toAr(i + 1)}${x.title ? ": " + esc(x.title.slice(0, 30)) : ""}</option>`).join("") +
      `<option value="submit" ${sel === "submit" ? "selected" : ""}>إرسال الاستبانة</option>`;
  };

  function renderQuestions(focusSel) {
    const s = cur.survey, secs = s.sections, multi = secs.length > 1;
    const y = window.scrollY;
    $("#tabHost").innerHTML = `<div class="editor step">
      <div class="ed-col" id="edCol">
        <div class="card ed-head">
          <input class="plain-in kicker-in" data-sf="kicker" value="${esc(s.kicker || "")}" placeholder="سطر صغير فوق العنوان (مثل: استبانة رضا)" aria-label="السطر الصغير فوق العنوان">
          <input class="input ed-title-in" data-sf="title" value="${esc(s.title)}" placeholder="عنوان الاستبانة" aria-label="عنوان الاستبانة">
          <textarea class="plain-in lead-in" data-sf="description" rows="1" placeholder="وصف الاستبانة" aria-label="وصف الاستبانة">${esc(s.description || "")}</textarea>
        </div>
        ${secs.map((sec, si) => `
          ${multi ? `<div class="sec-chip">القسم ${toAr(si + 1)} من ${toAr(secs.length)}</div>
          <div class="card sec-card" data-sec="${sec.id}">
            <div class="sec-tools"><button class="icon-btn" type="button" data-secmenu="${sec.id}" aria-label="خيارات القسم">${icon("more")}</button></div>
            <input class="input ed-title-in" style="font-size:22px" data-secf="title" data-sec="${sec.id}" value="${esc(sec.title || "")}" placeholder="${si === 0 ? "عنوان القسم (اختياري، يظهر بدله عنوان الاستبانة)" : "عنوان القسم"}" aria-label="عنوان القسم">
            <textarea class="plain-in lead-in" rows="1" data-secf="description" data-sec="${sec.id}" placeholder="وصف القسم (اختياري)" aria-label="وصف القسم">${esc(sec.description || "")}</textarea>
          </div>` : ""}
          <div class="sec-items" data-secitems="${sec.id}">${sec.items.map((it) => it.id === activeId ? itemEditor(it, sec) : itemMini(it)).join("")}
            ${!sec.items.length ? `<div class="card empty" style="padding:28px">${icon("plus", 26)}<p>${multi ? "القسم فارغ. " : ""}أضف سؤالا من شريط الإضافة</p></div>` : ""}</div>
          ${multi && si < secs.length ? `<div class="sec-after">بعد القسم ${toAr(si + 1)}
            <span class="select-wrap"><select class="input select" data-secnext="${sec.id}" aria-label="بعد القسم">${si === secs.length - 1 ? `<option value="" ${!sec.next ? "selected" : ""}>إرسال الاستبانة</option>` + secs.map((x, i) => x.id === sec.id ? "" : `<option value="${x.id}" ${sec.next === x.id ? "selected" : ""}>الانتقال إلى القسم ${toAr(i + 1)}</option>`).join("") : secOptions(sec.next, sec.id)}</select>${icon("caret", 16)}</span></div>` : ""}
        `).join("")}
      </div>
      <nav class="addbar" aria-label="إضافة">
        <button class="icon-btn" type="button" data-add="radio" title="إضافة سؤال" aria-label="إضافة سؤال">${icon("plus", 24)}</button>
        <button class="icon-btn" type="button" data-add="text" title="إضافة عنوان ووصف" aria-label="إضافة عنوان ووصف">${icon("text", 22)}</button>
        <button class="icon-btn" type="button" data-add="image" title="إضافة صورة" aria-label="إضافة صورة">${icon("image", 22)}</button>
        <button class="icon-btn" type="button" data-add="video" title="إضافة فيديو" aria-label="إضافة فيديو">${icon("video", 22)}</button>
        <button class="icon-btn" type="button" data-add="section" title="إضافة قسم" aria-label="إضافة قسم">${icon("section", 22)}</button>
      </nav>
    </div>`;
    window.scrollTo(0, y);
    $$("#edCol textarea").forEach(autoGrow);
    if (focusSel) { const f = $(focusSel); if (f) { f.focus({ preventScroll: true }); if (f.select && f.value === "") f.select(); } }
  }
  function autoGrow(t) { t.style.height = "auto"; t.style.height = t.scrollHeight + 2 + "px"; }

  function itemMini(it) {
    const T = TYPES[it.type] || {};
    const key = it.quiz && it.quiz.key ? it.quiz.key : [];
    let prev = "";
    if (T.choice) {
      const mark = it.type === "checkbox" ? "sq" : "";
      prev = (it.options || []).slice(0, 4).map((o, i) => `<span class="mo">${it.type === "dropdown" ? `<span class="num">${toAr(i + 1)}</span>` : `<span class="mo-mark ${mark} ${key.includes(o.label) ? "key" : ""}"></span>`}${esc(o.label)}${it.branch && o.go ? ` ${icon("back", 14)}` : ""}</span>`).join("") +
        ((it.options || []).length > 4 ? `<span class="mo">… و${toAr(it.options.length - 4)} أخرى</span>` : "") + (it.other ? `<span class="mo"><span class="mo-mark ${mark}"></span>${S.OTHER}…</span>` : "");
    } else if (it.type === "short" || it.type === "paragraph") prev = `<span class="ghost-line">${it.type === "short" ? "إجابة قصيرة" : "إجابة طويلة"}</span>`;
    else if (it.type === "scale") prev = `<span>${toAr(it.scale.min)} — ${toAr(it.scale.max)}${it.scale.minLabel || it.scale.maxLabel ? ` (${esc(it.scale.minLabel)} … ${esc(it.scale.maxLabel)})` : ""}</span>`;
    else if (it.type === "rating") prev = `<span>${toAr(it.rating.max)} نجوم</span>`;
    else if (T.grid) prev = `<span>${toAr(it.rows.length)} صفوف × ${toAr(it.cols.length)} أعمدة</span>`;
    else if (it.type === "image") { const src = U.mediaSrc(it.media.url); prev = src ? `<span class="media-prev"><img src="${esc(src)}" alt="" style="max-height:120px" referrerpolicy="no-referrer"></span>` : `<span>لم تحدد صورة</span>`; }
    else if (it.type === "video") prev = `<span>${U.youtubeId(it.media.url) ? "فيديو يوتيوب" : "لم يحدد فيديو"}</span>`;
    else if (it.type === "download") prev = `<span>${icon("download", 16)} ${U.downloadUrl(it.media.url) ? "الملف جاهز للتحميل" : "لم يضف الملف بعد"}</span>`;
    else if (it.type === "text") prev = it.description ? `<span>${esc(it.description.slice(0, 140))}</span>` : "";
    else if (it.type === "file") prev = `<span>${icon("upload", 16)} حتى ${toAr(it.file.maxFiles)} ${it.file.maxFiles === 1 ? "ملف" : "ملفات"}</span>`;
    else if (it.type === "date") prev = `<span>${icon("calendar", 16)} يوم / شهر / سنة${it.date.time ? " والوقت" : ""}</span>`;
    else if (it.type === "time") prev = `<span>${icon("clock", 16)} ${it.time.duration ? "مدة زمنية" : "وقت"}</span>`;
    const pts = cur.survey.settings.quiz.on && it.quiz && it.quiz.points ? ` · ${toAr(it.quiz.points)} درجة` : "";
    return `<div class="ed-item" data-item="${it.id}" draggable="true" tabindex="0" aria-label="${esc(it.title || T.label)}">
      <span class="drag-handle" aria-hidden="true"></span>
      <div class="ed-mini"><div class="ed-mini-top"><span class="ed-mini-title ${it.title ? "" : "ph"}">${esc(it.title || (T.q ? "سؤال بلا عنوان" : T.label))}${it.required ? ' <span class="req">*</span>' : ""}</span>
      ${it.locked ? `<span class="chip lock-chip">${icon("lock", 14)} رسمي</span>` : ""}<span class="chip">${icon(U.TYPE_ICON[it.type], 14)} ${T.label}${pts}</span></div>
      ${it.showIf && it.showIf.item ? `<span class="chip" style="justify-self:start">${icon("branch", 14)} يظهر إذا كانت إجابة «${esc(((S.findItem(cur.survey, it.showIf.item) || {}).title || "").slice(0, 40))}» ${esc(it.showIf.value)}</span>` : ""}
      <div class="ed-mini-preview">${prev}</div></div></div>`;
  }

  function sel(attr, options, value, label) {
    return `<span class="select-wrap"><select class="input select" ${attr} aria-label="${esc(label || "")}">${options.map(([v, l]) => `<option value="${esc(v)}" ${String(value) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>${icon("caret", 16)}</span>`;
  }
  function sw(attr, on, label) {
    return `<label class="switch"><input type="checkbox" ${attr} ${on ? "checked" : ""}><span class="track"></span>${label ? `<span class="sw-label">${esc(label)}</span>` : ""}</label>`;
  }

  function itemEditor(it, sec) {
    const T = TYPES[it.type] || {};
    const quizOn = cur.survey.settings.quiz.on && T.grade;
    const inKey = keyMode === it.id && quizOn;
    const multiSec = cur.survey.sections.length > 1;
    let body = "";
    if (T.choice) {
      const mark = (i) => it.type === "dropdown" ? `<span class="num">${toAr(i + 1)}</span>` : `<span class="mo-mark ${it.type === "checkbox" ? "sq" : ""}"></span>`;
      const key = (it.quiz && it.quiz.key) || [];
      body = `<ul class="opt-list">${it.options.map((o, i) => inKey
        ? `<li class="opt-row key-row ${key.includes(o.label) ? "is-key" : ""}" data-keyopt="${i}" role="button" tabindex="0">${mark(i)}<span class="plain-in" style="border:0">${esc(o.label)}</span>${key.includes(o.label) ? icon("check", 18) : ""}</li>`
        : `<li class="opt-row">${mark(i)}<input class="plain-in" data-opt="${i}" value="${esc(o.label)}" aria-label="الخيار ${toAr(i + 1)}">
          ${it.branch && T.branch && multiSec ? `<span class="select-wrap"><select class="input select go-sel" data-go="${i}" aria-label="الانتقال بعد هذا الخيار">${secOptions(o.go || "", sec.id)}</select>${icon("caret", 14)}</span>` : ""}
          ${it.options.length > 1 ? `<button class="icon-btn" type="button" data-rmopt="${i}" aria-label="حذف الخيار">${icon("close", 18)}</button>` : ""}</li>`).join("")}
        ${it.other && !inKey ? `<li class="opt-row">${mark(it.options.length)}<span class="plain-in" style="color:var(--muted);border:0">${S.OTHER}…</span>
          ${it.branch && T.branch && multiSec ? `<span class="select-wrap"><select class="input select go-sel" data-othergo aria-label="الانتقال بعد أخرى">${secOptions(it.otherGo || "", sec.id)}</select>${icon("caret", 14)}</span>` : ""}
          <button class="icon-btn" type="button" data-rmother aria-label="حذف خيار أخرى">${icon("close", 18)}</button></li>` : ""}
      </ul>
      ${!inKey ? `<div class="add-opt">${mark(it.options.length + (it.other ? 1 : 0))}<button class="link-btn" type="button" data-addopt>إضافة خيار</button>${it.type !== "dropdown" && !it.other ? `<span>أو</span><button class="link-btn" type="button" data-addother>إضافة «أخرى»</button>` : ""}</div>` : ""}`;
    } else if (it.type === "short") body = `<span class="ghost-line">نص الإجابة القصيرة</span>`;
    else if (it.type === "paragraph") body = `<span class="ghost-line">نص الإجابة الطويلة</span>`;
    else if (it.type === "scale") {
      const sc = it.scale;
      body = `<div class="inline-fields">${sel('data-scale="min"', [[0, "٠"], [1, "١"]], sc.min, "بداية المقياس")}<span>إلى</span>${sel('data-scale="max"', [2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, toAr(n)]), sc.max, "نهاية المقياس")}</div>
        <div class="grid grid-2"><label class="field"><span class="hint">وصف ${toAr(sc.min)} (اختياري)</span><input class="input" data-scalelab="minLabel" value="${esc(sc.minLabel || "")}" placeholder="مثل: غير راض"></label>
        <label class="field"><span class="hint">وصف ${toAr(sc.max)} (اختياري)</span><input class="input" data-scalelab="maxLabel" value="${esc(sc.maxLabel || "")}" placeholder="مثل: راض جدا"></label></div>`;
    } else if (it.type === "rating") {
      body = `<div class="inline-fields"><span>عدد النجوم</span>${sel('data-ratingmax', [3, 4, 5, 6, 7, 8, 9, 10].map((n) => [n, toAr(n)]), it.rating.max, "عدد النجوم")}</div>`;
    } else if (T.grid) {
      const gk = (it.quiz && it.quiz.gridKey) || {};
      body = inKey
        ? `<div class="grid">${it.rows.map((r) => `<div class="inline-fields"><span style="min-width:140px">${esc(r.label)}</span>${sel(`data-gridkey="${r.id}"`, [["", "—"]].concat(it.cols.map((c) => [c.label, c.label])), gk[r.id] || "", "الإجابة الصحيحة")}</div>`).join("")}</div>`
        : `<div class="ed-cols">
        <div><h4>الصفوف</h4><ul class="opt-list">${it.rows.map((r, i) => `<li class="opt-row"><span class="num">${toAr(i + 1)}</span><input class="plain-in" data-row="${i}" value="${esc(r.label)}" aria-label="الصف ${toAr(i + 1)}">${it.rows.length > 1 ? `<button class="icon-btn" type="button" data-rmrow="${i}" aria-label="حذف الصف">${icon("close", 18)}</button>` : ""}</li>`).join("")}</ul>
          <div class="add-opt"><button class="link-btn" type="button" data-addrow>إضافة صف</button></div></div>
        <div><h4>الأعمدة</h4><ul class="opt-list">${it.cols.map((c, i) => `<li class="opt-row"><span class="mo-mark ${it.type === "checkgrid" ? "sq" : ""}"></span><input class="plain-in" data-col="${i}" value="${esc(c.label)}" aria-label="العمود ${toAr(i + 1)}">${it.cols.length > 1 ? `<button class="icon-btn" type="button" data-rmcol="${i}" aria-label="حذف العمود">${icon("close", 18)}</button>` : ""}</li>`).join("")}</ul>
          <div class="add-opt"><button class="link-btn" type="button" data-addcol>إضافة عمود</button></div></div></div>`;
    } else if (it.type === "date") body = sw('data-flag="date.time"', it.date.time, "إضافة الوقت");
    else if (it.type === "time") body = `<div class="seg" role="radiogroup">${[["0", "وقت من اليوم"], ["1", "مدة زمنية"]].map(([v, l]) => `<label class="${(it.time.duration ? "1" : "0") === v ? "checked" : ""}"><input type="radio" name="tm_${it.id}" value="${v}" data-timemode ${(it.time.duration ? "1" : "0") === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    else if (it.type === "file") {
      const f = it.file, kinds = f.kinds || [];
      body = `${sw("data-filekinds", kinds.length > 0, "السماح بأنواع محددة فقط")}
        ${kinds.length ? `<div class="seg kinds" role="group">${Object.keys(S.FILE_KINDS).map((k) => `<label class="${kinds.includes(k) ? "checked" : ""}"><input type="checkbox" data-kind="${k}" ${kinds.includes(k) ? "checked" : ""}>${S.FILE_KINDS[k].label}</label>`).join("")}</div>` : ""}
        <div class="inline-fields"><span>أقصى عدد للملفات</span>${sel('data-filemax="maxFiles"', [1, 3, 5, 10].map((n) => [n, toAr(n)]), f.maxFiles, "أقصى عدد للملفات")}
          <span>أقصى حجم للملف</span>${sel('data-filemax="maxMB"', [1, 5, 10].map((n) => [n, toAr(n) + " م.ب"]), f.maxMB, "أقصى حجم للملف")}</div>
        <p class="hint">تحفظ الملفات في مجلد الاستبانة في قوقل درايف، ويظهر رابطها في الشيت.</p>`;
    } else if (it.type === "download") {
      body = `<input class="input" dir="ltr" data-media="url" value="${esc(it.media.url || "")}" placeholder="رابط الملف في قوقل درايف (مشارك لأي شخص لديه الرابط)" aria-label="رابط الملف">
        <input class="input" data-media="caption" value="${esc(it.media.caption || "")}" placeholder="نص الزر: تحميل النموذج" aria-label="نص الزر">
        <p class="hint">${U.downloadUrl(it.media.url) ? "يحمل المجيب الملف بضغطة." : "ضع الرابط الآن أو لاحقا، وإلى ذلك يرى المجيب «يضاف الملف قريبا»."} عروض قوقل وجداوله ومستنداته تنزل بصيغة بوربوينت وإكسل ووورد.</p>`;
    } else if (it.type === "image" || it.type === "video") {
      const src = it.type === "image" ? U.mediaSrc(it.media.url) : "", yt = it.type === "video" ? U.youtubeId(it.media.url) : "";
      body = `<input class="input" dir="ltr" data-media="url" value="${esc(it.media.url || "")}" placeholder="${it.type === "image" ? "رابط الصورة (رابط مباشر أو رابط ملف في قوقل درايف مشارك للجميع)" : "رابط فيديو يوتيوب"}" aria-label="الرابط">
        <input class="input" data-media="caption" value="${esc(it.media.caption || "")}" placeholder="تعليق تحت ${it.type === "image" ? "الصورة" : "الفيديو"} (اختياري)" aria-label="التعليق">
        <div class="media-prev">${src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="معاينة" loading="lazy" allowfullscreen></iframe></div>` : ""}</div>`;
    }

    // الإظهار حسب إجابة سابقة
    let cond = "";
    if (it.showIf) {
      const before = [];
      for (const x of S.items(cur.survey)) { if (x.id === it.id) break; if (TYPES[x.type].choice) before.push(x); }
      const src = before.find((x) => x.id === it.showIf.item);
      cond = `<div class="sub-panel"><h4>${icon("branch", 18)} يظهر ${T.q ? "هذا السؤال" : "هذا العنصر"} فقط إذا</h4>
        ${before.length ? `<div class="inline-fields">${sel('data-cond="item"', [["", "اختر سؤالا"]].concat(before.map((x) => [x.id, (x.title || "سؤال بلا عنوان").slice(0, 50)])), it.showIf.item, "السؤال")}
          ${src ? `<span>كانت إجابته</span>${sel('data-cond="value"', [["", "اختر"]].concat(src.options.map((o) => [o.label, o.label]), src.other ? [[S.OTHER, S.OTHER]] : []), it.showIf.value, "الإجابة")}` : ""}</div>`
        : `<p class="hint">أضف قبله سؤال اختيار من متعدد أو قائمة منسدلة أو مربعات اختيار</p>`}</div>`;
    }

    // التحقق من الإجابة
    let val = "";
    if (ui.val.has(it.id) && ["short", "paragraph", "checkbox"].includes(it.type) && !inKey) {
      const v = it.validation || {};
      const KINDS = it.type === "short" ? [["number", "رقم"], ["text", "نص"], ["length", "الطول"], ["regex", "تعبير نمطي"]] : it.type === "paragraph" ? [["length", "الطول"], ["regex", "تعبير نمطي"]] : [["count", "عدد الاختيارات"]];
      const kind = v.kind || KINDS[0][0];
      const OPS = {
        number: [["isnum", "أي رقم"], ["int", "عدد صحيح"], ["gt", "أكبر من"], ["gte", "أكبر من أو يساوي"], ["lt", "أصغر من"], ["lte", "أصغر من أو يساوي"], ["eq", "يساوي"], ["neq", "لا يساوي"], ["between", "بين"], ["nbetween", "ليس بين"]],
        text: [["phone", "رقم جوال سعودي"], ["email", "بريد إلكتروني"], ["url", "رابط"], ["contains", "يحتوي على"], ["ncontains", "لا يحتوي على"]],
        length: [["max", "الحد الأقصى لعدد الأحرف"], ["min", "الحد الأدنى لعدد الأحرف"]],
        regex: [["matches", "يطابق"], ["nmatches", "لا يطابق"]],
        count: [["min", "اختر على الأقل"], ["max", "اختر على الأكثر"], ["eq", "اختر بالضبط"]]
      }[kind];
      const op = v.op && OPS.some((o) => o[0] === v.op) ? v.op : OPS[0][0];
      const needA = !(kind === "number" && ["isnum", "int"].includes(op)) && !(kind === "text" && ["phone", "email", "url"].includes(op));
      val = `<div class="sub-panel"><h4>${icon("check", 18)} التحقق من الإجابة</h4>
        <div class="inline-fields">${KINDS.length > 1 ? sel('data-val="kind"', KINDS, kind, "نوع التحقق") : ""}${sel('data-val="op"', OPS, op, "الشرط")}
          ${needA ? `<input class="input" data-val="a" value="${esc(v.a == null ? "" : v.a)}" placeholder="${kind === "regex" ? "النمط" : kind === "text" ? "النص" : "رقم"}" ${kind === "regex" || kind === "text" ? 'dir="ltr"' : 'inputmode="decimal"'} style="width:140px" aria-label="القيمة">` : ""}
          ${kind === "number" && ["between", "nbetween"].includes(op) ? `<span>و</span><input class="input" data-val="b" value="${esc(v.b == null ? "" : v.b)}" placeholder="رقم" inputmode="decimal" style="width:110px" aria-label="القيمة الثانية">` : ""}</div>
        <input class="input" data-val="msg" value="${esc(v.msg || "")}" placeholder="رسالة الخطأ (اختياري)" aria-label="رسالة الخطأ"></div>`;
    }

    // مفتاح الإجابة
    let keyPanel = "";
    if (inKey) {
      const q = it.quiz;
      keyPanel = `<div class="sub-panel"><h4>${icon("quiz", 18)} مفتاح الإجابة</h4>
        <div class="key-bar"><span>الدرجة</span><input class="input" type="number" min="0" inputmode="numeric" data-quiz="points" value="${esc(q.points || 0)}" aria-label="الدرجة">
          <span class="hint">${it.type === "short" ? "اكتب الإجابات المقبولة" : T.grid ? "اختر الإجابة الصحيحة لكل صف" : it.type === "checkbox" ? "اختر كل الإجابات الصحيحة" : "اختر الإجابة الصحيحة"}</span></div>
        ${it.type === "short" ? `<ul class="opt-list">${(q.key.length ? q.key : [""]).map((k, i) => `<li class="opt-row"><span class="mo-mark key"></span><input class="plain-in" data-keytext="${i}" value="${esc(k)}" placeholder="إجابة صحيحة" aria-label="إجابة صحيحة"><button class="icon-btn" type="button" data-rmkey="${i}" aria-label="حذف">${icon("close", 18)}</button></li>`).join("")}</ul>
          <div class="add-opt"><button class="link-btn" type="button" data-addkey>إضافة إجابة مقبولة</button></div><p class="hint">لا يفرق التصحيح بين الهمزات ولا المسافات ولا الأرقام العربية واللاتينية</p>` : ""}
        <div class="grid grid-2"><input class="input" data-quiz="fbOk" value="${esc(q.fbOk || "")}" placeholder="تعليق للإجابة الصحيحة (اختياري)" aria-label="تعليق للإجابة الصحيحة">
          <input class="input" data-quiz="fbBad" value="${esc(q.fbBad || "")}" placeholder="تعليق للإجابة الخاطئة (اختياري)" aria-label="تعليق للإجابة الخاطئة"></div>
        <div><button class="btn btn-primary btn-sm" type="button" data-keydone>تم</button></div></div>`;
    }

    const isText = it.type === "text";
    return `<div class="ed-item active" data-item="${it.id}">
      <div class="ed-row">
        <textarea class="input ed-q-in" rows="1" data-f="title" placeholder="${T.q ? "السؤال" : isText ? "العنوان" : "العنوان (اختياري)"}" aria-label="نص السؤال">${esc(it.title)}</textarea>
        <div class="type-pick"><button class="type-btn" type="button" data-typemenu aria-haspopup="menu">${icon(U.TYPE_ICON[it.type])}<span>${T.label}</span>${icon("caret", 18)}</button></div>
      </div>
      ${ui.desc.has(it.id) || isText || it.type === "download" ? `<textarea class="plain-in ed-desc" rows="1" data-f="description" placeholder="الوصف" aria-label="الوصف">${esc(it.description || "")}</textarea>` : ""}
      <div class="ed-body">${body}</div>
      ${cond}${val}${keyPanel}
      <div class="ed-foot">
        ${quizOn && !inKey ? `<button class="link-btn" type="button" data-keymode>${icon("quiz", 18)} مفتاح الإجابة (${toAr(it.quiz.points || 0)} درجة)</button>` : ""}
        <span class="grow"></span>
        <button class="icon-btn" type="button" data-dup aria-label="نسخ السؤال" title="نسخ">${icon("dup")}</button>
        <button class="icon-btn danger" type="button" data-del aria-label="حذف" title="حذف">${icon("trash")}</button>
        ${T.q ? `<span class="sep"></span>${sw("data-required", it.required, "مطلوب")}` : ""}
        <button class="icon-btn" type="button" data-more aria-label="خيارات أخرى" title="خيارات أخرى">${icon("more")}</button>
      </div></div>`;
  }

  // ——— عمليات على الأسئلة ———
  function activate(id, focus) {
    if (activeId === id) return;
    activeId = id; keyMode = null;
    renderQuestions(focus ? `[data-item="${id}"] [data-f="title"]` : null);
    const el = $(`[data-item="${id}"]`);
    if (el) { const r = el.getBoundingClientRect(); if (r.top < 120 || r.bottom > innerHeight - 20) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }
  function addItem(type) {
    const s = cur.survey;
    if (type === "section") return addSection();
    const it = S.newItem(type);
    const loc = activeId && locate(activeId);
    if (loc) loc.sec.items.splice(loc.ii + 1, 0, it);
    else s.sections[s.sections.length - 1].items.push(it);
    activeId = it.id; keyMode = null;
    markDirty();
    renderQuestions(`[data-item="${it.id}"] [data-f="title"]`);
    const el = $(`[data-item="${it.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  // قسم جديد بعد السؤال النشط: ينتقل ما بعده إلى القسم الجديد
  function addSection() {
    const s = cur.survey;
    const sec = { id: S.uid(), title: "", description: "", next: "", items: [] };
    const loc = activeId && locate(activeId);
    if (loc) {
      sec.items = loc.sec.items.splice(loc.ii + 1);
      s.sections.splice(loc.si + 1, 0, sec);
    } else s.sections.push(sec);
    activeId = null;
    markDirty();
    renderQuestions(`[data-sec="${sec.id}"][data-secf="title"]`);
    const el = $(`[data-sec="${sec.id}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function cleanRefs(goneId) {
    cur.survey.sections.forEach((x) => {
      if (x.next === goneId) x.next = "";
      x.items.forEach((it) => { (it.options || []).forEach((o) => { if (o.go === goneId) o.go = ""; }); if (it.otherGo === goneId) it.otherGo = ""; });
    });
  }
  function secMenu(anchor, id) {
    const secs = cur.survey.sections, si = secs.findIndex((x) => x.id === id);
    openMenu(anchor, [
      { id: "dup", label: "نسخ القسم", icon: "dup", fn: () => {
        const copy = S.clone(secs[si]); copy.id = S.uid(); copy.items.forEach((it) => { it.id = S.uid(); });
        secs.splice(si + 1, 0, copy); markDirty(); renderQuestions();
      } },
      { id: "up", label: "نقل القسم لأعلى", icon: "up", fn: () => { if (si > 0) { [secs[si - 1], secs[si]] = [secs[si], secs[si - 1]]; markDirty(); renderQuestions(); } } },
      { id: "down", label: "نقل القسم لأسفل", icon: "down", fn: () => { if (si < secs.length - 1) { [secs[si + 1], secs[si]] = [secs[si], secs[si + 1]]; markDirty(); renderQuestions(); } } },
      "-",
      { id: "del", label: "حذف القسم ودمج أسئلته", icon: "trash", danger: true, fn: () => {
        const gone = secs[si];
        const into = si > 0 ? secs[si - 1] : secs[si + 1];
        into.items = si > 0 ? into.items.concat(gone.items) : gone.items.concat(into.items);
        if (si === 0) { into.title = into.title || gone.title; }
        secs.splice(si, 1); cleanRefs(gone.id); markDirty(); renderQuestions();
        toast("حذف القسم ونقلت أسئلته إلى القسم " + (si > 0 ? "السابق" : "التالي"));
      } }
    ]);
  }
  function typeMenu(anchor, it) {
    const groups = [["short", "paragraph"], ["radio", "checkbox", "dropdown"], ["scale", "rating", "grid", "checkgrid"], ["date", "time", "file"], ["text", "image", "video", "download"]];
    const items = [];
    groups.forEach((g, gi) => { if (gi) items.push("-"); g.forEach((t) => items.push({ id: t, label: TYPES[t].label, icon: U.TYPE_ICON[t], check: true, on: it.type === t, fn: () => changeType(it, t) })); });
    openMenu(anchor, items);
  }
  function changeType(it, type) {
    if (it.type === type) return;
    const fresh = S.newItem(type);
    const keep = { id: it.id, title: it.title, description: it.description, required: TYPES[type].q ? it.required : false };
    if (TYPES[type].choice && TYPES[it.type].choice) { keep.options = it.options; keep.other = type !== "dropdown" && it.other; keep.shuffle = it.shuffle; keep.branch = it.branch; keep.otherGo = it.otherGo; }
    if (TYPES[type].choice && TYPES[it.type].grid) keep.options = it.cols.map((c) => ({ label: c.label }));
    if (TYPES[type].grid && TYPES[it.type].choice) keep.cols = it.options.map((o) => ({ label: o.label }));
    if (TYPES[type].grid && TYPES[it.type].grid) { keep.rows = it.rows; keep.cols = it.cols; }
    if (it.quiz && TYPES[type].grade) keep.quiz = Object.assign(fresh.quiz, { points: it.quiz.points, fbOk: it.quiz.fbOk, fbBad: it.quiz.fbBad });
    Object.keys(it).forEach((k) => delete it[k]);
    Object.assign(it, fresh, keep);
    if (!["short", "paragraph", "checkbox"].includes(type)) ui.val.delete(it.id);
    keyMode = null;
    markDirty();
    renderQuestions();
  }
  function moreMenu(anchor, it) {
    const T = TYPES[it.type];
    const loc = locate(it.id);
    const multi = cur.survey.sections.length > 1;
    const items = [];
    if (it.type !== "text") items.push({ id: "desc", label: "الوصف", check: true, on: ui.desc.has(it.id), fn: () => { if (ui.desc.has(it.id)) { ui.desc.delete(it.id); it.description = ""; } else ui.desc.add(it.id); markDirty(); renderQuestions(ui.desc.has(it.id) ? `[data-item="${it.id}"] [data-f="description"]` : null); } });
    if (["short", "paragraph", "checkbox"].includes(it.type)) items.push({ id: "val", label: "التحقق من الإجابة", check: true, on: ui.val.has(it.id), fn: () => {
      if (ui.val.has(it.id)) { ui.val.delete(it.id); delete it.validation; }
      else { ui.val.add(it.id); it.validation = { kind: it.type === "short" ? "number" : it.type === "paragraph" ? "length" : "count", op: it.type === "short" ? "isnum" : it.type === "paragraph" ? "max" : "min", a: "", b: "", msg: "" }; }
      markDirty(); renderQuestions();
    } });
    if (T.branch) items.push({ id: "branch", label: multi ? "الانتقال إلى قسم حسب الإجابة" : "الانتقال حسب الإجابة (أضف قسما أولا)", check: true, on: !!it.branch, fn: () => { if (!multi) return toast("أضف قسما ثانيا أولا من شريط الإضافة"); it.branch = !it.branch; markDirty(); renderQuestions(); } });
    if (T.choice || T.grid) items.push({ id: "shuffle", label: T.grid ? "ترتيب الصفوف عشوائيا" : "ترتيب الخيارات عشوائيا", check: true, on: !!it.shuffle, fn: () => { it.shuffle = !it.shuffle; markDirty(); renderQuestions(); } });
    items.push({ id: "cond", label: "الإظهار حسب إجابة سابقة", check: true, on: !!it.showIf, fn: () => { if (it.showIf) delete it.showIf; else it.showIf = { item: "", value: "" }; markDirty(); renderQuestions(); } });
    if (user.role === "مدير") items.push({ id: "lock", label: "جزء رسمي ثابت (لا يعدله إلا المدير)", check: true, on: !!it.locked, fn: () => { it.locked = !it.locked; markDirty(); renderQuestions(); } });
    if (T.grid) items.push({ id: "onePerCol", label: "لا يتكرر العمود في أكثر من صف", check: true, on: !!it.onePerCol, fn: () => { it.onePerCol = !it.onePerCol; markDirty(); renderQuestions(); } });
    if (items.length) items.push("-");
    items.push({ id: "up", label: "نقل لأعلى", icon: "up", fn: () => moveItem(it.id, -1) });
    items.push({ id: "down", label: "نقل لأسفل", icon: "down", fn: () => moveItem(it.id, 1) });
    if (multi) cur.survey.sections.forEach((x, i) => { if (x.id !== loc.sec.id) items.push({ id: "to" + i, label: "نقل إلى القسم " + toAr(i + 1), icon: "section", fn: () => { loc.sec.items.splice(loc.ii, 1); x.items.push(it); markDirty(); renderQuestions(); } }); });
    openMenu(anchor, items);
  }
  function moveItem(id, dir) {
    const loc = locate(id), secs = cur.survey.sections;
    const j = loc.ii + dir;
    if (j >= 0 && j < loc.sec.items.length) { loc.sec.items.splice(loc.ii, 1); loc.sec.items.splice(j, 0, loc.item); }
    else if (dir < 0 && loc.si > 0) { loc.sec.items.splice(loc.ii, 1); secs[loc.si - 1].items.push(loc.item); }
    else if (dir > 0 && loc.si < secs.length - 1) { loc.sec.items.splice(loc.ii, 1); secs[loc.si + 1].items.unshift(loc.item); }
    else return;
    markDirty();
    renderQuestions();
    const el = $(`[data-item="${id}"]`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function deleteItem(id) {
    const loc = locate(id);
    if (!loc) return;
    loc.sec.items.splice(loc.ii, 1);
    lastDeleted = { item: loc.item, secId: loc.sec.id, ii: loc.ii };
    const next = loc.sec.items[loc.ii] || loc.sec.items[loc.ii - 1];
    activeId = next ? next.id : null;
    markDirty();
    renderQuestions();
    toast("حذف " + (TYPES[loc.item.type].q ? "السؤال" : "العنصر"), 6000, { label: "تراجع", fn: () => {
      if (!lastDeleted || !cur) return;
      const sec = cur.survey.sections.find((x) => x.id === lastDeleted.secId) || cur.survey.sections[0];
      sec.items.splice(Math.min(lastDeleted.ii, sec.items.length), 0, lastDeleted.item);
      activeId = lastDeleted.item.id; lastDeleted = null;
      markDirty(); renderQuestions();
    } });
  }
  function dupItem(id) {
    const loc = locate(id);
    const c = S.clone(loc.item);
    c.id = S.uid();
    if (c.rows) c.rows.forEach((r) => { const old = r.id; r.id = S.uid(6); if (c.quiz && c.quiz.gridKey && c.quiz.gridKey[old]) { c.quiz.gridKey[r.id] = c.quiz.gridKey[old]; delete c.quiz.gridKey[old]; } });
    if (ui.desc.has(id)) ui.desc.add(c.id);
    if (ui.val.has(id)) ui.val.add(c.id);
    loc.sec.items.splice(loc.ii + 1, 0, c);
    activeId = c.id;
    markDirty();
    renderQuestions(`[data-item="${c.id}"] [data-f="title"]`);
  }
  function renameKey(it, oldLabel, newLabel) {
    if (it.quiz && it.quiz.key) it.quiz.key = it.quiz.key.map((k) => (k === oldLabel ? newLabel : k));
  }

  // أحداث المحرر
  function edInput(e) {
    const t = e.target, d = t.dataset;
    if (t.tagName === "TEXTAREA") autoGrow(t);
    const s = cur.survey;
    if (d.sf) { s[d.sf] = t.value; if (d.sf === "title") $("#topbarTitle").textContent = t.value || "بلا عنوان"; return markDirty(); }
    if (d.secf) { const sec = s.sections.find((x) => x.id === d.sec); if (sec) sec[d.secf] = t.value; return markDirty(); }
    const box = t.closest("[data-item]");
    if (!box) return;
    const it = locate(box.dataset.item).item;
    if (d.f) it[d.f] = t.value;
    else if (d.opt) { const o = it.options[+d.opt]; renameKey(it, o.label, t.value); o.label = t.value; }
    else if (d.row) it.rows[+d.row].label = t.value;
    else if (d.col) { const c = it.cols[+d.col]; if (it.quiz && it.quiz.gridKey) Object.keys(it.quiz.gridKey).forEach((k) => { if (it.quiz.gridKey[k] === c.label) it.quiz.gridKey[k] = t.value; }); c.label = t.value; }
    else if (d.scalelab) it.scale[d.scalelab] = t.value;
    else if (d.media) { it.media[d.media] = t.value; if (d.media === "url") { clearTimeout(t._h); t._h = setTimeout(() => { const p = box.querySelector(".media-prev"); if (p) { const src = it.type === "image" ? U.mediaSrc(it.media.url) : ""; const yt = it.type === "video" ? U.youtubeId(it.media.url) : ""; p.innerHTML = src ? `<img src="${esc(src)}" alt="" referrerpolicy="no-referrer">` : yt ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${yt}" title="معاينة" loading="lazy" allowfullscreen></iframe></div>` : ""; } }, 500); } }
    else if (d.val && t.tagName === "INPUT") { it.validation = it.validation || {}; it.validation[d.val] = t.value; }
    else if (d.quiz && t.tagName === "INPUT") it.quiz[d.quiz] = d.quiz === "points" ? Math.max(0, parseInt(S.digits(t.value), 10) || 0) : t.value;
    else if (d.keytext) { const k = it.quiz.key.length ? it.quiz.key : [""]; k[+d.keytext] = t.value; it.quiz.key = k; }
    else return;
    markDirty();
  }
  function edChange(e) {
    const t = e.target, d = t.dataset, s = cur.survey;
    if (d.secnext) { const sec = s.sections.find((x) => x.id === d.secnext); sec.next = t.value; return markDirty(); }
    const box = t.closest("[data-item]");
    if (!box) return;
    const it = locate(box.dataset.item).item;
    if (d.cond) { it.showIf[d.cond] = t.value; if (d.cond === "item") it.showIf.value = ""; markDirty(); return renderQuestions(); }
    if (d.required !== undefined && t.type === "checkbox") { it.required = t.checked; markDirty(); return; }
    if (d.go) { it.options[+d.go].go = t.value; return markDirty(); }
    if (d.othergo !== undefined && t.tagName === "SELECT") { it.otherGo = t.value; return markDirty(); }
    if (d.scale) { it.scale[d.scale] = +t.value; markDirty(); return renderQuestions(); }
    if (d.ratingmax !== undefined && t.tagName === "SELECT") { it.rating.max = +t.value; return markDirty(); }
    if (d.flag) { const [a, b] = d.flag.split("."); it[a][b] = t.checked; return markDirty(); }
    if (d.timemode !== undefined) { it.time.duration = t.value === "1"; markDirty(); return renderQuestions(); }
    if (d.filekinds !== undefined) { it.file.kinds = t.checked ? ["pdf", "image"] : []; markDirty(); return renderQuestions(); }
    if (d.kind) { const k = new Set(it.file.kinds); if (t.checked) k.add(d.kind); else k.delete(d.kind); it.file.kinds = [...k]; if (!it.file.kinds.length) it.file.kinds = []; markDirty(); return renderQuestions(); }
    if (d.filemax) { it.file[d.filemax] = +t.value; return markDirty(); }
    if (d.val && t.tagName === "SELECT") { it.validation = it.validation || {}; it.validation[d.val] = t.value; if (d.val === "kind") it.validation.op = ""; markDirty(); return renderQuestions(); }
    if (d.gridkey) { it.quiz.gridKey = it.quiz.gridKey || {}; if (t.value) it.quiz.gridKey[d.gridkey] = t.value; else delete it.quiz.gridKey[d.gridkey]; return markDirty(); }
  }
  function edKeydown(e) {
    const t = e.target, d = t.dataset;
    if (d.opt !== undefined && (e.key === "Enter" || (e.key === "Backspace" && t.value === ""))) {
      const it = locate(t.closest("[data-item]").dataset.item).item, i = +d.opt;
      e.preventDefault();
      if (e.key === "Enter") { it.options.splice(i + 1, 0, { label: "" }); markDirty(); renderQuestions(`[data-item="${it.id}"] [data-opt="${i + 1}"]`); }
      else if (it.options.length > 1) { it.options.splice(i, 1); markDirty(); renderQuestions(`[data-item="${it.id}"] [data-opt="${Math.max(0, i - 1)}"]`); }
      return;
    }
    if ((d.row !== undefined || d.col !== undefined) && e.key === "Enter") {
      e.preventDefault();
      const it = locate(t.closest("[data-item]").dataset.item).item;
      if (d.row !== undefined) { it.rows.splice(+d.row + 1, 0, { id: S.uid(6), label: "" }); markDirty(); renderQuestions(`[data-item="${it.id}"] [data-row="${+d.row + 1}"]`); }
      else { it.cols.splice(+d.col + 1, 0, { label: "" }); markDirty(); renderQuestions(`[data-item="${it.id}"] [data-col="${+d.col + 1}"]`); }
      return;
    }
    if (e.key === "Enter" && t.matches(".ed-item:not(.active)")) { e.preventDefault(); activate(t.dataset.item, true); }
    if ((e.key === "Enter" || e.key === " ") && t.matches("[data-keyopt]")) { e.preventDefault(); t.click(); }
  }
  // لصق عدة أسطر في خانة خيار يضيفها خيارات متعددة
  function edPaste(e) {
    const t = e.target;
    if (t.dataset.opt === undefined) return;
    const text = (e.clipboardData || window.clipboardData).getData("text");
    const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
    if (lines.length < 2) return;
    e.preventDefault();
    const it = locate(t.closest("[data-item]").dataset.item).item, i = +t.dataset.opt;
    const cur0 = it.options[i];
    const rest = lines.map((l) => ({ label: l }));
    if (!cur0.label) it.options.splice(i, 1, ...rest); else it.options.splice(i + 1, 0, ...rest);
    markDirty();
    renderQuestions();
    toast("أضيف " + toAr(lines.length) + " خيارات");
  }
  function edClick(e) {
    const t = e.target;
    const add = t.closest("[data-add]");
    if (add) return addItem(add.dataset.add);
    const sm = t.closest("[data-secmenu]");
    if (sm) return secMenu(sm, sm.dataset.secmenu);
    const box = t.closest("[data-item]");
    if (!box) return;
    const id = box.dataset.item;
    if (!box.classList.contains("active")) {
      if (locate(id).item.locked && user.role !== "مدير") return toast("هذا جزء رسمي ثابت من الإدارة، يعدله مدير المنصة");
      return activate(id, false);
    }
    const it = locate(id).item;
    const b = t.closest("button, [data-keyopt]");
    if (!b) return;
    const d = b.dataset;
    if (d.typemenu !== undefined) return typeMenu(b, it);
    if (d.more !== undefined) return moreMenu(b, it);
    if (d.del !== undefined) return deleteItem(id);
    if (d.dup !== undefined) return dupItem(id);
    if (d.addopt !== undefined) { it.options.push({ label: "الخيار " + toAr(it.options.length + 1) }); markDirty(); return renderQuestions(`[data-item="${id}"] [data-opt="${it.options.length - 1}"]`); }
    if (d.addother !== undefined) { it.other = true; markDirty(); return renderQuestions(); }
    if (d.rmother !== undefined) { it.other = false; delete it.otherGo; markDirty(); return renderQuestions(); }
    if (d.rmopt) { const o = it.options.splice(+d.rmopt, 1)[0]; if (it.quiz && it.quiz.key) it.quiz.key = it.quiz.key.filter((k) => k !== o.label); markDirty(); return renderQuestions(); }
    if (d.addrow !== undefined) { it.rows.push({ id: S.uid(6), label: "الصف " + toAr(it.rows.length + 1) }); markDirty(); return renderQuestions(`[data-item="${id}"] [data-row="${it.rows.length - 1}"]`); }
    if (d.addcol !== undefined) { it.cols.push({ label: "العمود " + toAr(it.cols.length + 1) }); markDirty(); return renderQuestions(`[data-item="${id}"] [data-col="${it.cols.length - 1}"]`); }
    if (d.rmrow) { it.rows.splice(+d.rmrow, 1); markDirty(); return renderQuestions(); }
    if (d.rmcol) { it.cols.splice(+d.rmcol, 1); markDirty(); return renderQuestions(); }
    if (d.keymode !== undefined) { keyMode = id; return renderQuestions(); }
    if (d.keydone !== undefined) { keyMode = null; if (it.quiz && it.quiz.key) it.quiz.key = it.quiz.key.filter((k) => String(k).trim()); markDirty(); return renderQuestions(); }
    if (d.addkey !== undefined) { it.quiz.key = (it.quiz.key.length ? it.quiz.key : [""]).concat([""]); markDirty(); return renderQuestions(`[data-item="${id}"] [data-keytext="${it.quiz.key.length - 1}"]`); }
    if (d.rmkey) { it.quiz.key.splice(+d.rmkey, 1); markDirty(); return renderQuestions(); }
    if (d.keyopt) {
      const label = it.options[+d.keyopt].label, k = it.quiz.key || [];
      if (it.type === "checkbox") it.quiz.key = k.includes(label) ? k.filter((x) => x !== label) : k.concat([label]);
      else it.quiz.key = k.includes(label) ? [] : [label];
      if (!it.quiz.points) it.quiz.points = 1;
      markDirty(); return renderQuestions();
    }
  }
  // السحب والإفلات لإعادة الترتيب (على الحاسب)
  let dragId = null;
  function edDragStart(e) { const el = e.target.closest(".ed-item:not(.active)"); if (!el) return; dragId = el.dataset.item; el.classList.add("dragging"); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); }
  function edDragOver(e) { if (!dragId) return; const el = e.target.closest(".ed-item"); $$(".drop-before").forEach((x) => x !== el && x.classList.remove("drop-before")); if (el && el.dataset.item !== dragId) { e.preventDefault(); el.classList.add("drop-before"); } }
  function edDrop(e) {
    if (!dragId) return;
    const el = e.target.closest(".ed-item");
    e.preventDefault();
    if (el && el.dataset.item !== dragId) {
      const from = locate(dragId);
      from.sec.items.splice(from.ii, 1);
      const to = locate(el.dataset.item);
      to.sec.items.splice(to.ii, 0, from.item);
      markDirty();
    }
    dragId = null;
    renderQuestions();
  }
  function edDragEnd() { dragId = null; $$(".dragging, .drop-before").forEach((x) => x.classList.remove("dragging", "drop-before")); }

  // ——— الإعدادات ———
  const toLocal = (iso) => { if (!iso) return ""; const d = new Date(iso); if (isNaN(d)) return ""; const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
  function setRow(title, text, control, sub = "", subOpen = false) {
    return `<div class="set-row"><div class="set-text"><strong>${title}</strong>${text ? `<span>${text}</span>` : ""}</div>${control}</div>${sub ? `<div class="set-sub" ${subOpen ? "" : "hidden"}>${sub}</div>` : ""}`;
  }
  function renderSettings() {
    const s = cur.survey, st = s.settings, qz = st.quiz;
    const others = users.filter((u) => u !== s.owner);
    const segS = (key, opts, val) => `<div class="seg" role="radiogroup">${opts.map(([v, l]) => `<label class="${val === v ? "checked" : ""}"><input type="radio" name="set_${key}" value="${v}" data-set="${key}" ${val === v ? "checked" : ""}>${l}</label>`).join("")}</div>`;
    const swS = (key, on) => `<label class="switch"><input type="checkbox" data-set="${key}" ${on ? "checked" : ""}><span class="track"></span></label>`;
    $("#tabHost").innerHTML = `<div class="set-wrap step">
      <section class="card set-card"><h2 class="card-title">${icon("link")} الرابط</h2>
        <label class="field"><span class="field-label">رابط مخصص باسم الفريق أو البرنامج</span>
          <div class="slug-box"><span class="slug-pre" dir="ltr">${esc(U.formUrl("").replace(/^https?:\/\//, ""))}</span><input class="input" dir="ltr" data-slug value="${esc(s.slug || "")}" placeholder="${esc(s.id)}" aria-label="الرابط المخصص"></div>
          <span class="hint">حروف إنجليزية أو عربية وأرقام وشرطات، مثل alnoor أو ghars-1448. إن تركته فارغا يبقى الرابط بالمعرف. الرابط القديم بالمعرف يظل يعمل.</span></label>
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("clock")} استقبال الردود</h2>
        ${setRow("تستقبل الردود", "إذا أوقفتها يظهر للمجيب أن الاستبانة مغلقة", swS("accepting", st.accepting))}
        <div class="set-sub"><label class="field"><span class="field-label">رسالة الإغلاق (اختياري)</span><textarea class="textarea" data-set="closedMessage" placeholder="مثل: انتهت فترة التسجيل، شكرا لاهتمامكم">${esc(st.closedMessage || "")}</textarea></label></div>
        ${setRow("موعد الفتح", "تفتح الاستبانة تلقائيا في هذا الوقت", `<input class="input" type="datetime-local" data-set="opensAt" value="${toLocal(st.opensAt)}" style="width:auto" aria-label="موعد الفتح">`)}
        ${setRow("موعد الإغلاق", "تغلق الاستبانة تلقائيا بعد هذا الوقت", `<input class="input" type="datetime-local" data-set="closesAt" value="${toLocal(st.closesAt)}" style="width:auto" aria-label="موعد الإغلاق">`)}
        ${setRow("الحد الأعلى للردود", "تغلق بعد هذا العدد. اتركه صفرا بلا حد", `<input class="input" type="number" min="0" inputmode="numeric" data-set="maxResponses" value="${esc(st.maxResponses || 0)}" style="width:110px" aria-label="الحد الأعلى للردود">`)}
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("list")} الردود</h2>
        ${setRow("جمع البريد الإلكتروني", "يظهر في أول الاستبانة ويحفظ مع الرد", segS("collectEmail", [["off", "لا"], ["optional", "اختياري"], ["required", "مطلوب"]], st.collectEmail))}
        ${st.collectEmail !== "off" ? setRow("إرسال نسخة من الرد للمجيب", "تصل إلى البريد الذي كتبه", swS("sendCopy", st.sendCopy)) : ""}
        ${setRow("رد واحد لكل مجيب", st.collectEmail === "required" ? "يمنع تكرار البريد نفسه، ويمنع الإرسال مرة ثانية من الجهاز نفسه" : "يمنع الإرسال مرة ثانية من الجهاز نفسه. لمنع أقوى اجعل البريد مطلوبا", swS("oneResponse", st.oneResponse))}
        ${setRow("تعديل الرد بعد الإرسال", "يحصل المجيب على رابط خاص يعدل به رده", swS("allowEdit", st.allowEdit))}
        ${setRow("رابط لإرسال رد آخر", "يظهر في صفحة الشكر", swS("allowAnother", st.allowAnother))}
        ${setRow("عرض ملخص الردود للمجيبين", "يرون الرسوم البيانية لأسئلة الاختيار فقط، بلا إجابات نصية", swS("showSummary", st.showSummary))}
        <div class="set-row" style="display:block"><label class="field"><span class="field-label">رسالة الشكر بعد الإرسال</span><textarea class="textarea" data-set="confirmation" placeholder="وصل ردك، شكرا لك">${esc(st.confirmation || "")}</textarea></label></div>
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("eye")} العرض</h2>
        ${setRow("شريط التقدم", "يظهر للمجيب في أعلى الصفحة", swS("showProgress", st.showProgress))}
        ${setRow("ترقيم الأسئلة", "", swS("numbered", st.numbered))}
        ${setRow("ترتيب الأسئلة عشوائيا", "داخل كل قسم، لكل مجيب ترتيب مختلف", swS("shuffle", st.shuffle))}
        ${setRow("لون الاستبانة", "", `<div class="accent-pick" role="radiogroup" aria-label="لون الاستبانة">${[["navy", "#1C437D", "كحلي"], ["teal", "#27B5C1", "فيروزي"], ["green", "#6CBD53", "أخضر"]].map(([v, c, l]) => `<label class="${s.theme.accent === v ? "checked" : ""}" style="background:${c}" title="${l}"><input type="radio" name="accent" value="${v}" data-accent ${s.theme.accent === v ? "checked" : ""} aria-label="${l}"></label>`).join("")}</div>`)}
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("quiz")} اختبار</h2>
        ${setRow("جعلها اختبارا", "لكل سؤال درجة ومفتاح إجابة، ويصحح الرد تلقائيا", swS("quiz.on", qz.on))}
        ${qz.on ? setRow("إظهار النتيجة", "", segS("quiz.release", [["now", "فور الإرسال"], ["later", "لاحقا"]], qz.release)) +
          (qz.release === "now" ? setRow("الأسئلة التي أخطأ فيها", "", swS("quiz.showMissed", qz.showMissed)) + setRow("الإجابات الصحيحة", "", swS("quiz.showCorrect", qz.showCorrect)) : "") +
          setRow("درجة كل سؤال", "تظهر للمجيب بجانب السؤال", swS("quiz.showPoints", qz.showPoints)) : ""}
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("lock")} الحماية والإشعارات</h2>
        ${setRow("رمز الاستبانة", "إذا كتبت رمزا لا تفتح الاستبانة إلا به. أرسله مع الرابط", `<input class="input" data-set="accessCode" value="${esc(st.accessCode || "")}" placeholder="بلا رمز" style="width:160px" dir="ltr" aria-label="رمز الاستبانة">`)}
        <div class="set-row" style="display:block"><label class="field"><span class="field-label">تنبيه بالبريد عند كل رد جديد</span><input class="input" dir="ltr" data-set="notifyEmails" value="${esc(st.notifyEmails || "")}" placeholder="name@gheras.sa, other@gheras.sa"><span class="hint">افصل بين العناوين بفاصلة. اتركه فارغا بلا تنبيه</span></label></div>
      </section>

      <section class="card set-card"><h2 class="card-title">${icon("user")} الصلاحيات</h2>
        ${setRow("المالك", "", `<span class="chip">${esc(s.owner || user.name)}</span>`)}
        ${others.length ? `<div class="set-row" style="display:block"><div class="set-text" style="margin-bottom:10px"><strong>المتعاونون</strong><span>يستطيعون تعديل الاستبانة ورؤية ردودها</span></div>
          <div class="seg" role="group">${others.map((u) => `<label class="${(s.editors || []).includes(u) ? "checked" : ""}"><input type="checkbox" data-editor="${esc(u)}" ${(s.editors || []).includes(u) ? "checked" : ""}>${esc(u)}</label>`).join("")}</div></div>` : ""}
        <div class="set-row"><div class="set-text"><strong>حذف الاستبانة</strong><span>يتوقف الرابط، وتبقى الردود في قوقل شيتس</span></div><button class="btn btn-danger btn-sm" type="button" data-act="delete">${icon("trash", 18)} حذف</button></div>
      </section>
    </div>`;
    const sub = $(".set-sub");
    if (sub) sub.hidden = !!st.accepting;
  }
  function setInput(e) {
    const t = e.target, d = t.dataset, s = cur.survey, st = s.settings;
    if (d.slug !== undefined) {
      s.slug = S.slugify(t.value);
      if (e.type === "change") t.value = s.slug;
      return markDirty();
    }
    if (d.set === undefined && d.accent === undefined && d.editor === undefined) return;
    if (d.accent !== undefined) { s.theme.accent = t.value; document.documentElement.dataset.accent = t.value; $$(".accent-pick label").forEach((l) => l.classList.toggle("checked", l.querySelector("input").checked)); return markDirty(); }
    if (d.editor !== undefined) {
      const set = new Set(s.editors || []); if (t.checked) set.add(d.editor); else set.delete(d.editor);
      s.editors = [...set]; t.closest("label").classList.toggle("checked", t.checked); return markDirty();
    }
    const [a, b] = d.set.split(".");
    const target = b ? st[a] : st, key = b || a;
    let v;
    if (t.type === "checkbox") v = t.checked;
    else if (t.type === "number") v = Math.max(0, parseInt(S.digits(t.value), 10) || 0);
    else if (t.type === "datetime-local") v = t.value ? new Date(t.value).toISOString() : "";
    else v = t.value;
    if (e.type === "input" && (t.type === "checkbox" || t.type === "radio")) return;
    target[key] = v;
    markDirty();
    if (t.type === "radio") $$(`[name="${t.name}"]`).forEach((i) => i.closest("label").classList.toggle("checked", i.checked));
    if (d.set === "accepting") { const sub = $(".set-sub"); if (sub) sub.hidden = v; }
    if (["collectEmail", "quiz.on", "quiz.release"].includes(d.set)) renderSettings();
  }

  // ——— الردود ———
  async function loadResponses(force) {
    if (resp && !force) return true;
    const r = await call({ action: "responses", id: cur.survey.id });
    if (!r.ok) { toast(r.error || "تعذر تحميل الردود"); return false; }
    resp = r.list.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    cur.count = resp.length;
    if (r.sheetUrl) cur.sheetUrl = r.sheetUrl;
    return true;
  }
  async function renderResponses(force) {
    const host = $("#tabHost");
    if (!resp || force) host.innerHTML = `<div class="resp-wrap step"><div class="empty">${icon("refresh", 30)}<p>جار تحميل الردود…</p></div></div>`;
    if (!(await loadResponses(force))) return;
    if (tab !== "responses") return;
    const s = cur.survey, st = s.settings, n = resp.length;
    const reason = S.closedReason(s, n);
    const badge = $('[data-tab-go="responses"]');
    if (badge) badge.innerHTML = `${icon("chart", 18)}الردود${n ? `<span class="badge">${toAr(n)}</span>` : ""}`;
    const qs = S.questions(s);
    if (!respQ || !qs.some((q) => q.id === respQ)) respQ = (qs[0] || {}).id || "";
    respIdx = Math.min(respIdx, Math.max(0, n - 1));
    let content = "";
    if (!n) content = `<div class="card empty">${icon("chart", 34)}<p>لا توجد ردود بعد. شارك الرابط لتبدأ الردود بالوصول</p><button class="btn btn-primary" type="button" data-act="share">${icon("send", 18)} مشاركة</button></div>`;
    else if (respView === "summary") {
      let quizCard = "";
      if (st.quiz.on) {
        const grades = resp.map((r) => S.grade(s, r.answers)).filter(Boolean);
        const tot = grades.length ? grades[0].total : 0;
        const avg = grades.length ? grades.reduce((a, g) => a + g.earned, 0) / grades.length : 0;
        const dist = {};
        grades.forEach((g) => { dist[g.earned] = (dist[g.earned] || 0) + 1; });
        quizCard = `<section class="card sum-card"><div class="sum-head"><h3>نتائج الاختبار</h3><span class="chip">${toAr(grades.length)} ${rCount(grades.length)}</span></div>
          <div class="avg"><span class="avg-num">${toAr(avg.toFixed(1))}</span><span class="hint">متوسط الدرجة من ${toAr(tot)}</span></div>
          ${U.bars(Object.keys(dist).map(Number).sort((a, b) => b - a).map((k) => ({ label: toAr(k) + " / " + toAr(tot), n: dist[k] })), grades.length)}</section>`;
      }
      content = quizCard + U.summaryHTML(S.summary(s, resp.map((r) => r.answers)));
    } else if (respView === "question") {
      const it = S.findItem(s, respQ);
      const groups = {};
      resp.forEach((r) => {
        if (S.TYPES[it.type].grid) it.rows.forEach((row) => { const v = S.cellText(it, r.answers[it.id], row.id); if (v) { const k = row.label + ": " + v; groups[k] = (groups[k] || 0) + 1; } });
        else { const v = S.cellText(it, r.answers[it.id]); if (v) groups[v] = (groups[v] || 0) + 1; }
      });
      const keys = Object.keys(groups).sort((a, b) => groups[b] - groups[a]);
      content = `<div class="card"><div class="field"><label for="respQ">السؤال</label><span class="select-wrap"><select class="input select" id="respQ" data-respq>${qs.map((q, i) => `<option value="${q.id}" ${q.id === respQ ? "selected" : ""}>${toAr(i + 1)}. ${esc((q.title || "سؤال بلا عنوان").slice(0, 80))}</option>`).join("")}</select>${icon("caret", 18)}</span></div></div>
        ${U.summaryHTML([S.aggregate(it, resp.map((r) => r.answers[it.id]))])}
        <section class="card sum-card"><div class="sum-head"><h3>كل الإجابات</h3><span class="chip">${toAr(keys.length)} إجابة مختلفة</span></div>
          ${keys.length ? `<ul class="texts" style="max-height:none">${keys.map((k) => `<li>${esc(k)}${groups[k] > 1 ? ` <span class="chip">×${toAr(groups[k])}</span>` : ""}</li>`).join("")}</ul>` : `<p class="hint">لا توجد إجابات</p>`}</section>`;
    } else {
      const r = resp[n - 1 - respIdx];
      const g = S.grade(s, r.answers);
      const marks = {};
      if (g) g.items.forEach((x) => (marks[x.id] = x));
      content = `<div class="one-nav"><button class="icon-btn" type="button" data-one="-1" ${respIdx === 0 ? "disabled" : ""} aria-label="الأحدث">${icon("back")}</button>
          <span class="dock-count">${toAr(respIdx + 1)} من ${toAr(n)}</span>
          <button class="icon-btn" type="button" data-one="1" ${respIdx >= n - 1 ? "disabled" : ""} aria-label="الأقدم">${icon("fwd")}</button>
          <button class="icon-btn danger" type="button" data-delresp="${esc(r.ref)}" aria-label="حذف هذا الرد" title="حذف هذا الرد">${icon("trash")}</button></div>
        <section class="card">
          <div class="one-head"><span>${icon("clock", 14)} ${U.fmtDate(r.time, true)}</span><span dir="ltr">${esc(r.ref)}</span>${r.email ? `<span dir="ltr">${esc(r.email)}</span>` : ""}${g ? `<span class="chip">الدرجة ${toAr(g.earned)} / ${toAr(g.total)}</span>` : ""}</div>
          ${qs.map((q) => {
            const a = r.answers[q.id];
            let txt = "";
            if (S.TYPES[q.type].grid) txt = q.rows.map((row) => { const v = S.cellText(q, a, row.id); return v ? esc(row.label) + ": " + esc(v) : ""; }).filter(Boolean).join("<br>");
            else if (q.type === "file" && Array.isArray(a)) txt = a.map((f) => `<a href="${esc(f.url)}" target="_blank" rel="noopener" dir="ltr">${esc(f.name)}</a>`).join("<br>");
            else txt = esc(S.cellText(q, a));
            const m = marks[q.id];
            return `<div class="one-a"><span class="q-t">${esc(q.title || "سؤال بلا عنوان")}${m ? `<span class="mark ${m.ok ? "ok" : "no"}">${m.ok ? "صحيحة" : "خاطئة"} ${toAr(m.earned)}/${toAr(m.points)}</span>` : ""}</span><span class="a-t ${txt ? "" : "none"}">${txt || "لم يجب"}</span></div>`;
          }).join("")}
        </section>`;
    }
    host.innerHTML = `<div class="resp-wrap step">
      <section class="card resp-head">
        <div class="resp-top"><div class="resp-count">${toAr(n)}<small>${rCount(n)}</small></div>
          <label class="switch"><input type="checkbox" data-accepting ${st.accepting ? "checked" : ""}><span class="track"></span><span class="sw-label">تستقبل الردود</span></label></div>
        ${reason ? `<div class="closed-note">${icon("lock", 18)} ${{ closed: "الاستبانة مغلقة ولا تستقبل ردودا", notyet: "لم يحن موعد فتح الاستبانة", ended: "انتهى موعد الإغلاق", full: "اكتمل الحد الأعلى للردود" }[reason]}</div>` : ""}
        <div class="resp-tools">
          ${cur.sheetUrl ? `<a class="btn btn-soft btn-sm" href="${esc(cur.sheetUrl)}" target="_blank" rel="noopener">${icon("sheet", 18)} فتح في قوقل شيتس</a>` : ""}
          <button class="btn btn-soft btn-sm" type="button" data-act="csv" ${n ? "" : "disabled"}>${icon("download", 18)} تنزيل CSV</button>
          <button class="btn btn-soft btn-sm" type="button" data-act="reload">${icon("refresh", 18)} تحديث</button>
        </div>
      </section>
      ${n ? `<div class="seg" role="radiogroup" style="margin:0 0 18px">${[["summary", "الملخص"], ["question", "حسب السؤال"], ["one", "كل رد"]].map(([v, l]) => `<label class="${respView === v ? "checked" : ""}"><input type="radio" name="respView" value="${v}" data-respview ${respView === v ? "checked" : ""}>${l}</label>`).join("")}</div>` : ""}
      ${content}
    </div>`;
  }
  function downloadCsv() {
    const s = cur.survey, cols = S.columns(s), quiz = s.settings.quiz.on;
    const head = ["رقم المرجع", "وقت الإرسال"].concat(s.settings.collectEmail !== "off" ? ["البريد الإلكتروني"] : [], quiz ? ["الدرجة"] : [], cols.map((c) => c.title));
    const rows = resp.map((r) => {
      const g = quiz ? S.grade(s, r.answers) : null;
      return [r.ref, new Date(r.time).toLocaleString("en-GB")].concat(s.settings.collectEmail !== "off" ? [r.email || ""] : [], quiz ? [g ? g.earned + "/" + g.total : ""] : [], cols.map((c) => S.cellFor(s, c.key, r.answers)));
    });
    const q = (v) => { const t = String(v == null ? "" : v); return /[",\n\r]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t; };
    const csv = "﻿" + [head].concat(rows).map((r) => r.map(q).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = (s.title || "ردود").replace(/[\\/:*?"<>|]/g, "") + ".csv";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  async function respClick(e) {
    const b = e.target.closest("[data-one],[data-delresp]");
    if (!b) return;
    if (b.dataset.one) { respIdx += +b.dataset.one; return renderResponses(); }
    const ok = await U.confirmBox("حذف هذا الرد؟", "يحذف من المنصة ومن ورقة الردود في قوقل شيتس، ولا يمكن استرجاعه.", "حذف", true);
    if (!ok) return;
    const r = await call({ action: "delResponse", id: cur.survey.id, ref: b.dataset.delresp });
    if (!r.ok) return toast(r.error || "تعذر الحذف");
    toast("حذف الرد");
    renderResponses(true);
  }
  function respChange(e) {
    const t = e.target;
    if (t.dataset.respview !== undefined) { respView = t.value; return renderResponses(); }
    if (t.dataset.respq !== undefined) { respQ = t.value; return renderResponses(); }
    if (t.dataset.accepting !== undefined) { cur.survey.settings.accepting = t.checked; markDirty(); flushSave().then(() => renderResponses()); }
  }

  // ——— المعاينة والمشاركة ———
  function preview(mode) {
    K.storage((ls) => ls.setItem("gheras-surveys-preview", JSON.stringify(cur.survey)));
    window.open("/form.html?preview=1" + (mode ? "&mode=" + mode : ""), "_blank", "noopener");
  }
  let qrLoading = null;
  function loadQr() {
    if (window.QRCode) return Promise.resolve();
    if (!qrLoading) qrLoading = new Promise((res, rej) => {
      const sc = document.createElement("script");
      sc.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";
      sc.onload = res; sc.onerror = () => { qrLoading = null; rej(); };
      document.head.appendChild(sc);
    });
    return qrLoading;
  }
  async function share(id) {
    let s = cur && cur.survey.id === id ? cur.survey : null, count = cur && cur.survey.id === id ? cur.count : 0;
    if (!s) { const r = await call({ action: "get", id }); if (!r.ok) return toast(r.error); s = r.survey; count = r.count; }
    if (cur && cur.survey.id === id) await flushSave();
    const url = U.formUrl(s.slug || id);
    const reason = S.closedReason(s, count);
    const text = (s.title || "استبانة") + "\n" + url + (s.settings.accessCode ? "\nرمز الاستبانة: " + s.settings.accessCode : "");
    const m = U.modal(`<h2 class="modal-title">مشاركة الاستبانة</h2>
      <p class="modal-text">${esc(s.title || "")}</p>
      ${reason ? `<div class="warn-box">${icon("lock", 18)}<span>الاستبانة لا تستقبل ردودا الآن. فعّل الاستقبال من الإعدادات قبل إرسال الرابط.</span></div>` : ""}
      ${s.settings.accessCode ? `<div class="warn-box">${icon("lock", 18)}<span>الاستبانة محمية برمز <bdi dir="ltr">${esc(s.settings.accessCode)}</bdi>. أرسله مع الرابط.</span></div>` : ""}
      <div class="link-box"><input class="input" dir="ltr" readonly value="${esc(url)}" aria-label="رابط الاستبانة" id="shareUrl"><button class="btn btn-primary" type="button" data-copy>${icon("copy", 18)} نسخ</button></div>
      <div class="share-row">
        <a class="btn btn-soft btn-sm" href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener">${icon("chat", 18)} واتساب</a>
        <a class="btn btn-soft btn-sm" href="mailto:?subject=${encodeURIComponent(s.title || "استبانة")}&body=${encodeURIComponent(text)}">${icon("mail", 18)} بريد</a>
        <a class="btn btn-soft btn-sm" href="${esc(url)}" target="_blank" rel="noopener">${icon("link", 18)} فتح الرابط</a>
        <button class="btn btn-soft btn-sm" type="button" data-qr>${icon("qr", 18)} رمز QR</button>
        ${cur && cur.survey.id === id ? `<button class="btn btn-soft btn-sm" type="button" data-prefill>${icon("edit", 18)} رابط معبأ مسبقا</button>` : ""}
      </div>
      <div id="qrHost" hidden style="margin-top:18px"></div>
      <div class="modal-actions"><button class="btn btn-ghost" type="button" data-close>إغلاق</button></div>`, { wide: true });
    m.el.addEventListener("click", async (e) => {
      if (e.target.closest("[data-copy]")) { toast((await U.copy(url)) ? "نسخ الرابط" : "انسخ الرابط يدويا"); $("#shareUrl").select(); }
      if (e.target.closest("[data-prefill]")) { m.close(); preview("prefill"); }
      if (e.target.closest("[data-qr]")) {
        const host = $("#qrHost");
        host.hidden = false;
        host.innerHTML = `<div class="qr-box"><div id="qrCode"></div><button class="btn btn-soft btn-sm" type="button" data-qrdl>${icon("download", 18)} تنزيل الصورة</button></div>`;
        try {
          await loadQr();
          new window.QRCode($("#qrCode"), { text: url, width: 440, height: 440, colorDark: "#1C437D", colorLight: "#FFFFFF", correctLevel: window.QRCode.CorrectLevel.M });
        } catch (err) { host.innerHTML = `<p class="hint">تعذر تحميل مولد الرمز. تحقق من الاتصال.</p>`; }
      }
      if (e.target.closest("[data-qrdl]")) {
        const c = $("#qrCode canvas");
        if (!c) return;
        const a = document.createElement("a");
        a.href = c.toDataURL("image/png"); a.download = "رمز " + (s.title || "الاستبانة") + ".png"; a.click();
      }
    });
  }

  // ——— الأحداث العامة ———
  function onClick(e) {
    const t = e.target;
    const tg = t.closest("[data-tab-go]");
    if (tg) { go(`#/s/${cur.survey.id}/${tg.dataset.tabGo}`); return; }
    const tpl = t.closest("[data-tpl]");
    if (tpl) return createFrom(tpl.dataset.tpl);
    const op = t.closest("[data-open]");
    if (op) return go(`#/s/${op.dataset.open}/${op.dataset.tab || "questions"}`);
    const sh = t.closest("[data-share]");
    if (sh) return share(sh.dataset.share);
    const cm = t.closest("[data-cardmenu]");
    if (cm) {
      const s = surveys.find((x) => x.id === cm.dataset.cardmenu);
      return openMenu(cm, [
        { id: "settings", label: "الإعدادات", icon: "settings", fn: () => go(`#/s/${s.id}/settings`) },
        { id: "dup", label: "نسخة مكررة", icon: "dup", fn: () => duplicate(s.id) },
        "-",
        { id: "del", label: "حذف", icon: "trash", danger: true, fn: () => removeSurvey(s.id, s.title) }
      ]);
    }
    const act = t.closest("[data-act]");
    if (act) {
      const a = act.dataset.act;
      if (a === "logout") return logout();
      if (a === "preview") return preview();
      if (a === "share") return share(cur.survey.id);
      if (a === "delete") return removeSurvey(cur.survey.id, cur.survey.title);
      if (a === "csv") return downloadCsv();
      if (a === "reload") return renderResponses(true);
    }
    if (cur && tab === "questions" && t.closest("#tabHost")) edClick(e);
    if (cur && tab === "responses" && t.closest("#tabHost")) respClick(e);
  }
  function onInput(e) {
    const t = e.target;
    if (t.id === "listSearch") { query = t.value; return renderGrid(); }
    if (!cur || !t.closest("#tabHost")) return;
    if (tab === "questions") edInput(e);
    else if (tab === "settings") setInput(e);
  }
  function onChange(e) {
    const t = e.target;
    if (t.name === "listFilter") { filter = t.value; $$('[name="listFilter"]').forEach((i) => i.closest("label").classList.toggle("checked", i.checked)); return renderGrid(); }
    if (!cur || !t.closest("#tabHost")) return;
    if (tab === "questions") edChange(e);
    else if (tab === "settings") setInput(e);
    else respChange(e);
  }

  async function init() {
    K.theme.init();
    const app = $("#screenApp");
    document.addEventListener("click", onClick);
    app.addEventListener("input", onInput);
    app.addEventListener("change", onChange);
    app.addEventListener("keydown", (e) => { if (cur && tab === "questions") edKeydown(e); const st = e.target.closest(".s-title"); if (st && e.key === "Enter") st.click(); });
    app.addEventListener("paste", (e) => { if (cur && tab === "questions") edPaste(e); });
    app.addEventListener("dragstart", edDragStart);
    app.addEventListener("dragover", edDragOver);
    app.addEventListener("drop", edDrop);
    app.addEventListener("dragend", edDragEnd);
    $("#backBtn").addEventListener("click", () => go("#/"));
    window.addEventListener("hashchange", route);

    K.portalGate({
      emptyMsg: "أدخل رمزك الشخصي",
      verify: async (code) => {
        const r = await API.call({ action: "login", code });
        if (r.ok) { token = r.token; user = r.user; K.storage((ls) => ls.setItem(TOKEN_KEY, JSON.stringify({ token, user }))); }
        return r;
      },
      onEnter: async () => {
        show("app");
        if (!API.configured) toast("وضع التجربة: البيانات محفوظة في هذا المتصفح فقط", 4200);
        route();
      }
    });

    const saved = K.storage((ls) => ls.getItem(TOKEN_KEY));
    if (saved) {
      try { const v = JSON.parse(saved); token = v.token; user = v.user; } catch (e) { token = ""; }
    }
    if (token && user) { show("app"); route(); }
    else { show("gate"); setTimeout(() => $("#accessCode").focus({ preventScroll: true }), 300); }
  }
  init();
})();
