/* تطوع غراس — واجهة المتطوع */
(function () {
  "use strict";
  const K = GherasKit, $ = K.$, $$ = K.$$, T = TG, esc = T.esc, toAr = T.toAr, S_ = T.STATUS;
  const DRAFT = "tg-draft", REGS = "tg-regs";
  const store = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const QUALS = ["ثانوي", "دبلوم", "بكالوريوس", "ماجستير", "دكتوراه", "أخرى"];
  const ic = {
    cal: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 3v4M16 3v4M4 10h16"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21Z"/><circle cx="12" cy="10" r="2.3"/></svg>',
    seat: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3.3 2.8-5 5.5-5s4.9 1.7 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M15.8 14.2c2.4-.3 4.3 1.1 4.8 4.3"/></svg>',
    hour: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/></svg>',
    tick: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8Z"/></svg>'
  };
  const sapling = '<svg class="ss ss-small" viewBox="0 0 80 60"><path class="ground" d="M22 52h36"/><g class="sway" style="transform-origin:40px 52px"><path class="trunk" d="M40 52V33"/><path class="leaf leaf-l" d="M40 38c-3-8-10-11-17-10 1 7 7 12 17 10Z"/><path class="leaf leaf-r" d="M40 33c2-9 9-13 17-12-1 8-7 13-17 12Z"/></g></svg>';
  const tree = '<svg class="ss ss-large" viewBox="0 0 80 60"><path class="ground" d="M14 54h52"/><path class="trunk" d="M40 54V30M40 41l-7-6M40 37l6-5"/><g class="sway" style="transform-origin:40px 40px"><circle class="c-lime" cx="27" cy="26" r="11"/><circle class="c-teal" cx="53" cy="25" r="11"/><circle class="c-green" cx="40" cy="17" r="14"/></g></svg>';

  // ——— الحالة ———
  let programs = [];
  let S = blank();
  let pad = null;
  function blank() { return { step: 0, mode: "new", token: null, person: {}, kind: "", programId: "", answers: {}, files: {}, agreed: false, employerFile: null, note: "" }; }
  const program = () => programs.find((p) => p.id === S.programId) || null;
  const general = () => programs.find((p) => p.kind === "general") || null;
  const needsEmployer = () => { const p = program(); return !!(p && p.employerSig && S.person.nationality && !T.isSaudi(S.person)); };
  const steps = () => (S.mode === "edit" ? ["person", "details", "charter"] : ["person", "path", "details", "charter"]);

  // ——— الشاشات ———
  function show(id) {
    ["screenHome", "screenSteps", "screenStatus", "screenDone"].forEach((s) => ($("#" + s).hidden = s !== id));
    const inApp = id === "screenSteps" || id === "screenStatus";
    $("#topbar").hidden = !inApp;
    $("#dock").hidden = id !== "screenSteps";
    document.body.classList.toggle("stage-mode", !inApp);
    window.scrollTo(0, 0);
    inApp ? K.stage.stop() : K.stage.start($("#" + id));
  }

  // ——— حفظ المسودة ———
  let saveT;
  function saveDraft() {
    clearTimeout(saveT);
    saveT = setTimeout(() => {
      const ok = store.set(DRAFT, Object.assign({}, S, { agreed: false, savedAt: Date.now() }));
      if (!ok) store.set(DRAFT, Object.assign({}, S, { files: {}, employerFile: null, agreed: false, savedAt: Date.now() }));
      const st = $("#saveState"); st.textContent = "حُفظ في جهازك"; st.style.opacity = 1;
      clearTimeout(st._h); st._h = setTimeout(() => (st.style.opacity = 0), 1600);
    }, 400);
  }
  const localRegs = () => store.get(REGS, []);
  function rememberReg(r) {
    const list = localRegs().filter((x) => x.token !== r.token);
    list.unshift(Object.assign({ at: Date.now() }, r));
    store.set(REGS, list.slice(0, 20));
  }

  // ——— الحقول ———
  const field = (id, label, html, req, hint) => `<div class="field" data-f="${id}"><label for="${id}">${label}${req ? '<span class="req">*</span>' : ""}</label>${html}${hint ? `<p class="hint">${hint}</p>` : ""}<p class="hint err" hidden></p></div>`;
  const input = (id, val, attrs) => `<input class="input" id="${id}" name="${id}" value="${esc(val || "")}" ${attrs || ""}>`;
  const seg = (name, opts, val, multi) => `<div class="seg" role="${multi ? "group" : "radiogroup"}" id="${name}">${opts.map((o) => `<label class="${(multi ? (val || []).includes(o) : val === o) ? "checked" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${esc(o)}" ${(multi ? (val || []).includes(o) : val === o) ? "checked" : ""}>${esc(o)}</label>`).join("")}</div>`;
  const segField = (name, label, opts, val, req, multi) => `<div class="field" data-f="${name}"><span class="field-label">${label}${req ? '<span class="req">*</span>' : ""}${multi ? ' <small class="hint" style="display:inline">يمكن اختيار أكثر من واحد</small>' : ""}</span>${seg(name, opts, val, multi)}<p class="hint err" hidden></p></div>`;

  function hero(n, total, eyebrow, title, lead) {
    return `<div class="step-hero"><div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1><p class="lead">${lead}</p></div><div class="axis-num" aria-hidden="true">${toAr(n)}</div></div><div class="band" aria-hidden="true"></div>`;
  }
  const editNote = () => (S.mode === "edit" && S.note ? `<div class="note-box"><strong>ملاحظة الجمعية</strong>${esc(S.note)}</div>` : "");

  // ===================== الخطوات =====================
  function renderStep() {
    const list = steps(), key = list[S.step], n = S.step + 1, total = list.length;
    const host = $("#stepHost");
    let h = "";
    const eb = `${S.mode === "edit" ? "تعديل التسجيل — " : ""}الخطوة ${toAr(n)} من ${toAr(total)}`;
    if (key === "person") h = stepPerson(eb, n, total);
    if (key === "path") h = stepPath(eb, n, total);
    if (key === "details") h = stepDetails(eb, n, total);
    if (key === "charter") h = stepCharter(eb, n, total);
    host.innerHTML = `<div class="wrap step">${h}</div>`;
    $("#progressFill").style.width = (n / total) * 100 + "%";
    $("#dockCount").textContent = `${toAr(n)} / ${toAr(total)}`;
    $("#prevBtn").textContent = S.step === 0 ? "الرئيسية" : "السابق";
    $("#nextBtn").textContent = key === "charter" ? (S.mode === "edit" ? "أعد الإرسال" : "أوافق وأرسل") : "التالي";
    $("#topbarTitle").textContent = { person: "بياناتك", path: "نوع التطوع", details: "التفاصيل", charter: "ميثاق التطوع" }[key];
    if (key === "charter") mountCharter();
    window.scrollTo(0, 0);
  }

  // ١) البيانات الشخصية
  function stepPerson(eb, n, t) {
    const p = S.person;
    return hero(n, t, eb, "بياناتك الشخصية", "تعبّيها مرة وحدة، وتنحفظ في جهازك حتى ترسل") + editNote() +
      `<div class="card"><h2 class="card-title">الهوية والتواصل</h2><div class="grid grid-2">
        ${field("nationalId", "رقم الهوية أو الإقامة", input("nationalId", p.nationalId, 'inputmode="numeric" dir="ltr" maxlength="10" autocomplete="off"'), true, "١٠ أرقام")}
        ${field("phone", "رقم الجوال", input("phone", p.phone, 'inputmode="tel" dir="ltr" maxlength="10" placeholder="05xxxxxxxx" autocomplete="tel"'), true)}
        ${field("email", "البريد الإلكتروني", input("email", p.email, 'type="email" dir="ltr" autocomplete="email" placeholder="name@example.com"'), true, "توصلك عليه الوثيقة ورابط المتابعة")}
      </div></div>
      <div class="card"><h2 class="card-title">البيانات الأساسية</h2><div class="grid">
        ${field("name", "الاسم الرباعي", input("name", p.name, 'autocomplete="name"'), true)}
        <div class="grid grid-2">
          ${segField("nationality", "الجنسية", ["سعودي", "غير سعودي"], p.nationality, true)}
          ${segField("gender", "الجنس", ["ذكر", "أنثى"], p.gender, true)}
        </div>
        <div class="extra ${p.nationality === "غير سعودي" ? "open" : ""}" data-show-when="nationality=غير سعودي"><div><div class="extra-in">
          ${field("nationalityName", "اكتب جنسيتك", input("nationalityName", p.nationalityName, 'placeholder="مثال: مصري"'), true)}
        </div></div></div>
        <div class="grid grid-3">
          ${field("birthDate", "تاريخ الميلاد", input("birthDate", p.birthDate, 'type="date" max="' + new Date().toISOString().slice(0, 10) + '"'), true)}
          ${field("city", "المدينة", input("city", p.city || "الرياض"), true)}
          ${field("district", "الحي", input("district", p.district))}
        </div>
      </div></div>
      <div class="card"><h2 class="card-title">التعليم والعمل</h2><div class="grid">
        ${segField("qualification", "المؤهل الدراسي", QUALS, p.qualification, true)}
        <div class="grid grid-3">
          ${field("major", "التخصص", input("major", p.major))}
          ${field("employer", "جهة العمل", input("employer", p.employer), false, "يلزم لغير السعوديين في بعض البرامج")}
          ${field("jobTitle", "المسمى الوظيفي", input("jobTitle", p.jobTitle))}
        </div>
      </div></div>`;
  }
  let lookedUp = "";
  async function tryLookup() {
    const id = $("#nationalId").value, ph = $("#phone").value;
    if (S.mode === "edit" || id.length !== 10 || ph.length !== 10 || lookedUp === id + ph) return;
    lookedUp = id + ph;
    try {
      const r = await T.call("lookup", { nationalId: id, phone: ph });
      if (r.person && !S.person.name) {
        S.person = Object.assign({}, r.person, S.person, { nationalId: id, phone: ph });
        Object.keys(r.person).forEach((k) => { if (!S.person[k]) S.person[k] = r.person[k]; });
        renderStep(); K.toast("رجّعنا لك بياناتك من تسجيلك السابق");
      }
    } catch (e) {}
  }
  function readPerson() {
    const g = (id) => { const el = $("#" + id); return el ? el.value.trim() : ""; };
    const r = (n) => ($(`input[name="${n}"]:checked`) || {}).value || "";
    Object.assign(S.person, {
      nationalId: T.toEn(g("nationalId")), phone: T.toEn(g("phone")), email: g("email"), name: g("name").replace(/\s+/g, " "),
      nationality: r("nationality"), nationalityName: r("nationality") === "غير سعودي" ? g("nationalityName") : "",
      gender: r("gender"), birthDate: g("birthDate"), city: g("city"), district: g("district"),
      qualification: r("qualification"), major: g("major"), employer: g("employer"), jobTitle: g("jobTitle")
    });
  }
  function err(f, msg) {
    const box = $(`[data-f="${f}"]`); if (!box) return;
    const e = $(".err", box); e.hidden = !msg; e.textContent = msg || ""; e.style.color = "var(--danger)";
    const i = $(".input", box); if (i) i.classList.toggle("bad", !!msg);
    const sg = $(".seg", box); if (sg) sg.classList.toggle("bad", !!msg);
  }
  function validatePerson() {
    readPerson();
    const p = S.person, bad = [];
    const chk = (f, cond, msg) => { err(f, cond ? "" : msg); if (!cond) bad.push(f); };
    chk("nationalId", /^[12]\d{9}$/.test(p.nationalId), "رقم الهوية أو الإقامة ١٠ أرقام ويبدأ بـ ١ أو ٢");
    if (p.nationality && /^[12]\d{9}$/.test(p.nationalId)) {
      if (p.nationality === "سعودي" && p.nationalId[0] !== "1") { err("nationalId", "رقم الهوية الوطنية يبدأ بـ ١"); bad.push("nationalId"); }
      if (p.nationality === "غير سعودي" && p.nationalId[0] !== "2") { err("nationalId", "رقم الإقامة يبدأ بـ ٢"); bad.push("nationalId"); }
    }
    chk("phone", /^05\d{8}$/.test(p.phone), "رقم الجوال ١٠ أرقام ويبدأ بـ ٠٥");
    chk("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(p.email), "اكتب بريدا صحيحا");
    chk("name", p.name.split(" ").filter(Boolean).length >= 3, "اكتب الاسم كاملا (ثلاثي على الأقل)");
    chk("nationality", !!p.nationality, "اختر الجنسية");
    if (p.nationality === "غير سعودي") chk("nationalityName", !!p.nationalityName, "اكتب جنسيتك");
    chk("gender", !!p.gender, "اختر الجنس");
    chk("birthDate", !!p.birthDate, "اختر تاريخ الميلاد");
    chk("city", !!p.city, "اكتب المدينة");
    chk("qualification", !!p.qualification, "اختر المؤهل");
    if (S.mode === "edit" && needsEmployer()) chk("employer", !!p.employer, "اكتب جهة العمل، تظهر في وثيقة صاحب العمل");
    return bad;
  }

  // ٢) نوع التطوع
  function progArt(p) { return p.image ? `<img src="${esc(p.image)}" alt="">` : (p.kind === "general" ? sapling : tree); }
  function progChips(p) {
    const c = [];
    if (p.days && p.days.length) c.push(`<span class="chip">${ic.cal}${esc(p.days.join("، "))}</span>`);
    if (p.timeFrom) c.push(`<span class="chip">${ic.clock}${esc(T.programTime(p))}</span>`);
    if (p.hours) c.push(`<span class="chip">${ic.hour}${toAr(p.hours)} ساعة</span>`);
    if (p.seatsLeft != null) c.push(`<span class="chip ${p.seatsLeft ? "" : "warn"}">${ic.seat}${p.seatsLeft ? `متبقي ${toAr(p.seatsLeft)} مقعد` : "اكتملت المقاعد"}</span>`);
    if (p.gender && p.gender !== "الكل") c.push(`<span class="chip">${p.gender === "رجال" ? "للرجال" : "للنساء"}</span>`);
    return `<div class="chips">${c.join("")}</div>`;
  }
  function blocked(p) {
    if (p.seatsLeft === 0) return "اكتملت المقاعد";
    if (p.gender === "رجال" && S.person.gender === "أنثى") return "هذا البرنامج للرجال";
    if (p.gender === "نساء" && S.person.gender === "ذكر") return "هذا البرنامج للنساء";
    return "";
  }
  function stepPath(eb, n, t) {
    const gen = general(), progs = programs.filter((p) => p.kind !== "general");
    const kind = S.kind || (gen ? "" : "program");
    let h = hero(n, t, eb, "كيف تحب تتطوع؟", "اختر التطوع العام، أو سجّل في أحد برامجنا");
    h += `<div class="card"><div class="size-cards" role="radiogroup" aria-label="نوع التطوع">
      ${gen ? `<label class="size-card ${kind === "general" ? "checked" : ""}"><input type="radio" name="kind" value="general" ${kind === "general" ? "checked" : ""}><span class="size-scene" aria-hidden="true">${sapling}</span><h4>تطوع عام</h4><p>${esc(gen.desc || "انضم لفريق متطوعي غراس، ونرشحك للفرص المناسبة لك.")}</p></label>` : ""}
      <label class="size-card ${kind === "program" ? "checked" : ""}"><input type="radio" name="kind" value="program" ${kind === "program" ? "checked" : ""}><span class="size-scene" aria-hidden="true">${tree}</span><h4>برنامج محدد</h4><p>${progs.length ? `اختر من ${toAr(progs.length)} ${progs.length > 2 && progs.length < 11 ? "برامج" : "برنامج"} مفتوحة للتسجيل، بأيامها وساعاتها.` : "لا توجد برامج مفتوحة حاليا."}</p></label>
    </div>
    <div class="extra ${kind === "program" ? "open" : ""}" data-show-when="kind=program"><div><div class="extra-in" style="padding-top:8px">
      <p class="field-label" style="margin:10px 0 0">اختر البرنامج<span class="req">*</span></p>
      <div class="prog-list" role="radiogroup" aria-label="البرامج">
        ${progs.length ? progs.map((p) => { const b = blocked(p), on = S.programId === p.id; return `<label class="prog-card ${on ? "checked" : ""} ${b ? "off" : ""}"><input type="radio" name="programId" value="${esc(p.id)}" ${on ? "checked" : ""} ${b ? "disabled" : ""}><span class="prog-img" aria-hidden="true">${progArt(p)}</span><span><h4>${esc(p.name)}</h4><p>${esc(p.desc || "")}</p>${progChips(p)}${b ? `<p class="hint" style="color:var(--danger);margin-top:8px">${b}</p>` : ""}</span><span class="prog-tick" aria-hidden="true">${ic.tick}</span></label>`; }).join("") : '<p class="empty">لا توجد برامج مفتوحة حاليا</p>'}
      </div>
    </div></div></div></div>`;
    return h;
  }

  // ٣) التفاصيل والأسئلة
  function qField(q) {
    const id = "q_" + q.id, v = S.answers[q.id], req = !!q.required;
    switch (q.type) {
      case "long": return field(id, esc(q.label), `<textarea class="textarea" id="${id}" name="${id}">${esc(v || "")}</textarea>`, req);
      case "number": return field(id, esc(q.label), input(id, v, 'inputmode="numeric" dir="ltr"'), req);
      case "date": return field(id, esc(q.label), input(id, v, 'type="date"'), req);
      case "choice": return segField(id, esc(q.label), q.options || [], v, req);
      case "multi": return segField(id, esc(q.label), q.options || [], v || [], req, true);
      case "yesno": return segField(id, esc(q.label), ["نعم", "لا"], v, req);
      case "file": {
        const f = S.files[q.id];
        return `<div class="field" data-f="${id}"><span class="field-label">${esc(q.label)}${req ? '<span class="req">*</span>' : ""}</span>
          <label class="drop">${ic.up.replace("<svg", '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"')}<span>اضغط لاختيار ملف (صورة أو PDF)</span><input type="file" hidden data-q="${esc(q.id)}" accept="image/*,application/pdf"></label>
          <ul class="files">${f ? `<li><span class="fname">${esc(f.name)}</span><button type="button" data-rmq="${esc(q.id)}" aria-label="حذف">×</button></li>` : ""}</ul><p class="hint err" hidden></p></div>`;
      }
      default: return field(id, esc(q.label), input(id, v), req);
    }
  }
  function detailsCard(p) {
    const d = [];
    const add = (k, v, wide) => { if (v) d.push(`<div class="detail ${wide ? "wide" : ""}"><dt>${k}</dt><dd>${esc(v)}</dd></div>`); };
    add("المكان", p.location);
    if (p.startDate) add("المدة", `من ${T.fmtDate(p.startDate)}${p.endDate ? " إلى " + T.fmtDate(p.endDate) : ""}`);
    add("الأيام", (p.days || []).join("، "));
    add("الوقت", T.programTime(p));
    if (p.hours) add("الساعات التطوعية", toAr(p.hours) + " ساعة");
    if (p.seatsLeft != null) add("المقاعد المتبقية", toAr(p.seatsLeft));
    (p.extras || []).forEach((x) => add(x.k, x.v, (x.v || "").length > 40));
    return `<div class="card">${p.image ? `<img class="prog-hero-img" src="${esc(p.image)}" alt="">` : ""}<h2 class="card-title">${esc(p.name)}</h2>${p.desc ? `<p style="margin:-8px 0 18px;color:var(--ink-2)">${esc(p.desc)}</p>` : ""}${d.length ? `<dl class="detail-grid" style="margin:0">${d.join("")}</dl>` : ""}</div>`;
  }
  function stepDetails(eb, n, t) {
    const p = program();
    if (!p) return '<p class="empty">البرنامج غير متاح</p>';
    const qs = p.questions || [];
    return hero(n, t, eb, p.kind === "general" ? "التطوع العام" : "تفاصيل البرنامج", p.kind === "general" ? "عرّفنا على اهتماماتك ووقتك" : "اطّلع على تفاصيل البرنامج، وجاوب على أسئلته") + editNote() +
      (p.kind === "general" ? "" : detailsCard(p)) +
      (qs.length ? `<div class="card"><h2 class="card-title">${p.kind === "general" ? "اهتماماتك ووقتك" : "أسئلة البرنامج"}</h2><div class="grid">${qs.map(qField).join("")}</div></div>` : "");
  }
  function readAnswers() {
    const p = program(); if (!p) return;
    (p.questions || []).forEach((q) => {
      const id = "q_" + q.id;
      if (q.type === "file") return;
      if (q.type === "multi") S.answers[q.id] = $$(`input[name="${id}"]:checked`).map((i) => i.value);
      else if (["choice", "yesno"].includes(q.type)) S.answers[q.id] = ($(`input[name="${id}"]:checked`) || {}).value || "";
      else { const el = $("#" + id); if (el) S.answers[q.id] = el.value.trim(); }
    });
  }
  function validateDetails() {
    readAnswers();
    const p = program(), bad = [];
    (p.questions || []).forEach((q) => {
      const v = S.answers[q.id], id = "q_" + q.id;
      const empty = q.type === "file" ? !S.files[q.id] : Array.isArray(v) ? !v.length : !v;
      const ok = !q.required || !empty;
      err(id, ok ? "" : q.type === "file" ? "أرفق الملف" : "هذا الحقل مطلوب");
      if (!ok) bad.push(id);
    });
    return bad;
  }

  // ٤) الميثاق
  function charterHtml(p) {
    const map = T.placeholderMap(S.person, p, { regId: S.mode === "edit" ? S.regId : "يصدر بعد الإرسال" }, null);
    const raw = p.charterText || "";
    if (!raw.trim()) return `<h3>ميثاق التطوع — ${esc(p.name)}</h3><p>يلتزم المتطوع بأنظمة جمعية غراس لتنمية الطفل وقيمها، والمحافظة على سلامة الأطفال وخصوصيتهم، والحضور في المواعيد المحددة.</p>`;
    const lines = raw.split("\n");
    return lines.map((line, i) => {
      const html = esc(line).replace(/\{([^{}\n]{1,40})\}/g, (a, k) => {
        k = T.phKey(k);
        if (T.IMAGE_KEYS.includes(k)) return "";
        const v = map[k];
        return v ? `<mark>${esc(v)}</mark>` : "";
      });
      if (!line.trim()) return "";
      return i === 0 ? `<h3>${html}</h3>` : `<p>${html}</p>`;
    }).join("");
  }
  function stepCharter(eb, n, t) {
    const p = program(), emp = needsEmployer();
    return hero(n, t, eb, "ميثاق التطوع", "اقرأ الميثاق بعد ما تعبّى ببياناتك، ثم وقّع") + editNote() +
      (emp ? `<div class="safety-note"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9 8 10.5 4.6-1.5 8-5.5 8-10.5v-6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><span>هذا البرنامج يحتاج توقيع <strong style="font-weight:500">صاحب العمل</strong>. بعد ما ترسل، تنزّل الميثاق ويوقّعه صاحب العمل ويختمه، ثم ترفعه من صفحة المتابعة. الموقع يحفظ مكانك، فتقدر ترجع لها متى ما جهزت.</span></div>` : "") +
      `<div class="card"><h2 class="card-title">نص الميثاق</h2>
        <div class="paper" id="paper" tabindex="0" aria-label="نص الميثاق"><img class="paper-logo" src="assets/logo.png" alt="">${charterHtml(p)}</div>
        <p class="read-more">الأجزاء المظللة أُخذت من بياناتك. الختم وتوقيع الجمعية ينضافون عند الاعتماد.</p>
      </div>
      <div class="card"><h2 class="card-title">توقيعك</h2><div class="grid">
        <label class="agree ${S.agreed ? "checked" : ""}" id="agreeBox"><input type="checkbox" id="agree" ${S.agreed ? "checked" : ""}><span class="box" aria-hidden="true">${ic.tick}</span><span>قرأت ميثاق التطوع، وأوافق على كل ما فيه، وأقرّ بصحة بياناتي.</span></label>
        <div class="sigpad" id="sigpad"></div>
        <p class="hint">التوقيع يُحفظ مع الميثاق، ويظهر في الوثيقة المعتمدة.</p>
        ${S.mode === "edit" && emp ? `<div class="field"><span class="field-label">وثيقة صاحب العمل (اختياري إذا طُلب منك تحديثها)</span>
          <label class="drop">${ic.up.replace("<svg", '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"')}<span>ارفع الوثيقة الموقعة من صاحب العمل</span><input type="file" hidden id="empEdit" accept="image/*,application/pdf"></label>
          <ul class="files">${S.employerFile ? `<li><span class="fname">${esc(S.employerFile.name)}</span><button type="button" id="empEditRm" aria-label="حذف">×</button></li>` : ""}</ul></div>` : ""}
      </div></div>`;
  }
  function mountCharter() {
    pad = SignPad($("#sigpad"));
    $("#agree").addEventListener("change", (e) => { S.agreed = e.target.checked; $("#agreeBox").classList.toggle("checked", S.agreed); $("#agreeBox").classList.remove("bad"); });
    const ee = $("#empEdit");
    if (ee) ee.addEventListener("change", async () => { const f = ee.files[0]; if (!f) return; try { S.employerFile = await T.packFile(f); renderStep(); } catch (x) { K.toast(x.message); } });
    const rm = $("#empEditRm"); if (rm) rm.addEventListener("click", () => { S.employerFile = null; renderStep(); });
  }

  // ——— التنقل ———
  async function next() {
    const key = steps()[S.step];
    if (key === "person") {
      const bad = validatePerson();
      if (bad.length) return focusBad(bad);
    }
    if (key === "path") {
      const kind = ($('input[name="kind"]:checked') || {}).value;
      if (!kind) { K.toast("اختر نوع التطوع"); return; }
      S.kind = kind;
      if (kind === "general") S.programId = general().id;
      else {
        const pid = ($('input[name="programId"]:checked') || {}).value;
        if (!pid) { K.toast("اختر البرنامج"); $(".prog-list").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
        S.programId = pid;
      }
      if (blocked(program())) { K.toast(blocked(program())); return; }
      if (needsEmployer() && !S.person.employer) {
        K.toast("هذا البرنامج يحتاج جهة عملك. اكتبها في بياناتك");
        S.step = 0; renderStep(); err("employer", "اكتب جهة العمل، تظهر في وثيقة صاحب العمل"); $('[data-f="employer"]').scrollIntoView({ behavior: "smooth", block: "center" }); return;
      }
    }
    if (key === "details") { const bad = validateDetails(); if (bad.length) return focusBad(bad); }
    if (key === "charter") return submit();
    S.step++; saveDraft(); renderStep();
  }
  function focusBad(bad) {
    const el = $(`[data-f="${bad[0]}"]`);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); const i = $("input,textarea", el); if (i && i.type !== "radio" && i.type !== "checkbox" && i.type !== "file") setTimeout(() => i.focus({ preventScroll: true }), 300); }
    K.toast("راجع الحقول المظللة");
  }
  function prev() {
    if (S.step === 0) { if (S.mode === "edit") { openStatus(S.token); } else goHome(); return; }
    if (steps()[S.step] === "details") readAnswers();
    S.step--; saveDraft(); renderStep();
  }

  async function submit() {
    if (!S.agreed) { $("#agreeBox").classList.add("bad"); $("#agreeBox").scrollIntoView({ behavior: "smooth", block: "center" }); K.toast("أكّد موافقتك على الميثاق"); return; }
    if (pad.isEmpty()) { $("#sigpad").classList.add("bad"); $("#sigpad").scrollIntoView({ behavior: "smooth", block: "center" }); K.toast("وقّع في الخانة"); return; }
    const sig = pad.toDataURL();
    $("#nextBtn").disabled = true;
    K.courier.start(S.mode === "edit" ? "جار إعادة الإرسال…" : "جار إرسال تسجيلك…");
    K.courier.creep(5, 88);
    try {
      let r;
      const base = { person: S.person, answers: S.answers, files: S.files, signature: sig, siteUrl: location.origin + location.pathname };
      if (S.mode === "edit") {
        r = await T.call("resubmit", Object.assign(base, { token: S.token, employerFile: S.employerFile }));
        r.token = S.token; r.regId = S.regId;
      } else {
        r = await T.call("submit", Object.assign(base, { programId: S.programId }));
      }
      await K.courier.finish(S.mode === "edit" ? "وصل التعديل" : "وصل تسجيلك");
      const prog = program();
      rememberReg({ token: r.token, regId: r.regId, programName: prog.name, status: r.status });
      const wasEdit = S.mode === "edit";
      store.del(DRAFT); S = blank();
      showDone(r, prog, wasEdit);
      K.courier.hide();
    } catch (e) {
      await K.courier.hide();
      K.toast(e.message || "تعذر الإرسال، حاول مرة أخرى", 4200);
    } finally { $("#nextBtn").disabled = false; }
  }
  function showDone(r, prog, wasEdit) {
    const emp = r.status === S_.EMPLOYER;
    $("#doneKicker").textContent = wasEdit ? "وصل التعديل" : "وصل تسجيلك";
    $("#doneSub").textContent = emp
      ? "باقي خطوة وحدة: نزّل الميثاق، ويوقّعه صاحب العمل ويختمه، ثم ارفعه. أرسلنا لك رابط المتابعة على بريدك."
      : "سيراجع فريق الجمعية تسجيلك، وتوصلك الوثيقة المعتمدة على بريدك. وأرسلنا لك رابط المتابعة.";
    $("#doneRef").innerHTML = `${esc(prog ? prog.name : "")} — رقم التسجيل: <bdi dir="ltr">${esc(r.regId)}</bdi>`;
    $("#doneNext").textContent = emp ? "نزّل الميثاق لصاحب العمل" : "متابعة التسجيل";
    $("#doneNext").onclick = () => openStatus(r.token);
    show("screenDone");
  }

  // ===================== صفحة المتابعة =====================
  async function openStatus(token) {
    show("screenStatus");
    $("#topbarTitle").textContent = "متابعة التسجيل";
    $("#progressFill").style.width = "0";
    const host = $("#statusHost");
    host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">متابعة التسجيل</p><h1>لحظة…</h1><p class="lead">نجيب حالة تسجيلك</p></div></div></div>`;
    let d;
    try { d = await T.call("status", { token }); }
    catch (e) {
      host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">متابعة التسجيل</p><h1>ما قدرنا نفتح التسجيل</h1><p class="lead">${esc(e.message)}</p></div></div><button class="btn btn-primary" id="stHome">الرئيسية</button></div>`;
      $("#stHome").onclick = goHome; return;
    }
    const r = d.reg, st = r.status;
    rememberReg({ token, regId: r.regId, programName: r.programName, status: st });
    const pct = { [S_.EMPLOYER]: 45, [S_.CHANGES]: 45, [S_.PENDING]: 70, [S_.APPROVED]: 100, [S_.REJECTED]: 100 }[st] || 30;
    $("#progressFill").style.width = pct + "%";
    const tl = [];
    tl.push(["done", "أرسلت التسجيل ووقّعت الميثاق", T.fmtDate(r.created)]);
    if (r.employerRequired) tl.push([st === S_.EMPLOYER ? "now" : (st === S_.CHANGES ? "" : "done"), "توقيع صاحب العمل", st === S_.EMPLOYER ? "بانتظار رفع الوثيقة" : r.hasEmployer ? "تم الرفع" : ""]);
    if (st === S_.CHANGES) tl.push(["now", "مطلوب تعديل", "عدّل تسجيلك وأعد إرساله"]);
    tl.push([st === S_.APPROVED ? "done" : st === S_.PENDING ? "now" : st === S_.REJECTED ? "bad" : "", st === S_.REJECTED ? "لم يُعتمد التسجيل" : "اعتماد الجمعية", st === S_.PENDING ? "عند فريق الجمعية الحين" : st === S_.APPROVED ? T.fmtDate(r.approvedAt) : ""]);
    tl.push([st === S_.APPROVED ? "done" : "", "الوثيقة المعتمدة", st === S_.APPROVED ? "وصلت بريدك" : "توصلك على بريدك"]);
    const dot = (c, i) => (c === "done" ? ic.tick : c === "bad" ? "×" : toAr(i + 1));
    let action = "";
    if (st === S_.EMPLOYER) action = `<div class="card"><h2 class="card-title">وثيقة صاحب العمل</h2><ol class="steps-mini">
        <li><div><h4>نزّل الميثاق</h4><p>الميثاق فيه بياناتك وتوقيعك، وفيه خانة لصاحب العمل.</p><button class="btn btn-primary btn-icon" id="dlDraft" type="button">${ic.down}نزّل الميثاق (PDF)</button></div></li>
        <li><div><h4>يوقّعه صاحب العمل ويختمه</h4><p>اطبعه وخذ توقيع صاحب العمل وختمه في الخانة المخصصة.</p></div></li>
        <li><div><h4>ارفعه هنا</h4><p>صوّره بجوالك بوضوح أو ارفع ملف PDF. تقدر ترجع لهذه الصفحة في أي وقت.</p>
          <label class="drop">${ic.up.replace("<svg", '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"')}<span>اضغط لاختيار الصورة أو الملف</span><input type="file" hidden id="empFile" accept="image/*,application/pdf"></label>
          <ul class="files files-sel" id="empList"></ul>
          <button class="btn btn-ok btn-icon" id="empSend" type="button" disabled style="margin-top:12px">${ic.up}أرسل الوثيقة</button></div></li></ol></div>`;
    if (st === S_.PENDING) action = `<div class="card"><h2 class="card-title">تسجيلك عند فريق الجمعية</h2><p style="margin:0;color:var(--ink-2)">بعد الاعتماد تنضاف أختام الجمعية وتوقيعها، وتوصلك الوثيقة النهائية على <bdi dir="ltr">${esc(r.person.email)}</bdi>.</p></div>`;
    if (st === S_.CHANGES) action = `<div class="note-box"><strong>ملاحظة الجمعية</strong>${esc(r.note || "راجع بياناتك وأعد الإرسال")}</div><div class="card"><h2 class="card-title">عدّل تسجيلك</h2><p style="margin:0 0 16px;color:var(--ink-2)">نرجّعك لبياناتك كما أرسلتها، تعدّل اللي يلزم، وتوقّع من جديد.</p><button class="btn btn-primary btn-icon" id="editBtn" type="button">${ic.edit}ابدأ التعديل</button></div>`;
    if (st === S_.APPROVED) action = `<div class="card"><h2 class="card-title">مبروك، اعتُمد تسجيلك</h2><p style="margin:0 0 16px;color:var(--ink-2)">الوثيقة موقعة من جميع الأطراف، ووصلت بريدك. تقدر تنزّلها من هنا أيضا.</p><button class="btn btn-ok btn-icon" id="dlFinal" type="button">${ic.down}نزّل الوثيقة المعتمدة</button></div>`;
    if (st === S_.REJECTED) action = `<div class="note-box bad"><strong>نعتذر منك</strong>${esc(r.reason || "لم يُعتمد التسجيل")}</div>`;
    host.innerHTML = `<div class="wrap step">
      <div class="step-hero"><div><p class="eyebrow">متابعة التسجيل — <bdi dir="ltr">${esc(r.regId)}</bdi></p><h1>${esc(r.programName)}</h1><p class="lead"><span class="st" data-s="${esc(st)}">${esc(st)}</span></p></div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="card"><ol class="timeline">${tl.map((x, i) => `<li class="${x[0]}"><span class="dot">${dot(x[0], i)}</span><span class="t">${esc(x[1])}<small>${esc(x[2] || "")}</small></span></li>`).join("")}</ol></div>
      ${action}
      <div class="row-actions" style="margin-top:8px"><button class="btn btn-line" id="stNew" type="button">سجّل في برنامج آخر</button><button class="btn btn-ghost" id="stHome" type="button">الرئيسية</button></div>
    </div>`;
    $("#stHome").onclick = goHome;
    $("#stNew").onclick = () => startNew(r.person);
    const dl = async (which, b) => {
      b.disabled = true; const t = b.innerHTML; b.textContent = "جار التجهيز…";
      try { const f = await T.call("doc", { token, which }); download(T.b64ToBlob(f.b64, f.mime), f.name); }
      catch (e) { K.toast(e.message); } finally { b.disabled = false; b.innerHTML = t; }
    };
    if ($("#dlDraft")) $("#dlDraft").onclick = (e) => dl("draft", e.currentTarget);
    if ($("#dlFinal")) $("#dlFinal").onclick = (e) => dl("final", e.currentTarget);
    if ($("#editBtn")) $("#editBtn").onclick = () => startEdit(token, d);
    if ($("#empFile")) {
      let packed = null;
      $("#empFile").onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { packed = await T.packFile(f); $("#empList").innerHTML = `<li><span class="fname">${esc(packed.name)}</span></li>`; $("#empSend").disabled = false; }
        catch (x) { K.toast(x.message); }
      };
      $("#empSend").onclick = async () => {
        if (!packed) return;
        K.courier.start("جار رفع الوثيقة…"); K.courier.creep(5, 90);
        try { await T.call("uploadEmployer", { token, file: packed }); await K.courier.finish("وصلت الوثيقة"); await K.courier.hide(); openStatus(token); }
        catch (x) { await K.courier.hide(); K.toast(x.message, 4200); }
      };
    }
  }
  function download(blob, name) {
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  // ===================== البداية =====================
  async function loadPrograms() {
    const r = await T.call("config");
    programs = r.programs || [];
  }
  async function startNew(person) {
    try { await loadPrograms(); } catch (e) { K.toast(e.message); return; }
    if (!programs.length) { K.toast("التسجيل مغلق حاليا"); return; }
    S = blank();
    if (person) S.person = Object.assign({}, person);
    show("screenSteps"); renderStep();
  }
  async function startEdit(token, d) {
    try { await loadPrograms(); } catch (e) { K.toast(e.message); return; }
    S = blank();
    Object.assign(S, { mode: "edit", token, regId: d.reg.regId, person: Object.assign({}, d.reg.person), programId: d.reg.programId, answers: Object.assign({}, d.reg.answers || {}), note: d.reg.note });
    if (!program()) programs.push(d.program);
    S.kind = program().kind === "general" ? "general" : "program";
    show("screenSteps"); renderStep();
  }
  function resumeDraft() {
    const dft = store.get(DRAFT, null); if (!dft) return false;
    loadPrograms().then(() => {
      S = Object.assign(blank(), dft);
      if (S.mode === "edit" && !program()) { store.del(DRAFT); goHome(); return; }
      if (S.step > 0 && !program() && steps()[S.step] !== "path") S.step = Math.min(S.step, 1);
      S.step = Math.min(S.step, steps().length - 1);
      show("screenSteps"); renderStep(); K.toast("رجّعناك لنفس المكان اللي وقفت عنده");
    }).catch((e) => { K.toast(e.message); goHome(); });
    return true;
  }
  function goHome() {
    show("screenHome");
    $("#resumeBtn").hidden = !store.get(DRAFT, null);
    const list = localRegs();
    const box = $("#myRegs");
    box.hidden = !list.length;
    box.innerHTML = list.length ? `<h2>تسجيلاتك في هذا الجهاز</h2>` + list.slice(0, 5).map((r) => `<button class="my-reg" type="button" data-t="${esc(r.token)}"><strong>${esc(r.programName)}</strong><small><bdi dir="ltr">${esc(r.regId)}</bdi></small><span class="st" data-s="${esc(r.status)}">${esc(r.status)}</span></button>`).join("") : "";
  }

  // الربط (مرة واحدة على حاوية الخطوات)
  K.theme.init();
  const stepHost = $("#stepHost");
  K.bindChoices(stepHost);
  stepHost.addEventListener("input", (e) => {
    const key = steps()[S.step], t = e.target;
    if (key === "person") {
      if (t.id === "nationalId" || t.id === "phone") { t.value = T.toEn(t.value).replace(/\D/g, "").slice(0, 10); tryLookup(); }
      readPerson(); saveDraft();
    } else if (key === "details") { readAnswers(); saveDraft(); }
  });
  stepHost.addEventListener("change", async (e) => {
    const key = steps()[S.step], f = e.target;
    if (key === "person") { readPerson(); saveDraft(); return; }
    if (key !== "details") return;
    if (f.type === "file" && f.dataset.q) {
      const file = f.files[0]; if (!file) return;
      try { S.files[f.dataset.q] = await T.packFile(file); S.answers[f.dataset.q] = S.files[f.dataset.q].name; readAnswers(); renderStep(); saveDraft(); }
      catch (x) { K.toast(x.message || "تعذر قراءة الملف"); }
      return;
    }
    readAnswers(); saveDraft();
  });
  stepHost.addEventListener("click", (e) => {
    const b = e.target.closest("[data-rmq]");
    if (b) { readAnswers(); delete S.files[b.dataset.rmq]; delete S.answers[b.dataset.rmq]; renderStep(); saveDraft(); }
  });
  $("#startBtn").onclick = (e) => {
    const b = e.currentTarget;
    if (store.get(DRAFT, null) && !b.dataset.sure) { b.dataset.sure = "1"; b.textContent = "ابدأ من جديد (يحذف غير المكتمل)"; K.toast("عندك تسجيل لم يكتمل. اضغط «أكمل تسجيلك» أو ابدأ من جديد"); return; }
    delete b.dataset.sure; b.textContent = "سجّل متطوعا"; store.del(DRAFT); startNew();
  };
  $("#resumeBtn").onclick = () => resumeDraft();
  $("#myRegs").addEventListener("click", (e) => { const b = e.target.closest("[data-t]"); if (b) openStatus(b.dataset.t); });
  $("#nextBtn").onclick = next;
  $("#prevBtn").onclick = prev;
  $("#doneHome").onclick = goHome;
  $("#homeLink").onclick = (e) => { e.preventDefault(); goHome(); };
  $("#recoverBtn").onclick = () => { const f = $("#recoverForm"); f.hidden = !f.hidden; if (!f.hidden) $("#recId").focus(); };
  ["recId", "recPhone"].forEach((id) => $("#" + id).addEventListener("input", (e) => (e.target.value = T.toEn(e.target.value).replace(/\D/g, "").slice(0, 10))));
  $("#recoverForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("#recId").value, ph = $("#recPhone").value, m = $("#recMsg");
    if (id.length !== 10 || ph.length !== 10) { m.textContent = "اكتب رقم الهوية والجوال كاملين"; return; }
    m.style.color = "rgba(255,255,255,.75)"; m.textContent = "جار الإرسال…";
    try { await T.call("resendLinks", { nationalId: id, phone: ph, siteUrl: location.origin + location.pathname }); m.textContent = "إذا كانت البيانات مطابقة، تصلك الروابط على بريدك خلال دقائق."; }
    catch (x) { m.style.color = ""; m.textContent = x.message; }
  });

  // أول فتح: رابط المتابعة ← مسودة ← تسجيل ينتظر إجراء ← الرئيسية
  const hashT = (location.hash.match(/[#&]t=([A-Za-z0-9]+)/) || [])[1];
  if (hashT) { history.replaceState(null, "", location.pathname); openStatus(hashT); }
  else if (!resumeDraft()) {
    const waiting = localRegs().find((r) => r.status === S_.EMPLOYER || r.status === S_.CHANGES);
    if (waiting) openStatus(waiting.token); else goHome();
  }
  if (!T.LIVE) console.info("تطوع غراس: وضع التجربة (بلا خادم)");
})();
