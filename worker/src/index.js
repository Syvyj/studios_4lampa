/**
 * Ліхтар Worker — сервер-посередник для плагіна.
 *
 * Робить дві речі:
 *  1) Тримає короткочасні сесії «налаштувати з телефона»: телевізор показує
 *     код, телефон надсилає за ним конфіг, телевізор його забирає.
 *  2) Працює проксі для джерел без CORS (JacRed, YouTube-фіди, Uafix) —
 *     замість публічних проксі, які постійно падають, ще й бачать усі запити.
 *
 * Сховище: Cloudflare KV, якщо прив'язане. Локально під час розробки
 * прив'язки немає — тоді працює пам'ять процесу, чого для тестів досить.
 */

// Літери й цифри, які неможливо сплутати на екрані телевізора:
// без O/0, I/1, S/5 — інакше код доводиться вгадувати.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXYZ23456789';
const CODE_LENGTH = 6;

const SESSION_TTL_SECONDS = 15 * 60;
const MAX_CONFIG_BYTES = 64 * 1024;

// Проксі працює лише для відомих джерел — інакше воно миттєво стане
// відкритим проксі, яким скористається хтось інший.
const PROXY_ALLOWED_HOSTS = [
    'jr.maxvol.pro',
    'www.youtube.com',
    'youtube.com',
    'uafix.net',
    'banderabackend.lampame.v6.rocks'
];

const PROXY_CACHE_SECONDS = 30 * 60;

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
};

/** Пам'ять процесу як заміна KV для локальної розробки. */
const memory = new Map();

function storage(env) {
    if (env && env.LIKHTAR) return env.LIKHTAR;

    return {
        async get(key) {
            const record = memory.get(key);
            if (!record) return null;
            if (record.expires < Date.now()) {
                memory.delete(key);
                return null;
            }
            return record.value;
        },
        async put(key, value, options) {
            const ttl = (options && options.expirationTtl) || SESSION_TTL_SECONDS;
            memory.set(key, { value, expires: Date.now() + ttl * 1000 });
        },
        async delete(key) {
            memory.delete(key);
        }
    };
}

function json(data, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS_HEADERS, ...extraHeaders }
    });
}

function makeCode() {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);

    let code = '';
    for (const byte of bytes) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    return code;
}

function validCode(code) {
    if (typeof code !== 'string' || code.length !== CODE_LENGTH) return false;
    return code.split('').every((ch) => CODE_ALPHABET.includes(ch));
}

function sessionKey(code) {
    return 'session:' + code;
}

/** Телевізор створює сесію і показує код із QR. */
async function createSession(request, env) {
    const store = storage(env);

    let config = {};
    try {
        const body = await request.json();
        if (body && typeof body.config === 'object' && body.config !== null) config = body.config;
    } catch (e) {
        // Порожнє тіло — нормально: телевізор може ще не мати що передати
    }

    // Малоймовірно, але код може збігтися з уже виданим — тоді пробуємо ще
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
        const candidate = makeCode();
        if (!(await store.get(sessionKey(candidate)))) {
            code = candidate;
            break;
        }
    }
    if (!code) return json({ error: 'code_unavailable' }, 503);

    const session = { config, updated: 0, created: Date.now() };
    await store.put(sessionKey(code), JSON.stringify(session), { expirationTtl: SESSION_TTL_SECONDS });

    return json({ code, ttl: SESSION_TTL_SECONDS });
}

/** Телефон читає поточні налаштування; телевізор опитує, чи їх уже змінили. */
async function readSession(code, env) {
    if (!validCode(code)) return json({ error: 'bad_code' }, 400);

    const raw = await storage(env).get(sessionKey(code));
    if (!raw) return json({ error: 'not_found' }, 404);

    return json(JSON.parse(raw));
}

