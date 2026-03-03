/**
 * Ліхтар Studios2 — плагін головної сторінки (Likhtar Team).
 * Кастомна головна, стрімінги, студії, підписки на студії, Кіноогляд.
 */
(function () {
    'use strict';

    window.LIKHTAR_STUDIOS_VER = '3.0';
    window.LIKHTAR_STUDIOS_LOADED = false;
    window.LIKHTAR_STUDIOS_ERROR = null;

    if (typeof Lampa === 'undefined') {
        window.LIKHTAR_STUDIOS_ERROR = 'Lampa not found (script loaded before app?)';
        return;
    }


    // =================================================================
    // CONFIGURATION & CONSTANTS
    // =================================================================

    var currentScript = document.currentScript || [].slice.call(document.getElementsByTagName('script')).filter(function (s) {
        return (s.src || '').indexOf('studios') !== -1 || (s.src || '').indexOf('fix.js') !== -1 || (s.src || '').indexOf('likhtar') !== -1;
    })[0];

    var LIKHTAR_BASE_URL = (currentScript && currentScript.src) ? currentScript.src.replace(/[#?].*$/, '').replace(/[^/]+$/, '') : 'http://127.0.0.1:3000/';

    if (LIKHTAR_BASE_URL.indexOf('raw.githubusercontent.com') !== -1) {
        LIKHTAR_BASE_URL = LIKHTAR_BASE_URL
            .replace('raw.githubusercontent.com', 'cdn.jsdelivr.net/gh')
            .replace(/\/([^@/]+\/[^@/]+)\/main\//, '/$1@main/')
            .replace(/\/([^@/]+\/[^@/]+)\/master\//, '/$1@master/');
    } else if (LIKHTAR_BASE_URL.indexOf('.github.io') !== -1) {
        // e.g. https://syvyj.github.io/studio_2/ → https://cdn.jsdelivr.net/gh/syvyj/studio_2@main/
        var gitioMatch = LIKHTAR_BASE_URL.match(/https?:\/\/([^.]+)\.github\.io\/([^/]+)\//i);
        if (gitioMatch) {
            LIKHTAR_BASE_URL = 'https://cdn.jsdelivr.net/gh/' + gitioMatch[1] + '/' + gitioMatch[2] + '@main/';
        }
    }



    var UKRAINIAN_FEED_CATEGORIES = [
        { title: 'Нові українські фільми', url: 'discover/movie', params: { with_origin_country: 'UA', sort_by: 'primary_release_date.desc', 'vote_count.gte': '5' } },
        { title: 'Нові українські серіали', url: 'discover/tv', params: { with_origin_country: 'UA', sort_by: 'first_air_date.desc', 'vote_count.gte': '5' } },
        { title: 'В тренді в Україні', url: 'discover/movie', params: { with_origin_country: 'UA', sort_by: 'popularity.desc' } },
        { title: 'Українські серіали в тренді', url: 'discover/tv', params: { with_origin_country: 'UA', sort_by: 'popularity.desc' } },
        { title: 'Найкращі українські фільми', url: 'discover/movie', params: { with_origin_country: 'UA', sort_by: 'vote_average.desc', 'vote_count.gte': '50' } },
        { type: 'from_global', globalKey: 'LIKHTAR_UA_MOVIES', title: 'Українські фільми (повна підбірка)' },
        { type: 'from_global', globalKey: 'LIKHTAR_UA_SERIES', title: 'Українські серіали (повна підбірка)' }
    ];

    var SERVICE_CONFIGS = {
        'netflix': {
            title: 'Netflix',
            icon: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.5 2L16.5 22" stroke="#E50914" stroke-width="4"/><path d="M7.5 2L7.5 22" stroke="#E50914" stroke-width="4"/><path d="M7.5 2L16.5 22" stroke="#E50914" stroke-width="4"/></svg>',
            categories: [
                { "title": "Нові фільми", "url": "discover/movie", "params": { "with_watch_providers": "8", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Нові серіали", "url": "discover/tv", "params": { "with_networks": "213", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "В тренді на Netflix", "url": "discover/tv", "params": { "with_networks": "213", "sort_by": "popularity.desc" } },
                { "title": "Екшн та Блокбастери", "url": "discover/movie", "params": { "with_companies": "213", "with_genres": "28,12", "sort_by": "popularity.desc" } },
                { "title": "Фантастичні світи", "url": "discover/tv", "params": { "with_networks": "213", "with_genres": "10765", "sort_by": "vote_average.desc", "vote_count.gte": "200" } },
                { "title": "Реаліті-шоу: Хіти", "url": "discover/tv", "params": { "with_networks": "213", "with_genres": "10764", "sort_by": "popularity.desc" } },
                { "title": "Кримінальні драми", "url": "discover/tv", "params": { "with_networks": "213", "with_genres": "80", "sort_by": "popularity.desc" } },
                { "title": "K-Dramas (Корейські серіали)", "url": "discover/tv", "params": { "with_networks": "213", "with_original_language": "ko", "sort_by": "popularity.desc" } },
                { "title": "Аніме колекція", "url": "discover/tv", "params": { "with_networks": "213", "with_genres": "16", "with_keywords": "210024", "sort_by": "popularity.desc" } },
                { "title": "Документальне кіно", "url": "discover/movie", "params": { "with_companies": "213", "with_genres": "99", "sort_by": "release_date.desc" } },
                { "title": "Вибір критиків (Високий рейтинг)", "url": "discover/movie", "params": { "with_companies": "213", "vote_average.gte": "7.5", "vote_count.gte": "300", "sort_by": "vote_average.desc" } }
            ]
        },
        'apple': {
            title: 'Apple TV+',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>',
            categories: [
                { "title": "Нові фільми", "url": "discover/movie", "params": { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Нові серіали", "url": "discover/tv", "params": { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Хіти Apple TV+", "url": "discover/tv", "params": { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "popularity.desc" } },
                { "title": "Apple Original Films", "url": "discover/movie", "params": { "with_watch_providers": "350", "watch_region": "UA", "sort_by": "release_date.desc", "vote_count.gte": "10" } },
                { "title": "Фантастика Apple", "url": "discover/tv", "params": { "with_watch_providers": "350", "watch_region": "UA", "with_genres": "10765", "sort_by": "vote_average.desc", "vote_count.gte": "200" } },
                { "title": "Комедії та Feel-good", "url": "discover/tv", "params": { "with_watch_providers": "350", "watch_region": "UA", "with_genres": "35", "sort_by": "popularity.desc" } },
                { "title": "Трилери та Детективи", "url": "discover/tv", "params": { "with_watch_providers": "350", "watch_region": "UA", "with_genres": "9648,80", "sort_by": "popularity.desc" } }
            ]
        },
        'hbo': {
            title: 'HBO / Max',
            icon: '<svg width="24px" height="24px" viewBox="0 0 24 24" fill="currentColor"><path d="M7.042 16.896H4.414v-3.754H2.708v3.754H.01L0 7.22h2.708v3.6h1.706v-3.6h2.628zm12.043.046C21.795 16.94 24 14.689 24 11.978a4.89 4.89 0 0 0-4.915-4.92c-2.707-.002-4.09 1.991-4.432 2.795.003-1.207-1.187-2.632-2.58-2.634H7.59v9.674l4.181.001c1.686 0 2.886-1.46 2.888-2.713.385.788 1.72 2.762 4.427 2.76zm-7.665-3.936c.387 0 .692.382.692.817 0 .435-.305.817-.692.817h-1.33v-1.634zm.005-3.633c.387 0 .692.382.692.817 0 .436-.305.818-.692.818h-1.33V9.373zm1.77 2.607c.305-.039.813-.387.992-.61-.063.276-.068 1.074.006 1.35-.204-.314-.688-.701-.998-.74zm3.43 0a2.462 2.462 0 1 1 4.924 0 2.462 2.462 0 0 1-4.925 0zm2.462 1.936a1.936 1.936 0 1 0 0-3.872 1.936 1.936 0 0 0 0 3.872z"/></svg>',
            categories: [
                { "title": "Нові фільми WB/HBO", "url": "discover/movie", "params": { "with_companies": "174|49", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "10" } },
                { "title": "Нові серіали HBO/Max", "url": "discover/tv", "params": { "with_networks": "49|3186", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "HBO: Головні хіти", "url": "discover/tv", "params": { "with_networks": "49", "sort_by": "popularity.desc" } },
                { "title": "Max Originals", "url": "discover/tv", "params": { "with_networks": "3186", "sort_by": "popularity.desc" } },
                { "title": "Блокбастери Warner Bros.", "url": "discover/movie", "params": { "with_companies": "174", "sort_by": "revenue.desc", "vote_count.gte": "1000" } },
                { "title": "Золота колекція HBO (Найвищий рейтинг)", "url": "discover/tv", "params": { "with_networks": "49", "sort_by": "vote_average.desc", "vote_count.gte": "500", "vote_average.gte": "8.0" } },
                { "title": "Епічні світи (Фентезі)", "url": "discover/tv", "params": { "with_networks": "49|3186", "with_genres": "10765", "sort_by": "popularity.desc" } },
                { "title": "Преміальні драми", "url": "discover/tv", "params": { "with_networks": "49", "with_genres": "18", "without_genres": "10765", "sort_by": "popularity.desc" } },
                { "title": "Доросла анімація (Adult Swim)", "url": "discover/tv", "params": { "with_networks": "3186|80", "with_genres": "16", "sort_by": "popularity.desc" } },
                { "title": "Всесвіт DC (Фільми)", "url": "discover/movie", "params": { "with_companies": "174", "with_keywords": "9715", "sort_by": "release_date.desc" } }
            ]
        },
        'amazon': {
            title: 'Prime Video',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.787 15.292c-.336-.43-2.222-.204-3.069-.103-.257.031-.296-.193-.065-.356 1.504-1.056 3.968-.75 4.255-.397.288.357-.076 2.827-1.485 4.007-.217.18-.423.084-.327-.155.317-.792 1.027-2.566.69-2.996"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>',
            categories: [
                { "title": "В тренді на Prime Video", "url": "discover/tv", "params": { "with_networks": "1024", "sort_by": "popularity.desc" } },
                { "title": "Нові фільми", "url": "discover/movie", "params": { "with_watch_providers": "119", "watch_region": "UA", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Нові серіали", "url": "discover/tv", "params": { "with_networks": "1024", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Жорсткий екшн та Антигерої", "url": "discover/tv", "params": { "with_networks": "1024", "with_genres": "10765,10759", "sort_by": "popularity.desc" } },
                { "title": "Блокбастери MGM та Amazon", "url": "discover/movie", "params": { "with_companies": "1024|21", "sort_by": "revenue.desc" } },
                { "title": "Комедії", "url": "discover/tv", "params": { "with_networks": "1024", "with_genres": "35", "sort_by": "vote_average.desc" } },
                { "title": "Найвищий рейтинг IMDb", "url": "discover/tv", "params": { "with_networks": "1024", "vote_average.gte": "8.0", "vote_count.gte": "500", "sort_by": "vote_average.desc" } }
            ]
        },
        'disney': {
            title: 'Disney+',
            icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19,3V7m2-2H17m-10.31,4L8.69,21m-5.69-7c0-3,5.54-4.55,9-2m-9,2s12.29-2,13.91,6.77c1.09,5.93-6.58,6.7-9.48,5.89S3,16.06,3,14.06"/></svg>',
            categories: [
                { "title": "Нові фільми на Disney+", "url": "discover/movie", "params": { "with_watch_providers": "337", "watch_region": "US", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Нові серіали на Disney+", "url": "discover/tv", "params": { "with_networks": "2739", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Marvel: Кіновсесвіт (MCU)", "url": "discover/movie", "params": { "with_companies": "420", "sort_by": "release_date.desc", "vote_count.gte": "200" } },
                { "title": "Marvel: Серіали", "url": "discover/tv", "params": { "with_companies": "420", "with_networks": "2739", "sort_by": "first_air_date.desc" } },
                { "title": "Зоряні Війни: Фільми", "url": "discover/movie", "params": { "with_companies": "1", "sort_by": "release_date.asc" } },
                { "title": "Зоряні Війни: Мандалорець та інші", "url": "discover/tv", "params": { "with_companies": "1", "with_keywords": "1930", "sort_by": "popularity.desc" } },
                { "title": "Класика Disney", "url": "discover/movie", "params": { "with_companies": "6125", "sort_by": "popularity.desc" } },
                { "title": "Pixar: Нескінченність і далі", "url": "discover/movie", "params": { "with_companies": "3", "sort_by": "popularity.desc" } },
                { "title": "FX: Дорослі хіти (The Bear, Shogun)", "url": "discover/tv", "params": { "with_networks": "88", "sort_by": "popularity.desc" } },
                { "title": "Сімпсони та анімація FOX", "url": "discover/tv", "params": { "with_networks": "19", "with_genres": "16", "sort_by": "popularity.desc" } }
            ]
        },
        'paramount': {
            title: 'Paramount+',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22H22L12 2ZM12 6.5L18.5 19.5H5.5L12 6.5Z"/></svg>',
            categories: [
                { "title": "Блокбастери Paramount Pictures", "url": "discover/movie", "params": { "with_companies": "4", "sort_by": "revenue.desc" } },
                { "title": "Paramount+ Originals", "url": "discover/tv", "params": { "with_networks": "4330", "sort_by": "popularity.desc" } },
                { "title": "Всесвіт Йеллоустоун", "url": "discover/tv", "params": { "with_networks": "318|4330", "with_genres": "37,18", "sort_by": "popularity.desc" } },
                { "title": "Star Trek: Остання межа", "url": "discover/tv", "params": { "with_networks": "4330", "with_keywords": "159223", "sort_by": "first_air_date.desc" } },
                { "title": "Nickelodeon: Для дітей", "url": "discover/tv", "params": { "with_networks": "13", "sort_by": "popularity.desc" } }
            ]
        },
        'sky_showtime': {
            title: 'Sky Showtime',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2zm0 3.5l6.5 13H5.5L12 5.5z"/></svg>',
            categories: [
                { "title": "Нові фільми Sky Showtime", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Серіали Sky Showtime", "url": "discover/tv", "params": { "with_watch_providers": "1773", "watch_region": "PL", "sort_by": "popularity.desc" } },
                { "title": "Бойовики та Трилери", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "with_genres": "28,53", "sort_by": "popularity.desc" } },
                { "title": "Комедії для всіх", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "with_genres": "35", "sort_by": "popularity.desc" } }
            ]
        },
        'hulu': {
            title: 'Hulu',
            icon: '<svg viewBox="0 0 24 24" fill="#3DBB3D"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg>',
            categories: [
                { "title": "Hulu Originals: У тренді", "url": "discover/tv", "params": { "with_networks": "453", "sort_by": "popularity.desc" } },
                { "title": "Драми та Трилери Hulu", "url": "discover/tv", "params": { "with_networks": "453", "with_genres": "18,9648", "sort_by": "vote_average.desc" } },
                { "title": "Комедії та Анімація для дорослих", "url": "discover/tv", "params": { "with_networks": "453", "with_genres": "35,16", "sort_by": "popularity.desc" } },
                { "title": "Міні-серіали (Limited Series)", "url": "discover/tv", "params": { "with_networks": "453", "with_keywords": "158718", "sort_by": "first_air_date.desc" } }
            ]
        },
        'syfy': {
            title: 'Syfy',
            icon: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L4.5 20.29L5.21 21L12 18L18.79 21L19.5 20.29L12 2Z"/></svg>',
            categories: [
                { "title": "Хіти телеканалу Syfy", "url": "discover/tv", "params": { "with_networks": "77", "sort_by": "popularity.desc" } },
                { "title": "Космічні подорожі та Наукова Фантастика", "url": "discover/tv", "params": { "with_networks": "77", "with_genres": "10765", "with_keywords": "3801", "sort_by": "vote_average.desc" } },
                { "title": "Містика, Жахи та Фентезі", "url": "discover/tv", "params": { "with_networks": "77", "with_genres": "9648,10765", "without_keywords": "3801", "sort_by": "popularity.desc" } }
            ]
        },
        'educational_and_reality': {
            title: 'Пізнавальне',
            icon: '<svg viewBox="0 0 24 24" fill="#FF9800"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>',
            categories: [
                { "title": "Нові випуски: Discovery, NatGeo, BBC", "url": "discover/tv", "params": { "with_networks": "64|91|43|2696|4|65", "sort_by": "first_air_date.desc", "first_air_date.lte": "{current_date}", "vote_count.gte": "0" } },
                { "title": "Discovery Channel: Хіти", "url": "discover/tv", "params": { "with_networks": "64", "sort_by": "popularity.desc" } },
                { "title": "National Geographic: Світ навколо", "url": "discover/tv", "params": { "with_networks": "43", "sort_by": "popularity.desc" } },
                { "title": "Animal Planet: Тварини", "url": "discover/tv", "params": { "with_networks": "91", "sort_by": "popularity.desc" } },
                { "title": "BBC Earth: Природа (Високий рейтинг)", "url": "discover/tv", "params": { "with_networks": "4", "with_genres": "99", "sort_by": "vote_average.desc", "vote_count.gte": "50" } },
                { "title": "History Channel: Історія та Легенди", "url": "discover/tv", "params": { "with_networks": "65", "sort_by": "popularity.desc" } },
                { "title": "Світ авто: Top Gear та інші", "url": "discover/tv", "params": { "with_keywords": "334", "with_genres": "99", "sort_by": "popularity.desc" } }
            ]
        },
        'ukrainian_feed': { title: 'Українська стрічка', icon: '🇺🇦', categories: UKRAINIAN_FEED_CATEGORIES }
    };

    function getTmdbKey() {
        var custom = (Lampa.Storage.get('likhtar_tmdb_apikey') || '').trim();
        return custom || (Lampa.TMDB && Lampa.TMDB.key ? Lampa.TMDB.key() : '');
    }

    /** Для рядка на головній: HBO/Prime/Paramount через watch_providers (TMDB), щоб отримувати і фільми, і серіали з актуальним контентом. */
    var SERVICE_WATCH_PROVIDERS_FOR_ROW = { hbo: '384', amazon: '119', paramount: '531' };

    // =================================================================
    // UTILS & COMPONENTS
    // =================================================================

    window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};

    function fetchHeroLogo(movie, jqItem, heightEm) {
        var titleElem = jqItem.find('.hero-title');

        function renderLogo(img_url, invert) {
            var img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = img_url;
            img.onload = function () {
                if (invert) img.style.filter = 'brightness(0) invert(1)';
                img.style.maxHeight = (heightEm / 35 * 6) + 'em';
                img.style.maxWidth = '60%';
                img.style.objectFit = 'contain';
                img.style.objectPosition = 'left bottom';
                img.style.filter = (img.style.filter || '') + ' drop-shadow(3px 3px 6px rgba(0,0,0,0.8))';

                titleElem.empty().append(img);
                titleElem.css({ 'margin-bottom': '0.3em', 'display': 'flex', 'align-items': 'flex-end', 'text-shadow': 'none' });
            };
        }

        if (window.LikhtarHeroLogos[movie.id]) {
            if (window.LikhtarHeroLogos[movie.id].path) {
                renderLogo(window.LikhtarHeroLogos[movie.id].path, window.LikhtarHeroLogos[movie.id].invert);
            }
            return;
        }

        window.LikhtarHeroLogos[movie.id] = { fetching: true };

        var type = movie.name ? 'tv' : 'movie';
        var requestLang = Lampa.Storage.get('logo_lang') || Lampa.Storage.get('language', 'uk');
        var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + getTmdbKey() + '&include_image_language=' + requestLang + ',en,null');

        var network = new Lampa.Reguest();
        network.silent(url, function (data) {
            var final_logo = null;
            if (data.logos && data.logos.length > 0) {
                var found = data.logos.find(function (l) { return l.iso_639_1 == requestLang; }) ||
                    data.logos.find(function (l) { return l.iso_639_1 == 'en'; }) || data.logos[0];
                if (found) final_logo = found.file_path;
            }
            if (final_logo) {
                if (!Lampa.Storage.get('likhtar_show_logo_instead_text', true)) return;
                var img_url = Lampa.TMDB.image('t/p/w500' + final_logo.replace('.svg', '.png'));
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = img_url;
                img.onload = function () {
                    var invert = false;
                    try {
                        var canvas = document.createElement('canvas');
                        var ctx = canvas.getContext('2d');
                        canvas.width = img.naturalWidth || img.width;
                        canvas.height = img.naturalHeight || img.height;
                        if (canvas.width > 0 && canvas.height > 0) {
                            ctx.drawImage(img, 0, 0);
                            var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                            var darkPixels = 0, totalPixels = 0;
                            for (var i = 0; i < imgData.length; i += 4) {
                                if (imgData[i + 3] < 10) continue;
                                totalPixels++;
                                if ((imgData[i] * 299 + imgData[i + 1] * 587 + imgData[i + 2] * 114) / 1000 < 120) darkPixels++;
                            }
                            if (totalPixels > 0 && (darkPixels / totalPixels) >= 0.85) {
                                invert = true;
                            }
                        }
                    } catch (e) { }

                    window.LikhtarHeroLogos[movie.id] = { path: img_url, invert: invert };
                    renderLogo(img_url, invert);
                };
                img.onerror = function () {
                    window.LikhtarHeroLogos[movie.id] = { fail: true };
                };
            } else {
                window.LikhtarHeroLogos[movie.id] = { fail: true };
            }
        }, function () {
            window.LikhtarHeroLogos[movie.id] = { fail: true };
        });
    }

    // Додаємо CSS для фокусу героя (оскільки Lampa використовує клас .focus замість псевдокласів)
    if (!$('style#likhtar-hero-css').length) {
        $('head').append('<style id="likhtar-hero-css">' +
            '.hero-banner { transition: transform 0.2s, box-shadow 0.2s; }' +
            '.hero-banner.focus { transform: scale(1.02); outline: 4px solid #fff; outline-offset: -4px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 10; }' +
            '.hero-meta span { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }' +
            '</style>');
    }

    // Кеш для додаткових деталей геро-банеру
    window.LikhtarHeroDetails = window.LikhtarHeroDetails || {};

    function fetchHeroDetails(movie, jqItem, metaEm) {
        var metaContainer = jqItem.find('.hero-meta-dynamic');
        if (!metaContainer.length) return;

        function renderDetails(details) {
            var html = '';
            if (details.age) html += '<span style="border: 1px solid rgba(255,255,255,0.4); padding: 0.1em 0.3em; border-radius: 0.2em; font-size: 0.9em;">' + details.age + '</span>';
            if (details.country) html += '<span>' + details.country + '</span>';
            if (details.time) html += '<span>' + details.time + '</span>';
            metaContainer.html(html);
        }

        if (window.LikhtarHeroDetails[movie.id]) {
            renderDetails(window.LikhtarHeroDetails[movie.id]);
            return;
        }

        var type = movie.name ? 'tv' : 'movie';
        var lang = Lampa.Storage.get('language', 'uk');
        var append = type === 'movie' ? 'release_dates' : 'content_ratings';
        var url = Lampa.TMDB.api(type + '/' + movie.id + '?api_key=' + getTmdbKey() + '&language=' + lang + '&append_to_response=' + append);

        var network = new Lampa.Reguest();
        network.silent(url, function (data) {
            var details = { age: '', country: '', time: '' };

            // Тривалість
            if (type === 'movie' && data.runtime) {
                var h = Math.floor(data.runtime / 60);
                var m = data.runtime % 60;
                details.time = (h > 0 ? h + ' год ' : '') + m + ' хв';
            } else if (type === 'tv' && data.episode_run_time && data.episode_run_time.length) {
                details.time = '~' + data.episode_run_time[0] + ' хв';
            }

            // Країна
            if (data.production_countries && data.production_countries.length > 0) {
                details.country = data.production_countries[0].iso_3166_1;
            }

            // Віковий рейтинг
            if (type === 'movie' && data.release_dates && data.release_dates.results) {
                var usRelease = data.release_dates.results.find(function (r) { return r.iso_3166_1 === 'US'; });
                if (usRelease && usRelease.release_dates.length > 0) {
                    details.age = usRelease.release_dates[0].certification;
                }
            } else if (type === 'tv' && data.content_ratings && data.content_ratings.results) {
                var usRating = data.content_ratings.results.find(function (r) { return r.iso_3166_1 === 'US'; });
                if (usRating) details.age = usRating.rating;
            }

            if (!details.age) details.age = ''; // Fallback

            window.LikhtarHeroDetails[movie.id] = details;
            renderDetails(details);
        });
    }

    // Один елемент геро-рядка (backdrop + overlay). heightEm — висота банеру (напр. 28).
    function makeHeroResultItem(movie, heightEm) {
        heightEm = heightEm || 22.5;
        var pad = (heightEm / 35 * 2).toFixed(1);
        var titleEm = (heightEm / 35 * 2.5).toFixed(2);
        var descEm = (heightEm / 35 * 1.1).toFixed(2);
        var metaEm = (heightEm / 35 * 1.0).toFixed(2);

        var year = (movie.release_date || movie.first_air_date || '').substr(0, 4);
        var rating = movie.vote_average ? movie.vote_average.toFixed(1) : '';
        var typeStr = movie.name ? 'Серіал' : 'Фільм';

        var metaHtml = '<div class="hero-meta" style="font-size: ' + metaEm + 'em; color: #ddd; margin-bottom: 0.8em; display: flex; gap: 0.6em; align-items: center; font-weight: 500;">';
        if (rating && rating !== '0.0') metaHtml += '<span style="background: rgba(255,255,255,0.25); padding: 0.1em 0.5em; border-radius: 0.2em; color: #fff;">Оцінка: ' + rating + '</span>';
        if (year) metaHtml += '<span>' + year + '</span>';
        metaHtml += '<span style="color: #999">•</span><span>' + typeStr + '</span>';
        metaHtml += '<div class="hero-meta-dynamic" style="display: flex; gap: 0.6em; align-items: center;"></div>';
        metaHtml += '</div>';

        return {
            title: 'Hero',
            params: {
                createInstance: function (element) {
                    var card = Lampa.Maker.make('Card', element, function (module) { return module.only('Card', 'Callback'); });
                    return card;
                },
                emit: {
                    onCreate: function () {
                        var img = movie.backdrop_path ? Lampa.TMDB.image('t/p/original' + movie.backdrop_path) : (movie.poster_path ? Lampa.TMDB.image('t/p/original' + movie.poster_path) : '');
                        try {
                            var item = $(this.html);
                            item.addClass('hero-banner');
                            item.css({
                                'background-image': 'url(' + img + ')',
                                'width': '100%',
                                'height': heightEm + 'em',
                                'background-size': 'cover',
                                'background-position': 'center',
                                'border-radius': '1em',
                                'position': 'relative',
                                'box-shadow': '0 0 20px rgba(0,0,0,0.5)',
                                'margin-bottom': '10px',
                                'cursor': 'pointer'
                            });
                            item.append('<div class="hero-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 100%); padding: ' + (pad * 1.2) + 'em; border-radius: 0 0 1em 1em;">' +
                                '<div class="hero-title" style="font-size: ' + titleEm + 'em; font-weight: bold; color: #fff; margin-bottom: 0.2em; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);">' + (movie.title || movie.name) + '</div>' +
                                metaHtml +
                                '<div class="hero-desc" style="font-size: ' + descEm + 'em; color: #eee; max-width: 65%; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 1px 1px 3px rgba(0,0,0,0.9);">' + (movie.overview || '') + '</div></div>');
                            item.find('.card__view').remove();
                            item.find('.card__title').remove();
                            item.find('.card__age').remove();
                            item[0].heroMovieData = movie;

                            // Завантажуємо крутий логотип замість тексту:
                            fetchHeroLogo(movie, item, heightEm);
                            // Підтягуємо деталі (тривалість, вік, країна)
                            fetchHeroDetails(movie, item, metaEm);
                        } catch (e) { console.log('Hero onCreate error:', e); }
                    },
                    onVisible: function () {
                        try {
                            var item = $(this.html);
                            if (!item.hasClass('hero-banner')) {
                                var img = movie.backdrop_path ? Lampa.TMDB.image('t/p/original' + movie.backdrop_path) : (movie.poster_path ? Lampa.TMDB.image('t/p/original' + movie.poster_path) : '');
                                item.addClass('hero-banner');
                                item.css({
                                    'background-image': 'url(' + img + ')',
                                    'width': '100%',
                                    'height': heightEm + 'em',
                                    'background-size': 'cover',
                                    'background-position': 'center',
                                    'border-radius': '1em',
                                    'position': 'relative',
                                    'box-shadow': '0 0 20px rgba(0,0,0,0.5)',
                                    'margin-bottom': '10px',
                                    'cursor': 'pointer'
                                });
                                item.append('<div class="hero-overlay" style="position: absolute; bottom: 0; left: 0; right: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.5) 40%, transparent 100%); padding: ' + (pad * 1.2) + 'em; border-radius: 0 0 1em 1em;">' +
                                    '<div class="hero-title" style="font-size: ' + titleEm + 'em; font-weight: bold; color: #fff; margin-bottom: 0.2em; text-shadow: 2px 2px 4px rgba(0,0,0,0.7);">' + (movie.title || movie.name) + '</div>' +
                                    metaHtml +
                                    '<div class="hero-desc" style="font-size: ' + descEm + 'em; color: #eee; max-width: 65%; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 1px 1px 3px rgba(0,0,0,0.9);">' + (movie.overview || '') + '</div></div>');

                                item.find('.card__view').remove();
                                item.find('.card__title').remove();
                                item.find('.card__age').remove();
                                item[0].heroMovieData = movie;

                                // Перезавантажуємо лого після відновлення віртуального DOM Lampa
                                fetchHeroLogo(movie, item, heightEm);
                                fetchHeroDetails(movie, item, metaEm);
                            }
                            // Stop default image loading
                            if (this.img) this.img.onerror = function () { };
                            if (this.img) this.img.onload = function () { };
                        } catch (e) { console.log('Hero onVisible error:', e); }
                    },
                    onlyEnter: function () {
                        Lampa.Activity.push({
                            url: '',
                            component: 'full',
                            id: movie.id,
                            method: movie.name ? 'tv' : 'movie',
                            card: movie,
                            source: 'tmdb'
                        });
                    }
                }
            }
        };
    }

    function StudiosMain(object) {
        var comp = new Lampa.InteractionMain(object);

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);

            if (object.categories && object.categories.length) {
                var categories = object.categories;
                var network = new Lampa.Reguest();
                var status = new Lampa.Status(categories.length);

                status.onComplite = function () {
                    var fulldata = [];
                    Object.keys(status.data).sort(function (a, b) { return a - b; }).forEach(function (key) {
                        var data = status.data[key];
                        if (data && data.results && data.results.length) {
                            var cat = categories[parseInt(key)];
                            Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                            fulldata.push({
                                title: cat.title,
                                results: data.results,
                                url: cat.url,
                                params: cat.params,
                                service_id: object.service_id
                            });
                        }
                    });

                    if (fulldata.length) {
                        _this.build(fulldata);
                        _this.activity.loader(false);
                    } else {
                        _this.empty();
                    }
                };

                categories.forEach(function (cat, index) {
                    var params = [];
                    params.push('api_key=' + getTmdbKey());
                    params.push('language=' + Lampa.Storage.get('language', 'uk'));

                    if (cat.params) {
                        for (var key in cat.params) {
                            var val = cat.params[key];
                            if (val === '{current_date}') {
                                var d = new Date();
                                val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                            }
                            params.push(key + '=' + val);
                        }
                    }

                    var url = Lampa.TMDB.api(cat.url + '?' + params.join('&'));

                    network.silent(url, function (json) {
                        // FIX: Normalize image paths for all items
                        if (json && json.results && Array.isArray(json.results)) {
                            json.results.forEach(function (item) {
                                if (!item.poster_path && item.backdrop_path) {
                                    item.poster_path = item.backdrop_path;
                                }
                            });
                        }
                        status.append(index.toString(), json);
                    }, function () {
                        status.error();
                    });
                });
            } else {
                this.activity.loader(false);
                this.empty();
            }

            return this.render();
        };

        // OnMore will be handled by StudiosView 
        comp.onMore = function (data) {
            Lampa.Activity.push({
                url: data.url,
                params: data.params,
                title: data.title,
                component: 'studios_view',
                page: 1
            });
        };
        return comp;
    }

    // Категорії перенесені нагору
    function UkrainianFeedMain(object) {
        var comp = new Lampa.InteractionMain(object);
        var network = new Lampa.Reguest();
        var categories = UKRAINIAN_FEED_CATEGORIES;

        comp.create = function () {
            var _this = this;
            this.activity.loader(true);
            var requestIndices = [];
            categories.forEach(function (c, i) { if (c.type !== 'from_global') requestIndices.push(i); });
            var status = new Lampa.Status(requestIndices.length);

            status.onComplite = function () {
                var fulldata = [];
                if (status.data) {
                    Object.keys(status.data).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function (key) {
                        var data = status.data[key];
                        var cat = categories[requestIndices[parseInt(key, 10)]];
                        if (cat && data && data.results && data.results.length) {
                            Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                            fulldata.push({
                                title: cat.title,
                                results: data.results,
                                url: cat.url,
                                params: cat.params
                            });
                        }
                    });
                }
                categories.forEach(function (cat) {
                    if (cat.type === 'from_global' && cat.globalKey && window[cat.globalKey] && window[cat.globalKey].results && window[cat.globalKey].results.length) {
                        var raw = window[cat.globalKey].results;
                        var results = Array.isArray(raw) ? raw.slice(0, 100) : (raw.results || []).slice(0, 100);
                        if (results.length === 0) return;
                        Lampa.Utils.extendItemsParams(results, { style: { name: 'wide' } });
                        var mediaType = (results[0] && results[0].media_type) ? results[0].media_type : 'movie';
                        fulldata.push({
                            title: cat.title,
                            results: results,
                            url: mediaType === 'tv' ? 'discover/tv' : 'discover/movie',
                            params: { with_origin_country: 'UA' }
                        });
                    }
                });
                if (fulldata.length) {
                    _this.build(fulldata);
                    _this.activity.loader(false);
                } else {
                    _this.empty();
                }
            };

            requestIndices.forEach(function (catIndex, rIdx) {
                var cat = categories[catIndex];
                var params = ['api_key=' + getTmdbKey(), 'language=' + Lampa.Storage.get('language', 'uk')];
                if (cat.params) {
                    for (var key in cat.params) {
                        var val = cat.params[key];
                        if (val === '{current_date}') {
                            var d = new Date();
                            val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                        }
                        params.push(key + '=' + val);
                    }
                }
                var url = Lampa.TMDB.api(cat.url + '?' + params.join('&'));
                network.silent(url, function (json) {
                    // FIX: Normalize image paths for all items
                    if (json && json.results && Array.isArray(json.results)) {
                        json.results.forEach(function (item) {
                            if (!item.poster_path && item.backdrop_path) {
                                item.poster_path = item.backdrop_path;
                            }
                        });
                    }
                    status.append(rIdx.toString(), json);
                }, function () { status.error(); });
            });

            return this.render();
        };

        comp.onMore = function (data) {
            Lampa.Activity.push({
                url: data.url,
                params: data.params,
                title: data.title,
                component: 'studios_view',
                page: 1
            });
        };

        return comp;
    }



    function StudiosView(object) {
        var comp = new Lampa.InteractionCategory(object);
        var network = new Lampa.Reguest();

        function buildUrl(page) {
            var params = [];
            params.push('api_key=' + getTmdbKey());
            params.push('language=' + Lampa.Storage.get('language', 'uk'));
            params.push('page=' + page);

            if (object.params) {
                for (var key in object.params) {
                    var val = object.params[key];
                    if (val === '{current_date}') {
                        var d = new Date();
                        val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                    }
                    params.push(key + '=' + val);
                }
            }
            return Lampa.TMDB.api(object.url + '?' + params.join('&'));
        }

        comp.create = function () {
            var _this = this;
            network.silent(buildUrl(1), function (json) {
                // FIX: Ensure all items have poster_path for display
                // If backdrop_path exists but poster_path doesn't, use backdrop_path
                if (json && json.results && Array.isArray(json.results)) {
                    json.results.forEach(function (item) {
                        if (!item.poster_path && item.backdrop_path) {
                            item.poster_path = item.backdrop_path;
                        }
                    });
                }
                _this.build(json);
            }, this.empty.bind(this));
        };

        comp.nextPageReuest = function (object, resolve, reject) {
            network.silent(buildUrl(object.page), resolve, reject);
        };

        return comp;
    }

    // =================================================================
    // ПІДПИСКИ НА СТУДІЇ (Ліхтар — інтегровано з studio_subscription)
    // =================================================================
    var LikhtarStudioSubscription = (function () {
        var storageKey = 'likhtar_subscription_studios';

        function getParams() {
            var raw = Lampa.Storage.get(storageKey, '[]');
            return typeof raw === 'string' ? (function () { try { return JSON.parse(raw); } catch (e) { return []; } })() : (Array.isArray(raw) ? raw : []);
        }

        function setParams(params) {
            Lampa.Storage.set(storageKey, params);
        }

        function add(company) {
            var c = { id: company.id, name: company.name || '', logo_path: company.logo_path || '' };
            var studios = getParams();
            if (!studios.find(function (s) { return String(s.id) === String(c.id); })) {
                studios.push(c);
                setParams(studios);
                Lampa.Noty.show(Lampa.Lang.translate('title_bookmarked') || 'Додано в підписки');
            }
        }

        function remove(company) {
            var studios = getParams();
            var idx = studios.findIndex(function (c) { return c.id === company.id; });
            if (idx !== -1) {
                studios.splice(idx, 1);
                setParams(studios);
                Lampa.Noty.show(Lampa.Lang.translate('title_unbookmarked'));
            }
        }

        function isSubscribed(company) {
            return !!getParams().find(function (c) { return c.id === company.id; });
        }

        function injectButton(object) {
            var attempts = 0;
            var interval = setInterval(function () {
                var nameEl = $('.company-start__name');
                var company = object.company;
                if (!nameEl.length || !company || !company.id) {
                    attempts++;
                    if (attempts > 25) clearInterval(interval);
                    return;
                }
                clearInterval(interval);
                if (nameEl.find('.studio-subscription-btn').length) return;

                var btn = $('<div class="studio-subscription-btn selector"></div>');

                function updateState() {
                    var sub = isSubscribed(company);
                    btn.text(sub ? 'Відписатися' : 'Підписатися');
                    btn.removeClass('studio-subscription-btn--sub studio-subscription-btn--unsub').addClass(sub ? 'studio-subscription-btn--unsub' : 'studio-subscription-btn--sub');
                }

                function doToggle() {
                    if (isSubscribed(company)) remove(company);
                    else add({ id: company.id, name: company.name || '', logo_path: company.logo_path || '' });
                    updateState();
                }

                btn.on('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();
                    doToggle();
                });
                btn.on('hover:enter', doToggle);

                updateState();
                nameEl.append(btn);

                // Auto-focus the subscription button so it's visible immediately
                setTimeout(function () {
                    try {
                        if (Lampa.Controller && Lampa.Controller.collectionFocus) {
                            Lampa.Controller.collectionFocus(btn[0]);
                        }
                    } catch (e) { }
                }, 300);
            }, 200);
        }

        function registerComponent() {
            var langSubs = { en: 'My subscriptions', ru: 'Мои подписки', uk: 'Мої підписки', be: 'Мае падпіскі' };
            Lampa.Lang.add({
                title_studios_subscription: { en: 'Studios', ru: 'Студии', uk: 'Студії', be: 'Студыі' },
                likhtar_my_subscriptions: langSubs
            });

            Lampa.Component.add('studios_subscription', function (object) {
                var comp = new Lampa.InteractionMain(object);
                var network = new Lampa.Reguest();
                var studios = getParams();
                var limitPerStudio = 20;

                comp.create = function () {
                    var _this = this;
                    this.activity.loader(true);
                    if (!studios.length) {
                        this.empty();
                        this.activity.loader(false);
                        return this.render();
                    }
                    var status = new Lampa.Status(studios.length);
                    status.onComplite = function () {
                        var fulldata = [];
                        if (status.data) {
                            Object.keys(status.data).sort(function (a, b) { return parseInt(a, 10) - parseInt(b, 10); }).forEach(function (key) {
                                var data = status.data[key];
                                var studio = studios[parseInt(key, 10)];
                                if (studio && data && data.results && data.results.length) {
                                    Lampa.Utils.extendItemsParams && Lampa.Utils.extendItemsParams(data.results, { style: { name: 'wide' } });
                                    fulldata.push({
                                        title: studio.name || ('Студія ' + studio.id),
                                        results: (data.results || []).slice(0, limitPerStudio),
                                        url: 'discover/movie',
                                        params: { with_companies: String(studio.id), sort_by: 'popularity.desc' }
                                    });
                                }
                            });
                        }
                        if (fulldata.length) {
                            _this.build(fulldata);
                        } else {
                            _this.empty();
                        }
                        _this.activity.loader(false);
                    };

                    studios.forEach(function (studio, index) {
                        var d = new Date();
                        var currentDate = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                        var apiKeyParam = '?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk');

                        var movieUrl = Lampa.TMDB.api('discover/movie' + apiKeyParam + '&with_companies=' + encodeURIComponent(studio.id) + '&sort_by=popularity.desc&primary_release_date.lte=' + currentDate + '&page=1');
                        var tvUrl = Lampa.TMDB.api('discover/tv' + apiKeyParam + '&with_networks=' + encodeURIComponent(studio.id) + '&sort_by=popularity.desc&first_air_date.lte=' + currentDate + '&page=1');

                        var pending = 2;
                        var combinedResults = [];
                        var failed = false;

                        function donePart(res) {
                            if (res && res.results) {
                                res.results.forEach(function (item) {
                                    if (!item.poster_path && item.backdrop_path) item.poster_path = item.backdrop_path;
                                    combinedResults.push(item);
                                });
                            }
                            pending--;
                            if (pending === 0) finalize();
                        }

                        function finalize() {
                            if (failed && combinedResults.length === 0) {
                                status.error();
                            } else {
                                combinedResults.sort(function (a, b) {
                                    var popA = a.popularity || 0;
                                    var popB = b.popularity || 0;
                                    return popB - popA;
                                });
                                status.append(index.toString(), { results: combinedResults });
                            }
                        }

                        network.silent(movieUrl, donePart, function () { failed = true; donePart(); });
                        network.silent(tvUrl, donePart, function () { failed = true; donePart(); });
                    });
                    return this.render();
                };

                comp.onMore = function (data) {
                    Lampa.Activity.push({
                        url: data.url,
                        params: data.params,
                        title: data.title,
                        component: 'studios_view',
                        page: 1
                    });
                };

                return comp;
            });

            var menuLine = $('<li class="menu__item selector" data-action="studios_subscription"><div class="menu__ico"><svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M437 75a68 68 0 00-47.5-19.5h-267A68 68 0 0075 123.5v265A68 68 0 00122.5 456h267a68 68 0 0047.5-19.5H437A68 68 0 00456.5 388.5v-265A68 68 0 00437 75zM122.5 94h267a28 28 0 0128 28v265a28 28 0 01-28 28h-267a28 28 0 01-28-28v-265a28 28 0 0128-28z"></path></svg></div><div class="menu__text">' + (Lampa.Lang.translate('likhtar_my_subscriptions') || 'Мої підписки') + '</div></li>');
            var target = $('.menu .menu__list .menu__item[data-action="subscribes"]');
            if (target.length) target.after(menuLine);
            else $('.menu .menu__list').append(menuLine);

            menuLine.on('hover:enter', function () {
                Lampa.Activity.push({
                    url: '',
                    title: Lampa.Lang.translate('likhtar_my_subscriptions') || 'Мої підписки',
                    component: 'studios_subscription',
                    page: 1
                });
            });
        }

        return {
            init: function () {
                var existing = Lampa.Storage.get(storageKey, '[]');
                var fromOld = Lampa.Storage.get('subscription_studios', '[]');
                if ((!existing || existing === '[]' || (Array.isArray(existing) && !existing.length)) && fromOld && fromOld !== '[]') {
                    try {
                        var arr = typeof fromOld === 'string' ? JSON.parse(fromOld) : fromOld;
                        if (Array.isArray(arr) && arr.length) setParams(arr);
                    } catch (e) { }
                }
                registerComponent();
                Lampa.Listener.follow('activity', function (e) {
                    if (e.type === 'start' && e.component === 'company') injectButton(e.object);
                });
            }
        };
    })();

    // =================================================================
    // MAIN PAGE ROWS
    // =================================================================

    // ========== Прибираємо секцію Shots ==========
    function removeShotsSection() {
        function doRemove() {
            $('.items-line').each(function () {
                var title = $(this).find('.items-line__title').text().trim();
                if (title === 'Shots' || title === 'shots') {
                    $(this).remove();
                }
            });
        }
        // Виконуємо із затримкою, бо Shots може підвантажитись пізніше
        setTimeout(doRemove, 1000);
        setTimeout(doRemove, 3000);
        setTimeout(doRemove, 6000);
    }

    // ========== ROW 1: HERO SLIDER (New Releases) ==========
    function addHeroRow() {
        Lampa.ContentRows.add({
            index: 0,
            name: 'custom_hero_row',
            title: 'Новинки прокату', // "New Releases"
            screen: ['main'],
            call: function (params) {
                return function (callback) {
                    var network = new Lampa.Reguest();
                    // Fetch Now Playing movies (Fresh releases)
                    var url = Lampa.TMDB.api('movie/now_playing?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk') + '&region=UA');

                    network.silent(url, function (json) {
                        var items = json.results || [];
                        if (!items.length) {
                            // Fallback if no fresh movies
                            url = Lampa.TMDB.api('trending/all/week?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk'));
                            network.silent(url, function (retryJson) {
                                items = retryJson.results || [];
                                build(items);
                            });
                            return;
                        }
                        build(items);

                        function build(movies) {
                            var moviesWithBackdrop = movies.filter(function (m) { return m.backdrop_path; });
                            var results = moviesWithBackdrop.slice(0, 15).map(function (movie) { return makeHeroResultItem(movie, 22.5); });

                            callback({
                                results: results,
                                title: '🔥 Новинки прокату', // Title visible above the row
                                params: {
                                    items: {
                                        mapping: 'line',
                                        view: 15
                                    }
                                }
                            });
                        }

                    }, function () {
                        callback({ results: [] });
                    });
                };
            }
        });
    }

    // ========== ROW 2: STUDIOS (Moved Up) ==========
    function addStudioRow() {
        var studios = [
            { id: 'netflix', name: 'Netflix', img: LIKHTAR_BASE_URL + 'logos/netflix.svg', providerId: '8' },
            { id: 'disney', name: 'Disney+', img: LIKHTAR_BASE_URL + 'logos/disney.svg', providerId: '337' },
            { id: 'hbo', name: 'HBO', img: LIKHTAR_BASE_URL + 'logos/hbo.svg', providerId: '384' },
            { id: 'apple', name: 'Apple TV+', img: LIKHTAR_BASE_URL + 'logos/apple.svg', providerId: '350' },
            { id: 'amazon', name: 'Prime Video', img: LIKHTAR_BASE_URL + 'logos/amazon.png', providerId: '119' },
            { id: 'hulu', name: 'Hulu', img: LIKHTAR_BASE_URL + 'logos/Hulu.svg', providerId: '15' },
            { id: 'paramount', name: 'Paramount+', img: LIKHTAR_BASE_URL + 'logos/paramount.svg', providerId: '531' },
            { id: 'sky_showtime', name: 'Sky Showtime', img: LIKHTAR_BASE_URL + 'logos/SkyShowtime.svg', providerId: '1773' },
            { id: 'syfy', name: 'Syfy', img: LIKHTAR_BASE_URL + 'logos/Syfy.svg', networkId: '77' },
            { id: 'educational_and_reality', name: 'Пізнавальне', img: LIKHTAR_BASE_URL + 'logos/Discovery.svg' },
            { id: 'ukrainian_feed', name: 'Українська стрічка', isUkrainianFeed: true }
        ];

        // Перевірка нового контенту за останні 7 днів
        function checkNewContent(studio, cardElement) {
            if (!studio.providerId && !studio.networkId) return;
            var d = new Date();
            var today = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
            var weekAgo = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000);
            var weekAgoStr = [weekAgo.getFullYear(), ('0' + (weekAgo.getMonth() + 1)).slice(-2), ('0' + weekAgo.getDate()).slice(-2)].join('-');

            var apiKey = 'api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk');
            // FIX: Some watch providers like Disney(337) and Sky(1773) fail with UA region on TMDB
            var region = (studio.providerId == '337') ? 'US' : ((studio.providerId == '1773') ? 'PL' : 'UA');
            var filter = studio.providerId
                ? '&with_watch_providers=' + studio.providerId + '&watch_region=' + region
                : '&with_networks=' + studio.networkId;

            var url = Lampa.TMDB.api('discover/movie?' + apiKey + '&sort_by=primary_release_date.desc&primary_release_date.gte=' + weekAgoStr + '&primary_release_date.lte=' + today + '&vote_count.gte=1' + filter);

            var network = new Lampa.Reguest();
            network.timeout(5000);
            network.silent(url, function (json) {
                if (json.results && json.results.length > 0) {
                    cardElement.find('.card__view').append('<div class="studio-new-badge">NEW</div>');
                } else {
                    // Спробуємо TV
                    var urlTV = Lampa.TMDB.api('discover/tv?' + apiKey + '&sort_by=first_air_date.desc&first_air_date.gte=' + weekAgoStr + '&first_air_date.lte=' + today + '&vote_count.gte=1' + filter);
                    network.silent(urlTV, function (json2) {
                        if (json2.results && json2.results.length > 0) {
                            cardElement.find('.card__view').append('<div class="studio-new-badge">NEW</div>');
                        }
                    });
                }
            });
        }

        Lampa.ContentRows.add({
            index: 1, // After Hero (0)
            name: 'custom_studio_row',
            title: 'Стрімінги',
            screen: ['main'],
            call: function (params) {
                return function (callback) {
                    var items = studios.map(function (s) {
                        var isUkrainianFeed = s.isUkrainianFeed === true;
                        var isPolishFeed = s.isPolishFeed === true;
                        return {
                            title: s.name,
                            params: {
                                createInstance: function () {
                                    var card = Lampa.Maker.make('Card', this, function (module) {
                                        return module.only('Card', 'Callback');
                                    });
                                    return card;
                                },
                                emit: {
                                    onCreate: function () {
                                        var item = $(this.html);
                                        item.addClass('card--studio');
                                        if (isUkrainianFeed) {
                                            item.find('.card__view').empty().html(
                                                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:0.4em;text-align:center;font-weight:700;font-size:1.05em;line-height:1.2;">' +
                                                '<span style="color:#0057b7;">Українська</span>' +
                                                '<span style="color:#ffd700;">стрічка</span>' +
                                                '</div>'
                                            );
                                        } else if (isPolishFeed) {
                                            item.find('.card__view').empty().html(
                                                '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:0.4em;text-align:center;font-weight:700;font-size:1.05em;line-height:1.2;">' +
                                                '<span style="color:#c41e3a;">Польська</span>' +
                                                '<span style="color:#8b0000;">стрічка</span>' +
                                                '</div>'
                                            );
                                        } else {
                                            // Use background-size: contain with padding to handle all aspect ratios uniformly
                                            item.find('.card__view').empty().css({
                                                'background-image': 'url(' + s.img + ')',
                                                'background-position': 'center',
                                                'background-repeat': 'no-repeat',
                                                'background-size': 'contain'
                                            });
                                            checkNewContent(s, item);
                                        }
                                        item.find('.card__age, .card__year, .card__type, .card__textbox, .card__title').remove();
                                    },
                                    onlyEnter: function () {
                                        if (isUkrainianFeed) {
                                            Lampa.Activity.push({
                                                url: '',
                                                title: 'Українська стрічка',
                                                component: 'ukrainian_feed',
                                                page: 1
                                            });
                                            return;
                                        }

                                        Lampa.Activity.push({
                                            url: '',
                                            title: s.name,
                                            component: 'studios_main',
                                            service_id: s.id,
                                            categories: SERVICE_CONFIGS[s.id] ? SERVICE_CONFIGS[s.id].categories : [],
                                            page: 1
                                        });
                                    }
                                }
                            }
                        };
                    });

                    callback({
                        results: items,
                        title: '📺 Стрімінги',
                        params: {
                            items: {
                                view: 15,
                                mapping: 'line'
                            }
                        }
                    });
                };
            }
        });
    }

    // ========== ROW 3: MOOD BUTTONS (Кіно під настрій) ==========
    // Жанри TMDB: Драма 18, Комедія 35, Мультфільм 16, Сімейний 10751, Документальний 99, Бойовик 28, Мелодрама 10749, Трилер 53, Кримінал 80, Пригоди 12, Жахи 27, Фентезі 14
    function addMoodRow() {
        var moods = [
            { genres: [18], text: 'До сліз / Катарсис' },
            { genres: [35], text: 'Чистий позитив' },
            { genres: [16, 10751, 99], text: 'Смачний перегляд' },
            { genres: [28], text: 'Адреналін' },
            { genres: [10749], text: 'Метелики в животі' },
            { genres: [53, 80], text: 'На межі / Напруга' },
            { genres: [12], text: 'Пошук пригод' },
            { genres: [35, 27], text: 'Разом веселіше' },
            { genres: [10751, 14], text: 'Малим і дорослим' },
            { random: true, text: 'На твій смак' }
        ];

        Lampa.ContentRows.add({
            index: 2, // Right after Streamings (1)
            name: 'custom_mood_row',
            title: 'Кіно під настрій',
            screen: ['main'],
            call: function (params) {
                return function (callback) {
                    var network = new Lampa.Reguest();
                    var items = moods.map(function (m) {
                        var isRandom = m.random === true;
                        return {
                            title: m.text,
                            params: {
                                createInstance: function () {
                                    var card = Lampa.Maker.make('Card', this, function (module) {
                                        return module.only('Card', 'Callback');
                                    });
                                    return card;
                                },
                                emit: {
                                    onCreate: function () {
                                        var item = $(this.html);
                                        item.addClass('card--mood');
                                        item.find('.card__view').empty().append(
                                            '<div class="mood-content"><div class="mood-text">' + m.text + '</div></div>'
                                        );
                                        item.find('.card__age, .card__year, .card__type, .card__textbox, .card__title').remove();
                                    },
                                    onlyEnter: function () {
                                        if (isRandom) {
                                            var page = Math.floor(Math.random() * 5) + 1;
                                            var url = Lampa.TMDB.api('discover/movie?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk') + '&sort_by=popularity.desc&vote_count.gte=100&page=' + page);
                                            network.silent(url, function (json) {
                                                var list = json.results || [];
                                                if (list.length === 0) return;
                                                var pick = list[Math.floor(Math.random() * list.length)];
                                                Lampa.Activity.push({
                                                    url: '',
                                                    component: 'full',
                                                    id: pick.id,
                                                    method: 'movie',
                                                    card: pick,
                                                    source: 'tmdb'
                                                });
                                            });
                                            return;
                                        }
                                        var genreStr = (m.genres || []).join(',');
                                        Lampa.Activity.push({
                                            url: 'discover/movie?with_genres=' + genreStr + '&sort_by=popularity.desc',
                                            title: m.text,
                                            component: 'category_full',
                                            page: 1,
                                            source: 'tmdb'
                                        });
                                    }
                                }
                            }
                        };
                    });

                    callback({
                        results: items,
                        title: '🎭 Кіно під настрій',
                        params: {
                            items: {
                                view: 10,
                                mapping: 'line'
                            }
                        }
                    });
                };
            }
        });
    }
    // Жанри TMDB: Драма 18, Комедія 35, Мультфільм 16, Сімейний 10751, Документальний 99, Бойовик 28, Мелодрама 10749, Трилер 53, Кримінал 80, Пригоди 12, Жахи 27, Фентезі 14


    function addStyles() {
        $('#custom_main_page_css').remove();
        $('body').append(`
            <style id="custom_main_page_css">
                /* Hero Banner (‑20%: 22em) */
                .card.hero-banner { 
                    width: 52vw !important; 
                    height: 25em !important;
                    margin: 0 1.5em 0.3em 0 !important; /* Reduced bottom margin */
                    display: inline-block; 
                    scroll-snap-align: start; /* Smart Snap */
                    scroll-margin-left: 1.5em !important; /* Force indentation for every card */
                }
                
                /* Container Snap (Fallback) */
                .scroll__content:has(.hero-banner) {
                    scroll-snap-type: x mandatory;
                    padding-left: 1.5em !important;
                }
                .scroll--mask .scroll__content {
                    padding: 1.2em 1em 1em;
                }
                
                /* Global Row Spacing Reduction */
                .row--card {
                     margin-bottom: -1.2em !important; /* Pull rows closer by ~40% */
                }
                
                .items-line {
                    padding-bottom: 2em !important;
                }

                /* Mood Buttons */
                .card--mood {
                    width: 12em !important;
                    height: 4em !important;
                    border-radius: 1em;
                    margin-bottom: 0 !important;
                    background: linear-gradient(145deg, #2a2a2a, #1f1f1f);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
                    transition: transform 0.2s, box-shadow 0.2s;
                    overflow: visible; 
                    border: 1px solid rgba(255,255,255,0.05);
                }
                .card--mood.focus {
                    transform: scale(1.05);
                    box-shadow: 0 0 0 3px #fff;
                    background: #333;
                    z-index: 10;
                }
                .card--mood .card__view {
                    width: 100%;
                    height: 100%;
                    padding-bottom: 0 !important;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden; 
                    border-radius: 1em;
                }
                .mood-content {
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                }
                .mood-text {
                    color: #fff;
                    font-size: 1.1em;
                    font-weight: 500;
                    text-align: center;
                    width: 100%;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    padding: 0 0.5em;
                }

                /* Studio Buttons */
                .card--studio {
                    width: 12em !important;
                    padding: 5px !important;
                    padding-bottom: 0 !important;
                    height: 6.75em !important; /* 16:9 ratio approx */
                    background-color: #fff;
                    border-radius: 0.6em;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    transition: transform 0.2s, box-shadow 0.2s;
                }
                .card--studio.focus {
                    transform: scale(1.1);
                    box-shadow: 0 0 15px rgba(255,255,255,0.8);
                    z-index: 10;
                }
                .card--studio .card__view {
                    width: 100%;
                    height: 100%;
                    padding: 1em !important; 
                    padding-bottom: 1em !important;
                    box-sizing: border-box !important;
                    background-origin: content-box;
                    display: block; 
                    position: relative;
                }
                /* Removed img/svg specific styles as we now use background-image */
                /* Consolidated Styles for StudioJS Widths */
                .studios_main .card--wide, .studios_view .card--wide { width: 18.3em !important; }
                .studios_view .category-full { padding-top: 1em; }
                /* Кнопка підписки на студію — у стилі міток (UA, 4K, HDR), ~50% розміру */
                .studio-subscription-btn {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    vertical-align: middle;
                    margin-left: 0.4em;
                    padding: 0.18em 0.22em;
                    font-size: 0.4em;
                    font-weight: 800;
                    line-height: 1;
                    letter-spacing: 0.02em;
                    border-radius: 0.25em;
                    border: 1px solid rgba(255,255,255,0.2);
                    cursor: pointer;
                    transition: box-shadow 0.15s, transform 0.15s;
                }
                .company-start__name {
                    display: inline-flex;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .studio-subscription-btn.studio-subscription-btn--sub {
                    background: linear-gradient(135deg, #1565c0, #42a5f5);
                    color: #fff;
                    border-color: rgba(66,165,245,0.4);
                }
                .studio-subscription-btn.studio-subscription-btn--unsub {
                    background: linear-gradient(135deg, #37474f, #78909c);
                    color: #fff;
                    border-color: rgba(120,144,156,0.4);
                }
                .studio-subscription-btn.focus {
                    box-shadow: 0 0 0 2px #fff;
                    transform: scale(1.05);
                }

                /* Кнопка "На сторінку" */
                .likhtar-more-btn {
                    width: 14em !important;
                    height: 21em !important;
                    border-radius: 0.8em;
                    background: rgba(255, 255, 255, 0.05);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: transform 0.2s, background 0.2s;
                    /* Залізне правило - завжди вкінці! */
                    order: 9999 !important;
                }
                .likhtar-more-btn:hover, .likhtar-more-btn.focus {
                    background: rgba(255, 255, 255, 0.15);
                    transform: scale(1.05);
                    box-shadow: 0 0 0 3px #fff;
                }
                .likhtar-more-btn img {
                    width: 4em;
                    opacity: 0.7;
                }

            </style>
        `);
    }


    // ТУТ ЗБЕРІГАЮТЬСЯ КАТЕГОРІЇ, ЩОБ КНОПКА "НА СТОРІНКУ" МОГЛА ЇХ ВЗЯТИ
    // window.LikhtarFeedsCache removed for standalone Likhtar.js

    // ========== ROW 4: Українська стрічка ==========
    function addUkrainianContentRow() {
        // ТУТ ЗБЕРІГАЮТЬСЯ КАТЕГОРІЇ, ЩОБ КНОПКА "НА СТОРІНКУ" МОГЛА ЇХ ВЗЯТИ
        window.LikhtarFeedsCache = window.LikhtarFeedsCache || {};

        Lampa.ContentRows.add({
            index: 99, // Place it at the end
            name: 'custom_ua_feed_row',
            title: '🇺🇦 Українська стрічка',
            screen: ['main'],
            call: function (params) {
                return function (callback) {
                    var network = new Lampa.Reguest();
                    var url = Lampa.TMDB.api('discover/movie?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk') + '&with_origin_country=UA&sort_by=primary_release_date.desc&vote_count.gte=1');

                    network.silent(url, function (json) {
                        if (json && json.results) {
                            var items = json.results.slice(0, 20);
                            items.forEach(function (item) {
                                item.isUkrainianFeed = true; // For potential routing
                            });
                            callback({
                                results: items,
                                title: '🇺🇦 Новинки української стрічки',
                                params: {
                                    items: { mapping: 'line', view: 15 }
                                }
                            });
                        } else {
                            callback({ results: [] });
                        }
                    }, function () {
                        callback({ results: [] });
                    });
                };
            }
        });
    }



    function addServiceRows() {
        var services = ['netflix', 'apple', 'hbo', 'amazon', 'disney', 'paramount', 'sky_showtime', 'hulu', 'syfy', 'educational_and_reality'];

        services.forEach(function (id, index) {
            // Починаємо стрімінги після "Кіно під настрій" (0, 1, 2)
            var rowIndex = index + 3;

            var config = SERVICE_CONFIGS[id];
            var rowTitle = config ? config.title : 'Завантаження...';

            Lampa.ContentRows.add({
                index: rowIndex,
                name: 'service_row_' + id,
                title: rowTitle,

                screen: ['main'],
                call: function (params) {
                    return function (callback) {
                        var conf = SERVICE_CONFIGS[id];
                        if (!conf || !conf.categories || !conf.categories.length) {
                            callback({ results: [] });
                            return;
                        }

                        // Беремо перші дві категорії ("Новинки фільмів" та "Новинки серіалів") для міксу на головній
                        var categoriesToLoad = conf.categories.slice(0, 2);
                        window.LikhtarFeedsCache[id] = conf.categories || [];

                        var promises = categoriesToLoad.map(function (cat) {
                            return new Promise(function (resolve) {
                                var pParams = [];
                                pParams.push('api_key=' + getTmdbKey());
                                pParams.push('language=' + Lampa.Storage.get('language', 'uk'));

                                if (cat.params) {
                                    for (var key in cat.params) {
                                        var val = cat.params[key];
                                        if (val === '{current_date}') {
                                            var d = new Date();
                                            val = [d.getFullYear(), ('0' + (d.getMonth() + 1)).slice(-2), ('0' + d.getDate()).slice(-2)].join('-');
                                        }
                                        pParams.push(key + '=' + val);
                                    }
                                }

                                var url = Lampa.TMDB.api(cat.url + '?' + pParams.join('&'));
                                var network = new Lampa.Reguest();

                                network.silent(url, function (json) {
                                    resolve(json && json.results ? json.results : []);
                                }, function () {
                                    resolve([]);
                                });
                            });
                        });

                        Promise.all(promises).then(function (resultsArray) {
                            var combined = [];
                            resultsArray.forEach(function (res) {
                                combined = combined.concat(res);
                            });

                            // Сортування за датою виходу (найновіші перші)
                            combined.sort(function (a, b) {
                                var dateA = new Date(a.release_date || a.first_air_date || '1970-01-01').getTime();
                                var dateB = new Date(b.release_date || b.first_air_date || '1970-01-01').getTime();
                                return dateB - dateA;
                            });

                            // Видалення дублікатів (за ID), якщо перетинаються
                            var unique = [];
                            var addedIds = {};
                            combined.forEach(function (item) {
                                if (!addedIds[item.id]) {
                                    addedIds[item.id] = true;
                                    unique.push(item);
                                }
                            });

                            var items = unique.slice(0, 20);
                            callback({
                                results: items,
                                title: 'Сьогодні на ' + conf.title,
                                params: { items: { mapping: 'line', view: 15 } }
                            });
                        }).catch(function () {
                            callback({ results: [] });
                        });
                    }
                }
            });
        });
    }


    function modifyServiceTitles() {
        setInterval(function () {
            var services = ['netflix', 'apple', 'hbo', 'amazon', 'disney', 'paramount', 'sky_showtime', 'hulu', 'syfy', 'educational_and_reality'];
            services.forEach(function (id) {
                var config = SERVICE_CONFIGS[id];
                if (!config) return;

                var titleText = 'Сьогодні на ' + config.title;

                var el = $('.items-line__title').filter(function () {
                    return $(this).text().trim() === titleText && $(this).find('svg').length === 0;
                });

                if (el.length) {
                    var iconHtml = '<div style="width: 1.2em; height: 1.2em; display: inline-block; vertical-align: middle; margin-right: 0.4em; margin-bottom: 0.1em; color: inherit;">' + config.icon + '</div>';
                    el.html(iconHtml + '<span style="vertical-align: middle;">Сьогодні на ' + config.title + '</span>');

                    var line = el.closest('.items-line');
                    if (line.length) {
                        var scrollBody = line.find('.scroll__body');
                        if (scrollBody.length && !scrollBody.data('likhtar-more-observed')) {
                            scrollBody.data('likhtar-more-observed', true);

                            // Додаємо order: 9999; щоб кнопка завжди була в самому кінці
                            var moreCard = $('<div class="card selector likhtar-more-btn"><div><span style="font-size: 1.4em; opacity: 0.7;">→</span><br>На сторінку<br><span style="color: #90caf9; font-size: 0.85em; display: block; margin-top: 0.4em;">' + config.title + '</span></div></div>');

                            moreCard.on('hover:enter', (function (serviceId, sTitle) {
                                return function () {
                                    Lampa.Activity.push({
                                        url: '',
                                        title: sTitle,
                                        component: 'studios_main',
                                        categories: window.LikhtarFeedsCache[serviceId] || [],
                                        page: 1
                                    });
                                };
                            })(id, titleText));
                            scrollBody.append(moreCard);
                        }
                    }
                }
            });

            // Те саме для Української стрічки
            $('.items-line').each(function () {
                var line = $(this);
                var titleText = line.find('.items-line__title').text().trim();
                var scrollBody = line.find('.scroll__body');
                if (!scrollBody.length) return;

                var isUA = titleText.indexOf('української стрічки') !== -1;
                if (!isUA) return;

                var dataKey = 'likhtar-more-ua';
                if (scrollBody.data(dataKey)) return;
                scrollBody.data(dataKey, true);

                var label = 'Українська стрічка';
                var comp = 'ukrainian_feed';

                // Додаємо order: 9999;
                var moreCard = $('<div class="card selector likhtar-more-btn"><div><br>На сторінку<br><span style="color: #ffd700; font-size: 0.85em; display: block; margin-top: 0.4em;">' + label + '</span></div></div>');

                moreCard.on('hover:enter', function () {
                    Lampa.Activity.push({ url: '', title: label, component: comp, page: 1 });
                });
                scrollBody.append(moreCard);
            });
        }, 1000);
    }

    function overrideApi() {
        // Backup original if needed, but we want to replace it
        var originalMain = Lampa.Api.sources.tmdb.main;

        Lampa.Api.sources.tmdb.main = function (params, oncomplite, onerror) {
            var parts_data = [];

            // Allow plugins (like ours) to add their rows
            Lampa.ContentRows.call('main', params, parts_data);

            // parts_data now contains ONLY custom rows (because we didn't add the standard ones)

            // Use the standard loader to process these rows
            function loadPart(partLoaded, partEmpty) {
                Lampa.Api.partNext(parts_data, 5, partLoaded, partEmpty);
            }

            loadPart(oncomplite, onerror);

            return loadPart;
        };
    }


    function setupSettings() {
        if (!Lampa.SettingsApi || !Lampa.SettingsApi.addComponent) return;

        // Створюємо єдину вкладку "Ліхтар"
        Lampa.SettingsApi.addComponent({
            component: 'likhtar_plugin',
            name: 'Ліхтар',
            icon: '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 21h6m-3-18v1m-6.36 1.64l.7.71m12.02-.71l-.7.71M4 12H3m18 0h-1M8 12a4 4 0 108 0 4 4 0 00-8 0zm-1 5h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        });

        // Інфо-заголовок
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'Ліхтар — кастомна головна сторінка зі стрімінгами, підписками на студії та кінооглядом. Автор: Syvyj' }
        });

        // === API TMDB ===
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'API TMDB' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_tmdb_apikey', type: 'input', placeholder: 'Ключ TMDB (опційно)', values: '', default: '' },
            field: { name: 'Свій ключ TMDB', description: 'Якщо вказати — плагін використовуватиме його замість ключа Лампи.' }
        });

        // === Секція: Секції головної ===
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'Секції головної сторінки' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_streamings', type: 'trigger', default: true },
            field: { name: 'Стрімінги', description: 'Секція з логотипами стрімінгових сервісів' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_mood', type: 'trigger', default: true },
            field: { name: 'Кіно під настрій', description: 'Підбірки фільмів за жанрами та настроєм' }
        });

        // === Мітки якості та озвучки ===
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'Картки фільмів та серіалів' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_badge_enabled', type: 'trigger', default: true },
            field: { name: 'Мітки якості/озвучки', description: 'Відображати мітки UA, 1080p, HDR тощо на картках.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_show_logo_instead_text', type: 'trigger', default: true },
            field: { name: 'Логотип замість тексту', description: 'Завантажувати і показувати логотип фільму замість звичайної назви у повній картці та херо секції.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_kinooglad_enabled', type: 'trigger', default: true },
            field: { name: 'Кіноогляд', description: 'Увімкнути розділ Кіноогляд у бічному меню, підтягує матеріали з YouTube каналів про кіно. Налаштування каналів нижче.' }
        });


    }

    function initKinoogladModule() {
        if (window.plugin_kinoohlyad_ready) return;
        window.plugin_kinoohlyad_ready = true;
        var KinoApi = {
            proxies: [
                'https://api.allorigins.win/raw?url=',
                'https://api.allorigins.win/get?url=',
                'https://corsproxy.io/?url=',
                'https://api.codetabs.com/v1/proxy?quest=',
                'https://thingproxy.freeboard.io/fetch/'
            ],
            // Порядок: за наявністю нового відео (сортування в main()). ID відповідають @нікам.
            defaultChannels: [
                { name: 'Навколо Кіно', id: 'UCHCpzrgaW9vFS4dGrmPmZNw' },           // @NavkoloKino
                { name: 'СЕРІАЛИ та КІНО', id: 'UCXUMAOsX27mm8M_f18RpzIQ' },        // @SERIALYtaKINO
                { name: 'eKinoUA', id: 'UCvY63ZphoNcDKpt5WK5Nbhg' },                // @eKinoUA
                { name: 'Загін Кіноманів', id: 'UCig7t6LFOjS2fKkhjbVLpjw' },        // @zagin_kinomaniv
                { name: 'Мої думки про кіно', id: 'UCIwXIJlsAcEQJ2lNVva7W0A' },     // @moiidumkyprokino
                { name: 'КІНО НАВИВОРІТ', id: 'UC3_JBeV9tvTb1nSRDh7ANXw' }          // @kino_navuvorit
            ],
            getChannels: function () {
                var stored = Lampa.Storage.get('kino_channels', '[]');
                var channels;
                if (typeof stored === 'string') {
                    try {
                        channels = JSON.parse(stored);
                    } catch (e) {
                        return this.defaultChannels.slice();
                    }
                } else if (Array.isArray(stored)) {
                    channels = stored;
                } else {
                    return this.defaultChannels.slice();
                }
                if (!channels || !channels.length) return this.defaultChannels.slice();
                var seen = {};
                channels = channels.filter(function (c) {
                    var id = String(c.id).trim().toLowerCase();
                    if (seen[id]) return false;
                    seen[id] = true;
                    return true;
                });
                return channels;
            },
            saveChannels: function (channels) {
                Lampa.Storage.set('kino_channels', channels);
            },
            resolveHandleToChannelId: function (handle, callback) {
                var _this = this;
                var cleanHandle = String(handle).trim().replace(/^@/, '');
                var pageUrl = 'https://www.youtube.com/@' + encodeURIComponent(cleanHandle);
                var encodedPage = encodeURIComponent(pageUrl);
                var tried = 0;

                function tryProxy(idx) {
                    if (idx >= _this.proxies.length) {
                        callback(new Error('resolve_failed'));
                        return;
                    }
                    var proxy = _this.proxies[idx];
                    var url = proxy + (proxy.indexOf('corsproxy') > -1 ? pageUrl : encodedPage);
                    $.get(url).done(function (html) {
                        var str = typeof html === 'string' ? html : (html && html.contents) ? html.contents : '';
                        var m = str.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/) ||
                            str.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/) ||
                            str.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
                        if (m && m[1]) {
                            callback(null, { id: m[1], name: cleanHandle });
                        } else {
                            tryProxy(idx + 1);
                        }
                    }).fail(function () { tryProxy(idx + 1); });
                }
                tryProxy(0);
            },
            fetch: function (channel, oncomplite, onerror) {
                var _this = this;
                var id = String(channel.id).trim();
                var isChannelId = /^UC[\w-]{22}$/.test(id);

                function doFetch(feedUrl) {
                    var url = feedUrl;
                    var encodedUrl = encodeURIComponent(url);

                    function tryFetch(index) {
                        if (index >= _this.proxies.length) {
                            console.log('Kinoohlyad: All proxies failed for ' + channel.name);
                            onerror();
                            return;
                        }

                        var currentProxy = _this.proxies[index];
                        var fetchUrl = currentProxy + encodedUrl;

                        $.get(fetchUrl, function (data) {
                            var raw = typeof data === 'string' ? data : (data && typeof data.contents === 'string') ? data.contents : '';
                            var str = (raw || (typeof data === 'string' ? data : '')).trim();
                            if (str && str.indexOf('<?xml') !== 0 && str.indexOf('<feed') !== 0) {
                                if (str.indexOf('<!DOCTYPE') !== -1 || str.indexOf('<html') !== -1) {
                                    return tryFetch(index + 1);
                                }
                            }
                            var items = [];
                            var xml;
                            try {
                                xml = typeof data === 'string' ? $.parseXML(data) : (data && data.documentElement) ? data : $.parseXML(raw || String(data || ''));
                            } catch (e) {
                                return tryFetch(index + 1);
                            }

                            if (!xml || !$(xml).find('entry').length) {
                                return tryFetch(index + 1);
                            }

                            $(xml).find('entry').each(function () {
                                var $el = $(this);
                                var mediaGroup = $el.find('media\\:group, group');
                                var thumb = mediaGroup.find('media\\:thumbnail, thumbnail').attr('url');
                                var videoId = $el.find('yt\\:videoId, videoId').text();
                                var link = $el.find('link').attr('href');
                                var title = $el.find('title').text();

                                // Filter out Shorts
                                if (link && link.indexOf('/shorts/') > -1) return;
                                if (title && title.toLowerCase().indexOf('#shorts') > -1) return;

                                items.push({
                                    title: title,
                                    img: thumb,
                                    video_id: videoId,
                                    release_date: ($el.find('published').text() || '').split('T')[0],
                                    vote_average: 0
                                });
                            });

                            if (items.length) {
                                // console.log('Kinoohlyad: Success via ' + currentProxy);
                                oncomplite(items);
                            } else {
                                tryFetch(index + 1);
                            }
                        }).fail(function () {
                            tryFetch(index + 1);
                        });
                    }

                    tryFetch(0);
                }

                if (isChannelId) {
                    doFetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + id);
                } else {
                    _this.resolveHandleToChannelId(id, function (err, resolved) {
                        if (!err && resolved && resolved.id) {
                            var ch = _this.getChannels();
                            for (var i = 0; i < ch.length; i++) {
                                if (String(ch[i].id).trim().toLowerCase() === id.toLowerCase()) {
                                    ch[i].id = resolved.id;
                                    _this.saveChannels(ch);
                                    break;
                                }
                            }
                            doFetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + resolved.id);
                        } else {
                            doFetch('https://www.youtube.com/feeds/videos.xml?user=' + id.replace(/^@/, ''));
                        }
                    });
                }
            },
            main: function (oncomplite, onerror) {
                var _this = this;
                var channels = this.getChannels().filter(function (c) { return c.active !== false; });

                if (!channels.length) {
                    onerror();
                    return;
                }

                var maxVideosPerChannel = 7;
                var promises = channels.map(function (channel) {
                    return new Promise(function (resolve) {
                        _this.fetch(channel, function (items) {
                            resolve({ title: channel.name, channelId: channel.id, results: items.slice(0, maxVideosPerChannel) });
                        }, function () {
                            resolve({ title: channel.name, channelId: channel.id, results: [] });
                        });
                    });
                });

                Promise.all(promises).then(function (results) {
                    var withVideos = results.filter(function (res) { return res.results.length > 0; });
                    var withoutVideos = results.filter(function (res) { return res.results.length === 0; });

                    withVideos.sort(function (a, b) {
                        var dateA = a.results[0] ? new Date(a.results[0].release_date) : 0;
                        var dateB = b.results[0] ? new Date(b.results[0].release_date) : 0;
                        return dateB - dateA;
                    });

                    var sorted = withVideos.concat(withoutVideos);
                    if (sorted.length) oncomplite(sorted);
                    else onerror();
                });
            },
            clear: function () { }
        };

        function KinoCard(data) {
            this.build = function () {
                this.card = Lampa.Template.get('kino_card', {});
                this.img = this.card.find('img')[0];

                this.card.find('.card__title').text(data.title);
                var date = data.release_date ? data.release_date.split('-').reverse().join('.') : '';
                this.card.find('.card__date').text(date);
            };

            this.image = function () {
                var _this = this;
                this.img.onload = function () {
                    _this.card.addClass('card--loaded');
                };
                this.img.onerror = function () {
                    _this.img.src = './img/img_broken.svg';
                };
                if (data.img) this.img.src = data.img;
            };

            this.play = function (id) {
                if (Lampa.Manifest.app_digital >= 183) {
                    var item = {
                        title: Lampa.Utils.shortText(data.title, 50),
                        id: id,
                        youtube: true,
                        url: 'https://www.youtube.com/watch?v=' + id,
                        icon: '<img class="size-youtube" src="https://img.youtube.com/vi/' + id + '/default.jpg" />',
                        template: 'selectbox_icon'
                    };
                    Lampa.Player.play(item);
                    Lampa.Player.playlist([item]);
                } else {
                    Lampa.YouTube.play(id);
                }
            };

            this.create = function () {
                var _this = this;
                this.build();
                if (!this.card) return;

                this.card.on('hover:focus', function (e) {
                    if (_this.onFocus) _this.onFocus(e.target, data);
                }).on('hover:enter', function () {
                    _this.play(data.video_id);
                });

                this.image();
            };

            this.render = function () {
                return this.card;
            };

            this.destroy = function () {
                this.img.onerror = null;
                this.img.onload = null;
                this.img.src = '';
                this.card.remove();
                this.card = this.img = null;
            }
        }

        function KinoLine(data) {
            var content = Lampa.Template.get('items_line', { title: data.title });
            var body = content.find('.items-line__body');
            var scroll = new Lampa.Scroll({ horizontal: true, step: 600 });
            var items = [];
            var active = 0;
            var last;

            this.create = function () {
                scroll.render().find('.scroll__body').addClass('items-cards');
                content.find('.items-line__title').text(data.title);
                body.append(scroll.render());
                this.bind();
            };

            this.bind = function () {
                data.results.forEach(this.append.bind(this));
                if (data.channelId) this.appendChannelLink(data.channelId);
                Lampa.Layer.update();
            };

            this.append = function (element) {
                var _this = this;
                var card = new KinoCard(element);
                card.create();

                card.onFocus = function (target, card_data) {
                    last = target;
                    active = items.indexOf(card);
                    scroll.update(items[active].render(), true);
                    if (_this.onFocus) _this.onFocus(card_data);
                };

                scroll.append(card.render());
                items.push(card);
            };

            this.appendChannelLink = function (channelId) {
                var _this = this;
                var url = /^UC[\w-]{22}$/.test(channelId)
                    ? 'https://www.youtube.com/channel/' + channelId
                    : 'https://www.youtube.com/@' + channelId;
                var cardEl = $('<div class="card selector card--wide layer--render layer--visible kino-card kino-card--channel">' +
                    '<div class="card__view"><img src="./img/img_load.svg" class="card__img" alt=""></div>' +
                    '<div class="card__title">На канал автора</div>' +
                    '<div class="card__date" style="font-size: 0.8em; opacity: 0.7; margin-top: 0.3em;">YouTube</div></div>');
                cardEl.addClass('card--loaded');
                cardEl.on('hover:enter click', function () {
                    if (Lampa.Platform.openWindow) Lampa.Platform.openWindow(url);
                    else window.open(url, '_blank');
                });
                var channelCard = { render: function () { return cardEl; }, destroy: function () { cardEl.remove(); } };
                scroll.append(cardEl);
                items.push(channelCard);
            };

            this.toggle = function () {
                Lampa.Controller.add('items_line', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(items.length ? last : false, scroll.render());
                    },
                    right: function () {
                        Navigator.move('right');
                    },
                    left: function () {
                        Navigator.move('left');
                    },
                    down: this.onDown,
                    up: this.onUp,
                    gone: function () { },
                    back: this.onBack
                });
                Lampa.Controller.toggle('items_line');
            };

            this.render = function () {
                return content;
            };

            this.destroy = function () {
                Lampa.Arrays.destroy(items);
                scroll.destroy();
                content.remove();
                items = [];
            };
        }


        function KinoComponent(object) {
            var scroll = new Lampa.Scroll({ mask: true, over: true, scroll_by_item: true });
            var items = [];
            var html = $('<div></div>');
            var active = 0;
            var info;

            this.create = function () {
                var _this = this;
                this.activity.loader(true);

                var head = $('<div class="kino-head" style="/* padding: 1.5em 2em; */ display: flex; justify-content: space-between; align-items: center;"></div>');
                // head.append('<div class="kino-title" style="font-size: 2em;">Кіноогляд</div>');

                html.append(head);

                KinoApi.main(function (data) {
                    _this.build(data);
                    _this.activity.loader(false);
                }, function () {
                    _this.empty();
                    _this.activity.loader(false);
                });
                return this.render();
            };

            this.empty = function () {
                var empty = new Lampa.Empty();
                html.append(empty.render());
                this.start = empty.start.bind(empty);
                this.activity.toggle();
            };

            this.build = function (data) {
                var _this = this;
                scroll.minus();
                html.append(scroll.render());
                data.forEach(function (element) {
                    _this.append(element);
                });
                this.activity.toggle();
            };

            this.append = function (element) {
                var item = new KinoLine(element);
                item.create();
                item.onDown = this.down.bind(this);
                item.onUp = this.up.bind(this);
                item.onBack = this.back.bind(this);
                item.onFocus = function (data) { };
                scroll.append(item.render());
                items.push(item);
            };

            this.back = function () {
                Lampa.Activity.backward();
            };

            this.down = function () {
                active++;
                active = Math.min(active, items.length - 1);
                items[active].toggle();
                scroll.update(items[active].render());
            };

            this.up = function () {
                active--;
                if (active < 0) {
                    active = 0;
                    Lampa.Controller.toggle('head');
                } else {
                    items[active].toggle();
                }
                scroll.update(items[active].render());
            };

            this.start = function () {
                var _this = this;
                if (Lampa.Activity.active().activity !== this.activity) return;
                Lampa.Controller.add('content', {
                    toggle: function () {
                        if (items.length) {
                            items[active].toggle();
                        }
                    },
                    left: function () {
                        if (Navigator.canmove('left')) Navigator.move('left');
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function () {
                        Navigator.move('right');
                    },
                    up: function () {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head');
                    },
                    down: function () {
                        if (items.length) {
                            items[active].toggle();
                        }
                    },
                    back: this.back
                });
                Lampa.Controller.toggle('content');
            };

            this.pause = function () { };
            this.stop = function () { };
            this.render = function () {
                return html;
            };
            this.destroy = function () {
                Lampa.Arrays.destroy(items);
                scroll.destroy();
                html.remove();
                items = [];
            };
        }

        function startPlugin() {
            window.plugin_kinoohlyad_ready = true;
            Lampa.Component.add('kinoohlyad_view', KinoComponent);

            if (Lampa.SettingsApi && Lampa.SettingsApi.addParam) {
                function parseChannelInput(input) {
                    var s = (input || '').trim();
                    if (!s) return null;
                    var m = s.match(/youtube\.com\/channel\/(UC[\w-]{22})/i) || s.match(/(?:^|\s)(UC[\w-]{22})(?:\s|$)/);
                    if (m) return { id: m[1], name: 'Канал' };
                    m = s.match(/(?:youtube\.com\/)?@([\w.-]+)/i) || s.match(/^@?([\w.-]+)$/);
                    if (m) return { id: m[1], name: m[1] };
                    if (/^UC[\w-]{22}$/.test(s)) return { id: s, name: 'Канал' };
                    return null;
                }

                // Додаємо візуальний розділювач у налаштуваннях Ліхтаря
                Lampa.SettingsApi.addParam({
                    component: 'likhtar_plugin',
                    param: { type: 'title' },
                    field: { name: 'Кіноогляд: Налаштування каналів YouTube' }
                });

                Lampa.SettingsApi.addParam({
                    component: 'likhtar_plugin',
                    param: { name: 'kinooglad_add_channel', type: 'button' },
                    field: { name: 'Додати канал', description: 'Посилання YouTube або @нік' },
                    onChange: function () {
                        Lampa.Input.edit({ title: 'Посилання на канал або @нік', value: '', free: true, nosave: true }, function (value) {
                            var parsed = parseChannelInput(value);
                            if (!parsed) return;
                            var ch = KinoApi.getChannels();
                            var idNorm = String(parsed.id).trim().toLowerCase();
                            if (ch.some(function (c) { return String(c.id).trim().toLowerCase() === idNorm; })) return;
                            var isUc = /^UC[\w-]{22}$/.test(String(parsed.id).trim());
                            if (isUc) {
                                ch.push({ name: parsed.name, id: parsed.id, active: true });
                                KinoApi.saveChannels(ch);
                                if (Lampa.Settings && Lampa.Settings.update) Lampa.Settings.update();
                                return;
                            }
                            KinoApi.resolveHandleToChannelId(parsed.id, function (err, resolved) {
                                if (!err && resolved && resolved.id) {
                                    var exists = ch.some(function (c) { return String(c.id).trim() === resolved.id; });
                                    if (!exists) {
                                        ch.push({ name: resolved.name || parsed.name, id: resolved.id, active: true });
                                    }
                                } else {
                                    ch.push({ name: parsed.name, id: parsed.id, active: true });
                                }
                                KinoApi.saveChannels(ch);
                                if (Lampa.Settings && Lampa.Settings.update) Lampa.Settings.update();
                            });
                        });
                    }
                });

                Lampa.SettingsApi.addParam({
                    component: 'likhtar_plugin',
                    param: { name: 'kinooglad_reset', type: 'button' },
                    field: { name: 'Скинути налаштування каналів', description: 'Повернути стандартний список' },
                    onChange: function () {
                        KinoApi.saveChannels(KinoApi.defaultChannels);
                        if (Lampa.Settings && Lampa.Settings.update) Lampa.Settings.update();
                    }
                });

                for (var ci = 0; ci < 15; ci++) {
                    (function (idx) {
                        Lampa.SettingsApi.addParam({
                            component: 'likhtar_plugin',
                            param: { name: 'kinooglad_ch_' + idx, type: 'button' },
                            field: { name: '—' },
                            onRender: function (item) {
                                var ch = KinoApi.getChannels()[idx];
                                if (!ch) { item.hide(); return; }
                                item.show();
                                item.find('.settings-param__name').text(ch.name);
                                if (!item.find('.settings-param__value').length) item.append('<div class="settings-param__value"></div>');
                                item.find('.settings-param__value').text(ch.active !== false ? 'Увімкнено' : 'Вимкнено');
                            },
                            onChange: function () {
                                var ch = KinoApi.getChannels();
                                if (ch[idx]) {
                                    ch[idx].active = (ch[idx].active === false);
                                    KinoApi.saveChannels(ch);
                                    var scrollWrap = document.querySelector('.activity .scroll') || document.querySelector('.scroll');
                                    var scrollTop = scrollWrap ? scrollWrap.scrollTop : 0;
                                    if (Lampa.Settings && Lampa.Settings.update) Lampa.Settings.update();
                                    setTimeout(function () {
                                        if (scrollWrap) scrollWrap.scrollTop = scrollTop;
                                    }, 80);
                                }
                            }
                        });
                    })(ci);
                }
            }

            Lampa.Template.add('kino_card', `
            <div class="card selector card--wide layer--render layer--visible kino-card">
                <div class="card__view">
                    <img src="./img/img_load.svg" class="card__img">
                    <div class="card__promo"></div>
                </div>
                <div class="card__title"></div>
                <div class="card__date" style="font-size: 0.8em; opacity: 0.7; margin-top: 0.3em;"></div>
            </div>
        `);

            $('body').append(`
            <style>
            .kino-card {
                width: 20em !important;
                margin: 0 1em 1em 0 !important;
                aspect-ratio: 16/9;
                display: inline-block !important;
                vertical-align: top;
            }
            .kino-card .card__title {
                font-size: 1em;
            }
            .kino-card .card__view {
                padding-bottom: 56.25% !important;
            }
            .kino-card .card__img {
                object-fit: cover !important;
                height: 100% !important;
                border-radius: 0.3em;
            }
            .kino-settings:focus, .kino-settings.focus {
                background: #fff !important;
                color: #000 !important;
            }
            .kino-settings-screen {
                padding: 1.5em 2em 3em;
                max-width: 40em;
            }
            .kino-settings__wrap { }
            .kino-settings__title {
                display: block;
                font-size: 1.5em;
                font-weight: 600;
                margin-bottom: 1.2em;
                color: inherit;
            }
            .kino-settings__subtitle {
                display: block;
                font-size: 0.95em;
                opacity: 0.85;
                margin: 1.2em 0 0.6em;
                padding-top: 0.8em;
                border-top: 1px solid rgba(255,255,255,0.15);
            }
            .kino-settings__row {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                gap: 0.25em;
                padding: 0.85em 1em;
                margin-bottom: 0.4em;
                border-radius: 0.5em;
                background: rgba(255,255,255,0.06);
                min-height: 3em;
                box-sizing: border-box;
            }
            .kino-settings__row.selector:hover,
            .kino-settings__row.selector.focus {
                background: rgba(255,255,255,0.12);
            }
            .kino-settings__row--channel {
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
                gap: 1em;
            }
            .kino-settings__row--off {
                opacity: 0.6;
            }
            .kino-settings__label {
                font-size: 1em;
                font-weight: 500;
            }
            .kino-settings__hint {
                font-size: 0.85em;
                opacity: 0.8;
            }
            .kino-settings__channel-name {
                flex: 1;
                min-width: 0;
                font-size: 1em;
            }
            .kino-settings__channel-status {
                flex-shrink: 0;
                font-size: 0.9em;
                opacity: 0.9;
            }
            .kino-card--channel .card__title { font-style: italic; }
            </style>
        `);

            function addMenu() {
                var action = function () {
                    Lampa.Activity.push({
                        url: '',
                        title: 'Кіноогляд',
                        component: 'kinoohlyad_view',
                        page: 1
                    });
                };

                var btn = $('<li class="menu__item selector" data-action="kinoohlyad"><div class="menu__ico"><svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/></svg></div><div class="menu__text">Кіноогляд</div></li>');

                btn.on('hover:enter click', action);

                $('.menu .menu__list').eq(0).append(btn);
            }

            function addSettings() {
                // Пункт «Кіноогляд» і панель з кнопкою реєструються в setupKinoogladSettings() через SettingsApi (як Ліхтар).
                // Тут лише перевірка увімкнення плагіна для меню та панелі.
            }

            if (Lampa.Storage.get('likhtar_kinooglad_enabled', true)) {
                if (window.appready) {
                    addMenu();
                    addSettings();
                } else {
                    Lampa.Listener.follow('app', function (e) {
                        if (e.type == 'ready') {
                            addMenu();
                            addSettings();
                        }
                    });
                }
            }
        }

        startPlugin();
    }
    // =================================================================
    // INIT FUNCTION
    // =================================================================
    function init() {
        // Settings panel
        setupSettings();

        // Register Components
        Lampa.Component.add('studios_main', StudiosMain);
        Lampa.Component.add('studios_view', StudiosView);
        Lampa.Component.add('ukrainian_feed', UkrainianFeedMain);
        LikhtarStudioSubscription.init();

        addStyles();

        // Override API BEFORE adding rows
        overrideApi();

        addHeroRow();

        if (Lampa.Storage.get('likhtar_section_streamings', true)) {
            addStudioRow();
        }

        addUkrainianContentRow();

        if (Lampa.Storage.get('likhtar_section_mood', true)) {
            addMoodRow();
        }

        addServiceRows();

        // Start dynamic title modifier for icons
        modifyServiceTitles();

        initKinoogladModule();

        // Initial Focus and Styling
        setTimeout(function () {
            var heroCard = document.querySelector('.hero-banner');
            if (heroCard) {
                heroCard.style.width = '85vw';
                heroCard.style.marginRight = '1.5em';
            }

            var studioCard = $('.card--studio');
            if (studioCard.length) {
                if (Lampa.Controller.enabled().name === 'main') {
                    Lampa.Controller.collectionFocus(studioCard[0], $('.scroll__content').eq(1)[0]);
                }
            }
        }, 1000);
    }

    // =================================================================
    // LIKHTAR QUALITY MARKS (PARSING JACRED + UAFLIX)
    // =================================================================
    function initMarksJacRed() {
        var _jacredCache = {};
        var _uafixCache = {};

        function fetchWithProxy(url, callback) {
            var proxies = [
                'https://api.allorigins.win/get?url=',
                'https://cors-anywhere.herokuapp.com/',
                'https://thingproxy.freeboard.io/fetch/'
            ];

            function tryProxy(index) {
                if (index >= proxies.length) return callback(new Error('All proxies failed'), null);

                var p = proxies[index];
                var reqUrl = p === 'https://api.allorigins.win/get?url='
                    ? p + encodeURIComponent(url)
                    : p + url;

                var xhr = new XMLHttpRequest();
                xhr.open('GET', reqUrl, true);
                if (p === 'https://cors-anywhere.herokuapp.com/') {
                    xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                }

                xhr.onload = function () {
                    if (xhr.status === 200) {
                        callback(null, xhr.responseText);
                    } else {
                        tryProxy(index + 1);
                    }
                };
                xhr.onerror = function () { tryProxy(index + 1); };
                xhr.timeout = 10000;
                xhr.ontimeout = function () { tryProxy(index + 1); };
                xhr.send();
            }
            tryProxy(0);
        }

        function getBestJacred(card, callback) {
            var cacheKey = 'jacred_v4_' + card.id;

            if (_jacredCache[cacheKey]) return callback(_jacredCache[cacheKey]);

            try {
                var raw = Lampa.Storage.get(cacheKey, '');
                if (raw && typeof raw === 'object' && raw._ts && (Date.now() - raw._ts < 48 * 60 * 60 * 1000)) {
                    _jacredCache[cacheKey] = raw;
                    return callback(raw);
                }
            } catch (e) { }

            var title = (card.original_title || card.title || card.name || '').toLowerCase();
            var year = (card.release_date || card.first_air_date || '').substr(0, 4);

            if (!title || !year) return callback(null);

            var releaseDate = new Date(card.release_date || card.first_air_date);
            if (releaseDate && releaseDate.getTime() > Date.now()) return callback(null);

            // Fetch from Jacred
            var apiUrl = 'https://jr.maxvol.pro/api/v1.0/torrents?search=' + encodeURIComponent(title) + '&year=' + year;
            fetchWithProxy(apiUrl, function (err, data) {
                if (err || !data) return callback(null);

                try {
                    var parsed;
                    try { parsed = JSON.parse(data); } catch (e) { return callback(null); }
                    if (parsed.contents) {
                        try { parsed = JSON.parse(parsed.contents); } catch (e) { }
                    }

                    var results = Array.isArray(parsed) ? parsed : (parsed.Results || []);

                    if (!results.length) {
                        var emptyData = { empty: true, _ts: Date.now() };
                        _jacredCache[cacheKey] = emptyData;
                        try { Lampa.Storage.set(cacheKey, emptyData); } catch (e) { }
                        return callback(null);
                    }

                    var bestGlobal = { resolution: 'SD', ukr: false, eng: false, hdr: false, dolbyVision: false };
                    var bestUkr = { resolution: 'SD', ukr: false, eng: false, hdr: false, dolbyVision: false };
                    var resOrder = ['SD', 'HD', 'FHD', '2K', '4K'];

                    results.forEach(function (item) {
                        var t = (item.title || '').toLowerCase();

                        var currentRes = 'SD';
                        if (t.indexOf('4k') >= 0 || t.indexOf('2160') >= 0 || t.indexOf('uhd') >= 0) currentRes = '4K';
                        else if (t.indexOf('2k') >= 0 || t.indexOf('1440') >= 0) currentRes = '2K';
                        else if (t.indexOf('1080') >= 0 || t.indexOf('fhd') >= 0 || t.indexOf('full hd') >= 0) currentRes = 'FHD';
                        else if (t.indexOf('720') >= 0 || t.indexOf('hd') >= 0) currentRes = 'HD';

                        var isUkr = false, isEng = false, isHdr = false, isDv = false;

                        if (t.indexOf('ukr') >= 0 || t.indexOf('укр') >= 0 || t.indexOf('ua') >= 0 || t.indexOf('ukrainian') >= 0) isUkr = true;
                        if (card.original_language === 'uk') isUkr = true;
                        if (t.indexOf('eng') >= 0 || t.indexOf('english') >= 0 || t.indexOf('multi') >= 0) isEng = true;

                        if (t.indexOf('dolby vision') >= 0 || t.indexOf('dolbyvision') >= 0) {
                            isHdr = true; isDv = true;
                        } else if (t.indexOf('hdr') >= 0) {
                            isHdr = true;
                        }

                        // Update global max resolution
                        if (resOrder.indexOf(currentRes) > resOrder.indexOf(bestGlobal.resolution)) {
                            bestGlobal.resolution = currentRes;
                            bestGlobal.hdr = isHdr;
                            bestGlobal.dolbyVision = isDv;
                        }
                        if (isEng) bestGlobal.eng = true;

                        // Якщо знайдено український дубляж, записуємо окремо його найкращу якість
                        if (isUkr) {
                            bestGlobal.ukr = true;
                            bestUkr.ukr = true;
                            if (resOrder.indexOf(currentRes) > resOrder.indexOf(bestUkr.resolution)) {
                                bestUkr.resolution = currentRes;
                                bestUkr.hdr = isHdr;
                                bestUkr.dolbyVision = isDv;
                            }
                            if (isEng) bestUkr.eng = true;
                        }
                    });

                    // Правило: якщо є український реліз, використовуємо показники ТІЛЬКИ з нього
                    var finalBest = bestGlobal.ukr ? bestUkr : bestGlobal;
                    if (card.original_language === 'en') finalBest.eng = true;

                    finalBest._ts = Date.now();
                    finalBest.empty = false;
                    _jacredCache[cacheKey] = finalBest;
                    try { Lampa.Storage.set(cacheKey, finalBest); } catch (e) { }
                    callback(finalBest);

                } catch (e) {
                    callback(null);
                }
            });
        }

        function checkUafixBandera(movie, callback) {
            var title = movie.title || movie.name || '';
            var origTitle = movie.original_title || movie.original_name || '';
            var imdbId = movie.imdb_id || '';
            var type = movie.name ? 'series' : 'movie';

            var url = 'https://banderabackend.lampame.v6.rocks/api/v2/search?source=uaflix';
            if (title) url += '&title=' + encodeURIComponent(title);
            if (origTitle) url += '&original_title=' + encodeURIComponent(origTitle);
            if (imdbId) url += '&imdb_id=' + encodeURIComponent(imdbId);
            url += '&type=' + type;

            var network = new Lampa.Reguest();
            network.timeout(5000);
            network.silent(url, function (json) {
                callback(json && json.ok && json.items && json.items.length > 0);
            }, function () {
                callback(null);
            });
        }

        function checkUafixDirect(movie, callback) {
            var query = movie.original_title || movie.original_name || movie.title || movie.name || '';
            if (!query) return callback(false);

            var searchUrl = 'https://uafix.net/index.php?do=search&subaction=search&story=' + encodeURIComponent(query);
            fetchWithProxy(searchUrl, function (err, html) {
                if (err || !html) return callback(false);
                var hasResults = html.indexOf('знайдено') >= 0 && html.indexOf('0 відповідей') < 0;
                callback(hasResults);
            });
        }

        function checkUafix(movie, callback) {
            if (!movie || !movie.id) return callback(false);
            var key = 'uafix_' + movie.id;
            if (_uafixCache[key] !== undefined) return callback(_uafixCache[key]);

            checkUafixBandera(movie, function (result) {
                if (result !== null) {
                    _uafixCache[key] = result;
                    callback(result);
                } else {
                    checkUafixDirect(movie, function (found) {
                        _uafixCache[key] = found;
                        callback(found);
                    });
                }
            });
        }

        function processCards() {
            $('.card:not(.jacred-mark-processed-v3)').each(function () {
                var card = $(this);
                card.addClass('jacred-mark-processed-v3');

                var movie = card[0].heroMovieData || card.data('item') || (card[0] && (card[0].card_data || card[0].item)) || null;
                if (movie && movie.id && !movie.size) {
                    if (card.hasClass('hero-banner')) {
                        addMarksToContainer(card, movie, null);
                    } else {
                        addMarksToContainer(card, movie, '.card__view');
                    }
                }
            });
        }

        function observeCardRows() {
            var observer = new MutationObserver(function () {
                processCards();
            });
            observer.observe(document.body, { childList: true, subtree: true });
            processCards();
        }

        function addMarksToContainer(element, movie, viewSelector) {
            if (!Lampa.Storage.get('likhtar_badge_enabled', true)) return;
            var containerParent = viewSelector ? element.find(viewSelector) : element;
            var marksContainer = containerParent.find('.card-marks');

            if (!marksContainer.length) {
                marksContainer = $('<div class="card-marks"></div>');
                containerParent.append(marksContainer);
            }

            getBestJacred(movie, function (data) {
                var bestData = data || { empty: true };

                // Якщо на Jacred немає укр доріжки, або взагалі немає релізу, шукаємо на Uaflix/UaKino
                if (!bestData.ukr) {
                    checkUafix(movie, function (hasUafix) {
                        if (hasUafix) {
                            if (bestData.empty) bestData = { empty: false, resolution: 'FHD', hdr: false };
                            bestData.ukr = true; // За правилом: якщо є на uafix, ставимо UA і 1080p
                            if (!bestData.resolution || bestData.resolution === 'SD' || bestData.resolution === 'HD') {
                                bestData.resolution = 'FHD';
                            }
                        }
                        if (!bestData.empty) renderBadges(marksContainer, bestData, movie);
                    });
                } else {
                    if (!bestData.empty) renderBadges(marksContainer, bestData, movie);
                }
            });
        }

        function createBadge(cssClass, label) {
            var badge = document.createElement('div');
            badge.classList.add('card__mark');
            badge.classList.add('card__mark--' + cssClass);
            badge.textContent = label;
            return badge;
        }

        function renderBadges(container, data, movie) {
            container.empty();
            if (data.ukr && Lampa.Storage.get('likhtar_badge_ua', true)) container.append(createBadge('ua', 'UA'));
            if (data.eng && Lampa.Storage.get('likhtar_badge_en', true)) container.append(createBadge('en', 'EN'));
            if (data.resolution && data.resolution !== 'SD') {
                if (data.resolution === '4K' && Lampa.Storage.get('likhtar_badge_4k', true)) container.append(createBadge('4k', '4K'));
                else if (data.resolution === 'FHD' && Lampa.Storage.get('likhtar_badge_fhd', true)) container.append(createBadge('fhd', '1080p'));
                else if (data.resolution === 'HD' && Lampa.Storage.get('likhtar_badge_fhd', true)) container.append(createBadge('hd', '720p'));
                else if (Lampa.Storage.get('likhtar_badge_fhd', true)) container.append(createBadge('hd', data.resolution));
            }
            if (data.hdr && Lampa.Storage.get('likhtar_badge_hdr', true)) container.append(createBadge('hdr', 'HDR'));
            if (movie) {
                var rating = parseFloat(movie.imdb_rating || movie.kp_rating || movie.vote_average || 0);
                if (rating > 0 && String(rating) !== '0.0') {
                    var rBadge = document.createElement('div');
                    rBadge.classList.add('card__mark', 'card__mark--rating');
                    rBadge.innerHTML = '<span class="mark-star">★</span>' + rating.toFixed(1);
                    container.append(rBadge);
                }
            }
        }

        function injectFullCardMarks(movie, renderEl) {
            if (!movie || !movie.id || !renderEl) return;
            var $render = $(renderEl);

            if (Lampa.Storage.get('likhtar_show_logo_instead_text', true)) {
                var titleEl = $render.find('.full-start-new__title, .full-start__title').first();
                if (titleEl.length && titleEl.find('img.likhtar-full-logo').length === 0) {
                    var applyLogo = function (img_url, invert) {
                        var newHtml = '<img class="likhtar-full-logo" src="' + img_url + '" style="max-height: 4.5em; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 0.2em;' + (invert ? ' filter: brightness(0) invert(1);' : '') + '">';
                        titleEl.html(newHtml);
                        titleEl.css({ fontSize: '1em', marginTop: '1.5em' });
                    };

                    if (window.LikhtarHeroLogos && window.LikhtarHeroLogos[movie.id] && window.LikhtarHeroLogos[movie.id].path) {
                        applyLogo(window.LikhtarHeroLogos[movie.id].path, window.LikhtarHeroLogos[movie.id].invert);
                    } else if (!window.LikhtarHeroLogos || !window.LikhtarHeroLogos[movie.id] || !window.LikhtarHeroLogos[movie.id].fail) {
                        var requestLang = Lampa.Storage.get('logo_lang') || Lampa.Storage.get('language', 'uk');
                        var type = movie.name ? 'tv' : 'movie';
                        var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + getTmdbKey() + '&include_image_language=' + requestLang + ',en,null');
                        var network = new Lampa.Reguest();
                        network.silent(url, function (data) {
                            var final_logo = null;
                            if (data.logos && data.logos.length > 0) {
                                var found = data.logos.find(function (l) { return l.iso_639_1 == requestLang; }) ||
                                    data.logos.find(function (l) { return l.iso_639_1 == 'en'; }) || data.logos[0];
                                if (found) final_logo = found.file_path;
                            }
                            if (final_logo) {
                                var img_url = Lampa.TMDB.image('t/p/w500' + final_logo.replace('.svg', '.png'));
                                var img = new Image();
                                img.crossOrigin = 'Anonymous';
                                img.onload = function () {
                                    var invert = false;
                                    try {
                                        var canvas = document.createElement('canvas');
                                        var ctx = canvas.getContext('2d');
                                        canvas.width = img.naturalWidth || img.width;
                                        canvas.height = img.naturalHeight || img.height;
                                        if (canvas.width > 0 && canvas.height > 0) {
                                            ctx.drawImage(img, 0, 0);
                                            var imgData = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                                            var darkPixels = 0, totalPixels = 0;
                                            for (var i = 0; i < imgData.length; i += 4) {
                                                if (imgData[i + 3] < 10) continue;
                                                totalPixels++;
                                                if ((imgData[i] * 299 + imgData[i + 1] * 587 + imgData[i + 2] * 114) / 1000 < 120) darkPixels++;
                                            }
                                            if (totalPixels > 0 && (darkPixels / totalPixels) >= 0.85) invert = true;
                                        }
                                    } catch (e) { }
                                    window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};
                                    window.LikhtarHeroLogos[movie.id] = { path: img_url, invert: invert };
                                    var currentTitleEl = $('.full-start-new__title, .full-start__title').first();
                                    if (currentTitleEl.length && currentTitleEl.find('img.likhtar-full-logo').length === 0) {
                                        var newHtml = '<img class="likhtar-full-logo" src="' + img_url + '" style="max-height: 4.5em; width: auto; max-width: 100%; object-fit: contain; margin-bottom: 0.2em;' + (invert ? ' filter: brightness(0) invert(1);' : '') + '">';
                                        currentTitleEl.html(newHtml);
                                        currentTitleEl.css({ fontSize: '1em', marginTop: '1.5em' });
                                    }
                                };
                                img.onerror = function () {
                                    window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};
                                    window.LikhtarHeroLogos[movie.id] = { fail: true };
                                };
                                img.src = img_url;
                            } else {
                                window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};
                                window.LikhtarHeroLogos[movie.id] = { fail: true };
                            }
                        }, function () {
                            window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};
                            window.LikhtarHeroLogos[movie.id] = { fail: true };
                        });
                    }
                }
            }

            var rateLine = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();
            if (!rateLine.length) return;
            if (rateLine.find('.jacred-info-marks-v3').length) return;
            var marksContainer = $('<div class="jacred-info-marks-v3"></div>');
            rateLine.prepend(marksContainer);

            getBestJacred(movie, function (data) {
                var bestData = data || { empty: true };
                if (!bestData.ukr) {
                    checkUafix(movie, function (hasUafix) {
                        if (hasUafix) {
                            if (bestData.empty) bestData = { empty: false, resolution: 'FHD', hdr: false };
                            bestData.ukr = true;
                            if (!bestData.resolution || bestData.resolution === 'SD' || bestData.resolution === 'HD') {
                                bestData.resolution = 'FHD';
                            }
                        }
                        if (!bestData.empty) renderInfoRowBadges(marksContainer, bestData);
                    });
                } else if (!bestData.empty) {
                    renderInfoRowBadges(marksContainer, bestData);
                }
            });
        }

        function initFullCardMarks() {
            if (!Lampa.Listener || !Lampa.Listener.follow) return;
            Lampa.Listener.follow('full', function (e) {
                if (e.type !== 'complite') return;
                var movie = e.data && e.data.movie;
                var renderEl = e.object && e.object.activity && e.object.activity.render && e.object.activity.render();
                injectFullCardMarks(movie, renderEl);
            });
            setTimeout(function () {
                try {
                    var act = Lampa.Activity && Lampa.Activity.active && Lampa.Activity.active();
                    if (!act || act.component !== 'full') return;
                    var movie = act.card || act.movie;
                    var renderEl = act.activity && act.activity.render && act.activity.render();
                    injectFullCardMarks(movie, renderEl);
                } catch (err) { }
            }, 300);
        }

        function renderInfoRowBadges(container, data) {
            container.empty();
            container.addClass('jacred-info-marks-v3');
            if (data.ukr) {
                var uaTag = $('<div class="likhtar-full-badge likhtar-full-badge--ua"></div>');
                uaTag.text('UA+');
                container.append(uaTag);
            }
            if (data.resolution && data.resolution !== 'SD') {
                var resText = data.resolution;
                if (resText === 'FHD') resText = '1080p';
                else if (resText === 'HD') resText = '720p';
                var qualityTag = $('<div class="likhtar-full-badge likhtar-full-badge--quality"></div>');
                qualityTag.text(resText);
                container.append(qualityTag);
            }
            if (data.hdr) {
                var hdrTag = $('<div class="likhtar-full-badge likhtar-full-badge--hdr"></div>');
                hdrTag.text(data.dolbyVision ? 'Dolby Vision' : 'HDR');
                container.append(hdrTag);
            }
        }

        var style = document.createElement('style');
        style.innerHTML = `
            /* ====== Card marks ====== */
            .likhtar-full-badge {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0.25em 0.5em !important;
                font-size: 0.75em !important;
                font-weight: 800 !important;
                line-height: 1 !important;
                letter-spacing: 0.05em !important;
                border-radius: 0.3em !important;
                border: 1px solid rgba(255,255,255,0.2) !important;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4) !important;
                text-transform: uppercase !important;
            }
            .likhtar-full-badge--ua {
                background: linear-gradient(135deg, #1565c0, #42a5f5) !important;
                color: #fff !important;
            }
            .likhtar-full-badge--quality {
                background: linear-gradient(135deg, #2e7d32, #66bb6a) !important;
                color: #fff !important;
            }
            .likhtar-full-badge--hdr {
                background: linear-gradient(135deg, #512da8, #ab47bc) !important;
                color: #fff !important;
            }
            
            /* Native Lampa Full Movie Tags Redesign */
            #app .full-start-new .full-start-new__rate-line > div:not(.jacred-info-marks-v3),
            #app .full-start-new .full-start-new__rate-line > span:not(.jacred-info-marks-v3),
            #app .full-start__rate-line > div:not(.jacred-info-marks-v3),
            #app .full-start__rate-line > span:not(.jacred-info-marks-v3),
            .likhtar-full-badge {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 0.3em 0.6em !important;
                border-radius: 0.35em !important;
                font-weight: 800 !important;
                font-size: 0.85em !important;
                color: rgba(255,255,255,0.9) !important;
                background: linear-gradient(135deg, #37474f, #546e7a) !important;
                border: 1px solid rgba(84,110,122,0.5) !important;
                box-shadow: 0 4px 10px rgba(0,0,0,0.3) !important;
                line-height: 1.2 !important;
                letter-spacing: 0.03em !important;
                margin: 0 !important;
                height: auto !important;
                min-height: 0 !important;
            }

            #app .full-start-new .full-start-new__rate-line > .full-start__rate,
            #app .full-start__rate-line > .full-start__rate {
                background: linear-gradient(135deg, #f57f17, #fbc02d) !important;
                color: #000 !important;
                border-color: rgba(251,192,45,0.4) !important;
            }
            #app .full-start-new .full-start-new__rate-line > .full-start__pg,
            #app .full-start__rate-line > .full-start__pg {
                background: linear-gradient(135deg, #c62828, #e53935) !important;
                border-color: rgba(229,57,53,0.4) !important;
            }

            .likhtar-full-badge--ua {
                background: linear-gradient(135deg, #1565c0, #42a5f5) !important;
                color: #fff !important;
                border-color: rgba(66,165,245,0.4) !important;
            }
            .likhtar-full-badge--quality {
                background: linear-gradient(135deg, #2e7d32, #66bb6a) !important;
                color: #fff !important;
                border-color: rgba(102,187,106,0.4) !important;
            }
            .likhtar-full-badge--hdr {
                background: linear-gradient(135deg, #512da8, #ab47bc) !important;
                color: #fff !important;
                border-color: rgba(171,71,188,0.4) !important;
            }
            .full-start-new__rate-line {
                display: flex !important;
                flex-wrap: wrap !important;
                align-items: center !important;
                gap: 0.4em !important;
            }
            .jacred-info-marks-v3 {
                display: flex;
                align-items: center;
                gap: 0.4em;
                background: transparent !important;
                border: none !important;
                box-shadow: none !important;
                padding: 0 !important;
                margin: 0 !important;
            }

            /* Genres & runtime line */
            #app .full-start-new__info, #app .full-start__info,
            #app .full-start-new__text, #app .full-start__text {
                background: linear-gradient(135deg, #1f2235, #2c314a) !important;
                border: 1px solid rgba(44,49,74,0.5) !important;
                border-radius: 0.4em !important;
                padding: 0.4em 0.8em !important;
                display: inline-block !important;
                color: #e0e0e0 !important;
                font-size: 0.9em !important;
                letter-spacing: 0.02em !important;
                margin-top: 0.5em !important;
                backdrop-filter: blur(4px) !important;
                -webkit-backdrop-filter: blur(4px) !important;
            }

            .card .card__type { left: -0.2em !important; }
            .card-marks {
                position: absolute;
                top: 2.7em;
                left: -0.2em;
                display: flex;
                flex-direction: column;
                gap: 0.15em;
                z-index: 10;
                pointer-events: none;
            }
            .card:not(.card--tv):not(.card--movie) .card-marks,
            .card--movie .card-marks { top: 1.4em; }
            .card__mark {
                padding: 0.35em 0.45em;
                font-size: 0.8em;
                font-weight: 800;
                line-height: 1;
                letter-spacing: 0.03em;
                border-radius: 0.3em;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                align-self: flex-start;
                opacity: 0;
                animation: mark-fade-in 0.35s ease-out forwards;
                border: 1px solid rgba(255,255,255,0.15);
            }
            .card__mark--ua  { background: linear-gradient(135deg, #1565c0, #42a5f5); color: #fff; border-color: rgba(66,165,245,0.4); }
            .card__mark--4k  { background: linear-gradient(135deg, #e65100, #ff9800); color: #fff; border-color: rgba(255,152,0,0.4); }
            .card__mark--fhd { background: linear-gradient(135deg, #4a148c, #ab47bc); color: #fff; border-color: rgba(171,71,188,0.4); }
            .card__mark--hd  { background: linear-gradient(135deg, #1b5e20, #66bb6a); color: #fff; border-color: rgba(102,187,106,0.4); }
            .card__mark--en  { background: linear-gradient(135deg, #37474f, #78909c); color: #fff; border-color: rgba(120,144,156,0.4); }
            .card__mark--hdr { background: linear-gradient(135deg, #f57f17, #ffeb3b); color: #000; border-color: rgba(255,235,59,0.4); }
            .card__mark--rating { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #ffd700; border-color: rgba(255,215,0,0.3); font-size: 0.75em; white-space: nowrap; }
            .card__mark--rating .mark-star { margin-right: 0.15em; font-size: 0.9em; }

            .card.jacred-mark-processed-v3 .card__vote { display: none !important; }

            .hero-banner .card-marks {
                top: 1.5em !important;
                left: 1.2em !important;
                gap: 0.3em !important;
            }
            
            .jacred-info-marks-v3 {
                display: flex; gap: 0.5em; margin-bottom: 0.8em; margin-right: 0.5em;
            }

            @keyframes mark-fade-in {
                from { opacity: 0; transform: translateX(-5px) scale(0.95); }
                to { opacity: 1; transform: translateX(0) scale(1); }
            }
        `;
        document.body.appendChild(style);

        observeCardRows();
        initFullCardMarks();

        // Global IMDB/KP badge hider — completely independent
        (function initHideImdbKp() {
            function scanAndHide() {
                var allElements = document.body.getElementsByTagName('*');
                for (var i = 0; i < allElements.length; i++) {
                    var node = allElements[i];
                    if (node.children && node.children.length > 0) continue;
                    var t = (node.textContent || '').trim();
                    if (t === 'IMDB' || t === 'KP' || t === 'imdb' || t === 'kp') {
                        node.style.setProperty('display', 'none', 'important');
                        if (node.parentElement) node.parentElement.style.setProperty('display', 'none', 'important');
                    }
                }
            }
            if (Lampa.Listener && Lampa.Listener.follow) {
                Lampa.Listener.follow('full', function (e) {
                    if (e.type === 'complite') {
                        setTimeout(scanAndHide, 200);
                        setTimeout(scanAndHide, 800);
                        setTimeout(scanAndHide, 2000);
                        setTimeout(scanAndHide, 4000);
                    }
                });
            }
            // Also run on current page if already on a full card
            setTimeout(scanAndHide, 500);
            setTimeout(scanAndHide, 1500);
            setTimeout(scanAndHide, 3000);
        })();
    }

    function runInit() {
        try {
            initMarksJacRed();
            init();
            window.LIKHTAR_STUDIOS_LOADED = true;
        } catch (err) {
            window.LIKHTAR_STUDIOS_ERROR = (err && err.message) ? err.message : String(err);
            if (typeof console !== 'undefined' && console.error) {
                console.error('[Likhtar Studios]', err);
            }
        }
    }

    if (window.appready) runInit();
    else if (typeof Lampa !== 'undefined' && Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') runInit();
        });
    } else {
        window.LIKHTAR_STUDIOS_ERROR = 'Lampa.Listener not found';
    }

})();
