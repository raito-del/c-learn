// ============ সেটআপ ============
// টপিক ফাইলগুলো এই তালিকায় যোগ করবে
window.TOPICS = window.TOPICS || [];

const KEY = "cLearnProgress_v3";
let progress = loadProgress();
let currentId = null;

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function loadProgress() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); }
  catch (e) { return {}; }
}
function saveProgress() {
  localStorage.setItem(KEY, JSON.stringify(progress));
}
// একটা টপিকের অগ্রগতি, না থাকলে তৈরি হবে
function getP(id) {
  if (!progress[id]) progress[id] = { mcq: {}, practice: false };
  return progress[id];
}

const sorted = () => [...window.TOPICS].sort((a, b) => a.no - b.no);
const find = id => window.TOPICS.find(t => t.id === id);
const groupNames = () => [...new Set(sorted().map(t => t.group))];

// ============ যাচাই ============
function mcqDone(t) {
  const p = getP(t.id);
  return t.mcq.every((_, i) => p.mcq[i] === true);
}
function isDone(t) {
  return mcqDone(t) && getP(t.id).practice === true;
}
function tabOk(t, key) {
  if (key === "mcq") return mcqDone(t);
  if (key === "practice") return getP(t.id).practice === true;
  return false;
}

// ============ C কোড চালানো (JSCPP) ============
function runC(code, input) {
  let out = "";
  try {
    JSCPP.run(code, input || "", { stdio: { write: s => { out += s; } } });
    return { ok: true, out };
  } catch (e) {
    return { ok: false, out, err: String(e) };
  }
}

// তুলনার জন্য: লাইনের শেষের ফাঁকা ও শেষের নতুন লাইন বাদ
const norm = s => String(s).replace(/\r/g, "").split("\n").map(l => l.trimEnd()).join("\n").trim();

// ============ অগ্রগতি ও নেভিগেশন ============
function updateTopProgress() {
  const total = window.TOPICS.length || 1;
  const n = window.TOPICS.filter(isDone).length;
  $("#fill").style.width = (n / total * 100) + "%";
  $("#ptext").textContent = `${n} / ${window.TOPICS.length} টপিক শেষ`;
}

function renderNav() {
  let html = "";
  groupNames().forEach(g => {
    html += `<div class="group-label">${esc(g)}</div>`;
    sorted().filter(t => t.group === g).forEach(t => {
      const cls = ["item", t.id === currentId ? "active" : "", isDone(t) ? "done" : ""].join(" ");
      html += `<button class="${cls}" data-open="${t.id}">
        <span class="idx">${isDone(t) ? "✓" : t.no}</span>
        <span class="item-text">${esc(t.title)}</span>
      </button>`;
    });
  });
  $("#nav").innerHTML = html;
}

