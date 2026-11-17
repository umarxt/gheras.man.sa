/* منصة أسئلة مسار — لوحة المشرفين (مقدمي الحقيبة)
   لكل مشرف رمزه الخاص (من ورقة «المشرفون» في الشيت)، وكل المشرفين يرون كل الأسئلة.
   - السؤال العام: «نشر للجميع» مع الرد (هذا هو إذن النشر)، أو «رد خاص» يراه المشارك وحده.
   - السؤال الخاص: رد خاص فقط.
   - «تم الرد»: الأسئلة المجابة، ويمكن إلغاء نشر المنشور فيرجع إلى «أسئلة جديدة». */
(function () {
  "use strict";
  const K = GherasKit, A = MasarAPI, $ = K.$, $$ = K.$$;
  const C = A.C, MAXQ = C.MAX_QUESTION || 600, MAXA = C.MAX_ANSWER || 3000;
  const SKEY = "masar-admin";

  const st = { code: "", name: "", fresh: [], done: [], tab: "fresh", type: "", timer: 0, loading: false };

  // رمز الجلسة يحفظ في هذه النافذة فقط ويحذف عند إغلاقها
  const ss = { get() { try { return sessionStorage.getItem(SKEY) || ""; } catch (e) { return ""; } },
               set(v) { try { v ? sessionStorage.setItem(SKEY, v) : sessionStorage.removeItem(SKEY); } catch (e) {} } };
  // مسودات الرد على جهاز المشرف
  const draftKey = (id) => "masar-draft-" + id;
  const draft = { get: (id) => K.storage((ls) => ls.getItem(draftKey(id))) || "",
                  set: (id, v) => K.storage((ls) => (v ? ls.setItem(draftKey(id), v) : ls.removeItem(draftKey(id)))) };

  const ICON = {
    globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.5 3.5 5.3 3.5 8.5s-1.1 6-3.5 8.5c-2.4-2.5-3.5-5.3-3.5-8.5s1.1-6 3.5-8.5Z"/></svg>',
    lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
    trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
    undo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/></svg>',
    reply: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5Z"/></svg>'
  };
  const typeChip = (t) => t === "خاص" ? `<span class="chip lock">${ICON.lock}خاص</span>` : `<span class="chip blue">${ICON.globe}عام</span>`;

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
      if (r && r.ok) { st.name = r.name || ""; return { ok: true }; }
      return { ok: false, error: (r && r.error) || "رمز الدخول غير صحيح" };
    },
    onEnter: (code) => enter(code)
  });
  if (A.PREVIEW) $("#gateSub").textContent = "وضع المعاينة — رموز تجريبية لمشرفين: 1198 و 1996";

  function enter(code) {
    st.code = code; ss.set(code);
    $("#accessCode").value = "";
    $("#roleChip").textContent = st.name;
    st.tab = "fresh";
    show("screenAdmin");
    load();
    clearInterval(st.timer);
    st.timer = setInterval(() => { if (!document.hidden && !busyEditing()) load(true); }, 60000);
  }
  function logout(msg) {
    clearInterval(st.timer);
    st.code = ""; st.name = ""; ss.set("");
    show("screenGate");
    if (msg) $("#gateMsg").textContent = msg;
  }
  $("#logoutBtn").addEventListener("click", () => logout());

  // لا نحدث القائمة تلقائيا والمشرف يكتب
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
      if (r && /رمز|محاولات/.test(r.error || "")) return logout(r.error);
      if (!quiet) $("#admHost").innerHTML = empty("تعذر تحميل الأسئلة", (r && r.error) || "حاول مرة أخرى");
      return;
    }
    const before = st.fresh.length;
    st.fresh = r.fresh || [];
    st.done = r.done || [];
    if (r.name) { st.name = r.name; $("#roleChip").textContent = r.name; }
    $("#syncNote").textContent = "آخر تحديث: " + new Date().toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit" });
    counts();
    render();
    if (quiet && st.fresh.length > before) MasarFX.notify("وصل سؤال جديد");
  }
  function counts() {
    $("#cFresh").textContent = A.toAr(st.fresh.length);
    $("#cDone").textContent = A.toAr(st.done.length);
    $("#cFresh").classList.toggle("hot", st.fresh.length > 0);
  }
  $("#refreshBtn").addEventListener("click", () => load());
  $$(".tab").forEach((b) => b.addEventListener("click", () => { st.tab = b.dataset.tab; render(); }));
  K.bindChoices($("#typeFilter"));
  $("#typeFilter").addEventListener("change", (e) => { st.type = e.target.value; render(); });

  // ——— العرض ———
  function render() {
    $$(".tab").forEach((b) => b.setAttribute("aria-selected", b.dataset.tab === st.tab ? "true" : "false"));
    const host = $("#admHost");
    const fresh = st.tab === "fresh";
    const list = (fresh ? st.fresh : st.done).filter((i) => !st.type || i.type === st.type);
    $("#admTitle").textContent = fresh ? "أسئلة جديدة" : "تم الرد";
    $("#admLead").textContent = fresh
      ? "اكتب ردك. السؤال العام تنشره للجميع مع الرد أو ترد عليه ردا خاصا، والسؤال الخاص رده خاص دائما"
      : "الأسئلة التي رد عليها المشرفون. المنشور يمكن إلغاء نشره فيرجع إلى «أسئلة جديدة»";
    $("#admNum").textContent = A.toAr(list.length);
    if (!list.length) {
      host.innerHTML = fresh ? empty("لا توجد أسئلة جديدة", "ستظهر هنا أسئلة المشاركين فور وصولها")
                             : empty("لا توجد ردود بعد", "ستظهر هنا الأسئلة بعد الرد عليها");
      return;
    }
    host.innerHTML = list.map((i) => fresh ? freshCard(i) : doneCard(i)).join("");
  }

  function freshCard(i) {
    const id = A.esc(i.id), pub = i.type !== "خاص";
    const d = draft.get(i.id) || i.draft || "";
    return `<article class="qa adm-card${pub ? "" : " is-private"}" data-id="${id}">
      <p class="qa-meta">${typeChip(i.type)}<span>وصل ${A.esc(A.ago(i.created))}</span>${draft.get(i.id) ? '<span class="draft-tag">مسودة محفوظة</span>' : ""}</p>
      ${pub ? `<label class="sr-only" for="q-${id}">نص السؤال</label>
      <textarea class="textarea q-edit" id="q-${id}" data-role="qtext" maxlength="${MAXQ}">${A.esc(i.q)}</textarea>
      <p class="edit-note">يمكنك تعديل صياغة السؤال قبل نشره، مثلا لحذف ما يدل على كاتبه.</p>`
      : `<p class="qa-q">${A.esc(i.q)}</p><p class="edit-note">${ICON.lock} سؤال خاص: لا ينشر، والرد يصل للمشارك وحده.</p>`}
      <label class="answer-label" for="a-${id}">ردك</label>
      <textarea class="textarea" id="a-${id}" data-role="answer" maxlength="${MAXA}" placeholder="اكتب ردك هنا…">${A.esc(d)}</textarea>
      <div class="adm-actions">
        ${pub ? `<button class="btn btn-primary btn-sm btn-icon" data-act="public" type="button">${ICON.globe}نشر للجميع مع الرد</button>
        <button class="btn btn-ghost-line btn-sm btn-icon" data-act="private" type="button">${ICON.lock}رد خاص</button>`
        : `<button class="btn btn-primary btn-sm btn-icon" data-act="private" type="button">${ICON.lock}إرسال رد خاص</button>`}
        <button class="btn btn-danger btn-sm btn-icon" data-act="delete" type="button">${ICON.trash}حذف</button>
      </div>
    </article>`;
  }
  function doneCard(i) {
    const pub = i.status === "public";
    return `<article class="qa adm-card" data-id="${A.esc(i.id)}">
      <p class="qa-meta">${pub ? `<span class="chip new">${ICON.globe}منشور للجميع</span>` : `<span class="chip lock">${ICON.lock}رد خاص</span>`}${typeChip(i.type)}<span>${A.esc(A.ago(i.at))}</span></p>
      <p class="qa-q">${A.esc(i.q)}</p>
      <div class="qa-a${pub ? "" : " private"}">
        <p class="qa-a-label">${ICON.reply}رد ${A.esc(i.by || "المشرف")}</p>
        <p>${A.esc(i.a)}</p>
      </div>
      ${pub ? `<div class="adm-actions"><button class="btn btn-ghost-line btn-sm btn-icon" data-act="unpublish" type="button">${ICON.undo}إلغاء النشر</button></div>` : ""}
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
    const item = (st.tab === "fresh" ? st.fresh : st.done).find((i) => i.id === id);
    if (!item) return;

    if (act === "delete") {
      if (!(await confirmDlg({ title: "حذف السؤال؟", text: "لن يظهر هذا السؤال لأحد، ولن يصل للمشارك رد عليه.", quote: item.q, ok: "حذف", danger: true }))) return;
      return act1(card, "delete", { id }, "حُذف السؤال", () => { st.fresh = st.fresh.filter((i) => i !== item); });
    }
    if (act === "unpublish") {
      if (!(await confirmDlg({ title: "إلغاء نشر السؤال؟", text: "يختفي من «أسئلة المشاركين» ويرجع إلى «أسئلة جديدة» بنصه الأصلي، وردك يبقى مسودة تعدلها ثم تنشره أو ترد ردا خاصا.", quote: item.q, ok: "إلغاء النشر" }))) return;
      return act1(card, "unpublish", { id }, "أُلغي النشر، ورجع السؤال إلى أسئلة جديدة", (r) => {
        st.done = st.done.filter((i) => i !== item);
        st.fresh.push({ id: item.id, q: (r && r.q) || item.q, type: item.type, created: new Date().toISOString(), draft: item.a });
      });
    }
    if (act === "public" || act === "private") {
      const ta = $("[data-role=answer]", card), text = ta.value.trim();
      if (text.length < 2) { ta.classList.add("bad"); ta.focus(); return K.toast("اكتب ردك أولا"); }
      const qta = $("[data-role=qtext]", card), qtext = qta ? qta.value.trim() : item.q;
      if (act === "public" && qtext.length < 3) { qta.classList.add("bad"); qta.focus(); return K.toast("نص السؤال فارغ"); }
      const pub = act === "public";
      const ok = await confirmDlg(pub
        ? { title: "نشر السؤال مع ردك للجميع؟", text: "يظهر في «أسئلة المشاركين» مع اسمك، ويصل للمشارك في «أسئلتي».", quote: text, ok: "نشر للجميع" }
        : { title: "إرسال رد خاص؟", text: "يراه المشارك صاحب السؤال وحده في «أسئلتي»، ولا ينشر لأحد.", quote: text, ok: "إرسال رد خاص" });
      if (!ok) return;
      MasarFX.courier.start(pub ? "جار نشر الرد…" : "جار إرسال الرد الخاص…");
      MasarFX.courier.creep(5, 88);
      let r;
      try { r = await A.call("reply", { code: st.code, id, mode: act, answer: text, question: pub && qtext !== item.q ? qtext : "" }); }
      catch (err) { r = { ok: false, error: "تعذر الإرسال، تأكد من الاتصال" }; }
      if (r && r.ok) {
        await MasarFX.courier.finish(pub ? "نُشر الرد" : "وصل الرد الخاص");
        await MasarFX.courier.hide();
        draft.set(id, "");
        st.fresh = st.fresh.filter((i) => i !== item);
        st.done.unshift({ id, q: pub ? qtext : item.q, type: item.type, status: pub ? "public" : "private", a: text, by: st.name, at: new Date().toISOString() });
        counts(); render();
        MasarFX.notify(pub ? "نُشر السؤال مع ردك في أسئلة المشاركين" : "أُرسل ردك الخاص، ويراه المشارك في «أسئلتي»");
      } else {
        await MasarFX.courier.hide();
        handleFail(r);
      }
    }
  });

  async function act1(card, action, data, okMsg, apply) {
    $$("button", card).forEach((x) => (x.disabled = true));
    let r;
    try { r = await A.call(action, Object.assign({ code: st.code }, data)); } catch (e) { r = { ok: false, error: "تعذر الاتصال، حاول مرة أخرى" }; }
    if (r && r.ok) {
      card.classList.add("leaving");
      await K.W(420);
      apply(r); counts(); render();
      MasarFX.notify(okMsg);
    } else {
      $$("button", card).forEach((x) => (x.disabled = false));
      handleFail(r);
    }
  }
  function handleFail(r) {
    const msg = (r && r.error) || "تعذر تنفيذ الطلب";
    if (/رمز الدخول|محاولات/.test(msg)) return logout(msg);
    K.toast(msg, 3600);
    load(true);
  }

  // ——— البدء ———
  MasarFX.theme.init();
  const saved = ss.get();
  if (saved) {
    A.call("login", { code: saved }).then((r) => { if (r && r.ok) { st.name = r.name || ""; enter(saved); } else { ss.set(""); show("screenGate"); } })
      .catch(() => show("screenGate"));
  } else show("screenGate");
})();
