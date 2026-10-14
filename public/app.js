/* Webseiten-Werkstatt – Schülerseite */
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const ORIGIN = location.origin;
  const fill = s => (s || "").split("{{ORIGIN}}").join(ORIGIN);
  const time = d => new Date(d).toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  async function api(path, data) {
    let r;
    try { r = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) }); }
    catch (e) { throw new Error("Keine Verbindung zum Server. Ist das Internet da?"); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Unbekannter Fehler (" + r.status + ")");
    return j;
  }
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("show"), 2600); }

  let me = null;
  const files = { html: "", css: "" };
  const P0 = () => ({ manual: {}, done: {}, mini: {}, stage: {}, last: "s01", training: 0, max: 1, thema: "" });
  let progress = P0();
  let cur = "html", view = "station", stIdx = 0, xray = false;
  let cm, docs = {}, ctx = null, dirty = false, saveT = null, refreshT = null, previewY = 0;

  /* ================= Anmeldung ================= */
  let mode = "new";
  function setMode(m) {
    mode = m;
    $("#m-new").classList.toggle("on", m === "new"); $("#m-old").classList.toggle("on", m === "old");
    $("#l-pin2-wrap").hidden = m !== "new";
    $("#l-pin-lbl").textContent = m === "new" ? "Denk dir eine PIN aus (4 Ziffern)" : "Deine PIN (4 Ziffern)";
    $("#l-go").textContent = m === "new" ? "Konto anlegen" : "Anmelden";
    $("#l-msg").textContent = "";
  }
  $("#m-new").onclick = () => setMode("new");
  $("#m-old").onclick = () => setMode("old");
  try {
    const l = JSON.parse(localStorage.getItem("ww-last") || "{}");
    $("#l-kurs").value = l.kurs || ""; $("#l-nick").value = l.nick || "";
    setMode(l.nick ? "old" : "new");
  } catch (e) { setMode("new"); }
  const form = () => ({ kurs: $("#l-kurs").value.trim(), nick: $("#l-nick").value.trim(), pin: $("#l-pin").value.trim() });
  async function doLogin() {
    const f = form(), register = mode === "new", msg = $("#l-msg");
    msg.textContent = "";
    if (!f.kurs || !f.nick || !/^\d{4}$/.test(f.pin)) { msg.textContent = "Bitte Klasse, Vorname und eine vierstellige PIN eingeben."; return; }
    if (register && $("#l-pin2").value.trim() !== f.pin) { msg.textContent = "Die beiden PINs sind nicht gleich. Bitte noch einmal eingeben."; return; }
    try {
      const data = await api(register ? "/api/register" : "/api/login", f);
      try { localStorage.setItem("ww-last", JSON.stringify({ kurs: f.kurs, nick: data.nick })); } catch (e) {}
      try { sessionStorage.setItem("ww-session", JSON.stringify({ ...f, nick: data.nick })); } catch (e) {}
      start({ ...f, nick: data.nick }, data);
      if (register) toast(`👋 Willkommen, ${data.nick}! Merk dir deine PIN.`);
    } catch (e) {
      if (!register && /PIN stimmt nicht/.test(e.message))
        msg.textContent = `Die PIN stimmt nicht. Falls du neu bist: Den Namen „${f.nick}“ gibt es in dieser Klasse schon – wähle oben „Ich bin neu“ und hänge den ersten Buchstaben deines Nachnamens an (z. B. „${f.nick} M.“).`;
      else if (!register && /gibt es in deiner Klasse noch nicht/.test(e.message))
        msg.textContent = `Den Namen „${f.nick}“ gibt es in dieser Klasse noch nicht. Bist du neu? Dann wähle oben „Ich bin neu“. Sonst prüfe die Schreibweise.`;
      else msg.textContent = e.message;
    }
  }
  $("#login-form").addEventListener("submit", e => { e.preventDefault(); doLogin(); });
  (async () => {
    let s = null; try { s = JSON.parse(sessionStorage.getItem("ww-session") || "null"); } catch (e) {}
    if (!s) return;
    try { start(s, await api("/api/login", s)); } catch (e) { sessionStorage.removeItem("ww-session"); }
  })();

  /* ================= Start ================= */
  function start(who, data) {
    me = { kurs: who.kurs, nick: who.nick, pin: who.pin };
    files.html = data.html; files.css = data.css; shareToken = data.share || null;
    progress = Object.assign(P0(), data.progress || {});
    if (!progress.stage) progress.stage = {};
    // Lokale Sicherung neuer als Server? (z. B. nach Verbindungsabbruch)
    try {
      const b = JSON.parse(localStorage.getItem(backupKey()) || "null");
      if (b && b.t > Date.parse(data.updated_at || 0) && (b.html !== data.html || b.css !== data.css) &&
          confirm("Auf diesem Computer gibt es einen neueren, nicht gespeicherten Stand deiner Seite. Wiederherstellen?")) {
        files.html = b.html; files.css = b.css; dirty = true;
      }
    } catch (e) {}
    $("#login").hidden = true; $("#app").hidden = false;
    $("#me-name").textContent = me.nick;
    initEditor();
    stIdx = Math.max(0, ALLE.findIndex(s => s.id === progress.last));
    applyUnlocks(true);
    refresh(true);
    show("station");
    setInterval(() => { if (dirty) save(); }, 30000);
    if (dirty) scheduleSave();
  }
  const backupKey = () => `ww-backup-${me.kurs}-${me.nick.toLowerCase()}`;

  /* ================= Editor ================= */
  function initEditor() {
    docs.html = CodeMirror.Doc(files.html, "htmlmixed");
    docs.css = CodeMirror.Doc(files.css, "css");
    cm = CodeMirror($("#editor"), {
      value: docs.html, lineNumbers: true, lineWrapping: true, tabSize: 2, indentUnit: 2,
      autoCloseTags: true, autoCloseBrackets: true, matchTags: { bothTags: true }, styleActiveLine: true,
      extraKeys: { Tab: c => c.execCommand("insertSoftTab"), "Ctrl-S": () => { save(true); }, "Cmd-S": () => { save(true); } }
    });
    cm.swapDoc(docs.html);
    cm.on("change", () => {
      files[cur] = cm.getValue();
      dirty = true; setSave("✏️ geändert");
      scheduleSave();
      clearTimeout(refreshT); refreshT = setTimeout(refresh, 350);
    });
    $$(".files button").forEach(b => b.onclick = () => switchFile(b.dataset.file));
    $("#t-xray").onclick = () => { xray = !xray; $("#t-xray").classList.toggle("on", xray); renderPreview(); };
    $("#t-big").onclick = () => { $("#split").classList.toggle("big"); $("#t-big").classList.toggle("on"); cm.refresh(); };
    $("#t-more").onclick = e => { e.stopPropagation(); $("#more-menu").hidden = !$("#more-menu").hidden; };
    document.addEventListener("click", e => { if (!e.target.closest(".more")) $("#more-menu").hidden = true; });
    $("#t-versions").onclick = () => { $("#more-menu").hidden = true; versions(); };
    $("#t-download").onclick = () => { $("#more-menu").hidden = true; download(); };
    $("#t-import").onclick = () => { $("#more-menu").hidden = true; importDlg(); };
    $("#t-share").onclick = shareDlg;
    $("#detective").onclick = () => { const l = $("#detective-list"); l.hidden = !l.hidden; $("#detective").setAttribute("aria-expanded", String(!l.hidden)); };
    $("#logout").onclick = async () => { await save(true); sessionStorage.removeItem("ww-session"); location.reload(); };
    document.addEventListener("keydown", e => { if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); save(true); } });
    window.addEventListener("beforeunload", e => {
      if (!dirty) return;
      fetch("/api/save", { method: "POST", keepalive: true, headers: { "content-type": "application/json" }, body: JSON.stringify({ ...me, ...files, progress }) });
      e.preventDefault(); e.returnValue = "";
    });
    window.addEventListener("message", e => {
      if (e.source === $("#preview").contentWindow && e.data && e.data.ww === "scroll") previewY = e.data.y;
    });
    $("#preview").addEventListener("load", () => { try { $("#preview").contentWindow.postMessage({ ww: "restore", y: previewY }, "*"); } catch (e) {} });
  }
  /* ================= Schrittweise freischalten ================= */
  let unlocked = {};
  const cssCustom = () => files.css.replace(/\/\*[\s\S]*?\*\//g, "").trim().length > 0;
  function applyUnlocks(silent) {
    const max = progress.max || 1, s = ALLE[stIdx];
    const now = { editor: max >= 2, css: max >= 8 || cssCustom(), xray: max >= 11 };
    const solo = !now.editor || (view === "station" && s && s.special === "s01");
    const wasSolo = $("#split").classList.contains("solo");
    $("#split").classList.toggle("solo", solo);
    $(".files button[data-file=css]").hidden = !now.css;
    $("#t-xray").hidden = !now.xray;
    if (!now.css && cur === "css") switchFile("html");
    if (!silent) {
      if (now.editor && !unlocked.editor) {
        if (progress.thema && /<h1>\s*Mein Thema\s*<\/h1>/.test(files.html)) {
          const t = esc(progress.thema.trim());
          setFiles(files.html.replace(/<h1>\s*Mein Thema\s*<\/h1>/, `<h1>${t}</h1>`), files.css);
        }
        toast("🎉 Neu: Rechts ist jetzt deine eigene Webseite!");
      } else if (now.css && !unlocked.css) toast("🎉 Neu freigeschaltet: style.css");
      else if (now.xray && !unlocked.xray) toast("🔍 Neu freigeschaltet: Röntgenblick");
    }
    unlocked = now;
    if (wasSolo && !solo && cm) setTimeout(() => cm.refresh(), 30);
  }

  function switchFile(f) {
    cur = f; cm.swapDoc(docs[f]);
    $$(".files button").forEach(b => b.classList.toggle("on", b.dataset.file === f));
    markLines(); cm.focus();
  }
  function setFiles(html, css) {
    files.html = html; files.css = css;
    docs.html.setValue(html); docs.css.setValue(css);
    dirty = true; refresh();
  }

  /* ================= Speichern ================= */
  function setSave(t, bad) { const s = $("#save-state"); s.textContent = t; s.classList.toggle("bad", !!bad); }
  function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(save, 2500); }
  async function save(force, extra = {}) {
    if (!me || (!dirty && !force)) return;
    clearTimeout(saveT);
    try { localStorage.setItem(backupKey(), JSON.stringify({ t: Date.now(), ...files })); } catch (e) {}
    setSave("💾 speichert …");
    try {
      await api("/api/save", { ...me, ...files, progress, ...extra });
      dirty = false; setSave("✓ gespeichert " + new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }));
      if (force === true) toast("✓ Gespeichert");
    } catch (e) {
      setSave("⚠️ nicht gespeichert!", true);
      toast("⚠️ " + e.message + " Dein Stand ist auf diesem PC zwischengespeichert.");
      saveT = setTimeout(save, 15000);
    }
  }

  /* ================= Analyse, Vorschau, Fehler-Detektiv ================= */
  function refresh(first) {
    ctx = W.analyze(files.html, files.css);
    renderPreview();
    renderDetective();
    updateDone();
    if (view === "station") updateTasks();
    if (view === "map" && !first) renderMap();
    if (view === "note" && !first) renderNote();
    updatePicker();
  }
  function renderPreview() {
    const doc = W.previewDoc(files.html, files.css, { xray });
    const f = $("#preview");
    if (f.srcdoc !== doc) f.srcdoc = doc;
    const t = ctx && ctx.doc.querySelector("title");
    $("#pv-title").textContent = t ? "Tab-Titel: " + t.textContent.trim() : "";
  }
  function renderDetective() {
    const errs = ctx.lint.filter(e => e.level === "error"), warns = ctx.lint.filter(e => e.level !== "error");
    const d = $("#detective");
    d.className = "detective" + (errs.length ? " has-err" : warns.length ? " has-warn" : "");
    d.textContent = errs.length || warns.length
      ? `🕵️ Fehler-Detektiv: ${errs.length} Fehler${warns.length ? ` · ${warns.length} Hinweis${warns.length > 1 ? "e" : ""}` : ""} – anklicken für Details`
      : "🕵️ Fehler-Detektiv: Ich finde keinen Fehler. 👍";
    const list = $("#detective-list");
    list.innerHTML = [...errs, ...warns].map((e, i) =>
      `<button data-i="${i}"><span>${e.level === "error" ? "🔴" : "🟡"}</span><span class="where">${e.file === "css" ? "style.css" : "index.html"} · Zeile ${e.line}</span><span>${esc(e.msg)}</span></button>`).join("");
    const all = [...errs, ...warns];
    list.querySelectorAll("button").forEach(b => b.onclick = () => {
      const e = all[+b.dataset.i];
      switchFile(e.file === "css" ? "css" : "html");
      cm.setCursor({ line: Math.max(0, e.line - 1), ch: 0 }); cm.scrollIntoView(null, 80); cm.focus();
    });
    if (!all.length) list.hidden = true;
    markLines();
  }
  let marked = [];
  function markLines() {
    marked.forEach(([d, l, c]) => { try { d.removeLineClass(l, "background", c); } catch (e) {} });
    marked = [];
    if (!ctx) return;
    ctx.lint.filter(e => (e.file === "css" ? "css" : "html") === cur).forEach(e => {
      const c = e.level === "error" ? "cm-err-line" : "cm-warn-line", l = Math.max(0, e.line - 1);
      if (l < docs[cur].lineCount()) { docs[cur].addLineClass(l, "background", c); marked.push([docs[cur], l, c]); }
    });
  }

  /* ================= Stationen ================= */
  const safe = (fn, c) => { try { return !!fn(c, progress); } catch (e) { return false; } };
  const taskOk = (s, i, c) => s.pflicht[i].check ? safe(s.pflicht[i].check, c) : !!progress.manual[`${s.id}-${i}`];
  const bonusOk = (s, i, c) => s.bonus[i].check ? safe(s.bonus[i].check, c) : !!progress.manual[`${s.id}-b${i}`];
  const isDone = (s, c = ctx) => s.pflicht.every((_, i) => taskOk(s, i, c));
  function updateDone() {
    let changed = false;
    ALLE.forEach(s => {
      const d = isDone(s);
      if (d && !progress.done[s.id]) { progress.done[s.id] = new Date().toISOString(); changed = true; if (view === "station" && ALLE[stIdx] === s) toast(`🎉 Station ${s.nr} geschafft!`); }
      if (!d && progress.done[s.id]) { delete progress.done[s.id]; changed = true; }
    });
    if (changed) { dirty = true; scheduleSave(); }
  }

  function show(v) {
    if (!ctx) return;
    view = v;
    applyUnlocks();
    $$(".views button").forEach(b => b.classList.toggle("on", b.dataset.view === v));
    $("#learn").scrollTop = 0;
    ({ station: renderStation, map: renderMap, note: renderNote, spick: renderSpick, tasten: renderTasten })[v]();
  }
  $$(".views button").forEach(b => b.onclick = () => show(b.dataset.view));
  $("#st-prev").onclick = () => goStation(stIdx - 1);
  $("#st-next").onclick = () => goStation(stIdx + 1);
  $("#st-pick").onclick = picker;
  function goStation(i) {
    if (i < 0 || i >= ALLE.length) return;
    stIdx = i; progress.last = ALLE[i].id;
    progress.max = Math.max(progress.max || 1, ALLE[i].profi ? 8 : ALLE[i].nr);
    dirty = true; scheduleSave();
    show("station"); updatePicker();
  }
  function updatePicker() { const s = ALLE[stIdx]; $("#st-pick").textContent = `${progress.done[s.id] ? "✅" : s.icon} ${s.profi ? "Profi " + s.nr : "Station " + s.nr}: ${s.titel}`; }

  let sb = null; // Ausprobier-Bereich
  function renderStation() {
    const s = ALLE[stIdx], L = $("#learn");
    const special = s.special === "s01";
    const stageMax = special ? 2 : s.beispiel ? 2 : 1;
    let stage = Math.min(stageMax, progress.done[s.id] ? stageMax : (progress.stage[s.id] || 0));
    const task = (t, ok, key, auto) => `<li class="${ok ? "done" : ""}" data-key="${key}">
      ${auto ? `<span class="st">${ok ? "✓" : ""}</span>` : `<input type="checkbox" data-manual="${key}" ${ok ? "checked" : ""}>`}
      <span>${esc(t)}</span>${auto ? `<span class="auto">wird automatisch geprüft</span>` : ""}</li>`;
    const unfold = (label, next) => `<div class="unfold"><button class="btn primary" data-unfold="${next}">${label}</button></div>`;
    const mine = `<section class="card ${stage === stageMax ? "new" : ""}" id="sec-mine"><h2>${special ? "💡 Dein Thema" : "🛠️ Für deine Seite"}</h2>
        ${special ? `<p>Über welches Thema möchtest du deine Webseite bauen? Du kannst es später noch ändern.</p>
          <div class="thema-input"><input id="thema" maxlength="60" placeholder="z. B. Mein Haustier Bello" value="${esc(progress.thema || "")}"></div>
          <div class="themen">${THEMEN.map(t => `<span data-t="${esc(t.replace(/^\S+\s/, ""))}">${t}</span>`).join("")}</div>
          <p class="muted" style="margin-top:8px">Klick ein Thema an – oder schreib dein eigenes.</p>` : ""}
        <h3 class="sub">Pflicht <span class="badge" id="pf-count"></span></h3>
        <ul class="tasks">${s.pflicht.map((p, i) => task(p.t, false, `${s.id}-${i}`, !!p.check)).join("")}</ul>
        ${s.bonus.length ? `<details class="bonus"><summary>⭐ Bonus – für alle, die schneller sind (${s.bonus.length})</summary>
        <ul class="tasks">${s.bonus.map((p, i) => task(p.t, false, `${s.id}-b${i}`, !!p.check)).join("")}</ul></details>` : ""}
      </section>
      <div class="st-foot">
        <button class="btn" id="foot-prev" ${stIdx === 0 ? "disabled" : ""}>← Zurück</button>
        <button class="btn primary" id="foot-next" ${stIdx === ALLE.length - 1 ? "disabled" : ""}>Nächste Station →</button>
      </div>`;
    let body = "";
    if (special) {
      if ((progress.max || 1) < 2) body += `<div class="locked-hint" style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <span>💾 Du hast schon in CodePen an deiner Seite gearbeitet? Dann übernimm deinen Code – danach geht es dort weiter, wo du warst.</span>
        <button class="btn primary" id="s01-import">📥 Code übernehmen</button></div>`;
      body += S01.flow;
      body += stage === 0 ? unfold("Verstanden – weiter: Woraus besteht eine Webseite? ↓", 1) : S01.parts + (stage === 1 ? unfold("Weiter: Dein Thema ↓", 2) : "");
      if (stage >= 2) body += mine;
    } else {
      body += `<section class="card"><h2>📖 Verstehen</h2>${fill(s.lernen)}</section>`;
      if (stage === 0) body += unfold(s.beispiel ? "✓ Verstanden – jetzt ausprobieren ↓" : "✓ Verstanden – weiter zu deiner Seite ↓", 1);
      if (s.beispiel && stage >= 1) {
        body += `<section class="card ${stage === 1 ? "new" : ""}" id="sec-try"><h2>🧪 Ausprobieren</h2>
        <p class="auftrag">✏️ ${esc(s.beispiel.aufgabe)}</p>
        <div class="sandbox">
          <div class="sb-bar"><button class="tab on" data-sb="html">📄 HTML</button><button class="tab" data-sb="css">🎨 CSS</button><span class="sp"></span>
            <label><input type="checkbox" id="sb-nocss"> CSS aus</label><button class="btn small" id="sb-reset">↺ Zurücksetzen</button></div>
          <div class="sb-edit" id="sb-edit"></div>
          <iframe class="sb-prev" id="sb-prev" sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" title="Beispiel-Vorschau"></iframe>
        </div>
        <div class="mini" id="mini">○ Die Aufgabe ist noch nicht gelöst.</div></section>`;
        if (stage === 1) body += unfold("Weiter: Jetzt an deiner eigenen Seite ✨ ↓", 2);
      }
      if (stage >= stageMax) body += mine;
    }
    L.innerHTML = `
      <div class="st-head">
        <div class="st-kicker"><span>${s.profi ? "⭐ Profi-Pfad · " + s.nr : "Station " + s.nr + " von 16"}</span><span>·</span><span>${s.phase}</span></div>
        <h1>${s.icon} ${s.titel}</h1>
        <p class="ziel">🎯 ${s.ziel}</p>
      </div>
      ${progress.done[s.id] ? `<div class="done-banner">✅ Alle Pflicht-Aufgaben dieser Station sind erledigt.</div>` : ""}
      ${body}`;
    L.querySelectorAll("[data-unfold]").forEach(b => b.onclick = () => {
      progress.stage[s.id] = +b.dataset.unfold; dirty = true; scheduleSave();
      renderStation();
      const n = L.querySelector(".card.new"); if (n) n.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const fp = $("#foot-prev"); if (fp) fp.onclick = () => goStation(stIdx - 1);
    const fn = $("#foot-next"); if (fn) fn.onclick = () => goStation(stIdx + 1);
    L.querySelectorAll("[data-manual]").forEach(c => c.onchange = () => {
      progress.manual[c.dataset.manual] = c.checked; dirty = true; scheduleSave(); updateDone(); updateTasks();
    });
    if (special) { initS01(stage); const ib = $("#s01-import"); if (ib) ib.onclick = importDlg; }
    if (s.beispiel && stage >= 1) initSandbox(s);
    if (s.id === "s16" && stage >= 1) initTraining();
    updateTasks();
  }

  /* ---------- Station 1: interaktiv, ohne Editor ---------- */
  const FOX_HTML = `<h1>🦊 Der Rotfuchs</h1>
<p class="intro">Füchse leben fast überall in Europa – sogar mitten in Bremen.</p>
<h2>Steckbrief</h2>
<ul>
  <li>Größe: bis 90 cm</li>
  <li>Nahrung: Mäuse, Beeren, Insekten</li>
</ul>`;
  const FOX_CSS = `body {
  font-family: Georgia, serif;
  background-color: #fff7ed;
  padding: 20px;
}
h1 {
  color: #c2410c;
}
.intro {
  font-size: 20px;
  border-left: 5px solid #fb923c;
  padding-left: 10px;
}`;
  const S01 = {
    flow: `<section class="card"><h2>🌐 Was passiert, wenn du eine Webseite öffnest?</h2>
      <p>Klick dich Schritt für Schritt durch:</p>
      <div class="steps-flow" id="flow">
        <div class="on"><span class="big">⌨️</span><b>1. Adresse eintippen</b><small>Du gibst z. B. <b>wikipedia.org</b> in den Browser ein.</small></div>
        <div><span class="big">📨</span><b>2. Anfrage</b><small>Dein Browser fragt über das Internet einen <b>Server</b> – einen Computer, auf dem die Seite liegt.</small></div>
        <div><span class="big">📦</span><b>3. Dateien kommen zurück</b><small>Der Server schickt Dateien: <b>HTML</b> (Inhalt), <b>CSS</b> (Design) und Bilder.</small></div>
        <div><span class="big">🖥️</span><b>4. Der Browser baut</b><small>Aus diesen Dateien setzt dein Browser die Seite zusammen, die du siehst.</small></div>
      </div>
      <div class="unfold" style="margin:0"><button class="btn" id="flow-next">Nächster Schritt ▸</button></div></section>`,
    parts: `<section class="card new" id="sec-parts"><h2>🧱 Woraus besteht eine Webseite?</h2>
      <p>Jede Webseite hat zwei Seiten – wie ein Haus: den <b>Bauplan</b> (was steht wo?) und die <b>Einrichtung</b> (wie sieht es aus?).</p>
      <div class="toggles"><button id="tg-css" class="on">🎨 Design (CSS) an</button><button id="tg-html">📄 Bauplan (HTML) zeigen</button><button id="tg-csscode">🎨 Design-Code zeigen</button></div>
      <div class="demo one" id="demo"><iframe sandbox="allow-scripts" id="demo-frame" title="Beispielseite"></iframe><pre class="code" id="demo-code" hidden></pre></div>
      <div class="duo" style="margin-top:12px">
        <div><h4>📄 HTML = Inhalt & Aufbau</h4><p style="margin:0">Überschriften, Texte, Bilder, Links. Wie der Rohbau eines Hauses.</p></div>
        <div><h4>🎨 CSS = Aussehen</h4><p style="margin:0">Farben, Schriften, Abstände. Wie Farbe und Einrichtung.</p></div>
      </div>
      <details class="more-info"><summary>👀 Bei jeder echten Webseite nachsehen</summary><p style="margin:0">Öffne irgendeine Webseite und drücke <kbd>Strg</kbd> + <kbd>U</kbd>. Dann siehst du den <b>Quelltext</b> – das HTML, das dein Browser bekommen hat.</p></details>
      <h3 class="sub">🧩 HTML oder CSS?</h3>
      <div class="sortq" id="sortq"></div></section>`
  };
  function initS01(stage) {
    let step = 0;
    const items = $$("#flow > div");
    if (stage > 0) { items.forEach(x => x.classList.add("on")); $("#flow-next").parentElement.hidden = true; }
    $("#flow-next").onclick = () => {
      step = Math.min(items.length - 1, step + 1); items[step].classList.add("on");
      if (step === items.length - 1) $("#flow-next").parentElement.hidden = true;
    };
    if (stage >= 1) {
      let css = true, showHtml = false, showCss = false;
      const draw = () => {
        $("#demo-frame").srcdoc = W.previewDoc(FOX_HTML, FOX_CSS, { noCss: !css });
        const code = $("#demo-code");
        code.hidden = !(showHtml || showCss);
        code.textContent = showHtml ? FOX_HTML : FOX_CSS;
        $("#demo").classList.toggle("one", code.hidden);
        $("#tg-css").textContent = css ? "🎨 Design (CSS) an" : "🎨 Design (CSS) aus";
        $("#tg-css").classList.toggle("on", css);
        $("#tg-html").classList.toggle("on", showHtml);
        $("#tg-csscode").classList.toggle("on", showCss);
      };
      $("#tg-css").onclick = () => { css = !css; draw(); };
      $("#tg-html").onclick = () => { showHtml = !showHtml; showCss = false; draw(); };
      $("#tg-csscode").onclick = () => { showCss = !showCss; showHtml = false; draw(); };
      draw();
      const Q = [["Die Überschrift soll rot werden.", "css"], ["Ein Foto von einem Fuchs soll dazukommen.", "html"], ["Zwischen den Absätzen soll mehr Abstand sein.", "css"],
        ["Es soll ein Link zu Wikipedia dazukommen.", "html"], ["Die ganze Seite soll einen hellblauen Hintergrund bekommen.", "css"], ["Ein neuer Abschnitt „Lebensraum“ soll dazukommen.", "html"]];
      $("#sortq").innerHTML = Q.map(([t], i) => `<div class="q" data-i="${i}"><span>${t}</span><button data-a="html">📄 HTML</button><button data-a="css">🎨 CSS</button></div>`).join("");
      $$("#sortq .q button").forEach(b => b.onclick = () => {
        const q = b.closest(".q"), ok = Q[+q.dataset.i][1] === b.dataset.a;
        q.classList.remove("right", "wrong"); q.classList.add(ok ? "right" : "wrong");
      });
    }
    if (stage >= 2) {
      const inp = $("#thema");
      const set = v => { progress.thema = v; dirty = true; scheduleSave(); updateDone(); updateTasks(); };
      inp.oninput = () => set(inp.value);
      $$(".themen span").forEach(sp => sp.onclick = () => { inp.value = sp.dataset.t; set(inp.value); });
    }
  }
  function updateTasks() {
    const s = ALLE[stIdx];
    if (!s || !ctx) return;
    let n = 0;
    s.pflicht.forEach((_, i) => { const ok = taskOk(s, i, ctx); n += ok; mark(`${s.id}-${i}`, ok); });
    s.bonus.forEach((_, i) => mark(`${s.id}-b${i}`, bonusOk(s, i, ctx)));
    const pc = $("#pf-count"); if (pc) { pc.textContent = `${n} von ${s.pflicht.length}`; pc.classList.toggle("ok", n === s.pflicht.length); }
  }
  function mark(key, ok) {
    const li = $(`.tasks li[data-key="${key}"]`); if (!li) return;
    li.classList.toggle("done", ok);
    const st = li.querySelector(".st"); if (st) st.textContent = ok ? "✓" : "";
  }

  function initSandbox(s) {
    sb = { html: fill(s.beispiel.html), css: fill(s.beispiel.css), tab: "html" };
    const ed = CodeMirror($("#sb-edit"), { value: sb.html, mode: "htmlmixed", lineNumbers: true, lineWrapping: true, tabSize: 2, autoCloseTags: true, autoCloseBrackets: true });
    sb.docs = { html: CodeMirror.Doc(sb.html, "htmlmixed"), css: CodeMirror.Doc(sb.css, "css") };
    ed.swapDoc(sb.docs.html);
    let t;
    const run = () => {
      const noCss = $("#sb-nocss").checked;
      $("#sb-prev").srcdoc = W.previewDoc(sb.html, sb.css, { noCss });
      const c = W.analyze(sb.html, sb.css, { sandbox: true });
      const ok = safe(s.beispiel.check, c);
      const m = $("#mini");
      m.className = "mini" + (ok ? " ok" : "");
      m.textContent = ok ? "✅ " + s.beispiel.ok : "○ Die Aufgabe ist noch nicht gelöst.";
      if (ok && !progress.mini[s.id]) { progress.mini[s.id] = true; dirty = true; scheduleSave(); }
    };
    ed.on("change", () => { sb[sb.tab] = ed.getValue(); clearTimeout(t); t = setTimeout(run, 300); });
    $$(".sb-bar .tab").forEach(b => b.onclick = () => {
      sb.tab = b.dataset.sb; ed.swapDoc(sb.docs[sb.tab]);
      $$(".sb-bar .tab").forEach(x => x.classList.toggle("on", x === b));
    });
    $("#sb-nocss").onchange = run;
    $("#sb-reset").onclick = () => { sb.docs.html.setValue(fill(s.beispiel.html)); sb.docs.css.setValue(fill(s.beispiel.css)); sb.html = fill(s.beispiel.html); sb.css = fill(s.beispiel.css); run(); };
    if (!s.beispiel.css.trim()) $(".sb-bar .tab[data-sb=css]").textContent = "🎨 CSS (leer)";
    run();
  }

  function initTraining() {
    const box = $("#erklaer-training");
    const lines = () => [
      ...files.html.split("\n").map((l, i) => ({ f: "index.html", n: i + 1, l })),
      ...files.css.split("\n").map((l, i) => ({ f: "style.css", n: i + 1, l }))
    ].filter(x => x.l.trim().length > 3 && !/^\s*(<\/?(html|head|body)\b|<!DOCTYPE|<meta|}\s*$|\/\*)/i.test(x.l));
    const draw = () => {
      const ls = lines();
      if (!ls.length) { box.innerHTML = `<p class="muted">Deine Seite hat noch zu wenig Code.</p>`; return; }
      const x = ls[Math.floor(Math.random() * ls.length)];
      box.innerHTML = `<div class="training"><p><b>${x.f}, Zeile ${x.n}:</b> Was bewirkt diese Zeile? Erkläre es laut.</p>${pre(x.l)}
        <button class="btn primary" id="tr-next">✔ Erklärt – nächste Zeile</button> <span class="muted">Schon erklärt: ${progress.training || 0}</span></div>`;
      $("#tr-next").onclick = () => {
        progress.training = (progress.training || 0) + 1;
        if (progress.training >= 5) progress.manual["s16-0"] = true;
        dirty = true; scheduleSave(); updateDone(); updateTasks(); draw();
        const cb = $(`[data-manual="s16-0"]`); if (cb) cb.checked = !!progress.manual["s16-0"];
      };
    };
    box.innerHTML = `<button class="btn primary" id="tr-start">🎲 Erklär-Training starten</button>`;
    $("#tr-start").onclick = draw;
  }

  function picker() {
    let h = "<h2>Station wählen</h2><div class='picker'>", ph = "";
    ALLE.forEach((s, i) => {
      if (s.phase !== ph) { ph = s.phase; h += `<div class="ph">${ph}</div>`; }
      h += `<button data-i="${i}" class="${progress.done[s.id] ? "done" : ""} ${i === stIdx ? "cur" : ""}">${progress.done[s.id] ? "✅" : s.icon} <b>${s.profi ? s.nr : s.nr + "."}</b> ${s.titel}</button>`;
    });
    dialog(h + "</div>", d => d.querySelectorAll("[data-i]").forEach(b => b.onclick = () => { closeDlg(); goStation(+b.dataset.i); }));
  }

  /* ================= Übersicht ================= */
  function renderMap() {
    const pfl = STATIONEN.filter(s => progress.done[s.id]).length, prof = PROFI.filter(s => progress.done[s.id]).length;
    let h = `<h1>🗺️ Übersicht</h1>
      <div class="card"><b>${pfl} von ${STATIONEN.length} Stationen erledigt</b>${prof ? ` · ⭐ ${prof} Profi-Station${prof > 1 ? "en" : ""}` : ""}
        <div class="bar-prog"><div style="width:${pfl / STATIONEN.length * 100}%"></div></div>
        <p class="muted" style="margin:6px 0 0">Eine Station ist erledigt, wenn alle Pflicht-Aufgaben auf deiner Seite erfüllt sind. Du kannst jederzeit zurückgehen.</p></div>`;
    let ph = "";
    ALLE.forEach((s, i) => {
      if (s.phase !== ph) { if (ph) h += "</div>"; ph = s.phase; h += `<h2 class="phase-h">${ph}${s.profi ? " – freiwillig, bringt Bonuspunkte" : ""}</h2><div class="map">`; }
      const n = s.pflicht.filter((_, j) => taskOk(s, j, ctx)).length, b = s.bonus.filter((_, j) => bonusOk(s, j, ctx)).length;
      h += `<button data-i="${i}" class="${progress.done[s.id] ? "done" : ""} ${i === stIdx ? "cur" : ""}">
        <span class="mt">${progress.done[s.id] ? "✅" : s.icon} ${s.profi ? s.nr : s.nr + "."} ${s.titel}</span>
        <span class="mm">Pflicht ${n}/${s.pflicht.length}${s.bonus.length ? ` · Bonus ${"⭐".repeat(b)}${"☆".repeat(s.bonus.length - b)}` : ""}</span></button>`;
    });
    $("#learn").innerHTML = h + "</div>";
    $$("#learn .map button").forEach(b => b.onclick = () => goStation(+b.dataset.i));
  }

  /* ================= Meine Note ================= */
  function renderNote() {
    const prof = PROFI.filter(s => progress.done[s.id]).length;
    const ev = W.evaluate(ctx, {}, prof);
    const auto = ev.rows.filter(r => r.auto).reduce((s, r) => s + r.wert, 0), autoMax = ev.rows.filter(r => r.auto).length * 3;
    $("#learn").innerHTML = `<h1>🎓 Meine Note</h1>
      <div class="card"><p>So wird deine Webseite am Ende bewertet. Diese Kriterien gelten <b>von Anfang an</b> – du siehst hier jederzeit deinen aktuellen Stand.</p>
        <p><b>Automatisch geprüft (K1–K7): ${auto} von ${autoMax} Punkten</b> · Profi-Bonus: +${ev.bonus} (höchstens +${W.BONUS_MAX})<br>
        <span class="muted">K8 und K9 bewertet deine Lehrkraft bei der Abnahme. Insgesamt gibt es ${W.MAX} Punkte.</span></p></div>
      <div class="card"><h2>📋 Die Kriterien <span class="muted" style="font-weight:400;font-size:.9rem">– antippen für Details</span></h2>
        ${ev.rows.map(r => `<details class="crit-d"><summary><span class="ct"><b>${r.id}</b> ${r.titel}</span><span class="cp ${r.auto ? (r.pts === 3 ? "full" : "") : "man"}">${r.auto ? `${r.pts} / 3` : "Abnahme"}</span></summary>
          <p class="muted" style="margin:6px 0">Station ${r.stationen}${r.gewicht ? ` · zählt ${r.gewicht}-fach` : ""}${r.auto ? ` · Jetzt: ${esc(r.beleg)}` : ""}</p>
          <ul class="stufen">${r.stufen.map((t, i) => `<li class="${r.pts === i ? "hit" : ""}">${i} P.: ${t}</li>`).join("")}</ul>
          ${r.hinweis ? `<p class="muted" style="margin:6px 0 0">${r.hinweis}</p>` : ""}</details>`).join("")}
      </div>
      <div class="card"><h2>📏 Notenschlüssel</h2><p>${W.SCALE.map(([ab, n]) => `<b>${n}</b> ab ${ab} P.`).join(" · ")} (von ${W.MAX} Punkten)</p>
        <p class="muted">Bonuspunkte aus dem Profi-Pfad gleichen fehlende Punkte aus, aber mehr als ${W.MAX} Punkte gibt es nicht.</p>
        <div class="note">🤖 Code von einer KI darfst du nur behalten, wenn du ihn vollständig erklären kannst (Kriterium K8).</div></div>`;
  }

  /* ================= Spickzettel & Tasten ================= */
  function renderSpick() {
    const tab = rows => `<div class="spick-list">${rows.map(([c, d]) => `<div class="spick-row"><code>${esc(c)}</code><span>${esc(d)}</span><button class="copy" data-c="${esc(c)}" title="Kopieren">📋</button></div>`).join("")}</div>`;
    $("#learn").innerHTML = `<h1>📚 Spickzettel</h1>
      <div class="card"><h2>📄 HTML – Inhalt</h2>${tab(SPICK_HTML)}</div>
      ${unlocked.css ? `<div class="card"><h2>🎨 CSS – Aussehen</h2>${tab(SPICK_CSS)}</div>` : `<div class="card muted">🎨 Der CSS-Teil erscheint ab Station 8.</div>`}
      <div class="card"><h2>🧩 Aufbau einer CSS-Regel</h2><div class="anatomy css"><span class="a-sel">selektor</span> { <span class="a-prop">eigenschaft</span>: <span class="a-val">wert</span>; }</div></div>`;
    $$("#learn .copy").forEach(b => b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.c); toast("📋 Kopiert"); } catch (e) { toast("Kopieren ging nicht – bitte markieren."); } });
  }
  function renderTasten() {
    const keys = [["<", "Taste links neben Y (unten links)"], [">", "Umschalt + Taste links neben Y"], ["/", "Umschalt + 7"], ["\"", "Umschalt + 2 (gerade Anführungszeichen)"],
      ["=", "Umschalt + 0"], ["{", "AltGr + 7"], ["}", "AltGr + 0"], [":", "Umschalt + Punkt"], [";", "Umschalt + Komma"], ["#", "Taste neben Ä (rechts)"], ["-", "Taste neben dem Punkt"], ["_", "Umschalt + Minus"]];
    $("#learn").innerHTML = `<h1>⌨️ Wo finde ich …?</h1><div class="card"><div class="keys">${keys.map(([k, d]) => `<div><span class="big">${esc(k)}</span><span>${d}</span></div>`).join("")}</div>
      <p class="muted" style="margin-top:12px">AltGr ist die Taste rechts neben der Leertaste.</p></div>
      <div class="card"><h2>⚡ Nützliche Abkürzungen</h2><div class="keys">
        <div><span class="big">⎌</span><span><kbd>Strg</kbd> + <kbd>Z</kbd> – rückgängig</span></div>
        <div><span class="big">💾</span><span><kbd>Strg</kbd> + <kbd>S</kbd> – sofort speichern (geht auch automatisch)</span></div>
        <div><span class="big">🔎</span><span><kbd>Strg</kbd> + <kbd>F</kbd> – im Code suchen</span></div>
        <div><span class="big">⇥</span><span><kbd>Tab</kbd> – einrücken</span></div></div></div>`;
  }

  /* ================= Dialoge: Versionen, Import, Download ================= */
  function dialog(html, after) { $("#dlg-body").innerHTML = html; const d = $("#dlg"); if (!d.open) d.showModal(); if (after) after($("#dlg-body")); }
  function closeDlg() { $("#dlg").close(); }
  $("#dlg").addEventListener("click", e => { if (e.target === $("#dlg")) closeDlg(); });

  async function versions() {
    await save(true);
    dialog("<h2>🕘 Versionen</h2><p class='muted'>Lade …</p>");
    try {
      const { versions: v } = await api("/api/versions", me);
      dialog(`<h2>🕘 Ältere Versionen deiner Seite</h2><p class="muted">Etwa alle 10 Minuten Arbeit wird eine Sicherung angelegt. Klick eine an, um sie anzusehen.</p>
        <div class="vlist">${v.map(x => `<button data-id="${x.id}">🕘 ${time(x.saved_at)} <span class="muted">· ${x.h + x.c} Zeichen</span></button>`).join("") || "<p>Noch keine Sicherungen.</p>"}</div>
        <div class="dlg-actions"><button class="btn" id="d-close">Schließen</button></div>`, d => {
        d.querySelector("#d-close").onclick = closeDlg;
        d.querySelectorAll("[data-id]").forEach(b => b.onclick = async () => {
          const x = await api("/api/version", { ...me, id: +b.dataset.id });
          dialog(`<h2>Version vom ${time(x.saved_at)}</h2><iframe style="width:100%;height:340px;border:1px solid var(--line);border-radius:10px" sandbox="allow-scripts"></iframe>
            <div class="dlg-actions"><button class="btn" id="d-back">← Zurück</button><button class="btn primary" id="d-restore">Diese Version wiederherstellen</button></div>`, d2 => {
            d2.querySelector("iframe").srcdoc = W.previewDoc(x.html, x.css);
            d2.querySelector("#d-back").onclick = versions;
            d2.querySelector("#d-restore").onclick = async () => {
              if (!confirm("Deine aktuelle Seite wird durch diese Version ersetzt. (Der jetzige Stand wird vorher gesichert.)")) return;
              await save(true, { forceVersion: true });
              setFiles(x.html, x.css); await save(true); closeDlg(); toast("↺ Version wiederhergestellt");
            };
          });
        });
      });
    } catch (e) { dialog(`<h2>🕘 Versionen</h2><p>${esc(e.message)}</p>`); }
  }

  async function shareDlg() {
    await save(true);
    const draw = token => {
      const url = token ? `${ORIGIN}/s/${token}` : "";
      let qr = "";
      if (token && window.qrcode) { const q = qrcode(0, "M"); q.addData(url); q.make(); qr = q.createSvgTag({ cellSize: 6, margin: 2, scalable: true }); }
      dialog(`<h2>📱 Deine Seite auf Handy oder iPad ansehen</h2>
        ${token ? `<div class="share-box"><div class="qr">${qr}</div><div>
            <p><b>1.</b> Kamera am Handy oder iPad öffnen und den QR-Code scannen – <b>oder</b> diese Adresse eintippen:</p>
            <p class="share-url">${esc(url)}</p>
            <p><b>2.</b> Du siehst deine Seite so, wie sie zuletzt gespeichert wurde. Nach Änderungen einfach neu laden.</p>
            <p class="muted">Jeder, der die Adresse kennt, kann deine Seite ansehen. Du kannst die Freigabe jederzeit beenden.</p></div></div>
          <div class="dlg-actions"><button class="btn danger" id="sh-off">Freigabe beenden</button><button class="btn" id="sh-copy">📋 Adresse kopieren</button><button class="btn primary" id="sh-close">Fertig</button></div>`
        : `<p>Damit du deine Seite auf einem anderen Gerät öffnen kannst, bekommt sie eine eigene Adresse und einen QR-Code.</p>
           <p class="muted">Wer die Adresse kennt, kann die Seite ansehen. Schreib deshalb nichts Privates hinein (keine Adresse, keine Telefonnummer, keine Fotos von dir).</p>
           <div class="dlg-actions"><button class="btn" id="sh-close">Abbrechen</button><button class="btn primary" id="sh-on">Seite freigeben</button></div>`}`, d => {
        d.querySelector("#sh-close").onclick = closeDlg;
        const on = d.querySelector("#sh-on"); if (on) on.onclick = async () => { try { const r = await api("/api/share", { ...me, on: true }); draw(r.share); } catch (e) { toast(e.message); } };
        const off = d.querySelector("#sh-off"); if (off) off.onclick = async () => { await api("/api/share", { ...me, on: false }); shareToken = null; draw(null); };
        const cp = d.querySelector("#sh-copy"); if (cp) cp.onclick = async () => { try { await navigator.clipboard.writeText(url); toast("📋 Kopiert"); } catch (e) {} };
      });
      shareToken = token;
    };
    draw(shareToken);
  }
  let shareToken = null;

  /* ---------- Import aus CodePen ---------- */
  function prepareImport(hRaw, cRaw) {
    let h = (hRaw || "").trim(), c = (cRaw || "").trim();
    const notes = [];
    const looksCss = t => /[.#]?[a-z0-9_-]+\s*\{[^}]*:[^}]*\}/i.test(t) && !/<[a-z!]/i.test(t);
    const looksHtml = t => /<[a-z!][\s\S]*>/i.test(t);
    if (h && looksCss(h) && (!c || looksHtml(c))) { [h, c] = [c, h]; notes.push("HTML und CSS waren vertauscht – ich habe sie richtig zugeordnet."); }
    if (c && looksHtml(c) && !looksCss(c)) { h = (h ? h + "\n" : "") + c; c = ""; notes.push("Im CSS-Feld stand HTML – ich habe es zum HTML verschoben."); }
    const styles = [];
    h = h.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (m, css) => { styles.push(css.trim()); return ""; });
    if (styles.length) { c = [c, ...styles].filter(Boolean).join("\n\n"); notes.push("CSS aus <style>-Blöcken habe ich nach style.css verschoben."); }
    h = h.replace(/<script[\s\S]*?<\/script>/gi, () => { notes.push("JavaScript (<script>) wird in der Werkstatt nicht benutzt und wurde entfernt."); return ""; });
    h = h.replace(/^[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n");
    if (h && !/<html|<!doctype/i.test(h)) {
      h = h.replace(/<\/?body[^>]*>/gi, "").trim();
      const t = (h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, "Meine Seite"])[1].replace(/<[^>]+>/g, "").trim() || "Meine Seite";
      h = `<!DOCTYPE html>\n<html lang="de">\n<head>\n  <meta charset="utf-8">\n  <title>${t}</title>\n  <link rel="stylesheet" href="style.css">\n</head>\n<body>\n${h.split("\n").map(l => "  " + l).join("\n")}\n</body>\n</html>\n`;
      notes.push("Das Grundgerüst (head und body) habe ich ergänzt.");
    } else if (h && !/<link[^>]+style\.css/i.test(h)) {
      h = /<\/head>/i.test(h) ? h.replace(/<\/head>/i, '  <link rel="stylesheet" href="style.css">\n</head>') : h;
      notes.push("Die Verbindung zu style.css habe ich im head ergänzt.");
    }
    return { h, c: c ? c + "\n" : "", notes: [...new Set(notes)] };
  }

  function importDlg() {
    $("#more-menu").hidden = true;
    dialog(`<h2>📥 Deinen Code aus CodePen übernehmen</h2>
      <ol class="tight">
        <li>Öffne deinen Pen in CodePen (in einem zweiten Tab).</li>
        <li>Klick ins <b>HTML</b>-Feld, drücke <kbd>Strg</kbd> + <kbd>A</kbd> (alles markieren) und <kbd>Strg</kbd> + <kbd>C</kbd> (kopieren).</li>
        <li>Klick hier ins obere Feld und drücke <kbd>Strg</kbd> + <kbd>V</kbd> (einfügen).</li>
        <li>Dasselbe mit dem <b>CSS</b>-Feld → unteres Feld.</li>
      </ol>
      <label><b>📄 HTML aus CodePen</b><textarea id="imp-html" placeholder="<h1>…"></textarea></label>
      <label><b>🎨 CSS aus CodePen</b><textarea id="imp-css" placeholder="body { … }"></textarea></label>
      <div id="imp-check"></div>
      <div class="dlg-actions"><button class="btn" id="imp-cancel">Abbrechen</button><button class="btn" id="imp-prev">👁 Vorschau</button><button class="btn primary" id="imp-ok" disabled>Übernehmen</button></div>`, d => {
      d.querySelector("#imp-cancel").onclick = closeDlg;
      let prep = null;
      const check = () => {
        const hv = d.querySelector("#imp-html").value, cv = d.querySelector("#imp-css").value;
        if (!hv.trim() && !cv.trim()) { d.querySelector("#imp-check").innerHTML = `<p class="muted">Füge zuerst deinen Code ein.</p>`; return; }
        prep = prepareImport(hv, cv);
        const lint = W.analyze(prep.h, prep.c).lint.filter(e => e.level === "error").length;
        d.querySelector("#imp-check").innerHTML = `<p><b>So sieht deine Seite danach aus:</b></p>
          <iframe sandbox="allow-scripts" style="width:100%;height:240px;border:1px solid var(--line);border-radius:10px"></iframe>
          ${prep.notes.length ? `<div class="note">🔧 ${prep.notes.map(esc).join("<br>🔧 ")}</div>` : ""}
          ${lint ? `<p class="muted">🕵️ Der Fehler-Detektiv findet danach ${lint} Fehler – die kannst du in Ruhe verbessern.</p>` : ""}
          <p class="muted">Deine jetzige Werkstatt-Seite wird vorher als Version gesichert (⋯ → Ältere Versionen).</p>`;
        d.querySelector("#imp-check iframe").srcdoc = W.previewDoc(prep.h, prep.c);
        d.querySelector("#imp-ok").disabled = false;
      };
      d.querySelector("#imp-prev").onclick = check;
      d.querySelectorAll("textarea").forEach(t => t.oninput = () => { d.querySelector("#imp-ok").disabled = true; });
      d.querySelector("#imp-ok").onclick = async () => {
        if (!prep) return;
        await save(true, { forceVersion: true });
        setFiles(prep.h || files.html, prep.c.trim() ? prep.c : files.css);
        // Freischalten passend zum mitgebrachten Stand
        const doneNr = STATIONEN.filter(s => isDone(s)).map(s => s.nr);
        progress.max = Math.max(progress.max || 1, cssCustom() ? 8 : 2, ...doneNr);
        await save(true); closeDlg(); toast("📥 Übernommen – willkommen in der Werkstatt!");
        const nx = STATIONEN.findIndex(x => x.nr >= 2 && !progress.done[x.id]); goStation(nx >= 0 ? nx : STATIONEN.length - 1);
      };
    });
  }

  function download() {
    const single = files.html.replace(/<link[^>]+href\s*=\s*["']?style\.css["']?[^>]*>/i, `<style>\n${files.css}\n</style>`);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([single], { type: "text/html" }));
    a.download = "meine-webseite.html"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("⬇️ Als eine Datei heruntergeladen – doppelklicken zum Öffnen");
  }
})();
