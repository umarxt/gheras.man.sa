/* جوال أبو سعد ضايع — جمعية غراس لتنمية الطفل
   المحتوى كله في content.json */
"use strict";

const $ = (s, r = document) => r.querySelector(s);
const ar = n => String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];
const nowAt = () => new Date().toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit", hour12: true })
  .replace("ص", "ص").replace(/\s+/g, " ").trim();

let C = null;           // المحتوى
let S = null;           // حالة الزائر (محفوظة)
const SKEY = "gheras-phone-v1";
const live = { typing: {}, ctx: { app: null, chat: null }, timer: null, callOn: false, origin: null };

/* ================= أيقونات ================= */
const P = {
  phone: "M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z",
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
};
const sv = (inner, vb = "0 0 24 24", extra = "") => `<svg viewBox="${vb}" ${extra}>${inner}</svg>`;
const stroke = (d, c = "#fff", w = 2) => `<svg viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const chev = `<svg class="chev" viewBox="0 0 8 14"><path d="M7 1 1 7l6 6"/></svg>`;
const backBtn = (label = "", color) => `<button class="back" data-back ${color ? `style="color:${color}"` : ""}><svg viewBox="0 0 12 20"><path d="M2 2l8 8-8 8"/></svg>${label}</button>`;
const searchBox = (ph = "بحث", id = "") => `<div class="sbox">${sv(P.search)}<input ${id ? `id="${id}"` : ""} placeholder="${ph}" aria-label="${ph}"></div>`;
const phoneSvg = (fill = "#fff", s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="${fill}"><path d="${P.phone}"/></svg>`;

const I = {
  msg: s => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path fill="#fff" d="M12 3C6.5 3 2 6.6 2 11.1c0 2.6 1.5 4.9 3.8 6.4-.2 1.3-.8 2.5-1.8 3.4 1.9 0 3.6-.7 4.9-1.8 1 .3 2 .4 3.1.4 5.5 0 10-3.6 10-8.1S17.5 3 12 3z"/></svg>`,
  wa: s => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path fill="#fff" d="M12 2.5A9.4 9.4 0 0 0 3.9 16.7L2.6 21.4l4.8-1.3A9.4 9.4 0 1 0 12 2.5z"/><path fill="#25D366" d="M16.7 14.2c-.3-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1-.8-.3-2.1-1-3.1-2.6-.2-.3.2-.3.6-1 .1-.1 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.6.3-.2.2-.8.8-.8 2s.9 2.3 1 2.5c.1.2 1.7 2.6 4.1 3.6 1.5.7 2.1.7 2.9.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2 0-.1-.2-.2-.4-.3z"/></svg>`,
  mail: s => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path fill="#fff" d="M2.5 6.2C2.5 5 3.4 4 4.6 4h14.8c1.2 0 2.1 1 2.1 2.2v11.6c0 1.2-.9 2.2-2.1 2.2H4.6c-1.2 0-2.1-1-2.1-2.2zm2.1.3 7.4 6 7.4-6v-.3H4.6z"/></svg>`,
  notes: `<svg viewBox="0 0 62 62" width="62" height="62"><rect width="62" height="62" fill="#fff"/><rect width="62" height="17" fill="#F6C443"/><g stroke="#d8d8d8" stroke-width="1.4"><path d="M8 29h46M8 38h46M8 47h46"/></g></svg>`,
  photos: `<svg viewBox="0 0 62 62" width="62" height="62"><rect width="62" height="62" fill="#fff"/><g transform="translate(31 31)">${["#FF9500", "#FFCC00", "#34C759", "#00C7BE", "#007AFF", "#5856D6", "#AF52DE", "#FF2D55"].map((c, i) => `<ellipse rx="7" ry="12" cy="-10" fill="${c}" opacity=".85" transform="rotate(${i * 45})"/>`).join("")}</g></svg>`,
  safari: `<svg viewBox="0 0 62 62" width="62" height="62"><rect width="62" height="62" fill="#fff"/><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1AD6FD"/><stop offset="1" stop-color="#1D62F0"/></linearGradient></defs><circle cx="31" cy="31" r="24" fill="url(#sg)"/><g stroke="#fff" stroke-width="1" opacity=".7">${Array.from({ length: 24 }, (_, i) => `<path d="M31 9v3" transform="rotate(${i * 15} 31 31)"/>`).join("")}</g><path d="M42 20 34 34 20 42l8-14z" fill="#fff"/><path d="M42 20 34 34l-6-6z" fill="#FF3B30"/></svg>`,
  files: (w = 62, h = 62, bg = true) => `<svg viewBox="0 0 62 62" width="${w}" height="${h}">${bg ? '<rect width="62" height="62" fill="#fff"/>' : ""}<path d="M11 20c0-2 1.5-3.5 3.5-3.5h10l4 4h19c2 0 3.5 1.5 3.5 3.5v19c0 2-1.5 3.5-3.5 3.5h-33C12.5 46.5 11 45 11 43z" fill="#1F8FFF"/><path d="M11 25h40v18c0 2-1.5 3.5-3.5 3.5h-33C12.5 46.5 11 45 11 43z" fill="#45A6FF"/></svg>`,
  settings: `<svg viewBox="0 0 62 62" width="62" height="62"><defs><linearGradient id="gg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C6C6CB"/><stop offset="1" stop-color="#8E8E93"/></linearGradient></defs><rect width="62" height="62" fill="url(#gg)"/><g transform="translate(31 31)" fill="#3A3A3C">${Array.from({ length: 12 }, (_, i) => `<rect x="-2.6" y="-21" width="5.2" height="8" rx="1.5" transform="rotate(${i * 30})"/>`).join("")}<circle r="15"/></g><circle cx="31" cy="31" r="11" fill="#C7C7CC"/><circle cx="31" cy="31" r="5" fill="#3A3A3C"/></svg>`,
  camera: `<svg viewBox="0 0 62 62" width="62" height="62"><defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E5E5EA"/><stop offset="1" stop-color="#AEAEB2"/></linearGradient></defs><rect width="62" height="62" fill="url(#cg)"/><rect x="9" y="19" width="44" height="28" rx="6" fill="#1C1C1E"/><circle cx="31" cy="33" r="9.5" fill="#3A3A3C" stroke="#8E8E93" stroke-width="2"/><circle cx="31" cy="33" r="4.5" fill="#1a3350"/><circle cx="46" cy="24" r="2" fill="#FFD60A"/></svg>`,
  clock: `<svg viewBox="0 0 62 62" width="62" height="62"><rect width="62" height="62" fill="#000"/><circle cx="31" cy="31" r="25" fill="#fff"/><g stroke="#000" stroke-width="1.6">${Array.from({ length: 12 }, (_, i) => `<path d="M31 8.5v3.5" transform="rotate(${i * 30} 31 31)"/>`).join("")}</g><path class="hh" d="M31 31V19" stroke="#000" stroke-width="2.8" stroke-linecap="round"/><path class="mm" d="M31 31V12" stroke="#000" stroke-width="2" stroke-linecap="round"/><circle cx="31" cy="31" r="2.2" fill="#FF9500"/></svg>`,
  weather: `<svg viewBox="0 0 62 62" width="62" height="62"><defs><linearGradient id="wg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3D8BFF"/><stop offset="1" stop-color="#7BB8FF"/></linearGradient></defs><rect width="62" height="62" fill="url(#wg)"/><circle cx="38" cy="24" r="9" fill="#FFD60A"/><path d="M19 44c-4.4 0-7-2.8-7-6.2 0-3.5 2.7-6 6.2-6 .9-4 4.3-6.8 8.6-6.8 4.7 0 8.4 3.4 8.8 8 3.2.2 5.4 2.6 5.4 5.5 0 3-2.4 5.5-5.6 5.5z" fill="#fff"/></svg>`,
  gh: `<div style="width:62px;height:62px;background:#fff;display:grid;place-items:center"><img src="assets/mark.png" style="height:46px" alt=""></div>`,
  cal: () => `<div style="width:62px;height:62px;background:#fff;color:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.2"><span style="color:#FF3B30;font-size:10px;font-weight:700">${DAYN}</span><span style="font-family:var(--serif);font-size:27px;font-weight:700;line-height:1.25">${DNUM}</span></div>`
};
const G = { // رموز الإعدادات
  plane: '<path d="M10.5 3.5a1.5 1.5 0 0 1 3 0V9l7 4.5V15l-7-2v5l2 1.5V21L12 20l-3.5 1v-1.5l2-1.5v-5l-7 2v-1.5l7-4.5z" fill="#fff" stroke="none"/>',
  wifi: '<path d="M2 9a15 15 0 0 1 20 0M5.5 12.5a10 10 0 0 1 13 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="19.2" r="1" fill="#fff"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" fill="#fff" stroke="none"/>',
  batt: '<rect x="3" y="7" width="16" height="10" rx="2.5"/><path d="M22 10.5v3"/><path d="M6 10v4" stroke-width="2.6"/>',
  scale: '<path d="M12 4v16M7 20h10M5 7h14M5 7l-2.5 6a2.5 2.5 0 0 0 5 0zM19 7l-2.5 6a2.5 2.5 0 0 0 5 0z"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  find: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="#fff"/>',
  bt: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
  cell: '<path d="M5 18v-3M9.5 18v-6M14 18V9M18.5 18V5"/>',
  hot: '<circle cx="12" cy="12" r="2"/><path d="M8 16a6 6 0 0 1 0-8M16 8a6 6 0 0 1 0 8M5 19a10 10 0 0 1 0-14M19 5a10 10 0 0 1 0 14"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  ctrl: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6 19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
  flower: '<circle cx="12" cy="12" r="2.5"/><path d="M12 3a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM12 15a3 3 0 0 1 0 6 3 3 0 0 1 0-6zM3 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0zM15 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0z"/>',
  siri: '<circle cx="12" cy="12" r="8"/><path d="M6 12c2-4 4 4 6 0s4 4 6 0"/>',
  sound: '<path d="M4 9h4l5-4v14l-5-4H4zM17 9a4 4 0 0 1 0 6"/>',
  hour: '<path d="M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9"/>',
  face: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M9 9v1M15 9v1M12 9v4h-1M9 16a4 4 0 0 0 6 0"/>',
  sos: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  hand: '<path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v8a7 7 0 0 1-7 7 6 6 0 0 1-5-3l-2-4a1.5 1.5 0 0 1 2.5-1.5L8 15"/>',
  chat: '<path d="M4 19l1.5-4A7.5 7.5 0 1 1 9 18.5z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'
};

/* ================= التاريخ ================= */
const TODAY = new Date();
const DAYN = TODAY.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "long" });
const DNUM = ar(TODAY.getDate());

function tick() {
  const now = new Date();
  const t = now.toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[صم]$/, "").trim();
  const lt = $("#lkTime"); if (lt) lt.textContent = t;
  $("#sbClock").textContent = t;
  const ld = $("#lkDate");
  if (ld) {
    let g = now.toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", day: "numeric", month: "long" });
    let h = ""; try { h = now.toLocaleDateString("ar-SA-u-ca-islamic-umalqura-nu-arab", { day: "numeric", month: "long" }); } catch (e) { }
    ld.textContent = g + (h ? " · " + h : "");
  }
  document.querySelectorAll(".hh").forEach(e => e.setAttribute("transform", `rotate(${(now.getHours() % 12) * 30 + now.getMinutes() / 2} 31 31)`));
  document.querySelectorAll(".mm").forEach(e => e.setAttribute("transform", `rotate(${now.getMinutes() * 6} 31 31)`));
}

/* ================= الحالة ================= */
function loadState() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(SKEY)); } catch (e) { }
  if (!s || s.v !== 3) s = { v: 3, seed: (Math.random() * 4294967296) >>> 0, visits: 0, seenArcs: {}, run: [], woke: [], extra: {}, read: {}, mailRead: {}, mailsExtra: [], callsExtra: [], callsSeen: 0, cal: [], checks: {}, smsExtra: {}, smsRead: {} };
  ["seenArcs", "smsExtra", "smsRead"].forEach(k => s[k] ||= {}); ["run", "woke"].forEach(k => s[k] ||= []);
  s.visits++;
  return s;
}
let saveT = 0;
function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(SKEY, JSON.stringify(S)); } catch (e) { } }, 200); }

/* ================= النموذج ================= */
const chatById = id => C.chats.find(c => c.id === id);
const msgsOf = c => (c.history || []).concat(S.extra[c.id] || []);
function readIdx(c) {
  if (S.read[c.id] != null) return S.read[c.id];
  const h = c.history || []; let n = c.unread || 0, i = h.length;
  while (i > 0 && n > 0) { i--; if (isIncoming(h[i])) n--; }
  return i;
}
const isIncoming = m => m && (m.t || m.k) && !m.me && !m.sys && !m.d;
function unreadOf(c) { const ms = msgsOf(c); let n = 0; for (let i = readIdx(c); i < ms.length; i++) if (isIncoming(ms[i])) n++; return n; }
function markRead(c) { S.read[c.id] = msgsOf(c).length; save(); }
const waUnread = () => C.chats.reduce((a, c) => a + unreadOf(c), 0);
function lastMsg(c) { const ms = msgsOf(c); for (let i = ms.length - 1; i >= 0; i--) if (ms[i].t || ms[i].card || ms[i].k) return ms[i]; return null; }
function msgPreview(m) {
  if (!m) return "";
  if (m.card) return "📇 جهة اتصال: " + C.config.firm;
  if (m.k === "voice") return "🎤 رسالة صوتية (" + (m.dur || "٠:١٢") + ")";
  if (m.k === "img") return "📷 " + (m.t || "صورة");
  if (m.k === "doc") return "📄 " + (m.n || "مستند");
  if (m.k === "loc") return "📍 " + (m.t || "موقع");
  if (m.k === "del") return "🚫 تم حذف هذه الرسالة";
  return m.t || "";
}
/* الرسائل النصية (SMS) */
const smsById = id => C.sms.find(t => t.id === id);
const smsMsgs = t => (t.history || []).concat(S.smsExtra[t.id] || []);
function smsReadIdx(t) {
  if (S.smsRead[t.id] != null) return S.smsRead[t.id];
  const h = t.history || []; let n = t.unread || 0, i = h.length;
  while (i > 0 && n > 0) { i--; if (isIncoming(h[i])) n--; }
  return i;
}
function smsUnreadOf(t) { const ms = smsMsgs(t); let n = 0; for (let i = smsReadIdx(t); i < ms.length; i++) if (isIncoming(ms[i])) n++; return n; }
const smsUnread = () => C.sms.reduce((a, t) => a + smsUnreadOf(t), 0);
function smsLastTs(t) { const ex = S.smsExtra[t.id]; return ex && ex.length ? ex[ex.length - 1].ts : (t.rank || 0); }
function lastTs(c) { const ex = S.extra[c.id]; return ex && ex.length ? ex[ex.length - 1].ts : (c.rank || 0); }
function memberName(c, m) { return c.members && m.m && c.members[m.m] ? c.members[m.m].n : ""; }
const allMails = () => S.mailsExtra.concat(C.mails);
const mailUnread = () => allMails().filter(m => !m.read && !S.mailRead[m.id]).length;
const allCalls = () => S.callsExtra.concat(C.calls);
const missedNew = () => S.callsExtra.filter(c => c.miss && c.ts > S.callsSeen).length + (S.callsSeen ? 0 : C.calls.filter(c => c.miss).length);

