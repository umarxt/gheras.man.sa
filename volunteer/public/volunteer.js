/* تطوع غراس — واجهة المتطوع */
(function () {
  "use strict";
  const K = GherasKit, $ = K.$, $$ = K.$$, T = TG, esc = T.esc, toAr = T.toAr, S_ = T.STATUS;
  const DRAFT = T.LIVE ? "tg-draft-live" : "tg-draft", REGS = T.LIVE ? "tg-regs-live" : "tg-regs"; // تجارب وضع التجربة لا تختلط بالتسجيلات الحقيقية
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
  function blank() { return { vtoken: "", step: 0, mode: "new", token: null, person: {}, kind: "", programId: "", answers: {}, files: {}, agreed: false, employerPhone: "", note: "" }; }
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
      if (!ok) store.set(DRAFT, Object.assign({}, S, { files: {}, agreed: false, savedAt: Date.now() }));
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
  const segField = (name, label, opts, val, req, multi) => `<div class="field" data-f="${name}"><span class="field-label">${label}${req ? '<span class="req">*</span>' : ""}${multi ? ' <small class="hint" style="display:inline">تقدر تختار أكثر من خيار</small>' : ""}</span>${seg(name, opts, val, multi)}<p class="hint err" hidden></p></div>`;

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
        ${field("nationalId", "رقم الهوية أو الإقامة", input("nationalId", p.nationalId, 'inputmode="numeric" dir="ltr" maxlength="10" autocomplete="off"'), true, S.vtoken ? "بياناتك معبأة من سجلنا" : "١٠ أرقام. إذا سجلت عندنا قبل، نرجّع لك بياناتك")}
        ${field("phone", "رقم الجوال", input("phone", p.phone, 'inputmode="tel" dir="ltr" maxlength="10" placeholder="05xxxxxxxx" autocomplete="tel"'), true)}
        ${field("email", "البريد الإلكتروني", input("email", p.email, 'type="email" dir="ltr" autocomplete="email" placeholder="name@example.com"'), true, "توصلك عليه الوثيقة ورابط المتابعة")}
      </div></div>
      <div class="card"><h2 class="card-title">البيانات الأساسية</h2><div class="grid">
        ${field("name", "الاسم الرباعي", input("name", p.name, 'autocomplete="name"'), true)}
        <div class="grid grid-2">
          ${field("nationality", "الجنسية", input("nationality", p.nationality === "سعودي" ? "سعودي" : p.nationalityName || "", 'list="natList" autocomplete="off" placeholder="اختر أو ابحث"') + `<datalist id="natList">${T.NATIONALITIES.map((n) => `<option value="${esc(n)}">`).join("")}</datalist>`, true)}
          ${segField("gender", "الجنس", ["ذكر", "أنثى"], p.gender, true)}
        </div>
        <div class="grid grid-3">
          ${field("birthDate", "تاريخ الميلاد", input("birthDate", p.birthDate, 'type="date" max="' + new Date().toISOString().slice(0, 10) + '"'), true, '<span class="age-hint" id="ageHint">' + ageHint(p.birthDate) + "</span>")}
          ${field("city", "المدينة", input("city", p.city || "الرياض"), true)}
          ${field("district", "الحي", input("district", p.district))}
        </div>
      </div></div>
      <div class="card"><h2 class="card-title">التعليم والعمل</h2><div class="grid">
        ${segField("qualification", "المؤهل الدراسي", QUALS, p.qualification, true)}
        <div class="grid grid-3">
          ${field("major", "التخصص", input("major", p.major))}
          ${field("employer", "جهة العمل", input("employer", p.employer))}
          ${field("jobTitle", "المسمى الوظيفي", input("jobTitle", p.jobTitle))}
        </div>
      </div></div>`;
  }
  // ——— التعرف على المتطوع المسجل: برقم الهوية فقط، وتتعبى بياناته مباشرة ———
  let lookedUp = "";
  async function startLookup(force) {
    const id = $("#nationalId").value;
    if (S.mode === "edit" || !/^[12]\d{9}$/.test(id) || (!force && lookedUp === id) || (S.vtoken && S.person.nationalId === id)) return;
    lookedUp = id;
    try {
      const r = await T.call("lookupStart", { nationalId: id });
      if (!r.found || $("#nationalId").value !== id) return;
      const keep = { email: S.person.email };
      S.person = Object.assign({}, r.person, { nationalId: id });
      if (!S.person.email && keep.email) S.person.email = keep.email;
      S.vtoken = r.vtoken || "";
      saveDraft(); renderStep();
      topToast(`أهلا ${esc(String(r.person.name || "").split(" ")[0])}، رجّعنا لك بياناتك`, "عدّل أي شيء تغيّر، ونحدّثه في سجلك", 0, "user");
    } catch (e) { if (e && e.message) K.toast(e.message); }
  }

  // ——— العمر ———
  function ageHint(v) {
    const a = T.ageParts(v);
    return a && a.y >= 1 ? `عمرك ${T.arCount(a.y, T.W_AM)}` : "";
  }
  let ageT, ageShown = "";
  function updateAge(announce) {
    const v = ($("#birthDate") || {}).value || "";
    const h = $("#ageHint"); if (h) h.textContent = ageHint(v);
    clearTimeout(ageT);
    if (!announce) return;
    ageT = setTimeout(() => {
      const a = T.ageParts(v);
      if (!a || a.y < 3 || a.y > 100 || ageShown === v) return;
      ageShown = v;
      topToast(`عمرك اليوم ${T.ageSentence(a)}`, "كل يوم منها فرصة تزرع فيها أثرا", 0, "rings");
    }, 650);
  }

  // ——— إشعار علوي لطيف ———
  const TT_ICONS = {
    work: '<svg class="spin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5.6"/><circle cx="12" cy="12" r="2.2"/><path d="M12 2.6v3.8M12 17.6v3.8M2.6 12h3.8M17.6 12h3.8M5.4 5.4l2.7 2.7M15.9 15.9l2.7 2.7M18.6 5.4l-2.7 2.7M8.1 15.9l-2.7 2.7"/></svg>',
    rings: '<svg class="rings" viewBox="0 0 24 24"><circle cx="12" cy="12" r="2.2"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="7.8"/><circle cx="12" cy="12" r="10"/><path d="M12 12l6.6 5.4"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.5 5.2 5.7.8-4.1 4 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4.1-4 5.7-.8Z"/></svg>',
    cake: '<svg viewBox="0 0 24 24"><path d="M4 20h16M5 20v-6.5a1.5 1.5 0 0 1 1.5-1.5h11a1.5 1.5 0 0 1 1.5 1.5V20M5 15.5c1.2 1 2.3 1 3.5 0s2.3-1 3.5 0 2.3 1 3.5 0 2.3-1 3.5 0M12 12V8.5M12 4.5c.9 1 .9 2 0 3-.9-1-.9-2 0-3Z"/></svg>',
    hour: '<svg viewBox="0 0 24 24"><path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8" r="3.6"/><path d="M3.5 20c.7-3.8 3.3-5.8 6.5-5.8 1.4 0 2.6.4 3.6 1M15 18.5l2 2 4-4.5"/></svg>'
  };
  function topToast(title, sub, ms, kind) {
    const t = $("#toastTop"); if (!t) return;
    t.dataset.kind = kind || "star";
    t.innerHTML = `<span class="tt-ic" aria-hidden="true">${TT_ICONS[kind] || TT_ICONS.star}</span><span class="tt-tx"><strong>${title}</strong>${sub ? `<span>${sub}</span>` : ""}</span>`;
    t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), ms || 5200);
  }
  const natOf = (v) => (!v ? "" : v === "سعودي" ? "سعودي" : "غير سعودي");
  function readPerson() {
    const g = (id) => { const el = $("#" + id); return el ? el.value.trim() : ""; };
    const r = (n) => ($(`input[name="${n}"]:checked`) || {}).value || "";
    Object.assign(S.person, {
      nationalId: T.toEn(g("nationalId")), phone: T.toEn(g("phone")), email: g("email"), name: g("name").replace(/\s+/g, " "),
      nationality: natOf(g("nationality")), nationalityName: natOf(g("nationality")) === "غير سعودي" ? g("nationality") : "",
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
    chk("nationality", p.nationality === "سعودي" || T.NATIONALITIES.includes(p.nationalityName), "اختر الجنسية من القائمة");
    chk("gender", !!p.gender, "اختر الجنس");
    chk("birthDate", !!p.birthDate, "اختر تاريخ الميلاد");
    chk("city", !!p.city, "اكتب المدينة");
    chk("qualification", !!p.qualification, "اختر المؤهل");
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
      case "number":
        if (q.id === "q_hours") return field(id, esc(q.label), input(id, v, 'inputmode="numeric" dir="ltr" maxlength="1" placeholder="من ١ إلى ٨"'), req, `<span id="weeklyHint">${weeklyText()}</span>`);
        return field(id, esc(q.label), input(id, v, 'inputmode="numeric" dir="ltr"'), req);
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
  // الساعات اليومية × عدد الأيام المتاحة = الساعات الأسبوعية (تظهر فقط، ويُحفظ اليومي)
  function weeklyText() {
    const h = Number(T.toEn(S.answers.q_hours || "")), n = (S.answers.q_days || []).length;
    if (!h || h > 8) return "الحد ٨ ساعات في اليوم";
    if (!n) return "اختر الأيام المتاحة، ونحسب لك ساعاتك في الأسبوع";
    return `يعني ${T.arCount(h * n, T.W_HOUR)} أسبوعيا`;
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
  function hoursBanner(p) {
    const n = Number(p.hours);
    return `<div class="hours-banner"><svg class="hg" viewBox="0 0 40 56" aria-hidden="true"><path class="hg-frame" d="M6 3h28M6 53h28M9 3c0 13 9 16 9 25S9 40 9 53M31 3c0 13-9 16-9 25s9 12 9 25"/><path class="hg-top" d="M12 12h16c-1 6-6 9-8 12-2-3-7-6-8-12Z"/><path class="hg-bot" d="M11 50c1-6 5-9 9-11 4 2 8 5 9 11Z"/><path class="hg-sand" d="M20 25v16"/></svg>
      <div><p class="hb-k">بنهاية هذه الفرصة تحصل على</p><p class="hb-n"><b>${toAr(n)}</b> ${n === 1 ? "ساعة" : n === 2 ? "ساعتين" : n <= 10 ? "ساعات" : "ساعة"} تطوعية</p><p class="hb-s">${p.days && p.days.length ? esc(p.days.join("، ")) + (p.timeFrom ? " — " + esc(T.programTime(p)) : "") : "تُضاف لرصيدك بعد إتمام البرنامج"}</p></div></div>`;
  }
  function stepDetails(eb, n, t) {
    const p = program();
    if (!p) return '<p class="empty">البرنامج غير متاح</p>';
    const qs = p.questions || [];
    return hero(n, t, eb, p.kind === "general" ? "التطوع العام" : "تفاصيل البرنامج", p.kind === "general" ? "عرّفنا على اهتماماتك ووقتك" : "اطّلع على تفاصيل البرنامج، وجاوب على أسئلته") + editNote() +
      (p.kind !== "general" && Number(p.hours) ? hoursBanner(p) : "") +
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
      let ok = !q.required || !empty, msg = q.type === "file" ? "أرفق الملف" : "هذا الحقل مطلوب";
      if (ok && q.id === "q_hours" && v) { const n = Number(T.toEn(v)); if (!(n >= 1 && n <= 8)) { ok = false; msg = "اكتب رقما من ١ إلى ٨ ساعات"; } }
      err(id, ok ? "" : msg);
      if (!ok) bad.push(id);
    });
    return bad;
  }

  // ٤) الميثاق
  function charterHtml(p) { return charterFor(S.person, p, S.mode === "edit" ? S.regId : "يصدر بعد الإرسال"); }
  function charterFor(person, p, regId) {
    const map = T.placeholderMap(person, p, { regId }, null);
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
      (emp ? `<div class="safety-note"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.5 4 5.5v6c0 5 3.4 9 8 10.5 4.6-1.5 8-5.5 8-10.5v-6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg><span>هذا البرنامج يحتاج توقيع <strong style="font-weight:500">صاحب العمل</strong>. بعد ما ترسل، يوصله رابط على الواتساب، يفتحه ويقرأ الميثاق ويوقّع من جواله. نبلغك أول ما يوقّع.</span></div>` : "") +
      `<div class="card"><h2 class="card-title">نص الميثاق</h2>
        <div class="paper" id="paper" tabindex="0" aria-label="نص الميثاق"><img class="paper-logo" src="assets/logo.png" alt="">${charterHtml(p)}</div>
        <p class="read-more">الأجزاء المظللة أُخذت من بياناتك. الختم وتوقيع الجمعية ينضافون عند الاعتماد.</p>
      </div>
      <div class="card"><h2 class="card-title">توقيعك</h2><div class="grid">
        <label class="agree ${S.agreed ? "checked" : ""}" id="agreeBox"><input type="checkbox" id="agree" ${S.agreed ? "checked" : ""}><span class="box" aria-hidden="true">${ic.tick}</span><span>قرأت ميثاق التطوع، وأوافق على كل ما فيه، وأقرّ بصحة بياناتي.</span></label>
        <div class="sigpad" id="sigpad"></div>
        <p class="hint">التوقيع يُحفظ مع الميثاق، ويظهر في الوثيقة المعتمدة.</p>
      </div></div>` +
      (emp ? `<div class="card"><h2 class="card-title">صاحب العمل</h2><div class="grid">${field("employerPhone", "جوال صاحب العمل", input("employerPhone", S.employerPhone, 'inputmode="tel" dir="ltr" maxlength="10" placeholder="05xxxxxxxx" autocomplete="off"'), true, "يوصله رابط على الواتساب يوقّع منه على الميثاق إلكترونيا.")}</div></div>` : "");
  }
  function mountCharter() {
    pad = SignPad($("#sigpad"));
    $("#agree").addEventListener("change", (e) => { S.agreed = e.target.checked; $("#agreeBox").classList.toggle("checked", S.agreed); $("#agreeBox").classList.remove("bad"); });
    const ep = $("#employerPhone");
    if (ep) ep.addEventListener("input", () => { ep.value = T.toEn(ep.value).replace(/\D/g, "").slice(0, 10); S.employerPhone = ep.value; err("employerPhone", ""); saveDraft(); });
  }

  // ——— التنقل ———
  // اختيار التطوع العام أو برنامج ينقل للخطوة التالية تلقائيا بعد لحظة
  let autoT;
  function autoNext(ms) {
    clearTimeout(autoT);
    const at = S.step;
    autoT = setTimeout(() => { if (S.step === at && steps()[S.step] === "path") next(); }, ms || 450);
  }
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
    if (needsEmployer() && !/^05\d{8}$/.test(S.employerPhone || "")) { err("employerPhone", "اكتب جوال صاحب العمل، ١٠ أرقام ويبدأ بـ ٠٥"); $('[data-f="employerPhone"]').scrollIntoView({ behavior: "smooth", block: "center" }); K.toast("اكتب جوال صاحب العمل"); return; }
    if (needsEmployer() && S.employerPhone === S.person.phone) { err("employerPhone", "هذا جوالك أنت، اكتب جوال صاحب العمل"); $('[data-f="employerPhone"]').scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (pad.isEmpty()) { $("#sigpad").classList.add("bad"); $("#sigpad").scrollIntoView({ behavior: "smooth", block: "center" }); K.toast("وقّع في الخانة"); return; }
    const sig = pad.toDataURL();
    $("#nextBtn").disabled = true;
    K.courier.start(S.mode === "edit" ? "جار إعادة الإرسال…" : "جار إرسال تسجيلك…");
    K.courier.creep(5, 88);
    try {
      let r;
      const base = { person: S.person, answers: S.answers, files: S.files, signature: sig, vtoken: S.vtoken || "", siteUrl: location.origin + location.pathname, employerPhone: needsEmployer() ? S.employerPhone : "" };
      if (S.mode === "edit") {
        r = await T.call("resubmit", Object.assign(base, { token: S.token }));
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
      ? (r.waSent === false
        ? "باقي خطوة وحدة: توقيع صاحب العمل. ما قدرنا نرسل له الرابط الحين، افتح صفحة المتابعة وأعد الإرسال."
        : "باقي خطوة وحدة: أرسلنا رابط التوقيع لصاحب العمل على الواتساب. أول ما يوقّع، يوصل طلبك للمشرف للاعتماد.")
      : "سيراجع فريق الجمعية تسجيلك، وتوصلك الوثيقة المعتمدة على بريدك. وأرسلنا لك رابط المتابعة.";
    $("#doneRef").innerHTML = `${esc(prog ? prog.name : "")} — رقم التسجيل: <bdi dir="ltr">${esc(r.regId)}</bdi>`;
    $("#doneNext").textContent = "متابعة التسجيل";
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
    if (r.employerRequired) tl.push([st === S_.EMPLOYER ? "now" : (st === S_.CHANGES ? "" : "done"), "توقيع صاحب العمل", st === S_.EMPLOYER ? "بانتظار التوقيع" : r.hasEmployer ? "تم التوقيع" : ""]);
    if (st === S_.CHANGES) tl.push(["now", "مطلوب تعديل", "عدّل تسجيلك وأعد إرساله"]);
    tl.push([st === S_.APPROVED ? "done" : st === S_.PENDING ? "now" : st === S_.REJECTED ? "bad" : "", st === S_.REJECTED ? "لم يُعتمد التسجيل" : "اعتماد الجمعية", st === S_.PENDING ? "عند فريق الجمعية الحين" : st === S_.APPROVED ? T.fmtDate(r.approvedAt) : ""]);
    tl.push([st === S_.APPROVED ? "done" : "", "الوثيقة المعتمدة", st === S_.APPROVED ? "وصلت بريدك" : "توصلك على بريدك"]);
    const dot = (c, i) => (c === "done" ? ic.tick : c === "bad" ? "×" : toAr(i + 1));
    let action = "";
    if (st === S_.EMPLOYER) action = `<div class="card"><h2 class="card-title">توقيع صاحب العمل</h2>
        <p style="margin:0 0 14px;color:var(--ink-2)">${r.employerPhone ? `أرسلنا رابط التوقيع على الواتساب إلى <bdi dir="ltr">${esc(r.employerPhone)}</bdi>. يفتحه صاحب العمل ويقرأ الميثاق ويوقّع من جواله، وأول ما يوقّع يوصل طلبك للمشرف.` : "اكتب جوال صاحب العمل، ونرسل له رابط التوقيع على الواتساب."}</p>
        <div class="row-actions">${r.employerPhone ? '<button class="btn btn-primary" type="button" id="empResend">إعادة إرسال الرابط</button>' : ""}<button class="btn btn-line" type="button" id="empChange">${r.employerPhone ? "تغيير رقم صاحب العمل" : "إضافة جوال صاحب العمل"}</button></div>
        <div class="field" id="empNewBox" hidden style="margin-top:14px"><label for="empNew">جوال صاحب العمل الجديد</label><div class="verify-row"><input class="input" id="empNew" inputmode="tel" dir="ltr" maxlength="10" placeholder="05xxxxxxxx"><button class="btn btn-primary btn-sm" type="button" id="empNewGo">أرسل الرابط</button></div><p class="hint err" hidden id="empNewErr"></p></div></div>`;
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
    if ($("#dlFinal")) $("#dlFinal").onclick = (e) => dl("final", e.currentTarget);
    if ($("#editBtn")) $("#editBtn").onclick = () => startEdit(token, d);
    const resend = async (phone, b) => {
      const t = b.textContent; b.disabled = true; b.textContent = "جار الإرسال…";
      try {
        const res = await T.call("resendEmployer", { token, phone: phone || "" });
        if (res.waSent === false) K.toast("ما قدرنا نرسل الرسالة الحين، حاول بعد قليل", 4200);
        else K.toast("أرسلنا رابط التوقيع لصاحب العمل على الواتساب", 3600);
        if (res.demoLink) console.info("وضع التجربة: افتح هذا الرابط لتجربة توقيع صاحب العمل", location.pathname + res.demoLink);
        if (phone) openStatus(token);
      } catch (x) { K.toast(x.message, 4200); }
      finally { b.disabled = false; b.textContent = t; }
    };
    if ($("#empResend")) $("#empResend").onclick = (e) => resend("", e.currentTarget);
    if ($("#empChange")) $("#empChange").onclick = () => { $("#empNewBox").hidden = false; $("#empNew").focus(); };
    if ($("#empNew")) {
      $("#empNew").oninput = (e) => { e.target.value = T.toEn(e.target.value).replace(/\D/g, "").slice(0, 10); $("#empNewErr").hidden = true; };
      $("#empNewGo").onclick = (e) => {
        const v = $("#empNew").value, er = $("#empNewErr");
        if (!/^05\d{8}$/.test(v)) { er.hidden = false; er.style.color = "var(--danger)"; er.textContent = "رقم الجوال ١٠ أرقام ويبدأ بـ ٠٥"; return; }
        if (v === (r.person || {}).phone) { er.hidden = false; er.style.color = "var(--danger)"; er.textContent = "هذا جوالك أنت، اكتب جوال صاحب العمل"; return; }
        resend(v, e.currentTarget);
      };
    }
  }

  // ===================== صفحة توقيع صاحب العمل (يفتحها من رابط الواتساب) =====================
  async function openEmployer(etoken) {
    show("screenStatus");
    $("#topbarTitle").textContent = "توقيع صاحب العمل";
    $("#progressFill").style.width = "0";
    const host = $("#statusHost");
    host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">توقيع صاحب العمل</p><h1>لحظة…</h1><p class="lead">نجهز لك الميثاق</p></div></div></div>`;
    let d;
    try { d = await T.call("employerView", { etoken }); }
    catch (e) {
      host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">توقيع صاحب العمل</p><h1>ما قدرنا نفتح الرابط</h1><p class="lead">${esc(e.message)}</p></div></div></div>`;
      return;
    }
    const p = d.program || {};
    if (d.signed) {
      host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">توقيع صاحب العمل</p><h1>شكرا لك</h1><p class="lead">سبق توقيعك على ميثاق ${esc(d.volunteer)} في ${esc(p.name || "")}. ما يحتاج منك شيء ثاني.</p></div></div></div>`;
      $("#progressFill").style.width = "100%"; return;
    }
    host.innerHTML = `<div class="wrap step">
      <div class="step-hero"><div><p class="eyebrow">توقيع صاحب العمل</p><h1>ميثاق التطوع</h1><p class="lead">السلام عليكم، طلب منك <strong style="font-weight:500">${esc(d.volunteer)}</strong> التوقيع على ميثاق التطوع في <strong style="font-weight:500">${esc(p.name || "")}</strong> لدى جمعية غراس لتنمية الطفل.</p></div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="card"><h2 class="card-title">نص الميثاق</h2>
        <div class="paper" tabindex="0" aria-label="نص الميثاق"><img class="paper-logo" src="assets/logo.png" alt="">${charterFor(d.person || {}, p, d.regId)}</div>
        <p class="read-more">الأجزاء المظللة بيانات المتطوع كما أدخلها.</p></div>
      <div class="card"><h2 class="card-title">توقيعك</h2><div class="grid">
        <label class="agree" id="eAgreeBox"><input type="checkbox" id="eAgree"><span class="box" aria-hidden="true">${ic.tick}</span><span>اطلعت على الميثاق، وأوافق على تطوع ${esc(d.volunteer)} في هذا البرنامج.</span></label>
        <div class="sigpad" id="eSig"></div>
        <button class="btn btn-ok" type="button" id="eGo">أوقّع وأوافق</button>
      </div></div></div>`;
    const epad = SignPad($("#eSig"));
    $("#eAgree").onchange = (e) => { $("#eAgreeBox").classList.toggle("checked", e.target.checked); $("#eAgreeBox").classList.remove("bad"); };
    $("#eGo").onclick = async (e) => {
      if (!$("#eAgree").checked) { $("#eAgreeBox").classList.add("bad"); K.toast("أكّد موافقتك"); return; }
      if (epad.isEmpty()) { $("#eSig").classList.add("bad"); K.toast("وقّع في الخانة"); return; }
      e.currentTarget.disabled = true;
      K.courier.start("جار إرسال توقيعك…"); K.courier.creep(5, 90);
      try {
        await T.call("employerSign", { etoken, signature: epad.toDataURL() });
        await K.courier.finish("وصل توقيعك"); await K.courier.hide();
        host.innerHTML = `<div class="wrap step"><div class="step-hero"><div><p class="eyebrow">توقيع صاحب العمل</p><h1>شكرا لك</h1><p class="lead">وصل توقيعك، وانتقل طلب ${esc(d.volunteer)} للمشرف للاعتماد. ما يحتاج منك شيء ثاني.</p></div></div></div>`;
        $("#progressFill").style.width = "100%"; window.scrollTo(0, 0);
      } catch (x) { await K.courier.hide(); K.toast(x.message, 4200); $("#eGo").disabled = false; }
    };
  }
  function download(blob, name) {
    const u = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 4000);
  }

  // ===================== البداية =====================
  // البرامج تُطلب مرة واحدة عند فتح الصفحة (في الخلفية)، فلا ينتظر المتطوع عند الضغط على «سجّل»
  let configP = null, configAt = 0;
  function fetchConfig(force) {
    if (!configP || force || Date.now() - configAt > 120000) {
      configAt = Date.now();
      configP = T.call("config").catch((e) => { configP = null; throw e; });
    }
    return configP;
  }
  async function loadPrograms() {
    const r = await fetchConfig();
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
    Object.assign(S, { mode: "edit", token, regId: d.reg.regId, employerPhone: d.reg.employerPhoneFull || "", person: Object.assign({}, d.reg.person), programId: d.reg.programId, answers: Object.assign({}, d.reg.answers || {}), note: d.reg.note });
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
      if (t.id === "nationalId" || t.id === "phone") t.value = T.toEn(t.value).replace(/\D/g, "").slice(0, 10);
      if (t.id === "nationalId") { if (S.vtoken && t.value !== S.person.nationalId) S.vtoken = ""; if (t.value.length === 10) startLookup(); }
      if (t.id === "birthDate") updateAge(false);
      readPerson(); saveDraft();
    } else if (key === "details") {
      if (t.id === "q_q_hours") t.value = T.toEn(t.value).replace(/\D/g, "").slice(0, 1);
      readAnswers(); saveDraft(); const wh = $("#weeklyHint"); if (wh) wh.textContent = weeklyText();
    }
  });
  stepHost.addEventListener("change", async (e) => {
    const key = steps()[S.step], f = e.target;
    if (key === "person") { if (f.id === "birthDate") updateAge(true); readPerson(); saveDraft(); return; }
    if (key === "path" && f.name === "kind" && f.value === "general") { autoNext(); return; }
    if (key === "path" && f.name === "programId") {
      const pr = programs.find((x) => x.id === f.value);
      autoNext(900);
      if (pr && pr.hours) topToast(`${T.arCount(Number(pr.hours), T.W_HOUR)} تطوعية في رصيدك`, `بنهاية «${esc(pr.name)}» تحصل عليها، شكرا لعطائك`, 4200, "hour");
      return;
    }
    if (key !== "details") return;
    if (f.type === "file" && f.dataset.q) {
      const file = f.files[0]; if (!file) return;
      try { S.files[f.dataset.q] = await T.packFile(file); S.answers[f.dataset.q] = S.files[f.dataset.q].name; readAnswers(); renderStep(); saveDraft(); }
      catch (x) { K.toast(x.message || "تعذر قراءة الملف"); }
      return;
    }
    readAnswers(); saveDraft();
    const wh = $("#weeklyHint"); if (wh) wh.textContent = weeklyText();
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
  $("#teamsBtn").onclick = () => topToast("بوابة الفرق قيد البناء", "جار العمل عليها، وقريبا تفتح أبوابها", 4200, "work");
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
  fetchConfig().catch(() => {});
  const hashT = (location.hash.match(/[#&]t=([A-Za-z0-9]+)/) || [])[1];
  const hashE = (location.hash.match(/[#&]e=([A-Za-z0-9]+)/) || [])[1];
  if (hashE) { history.replaceState(null, "", location.pathname); $("#homeLink").style.pointerEvents = "none"; openEmployer(hashE); }
  else if (hashT) { history.replaceState(null, "", location.pathname); openStatus(hashT); }
  else if (!resumeDraft()) {
    const waiting = localRegs().find((r) => r.status === S_.EMPLOYER || r.status === S_.CHANGES);
    if (waiting) openStatus(waiting.token); else goHome();
  }
  if (!T.LIVE) console.info("تطوع غراس: وضع التجربة (بلا خادم)");
})();