/** Телефон зберігає конфіг. */
async function writeSession(code, request, env) {
    if (!validCode(code)) return json({ error: 'bad_code' }, 400);

    const store = storage(env);
    const raw = await store.get(sessionKey(code));
    if (!raw) return json({ error: 'not_found' }, 404);

    const text = await request.text();
    if (text.length > MAX_CONFIG_BYTES) return json({ error: 'too_large' }, 413);

    let config;
    try {
        const body = JSON.parse(text);
        config = body && body.config;
    } catch (e) {
        return json({ error: 'bad_json' }, 400);
    }

    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
        return json({ error: 'bad_config' }, 400);
    }

    const session = JSON.parse(raw);
    session.config = config;
    session.updated = Date.now();

    await store.put(sessionKey(code), JSON.stringify(session), { expirationTtl: SESSION_TTL_SECONDS });

    return json({ ok: true, updated: session.updated });
}

/** Проксі для джерел без CORS. Відповіді кешуються — вигода спільна для всіх користувачів. */
async function proxy(request) {
    const target = new URL(request.url).searchParams.get('url');
    if (!target) return json({ error: 'no_url' }, 400);

    let parsed;
    try {
        parsed = new URL(target);
    } catch (e) {
        return json({ error: 'bad_url' }, 400);
    }

    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
        return json({ error: 'bad_protocol' }, 400);
    }
    if (!PROXY_ALLOWED_HOSTS.includes(parsed.hostname)) {
        return json({ error: 'host_not_allowed', host: parsed.hostname }, 403);
    }

    const cache = caches.default;
    const cacheKey = new Request(parsed.toString(), { method: 'GET' });

    const cached = await cache.match(cacheKey);
    if (cached) {
        const withCors = new Response(cached.body, cached);
        Object.entries(CORS_HEADERS).forEach(([k, v]) => withCors.headers.set(k, v));
        withCors.headers.set('X-Likhtar-Cache', 'hit');
        return withCors;
    }

    let upstream;
    try {
        upstream = await fetch(parsed.toString(), {
            headers: { 'User-Agent': 'Likhtar/1.0 (+https://github.com/Syvyj/studios_4lampa)' },
            cf: { cacheTtl: PROXY_CACHE_SECONDS, cacheEverything: true }
        });
    } catch (e) {
        return json({ error: 'upstream_failed' }, 502);
    }

    const response = new Response(upstream.body, upstream);
    response.headers.set('Cache-Control', 'public, max-age=' + PROXY_CACHE_SECONDS);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    response.headers.set('X-Likhtar-Cache', 'miss');

    if (upstream.ok) {
        // Кладемо в кеш копію, щоб не блокувати відповідь користувачу
        await cache.put(cacheKey, response.clone());
    }

    return response;
}

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const path = url.pathname.replace(/\/+$/, '') || '/';

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: CORS_HEADERS });
        }

        if (path === '/api/health') {
            return json({ ok: true, storage: env && env.LIKHTAR ? 'kv' : 'memory' });
        }

        if (path === '/api/session' && request.method === 'POST') {
            return createSession(request, env);
        }

        const sessionMatch = path.match(/^\/api\/session\/([^/]+)$/);
        if (sessionMatch) {
            const code = decodeURIComponent(sessionMatch[1]).toUpperCase();
            if (request.method === 'GET') return readSession(code, env);
            if (request.method === 'PUT') return writeSession(code, request, env);
            return json({ error: 'method_not_allowed' }, 405);
        }

        if (path === '/api/proxy' && request.method === 'GET') {
            return proxy(request);
        }

        if (path === '/') {
            return new Response(TESTER_HTML, {
                headers: { 'Content-Type': 'text/html; charset=utf-8', ...CORS_HEADERS }
            });
        }

        return json({ error: 'not_found', path }, 404);
    }
};