/* ================= شاشة القفل ================= */
const moreLabel = n => !n ? "" : n === 1 ? "رسالة أخرى" : n === 2 ? "رسالتان أخريان" : n <= 10 ? `${ar(n)} رسائل أخرى` : `${ar(n)} رسالة أخرى`;
function lockNotifs() {
  const out = [];
  C.chats.forEach(c => {
    const u = unreadOf(c); if (!u) return;
    const ms = msgsOf(c); let m = null;
    for (let i = ms.length - 1; i >= 0; i--) if (isIncoming(ms[i])) { m = ms[i]; break; }
    const who = c.group ? memberName(c, m).split(" |")[0] : "";
    out.push({ ic: "wa", title: c.name, text: (who ? who + ": " : "") + msgPreview(m), more: moreLabel(u - 1), at: m.ts ? m.at : (m.at || c.time), ts: m.ts || c.rank || 0, go: ["wa", c.id], stack: u > 1 });
  });
  C.sms.forEach(t => {
    const u = smsUnreadOf(t); if (!u) return;
    const ms = smsMsgs(t); let m = null;
    for (let i = ms.length - 1; i >= 0; i--) if (isIncoming(ms[i])) { m = ms[i]; break; }
    out.push({ ic: "sms", title: t.name, text: m.t, more: moreLabel(u - 1), at: m.ts ? m.at : (m.at || t.time || ""), ts: m.ts || t.rank || 0, go: ["sms", t.id], stack: u > 1 });
  });
  allMails().filter(m => !m.read && !S.mailRead[m.id]).slice(0, 3).forEach((m, i) => out.push({ ic: "mail", title: m.from, text: m.s, at: m.ts ? m.at : m.time, ts: m.ts || -i, go: ["mail", m.id] }));
  const mc = missedNew();
  if (mc) {
    const names = [...new Set(S.callsExtra.filter(c => c.miss && c.ts > S.callsSeen).map(c => c.n).concat(S.callsSeen ? [] : C.calls.filter(c => c.miss).map(c => c.n)))];
    const latest = S.callsExtra.find(c => c.miss);
    out.push({ ic: "phone", title: "مكالمات فائتة", text: names.join(" · ") + (mc > 1 ? ` (${ar(mc)})` : ""), at: latest ? latest.at : "٥:٤٥ م", ts: latest ? latest.ts : 3, go: ["phone"] });
  }
  S.cal.forEach(n => out.push({ ic: n.ic || "cal", title: n.title, text: n.t, at: n.at, ts: n.ts, go: ["calendar"] }));
  out.sort((a, b) => b.ts - a.ts);
  out.push({ ic: "batt", title: "البطارية", text: `متبقٍ ${ar(live.batt)}٪ — وصّل الجوال بالشاحن (إذا لقيته 😅)`, at: "٦:٥٠ م", ts: -99 });
  return out;
}
function nIcon(k) {
  if (k === "wa") return `<span class="ic" style="background:linear-gradient(#5BE584,#1FB650)">${I.wa(26)}</span>`;
  if (k === "phone") return `<span class="ic" style="background:linear-gradient(#5BF675,#2BC94B)">${phoneSvg("#fff", 22)}</span>`;
  if (k === "alarm") return `<span class="ic" style="background:#1C1C1E">${stroke('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.6M4 5.5 7 3M20 5.5 17 3"/>', "#FF9F0A", 2.2)}</span>`;
  if (k === "sms") return `<span class="ic" style="background:linear-gradient(#6BF27A,#21C33A)">${I.msg(22)}</span>`;
  if (k === "mail") return `<span class="ic" style="background:linear-gradient(#3EB0FF,#1673F0)">${I.mail(24)}</span>`;
  if (k === "cal") return `<span class="ic" style="background:#fff;color:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.15"><small style="color:#FF3B30;font-size:7px;font-weight:700">${DAYN}</small><b style="font-size:17px;font-family:var(--serif)">${DNUM}</b></span>`;
  if (k === "batt") return `<span class="ic" style="background:#1C1C1E"><span class="batt" style="color:#fff"><i></i></span></span>`;
  return "";
}
const ntfHTML = (n, cls = "") => `<button class="ntf ${cls} ${n.stack ? "stack" : ""}" ${n.go ? `data-go='${JSON.stringify(n.go)}'` : ""}>
  ${nIcon(n.ic)}<span class="tx"><span class="hd"><span>${esc(n.title)}</span><time>${n.at || "الآن"}</time></span><p>${esc(n.text)}</p>${n.more ? `<span class="more">${n.more}</span>` : ""}</span></button>`;

function renderLock(newKey) {
  const L = $("#lock");
  if (!L.dataset.built) {
    L.dataset.built = 1;
    L.innerHTML = `
      <svg class="lk-lock" viewBox="0 0 14 18" fill="#fff"><path d="M2 8V5.5a5 5 0 0 1 10 0V8h.5A1.5 1.5 0 0 1 14 9.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 0 16.5v-7A1.5 1.5 0 0 1 1.5 8zm2 0h6V5.5a3 3 0 0 0-6 0z"/></svg>
      <div class="lk-date" id="lkDate"></div>
      <div class="lk-time" id="lkTime"></div>
      <div class="lost"><b>${esc(C.config.lostTitle)}</b><span>${esc(C.config.lostMsg)}</span>
        <a class="call" href="tel:${C.config.phone}">${phoneSvg()}اتصال</a></div>
      <div class="notifs" id="notifs"></div>
      <div class="lk-bottom">
        <button class="circ" id="torchBtn" aria-label="الكشاف"><svg viewBox="0 0 24 24"><path d="M8 2h8v4l-2 3v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V9L8 6zm3 9v3h2v-3z"/></svg></button>
        <span class="swipe">اسحب للأعلى للفتح</span>
        <button class="circ" data-app="camera" aria-label="الكاميرا"><svg viewBox="0 0 24 24"><path d="M9 4h6l1.6 2.2H20a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.2a2 2 0 0 1 2-2h3.4zm3 4.6a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6zm0 1.8a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5z"/></svg></button>
      </div>`;
    tick();
  }
  const ns = lockNotifs();
  $("#notifs").innerHTML = `<div class="nc-h"><span>مركز الإشعارات</span></div>` +
    ns.map((n, i) => ntfHTML(n, (newKey && n.go && JSON.stringify(n.go) === newKey) || !L.dataset.shown ? "new" : "")).join("");
  if (!L.dataset.shown) { L.dataset.shown = 1; [...$("#notifs").querySelectorAll(".ntf")].forEach((e, i) => e.style.animationDelay = (.15 + i * .07) + "s"); }
}

/* ================= الشاشة الرئيسية ================= */
const APPS = [
  { id: "sms", n: "الرسائل", bg: "linear-gradient(#6BF27A,#21C33A)", ic: () => I.msg(38), badge: () => smsUnread() },
  { id: "notes", n: "الملاحظات", ic: () => I.notes },
  { id: "calendar", n: "التقويم", ic: () => I.cal() },
  { id: "photos", n: "الصور", ic: () => I.photos },
  { id: "camera", n: "الكاميرا", ic: () => I.camera },
  { id: "files", n: "الملفات", ic: () => I.files() },
  { id: "settings", n: "الإعدادات", ic: () => I.settings },
  { id: "clock", n: "الساعة", ic: () => I.clock },
  { id: "weather", n: "الطقس", ic: () => I.weather },
  { id: "gh", n: "غراس", ic: () => I.gh }
];
const DOCK = [
  { id: "phone", n: "الهاتف", bg: "linear-gradient(#5BF675,#2BC94B)", ic: () => phoneSvg("#fff", 34), badge: () => missedNew() },
  { id: "wa", n: "واتساب", bg: "linear-gradient(#5BE584,#1FB650)", ic: () => I.wa(38), badge: () => waUnread() },
  { id: "safari", n: "سفاري", ic: () => I.safari },
  { id: "mail", n: "البريد", bg: "linear-gradient(#3EB0FF,#1673F0)", ic: () => I.mail(36), badge: () => mailUnread() }
];
function appIcon(a) {
  const b = a.badge ? a.badge() : 0;
  return `<button class="app-ic" data-app="${a.id}" aria-label="${a.n}">
    <span class="badge" data-badge="${a.id}" ${b ? "" : "hidden"}>${ar(b)}</span>
    <span class="ic" style="${a.bg ? `background:${a.bg}` : ""}">${a.ic()}</span><span class="lb">${a.n}</span></button>`;
}
function renderHome() {
  const next = C.events[1] || C.events[0];
  $("#home").innerHTML = `
    <div class="grid">
      <div class="wwrap"><button class="widget w-notes" data-app="notes" data-sub="${C.notes[0]?.id || ""}">
        <span class="top"><span>الملاحظات</span>${stroke('<path d="M12 17v5M8 3h8l-1 6 3 4H6l3-4z"/>', "#3a2a00", 2)}</span>
        <span class="bd"><b>${esc(C.notes[0]?.title)}</b>${esc((C.notes[0]?.items || C.notes[0]?.bullets || []).slice(0, 3).join("… "))}…</span>
      </button><span class="lb">الملاحظات</span></div>
      <div class="wwrap"><button class="widget w-cal" data-app="calendar">
        <div class="d">${DAYN}</div><div class="n">${DNUM}</div>
        ${C.events.slice(1, 3).map(e => `<div class="wev" style="border-color:${e.c}">${esc(e.t)}<small>${fmtH(e.h)}</small></div>`).join("")}
      </button><span class="lb">التقويم</span></div>
      ${APPS.map(appIcon).join("")}
    </div>
    <button class="search-pill" data-spot>${sv(P.search, "0 0 24 24", 'width="13" height="13" fill="none" stroke="#fff" stroke-width="2.6"')}بحث</button>
    <div class="dock">${DOCK.map(appIcon).join("")}</div>`;
  tick(); fitHome();
}
function updateBadges(bump) {
  APPS.concat(DOCK).forEach(a => {
    const el = document.querySelector(`[data-badge="${a.id}"]`); if (!el || !a.badge) return;
    const b = a.badge(); el.hidden = !b; el.textContent = ar(b);
    if (bump === a.id) { el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); }
  });
  const tb = $("#waTabBadge"); if (tb) { const u = C.chats.filter(c => unreadOf(c)).length; tb.hidden = !u; tb.textContent = ar(u); }
}
const fmtH = h => { const hh = Math.floor(h), mm = Math.round((h - hh) * 60); const t = `${ar(hh > 12 ? hh - 12 : hh)}:${ar(String(mm).padStart(2, "0"))}`; return t + (hh < 12 ? " ص" : " م"); };

/* ================= التنقّل ================= */
const appEl = $("#app");
let stack = [];
const locked = () => !$("#lock").classList.contains("gone");
function setStatusLight(on) { $("#status").classList.toggle("light", on); $("#homebar").classList.toggle("dark", on); }
/* انتقال فتح/إغلاق التطبيق مثل iOS: النافذة تكبر من الأيقونة نفسها وترجع لها */
function rectIn(el) {
  const sc = $("#screen"), sr = sc.getBoundingClientRect(), k = sr.width / sc.offsetWidth || 1, r = el.getBoundingClientRect();
  return { x: (r.left - sr.left) / k, y: (r.top - sr.top) / k, w: r.width / k, h: r.height / k };
}
function iconXform(id) {
  const el = document.querySelector(`#home [data-app="${id}"] .ic`);
  const W = appEl.offsetWidth, H = appEl.offsetHeight;
  const r = el && el.offsetWidth ? rectIn(el) : { x: W / 2 - 31, y: H / 2 - 31, w: 62, h: 62 };
  const s = r.w / W;
  return { t: `translate(${r.x + r.w / 2 - W * s / 2}px,${r.y + r.h / 2 - H * s / 2}px) scale(${s})`, br: Math.round(14 / s) + "px", o: `${r.x + r.w / 2}px ${r.y + r.h / 2}px` };
}
const SCREEN_R = () => innerWidth <= 500 ? "0px" : "50px";
function animApp(frames, opt) {
  if (live.anim) live.anim.cancel();
  appEl.style.transformOrigin = "0 0";
  live.anim = appEl.animate(frames, Object.assign({ fill: "none" }, opt));
  return live.anim;
}
function originOf(el) {
  const sc = $("#screen"), sr = sc.getBoundingClientRect(), k = sr.width / sc.offsetWidth;
  if (!el) return "50% 60%";
  const r = el.getBoundingClientRect();
  return `${(r.left + r.width / 2 - sr.left) / k}px ${(r.top + r.height / 2 - sr.top) / k}px`;
}
function openApp(id, sub, fromEl) {
  const r = R[id]; if (!r) return;
  closeSpot();
  if (locked()) { unlock(); setTimeout(() => openApp(id, sub, fromEl), 380); return; }
  const wasOpen = appEl.classList.contains("open") && !live.closing;
  live.closing = false;
  appEl.className = (r.light ? "light " : "") + "open";
  appEl.innerHTML = ""; stack = [];
  setStatusLight(!!r.light);
  live.ctx = { app: id, chat: null };
  const v = mkView(r.root(), r.cls);
  appEl.appendChild(v); stack.push(v);
  if (!wasOpen) {
    const x = iconXform(id); live.appId = id;
    $("#home").style.transformOrigin = x.o;
    animApp([{ transform: x.t, borderRadius: x.br, opacity: 0 }, { opacity: 1, offset: .3 }, { transform: "none", borderRadius: SCREEN_R(), opacity: 1 }],
      { duration: 520, easing: "cubic-bezier(.2,.85,.25,1)" });
  } else live.appId = id;
  $("#home").classList.add("behind");
  r.after && r.after(v);
  if (sub && r.sub) setTimeout(() => r.sub(sub), wasOpen ? 60 : 300);
}
function mkView(html, cls) {
  const v = document.createElement("div");
  v.className = "view" + (cls ? " " + cls : "");
  v.innerHTML = `<div class="sc">${html}</div>`;
  v.querySelectorAll("[data-pin]").forEach(x => v.appendChild(x));
  return v;
}
function push(html, cls, after) {
  const v = mkView(html, cls);
  v.classList.add("enter");
  appEl.appendChild(v);
  const prev = stack[stack.length - 1];
  stack.push(v);
  requestAnimationFrame(() => requestAnimationFrame(() => { v.classList.remove("enter"); prev && prev.classList.add("under"); }));
  after && after(v);
  return v;
}
function pop() {
  if (stack.length < 2) { goHome(); return; }
  const v = stack.pop(), prev = stack[stack.length - 1];
  v.classList.add("enter"); prev.classList.remove("under");
  setTimeout(() => v.remove(), 420);
  if (live.ctx.chat) { live.ctx.chat = null; refreshWAList(); refreshSmsList(); }
  if (prev.onShow) prev.onShow();
}
function goHome(fromT) {
  closeSpot();
  if (locked()) return;
  if (!appEl.classList.contains("open") || live.closing) return;
  live.closing = true;
  const x = iconXform(live.appId);
  $("#home").style.transformOrigin = x.o;
  const a = animApp([{ transform: fromT || "none", borderRadius: fromT ? "40px" : SCREEN_R(), opacity: 1 }, { opacity: 1, offset: .55 }, { transform: x.t, borderRadius: x.br, opacity: 0 }],
    { duration: 420, easing: "cubic-bezier(.3,.7,.2,1)" });
  a.onfinish = () => { if (live.closing) { appEl.classList.remove("open"); live.closing = false; } };
  setTimeout(() => { if (live.closing) { appEl.classList.remove("open"); live.closing = false; } }, 600);
  $("#home").classList.remove("behind");
  setStatusLight(false);
  live.ctx = { app: null, chat: null };
  updateBadges();
  setTimeout(() => { if (!appEl.classList.contains("open")) appEl.innerHTML = ""; }, 700);
}
function lockPhone() {
  $("#lock").classList.remove("gone");
  $("#status").classList.add("lockmode");
  renderLock();
}
function unlock() {
  if (!locked()) return;
  $("#lock").classList.add("gone");
  $("#status").classList.remove("lockmode");
  $("#torch").classList.remove("on");
  setTimeout(() => $("#home").classList.remove("behind"), 100);
  updateBadges();
}

