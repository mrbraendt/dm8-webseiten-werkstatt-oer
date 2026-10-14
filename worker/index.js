// Webseiten-Werkstatt – Cloudflare Worker
// Speichert pro Klasse + Vorname + PIN die Webseite (HTML/CSS), den Fortschritt und Versionen.
// Nur Vorname (bei Doppelten mit Nachnamen-Initial), keine E-Mail. Lehrkraft-Zugriff nur mit TEACHER_KEY (Secret).
// Freigegebene Seiten sind unter /s/<zufallscode> erreichbar (für Handy/iPad), in einer abgeschotteten Sandbox.

const MAX_CODE = 200_000;      // Zeichen pro Datei
const MAX_VERSIONS = 60;       // pro Person
const VERSION_GAP_MIN = 10;    // höchstens alle 10 Minuten eine Sicherung
const FREE_FAILS = 3;          // so viele Fehlversuche ohne Wartezeit
const MAX_WAIT_S = 300;        // längste Wartezeit nach falscher PIN: 5 Minuten
const MAX_PER_KURS = 60;       // höchstens so viele Konten pro Klasse (Bremse gegen Massen-Anlegen)

const START_HTML = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <title>Meine Seite</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <h1>Mein Thema</h1>
  <p>Hier entsteht meine Webseite.</p>
</body>
</html>
`;
const START_CSS = `/* Hier kommt später das Design hin */
`;

// Sicherheits-Header für alle Antworten. Bewusst KEINE eigene CSP für die App: Die Vorschau-iframes
// nutzen srcdoc und erben eine Eltern-CSP; eine strenge Richtlinie könnte CodeMirror/Vorschau brechen.
// Rahmenschutz per X-Frame-Options betrifft nur das Einbetten der App selbst, nicht die srcdoc-Vorschau.
function secure(res) {
  const r = new Response(res.body, res);
  r.headers.set("x-content-type-options", "nosniff");
  r.headers.set("referrer-policy", "same-origin");
  r.headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  r.headers.set("x-frame-options", "DENY");
  return r;
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const fail = (msg, status = 400) => json({ error: msg }, status);
const now = () => new Date().toISOString();

const kurse = env => (env.KURSE || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const cleanNick = n => String(n || "").trim().replace(/\s+/g, " ").slice(0, 20);
const nickKey = n => cleanNick(n).toLowerCase();

let saltWarned = false;
async function hashPin(env, kurs, key, pin) {
  // Ohne PIN_SALT gilt weiter der alte Standardwert, damit bestehende PINs gültig bleiben
  // (eine harte Fehlermeldung würde alle Schüler aussperren). Secret PIN_SALT setzen: siehe LIESMICH.md.
  if (!env.PIN_SALT && !saltWarned) { saltWarned = true; console.warn("PIN_SALT ist nicht gesetzt – Standard-Salt aktiv."); }
  const data = new TextEncoder().encode(`${env.PIN_SALT || "werkstatt"}|${kurs}|${key}|${pin}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Vergleich in konstanter Zeit: beide Seiten hashen (gleich lang), dann alle Bytes verrechnen.
