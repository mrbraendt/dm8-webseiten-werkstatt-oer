/* Webseiten-Werkstatt – Analyse, Fehler-Detektiv, Kriterien und Notenberechnung.
   Wird von der Schülerseite (app.js) und der Lehrkraftseite (teacher.js) gemeinsam genutzt. */
const W = (() => {
  const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
  const KNOWN_TAGS = new Set(("html head body title meta link style script div span p h1 h2 h3 h4 h5 h6 a img ul ol li br hr strong em b i u small " +
    "iframe video audio source table thead tbody tfoot tr td th caption header footer main section article aside nav figure figcaption " +
    "blockquote q cite code pre mark sub sup abbr time address form input label button select option textarea details summary dl dt dd " +
    "picture svg path circle rect g line polygon text canvas noscript center font").split(" "));
  const CSS_PROPS = new Set(("color background background-color background-image background-size background-position background-repeat background-attachment " +
    "background-clip background-origin font font-family font-size font-weight font-style font-variant text-align text-decoration text-transform " +
    "text-shadow text-indent text-overflow line-height letter-spacing word-spacing white-space word-wrap overflow-wrap hyphens vertical-align " +
    "width height min-width max-width min-height max-height aspect-ratio margin margin-top margin-right margin-bottom margin-left " +
    "padding padding-top padding-right padding-bottom padding-left border border-top border-right border-bottom border-left border-color " +
    "border-style border-width border-radius border-top-left-radius border-top-right-radius border-bottom-left-radius border-bottom-right-radius " +
    "border-collapse border-spacing box-shadow box-sizing outline outline-offset display flex flex-direction flex-wrap flex-flow flex-grow flex-shrink " +
    "flex-basis justify-content justify-items justify-self align-items align-content align-self place-items place-content order gap row-gap column-gap " +
    "grid grid-template-columns grid-template-rows grid-template-areas grid-column grid-row grid-area grid-gap grid-auto-flow grid-auto-rows " +
    "position top right bottom left inset z-index float clear overflow overflow-x overflow-y opacity visibility cursor pointer-events " +
    "transition transition-property transition-duration transition-timing-function transition-delay transform transform-origin " +
    "animation animation-name animation-duration animation-iteration-count animation-delay animation-direction animation-timing-function animation-fill-mode " +
    "list-style list-style-type list-style-position list-style-image object-fit object-position filter backdrop-filter content quotes " +
    "columns column-count column-gap scroll-behavior user-select resize accent-color caret-color mix-blend-mode clip-path table-layout " +
    "text-decoration-color text-decoration-style text-decoration-line text-underline-offset font-stretch writing-mode").split(" "));

  const lineAt = (text, idx) => text.slice(0, idx).split("\n").length;
  const words = s => (s.match(/[\p{L}\p{N}]{2,}/gu) || []).length;

  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  const suggest = (w, set) => { let best = null, bd = 3; for (const s of set) { const x = lev(w, s); if (x < bd) { bd = x; best = s; } } return best; };

  /* ---------- CSS lesen ---------- */
  function parseCSS(text) {
    const src = text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "));
    const rules = [], errors = [];
    let i = 0;
    function block(media) {
      while (i < src.length) {
        const open = src.indexOf("{", i), close = src.indexOf("}", i);
        if (close !== -1 && (open === -1 || close < open)) {
          if (media) { i = close + 1; return; }
          errors.push({ line: lineAt(src, close), msg: "Hier ist eine schließende Klammer } zu viel.", level: "error" });
          i = close + 1; continue;
        }
        if (open === -1) {
          const rest = src.slice(i).trim();
          if (rest) errors.push({ line: lineAt(src, i + src.slice(i).search(/\S/)), msg: `„${rest.slice(0, 30)}“ steht außerhalb einer Regel – fehlt eine { ?`, level: "error" });
          i = src.length; return;
        }
        const sel = src.slice(i, open).trim(), selLine = lineAt(src, i + (src.slice(i, open).search(/\S/) + 1 || 1) - 1);
        if (/^@media/i.test(sel)) { i = open + 1; block(sel); continue; }
        if (/^@keyframes/i.test(sel)) {
          let depth = 1, j = open + 1;
          while (j < src.length && depth) { if (src[j] === "{") depth++; else if (src[j] === "}") depth--; j++; }
          rules.push({ sel, decls: {}, list: [], line: selLine, media, keyframes: true });
          if (depth) errors.push({ line: selLine, msg: "Bei @keyframes fehlt eine schließende Klammer }.", level: "error" });
          i = j; continue;
        }
        const end = src.indexOf("}", open + 1), nextOpen = src.indexOf("{", open + 1);
        let bodyEnd = end;
        if (end === -1 || (nextOpen !== -1 && nextOpen < end)) {
          errors.push({ line: selLine, msg: `Die Regel „${sel.slice(0, 30)}“ wird nicht mit } geschlossen.`, level: "error" });
          bodyEnd = nextOpen === -1 ? src.length : src.lastIndexOf("\n", nextOpen);
          if (bodyEnd <= open) bodyEnd = nextOpen === -1 ? src.length : nextOpen;
        }
        if (!sel) errors.push({ line: lineAt(src, open), msg: "Vor der { fehlt der Selektor (z. B. p oder .klasse).", level: "error" });
        const body = src.slice(open + 1, bodyEnd), bodyStart = open + 1;
        const rule = { sel, decls: {}, list: [], line: selLine, media };
        let pos = 0;
        body.split(";").forEach(chunk => {
          const at = bodyStart + pos; pos += chunk.length + 1;
          if (!chunk.trim()) return;
          const ln = lineAt(src, at + chunk.search(/\S/));
          const c0 = chunk.indexOf(":");
          const mm = c0 === -1 ? null : chunk.slice(c0).match(/\n\s*[a-z-]+\s*:/i);
          const missingSemi = mm ? { index: c0 + mm.index } : null;
          if (missingSemi) {
            errors.push({ line: lineAt(src, at + missingSemi.index), msg: "Hier fehlt am Zeilenende ein Semikolon ;", level: "error" });
          }
          const parts = missingSemi ? [chunk.slice(0, missingSemi.index), chunk.slice(missingSemi.index)] : [chunk];
          parts.forEach(part => {
            const c = part.indexOf(":");
            const pl = lineAt(src, at + chunk.indexOf(part) + part.search(/\S/));
            if (c === -1) { errors.push({ line: pl, msg: `„${part.trim().slice(0, 25)}“: Hier fehlt der Doppelpunkt zwischen Eigenschaft und Wert.`, level: "error" }); return; }
            const prop = part.slice(0, c).trim().toLowerCase(), value = part.slice(c + 1).trim();
            if (!value) errors.push({ line: pl, msg: `Bei „${prop}“ fehlt der Wert.`, level: "error" });
            if (!prop.startsWith("--") && !CSS_PROPS.has(prop)) {
              const s = suggest(prop, CSS_PROPS);
              errors.push({ line: pl, msg: `Die Eigenschaft „${prop}“ kenne ich nicht.${s ? ` Meinst du „${s}“?` : ""}`, level: "warn" });
            }
            if (/[„“”]/.test(value)) errors.push({ line: pl, msg: "Schräge Anführungszeichen „ “ funktionieren nicht – nimm gerade \" \".", level: "error" });
            rule.decls[prop] = value; rule.list.push({ prop, value, line: pl });
          });
        });
        rules.push(rule);
        i = bodyEnd === src.length ? src.length : bodyEnd + 1;
      }
    }
    block(null);
    return { rules, errors };
  }

  /* ---------- HTML prüfen ---------- */
  function lintHTML(html) {
    const errs = [], stack = [];
    const re = /<!--[\s\S]*?-->|<!doctype[^>]*>|<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:[^<>"']|"[^"]*"|'[^']*')*?)(\/?)>/gi;
    let m, inRaw = null;
    while ((m = re.exec(html))) {
      if (m[0].startsWith("<!")) continue;
      const close = m[1] === "/", tag = m[2].toLowerCase(), attrs = m[3] || "", line = lineAt(html, m.index);
      if (inRaw) { if (close && tag === inRaw) inRaw = null; continue; }
      if (!close && !KNOWN_TAGS.has(tag)) {
        const s = suggest(tag, KNOWN_TAGS);
        errs.push({ line, msg: `Das Tag <${tag}> gibt es nicht.${s ? ` Meinst du <${s}>?` : ""}`, level: "error" });
      }
      if (/[„“”]/.test(attrs)) errs.push({ line, msg: `In <${tag}> stehen schräge Anführungszeichen „ “ – nimm gerade \" \".`, level: "error" });
      if (!close && /=\s*"[^"]*$/.test(attrs)) errs.push({ line, msg: `In <${tag}> wird ein Anführungszeichen " nicht geschlossen.`, level: "error" });
      if (!close && /\sclass\s*=\s*["']?\s*\./.test(attrs)) errs.push({ line, msg: "Bei class=\"…\" im HTML schreibt man den Klassennamen ohne Punkt.", level: "error" });
      if (!close && /\sid\s*=\s*["']?\s*#/.test(attrs)) errs.push({ line, msg: "Bei id=\"…\" im HTML schreibt man den Namen ohne #.", level: "error" });
      if (!close && tag === "img" && !/\salt\s*=\s*["'][^"']+["']/.test(attrs)) errs.push({ line, msg: "Dieses Bild hat noch keinen alt-Text (Beschreibung).", level: "warn" });
      if (!close && tag === "img" && !/\ssrc\s*=/.test(attrs)) errs.push({ line, msg: "Bei <img> fehlt src=\"…\" – die Bildadresse.", level: "error" });
      if (!close && tag === "a" && !/\shref\s*=/.test(attrs)) errs.push({ line, msg: "Bei <a> fehlt href=\"…\" – wohin soll der Link führen?", level: "warn" });
      if (VOID.has(tag)) { if (close) errs.push({ line, msg: `<${tag}> braucht kein End-Tag – lösche </${tag}>.`, level: "warn" }); continue; }
      if (tag === "script" || tag === "style") { if (!close && !m[4]) inRaw = tag; continue; }
      if (!close) { stack.push({ tag, line }); continue; }
      let k = stack.length - 1;
      while (k >= 0 && stack[k].tag !== tag) k--;
      if (k === -1) {
        const top = stack[stack.length - 1];
        errs.push({ line, msg: `</${tag}> schließt etwas, das nie geöffnet wurde.${top && top.tag !== "body" && top.tag !== "html" ? ` Offen ist gerade <${top.tag}> – meinst du </${top.tag}>?` : ""}`, level: "error" });
        continue;
      }
      for (let j = stack.length - 1; j > k; j--) errs.push({ line: stack[j].line, msg: `<${stack[j].tag}> wird nicht geschlossen – es fehlt </${stack[j].tag}>.`, level: "error" });
      stack.length = k;
    }
    stack.forEach(s => { errs.push({ line: s.line, msg: `<${s.tag}> wird nicht geschlossen – es fehlt </${s.tag}>.`, level: "error" }); });
    return errs;
  }

  /* ---------- Alles zusammen analysieren ---------- */
  function analyze(html, css, opts = {}) {
    const doc = new DOMParser().parseFromString(html || "", "text/html");
    const inline = [...doc.querySelectorAll("style")].map(s => s.textContent).join("\n");
    const pc = parseCSS(css || ""), pi = inline ? parseCSS(inline) : { rules: [], errors: [] };
    const isDoc = /<html|<!doctype/i.test(html || "");
    const linked = !isDoc || /<link[^>]+href\s*=\s*["']?style\.css/i.test(html) || !!inline;
    const rules = [...(isDoc && !/<link[^>]+href\s*=\s*["']?style\.css/i.test(html) && !opts.sandbox ? [] : pc.rules), ...pi.rules];
    const $$ = sel => { try { return [...doc.querySelectorAll(sel)]; } catch (e) { return []; } };
    const decls = rules.flatMap(r => r.list);
    const has = (prop, re) => decls.some(d => d.prop === prop && (!re || re.test(d.value)));
    const hasAny = (props, re) => props.some(p => has(p, re));
    const ruleWith = props => rules.find(r => props.every(p => Object.keys(r.decls).some(k => k === p || k.startsWith(p + "-"))));
    const sels = rules.map(r => r.sel);
    const classesDefined = new Set(sels.flatMap(s => (s.match(/\.([a-zA-Z_][\w-]*)/g) || []).map(x => x.slice(1))));
    const idsDefined = new Set(sels.flatMap(s => (s.match(/#([a-zA-Z_][\w-]*)/g) || []).map(x => x.slice(1))));
    const classesUsed = new Set($$("[class]").flatMap(e => [...e.classList]));
    const idsUsed = new Set($$("[id]").map(e => e.id));
    const bodyText = doc.body ? doc.body.innerText || doc.body.textContent || "" : "";
    const lint = [...lintHTML(html || ""), ...pc.errors.map(e => ({ ...e, file: "css" })), ...pi.errors];
    lint.forEach(e => { if (!e.file) e.file = pc.errors.includes(e) ? "css" : "html"; });
    if (isDoc && !/<link[^>]+href\s*=\s*["']?style\.css/i.test(html) && !inline && (css || "").replace(/\/\*[\s\S]*?\*\//g, "").trim())
      lint.unshift({ file: "html", line: 1, level: "error", msg: "Deine style.css ist nicht verbunden: Im <head> fehlt <link rel=\"stylesheet\" href=\"style.css\">." });
    return {
      doc, html: html || "", css: css || "", rules, decls, $$, has, hasAny, ruleWith, sels, classesDefined, idsDefined, classesUsed, idsUsed, linked,
      words: words(bodyText), lint,
      errors: lint.filter(e => e.level === "error").length,
      text: el => (el && el.textContent || "").trim(),
      countUsedClasses: () => [...classesDefined].filter(c => classesUsed.has(c)).length,
      selMatches: re => rules.filter(r => re.test(r.sel))
    };
  }

  /* ---------- Vorschau bauen ---------- */
  const PREVIEW_SCRIPT = `<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a");if(!a)return;var h=a.getAttribute("href")||"";if(h.charAt(0)==="#"){e.preventDefault();var t=document.getElementById(h.slice(1));if(t)t.scrollIntoView({behavior:"smooth"});return;}if(/^https?:/i.test(h)){e.preventDefault();window.open(h,"_blank","noopener");}});addEventListener("scroll",function(){parent.postMessage({ww:"scroll",y:scrollY},"*");});addEventListener("message",function(e){if(e.data&&e.data.ww==="restore")scrollTo(0,e.data.y);});<\/script>`;
  const XRAY = `<style id="xray">*{outline:1px dashed rgba(225,29,72,.55)!important;outline-offset:-1px}div,section,header,footer,main,nav,article,aside{outline:2px solid rgba(37,99,235,.7)!important;background-image:linear-gradient(rgba(37,99,235,.05),rgba(37,99,235,.05))!important}</style>`;
  function previewDoc(html, css, opts = {}) {
    // JavaScript wird in der Werkstatt nicht gelehrt: <script> aus Schülercode entfernen, damit eine
    // Endlosschleife die Vorschau (und damit den Editor-Tab) nicht einfrieren kann. Nur Vorschau, Code bleibt unverändert.
    let h = (html || "").replace(/<script\b[\s\S]*?(<\/script\s*>|$)/gi, "");
    const style = opts.noCss ? "" : `<style>${(css || "").replace(/<\/style/gi, "<\\/style")}</style>`;
    const extra = (opts.xray ? XRAY : "") + PREVIEW_SCRIPT + (opts.base ? `<base href="${opts.base}">` : "");
    if (/<html|<!doctype/i.test(h)) {
      h = h.replace(/<link[^>]+href\s*=\s*["']?style\.css["']?[^>]*>/i, () => style);
      if (opts.noCss) h = h.replace(/<style[\s\S]*?<\/style>/gi, "");
      return /<\/head>/i.test(h) ? h.replace(/<\/head>/i, extra + "</head>") : extra + h;
    }
    return `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">${style}${extra}</head><body>${h}</body></html>`;
  }

  /* ---------- Bewertungskriterien (vorab für alle sichtbar) ---------- */
  const extLinks = c => c.$$("a[href]").filter(a => /^https?:\/\//i.test(a.getAttribute("href")));
  const imgsAlt = c => c.$$("img[src]").filter(i => (i.getAttribute("alt") || "").trim().length > 2);
  const videos = c => c.$$("iframe[src], video").filter(v => v.tagName === "VIDEO" || /youtube|vimeo|video/i.test(v.getAttribute("src")));
  const containers = c => c.$$("div, section, header, footer, main, nav, article, aside");
  const navLinks = c => {
    const navs = c.$$("nav, [class*=nav], [class*=menu], [id*=nav], [id*=menu]");
    return navs.flatMap(n => [...n.querySelectorAll("a[href^='#']")]).filter(a => c.doc.getElementById(a.getAttribute("href").slice(1)));
  };

  const CRITERIA = [
    { id: "K1", titel: "Eigene Inhalte & Gliederung", stationen: "2–4", auto: true,
      stufen: ["kaum eigener Inhalt", "Überschrift und etwas Text", "Haupt- und 2 Zwischenüberschriften, 3 Absätze, ca. 120 Wörter", "Haupt- und mind. 3 Zwischenüberschriften, mind. 5 Absätze, ca. 250 Wörter eigener Text und eine Liste"],
      eval(c) {
        const h1 = c.$$("h1").length, hx = c.$$("h2, h3").length, p = c.$$("p").filter(x => c.text(x).length > 10).length, list = c.$$("ul li, ol li").length >= 3;
        const pts = h1 && hx >= 3 && p >= 5 && c.words >= 250 && list ? 3 : h1 && hx >= 2 && p >= 3 && c.words >= 120 ? 2 : (h1 || p) && c.words >= 30 ? 1 : 0;
        return { pts, beleg: `${h1}× Hauptüberschrift, ${hx}× Zwischenüberschrift, ${p} Absätze, ${c.words} Wörter, ${list ? "Liste vorhanden" : "keine Liste"}` };
      } },
    { id: "K2", titel: "Links, Bilder & Video", stationen: "5–7", auto: true,
      stufen: ["nichts davon", "eins davon", "zwei davon", "mind. 2 Links, mind. 2 Bilder mit alt-Text und 1 Video"],
      eval(c) {
        const l = extLinks(c).length, i = imgsAlt(c).length, v = videos(c).length;
        return { pts: (l >= 2) + (i >= 2) + (v >= 1), beleg: `${l} Links, ${i} Bilder mit alt-Text, ${v} Video(s)` };
      } },
    { id: "K3", titel: "CSS: Farben & Schrift", stationen: "8–9", auto: true,
      stufen: ["CSS fehlt oder ist nicht verbunden", "ein Teil davon", "zwei Teile davon", "Hintergrund- und Textfarbe, eigene Schrift (Art oder Größe) und mind. 8 verschiedene CSS-Eigenschaften"],
      eval(c) {
        if (!c.linked) return { pts: 0, beleg: "style.css ist nicht mit der Seite verbunden" };
        const farben = c.hasAny(["background-color", "background"]) && c.has("color");
        const schrift = c.hasAny(["font-family", "font-size"]);
        const n = new Set(c.decls.map(d => d.prop)).size;
        return { pts: farben + schrift + (n >= 8), beleg: `${farben ? "Farben gesetzt" : "Hintergrund- oder Textfarbe fehlt"}, ${schrift ? "Schrift gestaltet" : "Schrift nicht gestaltet"}, ${n} verschiedene Eigenschaften` };
      } },
    { id: "K4", titel: "Klassen & IDs", stationen: "10", auto: true,
      stufen: ["keine", "eine Klasse genutzt", "mind. 2 Klassen genutzt", "mind. 2 Klassen und 1 ID – jeweils im CSS gestaltet und im HTML benutzt"],
      eval(c) {
        const k = c.countUsedClasses(), id = [...c.idsDefined].some(x => c.idsUsed.has(x));
        return { pts: Math.min(2, k) + (id ? 1 : 0), beleg: `${k} Klasse(n) im CSS gestaltet und im HTML benutzt, ${id ? "ID genutzt" : "keine ID genutzt"}` };
      } },
    { id: "K5", titel: "Box-Modell & Bereiche", stationen: "11–12", auto: true,
      stufen: ["nichts davon", "eins davon", "zwei davon", "padding, border und margin genutzt; mind. 3 Bereiche (div o. Ä.) mit Klasse; Bereiche ineinander verschachtelt"],
      eval(c) {
        const box = c.hasAny(["padding", "padding-top", "padding-left"]) && c.hasAny(["margin", "margin-top", "margin-bottom", "margin-left"]) && c.decls.some(d => /^border/.test(d.prop) && d.prop !== "border-radius");
        const bereiche = containers(c).filter(e => e.className || /HEADER|FOOTER|MAIN|NAV|SECTION/.test(e.tagName));
        const nested = bereiche.some(e => e.parentElement && e.parentElement.closest("div, section, header, footer, main, nav, article, aside"));
        return { pts: box + (bereiche.length >= 3) + nested, beleg: `${box ? "Box-Modell genutzt" : "padding, border oder margin fehlt"}, ${bereiche.length} Bereiche, ${nested ? "verschachtelt" : "nicht verschachtelt"}` };
      } },
    { id: "K6", titel: "Layout & Navigation", stationen: "13–14", auto: true,
      stufen: ["nichts davon", "eins davon", "zwei davon", "Flexbox (oder Grid) genutzt, Menü mit mind. 3 Sprunglinks, Hover-Effekt"],
      eval(c) {
        const flex = c.has("display", /flex|grid/), nav = navLinks(c).length, hover = c.rules.some(r => /:hover/.test(r.sel));
        return { pts: flex + (nav >= 3) + hover, beleg: `${flex ? "Flexbox/Grid genutzt" : "kein Flexbox/Grid"}, ${nav} funktionierende Sprunglinks im Menü, ${hover ? "Hover-Effekt" : "kein Hover-Effekt"}` };
      } },
    { id: "K7", titel: "Sauberer Code", stationen: "alle", auto: true,
      stufen: ["mehr als 5 Fehler", "3–5 Fehler", "1–2 Fehler", "der Fehler-Detektiv findet keinen Fehler"],
      eval(c) { const e = c.errors; return { pts: e === 0 ? 3 : e <= 2 ? 2 : e <= 5 ? 1 : 0, beleg: `${e} Fehler laut Fehler-Detektiv` }; } },
    { id: "K8", titel: "Code erklären können (Abnahme)", stationen: "16", auto: false, gewicht: 2,
      stufen: ["kann den eigenen Code nicht erklären", "erklärt nur Teile, mit viel Hilfe", "erklärt mit kleinen Hilfen", "erklärt drei ausgewählte Stellen sicher und baut eine kleine Änderung live ein"],
      hinweis: "Hier zeigt sich auch, ob Code selbst geschrieben wurde. Wer Code von einer KI übernimmt, muss ihn vollständig erklären können." },
    { id: "K9", titel: "Gesamteindruck", stationen: "15", auto: false,
      stufen: ["unübersichtlich, schwer lesbar", "lesbar, aber wenig zusammenhängend", "ordentlich und lesbar", "durchdachtes, zusammenhängendes Design, gut lesbar, Thema klar erkennbar"] }
  ];
  const MAX = CRITERIA.reduce((s, k) => s + 3 * (k.gewicht || 1), 0); // 30
  const BONUS_MAX = 3;
  const SCALE = [[27, 1], [23, 2], [19, 3], [15, 4], [9, 5], [0, 6]]; // Punkte ab → Note

  function noteFor(points) {
    for (let i = 0; i < SCALE.length; i++) {
      const [ab, note] = SCALE[i];
      if (points >= ab) {
        const top = i === 0 ? MAX : SCALE[i - 1][0] - 1, span = top - ab + 1;
        const pos = span > 2 ? (points - ab) / (span - 1) : 0.5;
        const tend = note === 1 || note === 6 ? (note === 1 && pos < .34 ? "−" : "") : pos >= .67 ? "+" : pos < .34 ? "−" : "";
        return { note, text: `${note}${tend}` };
      }
    }
    return { note: 6, text: "6" };
  }

  function evaluate(c, manual = {}, profi = 0) {
    const rows = CRITERIA.map(k => {
      if (k.auto) { const r = k.eval(c); return { ...k, pts: r.pts, beleg: r.beleg, wert: r.pts * (k.gewicht || 1) }; }
      const v = manual[k.id];
      return { ...k, pts: v ?? null, beleg: v == null ? "noch nicht bewertet (bei der Abnahme)" : k.stufen[v], wert: v == null ? null : v * (k.gewicht || 1) };
    });
    const bonus = Math.min(BONUS_MAX, profi);
    const sum = Math.min(MAX, rows.reduce((s, r) => s + (r.wert || 0), 0) + bonus);
    const complete = rows.every(r => r.pts != null);
    return { rows, bonus, sum, max: MAX, complete, note: complete ? noteFor(sum) : null };
  }

  function bericht(nick, ev, extra = "") {
    const stark = ev.rows.filter(r => r.pts === 3).map(r => r.titel);
    const schwach = ev.rows.filter(r => r.pts != null && r.pts <= 1).map(r => r.titel);
    const zeilen = ev.rows.map(r => `• ${r.titel}: ${r.pts}/3${r.gewicht ? ` (zählt ${r.gewicht}-fach)` : ""} – ${r.beleg}`).join("\n");
    return `Webseite von „${nick}“ – Notenvorschlag ${ev.note ? ev.note.text : "–"} (${ev.sum} von ${ev.max} Punkten${ev.bonus ? `, davon ${ev.bonus} Bonuspunkte aus dem Profi-Pfad` : ""})

Begründung nach den vorab bekannten Kriterien:
${zeilen}

${stark.length ? `Stärken: ${stark.join(", ")}.` : ""}${schwach.length ? `\nAusbaufähig: ${schwach.join(", ")}.` : ""}${extra ? `\n\nAnmerkung der Lehrkraft: ${extra}` : ""}

Notenschlüssel: ab 27 P. = 1, ab 23 = 2, ab 19 = 3, ab 15 = 4, ab 9 = 5, darunter 6. Automatisch ermittelte Kriterien beruhen auf dem gespeicherten Code; der Vorschlag wurde von der Lehrkraft geprüft.`;
  }

  return { parseCSS, lintHTML, analyze, previewDoc, CRITERIA, MAX, BONUS_MAX, SCALE, evaluate, noteFor, bericht, words };
})();
