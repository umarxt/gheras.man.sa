/* منصة الاستبانات — صفحة المجيب
   الرابط: /s/المعرف (أو form.html?s=المعرف). الإجابات تذهب إلى Google Apps Script ثم قوقل شيتس،
   والمسودة فقط تحفظ في جهاز المجيب حتى يرسل.
   خيارات الرابط: e=رمز التعديل، p=إجابات معبأة مسبقا، view=summary ملخص الردود،
   preview=1 معاينة من صفحة الإدارة (و mode=prefill لإنشاء رابط معبأ مسبقا). */
(function () {
  "use strict";
  const S = window.GSchema, U = window.GUI, K = window.GherasKit, API = window.GApi;
  const { $, $$, toast, W } = K;
  const { esc, toAr, icon } = U;
  const CFG = window.GHERAS_CONFIG || {};
  const MAX_MB = CFG.MAX_FILE_MB || 10;

  const params = new URLSearchParams(location.search);
  const surveyId = params.get("s") || decodeURIComponent((/^\/s\/([^/?#]+)/.exec(location.pathname) || [])[1] || "");
  const preview = params.get("preview") === "1";
  const prefillMode = preview && params.get("mode") === "prefill";
  const editToken = params.get("e") || "";
  const view = params.get("view") || "";

  let survey = null;   // ما يراه المجيب
  let code = "";       // رمز الاستبانة إن كانت محمية
  let prevRef = "";
  let st = fresh();
  const files = {};    // معرف السؤال → ملفات لم ترفع بعد (في الذاكرة فقط)
  let saveTimer = null;

  function fresh() { return { answers: {}, email: "", cur: 0, hist: [], seed: S.uid(10), startedAt: new Date().toISOString() }; }
  const draftKey = () => "gheras-survey-draft-" + (survey && survey.id);
  const doneKey = () => "gheras-survey-done-" + (survey && survey.id);
  const keepDraft = () => !preview && !editToken;
  const sett = () => (survey && survey.settings) || {};

  // ——— المسودة ———
  function saveDraft() {
    if (!keepDraft()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = K.storage((ls) => { ls.setItem(draftKey(), JSON.stringify({ ...st, savedAt: Date.now() })); return true; });
      const el = $("#saveState");
      if (ok) { el.textContent = "حفظت المسودة"; el.style.opacity = 1; setTimeout(() => (el.style.opacity = 0), 1600); }
    }, 400);
  }
  function loadDraft() {
    const raw = K.storage((ls) => ls.getItem(draftKey()));
    try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function clearDraft() { clearTimeout(saveTimer); K.storage((ls) => ls.removeItem(draftKey())); }

  // ——— الشاشات ———
  function show(mode) {
    const steps = mode === "steps";
    $("#screenStage").hidden = steps;
    $("#screenSteps").hidden = !steps;
    $("#topbar").hidden = !steps;
    $("#dock").hidden = !steps || view === "summary";
    document.body.classList.toggle("stage-mode", !steps);
    document.querySelector('meta[name="theme-color"]').content = steps ? getComputedStyle(document.body).backgroundColor : "#0D2142";
    window.scrollTo(0, 0);
    if (steps) K.stage.stop(); else K.stage.start($("#screenStage"));
  }
  const LOGO = `<div class="stage-logo"><span class="halo" aria-hidden="true"></span><img src="/assets/logo-white.png" alt="جمعية غراس لتنمية الطفل"></div>`;
  function stage(html) {
    const inner = $("#stageInner");
    inner.innerHTML = LOGO + html;
    inner.style.animation = "none"; void inner.offsetWidth; inner.style.animation = "";
    show("stage");
  }
  function message(kicker, title, text, extra = "") {
    stage(`<p class="stage-kicker">${esc(kicker)}</p><h1 class="stage-title">${esc(title)}</h1>${text ? `<p class="stage-sub">${esc(text)}</p>` : ""}${extra}`);
  }

  function applyTheme(s) {
    const a = (s && s.theme && s.theme.accent) || "navy";
    document.documentElement.dataset.accent = a;
    if (s && s.title) document.title = s.title + " — غراس";
  }

  // ——— التحميل ———
  async function load() {
    if (preview) {
      const raw = K.storage((ls) => ls.getItem("gheras-surveys-preview"));
      try { survey = raw ? JSON.parse(raw) : null; } catch (e) { survey = null; }
      if (!survey) return message("معاينة", "لا توجد استبانة للمعاينة", "افتح المعاينة من صفحة تحرير الاستبانة");
      survey = { ...survey, settings: { ...S.publicView(survey).settings, quiz: (survey.settings && survey.settings.quiz) || {} }, _full: survey };
      const bar = $("#previewBar");
      bar.hidden = false;
      bar.innerHTML = prefillMode
        ? `${icon("link", 18)}<span>رابط معبأ مسبقا: أجب عما تريد تعبئته، ثم اضغط «إنشاء الرابط» في آخر الاستبانة</span>`
        : `${icon("eye", 18)}<span>معاينة: لن يرسل ردك ولن يحفظ</span>`;
      applyTheme(survey);
      return intro();
    }
    if (!surveyId) return message("استبانة", "الرابط غير مكتمل", "تأكد من الرابط الذي وصلك");
    let r;
    try { r = await API.call({ action: view === "summary" ? "summary" : "form", id: surveyId, edit: editToken }); }
    catch (e) { return message("استبانة", "تعذر التحميل", "تأكد من اتصالك بالإنترنت ثم حدث الصفحة", `<button class="btn btn-onstage" type="button" onclick="location.reload()">حاول مرة أخرى</button>`); }
    if (!r.ok) return message("استبانة", r.missing ? "الاستبانة غير موجودة" : "تعذر فتح الاستبانة", r.error || "");
    if (view === "summary") return showSummary(r);
    applyTheme(r.survey);
    if (r.closed) return closed(r);
    survey = r.survey;
    if (r.prev) { prevRef = r.prev.ref || ""; st.answers = r.prev.answers || {}; st.email = r.prev.email || ""; }
    if (r.needCode) return intro(true);
    intro();
  }

  function closed(r) {
    const s = r.survey || {};
    const T = {
      closed: ["لا تستقبل ردودا", "أغلقت هذه الاستبانة ولم تعد تستقبل ردودا"],
      notyet: ["لم تبدأ بعد", r.opens ? "تفتح الاستبانة في " + U.fmtDate(r.opens, true) : "لم يحن موعد فتح الاستبانة"],
      ended: ["انتهت مدتها", "انتهى موعد استقبال الردود على هذه الاستبانة"],
      full: ["اكتمل العدد", "اكتمل العدد المطلوب من الردود، شكرا لاهتمامك"]
    }[r.closed] || ["مغلقة", ""];
    message(s.title || "استبانة", T[0], r.message || T[1]);
  }

  // شاشة البداية: بطاقة فيها العنوان والوصف، وخانة الرمز إن كانت الاستبانة محمية
  function intro(needCode) {
    const s = survey;
    if (!needCode && !preview && !editToken && s.settings.oneResponse) {
      const done = K.storage((ls) => ls.getItem(doneKey()));
      if (done) {
        let d = {}; try { d = JSON.parse(done); } catch (e) { /* تجاهل */ }
        return message(s.title, "سبق أن أرسلت ردك", "هذه الاستبانة تقبل ردا واحدا لكل مجيب",
          d.edit ? `<p class="ref">رقم المرجع: <bdi dir="ltr">${esc(d.ref || "")}</bdi></p><a class="btn btn-onstage" href="${esc(U.formUrl(s.id, "e=" + encodeURIComponent(d.edit)))}">تعديل ردك</a>` : "");
      }
    }
    const qs = needCode ? [] : S.questions(s);
    const mins = Math.max(1, Math.round(qs.length * 0.35));
    const meta = qs.length ? `<p class="intro-meta">${icon("list", 16)} ${toAr(qs.length)} ${qs.length > 10 || qs.length < 3 ? "سؤالا" : "أسئلة"}<span>·</span>${icon("clock", 16)} نحو ${toAr(mins)} ${mins > 2 && mins < 11 ? "دقائق" : "دقيقة"}</p>` : "";
    stage(`<div class="login-card intro-card" id="loginCard">
        <p class="stage-kicker">${esc(s.kicker || "استبانة")}</p>
        <h1 class="stage-title">${esc(s.title || "استبانة")}</h1>
        ${s.description ? `<p class="stage-sub intro-desc">${esc(s.description)}</p>` : ""}
        ${meta}
        ${editToken ? `<p class="intro-meta">${icon("edit", 16)} تعدل ردك السابق</p>` : ""}
        <form class="gate-form" id="gateForm" autocomplete="off" novalidate>
          ${needCode ? `<label class="login-label" for="accessCode">رمز الاستبانة</label>
          <div class="code-well" id="codeWell">
            <input id="accessCode" type="password" placeholder="أدخل الرمز" required>
            <svg class="note-man" id="noteMan" viewBox="0 0 22 30" aria-hidden="true">
              <circle class="head" cx="9" cy="4" r="3.2"/><path d="M9 7.5V18"/><path class="arm-back" d="M9 10 6 15"/>
              <g class="arm-note"><path d="M9 10l5 3.5"/><rect class="notebook" x="13" y="9.5" width="6" height="8" rx="1"/><path class="pen" d="M15 12.5h2.5M15 14.5h2"/></g>
              <path class="leg" d="M9 18 6.5 27"/><path class="leg" d="M9 18l2.5 9"/>
            </svg>
          </div>` : ""}
          <button type="submit" class="portal-btn" id="portalBtn">
            <span class="btn-label"><i class="dot"></i><span>${needCode ? "دخول" : editToken ? "تعديل الرد" : "ابدأ"}</span></span>
            <span class="portal-scene" aria-hidden="true">
              <span class="ground"></span>
              <span class="door"><span class="door-light"></span><span class="door-panel"><i></i></span></span>
              <svg class="walker" id="walker" viewBox="0 0 16 30">
                <circle class="head" cx="8" cy="4" r="3.2"/>
                <path d="M8 7.5V18"/><path class="arm arm-a" d="M8 10 5.5 15.5"/><path class="arm arm-b" d="M8 10l2.5 5.5"/>
                <path class="leg leg-a" d="M8 18 5 27"/><path class="leg leg-b" d="M8 18l3 9"/>
              </svg>
            </span>
          </button>
          <p class="portal-caption" id="portalCaption">${needCode ? "أدخل الرمز الذي وصلك مع الرابط" : "اضغط للبدء"}</p>
          <p class="form-msg" id="gateMsg" role="alert"></p>
        </form>
      </div>`);
    K.portalGate({
      emptyMsg: "أدخل رمز الاستبانة", wrongMsg: "رمز الاستبانة غير صحيح",
      verify: async (val) => {
        if (!needCode) return { ok: true };
        const r = await API.call({ action: "form", id: surveyId, code: val, edit: editToken });
        if (r.ok && r.survey && !r.needCode && !r.closed) {
          survey = r.survey; code = val;
          if (r.prev) { prevRef = r.prev.ref || ""; st.answers = r.prev.answers || {}; st.email = r.prev.email || ""; }
        }
        return r.ok && !r.needCode ? r : { ok: false, error: r.error };
      },
      onEnter: () => start()
    });
    if (needCode) setTimeout(() => $("#accessCode") && $("#accessCode").focus({ preventScroll: true }), 300);
  }

  function start() {
    if (keepDraft()) {
      const d = loadDraft();
      if (d && (Object.keys(d.answers || {}).length || d.email)) { st = { ...fresh(), ...d }; toast("استعدنا مسودتك من حيث توقفت"); }
      else applyPrefill();
    }
    if (st.cur >= survey.sections.length) { st.cur = 0; st.hist = []; }
    $("#topbarTitle").textContent = survey.title || "";
    $(".progress").hidden = sett().showProgress === false;
    show("steps");
    renderStep();
  }

  function applyPrefill() {
    const p = params.get("p");
    if (!p) return;
    try {
      const json = decodeURIComponent(escape(atob(p.replace(/-/g, "+").replace(/_/g, "/"))));
      const a = JSON.parse(json);
      S.questions(survey).forEach((it) => { if (a[it.id] != null && it.type !== "file") st.answers[it.id] = a[it.id]; });
    } catch (e) { /* رابط معطوب: نبدأ فارغين */ }
  }

  // ——— رسم القسم ———
  function sectionItems(sec) {
    const list = sec.items || [];
    return sett().shuffle ? U.shuffle(list, st.seed + sec.id) : list;
  }
  function baseNumber(idx) {
    let n = 0;
    survey.sections.slice(0, idx).forEach((s) => (s.items || []).forEach((it) => { if (S.isQ(it)) n++; }));
    return n;
  }
  function renderStep() {
    const secs = survey.sections, idx = st.cur, sec = secs[idx], multi = secs.length > 1;
    const list = sectionItems(sec);
    let num = baseNumber(idx);
    const numbered = sett().numbered !== false;
    const points = !!(sett().quiz && sett().quiz.on && sett().quiz.showPoints !== false);
    const qItems = list.filter(S.isQ);
    const emailCard = idx === 0 && sett().collectEmail && sett().collectEmail !== "off" ? `<section class="q" id="q__email" data-q="__email">
        <div class="q-head"><h3 class="q-text" id="t___email">البريد الإلكتروني${sett().collectEmail === "required" ? '<span class="req">*</span>' : ""}</h3></div>
        ${sett().sendCopy ? `<p class="q-note">ستصلك نسخة من ردك على هذا البريد</p>` : ""}
        <div class="q-body"><input class="input" type="email" dir="ltr" data-email placeholder="name@example.com" value="${esc(st.email)}" aria-labelledby="t___email" autocomplete="email"></div>
        <p class="q-err" id="e___email" role="alert"></p></section>` : "";
    $("#stepHost").innerHTML = `<div class="wrap step">
      <div class="step-hero">
        <div>
          <p class="eyebrow">${multi ? `القسم ${toAr(idx + 1)} من ${toAr(secs.length)}` : esc(survey.kicker || "استبانة")}</p>
          <h1>${esc(sec.title || survey.title)}</h1>
          ${sec.description || (idx === 0 && survey.description) ? `<p class="lead">${esc(sec.description || survey.description)}</p>` : ""}
          ${qItems.length > 1 ? `<nav class="qmap" aria-label="أسئلة القسم">${qItems.map((it, k) => `<button type="button" data-jump="${it.id}" class="${S.isEmpty(it, valueOf(it)) ? "" : "done"}" aria-label="السؤال ${toAr(k + 1)}">${toAr(k + 1)}</button>`).join("")}</nav>` : ""}
        </div>
        ${multi ? `<div class="axis-num" aria-hidden="true">${toAr(idx + 1)}</div>` : ""}
      </div>
      <div class="band" aria-hidden="true"></div>
      <div class="step-body">
        ${emailCard}
        ${list.map((it) => {
          const h = U.itemHTML(it, st.answers[it.id], { num: S.isQ(it) && numbered ? ++num : 0, seed: st.seed, points, files: files[it.id] || [], uploaded: uploadedOf(it) });
          if (!it.showIf || !it.showIf.item) return h;
          const on = S.visible(it, st.answers);
          return `<div class="cond ${on ? "" : "off"}" data-cond="${it.id}" ${on ? "" : "inert"}>${h}</div>`;
        }).join("")}
        ${!list.length ? `<div class="card"><p class="hint">لا توجد أسئلة في هذا القسم</p></div>` : ""}
      </div>
    </div>`;
    $("#prevBtn").style.visibility = st.hist.length ? "visible" : "hidden";
    if (sett().showProgress !== false) $("#progressFill").style.width = ((idx + 1) / secs.length) * 100 + "%";
    updateDock();
    window.scrollTo({ top: 0 });
  }
  function uploadedOf(it) { return it.type === "file" && Array.isArray(st.answers[it.id]) ? st.answers[it.id] : []; }
  function valueOf(it) {
    if (it.type !== "file") return st.answers[it.id];
    const all = uploadedOf(it).concat((files[it.id] || []).map((f) => ({ name: f.name, size: f.size })));
    return all.length ? all : null;
  }
  const isLast = () => S.nextIndex(survey, st.cur, st.answers) === -1;
  function updateDock() {
    const sec = survey.sections[st.cur];
    const qs = (sec.items || []).filter((it) => S.isQ(it) && S.visible(it, st.answers));
    const done = qs.filter((it) => !S.isEmpty(it, valueOf(it))).length;
    $("#dockCount").textContent = qs.length ? `أجبت ${toAr(done)} من ${toAr(qs.length)}` : "";
    $("#nextBtn").textContent = isLast() ? (prefillMode ? "إنشاء الرابط" : preview ? "إنهاء المعاينة" : editToken ? "حفظ التعديل" : "إرسال") : "التالي";
  }

  // ——— التحقق ———
  function showErr(id, msg) {
    const box = $(`#q_${CSS.escape(id)}`);
    if (!box) return;
    box.classList.toggle("missing", !!msg);
    const e = $(`#e_${CSS.escape(id)}`);
    if (e) e.textContent = msg || "";
    const dot = $(`[data-jump="${CSS.escape(id)}"]`);
    if (dot) dot.classList.toggle("bad", !!msg);
  }
  function validateSection() {
    if (prefillMode) return true;
    const sec = survey.sections[st.cur];
    let first = null, firstMsg = "";
    if (st.cur === 0 && sett().collectEmail && sett().collectEmail !== "off") {
      const em = st.email.trim();
      const msg = !em && sett().collectEmail === "required" ? S.MSG.required : em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em) ? S.MSG.email : "";
      showErr("__email", msg);
      if (msg) { first = $("#q___email"); firstMsg = msg; }
    }
    (sec.items || []).filter((it) => S.isQ(it) && S.visible(it, st.answers)).forEach((it) => {
      const msg = S.check(it, valueOf(it));
      showErr(it.id, msg);
      if (msg && !first) { first = $(`#q_${CSS.escape(it.id)}`); firstMsg = msg; }
    });
    if (first) { first.scrollIntoView({ behavior: "smooth", block: "center" }); toast(firstMsg); }
    return !first;
  }

  // ——— التنقل ———
  function next() {
    if (!validateSection()) return;
    const n = S.nextIndex(survey, st.cur, st.answers);
    if (n === -1 || st.hist.includes(n)) return finish();
    st.hist.push(st.cur);
    st.cur = n;
    saveDraft();
    renderStep();
  }
  function prev() {
    if (!st.hist.length) return;
    st.cur = st.hist.pop();
    saveDraft();
    renderStep();
  }

  // ——— الإنهاء ———
  function pathAnswers() {
    const keep = new Set(S.pathItems(survey, st.answers).map((i) => i.id));
    const out = {};
    Object.keys(st.answers).forEach((k) => { if (keep.has(k) && !S.isEmpty(S.findItem(survey, k) || {}, st.answers[k])) out[k] = st.answers[k]; });
    return out;
  }
  function readBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result).split(",")[1] || "");
      r.onerror = () => rej(r.error);
      r.readAsDataURL(file);
    });
  }

  async function finish() {
    if (prefillMode) return prefillLink();
    if (preview) {
      const g = S.grade(survey._full, pathAnswers());
      return done({ ref: "", grade: g ? { ...g, items: g.items.map((x) => ({ ...x, show: true })) } : null, previewDone: true });
    }
    const answers = pathAnswers();
    const keep = new Set(Object.keys(answers));
    const jobs = [];
    S.pathItems(survey, st.answers).forEach((it) => { if (it.type === "file") (files[it.id] || []).forEach((f) => jobs.push({ it, f })); });
    const total = jobs.length + 1;
    $("#nextBtn").disabled = true;
    K.courier.start("");
    try {
      for (let k = 0; k < jobs.length; k++) {
        const { it, f } = jobs[k];
        K.courier.label(`جار رفع الملفات ${toAr(k + 1)} من ${toAr(jobs.length)}`);
        K.courier.creep((k / total) * 90, ((k + 1) / total) * 90);
        const r = await API.call({ action: "upload", id: survey.id, code, item: it.id, name: f.name, type: f.type || "application/octet-stream", data: await readBase64(f) });
        if (!r.ok) throw new Error(r.error || "تعذر رفع " + f.name);
        answers[it.id] = (answers[it.id] || uploadedOf(it).slice()).concat([{ name: f.name, url: r.url }]);
        keep.add(it.id);
      }
      K.courier.label(editToken ? "جار حفظ التعديل…" : "جار إرسال ردك…");
      K.courier.creep(((total - 1) / total) * 90, 94);
      const r = await API.call({ action: "submit", id: survey.id, code, answers, email: st.email.trim(), edit: editToken, startedAt: st.startedAt });
      if (!r.ok) throw new Error(r.error || "تعذر الإرسال");
      await K.courier.finish(editToken ? "تم حفظ التعديل" : "تم الإرسال");
      clearDraft();
      Object.keys(files).forEach((k) => delete files[k]);
      if (!editToken) K.storage((ls) => ls.setItem(doneKey(), JSON.stringify({ ref: r.ref, edit: r.edit || "" })));
      done(r);
      K.courier.hide();
    } catch (err) {
      await K.courier.hide();
      toast(err.message && /[؀-ۿ]/.test(err.message) ? err.message : "تعذر الإرسال، تحقق من الاتصال وحاول مرة أخرى. إجاباتك محفوظة.", 5000);
    } finally { $("#nextBtn").disabled = false; }
  }

  function done(r) {
    const s = sett();
    const g = r.grade;
    let gradeHtml = "";
    if (g) {
      const shown = g.items.filter((x) => x.show !== false);
      gradeHtml = `<div class="score"><span class="score-num">${toAr(g.earned)}<small> / ${toAr(g.total)}</small></span><span class="score-cap">درجتك</span></div>
        ${shown.length ? `<ul class="result-list">${shown.map((x) => `<li class="${x.ok ? "ok" : "no"}">
          <span class="rl-mark">${icon(x.ok ? "check" : "close", 16)}</span>
          <span class="rl-body"><span class="rl-t">${esc(x.title || "سؤال")}</span>
            ${!x.ok && x.key ? `<span class="rl-k">الإجابة الصحيحة: ${esc(x.key)}</span>` : ""}
            ${x.fb ? `<span class="rl-k">${esc(x.fb)}</span>` : ""}</span>
          ${x.points != null ? `<span class="rl-p">${toAr(x.earned)}/${toAr(x.points)}</span>` : ""}</li>`).join("")}</ul>` : ""}`;
    } else if (s.quiz && s.quiz.on && s.quiz.release === "later") {
      gradeHtml = `<p class="stage-sub">تظهر نتيجتك بعد مراجعة الإجابات</p>`;
    }
    const editUrl = r.edit ? U.formUrl(survey.id, "e=" + encodeURIComponent(r.edit)) : "";
    const actions = [
      r.previewDone ? `<button class="btn btn-onstage" type="button" data-act="again">إعادة المعاينة</button>` : "",
      !r.previewDone && s.allowAnother !== false && !s.oneResponse && !editToken ? `<button class="btn btn-onstage" type="button" data-act="again">إرسال رد آخر</button>` : "",
      editUrl ? `<button class="btn btn-onstage" type="button" data-act="copyEdit">${icon("copy", 18)} نسخ رابط تعديل ردك</button>` : "",
      s.showSummary && !r.previewDone ? `<a class="btn btn-onstage" href="${esc(U.formUrl(survey.id, "view=summary"))}">${icon("chart", 18)} ملخص الردود</a>` : ""
    ].join("");
    stage(`<svg class="done-mark" viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="54" fill="none" stroke-width="5"/>
        <path d="M38 62 L54 78 L84 46" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <p class="stage-kicker">${esc(survey.title || "")}</p>
      <h1 class="stage-title">${r.previewDone ? "انتهت المعاينة" : editToken ? "حفظ تعديلك" : "شكرا لك"}</h1>
      <p class="stage-sub">${esc(r.previewDone ? "هكذا يرى المجيب نهاية الاستبانة. لم يرسل شيء." : s.confirmation || "وصل ردك")}</p>
      ${r.ref || prevRef ? `<p class="ref">رقم المرجع: <bdi dir="ltr">${esc(r.ref || prevRef)}</bdi></p>` : ""}
      ${gradeHtml}
      ${actions ? `<div class="done-actions">${actions}</div>` : ""}`);
    $("#stageInner").onclick = async (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "again") {
        if (editToken) { location.href = U.formUrl(survey.id); return; }
        st = fresh(); start();
      }
      if (b.dataset.act === "copyEdit") toast((await U.copy(editUrl)) ? "نسخ رابط التعديل، احفظه لتعدل ردك لاحقا" : editUrl, 4000);
    };
  }

  function prefillLink() {
    const a = pathAnswers();
    Object.keys(a).forEach((k) => { const it = S.findItem(survey, k); if (it && it.type === "file") delete a[k]; });
    const b64 = btoa(unescape(encodeURIComponent(JSON.stringify(a)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = U.formUrl(survey.id, "p=" + b64);
    const m = U.modal(`<h2 class="modal-title">الرابط المعبأ مسبقا</h2>
      <p class="modal-text">من يفتح هذا الرابط يجد إجاباتك معبأة، ويستطيع تعديلها قبل الإرسال.</p>
      <div class="link-box"><input class="input" dir="ltr" readonly value="${esc(url)}" aria-label="الرابط"><button class="btn btn-primary" data-copy>${icon("copy", 18)} نسخ</button></div>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>إغلاق</button></div>`);
    m.el.querySelector("[data-copy]").addEventListener("click", async () => toast((await U.copy(url)) ? "نسخ الرابط" : "انسخ الرابط يدويا"));
  }

  // ——— ملخص الردود للمجيبين ———
  function showSummary(r) {
    applyTheme(r);
    $("#topbarTitle").textContent = r.title || "";
    $(".progress").hidden = true;
    $("#stepHost").innerHTML = `<div class="wrap step">
      <div class="step-hero"><div><p class="eyebrow">ملخص الردود</p><h1>${esc(r.title || "")}</h1><p class="lead">${toAr(r.n)} ${r.n === 1 ? "رد" : "ردا"} حتى الآن</p></div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="step-body">${U.summaryHTML(r.summary, { publicView: true })}</div></div>`;
    show("steps");
  }

  // ——— الأحداث ———
  // إظهار الأسئلة المشروطة وإخفاؤها بانسياب حسب الإجابات
  function applyConds() {
    $$("[data-cond]").forEach((el) => {
      const on = S.visible(S.findItem(survey, el.dataset.cond), st.answers);
      el.classList.toggle("off", !on);
      el.inert = !on;
    });
  }
  function setAnswer(id, v) {
    if (v == null || v === "" || (typeof v === "object" && !Array.isArray(v) && S.isEmpty(S.findItem(survey, id) || { type: "grid" }, v))) delete st.answers[id];
    else st.answers[id] = v;
    showErr(id, "");
    const it = S.findItem(survey, id);
    const dot = $(`[data-jump="${CSS.escape(id)}"]`);
    if (dot && it) dot.classList.toggle("done", !S.isEmpty(it, valueOf(it)));
    updateDock();
    applyConds();
    saveDraft();
  }
  function choiceValue(id) {
    const box = $(`#q_${CSS.escape(id)}`);
    const inputs = $$(`[data-c="${CSS.escape(id)}"]`, box);
    const c = inputs.filter((i) => i.checked && i.value !== "__other").map((i) => i.value);
    const otherOn = inputs.some((i) => i.checked && i.value === "__other");
    const prevO = st.answers[id] && st.answers[id].o;
    const v = { c };
    if (otherOn) v.o = prevO != null ? prevO : (($(`[data-o="${CSS.escape(id)}"]`, box) || {}).value || "");
    return v;
  }
  function onChange(e) {
    const t = e.target, d = t.dataset;
    if (d.c) {
      const id = d.c, box = $(`#q_${CSS.escape(id)}`);
      const v = choiceValue(id);
      $$(".opt", box).forEach((l) => l.classList.toggle("checked", l.querySelector("input").checked));
      const ex = $(`[data-other="${CSS.escape(id)}"]`, box);
      if (ex) { ex.classList.toggle("open", v.o != null); if (v.o != null && t.value === "__other" && t.checked) setTimeout(() => $(`[data-o="${CSS.escape(id)}"]`, box).focus({ preventScroll: true }), 250); }
      setAnswer(id, v.c.length || v.o != null ? v : null);
      if (t.type === "radio" && t.value !== "__other") advanceFrom(id);
      return;
    }
    if (d.s) { setAnswer(d.s, t.value); $$(`[data-s="${CSS.escape(d.s)}"]`).forEach((i) => i.closest("label").classList.toggle("checked", i.checked)); advanceFrom(d.s); return; }
    if (d.r) { paintStars(d.r, +t.value); setAnswer(d.r, t.value); advanceFrom(d.r); return; }
    if (d.g) {
      const id = d.g, it = S.findItem(survey, id), cur = { ...(st.answers[id] || {}) };
      const row = $$(`[data-g="${CSS.escape(id)}"][data-row="${CSS.escape(d.row)}"]`);
      if (it.type === "checkgrid") cur[d.row] = row.filter((i) => i.checked).map((i) => i.value);
      else cur[d.row] = t.value;
      if (Array.isArray(cur[d.row]) && !cur[d.row].length) delete cur[d.row];
      row.forEach((i) => i.closest("label").classList.toggle("checked", i.checked));
      setAnswer(id, Object.keys(cur).length ? cur : null);
      return;
    }
    if (d.a && t.tagName === "SELECT") { setAnswer(d.a, t.value ? { c: [t.value] } : null); return; }
    if (d.d || d.dt) {
      const id = d.d || d.dt, date = ($(`[data-d="${CSS.escape(id)}"]`) || {}).value || "", time = ($(`[data-dt="${CSS.escape(id)}"]`) || {}).value || "";
      setAnswer(id, date ? (time ? date + " " + time : date) : "");
      return;
    }
    if (d.file) { addFiles(d.file, t.files); t.value = ""; }
  }
  function onInput(e) {
    const t = e.target, d = t.dataset;
    if (d.a && t.tagName !== "SELECT") { setAnswer(d.a, t.value.trim() ? t.value : ""); return; }
    if (d.o) { const v = choiceValue(d.o); v.o = t.value; st.answers[d.o] = v; showErr(d.o, ""); saveDraft(); return; }
    if (d.du) {
      const id = d.du, parts = { h: 0, m: 0, s: 0 };
      $$(`[data-du="${CSS.escape(id)}"]`).forEach((i) => (parts[i.dataset.part] = Math.max(0, parseInt(S.digits(i.value), 10) || 0)));
      const any = $$(`[data-du="${CSS.escape(id)}"]`).some((i) => i.value !== "");
      const p2 = (n) => String(n).padStart(2, "0");
      setAnswer(id, any ? `${p2(parts.h)}:${p2(parts.m)}:${p2(parts.s)}` : "");
      return;
    }
    if (t.matches("[data-email]")) { st.email = t.value; showErr("__email", ""); saveDraft(); }
  }
  function paintStars(id, v) {
    const box = $(`[data-rating="${CSS.escape(id)}"]`);
    if (!box) return;
    $$("label", box).forEach((l, i) => l.classList.toggle("on", i < v));
    const max = $$("label", box).length;
    $(".rating-val", box).textContent = v ? `${toAr(v)} من ${toAr(max)}` : "";
  }
  function onOver(e) {
    const l = e.target.closest(".rating label");
    if (!l) return;
    const box = l.closest(".rating"), labels = $$("label", box), i = labels.indexOf(l);
    labels.forEach((x, k) => x.classList.toggle("hover", k <= i));
  }
  function onOut(e) {
    const box = e.target.closest(".rating");
    if (box && !box.contains(e.relatedTarget)) $$("label", box).forEach((x) => x.classList.remove("hover"));
  }

  let advTimer = null;
  function advanceFrom(id) {
    clearTimeout(advTimer);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const all = $$("[data-q]").map((el) => el.dataset.q);
    const nextId = all.slice(all.indexOf(id) + 1).find((x) => { const it = S.findItem(survey, x); return it && S.isEmpty(it, valueOf(it)); });
    if (!nextId) return;
    advTimer = setTimeout(() => { const el = $(`#q_${CSS.escape(nextId)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 420);
  }

  // ——— الملفات ———
  function addFiles(id, list) {
    const it = S.findItem(survey, id), f = it.file || {};
    const max = f.maxFiles || 1, maxB = Math.min(f.maxMB || 10, MAX_MB) * 1048576, allow = S.allowedExt(it);
    const cur = files[id] || (files[id] = []);
    for (const file of list) {
      if (uploadedOf(it).length + cur.length >= max) { toast(max === 1 ? "يقبل هذا السؤال ملفا واحدا" : `الحد الأقصى ${toAr(max)} ملفات`); break; }
      if (file.size > maxB) { toast(`الملف ${file.name} أكبر من ${toAr(maxB / 1048576)} م.ب`); continue; }
      if (allow && !allow.includes(S.ext(file.name))) { toast(`نوع الملف ${file.name} غير مسموح`); continue; }
      cur.push(file);
    }
    renderFiles(id);
  }
  function renderFiles(id) {
    const ul = $(`[data-files="${CSS.escape(id)}"]`);
    const it = S.findItem(survey, id);
    if (ul) ul.innerHTML = U.filesHTML(id, uploadedOf(it), files[id] || []);
    showErr(id, "");
    const dot = $(`[data-jump="${CSS.escape(id)}"]`);
    if (dot) dot.classList.toggle("done", !S.isEmpty(it, valueOf(it)));
    updateDock();
  }
  function onClick(e) {
    const rm = e.target.closest("[data-rmfile]");
    if (rm) {
      const id = rm.dataset.rmfile;
      if (rm.dataset.kind === "up") { const arr = uploadedOf(S.findItem(survey, id)).slice(); arr.splice(+rm.dataset.idx, 1); if (arr.length) st.answers[id] = arr; else delete st.answers[id]; saveDraft(); }
      else files[id].splice(+rm.dataset.idx, 1);
      renderFiles(id);
      return;
    }
    const j = e.target.closest("[data-jump]");
    if (j) { const el = $(`#q_${CSS.escape(j.dataset.jump)}`); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }
  function bindDrops() {
    document.addEventListener("dragover", (e) => { const d = e.target.closest && e.target.closest("[data-drop]"); if (d) { e.preventDefault(); d.classList.add("over"); } });
    document.addEventListener("dragleave", (e) => { const d = e.target.closest && e.target.closest("[data-drop]"); if (d) d.classList.remove("over"); });
    document.addEventListener("drop", (e) => {
      const d = e.target.closest && e.target.closest("[data-drop]");
      if (!d) return;
      e.preventDefault(); d.classList.remove("over");
      addFiles(d.dataset.drop, e.dataTransfer.files);
    });
  }

  function init() {
    K.theme.init();
    $("#prevBtn").addEventListener("click", prev);
    $("#nextBtn").addEventListener("click", next);
    const host = $("#stepHost");
    host.addEventListener("change", onChange);
    host.addEventListener("input", onInput);
    host.addEventListener("click", onClick);
    host.addEventListener("pointerover", onOver);
    host.addEventListener("pointerout", onOut);
    bindDrops();
    window.addEventListener("beforeunload", () => {
      if (survey && keepDraft() && Object.keys(st.answers).length) K.storage((ls) => ls.setItem(draftKey(), JSON.stringify({ ...st, savedAt: Date.now() })));
    });
    show("stage");
    load();
  }
  init();
})();