async function sameSecret(a, b) {
  const h = async x => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(x))));
  const [x, y] = await Promise.all([h(a), h(b)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

// Wartezeit nach falscher PIN (Sekunden) in Abhängigkeit von der Zahl der Fehlversuche:
// bis FREE_FAILS keine, dann 30 s, 60 s, 120 s, 240 s, ab da höchstens MAX_WAIT_S.
const waitSeconds = fails => fails < FREE_FAILS ? 0 : Math.min(MAX_WAIT_S, 30 * 2 ** (fails - FREE_FAILS));

async function body(request) {
  try { return await request.json(); } catch { return {}; }
}

// Schüler-Anmeldung prüfen. Gibt die Zeile zurück oder eine Fehler-Response.
async function auth(env, b) {
  const kurs = String(b.kurs || "").trim().toLowerCase();
  const key = nickKey(b.nick);
  const pin = String(b.pin || "");
  if (!kurse(env).includes(kurs)) return { err: fail("Diese Klasse gibt es nicht. Schreib sie so: 8a, 8b, 8c …", 404) };
  if (!key || !/^\d{4}$/.test(pin)) return { err: fail("Vorname und vierstellige PIN eingeben.") };
  const row = await env.DB.prepare("SELECT * FROM students WHERE kurs = ? AND nick_key = ?").bind(kurs, key).first();
  if (!row) return { err: fail("Diesen Namen gibt es in deiner Klasse noch nicht. Neu hier? Dann „Konto anlegen“.", 404), kurs, key, pin };
  // Zeitliche Sperre statt Dauersperre: Nach FREE_FAILS Fehlversuchen wächst die Wartezeit (max. 5 Min.).
  // Wer die PIN nur errät, kann das Konto so nicht dauerhaft für die Besitzerin/den Besitzer blockieren.
  // Zeitpunkt des letzten Fehlversuchs steht ohne Schema-Änderung in ratings.updated_at (Zeile mit leerem
  // data = "{}"; die Lehrkraft-Bewertung überschreibt nur data und den Zeitstempel, das schadet nicht).
  // Die Lehrkraft hebt die Wartezeit mit „PIN zurücksetzen“ sofort auf (fails = 0).
  if (row.fails >= FREE_FAILS) {
    const r = await env.DB.prepare("SELECT updated_at FROM ratings WHERE kurs = ? AND nick_key = ?").bind(kurs, key).first();
    const rest = Math.ceil(waitSeconds(row.fails) - (Date.now() - Date.parse(r?.updated_at || 0)) / 1000);
    if (rest > 0) return { err: fail(`Zu viele falsche PINs. Bitte warte ${rest <= 60 ? rest + " Sekunden" : Math.ceil(rest / 60) + " Minuten"} und versuche es dann noch einmal. (Deine Lehrkraft kann die PIN auch zurücksetzen.)`, 429) };
  }
  if (row.pin_hash !== await hashPin(env, kurs, key, pin)) {
    await env.DB.prepare("UPDATE students SET fails = fails + 1 WHERE kurs = ? AND nick_key = ?").bind(kurs, key).run();
    await env.DB.prepare(`INSERT INTO ratings (kurs, nick_key, data, updated_at) VALUES (?, ?, '{}', ?)
      ON CONFLICT (kurs, nick_key) DO UPDATE SET updated_at = excluded.updated_at`).bind(kurs, key, now()).run();
    return { err: fail("Die PIN stimmt nicht.", 401) };
  }
  if (row.fails) await env.DB.prepare("UPDATE students SET fails = 0 WHERE kurs = ? AND nick_key = ?").bind(kurs, key).run();
  return { row, kurs, key };
}

function publicRow(row) {
  return {
    nick: row.nick, html: row.html, css: row.css, share: row.share || null,
    progress: JSON.parse(row.progress || "{}"), updated_at: row.updated_at
  };
}

async function student(request, env, path) {
  const b = await body(request);

  if (path === "/api/register") {
    const kurs = String(b.kurs || "").trim().toLowerCase();
    const nick = cleanNick(b.nick), key = nickKey(b.nick), pin = String(b.pin || "");
    if (!kurse(env).includes(kurs)) return fail("Diese Klasse gibt es nicht. Schreib sie so: 8a, 8b, 8c …", 404);
    if (nick.length < 2 || !/^[\p{L}][\p{L} .'-]*$/u.test(nick)) return fail("Bitte nur deinen Vornamen eintragen (Buchstaben, bei Doppelten z. B. „Lena M.“).");
    if (!/^\d{4}$/.test(pin)) return fail("Die PIN muss genau 4 Ziffern haben.");
    const exists = await env.DB.prepare("SELECT 1 FROM students WHERE kurs = ? AND nick_key = ?").bind(kurs, key).first();
    if (exists) return fail("Diesen Namen gibt es in deiner Klasse schon. Wenn das nicht du bist: Hänge den ersten Buchstaben deines Nachnamens an, z. B. „Lena M.“.", 409);
    const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM students WHERE kurs = ?").bind(kurs).first();
    if (cnt && cnt.n >= MAX_PER_KURS) return fail("In dieser Klasse sind schon sehr viele Konten angelegt. Bitte deine Lehrkraft.", 429);
    const t = now();
    await env.DB.prepare("INSERT INTO students (kurs, nick_key, nick, pin_hash, html, css, progress, fails, created_at, updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)")
      .bind(kurs, key, nick, await hashPin(env, kurs, key, pin), START_HTML, START_CSS, "{}", t, t).run();
    const row = await env.DB.prepare("SELECT * FROM students WHERE kurs = ? AND nick_key = ?").bind(kurs, key).first();
    return json(publicRow(row));
  }

  const a = await auth(env, b);
  if (a.err) return a.err;
  const { row, kurs, key } = a;

  if (path === "/api/login") return json(publicRow(row));

  if (path === "/api/save") {
    const html = String(b.html ?? row.html), css = String(b.css ?? row.css);
    if (html.length > MAX_CODE || css.length > MAX_CODE) return fail("Der Code ist zu lang.", 413);
    const progress = JSON.stringify(b.progress && typeof b.progress === "object" ? b.progress : JSON.parse(row.progress || "{}")).slice(0, 50_000);
    const t = now();
    await env.DB.prepare("UPDATE students SET html = ?, css = ?, progress = ?, updated_at = ? WHERE kurs = ? AND nick_key = ?")
      .bind(html, css, progress, t, kurs, key).run();
    // Sicherung (Version), wenn sich etwas geändert hat und die letzte älter als VERSION_GAP_MIN ist
    const last = await env.DB.prepare("SELECT saved_at, html, css FROM versions WHERE kurs = ? AND nick_key = ? ORDER BY id DESC LIMIT 1").bind(kurs, key).first();
    const old = last ? (Date.now() - Date.parse(last.saved_at)) / 60000 : Infinity;
    if (!last || (old >= VERSION_GAP_MIN && (last.html !== html || last.css !== css)) || b.forceVersion) {
      await env.DB.prepare("INSERT INTO versions (kurs, nick_key, html, css, saved_at) VALUES (?,?,?,?,?)").bind(kurs, key, html, css, t).run();
      await env.DB.prepare(`DELETE FROM versions WHERE kurs = ? AND nick_key = ? AND id NOT IN
        (SELECT id FROM versions WHERE kurs = ? AND nick_key = ? ORDER BY id DESC LIMIT ?)`).bind(kurs, key, kurs, key, MAX_VERSIONS).run();
    }
    return json({ ok: true, updated_at: t });
  }

  if (path === "/api/share") {
    const token = b.on ? (row.share || [...crypto.getRandomValues(new Uint8Array(6))].map(x => "abcdefghjkmnpqrstuvwxyz23456789"[x % 31]).join("")) : null;
    await env.DB.prepare("UPDATE students SET share = ? WHERE kurs = ? AND nick_key = ?").bind(token, kurs, key).run();
    return json({ share: token });
  }

  if (path === "/api/versions") {
    const { results } = await env.DB.prepare("SELECT id, saved_at, length(html) AS h, length(css) AS c FROM versions WHERE kurs = ? AND nick_key = ? ORDER BY id DESC").bind(kurs, key).all();
    return json({ versions: results });
  }

  if (path === "/api/version") {
    const v = await env.DB.prepare("SELECT id, html, css, saved_at FROM versions WHERE kurs = ? AND nick_key = ? AND id = ?").bind(kurs, key, Number(b.id)).first();
    return v ? json(v) : fail("Version nicht gefunden.", 404);
  }

  return fail("Unbekannt.", 404);
}

// Bremse gegen Durchprobieren des Lehrkraft-Passworts: Jeder Fehlversuch kostet Wartezeit (1 s, ab 8 Fehlversuchen
// in 10 Min. pro IP 4 s). Es gibt bewusst KEINE harte Sperre: In der Schule teilen sich alle dieselbe IP-Adresse, eine
// Sperre würde sonst die Lehrkraft aussperren, sobald ein Schüler ein paar Mal falsch rät. Das richtige Passwort
// kommt immer durch.
// Grenzen: Der Zähler liegt nur im Speicher dieser Worker-Instanz (mehrere Instanzen zählen getrennt, Neustart setzt ihn
// zurück) und parallele Anfragen umgehen die Wartezeit. Echtes Rate-Limiting gehört in eine Cloudflare-Regel
// (siehe LIESMICH.md) – und ein langes Passwort.
const tFails = new Map();
const T_WINDOW_MS = 10 * 60_000, T_SLOW = 8;

async function teacher(request, env, url, path) {
  const ip = request.headers.get("cf-connecting-ip") || "?";
  const f = tFails.get(ip);
  if (!env.TEACHER_KEY || !await sameSecret(request.headers.get("x-teacher-key") ?? "", env.TEACHER_KEY)) {
    const g = f && Date.now() - f.t < T_WINDOW_MS ? f : { n: 0 };
    tFails.set(ip, { n: g.n + 1, t: Date.now() });
    if (tFails.size > 500) tFails.clear();
    await new Promise(r => setTimeout(r, g.n + 1 >= T_SLOW ? 4000 : 1000));
    return fail("Falsches Lehrkraft-Passwort.", 401);
  }
  if (f) tFails.delete(ip);

  if (path === "/api/t/kurse") return json({ kurse: kurse(env) });

  if (path === "/api/t/kurs") {
    const kurs = String(url.searchParams.get("kurs") || "").toLowerCase();
    const { results } = await env.DB.prepare(
      `SELECT s.nick, s.nick_key, s.html, s.css, s.progress, s.updated_at, s.created_at, s.fails, s.share, r.data AS rating
       FROM students s LEFT JOIN ratings r ON r.kurs = s.kurs AND r.nick_key = s.nick_key
       WHERE s.kurs = ? ORDER BY s.nick_key`).bind(kurs).all();
    return json({ students: results.map(r => ({ ...r, progress: JSON.parse(r.progress || "{}"), rating: r.rating ? JSON.parse(r.rating) : null })) });
  }

  const b = await body(request);
  const kurs = String(b.kurs || "").toLowerCase(), key = nickKey(b.nick);

  if (path === "/api/t/rating") {
    const data = JSON.stringify(b.data || {}).slice(0, 50_000);
    await env.DB.prepare(`INSERT INTO ratings (kurs, nick_key, data, updated_at) VALUES (?,?,?,?)
      ON CONFLICT (kurs, nick_key) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`).bind(kurs, key, data, now()).run();
    return json({ ok: true });
  }

  if (path === "/api/t/pin") {
    const pin = String(b.pin || "");
    if (!/^\d{4}$/.test(pin)) return fail("PIN: 4 Ziffern.");
    await env.DB.prepare("UPDATE students SET pin_hash = ?, fails = 0 WHERE kurs = ? AND nick_key = ?").bind(await hashPin(env, kurs, key, pin), kurs, key).run();
    return json({ ok: true });
  }

  if (path === "/api/t/unshare") {
    // Freigabe-Link entziehen, Konto und Inhalt bleiben. Alter Link liefert danach 404.
    await env.DB.prepare("UPDATE students SET share = NULL WHERE kurs = ? AND nick_key = ?").bind(kurs, key).run();
    return json({ ok: true });
  }

  if (path === "/api/t/versions") {
    const { results } = await env.DB.prepare("SELECT id, saved_at, html, css FROM versions WHERE kurs = ? AND nick_key = ? ORDER BY id DESC LIMIT 30").bind(kurs, key).all();
    return json({ versions: results });
  }

  if (path === "/api/t/clear") {
    // Schuljahresende: alles einer Klasse (oder aller Klassen) löschen
    if (b.confirm !== "LÖSCHEN") return fail("Bestätigung fehlt.");
    const all = b.scope === "alle";
    if (!all && !kurse(env).includes(kurs)) return fail("Unbekannte Klasse.");
    const where = all ? "" : " WHERE kurs = ?";
    const stmts = ["students", "versions", "ratings"].map(t => all ? env.DB.prepare(`DELETE FROM ${t}`) : env.DB.prepare(`DELETE FROM ${t}${where}`).bind(kurs));
    const res = await env.DB.batch(stmts);
    return json({ ok: true, geloescht: res[0].meta.changes });
  }

  if (path === "/api/t/delete") {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM students WHERE kurs = ? AND nick_key = ?").bind(kurs, key),
      env.DB.prepare("DELETE FROM versions WHERE kurs = ? AND nick_key = ?").bind(kurs, key),
      env.DB.prepare("DELETE FROM ratings WHERE kurs = ? AND nick_key = ?").bind(kurs, key)
    ]);
    return json({ ok: true });
  }

  return fail("Unbekannt.", 404);
}

// Freigegebene Schülerseite als echte Webseite ausliefern (abgeschottet per CSP-Sandbox)
async function sharedPage(env, token) {
  if (!/^[a-z0-9]{6}$/.test(token)) return new Response("Nicht gefunden", { status: 404 });
  const row = await env.DB.prepare("SELECT html, css FROM students WHERE share = ?").bind(token).first();
  if (!row) return new Response("Diese Seite ist nicht (mehr) freigegeben.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  const style = `<style>\n${row.css.replace(/<\/style/gi, "<\\/style")}\n</style>`;
  let html = row.html;
  if (/<html|<!doctype/i.test(html)) html = html.replace(/<link[^>]+href\s*=\s*["']?style\.css["']?[^>]*>/i, () => style);
  else html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">${style}</head><body>${html}</body></html>`;
  if (!/name=["']?viewport/i.test(html)) html = html.replace(/<head[^>]*>/i, m => m + '<meta name="viewport" content="width=device-width, initial-scale=1">');
  return new Response(html, { headers: {
    "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex",
    // Sandbox OHNE allow-same-origin: die Schülerseite hat eine eigene, leere Herkunft (kein Zugriff auf Werkstatt-Daten)
    "content-security-policy": "sandbox allow-scripts allow-popups allow-popups-to-escape-sandbox",
    "x-content-type-options": "nosniff", "referrer-policy": "no-referrer"
  } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith("/s/")) return sharedPage(env, path.slice(3));
    if (!path.startsWith("/api/")) return secure(await env.ASSETS.fetch(request));
    try {
      if (path.startsWith("/api/t/")) return secure(await teacher(request, env, url, path));
      if (request.method !== "POST") return secure(fail("Nur POST.", 405));
      return secure(await student(request, env, path));
    } catch (e) {
      console.error("Serverfehler", path, e && e.stack || e); // Details nur im Log, nicht zum Client
      return secure(fail("Serverfehler. Bitte versuche es gleich noch einmal.", 500));
    }
  }
};
