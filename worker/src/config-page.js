/**
 * Сторінка налаштувань для телефона.
 *
 * Свідомо один файл без збірки та зовнішніх залежностей: її відкривають
 * з телевізора через QR, часто на слабкому мобільному зв'язку.
 */
export const CONFIG_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#14141a">
<title>Ліхтар — налаштування</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;font:16px/1.5 -apple-system,system-ui,"Segoe UI",sans-serif;
       background:#14141a;color:#eee;padding:16px 16px 96px;max-width:680px;margin:0 auto}
  header{display:flex;align-items:center;gap:10px;margin-bottom:4px}
  header .logo{font-size:26px}
  h1{font-size:19px;margin:0}
  .sub{opacity:.55;font-size:13px;margin-bottom:20px}

  .gate{background:#1d1d26;border:1px solid #2e2e3a;border-radius:12px;padding:20px;text-align:center}
  .gate input{width:100%;text-align:center;font:600 30px/1.2 ui-monospace,monospace;letter-spacing:8px;
       text-transform:uppercase;background:#12121a;color:#eee;border:1px solid #333;border-radius:10px;
       padding:14px 10px;margin:14px 0}
  .gate p{opacity:.6;font-size:13px;margin:0}

  section{background:#1d1d26;border:1px solid #2e2e3a;border-radius:12px;padding:4px 16px;margin-bottom:14px}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#8ab4f8;margin:16px 0 4px}
  .row{display:flex;align-items:center;justify-content:space-between;gap:14px;
       padding:13px 0;border-bottom:1px solid #26262f}
  .row:last-child{border-bottom:0}
  .row .label{flex:1;min-width:0}
  .row .name{font-size:15px}
  .row .desc{font-size:12px;opacity:.55;margin-top:2px}

  /* Перемикач: ціль для пальця не менша за 44px, інакше на телефоні не влучити */
  .sw{position:relative;flex:0 0 52px;height:31px;border-radius:16px;background:#3a3a46;
      transition:background .15s;cursor:pointer}
  .sw::after{content:"";position:absolute;top:3px;left:3px;width:25px;height:25px;border-radius:50%;
      background:#fff;transition:transform .15s}
  .sw.on{background:#0057b7}
  .sw.on::after{transform:translateX(21px)}

  input[type=text]{width:100%;background:#12121a;color:#eee;border:1px solid #333;border-radius:8px;
      padding:11px;font:14px ui-monospace,monospace}

  .chan{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #26262f}
  .chan .nm{flex:1;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .chan button{background:#2b2b36;color:#ff8a80;border:0;border-radius:8px;padding:8px 12px;font-size:13px}
  .addchan{display:flex;gap:8px;padding:12px 0}
  .addchan input{flex:1}
  .addchan button{background:#0057b7;color:#fff;border:0;border-radius:8px;padding:0 16px;font-size:14px}

  .bar{position:fixed;left:0;right:0;bottom:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom));
       background:rgba(20,20,26,.96);border-top:1px solid #2e2e3a;backdrop-filter:blur(8px)}
  .bar .inner{max-width:680px;margin:0 auto;display:flex;gap:10px;align-items:center}
  .bar button{flex:1;background:#0057b7;color:#fff;border:0;border-radius:10px;padding:15px;
       font-size:16px;font-weight:600}
  .bar button:disabled{opacity:.5}
  .msg{font-size:13px;text-align:center;padding:8px 0 0;min-height:20px}
  .msg.ok{color:#7ee787} .msg.err{color:#ff8a80}
  .hidden{display:none}
</style>

<header><div class="logo">💡</div><h1>Ліхтар</h1></header>
<div class="sub" id="sub">Налаштування з телефона</div>

<div class="gate" id="gate">
  <div style="font-size:14px;opacity:.75">Введіть код з екрана телевізора</div>
  <input id="code" maxlength="6" autocapitalize="characters" autocomplete="off"
         inputmode="text" placeholder="——————">
  <p>Код показано у вікні «Налаштувати з телефона»</p>
  <div class="msg err" id="gateMsg"></div>
</div>

<div id="form" class="hidden">
  <section>
    <h2>Головна сторінка</h2>
    <div id="grpMain"></div>
  </section>
  <section>
    <h2>Розділи меню</h2>
    <div id="grpMenu"></div>
  </section>
  <section>
    <h2>Сторінка фільму</h2>
    <div id="grpFull"></div>
  </section>
  <section>
    <h2>Мітки якості</h2>
    <div id="grpBadges"></div>
  </section>
  <section>
    <h2>Кіноогляд — канали YouTube</h2>
    <div id="channels"></div>
    <div class="addchan">
      <input id="newChan" placeholder="@нік або UC…" autocapitalize="off" autocomplete="off">
      <button id="addChan">Додати</button>
    </div>
  </section>
  <section>
    <h2>Ключ TMDB</h2>
    <div style="padding:12px 0">
      <input type="text" id="tmdb" placeholder="Порожньо — ключ Lampa" autocapitalize="off" autocomplete="off">
      <div class="desc" style="font-size:12px;opacity:.55;margin-top:6px">Власний ключ, якщо стандартний не працює</div>
    </div>
  </section>
</div>

<div class="bar hidden" id="bar">
  <div class="inner"><button id="save">Зберегти на телевізор</button></div>
  <div class="msg" id="msg"></div>
</div>

<script>
// Опис полів тримаємо в одному місці: додати новий перемикач — це один рядок.
var FIELDS = {
  grpMain: [
    ['likhtar_section_streamings', 'Стрімінги', 'Рядок з логотипами сервісів'],
    ['likhtar_section_mood', 'Кіно під настрій', 'Підбірки за жанрами на головній'],
    ['likhtar_assistant_enabled', 'Ліхтарик', 'Помічник із підбору кіно']
  ],
  grpMenu: [
    ['likhtar_section_digital', 'Релізи в цифрі', 'Кінопрокат, що виходить удома'],
    ['likhtar_section_anniversary', 'Річниці кіно', 'Круглі дати виходу фільмів'],
    ['likhtar_section_chronology', 'Хронології', 'Всесвіти в порядку подій'],
    ['likhtar_kinooglad_enabled', 'Кіноогляд', 'YouTube-канали про кіно']
  ],
  grpFull: [
    ['likhtar_show_logo_instead_text', 'Логотип замість назви', ''],
    ['likhtar_full_info', 'Дата наступної серії', 'І час завершення фільму'],
    ['likhtar_full_trailer_ua', 'Український трейлер', ''],
    ['likhtar_full_franchise', 'Франшиза', 'Кнопка з усіма частинами']
  ],
  grpBadges: [
    ['likhtar_badge_enabled', 'Показувати мітки', 'Головний перемикач'],
    ['likhtar_badge_ua', 'UA', 'Українська озвучка'],
    ['likhtar_badge_en', 'EN', ''],
    ['likhtar_badge_4k', '4K', ''],
    ['likhtar_badge_fhd', '1080p / 720p', ''],
    ['likhtar_badge_hdr', 'HDR', '']
  ]
};

var code = '', config = {}, channels = [];

var el = function (id) { return document.getElementById(id); };
var truthy = function (v) { return v !== false && v !== 'false' && v !== 0 && v !== '0'; };

function say(node, text, kind) {
  node.textContent = text;
  node.className = 'msg' + (kind ? ' ' + kind : '');
}

function renderToggles() {
  Object.keys(FIELDS).forEach(function (group) {
    var host = el(group);
    host.innerHTML = '';

    FIELDS[group].forEach(function (f) {
      var key = f[0], name = f[1], desc = f[2];
      // Незаданий параметр означає «увімкнено»: у плагіні всі вони типово ввімкнені
      var on = !(key in config) || truthy(config[key]);

      var row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<div class="label"><div class="name"></div>' +
        (desc ? '<div class="desc"></div>' : '') + '</div><div class="sw"></div>';
      row.querySelector('.name').textContent = name;
      if (desc) row.querySelector('.desc').textContent = desc;

      var sw = row.querySelector('.sw');
      if (on) sw.classList.add('on');

      var toggle = function () {
        var now = !sw.classList.contains('on');
        sw.classList.toggle('on', now);
        config[key] = now;
      };
      row.onclick = toggle;

      host.appendChild(row);
    });
  });
}

function renderChannels() {
  var host = el('channels');
  host.innerHTML = '';

  if (!channels.length) {
    host.innerHTML = '<div style="padding:12px 0;opacity:.55;font-size:13px">' +
      'Порожньо — використовуються канали за замовчуванням</div>';
    return;
  }

  channels.forEach(function (ch, i) {
    var row = document.createElement('div');
    row.className = 'chan';
    row.innerHTML = '<div class="nm"></div><button>Видалити</button>';
    row.querySelector('.nm').textContent = ch.name || ch.id;
    row.querySelector('button').onclick = function () {
      channels.splice(i, 1);
      renderChannels();
    };
    host.appendChild(row);
  });
}

el('addChan').onclick = function () {
  var raw = el('newChan').value.trim();
  if (!raw) return;

  channels.push({ id: raw.replace(/^@/, ''), name: raw });
  el('newChan').value = '';
  renderChannels();
};

function load(input) {
  var value = String(input || '').trim().toUpperCase();
  if (value.length !== 6) return;

  fetch('/api/session/' + encodeURIComponent(value)).then(function (r) {
    if (!r.ok) throw new Error(r.status === 404 ? 'Код не знайдено або застарів' : 'Помилка ' + r.status);
    return r.json();
  }).then(function (data) {
    code = value;
    config = data.config || {};
    channels = Array.isArray(config.kino_channels) ? config.kino_channels.slice() : [];

    el('tmdb').value = config.likhtar_tmdb_apikey || '';
    renderToggles();
    renderChannels();

    el('gate').classList.add('hidden');
    el('form').classList.remove('hidden');
    el('bar').classList.remove('hidden');
    el('sub').textContent = 'Сесія ' + code;
  }).catch(function (e) {
    say(el('gateMsg'), e.message, 'err');
  });
}

el('code').addEventListener('input', function () {
  say(el('gateMsg'), '');
  load(this.value);
});

el('save').onclick = function () {
  var btn = el('save');
  btn.disabled = true;
  say(el('msg'), 'Надсилаємо…');

  config.kino_channels = channels;
  var key = el('tmdb').value.trim();
  if (key) config.likhtar_tmdb_apikey = key; else delete config.likhtar_tmdb_apikey;

  fetch('/api/session/' + code, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config: config })
  }).then(function (r) {
    if (!r.ok) throw new Error('Помилка ' + r.status);
    return r.json();
  }).then(function () {
    say(el('msg'), 'Готово — перевірте телевізор', 'ok');
  }).catch(function (e) {
    say(el('msg'), e.message, 'err');
  }).then(function () {
    btn.disabled = false;
  });
};

// Код із QR приходить у посиланні — тоді вводити нічого не треба
var fromLink = new URLSearchParams(location.search).get('s');
if (fromLink) {
  el('code').value = fromLink.toUpperCase();
  load(fromLink);
}
</script>
`;