/* ================= البانر ================= */
let bannerT = 0;
function banner(n) {
  const b = $("#banner");
  b.innerHTML = ntfHTML(n);
  b.classList.add("on");
  island();
  clearTimeout(bannerT);
  bannerT = setTimeout(() => b.classList.remove("on"), 5200);
}
function island() { const i = $("#island"); i.classList.add("wide"); setTimeout(() => i.classList.remove("wide"), 900); }
function vibrate() { try { navigator.vibrate && navigator.vibrate(40); } catch (e) { } }

/* ================= تخصيص كل جهاز ================= */
// عشوائية ثابتة لكل جهاز: نفس الجهاز يشوف نفس «عالمه»، وكل جهاز عالم مختلف
function h01(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
const dv = k => h01(S.seed + ":" + k);
const keepFor = (x, ns) => x.w == null || x.w >= 1 || dv(ns + x.id) < x.w || S.woke.includes(x.id);
function resolveThread(c, ns) {
  const o = Object.assign({}, c);
  if (c.tails && c.tails.length) {
    const t = c.tails[Math.floor(dv(ns + "t" + c.id) * c.tails.length)] || [];
    o.history = (c.history || []).concat(t);
    const lm = [...o.history].reverse().find(m => m.at); if (lm) o.time = lm.at;
  }
  if (Array.isArray(c.unread)) { const [a, b] = c.unread; o.unread = a + Math.floor(dv(ns + "u" + c.id) * (b - a + 1)); }
  return o;
}
function personalize() {
  C.allChats = C.chats; C.allSms = C.sms;
  C.chats = C.chats.filter(c => keepFor(c, "c")).map(c => resolveThread(c, "c"));
  C.sms = C.sms.filter(t => keepFor(t, "s")).map(t => resolveThread(t, "s"));
  // لا نغرق الزائر: غير المقروء يبدأ في عدد محدود من المحادثات، يختلف من جهاز لجهاز
  const capUnread = (list, ns, n) => [...list].sort((a, b) => dv(ns + a.id) - dv(ns + b.id)).slice(n).forEach(c => { c.unread = 0; });
  capUnread(C.chats.filter(c => c.id !== "team"), "cu", 3 + Math.floor(dv("cun") * 3));
  capUnread(C.sms, "su", 1 + Math.floor(dv("sun") * 2));
  C.mails = C.mails.filter(m => keepFor(m, "m"));
  C.mails.filter(m => !m.read).sort((a, b) => dv("mu" + a.id) - dv("mu" + b.id)).slice(3).forEach(m => { m.read = 1; });
  C.notes = C.notes.filter(n => n.pin || keepFor(n, "n"));
  C.calls = C.calls.filter(c => keepFor(c, "k"));
  C.photos = C.photos.filter(p => keepFor(p, "p")).sort((a, b) => dv("ps" + a.id) - dv("ps" + b.id));
  C.arcs = C.arcs.concat(C.drops.map(d => ({ id: d.id, w: d.w ?? .5, steps: [d] })));
  // تفاصيل صغيرة تتغيّر كل زيارة
  live.batt = 6 + Math.floor(Math.random() * 18);
}
// محادثة لم تكن في هذا الجهاز تظهر فجأة عند أول رسالة منها
function wake(id, kind) {
  const all = kind === "sms" ? C.allSms : C.allChats, cur = kind === "sms" ? C.sms : C.chats;
  if (cur.some(x => x.id === id)) return cur.find(x => x.id === id);
  const src = all.find(x => x.id === id); if (!src) return null;
  const o = resolveThread(src, kind === "sms" ? "s" : "c");
  cur.push(o); if (!S.woke.includes(id)) S.woke.push(id);
  (kind === "sms" ? S.smsRead : S.read)[id] = (o.history || []).length;
  return o;
}

/* ================= محرك القصص الحيّة ================= */
const arcById = id => C.arcs.find(a => a.id === id);
const stepKey = s => s.app === "wa" ? "wa:" + s.chat : s.app === "sms" ? "sms:" + s.thread : null;
function arcOk(a) {
  if (!a.steps || !a.steps.length) return false;
  if (a.min && S.visits < a.min) return false;
  if (a.when && a.when !== "any") { const h = new Date().getHours(), day = h >= 6 && h < 17; if ((a.when === "day") !== day) return false; }
  return a.steps.every(s => (s.app !== "wa" || C.allChats.some(c => c.id === s.chat)) && (s.app !== "sms" || C.allSms.some(t => t.id === s.thread)));
}
function arcWeight(a) {
  let w = a.w ?? 1;
  const seen = S.seenArcs[a.id] || 0;
  w *= seen ? .2 / seen : 3;                                    // الجديد أولاً، والمكرر نادر
  if (a.min) w *= 2;                                            // مفاجآت العائدين
  if (a.steps.some(s => s.app === "wa" && !chatById(s.chat))) w *= .6;  // محادثة جديدة تظهر
  if ((a.steps[0].app === "call" || a.steps[0].app === "alarm") && Date.now() - live.lastCall < 120000) w *= .05;
  return w;
}
function pickArc() {
  const running = new Set(S.run.map(r => r.id));
  const busy = new Set(S.run.flatMap(r => (arcById(r.id)?.steps || []).map(stepKey).filter(Boolean)));
  const pool = C.arcs.filter(a => !running.has(a.id) && arcOk(a) && !a.steps.some(s => busy.has(stepKey(s))));
  let tot = pool.reduce((t, a) => t + arcWeight(a), 0), x = Math.random() * tot;
  for (const a of pool) { x -= arcWeight(a); if (x <= 0) return a; }
  return pool[0] || null;
}
function schedule(sec) {
  clearTimeout(live.timer);
  live.timer = setTimeout(step, sec * 1000);
}
function step() {
  if (document.hidden || live.callOn || live.alarmOn) { schedule(4); return; }
  S.run = S.run.filter(r => { const a = arcById(r.id); return a && r.i < a.steps.length; });
  if (!S.run.length || (S.run.length < 2 && Math.random() < .4)) { const a = pickArc(); if (a) S.run.push({ id: a.id, i: 0 }); }
  const ready = S.run.filter(r => { const a = arcById(r.id).steps[r.i].app; return !((a === "call" || a === "alarm") && Date.now() - live.lastCall < 70000); });
  if (!ready.length) { schedule(S.run.length ? 8 : 30); return; }
  const r = pick(ready), a = arcById(r.id), d = a.steps[r.i++];
  if (d.app === "alarm") live.lastCall = Date.now();
  if (r.i >= a.steps.length) { S.run.splice(S.run.indexOf(r), 1); S.seenArcs[a.id] = (S.seenArcs[a.id] || 0) + 1; }
  save();
  deliver(d, a.id + "-" + Date.now().toString(36));
  const cf = C.config;
  schedule(rnd(cf.minGapSec || 13, cf.maxGapSec || 26) * (d.app === "call" ? 1.5 : 1));
}
function deliver(d, uid) {
  if (d.app === "wa") return deliverWA(d);
  if (d.app === "sms") return deliverSMS(d);
  if (d.app === "mail") return deliverMail(d, uid);
  if (d.app === "call") return incomingCall(d);
  if (d.app === "cal") return deliverCal(d);
  if (d.app === "alarm") return deliverAlarm(d);
}
const MSG_FIELDS = ["t", "m", "k", "e", "c", "dur", "n", "sz", "re", "sys"];
function msgFrom(d) { const m = { at: nowAt(), ts: Date.now() }; MSG_FIELDS.forEach(f => { if (d[f] != null) m[f] = d[f]; }); return m; }
function deliverWA(d) {
  const c = chatById(d.chat) || wake(d.chat, "wa"); if (!c) return;
  const viewing = live.ctx.app === "wa" && live.ctx.chat === c.id && !locked();
  const inWA = live.ctx.app === "wa" && !locked();
  if (!d.sys) { live.typing[c.id] = d.m || true; refreshWAList(); if (viewing) showTyping(c); }
  const delay = inWA && !d.sys ? rnd(1600, 2600) * (d.k === "voice" ? 1.4 : 1) : 0;
  setTimeout(() => {
    delete live.typing[c.id];
    const msg = msgFrom(d);
    (S.extra[c.id] ||= []).push(msg);
    if (S.extra[c.id].length > 80) S.extra[c.id].splice(0, S.extra[c.id].length - 80);
    const stillViewing = live.ctx.app === "wa" && live.ctx.chat === c.id && !locked();
    if (stillViewing) { hideTyping(); appendBubble(c, msg, true); markRead(c); }
    else if (!d.sys) {
      const who = c.group ? memberName(c, msg).split(" |")[0] : "";
      const n = { ic: "wa", title: c.name, text: (who ? who + ": " : "") + msgPreview(msg), at: "الآن", go: ["wa", c.id] };
      if (!locked() && (live.ctx.app !== "wa" || live.ctx.chat)) banner(n);
      vibrate();
    }
    save(); refreshWAList(c.id); updateBadges("wa"); if (locked()) renderLock(JSON.stringify(["wa", c.id]));
  }, delay);
}
function deliverSMS(d) {
  const t = smsById(d.thread) || wake(d.thread, "sms"); if (!t) return;
  const msg = { t: d.t, at: nowAt(), ts: Date.now() };
  (S.smsExtra[t.id] ||= []).push(msg);
  if (S.smsExtra[t.id].length > 40) S.smsExtra[t.id].splice(0, S.smsExtra[t.id].length - 40);
  const viewing = live.ctx.app === "sms" && live.ctx.chat === t.id && !locked();
  if (viewing) { appendSms(t, msg, true); S.smsRead[t.id] = smsMsgs(t).length; }
  else {
    const n = { ic: "sms", title: t.name, text: d.t, at: "الآن", go: ["sms", t.id] };
    if (!locked()) banner(n);
    vibrate();
  }
  save(); refreshSmsList(); updateBadges("sms"); if (locked()) renderLock(JSON.stringify(["sms", t.id]));
}
function deliverMail(d, uid) {
  const m = Object.assign({}, d.mail, { id: uid || d.id, ts: Date.now(), at: nowAt(), time: nowAt() });
  S.mailsExtra.unshift(m); if (S.mailsExtra.length > 30) S.mailsExtra.pop(); save();
  const n = { ic: "mail", title: m.from, text: m.s, at: "الآن", go: ["mail", m.id] };
  if (locked()) renderLock(JSON.stringify(n.go)); else if (live.ctx.app !== "mail") banner(n);
  if (live.ctx.app === "mail" && stack.length === 1) { stack[0].querySelector(".sc").innerHTML = R.mail.root(); }
  updateBadges("mail");
}
function deliverCal(d) {
  const n = { title: d.title, t: d.t, at: nowAt(), ts: Date.now() };
  S.cal.unshift(n); S.cal = S.cal.slice(0, 3); save();
  const nn = { ic: "cal", title: d.title, text: d.t, at: "الآن", go: ["calendar"] };
  if (locked()) renderLock(JSON.stringify(nn.go)); else banner(nn);
}

/* ================= المنبّه ================= */
let actx = null;
function alarmTone(on) {
  try {
    if (!on) { if (live.tone) { clearInterval(live.tone); live.tone = 0; } return; }
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const ring = () => [0, .18, .36].forEach((t, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), at = actx.currentTime + t;
      o.type = "sine"; o.frequency.value = [880, 1175, 988][i];
      g.gain.setValueAtTime(0, at); g.gain.linearRampToValueAtTime(.08, at + .02); g.gain.exponentialRampToValueAtTime(.001, at + .3);
      o.connect(g).connect(actx.destination); o.start(at); o.stop(at + .32);
    });
    ring(); live.tone = setInterval(ring, 1400);
  } catch (e) { }
}
function deliverAlarm(d) {
  if (live.callOn || live.alarmOn) { setTimeout(() => deliverAlarm(d), 8000); return; }
  live.alarmOn = true;
  const el = $("#alarm"), now = new Date();
  const tm = now.toLocaleTimeString("ar-SA-u-nu-arab", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?[صم]$/, "").trim();
  el.innerHTML = `<div><div class="al-ic">${stroke('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.6M4 5.5 7 3M20 5.5 17 3"/>', "#FF9F0A", 2)}</div>
    <div class="al-k">${d.snoozed ? "غفوة" : "منبّه"}</div><div class="al-t">${tm}</div>
    <div class="al-l">${esc(d.title)}</div>${d.t ? `<div class="al-s">${esc(d.t)}</div>` : ""}</div>
    <div class="al-b">${d.snoozed ? "" : `<button class="snz" data-alarm="snooze">غفوة</button>`}<button class="stp" data-alarm="stop">إيقاف</button></div>`;
  el.classList.add("on"); el._d = d;
  vibrate(); alarmTone(true);
  (S.alarms ||= []).unshift({ title: d.title, at: nowAt(), ts: Date.now() }); S.alarms = S.alarms.slice(0, 6); save();
  el._t = setTimeout(() => stopAlarm(true), 30000);
}
function stopAlarm(missed, snooze) {
  const el = $("#alarm"); if (!el.classList.contains("on")) return;
  clearTimeout(el._t); alarmTone(false); el.classList.remove("on"); live.alarmOn = false;
  const d = el._d;
  if (snooze) { banner({ ic: "alarm", title: "غفوة", text: d.title + " · يرن مرة ثانية بعد ٩ دقائق", at: "الآن" }); setTimeout(() => deliverAlarm(Object.assign({}, d, { snoozed: 1 })), 60000); }
  else if (missed) {
    S.cal.unshift({ title: "منبّه: " + d.title, t: "فاتك المنبّه", at: nowAt(), ts: Date.now(), ic: "alarm" }); S.cal = S.cal.slice(0, 3); save();
    if (locked()) renderLock(); else banner({ ic: "alarm", title: "منبّه فائت", text: d.title, at: "الآن", go: ["clock"] });
  }
  if (live.ctx.app === "clock" && stack.length === 1) stack[0].querySelector(".sc").innerHTML = R.clock.root();
}

