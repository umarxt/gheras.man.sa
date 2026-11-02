/* حركات منصة مسار الخاصة بالطلاب
   MasarFX.theme   زر الليل والنهار: كتاب يُغلق فيحل الليل، ويُفتح فتشرق الشمس
   MasarFX.courier مشهد الإرسال في الإدارة: طالب يرمي حقيبته في هليكوبتر، فتقلع
   MasarFX.plane   مشهد الإرسال عند الطلاب: صاحبنا بعيونه المغمضة يطوي السؤال طائرة ورقية ويطيّرها، ثم إشعار «تم الإرسال»
   MasarFX.peek    صاحبنا بجانب خانة السؤال: يغمض عيونه أثناء الكتابة
   (courier وplane بنفس واجهة GherasKit.courier: start / creep / progress / finish / hide) */
(function () {
  "use strict";
  const K = GherasKit, $ = K.$, W = K.W;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ——— الليل والنهار: الكتاب ———
  const theme = {
    key: "masar-theme",
    busy: false,
    current() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; },
    apply(t) {
      document.documentElement.setAttribute("data-theme", t);
      K.storage((ls) => ls.setItem(this.key, t));
      const b = $("#themeToggle");
      if (!b) return;
      b.dataset.state = t;
      b.setAttribute("aria-pressed", t === "dark" ? "true" : "false");
      b.setAttribute("aria-label", t === "dark" ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي");
    },
    async toggle() {
      const b = $("#themeToggle");
      if (!b || this.busy) return;
      const to = this.current() === "dark" ? "light" : "dark";
      if (reduced()) { b.classList.toggle("closed", to === "dark"); this.apply(to); return; }
      this.busy = true;
      const page = $(".bt-page", b);
      if (to === "dark") {
        // الصفحة تنقلب فيُغلق الكتاب، ثم يحل الليل
        page.classList.add("mid"); await W(210);
        b.classList.add("closed"); page.classList.remove("mid"); await W(230);
        this.apply("dark"); await W(600);
      } else {
        // تشرق الشمس، ثم يُفتح الكتاب
        this.apply("light"); await W(480);
        page.classList.add("mid"); await W(210);
        b.classList.remove("closed"); page.classList.remove("mid"); await W(240);
      }
      this.busy = false;
    },
    init() {
      const b = $("#themeToggle");
      if (!b) return;
      const t = this.current();
      b.classList.toggle("closed", t === "dark");
      this.apply(t);
      b.addEventListener("click", () => this.toggle());
      requestAnimationFrame(() => requestAnimationFrame(() => b.classList.add("anim")));
    }
  };

  // ——— الإرسال: الحقيبة والهليكوبتر ———
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
        const pill = $("#heliPill"), kid = $("#kid"), bag = $("#bag");
        pill.className = "heli-pill";
        kid.setAttribute("class", "kid");
        bag.className = "bag";
        $("#courierBar").classList.remove("active");
        this.setBar(0);
        $("#overlayText").textContent = firstLabel || "";
        $("#overlay").hidden = false;
        await W(400);
        pill.classList.add("playing");
        $("#courierBar").classList.add("active");
        await W(350);
        kid.setAttribute("class", "kid walking"); pill.classList.add("walk");   // يمشي والحقيبة على ظهره
        await W(1000);
        kid.setAttribute("class", "kid");
        pill.classList.add("throw"); bag.classList.add("toss");                 // يرمي الحقيبة
        await W(720);
        bag.classList.add("in"); pill.classList.add("got");                    // دخلت الحقيبة الهليكوبتر
        await W(380);
        pill.classList.remove("throw"); pill.classList.add("idle");            // الهليكوبتر تنتظر اكتمال الإرسال
      })();
      return this.intro;
    },
    async finish(doneLabel = "تم الإرسال") {
      clearInterval(this.timer);
      this.setBar(100);
      this.label(doneLabel);
      await this.intro;
      const pill = $("#heliPill");
      pill.classList.add("go");                                                // تقلع والطالب يلوّح
      await W(1400);
    },
    async hide() { clearInterval(this.timer); await this.intro; $("#overlay").hidden = true; }
  };

  // ——— الإرسال عند الطلاب: الطائرة الورقية ———
  const plane = Object.assign(Object.create(courier), {
    start(firstLabel) {
      this.intro = (async () => {
        const pill = $("#planePill"), runner = $("#runner"), paper = $("#paper");
        pill.className = "plane-pill";
        runner.setAttribute("class", "buddy shut runner");
        paper.className = "paper";
        $("#courierBar").classList.remove("active");
        this.setBar(0);
        $("#overlayText").textContent = firstLabel || "";
        $("#overlay").hidden = false;
        await W(400);
        pill.classList.add("playing");
        $("#courierBar").classList.add("active");
        await W(300);
        runner.setAttribute("class", "buddy shut runner walking"); pill.classList.add("walk"); // يمشي وعيونه مغمضة والورقة بيده
        await W(1000);
        runner.setAttribute("class", "buddy shut runner");
        pill.classList.add("folding");
        paper.classList.add("s-fold"); await W(380);                                         // يطوي الورقة
        paper.classList.add("s-plane"); await W(420);                                        // صارت طائرة
        pill.classList.add("ready");                                                          // يرفعها وينتظر اكتمال الإرسال
      })();
      return this.intro;
    },
    async finish(doneLabel = "تم الإرسال") {
      clearInterval(this.timer);
      this.setBar(100);
      this.label(doneLabel);
      await this.intro;
      $("#planePill").classList.add("throw");
      $("#paper").classList.add("fly");                                                      // تطير الطائرة
      await W(1250);
      notify();
      await W(900);
    }
  });

  // إشعار «تم الإرسال» ينزل من أعلى الشاشة ثم يختفي
  function notify() {
    const n = $("#notif");
    if (!n) return;
    n.classList.remove("show"); void n.offsetWidth; n.classList.add("show");
    clearTimeout(n._h);
    n._h = setTimeout(() => n.classList.remove("show"), 4200);
  }

  // ——— صاحبنا بجانب خانة السؤال ———
  const peek = {
    bind(textarea, box) {
      if (!textarea || !box) return;
      const buddy = $(".buddy", box);
      const sync = () => {
        const shut = document.activeElement === textarea || textarea.value.trim().length > 0;
        box.classList.toggle("shut", shut);
        buddy.classList.toggle("shut", shut);
      };
      textarea.addEventListener("focus", sync);
      textarea.addEventListener("blur", sync);
      textarea.addEventListener("input", () => {
        sync();
        box.classList.remove("nod"); void box.offsetWidth; box.classList.add("nod");      // يهز رأسه مع الكتابة
      });
      sync();
    }
  };

  window.MasarFX = { theme, courier, plane, peek, notify };
})();
