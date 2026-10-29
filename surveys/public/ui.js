/* منصة الاستبانات — أدوات واجهة مشتركة بين صفحة الإدارة وصفحة المجيب:
   الأيقونات، ورسم الأسئلة للمجيب، والملخصات، والنوافذ. */
(function () {
  "use strict";
  const S = window.GSchema;
  const toAr = S.toAr;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const LETTERS = "أ ب ج د هـ و ز ح ط ي ك ل م ن س ع ف ص ق ر ش ت ث خ ذ ض ظ غ".split(" ");
  const letter = (i) => LETTERS[i] || toAr(i + 1);

  // ——— الأيقونات (خطية، بلون النص) ———
  const P = {
    plus: "M12 5v14M5 12h14",
    heart: "M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z",
    star: "m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z",
    user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20a7.5 7.5 0 0 1 15 0",
    check: "m5 12.5 4.5 4.5L19 7.5",
    branch: "M6 4v8a4 4 0 0 0 4 4h8M6 4 3.5 6.5M6 4l2.5 2.5M18 16l-2.5-2.5M18 16l-2.5 2.5M6 12v8",
    eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    send: "M20.5 3.5 3.5 10.5l7 3 3 7 7-17ZM10.5 13.5l4-4",
    copy: "M9 9h10v10H9zM5 15V5h10",
    trash: "M4.5 7h15M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
    dup: "M8 8h11v11H8zM5 16V5h11M13.5 11v5M11 13.5h5",
    up: "M12 19V5M6 11l6-6 6 6",
    down: "M12 5v14M6 13l6 6 6-6",
    more: "M12 6h.01M12 12h.01M12 18h.01",
    text: "M5 6V5h14v1M12 5v14M9 19h6",
    image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9.5h.01",
    video: "M4 6h12v12H4zM16 10l5-3v10l-5-3",
    section: "M4 5h16v5H4zM4 14h16v5H4z",
    link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
    qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 14h2v2h-2zM14 18h2v2h-2zM18 18h2v2h-2z",
    download: "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M4 19h16",
    sheet: "M4 4h16v16H4zM4 9.5h16M4 15h16M10 4v16",
    refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4",
    back: "M9 6l6 6-6 6",
    fwd: "M15 6l-6 6 6 6",
    close: "M6 6l12 12M18 6 6 18",
    edit: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
    chart: "M5 19V11M10 19V5M15 19v-6M20 19V9",
    list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
    settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.3 1.3L14.5 21h-4l-.3-2.3a7 7 0 0 1-2.3-1.3l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-3L4 9.3l2-3.4 1.9.7a7 7 0 0 1 2.3-1.3L10.5 3h4l.3 2.3a7 7 0 0 1 2.3 1.3l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 3Z",
    mail: "M3.5 6h17v12h-17zM3.5 6l8.5 7 8.5-7",
    chat: "M4 19.5 5.5 15A7.5 7.5 0 1 1 9 18.5l-5 1Z",
    logout: "M14 4h5v16h-5M10 8l-4 4 4 4M6 12h9",
    lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
    clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
    quiz: "M9 9a3 3 0 1 1 4 2.8c-.6.3-1 .8-1 1.5V14M12 17.5h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
    file: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5",
    search: "M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM20 20l-4.8-4.8",
    calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4",
    grid: "M4 4h16v16H4zM4 12h16M12 4v16",
    radio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z",
    box: "M5 5h14v14H5zM8.5 12l2.5 2.5 4.5-5",
    caret: "M7 10l5 5 5-5",
    scale: "M4 12h16M4 9v6M20 9v6M12 10v4M8 10.5v3M16 10.5v3",
    short: "M4 10h16M4 14h10",
    para: "M4 7h16M4 11h16M4 15h16M4 19h10",
    upload: "M12 16V4m0 0-4.5 4.5M12 4l4.5 4.5M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3",
    palette: "M12 21a9 9 0 1 1 9-9c0 2-1.5 3-3 3h-2a2 2 0 0 0-1.5 3.3c.4.5.5 1 .5 1.4 0 .7-1 1.3-3 1.3ZM7.5 11h.01M10 7h.01M14.5 7h.01M17 11h.01"
  };
  const icon = (name, size = 20) => `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name] || P.plus}"/></svg>`;
  const TYPE_ICON = { short: "short", paragraph: "para", radio: "radio", checkbox: "box", dropdown: "caret", scale: "scale", rating: "star", grid: "grid", checkgrid: "grid", date: "calendar", time: "clock", file: "upload", text: "text", image: "image", video: "video", download: "download" };

  // ——— الوسائط ———
  function mediaSrc(url) {
    const u = String(url || "").trim();
    const m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/.exec(u);
    if (m) return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w1600";
    return /^https?:\/\//i.test(u) ? u : "";
  }
  function youtubeId(url) {
    const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/.exec(String(url || ""));
    return m ? m[1] : "";
  }

  // رابط تحميل مباشر: ملفات درايف تنزل كما هي، وملفات قوقل تحول إلى صيغة أوفيس
  function downloadUrl(url) {
    const u = String(url || "").trim();
    let m = /docs\.google\.com\/(presentation|spreadsheets|document)\/d\/([\w-]{20,})/.exec(u);
    if (m) return `https://docs.google.com/${m[1]}/d/${m[2]}/export?format=${{ presentation: "pptx", spreadsheets: "xlsx", document: "docx" }[m[1]]}`;
    m = /drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/.exec(u);
    if (m) return "https://drive.google.com/uc?export=download&id=" + m[1];
    return /^https?:\/\//i.test(u) ? u : "";
  }

  // خلط ثابت لكل مجيب: نفس البذرة تعطي نفس الترتيب
  function shuffle(arr, seed) {
    let h = 2166136261;
    for (const ch of String(seed)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const rnd = () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  // ——— رسم سؤال للمجيب ———
  // ctx: { num, seed, points, files: File[] لم ترفع بعد, uploaded: [{name,url}] }
  function itemHTML(it, a, ctx = {}) {
    const T = S.TYPES[it.type] || {};
    if (it.type === "text") return `<section class="card info-card ${it.tone === "terms" ? "intro-terms" : ""}" data-item="${it.id}">
      ${it.title ? `<h2 class="card-title">${esc(it.title)}</h2>` : ""}${it.description ? `<p class="info-text">${esc(it.description)}</p>` : ""}</section>`;
    if (it.type === "image") {
      const src = mediaSrc(it.media && it.media.url);
      return `<figure class="card media-card" data-item="${it.id}">
        ${it.title ? `<h2 class="card-title">${esc(it.title)}</h2>` : ""}
        ${src ? `<img src="${esc(src)}" alt="${esc((it.media && it.media.caption) || it.title || "")}" loading="lazy" referrerpolicy="no-referrer">` : `<div class="media-empty">${icon("image", 30)}</div>`}
        ${it.media && it.media.caption ? `<figcaption>${esc(it.media.caption)}</figcaption>` : ""}</figure>`;
    }
    if (it.type === "video") {
      const id = youtubeId(it.media && it.media.url);
      return `<figure class="card media-card" data-item="${it.id}">
        ${it.title ? `<h2 class="card-title">${esc(it.title)}</h2>` : ""}
        ${id ? `<div class="video"><iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${esc(it.title || "فيديو")}" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe></div>` : `<div class="media-empty">${icon("video", 30)}</div>`}
        ${it.media && it.media.caption ? `<figcaption>${esc(it.media.caption)}</figcaption>` : ""}</figure>`;
    }
    if (it.type === "download") {
      const url = downloadUrl(it.media && it.media.url);
      return `<section class="card dl-card" data-item="${it.id}">
        <span class="dl-icon">${icon("file", 28)}</span>
        <div class="dl-body"><h2 class="card-title">${esc(it.title || "ملف للتحميل")}</h2>${it.description ? `<p class="info-text">${esc(it.description)}</p>` : ""}</div>
        ${url ? `<a class="btn btn-primary dl-btn" href="${esc(url)}" target="_blank" rel="noopener">${icon("download", 18)} ${esc((it.media && it.media.caption) || "تحميل النموذج")}</a>` : `<span class="chip off">يضاف الملف قريبا</span>`}</section>`;
    }
    if (!T.q) return "";
    const n = it.id;
    let body = "";
    switch (it.type) {
      case "short": {
        const v = it.validation || {};
        const num = v.kind === "number", ltr = v.kind === "text" && ["email", "url", "phone"].includes(v.op);
        const type = v.kind === "text" && v.op === "email" ? "email" : v.kind === "text" && v.op === "url" ? "url" : v.kind === "text" && v.op === "phone" ? "tel" : "text";
        body = `<input class="input answer" id="in_${n}" data-a="${n}" type="${type}" ${num ? 'inputmode="decimal"' : ""} ${ltr ? 'dir="ltr"' : ""} placeholder="إجابتك" value="${esc(a || "")}" aria-labelledby="t_${n}" autocomplete="off">`;
        break;
      }
      case "paragraph":
        body = `<textarea class="textarea answer" id="in_${n}" data-a="${n}" placeholder="إجابتك" aria-labelledby="t_${n}">${esc(a || "")}</textarea>`;
        break;
      case "radio": case "checkbox": {
        const multi = it.type === "checkbox";
        const cur = (a && a.c) || [];
        let opts = (it.options || []).map((o, i) => ({ o, i }));
        if (it.shuffle) opts = shuffle(opts, ctx.seed + n);
        const rows = opts.map(({ o }, k) => {
          const on = cur.includes(o.label);
          return `<li><label class="opt ${multi ? "multi" : ""} ${on ? "checked" : ""}">
            <input type="${multi ? "checkbox" : "radio"}" name="c_${n}" value="${esc(o.label)}" data-c="${n}" ${on ? "checked" : ""}>
            <span class="opt-letter">${multi ? icon("check", 18) : letter(k)}</span><span class="opt-text">${esc(o.label)}</span></label></li>`;
        });
        const oOn = !!(a && a.o != null);
        if (it.other) rows.push(`<li><label class="opt ${multi ? "multi" : ""} ${oOn ? "checked" : ""}">
            <input type="${multi ? "checkbox" : "radio"}" name="c_${n}" value="__other" data-c="${n}" ${oOn ? "checked" : ""}>
            <span class="opt-letter">${multi ? icon("check", 18) : letter(opts.length)}</span><span class="opt-text">${S.OTHER}</span></label></li>`);
        body = `<ul class="opts" role="${multi ? "group" : "radiogroup"}" aria-labelledby="t_${n}">${rows.join("")}</ul>
          ${it.other ? `<div class="extra ${oOn ? "open" : ""}" data-other="${n}"><div><div class="extra-in">
            <input class="input" data-o="${n}" placeholder="اكتب إجابتك" value="${esc((a && a.o) || "")}" aria-label="إجابة أخرى"></div></div></div>` : ""}`;
        break;
      }
      case "dropdown": {
        const cur = ((a && a.c) || [])[0] || "";
        let opts = it.options || [];
        if (it.shuffle) opts = shuffle(opts, ctx.seed + n);
        body = `<div class="select-wrap"><select class="input select answer" data-a="${n}" aria-labelledby="t_${n}">
          <option value="">اختر</option>${opts.map((o) => `<option ${o.label === cur ? "selected" : ""}>${esc(o.label)}</option>`).join("")}</select>${icon("caret", 18)}</div>`;
        break;
      }
      case "scale": {
        const sc = it.scale || {}, lo = sc.min == null ? 1 : +sc.min, hi = +sc.max || 5, cur = a == null ? "" : String(a);
        let cells = "";
        for (let v = lo; v <= hi; v++) cells += `<label class="${cur === String(v) ? "checked" : ""}"><input type="radio" name="s_${n}" value="${v}" data-s="${n}" ${cur === String(v) ? "checked" : ""}><span>${toAr(v)}</span></label>`;
        body = `<div class="scale" role="radiogroup" aria-labelledby="t_${n}" style="--n:${hi - lo + 1}">
          ${sc.minLabel ? `<span class="scale-end">${esc(sc.minLabel)}</span>` : ""}<div class="scale-cells">${cells}</div>${sc.maxLabel ? `<span class="scale-end">${esc(sc.maxLabel)}</span>` : ""}</div>`;
        break;
      }
      case "rating": {
        const max = (it.rating && it.rating.max) || 5, cur = Number(a) || 0;
        let stars = "";
        for (let v = 1; v <= max; v++) stars += `<label class="${v <= cur ? "on" : ""}" title="${toAr(v)}"><input type="radio" name="r_${n}" value="${v}" data-r="${n}" ${v === cur ? "checked" : ""} aria-label="${toAr(v)} من ${toAr(max)}">${icon("star", 34)}</label>`;
        body = `<div class="rating" role="radiogroup" aria-labelledby="t_${n}" data-rating="${n}">${stars}<span class="rating-val">${cur ? toAr(cur) + " من " + toAr(max) : ""}</span></div>`;
        break;
      }
      case "grid": case "checkgrid": {
        const multi = it.type === "checkgrid";
        let rows = it.rows || [];
        if (it.shuffle) rows = shuffle(rows, ctx.seed + n);
        body = `<div class="grid-q">${rows.map((r) => {
          const cur = [].concat((a && a[r.id]) || []);
          return `<div class="grid-row"><div class="grid-label" id="gl_${n}_${r.id}">${esc(r.label)}</div>
            <div class="seg" role="${multi ? "group" : "radiogroup"}" aria-labelledby="gl_${n}_${r.id}">${(it.cols || []).map((c) => {
              const on = cur.includes(c.label);
              return `<label class="${on ? "checked" : ""}"><input type="${multi ? "checkbox" : "radio"}" name="g_${n}_${r.id}" value="${esc(c.label)}" data-g="${n}" data-row="${r.id}" ${on ? "checked" : ""}>${esc(c.label)}</label>`;
            }).join("")}</div></div>`;
        }).join("")}</div>`;
        break;
      }
      case "date": {
        const [d, t] = String(a || "").split(" ");
        body = `<div class="grid grid-2 dt">
          <input class="input" type="date" data-d="${n}" value="${esc(d || "")}" aria-labelledby="t_${n}">
          ${it.date && it.date.time ? `<input class="input" type="time" data-dt="${n}" value="${esc(t || "")}" aria-label="الوقت">` : ""}</div>`;
        break;
      }
      case "time": {
        if (it.time && it.time.duration) {
          const [h, m, s] = String(a || "").split(":");
          body = `<div class="duration" aria-labelledby="t_${n}">
            ${[["h", "ساعات", h], ["m", "دقائق", m], ["s", "ثوان", s]].map(([k, l, v]) => `<label class="field"><span class="hint">${l}</span><input class="input" type="number" min="0" ${k !== "h" ? 'max="59"' : ""} inputmode="numeric" data-du="${n}" data-part="${k}" value="${esc(v ? +v : "")}"></label>`).join("")}</div>`;
        } else body = `<input class="input time-in" type="time" data-a="${n}" value="${esc(a || "")}" aria-labelledby="t_${n}">`;
        break;
      }
      case "file": {
        const f = it.file || {}, max = f.maxFiles || 1, mb = Math.min(f.maxMB || 10, (window.GHERAS_CONFIG || {}).MAX_FILE_MB || 10);
        const kinds = (f.kinds || []).map((k) => S.FILE_KINDS[k] && S.FILE_KINDS[k].label).filter(Boolean);
        const allow = S.allowedExt(it);
        body = `<label class="drop" data-drop="${n}">
            ${icon("upload", 26)}
            <span>اسحب الملف هنا أو اضغط للاختيار</span>
            <small>${max > 1 ? "حتى " + toAr(max) + " ملفات، " : ""}${toAr(mb)} م.ب للملف${kinds.length ? " — " + kinds.join("، ") : ""}</small>
            <input type="file" ${max > 1 ? "multiple" : ""} hidden data-file="${n}" ${allow ? `accept="${allow.map((e) => "." + e).join(",")}"` : ""}>
          </label>
          <ul class="files" data-files="${n}">${filesHTML(n, ctx.uploaded || [], ctx.files || [])}</ul>`;
        break;
      }
    }
    const pts = ctx.points && it.quiz && it.quiz.points ? `<span class="pts">${toAr(it.quiz.points)} ${it.quiz.points == 1 ? "درجة" : it.quiz.points == 2 ? "درجتان" : "درجات"}</span>` : "";
    return `<section class="q" id="q_${n}" data-q="${n}">
      <div class="q-head">${ctx.num ? `<span class="q-num">${toAr(ctx.num)}</span>` : ""}<h3 class="q-text" id="t_${n}">${esc(it.title || "سؤال بلا عنوان")}${it.required ? '<span class="req" aria-label="مطلوب">*</span>' : ""}</h3>${pts}</div>
      ${it.description ? `<p class="q-note">${esc(it.description)}</p>` : ""}
      <div class="q-body">${body}</div>
      <p class="q-err" id="e_${n}" role="alert"></p>
    </section>`;
  }

  function filesHTML(id, uploaded, pending) {
    const row = (name, size, k, idx) => `<li>${icon("file", 18)}<span class="fname">${esc(name)}</span>${size != null ? `<span class="fsize">${toAr((size / 1048576).toFixed(1))} م.ب</span>` : `<span class="fsize">مرفوع</span>`}
      <button type="button" data-rmfile="${id}" data-kind="${k}" data-idx="${idx}" aria-label="إزالة الملف">×</button></li>`;
    return uploaded.map((f, i) => row(f.name, null, "up", i)).join("") + pending.map((f, i) => row(f.name, f.size, "new", i)).join("");
  }

  // ——— الملخصات (أشرطة أفقية، وجدول للشبكة، وقائمة للنصوص) ———
  function pct(n, total) { return total ? Math.round((n / total) * 100) : 0; }
  function bars(counts, total) {
    const max = Math.max(1, ...counts.map((c) => c.n));
    return `<ul class="bars">${counts.map((c) => `<li>
      <span class="bar-label">${esc(/^\d+$/.test(c.label) ? toAr(c.label) : c.label)}</span>
      <span class="bar-track"><span class="bar-fill" style="width:${(c.n / max) * 100}%"></span></span>
      <span class="bar-num">${toAr(c.n)} <small>${toAr(pct(c.n, total))}٪</small></span></li>`).join("")}</ul>`;
  }
  function summaryHTML(aggs, opts = {}) {
    if (!aggs.length) return `<div class="empty">${icon("chart", 34)}<p>لا توجد أسئلة لعرض ملخصها</p></div>`;
    return aggs.map((g) => {
      let body = "";
      if (!g.n) body = `<p class="hint">لا توجد إجابات بعد</p>`;
      else if (g.counts && (g.type === "scale" || g.type === "rating")) {
        body = `<div class="avg"><span class="avg-num">${toAr(g.avg.toFixed(1))}</span><span class="hint">المتوسط من ${toAr(g.counts[g.counts.length - 1].label)}</span></div>${bars(g.counts, g.n)}`;
      } else if (g.counts) {
        body = bars(g.counts, g.n);
        if (g.others && g.others.length && !opts.publicView) body += `<details class="others"><summary>إجابات (أخرى) ${toAr(g.others.length)}</summary><ul class="texts">${g.others.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></details>`;
      } else if (g.rows) {
        const max = Math.max(1, ...g.rows.map((r) => Math.max(...r.counts)));
        body = `<div class="heat-wrap"><table class="heat"><thead><tr><th></th>${g.cols.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${g.rows.map((r) => `<tr><th>${esc(r.label)}</th>${r.counts.map((n) => `<td style="--h:${(n / max).toFixed(2)}"><span>${toAr(n)}</span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
      } else if (g.files) {
        body = `<ul class="texts">${g.files.map((f) => `<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${icon("file", 16)} ${esc(f.name)}</a></li>`).join("")}</ul>`;
      } else if (g.texts) {
        const shown = g.texts.slice(-60).reverse();
        body = `<ul class="texts">${shown.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>${g.texts.length > 60 ? `<p class="hint">أحدث ٦٠ إجابة من ${toAr(g.texts.length)}</p>` : ""}`;
      }
      return `<section class="card sum-card"><div class="sum-head"><h3>${esc(g.title || "سؤال بلا عنوان")}</h3><span class="chip">${toAr(g.n)} ${g.n === 1 ? "إجابة" : "إجابة"}</span></div>${body}</section>`;
    }).join("");
  }

  // ——— نافذة منبثقة ———
  function modal(html, { wide = false, onClose } = {}) {
    const wrap = document.createElement("div");
    wrap.className = "modal-back";
    wrap.innerHTML = `<div class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true">${html}</div>`;
    document.body.appendChild(wrap);
    const prevFocus = document.activeElement;
    const close = () => {
      wrap.classList.add("out");
      setTimeout(() => wrap.remove(), 220);
      document.removeEventListener("keydown", onKey);
      if (prevFocus && prevFocus.focus) prevFocus.focus({ preventScroll: true });
      if (onClose) onClose();
    };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => { if (e.target === wrap || e.target.closest("[data-close]")) close(); });
    requestAnimationFrame(() => { wrap.classList.add("in"); const f = wrap.querySelector("[autofocus], input, button:not([data-close])"); if (f) f.focus({ preventScroll: true }); });
    return { el: wrap.firstElementChild, close };
  }
  function confirmBox(title, text, okLabel = "تأكيد", danger = false) {
    return new Promise((resolve) => {
      let done = false;
      const m = modal(`<h2 class="modal-title">${esc(title)}</h2><p class="modal-text">${esc(text)}</p>
        <div class="modal-actions"><button class="btn btn-ghost" data-close>إلغاء</button><button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${esc(okLabel)}</button></div>`,
        { onClose: () => { if (!done) resolve(false); } });
      m.el.querySelector("[data-ok]").addEventListener("click", () => { done = true; resolve(true); m.close(); });
    });
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const t = document.createElement("textarea");
      t.value = text; t.style.position = "fixed"; t.style.opacity = "0";
      document.body.appendChild(t); t.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      t.remove(); return ok;
    }
  }

  // رابط الاستبانة: /s/المعرف على الموقع المنشور، و form.html?s= عند التجربة محليا
  function formUrl(id, extra = "") {
    const local = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === "file:";
    return location.origin + (local ? "/form.html?s=" + encodeURIComponent(id) + (extra ? "&" + extra : "") : "/s/" + encodeURIComponent(id) + (extra ? "?" + extra : ""));
  }

  function fmtDate(iso, withTime) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d)) return "";
    try {
      return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-arab", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(d);
    } catch (e) { return toAr(d.toISOString().slice(0, 10)); }
  }

  window.GUI = { esc, toAr, icon, TYPE_ICON, letter, mediaSrc, youtubeId, downloadUrl, shuffle, itemHTML, filesHTML, summaryHTML, bars, modal, confirmBox, copy, formUrl, fmtDate };
})();