/* ================= المكالمات ================= */
live.lastCall = 0;
function incomingCall(d) {
  if (live.callOn) return;
  live.callOn = true; live.lastCall = Date.now();
  const c = d.call, el = $("#call");
  const ch = C.chats.find(x => x.name === c.n); const init = ch?.init || (c.n.replace(/^ال/, "").match(/[؀-ۿA-Za-z]/) || ["؟"])[0];
  el.innerHTML = `
    <div class="cav" style="${ch?.av && ch.av !== "gh" ? `background:${ch.av}` : ""}">${init}</div><div class="cn">${esc(c.n)}</div><div class="ck">${esc(c.k || "جوال")}</div>
    <div class="caps" id="caps"></div>
    <div class="acts" id="callActs">
      <button class="round dec" data-call="dec"><span>${phoneSvg("#fff", 32)}</span>رفض</button>
      <button class="round acc" data-call="acc"><span>${phoneSvg("#fff", 32)}</span>رد</button>
    </div>`;
  el.classList.add("on"); el._d = d; vibrate();
  el._t = setTimeout(() => endCall(true), 14000);
}
function answerCall() {
  const el = $("#call"), c = el._d.call;
  clearTimeout(el._t);
  let sec = 0; const ck = $(".ck", el);
  el._clock = setInterval(() => { sec++; ck.textContent = ar(`${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`); }, 1000);
  ck.textContent = "٠٠:٠٠";
  $("#callActs").outerHTML = `
    <div class="grid3">
      ${[["كتم", '<path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM6 11a6 6 0 0 0 12 0h2a8 8 0 0 1-7 7.9V22h-2v-3.1A8 8 0 0 1 4 11z"/>'], ["لوحة المفاتيح", '<circle cx="6" cy="5" r="2"/><circle cx="12" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="6" cy="11" r="2"/><circle cx="12" cy="11" r="2"/><circle cx="18" cy="11" r="2"/><circle cx="6" cy="17" r="2"/><circle cx="12" cy="17" r="2"/><circle cx="18" cy="17" r="2"/>'], ["مكبر الصوت", '<path d="M3 9h4l5-4v14l-5-4H3zM16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" stroke="#fff" stroke-width="1.6" fill="none"/><path d="M3 9h4l5-4v14l-5-4H3z"/>']]
        .map(([l, p]) => `<button class="cb" data-cb><span><svg viewBox="0 0 24 24">${p}</svg></span>${l}</button>`).join("")}
    </div>
    <div class="acts"><button class="round dec" data-call="end"><span>${phoneSvg("#fff", 32)}</span>إنهاء</button></div>`;
  const caps = $("#caps");
  (c.lines || []).forEach((l, i) => setTimeout(() => { if (!el.classList.contains("on")) return; caps.insertAdjacentHTML("beforeend", `<p>${esc(l)}</p>`); }, 1200 + i * 2300));
  el._t = setTimeout(() => endCall(false, true), 1200 + (c.lines || []).length * 2300 + 1800);
}
function endCall(missed, answered) {
  const el = $("#call"); if (!el.classList.contains("on")) return;
  clearTimeout(el._t); clearInterval(el._clock);
  const c = el._d.call;
  el.classList.remove("on"); live.callOn = false;
  S.callsExtra.unshift({ n: c.n, k: c.k || "جوال", miss: !!missed, at: nowAt(), time: nowAt(), ts: Date.now() });
  if (S.callsExtra.length > 20) S.callsExtra.pop();
  save(); updateBadges(missed ? "phone" : null);
  if (missed) {
    const n = { ic: "phone", title: "مكالمة فائتة", text: c.n, at: "الآن", go: ["phone"] };
    if (locked()) renderLock(JSON.stringify(n.go)); else banner(n);
  }
  if (live.ctx.app === "phone" && stack.length === 1) stack[0].querySelector(".sc").innerHTML = R.phone.root();
}

/* ================= واتساب ================= */
let waFilter = "all";
function chatRow(c) {
  const lm = lastMsg(c), u = unreadOf(c), typ = live.typing[c.id];
  let prev = "";
  if (typ) prev = `<p class="typ">${c.group && typ !== true && c.members[typ] ? esc(c.members[typ].n.split(" |")[0]) + " " : ""}يكتب…</p>`;
  else if (lm) {
    const who = c.group && !lm.me && lm.m ? esc(memberName(c, lm).split(" |")[0]) + ": " : "";
    prev = `<p class="${lm.k === "del" ? "dl" : ""}">${lm.me ? '<span class="tk">✓✓</span> ' : ""}${who}${esc(msgPreview(lm))}</p>`;
  }
  const time = lm && lm.ts ? lm.at : c.time;
  return `<button class="chat" data-chat="${c.id}">
    ${avatar(c.av, c.init)}
    <span class="tx"><span class="l1"><b>${esc(c.name)}</b><time class="${u ? "u" : ""}">${time}</time></span>
    <span class="l2">${prev}${u ? `<span class="cnt">${ar(u)}</span>` : ""}</span></span></button>`;
}
function chatListHTML() {
  let cs = [...C.chats].sort((a, b) => lastTs(b) - lastTs(a));
  if (waFilter === "unread") cs = cs.filter(c => unreadOf(c));
  if (waFilter === "groups") cs = cs.filter(c => c.group);
  if (!cs.length) return `<p class="hint" style="padding-top:30px">ما فيه دردشات غير مقروءة 👌</p>`;
  return cs.map(chatRow).join("");
}
function refreshWAList(flashId) {
  const el = $("#waList"); if (!el) return;
  el.innerHTML = chatListHTML();
  if (flashId) { const r = el.querySelector(`[data-chat="${flashId}"]`); r && r.classList.add("flash"); }
  const tabs = $("#waTabs"); if (tabs) tabs.innerHTML = waTabsHTML();
  const hs = $("#convStatus"); if (hs && live.ctx.chat) { const c = chatById(live.ctx.chat); hs.outerHTML = convStatus(c); }
}
const waTabsHTML = () => [["all", "الكل"], ["unread", `غير مقروءة${C.chats.filter(c => unreadOf(c)).length ? " " + ar(C.chats.filter(c => unreadOf(c)).length) : ""}`], ["fav", "المفضلة"], ["groups", "المجموعات"]]
  .map(([k, l]) => `<button class="${waFilter === k ? "on" : ""}" data-waf="${k}">${l}</button>`).join("");
function avatar(a, init, size) {
  const st = size ? `width:${size}px;height:${size}px;` : "";
  if (a === "gh") return `<span class="av" style="${st}background:linear-gradient(160deg,#24508F,#0C1F3E)"><img src="assets/mark-dark.png" alt=""></span>`;
  return `<span class="av" style="${st}background:${a || "#636366"}">${esc(init || "")}</span>`;
}
const R = {};
R.wa = {
  cls: "wa",
  root: () => `
    <div class="nav"><button class="ibtn" aria-label="المزيد">${stroke('<circle cx="5" cy="12" r="1.3" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#fff"/><circle cx="19" cy="12" r="1.3" fill="#fff"/>')}</button>
      <span style="display:flex;gap:14px;align-items:center"><span class="ibtn">${stroke('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>')}</span><span class="wa-plus">${stroke('<path d="M12 5v14M5 12h14"/>', "#000", 2.6)}</span></span></div>
    <div class="ttl">الدردشات</div>
    ${searchBox("اسأل Meta AI أو ابحث")}
    <div class="wa-tabs" id="waTabs">${waTabsHTML()}</div>
    <div class="wa-arch">${stroke('<path d="M3 7h18v13H3zM3 7l2-3h14l2 3M9 12h6"/>', "#8696a0", 1.8)}<span>مؤرشفة</span></div>
    <div id="waList">${chatListHTML()}</div>
    <p class="hint" style="padding-top:14px">🔒 رسائلك الشخصية مشفّرة تماماً… وبيانات الأطفال أكثر</p>
    <div style="height:90px"></div>
    <nav class="tabbar" data-pin>
      <span>${stroke('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>', "currentColor", 1.7)}التحديثات</span>
      <span>${stroke('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>', "currentColor", 1.7)}المكالمات</span>
      <span>${stroke('<circle cx="9" cy="9" r="3"/><circle cx="16.5" cy="10" r="2.5"/><path d="M3 19c0-3 3-5 6-5s6 2 6 5M14.5 15c3 0 6 1.5 6 4"/>', "currentColor", 1.7)}المجتمعات</span>
      <span class="on"><b class="tb" id="waTabBadge" hidden></b>${stroke('<path d="M4 19V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H7z"/>', "currentColor", 1.7)}الدردشات</span>
      <span>${stroke('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>', "currentColor", 1.5)}الإعدادات</span>
    </nav>`,
  after: () => updateBadges(),
  sub: id => openChat(id)
};
const convStatus = c => {
  const typ = live.typing[c.id];
  if (typ) return `<small id="convStatus" class="typ">${c.group && typ !== true && c.members[typ] ? esc(c.members[typ].n.split(" |")[0]) + " " : ""}يكتب…</small>`;
  return `<small id="convStatus">${c.group ? esc(Object.values(c.members).map(m => m.n.split(" |")[0]).join("، ")) + "، أنت" : "متصل"}</small>`;
};
function bubbleHTML(c, m, prev, anim) {
  if (m.d) return `<span class="day">${esc(m.d)}</span>`;
  if (m.sys) return `<span class="b sys">${esc(m.sys)}</span>`;
  const out = !!m.me, tail = !prev || prev.d || prev.sys || !!prev.me !== out || (prev.m || "") !== (m.m || "");
  const nm = c.group && !out && m.m && tail && c.members[m.m] ? `<span class="nm" style="color:${c.members[m.m].c}">${esc(c.members[m.m].n)}</span>` : "";
  const card = m.card ? `<span class="card-b"><span class="ch"><span><img src="assets/mark-dark.png" alt=""></span><span><b>${esc(C.config.firm)}</b><small><bdi dir="ltr">${esc(C.config.phoneTxt)}</bdi></small></span></span>
     <span class="cb"><a href="tel:${C.config.phone}">اتصال</a><a href="${C.config.site}" target="_blank" rel="noopener">الموقع</a></span></span>` : "";
  return `<div class="b ${out ? "out" : "in"} ${tail ? "tail" : ""} ${anim ? "anim" : ""} ${m.k ? "k-" + m.k : ""} ${m.re ? "hasre" : ""}">${nm}${bodyHTML(m)}${card}${m.re ? `<span class="re">${esc(m.re)}</span>` : ""}<small>${m.at || ""}${out ? ' <span class="tk">✓✓</span>' : ""}</small></div>`;
}
function bodyHTML(m) {
  if (m.k === "voice") {
    const bars = Array.from({ length: 30 }, (_, i) => `<i style="height:${4 + Math.round(h01((m.t || "") + i) * 17)}px"></i>`).join("");
    return `<span class="vn" data-voice><span class="vp"><svg viewBox="0 0 24 24"><path d="M7 4v16l13-8z"/></svg></span><span class="wave">${bars}</span><span class="vd">${esc(m.dur || "٠:١٢")}</span></span>${m.t ? `<span class="vt" hidden>«${esc(m.t)}»</span>` : ""}`;
  }
  if (m.k === "img") return `<span class="im" style="background:${esc(m.c || "#2c3e50")}">${esc(m.e || "📷")}</span>${m.t ? `<span class="cap">${esc(m.t)}</span>` : ""}`;
  if (m.k === "doc") return `<span class="dc" data-locked-file><span class="di">PDF</span><span class="dt"><b>${esc(m.n || "مستند.pdf")}</b><em>${esc(m.sz || "مستند")}</em></span></span>`;
  if (m.k === "loc") return `<span class="lc" data-loc><span class="map"><span>📍</span></span><b>${esc(m.t || "موقع")}</b></span>`;
  if (m.k === "del") return `<span class="dl">🚫 تم حذف هذه الرسالة</span>`;
  return esc(m.t || "");
}
function openChat(id) {
  const c = chatById(id); if (!c) return;
  live.ctx.chat = c.id;
  const ms = msgsOf(c);
  const hist = c.history || [];
  let html = `<span class="enc">🔒 الرسائل والمكالمات مشفّرة تماماً من طرف لطرف.</span>`;
  ms.forEach((m, i) => {
    if (i === hist.length && S.extra[c.id]?.length && hist.filter(x => x.d).pop()?.d !== "اليوم") html += `<span class="day">اليوم</span>`;
    html += bubbleHTML(c, m, ms[i - 1], false);
  });
  const chips = (C.config.quick || []).map(q => `<button data-quick="${esc(q)}">${esc(q)}</button>`).join("");
  push(`
    <div class="nav">${backBtn(unreadOtherLabel(c))}${avatar(c.av, c.init)}<span class="who"><b>${esc(c.name)}</b>${convStatus(c)}</span>
      <span class="acts">${stroke('<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/>', "var(--sys)", 1.8)}${stroke('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z"/>', "var(--sys)", 1.8)}</span></div>
    <div class="msgs" id="msgs">${html}</div>
    <div class="composer" data-pin>
      <div class="chips">${chips}</div>
      <form class="cbar" id="cform"><button type="button" class="plus" aria-label="إرفاق">${stroke('<path d="M12 5v14M5 12h14"/>', "var(--sys)", 2)}</button>
        <label><input id="cin" autocomplete="off" placeholder="${c.id === "team" ? "رسالة… (إذا أنت مو أبو سعد 😅)" : "رسالة"}"></label>
        <button class="send" aria-label="إرسال"><svg viewBox="0 0 24 24"><path d="M3 20.5 21.5 12 3 3.5 3 10l12 2-12 2z" transform="scale(-1 1) translate(-24 0)"/></svg></button></form>
    </div>`, "conv", v => {
      const sc = v.querySelector(".sc"); setTimeout(() => sc.scrollTop = sc.scrollHeight, 30);
      v.querySelector("#cform").addEventListener("submit", e => { e.preventDefault(); const i = v.querySelector("#cin"); sendMsg(c, i.value); i.value = ""; });
    });
  markRead(c); updateBadges(); refreshWAList(); if (locked()) renderLock();
}
function unreadOtherLabel(c) { const n = C.chats.filter(x => x.id !== c.id && unreadOf(x)).length; return n ? ar(n) : ""; }
function convEls() { const v = stack[stack.length - 1]; return v ? { v, msgs: v.querySelector("#msgs"), sc: v.querySelector(".sc") } : {}; }
function appendBubble(c, m, anim) {
  const { msgs, sc } = convEls(); if (!msgs) return;
  const ms = msgsOf(c);
  msgs.insertAdjacentHTML("beforeend", bubbleHTML(c, m, ms[ms.length - 2], anim));
  sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
}
function showTyping(c) {
  const { msgs, sc } = convEls(); if (!msgs || msgs.querySelector(".typing-b")) return;
  msgs.insertAdjacentHTML("beforeend", `<div class="b in tail anim typing-b"><span class="dots"><i></i><i></i><i></i></span></div>`);
  sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
  const hs = $("#convStatus"); if (hs) hs.outerHTML = convStatus(c);
}
function hideTyping() { const t = document.querySelector(".typing-b"); t && t.remove(); const c = chatById(live.ctx.chat); const hs = $("#convStatus"); if (hs && c) hs.outerHTML = convStatus(c); }
function sendMsg(c, text) {
  text = (text || "").trim(); if (!text) return;
  const m = { me: 1, t: text, at: nowAt(), ts: Date.now() };
  (S.extra[c.id] ||= []).push(m); markRead(c);
  appendBubble(c, m, true); save();
  // الرد
  const rule = (C.replies || []).find(r => (r.k || []).some(k => text.includes(k)));
  c._ri = (c._ri || 0);
  let reply = rule ? (Array.isArray(rule.r) ? pick(rule.r) : rule.r) : (c.replies && c.replies[c._ri % c.replies.length]) || pick(C.config.fallbackReplies || ["🙂"]);
  if (!rule) c._ri++;
  const card = rule ? !!rule.card : false;
  const m2 = c.group ? Object.keys(c.members)[c.id === "team" ? 2 : 0] : null;
  setTimeout(() => {
    if (live.ctx.chat !== c.id) return;
    live.typing[c.id] = m2 || true; showTyping(c);
    setTimeout(() => {
      delete live.typing[c.id]; hideTyping();
      const r = { t: reply, at: nowAt(), ts: Date.now() }; if (m2) r.m = m2; if (card) r.card = 1;
      (S.extra[c.id] ||= []).push(r);
      if (live.ctx.chat === c.id) { appendBubble(c, r, true); markRead(c); }
      save(); refreshWAList(); updateBadges();
    }, rnd(1400, 2400));
  }, 700);
}

