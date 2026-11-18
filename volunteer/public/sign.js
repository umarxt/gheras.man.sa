/* خانة التوقيع بالإصبع أو الماوس.
   const pad = SignPad(el); pad.isEmpty(); pad.toDataURL(); pad.clear(); pad.onChange = fn; */
(function () {
  "use strict";
  window.SignPad = function (root) {
    root.innerHTML =
      '<canvas aria-label="خانة التوقيع: وقع بإصبعك أو بالماوس" role="img"></canvas>' +
      '<span class="sig-line" aria-hidden="true"></span><span class="sig-x" aria-hidden="true">×</span>' +
      '<span class="sig-hint">وقّع هنا بإصبعك أو بالماوس</span>' +
      '<svg class="sig-pen" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.2-4.6L15.8 4.8a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8Z" fill="none" stroke="#27B5C1" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 20l4.6-1.2" stroke="#1C437D" stroke-width="1.8"/></svg>' +
      '<button type="button" class="btn btn-line btn-sm sig-clear" hidden>مسح</button>';
    const cv = root.querySelector("canvas"), clearBtn = root.querySelector(".sig-clear");
    const ctx = cv.getContext("2d");
    let strokes = [], cur = null, ratio = 1;
    const api = { onChange: null };

    function size() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      ratio = Math.max(1, window.devicePixelRatio || 1);
      cv.width = Math.round(r.width * ratio); cv.height = Math.round(r.height * ratio);
      redraw();
    }
    function line(pts) {
      if (!pts.length) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x * cv.width, pts[0].y * cv.height);
      if (pts.length === 1) ctx.lineTo(pts[0].x * cv.width + 0.1, pts[0].y * cv.height);
      for (let i = 1; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        ctx.quadraticCurveTo(a.x * cv.width, a.y * cv.height, ((a.x + b.x) / 2) * cv.width, ((a.y + b.y) / 2) * cv.height);
      }
      if (pts.length > 1) { const l = pts[pts.length - 1]; ctx.lineTo(l.x * cv.width, l.y * cv.height); }
      ctx.stroke();
    }
    function redraw() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#14213A"; ctx.lineWidth = 2.6 * ratio;
      strokes.forEach(line);
    }
    function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }; }
    function changed() {
      const has = strokes.some((s) => s.length > 1);
      root.classList.toggle("has", has); clearBtn.hidden = !has;
      if (has) root.classList.remove("bad");
      if (api.onChange) api.onChange(has);
    }
    cv.addEventListener("pointerdown", (e) => {
      e.preventDefault(); cv.setPointerCapture(e.pointerId);
      cur = [pos(e)]; strokes.push(cur); redraw();
    });
    cv.addEventListener("pointermove", (e) => {
      if (!cur) return; e.preventDefault();
      const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      evs.forEach((ev) => cur.push(pos(ev)));
      redraw();
    });
    const end = () => { if (cur) { cur = null; changed(); } };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end); cv.addEventListener("pointerleave", end);
    clearBtn.addEventListener("click", () => api.clear());
    new ResizeObserver(size).observe(cv);

    api.isEmpty = () => !strokes.some((s) => s.length > 1);
    api.clear = () => { strokes = []; redraw(); changed(); };
    // يقص التوقيع إلى حدوده ويعيده PNG شفافا
    api.toDataURL = () => {
      if (api.isEmpty()) return "";
      const W = 900, H = Math.round(900 * cv.height / cv.width);
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const x = c.getContext("2d");
      x.lineCap = "round"; x.lineJoin = "round"; x.strokeStyle = "#14213A"; x.lineWidth = 5;
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      strokes.forEach((s) => {
        x.beginPath();
        s.forEach((p, i) => { i ? x.lineTo(p.x * W, p.y * H) : x.moveTo(p.x * W, p.y * H); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
        x.stroke();
      });
      const m = 12, sx = Math.max(0, minX * W - m), sy = Math.max(0, minY * H - m);
      const w = Math.min(W, maxX * W + m) - sx, h = Math.min(H, maxY * H + m) - sy;
      const o = document.createElement("canvas"); o.width = Math.max(1, Math.round(w)); o.height = Math.max(1, Math.round(h));
      o.getContext("2d").drawImage(c, sx, sy, w, h, 0, 0, o.width, o.height);
      return o.toDataURL("image/png");
    };
    return api;
  };
})();
