/* حركات منصة مسار الخاصة بالطلاب
   MasarFX.theme   زر الليل والنهار: كتاب يُغلق فيحل الليل، ويُفتح فتشرق الشمس
   MasarFX.courier مشهد الإرسال: طالب يرمي حقيبته في هليكوبتر، فتقلع الهليكوبتر
   (نفس واجهة GherasKit.courier: start / creep / progress / finish / hide) */
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

  window.MasarFX = { theme, courier };
})();