// ============ হোম ============
function renderHome() {
  currentId = null;
  let html = `<section class="hero">
    <h1>সি প্রোগ্রামিং শেখো</h1>
    <p>প্রতিটা টপিকে থিওরি, কোড স্ট্রাকচার, উদাহরণ, MCQ আর প্র্যাকটিস আছে। যেকোনো টপিক যেকোনো সময় খুলতে পারো।</p>
  </section>`;
  groupNames().forEach(g => {
    html += `<div class="group-title">${esc(g)}</div><div class="topic-cards">`;
    sorted().filter(t => t.group === g).forEach(t => {
      html += `<button class="topic-card ${isDone(t) ? "done" : ""}" data-open="${t.id}">
        <span class="k">টপিক ${t.no}${isDone(t) ? " · শেষ" : ""}</span>
        <span class="t">${esc(t.title)}</span>
      </button>`;
    });
    html += `</div>`;
  });
  $("#app").innerHTML = html;
  renderNav();
  updateTopProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ============ টপিক পেজের অংশ ============
const TABS = [
  ["theory", "থিওরি"],
  ["structure", "কোড স্ট্রাকচার"],
  ["example", "উদাহরণ"],
  ["mcq", "MCQ"],
  ["practice", "প্র্যাকটিস"]
];

function theoryHTML(t) {
  return `<div class="card"><h2>থিওরি</h2>${t.theory.map(p => `<p>${esc(p)}</p>`).join("")}</div>`;
}

function structureHTML(t) {
  const rows = t.structure.map(r =>
    `<tr><td><code>${esc(r.code)}</code></td><td>${esc(r.explain)}</td></tr>`).join("");
  return `<div class="card"><h2>কোড স্ট্রাকচার (উপর থেকে নিচে)</h2>
    <table class="struct">${rows}</table></div>`;
}

function exampleHTML(t) {
  return `<div class="card">
    <h2>উদাহরণ</h2>
    <textarea class="editor" id="ecode" spellcheck="false">${esc(t.example.code)}</textarea>
    <div class="hint-row">
      <button class="btn" data-act="erun">Run</button>
      <button class="btn secondary" data-act="ereset">উদাহরণে ফেরত</button>
    </div>
    <pre class="output" id="eout">আউটপুট এখানে দেখাবে</pre>
  </div>`;
}

function mcqHTML(t) {
  const p = getP(t.id);
  return `<div class="card"><h2>MCQ</h2>` + t.mcq.map((q, i) => {
    const done = p.mcq[i] === true;
    return `<div class="q-block">
      <p><b>${i + 1}. ${esc(q.q)}</b></p>
      ${q.opts.map((o, k) => `<label class="opt"><input type="radio" name="mq${i}" value="${k}"> ${esc(o)}</label>`).join("")}
      <button class="btn dark" data-mcq="${i}">উত্তর দাও</button>
      <div id="mres${i}">${done ? `<div class="feedback ok">সঠিক উত্তর। ${esc(q.why)}</div>` : ""}</div>
    </div>`;
  }).join("") + `</div>`;
}

function practiceHTML(t) {
  const pr = t.practice;
  const p = getP(t.id);
  const variants = pr.variants && pr.variants.length
    ? `<div class="hint-row"><span class="status-msg">বিভিন্নভাবে চালাও:</span>
        ${pr.variants.map((v, k) => `<button class="btn secondary" data-variant="${k}">${esc(v.label)}</button>`).join("")}
       </div>` : "";
  return `<div class="card">
    <h2>প্রশ্ন</h2>
    <p>${esc(pr.question)}</p>
    <details class="possible">
      <summary>সম্ভাব্য আউটপুট দেখো</summary>
      <ul>${pr.outputs.map(o => `<li><code>${esc(o).replace(/\n/g, " ⏎ ")}</code></li>`).join("")}</ul>
    </details>
    ${variants}
    <h2 style="margin-top:18px">তোমার কোড</h2>
    <textarea class="editor" id="pcode" spellcheck="false">${esc(pr.starter || "")}</textarea>
    <p style="margin-top:10px">ইনপুট (যদি লাগে):</p>
    <textarea class="stdin" id="pin">${esc(pr.input || "")}</textarea>
    <div class="hint-row">
      <button class="btn" data-act="prun">Run</button>
      <button class="btn dark" data-act="pcheck">Check</button>
      <button class="btn secondary" data-act="preset">শুরুর কোডে ফেরত</button>
    </div>
    <pre class="output" id="pout">আউটপুট এখানে দেখাবে</pre>
    <div id="pres">${p.practice ? `<div class="feedback ok">এই প্র্যাকটিস আগেই সঠিকভাবে শেষ হয়েছে।</div>` : ""}</div>
  </div>`;
}

function renderTopic(id) {
  const t = find(id);
  if (!t) return;
  currentId = id;
  $("#app").innerHTML = `
    <div class="crumb">${esc(t.group)} · টপিক ${t.no}</div>
    <header class="page-head"><h1>${esc(t.title)}</h1><p>${esc(t.lead)}</p></header>
    <nav class="tabs">
      ${TABS.map(([k, l], i) => `<button class="tab ${i === 0 ? "on" : ""} ${tabOk(t, k) ? "ok" : ""}" data-tab="${k}">${i + 1}. ${l}</button>`).join("")}
    </nav>
    <section class="panel on" data-panel="theory">${theoryHTML(t)}</section>
    <section class="panel" data-panel="structure">${structureHTML(t)}</section>
    <section class="panel" data-panel="example">${exampleHTML(t)}</section>
    <section class="panel" data-panel="mcq">${mcqHTML(t)}</section>
    <section class="panel" data-panel="practice">${practiceHTML(t)}</section>
    <footer class="footer-nav" id="foot"></footer>`;
  renderFooter(t);
  renderNav();
  updateTopProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
  document.querySelectorAll(".panel").forEach(p => p.classList.toggle("on", p.dataset.panel === name));
}

function updateTabs(t) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("ok", tabOk(t, b.dataset.tab)));
}

