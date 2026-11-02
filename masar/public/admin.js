/* منصة أسئلة مسار — لوحة الإدارة
   دوران:
   - المدير المعتمد (supervisor): يرى الأسئلة الجديدة، يعدل صياغتها إن لزم، ثم يعتمدها أو يحذفها.
   - مدير الرد (responder): يرى الأسئلة المعتمدة فقط، يكتب الرد ثم يضغط «إرسال» فيظهر للمشاركين. */
(function () {
  "use strict";
  const K = GherasKit, A = MasarAPI, $ = K.$, $$ = K.$$;
  const C = A.C, MAXQ = C.MAX_QUESTION || 600, MAXA = C.MAX_ANSWER || 3000;
  const SKEY = "masar-admin";
  const ROLE_NAME = { supervisor: "المدير المعتمد", responder: "مدير الرد" };

  const st = { code: "", role: "", fresh: [], approved: [], tab: "fresh", timer: 0, loading: false };

  // رمز الجلسة يحفظ في هذه النافذة فقط ويحذف عند إغلاقها
  const ss = { get() { try { return sessionStorage.getItem(SKEY) || ""; } catch (e) { return ""; } },
               set(v) { try { v ? sessionStorage.setItem(SKEY, v) : sessionStorage.removeItem(SKEY); } catch (e) {} } };
  // مسودات الرد على جهاز المدير
  const draftKey = (id) => "masar-draft-" + id;
  const draft = { get: (id) => K.storage((ls) => ls.getItem(draftKey(id))) || "",
                  set: (id, v) => K.storage((ls) => (v ? ls.setItem(draftKey(id), v) : ls.removeItem(draftKey(id)))) };

  function show(id) {
    ["screenGate", "screenAdmin"].forEach((s) => ($("#" + s).hidden = s !== id));
    const gate = id === "screenGate";
    $("#topbar").hidden = gate;
    document.body.classList.toggle("stage-mode", gate);
    window.scrollTo(0, 0);
    gate ? K.stage.start($("#screenGate")) : K.stage.stop();
  }

  // ——— الدخول ———
  K.portalGate({
    verify: async (code) => {
      const r = await A.call("login", { code });
      if (r && r.ok) { st.role = r.role; return { ok: true }; }
      return { ok: false, error: (r && r.error) || "رمز الدخول غير صحيح" };
    },
    onEnter: (code) => enter(code)
  });
  if (A.PREVIEW) $("#gateSub").textContent = "وضع المعاينة — الرموز التجريبية: 1111 للمدير المعتمد، 2222 لمدير الرد";

  function enter(code) {
    st.code = code; ss.set(code);
    $("#accessCode").value = "";
    $("#roleChip").textContent = ROLE_NAME[st.role] || "";
    // مدير الرد لا يرى الأسئلة الجديدة
    $("#tabFresh").hidden = st.role !== "supervisor";
    $("#approvedSub").textContent = st.role === "supervisor" ? "عند مدير الرد" : "اكتب الرد ثم أرسل";
    st.tab = st.role === "supervisor" ? "fresh" : "approved";
    show("screenAdmin");
    load();
    clearInterval(st.timer);
    st.timer = setInterval(() => { if (!document.hidden && !busyEditing()) load(true); }, 60000);
  }
  function logout(msg) {
    clearInterval(st.timer);
    st.code = ""; st.role = ""; ss.set("");
    show("screenGate");
    if (msg) $("#gateMsg").textContent = msg;
  }
  $("#logoutBtn").addEventListener("click", () => logout());

  // لا نحدث القائمة تلقائيا والمدير يكتب
  const busyEditing = () => { const a = document.activeElement; return a && a.tagName === "TEXTAREA" && $("#admHost").contains(a); };

  // ——— التحميل ———
  async function load(quiet) {
    if (st.loading) return;
    st.loading = true;
    if (!quiet) $("#admHost").innerHTML = '<div class="skeleton"></div><div class="skeleton"></div>';
    let r;
    try { r = await A.call("list", { code: st.code }); } catch (e) { r = { ok: false, error: "تعذر الاتصال" }; }
    st.loading = false;
    if (!r || !r.ok) {
      if (r && /رمز/.test(r.error || "")) return logout(r.error);
      if (!quiet) $("#admHost").innerHTML = empty("تعذر تحميل الأسئلة", (r && r.error) || "حاول مرة أخرى");
      return;
    }
    st.fresh = r.fresh || [];
    st.approved = r.approved || [];
    $("#syncNote").textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit" });
    counts();
    render();
  }
  function counts() {
    $("#cFresh").textContent = A.toAr(st.fresh.length);
    $("#cApproved").textContent = A.toAr(st.approved.length);
    $("#cFresh").classList.toggle("hot", st.fresh.length > 0);
    $("#cApproved").classList.toggle("hot", st.role === "responder" && st.approved.length > 0);
  }
  $("#refreshBtn").addEventListener("click", () => load());
  $$(".tab").forEach((b) => b.addEventListener("click", () => { st.tab = b.dataset.tab; render(); }));

  // ——— العرض ———
  function render() {
    $$(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === st.tab ? "true" : "false"));
    const host = $("#admHost");
    const fresh = st.tab === "fresh";
    const list = fresh ? st.fresh : st.approved;
    $("#admTitle").textContent = fresh ? "الأسئلة الجديدة" : "الأسئلة المعتمدة";
    $("#admLead").textContent = fresh
      ? "راجع السؤال، وعدّل صياغته إن احتوى ما يدل على كاتبه، ثم اعتمده أو احذفه"
      : st.role === "responder" ? "اكتب الرد على كل سؤال ثم اضغط «إرسال» ليظهر للمشاركين" : "أسئلة اعتمدتها وتنتظر رد مدير الرد";
    $("#admNum").textContent = A.toAr(list.length);
    if (!list.length) {
      host.innerHTML = fresh ? empty("لا توجد أسئلة جديدة", "ستظهر هنا أسئلة المشاركين فور وصولها")
                             : empty("لا توجد أسئلة معتمدة", st.role === "responder" ? "ستظهر هنا الأسئلة بعد اعتمادها" : "كل الأسئلة المعتمدة تم الرد عليها");
      return;
    }
    host.innerHTML = list.map((i) => fresh ? freshCard(i) : approvedCard(i)).join("");
  }

  function freshCard(i) {
    return `<article class="qa adm-card" data-id="${A.esc(i.id)}">
      <p class="qa-meta"><span class="chip new">جديد</span><span>وصل ${A.esc(A.ago(i.created))}</span></p>
      <label class="sr-only" for="q-${A.esc(i.id)}">نص السؤال</label>
      <textarea class="textarea" id="q-${A.esc(i.id)}" data-role="qtext" maxlength="${MAXQ}">${A.esc(i.q)}</textarea>
      <p class="edit-note">يمكنك تعديل الصياغة قبل الاعتماد، والنص المعتمد هو ما يظهر للمشاركين.</p>
      <div class="adm-actions">
        <button class="btn btn-primary btn-sm btn-icon" data-act="approve" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>اعتماد</button>
        <button class="btn btn-danger btn-sm btn-icon" data-act="delete" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>حذف</button>
      </div>
    </article>`;
  }
  function approvedCard(i) {
    const canAnswer = st.role === "responder";
    const d = canAnswer ? draft.get(i.id) : "";
    return `<article class="qa adm-card" data-id="${A.esc(i.id)}">
      <p class="qa-meta"><span class="chip blue">معتمد</span><span>اعتمد ${A.esc(A.ago(i.approved))}</span>${d ? '<span class="draft-tag">مسودة محفوظة</span>' : ""}</p>
      <p class="qa-q">${A.esc(i.q)}</p>
      ${canAnswer ? `
      <label class="answer-label" for="a-${A.esc(i.id)}">الرد</label>
      <textarea class="textarea" id="a-${A.esc(i.id)}" data-role="answer" maxlength="${MAXA}" placeholder="اكتب الرد هنا…">${A.esc(d)}</textarea>
      <div class="adm-actions">
        <button class="btn btn-primary btn-sm btn-icon" data-act="answer" type="button"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 4 9.5 14.5M20 4l-6.5 16-4-5.5L4 10.5 20 4Z"/></svg>إرسال</button>
      </div>` : `<p class="edit-note">بانتظار رد مدير الرد</p>`}
    </article>`;
  }
  function empty(title, sub) {
    return `<div class="empty"><svg viewBox="0 0 110 80" aria-hidden="true"><path class="e2" d="M20 30h40a12 12 0 0 1 12 12v12a12 12 0 0 1-12 12H30l-12 9v-9.6A12 12 0 0 1 8 54V42a12 12 0 0 1 12-12Z"/><path class="e1" d="M52 6h36a12 12 0 0 1 12 12v10a12 12 0 0 1-12 12h-2l5 9-12-9H52a12 12 0 0 1-12-12V18A12 12 0 0 1 52 6Z"/></svg><strong>${title}</strong><span>${sub}</span></div>`;
  }

  // حفظ مسودة الرد أثناء الكتابة
  $("#admHost").addEventListener("input", (e) => {
    const t = e.target;
    t.classList.remove("bad");
    if (t.dataset.role === "answer") draft.set(t.closest("[data-id]").dataset.id, t.value);
  });

  // ——— الإجراءات ———
  function confirmDlg({ title, text, quote, ok = "تأكيد", danger = false }) {
    const d = $("#dlg");
    $("#dlgTitle").textContent = title;
    $("#dlgText").textContent = text;
    $("#dlgQ").textContent = quote || "";
    $("#dlgQ").hidden = !quote;
    const okBtn = $("#dlgOk");
    okBtn.textContent = ok;
    okBtn.className = "btn btn-sm " + (danger ? "btn-danger-solid" : "btn-primary");
    return new Promise((res) => {
      d.returnValue = "";
      d.addEventListener("close", () => res(d.returnValue === "ok"), { once: true });
      d.showModal();
    });
  }

  $("#admHost").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]");
    if (!b) return;
    const card = b.closest("[data-id]"), id = card.dataset.id, act = b.dataset.act;
    const item = (st.tab === "fresh" ? st.fresh : st.approved).find((i) => i.id === id);
    if (!item) return;

    if (act === "delete") {
      if (!(await confirmDlg({ title: "حذف السؤال؟", text: "لن يظهر هذا السؤال لأحد.", quote: item.q, ok: "حذف", danger: true }))) return;
      return act1(card, b, "delete", { id }, "حُذف السؤال، ولن يظهر لأحد", () => { st.fresh = st.fresh.filter((i) => i !== item); });
    }
    if (act === "approve") {
      const ta = $("[data-role=qtext]", card), text = ta.value.trim();
      if (text.length < 3) { ta.classList.add("bad"); ta.focus(); return K.toast("نص السؤال فارغ"); }
      return act1(card, b, "approve", { id, question: text !== item.q ? text : "" }, "اعتُمد السؤال، وانتقل إلى مدير الرد", () => {
        st.fresh = st.fresh.filter((i) => i !== item);
        st.approved.push(Object.assign({}, item, { q: text, approved: new Date().toISOString() }));
      });
    }
    if (act === "answer") {
      const ta = $("[data-role=answer]", card), text = ta.value.trim();
      if (text.length < 2) { ta.classList.add("bad"); ta.focus(); return K.toast("اكتب الرد أولا"); }
      if (!(await confirmDlg({ title: "إرسال الرد؟", text: "سيظهر السؤال مع هذا الرد لجميع المشاركين فورا.", quote: text, ok: "إرسال" }))) return;
      MasarFX.courier.start("جار إرسال الرد…");
      MasarFX.courier.creep(5, 88);
      let r;
      try { r = await A.call("answer", { code: st.code, id, answer: text }); } catch (err) { r = { ok: false, error: "تعذر الإرسال، تأكد من الاتصال" }; }
      if (r && r.ok) {
        await MasarFX.courier.finish("وصل الرد إلى المشاركين");
        await MasarFX.courier.hide();
        draft.set(id, "");
        st.approved = st.approved.filter((i) => i !== item);
        counts(); render();
        MasarFX.notify("أُرسل الرد، وظهر في أسئلة المشاركين");
      } else {
        await MasarFX.courier.hide();
        handleFail(r);
      }
    }
  });

  async function act1(card, btn, action, data, okMsg, apply) {
    $$("button", card).forEach((x) => (x.disabled = true));
    let r;
    try { r = await A.call(action, Object.assign({ code: st.code }, data)); } catch (e) { r = { ok: false, error: "تعذر الاتصال، حاول مرة أخرى" }; }
    if (r && r.ok) {
      card.classList.add("leaving");
      await K.W(420);
      apply(); counts(); render();
      MasarFX.notify(okMsg);
    } else {
      $$("button", card).forEach((x) => (x.disabled = false));
      handleFail(r);
    }
  }
  function handleFail(r) {
    const msg = (r && r.error) || "تعذر تنفيذ الطلب";
    if (/رمز/.test(msg)) return logout(msg);
    K.toast(msg, 3600);
    load(true);
  }

  // ——— البدء ———
  MasarFX.theme.init();
  const saved = ss.get();
  if (saved) {
    A.call("login", { code: saved }).then((r) => { if (r && r.ok) { st.role = r.role; enter(saved); } else { ss.set(""); show("screenGate"); } })
      .catch(() => show("screenGate"));
  } else show("screenGate");
})();