/* ================= الرسائل (SMS) ================= */
function smsRow(t) {
  const ms = smsMsgs(t), lm = [...ms].reverse().find(m => m.t), u = smsUnreadOf(t);
  return `<button class="srow" data-sms="${t.id}"><span class="sdot ${u ? "on" : ""}"></span>${avatar(t.c || "#8e8e93", t.init)}
    <span class="tx"><span class="l1"><b>${esc(t.name)}</b><time>${lm && lm.ts ? lm.at : (lm?.at || t.time || "")}${chev}</time></span><p>${esc(lm?.t || "")}</p></span></button>`;
}
const smsListHTML = () => [...C.sms].sort((a, b) => smsLastTs(b) - smsLastTs(a)).map(smsRow).join("") || `<p class="hint" style="padding-top:30px">ما فيه رسائل</p>`;
function refreshSmsList() { const el = $("#smsList"); if (el) el.innerHTML = smsListHTML(); }
R.sms = {
  cls: "smsapp",
  root: () => `<div class="nav"><span style="color:var(--sys)">تعديل</span><span class="ibtn" style="background:none">${stroke('<path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4"/>', "#0A84FF", 1.9)}</span></div>
    <div class="ttl">الرسائل</div>${searchBox()}<div id="smsList">${smsListHTML()}</div><div style="height:40px"></div>`,
  sub: id => openSms(id)
};
function smsBubble(m, prev, anim) {
  if (m.d) return `<span class="sday">${esc(m.d)}</span>`;
  const out = !!m.me, tail = !prev || prev.d || !!prev.me !== out;
  return `<div class="sb ${out ? "out" : "in"} ${tail ? "tail" : ""} ${anim ? "anim" : ""}">${esc(m.t)}</div>`;
}
function openSms(id) {
  const t = smsById(id); if (!t) return;
  live.ctx.chat = t.id;
  const ms = smsMsgs(t);
  let html = ""; ms.forEach((m, i) => html += smsBubble(m, ms[i - 1]));
  push(`<div class="nav snav">${backBtn()}<span class="sh">${avatar(t.c || "#8e8e93", t.init, 46)}<b>${esc(t.name)} <svg viewBox="0 0 8 14" width="6" height="10"><path d="M7 1 1 7l6 6" stroke="#8e8e93" stroke-width="2.2" fill="none"/></svg></b></span><span style="width:40px"></span></div>
    <div class="smsgs" id="msgs">${html}</div>
    <div class="scomp" data-pin><form class="cbar" id="sform"><button type="button" class="plus" aria-label="إرفاق">${stroke('<path d="M12 5v14M5 12h14"/>', "#8e8e93", 2)}</button>
      <label><input id="sin" autocomplete="off" placeholder="رسالة نصية"></label>
      <button class="ssend" aria-label="إرسال">${stroke('<path d="M12 19V5M6 11l6-6 6 6"/>', "#fff", 2.6)}</button></form></div>`, "smsv", v => {
      const sc = v.querySelector(".sc"); setTimeout(() => sc.scrollTop = sc.scrollHeight, 30);
      v.querySelector("#sform").addEventListener("submit", e => { e.preventDefault(); const i = v.querySelector("#sin"); sendSms(t, i.value); i.value = ""; });
    });
  S.smsRead[t.id] = ms.length; save(); updateBadges(); refreshSmsList(); if (locked()) renderLock();
}
function appendSms(t, m, anim) {
  const { msgs, sc } = convEls(); if (!msgs) return;
  const ms = smsMsgs(t);
  msgs.insertAdjacentHTML("beforeend", smsBubble(m, ms[ms.length - 2], anim));
  sc.scrollTo({ top: sc.scrollHeight, behavior: "smooth" });
}
function sendSms(t, text) {
  text = (text || "").trim(); if (!text) return;
  const m = { me: 1, t: text, at: nowAt(), ts: Date.now() };
  (S.smsExtra[t.id] ||= []).push(m); S.smsRead[t.id] = smsMsgs(t).length;
  appendSms(t, m, true); save(); refreshSmsList();
  const rule = (C.replies || []).find(r => (r.k || []).some(k => text.includes(k)));
  const reply = t.replies && t.replies.length ? t.replies[(t._ri = (t._ri ?? -1) + 1) % t.replies.length]
    : rule ? (Array.isArray(rule.r) ? pick(rule.r) : rule.r) : "هذي رسالة آلية ولا تستقبل ردود 🤖";
  setTimeout(() => {
    const r = { t: reply, at: nowAt(), ts: Date.now() };
    (S.smsExtra[t.id] ||= []).push(r);
    if (live.ctx.app === "sms" && live.ctx.chat === t.id) { appendSms(t, r, true); S.smsRead[t.id] = smsMsgs(t).length; }
    save(); refreshSmsList(); updateBadges();
  }, rnd(1800, 3000));
}