/** Сторінка для ручної перевірки: створити сесію, зберегти конфіг, глянути проксі. */
const TESTER_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ліхтар Worker — перевірка</title>
<style>
  body{font:16px/1.5 -apple-system,system-ui,sans-serif;max-width:700px;margin:0 auto;padding:24px;
       background:#14141a;color:#eee}
  h1{font-size:20px;margin:0 0 4px} .sub{opacity:.6;font-size:14px;margin-bottom:24px}
  section{background:#1d1d26;border:1px solid #2e2e3a;border-radius:10px;padding:16px;margin-bottom:16px}
  h2{font-size:15px;margin:0 0 10px;color:#8ab4f8}
  button{background:#0057b7;color:#fff;border:0;border-radius:8px;padding:10px 16px;font-size:15px;cursor:pointer}
  button:active{opacity:.8}
  input,textarea{width:100%;box-sizing:border-box;background:#12121a;color:#eee;border:1px solid #333;
       border-radius:8px;padding:10px;font:14px ui-monospace,monospace;margin-top:6px}
  pre{background:#12121a;border-radius:8px;padding:12px;overflow:auto;font-size:13px;margin:10px 0 0}
  .code{font-size:34px;letter-spacing:6px;text-align:center;padding:14px;background:#12121a;border-radius:8px;margin-top:10px}
  label{font-size:13px;opacity:.75}
</style>
<h1>💡 Ліхтар Worker</h1>
<div class="sub">Локальна перевірка сесій і проксі</div>

<section>
  <h2>1. Сесія (те, що показує телевізор)</h2>
  <button onclick="createSession()">Створити сесію</button>
  <div class="code" id="code">——————</div>
  <label>Посилання для телефона</label>
  <input id="link" readonly>
</section>

<section>
  <h2>2. Збереження з телефона</h2>
  <label>Код</label><input id="putCode" placeholder="ABC123">
  <label>Конфіг (JSON)</label>
  <textarea id="putConfig" rows="4">{"rows":["hero","streamings"],"assistant":true}</textarea>
  <button onclick="saveConfig()" style="margin-top:10px">Зберегти</button>
  <pre id="putOut">—</pre>
</section>

<section>
  <h2>3. Читання (те, що опитує телевізор)</h2>
  <label>Код</label><input id="getCode" placeholder="ABC123">
  <button onclick="loadConfig()" style="margin-top:10px">Прочитати</button>
  <pre id="getOut">—</pre>
</section>

<section>
  <h2>4. Проксі</h2>
  <label>URL (дозволені лише відомі джерела)</label>
  <input id="proxyUrl" value="https://www.youtube.com/feeds/videos.xml?channel_id=UCHCpzrgaW9vFS4dGrmPmZNw">
  <button onclick="tryProxy()" style="margin-top:10px">Запит</button>
  <pre id="proxyOut">—</pre>
</section>

<script>
const show = (id, data) => document.getElementById(id).textContent =
  typeof data === 'string' ? data : JSON.stringify(data, null, 2);

async function createSession() {
  const r = await fetch('/api/session', {method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({config:{}})});
  const d = await r.json();
  document.getElementById('code').textContent = d.code || 'помилка';
  document.getElementById('link').value = location.origin + '/?s=' + (d.code || '');
  document.getElementById('putCode').value = d.code || '';
  document.getElementById('getCode').value = d.code || '';
}
async function saveConfig() {
  const code = document.getElementById('putCode').value.trim().toUpperCase();
  let config;
  try { config = JSON.parse(document.getElementById('putConfig').value); }
  catch (e) { return show('putOut', 'JSON не розібрався: ' + e.message); }
  const r = await fetch('/api/session/' + code, {method:'PUT',
    headers:{'Content-Type':'application/json'}, body: JSON.stringify({config})});
  show('putOut', {status: r.status, body: await r.json()});
}
async function loadConfig() {
  const code = document.getElementById('getCode').value.trim().toUpperCase();
  const r = await fetch('/api/session/' + code);
  show('getOut', {status: r.status, body: await r.json()});
}
async function tryProxy() {
  const url = document.getElementById('proxyUrl').value.trim();
  show('proxyOut', 'запит…');
  const t = Date.now();
  const r = await fetch('/api/proxy?url=' + encodeURIComponent(url));
  const text = await r.text();
  show('proxyOut', 'статус ' + r.status + ' • кеш: ' + (r.headers.get('X-Likhtar-Cache') || '—') +
    ' • ' + (Date.now()-t) + ' мс • ' + text.length + ' байт\\n\\n' + text.slice(0, 400));
}
</script>
`;
