/* GherasKit — حركات وسلوك واجهة غراس، قابلة لإعادة الاستخدام في أي موقع
   يعتمد على kit.css وعلى بنية HTML الموجودة في demo.html.
   الاستخدام:
     GherasKit.theme.init();                       // زر الليل والنهار (#themeToggle)
     GherasKit.stage.start(el) / stop();           // الإضاءة التي تتبع المؤشر في شاشة كحلية
     GherasKit.portalGate({ verify, onEnter });    // الدخول: الرجل يمشي إلى الباب (بلا #accessCode يصبح زر بدء فقط)
     GherasKit.courier.start() / progress() / finish() / hide();   // مشهد التوصيل أثناء الإرسال
     GherasKit.bindChoices(root);                  // البطاقات والخيارات والمقاطع
     GherasKit.toast("نص");
*/
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const W = (ms) => wait(reduced() ? 0 : ms); // انتظار يحترم تقليل الحركة
  const storage = (fn) => { try { return fn(window.localStorage); } catch (e) { return null; } };
  const toAr = (v) => String(v).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

  // ——— تنبيه سفلي ———
  function toast(msg, ms = 2600) {
    const t = $("#toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove("show"), ms);
  }

  // ——— الوضع الليلي والنهاري ———
  // الليل: القمر يسارا والرجل واقف بجانب الحفرة. إلى النهار: يمشي ويسقط في الحفرة ثم تشرق الشمس فوقها.
  const theme = {
    key: "gheras-theme",
    mq: window.matchMedia("(prefers-color-scheme: dark)"),
    busy: false,
    current() { return document.documentElement.getAttribute("data-theme") || (this.mq.matches ? "dark" : "light"); },
    set(t) {
      document.documentElement.setAttribute("data-theme", t);
      storage((ls) => ls.setItem(this.key, t));
      const b = $("#themeToggle");
      if (b) {
        b.dataset.state = t;
        b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
        b.setAttribute("aria-label", t === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
      }
    },
    toggle() {
      const b = $("#themeToggle");
      if (!b || this.busy) return;
      const man = $(".tt-man", b);
      const to = this.current() === "dark" ? "light" : "dark";
      if (reduced()) { this.set(to); return; }
      this.busy = true;
      const at = (ms, fn) => setTimeout(fn, ms);
      if (to === "light") {
        man.setAttribute("class", "tt-man walk");
        at(700, () => man.setAttribute("class", "tt-man sink"));
        at(1000, () => { man.setAttribute("class", "tt-man"); this.set("light"); });
        at(1500, () => { this.busy = false; });
      } else {
        man.setAttribute("class", "tt-man sink");
        this.set("dark");
        at(520, () => man.setAttribute("class", "tt-man pop"));
        at(800, () => man.setAttribute("class", "tt-man back"));
        at(1520, () => { man.setAttribute("class", "tt-man"); this.busy = false; });
      }
    },
    init() {
      const b = $("#themeToggle");
      if (!b) return;
      b.dataset.state = this.current();
      b.setAttribute("aria-pressed", this.current() === "dark" ? "true" : "false");
      b.addEventListener("click", () => this.toggle());
      this.mq.addEventListener && this.mq.addEventListener("change", () => {
        if (!storage((ls) => ls.getItem(this.key))) b.dataset.state = this.current();
      });
    }
  };

  // ——— الإضاءة التي تتبع المؤشر (شاشات .stage الكحلية) ———
  // تحرك متغيري --mx و --my؛ الباترن في .stage-light لا يظهر إلا داخل الإضاءة. بلا مؤشر تتجول وحدها.
  const stage = {
    s: null,
    start(el) {
      this.stop();
      if (!el) return;
      const r = el.getBoundingClientRect();
      const s = this.s = { el, x: r.width * 0.3, y: r.height * 0.42, tx: r.width * 0.3, ty: r.height * 0.42, last: 0, t0: performance.now(), raf: 0 };
      const logo = $(".stage-logo", el);
      const tick = (now) => {
        if (this.s !== s) return;
        const rect = el.getBoundingClientRect();
        if (now - s.last > 2600 && !reduced()) {
          const t = (now - s.t0) / 1000, wide = rect.width > 760;
          s.tx = rect.width * (wide ? 0.3 : 0.5) + Math.sin(t * 0.45) * Math.min(220, rect.width * (wide ? 0.18 : 0.32));
          s.ty = rect.height * (wide ? 0.45 : 0.32) + Math.sin(t * 0.7) * 110;
        }
        s.x += (s.tx - s.x) * 0.08;
        s.y += (s.ty - s.y) * 0.08;
        el.style.setProperty("--mx", s.x.toFixed(1) + "px");
        el.style.setProperty("--my", s.y.toFixed(1) + "px");
        if (logo) { // هالة الشعار تميل نحو الإضاءة
          const lr = logo.getBoundingClientRect();
          const dx = s.x - (lr.left - rect.left + lr.width / 2), dy = s.y - (lr.top - rect.top + lr.height / 2);
          const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300) * 26;
          logo.style.setProperty("--hx", ((dx / d) * k).toFixed(1) + "px");
          logo.style.setProperty("--hy", ((dy / d) * k).toFixed(1) + "px");
        }
        s.raf = requestAnimationFrame(tick);
      };
      s.raf = requestAnimationFrame(tick);
    },
    stop() { if (this.s) cancelAnimationFrame(this.s.raf); this.s = null; },
    pointer(e) {
      const s = stage.s;
      if (!s) return;
      const rect = s.el.getBoundingClientRect();
      s.tx = e.clientX - rect.left; s.ty = e.clientY - rect.top; s.last = performance.now();
    }
  };
  window.addEventListener("pointermove", stage.pointer, { passive: true });
  window.addEventListener("pointerdown", stage.pointer, { passive: true });

  // ——— الدخول: بطاقة نيومورفيزم، رجل بدفتر في الخانة، ورجل يمشي إلى باب في الزر ———
  // verify(code) ترجع { ok: true } أو { ok: false, error: "..." }؛ onEnter(code) تستدعى بعد اختفاء البطاقة
  function portalGate({ verify, onEnter, emptyMsg = "أدخل رمز الدخول", wrongMsg = "رمز الدخول غير صحيح" }) {
    const form = $("#gateForm"), input = $("#accessCode"), msg = $("#gateMsg");
    const card = $("#loginCard"), btn = $("#portalBtn"), walker = $("#walker"), door = $(".door", btn), cap = $("#portalCaption");
    const note = $("#noteMan");
    const shake = () => { card.classList.remove("shake"); void card.offsetWidth; card.classList.add("shake"); };
    const setW = (c) => walker.setAttribute("class", "walker " + c);
    let busy = false;
    if (input) input.addEventListener("input", () => { // يكتب في دفتره مع كل حرف
      if (!note) return;
      note.classList.remove("write"); void note.getBoundingClientRect(); note.classList.add("write");
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (busy) return;
      const val = input ? input.value.trim() : ""; // بلا خانة رمز: زر دخول فقط
      if (input && !val) { msg.textContent = emptyMsg; shake(); input.focus(); return; }
      msg.textContent = "";
      busy = true;
      cap.classList.add("hide");
      btn.classList.add("playing");
      setW("walking");
      await wait(40);
      setW("walking at-door");
      const check = (async () => { try { return await verify(val); } catch (err) { return { ok: false, error: "تعذر التحقق، تأكد من الاتصال وحاول مرة أخرى" }; } })();
      const [r] = await Promise.all([check, W(1200)]);
      if (r && r.ok) {
        setW("at-door"); door.classList.add("open"); await W(380);
        setW("walking at-door enter"); await W(520);
        door.classList.remove("open"); await W(260);
        card.classList.add("card-hide"); await W(480);
        await onEnter(val);
        card.classList.remove("card-hide"); btn.classList.remove("playing"); cap.classList.remove("hide"); setW("");
      } else {
        setW("at-door bump"); await W(170);
        setW("walking back"); await W(920);
        setW(""); btn.classList.remove("playing"); cap.classList.remove("hide");
        msg.textContent = (r && r.error) || wrongMsg;
        shake();
      }
      busy = false;
    });
  }

  // ——— مشهد التوصيل أثناء الإرسال ———
  // start() يبدأ المشهد (يمشي الرجل ويضع الطرد على السكوتر)، progress(pct, label) لتقدم حقيقي،
  // creep(from, to) لتقدم هادئ أثناء انتظار الشبكة، finish(label) يلوح المندوب وينطلق، hide() يخفي النافذة.
  const courier = {
    intro: null, timer: null,
    setBar(p) { $("#overlayBar").style.width = Math.max(0, Math.min(100, p)) + "%"; },
    async label(t) {
      const l = $("#overlayText");
      if (!t || l.textContent === t) return;
      l.classList.add("fade"); await W(200); l.textContent = t; l.classList.remove("fade");
    },
    progress(p, t) { clearInterval(this.timer); this.setBar(p); if (t) this.label(t); },
    creep(from, to) {
      clearInterval(this.timer);
      let v = from;
      this.timer = setInterval(() => { v += (to - v) * 0.06; this.setBar(v); }, 240);
    },
    start(firstLabel) {
      this.intro = (async () => {
        const pill = $("#courierPill"), sender = $("#sender");
        pill.className = "courier-pill";
        sender.setAttribute("class", "sender");
        $("#courierBar").classList.remove("active");
        this.setBar(0);
        $("#overlayText").textContent = firstLabel || "";
        $("#overlay").hidden = false;
        await W(450);
        pill.classList.add("playing");
        $("#courierBar").classList.add("active");
        await W(350);
        sender.setAttribute("class", "sender walking"); pill.classList.add("walk");
        await W(1100);
        sender.setAttribute("class", "sender"); pill.classList.add("hand");
        await W(560);
        pill.classList.add("stepback", "idle");
      })();
      return this.intro;
    },
    async finish(doneLabel = "تم الإرسال") {
      clearInterval(this.timer);
      this.setBar(100);
      this.label(doneLabel);
      await this.intro;
      const pill = $("#courierPill");
      pill.classList.add("react"); await W(520);
      pill.classList.remove("idle"); pill.classList.add("go"); await W(1050);
    },
    async hide() { clearInterval(this.timer); await this.intro; $("#overlay").hidden = true; }
  };

  // ——— الخيارات: مقاطع (.seg)، بطاقات (.opt / .size-card)، ولوحات تظهر حسب الاختيار ———
  // <div class="extra" data-show-when="name=value"> تفتح عندما يكون الاختيار name = value
  function bindChoices(root = document) {
    const sync = (name) => {
      $$(`input[name="${name}"]`, root).forEach((i) => {
        const l = i.closest("label");
        if (l) l.classList.toggle("checked", i.checked);
      });
      const val = ($(`input[name="${name}"]:checked`, root) || {}).value;
      $$(`[data-show-when^="${name}="]`, root).forEach((p) => p.classList.toggle("open", p.dataset.showWhen === `${name}=${val}`));
    };
    root.addEventListener("change", (e) => {
      const t = e.target;
      if (t.type !== "radio" && t.type !== "checkbox") return;
      sync(t.name);
      const box = t.closest(".q, .card");
      if (box) box.classList.remove("missing");
    });
    new Set($$("input[type=radio], input[type=checkbox]", root).map((i) => i.name)).forEach(sync);
  }

  // ——— حلقة تقدم صغيرة (SVG) ———
  function ring(done, total) {
    const r = 14, c = 2 * Math.PI * r, off = c * (1 - (total ? done / total : 0));
    return `<svg class="ring" viewBox="0 0 34 34" aria-hidden="true"><circle class="bg" cx="17" cy="17" r="${r}"/><circle class="fg" cx="17" cy="17" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
  }

  window.GherasKit = { $, $$, wait, W, toAr, storage, toast, theme, stage, portalGate, courier, bindChoices, ring };
})();