/* ================= الملاحظات ================= */
R.notes = {
  cls: "notes-v",
  root: () => {
    const pin = C.notes.filter(n => n.pin), rest = C.notes.filter(n => !n.pin);
    return `
    <div class="nav">${backBtn("المجلدات", "var(--yel)")}<span class="ibtn">${stroke('<circle cx="5" cy="12" r="1.3" fill="#F6C443"/><circle cx="12" cy="12" r="1.3" fill="#F6C443"/><circle cx="19" cy="12" r="1.3" fill="#F6C443"/>', "#F6C443")}</span></div>
    <div class="ttl">الملاحظات</div>
    ${searchBox()}
    ${pin.length ? `<div class="sect">مثبّتة</div><div class="list noi">${pin.map(noteRow).join("")}</div>` : ""}
    <div class="sect">السابق</div><div class="list noi">${rest.map(noteRow).join("")}</div>
    <div style="height:90px"></div>
    <div class="notes-tool" data-pin><span></span><span>${ar(C.notes.length)} ملاحظات</span>${stroke('<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 7l3 3"/>', "#F6C443", 1.8)}</div>`;
  },
  sub: id => openNote(id)
};
function noteFirst(n) { return n.intro || (n.items || n.bullets || n.paras || [])[0] || (n.qa ? n.qa[0][0] : ""); }
const noteRow = n => `<button class="row note-row" data-note="${n.id}"><span class="tx"><b>${esc(n.title)}</b><small><span>${esc(n.date)}</span>  ${esc(noteFirst(n))}</small></span></button>`;
function openNote(id) {
  const n = C.notes.find(x => x.id === id); if (!n) return;
  const ck = S.checks[n.id] || {};
  push(`
    <div class="nav">${backBtn("الملاحظات", "var(--yel)")}<span style="display:flex;gap:10px"><span class="ibtn">${stroke('<path d="M12 3v12M7 8l5-5 5 5M5 14v6h14v-6"/>', "#F6C443")}</span><span class="ibtn">${stroke('<circle cx="5" cy="12" r="1.3" fill="#F6C443"/><circle cx="12" cy="12" r="1.3" fill="#F6C443"/><circle cx="19" cy="12" r="1.3" fill="#F6C443"/>', "#F6C443")}</span></span></div>
    <div class="note-body">
      <div class="meta">${esc(n.date)}</div>
      <h1>${esc(n.title)}</h1>
      ${n.intro ? `<p>${esc(n.intro)}</p>` : ""}
      ${n.items ? `<ul>${n.items.map((t, i) => `<li class="${ck[i] ? "done" : ""}"><span class="ck" data-ck="${n.id}:${i}"></span><span>${esc(t)}</span></li>`).join("")}</ul>` : ""}
      ${n.bullets ? `<ul>${n.bullets.map(t => `<li><span class="dm"></span><span>${esc(t)}</span></li>`).join("")}</ul>` : ""}
      ${n.qa ? n.qa.map(([q, a]) => `<div class="qa"><b>${esc(q)}</b>${esc(a)}</div>`).join("") : ""}
      ${n.paras ? n.paras.map(p => `<p style="font-family:var(--serif);font-size:20px;line-height:1.7;margin:14px 0">${esc(p)}</p>`).join("") : ""}
      ${n.outro ? `<p>${esc(n.outro)}</p>` : ""}
      ${n.cta ? `<div class="sig">تبي تتطوع أو تغرس خير مع طفل؟<br><a href="tel:${C.config.phone}" class="yel">اتصل بغراس</a> · <a href="${C.config.site}" target="_blank" rel="noopener" class="yel">${C.config.site.replace(/^https?:\/\//, "")}</a></div>` : ""}
    </div>`, "notes-v");
}

/* ================= التقويم ================= */
R.calendar = {
  root: () => {
    S.cal = []; save(); if (locked()) renderLock();
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(TODAY); d.setDate(d.getDate() + i);
      days.push(`<div class="${i === 0 ? "on" : ""}">${d.toLocaleDateString("ar-SA-u-ca-gregory", { weekday: "narrow" })}<b>${ar(d.getDate())}</b></div>`);
    }
    const H0 = 7, rowH = 64;
    const hours = Array.from({ length: 16 }, (_, i) => { const h = H0 + i; const l = h < 12 ? `${ar(h)} ص` : h === 12 ? "١٢ م" : `${ar(h - 12)} م`; return `<div class="hr"><span>${l}</span></div>`; }).join("");
    const evs = C.events.map(e => `<button class="ev" data-ev="${e.id}" style="top:${(e.h - H0) * rowH + 2}px;height:${e.d * rowH - 4}px;background:${e.c}33;border-color:${e.c}"><b>${esc(e.t)}</b><small>${esc(e.s)}</small></button>`).join("");
    const now = new Date(); const nh = now.getHours() + now.getMinutes() / 60;
    const nowLine = nh >= H0 && nh < H0 + 16 ? `<div class="now" style="top:${(nh - H0) * rowH}px"></div>` : "";
    return `
    <div class="nav"><button class="back" style="color:var(--red)"><svg viewBox="0 0 12 20"><path d="M2 2l8 8-8 8"/></svg>${TODAY.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long" })}</button><span style="display:flex;gap:16px;color:var(--red)">${stroke(P.search, "#FF453A")}${stroke('<path d="M12 5v14M5 12h14"/>', "#FF453A")}</span></div>
    <div class="cal-strip">${days.join("")}</div>
    <div style="text-align:center;font-size:15px;padding:10px 0 4px;color:var(--t2)">${TODAY.toLocaleDateString("ar-SA-u-ca-gregory-nu-arab", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</div>
    <div class="hours">${hours}${evs}${nowLine}</div>`;
  },
  after: v => setTimeout(() => v.querySelector(".sc").scrollTo({ top: 60, behavior: "smooth" }), 300)
};

/* ================= البريد ================= */
R.mail = {
  root: () => `
    <div class="nav">${backBtn("صناديق البريد")}<span style="color:var(--sys)">تعديل</span></div>
    <div class="ttl">الوارد</div>
    ${searchBox()}
    ${allMails().map(m => `<button class="mail-row" data-mail="${m.id}"><span class="dot ${m.read || S.mailRead[m.id] ? "r" : ""}"></span><span class="tx"><span class="l1"><b>${esc(m.from)}</b><time>${m.time || m.at}</time></span><div class="s">${esc(m.s)}</div><p>${esc(m.p)}</p></span></button>`).join("")}
    <div style="height:90px"></div>
    <div class="mail-tool" data-pin>${stroke('<path d="M4 20l4-1 11-11-3-3L5 16z"/>', "#0A84FF", 1.8)}<span>آخر تحديث: الآن · ${ar(mailUnread())} غير مقروءة</span>${stroke('<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v4h4"/>', "#0A84FF", 1.8)}</div>`,
  sub: id => openMail(id)
};
function openMail(id) {
  const m = allMails().find(x => x.id === id); if (!m) return;
  S.mailRead[m.id] = 1; save(); updateBadges(); if (locked()) renderLock();
  push(`
    <div class="nav">${backBtn("الوارد")}<span style="display:flex;gap:16px">${stroke('<path d="M6 4h12v16l-6-4-6 4z"/>', "#0A84FF", 1.8)}${stroke('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>', "#0A84FF", 1.8)}</span></div>
    <div class="mail-read">
      <h2>${esc(m.s)}</h2>
      <div class="from">${avatar(m.c, m.init)}<span><b>${esc(m.from)}</b><small>إلى: ${esc(C.config.owner)} · ${m.time || m.at}</small></span></div>
      <div class="body">${(m.body || []).map(p => `<p>${esc(p)}</p>`).join("")}</div>
      ${m.file ? `<button class="attach" data-locked-file><span class="pdf">PDF</span><span><b style="display:block">${esc(m.file)}</b><small style="color:var(--t2)">🔒 محمي — سرّي</small></span></button>` : ""}
    </div>`, "", v => { v.onShow = null; });
  if (stack[0]) stack[0].querySelector(".sc").innerHTML = R.mail.root();
}

/* ================= الهاتف ================= */
let dialed = "";
R.phone = {
  root: () => { S.callsSeen = Date.now(); save(); setTimeout(() => { updateBadges(); if (locked()) renderLock(); }, 0); return phoneRecents(); }
};
function phoneTabs(on) {
  return `<nav class="tabbar" data-pin>
    ${[["fav", "المفضلة", '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'], ["rec", "الأخيرة", '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'], ["con", "جهات الاتصال", '<circle cx="12" cy="9" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'], ["key", "لوحة المفاتيح", '<circle cx="6" cy="5" r="1.4"/><circle cx="12" cy="5" r="1.4"/><circle cx="18" cy="5" r="1.4"/><circle cx="6" cy="11" r="1.4"/><circle cx="12" cy="11" r="1.4"/><circle cx="18" cy="11" r="1.4"/><circle cx="6" cy="17" r="1.4"/><circle cx="12" cy="17" r="1.4"/><circle cx="18" cy="17" r="1.4"/><circle cx="12" cy="22" r="1.2"/>']]
      .map(([k, l, p]) => `<button data-ptab="${k}" class="${on === k ? "on" : ""}">${stroke(p, "currentColor", 1.7)}${l}</button>`).join("")}
  </nav>`;
}
function phoneRecents() {
  return `
    <div class="nav"><span></span><span style="color:var(--sys)">تعديل</span></div>
    <div class="seg"><button class="on">الكل</button><button>الفائتة</button></div>
    <div class="ttl">الأخيرة</div>
    <div class="list">${allCalls().map((c, i) => `
      <button class="row call-row" data-callrow="${i}">
        <span class="tx"><b class="${c.miss ? "miss" : ""}">${esc(c.n)}</b><small>${esc(c.k)}</small></span>
        <time>${c.time}</time><span class="info">i</span>
      </button>`).join("")}</div>
    <a class="cta" href="tel:${C.config.phone}">${phoneSvg()}اتصل بجمعية غراس</a>
    <p class="hint">لقيت الجوال أو تبي تتطوع؟ الرقم نفسه ☝️</p>
    <div style="height:90px"></div>${phoneTabs("rec")}`;
}
function phoneKeypad() {
  const K = [["1", ""], ["2", "ABC"], ["3", "DEF"], ["4", "GHI"], ["5", "JKL"], ["6", "MNO"], ["7", "PQRS"], ["8", "TUV"], ["9", "WXYZ"], ["*", ""], ["0", "+"], ["#", ""]];
  return `<div style="height:40px"></div><div class="dial" id="dial">${dialed || "&nbsp;"}</div>
    <div class="keypad">${K.map(([n, l]) => `<button class="key" data-key="${n}"><b>${n}</b><small>${l}</small></button>`).join("")}</div>
    <button class="dialcall" data-dialcall aria-label="اتصال">${phoneSvg("#fff", 34)}</button>
    <p class="hint" style="margin-top:14px">اكتب أي رقم… أو اضغط اتصال لجمعية غراس مباشرة</p>
    <div style="height:90px"></div>${phoneTabs("key")}`;
}
function phoneContacts() {
  const people = [{ n: C.config.firm, s: `<bdi dir="ltr">${esc(C.config.phoneTxt)}</bdi>`, gh: 1 }].concat(C.chats.filter(c => !c.group).map(c => ({ n: c.name, s: "واتساب", av: c.av, i: c.init })));
  return `<div class="nav"><span></span><span style="color:var(--sys);font-size:24px">+</span></div><div class="ttl">جهات الاتصال</div>${searchBox()}
    <div class="list">${people.map(p => p.gh ? `<a class="row" href="tel:${C.config.phone}">${avatar("gh", "", 40)}<span class="tx"><b>${esc(p.n)}</b><small>${p.s}</small></span>${chev}</a>` : `<button class="row" data-wacontact="${esc(p.n)}">${avatar(p.av, p.i, 40)}<span class="tx"><b>${esc(p.n)}</b><small>${p.s}</small></span>${chev}</button>`).join("")}</div>
    <div style="height:90px"></div>${phoneTabs("con")}`;
}

/* ================= الملفات ================= */
const FOLDERS = [
  { n: "ملفات المستفيدين", s: "🔒 مقفل", lock: 1 }, { n: "نماذج التقييم", s: "٤٨ عنصر", lock: 1 }, { n: "تقارير البرامج", s: "١٢٠ عنصر", lock: 1 },
  { n: "محاضر المجلس", s: "٣٤ عنصر", lock: 1 }, { n: "أدلة غراس", s: "٣ عناصر", items: ["كيف تسمع طفلك.pdf", "ألعاب القيم في البيت.pdf", "دليل المتطوع الجديد.pdf"] },
  { n: "شخصي", s: "٣ عناصر", items: ["قائمة القهوة.txt", "صور العيد", "أرقام مهمة.txt"] }
];
R.files = {
  root: () => `
    <div class="nav">${backBtn("تصفح")}<span class="ibtn">${stroke('<circle cx="5" cy="12" r="1.3" fill="#0A84FF"/><circle cx="12" cy="12" r="1.3" fill="#0A84FF"/><circle cx="19" cy="12" r="1.3" fill="#0A84FF"/>', "#0A84FF")}</span></div>
    <div class="ttl">على الآيفون</div>
    ${searchBox()}
    <div class="ftiles">
      ${FOLDERS.map((f, i) => `<button class="ftile" data-folder="${i}"><span class="fi">${I.files(84, 68, false)}</span><b>${f.n}</b><small>${f.s}</small></button>`).join("")}
      <button class="ftile" data-folder="x"><span class="fi"><span class="pdf" style="width:46px;height:58px;font-size:11px">PDF</span></span><b>خطة_السنة_نهائي_٣</b><small>أمس</small></button>
      <button class="ftile" data-folder="x"><span class="fi"><span class="pdf" style="width:46px;height:58px;font-size:11px;color:#0A84FF">DOCX</span></span><b>تقرير_الأثر_(لا_تحذف)</b><small>الأحد</small></button>
    </div>`
};
function openFolder(i) {
  const f = FOLDERS[i];
  if (i === "x" || f.lock) { alertBox("🔒 ملف سرّي", "هذا ملف يخص الأطفال. خصوصية المستفيدين عندنا ما تنفتح… حتى لو لقيت الجوال 😉"); return; }
  push(`<div class="nav">${backBtn("على الآيفون")}<span></span></div><div class="ttl">${f.n}</div>
    <div class="list">${f.items.map(x => `<div class="row"><span class="sq" style="background:#FF3B30">${stroke('<path d="M6 2h8l5 5v15H6z"/>')}</span><span class="tx"><b>${esc(x)}</b><small>${i == 4 ? "محتوى تربوي · غراس" : "شخصي"}</small></span></div>`).join("")}</div>`);
}

/* ================= الصور والكاميرا ================= */
R.photos = {
  root: () => `
    <div class="nav"><span></span><span style="display:flex;gap:10px"><span class="ibtn" style="width:auto;padding:0 12px;border-radius:99px;font-size:14px">تحديد</span></span></div>
    <div class="ttl">المكتبة</div>
    <div class="pgrid">${C.photos.map((p, i) => `<button class="ph" data-photo="${i}" style="background:radial-gradient(circle at 30% 25%,${p.c}ee,${p.c}88 60%,#0006)">${p.e}<em>${esc(p.cap)}</em></button>`).join("")}</div>
    <p class="hint" style="padding-top:14px">${ar(C.photos.length)} صورة · آخر مزامنة: قبل ما يضيع</p>`
};
function openPhoto(i) {
  const p = C.photos[i];
  push(`<div class="nav">${backBtn("المكتبة")}<span style="color:var(--sys)">تعديل</span></div>
  <div class="pview"><div class="ph" style="background:radial-gradient(circle at 30% 25%,${p.c},${p.c}aa 60%,#000)">${p.e}<em>${esc(p.cap)}</em></div></div>`);
}
R.camera = {
  root: () => `<div class="cam"><div class="vf"><p>ابتسم 📸<br><span style="font-size:15px;color:#aaa;font-family:var(--font)">أنت الآن في جوال مدير جمعية…<br>وكل صورة فيها طفل مبتسم 😄</span></p></div>
  <div class="modes"><span>فيديو</span><span class="on">صورة</span><span>بورتريه</span></div>
  <div class="ctl"><span style="width:46px;height:46px;border-radius:8px;background:linear-gradient(135deg,#233143,#C0B3A3)"></span><button class="shut" data-shoot aria-label="التقاط"></button><span class="circ" style="background:#222"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4"/></svg></span></div><div class="flash"></div></div>`
};

/* ================= سفاري ================= */
R.safari = {
  light: 1,
  root: () => `<div class="saf" style="min-height:100%"><div class="site">
    <header><img src="assets/logo.png" alt="جمعية غراس" style="height:58px"><span>${stroke('<path d="M4 7h16M4 12h16M4 17h16"/>', "#1C437D")}</span></header>
    <div class="hero"><img class="mark" src="assets/mark-dark.png" alt=""><h1>نغرس القيم اليوم<br>لنحصد جيلاً واعياً</h1><p>برامج وورش ومخيمات تنمّي الطفل في قيمه ومهاراته، بشراكة الأسرة والمدرسة والمتطوعين.</p>
      <a href="${C.config.site}" target="_blank" rel="noopener" class="cta beige" style="margin:18px 0 0;display:inline-flex;padding:0 22px;height:46px">زيارة الموقع</a></div>
    <div class="svc"><h2>وش نسوي في غراس؟</h2>${(C.notes.find(n => n.id === "svc")?.bullets || []).map(b => `<div><i></i>${esc(b)}</div>`).join("")}</div>
    <a href="tel:${C.config.phone}" class="cta" style="margin:18px 20px;background:var(--navy)">تطوّع أو تبرّع</a>
  </div>
  <div class="urlbar" data-pin><div>${stroke('<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>', "#555", 2).replace("<svg", '<svg width="13" height="13"')} gheras.sa</div></div></div>`
};

/* ================= الإعدادات ================= */
const setRow = (c, g, t, right, attr = "") => `<button class="row" ${attr}><span class="sq" style="background:${c}">${stroke(g)}</span><span class="tx"><b>${t}</b></span>${right}</button>`;
const sRow = (c, g, t, val, page) => setRow(c, g, t, (val ? `<span class="val">${val}</span>` : "") + chev, `data-set="${page}"`);
const kvRow = (k, v, attr = "") => `<div class="row kv" ${attr}><span class="tx"><b>${k}</b></span><span class="val">${v}</span></div>`;
const linkRow = (t, page, val = "") => `<button class="row" data-set="${page}"><span class="tx"><b>${t}</b></span>${val ? `<span class="val">${val}</span>` : ""}${chev}</button>`;
const subNav = (title, back = "الإعدادات") => `<div class="nav snavt">${backBtn(back)}<span class="mid">${title}</span><span style="width:70px"></span></div>`;
const DEV = { name: "آيفون أبو سعد", ios: "26.1", model: "iPhone 16 Pro", cap: 256 };
const usedGB = () => +(DEV.cap - 3.2).toFixed(1);
R.settings = {
  root: () => `
    <div class="ttl" style="padding-top:8px">الإعدادات</div>
    ${searchBox()}
    <div class="list"><button class="row prof" data-set="x:apple">${avatar("gh", "", 58)}<span class="tx"><b>${esc(C.config.owner)} — ${esc(C.config.firm)}</b><small>Apple Account، iCloud، والمزيد</small></span>${chev}</button></div>
    <div class="list"><button class="row" data-sheet><span class="sq" style="background:#34C759">${stroke(G.find)}</span><span class="tx"><b style="color:var(--green)">هل لقيت هذا الآيفون؟</b><small>اضغط هنا لمعرفة كيف ترجّعه</small></span>${chev}</button></div>
    <div class="list">
      ${setRow("#FF9F0A", G.plane, "وضع الطيران", `<span class="toggle" data-tg></span>`)}
      ${sRow("#0A84FF", G.wifi, "Wi-Fi", "Gheras-Office", "wifi")}
      ${sRow("#0A84FF", G.bt, "بلوتوث", "تشغيل", "x:bt")}
      ${sRow("#30D158", G.cell, "الخلوي", "", "x:cell")}
      ${sRow("#30D158", G.hot, "نقطة اتصال شخصية", "إيقاف", "x:hot")}
      ${sRow("#30D158", G.batt, "البطارية", `<span style="color:${live.batt < 20 ? "var(--red)" : "inherit"}">${ar(live.batt)}٪</span>`, "battery")}
    </div>
    <div class="list">
      ${sRow("#8E8E93", G.gear, "عام", "", "general")}
      ${sRow("#0A84FF", G.ctrl, "مركز التحكم", "", "x:ctrl")}
      ${sRow("#0A84FF", G.sun, "الشاشة والإضاءة", "", "x:disp")}
      ${sRow("#35A8E0", G.flower, "الخلفية", "", "x:wall")}
      ${sRow("#1C1C1E", G.siri, "Siri", "", "x:siri")}
    </div>
    <div class="list">
      ${sRow("#FF3B30", G.bell, "الإشعارات", "", "notif")}
      ${sRow("#FF2D55", G.sound, "الأصوات والحس اللمسي", "", "x:sound")}
      ${sRow("#5E5CE6", G.moon, "التركيز", "وقت الأسرة", "x:focus")}
      ${sRow("#5E5CE6", G.hour, "مدة استخدام الجهاز", "", "screentime")}
    </div>
    <div class="list">
      ${sRow("#30D158", G.face, "بصمة الوجه ورمز الدخول", "", "x:face")}
      ${sRow("#FF3B30", G.sos, "الطوارئ SOS", "", "x:sos")}
      ${sRow("#0A84FF", G.hand, "الخصوصية والأمن", "", "x:priv")}
    </div>
    <div class="list">
      ${setRow("#1C437D", G.scale, "خصوصية الأطفال", `<span class="toggle on" data-tg data-locked></span>`)}
      ${setRow("#6CBD53", G.pen, "متابعة البرامج الميدانية", `<span class="toggle on" data-tg></span>`)}
      ${setRow("#27B5C1", G.bell, "تنبيهات الورش والمواعيد", `<span class="toggle on" data-tg></span>`)}
    </div>
    <div class="list">
      ${sRow("#25D366", G.chat, "واتساب", "", "x:waset")}
      ${sRow("#0A84FF", G.mail, "البريد", "", "x:mailset")}
      ${sRow("#1C437D", G.scale, "غراس", "", "x:ghset")}
    </div>
    <p class="hint">خصوصية الأطفال لا يمكن إيقافها. حتى من الإعدادات.</p>`
};
const SET_ALERTS = {
  apple: ["Apple Account", "الحساب باسم أبو سعد، ومحمي بالمصادقة الثنائية 🔐"],
  bt: ["بلوتوث", "متصل بـ «سماعات أبو سعد»… اللي غالباً ضايعة معه 😅"],
  cell: ["الخلوي", "باقة البيانات: كلها راحت على فيديوهات «العب مع طفلك» 📶"],
  hot: ["نقطة اتصال شخصية", "مقفلة. ما نشارك الإنترنت… ولا بيانات الأطفال 🙂"],
  ctrl: ["مركز التحكم", "اسحب من أعلى اليمين في الآيفون الحقيقي. هنا نكتفي بالإعدادات 🙂"],
  disp: ["الشاشة والإضاءة", "الوضع الداكن مفعّل دائماً… السهر على التقارير يحتاجه 🌙"],
  wall: ["الخلفية", "خلفية غراس. ما تتغيّر 🌱"],
  siri: ["Siri", "Siri ما تعرف جدول الورش. للاستفسار: غراس 👇"],
  sound: ["الأصوات والحس اللمسي", "نغمة الرنين: «ورشة بعد خمس دقايق» 🔔"],
  focus: ["التركيز", "«وقت الأسرة»: لا مكالمات ولا إشعارات إلا من الجمعية… وسعد 🎒"],
  face: ["بصمة الوجه", "الوجه المسجّل: أبو سعد فقط. وأنت؟ 🤨"],
  sos: ["الطوارئ SOS", "للطوارئ: اتصل ٩٩٧. وللجوال المفقود: اتصل بغراس 🙂"],
  priv: ["الخصوصية والأمن", "خدمات الموقع: إيقاف. بيانات الأطفال: مشفّرة. كلمة السر: لا 🙂"],
  waset: ["واتساب", "النسخ الاحتياطي: يومياً ٢:٠٠ ص. آخر نسخة: قبل ما يضيع الجوال 🙃"],
  mailset: ["البريد", "التوقيع: «مع خالص التحية — جمعية غراس لتنمية الطفل»"],
  ghset: ["غراس", "الإشعارات: مفعّلة. إذا حبيت تغرس خير مع طفل، تعرف وين تلقانا 👇"],
  reset: ["نقل أو إعادة تعيين الآيفون", "ما يصير 🙂 هذا الجهاز مسجّل باسم أبو سعد، والأفضل ترجّعه لجمعية غراس."],
  imei: ["IMEI", "رقم الجهاز مسجّل لدى الجمعية. ما نعرضه هنا 🙂"],
  serial: ["الرقم التسلسلي", "سرّي… مثل بيانات الأطفال في هذا الجوال 🙂"],
  airdrop: ["AirDrop", "الاستقبال: «جهات الاتصال فقط». حتى رسومات الأطفال تحتاج إذن 😄"],
  vpn: ["VPN وإدارة الجهاز", "الجهاز مُدار من «جمعية غراس»."],
  kbd: ["لوحة المفاتيح", "التصحيح التلقائي يحوّل «برنامج» إلى «برنامج أطفال» تلقائياً 😄"],
  lang: ["اللغة والمنطقة", "العربية · السعودية · التقويم الهجري والميلادي"],
  date: ["التاريخ والوقت", "تلقائي. والورش ما تتأجل 🙂"]
};
function openSetting(k) {
  if (k.startsWith("x:")) { const a = SET_ALERTS[k.slice(2)]; if (a) alertBox(a[0], a[1], k === "x:reset" ? [{ l: "حسناً" }, { l: "اتصل بغراس", href: "tel:" + C.config.phone, pri: 1 }] : undefined); return; }
  const P = SET_PAGES[k]; if (P) push(P(), "setp");
}
const SET_PAGES = {
  general: () => `${subNav("عام")}
    <div class="list noi">${linkRow("حول", "about")}${linkRow("تحديث البرامج", "update")}</div>
    <div class="list noi">${linkRow("AirDrop", "x:airdrop")}${linkRow("سعة تخزين الآيفون", "storage")}</div>
    <div class="list noi">${linkRow("التاريخ والوقت", "x:date")}${linkRow("لوحة المفاتيح", "x:kbd")}${linkRow("اللغة والمنطقة", "x:lang")}</div>
    <div class="list noi">${linkRow("VPN وإدارة الجهاز", "x:vpn", "جمعية غراس")}</div>
    <div class="list noi">${linkRow("نقل أو إعادة تعيين الآيفون", "x:reset")}<button class="row" data-set="x:reset"><span class="tx"><b style="color:var(--sys)">إيقاف التشغيل</b></span></button></div>`,
  about: () => `${subNav("حول", "عام")}
    <div class="list noi">${kvRow("الاسم", DEV.name)}${kvRow("إصدار iOS", DEV.ios)}${kvRow("اسم الطراز", DEV.model)}${kvRow("رقم الطراز", "MYMN3AH/A")}<button class="row kv" data-set="x:serial"><span class="tx"><b>الرقم التسلسلي</b></span><span class="val">•••••••••••</span></button></div>
    <div class="list noi">${kvRow("الضمان المحدود", "ينتهي ٢٠٢٧/٠٩/٢٣")}${kvRow("المالك", esc(C.config.firm))}</div>
    <div class="list noi">${kvRow("الأغاني", "٠")}${kvRow("الفيديوهات", ar(14))}${kvRow("الصور", ar(C.photos.length * 97 + 12))}${kvRow("التطبيقات", ar(38))}${kvRow("السعة", ar(DEV.cap) + " غ.ب")}${kvRow("المتوفر", "٣٫٢ غ.ب")}</div>
    <div class="list noi">${kvRow("عنوان Wi-Fi", `<bdi dir="ltr">F2:1A:7C:••:••:09</bdi>`)}${kvRow("بلوتوث", `<bdi dir="ltr">F2:1A:7C:••:••:0A</bdi>`)}<button class="row kv" data-set="x:imei"><span class="tx"><b>IMEI</b></span><span class="val">مخفي</span></button>${kvRow("الشبكة", "5G")}</div>
    <div class="list"><button class="row" data-sheet><span class="tx"><b style="color:var(--green)">هذا الآيفون مفقود</b><small>${esc(C.config.lostMsg)}</small></span>${chev}</button></div>
    <p class="hint">${esc(DEV.model)} · مسجّل لدى ${esc(C.config.firm)}</p>`,
  update: () => `${subNav("تحديث البرامج", "عام")}
    <div class="upd"><div class="ulogo">${stroke(G.gear, "#fff", 1.6)}</div><b>iOS ${DEV.ios}</b><p>برنامجك محدّث</p></div>
    <div class="list noi">${kvRow("التحديثات التلقائية", "تشغيل")}${kvRow("آخر فحص", "اليوم ٧:٠٢ ص")}</div>
    <p class="hint">التحديث الوحيد المتأخر: صاحب الجوال نفسه 😅</p>`,
  storage: () => { const segs = [["الملفات", 74, "#0A84FF"], ["الصور", 58, "#FF9F0A"], ["واتساب", 46, "#30D158"], ["البريد", 21, "#5E5CE6"], ["النظام", 28, "#8E8E93"], ["أخرى", 25.8, "#636366"]];
    return `${subNav("سعة تخزين الآيفون", "عام")}
    <div class="list noi" style="padding:14px"><div class="stor-h"><b>الآيفون</b><span class="val">${ar(usedGB())} من ${ar(DEV.cap)} غ.ب مستخدم</span></div>
      <div class="stor-bar">${segs.map(s => `<i style="flex:${s[1]};background:${s[2]}"></i>`).join("")}<i style="flex:3.2;background:#3a3a3c"></i></div>
      <div class="stor-k">${segs.map(s => `<span><i style="background:${s[2]}"></i>${s[0]}</span>`).join("")}</div></div>
    <div class="list noi">${[["ملفات المستفيدين 🔒", "٧٤ غ.ب"], ["الصور", "٥٨ غ.ب"], ["واتساب", "٤٦ غ.ب"], ["البريد", "٢١ غ.ب"], ["غراس", "٣٫٤ غ.ب"]].map(r => kvRow(r[0], r[1])).join("")}</div>
    <p class="hint">التوصية: «لا تحذف شي». كل صورة طفل مبتسم ذكرى 📂</p>`; },
  battery: () => `${subNav("البطارية")}
    <div class="list noi" style="padding:14px"><div class="stor-h"><b>مستوى البطارية</b><span class="val" style="color:${live.batt < 20 ? "var(--red)" : "inherit"}">${ar(live.batt)}٪</span></div>
      <div class="bchart">${[62, 80, 45, 30, 72, 90, 55, 40, 66, 85, 38, 20].map((h, i) => `<i style="height:${h}%;${i === 11 ? "background:var(--red)" : ""}"></i>`).join("")}</div></div>
    <div class="list noi">${kvRow("وضع الطاقة المنخفضة", `<span class="toggle ${live.batt < 20 ? "on" : ""}" data-tg></span>`)}${kvRow("صحة البطارية", "٩١٪")}</div>
    <div class="sect">الاستخدام حسب التطبيق</div>
    <div class="list noi">${[["واتساب", "٤١٪"], ["البريد", "١٩٪"], ["الهاتف", "١٤٪"], ["الملفات", "١١٪"], ["التقويم", "٧٪"], ["غراس", "٥٪"]].map(r => kvRow(r[0], r[1])).join("")}</div>
    <p class="hint">${live.batt < 20 ? "البطارية ضعيفة… إذا لقيت الجوال لا تخليه يطفي قبل ما توصله لنا 🙏" : "البطارية كافية تقريباً لمكالمة واحدة مع غراس 🙂"}</p>`,
  wifi: () => `${subNav("Wi-Fi")}
    <div class="list noi">${kvRow("Wi-Fi", `<span class="toggle on" data-tg></span>`)}<div class="row kv"><span class="tx"><b><span style="color:var(--sys)">✓</span> Gheras-Office</b></span><span class="val">🔒 ${stroke(G.wifi, "#fff", 2)}</span></div></div>
    <div class="sect" style="font-size:13px;color:var(--t2);font-weight:400">الشبكات</div>
    <div class="list noi">${["Gheras-Guests", "School-Public", "Cafe_5G", "Camp-Hotspot"].map(n => `<button class="row kv" data-pass><span class="tx"><b>${n}</b></span><span class="val">🔒</span></button>`).join("")}</div>`,
  notif: () => `${subNav("الإشعارات")}
    <div class="list noi">${kvRow("عرض المعاينات", "دائماً")}${kvRow("الملخص المجدول", "إيقاف")}</div>
    <div class="sect" style="font-size:13px;color:var(--t2);font-weight:400">إشعارات التطبيقات</div>
    <div class="list">${[["#25D366", G.chat, "واتساب", "عاجل"], ["#21C33A", G.chat, "الرسائل", "شارات، أصوات"], ["#0A84FF", G.mail, "البريد", "شارات"], ["#FF3B30", G.bell, "التقويم", "تنبيهات"], ["#FF9F0A", G.hour, "الساعة", "منبّهات"]].map(r => setRow(r[0], r[1], r[2], `<span class="val">${r[3]}</span>` + chev)).join("")}</div>`,
  screentime: () => `${subNav("مدة استخدام الجهاز")}
    <div class="list noi" style="padding:14px"><div class="stor-h"><b>المعدل اليومي</b><span class="val">٧ س ٤٢ د</span></div>
      <div class="bchart">${[70, 85, 60, 95, 80, 40, 30].map(h => `<i style="height:${h}%;background:#5E5CE6"></i>`).join("")}</div></div>
    <div class="list noi">${[["واتساب", "٣ س ١٠ د"], ["البريد", "١ س ٥٥ د"], ["الملفات", "١ س ٢٠ د"], ["الهاتف", "٤٧ د"]].map(r => kvRow(r[0], r[1])).join("")}</div>
    <p class="hint">أكثر كلمة مكتوبة هذا الأسبوع: «شكراً للمتطوعين» ✍️</p>`
};

/* ================= الساعة / الطقس / غراس ================= */
R.clock = {
  root: () => `<div class="nav"><span style="color:#FF9F0A">تعديل</span><span style="color:#FF9F0A;font-size:26px">+</span></div><div class="ttl">المنبّه</div>
  ${(S.alarms || []).length ? `<div class="sect" style="font-size:15px">رنّ اليوم</div><div class="list noi">${S.alarms.map(a => `<div class="row" style="padding:10px 14px"><span class="tx"><b>${esc(a.title)}</b><small>${a.at}</small></span><span class="val" style="color:#FF9F0A">⏰</span></div>`).join("")}</div>` : ""}
  <div class="sect" style="font-size:15px">المنبّهات</div>
  <div class="list noi">${[["٦:٣٠", "ص", "صلاة الفجر ثم الجمعية", 1], ["٨:٠٠", "ص", "راجع جدول الورش", 1], ["٩:٤٥", "ص", "طابور الصباح في المدرسة الشريكة!", 1], ["١١:٠٠", "م", "نام. التقرير ما بيطير", 0]]
      .map(a => `<div class="row" style="padding:12px 14px"><span class="tx"><b style="font-family:var(--serif);font-size:44px;font-weight:500;line-height:1.25;${a[3] ? "" : "opacity:.45"}">${a[0]}<small style="display:inline;font-size:20px;color:inherit"> ${a[1]}</small></b><small>${a[2]}</small></span><span class="toggle ${a[3] ? "on" : ""}" data-tg></span></div>`).join("")}</div>`
};
R.weather = {
  root: () => `<div style="min-height:calc(100% + 94px);margin:calc(-2px - var(--sbh)) 0 -40px;background:linear-gradient(180deg,#3D8BFF,#7BB8FF 70%);text-align:center;padding-top:96px">
  <div style="font-size:30px">الرياض</div><div style="font-family:var(--serif);font-size:96px;font-weight:500;line-height:1.1">٢٤°</div>
  <div style="font-size:18px">صحو · مناسب لمخيم الأطفال</div><div style="font-size:15px;opacity:.85">العظمى: ٣١° الصغرى: ١٨°</div>
  <div class="list" style="margin:30px 16px;background:rgba(0,40,100,.25);text-align:start;padding:6px 0">
    <div class="row"><span class="tx"><b>توقعات أبو سعد</b><small style="color:#fff;opacity:.85;white-space:normal;line-height:1.6">احتمال عالي لمكالمات من أولياء الأمور، واحتمال ضعيف لإيجاد الجوال قبل المغرب.</small></span></div>
  </div></div>`
};
R.gh = {
  root: () => `<div style="min-height:calc(100% + 94px);margin:calc(-2px - var(--sbh)) 0 -40px;background:linear-gradient(170deg,#24508F,#1C437D 48%,#0C1F3E);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:84px 28px 60px;text-align:center">
  <img src="assets/logo-white.png" alt="جمعية غراس" style="width:230px">
  <h2 style="font-family:var(--serif);font-size:24px;line-height:1.6;color:var(--mint);margin-top:6px">الجوال ضايع…<br>لكن الخير ما يضيع</h2>
  <p style="color:#c9d6e6;font-size:15px;line-height:1.8;margin:8px 0 22px">تطوّع، تبرّع، أو سجّل طفلك في برامجنا — كلّمنا قبل لا يكبر الغرس.</p>
  <a class="cta beige" style="width:100%;margin:0 0 10px" href="tel:${C.config.phone}">اتصل بنا</a>
  <a class="cta" style="width:100%;margin:0 0 10px;background:rgba(255,255,255,.1)" href="${C.config.site}" target="_blank" rel="noopener">gheras.sa</a>
  <a class="cta" style="width:100%;margin:0;background:rgba(255,255,255,.1)" href="${C.config.x}" target="_blank" rel="noopener"><bdi dir="ltr">@GherasSA</bdi></a></div>`
};

/* ================= البحث (Spotlight) ================= */
function openSpot() {
  const s = $("#spot");
  s.innerHTML = `<div class="sbar"><div class="sbox">${sv(P.search)}<input id="spotIn" placeholder="بحث" autocomplete="off"></div><button class="cancel" data-spotx>إلغاء</button></div><div class="res" id="spotRes"></div>`;
  s.classList.add("on");
  spotRender("");
  const i = $("#spotIn"); i.addEventListener("input", () => spotRender(i.value.trim()));
  setTimeout(() => i.focus({ preventScroll: true }), 250);
}
function closeSpot() { const s = $("#spot"); if (s.classList.contains("on")) { s.classList.remove("on"); $("#spotIn") && $("#spotIn").blur(); } }
function spotRender(q) {
  const r = $("#spotRes"); if (!r) return;
  const card = `<div class="ccard">${avatar("gh", "", 46)}<span class="tx"><b>${esc(C.config.firm)}</b><small>جهة اتصال · <bdi dir="ltr">${esc(C.config.phoneTxt)}</bdi></small></span>
    <span class="cbtns"><a href="tel:${C.config.phone}" aria-label="اتصال">${phoneSvg("#fff", 17)}</a><a href="mailto:${C.config.email}" aria-label="بريد">${I.mail(17)}</a></span></div>`;
  if (!q) {
    r.innerHTML = `<div class="sec">اقتراحات Siri</div><div class="apps">${[DOCK[1], APPS[0], DOCK[3], APPS[8]].map(appIcon).join("")}</div>
      <div class="sec">جهات الاتصال</div>${card}
      <div class="sec">جرّب تبحث عن</div><div class="list noi">${["ورشة", "متطوع", "تبرع", "مخيم"].map(w => `<button class="row" data-spotq="${w}">${stroke(P.search, "#8e8e93", 2.2).replace("<svg", '<svg width="16" height="16"')}<span class="tx"><b>${w}</b></span></button>`).join("")}</div>`;
    return;
  }
  const L = s => (s || "").toLowerCase().includes(q.toLowerCase());
  const apps = APPS.concat(DOCK).filter(a => L(a.n));
  const chats = [];
  C.chats.forEach(c => { if (L(c.name)) chats.push({ c, t: lastMsg(c)?.t || "" }); else { const m = msgsOf(c).find(m => L(m.t)); if (m) chats.push({ c, t: m.t }); } });
  const notes = C.notes.filter(n => L(n.title) || L(JSON.stringify(n)));
  const mails = allMails().filter(m => L(m.s) || L(m.from) || L(m.p));
  let h = "";
  if (L(C.config.firm) || L("غراس") || L("أبو سعد") || L("لقيت")) h += `<div class="sec">جهات الاتصال</div>${card}`;
  if (apps.length) h += `<div class="sec">التطبيقات</div><div class="apps">${apps.slice(0, 4).map(appIcon).join("")}</div>`;
  if (chats.length) h += `<div class="sec">واتساب</div><div class="list">${chats.slice(0, 5).map(({ c, t }) => `<button class="row" data-go='["wa","${c.id}"]'>${avatar(c.av, c.init, 34)}<span class="tx"><b>${esc(c.name)}</b><small>${esc(t)}</small></span></button>`).join("")}</div>`;
  if (notes.length) h += `<div class="sec">الملاحظات</div><div class="list">${notes.slice(0, 4).map(n => `<button class="row" data-go='["notes","${n.id}"]'><span class="sq" style="background:#F6C443">${stroke('<path d="M6 3h12v18H6zM9 8h6M9 12h6"/>', "#3a2a00")}</span><span class="tx"><b>${esc(n.title)}</b><small>${esc(noteFirst(n))}</small></span></button>`).join("")}</div>`;
  if (mails.length) h += `<div class="sec">البريد</div><div class="list">${mails.slice(0, 4).map(m => `<button class="row" data-go='["mail","${m.id}"]'><span class="sq" style="background:#1673F0">${I.mail(18)}</span><span class="tx"><b>${esc(m.s)}</b><small>${esc(m.from)}</small></span></button>`).join("")}</div>`;
  r.innerHTML = h || `<p class="hint" style="padding-top:40px">ما فيه نتائج لـ «${esc(q)}»</p>`;
}

/* ================= الورقة والتنبيه ================= */
function openSheet() {
  const cf = C.config, sh = $("#sheet");
  const row = (bg, icon, label, href, ext) => `<a class="row" href="${href}" ${ext ? 'target="_blank" rel="noopener"' : ""}><span class="sq" style="background:${bg}">${icon}</span><span class="tx"><b>${label}</b></span>${chev}</a>`;
  sh.innerHTML = `<div class="pan"><div class="grab"></div>
    <img class="logo" src="assets/logo-white.png" alt="${esc(cf.firm)}">
    <h3>شكراً لأنك لقيته 🤍</h3>
    <p>الجوال يرجع لصاحبه، وأنت لو حبيت تغرس خير مع طفل… تعرف وين تلقانا.</p>
    <div class="list">
      ${row("#30D158", phoneSvg("#fff", 18), cf.phoneTxt, "tel:" + cf.phone)}
      ${row("#0A84FF", stroke('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'), cf.site.replace(/^https?:\/\//, ""), cf.site, 1)}
      ${row("#5E5CE6", I.mail(18), cf.email, "mailto:" + cf.email)}
      ${row("#000", '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.3L1.8 3h6.4l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>', "<bdi dir=\"ltr\">@GherasSA</bdi>", cf.x, 1)}
    </div></div>`;
  requestAnimationFrame(() => sh.classList.add("on"));
}
function alertBox(t, m, actions) {
  const a = document.createElement("div"); a.className = "alert";
  const acts = actions || [{ l: "حسناً", pri: 1 }];
  a.innerHTML = `<div><div class="ab"><b>${t}</b><p>${m}</p></div><div class="aa">${acts.map((x, i) => x.href ? `<a href="${x.href}" class="${x.pri ? "pri" : ""}">${x.l}</a>` : `<button data-ai="${i}" class="${x.pri ? "pri" : ""}">${x.l}</button>`).join("")}</div></div>`;
  a.addEventListener("click", e => { const b = e.target.closest("[data-ai]"); if (b) { a.remove(); acts[+b.dataset.ai].fn && acts[+b.dataset.ai].fn(); } else if (e.target.closest("a") || e.target === a) a.remove(); });
  $("#screen").appendChild(a);
}

/* ================= الأحداث ================= */
document.addEventListener("click", e => {
  const t = e.target;
  if (t.closest("a[href]")) return;
  const go = t.closest("[data-go]");
  if (go) { const [app, sub] = JSON.parse(go.dataset.go); $("#banner").classList.remove("on"); openApp(app, sub); return; }
  const al = t.closest("[data-alarm]"); if (al) { stopAlarm(false, al.dataset.alarm === "snooze"); return; }
  if (t.closest("[data-call]")) { const k = t.closest("[data-call]").dataset.call; if (k === "acc") answerCall(); else endCall(k === "dec"); return; }
  if (t.closest("[data-cb]")) { t.closest("[data-cb]").classList.toggle("on"); return; }
  if (t.closest("[data-sheet]")) { openSheet(); return; }
  if (t.closest("#sheet")) { if (t.id === "sheet" || t.closest(".grab")) $("#sheet").classList.remove("on"); return; }
  if (t.closest("[data-spotx]")) { closeSpot(); return; }
  if (t.closest("[data-spot]")) { openSpot(); return; }
  const sq = t.closest("[data-spotq]"); if (sq) { $("#spotIn").value = sq.dataset.spotq; spotRender(sq.dataset.spotq); return; }
  if (t.closest("#torchBtn")) { t.closest("#torchBtn").classList.toggle("on"); $("#torch").classList.toggle("on"); return; }
  const ap = t.closest("[data-app]"); if (ap) { openApp(ap.dataset.app, ap.dataset.sub, ap.querySelector(".ic") || ap); return; }
  if (t.closest("[data-back]")) { pop(); return; }
  const wf = t.closest("[data-waf]"); if (wf) { waFilter = wf.dataset.waf === "fav" ? "all" : wf.dataset.waf; refreshWAList(); return; }
  const ch = t.closest("[data-chat]"); if (ch) { openChat(ch.dataset.chat); return; }
  const sm = t.closest("[data-sms]"); if (sm) { openSms(sm.dataset.sms); return; }
  const vn = t.closest("[data-voice]"); if (vn) { if (vn.classList.contains("playing")) return; vn.classList.add("playing"); const vt = vn.parentElement.querySelector(".vt");
    setTimeout(() => { vn.classList.remove("playing"); vn.classList.add("played"); if (vt) vt.hidden = false; }, 2600); return; }
  if (t.closest("[data-loc]")) { alertBox("📍 موقع مُشارك", "فتح الخرائط من جوال أبو سعد؟ 🙂 الأفضل تجي لجمعية غراس مباشرة.", [{ l: "إلغاء" }, { l: "الموقع", href: C.config.site, pri: 1 }]); return; }
  const qk = t.closest("[data-quick]"); if (qk) { const c = chatById(live.ctx.chat); c && sendMsg(c, qk.dataset.quick); return; }
  const nt = t.closest("[data-note]"); if (nt) { openNote(nt.dataset.note); return; }
  const ml = t.closest("[data-mail]"); if (ml) { openMail(ml.dataset.mail); return; }
  const fd = t.closest("[data-folder]"); if (fd) { openFolder(fd.dataset.folder === "x" ? "x" : +fd.dataset.folder); return; }
  if (t.closest("[data-locked-file]")) { alertBox("🔒 ملف محمي", "المرفق محمي بكلمة مرور. سرّية العملاء أولاً 🙂"); return; }
  const ph = t.closest("[data-photo]"); if (ph) { openPhoto(+ph.dataset.photo); return; }
  const ck = t.closest("[data-ck]"); if (ck) { const [n, i] = ck.dataset.ck.split(":"); (S.checks[n] ||= {})[i] = !S.checks[n][i]; ck.parentElement.classList.toggle("done"); save(); return; }
  const tg = t.closest("[data-tg]"); if (tg) { if (tg.hasAttribute("data-locked")) { alertBox("ما يصير 🙂", "خصوصية الأطفال مفعّلة دائماً في غراس."); return; } tg.classList.toggle("on"); return; }
  const st = t.closest("[data-set]"); if (st) { openSetting(st.dataset.set); return; }
  if (t.closest("[data-pass]")) { alertBox("رمز الدخول", "لو قلناه لك ما صار سرّ 😄"); return; }
  if (t.closest("[data-shoot]")) { const f = appEl.querySelector(".flash"); f && f.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 450 }); return; }
  const ev = t.closest("[data-ev]"); if (ev) { const e2 = C.events.find(x => x.id === ev.dataset.ev); alertBox(esc(e2.t), esc(e2.s) + " · " + fmtH(e2.h)); return; }
  const pt = t.closest("[data-ptab]"); if (pt) { const k = pt.dataset.ptab; const sc = stack[0].querySelector(".sc"); const v = stack[0];
    const html = k === "key" ? phoneKeypad() : k === "con" || k === "fav" ? phoneContacts() : phoneRecents();
    v.innerHTML = `<div class="sc">${html}</div>`; v.querySelectorAll("[data-pin]").forEach(x => v.appendChild(x)); return; }
  const key = t.closest("[data-key]"); if (key) { if (dialed.length < 14) dialed += key.dataset.key; $("#dial").textContent = dialed; return; }
  if (t.closest("[data-dialcall]")) { alertBox("اتصال", dialed ? `هذا جوال أبو سعد 🙂 تبي تتصل بجمعية غراس بدال ${dialed}؟` : "تبي تتصل بجمعية غراس؟", [{ l: "إلغاء" }, { l: "اتصال", href: "tel:" + C.config.phone, pri: 1 }]); return; }
  const cr = t.closest("[data-callrow]"); if (cr) { const c = allCalls()[+cr.dataset.callrow]; alertBox(esc(c.n), c.n.includes("غراس") ? "جمعية غراس لتنمية الطفل" : "هذا جوال أبو سعد 🙂 إذا لقيته، الأفضل تتصل بجمعية غراس.", [{ l: "إلغاء" }, { l: "اتصل بغراس", href: "tel:" + C.config.phone, pri: 1 }]); return; }
  const wc = t.closest("[data-wacontact]"); if (wc) { const c = C.chats.find(x => x.name === wc.dataset.wacontact); if (c) openApp("wa", c.id); return; }
  if (t.closest("#homebar")) { if (locked()) unlock(); else goHome(); return; }
});
document.addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") { if (e.key === "Escape") e.target.blur(); return; }
  if (e.key === "Escape") { if ($("#sheet").classList.contains("on")) $("#sheet").classList.remove("on"); else if ($("#spot").classList.contains("on")) closeSpot(); else if (appEl.classList.contains("open")) pop(); }
  if ((e.key === "Enter" || e.key === " ") && locked()) unlock();
});
document.addEventListener("visibilitychange", () => { if (!document.hidden && C) schedule(3); });

/* السحب: القفل، الرجوع للرئيسية، إغلاق البانر، البحث */
(function () {
  let y0 = null, x0 = 0, src = null;
  const scr = $("#screen");
  scr.addEventListener("pointerdown", e => {
    if (e.target.closest("input,.composer")) return;
    const r = scr.getBoundingClientRect(), k = r.width / scr.offsetWidth;
    const yy = (e.clientY - r.top) / k;
    y0 = e.clientY; x0 = e.clientX; src = null;
    if (e.target.closest("#banner")) src = "banner";
    else if (locked() && !e.target.closest(".notifs .ntf,.lost a,.circ")) src = "lock";
    else if (yy > scr.offsetHeight - 56 && appEl.classList.contains("open")) src = "app";
    else if (!appEl.classList.contains("open") && !locked() && e.target.closest("#home") && !e.target.closest(".dock")) src = "home";
    else y0 = null;
  });
  scr.addEventListener("pointermove", e => {
    if (y0 === null) return;
    const dy = e.clientY - y0;
    if (src === "lock") { const d = Math.min(0, dy); $("#lock").style.transition = "none"; $("#lock").style.transform = `translateY(${d}px)`; $("#lock").style.opacity = 1 + d / 600; }
    if (src === "app" && dy < 0) { appEl.style.transition = "none"; appEl.style.transformOrigin = "50% 50%"; appEl.style.transform = `scale(${Math.max(.6, 1 + dy / 700)})`; appEl.style.borderRadius = "40px"; }
  });
  const end = e => {
    if (y0 === null) return;
    const dy = e.clientY - y0, dx = e.clientX - x0;
    if (src === "lock") {
      $("#lock").style.transition = ""; $("#lock").style.transform = ""; $("#lock").style.opacity = "";
      if (dy < -70 || (Math.abs(dy) < 6 && Math.abs(dx) < 6 && e.target.closest(".swipe,.lk-bottom,.lk-time"))) unlock();
    } else if (src === "app") {
      const cur = appEl.style.transform;
      appEl.style.transition = ""; appEl.style.transform = ""; appEl.style.borderRadius = ""; appEl.style.transformOrigin = "";
      if (dy < -50) goHome(cur.replace(/scale\(([^)]+)\)/, (m, k) => `translate(${appEl.offsetWidth * (1 - k) / 2}px,${appEl.offsetHeight * (1 - k) / 2}px) scale(${k})`));
    } else if (src === "banner" && dy < -20) { $("#banner").classList.remove("on"); }
    else if (src === "home" && dy > 60 && Math.abs(dx) < 50) openSpot();
    y0 = null; src = null;
  };
  scr.addEventListener("pointerup", end);
  scr.addEventListener("pointercancel", () => { y0 = null; $("#lock").style.transition = ""; $("#lock").style.transform = ""; $("#lock").style.opacity = ""; appEl.style.transform = ""; appEl.style.transition = ""; });
  $("#lock").addEventListener("wheel", e => { if (e.deltaY > 30) unlock(); }, { passive: true });
})();

function fit() {
  const p = $("#phone");
  if (innerWidth <= 500) p.style.transform = "";
  else { const k = Math.min(1, (innerHeight - 32) / 844, (innerWidth - 32) / 390); p.style.transform = `translate(-50%,-50%) scale(${k})`; }
  fitHome();
}
// يصغّر أيقونات الشاشة الرئيسية على الشاشات القصيرة بدل ما تتداخل مع الدوك
function fitHome() {
  const h = $("#home"), g = h && h.querySelector(".grid"); if (!g) return;
  h.style.setProperty("--hk", 1);
  const pill = h.querySelector(".search-pill"), dock = h.querySelector(".dock");
  const cs = getComputedStyle(h), top = parseFloat(cs.paddingTop);
  const avail = h.clientHeight - top - (pill ? pill.offsetHeight + 24 : 0) - (dock ? dock.offsetHeight + parseFloat(getComputedStyle(dock).marginBottom) : 0) - 8;
  const need = g.offsetHeight;
  h.style.setProperty("--hk", Math.max(.62, Math.min(1, avail / need)).toFixed(3));
}
addEventListener("resize", fit); fit();
window.visualViewport && visualViewport.addEventListener("resize", fitHome);
document.fonts && document.fonts.ready.then(fitHome);

/* ================= الإقلاع ================= */
async function loadContent() {
  for (const url of ["content.json"]) {
    try {
      const r = await fetch(url, { cache: "no-cache" });
      if (!r.ok) continue;
      const j = await r.json();
      if (j && j.chats && j.chats.length) return j;
    } catch (e) { }
  }
  throw new Error("no content");
}
function normalize(j) {
  const d = { config: {}, chats: [], drops: [], replies: [], notes: [], mails: [], calls: [], photos: [], events: [], arcs: [], sms: [] };
  for (const k in d) if (j[k]) d[k] = j[k];
  ["notes", "mails", "calls", "photos"].forEach(k => d[k].sort((a, b) => (a.sort || 0) - (b.sort || 0)));
  d.events.sort((a, b) => a.h - b.h);
  return d;
}
(async function boot() {
  try { C = normalize(await loadContent()); }
  catch (e) { $("#loading").innerHTML = '<p style="color:#aaa;font-size:14px">تعذّر تحميل المحتوى</p>'; return; }
  S = loadState(); personalize(); save();
  live.lastCall = Date.now() - 40000;
  renderLock(); renderHome(); tick(); setInterval(tick, 15000);
  $("#loading").classList.add("done");
  schedule(C.config.firstDropSec || 6);
  if (location.hash === "#unlock") unlock();
})();