function renderFooter(t) {
  const foot = $("#foot");
  if (!foot) return;
  if (!isDone(t)) {
    foot.innerHTML = `<span class="status-msg">সব MCQ ঠিক করলে এবং প্র্যাকটিস পাস করলে এই টপিক শেষ হবে।</span>`;
    return;
  }
  const list = sorted();
  const i = list.findIndex(x => x.id === t.id);
  const next = list[i + 1];
  foot.innerHTML = next
    ? `<span class="status-msg good">টপিক শেষ। পরের টপিক খুলে গেছে।</span>
       <button class="btn" data-next="${next.id}">পরের টপিক</button>`
    : `<span class="status-msg good">সব টপিক শেষ। অভিনন্দন!</span>`;
}

function refreshTopic(t) {
  saveProgress();
  updateTabs(t);
  renderFooter(t);
  renderNav();
  updateTopProgress();
}

// ============ কাজের ফাংশন ============
function runExample() {
  const t = find(currentId);
  const res = runC($("#ecode").value, "");
  const out = $("#eout");
  if (res.ok) {
    out.textContent = res.out || "(কোনো আউটপুট নেই)";
    out.classList.remove("err");
  } else {
    out.textContent = (res.out ? res.out + "\n" : "") + "Error: " + res.err;
    out.classList.add("err");
  }
}

function checkMcq(i) {
  const t = find(currentId);
  const q = t.mcq[i];
  const sel = document.querySelector(`input[name="mq${i}"]:checked`);
  const res = $("#mres" + i);
  const p = getP(t.id);
  if (!sel) {
    res.innerHTML = `<div class="feedback info">আগে একটা উত্তর বেছে নাও।</div>`;
    return;
  }
  if (Number(sel.value) === q.ans) {
    p.mcq[i] = true;
    res.innerHTML = `<div class="feedback ok">সঠিক উত্তর। ${esc(q.why)}</div>`;
  } else {
    p.mcq[i] = false;
    res.innerHTML = `<div class="feedback bad">ভুল উত্তর। আবার ভেবে দেখো।</div>`;
  }
  refreshTopic(t);
}

function runPractice(input) {
  const code = $("#pcode").value;
  const res = runC(code, input !== undefined ? input : $("#pin").value);
  const out = $("#pout");
  if (res.ok) {
    out.textContent = res.out || "(কোনো আউটপুট নেই)";
    out.classList.remove("err");
  } else {
    out.textContent = (res.out ? res.out + "\n" : "") + "Error: " + res.err;
    out.classList.add("err");
  }
  return res;
}

function checkPractice() {
  const t = find(currentId);
  const pr = t.practice;
  const res = runPractice();
  const box = $("#pres");
  const p = getP(t.id);

  if (!res.ok) {
    box.innerHTML = `<div class="feedback bad">কোডে এরর আছে। উপরের আউটপুট দেখো।</div>`;
    return;
  }
  const got = norm(res.out);
  const matched = pr.outputs.some(o => norm(o) === got);
  if (matched) {
    p.practice = true;
    box.innerHTML = `<div class="feedback ok">ঠিক! তোমার আউটপুট সম্ভাব্য আউটপুটের সাথে মিলেছে।</div>`;
  } else {
    p.practice = false;
    box.innerHTML = `<div class="feedback bad">ভুল, আউটপুট মিলছে না। তোমার আউটপুট: ${esc(got || "(কিছু নেই)")}</div>`;
  }
  refreshTopic(t);
}

// ============ ইভেন্ট ============
$("#home").addEventListener("click", renderHome);

$("#nav").addEventListener("click", e => {
  const b = e.target.closest("[data-open]");
  if (b) renderTopic(b.dataset.open);
});

$("#app").addEventListener("click", e => {
  const t = find(currentId);

  const open = e.target.closest("[data-open]");
  if (open) return renderTopic(open.dataset.open);

  const next = e.target.closest("[data-next]");
  if (next) return renderTopic(next.dataset.next);

  const tab = e.target.closest("[data-tab]");
  if (tab) return switchTab(tab.dataset.tab);

  const mcq = e.target.closest("[data-mcq]");
  if (mcq) return checkMcq(Number(mcq.dataset.mcq));

  const variant = e.target.closest("[data-variant]");
  if (variant && t.practice.variants) {
    const v = t.practice.variants[Number(variant.dataset.variant)];
    $("#pin").value = v.input || "";
    return runPractice(v.input || "");
  }

  const act = e.target.closest("[data-act]");
  if (!act) return;
  switch (act.dataset.act) {
    case "erun": return runExample();
    case "ereset": $("#ecode").value = t.example.code; return;
    case "prun": return runPractice();
    case "pcheck": return checkPractice();
    case "preset": $("#pcode").value = t.practice.starter || ""; return;
  }
});

// ============ শুরু ============
renderHome();