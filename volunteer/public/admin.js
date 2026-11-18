/* تطوع غراس — لوحة الإدارة */
(function () {
  "use strict";
  const K = GherasKit, $ = K.$, $$ = K.$$, T = TG, esc = T.esc, toAr = T.toAr, S_ = T.STATUS;
  const SK = "tg-admin";
  let CODE = "";
  let D = { programs: [], supervisors: [], settings: {}, regs: [] };
  let tab = "regs";
  const F = { status: "", q: "", program: "", nat: "" };
  const ic = {
    tick: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/></svg>',
    doc: '<svg viewBox="0 0 24 24"><path d="M7 3h7l5 5v13H7Z"/><path d="M14 3v5h5M10 13h6M10 17h6"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1"/></svg>',
    ext: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>'
  };
  const tree = '<svg class="ss ss-large" viewBox="0 0 80 60"><path class="ground" d="M14 54h52"/><path class="trunk" d="M40 54V30M40 41l-7-6M40 37l6-5"/><g class="sway" style="transform-origin:40px 40px"><circle class="c-lime" cx="27" cy="26" r="11"/><circle class="c-teal" cx="53" cy="25" r="11"/><circle class="c-green" cx="40" cy="17" r="14"/></g></svg>';
  const sapling = '<svg class="ss ss-small" viewBox="0 0 80 60"><path class="ground" d="M22 52h36"/><g class="sway" style="transform-origin:40px 52px"><path class="trunk" d="M40 52V33"/><path class="leaf leaf-l" d="M40 38c-3-8-10-11-17-10 1 7 7 12 17 10Z"/><path class="leaf leaf-r" d="M40 33c2-9 9-13 17-12-1 8-7 13-17 12Z"/></g></svg>';
  const TABS = [["regs", "العقود"], ["programs", "البرامج"], ["supervisors", "المشرفون"], ["settings", "الإعدادات"]];
  const QTYPES = [["text", "نص قصير"], ["long", "نص طويل"], ["number", "رقم"], ["choice", "اختيار واحد"], ["multi", "اختيار متعدد"], ["yesno", "نعم أو لا"], ["date", "تاريخ"], ["file", "رفع ملف"]];
  const call = (a, d) => T.call(a, Object.assign({ admin: CODE }, d || {}));
  const hero = (eb, h, lead, num) => `<div class="step-hero"><div><p class="eyebrow">${eb}</p><h1>${h}</h1><p class="lead">${lead}</p><nav class="tabs admin-tabs-m" role="tablist" aria-label="أقسام اللوحة">${tabsHtml()}</nav></div>${num != null ? `<div class="axis-num" aria-hidden="true">${toAr(num)}</div>` : ""}</div><div class="band" aria-hidden="true"></div>`;
  const tabsHtml = () => TABS.map(([k, t]) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${t}</button>`).join("");
  const fmtDT = (v) => { if (!v) return ""; const d = new Date(String(v).replace(" ", "T")); return isNaN(d) ? esc(v) : `${T.fmtDate(d)} — ${toAr(String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"))}`; };

  // ——— الدخول ———
  K.theme.init();
  if (!T.LIVE) $("#gateSub").innerHTML = 'العقود والبرامج والمشرفون والإعدادات<br><span class="mode-pill">وضع التجربة — الرمز 1234</span>';
  K.portalGate({
    verify: async (code) => { try { await T.call("adminLogin", { admin: code }); return { ok: true }; } catch (e) { return { ok: false, error: e.message }; } },
    onEnter: async (code) => { CODE = code; try { sessionStorage.setItem(SK, code); } catch (e) {} await enter(); }
  });
  async function enter() {
    $("#screenGate").hidden = true; $("#screenApp").hidden = false; $("#topbar").hidden = false;
    document.body.classList.remove("stage-mode"); K.stage.stop();
    $("#view").innerHTML = '<div class="wrap step"><p class="empty" style="padding-top:80px">جار التحميل…</p></div>';
    await reload(); go("regs");
  }
  async function reload() {
    try { const r = await call("adminLoad"); D = r; }
    catch (e) { K.toast(e.message, 4000); if (/رمز/.test(e.message)) logout(); }
  }
  function logout() { try { sessionStorage.removeItem(SK); } catch (e) {} location.reload(); }
  function go(t) {
    tab = t; $("#tabs").innerHTML = tabsHtml(); $("#dock").hidden = true;
    ({ regs: viewRegs, programs: viewPrograms, supervisors: viewSupervisors, settings: viewSettings })[t]();
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) go(b.dataset.tab); });

  // ===================== العقود =====================
  const STAT_LIST = [["", "الكل", "var(--accent)"], [S_.PENDING, "بانتظار الاعتماد", "var(--st-pending)"], [S_.EMPLOYER, "بانتظار صاحب العمل", "var(--st-employer)"], [S_.CHANGES, "مطلوب تعديل", "var(--st-changes)"], [S_.APPROVED, "معتمد", "var(--st-approved)"], [S_.REJECTED, "مرفوض", "var(--danger)"]];
  function viewRegs() {
    const n = (s) => D.regs.filter((r) => !s || r.status === s).length;
    const progOpts = [...new Set(D.regs.map((r) => r.programName))];
    $("#view").innerHTML = `<div class="wrap step">${hero("لوحة الإدارة", "العقود", "كل تسجيل وميثاقه، واعتماده بالختم والتوقيع", n(S_.PENDING))}
      <div class="stat-row" role="group" aria-label="تصفية حسب الحالة">${STAT_LIST.map(([s, t, c]) => `<button class="stat" type="button" data-st="${esc(s)}" aria-pressed="${F.status === s}" style="--c:${c}"><b>${toAr(n(s))}</b><span>${t}</span></button>`).join("")}</div>
      <div class="filters">
        <input class="input" id="fq" type="search" placeholder="ابحث بالاسم أو رقم الهوية أو الجوال أو رقم التسجيل" value="${esc(F.q)}" aria-label="بحث">
        <select class="select" id="fp" aria-label="البرنامج"><option value="">كل البرامج</option>${progOpts.map((p) => `<option ${F.program === p ? "selected" : ""}>${esc(p)}</option>`).join("")}</select>
        <select class="select" id="fn" aria-label="الجنسية"><option value="">كل الجنسيات</option><option value="s" ${F.nat === "s" ? "selected" : ""}>سعودي</option><option value="n" ${F.nat === "n" ? "selected" : ""}>غير سعودي</option></select>
      </div>
      <div class="reg-list" id="regList"></div></div>`;
    drawRegs();
    $("#fq").addEventListener("input", (e) => { F.q = e.target.value; drawRegs(); });
    $("#fp").addEventListener("change", (e) => { F.program = e.target.value; drawRegs(); });
    $("#fn").addEventListener("change", (e) => { F.nat = e.target.value; drawRegs(); });
    $(".stat-row").addEventListener("click", (e) => { const b = e.target.closest("[data-st]"); if (!b) return; F.status = b.dataset.st; $$(".stat").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawRegs(); });
    $("#regList").addEventListener("click", (e) => { const b = e.target.closest("[data-reg]"); if (b) openReg(b.dataset.reg); });
  }
  function drawRegs() {
    const q = T.toEn(F.q.trim()).toLowerCase();
    const list = D.regs.filter((r) => (!F.status || r.status === F.status) && (!F.program || r.programName === F.program) && (!F.nat || (F.nat === "s") === !!r.saudi) &&
      (!q || [r.name, r.nationalId, r.phone, r.regId].some((v) => String(v || "").toLowerCase().includes(q))));
    $("#regList").innerHTML = list.length ? list.map((r) => `<button class="reg-row" type="button" data-reg="${esc(r.regId)}">
        <span><span class="nm">${esc(r.name)}</span><small><bdi dir="ltr">${esc(r.regId)}</bdi> — ${esc(r.nationality)}</small></span>
        <span class="pg">${esc(r.programName)}</span>
        <span class="dt"><small>${T.fmtDate(r.created)}</small></span>
        <span class="st" data-s="${esc(r.status)}">${esc(r.status)}</span></button>`).join("") : `<p class="empty">${D.regs.length ? "لا نتائج مطابقة" : "لا توجد تسجيلات بعد"}</p>`;
  }

  // ——— النافذة ———
  function modal(title, body, actions, opts) {
    opts = opts || {};
    $("#modalTitle").textContent = title;
    $("#modalHeadExtra").innerHTML = opts.extra || "";
    $("#modalBody").innerHTML = body;
    const a = $("#modalActions"); a.hidden = !actions; a.innerHTML = actions || "";
    $("#modalBox").classList.toggle("wide", !!opts.wide);
    $("#modal").hidden = false; document.body.style.overflow = "hidden";
    $("#modalBox").scrollTop = 0;
  }
  function closeModal() { $("#modal").hidden = true; document.body.style.overflow = ""; $$("#modalBody iframe").forEach((f) => URL.revokeObjectURL(f.src)); }
  $("#modal").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("#modal").hidden) closeModal(); });

  let cur = null;
  async function openReg(regId) {
    modal("…", '<p class="empty">جار التحميل…</p>');
    let d; try { d = await call("regDetail", { regId }); } catch (e) { closeModal(); K.toast(e.message); return; }
    cur = d;
    const r = d.reg, p = d.program || {}, per = r.person || {};
    const kv = (rows) => `<dl class="kv">${rows.filter((x) => x[1] !== "" && x[1] != null).map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`;
    const pf = T.PERSON_FIELDS.map((f) => [f.label, f.k === "nationality" ? esc(T.nationalityText(per)) : f.k === "birthDate" ? T.fmtDate(per.birthDate) : (f.k === "phone" || f.k === "nationalId" || f.k === "email" ? `<bdi dir="ltr">${esc(per[f.k] || "")}</bdi>` : esc(per[f.k] || ""))]);
    const ans = (p.questions || []).map((q) => { const v = (r.answers || {})[q.id]; return [esc(q.label), q.type === "file" ? (v ? `<button class="link-btn" type="button" data-file="${esc(q.id)}">${esc(v)}</button>` : "") : esc(Array.isArray(v) ? v.join("، ") : v || "—")]; });
    const docs = [];
    docs.push(`<button class="btn btn-line btn-sm btn-icon" type="button" data-file="draft">${ic.doc}الميثاق بتوقيع المتطوع</button>`);
    if (r.hasEmployer) docs.push(`<button class="btn btn-line btn-sm btn-icon" type="button" data-file="employer">${ic.doc}وثيقة صاحب العمل</button>`);
    if (r.hasFinal) docs.push(`<button class="btn btn-ok btn-sm btn-icon" type="button" data-file="final">${ic.doc}إظهار الوثيقة المعتمدة</button>`);
    const notes = [];
    if (r.status === S_.CHANGES && r.note) notes.push(`<div class="note-box"><strong>ملاحظة التعديل المرسلة</strong>${esc(r.note)}</div>`);
    if (r.status === S_.REJECTED && r.reason) notes.push(`<div class="note-box bad"><strong>سبب الرفض</strong>${esc(r.reason)}</div>`);
    if (r.status === S_.APPROVED) notes.push(`<div class="note-box" style="border-color:var(--green)"><strong>اعتمده</strong>${esc(r.approvedBy)} — ${fmtDT(r.approvedAt)}</div>`);
    if (r.employerRequired && !r.hasEmployer) notes.push(`<div class="note-box"><strong>صاحب العمل</strong>لم يرفع المتطوع وثيقة صاحب العمل بعد</div>`);
    const body = notes.join("") +
      `<h3 class="sec-title">الوثائق</h3><div class="row-actions">${docs.join("")}</div>` +
      `<h3 class="sec-title">البرنامج</h3>${kv([["البرنامج", esc(r.programName)], ["رقم التسجيل", `<bdi dir="ltr">${esc(r.regId)}</bdi>`], ["تاريخ التسجيل", fmtDT(r.created)], ["توقيع صاحب العمل", r.employerRequired ? "مطلوب" : "غير مطلوب"]])}` +
      `<h3 class="sec-title">بيانات المتطوع</h3>${kv(pf)}` +
      (ans.length ? `<h3 class="sec-title">${p.kind === "general" ? "الاهتمامات والوقت" : "إجابات أسئلة البرنامج"}</h3>${kv(ans)}` : "");
    let acts = "";
    if (r.status === S_.PENDING) acts = `<button class="btn btn-ok" type="button" id="aApprove">اعتماد</button><button class="btn btn-line" type="button" id="aChanges">طلب تعديل</button><span class="grow"></span><button class="btn btn-danger" type="button" id="aReject">رفض</button>`;
    else if (r.status === S_.EMPLOYER) acts = `<button class="btn btn-line" type="button" id="aChanges">طلب تعديل</button><span class="grow"></span><button class="btn btn-danger" type="button" id="aReject">رفض</button>`;
    else if (r.status === S_.CHANGES) acts = `<span class="grow"></span><button class="btn btn-danger" type="button" id="aReject">رفض</button>`;
    modal(per.name || r.name, body, acts, { extra: `<span class="st" data-s="${esc(r.status)}">${esc(r.status)}</span>` });
    $("#modalBody").addEventListener("click", onFileClick);
    if ($("#aApprove")) $("#aApprove").onclick = () => openApprove();
    if ($("#aChanges")) $("#aChanges").onclick = () => askText("طلب تعديل", "اكتب للمتطوع وش المطلوب تعديله. توصله الملاحظة على بريده مع رابط يرجّعه لتسجيله.", "مثال: صورة وثيقة صاحب العمل غير واضحة، ارفعها من جديد", "أرسل طلب التعديل", async (t) => { await call("requestChanges", { regId: r.regId, note: t }); return "أُرسل طلب التعديل"; });
    if ($("#aReject")) $("#aReject").onclick = () => askText("رفض التسجيل", "اكتب سبب الرفض. يوصل المتطوع إيميل اعتذار فيه السبب.", "سبب الرفض", "تأكيد الرفض", async (t) => { await call("reject", { regId: r.regId, reason: t }); return "رُفض التسجيل وأُبلغ المتطوع"; }, true);
  }
  function onFileClick(e) {
    const b = e.target.closest("[data-file]"); if (!b || !cur) return;
    showDoc(cur.reg.regId, b.dataset.file, b.textContent.trim());
  }
  async function showDoc(regId, kind, label) {
    const back = cur;
    modal(label, '<p class="empty">جار تجهيز الوثيقة…</p>', null, { wide: true });
    let f; try { f = await call("adminFile", { regId, kind }); } catch (e) { K.toast(e.message); openReg(regId); return; }
    const blob = T.b64ToBlob(f.b64, f.mime), url = URL.createObjectURL(blob);
    const view = /pdf/.test(f.mime) ? `<iframe class="pdf-frame" src="${url}" title="${esc(label)}"></iframe>` : `<img src="${url}" alt="${esc(label)}" style="max-width:100%;margin:0 auto;border-radius:12px">`;
    modal(label, view, `<button class="btn btn-ghost" type="button" id="docBack">رجوع</button><span class="grow"></span><a class="btn btn-line btn-icon" href="${url}" target="_blank" rel="noopener">${ic.ext}فتح في نافذة</a><a class="btn btn-primary btn-icon" href="${url}" download="${esc(f.name)}">${ic.down}تنزيل</a>`, { wide: true });
    $("#docBack").onclick = () => { if (back) openReg(back.reg.regId); else closeModal(); };
  }
  function askText(title, lead, ph, btn, fn, danger) {
    const regId = cur.reg.regId;
    modal(title, `<p style="margin:0 0 14px;color:var(--ink-2)">${lead}</p><textarea class="textarea" id="askT" placeholder="${esc(ph)}" style="min-height:130px"></textarea>`,
      `<button class="btn btn-ghost" type="button" id="askBack">رجوع</button><span class="grow"></span><button class="btn ${danger ? "btn-danger" : "btn-primary"}" type="button" id="askGo">${btn}</button>`);
    $("#askT").focus();
    $("#askBack").onclick = () => openReg(regId);
    $("#askGo").onclick = async (e) => {
      const t = $("#askT").value.trim(); if (!t) { $("#askT").classList.add("bad"); return; }
      e.target.disabled = true; e.target.textContent = "جار الإرسال…";
      try { const m = await fn(t); await reload(); closeModal(); viewRegs(); K.toast(m); }
      catch (x) { K.toast(x.message); e.target.disabled = false; e.target.textContent = btn; }
    };
  }

  // ——— الاعتماد بأربع خطوات ———
  function openApprove() {
    const r = cur.reg, sig = cur.reg.signature;
    const sups = D.supervisors.filter((s) => s.hasSignature);
    const A = { step: 1, sup: null };
    const body = `<div class="approve">
      <ol class="approve-steps" id="apSteps">
        <li class="ap-step active" data-n="1"><span class="ap-num">١</span><div><h4>الموافقة</h4><div class="ap-body"><p class="ap-done-note">راجعت التسجيل والوثائق، وأوافق على اعتماد ميثاق <strong style="font-weight:500">${esc(r.name)}</strong>.</p><button class="btn btn-primary" type="button" id="ap1">أوافق</button></div></div></li>
        <li class="ap-step" data-n="2"><span class="ap-num">٢</span><div><h4>رمز الاعتماد</h4><div class="ap-body">
          ${sups.length ? `<div class="field"><label for="apSup">المشرف</label><select class="select" id="apSup">${sups.map((s) => `<option value="${esc(s.id)}">${esc(s.name)} — ${esc(s.title)}</option>`).join("")}</select></div>
          <div class="field"><label for="apCode">رمزك الخاص</label><input class="input" id="apCode" type="password" autocomplete="off" dir="ltr"></div>
          <button class="btn btn-primary" type="button" id="ap2">أضع الرمز</button>` : `<p class="ap-done-note" style="color:var(--danger)">لا يوجد مشرف رفع توقيعه. أضفه من صفحة «المشرفون».</p>`}
          <p class="ap-done-note" id="ap2note"></p></div></div></li>
        <li class="ap-step" data-n="3"><span class="ap-num">٣</span><div><h4>ختم الجمعية</h4><div class="ap-body"><button class="btn btn-primary" type="button" id="ap3">أضع الختم</button></div></div></li>
        <li class="ap-step" data-n="4"><span class="ap-num">٤</span><div><h4>توقيع المشرف</h4><div class="ap-body"><button class="btn btn-primary" type="button" id="ap4">أضع التوقيع</button></div></div></li>
      </ol>
      <div class="ap-paper" id="apPaper" aria-hidden="true">
        <span class="ap-check">${ic.tick}</span>
        <img class="ap-logo" src="assets/logo.png" alt="">
        <div class="pl h"></div><div class="pl"></div><div class="pl" style="width:92%"></div><div class="pl"></div><div class="pl" style="width:76%"></div><div class="pl" style="width:88%"></div><div class="pl" style="width:60%"></div>
        <div class="ap-sigs">
          <div class="ap-box"><span>المتطوع</span>${sig ? `<img class="vol-sig" src="${esc(sig)}" alt="">` : ""}</div>
          <div class="ap-box"><span>الجمعية</span><img class="ap-stamp" id="apStamp" alt=""><img class="ap-sign" id="apSign" alt=""></div>
        </div>
      </div></div>`;
    modal("اعتماد الميثاق", body, `<button class="btn btn-ghost" type="button" id="apBack">رجوع</button><span class="grow"></span><span class="ap-done-note" id="apHint">الخطوة ١ من ٤</span>`, { wide: true });
    const setStep = (n) => {
      A.step = n;
      $$(".ap-step").forEach((li) => { const k = +li.dataset.n; li.classList.toggle("done", k < n); li.classList.toggle("active", k === n); if (k < n) $(".ap-num", li).innerHTML = ic.tick; });
      $("#apHint").textContent = n <= 4 ? `الخطوة ${toAr(n)} من ٤` : "";
      const a = $(`.ap-step[data-n="${n}"] .btn`); if (a) a.focus();
    };
    $("#apBack").onclick = () => openReg(r.regId);
    $("#ap1").onclick = () => { $("#apPaper").classList.add("agreed"); setStep(2); if ($("#apCode")) setTimeout(() => $("#apCode").focus(), 50); };
    if ($("#ap2")) {
      const verify = async () => {
        const b = $("#ap2"), code = $("#apCode").value.trim(), id = $("#apSup").value;
        if (!code) { $("#apCode").classList.add("bad"); return; }
        b.disabled = true; b.textContent = "جار التحقق…";
        try {
          const s = await call("checkSupervisor", { supervisorId: id, code });
          A.sup = { id, code, name: s.name, title: s.title };
          $("#apStamp").src = s.stamp; $("#apSign").src = s.signature;
          $("#ap2note").textContent = `${s.name} — ${s.title}`;
          setStep(3);
        } catch (e) { $("#apCode").classList.add("bad"); $("#ap2note").textContent = e.message; $("#ap2note").style.color = "var(--danger)"; }
        finally { b.disabled = false; b.textContent = "أضع الرمز"; }
      };
      $("#ap2").onclick = verify;
      $("#apCode").addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });
      $("#apCode").addEventListener("input", (e) => { e.target.classList.remove("bad"); $("#ap2note").textContent = ""; $("#ap2note").style.color = ""; });
    }
    $("#ap3").onclick = async () => { $("#apStamp").classList.add("on"); $("#apPaper").classList.add("thump"); await K.W(750); setStep(4); };
    $("#ap4").onclick = async () => { $("#apSign").classList.add("on"); await K.W(1200); setStep(5); finalize(r, A.sup); };
  }
  async function finalize(r, sup) {
    $("#apSteps").outerHTML = `<div class="ap-result" id="apRes"><h3>جار إصدار الوثيقة…</h3><p id="apMsg">نضع الختم والتوقيع على الميثاق</p><div class="mini-bar"><span id="apBar"></span></div></div>`;
    $("#apBack").hidden = true;
    const bar = (p, m) => { $("#apBar").style.width = p + "%"; if (m) $("#apMsg").textContent = m; };
    bar(20);
    try {
      let res = await call("approve", { regId: r.regId, supervisorId: sup.id, code: sup.code });
      if (res.needMerge) {
        bar(60, "ندمج الميثاق مع وثيقة صاحب العمل");
        const merged = await T.mergePdf(res.charter, res.employer);
        bar(80, "نحفظ الوثيقة ونرسلها للمتطوع");
        res = await call("approve", { regId: r.regId, supervisorId: sup.id, code: sup.code, merged });
      }
      bar(100);
      $("#apRes").innerHTML = `<svg class="done-mark" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="54" fill="none" stroke-width="5"/><path d="M38 62 L54 78 L84 46" fill="none" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg><h3>اعتُمد الميثاق</h3><p>انحفظت الوثيقة في الدرايف، ووصلت بريد المتطوع.</p>`;
      $("#modalActions").innerHTML = `<span class="grow"></span><button class="btn btn-line" type="button" id="apShow">إظهار الوثيقة</button><button class="btn btn-primary" type="button" id="apDone">تم</button>`;
      await reload();
      $("#apDone").onclick = () => { closeModal(); viewRegs(); };
      $("#apShow").onclick = async () => { cur = await call("regDetail", { regId: r.regId }); viewRegs(); showDoc(r.regId, "final", "الوثيقة المعتمدة"); };
    } catch (e) {
      $("#apRes").innerHTML = `<h3>ما اكتمل الاعتماد</h3><p style="color:var(--danger)">${esc(e.message)}</p>`;
      $("#modalActions").innerHTML = `<span class="grow"></span><button class="btn btn-primary" type="button" id="apRetry">رجوع للتسجيل</button>`;
      $("#apRetry").onclick = () => openReg(r.regId);
    }
  }

  // ===================== البرامج =====================
  function viewPrograms() {
    const list = D.programs.slice().sort((a, b) => (a.kind === "general" ? -1 : b.kind === "general" ? 1 : (a.order || 0) - (b.order || 0)));
    const card = (p) => `<button class="pa-card" type="button" data-prog="${esc(p.id)}" style="${p.state === "مؤرشف" ? "opacity:.55" : ""}"><span class="prog-img" aria-hidden="true">${p.image ? `<img src="${esc(p.image)}" alt="">` : p.kind === "general" ? sapling : tree}</span><span><h4>${esc(p.name)}</h4><span class="chips"><span class="chip" style="${p.state === "مفتوح" ? "background:rgba(108,189,83,.16)" : ""}">${esc(p.state)}</span><span class="chip">${toAr(p.used || 0)} مسجل${p.seats ? " من " + toAr(p.seats) : ""}</span>${p.employerSig ? '<span class="chip">صاحب العمل</span>' : ""}${p.templateName ? "" : '<span class="chip warn">بلا قالب خاص</span>'}</span></span></button>`;
    $("#view").innerHTML = `<div class="wrap step">${hero("لوحة الإدارة", "البرامج", "أضف البرامج بتفاصيلها وأسئلتها وقالب ميثاقها", D.programs.filter((p) => p.state === "مفتوح").length)}
      <div class="prog-admin">${list.map(card).join("")}<button class="pa-card pa-add" type="button" data-prog="">${ic.plus.replace("<svg", '<svg width="26" height="26" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"')}إضافة برنامج</button></div></div>`;
    $("#view").onclick = (e) => { const b = e.target.closest("[data-prog]"); if (b) editProgram(b.dataset.prog); };
  }

  let P = null, tplFile = null;
  function editProgram(id) {
    $("#view").onclick = null;
    const src = D.programs.find((p) => p.id === id);
    P = JSON.parse(JSON.stringify(src || { kind: "program", state: "مغلق", name: "", desc: "", image: "", location: "", startDate: "", endDate: "", days: [], timeFrom: "", timeTo: "", hours: "", seats: "", gender: "الكل", employerSig: false, extras: [], questions: [] }));
    tplFile = null;
    drawEditor();
    $("#dock").hidden = false; $("#dockCount").textContent = P.id ? "تعديل البرنامج" : "برنامج جديد";
    $("#dockBack").onclick = () => { $("#dock").hidden = true; viewPrograms(); };
    $("#dockSave").onclick = saveProgram;
  }
  const fld = (id, label, html, hint) => `<div class="field"><label for="${id}">${label}</label>${html}${hint ? `<p class="hint">${hint}</p>` : ""}</div>`;
  const inp = (id, v, a) => `<input class="input" id="${id}" value="${esc(v || "")}" ${a || ""}>`;
  const segH = (name, opts, val, multi) => `<div class="seg" role="${multi ? "group" : "radiogroup"}">${opts.map((o) => { const on = multi ? (val || []).includes(o) : val === o; return `<label class="${on ? "checked" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="${name}" value="${esc(o)}" ${on ? "checked" : ""}>${esc(o)}</label>`; }).join("")}</div>`;
  function drawEditor() {
    const g = P.kind === "general";
    const states = g ? ["مفتوح", "مغلق"] : ["مفتوح", "مغلق", "مؤرشف"];
    $("#view").innerHTML = `<div class="wrap step">
      <div class="step-hero"><div><p class="eyebrow">البرامج</p><h1>${P.id ? esc(P.name) : "برنامج جديد"}</h1><p class="lead">${g ? "إعدادات التطوع العام وأسئلته وميثاقه" : "كل ما يحتاجه المتطوع عن البرنامج، وما يظهر في ميثاقه"}</p></div></div>
      <div class="band" aria-hidden="true"></div>
      <div class="card"><h2 class="card-title">الأساسيات</h2><div class="grid">
        ${fld("pName", "اسم البرنامج", inp("pName", P.name))}
        ${fld("pDesc", "وصف مختصر", `<textarea class="textarea" id="pDesc">${esc(P.desc)}</textarea>`)}
        <div class="field"><span class="field-label">الصورة</span><div class="img-pick"><span class="prog-img" id="pImgBox">${P.image ? `<img src="${esc(P.image)}" alt="">` : g ? sapling : tree}</span><div class="row-actions"><label class="btn btn-line btn-sm">اختر صورة<input type="file" id="pImg" accept="image/*" hidden></label>${P.image ? '<button class="btn btn-ghost btn-sm" type="button" id="pImgRm">إزالة</button>' : ""}</div></div></div>
        <div class="field"><span class="field-label">التسجيل</span>${segH("pState", states, P.state)}<p class="hint">«مغلق» يخفيه عن المتطوعين مؤقتا، و«مؤرشف» ينقله لآخر القائمة.</p></div>
      </div></div>
      <div class="card"><h2 class="card-title">المكان والمواعيد</h2><div class="grid">
        ${fld("pLoc", "المكان", inp("pLoc", P.location))}
        <div class="grid grid-2">${fld("pStart", "تاريخ البداية", inp("pStart", P.startDate, 'type="date"'))}${fld("pEnd", "تاريخ النهاية", inp("pEnd", P.endDate, 'type="date"'))}</div>
        <div class="field"><span class="field-label">الأيام</span>${segH("pDays", T.DAYS, P.days, true)}</div>
        <div class="grid grid-2">${fld("pFrom", "الوقت من", inp("pFrom", P.timeFrom, 'type="time"'))}${fld("pTo", "إلى", inp("pTo", P.timeTo, 'type="time"'))}</div>
        <div class="grid grid-2">${fld("pHours", "عدد الساعات التطوعية", inp("pHours", P.hours, 'inputmode="numeric" dir="ltr"'))}${fld("pSeats", "عدد المقاعد", inp("pSeats", P.seats, 'inputmode="numeric" dir="ltr"'), "اتركه فارغا إذا ما فيه حد. يقفل التسجيل تلقائيا إذا اكتمل.")}</div>
        <div class="field"><span class="field-label">الفئة</span>${segH("pGender", ["الكل", "رجال", "نساء"], P.gender)}</div>
      </div></div>
      <div class="card"><h2 class="card-title">تفاصيل إضافية</h2><p class="hint" style="margin:-10px 0 14px">أي بند تبيه يظهر للمتطوع، مثل المهام أو المتطلبات أو الزي. ويصير له مكان في الميثاق باسمه.</p>
        <div class="rep" id="exList"></div><button class="btn btn-line btn-sm btn-icon" type="button" id="exAdd" style="margin-top:12px">${ic.plus}إضافة بند</button></div>
      <div class="card"><h2 class="card-title">أسئلة التسجيل</h2><p class="hint" style="margin:-10px 0 14px">تظهر للمتطوع بعد ما يختار ${g ? "التطوع العام" : "البرنامج"}، وكل جواب له عمود في ورقة البرنامج.</p>
        <div class="rep" id="qList"></div><button class="btn btn-line btn-sm btn-icon" type="button" id="qAdd" style="margin-top:12px">${ic.plus}إضافة سؤال</button></div>
      <div class="card"><h2 class="card-title">الميثاق</h2><div class="grid">
        <label class="toggle"><span class="t">توقيع صاحب العمل لغير السعوديين<small>غير السعودي ينزّل الميثاق ويوقعه صاحب العمل ويختمه ثم يرفعه</small></span><input type="checkbox" id="pEmp" ${P.employerSig ? "checked" : ""}><span class="sw" aria-hidden="true"></span></label>
        <div class="field"><span class="field-label">قالب الميثاق</span>
          <p class="hint" style="margin-bottom:6px">${P.templateName ? `القالب الحالي: <strong style="font-weight:500;color:var(--ink)">${esc(P.templateName)}</strong>` : "لا يوجد قالب خاص، يُستخدم القالب الافتراضي."}</p>
          <label class="drop"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/></svg><span id="tplName">ارفع ملف Word (.docx) ${P.templateName ? "لاستبداله" : ""}</span><input type="file" id="pTpl" hidden accept=".docx,.doc,.odt,.rtf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"></label>
          ${fld("pTplLink", "أو رابط ملف Google Docs", inp("pTplLink", "", 'dir="ltr" placeholder="https://docs.google.com/document/d/..."'))}
        </div>
        <div><p class="field-label" style="margin:0 0 8px">الأماكن اللي تكتبها في القالب <small class="hint" style="display:inline">اضغط للنسخ</small></p>${phChips()}</div>
        ${P.id ? '<div><button class="btn btn-line btn-icon" type="button" id="tplPrev">' + ic.doc + "معاينة الميثاق ببيانات تجريبية</button></div>" : ""}
      </div></div></div>`;
    drawExtras(); drawQs();
    $("#pImg").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; P.image = await T.compressImage(f, 640, 0.8, 45000); readEditor(); drawEditor(); };
    if ($("#pImgRm")) $("#pImgRm").onclick = () => { readEditor(); P.image = ""; drawEditor(); };
    $("#exAdd").onclick = () => { readEditor(); P.extras.push({ k: "", v: "" }); drawExtras(); $$("#exList .rep-item:last-child input")[0].focus(); };
    $("#qAdd").onclick = () => { readEditor(); P.questions.push({ id: "q" + Math.random().toString(36).slice(2, 7), label: "", type: "text", required: false, options: [] }); drawQs(); $$("#qList .rep-item:last-child input")[0].focus(); };
    $("#pTpl").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; tplFile = { name: f.name, mime: f.type || "application/vnd.openxmlformats-officedocument.wordprocessingml.document", b64: T.dataToB64(await T.readAsDataURL(f)) }; $("#tplName").textContent = "سيُرفع عند الحفظ: " + f.name; };
    if ($("#tplPrev")) $("#tplPrev").onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try { const f = await call("previewTemplate", { programId: P.id }); const u = URL.createObjectURL(T.b64ToBlob(f.b64, f.mime)); modal("معاينة الميثاق", `<iframe class="pdf-frame" src="${u}" title="معاينة"></iframe>`, `<span class="grow"></span><a class="btn btn-primary btn-icon" href="${u}" download="${esc(f.name)}">${ic.down}تنزيل</a>`, { wide: true }); }
      catch (x) { K.toast(x.message); } finally { b.disabled = false; }
    };
    $$("#view .ph").forEach((b) => b.onclick = () => { const t = b.textContent; (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => K.toast("نُسخ " + t)).catch(() => K.toast(t)); });
    K.bindChoices($("#view"));
  }
  function phChips() {
    const groups = T.PLACEHOLDERS.slice();
    const ex = (P.extras || []).filter((x) => x.k).map((x) => T.phKey(x.k));
    if (ex.length) groups.splice(2, 0, ["تفاصيلك الإضافية", ex]);
    return groups.map(([g, ks]) => `<div class="ph-group"><h5>${g}</h5><div class="chips">${ks.map((k) => `<button type="button" class="ph ${T.IMAGE_KEYS.includes(k) ? "img" : ""}">{${esc(k)}}</button>`).join("")}</div></div>`).join("");
  }
  function drawExtras() {
    $("#exList").innerHTML = P.extras.map((x, i) => `<div class="rep-item"><div class="rep-line"><input class="input" data-ex="k" data-i="${i}" placeholder="اسم البند (مثل: المهام)" value="${esc(x.k)}" aria-label="اسم البند"><input class="input" data-ex="v" data-i="${i}" placeholder="القيمة" value="${esc(x.v)}" aria-label="القيمة"><button class="icon-btn" type="button" data-exrm="${i}" aria-label="حذف">${ic.trash}</button></div></div>`).join("") || '<p class="hint">لا توجد بنود</p>';
    $$("[data-exrm]").forEach((b) => b.onclick = () => { readEditor(); P.extras.splice(+b.dataset.exrm, 1); drawExtras(); });
  }
  function drawQs() {
    $("#qList").innerHTML = P.questions.map((q, i) => `<div class="rep-item"><div class="q-line">
        <input class="input" data-q="label" data-i="${i}" placeholder="نص السؤال" value="${esc(q.label)}" aria-label="نص السؤال">
        <select class="select" data-q="type" data-i="${i}" aria-label="نوع السؤال">${QTYPES.map(([v, t]) => `<option value="${v}" ${q.type === v ? "selected" : ""}>${t}</option>`).join("")}</select>
        <label class="toggle"><span class="t">إلزامي</span><input type="checkbox" data-q="required" data-i="${i}" ${q.required ? "checked" : ""}><span class="sw" aria-hidden="true"></span></label>
        <button class="icon-btn" type="button" data-qrm="${i}" aria-label="حذف السؤال">${ic.trash}</button></div>
        ${["choice", "multi"].includes(q.type) ? `<textarea class="textarea" data-q="options" data-i="${i}" placeholder="الخيارات، كل خيار في سطر" style="min-height:80px" aria-label="الخيارات">${esc((q.options || []).join("\n"))}</textarea>` : ""}</div>`).join("") || '<p class="hint">لا توجد أسئلة</p>';
    $$("[data-qrm]").forEach((b) => b.onclick = () => { readEditor(); P.questions.splice(+b.dataset.qrm, 1); drawQs(); });
    $$('#qList select[data-q="type"]').forEach((s) => s.onchange = () => { readEditor(); drawQs(); });
  }
  function readEditor() {
    const v = (id) => ($("#" + id) ? $("#" + id).value.trim() : "");
    Object.assign(P, {
      name: v("pName"), desc: v("pDesc"), location: v("pLoc"), startDate: v("pStart"), endDate: v("pEnd"),
      timeFrom: v("pFrom"), timeTo: v("pTo"), hours: T.toEn(v("pHours")).replace(/\D/g, ""), seats: T.toEn(v("pSeats")).replace(/\D/g, ""),
      state: ($('input[name="pState"]:checked') || {}).value || P.state,
      gender: ($('input[name="pGender"]:checked') || {}).value || "الكل",
      days: T.DAYS.filter((d) => $$('input[name="pDays"]:checked').some((i) => i.value === d)),
      employerSig: !!($("#pEmp") && $("#pEmp").checked)
    });
    $$("[data-ex]").forEach((el) => { P.extras[+el.dataset.i][el.dataset.ex] = el.value.trim(); });
    $$("[data-q]").forEach((el) => {
      const q = P.questions[+el.dataset.i], k = el.dataset.q;
      if (k === "required") q.required = el.checked;
      else if (k === "options") q.options = el.value.split("\n").map((s) => s.trim()).filter(Boolean);
      else q[k] = el.value.trim();
    });
  }
  async function saveProgram() {
    readEditor();
    if (!P.name) { K.toast("اكتب اسم البرنامج"); $("#pName").focus(); return; }
    P.extras = P.extras.filter((x) => x.k);
    const badQ = P.questions.find((q) => !q.label || (["choice", "multi"].includes(q.type) && !(q.options || []).length));
    if (badQ) { K.toast(badQ.label ? `أضف خيارات للسؤال: ${badQ.label}` : "في سؤال بلا نص"); return; }
    const b = $("#dockSave"); b.disabled = true; b.textContent = "جار الحفظ…";
    try {
      const link = ($("#pTplLink") || {}).value || "";
      const out = Object.assign({}, P); delete out.seatsLeft; delete out.used;
      const r = await call("saveProgram", { program: out, template: tplFile, templateLink: link.trim() });
      await reload();
      K.toast(tplFile || link ? "حُفظ البرنامج ورُفع القالب" : "حُفظ البرنامج");
      editProgram(r.id);
    } catch (e) { K.toast(e.message, 4200); }
    finally { b.disabled = false; b.textContent = "حفظ"; }
  }

  // ===================== المشرفون =====================
  function viewSupervisors(editId) {
    const s = D.supervisors.find((x) => x.id === editId) || null;
    $("#view").innerHTML = `<div class="wrap step">${hero("لوحة الإدارة", "المشرفون", "لكل مشرف رمز اعتماد خاص وصورة توقيعه، وتُكتب تحت توقيعه في الوثيقة", D.supervisors.length)}
      <div class="sup-list">${D.supervisors.map((x) => `<div class="sup-row"><div><h4>${esc(x.name)}</h4><small>${esc(x.title)}</small></div><span class="sig-thumb">${x.hasSignature ? '<em>التوقيع مرفوع ✓</em>' : "<em>بلا توقيع</em>"}</span><button class="btn btn-line btn-sm" type="button" data-sup="${esc(x.id)}">تعديل</button></div>`).join("") || '<p class="empty">لا يوجد مشرفون بعد</p>'}</div>
      <div class="card" style="margin-top:22px" id="supForm"><h2 class="card-title">${s ? "تعديل: " + esc(s.name) : "إضافة مشرف"}</h2><div class="grid">
        <div class="grid grid-2">${fld("sName", "الاسم", inp("sName", s && s.name))}${fld("sTitle", "الصفة", inp("sTitle", s && s.title, 'placeholder="مثال: مشرف البرامج"'))}</div>
        ${fld("sCode", "رمز الاعتماد", inp("sCode", "", 'type="password" autocomplete="new-password" dir="ltr"'), s ? "اتركه فارغا لإبقاء الرمز الحالي" : "رمز سري يكتبه المشرف عند كل اعتماد")}
        <div class="field"><span class="field-label">صورة التوقيع</span><div class="img-pick"><span class="sig-thumb" id="sSigBox"><em>${s && s.hasSignature ? "مرفوع، ارفع صورة جديدة لاستبداله" : "لم يُرفع"}</em></span><label class="btn btn-line btn-sm">ارفع صورة<input type="file" id="sSig" accept="image/*" hidden></label></div><p class="hint">وقّع على ورقة بيضاء وصوّرها. نشيل البياض تلقائيا.</p></div>
        <div class="row-actions"><button class="btn btn-primary" type="button" id="sSave">${s ? "حفظ التعديل" : "إضافة المشرف"}</button>${s ? '<button class="btn btn-ghost" type="button" id="sCancel">إلغاء</button><span style="flex:1"></span><button class="btn btn-danger" type="button" id="sDel">حذف المشرف</button>' : ""}</div>
      </div></div></div>`;
    let sig = "";
    $("#view").onclick = (e) => { const b = e.target.closest("[data-sup]"); if (b) { viewSupervisors(b.dataset.sup); $("#supForm").scrollIntoView({ behavior: "smooth" }); } };
    $("#sSig").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; sig = await T.transparentPng(f); $("#sSigBox").innerHTML = `<img src="${sig}" alt="التوقيع">`; };
    if ($("#sCancel")) $("#sCancel").onclick = () => viewSupervisors();
    if ($("#sDel")) $("#sDel").onclick = async () => { if (!confirm("حذف المشرف؟ الوثائق المعتمدة سابقا ما تتأثر.")) return; try { await call("removeSupervisor", { id: s.id }); await reload(); viewSupervisors(); K.toast("حُذف المشرف"); } catch (x) { K.toast(x.message); } };
    $("#sSave").onclick = async (e) => {
      const name = $("#sName").value.trim(), title = $("#sTitle").value.trim(), code = $("#sCode").value.trim();
      if (!name || !title) { K.toast("اكتب الاسم والصفة"); return; }
      if (!s && !code) { K.toast("اكتب رمز الاعتماد"); return; }
      if (code && code.length < 4) { K.toast("الرمز ٤ خانات على الأقل"); return; }
      if (!s && !sig) { K.toast("ارفع صورة التوقيع"); return; }
      e.target.disabled = true;
      try { await call("saveSupervisor", { supervisor: { id: s ? s.id : "", name, title, code, signature: sig } }); await reload(); viewSupervisors(); K.toast("حُفظ المشرف"); }
      catch (x) { K.toast(x.message); e.target.disabled = false; }
    };
  }

  // ===================== الإعدادات =====================
  function viewSettings() {
    const st = D.settings || {};
    $("#view").innerHTML = `<div class="wrap step">${hero("لوحة الإدارة", "الإعدادات", "ختم الجمعية، وبريد التنبيهات، ورمز الدخول")}
      <div class="card"><h2 class="card-title">ختم الجمعية</h2><div class="img-pick"><span class="sig-thumb" id="stampBox" style="height:120px;min-width:120px">${st.stamp ? `<img src="${esc(st.stamp)}" alt="الختم" style="max-height:108px">` : st.hasStamp ? "<em>مرفوع</em>" : "<em>لم يُرفع</em>"}</span><div><label class="btn btn-line btn-sm">ارفع صورة الختم<input type="file" id="stampFile" accept="image/*" hidden></label><p class="hint" style="margin-top:8px">صورة واضحة للختم على خلفية بيضاء، ونشيل البياض تلقائيا.</p></div></div></div>
      <div class="card"><h2 class="card-title">بريد التنبيهات</h2>${fld("alertEmail", "يوصله تنبيه عند كل تسجيل جديد، ورفع وثيقة صاحب العمل، وإعادة الإرسال بعد التعديل", inp("alertEmail", st.alertEmail, 'type="email" dir="ltr"'))}</div>
      <div class="card"><h2 class="card-title">رمز دخول اللوحة</h2><div class="grid grid-2">${fld("nc1", "الرمز الجديد", inp("nc1", "", 'type="password" autocomplete="new-password" dir="ltr"'))}${fld("nc2", "أعد كتابته", inp("nc2", "", 'type="password" autocomplete="new-password" dir="ltr"'))}</div><p class="hint" style="margin-top:8px">اتركه فارغا إذا ما تبي تغيّره.</p></div>
      <div class="row-actions"><button class="btn btn-primary" type="button" id="setSave">حفظ الإعدادات</button><span style="flex:1"></span><button class="btn btn-ghost" type="button" id="logout">تسجيل الخروج</button></div></div>`;
    let stamp = "";
    $("#stampFile").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; stamp = await T.transparentPng(f, 700); $("#stampBox").innerHTML = `<img src="${stamp}" alt="الختم" style="max-height:108px">`; };
    $("#logout").onclick = logout;
    $("#setSave").onclick = async (e) => {
      const em = $("#alertEmail").value.trim(), a = $("#nc1").value.trim(), b = $("#nc2").value.trim();
      if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) { K.toast("البريد غير صحيح"); return; }
      if (a || b) { if (a !== b) { K.toast("الرمزان غير متطابقين"); return; } if (a.length < 6) { K.toast("رمز الدخول ٦ خانات على الأقل"); return; } }
      e.target.disabled = true;
      try {
        await call("saveSettings", { alertEmail: em, stamp, newAdminCode: a });
        if (a) { CODE = a; try { sessionStorage.setItem(SK, a); } catch (x) {} }
        await reload(); viewSettings(); K.toast("حُفظت الإعدادات");
      } catch (x) { K.toast(x.message); e.target.disabled = false; }
    };
  }

  // دخول تلقائي داخل نفس الجلسة
  (async () => {
    let saved = ""; try { saved = sessionStorage.getItem(SK) || ""; } catch (e) {}
    if (saved) { try { await T.call("adminLogin", { admin: saved }); CODE = saved; await enter(); return; } catch (e) {} }
    K.stage.start($("#screenGate"));
  })();
})();
