/**
 * Вільний запит до Ліхтарика з телефона.
 *
 * Набирати текст пультом — мука, тож питання ставиться тут, а результат
 * з'являється на телевізорі: він шукає назви у базі й показує картки.
 */
export const ASK_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#14141a">
<title>Ліхтарик — запитати</title>
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0 auto;max-width:680px;font:16px/1.5 -apple-system,system-ui,sans-serif;
       background:#14141a;color:#eee;padding:16px 16px calc(16px + env(safe-area-inset-bottom))}
  header{display:flex;align-items:center;gap:9px;font-weight:600;margin-bottom:2px}
  .sub{opacity:.55;font-size:13px;margin-bottom:18px}

  .box{background:#1d1d26;border:1px solid #2e2e3a;border-radius:12px;padding:16px;margin-bottom:14px}
  .gate input{width:100%;text-align:center;font:600 30px/1.2 ui-monospace,monospace;letter-spacing:8px;
       text-transform:uppercase;background:#12121a;color:#eee;border:1px solid #333;border-radius:10px;
       padding:14px 10px;margin:14px 0}
  textarea{width:100%;background:#12121a;color:#eee;border:1px solid #333;border-radius:10px;
       padding:13px;font:16px/1.45 inherit;resize:none}
  button.go{width:100%;background:#0057b7;color:#fff;border:0;border-radius:10px;padding:15px;
       font-size:16px;font-weight:600;margin-top:12px}
  button.go:disabled{opacity:.5}

  .chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
  .chip{background:#262632;border:1px solid #34343f;border-radius:999px;padding:8px 13px;font-size:13px}

  .msg{font-size:14px;text-align:center;padding:10px 0;min-height:22px}
  .msg.ok{color:#7ee787} .msg.err{color:#ff8a80}
  ol{margin:6px 0 0;padding-left:22px} li{padding:3px 0;font-size:15px}
  li span{opacity:.55;font-size:13px}
  .hidden{display:none}
</style>

<header><span>💡</span><span>Ліхтарик</span></header>
<div class="sub" id="sub">Опишіть, що хочеться подивитись</div>

<div class="box gate" id="gate">
  <div style="font-size:14px;opacity:.75;text-align:center">Введіть код з екрана телевізора</div>
  <input id="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="——————">
  <div class="msg err" id="gateMsg"></div>
</div>

<div id="form" class="hidden">
  <div class="box">
    <textarea id="q" rows="3" placeholder="Наприклад: щось як Інтерстеллар, але легше"></textarea>
    <div class="chips" id="chips"></div>
    <button class="go" id="go">Запитати</button>
  </div>
  <div class="msg" id="msg"></div>
  <div class="box hidden" id="result">
    <div style="font-size:13px;opacity:.6">Знайдено — телевізор уже показує:</div>
    <ol id="list"></ol>
  </div>
</div>

<script>
var EXAMPLES = [
  'щось як Інтерстеллар, але легше',
  'фільм на вечір удвох',
  'кіно, після якого хочеться жити',
  'заплутаний детектив на вихідні',
  'комедія, яку не соромно ввімкнути з батьками'
];

var code = '';
var el = function (id) { return document.getElementById(id); };

function say(text, kind) {
  el('msg').textContent = text || '';
  el('msg').className = 'msg' + (kind ? ' ' + kind : '');
}

EXAMPLES.forEach(function (text) {
  var chip = document.createElement('div');
  chip.className = 'chip';
  chip.textContent = text;
  chip.onclick = function () { el('q').value = text; el('q').focus(); };
  el('chips').appendChild(chip);
});

function load(value) {
  value = String(value || '').trim().toUpperCase();
  if (value.length !== 6) return;

  fetch('/api/session/' + encodeURIComponent(value)).then(function (r) {
    if (!r.ok) throw new Error(r.status === 404 ? 'Код не знайдено або застарів' : 'Помилка ' + r.status);
    return r.json();
  }).then(function () {
    code = value;
    el('gate').classList.add('hidden');
    el('form').classList.remove('hidden');
    el('sub').textContent = 'Сесія ' + code;
    el('q').focus();
  }).catch(function (e) {
    el('gateMsg').textContent = e.message;
  });
}

el('code').addEventListener('input', function () {
  el('gateMsg').textContent = '';
  load(this.value);
});

el('go').onclick = function () {
  var query = el('q').value.trim();
  if (!query) return;

  el('go').disabled = true;
  el('result').classList.add('hidden');
  say('Думаємо… це може зайняти до хвилини');

  fetch('/api/ai', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: query })
  }).then(function (r) {
    return r.json().then(function (data) {
      if (!r.ok) throw new Error(
        data.error === 'ai_not_configured' ? 'Модель не налаштована на сервері' :
        data.error === 'ai_unreachable' ? 'Модель недоступна' :
        data.error === 'ai_no_titles' ? 'Модель не зрозуміла запит — спробуйте інакше' :
        'Помилка ' + r.status);
      return data;
    });
  }).then(function (data) {
    // Телевізор сам знайде ці назви у базі й покаже картки
    return fetch('/api/session/' + code, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: { ai: { query: query, titles: data.titles } } })
    }).then(function (r) {
      if (!r.ok) throw new Error('Не вдалося надіслати на телевізор');
      return data;
    });
  }).then(function (data) {
    say('Готово — дивіться на телевізор', 'ok');

    var list = el('list');
    list.innerHTML = '';
    data.titles.forEach(function (t) {
      var li = document.createElement('li');
      li.textContent = t[0];
      if (t[1]) {
        var year = document.createElement('span');
        year.textContent = ' · ' + t[1];
        li.appendChild(year);
      }
      list.appendChild(li);
    });
    el('result').classList.remove('hidden');
  }).catch(function (e) {
    say(e.message, 'err');
  }).then(function () {
    el('go').disabled = false;
  });
};

var fromLink = new URLSearchParams(location.search).get('s');
if (fromLink) {
  el('code').value = fromLink.toUpperCase();
  load(fromLink);
}
</script>
`;
