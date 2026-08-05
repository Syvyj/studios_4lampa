/**
 * Кінорулетка для телефона.
 *
 * Колоду фільмів кладе телевізор — у нього є ключ TMDB. Телефон лише
 * показує картки й повертає вибір: гортати великі постери пальцем
 * набагато приємніше, ніж клацати пультом.
 */
export const ROULETTE_HTML = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#14141a">
<title>Ліхтар — рулетка</title>
<style>
  *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
  body{margin:0;font:16px/1.5 -apple-system,system-ui,sans-serif;background:#14141a;color:#eee;
       height:100dvh;display:flex;flex-direction:column;overflow:hidden;
       padding:12px 12px calc(12px + env(safe-area-inset-bottom))}
  header{display:flex;align-items:center;justify-content:space-between;flex:0 0 auto;padding:4px 4px 10px}
  header .t{display:flex;align-items:center;gap:8px;font-weight:600}
  header .n{font-size:13px;opacity:.55}

  .gate{margin:auto;background:#1d1d26;border:1px solid #2e2e3a;border-radius:12px;padding:22px;text-align:center;width:100%}
  .gate input{width:100%;text-align:center;font:600 30px/1.2 ui-monospace,monospace;letter-spacing:8px;
       text-transform:uppercase;background:#12121a;color:#eee;border:1px solid #333;border-radius:10px;
       padding:14px 10px;margin:14px 0}
  .err{color:#ff8a80;font-size:13px;min-height:18px}

  .deck{position:relative;flex:1 1 auto;min-height:0}
  .card{position:absolute;inset:0;border-radius:16px;overflow:hidden;background:#1d1d26 center/cover no-repeat;
        box-shadow:0 10px 30px rgba(0,0,0,.5);display:flex;flex-direction:column;justify-content:flex-end;
        will-change:transform}
  /* Постери часто самі містять велику назву — без підкладки наш текст
     накладається на неї і обидва стають нечитабельними */
  .card::after{content:"";position:absolute;left:0;right:0;bottom:0;height:60%;pointer-events:none;
       background:linear-gradient(to top,rgba(0,0,0,.8),rgba(0,0,0,.35) 45%,transparent)}
  .card .shade{position:relative;z-index:1;margin:12px;padding:14px 16px;border-radius:14px;
       background:rgba(10,10,14,.76);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
       box-shadow:0 6px 24px rgba(0,0,0,.45)}
  .card h2{font-size:22px;margin:0 0 4px}
  .card .meta{font-size:13px;opacity:.8;margin-bottom:8px}
  .card p{font-size:13px;line-height:1.45;margin:0;opacity:.85;
       display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}

  /* Підказка напряму свайпу — з'являється разом із рухом пальця */
  .stamp{position:absolute;top:22px;font:800 22px/1 sans-serif;padding:8px 14px;border-radius:8px;
         border:3px solid;opacity:0;transform:rotate(-12deg)}
  .stamp.yes{left:18px;color:#7ee787;border-color:#7ee787}
  .stamp.no{right:18px;color:#ff8a80;border-color:#ff8a80;transform:rotate(12deg)}

  .bar{flex:0 0 auto;display:flex;gap:12px;padding-top:14px}
  .bar button{flex:1;border:0;border-radius:12px;padding:16px;font-size:16px;font-weight:600;color:#fff}
  .skip{background:#2b2b36} .pick{background:#0057b7}
  .msg{text-align:center;font-size:14px;padding:10px 0 0;min-height:22px}
  .msg.ok{color:#7ee787}
  .done{margin:auto;text-align:center;opacity:.7}
  .hidden{display:none}
</style>

<header>
  <div class="t"><span>🎲</span><span>Кінорулетка</span></div>
  <div class="n" id="left"></div>
</header>

<div class="gate" id="gate">
  <div style="font-size:14px;opacity:.75">Введіть код з екрана телевізора</div>
  <input id="code" maxlength="6" autocapitalize="characters" autocomplete="off" placeholder="——————">
  <div class="err" id="gateMsg"></div>
</div>

<div class="deck hidden" id="deck"></div>
<div class="bar hidden" id="bar">
  <button class="skip" id="skip">Далі</button>
  <button class="pick" id="pick">Дивитись</button>
</div>
<div class="msg" id="msg"></div>

<script>
var code = '', deck = [], index = 0, current = null;
var el = function (id) { return document.getElementById(id); };

function say(text, kind) {
  el('msg').textContent = text || '';
  el('msg').className = 'msg' + (kind ? ' ' + kind : '');
}

function load(value) {
  value = String(value || '').trim().toUpperCase();
  if (value.length !== 6) return;

  fetch('/api/session/' + encodeURIComponent(value)).then(function (r) {
    if (!r.ok) throw new Error(r.status === 404 ? 'Код не знайдено або застарів' : 'Помилка ' + r.status);
    return r.json();
  }).then(function (data) {
    if (!data.deck || !data.deck.length) throw new Error('Телевізор ще не надіслав фільми');

    code = value;
    deck = data.deck;
    index = 0;

    el('gate').classList.add('hidden');
    el('deck').classList.remove('hidden');
    el('bar').classList.remove('hidden');
    render();
  }).catch(function (e) {
    el('gateMsg').textContent = e.message;
  });
}

function render() {
  var host = el('deck');
  host.innerHTML = '';

  if (index >= deck.length) {
    el('bar').classList.add('hidden');
    host.innerHTML = '<div class="done">Фільми скінчились.<br>Запустіть рулетку на телевізорі ще раз.</div>';
    return;
  }

  el('left').textContent = (index + 1) + ' / ' + deck.length;

  // Наступну картку кладемо під поточну, щоб за свайпом одразу було що показати
  var next = deck[index + 1];
  if (next) host.appendChild(cardEl(next, true));

  current = cardEl(deck[index], false);
  host.appendChild(current);
  bindSwipe(current);
}

function cardEl(movie, isBehind) {
  var card = document.createElement('div');
  card.className = 'card';
  if (movie.poster) card.style.backgroundImage = 'url(' + movie.poster + ')';
  if (isBehind) card.style.transform = 'scale(.96)';

  var shade = document.createElement('div');
  shade.className = 'shade';

  var h = document.createElement('h2');
  h.textContent = movie.title || '';

  var meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = [movie.year, movie.rating ? '★ ' + movie.rating : ''].filter(Boolean).join(' • ');

  var p = document.createElement('p');
  p.textContent = movie.overview || '';

  shade.appendChild(h); shade.appendChild(meta); shade.appendChild(p);
  card.appendChild(shade);

  if (!isBehind) {
    var yes = document.createElement('div'); yes.className = 'stamp yes'; yes.textContent = 'ДИВЛЮСЬ';
    var no = document.createElement('div'); no.className = 'stamp no'; no.textContent = 'ДАЛІ';
    card.appendChild(yes); card.appendChild(no);
  }

  return card;
}

function bindSwipe(card) {
  var startX = 0, startY = 0, dx = 0, dy = 0, dragging = false;
  var yes = card.querySelector('.stamp.yes'), no = card.querySelector('.stamp.no');

  card.addEventListener('touchstart', function (e) {
    dragging = true;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    card.style.transition = '';
  }, { passive: true });

  card.addEventListener('touchmove', function (e) {
    if (!dragging) return;
    dx = e.touches[0].clientX - startX;
    dy = e.touches[0].clientY - startY;
    card.style.transform = 'translate(' + dx + 'px,' + dy * 0.25 + 'px) rotate(' + dx / 22 + 'deg)';
    yes.style.opacity = dx > 0 ? Math.min(dx / 90, 1) : 0;
    no.style.opacity = dx < 0 ? Math.min(-dx / 90, 1) : 0;
  }, { passive: true });

  card.addEventListener('touchend', function () {
    if (!dragging) return;
    dragging = false;

    // Поріг у 90px: менший рух — це радше випадковий дотик під час гортання
    if (dx > 90) return choose();
    if (dx < -90) return skip();

    card.style.transition = 'transform .18s';
    card.style.transform = '';
    yes.style.opacity = no.style.opacity = 0;
  });
}

function fly(direction, after) {
  if (!current) return after();
  current.style.transition = 'transform .25s, opacity .25s';
  current.style.transform = 'translateX(' + (direction * window.innerWidth) + 'px) rotate(' + (direction * 18) + 'deg)';
  current.style.opacity = '0';
  setTimeout(after, 200);
}

function skip() {
  fly(-1, function () { index++; render(); });
}

function choose() {
  var movie = deck[index];
  fly(1, function () {
    say('Відкриваємо на телевізорі…');

    fetch('/api/session/' + code, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: { open: { id: movie.id, method: movie.method || 'movie' } } })
    }).then(function (r) {
      if (!r.ok) throw new Error('Помилка ' + r.status);
      say('Готово — дивіться на телевізор', 'ok');
    }).catch(function (e) {
      say(e.message);
    });

    index++;
    render();
  });
}

el('skip').onclick = skip;
el('pick').onclick = choose;
el('code').addEventListener('input', function () {
  el('gateMsg').textContent = '';
  load(this.value);
});

var fromLink = new URLSearchParams(location.search).get('s');
if (fromLink) {
  el('code').value = fromLink.toUpperCase();
  load(fromLink);
}
</script>
`;
