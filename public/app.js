/* نموذج تقييم البرامج القائمة — منطق الواجهة
   لا يخزن شيء على الخادم هنا؛ كل الإرسال يذهب إلى Google Apps Script ثم قوقل شيتس.
   المسودة فقط تحفظ في جهاز المعبئ (localStorage) وتحذف بعد الإرسال. */
(function () {
  "use strict";

  const CFG = window.GHERAS_CONFIG || {};
  const FORM = window.GHERAS_FORM;
  const AXES = FORM.axes;
  const LETTERS = ["أ", "ب", "ج", "د"];
  const ORD = ["", "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
  const DRAFT_KEY = "gheras-eval-draft-v1";
  const CODE_KEY = "gheras-eval-code";
  const STEP_COUNT = AXES.length + 2; // بيانات + ٧ محاور + مراجعة
  const NEW_PROGRAM_REASON = "برنامج جديد لم تسبق له دورة منتهية";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const toAr = (v) => String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const qid = (a, q) => `a${a.n}q${q.n}`;
  const qLabel = (a, q) => `${toAr(q.n)}-${toAr(a.n)}`;

  // ——— الحالة ———
  let state = freshState();
  const files = {}; // qid → File[] (في الذاكرة فقط)
  let code = "";
  let saveTimer = null;

  function freshState() {
    return { data: {}, answers: {}, open: { good: "", bad: "" }, step: 0, startedAt: new Date().toISOString() };
  }

  function storage(fn) { try { return fn(window.localStorage); } catch (e) { return null; } }

  function saveDraft() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = storage((ls) => { ls.setItem(DRAFT_KEY, JSON.stringify({ ...state, savedAt: Date.now() })); return true; });
      const el = $("#saveState");
      if (ok) { el.textContent = "حفظت المسودة"; el.style.opacity = 1; setTimeout(() => (el.style.opacity = 0), 1600); }
    }, 350);
  }

  function loadDraft() {
    const raw = storage((ls) => ls.getItem(DRAFT_KEY));
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
  }

  function clearDraft() { clearTimeout(saveTimer); storage((ls) => ls.removeItem(DRAFT_KEY)); }

  // ——— أدوات ———
  function toast(msg, ms = 2600) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), ms);
  }

  function show(id) {
    ["screenGate", "screenSteps", "screenDone"].forEach((s) => ($("#" + s).hidden = s !== id));
    const inForm = id === "screenSteps";
    $("#topbar").hidden = !inForm;
    $("#dock").hidden = !inForm;
    document.body.classList.toggle("stage-mode", !inForm);
    document.querySelector('meta[name="theme-color"]').content = inForm ? getComputedStyle(document.body).backgroundColor : "#0D2142";
    window.scrollTo(0, 0);
    stageLight(inForm ? null : $("#" + id));
  }

  // ——— الإضاءة التي تتبع المؤشر في شاشتي الدخول والخاتمة ———
  let light = null;
  function stageLight(el) {
    if (light) { cancelAnimationFrame(light.raf); light = null; }
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const r = el.getBoundingClientRect();
    light = { el, x: r.width * 0.3, y: r.height * 0.42, tx: r.width * 0.3, ty: r.height * 0.42, last: 0, raf: 0, t0: performance.now() };
    const logo = $(".stage-logo", el);
    const tick = (now) => {
      if (!light || light.el !== el) return;
      const rect = el.getBoundingClientRect();
      if (now - light.last > 2600 && !reduce) { // لا مؤشر: تتجول الإضاءة ببطء حول الشعار
        const t = (now - light.t0) / 1000;
        // على الشاشات العريضة تتجول في المساحة اليسرى، وعلى الجوال حول النص
        const wide = rect.width > 760;
        light.tx = rect.width * (wide ? 0.3 : 0.5) + Math.sin(t * 0.45) * Math.min(220, rect.width * (wide ? 0.18 : 0.32));
        light.ty = rect.height * (wide ? 0.45 : 0.32) + Math.sin(t * 0.7) * 110;
      }
      light.x += (light.tx - light.x) * 0.08;
      light.y += (light.ty - light.y) * 0.08;
      el.style.setProperty("--mx", light.x.toFixed(1) + "px");
      el.style.setProperty("--my", light.y.toFixed(1) + "px");
      if (logo) {
        const lr = logo.getBoundingClientRect();
        const cx = lr.left - rect.left + lr.width / 2, cy = lr.top - rect.top + lr.height / 2;
        const dx = light.x - cx, dy = light.y - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300) * 26;
        logo.style.setProperty("--hx", ((dx / d) * k).toFixed(1) + "px");
        logo.style.setProperty("--hy", ((dy / d) * k).toFixed(1) + "px");
      }
      light.raf = requestAnimationFrame(tick);
    };
    light.raf = requestAnimationFrame(tick);
  }
  function onPointer(e) {
    if (!light) return;
    const rect = light.el.getBoundingClientRect();
    light.tx = e.clientX - rect.left;
    light.ty = e.clientY - rect.top;
    light.last = performance.now();
  }

  // ——— الوضع الليلي والنهاري ———
  const THEME_KEY = "gheras-theme";
  const darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
  const currentTheme = () => document.documentElement.getAttribute("data-theme") || (darkMQ.matches ? "dark" : "light");
  let ttBusy = false;
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    storage((ls) => ls.setItem(THEME_KEY, t));
    const b = $("#themeToggle");
    b.dataset.state = t;
    b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
    b.setAttribute("aria-label", t === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
    if (!$("#topbar").hidden) document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#0B1424" : "#EEF1F6";
  }
  function toggleTheme() {
    if (ttBusy) return;
    const b = $("#themeToggle"), man = $(".tt-man", b);
    const to = currentTheme() === "dark" ? "light" : "dark";
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setTheme(to); return; }
    ttBusy = true;
    const at = (ms, fn) => setTimeout(fn, ms);
    if (to === "light") { // يمشي الرجل إلى الحفرة ويسقط، ثم تشرق الشمس فوقها
      man.className.baseVal = "tt-man walk";
      at(700, () => { man.className.baseVal = "tt-man sink"; });
      at(1000, () => { man.className.baseVal = "tt-man"; setTheme("light"); });
      at(1500, () => { ttBusy = false; });
    } else { // يغيب الضوء فيخرج الرجل من الحفرة ويعود إلى مكانه
      man.className.baseVal = "tt-man sink";
      setTheme("dark");
      at(520, () => { man.className.baseVal = "tt-man pop"; });
      at(800, () => { man.className.baseVal = "tt-man back"; });
      at(1520, () => { man.className.baseVal = "tt-man"; ttBusy = false; });
    }
  }

  async function api(payload) {
    const res = await fetch(CFG.APPS_SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  const configured = () => /^https:\/\/script\.google\.com\//.test(CFG.APPS_SCRIPT_URL || "");

  // ——— الدخول ———
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const W = (ms) => wait(window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms);

  function shakeCard() {
    const c = $("#loginCard");
    c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
  }

  // الدخول: يمشي الرجل إلى البوابة؛ تفتح إن صح الرمز فيدخل وتختفي البطاقة، وإلا يرتد ويعود
  let gateBusy = false;
  async function handleGate(e) {
    e.preventDefault();
    if (gateBusy) return;
    const input = $("#accessCode");
    const val = input.value.trim();
    const msg = $("#gateMsg");
    if (!val) { msg.textContent = "أدخل رمز الدخول"; shakeCard(); input.focus(); return; }
    msg.textContent = "";
    gateBusy = true;
    const card = $("#loginCard"), btn = $("#portalBtn"), walker = $("#walker"), door = $(".door", btn), cap = $("#portalCaption");
    const setW = (c) => walker.setAttribute("class", "walker " + c);
    cap.classList.add("hide");
    btn.classList.add("playing");
    setW("walking");
    await wait(40);
    setW("walking at-door");
    const verify = (async () => {
      if (!configured()) return { ok: true, preview: true };
      try { return await api({ action: "verify", code: val }); } catch (err) { return { ok: false, net: true }; }
    })();
    const [r] = await Promise.all([verify, W(1200)]);
    if (r.ok) {
      setW("at-door");
      door.classList.add("open");
      await W(380);
      setW("walking at-door enter");
      await W(520);
      door.classList.remove("open");
      await W(260);
      card.classList.add("card-hide");
      await W(480);
      code = val;
      storage((ls) => ls.setItem(CODE_KEY, val));
      if (r.preview) toast("وضع المعاينة: لم يضبط رابط قوقل بعد");
      enterForm();
      card.classList.remove("card-hide");
      btn.classList.remove("playing");
      cap.classList.remove("hide");
      setW("");
    } else {
      setW("at-door bump");
      await W(170);
      setW("walking back");
      await W(920);
      setW("");
      btn.classList.remove("playing");
      cap.classList.remove("hide");
      msg.textContent = r.net ? "تعذر التحقق، تأكد من الاتصال وحاول مرة أخرى" : "رمز الدخول غير صحيح";
      shakeCard();
    }
    gateBusy = false;
  }

  function enterForm() {
    const draft = loadDraft();
    const restore = draft && draft.answers && (Object.keys(draft.answers).length || (draft.data && draft.data.program));
    state = restore ? { ...freshState(), ...draft } : freshState();
    show("screenSteps");
    renderStep();
    if (restore) toast("استعدنا مسودتك من حيث توقفت");
  }

  // ——— الشريط والتقدم ———
  function renderProgress(cur) {
    $("#progressFill").style.width = Math.max(0, Math.min(1, (cur + 1) / STEP_COUNT)) * 100 + "%";
  }

  function stepTitle(i) {
    if (i === 0) return "بيانات المبادرة";
    if (i <= AXES.length) return `المحور ${ORD[i]}: ${AXES[i - 1].title}`;
    return "سؤالان ختاميان";
  }

  // ——— قواعد الحجم والبرامج الجديدة ———
  function applyRules() {
    const size = state.data.size;
    const isNew = state.data.hasPrev === "لا";
    AXES.forEach((a) => a.questions.forEach((q) => {
      const id = qid(a, q);
      const cur = state.answers[id];
      if (q.smallNA) {
        if (size === "صغيرة") state.answers[id] = { c: "NA", reason: q.smallNA, auto: true, locked: true };
        else if (cur && cur.locked) delete state.answers[id];
      }
      if (q.newProgramNA && !(state.answers[id] && state.answers[id].locked)) {
        const c2 = state.answers[id];
        if (isNew && !c2) state.answers[id] = { c: "NA", reason: NEW_PROGRAM_REASON, auto: true };
        else if (!isNew && c2 && c2.auto && c2.reason === NEW_PROGRAM_REASON) delete state.answers[id];
      }
    }));
  }

  // ——— رسم الخطوات ———
  function renderStep() {
    const i = state.step;
    const host = $("#stepHost");
    host.innerHTML = i === 0 ? tplData() : i <= AXES.length ? tplAxis(AXES[i - 1]) : tplReview();
    host.firstElementChild.classList.add("step");
    $("#topbarTitle").textContent = stepTitle(i);
    renderProgress(i);
    $("#prevBtn").style.visibility = i === 0 ? "hidden" : "visible";
    $("#nextBtn").textContent = i === STEP_COUNT - 1 ? "إرسال التقييم" : "التالي";
    updateDock();
    if (i > 0 && i <= AXES.length) AXES[i - 1].questions.forEach((q) => renderFiles(qid(AXES[i - 1], q)));
    window.scrollTo({ top: 0 });
  }

  function updateDock() {
    const i = state.step;
    let txt = `${toAr(i + 1)} من ${toAr(STEP_COUNT)}`;
    if (i > 0 && i <= AXES.length) {
      const a = AXES[i - 1];
      const done = a.questions.filter((q) => state.answers[qid(a, q)]).length;
      txt = `أجبت ${toAr(done)} من ${toAr(a.questions.length)}`;
    }
    $("#dockCount").textContent = txt;
  }

  // بيانات المبادرة
  function seg(name, options, opts = {}) {
    const v = state.data[name];
    return `<div class="seg" data-seg="${name}" role="radiogroup">${options.map((o) =>
      `<label class="${v === o ? "checked" : ""}"><input type="radio" name="${name}" value="${esc(o)}" ${v === o ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
  }
  // اختيار متعدد بنفس شكل المقاطع
  function multi(name, options) {
    const v = Array.isArray(state.data[name]) ? state.data[name] : state.data[name] ? [state.data[name]] : [];
    return `<div class="seg" data-multi="${name}" role="group">${options.map((o) =>
      `<label class="${v.includes(o) ? "checked" : ""}"><input type="checkbox" name="${name}" value="${esc(o)}" ${v.includes(o) ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
  }

  // اسم البرنامج: خيارات من config.js، ومعها (أخرى) لكتابة اسم غير موجود
  const PROGRAMS = Array.isArray(CFG.PROGRAMS) ? CFG.PROGRAMS.filter(Boolean) : [];
  function programField() {
    if (!PROGRAMS.length) return inp("program", "اسم البرنامج", { req: true });
    const d = state.data;
    return `<div class="field"><span class="field-label">اسم البرنامج<span class="req">*</span></span>
      ${seg("programChoice", PROGRAMS.concat(["أخرى"]))}
      ${d.programChoice === "أخرى" ? `<input class="input" data-field="programOther" id="f_programOther" placeholder="اكتب اسم البرنامج" value="${esc(d.programOther || "")}" aria-label="اسم البرنامج">` : ""}
    </div>`;
  }
  function syncProgram() {
    const d = state.data;
    if (PROGRAMS.length) d.program = d.programChoice === "أخرى" ? String(d.programOther || "").trim() : d.programChoice || "";
  }

  function inp(name, label, { type = "text", req = false, ph = "", dir = "", min = "" } = {}) {
    return `<div class="field"><label for="f_${name}">${label}${req ? '<span class="req">*</span>' : ""}</label>
      <input class="input" id="f_${name}" name="${name}" type="${type}" ${dir ? `dir="${dir}"` : ""} ${min !== "" ? `min="${min}"` : ""} ${type === "number" ? 'inputmode="decimal"' : ""} placeholder="${esc(ph)}" value="${esc(state.data[name] || "")}" data-field="${name}"></div>`;
  }

  function sizeSuggestion() {
    const d = state.data;
    const why = [];
    if (+d.weeks > 2) why.push("مدة التنفيذ أكثر من أسبوعين");
    if (+d.cost > 30000) why.push("التكلفة فوق ٣٠ ألف ريال");
    if (d.donor === "يوجد" && d.donorReports === "نعم") why.push("لها جهة مانحة تشترط تقارير");
    if (!why.length || d.size === "كبيرة") return "";
    return `<div class="suggest">بحسب بياناتك تعد المبادرة كبيرة: ${why.join("، ")}.</div>`;
  }

  function tplData() {
    const d = state.data;
    return `<div class="wrap">
      <div class="step-hero"><div>
        <p class="eyebrow">قبل المحاور</p>
        <h1>بيانات المبادرة</h1>
        <p class="lead">يعبأ هذا النموذج عن آخر دورة منفذة منه</p>
      </div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="step-body">
        <div class="card"><h2 class="card-title">البرنامج والدورة</h2>
          <div class="grid">
            ${programField()}
            <div class="field"><span class="field-label">دورة المبادرة<span class="req">*</span></span>
              ${seg("season", ["فصلية", "سنوية"])}</div>
            <div class="grid grid-2">
              ${inp("startDate", "تاريخ البداية", { type: "date" })}
              ${inp("endDate", "تاريخ النهاية", { type: "date" })}
            </div>
            ${inp("manager", "مدير المبادرة", { req: true })}
            <div class="field"><span class="field-label">هل سبقت للبرنامج دورة منتهية؟<span class="req">*</span></span>
              ${seg("hasPrev", ["نعم", "لا"])}
              <p class="hint">إن لم تسبق له دورة منتهية يختار (لا ينطبق) تلقائيا في أسئلة الإغلاق والقياس اللاحق والتقرير الختامي والتطوير، ويمكنك تعديلها.</p>
            </div>
          </div>
        </div>

        <div class="card"><h2 class="card-title">المستفيد</h2>
          <div class="grid">
            <div class="field"><span class="field-label">المستفيد<span class="req">*</span> <small class="hint" style="display:inline">يمكن اختيار أكثر من واحد</small></span>
              ${multi("beneficiary", ["طفل", "عامل مع الطفل", "جهة عاملة مع الطفل"])}</div>
            <div class="grid grid-3">
              ${inp("age", "العمر", { ph: "مثال: ٨–١٢ سنة" })}
              <div class="field"><span class="field-label">الجنس</span>${seg("gender", ["ذكور", "إناث", "الجنسان"])}</div>
              ${inp("stage", "المرحلة", { ph: "مثال: الابتدائية" })}
            </div>
            <div class="grid grid-2">
              ${inp("benefTarget", "المستفيدون: المستهدف", { type: "number", min: 0 })}
              ${inp("benefRegistered", "المستفيدون: المسجلون", { type: "number", min: 0 })}
            </div>
          </div>
        </div>

        <div class="card"><h2 class="card-title">التنفيذ والتكلفة</h2>
          <div class="grid">
            <div class="grid grid-3">
              ${inp("weeks", "مدة التنفيذ (بالأسابيع)", { type: "number", min: 0, ph: "من أول نشاط إلى آخر نشاط" })}
              ${inp("actPlanned", "الأنشطة الرئيسة: المخططة", { type: "number", min: 0 })}
              ${inp("actDone", "الأنشطة الرئيسة: المنفذة", { type: "number", min: 0 })}
            </div>
            ${inp("cost", "التكلفة الفعلية (بالريال)", { type: "number", min: 0 })}
            <div class="field"><span class="field-label">المانح أو الشريك</span>${seg("donor", ["لا يوجد", "يوجد"])}</div>
            ${d.donor === "يوجد" ? `<div class="grid grid-2">
              ${inp("donorName", "اسم الجهة المانحة أو الشريكة")}
              <div class="field"><span class="field-label">هل يشترط تقارير؟</span>${seg("donorReports", ["نعم", "لا"])}</div>
            </div>` : ""}
          </div>
        </div>

        <div class="card" id="sizeCard"><h2 class="card-title">حجم المبادرة<span class="req" style="color:var(--danger)">*</span></h2>
          <div class="size-cards" role="radiogroup" data-sizegroup>
            ${["صغيرة", "كبيرة"].map((s) => `
            <label class="size-card ${d.size === s ? "checked" : ""}">
              <input type="radio" name="size" value="${s}" ${d.size === s ? "checked" : ""}>
              <span class="size-scene" aria-hidden="true">${sizeScene(s === "كبيرة")}</span>
              <h4>مبادرة ${s}</h4>
              <p>${s === "صغيرة"
                ? "نشاط واحد أو أنشطة قليلة متصلة مدتها لا تتجاوز أسبوعين وليست عليها التزامات تعاقدية مع مانح مثل: رحلة أو لقاء أو ورشة يوم أو مسابقة"
                : "ما تحقق فيها واحد أو أكثر مما يلي: مدة التنفيذ أكثر من أسبوعين أو تكلفتها فوق ٣٠ ألف ريال أو لها جهة مانحة تشترط تقارير أو تعد مبادرة استراتيجية"}</p>
            </label>`).join("")}
          </div>
          <div id="sizeSuggest">${sizeSuggestion()}</div>
          <p class="rule-note">قاعدة للتسهيل: عند التردد تعامل المبادرة معاملة الكبيرة وتحسب المدة من أول لقاء إلى آخر لقاء.</p>
        </div>

        <div class="card"><h2 class="card-title">معبئ النموذج</h2>
          <div class="grid">
            <div class="field"><span class="field-label">المعبئ<span class="req">*</span></span>
              ${seg("filler", ["مدير المبادرة", "قسم المتابعة وقياس الأثر أثناء الزيارة"])}</div>
            ${inp("fillerName", "اسم المعبئ")}
          </div>
        </div>
      </div>
    </div>`;
  }

  // رسمة الحجم بنفس أسلوب مشهد التوصيل: الصغيرة شخص يحمل طردا واحدا، والكبيرة مندوب بسكوتر محمل بعدة طرود
  const parcelSvg = (x, y, w = 13, h = 11) =>
    `<g class="sp"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.8"/><path d="M${x + w / 2} ${y}v${h}M${x} ${y + 3.2}h${w}"/></g>`;
  function sizeScene(large) {
    if (!large) return `<svg class="ss ss-small" viewBox="0 0 120 50">
      <path class="ground" d="M14 44h92"/>
      <g class="man">
        <circle class="head" cx="56" cy="13" r="3.6"/>
        <path d="M56 17v13"/><path d="M56 20l7 5M56 20l6 6"/>
        <path class="leg leg-a" d="M56 30l-5.5 13"/><path class="leg leg-b" d="M56 30l5.5 13"/>
        ${parcelSvg(60, 18)}
      </g>
    </svg>`;
    return `<svg class="ss ss-large" viewBox="0 -8 120 58">
      <g class="speed"><path d="M2 22h12M6 28h14M3 34h9"/></g>
      <path class="ground" d="M14 44h96"/>
      <g class="ride">
        <rect class="rack" x="22" y="20" width="30" height="12" rx="3"/>
        <rect class="stripe" x="26" y="24.5" width="9" height="2.2" rx="1.1"/>
        ${parcelSvg(22, 8)}${parcelSvg(37, 8)}${parcelSvg(29, -4)}
        <path class="deck" d="M36 37h58"/>
        <rect class="seatbox" x="56" y="24" width="20" height="8" rx="4"/>
        <path class="stem" d="M92 37 87 14M83 14h8"/>
        <g class="rider"><circle class="head" cx="66" cy="6" r="3.4"/><path d="M65.5 10 63.5 23M63.5 23h8l1.6 8M65 14l20 1"/></g>
        <g class="wheel-g" style="transform-origin:36px 40px"><circle class="wheel" cx="36" cy="40" r="6"/><path class="spoke" d="M36 35.5v9"/></g>
        <g class="wheel-g" style="transform-origin:92px 40px"><circle class="wheel" cx="92" cy="40" r="6"/><path class="spoke" d="M92 35.5v9"/></g>
      </g>
    </svg>`;
  }

  // المحاور
  function tplAxis(a) {
    return `<div class="wrap">
      <div class="step-hero">
        <div>
          <p class="eyebrow">المحور ${ORD[a.n]} من ${ORD[AXES.length]}</p>
          <h1>${esc(a.title)}</h1>
          <p class="lead">${esc(a.lead)}</p>
          <nav class="qmap" aria-label="أسئلة المحور">${a.questions.map((q) => {
            const id = qid(a, q);
            return `<button type="button" data-jump="${id}" class="${state.answers[id] ? "done" : ""}" aria-label="السؤال ${qLabel(a, q)}">${toAr(q.n)}</button>`;
          }).join("")}</nav>
        </div>
        <div class="axis-num" aria-hidden="true">${toAr(a.n)}</div>
      </div>
      <div class="band" aria-hidden="true"></div>
      <div class="step-body">
        ${a.safety ? `<div class="safety-note">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9 8 10.5 4.6-1.5 8-5.5 8-10.5v-6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>
          <span>أسئلة هذا المحور تتابعها الإدارة بعناية خاصة. اختر الوصف الأقرب للواقع كما هو.</span></div>` : ""}
        ${a.questions.map((q) => tplQuestion(a, q)).join("")}
      </div>
    </div>`;
  }

  function tplQuestion(a, q) {
    const id = qid(a, q);
    const ans = state.answers[id] || {};
    const size = state.data.size === "صغيرة" ? "small" : state.data.size === "كبيرة" ? "large" : null;
    const sized = size && q.sized ? q.sized[size] : null;
    const note = sized && sized.note ? sized.note : q.note;
    const locked = !!ans.locked;
    const opts = q.options.map((t, i) => (sized && sized.options && sized.options[i]) || t);
    const optHtml = opts.map((t, i) => {
      const L = LETTERS[i];
      const on = ans.c === L;
      return `<li><label class="opt ${on ? "checked" : ""} ${locked ? "locked" : ""}">
        <input type="radio" name="${id}" value="${L}" ${on ? "checked" : ""} ${locked ? "disabled" : ""}>
        <span class="opt-letter">${L}</span><span class="opt-text">${esc(t)}</span></label></li>`;
    }).join("");
    const naOn = ans.c === "NA";
    return `<section class="q" id="q_${id}" data-q="${id}">
      <div class="q-head"><span class="q-num">${qLabel(a, q)}</span><h3 class="q-text">${esc(q.text)}</h3></div>
      ${note ? `<p class="q-note ${sized && sized.note ? "sized" : ""}">${esc(note)}</p>` : ""}
      <ul class="opts" role="radiogroup" aria-label="${esc(q.text)}">
        ${optHtml}
        <li><label class="opt na ${naOn ? "checked" : ""} ${locked ? "locked" : ""}">
          <input type="radio" name="${id}" value="NA" ${naOn ? "checked" : ""} ${locked ? "disabled" : ""}>
          <span class="opt-letter">—</span><span class="opt-text">لا ينطبق</span></label></li>
      </ul>
      <div class="extra ${ans.c === "أ" ? "open" : ""}" data-extra="ev"><div><div class="extra-in">
        <span class="extra-label">الشاهد / الدليل <small>اكتب وصفه أو ضع رابطه أو أرفق ملفا</small></span>
        <textarea class="textarea" data-ev="${id}" placeholder="مثال: وثيقة المبادرة المعتمدة بتاريخ…">${esc(ans.ev || "")}</textarea>
        <input class="input" dir="ltr" type="url" data-link="${id}" placeholder="https://…  رابط الشاهد (اختياري)" value="${esc(ans.link || "")}">
        <label class="drop" data-drop="${id}">
          <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>اسحب الملف هنا أو اضغط للاختيار — حتى ${toAr(CFG.MAX_FILES_PER_QUESTION || 3)} ملفات، ${toAr(CFG.MAX_FILE_MB || 10)} م.ب للملف</span>
          <input type="file" multiple hidden data-file="${id}">
        </label>
        <ul class="files" data-files="${id}"></ul>
      </div></div></div>
      <div class="extra ${naOn ? "open" : ""}" data-extra="na"><div><div class="extra-in">
        <span class="extra-label">سبب عدم الانطباق ${ans.auto ? '<small class="auto-tag">— معبأ تلقائيا</small>' : ""}</span>
        <input class="input" data-reason="${id}" placeholder="اذكر السبب" value="${esc(ans.reason || "")}" ${locked ? "readonly" : ""}>
      </div></div></div>
    </section>`;
  }

  function renderFiles(id) {
    const ul = $(`[data-files="${id}"]`);
    if (!ul) return;
    const list = files[id] || [];
    ul.innerHTML = list.map((f, i) => `<li><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z M14 3v5h5" fill="none" stroke="#27B5C1" stroke-width="1.8" stroke-linejoin="round"/></svg>
      <span class="fname">${esc(f.name)}</span><span class="fsize">${toAr((f.size / 1048576).toFixed(1))} م.ب</span>
      <button type="button" data-rmfile="${id}" data-idx="${i}" aria-label="إزالة الملف">×</button></li>`).join("");
  }

  function addFiles(id, list) {
    const max = CFG.MAX_FILES_PER_QUESTION || 3;
    const maxB = (CFG.MAX_FILE_MB || 10) * 1048576;
    const cur = files[id] || (files[id] = []);
    for (const f of list) {
      if (cur.length >= max) { toast(`الحد الأقصى ${toAr(max)} ملفات للسؤال`); break; }
      if (f.size > maxB) { toast(`الملف ${f.name} أكبر من ${toAr(CFG.MAX_FILE_MB || 10)} م.ب`); continue; }
      cur.push(f);
    }
    renderFiles(id);
    $(`#q_${id}`)?.classList.remove("missing");
  }

  // الصفحة الأخيرة: السؤالان الختاميان فقط
  function tplReview() {
    return `<div class="wrap">
      <div class="step-hero"><div>
        <p class="eyebrow">الخطوة الأخيرة</p>
        <h1>سؤالان ختاميان</h1>
        <p class="lead">اختياريان، ثم أرسل التقييم</p>
      </div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="step-body">
        <div class="card">
          <div class="grid">
            <div class="field"><label for="openGood">ما الذي نجح في المبادرة ويستحق التعميم؟</label>
              <textarea class="textarea" id="openGood" data-open="good">${esc(state.open.good)}</textarea></div>
            <div class="field"><label for="openBad">ما أبرز ما لم ينجح وما سببه؟</label>
              <textarea class="textarea" id="openBad" data-open="bad">${esc(state.open.bad)}</textarea></div>
          </div>
        </div>
        <p class="fine">بالإرسال تنتقل الإجابات والشواهد إلى قسم المتابعة وقياس الأثر وتحذف المسودة من جهازك.</p>
      </div>
    </div>`;
  }

  // ——— التحقق ———
  function validateData() {
    const d = state.data;
    const bad = [];
    syncProgram();
    if (!String(d.program || "").trim()) bad.push(PROGRAMS.length ? (d.programChoice === "أخرى" ? $('[data-field="programOther"]') : $('[data-seg="programChoice"]')) : $('[data-field="program"]'));
    ["manager"].forEach((k) => { if (!String(d[k] || "").trim()) bad.push($(`[data-field="${k}"]`)); });
    ["season", "hasPrev", "filler"].forEach((k) => { if (!d[k]) bad.push($(`[data-seg="${k}"]`)); });
    if (!benefList().length) bad.push($('[data-multi="beneficiary"]'));
    if (!d.size) bad.push($("[data-sizegroup]"));
    $$(".bad").forEach((e) => e.classList.remove("bad"));
    $$(".size-card").forEach((e) => e.classList.remove("bad"));
    bad.forEach((e) => {
      if (!e) return;
      if (e.matches("[data-sizegroup]")) $$(".size-card", e).forEach((c) => c.classList.add("bad"));
      else e.classList.add("bad");
    });
    if (d.startDate && d.endDate && d.endDate < d.startDate) {
      bad.push($('[data-field="endDate"]'));
      $('[data-field="endDate"]').classList.add("bad");
      toast("تاريخ النهاية قبل تاريخ البداية");
    } else if (bad.length) toast("أكمل الحقول المطلوبة");
    if (bad[0]) bad[0].scrollIntoView({ behavior: "smooth", block: "center" });
    return !bad.length;
  }

  const benefList = () => (Array.isArray(state.data.beneficiary) ? state.data.beneficiary : state.data.beneficiary ? [state.data.beneficiary] : []);

  function questionProblem(id) {
    const a = state.answers[id];
    if (!a || !a.c) return "لم يجب";
    if (a.c === "أ" && !String(a.ev || "").trim() && !String(a.link || "").trim() && !(files[id] || []).length) return "الشاهد مطلوب عند اختيار (أ)";
    if (a.c === "NA" && !String(a.reason || "").trim()) return "اذكر سبب عدم الانطباق";
    return "";
  }

  function validateAxis(a) {
    let first = null, firstMsg = "";
    a.questions.forEach((q) => {
      const id = qid(a, q);
      const p = questionProblem(id);
      $(`#q_${id}`).classList.toggle("missing", !!p);
      const dot = $(`[data-jump="${id}"]`); if (dot) dot.classList.toggle("bad", !!p);
      if (p && !first) { first = $(`#q_${id}`); firstMsg = p; }
    });
    if (first) { first.scrollIntoView({ behavior: "smooth", block: "start" }); toast(firstMsg); }
    return !first;
  }

  function firstInvalidStep() {
    const d = state.data;
    syncProgram();
    if (!d.program || !d.season || !d.manager || !d.hasPrev || !benefList().length || !d.filler || !d.size) return 0;
    for (let i = 0; i < AXES.length; i++) {
      if (AXES[i].questions.some((q) => questionProblem(qid(AXES[i], q)))) return i + 1;
    }
    return -1;
  }

  // ——— التنقل ———
  function go(step) {
    state.step = Math.max(0, Math.min(STEP_COUNT - 1, step));
    saveDraft();
    renderStep();
  }

  function next() {
    const i = state.step;
    if (i === 0 && !validateData()) return;
    if (i > 0 && i <= AXES.length && !validateAxis(AXES[i - 1])) return;
    if (i === STEP_COUNT - 1) return submit();
    go(i + 1);
  }

  // ——— الإرسال ———
  function readBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] || "");
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }

  // ——— مشهد التوصيل أثناء الإرسال ———
  let creep = null;
  function setBar(pct) { $("#overlayBar").style.width = Math.max(0, Math.min(100, pct)) + "%"; }
  async function showLabel(t) {
    const l = $("#overlayText");
    if (l.textContent === t) return;
    l.classList.add("fade");
    await W(200);
    l.textContent = t;
    l.classList.remove("fade");
  }
  function startCreep(from, to) { // تقدم هادئ أثناء انتظار الشبكة
    clearInterval(creep);
    let v = from;
    creep = setInterval(() => { v += (to - v) * 0.06; setBar(v); }, 240);
  }
  async function courierIntro() {
    const pill = $("#courierPill"), sender = $("#sender");
    pill.className = "courier-pill";
    sender.setAttribute("class", "sender");
    $("#courierBar").classList.remove("active");
    setBar(0);
    $("#overlayText").textContent = "";
    $("#overlay").hidden = false;
    await W(450);
    pill.classList.add("playing");
    $("#courierBar").classList.add("active");
    await W(350);
    sender.setAttribute("class", "sender walking");
    pill.classList.add("walk");
    await W(1100);
    sender.setAttribute("class", "sender");
    pill.classList.add("hand");
    await W(560);
    pill.classList.add("stepback", "idle");
  }
  async function courierGo() {
    const pill = $("#courierPill");
    pill.classList.add("react");
    await W(520);
    pill.classList.remove("idle");
    pill.classList.add("go");
    await W(1050);
  }
  function courierHide() { clearInterval(creep); $("#overlay").hidden = true; }

  async function submit() {
    const bad = firstInvalidStep();
    if (bad !== -1) {
      toast(bad === 0 ? "بيانات المبادرة ناقصة" : `المحور ${ORD[bad]} فيه أسئلة ناقصة`);
      go(bad);
      setTimeout(() => (bad === 0 ? validateData() : validateAxis(AXES[bad - 1])), 350);
      return;
    }
    if (!configured()) { toast("لم يضبط رابط قوقل في config.js بعد — لا يمكن الإرسال", 4000); return; }

    const jobs = [];
    Object.keys(files).forEach((id) => {
      if (state.answers[id] && state.answers[id].c === "أ") (files[id] || []).forEach((f) => jobs.push({ id, f }));
    });
    const total = jobs.length + 1;
    const uploaded = {};
    $("#nextBtn").disabled = true;
    const intro = courierIntro();
    try {
      for (let k = 0; k < jobs.length; k++) {
        const { id, f } = jobs[k];
        showLabel(`جار رفع الشواهد ${toAr(k + 1)} من ${toAr(jobs.length)}`);
        startCreep((k / total) * 90, ((k + 1) / total) * 90);
        const r = await api({ action: "upload", code, program: state.data.program || "", qid: id, name: f.name, type: f.type || "application/octet-stream", data: await readBase64(f) });
        if (!r.ok) throw new Error(r.error || "تعذر رفع " + f.name);
        (uploaded[id] = uploaded[id] || []).push(r.url);
      }
      showLabel("جار إرسال التقييم…");
      startCreep(((total - 1) / total) * 90, 94);
      const answers = {};
      Object.entries(state.answers).forEach(([id, a]) => {
        answers[id] = { c: a.c, ev: a.c === "أ" ? a.ev || "" : "", link: a.c === "أ" ? a.link || "" : "", files: a.c === "أ" ? uploaded[id] || [] : [], reason: a.c === "NA" ? a.reason || "" : "" };
      });
      const data = { ...state.data, beneficiary: benefList().join("، ") };
      delete data.programChoice; delete data.programOther;
      const r = await api({ action: "submit", code, data, answers, open: state.open, startedAt: state.startedAt });
      if (!r.ok) throw new Error(r.error || "تعذر الإرسال");
      clearInterval(creep);
      setBar(100);
      showLabel("تم الإرسال");
      clearDraft();
      Object.keys(files).forEach((k) => delete files[k]);
      state = freshState();
      await intro;
      await courierGo();
      $("#doneRef").innerHTML = r.id ? `رقم المرجع: <bdi dir="ltr">${esc(r.id)}</bdi>` : "";
      $("#topbarTitle").textContent = "تم الإرسال";
      renderProgress(STEP_COUNT);
      show("screenDone");
      courierHide();
    } catch (err) {
      await intro;
      courierHide();
      toast(err.message && /[؀-ۿ]/.test(err.message) ? err.message : "تعذر الإرسال، تحقق من الاتصال وحاول مرة أخرى. إجاباتك محفوظة.", 4500);
    } finally { $("#nextBtn").disabled = false; }
  }

  // ——— الأحداث ———
  function onChange(e) {
    const t = e.target;
    // خيار سؤال
    if (t.type === "radio" && /^a\dq\d$/.test(t.name)) {
      const id = t.name;
      const prev = state.answers[id] || {};
      state.answers[id] = { ...prev, c: t.value, auto: false, locked: false };
      if (t.value !== "NA" && prev.auto) state.answers[id].reason = "";
      const sec = $(`#q_${id}`);
      $$(".opt", sec).forEach((l) => l.classList.toggle("checked", l.querySelector("input").checked));
      $('[data-extra="ev"]', sec).classList.toggle("open", t.value === "أ");
      $('[data-extra="na"]', sec).classList.toggle("open", t.value === "NA");
      const tag = $(".auto-tag", sec); if (tag) tag.remove();
      sec.classList.remove("missing");
      const dot = $(`[data-jump="${id}"]`); if (dot) dot.classList.add("done"), dot.classList.remove("bad");
      if (t.value === "NA") setTimeout(() => $(`[data-reason="${id}"]`).focus({ preventScroll: true }), 250);
      else if (t.value !== "أ") advanceFrom(id);
      updateDock();
      saveDraft();
      return;
    }
    // مقاطع بيانات المبادرة
    if (t.type === "radio" && (t.closest("[data-seg]") || t.name === "size")) {
      state.data[t.name] = t.value;
      const group = t.closest("[data-seg]") || t.closest("[data-sizegroup]");
      $$("label", group).forEach((l) => l.classList.toggle("checked", l.querySelector("input").checked));
      group.classList.remove("bad");
      $$(".size-card", group).forEach((c) => c.classList.remove("bad"));
      if (t.name === "donor" || t.name === "programChoice") { syncProgram(); renderStep(); }
      if (["size", "hasPrev"].includes(t.name)) applyRules();
      if (["donor", "donorReports", "size"].includes(t.name)) { const s = $("#sizeSuggest"); if (s) s.innerHTML = sizeSuggestion(); }
      saveDraft();
      return;
    }
    if (t.type === "checkbox" && t.closest("[data-multi]")) {
      const group = t.closest("[data-multi]");
      state.data[group.dataset.multi] = $$("input:checked", group).map((x) => x.value);
      $$("label", group).forEach((l) => l.classList.toggle("checked", l.querySelector("input").checked));
      group.classList.remove("bad");
      saveDraft();
      return;
    }
    if (t.matches("[data-file]")) { addFiles(t.dataset.file, t.files); t.value = ""; }
  }

  // بعد الإجابة ينتقل بهدوء إلى السؤال التالي غير المجاب
  let advTimer = null;
  function advanceFrom(id) {
    clearTimeout(advTimer);
    if (!e_prefersMotion()) return;
    const all = $$("[data-q]").map((el) => el.dataset.q);
    const nextId = all.slice(all.indexOf(id) + 1).find((x) => !state.answers[x]);
    if (!nextId) return;
    advTimer = setTimeout(() => {
      const el = $(`#q_${nextId}`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 420);
  }
  const e_prefersMotion = () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function onInput(e) {
    const t = e.target;
    if (t.dataset.field) {
      state.data[t.dataset.field] = t.value;
      if (t.dataset.field === "programOther") syncProgram();
      t.classList.remove("bad");
      if (["weeks", "cost"].includes(t.dataset.field)) { const s = $("#sizeSuggest"); if (s) s.innerHTML = sizeSuggestion(); }
    } else if (t.dataset.ev) { (state.answers[t.dataset.ev] ||= {}).ev = t.value; $(`#q_${t.dataset.ev}`).classList.remove("missing"); }
    else if (t.dataset.link) { (state.answers[t.dataset.link] ||= {}).link = t.value; $(`#q_${t.dataset.link}`).classList.remove("missing"); }
    else if (t.dataset.reason) { const a = (state.answers[t.dataset.reason] ||= {}); a.reason = t.value; a.auto = false; $(`#q_${t.dataset.reason}`).classList.remove("missing"); }
    else if (t.dataset.open) state.open[t.dataset.open] = t.value;
    else return;
    saveDraft();
  }

  function onClick(e) {
    const rm = e.target.closest("[data-rmfile]");
    if (rm) { files[rm.dataset.rmfile].splice(+rm.dataset.idx, 1); renderFiles(rm.dataset.rmfile); return; }
    const g = e.target.closest("[data-goto]");
    if (g) { go(+g.dataset.goto); return; }
    const j = e.target.closest("[data-jump]");
    if (j) { $(`#q_${j.dataset.jump}`).scrollIntoView({ behavior: "smooth", block: "center" }); return; }
  }

  function bindDrops() {
    document.addEventListener("dragover", (e) => {
      const d = e.target.closest && e.target.closest("[data-drop]");
      if (d) { e.preventDefault(); d.classList.add("over"); }
    });
    document.addEventListener("dragleave", (e) => {
      const d = e.target.closest && e.target.closest("[data-drop]");
      if (d) d.classList.remove("over");
    });
    document.addEventListener("drop", (e) => {
      const d = e.target.closest && e.target.closest("[data-drop]");
      if (!d) return;
      e.preventDefault(); d.classList.remove("over");
      addFiles(d.dataset.drop, e.dataTransfer.files);
    });
  }

  function init() {
    $("#gateForm").addEventListener("submit", handleGate);
    $("#accessCode").addEventListener("input", () => {
      const m = $("#noteMan");
      m.classList.remove("write"); void m.getBoundingClientRect(); m.classList.add("write");
    });
    $("#themeToggle").addEventListener("click", toggleTheme);
    const tb = $("#themeToggle"); tb.dataset.state = currentTheme(); tb.setAttribute("aria-pressed", currentTheme() === "dark" ? "true" : "false");
    darkMQ.addEventListener && darkMQ.addEventListener("change", () => { if (!storage((ls) => ls.getItem(THEME_KEY))) tb.dataset.state = currentTheme(); });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    $("#prevBtn").addEventListener("click", () => go(state.step - 1));
    $("#nextBtn").addEventListener("click", next);
    $("#newBtn").addEventListener("click", () => { state = freshState(); show("screenSteps"); renderStep(); });
    const host = $("#stepHost");
    host.addEventListener("change", onChange);
    host.addEventListener("input", onInput);
    host.addEventListener("click", onClick);
    bindDrops();
    window.addEventListener("beforeunload", () => { if (state.step > 0 || Object.keys(state.answers).length) storage((ls) => ls.setItem(DRAFT_KEY, JSON.stringify({ ...state, savedAt: Date.now() }))); });

    const saved = storage((ls) => ls.getItem(CODE_KEY));
    if (saved) $("#accessCode").value = saved;
    show("screenGate");
    $("#accessCode").focus({ preventScroll: true });
  }

  init();
})();
