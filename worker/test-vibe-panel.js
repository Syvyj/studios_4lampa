const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// 1. Create JSDOM environment
const dom = new JSDOM(`
<!DOCTYPE html>
<html>
<body>
  <div id="app">
    <div class="activity__body" id="page">
      <div class="full-start-new">
        <div class="full-start-new__body">
          <div class="full-start-new__right">
            <div class="full-start-new__details">Details block</div>
            <div class="full-start-new__buttons">
              <div class="full-start__button selector">Play</div>
            </div>
          </div>
        </div>
      </div>
      <div class="full-descr">
        <div class="full-descr__text">Spider-man is a superhero...</div>
      </div>
    </div>
  </div>
</body>
</html>
`);

const { window } = dom;
const { document } = window;
global.window = window;
global.document = document;
global.navigator = window.navigator;

// Load jQuery
const $ = require('jquery');
global.$ = $;
window.$ = $;
window.jQuery = $;


// Mock Lampa APIs
global.Lampa = {
  Storage: {
    get: (k, d) => d,
    set: () => {}
  },
  TMDB: {
    api: (p) => 'https://api.themoviedb.org/3/' + p,
    image: (p) => p
  },
  Lang: { translate: (k) => k },
  Reguest: function () {
    this.timeout = () => {};
    this.silent = (url, ok, err) => {
      if (url.indexOf('movie/338969') !== -1) {
        ok({
          id: 338969,
          status: 'Released',
          release_date: '2025-10-10',
          runtime: 102,
          production_countries: [{ name: 'США' }],
          release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'R' }] }] }
        });
      } else {
        ok({ results: [] });
      }
    };
  },
  Controller: {
    add: () => {},
    toggle: () => {},
    collectionSet: () => {},
    collectionFocus: () => {}
  },
  Listener: { follow: () => {} },
  Noty: { show: (text) => console.log('Lampa.Noty:', text) },
  Modal: { open: () => {}, close: () => {} },
  Manifest: { app_digital: 200 },
  Utils: { shortText: (s) => s },
  Player: { play: () => {}, playlist: () => {} },
  YouTube: { play: () => {} },
  Component: { add: () => {} },
  InteractionMain: function () {},
  Select: { show: () => {} }
};

global.LikhtarCache = {
  get: () => undefined,
  set: () => {},
  TTL: { HOUR: 1, DAY: 2, WEEK: 3, MONTH: 4 }
};

global.LikhtarNet = {
  workerUrl: () => 'http://127.0.0.1:8787',
  hasWorker: () => true
};

global.LikhtarSections = {
  getDigitalDate: (id, cb) => cb(null)
};

global.getTmdbKey = () => 'KEY';
global.isSettingEnabled = (name, def) => def !== undefined ? def : true;
global.LIKHTAR_BASE_URL = '../';
window.LIKHTAR_BASE_URL = '../';

// Mock AJAX
$.ajax = function (options) {
  return {
    done: function (cb) {
      if (options.url.indexOf('cards/index.json') !== -1) {
        cb({ ids: [338969], tv: [113959] });
      } else if (options.url.indexOf('cards/338969.json') !== -1) {
        cb({
          id: 338969,
          title: "Токсичний месник",
          mood: ["Помста", "Жахи"],
          watch: {
            worth: "Цікава сатира про месника з токсичних відходів",
            for: "Любителям боді-хоррору",
            not_for: "Тим, хто шукає легке кіно"
          },
          complexity: { score: 2, description: "Простий сюжет" },
          violence: { score: 4, description: "Дуже жорстокий" },
          erotica: { score: 0, description: "Немає" },
          children: { recommended: false, description: "Не для дітей" }
        });
      } else {
        cb(null);
      }
      return this;
    },
    fail: function () {
      return this;
    }
  };
};

// 2. Load likhtar.js and extract LikhtarCard body
const src = fs.readFileSync(path.join(__dirname, '../likhtar.js'), 'utf8');
const from = src.indexOf('var LikhtarCard = (function () {');
const anchor = src.indexOf('return {\n            init: function () {\n                addStyles();', from);
const to = src.indexOf('})();', anchor);

if (from === -1 || to === -1) {
  console.error("LikhtarCard module not found in likhtar.js!");
  process.exit(1);
}

const moduleSrc = src.slice(from, to + 5);
const body = moduleSrc.slice(moduleSrc.indexOf('{') + 1, moduleSrc.lastIndexOf('return {'));

const LikhtarCard = new Function('return (function(){ ' + body +
  ' return { apply: apply, closePanel: closePanel, addStyles: addStyles, mountTrailer: mountTrailer, trailerKey: trailerKey }; })()')();

// Initialize and apply
LikhtarCard.addStyles();
const movie = { id: 338969, title: "Токсичний месник" };
const renderEl = document.getElementById('page');

LikhtarCard.apply(movie, renderEl);

// 3. Assertions
setTimeout(() => {
  const metricsCard = $('.likhtar-metrics');
  if (metricsCard.length === 0) {
    console.error("Assertion Failed: .likhtar-metrics element was not created!");
    process.exit(1);
  }

  console.log("Enriched sidebar card HTML structure:");
  console.log(metricsCard[0].outerHTML);

  const moods = metricsCard.find('.likhtar-mood-tag');
  if (moods.length !== 2) {
    console.error(`Assertion Failed: Expected 2 moods in sidebar, found ${moods.length}`);
    process.exit(1);
  }

  const watchLines = metricsCard.find('.likhtar-metrics__watch-line');
  if (watchLines.length !== 3) {
    console.error(`Assertion Failed: Expected 3 watch lines in sidebar, found ${watchLines.length}`);
    process.exit(1);
  }

  const ratingItems = metricsCard.find('.likhtar-metrics__rating-item');
  if (ratingItems.length !== 4) { // 3 metrics + 1 child recommendation
    console.error(`Assertion Failed: Expected 4 rating items in sidebar, found ${ratingItems.length}`);
    process.exit(1);
  }

  const bottom = metricsCard.find('.likhtar-metrics__bottom');
  if (bottom.length === 0) {
    console.error("Assertion Failed: .likhtar-metrics__bottom was not created!");
    process.exit(1);
  }

  const synopsisBtn = $('.likhtar-button--synopsis');
  if (synopsisBtn.length !== 0) {
     console.error("Assertion Failed: .likhtar-button--synopsis should NOT be created!");
     process.exit(1);
  }

  console.log("SUCCESS: All assertions passed! Sidebar Vibe Card is rendered correctly!");
  process.exit(0);
}, 100);
