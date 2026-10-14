/* Webseiten-Werkstatt – Inhalte der Stationen.
   Jede Station: lernen (Erklärung) → beispiel (live ausprobieren + Mini-Aufgabe) → pflicht/bonus für die eigene Seite.
   check-Funktionen bekommen das Analyse-Objekt aus checks.js (c.$$, c.has, c.rules …). manuell: check fehlt → Häkchen. */

const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const pre = s => `<pre class="code">${esc(s.trim())}</pre>`;
const k = s => `<code>${esc(s)}</code>`;
const IMG = n => `{{ORIGIN}}/bilder/${n}.svg`;

const THEMEN = [
  "⚽ Mein Lieblingssport", "🎮 Ein Spiel, das ich mag", "🐶 Mein Haustier / ein Lieblingstier", "🎵 Meine Lieblingsband", "🍕 Rezepte, die ich mag",
  "🌍 Ein Land, das ich bereisen will", "📚 Meine Lieblingsbuchreihe", "🎬 Eine Serie oder ein Film", "🚴 Mein Hobby", "🦖 Dinosaurier",
  "🚀 Weltraum und Planeten", "🏰 Bremen entdecken", "🐴 Pferde und Reiten", "🎨 Zeichnen und Kunst", "💻 Technik, die mich begeistert",
  "🌱 Umwelt und Klimaschutz", "🏀 Ein Verein (ausgedacht oder echt)", "📷 Fotografie", "🧪 Verrückte Experimente", "🎭 Theater, Tanz oder Musik machen",
  "🐠 Das Meer und seine Tiere", "🏎️ Autos oder Motorsport", "✈️ Meine Traumreise", "🧩 Eine Fan-Seite zu …"
];

const STATIONEN = [
  /* ---------------- A · Verstehen ---------------- */
  {
    id: "s01", nr: 1, phase: "A · Verstehen", icon: "🌐", titel: "Was ist eine Webseite?", special: "s01",
    ziel: "Du kannst erklären, wie eine Webseite in deinen Browser kommt und welche Aufgabe HTML und CSS haben.",
    lernen: "", beispiel: null,
    pflicht: [
      { t: "Wähle ein Thema für deine Webseite und trag es oben ein.", check: (c, p) => ((p && p.thema) || "").trim().length >= 3 },
      { t: "Zeichne eine Skizze deiner Seite auf Papier: Was soll oben, in der Mitte und unten stehen?" }
    ],
    bonus: [{ t: "Drücke bei einer Lieblingswebseite Strg + U und finde dort ein <h1> oder ein <p>." }]
  },
  {
    id: "s02", nr: 2, phase: "A · Verstehen", icon: "🏷️", titel: "Mein erstes HTML",
    ziel: "Du kannst HTML-Elemente mit Start- und End-Tag schreiben und erklären, was in den head und was in den body gehört.",
    lernen: `
      <div class="locked-hint">🎉 Ab jetzt siehst du rechts deine eigene Datei <b>index.html</b> – und darunter, wie deine Seite aussieht.</div>
      <p>HTML besteht aus <b>Tags</b>: Befehlen in spitzen Klammern. Meistens gibt es ein Paar:</p>
      <div class="anatomy"><span class="a-start">&lt;p&gt;</span><span class="a-content">Das ist ein Absatz.</span><span class="a-end">&lt;/p&gt;</span></div>
      <p class="legend"><span class="a-start">Start-Tag</span> <span class="a-content">Inhalt</span> <span class="a-end">End-Tag mit /</span> – zusammen heißt das ein <b>Element</b>.</p>
      <p>Jede Webseite hat dasselbe <b>Grundgerüst</b>. Schau rechts in deine Datei <b>index.html</b> – genau so sieht sie aus:</p>
      ${pre(`<!DOCTYPE html>        ← „Achtung, Browser: Das ist HTML!“
<html lang="de">
<head>                 ← unsichtbare Infos über die Seite
  <title>…</title>     ← Text im Browser-Tab
  <link … style.css>   ← verbindet das Design
</head>
<body>                 ← alles, was man SIEHT
  <h1>…</h1>
</body>
</html>`)}
      <p>⚠️ Häufigster Fehler: das <b>End-Tag vergessen</b>. Der Fehler-Detektiv unter deinem Editor warnt dich dann.</p>`,
    beispiel: {
      html: `<!DOCTYPE html>
<html lang="de">
<head>
  <title>Test</title>
</head>
<body>
  <h1>Hallo Welt!</h1>
  <p>Mein erster Absatz.</p>
</body>
</html>`,
      css: ``,
      aufgabe: "Füge unter dem ersten Absatz einen zweiten Absatz mit <p> … </p> ein.",
      check: c => c.$$("p").length >= 2,
      ok: "Super – Start-Tag, Inhalt, End-Tag. So funktioniert jedes HTML-Element."
    },
    pflicht: [
      { t: "Deine Hauptüberschrift <h1> ist dein Thema (nicht mehr „Mein Thema“).", check: c => c.$$("h1").some(h => h.textContent.trim().length > 2 && !/^Mein Thema$/i.test(h.textContent.trim())) },
      { t: "Ändere den Text im <title> (z. B. den Namen deines Themas).", check: c => { const t = c.doc.querySelector("title"); return !!t && t.textContent.trim().length > 2 && !/^Meine Seite$/i.test(t.textContent.trim()); } },
      { t: "Schreib einen ersten eigenen Absatz (mind. 2 Sätze) über dein Thema.", check: c => c.$$("p").some(p => W.words(p.textContent) >= 12 && !/Hier entsteht meine Webseite/.test(p.textContent)) }
    ],
    bonus: [{ t: "Wo erscheint der <title>-Text? In der Werkstatt steht er rechts über der Vorschau als „Tab-Titel“ – im echten Browser oben im Tab. Teste es mit „📱 Auf Handy/iPad ansehen“." }]
  },

  /* ---------------- B · Inhalte mit HTML ---------------- */
  {
    id: "s03", nr: 3, phase: "B · Inhalte (HTML)", icon: "📑", titel: "Gliedern mit Überschriften",
    ziel: "Du kannst einen Text mit Überschriften verschiedener Stufen und Absätzen sinnvoll gliedern.",
    lernen: `
      <p>Eine gute Webseite ist gegliedert wie ein Zeitungsartikel:</p>
      <ul class="tight">
        <li>${k("<h1>")} – die <b>Hauptüberschrift</b>. Nur <b>einmal</b> pro Seite.</li>
        <li>${k("<h2>")} – Überschriften für <b>Abschnitte</b>, ${k("<h3>")} für Unterabschnitte (es gibt bis ${k("<h6>")}).</li>
        <li>${k("<p>")} – ein <b>Absatz</b>. Danach beginnt automatisch eine neue Zeile.</li>
        <li>${k("<br>")} – nur ein <b>Zeilenumbruch</b>; ${k("<hr>")} – eine <b>Trennlinie</b>. Beide brauchen kein End-Tag.</li>
      </ul>
      <p>💡 Der Browser ignoriert, wie oft du Enter oder die Leertaste drückst. Nur die Tags bestimmen, wo ein neuer Absatz beginnt.</p>`,
    beispiel: {
      html: `<h1>Basketball</h1>
<p>Geschichte Basketball wurde 1891 von James Naismith erfunden. Er suchte ein Spiel für den Winter. Regeln Ein Team hat fünf Spieler auf dem Feld. Ein Korb zählt zwei oder drei Punkte.</p>`,
      css: `h2 {
  color: #1d4ed8;
}`,
      aufgabe: "Mach aus dem Textblock zwei Abschnitte: jeweils eine <h2>-Überschrift („Geschichte“, „Regeln“) und einen Absatz darunter.",
      check: c => c.$$("h2").length >= 2 && c.$$("p").length >= 2,
      ok: "Jetzt ist der Text gegliedert – viel leichter zu lesen."
    },
    pflicht: [
      { t: "Mindestens 3 Abschnitte mit <h2>-Überschrift.", check: c => c.$$("h2").length >= 3 },
      { t: "Unter jeder Abschnitts-Überschrift steht mindestens ein Absatz (insgesamt mind. 3 <p>).", check: c => c.$$("p").length >= 3 }
    ],
    bonus: [
      { t: "Nutze eine <h3>-Unterüberschrift innerhalb eines Abschnitts.", check: c => c.$$("h3").length >= 1 },
      { t: "Deine Seite hat schon mindestens 150 Wörter eigenen Text.", check: c => c.words >= 150 }
    ]
  },
  {
    id: "s04", nr: 4, phase: "B · Inhalte (HTML)", icon: "📋", titel: "Listen & Betonung",
    ziel: "Du kannst Aufzählungen als Listen anlegen und wichtige Wörter hervorheben.",
    lernen: `
      ${pre(`<ul>               ← ungeordnete Liste (Punkte)
  <li>Äpfel</li>   ← jedes Listenelement
  <li>Birnen</li>
</ul>

<ol>               ← geordnete Liste (1. 2. 3.)
  <li>Teig rühren</li>
  <li>Backen</li>
</ol>`)}
      <p>Wichtige Wörter hebst du hervor mit ${k("<strong>")} (fett, „wichtig“) oder ${k("<em>")} (kursiv, „betont“) – mitten im Absatz:</p>
      ${pre(`<p>Füchse sind <strong>nachtaktiv</strong>.</p>`)}
      <p>⚠️ ${k("<li>")} steht immer <b>innerhalb</b> von ${k("<ul>")} oder ${k("<ol>")}.</p>`,
    beispiel: {
      html: `<h2>Packliste Klassenfahrt</h2>
<p>
- Schlafsack
- Taschenlampe
- Regenjacke
</p>`,
      css: `li {
  color: #0f766e;
}`,
      aufgabe: "Mach aus der Aufzählung eine richtige Liste mit <ul> und drei <li>.",
      check: c => c.$$("ul li").length >= 3,
      ok: "Richtig – jetzt erkennt der Browser (und jeder Screenreader) die Liste."
    },
    pflicht: [
      { t: "Eine Liste (<ul> oder <ol>) mit mindestens 3 Einträgen.", check: c => c.$$("ul li, ol li").length >= 3 },
      { t: "Hebe mindestens ein wichtiges Wort mit <strong> hervor.", check: c => c.$$("strong, b").length >= 1 }
    ],
    bonus: [
      { t: "Nutze beide Listenarten: <ul> und <ol>.", check: c => c.$$("ul").length && c.$$("ol").length },
      { t: "Eine Liste in einer Liste (verschachtelt).", check: c => c.$$("li ul, li ol").length >= 1 }
    ]
  },
  {
    id: "s05", nr: 5, phase: "B · Inhalte (HTML)", icon: "🔗", titel: "Links & Attribute",
    ziel: "Du kannst Links mit dem Attribut href setzen und erklären, was ein Attribut ist.",
    lernen: `
      ${pre(`<a href="https://de.wikipedia.org/wiki/Fuchs">Mehr über Füchse</a>`)}
      <ul class="tight">
        <li>${k("<a>")} steht für „anchor“ (Anker) – ein Link.</li>
        <li>${k('href="…"')} ist ein <b>Attribut</b>: eine Zusatz-Info im Start-Tag. Aufbau immer: ${k('name="wert"')}.</li>
        <li>Der Text zwischen Start- und End-Tag ist der <b>klickbare Linktext</b>.</li>
        <li>${k('target="_blank"')} öffnet den Link in einem <b>neuen Tab</b>.</li>
      </ul>
      <p>⚠️ Nimm gerade Anführungszeichen ${k('"')} (<kbd>Umschalt</kbd> + <kbd>2</kbd>) – keine schrägen „ “ aus Word oder PDF.</p>
      <p>💡 Die Adresse kopierst du am einfachsten aus der Adressleiste des Browsers.</p>`,
    beispiel: {
      html: `<p>
  Mehr über das berühmteste Märchen aus Bremen:
  <a href="https://de.wikipedia.org/wiki/Die_Bremer_Stadtmusikanten">Die Bremer Stadtmusikanten</a>
</p>`,
      css: `a {
  color: #7c3aed;
}`,
      aufgabe: "Ergänze den Link so, dass er in einem neuen Tab öffnet (target=\"_blank\").",
      check: c => c.$$("a[target='_blank']").length >= 1,
      ok: "Genau – Attribute stehen immer im Start-Tag, durch Leerzeichen getrennt."
    },
    pflicht: [
      { t: "Mindestens 2 Links zu Webseiten, die zu deinem Thema passen.", check: c => c.$$("a[href]").filter(a => /^https?:\/\//.test(a.getAttribute("href"))).length >= 2 }
    ],
    bonus: [
      { t: "Mindestens ein Link öffnet in einem neuen Tab.", check: c => c.$$("a[target='_blank']").length >= 1 },
      { t: "Der Linktext sagt, wohin es geht (nicht „hier klicken“).", check: c => c.$$("a[href]").some(a => W.words(a.textContent) >= 2 && !/hier|klick/i.test(a.textContent)) }
    ]
  },
  {
    id: "s06", nr: 6, phase: "B · Inhalte (HTML)", icon: "🖼️", titel: "Bilder",
    ziel: "Du kannst Bilder mit Adresse, Beschreibung und Größe einbinden und darauf achten, dass du sie verwenden darfst.",
    lernen: `
      ${pre(`<img src="https://…/berg.svg" alt="Ein Berg bei Sonnenuntergang" width="300">`)}
      <ul class="tight">
        <li>${k("src")} = <b>source</b> (Quelle): die Adresse des Bildes.</li>
        <li>${k("alt")} = <b>Beschreibung</b>. Wird angezeigt, wenn das Bild fehlt, und von Screenreadern für blinde Menschen vorgelesen.</li>
        <li>${k("width")} = Breite in Pixeln (freiwillig).</li>
        <li>${k("<img>")} hat <b>kein End-Tag</b>.</li>
      </ul>
      <div class="note">⚖️ <b>Urheberrecht:</b> Nicht jedes Bild aus dem Internet darf man benutzen. Freie Bilder findest du z. B. bei <b>Pixabay</b>, <b>Unsplash</b> oder <b>Wikimedia Commons</b>. Schreib die Quelle unter das Bild.</div>
      <p>💡 So bekommst du die Bildadresse: Rechtsklick auf das Bild → <b>„Bildadresse kopieren“</b>. Eine gute Bildadresse endet meist auf <b>.jpg</b>, <b>.png</b>, <b>.svg</b> oder <b>.webp</b>.</p>
      <details class="more-info"><summary>🤔 Mein Bild wird nicht angezeigt – was tun?</summary><p style="margin:0">Prüfe: Ist die Adresse vollständig (beginnt mit https://)? Steht sie in geraden Anführungszeichen? Manche Webseiten erlauben nicht, ihre Bilder woanders anzuzeigen – nimm dann ein Bild von Pixabay oder Wikimedia Commons.</p></details>`,
    beispiel: {
      html: `<h2>Mein Lieblingsort</h2>
<img src="${IMG("berg")}">`,
      css: `img {
  border-radius: 12px;
}`,
      aufgabe: "Ergänze ein alt-Attribut mit einer Beschreibung und setze die Breite auf 250 (width=\"250\").",
      check: c => c.$$("img").some(i => (i.getAttribute("alt") || "").trim().length > 3 && /250/.test(i.getAttribute("width") || "")),
      ok: "Perfekt – Bild, Beschreibung und Größe."
    },
    pflicht: [
      { t: "Mindestens 2 Bilder zu deinem Thema.", check: c => c.$$("img[src]").length >= 2 },
      { t: "Jedes Bild hat einen alt-Text, der beschreibt, was zu sehen ist.", check: c => { const i = c.$$("img"); return i.length >= 1 && i.every(x => (x.getAttribute("alt") || "").trim().length > 3); } }
    ],
    bonus: [
      { t: "Unter jedem Bild steht klein die Quelle (z. B. „Bild: Pixabay“).", check: c => /quelle|bild:|foto:|pixabay|unsplash|wikimedia/i.test(c.doc.body ? c.doc.body.textContent : "") },
      { t: "Mach ein Bild zum Link: <a href=\"…\"><img …></a>.", check: c => c.$$("a img").length >= 1 }
    ]
  },
  {
    id: "s07", nr: 7, phase: "B · Inhalte (HTML)", icon: "🎬", titel: "Videos einbetten",
    ziel: "Du kannst ein Video mit einem iframe einbetten und weißt, warum die Datenschutz-Variante besser ist.",
    lernen: `
      <p>Videos von YouTube bindest du mit einem ${k("<iframe>")} ein – einem <b>Fenster</b> in deiner Seite, das eine andere Seite zeigt.</p>
      <ol class="tight">
        <li>Unter dem Video auf <b>Teilen → Einbetten</b> klicken.</li>
        <li>Den Code kopieren und in deine Seite einfügen.</li>
        <li><b>Datenschutz:</b> Ändere in der Adresse ${k("youtube.com")} zu ${k("youtube-nocookie.com")}. Dann speichert YouTube weniger über die Besucher.</li>
      </ol>
      ${pre(`<iframe width="400" height="225"
  src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ"
  allowfullscreen></iframe>`)}`,
    beispiel: {
      html: `<h2>Ein kurzer Film</h2>
<iframe width="560" height="315" src="https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ" allowfullscreen></iframe>`,
      css: `iframe {
  border: 0;
  border-radius: 10px;
}`,
      aufgabe: "Mach das Video kleiner: Breite 320 und Höhe 180.",
      check: c => c.$$("iframe").some(f => f.getAttribute("width") === "320" && f.getAttribute("height") === "180"),
      ok: "Gut – Breite und Höhe sind Attribute wie bei <img>."
    },
    pflicht: [
      { t: "Ein passendes Video ist auf deiner Seite eingebettet.", check: c => c.$$("iframe[src], video").length >= 1 }
    ],
    bonus: [
      { t: "Nutze die Datenschutz-Adresse youtube-nocookie.com.", check: c => c.$$("iframe").some(f => /youtube-nocookie/.test(f.getAttribute("src") || "")) },
      { t: "Setze vor das Video eine Trennlinie <hr> und eine Überschrift.", check: c => c.$$("hr").length >= 1 }
    ]
  },

  /* ---------------- C · Design mit CSS ---------------- */
  {
    id: "s08", nr: 8, phase: "C · Design (CSS)", icon: "🎨", titel: "HTML + CSS = Webseite",
    ziel: "Du kannst erklären, wie die CSS-Datei mit der HTML-Datei verbunden ist, und CSS-Regeln für Farben schreiben.",
    lernen: `
      <div class="locked-hint">🎉 Neu: Rechts ist jetzt die zweite Datei <b>style.css</b> aufgetaucht – dort kommt ab heute das Design hin.</div>
      <p>Dein Design steht in einer eigenen Datei: <b>style.css</b>. Damit der Browser sie benutzt, steht im ${k("<head>")} deiner index.html diese Zeile:</p>
      ${pre(`<link rel="stylesheet" href="style.css">`)}
      <p>Fehlt sie, sieht deine Seite aus, als gäbe es gar kein CSS. Eine CSS-<b>Regel</b> ist immer gleich aufgebaut:</p>
      <div class="anatomy css"><span class="a-sel">h1</span> { <span class="a-prop">color</span>: <span class="a-val">darkblue</span>; }</div>
      <p class="legend"><span class="a-sel">Selektor</span>: für welche Elemente? · <span class="a-prop">Eigenschaft</span>: was ändern? · <span class="a-val">Wert</span>: wie? · Jede Zeile endet mit <b>;</b></p>
      <p><b>Farben</b> kannst du als Namen (${k("tomato")}, ${k("navy")}) oder als Hex-Code schreiben (${k("#ff8800")}). Wichtige Eigenschaften: ${k("color")} (Textfarbe) und ${k("background-color")} (Hintergrund).</p>`,
    beispiel: {
      html: `<h1>Mein Garten</h1>
<p>Im Sommer wachsen hier Tomaten und Sonnenblumen.</p>
<p>Im Herbst ernten wir Kürbisse.</p>`,
      css: `body {
  background-color: lightyellow;
}
h1 {
  color: darkgreen;
}`,
      aufgabe: "Gib allen Absätzen (p) eine eigene Textfarbe.",
      check: c => c.rules.some(r => /(^|,|\s)p(\s|,|$|:)/.test(r.sel) && r.decls.color),
      ok: "Genau: Selektor p, Eigenschaft color, Wert – und das Semikolon nicht vergessen."
    },
    pflicht: [
      { t: "Finde in deiner index.html die link-Zeile, die style.css verbindet (sie steht schon im <head> – lass sie drin!).", check: c => /<link[^>]+href\s*=\s*["']?style\.css/i.test(c.html) },
      { t: "Die ganze Seite (body) hat eine Hintergrundfarbe.", check: c => c.rules.some(r => /\bbody\b/.test(r.sel) && (r.decls["background-color"] || r.decls.background)) },
      { t: "Mindestens 2 Regeln mit einer Textfarbe (color).", check: c => c.rules.filter(r => r.decls.color).length >= 2 }
    ],
    bonus: [
      { t: "Nutze einen Hex-Farbcode wie #2a9d8f.", check: c => c.decls.some(d => /#[0-9a-f]{3,8}\b/i.test(d.value)) },
      { t: "Zusatzfrage: Lösche kurz die link-Zeile – was passiert? (Danach wieder einfügen!)" }
    ]
  },
  {
    id: "s09", nr: 9, phase: "C · Design (CSS)", icon: "🔤", titel: "Schrift & Vererbung",
    ziel: "Du kannst Schriften gestalten und erklären, welche Regel gilt, wenn sich zwei Regeln widersprechen.",
    lernen: `
      ${pre(`body {
  font-family: Verdana, Arial, sans-serif;  /* Schriftart (mit Ersatz) */
  font-size: 18px;                          /* Schriftgröße */
  line-height: 1.6;                         /* Zeilenabstand */
}
h1 {
  text-align: center;                       /* left, center, right */
  font-weight: bold;
}`)}
      <p>🧬 <b>Vererbung:</b> Was du für ${k("body")} festlegst, gilt für alles darin – die Elemente „erben“ es. Gibt es aber eine <b>genauere Regel</b>, z. B. für ${k("p")}, dann gewinnt die genauere.</p>
      <details class="quiz"><summary>❓ body hat font-size: 20px, p hat font-size: 14px. Wie groß ist der Text im Absatz?</summary><p><b>14px</b> – die Regel für p ist genauer als die für body und gewinnt. Text ohne eigene Regel erbt die 20px vom body. Überschriften haben übrigens eine eigene Standardgröße, die sich daran orientiert: ein h1 ist doppelt so groß wie der Text im body.</p></details>
      <p>💡 Sichere Schriften, die jeder Computer hat: Arial, Verdana, Georgia, Trebuchet MS, Courier New.</p>`,
    beispiel: {
      html: `<h1>Rezept: Pfannkuchen</h1>
<p>Du brauchst Mehl, Milch und Eier.</p>`,
      css: `body {
  font-family: Georgia, serif;
  font-size: 20px;
}
p {
  font-size: 14px;
}`,
      aufgabe: "Zentriere die Überschrift (text-align) und gib den Absätzen einen größeren Zeilenabstand (line-height).",
      check: c => c.rules.some(r => /h1/.test(r.sel) && /center/.test(r.decls["text-align"] || "")) && c.has("line-height"),
      ok: "Richtig – und siehst du, dass die Absätze 14px groß sind? Die genauere Regel gewinnt."
    },
    pflicht: [
      { t: "Lege eine Schriftart fest (font-family).", check: c => c.has("font-family") },
      { t: "Ändere eine Schriftgröße (font-size).", check: c => c.has("font-size") },
      { t: "Nutze text-align (z. B. Überschrift zentriert).", check: c => c.has("text-align") }
    ],
    bonus: [
      { t: "Verbessere die Lesbarkeit mit line-height.", check: c => c.has("line-height") },
      { t: "Gestalte Überschriften und Text mit zwei verschiedenen Schriftarten.", check: c => new Set(c.decls.filter(d => d.prop === "font-family").map(d => d.value)).size >= 2 }
    ]
  },
  {
    id: "s10", nr: 10, phase: "C · Design (CSS)", icon: "🎯", titel: "Klassen & IDs",
    ziel: "Du kannst einzelne Elemente gezielt gestalten, indem du Klassen und IDs vergibst und im CSS benutzt.",
    lernen: `
      <p>Mit ${k("p { … }")} färbst du <b>alle</b> Absätze. Willst du nur <b>bestimmte</b> gestalten, gibst du ihnen eine <b>Klasse</b>:</p>
      <div class="duo">
        <div><h4>📄 im HTML – ohne Punkt</h4>${pre(`<p class="tipp">Trink genug Wasser!</p>`)}</div>
        <div><h4>🎨 im CSS – mit Punkt</h4>${pre(`.tipp {
  background-color: #fef3c7;
}`)}</div>
      </div>
      <p>Eine Klasse kann man <b>beliebig oft</b> verwenden. Eine <b>ID</b> dagegen gibt es nur <b>einmal</b> auf der Seite: im HTML ${k('id="titel"')}, im CSS ${k("#titel { … }")}.</p>
      <p>💡 Klassennamen: keine Leerzeichen, keine Umlaute, am besten sprechend: ${k(".tipp")}, ${k(".rezept-box")}.</p>`,
    beispiel: {
      html: `<h1 id="titel">Fitness-Tipps</h1>
<p>Beweg dich jeden Tag.</p>
<p>Trink genug Wasser.</p>
<p>Schlaf mindestens 9 Stunden.</p>`,
      css: `.wichtig {
  background-color: #fee2e2;
  border-left: 5px solid #dc2626;
  padding: 6px;
}
#titel {
  color: #dc2626;
}`,
      aufgabe: "Gib dem dritten Absatz die Klasse wichtig.",
      check: c => { const p = c.$$("p"); return p.length >= 3 && p[2].classList.contains("wichtig"); },
      ok: "Genau – im HTML ohne Punkt, im CSS mit Punkt."
    },
    pflicht: [
      { t: "Mindestens 2 eigene Klassen: im CSS gestaltet und im HTML benutzt.", check: c => c.countUsedClasses() >= 2 },
      { t: "Eine ID: im CSS gestaltet (#name) und im HTML benutzt.", check: c => [...c.idsDefined].some(x => c.idsUsed.has(x)) }
    ],
    bonus: [
      { t: "Nutze eine Klasse für mehrere Elemente gleichzeitig.", check: c => [...c.classesDefined].some(cl => c.$$("." + CSS.escape(cl)).length >= 2) },
      { t: "Gib einem Element zwei Klassen: class=\"tipp gross\".", check: c => c.$$("[class]").some(e => e.classList.length >= 2) }
    ]
  },
  {
    id: "s11", nr: 11, phase: "C · Design (CSS)", icon: "📦", titel: "Das Box-Modell",
    ziel: "Du kannst Innenabstand, Rahmen und Außenabstand unterscheiden und gezielt einsetzen.",
    lernen: `
      <p>Für den Browser ist <b>jedes</b> Element eine Box – mit vier Schichten:</p>
      <div class="boxmodel">
        <div class="bm-margin"><span>margin (Außenabstand)</span>
          <div class="bm-border"><span>border (Rahmen)</span>
            <div class="bm-padding"><span>padding (Innenabstand)</span>
              <div class="bm-content">Inhalt</div>
            </div>
          </div>
        </div>
      </div>
      ${pre(`.box {
  width: 300px;
  padding: 15px;                 /* Platz innen */
  border: 4px solid teal;        /* Dicke, Linienart, Farbe */
  margin: 20px;                  /* Platz außen */
  border-radius: 12px;           /* runde Ecken */
}`)}
      <p>⚠️ Beim Rahmen brauchst du immer eine Linienart: ${k("solid")}, ${k("dotted")}, ${k("dashed")} oder ${k("double")}.</p>
      <div class="locked-hint">🔍 Neu freigeschaltet: der <b>Röntgenblick</b> über deiner Vorschau. Er zeigt alle Boxen deiner Seite.</div>`,
    beispiel: {
      html: `<div class="box">Ich bin eine Box mit Text.</div>
<p>Ich bin ein Absatz darunter.</p>`,
      css: `.box {
  background-color: #e0f2fe;
  width: 200px;
  border: 2px solid black;
}`,
      aufgabe: "Stelle ein: Breite 300px · Rahmen 6px dotted green · Innenabstand 15px · Außenabstand 30px.",
      check: c => { const r = c.rules.find(x => /\.box/.test(x.sel)); return !!r && /300/.test(r.decls.width || "") && /6px/.test(r.decls.border || "") && /dotted/.test(r.decls.border || "") && /green/.test(r.decls.border || "") && /15/.test(r.decls.padding || "") && /30/.test(r.decls.margin || ""); },
      ok: "Stark – siehst du den Unterschied zwischen Innen- und Außenabstand?"
    },
    pflicht: [
      { t: "Gestalte eine Info-Box mit padding, border und margin (in einer Regel).", check: c => c.rules.some(r => Object.keys(r.decls).some(p => p.startsWith("padding")) && Object.keys(r.decls).some(p => p.startsWith("margin")) && Object.keys(r.decls).some(p => /^border(-(top|right|bottom|left))?$/.test(p))) }
    ],
    bonus: [
      { t: "Runde Ecken mit border-radius.", check: c => c.has("border-radius") },
      { t: "Ein Schatten mit box-shadow.", check: c => c.has("box-shadow") },
      { t: "Begrenze die Breite deiner Seite mit max-width, damit Zeilen nicht zu lang werden.", check: c => c.has("max-width") }
    ]
  },
  {
    id: "s12", nr: 12, phase: "C · Design (CSS)", icon: "🧱", titel: "Bereiche mit div",
    ziel: "Du kannst deine Seite mit div-Boxen in Bereiche gliedern und Boxen ineinander verschachteln.",
    lernen: `
      <p>Ein ${k("<div>")} ist eine <b>unsichtbare Box</b>, in die du andere Elemente legst – wie Schachteln in einer großen Schachtel. Erst mit CSS bekommen die Boxen Farbe, Abstand und Rahmen.</p>
      <div class="duo">
        ${pre(`<div class="kopf">
  <h1>Mein Thema</h1>
</div>
<div class="inhalt">
  <div class="karte">…</div>
  <div class="karte">…</div>
</div>
<div class="fuss">© 2026</div>`)}
        <div class="layout-sketch"><div class="ls-kopf">kopf</div><div class="ls-inhalt">inhalt<div class="ls-karten"><span>karte</span><span>karte</span></div></div><div class="ls-fuss">fuss</div></div>
      </div>
      <p>💡 Es gibt auch Boxen mit Bedeutung: ${k("<header>")}, ${k("<main>")}, ${k("<section>")}, ${k("<footer>")}. Sie funktionieren wie ${k("<div>")}, sagen aber, was drin ist.</p>
      <p>👀 <b>Einrücken</b> zeigt, was in was steckt. So findest du Fehler viel schneller.</p>`,
    beispiel: {
      html: `<div class="karten">
  <div class="karte">🦁 Löwe</div>
  <div class="karte">🐘 Elefant</div>
</div>`,
      css: `.karten {
  background-color: #f1f5f9;
  padding: 10px;
}
.karte {
  background-color: white;
  border: 2px solid #94a3b8;
  border-radius: 10px;
  padding: 12px;
  margin: 8px;
}`,
      aufgabe: "Füge innerhalb von .karten eine dritte Karte hinzu.",
      check: c => c.$$(".karten .karte").length >= 3,
      ok: "Genau – die neue Box steckt in der großen Box und bekommt automatisch dasselbe Design."
    },
    pflicht: [
      { t: "Teile deine Seite in mindestens 3 Bereiche (div, header, section, footer …) mit Klasse oder passendem Tag.", check: c => c.$$("div, section, header, footer, main, nav, article, aside").filter(e => e.className || /HEADER|FOOTER|MAIN|NAV|SECTION/.test(e.tagName)).length >= 3 },
      { t: "Mindestens ein Bereich steckt in einem anderen (verschachtelt).", check: c => c.$$("div, section, header, footer, main, nav, article, aside").some(e => e.parentElement && e.parentElement.closest("div, section, header, footer, main, nav, article, aside")) }
    ],
    bonus: [
      { t: "Nutze <header> und <footer> für Kopf und Fuß deiner Seite.", check: c => c.$$("header").length && c.$$("footer").length },
      { t: "Jeder Bereich hat eine eigene Hintergrundfarbe.", check: c => c.rules.filter(r => r.decls["background-color"] || r.decls.background).length >= 3 }
    ]
  },

  /* ---------------- D · Layout & Abschluss ---------------- */
  {
    id: "s13", nr: 13, phase: "D · Layout & Abschluss", icon: "↔️", titel: "Nebeneinander mit Flexbox",
    ziel: "Du kannst Elemente mit Flexbox nebeneinander anordnen und Abstände sowie Ausrichtung steuern.",
    lernen: `
      <p>Normalerweise stapeln sich Boxen untereinander. Mit ${k("display: flex;")} auf der <b>äußeren Box</b> stehen die inneren Boxen <b>nebeneinander</b>:</p>
      ${pre(`.galerie {
  display: flex;             /* Kinder nebeneinander */
  gap: 15px;                 /* Abstand dazwischen */
  justify-content: center;   /* waagrecht: start, center, space-between */
  align-items: center;       /* senkrecht ausrichten */
  flex-wrap: wrap;           /* umbrechen, wenn kein Platz */
}`)}
      <p>⚠️ ${k("display: flex")} gehört an den <b>Container</b> (die äußere Box), nicht an die einzelnen Bilder.</p>
      <p>🧱 Hintergrund: ${k("<p>")}, ${k("<h1>")}, ${k("<div>")} sind <b>Block-Elemente</b> (stapeln sich), ${k("<a>")}, ${k("<img>")}, ${k("<strong>")} sind <b>Inline-Elemente</b> (laufen im Text mit).</p>`,
    beispiel: {
      html: `<div class="galerie">
  <img src="${IMG("berg")}" alt="Berg" width="140">
  <img src="${IMG("see")}" alt="See" width="140">
  <img src="${IMG("wald")}" alt="Wald" width="140">
</div>`,
      css: `.galerie {
  display: flex;
  background-color: #f8fafc;
}`,
      aufgabe: "Sorge für 20px Abstand zwischen den Bildern (gap) und zentriere sie (justify-content).",
      check: c => { const r = c.rules.find(x => /\.galerie/.test(x.sel)); return !!r && !!r.decls.gap && /center/.test(r.decls["justify-content"] || ""); },
      ok: "So entstehen Galerien, Karten-Reihen und Menüs."
    },
    pflicht: [
      { t: "Nutze display: flex für einen Container, in dem mindestens 2 Elemente nebeneinander stehen.", check: c => c.rules.some(r => /flex|grid/.test(r.decls.display || "") && c.$$(r.sel.split(":")[0]).some(e => e.children.length >= 2)) }
    ],
    bonus: [
      { t: "Nutze gap für Abstände.", check: c => c.has("gap") },
      { t: "Mit flex-wrap: wrap brechen die Elemente bei wenig Platz um.", check: c => c.has("flex-wrap", /wrap/) }
    ]
  },
  {
    id: "s14", nr: 14, phase: "D · Layout & Abschluss", icon: "🧭", titel: "Navigation & Hover",
    ziel: "Du kannst ein Menü mit Sprunglinks bauen und Elemente beim Drüberfahren mit der Maus verändern.",
    lernen: `
      <p>Ein Menü ist eine Reihe von Links in einem ${k("<nav>")}. <b>Sprunglinks</b> führen zu einem Bereich auf derselben Seite:</p>
      <div class="duo">
        ${pre(`<nav>
  <a href="#steckbrief">Steckbrief</a>
  <a href="#bilder">Bilder</a>
</nav>

<h2 id="bilder">Bilder</h2>`)}
        ${pre(`nav {
  display: flex;
  gap: 20px;
}
nav a:hover {
  color: orange;   /* beim Drüberfahren */
}`)}
      </div>
      <p>🔗 ${k('href="#bilder"')} springt zum Element mit ${k('id="bilder"')}. Das # bedeutet „auf dieser Seite“.</p>
      <p>🖱️ ${k(":hover")} ist ein Zustand: „wenn die Maus darüber ist“. Mit ${k("transition: 0.3s;")} wird der Wechsel weich.</p>`,
    beispiel: {
      html: `<nav>
  <a href="#a">Start</a>
  <a href="#b">Fotos</a>
  <a href="#c">Kontakt</a>
</nav>
<h2 id="a">Start</h2>
<p>Willkommen auf meiner Seite!</p>
<h2 id="b">Fotos</h2>
<p>Hier kommen bald Bilder hin.</p>
<h2 id="c">Kontakt</h2>
<p>Schreib mir über die Schul-Mail.</p>`,
      css: `nav {
  display: flex;
  gap: 15px;
  background-color: #1e293b;
  padding: 10px;
}
nav a {
  color: white;
  text-decoration: none;
}`,
      aufgabe: "Lass die Links beim Drüberfahren gelb werden (nav a:hover { color: … }).",
      check: c => c.rules.some(r => /:hover/.test(r.sel) && (r.decls.color || r.decls["background-color"] || r.decls.background)),
      ok: "Fahr mit der Maus drüber – und klick die Links an: Sie springen zum Abschnitt."
    },
    pflicht: [
      { t: "Ein Menü (<nav>) mit mindestens 3 Sprunglinks, die wirklich zu einer id auf deiner Seite führen.", check: c => c.$$("nav a[href^='#'], [class*=nav] a[href^='#'], [class*=menu] a[href^='#']").filter(a => c.doc.getElementById(a.getAttribute("href").slice(1))).length >= 3 },
      { t: "Ein Hover-Effekt (:hover) im CSS.", check: c => c.rules.some(r => /:hover/.test(r.sel)) }
    ],
    bonus: [
      { t: "Mach den Wechsel weich mit transition.", check: c => c.has("transition") },
      { t: "Entferne die Unterstreichung der Menü-Links (text-decoration: none).", check: c => c.has("text-decoration", /none/) }
    ]
  },
  {
    id: "s15", nr: 15, phase: "D · Layout & Abschluss", icon: "🔍", titel: "Feinschliff & Partner-Check",
    ziel: "Du kannst deine Seite nach Kriterien überprüfen und eine Rückmeldung umsetzen.",
    lernen: `
      <p>Profis testen ihre Seite, bevor sie online geht. Prüfe deine Seite mit dieser Liste:</p>
      <ul class="check-list">
        <li>👀 <b>Lesbar?</b> Genug Kontrast zwischen Text und Hintergrund, Schrift nicht zu klein.</li>
        <li>📐 <b>Ordentlich?</b> Abstände einheitlich, nichts klebt am Rand.</li>
        <li>🧭 <b>Zusammenhängend?</b> Passen Farben und Schriften zueinander? Ist das Thema sofort klar?</li>
        <li>♿ <b>Für alle?</b> Jedes Bild hat einen alt-Text, Linktexte sagen, wohin es geht.</li>
        <li>🧹 <b>Sauberer Code?</b> Fehler-Detektiv zeigt 0 Fehler, der Code ist eingerückt.</li>
      </ul>
      <div class="note">👥 <b>Partner-Check:</b> Tauscht die Plätze. Schaut euch die Seite des anderen 5 Minuten an und gebt <b>zwei Sterne und einen Wunsch</b>: zwei Dinge, die gut sind, und eins, das besser werden kann.</div>`,
    beispiel: null,
    pflicht: [
      { t: "Der Fehler-Detektiv findet keinen Fehler mehr.", check: c => c.errors === 0 },
      { t: "Ich habe den Partner-Check gemacht und den Wunsch umgesetzt." }
    ],
    bonus: [
      { t: "Alle Bilder haben einen alt-Text.", check: c => c.$$("img").length > 0 && c.$$("img").every(i => (i.getAttribute("alt") || "").trim().length > 3) },
      { t: "Deine Seite hat eine maximale Breite und ist mittig (max-width + margin: auto).", check: c => c.has("max-width") && c.has("margin", /auto/) }
    ]
  },
  {
    id: "s16", nr: 16, phase: "D · Layout & Abschluss", icon: "🎤", titel: "Abnahme: Code erklären",
    ziel: "Du kannst deinen eigenen Code erklären und eine kleine Änderung live einbauen.",
    lernen: `
      <p>Bei der <b>Abnahme</b> setzt du dich mit deiner Lehrkraft vor deine Seite. Ablauf (ca. 3 Minuten):</p>
      <ol class="tight">
        <li>Du zeigst kurz deine Seite: Thema, Aufbau, worauf du stolz bist.</li>
        <li>Deine Lehrkraft zeigt auf <b>drei Stellen</b> in deinem Code. Du erklärst, was sie bewirken.</li>
        <li>Du baust eine <b>kleine Änderung live</b> ein (z. B. „Mach die Überschrift grün“).</li>
      </ol>
      <div class="note">🤖 <b>KI-Regel:</b> Code von einer KI darfst du nur behalten, wenn du ihn <b>vollständig erklären</b> kannst. Das zeigt sich bei der Abnahme.</div>
      <p>🏋️ Übe mit dem <b>Erklär-Training</b>: Es sucht zufällige Zeilen aus deinem Code aus. Erkläre sie laut einem Partner.</p>
      <div id="erklaer-training"></div>`,
    beispiel: null,
    pflicht: [{ t: "Ich habe mit dem Erklär-Training mindestens 5 Zeilen laut erklärt." }],
    bonus: [{ t: "Ich kann erklären, wie meine CSS-Datei mit der HTML-Datei verbunden ist." }]
  }
];

/* ---------------- Profi-Pfad (freiwillig, zählt als Bonus) ---------------- */
const PROFI = [
  {
    id: "p1", nr: "P1", phase: "Profi-Pfad", icon: "🌄", titel: "Text auf einem Hintergrundbild", profi: true,
    ziel: "Du kannst ein Bild als Hintergrund einer Box nutzen und Text darauf platzieren.",
    lernen: `${pre(`.titelbild {
  background-image: url("https://…/berg.svg");
  background-size: cover;       /* Bild füllt die Box */
  background-position: center;
  min-height: 250px;
  color: white;
  padding: 40px;
}`)}
      <p>💡 Damit Text gut lesbar ist: ${k("text-shadow: 0 2px 6px black;")}</p>`,
    beispiel: {
      html: `<div class="titelbild">
  <h2>Willkommen in den Bergen</h2>
  <h3>Wandern · Klettern · Staunen</h3>
</div>`,
      css: `.titelbild {
  background-image: url("${IMG("berg")}");
  background-size: cover;
  min-height: 200px;
  padding: 30px;
}`,
      aufgabe: "Mach den Text weiß und gut lesbar (color + text-shadow).",
      check: c => c.rules.some(r => /white|#fff/i.test(r.decls.color || "")) && c.has("text-shadow"),
      ok: "So sehen viele Startseiten aus."
    },
    pflicht: [{ t: "Eine Box mit Hintergrundbild (background-image) und Text darauf.", check: c => c.has("background-image", /url\(/) || c.has("background", /url\(/) }],
    bonus: [{ t: "Text mit text-shadow gut lesbar gemacht.", check: c => c.has("text-shadow") }]
  },
  {
    id: "p2", nr: "P2", phase: "Profi-Pfad", icon: "✨", titel: "Übergänge & Animation", profi: true,
    ziel: "Du kannst Bewegung mit transition und @keyframes erzeugen.",
    lernen: `${pre(`.karte {
  transition: transform 0.3s;    /* Änderungen dauern 0,3 Sekunden */
}
.karte:hover {
  transform: scale(1.05);        /* leicht vergrößern */
}

@keyframes wackeln {
  0%   { transform: rotate(0deg); }
  50%  { transform: rotate(5deg); }
  100% { transform: rotate(0deg); }
}
.logo {
  animation: wackeln 1s infinite;
}`)}`,
    beispiel: {
      html: `<div class="knopf">Fahr über mich!</div>`,
      css: `.knopf {
  display: inline-block;
  padding: 15px 25px;
  background-color: #6366f1;
  color: white;
  border-radius: 10px;
}`,
      aufgabe: "Lass den Knopf beim Drüberfahren größer werden (transform: scale) – mit weichem Übergang (transition).",
      check: c => c.rules.some(r => /:hover/.test(r.sel) && /scale/.test(r.decls.transform || "")) && c.has("transition"),
      ok: "Kleine Bewegungen machen Seiten lebendig – aber sparsam einsetzen!"
    },
    pflicht: [{ t: "Ein Übergang (transition) oder eine Animation (@keyframes + animation).", check: c => c.has("transition") || c.has("animation") || c.has("animation-name") }],
    bonus: [{ t: "Eine eigene @keyframes-Animation.", check: c => c.rules.some(r => r.keyframes) }]
  },
  {
    id: "p3", nr: "P3", phase: "Profi-Pfad", icon: "📊", titel: "Tabellen", profi: true,
    ziel: "Du kannst Daten übersichtlich in einer Tabelle darstellen.",
    lernen: `${pre(`<table>
  <tr>              ← Zeile 1: Kopfzeile
    <th>Tier</th>
    <th>Gewicht</th>
  </tr>
  <tr>              ← Zeile 2: Daten
    <td>Fuchs</td>
    <td>7 kg</td>
  </tr>
</table>`)}
      <p>${k("tr")} = Zeile (table row), ${k("th")} = Kopfzelle, ${k("td")} = Datenzelle. Im CSS: ${k("border-collapse: collapse;")} für saubere Linien.</p>`,
    beispiel: {
      html: `<table>
  <tr>
    <th>Planet</th>
    <th>Platz von der Sonne</th>
  </tr>
  <tr>
    <td>Merkur</td>
    <td>1</td>
  </tr>
  <tr>
    <td>Venus</td>
    <td>2</td>
  </tr>
  <tr>
    <td>Erde</td>
    <td>3</td>
  </tr>
</table>`,
      css: `table {
  border-collapse: collapse;
}
th, td {
  border: 1px solid #94a3b8;
  padding: 6px 12px;
}
th {
  background-color: #e2e8f0;
}`,
      aufgabe: "Füge eine Zeile für den Mars hinzu (Platz 4).",
      check: c => c.$$("tr").length >= 5 && /mars/i.test(c.doc.body.textContent),
      ok: "Tabellen nur für Daten nutzen – nicht für das Layout."
    },
    pflicht: [{ t: "Eine Tabelle mit Kopfzeile und mind. 2 Datenzeilen.", check: c => c.$$("table th").length >= 1 && c.$$("table tr").length >= 3 }],
    bonus: [{ t: "Jede zweite Zeile andersfarbig: tr:nth-child(even) { … }.", check: c => c.rules.some(r => /nth-child/.test(r.sel)) }]
  },
  {
    id: "p4", nr: "P4", phase: "Profi-Pfad", icon: "📱", titel: "Fürs Handy anpassen", profi: true,
    ziel: "Du kannst mit @media das Design für kleine Bildschirme anpassen.",
    lernen: `${pre(`@media (max-width: 600px) {
  /* gilt nur, wenn der Bildschirm höchstens 600px breit ist */
  .galerie {
    flex-direction: column;
  }
  h1 {
    font-size: 24px;
  }
}`)}
      <p>💡 Die kleine Vorschau beim Ausprobieren ist schmaler als 600px – dort siehst du die Wirkung sofort. Deine eigene Seite testest du am besten mit <b>„📱 Auf Handy/iPad ansehen“</b>.</p>`,
    beispiel: {
      html: `<div class="reihe">
  <div>A</div>
  <div>B</div>
  <div>C</div>
</div>`,
      css: `.reihe {
  display: flex;
  gap: 10px;
}
.reihe div {
  background: #fde68a;
  padding: 20px;
  flex: 1;
}`,
      aufgabe: "Ergänze unten eine @media-Regel (max-width: 600px), in der .reihe die Kästen untereinander stellt (flex-direction: column).",
      check: c => c.rules.some(r => r.media && /column/.test(r.decls["flex-direction"] || "")),
      ok: "So passt sich eine Seite an jedes Gerät an („responsive“)."
    },
    pflicht: [{ t: "Mindestens eine @media-Regel auf deiner Seite.", check: c => c.rules.some(r => r.media) }],
    bonus: []
  },
  {
    id: "p5", nr: "P5", phase: "Profi-Pfad", icon: "🔲", titel: "Raster mit CSS-Grid", profi: true,
    ziel: "Du kannst mit CSS-Grid ein Raster aus Spalten bauen.",
    lernen: `${pre(`.raster {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;   /* 3 gleich breite Spalten */
  gap: 12px;
}`)}
      <p>${k("1fr")} = ein Anteil des freien Platzes. ${k("2fr 1fr")} heißt: linke Spalte doppelt so breit.</p>`,
    beispiel: {
      html: `<div class="raster">
  <div>1</div>
  <div>2</div>
  <div>3</div>
  <div>4</div>
  <div>5</div>
  <div>6</div>
</div>`,
      css: `.raster {
  display: grid;
  gap: 8px;
}
.raster div {
  background: #c7d2fe;
  padding: 20px;
  text-align: center;
}`,
      aufgabe: "Ordne die Kästen in 3 Spalten an (grid-template-columns).",
      check: c => c.has("grid-template-columns"),
      ok: "Grid eignet sich super für Fotogalerien und ganze Seitenlayouts."
    },
    pflicht: [{ t: "Ein Raster mit display: grid und grid-template-columns.", check: c => c.has("display", /grid/) && c.has("grid-template-columns") }],
    bonus: []
  },
  {
    id: "p6", nr: "P6", phase: "Profi-Pfad", icon: "🎛️", titel: "Eigene Farbvariablen", profi: true,
    ziel: "Du kannst Farben einmal festlegen und überall wiederverwenden.",
    lernen: `${pre(`:root {
  --hauptfarbe: #0ea5e9;
  --hintergrund: #f0f9ff;
}
h1 {
  color: var(--hauptfarbe);
}
body {
  background-color: var(--hintergrund);
}`)}
      <p>Ändere die Farbe an <b>einer</b> Stelle – und die ganze Seite passt sich an.</p>`,
    beispiel: {
      html: `<h1>Farbwelt</h1>
<p class="box">Ein Kasten</p>`,
      css: `:root {
  --farbe: tomato;
}
h1 {
  color: var(--farbe);
}
.box {
  border: 3px solid black;
  padding: 10px;
}`,
      aufgabe: "Gib auch dem Rahmen der .box die Variable --farbe (border: 3px solid var(--farbe)).",
      check: c => c.rules.some(r => /\.box/.test(r.sel) && /var\(--farbe\)/.test(r.decls.border || r.decls["border-color"] || "")),
      ok: "Jetzt ändere oben tomato in eine andere Farbe – beides ändert sich."
    },
    pflicht: [{ t: "Mindestens eine eigene Variable in :root, die du mit var(--…) benutzt.", check: c => c.decls.some(d => d.prop.startsWith("--")) && c.decls.some(d => /var\(--/.test(d.value)) }],
    bonus: []
  }
];

const ALLE = [...STATIONEN, ...PROFI];

/* ---------------- Spickzettel ---------------- */
const SPICK_HTML = [
  ["<h1> … </h1>", "Hauptüberschrift (h2–h6 für Unterüberschriften)"], ["<p> … </p>", "Absatz"], ["<br>", "Zeilenumbruch"], ["<hr>", "Trennlinie"],
  ["<strong> … </strong>", "wichtig (fett)"], ["<em> … </em>", "betont (kursiv)"], ["<ul><li> … </li></ul>", "Liste mit Punkten"], ["<ol><li> … </li></ol>", "nummerierte Liste"],
  ['<a href="https://…"> … </a>', "Link"], ['<img src="…" alt="…">', "Bild"], ['<iframe src="…"></iframe>', "eingebettetes Video"],
  ['<div class="…"> … </div>', "Box / Bereich"], ["<header> <main> <footer> <nav> <section>", "Bereiche mit Bedeutung"], ['<span class="…"> … </span>', "Stück Text gestalten"]
];
const SPICK_CSS = [
  ["color: navy;", "Textfarbe"], ["background-color: #fef3c7;", "Hintergrundfarbe"], ["font-family: Verdana, sans-serif;", "Schriftart"], ["font-size: 18px;", "Schriftgröße"],
  ["font-weight: bold;", "fett"], ["text-align: center;", "Ausrichtung"], ["line-height: 1.6;", "Zeilenabstand"], ["width: 300px; max-width: 900px;", "Breite"],
  ["padding: 15px;", "Innenabstand"], ["margin: 20px;  margin: 0 auto;", "Außenabstand / mittig"], ["border: 3px solid teal;", "Rahmen"], ["border-radius: 10px;", "runde Ecken"],
  ["box-shadow: 0 4px 10px gray;", "Schatten"], ["display: flex; gap: 10px;", "nebeneinander"], ["justify-content: center;", "waagrecht ausrichten"], ["text-decoration: none;", "Unterstrich weg"],
  ["a:hover { … }", "beim Drüberfahren"], [".klasse { … }   #id { … }", "Klasse / ID"]
];
