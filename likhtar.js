/**
 * Ліхтар Studios2 — плагін головної сторінки (Likhtar Team).
 * Кастомна головна, стрімінги, студії, підписки на студії, Кіноогляд.
 */
(function () {
    'use strict';

    window.LIKHTAR_STUDIOS_VER = '3.1-dev.34';
    window.LIKHTAR_STUDIOS_LOADED = false;
    window.LIKHTAR_STUDIOS_ERROR = null;

    console.log('Ліхтар ' + window.LIKHTAR_STUDIOS_VER);

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
            icon: '<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 800.3 246.3" xml:space="preserve"><path style="fill:#D1EFFA;" d="M396.5,246.3v-0.4c0.4-0.5,1.1-0.8,1.7-0.7c2.9-0.1,5.7-0.1,8.6,0c0.6,0,1.3,0.2,1.7,0.7v0.4H396.5z"/><path style="fill:#00A8E1;" d="M408.5,245.9c-4-0.1-8-0.1-12,0c-5.5-0.3-11-0.5-16.5-0.9c-14.6-1.1-29.1-3.3-43.3-6.6c-49.1-11.4-92.2-34.3-129.8-67.6c-3.5-3.1-6.8-6.3-10.2-9.5c-0.8-0.7-1.5-1.7-1.9-2.7c-0.6-1.4-0.3-2.9,0.7-4c1-1.1,2.6-1.5,4-0.9c0.9,0.4,1.8,0.8,2.6,1.3c35.9,22.2,75.1,38.4,116.2,48c13.8,3.2,27.7,5.7,41.7,7.5c20.1,2.5,40.4,3.4,60.6,2.7c10.9-0.3,21.7-1.3,32.5-2.7c25.2-3.2,50.1-8.9,74.2-16.9c12.7-4.2,25.1-9,37.2-14.6c1.8-1,4-1.3,6-0.8c3.3,0.8,5.3,4.2,4.5,7.5c-0.1,0.4-0.3,0.9-0.5,1.3c-0.8,1.5-1.9,2.8-3.3,3.8c-11.5,9-23.9,16.9-37,23.5c-24.7,12.5-51.1,21.4-78.3,26.5C440.2,243.6,424.4,245.3,408.5,245.9z"/><path style="fill:#00A8E1;" d="M76.7,66.6c-0.4-5.2-1.8-10.3-3.9-15c-4.1-8.6-10.4-14.9-20-17.1c-11-2.4-20.9,0-29.9,6.7c-0.6,0.6-1.3,1.1-2.1,1.5c-0.2-0.1-0.4-0.2-0.4-0.3c-0.3-1-0.5-2-0.8-3c-0.8-2.5-1.8-3.4-4.5-3.4c-3,0-6.1,0.1-9.1,0c-2.3-0.1-4.4,0.2-6,2C0,73,0,108.1,0.1,143c1.3,2.1,3.3,2.5,5.6,2.4c3.6-0.1,7.2,0,10.8,0c6.3,0,6.3,0,6.3-6.2v-28.5c0-0.7-0.3-1.5,0.4-2.1c5,3.9,11.1,6.3,17.4,6.9c8.8,0.9,16.8-1.3,23.5-7.3c4.9-4.5,8.5-10.3,10.4-16.7C77.2,83.3,77.4,75,76.7,66.6z M52.8,87.3c-0.7,3.1-2.3,5.9-4.6,8c-2.6,2.2-5.8,3.5-9.2,3.5c-5.1,0.3-10.1-0.8-14.6-3.2c-1.1-0.5-1.8-1.6-1.7-2.8V74.7c0-6,0.1-12,0-18c-0.1-1.4,0.7-2.6,2-3.1c5.5-2.6,11.2-3.8,17.2-2.6c4.2,0.6,7.8,3.3,9.5,7.2c1.5,3.2,2.4,6.7,2.6,10.2C54.6,74.8,54.6,81.2,52.8,87.3z"/><path style="fill:#232F3E;" d="M467.7,93c0.6-2,1.2-3.9,1.8-5.9c4.6-15.5,9.2-30.9,13.8-46.4l0.6-1.8c0.5-1.8,2.2-2.9,4-2.9h15.2c3.8,0,4.6,1.1,3.3,4.7l-6,15.9c-6.7,17.4-13.4,34.9-20.1,52.3c-0.2,0.6-0.5,1.2-0.7,1.8c-0.7,2.1-2.8,3.5-5,3.3c-4.4-0.1-8.8-0.1-13.2,0c-3.1,0.1-4.9-1.3-6-4.1c-2.5-6.6-5.1-13.3-7.6-19.9c-6-15.7-12.1-31.4-18.1-47.2c-0.6-1.2-1-2.6-1.3-3.9c-0.3-2,0.4-3,2.4-3c5.7-0.1,11.4,0,17,0c2.4,0,3.5,1.6,4.1,3.7c1.1,3.8,2.2,7.7,3.4,11.5c4.1,13.9,8.1,27.9,12.2,41.8C467.4,93,467.5,93,467.7,93z"/><path style="fill:#232F3E;" d="M538.5,75v36c-0.2,2-1.1,2.9-3.1,3c-5.4,0.1-10.7,0.1-16.1,0c-2,0-2.9-1-3.1-2.9c-0.1-0.6-0.1-1.3-0.1-1.9V40c0.1-3.1,0.9-4,4-4h14.4c3.1,0,4,0.9,4,4L538.5,75L538.5,75z"/><path style="fill:#232F3E;" d="M527.4,0.1c2-0.2,4,0.2,5.9,1c3.9,1.5,6.6,5.1,6.8,9.3c0.8,9.1-5.3,13.7-13.4,13.5c-1.1,0-2.2-0.2-3.3-0.4c-6.2-1.5-9.4-6.3-8.8-13.2c0.5-5.5,4.8-9.6,10.7-10.1C526,0.1,526.7,0,527.4,0.1z"/></svg>',
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
            icon: '<svg viewBox="0 0 1041 565" xmlns="http://www.w3.org/2000/svg"><path d="M735.8 365.7C721.4 369 683.5 370.9 683.5 370.9L678.7 385.9C678.7 385.9 697.6 384.3 711.4 385.7 711.4 385.7 715.9 385.2 716.4 390.8 716.6 396 716 401.6 716 401.6 716 401.6 715.7 405 710.9 405.8 705.7 406.7 670.1 408 670.1 408L664.3 427.5C664.3 427.5 662.2 432 667 430.7 671.5 429.5 708.8 422.5 713.7 423.5 718.9 424.8 724.7 431.7 723 438.1 721 445.9 683.8 469.7 661.1 468 661.1 468 649.2 468.8 639.1 452.7 629.7 437.4 642.7 408.3 642.7 408.3 642.7 408.3 636.8 394.7 641.1 390.2 641.1 390.2 643.7 387.9 651.1 387.3L660.2 368.4C660.2 368.4 649.8 369.1 643.6 361.5 637.8 354.2 637.4 350.9 641.8 348.9 646.5 346.6 689.8 338.7 719.6 339.7 719.6 339.7 730 338.7 738.9 356.7 738.8 356.7 743.2 364 735.8 365.7ZM623.7 438.3C619.9 447.3 609.8 456.9 597.3 450.9 584.9 444.9 565.2 404.6 565.2 404.6 565.2 404.6 557.7 389.6 556.3 389.9 556.3 389.9 554.7 387 553.7 403.4 552.7 419.8 553.9 451.7 547.4 456.7 541.2 461.7 533.7 459.7 529.8 453.8 526.3 448 524.8 434.2 526.7 410 529 385.8 534.6 360 541.8 351.9 549 343.9 554.8 349.7 557 351.8 557 351.8 566.6 360.5 582.5 386.1L585.3 390.8C585.3 390.8 599.7 415 601.2 414.9 601.2 414.9 602.4 416 603.4 415.2 604.9 414.8 604.3 407 604.3 407 604.3 407 601.3 380.7 588.2 336.1 588.2 336.1 586.2 330.5 587.6 325.3 588.9 320 594.2 322.5 594.2 322.5 594.2 322.5 614.6 332.7 624.4 365.9 634.1 399.4 627.5 429.3 623.7 438.3ZM387.5 460.9C381.7 465.2 369.4 463.3 365.9 458.5 362.4 454.2 361.2 437.1 361.9 410.3 362.6 383.2 363.2 349.6 369 344.3 375.2 338.9 379 343.6 381.4 347.3 384 350.9 387.1 354.9 387.8 363.4 388.4 371.9 390.4 416.5 390.4 416.5 390.4 416.5 393 456.7 387.5 460.9ZM842.9 418.5C833.6 434.7 807.5 468.5 772.7 460.6 761.2 488.5 751.6 516.6 746.1 558.8 746.1 558.8 744.9 567 738.1 564.1 731.4 561.7 720.2 550.5 718 535 715.6 514.6 724.7 480.1 743.2 440.6 737.8 431.8 734.1 419.2 737.3 401.3 737.3 401.3 742 368.1 775.3 338.1 775.3 338.1 779.3 334.6 781.6 335.7 784.2 336.8 783 347.6 780.9 352.8 778.8 358 763.9 383.8 763.9 383.8 763.9 383.8 754.6 401.2 757.2 414.9 774.7 388 814.5 333.7 839.2 350.8 847.5 356.7 851.3 369.6 851.3 383.5 851.2 395.8 848.3 408.8 842.9 418.5ZM835.7 375.9C835.7 375.9 834.3 365.2 823.9 377 814.9 386.9 798.7 405.6 785.6 430.9 799.3 429.4 812.5 421.9 816.5 418.1 823 412.3 838.1 396.7 835.7 375.9ZM350.2 389.5C348.3 413.7 339 454.4 273.1 474.5 229.6 487.6 188.5 481.3 166.1 475.6 165.6 484.5 164.6 488.3 163.2 489.8 161.3 491.7 147.1 499.9 139.3 488.3 135.8 482.8 134 472.8 133 463.9 82.6 440.7 59.4 407.3 58.5 405.8 57.4 404.7 45.9 392.7 57.4 378 68.2 364.7 103.5 351.4 135.3 346 136.4 318.8 139.6 298.3 143.4 288.9 148 278 153.8 287.8 158.8 295.2 163 300.7 165.5 324.4 165.7 343.3 186.5 342.3 198.8 343.8 222 348 252.2 353.5 272.4 368.9 270.6 386.4 269.3 403.6 253.5 410.7 247.5 411.2 241.2 411.7 231.4 407.2 231.4 407.2 224.7 404 230.9 401.2 239 397.7 247.8 393.4 245.8 389 245.8 389 242.5 379.4 203.3 372.7 164.3 372.7 164.1 394.2 165.2 429.9 165.7 450.7 193 455.9 213.4 454.9 213.4 454.9 213.4 454.9 313 452.1 316 388.5 319.1 324.8 216.7 263.7 141 244.3 65.4 224.5 22.6 238.3 18.9 240.2 14.9 242.2 18.6 242.8 18.6 242.8 18.6 242.8 22.7 243.4 29.8 245.8 37.3 248.2 31.5 252.1 31.5 252.1 18.6 256.2 4.1 253.6 1.3 247.7-1.5 241.8 3.2 236.5 8.6 228.9 14 220.9 19.9 221.2 19.9 221.2 113.4 188.8 227.3 247.4 227.3 247.4 334 301.5 352.2 364.9 350.2 389.5ZM68 386.2C57.4 391.4 64.7 398.9 64.7 398.9 84.6 420.3 109.1 433.7 132.4 442 135.1 405.1 134.7 392.1 135 373.5 98.6 376 77.6 381.8 68 386.2Z" fill="#01147c"/><path d="M1040.9 378.6L1040.9 391.8C1040.9 394.7 1038.6 397 1035.7 397L972.8 397C972.8 400.3 972.9 403.2 972.9 405.9 972.9 425.4 972.1 441.3 970.2 459.2 969.9 461.9 967.7 463.9 965.1 463.9L951.5 463.9C950.1 463.9 948.8 463.3 947.9 462.3 947 461.3 946.5 459.9 946.7 458.5 948.6 440.7 949.5 425 949.5 405.9 949.5 403.1 949.5 400.2 949.4 397L887.2 397C884.3 397 882 394.7 882 391.8L882 378.6C882 375.7 884.3 373.4 887.2 373.4L948.5 373.4C947.2 351.9 944.6 331.2 940.4 310.2 940.2 308.9 940.5 307.6 941.3 306.6 942.1 305.6 943.3 305 944.6 305L959.3 305C961.6 305 963.5 306.6 964 308.9 968.1 330.6 970.7 351.7 972 373.4L1035.7 373.4C1038.5 373.4 1040.9 375.8 1040.9 378.6Z" fill="#01147c"/></svg>',
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
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-161.599 -100.544 1000 622.214"><path fill="currentColor" d="M337.935-100.544c-135.92,0-246.104,110.13-246.104,245.983c-0.072,52.591,16.8,103.807,48.115,146.058c10.324-4.456,16.061-11.117,20.159-16.218l45.823-58.576c0.965-1.235,2.225-2.206,3.665-2.825l6.898-2.967l75.345-95.524l10.925-8.549l22.45-31.233c0.58-0.808,1.287-1.519,2.094-2.104l9.795-7.117c2.42-1.758,5.688-1.786,8.136-0.068l11.886,8.339c6.306,4.423,11.417,10.338,14.88,17.217l47.61,83.586c0.777,1.595,2.098,2.86,3.724,3.568c9.337,4.646,15.041,5.467,27.261,18.735c5.702,6.186,30.688,34.117,65.705,77.526c5.089,6.964,11.902,12.484,19.769,16.02c31.22-42.219,48.034-93.359,47.96-145.868C584.031,9.585,473.852-100.544,337.935-100.544z M787.559,394.747l20.212-46.649h-23.92l-20.213,46.649h-50.841l-8.481,19.563h50.856l-20.212,46.649h23.92l20.214-46.649h50.84l8.467-19.563H787.559z"/></svg>',
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
            icon: '<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><text y="18" font-size="14" font-family="Arial,sans-serif" font-weight="bold" fill="currentColor">Sky</text></svg>',
            categories: [
                { "title": "Нові фільми Sky Showtime", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "sort_by": "primary_release_date.desc", "primary_release_date.lte": "{current_date}", "vote_count.gte": "5" } },
                { "title": "Серіали Sky Showtime", "url": "discover/tv", "params": { "with_watch_providers": "1773", "watch_region": "PL", "sort_by": "popularity.desc" } },
                { "title": "Бойовики та Трилери", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "with_genres": "28,53", "sort_by": "popularity.desc" } },
                { "title": "Комедії для всіх", "url": "discover/movie", "params": { "with_watch_providers": "1773", "watch_region": "PL", "with_genres": "35", "sort_by": "popularity.desc" } }
            ]
        },
        'hulu': {
            title: 'Hulu',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 33"><path fill="currentColor" d="M29.6,2L18.7,2L18.7,10.1C17.3,9.5 15.7,9.2 13.9,9.2L4.7,9.2L4.7,2L0,2L0,31L4.7,31L4.7,19.8C4.7,18.7 5.6,17.8 6.7,17.8L13.3,17.8C14.4,17.8 15.3,18.7 15.3,19.8L15.3,31L29.6,31L29.6,2ZM68.3,9.2L59.1,9.2C57.3,9.2 55.7,9.5 54.3,10.1L54.3,2L43.4,2L43.4,31L54.3,31L54.3,19.8C54.3,18.7 55.2,17.8 56.3,17.8L62.9,17.8C64,17.8 64.9,18.7 64.9,19.8L64.9,31L79.2,31L79.2,9.2L68.3,9.2ZM41.1,9.2L30.2,9.2L30.2,31L41.1,31L41.1,9.2ZM95.3,9.2L84.4,9.2C82.6,9.2 81,9.5 79.6,10.1L79.6,2L79.6,9.2L79.6,31L89.2,31L89.2,19.8C89.2,18.7 90.1,17.8 91.2,17.8L95.3,17.8C96.4,17.8 97.3,18.7 97.3,19.8L97.3,31L100,31L100,9.2L95.3,9.2Z"/></svg>',
            categories: [
                { "title": "Hulu Originals: У тренді", "url": "discover/tv", "params": { "with_networks": "453", "sort_by": "popularity.desc" } },
                { "title": "Драми та Трилери Hulu", "url": "discover/tv", "params": { "with_networks": "453", "with_genres": "18,9648", "sort_by": "vote_average.desc" } },
                { "title": "Комедії та Анімація для дорослих", "url": "discover/tv", "params": { "with_networks": "453", "with_genres": "35,16", "sort_by": "popularity.desc" } },
                { "title": "Міні-серіали (Limited Series)", "url": "discover/tv", "params": { "with_networks": "453", "with_keywords": "158718", "sort_by": "first_air_date.desc" } }
            ]
        },
        'syfy': {
            title: 'Syfy',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-326.5 140.209 1000 245.582"><g fill="currentColor"><path d="M155.556,140.209H57.469c-2.189,2.19-3.416,3.418-5.604,5.605v116.616H27.187V145.815l-5.604-5.605h-96.964c-2.189,2.19-3.415,3.418-5.604,5.605v117.738l66.425,67.021v49.611c2.189,2.188,3.415,3.412,5.604,5.604H88.01c2.189-2.191,3.415-3.416,5.604-5.604v-50.188l67.546-67.567V145.815C158.972,143.627,157.745,142.4,155.556,140.209"/><path d="M667.896,140.212h-98.088c-2.189,2.189-3.415,3.419-5.604,5.607v116.616h-24.678V145.819c-2.189-2.188-3.414-3.417-5.604-5.607h-96.964c-2.189,2.189-3.416,3.419-5.605,5.607v117.734l66.426,67.021v49.611c2.189,2.189,3.414,3.416,5.604,5.605h96.967c2.189-2.189,3.416-3.416,5.604-5.605v-50.184l67.547-67.567V145.819C671.311,143.631,670.084,142.401,667.896,140.212"/><path d="M-111.27,140.209h-166.187l-49.044,49.058v67.573c2.19,2.19,3.417,3.416,5.604,5.59h104.813v-24.106h104.813c2.19-2.19,3.415-3.418,5.604-5.609v-86.9C-107.854,143.627-109.079,142.4-111.27,140.209"/><path d="M-320.895,286.539c-2.189,2.189-3.417,3.418-5.604,5.607v88.037c2.188,2.188,3.415,3.416,5.604,5.605h166.187l49.042-49.057v-68.693c-2.188-2.191-3.415-3.42-5.604-5.607h-104.813v24.107H-320.895z"/><path d="M401.07,140.212H234.883l-49.043,49.059v190.915c2.189,2.189,3.417,3.416,5.604,5.605h96.967c2.188-2.189,3.415-3.416,5.604-5.605v-30.553H401.07c2.189-2.193,3.414-3.42,5.604-5.609v-75.982c-2.189-2.191-3.414-3.416-5.604-5.606H294.016v-24.109H401.07c2.189-2.189,3.414-3.417,5.604-5.606v-86.9C404.484,143.631,403.26,142.401,401.07,140.212"/></g></svg>',
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

    function isSettingEnabled(key, defaultVal) {
        var val = Lampa.Storage.get(key, defaultVal);
        return val !== false && val !== 'false' && val !== 0 && val !== '0';
    }

    /** Для рядка на головній: HBO/Prime/Paramount через watch_providers (TMDB), щоб отримувати і фільми, і серіали з актуальним контентом. */
    var SERVICE_WATCH_PROVIDERS_FOR_ROW = { hbo: '384', amazon: '119', paramount: '531' };

    /**
     * Мережа плагіна: запити до джерел, які не віддають CORS.
     *
     * Якщо в налаштуваннях указано власний Worker — ходимо через нього:
     * він швидший, кешує відповіді для всіх користувачів одразу і не показує
     * чужим людям, що саме дивляться наші. Без Worker'а лишається старий
     * список публічних проксі: вони живі через раз, тому пробуємо по черзі.
     */
    var LikhtarNet = (function () {
        var PUBLIC_PROXIES = [
            'https://api.allorigins.win/raw?url=',
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?url=',
            'https://api.codetabs.com/v1/proxy?quest='
        ];

        function workerUrl() {
            var url = (Lampa.Storage.get('likhtar_worker_url', '') || '').trim();
            if (!url) return '';
            return url.replace(/\/+$/, '');
        }

        /** Відповідь allorigins у режимі /get загорнута в {contents}, решта віддає тіло як є. */
        function unwrap(data) {
            if (typeof data === 'string') return data;
            if (data && typeof data.contents === 'string') return data.contents;
            if (data && data.documentElement) return data;
            return data ? String(data) : '';
        }

        /**
         * Тягне URL через проксі. onSuccess отримує сире тіло відповіді.
         * Через Worker — одна спроба (він або є, або його нема),
         * через публічні — послідовний перебір, поки хтось не відповість.
         */
        function fetchText(url, onSuccess, onError) {
            var worker = workerUrl();

            if (worker) {
                $.get(worker + '/api/proxy?url=' + encodeURIComponent(url))
                    .done(function (data) { onSuccess(unwrap(data)); })
                    .fail(function () { tryPublic(0); });
                return;
            }

            tryPublic(0);

            function tryPublic(index) {
                if (index >= PUBLIC_PROXIES.length) return onError && onError();

                var proxy = PUBLIC_PROXIES[index];
                $.get(proxy + encodeURIComponent(url))
                    .done(function (data) {
                        var text = unwrap(data);
                        if (text) onSuccess(text);
                        else tryPublic(index + 1);
                    })
                    .fail(function () { tryPublic(index + 1); });
            }
        }

        return {
            fetchText: fetchText,
            workerUrl: workerUrl,
            hasWorker: function () { return !!workerUrl(); }
        };
    })();

    /**
     * Спільний кеш плагіна: один запис у сховищі замість тисячі окремих ключів.
     *
     * Раніше кожен фільм створював власний ключ у Lampa.Storage, і за кілька
     * місяців користування localStorage телевізора забивався під зав'язку —
     * а він там маленький і спільний з налаштуваннями самої Lampa.
     * Тут усе лежить в одному об'єкті з терміном придатності та обмеженням
     * на кількість записів: найстаріші витісняються, як в LRU.
     */
    var LikhtarCache = (function () {
        var STORE_KEY = 'likhtar_cache_v1';
        var MAX_ENTRIES = 600;
        var SAVE_DELAY = 2000;

        var mem = null;
        var saveTimer = null;

        function load() {
            if (mem) return mem;
            try {
                var raw = Lampa.Storage.get(STORE_KEY, '{}');
                mem = typeof raw === 'string' ? JSON.parse(raw) : (raw || {});
            } catch (e) {
                mem = {};
            }
            return mem;
        }

        /** Пишемо пачкою: під час скролу картки сиплються десятками, і запис на кожну гальмував би ТБ. */
        function scheduleSave() {
            if (saveTimer) clearTimeout(saveTimer);
            saveTimer = setTimeout(function () {
                saveTimer = null;
                try { Lampa.Storage.set(STORE_KEY, mem); } catch (e) { }
            }, SAVE_DELAY);
        }

        /** Спершу викидаємо протерміноване, і лише якщо не допомогло — найдавніше вживане. */
        function prune(store) {
            var keys = Object.keys(store);
            if (keys.length <= MAX_ENTRIES) return;

            var now = Date.now();
            keys.forEach(function (k) {
                if (store[k].e && now > store[k].e) delete store[k];
            });

            keys = Object.keys(store);
            if (keys.length <= MAX_ENTRIES) return;

            keys.sort(function (a, b) { return (store[a].t || 0) - (store[b].t || 0); })
                .slice(0, keys.length - MAX_ENTRIES)
                .forEach(function (k) { delete store[k]; });
        }

        return {
            get: function (key) {
                var store = load();
                var rec = store[key];
                if (!rec) return undefined;

                if (rec.e && Date.now() > rec.e) {
                    delete store[key];
                    return undefined;
                }

                rec.t = Date.now();
                return rec.v;
            },

            set: function (key, value, ttlMs) {
                var store = load();
                store[key] = { v: value, e: ttlMs ? Date.now() + ttlMs : 0, t: Date.now() };
                prune(store);
                scheduleSave();
            },

            /** Прибирає кеш попередніх версій — по ключу на фільм. */
            migrate: function () {
                if (Lampa.Storage.get('likhtar_cache_migrated', false)) return;

                try {
                    var stale = [];
                    for (var i = 0; i < localStorage.length; i++) {
                        var key = localStorage.key(i);
                        if (key && key.indexOf('jacred_v4_') === 0) stale.push(key);
                    }
                    stale.forEach(function (key) { localStorage.removeItem(key); });
                    if (stale.length) console.log('Ліхтар: прибрано ' + stale.length + ' застарілих записів кешу');
                } catch (e) { }

                Lampa.Storage.set('likhtar_cache_migrated', true);
            },

            TTL: {
                HOUR: 60 * 60 * 1000,
                DAY: 24 * 60 * 60 * 1000,
                WEEK: 7 * 24 * 60 * 60 * 1000,
                MONTH: 30 * 24 * 60 * 60 * 1000
            }
        };
    })();

    // =================================================================
    // UTILS & COMPONENTS
    // =================================================================

    window.LikhtarHeroLogos = window.LikhtarHeroLogos || {};

    /**
     * Єдине джерело логотипів TMDB для геро-банера і сторінки фільму.
     * Головне завдання — не дати «кривим» лого (квадратним, вертикальним, крихітним)
     * потрапити в інтерфейс: TMDB віддає їх упереміш із нормальними горизонтальними.
     */
    var LikhtarLogo = (function () {
        // Прийнятні пропорції ширина/висота для горизонтального лого-напису.
        var RATIO_MIN = 1.4;
        var RATIO_MAX = 8;
        var RATIO_IDEAL = 3;
        var MIN_WIDTH = 200;

        function cacheKey(movie) {
            return (movie.name || movie.first_air_date ? 'tv' : 'movie') + '_' + movie.id;
        }

        function ratioOf(logo) {
            if (logo.aspect_ratio) return logo.aspect_ratio;
            if (logo.width && logo.height) return logo.width / logo.height;
            return 0;
        }

        /**
         * Бал кандидата: чим менший, тим краще. Пріоритети в порядку спадання —
         * придатність пропорцій, мова, близькість до ідеальних пропорцій, розмір.
         * Придатність стоїть вище за мову свідомо: квадратне українське лого
         * виглядає в інтерфейсі гірше, ніж нормальне англійське.
         */
        function score(logo, langRank) {
            var ratio = ratioOf(logo);
            var penalty = langRank * 1000;

            if (!ratio) penalty += 50;                                    // невідомі пропорції — ризик, але не вирок
            else if (ratio < RATIO_MIN || ratio > RATIO_MAX) penalty += 10000; // квадратні/вертикальні/надто витягнуті
            else penalty += Math.abs(ratio - RATIO_IDEAL) * 10;

            if (logo.width && logo.width < MIN_WIDTH) penalty += 100;     // замалі — розмиються на ТВ
            return penalty;
        }

        /** Вибирає найкраще лого: спочатку за мовою (uk → мова інтерфейсу → en → без мови), потім за пропорціями. */
        function pickBest(logos, requestLang) {
            if (!logos || !logos.length) return null;

            var langOrder = ['uk', requestLang, 'en', null];
            var best = null, bestScore = Infinity;

            logos.forEach(function (logo) {
                if (!logo || !logo.file_path) return;

                var langRank = langOrder.indexOf(logo.iso_639_1);
                if (langRank === -1) langRank = langOrder.length;        // інша мова — останній пріоритет, але не відкидаємо

                var s = score(logo, langRank);
                if (s < bestScore) {
                    bestScore = s;
                    best = logo;
                }
            });

            return best;
        }

        /** SVG конвертуємо в PNG (canvas його не прочитає), і беремо максимальний розмір — CSS все одно обмежить. */
        function buildUrl(filePath) {
            var isSvg = /\.svg$/i.test(filePath);
            return Lampa.TMDB.image('t/p/' + (isSvg ? 'original' : 'w500') + filePath.replace(/\.svg$/i, '.png'));
        }

        /** Темні лого на темному фоні не видно — визначаємо це по пікселях і інвертуємо в білий. */
        function detectInvert(img) {
            try {
                var canvas = document.createElement('canvas');
                var ctx = canvas.getContext('2d');
                canvas.width = img.naturalWidth || img.width;
                canvas.height = img.naturalHeight || img.height;
                if (!canvas.width || !canvas.height) return false;

                ctx.drawImage(img, 0, 0);
                var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
                var dark = 0, total = 0;
                for (var i = 0; i < data.length; i += 4) {
                    if (data[i + 3] < 10) continue;
                    total++;
                    if ((data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000 < 120) dark++;
                }
                return total > 0 && (dark / total) >= 0.85;
            } catch (e) {
                return false;
            }
        }

        /**
         * Віддає { path, invert, ratio } через callback або null, якщо придатного лого немає.
         * Результат кешується (у т.ч. негативний), тож повторні виклики безкоштовні.
         */
        function get(movie, callback) {
            if (!movie || !movie.id) return callback(null);

            var key = cacheKey(movie);
            var cached = window.LikhtarHeroLogos[key];

            if (cached) {
                if (cached.path) return callback(cached);
                if (cached.fail) return callback(null);
                if (cached.fetching) {
                    (cached.waiting = cached.waiting || []).push(callback);
                    return;
                }
            }

            // Логотипи не змінюються місяцями — тримаємо їх між сеансами, щоб не ганяти TMDB щоразу
            var stored = LikhtarCache.get('logo_' + key);
            if (stored) {
                window.LikhtarHeroLogos[key] = stored;
                return callback(stored.fail ? null : stored);
            }

            var pending = { fetching: true, waiting: [] };
            window.LikhtarHeroLogos[key] = pending;

            function resolve(result) {
                var record = result || { fail: true };
                window.LikhtarHeroLogos[key] = record;
                LikhtarCache.set('logo_' + key, record, LikhtarCache.TTL.MONTH);
                callback(result);
                pending.waiting.forEach(function (cb) { cb(result); });
            }

            var type = movie.name || movie.first_air_date ? 'tv' : 'movie';
            var requestLang = Lampa.Storage.get('logo_lang') || Lampa.Storage.get('language', 'uk');
            var url = Lampa.TMDB.api(type + '/' + movie.id + '/images?api_key=' + getTmdbKey() +
                '&include_image_language=uk,' + requestLang + ',en,null');

            new Lampa.Reguest().silent(url, function (data) {
                var best = pickBest(data && data.logos, requestLang);
                if (!best) return resolve(null);

                var img_url = buildUrl(best.file_path);
                var img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = function () {
                    resolve({ path: img_url, invert: detectInvert(img), ratio: ratioOf(best) });
                };
                img.onerror = function () { resolve(null); };
                img.src = img_url;
            }, function () {
                resolve(null);
            });
        }

        return { get: get, pickBest: pickBest };
    })();

    function fetchHeroLogo(movie, jqItem, heightEm) {
        if (!isSettingEnabled('likhtar_show_logo_instead_text', true)) return;

        LikhtarLogo.get(movie, function (logo) {
            if (!logo) return;

            var titleElem = jqItem.find('.hero-title');
            if (!titleElem.length || titleElem.find('img.likhtar-hero-logo').length) return;

            var img = $('<img class="likhtar-hero-logo">');
            img.css('max-height', (heightEm / 35 * 6).toFixed(2) + 'em');
            if (logo.invert) img.addClass('likhtar-logo--invert');
            img.attr('src', logo.path);

            titleElem.empty().append(img);
            titleElem.addClass('hero-title--logo');
        });
    }

    // Додаємо CSS для фокусу героя (оскільки Lampa використовує клас .focus замість псевдокласів)
    if (!$('style#likhtar-hero-css').length) {
        $('head').append('<style id="likhtar-hero-css">' +
            '.hero-banner { transition: transform 0.2s, box-shadow 0.2s; }' +
            '.hero-banner.focus { transform: scale(1.02); outline: 4px solid #fff; outline-offset: -4px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); z-index: 10; }' +
            '.hero-meta span { text-shadow: 1px 1px 2px rgba(0,0,0,0.8); }' +
            /* Лого: обмежуємо рамкою по обох осях, розміри лишаємо авто — тоді будь-які пропорції вписуються без спотворення */
            '.likhtar-hero-logo, .likhtar-full-logo { width: auto; height: auto; object-fit: contain; display: block; }' +
            '.likhtar-hero-logo { max-width: 60%; object-position: left bottom; filter: drop-shadow(3px 3px 6px rgba(0,0,0,0.8)); }' +
            '.likhtar-logo--invert { filter: brightness(0) invert(1) drop-shadow(3px 3px 6px rgba(0,0,0,0.8)); }' +
            '.hero-title--logo { margin-bottom: 0.3em; display: flex; align-items: flex-end; text-shadow: none; }' +
            /* em, а не vw: у Lampa кегль масштабується під екран, тож лого лишається пропорційним інтерфейсу
               (і не ламається на старих ТВ-браузерах, які не знають min()) */
            '.likhtar-full-logo { max-width: 15em; max-height: 4.5em; margin-bottom: 0.2em; }' +
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

        var detailsKey = 'herodet_' + (movie.name ? 'tv' : 'movie') + '_' + movie.id;
        var storedDetails = LikhtarCache.get(detailsKey);
        if (storedDetails) {
            window.LikhtarHeroDetails[movie.id] = storedDetails;
            renderDetails(storedDetails);
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
            LikhtarCache.set(detailsKey, details, LikhtarCache.TTL.WEEK);
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
                        var img = movie.backdrop_path ? Lampa.TMDB.image('t/p/w1280' + movie.backdrop_path) : (movie.poster_path ? Lampa.TMDB.image('t/p/w780' + movie.poster_path) : '');
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
                            item[0]._heroInitDone = true;

                            fetchHeroLogo(movie, item, heightEm);
                            fetchHeroDetails(movie, item, metaEm);
                        } catch (e) { console.log('Hero onCreate error:', e); }
                    },
                    onVisible: function () {
                        try {
                            var item = $(this.html);
                            // Only re-init if Lampa reset the DOM (hero-banner class lost)
                            if (!item.hasClass('hero-banner') || !this.html._heroInitDone) {
                                var img = movie.backdrop_path ? Lampa.TMDB.image('t/p/w1280' + movie.backdrop_path) : (movie.poster_path ? Lampa.TMDB.image('t/p/w780' + movie.poster_path) : '');
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
                                item[0]._heroInitDone = true;

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

            function showBadge() {
                if (!cardElement.find('.studio-new-badge').length) {
                    cardElement.find('.card__view').append('<div class="studio-new-badge">NEW</div>');
                }
            }

            // Новинки за тиждень не з'являються щохвилини — година кешу економить
            // два запити на кожен сервіс при кожному відкритті головної.
            var cacheKey = 'studio_new_' + (studio.providerId || 'n' + studio.networkId);
            var cached = LikhtarCache.get(cacheKey);
            if (cached !== undefined) {
                if (cached) showBadge();
                return;
            }

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

            function remember(hasNew) {
                LikhtarCache.set(cacheKey, hasNew, LikhtarCache.TTL.HOUR);
                if (hasNew) showBadge();
            }

            var network = new Lampa.Reguest();
            network.timeout(5000);
            network.silent(url, function (json) {
                if (json.results && json.results.length > 0) {
                    remember(true);
                } else {
                    // Спробуємо TV
                    var urlTV = Lampa.TMDB.api('discover/tv?' + apiKey + '&sort_by=first_air_date.desc&first_air_date.gte=' + weekAgoStr + '&first_air_date.lte=' + today + '&vote_count.gte=1' + filter);
                    network.silent(urlTV, function (json2) {
                        remember(!!(json2.results && json2.results.length > 0));
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
            index: 2, // Right after Studios and Mood rows, before Netflix
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

        // Logo URLs for section header icons
        var SERVICE_LOGOS = {
            'netflix': LIKHTAR_BASE_URL + 'logos/netflix.svg',
            'apple': LIKHTAR_BASE_URL + 'logos/apple.svg',
            'hbo': LIKHTAR_BASE_URL + 'logos/hbo.svg',
            'amazon': LIKHTAR_BASE_URL + 'logos/amazon.png',
            'disney': LIKHTAR_BASE_URL + 'logos/disney.svg',
            'paramount': LIKHTAR_BASE_URL + 'logos/paramount.svg',
            'sky_showtime': LIKHTAR_BASE_URL + 'logos/SkyShowtime.svg',
            'hulu': LIKHTAR_BASE_URL + 'logos/Hulu.svg',
            'syfy': LIKHTAR_BASE_URL + 'logos/Syfy.svg',
            'educational_and_reality': LIKHTAR_BASE_URL + 'logos/Discovery.svg'
        };

        services.forEach(function (id, index) {
            // Починаємо стрімінги після "Кіно під настрій" (0, 1, 2)
            var rowIndex = index + 3;

            var config = SERVICE_CONFIGS[id];
            var rowTitle = config ? config.title : 'Завантаження...';

            Lampa.ContentRows.add({
                index: rowIndex,
                name: 'service_row_' + id,
                title: rowTitle,
                icon: SERVICE_LOGOS[id] || '',

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
                    // Map service ID to mini logo URL
                    var miniLogos = {
                        'netflix': LIKHTAR_BASE_URL + 'logos/netflix_mini.svg',
                        'apple': LIKHTAR_BASE_URL + 'logos/apple_mini.svg',
                        'hbo': LIKHTAR_BASE_URL + 'logos/hbo_mini.svg',
                        'amazon': LIKHTAR_BASE_URL + 'logos/prime_mini.svg',
                        'disney': LIKHTAR_BASE_URL + 'logos/disney_mini.svg',
                        'paramount': LIKHTAR_BASE_URL + 'logos/paramount_mini.svg',
                        'sky_showtime': LIKHTAR_BASE_URL + 'logos/sky_mini.svg',
                        'hulu': LIKHTAR_BASE_URL + 'logos/hulu_mini.svg',
                        'syfy': LIKHTAR_BASE_URL + 'logos/syfy_mini.svg',
                        'educational_and_reality': LIKHTAR_BASE_URL + 'logos/discovery_mini.svg'
                    };
                    var miniLogoUrl = miniLogos[id];
                    var iconHtml = miniLogoUrl
                        ? '<img src="' + miniLogoUrl + '" style="width: 1.4em; height: 1.4em; object-fit: contain; vertical-align: middle; margin-right: 0.4em; margin-bottom: 0.1em;">'
                        : '';
                    el.html(iconHtml + '<span style="vertical-align: middle;">Сьогодні на ' + config.title + '</span>');

                    // Hide Lampa's default grey circle — our SVG is already in the title
                    el.closest('.items-line__head').find('.items-line__head-img').hide();
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

        // === Сервер і налаштування з телефона ===
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'Сервер Ліхтаря' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            // values: '' обов'язкове для input — без нього Lampa падає, будуючи список
            param: { name: 'likhtar_worker_url', type: 'input', placeholder: 'http://192.168.0.70:8787', values: '', default: '' },
            field: {
                name: 'Адреса сервера',
                description: 'Свій Worker замість публічних проксі: швидше й надійніше для міток якості та Кіноогляду. Наприклад http://192.168.0.70:8787'
            }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_pair_phone', type: 'button' },
            field: {
                name: 'Налаштувати з телефона',
                description: 'Показати код і QR, щоб змінити налаштування у браузері смартфона. Потрібна вказана вище адреса сервера.'
            },
            onChange: function () {
                LikhtarPairing.start();
            }
        });

        // === Розділи бічного меню ===
        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { type: 'title' },
            field: { name: 'Розділи бічного меню' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_assistant_enabled', type: 'trigger', default: true },
            field: { name: 'Ліхтарик', description: 'Помічник, що підбирає кіно за кількома питаннями. Потрібен перезапуск.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_roulette_enabled', type: 'trigger', default: true },
            field: { name: 'Кінорулетка', description: 'Гортати фільми свайпами на телефоні, обраний відкривається на телевізорі. Потрібна адреса сервера. Потрібен перезапуск.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_digital', type: 'trigger', default: true },
            field: { name: 'Релізи в цифрі', description: 'Кінопрокатні фільми, що вже вийшли або скоро вийдуть у цифрі. Потрібен перезапуск.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_anniversary', type: 'trigger', default: true },
            field: { name: 'Річниці кіно', description: 'Круглі річниці виходу фільмів. Потрібен перезапуск.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_chronology', type: 'trigger', default: true },
            field: { name: 'Хронології', description: 'Порядок перегляду всесвітів за подіями, а не за датою виходу. Потрібен перезапуск.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_section_4k', type: 'trigger', default: true },
            field: { name: '4K українською', description: 'Фільми, що існують і в 4K, і з українською доріжкою. Потрібна адреса сервера — перебір робить він. Потрібен перезапуск.' }
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
            param: { name: 'likhtar_new_card', type: 'trigger', default: true },
            field: { name: 'Нова сторінка фільму', description: 'Уся інформація в один екран, а актори, коментарі й решта — за кнопками в бічній панелі. Вимкніть, щоб повернути звичайний вигляд Lampa.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_trailer_preview', type: 'trigger', default: false },
            field: { name: 'Превʼю трейлера', description: 'Беззвучний трейлер у куті сторінки фільму, натискання відкриває його на весь екран зі звуком. Потрібна адреса сервера. Вантажить слабкі пристрої — типово вимкнено.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_show_logo_instead_text', type: 'trigger', default: true },
            field: { name: 'Логотип замість тексту', description: 'Завантажувати і показувати логотип фільму замість звичайної назви у повній картці та херо секції.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_full_info', type: 'trigger', default: true },
            field: { name: 'Дата наступної серії', description: 'Показувати на сторінці серіалу дату нової серії та статус (виходить, завершено, скасовано), а для фільмів — час завершення перегляду.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_full_trailer_ua', type: 'trigger', default: true },
            field: { name: 'Український трейлер', description: 'Додавати кнопку «Трейлер UA», якщо для фільму є україномовний трейлер.' }
        });

        Lampa.SettingsApi.addParam({
            component: 'likhtar_plugin',
            param: { name: 'likhtar_full_franchise', type: 'trigger', default: true },
            field: { name: 'Франшиза', description: 'Кнопка з усіма частинами франшизи на сторінці фільму.' }
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
                var cleanHandle = String(handle).trim().replace(/^@/, '');
                var pageUrl = 'https://www.youtube.com/@' + encodeURIComponent(cleanHandle);

                LikhtarNet.fetchText(pageUrl, function (html) {
                    var str = typeof html === 'string' ? html : '';
                    var m = str.match(/"externalId"\s*:\s*"(UC[\w-]{22})"/) ||
                        str.match(/"channelId"\s*:\s*"(UC[\w-]{22})"/) ||
                        str.match(/youtube\.com\/channel\/(UC[\w-]{22})/);

                    if (m && m[1]) callback(null, { id: m[1], name: cleanHandle });
                    else callback(new Error('resolve_failed'));
                }, function () {
                    callback(new Error('resolve_failed'));
                });
            },
            fetch: function (channel, oncomplite, onerror) {
                var _this = this;
                var id = String(channel.id).trim();
                var isChannelId = /^UC[\w-]{22}$/.test(id);

                function doFetch(feedUrl) {
                    LikhtarNet.fetchText(feedUrl, function (raw) {
                        var str = (typeof raw === 'string' ? raw : '').trim();

                        // Проксі, що впало, зазвичай віддає свою HTML-сторінку помилки замість фіду
                        if (str.indexOf('<!DOCTYPE') !== -1 || str.indexOf('<html') !== -1) return onerror();

                        var xml;
                        try {
                            xml = $.parseXML(str);
                        } catch (e) {
                            return onerror();
                        }

                        if (!xml || !$(xml).find('entry').length) return onerror();

                        var items = [];
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

                        if (items.length) oncomplite(items);
                        else onerror();
                    }, function () {
                        console.log('Kinoohlyad: не вдалося отримати фід ' + channel.name);
                        onerror();
                    });
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

                var head = $('<div class="kino-head" style="display: flex; justify-content: space-between; align-items: center;"></div>');
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

            if (isSettingEnabled('likhtar_kinooglad_enabled', true)) {
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
    // СТОРІНКА ФІЛЬМУ / СЕРІАЛУ (повна картка)
    // =================================================================
    /**
     * Додає на сторінку фільму те, за чим зазвичай лізуть у пошук:
     * коли вийде наступна серія, чи продовжено серіал, о котрій закінчиться
     * фільм, український трейлер і перехід до інших частин франшизи.
     */
    var LikhtarFullCard = (function () {
        var SERIES_STATUS = {
            'Returning Series': { text: 'Виходить', mod: 'live' },
            'Ended': { text: 'Завершено', mod: 'ended' },
            'Canceled': { text: 'Скасовано', mod: 'canceled' },
            'Cancelled': { text: 'Скасовано', mod: 'canceled' },
            'In Production': { text: 'У виробництві', mod: 'live' },
            'Post Production': { text: 'На постпродакшені', mod: 'live' },
            'Planned': { text: 'Заплановано', mod: 'live' },
            'Pilot': { text: 'Пілот', mod: 'live' }
        };

        var _details = {};

        function typeOf(movie) {
            return (movie.name || movie.first_air_date || movie.number_of_seasons) ? 'tv' : 'movie';
        }

        function lang() {
            return Lampa.Storage.get('language', 'uk');
        }

        /** Деталі TMDB із кешем на сесію. Lampa часто вже має все потрібне — тоді запит не робимо. */
        function getDetails(movie, callback) {
            var type = typeOf(movie);
            var hasAll = type === 'tv'
                ? movie.status !== undefined && movie.next_episode_to_air !== undefined
                : movie.runtime !== undefined && movie.belongs_to_collection !== undefined;

            if (hasAll) return callback(movie);

            var key = type + '_' + movie.id;
            if (_details[key]) return callback(_details[key]);

            var url = Lampa.TMDB.api(type + '/' + movie.id + '?api_key=' + getTmdbKey() + '&language=' + lang());
            new Lampa.Reguest().silent(url, function (data) {
                _details[key] = data || movie;
                callback(_details[key]);
            }, function () {
                callback(movie);
            });
        }

        function formatDate(iso) {
            if (!iso) return '';
            var parts = String(iso).split('-');
            if (parts.length !== 3) return iso;
            return parts[2] + '.' + parts[1] + '.' + parts[0];
        }

        /** Скільки днів лишилось: «сьогодні» / «завтра» читається краще за дату. */
        function relativeDay(iso) {
            var target = new Date(iso + 'T00:00:00');
            if (isNaN(target.getTime())) return '';

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            var days = Math.round((target - today) / 86400000);
            if (days < 0) return '';
            if (days === 0) return 'сьогодні';
            if (days === 1) return 'завтра';
            if (days < 7) return 'через ' + days + ' дн.';
            return '';
        }

        /** «Закінчиться о 22:47» — рахуємо від поточного часу з урахуванням тривалості. */
        function endsAt(runtime) {
            if (!runtime || runtime < 5) return '';
            var end = new Date(Date.now() + runtime * 60000);
            return 'Закінчиться о ' + ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2);
        }

        function chip(text, mod) {
            return $('<div class="likhtar-chip' + (mod ? ' likhtar-chip--' + mod : '') + '"></div>').text(text);
        }

        function buildInfoLine(details) {
            var line = $('<div class="likhtar-info-line"></div>');
            var type = typeOf(details);

            if (type === 'tv') {
                var next = details.next_episode_to_air;
                if (next && next.air_date) {
                    var when = relativeDay(next.air_date);
                    var code = 'S' + ('0' + (next.season_number || 0)).slice(-2) + 'E' + ('0' + (next.episode_number || 0)).slice(-2);
                    line.append(chip('Нова серія ' + (when || formatDate(next.air_date)) + ' • ' + code, 'next'));
                }

                var status = SERIES_STATUS[details.status];
                if (status) {
                    var text = status.text;
                    if (details.number_of_seasons) {
                        text += ' • ' + details.number_of_seasons + ' сез.';
                    }
                    line.append(chip(text, status.mod));
                }
            } else {
                var ends = endsAt(details.runtime);
                if (ends) line.append(chip(ends, 'time'));
            }

            return line.children().length ? line : null;
        }

        /**
         * Для кінопрокатних стрічок найважливіше питання — коли їх можна буде
         * подивитись удома. Плашка з'являється лише поки дата в майбутньому.
         */
        function injectDigitalDate(details, $render) {
            if (typeOf(details) !== 'movie') return;
            if (!isSettingEnabled('likhtar_full_info', true)) return;

            LikhtarSections.getDigitalDate(details.id, function (isoDate) {
                if (!isoDate) return;

                var when = relativeDay(isoDate);
                if (!when && new Date(isoDate + 'T00:00:00') < new Date()) return;  // вже вийшов — не новина

                var line = ensureInfoLine($render);
                if (!line || line.find('.likhtar-chip--digital').length) return;

                line.append(chip('В цифрі ' + (when || formatDate(isoDate)), 'digital'));
            });
        }

        /** Рядок плашок один на сторінку; створюємо його на першу потребу. */
        function ensureInfoLine($render) {
            var existing = $render.find('.likhtar-info-line').first();
            if (existing.length) return existing;

            var anchor = $render.find('.full-start-new__details, .full-start__details').first();
            if (!anchor.length) anchor = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();
            if (!anchor.length) return null;

            var line = $('<div class="likhtar-info-line"></div>');
            anchor.after(line);
            return line;
        }

        function injectInfoLine(details, $render) {
            if (!isSettingEnabled('likhtar_full_info', true)) return;
            if ($render.find('.likhtar-info-line').children().length) return;

            var built = buildInfoLine(details);
            if (!built) return;

            var line = ensureInfoLine($render);
            if (!line) return;

            built.children().each(function () { line.append(this); });
        }

        /** Кнопки Lampa — це .selector'и в спільному контейнері; додаємо свою в тому ж стилі. */
        function buttonsContainer($render) {
            return $render.find('.full-start-new__buttons, .full-start__buttons').first();
        }

        function makeButton(iconSvg, label, onEnter) {
            var btn = $('<div class="full-start__button selector likhtar-full-button"></div>');
            btn.append(iconSvg);
            btn.append($('<span></span>').text(label));
            btn.on('hover:enter click', onEnter);
            return btn;
        }

        function playYoutube(videoKey, title) {
            var item = {
                title: Lampa.Utils.shortText(title || 'Трейлер', 50),
                id: videoKey,
                youtube: true,
                url: 'https://www.youtube.com/watch?v=' + videoKey,
                icon: '<img class="size-youtube" src="https://img.youtube.com/vi/' + videoKey + '/default.jpg" />',
                template: 'selectbox_icon'
            };

            if (Lampa.Manifest.app_digital >= 183) {
                Lampa.Player.play(item);
                Lampa.Player.playlist([item]);
            } else {
                Lampa.YouTube.play(videoKey);
            }
        }

        /** Шукає україномовний трейлер; англійський Lampa показує й сама, тож дублювати його не треба. */
        function injectUkrainianTrailer(movie, $render) {
            if (!isSettingEnabled('likhtar_full_trailer_ua', true)) return;
            // У новому вигляді трейлер живе в бічній колонці — або превʼю,
            // або кнопка. Другої кнопки в рядку не треба.
            if (isSettingEnabled('likhtar_new_card', true)) return;

            var holder = buttonsContainer($render);
            if (!holder.length || holder.find('.likhtar-trailer-ua').length) return;

            var url = Lampa.TMDB.api(typeOf(movie) + '/' + movie.id + '/videos?api_key=' + getTmdbKey() + '&language=uk');
            new Lampa.Reguest().silent(url, function (data) {
                var videos = (data && data.results) || [];
                var trailer = videos.filter(function (v) {
                    return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser');
                }).sort(function (a, b) {
                    // Офіційний трейлер важливіший за тизер
                    var rank = function (v) { return (v.type === 'Trailer' ? 0 : 1) + (v.official ? 0 : 0.5); };
                    return rank(a) - rank(b);
                })[0];

                if (!trailer) return;

                // Поки чекали на відповідь, сторінку могли закрити або кнопку вже додали
                var current = buttonsContainer($render);
                if (!current.length || current.find('.likhtar-trailer-ua').length) return;

                var icon = '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M8 5v14l11-7z"/></svg>';
                var btn = makeButton(icon, 'Трейлер UA', function () {
                    playYoutube(trailer.key, trailer.name);
                });
                btn.addClass('likhtar-trailer-ua');
                current.append(btn);
            });
        }

        function injectFranchise(details, $render) {
            if (!isSettingEnabled('likhtar_full_franchise', true)) return;

            var collection = details.belongs_to_collection;
            if (!collection || !collection.id) return;

            var holder = buttonsContainer($render);
            if (!holder.length || holder.find('.likhtar-franchise').length) return;

            var icon = '<svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24"><path d="M4 6H2v14a2 2 0 002 2h14v-2H4V6zm16-4H8a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2z"/></svg>';
            var btn = makeButton(icon, 'Франшиза', function () {
                Lampa.Activity.push({
                    url: '',
                    title: collection.name || 'Франшиза',
                    component: 'likhtar_collection',
                    collection_id: collection.id,
                    page: 1
                });
            });
            btn.addClass('likhtar-franchise');
            holder.append(btn);
        }

        /** Усі частини франшизи одним списком, у хронології виходу. */
        function CollectionComponent(object) {
            var comp = new Lampa.InteractionMain(object);
            var network = new Lampa.Reguest();

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                var url = Lampa.TMDB.api('collection/' + object.collection_id + '?api_key=' + getTmdbKey() + '&language=' + lang());

                network.silent(url, function (data) {
                    var parts = (data && data.parts) || [];

                    parts.forEach(function (item) {
                        if (!item.poster_path && item.backdrop_path) item.poster_path = item.backdrop_path;
                    });

                    parts.sort(function (a, b) {
                        return String(a.release_date || '9999').localeCompare(String(b.release_date || '9999'));
                    });

                    if (!parts.length) return _this.empty();

                    _this.build([{
                        title: (data.name || object.title) + ' — ' + parts.length + ' ч.',
                        results: parts
                    }]);
                    _this.activity.loader(false);
                }, function () {
                    _this.empty();
                });

                return this.render();
            };

            return comp;
        }

        function addStyles() {
            if ($('style#likhtar-fullcard-css').length) return;

            $('head').append('<style id="likhtar-fullcard-css">' +
                '.likhtar-info-line { display: flex; flex-wrap: wrap; gap: 0.6em; margin: 0.8em 0 0.2em; }' +
                '.likhtar-chip { display: inline-flex; align-items: center; padding: 0.35em 0.8em; border-radius: 0.4em;' +
                ' font-size: 1.1em; font-weight: 600; background: rgba(255,255,255,0.14); color: #fff; }' +
                '.likhtar-chip--next { background: linear-gradient(135deg, #0057b7, #0072e8); }' +
                '.likhtar-chip--live { background: rgba(46,160,67,0.85); }' +
                '.likhtar-chip--ended { background: rgba(255,255,255,0.18); }' +
                '.likhtar-chip--canceled { background: rgba(218,54,51,0.85); }' +
                '.likhtar-chip--time { background: rgba(255,255,255,0.14); }' +
                '.likhtar-chip--digital { background: linear-gradient(135deg, #6a1b9a, #8e24aa); }' +
                '.likhtar-full-button span { margin-left: 0.6em; }' +
                /* Кольоровий рейтинг: зелений/жовтий/червоний читається з дивана швидше за цифру */
                '.card__mark--rating.likhtar-rating--high { background: linear-gradient(135deg,#1b5e20,#2ea043); color: #fff; border-color: rgba(46,160,67,0.4); }' +
                '.card__mark--rating.likhtar-rating--mid { background: linear-gradient(135deg,#7a4f01,#d29922); color: #fff; border-color: rgba(210,153,34,0.4); }' +
                '.card__mark--rating.likhtar-rating--low { background: linear-gradient(135deg,#6e1b1b,#da3633); color: #fff; border-color: rgba(218,54,51,0.4); }' +
                '</style>');
        }

        function apply(movie, renderEl) {
            if (!movie || !movie.id || !renderEl) return;
            var $render = $(renderEl);

            getDetails(movie, function (details) {
                try {
                    injectInfoLine(details, $render);
                    injectDigitalDate(details, $render);
                    injectFranchise(details, $render);
                } catch (e) { }
            });

            try {
                injectUkrainianTrailer(movie, $render);
            } catch (e) { }
        }

        return {
            init: function () {
                addStyles();
                Lampa.Component.add('likhtar_collection', CollectionComponent);

                if (!Lampa.Listener || !Lampa.Listener.follow) return;
                Lampa.Listener.follow('full', function (e) {
                    if (e.type !== 'complite') return;
                    var movie = e.data && e.data.movie;
                    var renderEl = e.object && e.object.activity && e.object.activity.render && e.object.activity.render();
                    apply(movie, renderEl);
                });
            },
            ratingClass: function (rating) {
                if (rating >= 7) return 'likhtar-rating--high';
                if (rating >= 5.5) return 'likhtar-rating--mid';
                return 'likhtar-rating--low';
            }
        };
    })();

    // =================================================================
    // РОЗДІЛИ БІЧНОГО МЕНЮ: РЕЛІЗИ В ЦИФРІ, РІЧНИЦІ, ХРОНОЛОГІЇ
    // =================================================================
    var LikhtarSections = (function () {
        // Типи релізів TMDB: 3 — кінопрокат, 4 — цифра. Саме їх порівняння дає
        // відповідь на питання «коли фільм із кінотеатру можна буде подивитись удома».
        var RELEASE_THEATRICAL = 3;
        var RELEASE_DIGITAL = 4;

        // Регіон для дат релізів: у США база TMDB заповнена найповніше,
        // а цифрові релізи здебільшого глобальні й збігаються.
        var RELEASE_REGION = 'US';

        /**
         * Хронології всесвітів — порядок перегляду за подіями, а не за датою виходу.
         * Зберігаємо назвами, а не id: назву можна перевірити очима, а id —
         * ні, і помилка в ньому мовчки підсуне не той фільм.
         * Список можна замінити файлом chronologies.json поруч із плагіном.
         */
        var BUILTIN_CHRONOLOGIES = [
            {
                key: 'mcu',
                title: 'Marvel: у хронології подій',
                items: [
                    ['Captain America: The First Avenger', 2011],
                    ['Captain Marvel', 2019],
                    ['Iron Man', 2008],
                    ['Iron Man 2', 2010],
                    ['The Incredible Hulk', 2008],
                    ['Thor', 2011],
                    ['The Avengers', 2012],
                    ['Iron Man 3', 2013],
                    ['Thor: The Dark World', 2013],
                    ['Captain America: The Winter Soldier', 2014],
                    ['Guardians of the Galaxy', 2014],
                    ['Guardians of the Galaxy Vol. 2', 2017],
                    ['Avengers: Age of Ultron', 2015],
                    ['Ant-Man', 2015],
                    ['Captain America: Civil War', 2016],
                    ['Black Widow', 2021],
                    ['Black Panther', 2018],
                    ['Doctor Strange', 2016],
                    ['Spider-Man: Homecoming', 2017],
                    ['Ant-Man and the Wasp', 2018],
                    ['Thor: Ragnarok', 2017],
                    ['Avengers: Infinity War', 2018],
                    ['Avengers: Endgame', 2019],
                    ['Spider-Man: Far From Home', 2019]
                ]
            },
            {
                key: 'starwars',
                title: 'Зоряні війни: за хронологією',
                items: [
                    ['Star Wars: Episode I - The Phantom Menace', 1999],
                    ['Star Wars: Episode II - Attack of the Clones', 2002],
                    ['Star Wars: Episode III - Revenge of the Sith', 2005],
                    ['Solo: A Star Wars Story', 2018],
                    ['Rogue One: A Star Wars Story', 2016],
                    ['Star Wars', 1977],
                    ['The Empire Strikes Back', 1980],
                    ['Return of the Jedi', 1983],
                    ['Star Wars: The Force Awakens', 2015],
                    ['Star Wars: The Last Jedi', 2017],
                    ['Star Wars: The Rise of Skywalker', 2019]
                ]
            },
            {
                key: 'middleearth',
                title: 'Середзем\'я: від «Гобіта» до «Персня»',
                items: [
                    ['The Hobbit: An Unexpected Journey', 2012],
                    ['The Hobbit: The Desolation of Smaug', 2013],
                    ['The Hobbit: The Battle of the Five Armies', 2014],
                    ['The Lord of the Rings: The Fellowship of the Ring', 2001],
                    ['The Lord of the Rings: The Two Towers', 2002],
                    ['The Lord of the Rings: The Return of the King', 2003]
                ]
            }
        ];

        function lang() {
            return Lampa.Storage.get('language', 'uk');
        }

        function apiKeyParams() {
            return 'api_key=' + getTmdbKey() + '&language=' + lang();
        }

        function dateStr(date) {
            return [date.getFullYear(), ('0' + (date.getMonth() + 1)).slice(-2), ('0' + date.getDate()).slice(-2)].join('-');
        }

        function shiftDays(days) {
            return dateStr(new Date(Date.now() + days * 86400000));
        }

        // ===== Релізи в цифрі =====

        function digitalCategories() {
            var common = '&with_release_type=' + RELEASE_DIGITAL + '&region=' + RELEASE_REGION + '&vote_count.gte=10';

            return [
                {
                    title: 'Щойно вийшли в цифрі',
                    query: 'discover/movie?' + apiKeyParams() + common +
                        '&release_date.gte=' + shiftDays(-30) + '&release_date.lte=' + shiftDays(0) +
                        '&sort_by=primary_release_date.desc'
                },
                {
                    title: 'Скоро в цифрі',
                    query: 'discover/movie?' + apiKeyParams() + common +
                        '&release_date.gte=' + shiftDays(1) + '&release_date.lte=' + shiftDays(60) +
                        '&sort_by=primary_release_date.asc'
                },
                {
                    // Ці вже відпрацювали в кінотеатрах, але цифрової дати ще немає —
                    // саме вони зазвичай і з'являються в цифрі найближчим часом.
                    title: 'Ще в прокаті — чекаємо на цифру',
                    query: 'discover/movie?' + apiKeyParams() +
                        '&with_release_type=' + RELEASE_THEATRICAL + '&region=' + RELEASE_REGION +
                        '&release_date.gte=' + shiftDays(-50) + '&release_date.lte=' + shiftDays(-7) +
                        '&vote_count.gte=20&sort_by=popularity.desc'
                }
            ];
        }

        function DigitalComponent(object) {
            var comp = new Lampa.InteractionMain(object);
            var network = new Lampa.Reguest();

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                var categories = digitalCategories();
                var status = new Lampa.Status(categories.length);

                status.onComplite = function () {
                    var fulldata = [];

                    categories.forEach(function (cat, index) {
                        var data = status.data && status.data[index];
                        if (!data || !data.results || !data.results.length) return;

                        data.results.forEach(function (item) {
                            if (!item.poster_path && item.backdrop_path) item.poster_path = item.backdrop_path;
                        });

                        fulldata.push({ title: cat.title, results: data.results });
                    });

                    if (!fulldata.length) return _this.empty();

                    _this.build(fulldata);
                    _this.activity.loader(false);
                };

                categories.forEach(function (cat, index) {
                    network.silent(Lampa.TMDB.api(cat.query), function (json) {
                        status.append(String(index), json);
                    }, function () {
                        status.error();
                    });
                });

                return this.render();
            };

            return comp;
        }

        /** Дата цифрового релізу конкретного фільму — для плашки на його сторінці. */
        function getDigitalDate(movieId, callback) {
            var key = 'digital_' + movieId;
            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var url = Lampa.TMDB.api('movie/' + movieId + '/release_dates?api_key=' + getTmdbKey());

            new Lampa.Reguest().silent(url, function (data) {
                var results = (data && data.results) || [];
                var region = results.filter(function (r) { return r.iso_3166_1 === RELEASE_REGION; })[0];
                var digital = null;

                if (region && region.release_dates) {
                    var entry = region.release_dates.filter(function (r) { return r.type === RELEASE_DIGITAL; })[0];
                    if (entry && entry.release_date) digital = entry.release_date.substr(0, 10);
                }

                LikhtarCache.set(key, digital, LikhtarCache.TTL.DAY);
                callback(digital);
            }, function () {
                callback(null);
            });
        }

        // ===== Річниці =====

        /** Круглі річниці виходу — привід переглянути те, що колись вразило. */
        function anniversaryCategories() {
            var year = new Date().getFullYear();

            return [10, 20, 25, 30, 40, 50].map(function (age) {
                var target = year - age;
                return {
                    title: age + ' років фільмам ' + target + '-го',
                    query: 'discover/movie?' + apiKeyParams() +
                        '&primary_release_date.gte=' + target + '-01-01' +
                        '&primary_release_date.lte=' + target + '-12-31' +
                        '&vote_count.gte=300&sort_by=vote_average.desc'
                };
            });
        }

        function AnniversaryComponent(object) {
            var comp = new Lampa.InteractionMain(object);
            var network = new Lampa.Reguest();

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                var categories = anniversaryCategories();
                var status = new Lampa.Status(categories.length);

                status.onComplite = function () {
                    var fulldata = [];

                    categories.forEach(function (cat, index) {
                        var data = status.data && status.data[index];
                        if (!data || !data.results || !data.results.length) return;

                        data.results.forEach(function (item) {
                            if (!item.poster_path && item.backdrop_path) item.poster_path = item.backdrop_path;
                        });

                        fulldata.push({ title: cat.title, results: data.results });
                    });

                    if (!fulldata.length) return _this.empty();

                    _this.build(fulldata);
                    _this.activity.loader(false);
                };

                categories.forEach(function (cat, index) {
                    network.silent(Lampa.TMDB.api(cat.query), function (json) {
                        status.append(String(index), json);
                    }, function () {
                        status.error();
                    });
                });

                return this.render();
            };

            return comp;
        }

        // ===== Хронології =====

        var _chronologies = null;

        function getChronologies(callback) {
            if (_chronologies) return callback(_chronologies);

            // Свій файл поруч із плагіном має пріоритет — так список можна поповнювати без правки коду
            $.get(LIKHTAR_BASE_URL + 'chronologies.json').done(function (data) {
                try {
                    var parsed = typeof data === 'string' ? JSON.parse(data) : data;
                    _chronologies = (parsed && parsed.length) ? parsed : BUILTIN_CHRONOLOGIES;
                } catch (e) {
                    _chronologies = BUILTIN_CHRONOLOGIES;
                }
                callback(_chronologies);
            }).fail(function () {
                _chronologies = BUILTIN_CHRONOLOGIES;
                callback(_chronologies);
            });
        }

        /** Шукаємо фільм за назвою та роком — id у списках не тримаємо, щоб не помилитись мовчки. */
        function resolveTitle(title, year, callback) {
            var key = 'find_' + title.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + year;
            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var url = Lampa.TMDB.api('search/movie?' + apiKeyParams() +
                '&query=' + encodeURIComponent(title) + '&year=' + year);

            new Lampa.Reguest().silent(url, function (data) {
                var found = (data && data.results && data.results[0]) || null;
                LikhtarCache.set(key, found, LikhtarCache.TTL.MONTH);
                callback(found);
            }, function () {
                callback(null);
            });
        }

        /**
         * Показує впорядкований список фільмів, заданий назвами.
         * Використовується і для хронологій (з нумерацією), і для підказок
         * Ліхтарика (без неї, ще й із перевіркою року — див. object.verify_year).
         */
        function ChronologyComponent(object) {
            var comp = new Lampa.InteractionMain(object);

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                var items = object.chronology_items || [];
                var numbered = object.numbered !== false;
                var resolved = new Array(items.length);
                var pending = items.length;

                if (!pending) {
                    this.empty();
                    return this.render();
                }

                items.forEach(function (entry, index) {
                    resolveTitle(entry[0], entry[1], function (movie) {
                        if (movie && accept(movie, entry)) {
                            if (!movie.poster_path && movie.backdrop_path) movie.poster_path = movie.backdrop_path;
                            // Номер у хронології — головна цінність списку, показуємо його в назві
                            if (numbered) movie.title = (index + 1) + '. ' + (movie.title || entry[0]);
                            resolved[index] = movie;
                        }

                        if (--pending > 0) return;

                        var results = dedupe(resolved.filter(Boolean));
                        if (!results.length) return _this.empty();

                        _this.build([{ title: object.title, results: results }]);
                        _this.activity.loader(false);
                    });
                });

                return this.render();
            };

            /**
             * Для підказок моделі рік — головний запобіжник: вигадана назва або
             * знайде щось геть інше, або не збіжиться роком. Розбіжність у рік-два
             * прощаємо: дати прем'єр у різних країнах не збігаються.
             */
            function accept(movie, entry) {
                if (!object.verify_year || !entry[1]) return true;

                var found = parseInt((movie.release_date || '').substr(0, 4), 10);
                if (!found) return false;

                return Math.abs(found - entry[1]) <= 2;
            }

            /** Модель полюбляє видати той самий фільм двічі під різними назвами. */
            function dedupe(list) {
                var seen = {};
                return list.filter(function (movie) {
                    if (seen[movie.id]) return false;
                    seen[movie.id] = true;
                    return true;
                });
            }

            return comp;
        }

        function openChronologyMenu() {
            getChronologies(function (list) {
                Lampa.Select.show({
                    title: 'Хронології всесвітів',
                    items: list.map(function (c) { return { title: c.title, chronology: c }; }),
                    onSelect: function (item) {
                        Lampa.Activity.push({
                            url: '',
                            title: item.chronology.title,
                            component: 'likhtar_chronology',
                            chronology_items: item.chronology.items,
                            page: 1
                        });
                    },
                    onBack: function () {
                        Lampa.Controller.toggle('menu');
                    }
                });
            });
        }

        // ===== 4K українською =====

        /**
         * Розділ, якого немає більше ніде: фільми, що існують і в 4K, і з
         * українською доріжкою. JacRed не вміє шукати за такою умовою —
         * можна лише питати про конкретні назви, тож перебираємо популярне.
         * Перебір робить сервер: телевізору сотня запитів через проксі
         * коштувала б хвилин очікування.
         */
        function UltraHdComponent(object) {
            var comp = new Lampa.InteractionMain(object);
            var network = new Lampa.Reguest();
            var PAGES = 3;

            comp.create = function () {
                var _this = this;
                this.activity.loader(true);

                var collected = [];
                var pending = PAGES;

                for (var page = 1; page <= PAGES; page++) {
                    var url = Lampa.TMDB.api('discover/movie?' + apiKeyParams() +
                        '&sort_by=popularity.desc&vote_count.gte=200&page=' + page);

                    network.silent(url, function (json) {
                        (json && json.results ? json.results : []).forEach(function (item) {
                            if (!item.poster_path && item.backdrop_path) item.poster_path = item.backdrop_path;
                            collected.push(item);
                        });
                        if (--pending === 0) checkQuality();
                    }, function () {
                        if (--pending === 0) checkQuality();
                    });
                }

                function checkQuality() {
                    if (!collected.length) return _this.empty();

                    var payload = collected.map(function (movie) {
                        return {
                            id: movie.id,
                            title: movie.original_title || movie.title,
                            year: (movie.release_date || '').substr(0, 4)
                        };
                    });

                    $.ajax({
                        url: LikhtarNet.workerUrl() + '/api/quality',
                        method: 'POST',
                        contentType: 'application/json',
                        data: JSON.stringify({ items: payload }),
                        timeout: 60000
                    }).done(function (data) {
                        render(data && data.results ? data.results : {});
                    }).fail(function () {
                        _this.empty();
                    });
                }

                function render(quality) {
                    var ultra = [], hdr = [], fullHd = [];

                    collected.forEach(function (movie) {
                        var info = quality[movie.id];
                        if (!info || info.empty || !info.ukr) return;

                        if (info.resolution === '4K') ultra.push(movie);
                        else if (info.resolution === 'FHD') fullHd.push(movie);

                        if (info.hdr) hdr.push(movie);
                    });

                    var rows = [];
                    if (ultra.length) rows.push({ title: '4K з українською', results: ultra });
                    if (hdr.length) rows.push({ title: 'HDR з українською', results: hdr });
                    if (fullHd.length) rows.push({ title: '1080p з українською', results: fullHd });

                    if (!rows.length) return _this.empty();

                    _this.build(rows);
                    _this.activity.loader(false);
                }

                return this.render();
            };

            return comp;
        }

        // ===== Меню =====

        function menuItem(action, label, iconPath, onEnter) {
            var item = $('<li class="menu__item selector" data-action="' + action + '">' +
                '<div class="menu__ico"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                '<path d="' + iconPath + '"/></svg></div>' +
                '<div class="menu__text"></div></li>');

            item.find('.menu__text').text(label);
            item.on('hover:enter click', onEnter);
            return item;
        }

        function addMenu() {
            var list = $('.menu .menu__list').eq(0);
            if (!list.length) return;

            if (isSettingEnabled('likhtar_section_digital', true) && !$('[data-action="likhtar_digital"]').length) {
                list.append(menuItem('likhtar_digital', 'Релізи в цифрі',
                    'M4 6h16v10H4V6zm0-2a2 2 0 00-2 2v10a2 2 0 002 2h6v2H8v2h8v-2h-2v-2h6a2 2 0 002-2V6a2 2 0 00-2-2H4z',
                    function () {
                        Lampa.Activity.push({ url: '', title: 'Релізи в цифрі', component: 'likhtar_digital', page: 1 });
                    }));
            }

            if (isSettingEnabled('likhtar_section_anniversary', true) && !$('[data-action="likhtar_anniversary"]').length) {
                list.append(menuItem('likhtar_anniversary', 'Річниці кіно',
                    'M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.3 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z',
                    function () {
                        Lampa.Activity.push({ url: '', title: 'Річниці кіно', component: 'likhtar_anniversary', page: 1 });
                    }));
            }

            // Розділ живе на переборі JacRed — без сервера телевізор його не потягне
            if (isSettingEnabled('likhtar_section_4k', true) && LikhtarNet.hasWorker() && !$('[data-action="likhtar_4k"]').length) {
                list.append(menuItem('likhtar_4k', '4K українською',
                    'M3 5h18v14H3V5zm2 2v10h14V7H5zm2 2h2v2h1V9h2v6h-2v-2H9v2H7V9zm8 0h2v4h1V9h2v6h-5V9z',
                    function () {
                        Lampa.Activity.push({ url: '', title: '4K українською', component: 'likhtar_4k', page: 1 });
                    }));
            }

            if (isSettingEnabled('likhtar_section_chronology', true) && !$('[data-action="likhtar_chronology"]').length) {
                list.append(menuItem('likhtar_chronology', 'Хронології',
                    'M13 3a9 9 0 00-9 9H1l4 4 4-4H6a7 7 0 117 7v2a9 9 0 000-18zm-1 5v5l4 2 .7-1.2-3.2-1.9V8H12z',
                    openChronologyMenu));
            }
        }

        return {
            init: function () {
                Lampa.Component.add('likhtar_digital', DigitalComponent);
                Lampa.Component.add('likhtar_anniversary', AnniversaryComponent);
                Lampa.Component.add('likhtar_chronology', ChronologyComponent);
                Lampa.Component.add('likhtar_4k', UltraHdComponent);

                if (window.appready) addMenu();
                else Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') addMenu();
                });
            },
            getDigitalDate: getDigitalDate
        };
    })();

    // =================================================================
    // ЛІХТАРИК — ПОМІЧНИК ІЗ ПІДБОРУ КІНО
    // =================================================================
    /**
     * Замість того щоб гортати десятки рядків, користувач відповідає на
     * кілька питань картками — і отримує готову підбірку. Усе рахується
     * локально: жодних запитів до моменту, коли відповіді зібрані.
     */
    var LikhtarAssistant = (function () {
        // Жанри в TMDB для фільмів і серіалів пронумеровані по-різному,
        // тож кожен настрій одразу тримає обидва набори.
        var MOODS = [
            { emoji: '🍿', text: 'Розслабитись', movie: [35, 10751], tv: [35, 10751] },
            { emoji: '🖤', text: 'Щось похмуре', movie: [18, 80], tv: [18, 80] },
            { emoji: '😂', text: 'Посміятись', movie: [35], tv: [35] },
            { emoji: '🤯', text: 'Щоб мозок закипів', movie: [878, 9648], tv: [10765, 9648] },
            { emoji: '💘', text: 'Романтика', movie: [10749], tv: [18], keywords: '9840' },
            { emoji: '⚔️', text: 'Адреналін', movie: [28, 12], tv: [10759] },
            { emoji: '👻', text: 'Лоскотати нерви', movie: [27, 53], tv: [9648, 80] },
            { emoji: '🌍', text: 'Пізнавальне', movie: [99], tv: [99] }
        ];

        var FORMATS = [
            { emoji: '🎬', text: 'Фільм', type: 'movie' },
            { emoji: '📺', text: 'Серіал', type: 'tv' }
        ];

        var COMPANY = [
            { emoji: '🧘', text: 'Сам', kids: false },
            { emoji: '❤️', text: 'Удвох', kids: false },
            { emoji: '👨‍👩‍👧', text: 'З дітьми', kids: true },
            { emoji: '🎉', text: 'Компанією', kids: false }
        ];

        var LENGTH = [
            { emoji: '⏱', text: 'До 1,5 години', max: 95 },
            { emoji: '🎞', text: 'Повний метр', min: 95, max: 150 },
            { emoji: '🍿', text: 'Скільки завгодно' }
        ];

        var ERA = [
            { emoji: '✨', text: 'Свіже', fresh: true },
            { emoji: '🏛', text: 'Перевірене часом', classic: true },
            { emoji: '🎲', text: 'Байдуже' }
        ];

        /** Питання, які ставимо. Крок про тривалість пропускаємо для серіалів. */
        var STEPS = [
            { key: 'mood', title: 'Що хочеться подивитись?', options: MOODS },
            { key: 'format', title: 'Фільм чи серіал?', options: FORMATS },
            { key: 'company', title: 'З ким дивитесь?', options: COMPANY },
            { key: 'length', title: 'Скільки маєте часу?', options: LENGTH, onlyFor: 'movie' },
            { key: 'era', title: 'Свіже чи класика?', options: ERA }
        ];

        /** Збирає відповіді в один запит до TMDB. */
        function buildQuery(answers) {
            var type = (answers.format && answers.format.type) || 'movie';
            var isMovie = type === 'movie';
            var params = {
                sort_by: 'popularity.desc',
                'vote_count.gte': isMovie ? '100' : '50'
            };

            var genres = (answers.mood && answers.mood[type]) || [];
            if (answers.company && answers.company.kids) {
                // Сімейний жанр витісняє похмурі: дитячий вечір і кримінальна драма погано поєднуються
                genres = [10751];
                params.certification_country = 'US';
                params['certification.lte'] = isMovie ? 'PG-13' : null;
                params.include_adult = 'false';
            }
            if (genres.length) params.with_genres = genres.join(',');
            if (answers.mood && answers.mood.keywords && !(answers.company && answers.company.kids)) {
                params.with_keywords = answers.mood.keywords;
            }

            if (isMovie && answers.length) {
                if (answers.length.max) params['with_runtime.lte'] = String(answers.length.max);
                if (answers.length.min) params['with_runtime.gte'] = String(answers.length.min);
            }

            var dateField = isMovie ? 'primary_release_date' : 'first_air_date';
            if (answers.era && answers.era.fresh) {
                var since = new Date();
                since.setFullYear(since.getFullYear() - 3);
                params[dateField + '.gte'] = since.getFullYear() + '-01-01';
            } else if (answers.era && answers.era.classic) {
                params[dateField + '.lte'] = '2010-12-31';
                params['vote_average.gte'] = '7';
                params['vote_count.gte'] = '500';
            }

            // Прибираємо ключі, які лишились порожніми
            Object.keys(params).forEach(function (k) {
                if (params[k] === null || params[k] === undefined) delete params[k];
            });

            return { url: 'discover/' + type, params: params };
        }

        /** Підсумок відповідей — стане заголовком підбірки. */
        function describe(answers) {
            return [
                answers.mood && answers.mood.text,
                answers.format && answers.format.text.toLowerCase(),
                answers.era && !answers.era.fresh && !answers.era.classic ? null : (answers.era && answers.era.text.toLowerCase())
            ].filter(Boolean).join(' • ');
        }

        function stepsFor(answers) {
            return STEPS.filter(function (step) {
                if (!step.onlyFor) return true;
                return answers.format && answers.format.type === step.onlyFor;
            });
        }

        function AssistantComponent(object) {
            var scroll = new Lampa.Scroll({ mask: true, over: true });
            var html = $('<div class="likhtar-assistant"></div>');
            var body = $('<div class="likhtar-assistant__body"></div>');
            var answers = {};
            var stepIndex = 0;
            var comp = this;

            function currentStep() {
                return stepsFor(answers)[stepIndex];
            }

            function answerCard(option, onEnter) {
                var card = $('<div class="card selector card--mood likhtar-answer">' +
                    '<div class="card__view"><div class="mood-content">' +
                    '<div class="likhtar-answer__emoji"></div>' +
                    '<div class="mood-text"></div>' +
                    '</div></div></div>');

                card.find('.likhtar-answer__emoji').text(option.emoji || '');
                card.find('.mood-text').text(option.text);
                card.on('hover:enter click', onEnter);
                return card;
            }

            function finish() {
                var query = buildQuery(answers);

                Lampa.Activity.push({
                    url: query.url,
                    params: query.params,
                    title: describe(answers) || 'Підбірка Ліхтарика',
                    component: 'studios_view',
                    page: 1
                });
            }

            function renderStep() {
                var step = currentStep();
                if (!step) return finish();

                var total = stepsFor(answers).length;

                body.empty();
                body.append($('<div class="likhtar-assistant__step"></div>')
                    .text('Питання ' + (stepIndex + 1) + ' з ' + total));
                body.append($('<div class="likhtar-assistant__title"></div>').text(step.title));

                var grid = $('<div class="likhtar-assistant__grid"></div>');
                step.options.forEach(function (option) {
                    grid.append(answerCard(option, function () {
                        answers[step.key] = option;
                        stepIndex++;
                        renderStep();
                    }));
                });

                // Питання картками покриває типові випадки; коли треба щось
                // конкретніше — на першому кроці пропонуємо спитати словами
                if (stepIndex === 0 && LikhtarNet.hasWorker()) {
                    grid.append(answerCard(
                        { emoji: '🔮', text: 'Запитати своїми словами' },
                        function () { LikhtarAsk.start(); }
                    ));
                }

                body.append(grid);

                // Набір .selector змінився — переспрямовуємо на нього фокус пульта
                comp.start();
            }

            this.create = function () {
                scroll.append(body);
                html.append(scroll.render());
                return this.render();
            };

            this.start = function () {
                if (Lampa.Activity.active().activity !== this.activity) return;

                Lampa.Controller.add('content', {
                    toggle: function () {
                        Lampa.Controller.collectionSet(scroll.render());
                        Lampa.Controller.collectionFocus(false, scroll.render());
                    },
                    left: function () {
                        if (Navigator.canmove('left')) Navigator.move('left');
                        else Lampa.Controller.toggle('menu');
                    },
                    right: function () { Navigator.move('right'); },
                    up: function () {
                        if (Navigator.canmove('up')) Navigator.move('up');
                        else Lampa.Controller.toggle('head');
                    },
                    down: function () { Navigator.move('down'); },
                    back: function () {
                        // Крок назад по питаннях, і лише з першого — вихід із помічника
                        if (stepIndex > 0) {
                            stepIndex--;
                            renderStep();
                        } else {
                            Lampa.Activity.backward();
                        }
                    }
                });

                Lampa.Controller.toggle('content');
            };

            this.render = function () { return html; };

            this.pause = function () { };
            this.stop = function () { };

            this.destroy = function () {
                scroll.destroy();
                html.remove();
            };

            // Перше питання малюємо одразу після створення активності
            setTimeout(renderStep, 0);
        }

        function addStyles() {
            if ($('style#likhtar-assistant-css').length) return;

            $('head').append('<style id="likhtar-assistant-css">' +
                '.likhtar-assistant__body { padding: 1.5em; }' +
                '.likhtar-assistant__step { font-size: 1.1em; opacity: 0.6; margin-bottom: 0.3em; }' +
                '.likhtar-assistant__title { font-size: 2em; font-weight: 600; margin-bottom: 1em; }' +
                '.likhtar-assistant__grid { display: flex; flex-wrap: wrap; gap: 1em; }' +
                '.likhtar-answer { width: 12em; }' +
                '.likhtar-answer .card__view { display: flex; align-items: center; justify-content: center;' +
                ' height: 7em; background: rgba(255,255,255,0.08); border-radius: 0.6em; }' +
                '.likhtar-answer .mood-content { text-align: center; padding: 0.5em; }' +
                '.likhtar-answer__emoji { font-size: 2.2em; line-height: 1.1; margin-bottom: 0.15em; }' +
                '.likhtar-answer .mood-text { font-size: 1.1em; font-weight: 600; }' +
                '.likhtar-answer.focus .card__view { background: rgba(255,255,255,0.25); }' +
                '</style>');
        }

        function addMenu() {
            if (!isSettingEnabled('likhtar_assistant_enabled', true)) return;
            if ($('[data-action="likhtar_assistant"]').length) return;

            var list = $('.menu .menu__list').eq(0);
            if (!list.length) return;

            var item = $('<li class="menu__item selector" data-action="likhtar_assistant">' +
                '<div class="menu__ico" style="font-size:1.5em;line-height:1">💡</div>' +
                '<div class="menu__text">Ліхтарик</div></li>');

            item.on('hover:enter click', function () {
                Lampa.Activity.push({
                    url: '',
                    title: 'Ліхтарик',
                    component: 'likhtar_assistant',
                    page: 1
                });
            });

            list.append(item);
        }

        return {
            init: function () {
                addStyles();
                Lampa.Component.add('likhtar_assistant', AssistantComponent);

                if (window.appready) addMenu();
                else Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') addMenu();
                });
            },
            buildQuery: buildQuery,
            describe: describe,
            stepsFor: stepsFor,
            STEPS: STEPS
        };
    })();

    // =================================================================
    // НАЛАШТУВАННЯ З ТЕЛЕФОНА
    // =================================================================
    /**
     * Клацати налаштування пультом довго й незручно. Тут телевізор показує
     * код, користувач відкриває сторінку на телефоні, все там налаштовує —
     * і телевізор підхоплює зміни, не перериваючи перегляд.
     */
    var LikhtarPairing = (function () {
        var POLL_INTERVAL = 3000;
        var POLL_LIMIT = 200;          // ~10 хвилин, стільки ж живе сесія на сервері

        /**
         * Налаштування, які має сенс переносити. Список явний, а не «усе, що
         * починається з likhtar_»: так у конфіг не потрапить службове,
         * як-от кеш чи позначки міграцій.
         */
        var PORTABLE_KEYS = [
            'likhtar_tmdb_apikey',
            'likhtar_section_streamings',
            'likhtar_section_mood',
            'likhtar_assistant_enabled',
            'likhtar_section_digital',
            'likhtar_section_anniversary',
            'likhtar_section_chronology',
            'likhtar_badge_enabled',
            'likhtar_badge_ua',
            'likhtar_badge_en',
            'likhtar_badge_4k',
            'likhtar_badge_fhd',
            'likhtar_badge_hdr',
            'likhtar_show_logo_instead_text',
            'likhtar_full_info',
            'likhtar_full_trailer_ua',
            'likhtar_full_franchise',
            'likhtar_kinooglad_enabled',
            'kino_channels'
        ];

        function exportConfig() {
            var config = {};
            PORTABLE_KEYS.forEach(function (key) {
                var value = Lampa.Storage.get(key, undefined);
                if (value !== undefined && value !== null) config[key] = value;
            });
            return config;
        }

        /** Повертає кількість застосованих змін — щоб було що сказати користувачу. */
        function importConfig(config) {
            var applied = 0;

            PORTABLE_KEYS.forEach(function (key) {
                if (!(key in config)) return;

                var value = config[key];
                if (JSON.stringify(Lampa.Storage.get(key, null)) === JSON.stringify(value)) return;

                Lampa.Storage.set(key, value);
                applied++;
            });

            return applied;
        }

        function modalHtml(code, qrUrl) {
            var html = $('<div class="likhtar-pair"></div>');

            html.append('<div class="likhtar-pair__hint">Відкрийте сторінку на телефоні та введіть код</div>');
            if (qrUrl) html.append($('<img class="likhtar-pair__qr">').attr('src', qrUrl));
            html.append($('<div class="likhtar-pair__code"></div>').text(code));
            html.append('<div class="likhtar-pair__status">Очікуємо на зміни…</div>');

            return html;
        }

        function start() {
            var worker = LikhtarNet.workerUrl();

            if (!worker) {
                Lampa.Noty.show('Спершу вкажіть адресу сервера Ліхтаря в налаштуваннях');
                return;
            }

            var pageUrl = worker + '/config';

            $.ajax({
                url: worker + '/api/session',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ config: exportConfig() })
            }).done(function (data) {
                if (!data || !data.code) return Lampa.Noty.show('Сервер не видав код');
                showModal(worker, data.code, pageUrl);
            }).fail(function () {
                Lampa.Noty.show('Не вдалося зв\'язатися із сервером Ліхтаря');
            });
        }

        function showModal(worker, code, pageUrl) {
            var qrTarget = pageUrl + '?s=' + code;
            var qrUrl = worker + '/api/qr?text=' + encodeURIComponent(qrTarget);
            var html = modalHtml(code, qrUrl);
            var status = html.find('.likhtar-pair__status');

            var polls = 0;
            var timer = null;
            var closed = false;

            function stop() {
                closed = true;
                if (timer) clearTimeout(timer);
            }

            function poll() {
                if (closed) return;

                if (++polls > POLL_LIMIT) {
                    status.text('Час сесії вичерпано — відкрийте вікно ще раз');
                    return;
                }

                $.get(worker + '/api/session/' + code).done(function (data) {
                    if (closed) return;

                    if (data && data.updated) {
                        var applied = importConfig(data.config || {});
                        stop();

                        Lampa.Modal.close();
                        Lampa.Controller.toggle('settings_component');
                        Lampa.Noty.show(applied
                            ? 'Налаштування застосовано (' + applied + '). Перезапустіть Lampa, щоб оновились розділи меню.'
                            : 'Налаштування вже актуальні');
                        return;
                    }

                    timer = setTimeout(poll, POLL_INTERVAL);
                }).fail(function () {
                    if (!closed) timer = setTimeout(poll, POLL_INTERVAL);
                });
            }

            Lampa.Modal.open({
                title: 'Налаштувати з телефона',
                html: html,
                size: 'medium',
                onBack: function () {
                    stop();
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('settings_component');
                }
            });

            timer = setTimeout(poll, POLL_INTERVAL);
        }

        function addStyles() {
            if ($('style#likhtar-pair-css').length) return;

            $('head').append('<style id="likhtar-pair-css">' +
                '.likhtar-pair { text-align: center; padding: 1em; }' +
                '.likhtar-pair__hint { font-size: 1.1em; opacity: 0.8; margin-bottom: 1em; }' +
                '.likhtar-pair__qr { width: 14em; height: 14em; background: #fff; padding: 0.6em;' +
                ' border-radius: 0.6em; display: block; margin: 0 auto 1em; }' +
                '.likhtar-pair__code { font-size: 2.6em; font-weight: 700; letter-spacing: 0.25em;' +
                ' padding: 0.3em 0; }' +
                '.likhtar-pair__status { font-size: 1em; opacity: 0.6; margin-top: 0.6em; }' +
                '</style>');
        }

        return {
            init: addStyles,
            start: start,
            exportConfig: exportConfig,
            importConfig: importConfig,
            PORTABLE_KEYS: PORTABLE_KEYS
        };
    })();

    // =================================================================
    // НОВИЙ ВИГЛЯД СТОРІНКИ ФІЛЬМУ
    // =================================================================
    /**
     * Уся головна інформація в один екран, а довгі списки — за кнопками,
     * що відкривають бічну панель.
     *
     * Свідомо не будуємо сторінку з нуля: беремо ту, що намалювала Lampa,
     * і перебудовуємо. Секції не копіюємо, а переносимо — так у них
     * лишаються живі обробники подій і працює навігація пультом.
     */
    var LikhtarCard = (function () {
        var PANEL_CONTROLLER = 'likhtar_panel';

        // Розділи, які вже покриті власними кнопками або нічого не дають.
        // Без цього поруч стоять наші «Актори та автори» і рідні «Актори».
        var SKIP_SECTIONS = /^(shots?|актори|акторський склад|у ролях|режисер|детально|деталі|cast|actors|director|details|description|сезон\s*\d+|season\s*\d+|рекомендації|recommendations|подібн.*|схоже|similar|колекція|collection|коментарі|comments|reviews?)$/i;

        var moved = [];        // що саме ми перенесли в панель — щоб повернути на місце
        var panel = null;
        var panelBack = null;        // куди веде «Назад» усередині панелі (з епізодів — до сезонів)
        var pendingPanelBack = null; // «Назад» для панелі, яку зараз відкриють (розділи хаба)
        var sectionObserver = null;

        function isEnabled() {
            return isSettingEnabled('likhtar_new_card', true);
        }

        function personActivity(id, name) {
            Lampa.Activity.push({
                url: '',
                title: name || Lampa.Lang.translate('title_person'),
                component: 'actor',
                id: id,
                source: 'tmdb'
            });
        }

        // ===== Бічна панель =====

        function closePanel() {
            if (!panel) return;

            // Повертаємо перенесені блоки туди, звідки взяли
            moved.forEach(function (item) {
                item.node.detach().insertAfter(item.anchor);
                item.node.addClass('likhtar-card__hidden');
            });
            moved = [];

            panel.remove();
            panel = null;
            panelBack = null;

            Lampa.Controller.toggle('full_start');
        }

        /** Панель наповнюється асинхронно — коли рядки з'явились, фокус треба поставити ще раз. */
        function refocusPanel() {
            if (!panel || !panel.find('.selector').length) return;
            wireFocusScroll();
            Lampa.Controller.toggle(PANEL_CONTROLLER);
        }

        /** Перемальовує вміст відкритої панелі, не закриваючи її. */
        function fillPanel(title, subtitle, fill, onBack) {
            if (!panel) return;

            panel.find('.likhtar-panel__title').text(title);
            panel.find('.likhtar-panel__sub').text(subtitle || '');
            panel.find('.likhtar-panel__hint').text(onBack ? 'Назад — до списку' : 'Назад — закрити панель');

            var body = panel.find('.likhtar-panel__body').empty();
            panelBack = onBack || null;
            fill(body);

            Lampa.Controller.toggle(PANEL_CONTROLLER);
        }

        /**
         * Прокручує тіло панелі до сфокусованого елемента. Обробник чіпляємо
         * на кожен елемент напряму: делеговану подію hover:focus Lampa не
         * підіймає до контейнера, тому «на панелі» вона не ловилась.
         */
        function wireFocusScroll() {
            if (!panel) return;
            var container = panel.find('.likhtar-panel__body')[0];
            if (!container) return;

            panel.find('.selector').off('hover:focus.likhtarscroll').on('hover:focus.likhtarscroll', function () {
                var el = this;
                var top = el.offsetTop - container.offsetTop;
                var bottom = top + el.offsetHeight;
                var margin = 24;

                if (top < container.scrollTop + margin) {
                    container.scrollTop = top - margin;
                } else if (bottom > container.scrollTop + container.clientHeight - margin) {
                    container.scrollTop = bottom - container.clientHeight + margin;
                }
            });
        }

        function openPanel(title, subtitle, fill) {
            closePanel();

            panel = $('<div class="likhtar-panel">' +
                '<div class="likhtar-panel__head"><div class="likhtar-panel__title"></div>' +
                '<div class="likhtar-panel__sub"></div></div>' +
                '<div class="likhtar-panel__body"></div>' +
                '<div class="likhtar-panel__hint">Назад — закрити панель</div></div>');

            panel.find('.likhtar-panel__title').text(title);
            panel.find('.likhtar-panel__sub').text(subtitle || '');

            // Розділ, відкритий із хаба, на «Назад» повертається в хаб
            panelBack = pendingPanelBack;
            pendingPanelBack = null;
            panel.find('.likhtar-panel__hint').text(panelBack ? 'Назад — до Ліхтарика' : 'Назад — закрити панель');

            fill(panel.find('.likhtar-panel__body'));
            $('body').append(panel);
            wireFocusScroll();

            // Клас додаємо наступним кадром, інакше переходу не буде видно
            setTimeout(function () { if (panel) panel.addClass('likhtar-panel--open'); }, 10);

            Lampa.Controller.add(PANEL_CONTROLLER, {
                toggle: function () {
                    if (!panel) return;
                    Lampa.Controller.collectionSet(panel[0]);
                    // Явно передаємо перший рядок: інакше на порожній ще панелі
                    // фокус нікуди не стає, і вона лишається неклікабельною
                    Lampa.Controller.collectionFocus(panel.find('.selector').first()[0] || false, panel[0]);
                },
                up: function () { Navigator.move('up'); },
                down: function () { Navigator.move('down'); },
                left: function () {
                    // Усередині перенесеної секції картки стоять рядком —
                    // закриваємо панель лише з крайньої лівої позиції
                    if (Navigator.canmove('left')) Navigator.move('left');
                    else closePanel();
                },
                right: function () {
                    if (Navigator.canmove('right')) Navigator.move('right');
                },
                back: function () {
                    if (panelBack) panelBack();
                    else closePanel();
                }
            });

            Lampa.Controller.toggle(PANEL_CONTROLLER);
        }

        // ===== Актори та автори =====

        function creditsList(movie, callback) {
            var type = (movie.name || movie.first_air_date) ? 'tv' : 'movie';
            var key = 'credits_' + type + '_' + movie.id;

            var cached = LikhtarCache.get(key);
            if (cached) return callback(cached);

            var url = Lampa.TMDB.api(type + '/' + movie.id + '/credits?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var crew = (data && data.crew) || [];
                var pick = function (job) {
                    return crew.filter(function (p) { return p.job === job; }).slice(0, 3);
                };

                var result = {
                    directors: pick('Director'),
                    writers: pick('Screenplay').concat(pick('Writer')).slice(0, 3),
                    cast: ((data && data.cast) || []).slice(0, 20)
                };

                LikhtarCache.set(key, result, LikhtarCache.TTL.WEEK);
                callback(result);
            }, function () {
                callback(null);
            });
        }

        function personRow(person, role) {
            var row = $('<div class="likhtar-person selector">' +
                '<div class="likhtar-person__ava"></div>' +
                '<div class="likhtar-person__text"><div class="likhtar-person__name"></div>' +
                '<div class="likhtar-person__role"></div></div>' +
                '<div class="likhtar-person__chevron">›</div></div>');

            row.find('.likhtar-person__name').text(person.name || '');
            row.find('.likhtar-person__role').text(role || '');

            var ava = row.find('.likhtar-person__ava');
            if (person.profile_path) {
                ava.css('background-image', 'url(' + Lampa.TMDB.image('t/p/w185' + person.profile_path) + ')');
            } else {
                // Без фото — ініціали: порожнє коло виглядає як помилка завантаження
                ava.addClass('likhtar-person__ava--text').text((person.name || '?').charAt(0));
            }

            row.on('hover:enter click', function () { personActivity(person.id, person.name); });
            return row;
        }

        function openCast(movie) {
            openPanel('Актори та автори', 'Оберіть людину — відкриється її фільмографія', function (body) {
                body.append('<div class="likhtar-panel__loading">Завантаження…</div>');

                creditsList(movie, function (credits) {
                    body.empty();

                    if (!credits || (!credits.cast.length && !credits.directors.length)) {
                        body.append('<div class="likhtar-panel__loading">Даних немає</div>');
                        return;
                    }

                    function group(title, people, roleOf) {
                        if (!people.length) return;
                        body.append($('<div class="likhtar-panel__group"></div>').text(title));
                        people.forEach(function (p) { body.append(personRow(p, roleOf(p))); });
                    }

                    group('Режисер', credits.directors, function () { return 'Режисер'; });
                    group('Сценарій', credits.writers, function (p) { return p.job || 'Сценарій'; });
                    group('У ролях', credits.cast, function (p) { return p.character || ''; });
                    refocusPanel();
                });
            });
        }

        // ===== Серії та дати виходу =====

        function isSeries(movie) {
            return !!(movie.name || movie.first_air_date || movie.number_of_seasons);
        }

        function seasonsOf(movie, callback) {
            if (movie.seasons && movie.seasons.length) return callback(movie.seasons);

            var key = 'seasons_' + movie.id;
            var cached = LikhtarCache.get(key);
            if (cached) return callback(cached);

            var url = Lampa.TMDB.api('tv/' + movie.id + '?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var seasons = (data && data.seasons) || [];
                LikhtarCache.set(key, seasons, LikhtarCache.TTL.DAY);
                callback(seasons);
            }, function () {
                callback([]);
            });
        }

        function episodesOf(movie, seasonNumber, callback) {
            var key = 'episodes_' + movie.id + '_' + seasonNumber;
            var cached = LikhtarCache.get(key);
            if (cached) return callback(cached);

            var base = 'tv/' + movie.id + '/season/' + seasonNumber + '?api_key=' + getTmdbKey();
            var url = Lampa.TMDB.api(base + '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var episodes = (data && data.episodes) || [];

                // Українські описи серій у TMDB часто порожні — доповнюємо
                // англійськими, бо порожній рядок гірший за чужу мову
                var gaps = episodes.filter(function (ep) { return !ep.overview; }).length;
                if (episodes.length && gaps > episodes.length / 2) {
                    return new Lampa.Reguest().silent(Lampa.TMDB.api(base + '&language=en'), function (en) {
                        var byNumber = {};
                        ((en && en.episodes) || []).forEach(function (ep) { byNumber[ep.episode_number] = ep; });

                        episodes.forEach(function (ep) {
                            var fallback = byNumber[ep.episode_number];
                            if (!fallback) return;
                            if (!ep.overview) ep.overview = fallback.overview;
                            if (!ep.name || /^\s*(епізод|серія|episode)\s*\d+\s*$/i.test(ep.name)) {
                                ep.name = fallback.name || ep.name;
                            }
                        });

                        finish(episodes);
                    }, function () { finish(episodes); });
                }

                finish(episodes);

                function finish(list) {
                    // Сезон, що ще виходить, кешуємо ненадовго: дати уточнюються
                    var hasUpcoming = list.some(function (ep) {
                        return ep.air_date && new Date(ep.air_date + 'T00:00:00') > new Date();
                    });
                    LikhtarCache.set(key, list, hasUpcoming ? LikhtarCache.TTL.DAY : LikhtarCache.TTL.WEEK);
                    callback(list);
                }
            }, function () {
                callback([]);
            });
        }

        function episodeDateLabel(iso) {
            if (!iso) return { text: 'Дата невідома', mod: 'unknown' };

            var air = new Date(iso + 'T00:00:00');
            if (isNaN(air.getTime())) return { text: 'Дата невідома', mod: 'unknown' };

            var today = new Date();
            today.setHours(0, 0, 0, 0);

            var days = Math.round((air - today) / 86400000);
            var human = ('0' + air.getDate()).slice(-2) + '.' + ('0' + (air.getMonth() + 1)).slice(-2) + '.' + air.getFullYear();

            if (days < 0) return { text: human, mod: 'aired' };
            if (days === 0) return { text: 'сьогодні', mod: 'soon' };
            if (days === 1) return { text: 'завтра', mod: 'soon' };
            if (days < 7) return { text: 'через ' + days + ' дн.', mod: 'soon' };
            return { text: human, mod: 'upcoming' };
        }

        function episodeRow(episode) {
            var row = $('<div class="likhtar-episode selector">' +
                '<div class="likhtar-episode__num"></div>' +
                '<div class="likhtar-episode__text"><div class="likhtar-episode__name"></div>' +
                '<div class="likhtar-episode__descr"></div></div>' +
                '<div class="likhtar-episode__date"></div></div>');

            row.find('.likhtar-episode__num').text(episode.episode_number || '?');
            row.find('.likhtar-episode__name').text(episode.name || ('Серія ' + episode.episode_number));
            row.find('.likhtar-episode__descr').text((episode.overview || '').substr(0, 90));

            var date = episodeDateLabel(episode.air_date);
            row.find('.likhtar-episode__date').text(date.text).addClass('likhtar-episode__date--' + date.mod);
            row.addClass('likhtar-episode--' + date.mod);

            return row;
        }

        /** Повний опис серії: у списку він обрізаний одним рядком. */
        function openEpisode(episode, backToList) {
            var date = episodeDateLabel(episode.air_date);
            var code = 'Серія ' + (episode.episode_number || '?');

            fillPanel(episode.name || code, code + ' · ' + date.text, function (body) {
                if (episode.still_path) {
                    body.append($('<div class="likhtar-episode__still"></div>')
                        .css('background-image', 'url(' + Lampa.TMDB.image('t/p/w500' + episode.still_path) + ')'));
                }

                body.append($('<div class="likhtar-panel__text selector"></div>')
                    .text(episode.overview || 'Опису цієї серії ще немає.'));
                refocusPanel();
            }, backToList);
        }

        function openEpisodes(movie, season, backToSeasons) {
            fillPanel(season.name || ('Сезон ' + season.season_number), '', function (body) {
                body.append('<div class="likhtar-panel__loading">Завантаження…</div>');

                episodesOf(movie, season.season_number, function (episodes) {
                    body.empty();

                    if (!episodes.length) {
                        body.append('<div class="likhtar-panel__loading">Серій не знайдено</div>');
                        return;
                    }

                    var upcoming = episodes.filter(function (ep) {
                        return ep.air_date && new Date(ep.air_date + 'T00:00:00') >= new Date().setHours(0, 0, 0, 0);
                    });
                    if (upcoming.length) {
                        body.append($('<div class="likhtar-panel__group"></div>')
                            .text('Попереду ще ' + upcoming.length + ' сер.'));
                    }

                    episodes.forEach(function (ep) {
                        var row = episodeRow(ep);
                        row.on('hover:enter click', function () {
                            openEpisode(ep, function () { openEpisodes(movie, season, backToSeasons); });
                        });
                        body.append(row);
                    });
                    refocusPanel();
                });
            }, backToSeasons);
        }

        function openSeasons(movie) {
            var backToHub = null;

            function render() {
                fillPanel('Перелік серій', 'Дати виходу за сезонами', function (body) {
                    body.append('<div class="likhtar-panel__loading">Завантаження…</div>');

                    seasonsOf(movie, function (seasons) {
                        body.empty();

                        // Нульовий сезон — це спецвипуски; у списку вони лише плутають
                        var list = seasons.filter(function (s) { return s.season_number > 0; });
                        if (!list.length) list = seasons;

                        if (!list.length) {
                            body.append('<div class="likhtar-panel__loading">Даних немає</div>');
                            return;
                        }

                        list.forEach(function (season) {
                            var row = $('<div class="likhtar-season selector">' +
                                '<div class="likhtar-season__text"><div class="likhtar-season__name"></div>' +
                                '<div class="likhtar-season__meta"></div></div>' +
                                '<div class="likhtar-person__chevron">›</div></div>');

                            row.find('.likhtar-season__name').text(season.name || ('Сезон ' + season.season_number));

                            var meta = [];
                            if (season.episode_count) meta.push(season.episode_count + ' сер.');
                            if (season.air_date) meta.push(season.air_date.substr(0, 4));
                            row.find('.likhtar-season__meta').text(meta.join(' • '));

                            row.on('hover:enter click', function () {
                                openEpisodes(movie, season, render);
                            });

                            body.append(row);
                        });

                        refocusPanel();
                    });
                }, backToHub);
            }

            openPanel('Перелік серій', 'Дати виходу за сезонами', function () { });
            backToHub = panelBack;   // openPanel щойно підхопив «назад до хаба»
            render();
        }

        /** Колекція фільму: беремо з готових даних, інакше питаємо TMDB. */
        function collectionOf(movie, callback) {
            if (movie.belongs_to_collection !== undefined) return callback(movie.belongs_to_collection);
            if (isSeries(movie)) return callback(null);

            var key = 'collection_' + movie.id;
            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var url = Lampa.TMDB.api('movie/' + movie.id + '?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var collection = (data && data.belongs_to_collection) || null;
                LikhtarCache.set(key, collection, LikhtarCache.TTL.WEEK);
                callback(collection);
            }, function () {
                callback(null);
            });
        }

        // ===== Списки фільмів у панелі (рекомендації, подібні, колекція) =====

        function titleRow(item) {
            var banner = $('<div class="likhtar-title selector">' +
                '<div class="likhtar-title__shade"></div>' +
                '<div class="likhtar-title__caption">' +
                '<div class="likhtar-title__name"></div>' +
                '<div class="likhtar-title__meta"></div>' +
                '</div></div>');

            banner.find('.likhtar-title__name').text(item.title || item.name || '');

            var meta = banner.find('.likhtar-title__meta');
            if (item.vote_average) {
                meta.append($('<span class="likhtar-title__rate"></span>')
                    .text(Number(item.vote_average).toFixed(1)));
            }
            var year = (item.release_date || item.first_air_date || '').substr(0, 4);
            if (year) meta.append($('<span></span>').text(year));
            meta.append($('<span></span>').text(item.name || item.first_air_date ? 'Серіал' : 'Фільм'));

            // Банер — це кадр: беремо горизонтальний backdrop, постер лише як запас
            var image = item.backdrop_path
                ? Lampa.TMDB.image('t/p/w780' + item.backdrop_path)
                : (item.poster_path ? Lampa.TMDB.image('t/p/w500' + item.poster_path) : '');
            if (image) banner.css('background-image', 'url(' + image + ')');

            banner.on('hover:enter click', function () {
                closePanel();
                Lampa.Activity.push({
                    url: '', component: 'full', id: item.id,
                    method: item.name || item.first_air_date ? 'tv' : 'movie',
                    card: { id: item.id }, source: 'tmdb'
                });
            });

            return banner;
        }

        /** Список тайтлів TMDB із кешем: рекомендації, подібні, частини колекції. */
        function fetchTitleList(path, callback) {
            var key = 'list_' + path.replace(/[^a-z0-9]+/gi, '_');
            var cached = LikhtarCache.get(key);
            if (cached) return callback(cached);

            var url = Lampa.TMDB.api(path + (path.indexOf('?') === -1 ? '?' : '&') +
                'api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var items = (data && (data.results || data.parts)) || [];
                if (data && data.parts) {
                    // Частини колекції — у хронології виходу
                    items.sort(function (a, b) {
                        return String(a.release_date || '9999').localeCompare(String(b.release_date || '9999'));
                    });
                }
                LikhtarCache.set(key, items, LikhtarCache.TTL.DAY);
                callback(items);
            }, function () {
                callback(null);
            });
        }

        function openTitleList(title, path) {
            openPanel(title, '', function (body) {
                body.append('<div class="likhtar-panel__loading">Завантаження…</div>');

                fetchTitleList(path, function (items) {
                    body.empty();

                    if (!items || !items.length) {
                        body.append('<div class="likhtar-panel__loading">Нічого не знайшлося</div>');
                        return;
                    }

                    items.slice(0, 20).forEach(function (item) {
                        if (item && item.id) body.append(titleRow(item));
                    });
                    refocusPanel();
                });
            });
        }

        // ===== Секції Lampa, перенесені в панель =====

        function openSection(title, node, anchor) {
            openPanel(title, '', function (body) {
                node.removeClass('likhtar-card__hidden');
                node.detach().appendTo(body);
                moved.push({ node: node, anchor: anchor });
                refocusPanel();
            });
        }

        // ===== Складання =====

        var MODULE_ICONS = {
            cast: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
            seasons: 'M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z',
            comments: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
            collection: 'M11.99 18.54l-7.37-5.73L3 14.07l9 7 9-7-1.63-1.27-7.38 5.74zM12 16l7.36-5.73L21 9l-9-7-9 7 1.63 1.27L12 16z',
            recommend: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
            similar: 'M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2z',
            dots: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z'
        };

        /** Іконка для секції, кнопку якої будуємо з її назви. */
        function iconForTitle(title) {
            if (/комент|comment|review/i.test(title)) return MODULE_ICONS.comments;
            if (/колекц|collection|франшиз/i.test(title)) return MODULE_ICONS.collection;
            if (/рекоменд|recommend/i.test(title)) return MODULE_ICONS.recommend;
            if (/подібн|схож|similar/i.test(title)) return MODULE_ICONS.similar;
            return MODULE_ICONS.dots;
        }

        /**
         * Кнопка в манері рідних кнопок Lampa: в спокої лише символ,
         * у фокусі розгортається з підписом — той самий клас, те саме
         * правило `:not(.focus) span { display: none }` з CSS Lampa.
         */
        function moduleButton(label, count, onEnter, iconPath) {
            var btn = $('<div class="full-start__button selector likhtar-module"></div>');

            btn.append('<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">' +
                '<path d="' + (iconPath || MODULE_ICONS.dots) + '"/></svg>');
            btn.append($('<span></span>').text(count ? label + ' · ' + count : label));

            btn.on('hover:enter click', onEnter);
            return btn;
        }

        /** Заголовок секції потрібен і для підпису кнопки, і щоб упізнати непотрібне. */
        function sectionTitle(line) {
            return $(line).find('.items-line__title').first().text().trim();
        }

        /**
         * Хаб «Ліхтарик»: усі розділи сторінки за однією кнопкою на місці
         * рідного «Ще». Рядок кнопок стискається до дій Lampa + наша одна,
         * а розділи відкриваються групами в бічній панелі. Вміст тягнеться
         * з готових джерел — TMDB і компонента фактів Lampa, без генерацій.
         */
        function hubEntry(label, iconPath, onEnter) {
            var row = $('<div class="likhtar-hub selector">' +
                '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
                '<path d="' + iconPath + '"/></svg>' +
                '<span class="likhtar-hub__label"></span>' +
                '<div class="likhtar-person__chevron">›</div></div>');

            row.find('.likhtar-hub__label').text(label);
            row.on('hover:enter click', onEnter);
            return row;
        }

        function openHub(movie, hero) {
            var mediaType = isSeries(movie) ? 'tv' : 'movie';

            // Кожен розділ, відкритий звідси, на «Назад» повертається сюди ж
            function fromHub(open) {
                return function () {
                    pendingPanelBack = function () { openHub(movie, hero); };
                    open();
                };
            }

            openPanel('Підсвічую найцікавіше:', '', function (body) {
                function group(title) {
                    body.append($('<div class="likhtar-panel__group"></div>').text(title));
                }

                // Перший блок — без заголовка, одразу найужиткові пункти
                body.append(hubEntry('Цікаві факти', MODULE_ICONS.dots, fromHub(function () { openWiki(movie); })));
                body.append(hubEntry('Актори та автори', MODULE_ICONS.cast, fromHub(function () { openCast(movie); })));

                if (isSeries(movie)) {
                    body.append(hubEntry('Перелік серій', MODULE_ICONS.seasons, fromHub(function () { openSeasons(movie); })));
                    body.append(hubEntry('Попередній сезон: коротко', MODULE_ICONS.comments, fromHub(function () { openSeasonRecap(movie); })));
                }

                group('Що далі');
                var franchiseSlot = $('<div></div>');
                body.append(franchiseSlot);
                collectionOf(movie, function (collection) {
                    if (!collection || !panel) return;
                    franchiseSlot.append(hubEntry(collection.name || 'Франшиза', MODULE_ICONS.collection, fromHub(function () {
                        openTitleList(collection.name || 'Франшиза', 'collection/' + collection.id);
                    })));
                    refocusPanel();
                });

                body.append(hubEntry('Рекомендації', MODULE_ICONS.recommend, fromHub(function () {
                    openTitleList('Рекомендації', mediaType + '/' + movie.id + '/recommendations');
                })));
                body.append(hubEntry('Подібні', MODULE_ICONS.similar, fromHub(function () {
                    openTitleList('Подібні', mediaType + '/' + movie.id + '/similar');
                })));

                group('Інше');
                var comments = hubScope && hubScope.find('.items-line').filter(function () {
                    return /комент|comment|review/i.test(sectionTitle($(this)));
                }).first();
                if (comments && comments.length) {
                    var anchor = comments.data('likhtar-anchor');
                    if (!anchor) {
                        anchor = $('<div class="likhtar-card__anchor"></div>').insertBefore(comments);
                        comments.data('likhtar-anchor', anchor);
                    }
                    body.append(hubEntry('Коментарі', MODULE_ICONS.comments, fromHub(function () {
                        openSection('Коментарі', comments, anchor);
                    })));
                }

                refocusPanel();
            });
        }

        // Розділи статті, де живуть саме факти, а не переказ сюжету
        var WIKI_FACT_SECTIONS = /цікав|виробництв|передістор|фільмуванн|знімальн|знімання|кастинг|створенн|розробк|музика|маркетинг|сприйняття|критик|касов|нагород|реакція|сиквел|продовженн/i;
        var WIKI_SKIP_SECTIONS = /сюжет|у ролях|акторськ|примітки|посилання|джерела|див\. також|зовнішні/i;

        /**
         * Цікаві факти з української Вікіпедії: беремо повний текст статті
         * і лишаємо тільки розділи про виробництво, знімання, сприйняття
         * тощо. Вступ і сюжет відкидаємо — це переказ, який на сторінці
         * і так уже є. Без підписок і генерацій: CORS у Вікіпедії відкритий.
         */
        function wikiFacts(movie, callback) {
            var key = 'wikifacts_' + (isSeries(movie) ? 'tv' : 'movie') + '_' + movie.id;
            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var finish = function (result) {
                LikhtarCache.set(key, result, LikhtarCache.TTL.WEEK);
                callback(result);
            };

            var title = movie.title || movie.name || '';
            var year = (movie.release_date || movie.first_air_date || '').substr(0, 4);

            var searchUrl = 'https://uk.wikipedia.org/w/api.php?action=query&list=search&format=json&origin=*' +
                '&srlimit=1&srsearch=' + encodeURIComponent(title + ' ' + year);

            $.get(searchUrl).done(function (found) {
                var hit = found && found.query && found.query.search && found.query.search[0];
                if (!hit) return finish(null);

                var extractUrl = 'https://uk.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1' +
                    '&format=json&origin=*&titles=' + encodeURIComponent(hit.title);

                $.get(extractUrl).done(function (data) {
                    var pages = data && data.query && data.query.pages;
                    var page = pages && pages[Object.keys(pages)[0]];
                    var sections = splitWikiSections(page && page.extract);

                    finish(sections.length ? { title: hit.title, sections: sections } : null);
                }).fail(function () { callback(null); });
            }).fail(function () { callback(null); });
        }

        /** Ріже plaintext-витяг на розділи за заголовками «== Назва ==». */
        function splitWikiSections(text) {
            if (!text) return [];

            var parts = String(text).split(/\n==+\s*([^=\n]+?)\s*==+\n?/);
            var sections = [];

            // parts: [вступ, назва1, текст1, назва2, текст2, …]
            for (var i = 1; i < parts.length - 1; i += 2) {
                var name = parts[i].trim();
                var bodyText = (parts[i + 1] || '').trim();

                if (!bodyText || bodyText.length < 80) continue;
                if (WIKI_SKIP_SECTIONS.test(name)) continue;
                if (!WIKI_FACT_SECTIONS.test(name)) continue;

                sections.push({
                    name: name,
                    text: bodyText.length > 1600 ? bodyText.slice(0, 1600).replace(/\s+\S*$/, '') + '…' : bodyText
                });

                if (sections.length >= 6) break;
            }

            return sections;
        }

        function openWiki(movie) {
            openPanel('Цікаві факти', movie.title || movie.name || '', function (body) {
                body.append('<div class="likhtar-panel__loading">Шукаємо у Вікіпедії…</div>');

                wikiFacts(movie, function (article) {
                    if (!panel) return;
                    body.empty();

                    if (!article) {
                        body.append('<div class="likhtar-panel__loading">У статті немає розділів із фактами</div>');
                        return;
                    }

                    article.sections.forEach(function (section) {
                        body.append($('<div class="likhtar-panel__group"></div>').text(section.name));
                        body.append($('<div class="likhtar-panel__text selector"></div>').text(section.text));
                    });

                    body.append($('<div class="likhtar-panel__loading"></div>')
                        .text('Джерело: Вікіпедія · ' + article.title));
                    refocusPanel();
                });
            });
        }

        /**
         * Переказ попереднього сезону.
         *
         * TMDB майже завжди віддає порожній опис сезону — навіть для топових
         * серіалів. Тому основне джерело — українська Вікіпедія: у неї є
         * окремі статті «Назва (N-й сезон)» зі вступом і сюжетом. TMDB
         * лишається запасним варіантом.
         */
        function wikiSeason(title, seasonNumber, callback) {
            var key = 'wikiseason_' + title.toLowerCase().replace(/[^a-zа-яіїєґ0-9]+/gi, '_') + '_' + seasonNumber;
            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var finish = function (result) {
                LikhtarCache.set(key, result, LikhtarCache.TTL.WEEK);
                callback(result);
            };

            // Стаття про сезон називається по-різному: «(2-й сезон)» або «(сезон 2)»
            var variants = [
                title + ' (' + seasonNumber + '-й сезон)',
                title + ' (сезон ' + seasonNumber + ')',
                title + ' ' + seasonNumber + ' сезон'
            ];

            function tryVariant(index) {
                if (index >= variants.length) return finish(null);

                var url = 'https://uk.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1' +
                    '&redirects=1&format=json&origin=*&titles=' + encodeURIComponent(variants[index]);

                $.get(url).done(function (data) {
                    var pages = data && data.query && data.query.pages;
                    var page = pages && pages[Object.keys(pages)[0]];
                    var text = page && page.extract;

                    if (!text || text.length < 200) return tryVariant(index + 1);

                    // Вступ статті — це і є переказ сезону; далі беремо сюжет, якщо є
                    var intro = text.split(/\n==/)[0].trim();
                    var plot = '';
                    var sections = String(text).split(/\n==+\s*([^=\n]+?)\s*==+\n?/);
                    for (var i = 1; i < sections.length - 1; i += 2) {
                        if (/сюжет|огляд|синопсис/i.test(sections[i])) {
                            plot = (sections[i + 1] || '').trim();
                            break;
                        }
                    }

                    finish({
                        title: page.title || variants[index],
                        text: (intro + (plot ? '\n\n' + plot : '')).slice(0, 3000)
                    });
                }).fail(function () { tryVariant(index + 1); });
            }

            tryVariant(0);
        }

        function openSeasonRecap(movie) {
            seasonsOf(movie, function (seasons) {
                var aired = (seasons || []).filter(function (x) {
                    return x.season_number > 0 && x.air_date &&
                        new Date(x.air_date + 'T00:00:00') <= new Date();
                });
                var prev = aired.length > 1 ? aired[aired.length - 2] : aired[aired.length - 1];

                if (!prev) return Lampa.Noty.show('Про сезони ще немає даних');

                var heading = prev.name || ('Сезон ' + prev.season_number);

                openPanel(heading, 'Коротко про сезон', function (body) {
                    body.append('<div class="likhtar-panel__loading">Шукаємо переказ…</div>');

                    var show = function (text, source) {
                        if (!panel) return;
                        body.empty();

                        if (!text) {
                            body.append('<div class="likhtar-panel__loading">Переказу цього сезону ніде немає</div>');
                            return;
                        }

                        body.append($('<div class="likhtar-panel__text selector"></div>').text(text));
                        if (source) {
                            body.append($('<div class="likhtar-panel__loading"></div>').text('Джерело: ' + source));
                        }
                        refocusPanel();
                    };

                    wikiSeason(movie.name || movie.title || '', prev.season_number, function (article) {
                        if (article) return show(article.text, 'Вікіпедія · ' + article.title);

                        // Запасний варіант — опис сезону з TMDB, якщо він узагалі є
                        if (prev.overview) return show(prev.overview, 'TMDB');

                        var url = Lampa.TMDB.api('tv/' + movie.id + '/season/' + prev.season_number +
                            '?api_key=' + getTmdbKey() + '&language=' + Lampa.Storage.get('language', 'uk'));
                        new Lampa.Reguest().silent(url, function (data) {
                            show(data && data.overview, data && data.overview ? 'TMDB' : '');
                        }, function () { show(''); });
                    });
                });
            });
        }

        var hubScope = null;   // сторінка, на якій живуть секції для хаба

        function buildModules(hero, movie) {
            var holder = hero.find('.full-start-new__buttons, .full-start__buttons').first();
            if (!holder.length) return null;
            holder.addClass('likhtar-modules');

            if (!holder.find('.likhtar-module--hub').length) {
                holder.append(moduleButton('Ліхтарик', '', function () { openHub(movie, hero); },
                    'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z')
                    .addClass('likhtar-module--hub'));
            }

            return holder;
        }

        /**
         * Кнопки для решти секцій робимо з того, що Lampa вже намалювала:
         * так у списку опиняються і коментарі, і колекція, і схоже — без
         * припущень про те, які саме секції існують у цій збірці.
         */
        function collectSections($render, holder) {
            $render.find('.items-line').each(function () {
                var line = $(this);
                if (line.data('likhtar-module')) return;

                var title = sectionTitle(line);
                if (!title) return;

                line.data('likhtar-module', true);

                // Ховаємо будь-який розділ — сторінка має лишитись в один екран.
                // Кнопку робимо лише для того, що не покрито власною панеллю.
                line.addClass('likhtar-card__hidden');
                if (SKIP_SECTIONS.test(title)) return;

                // Запам'ятовуємо сусіда, щоб повернути секцію рівно на її місце
                var anchor = $('<div class="likhtar-card__anchor"></div>');
                anchor.insertBefore(line);

                holder.append(moduleButton(title, '', function () {
                    openSection(title, line, anchor);
                }, iconForTitle(title)));
            });
        }

        /**
         * Оцінка, вік, статус, тривалість, жанри, рік і наші мітки живуть
         * окремими рядками під логотипом і розтягують перший екран.
         * Складаємо їх в одну картку збоку — там вони читаються як довідка,
         * а не як стіна тексту.
         */
        var MONTHS_UA = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
            'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];

        var CARD_STATUS = {
            'Returning Series': { text: 'Онгоїнг', mod: 'live' },
            'In Production': { text: 'У виробництві', mod: 'live' },
            'Planned': { text: 'Заплановано', mod: 'live' },
            'Ended': { text: 'Завершено', mod: 'ended' },
            'Canceled': { text: 'Скасовано', mod: 'canceled' },
            'Cancelled': { text: 'Скасовано', mod: 'canceled' },
            'Released': { text: 'Випущено', mod: 'live' }
        };

        /** Деталі для бічної картки одним запитом, із кешем на день. */
        function detailsFor(movie, callback) {
            var type = isSeries(movie) ? 'tv' : 'movie';
            var key = 'carddet_' + type + '_' + movie.id;

            var cached = LikhtarCache.get(key);
            if (cached) return callback(cached);

            var append = type === 'movie' ? 'release_dates' : 'content_ratings';
            var url = Lampa.TMDB.api(type + '/' + movie.id + '?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk') + '&append_to_response=' + append);

            new Lampa.Reguest().silent(url, function (data) {
                if (!data || !data.id) return callback(null);
                LikhtarCache.set(key, data, LikhtarCache.TTL.DAY);
                callback(data);
            }, function () {
                callback(null);
            });
        }

        function certificationOf(details) {
            try {
                if (details.release_dates) {
                    var us = details.release_dates.results.filter(function (r) { return r.iso_3166_1 === 'US'; })[0];
                    var entry = us && us.release_dates.filter(function (r) { return r.certification; })[0];
                    return entry ? entry.certification : '';
                }
                if (details.content_ratings) {
                    var rating = details.content_ratings.results.filter(function (r) { return r.iso_3166_1 === 'US'; })[0];
                    return rating ? rating.rating : '';
                }
            } catch (e) { }
            return '';
        }

        function humanDate(iso) {
            if (!iso) return '';
            var parts = String(iso).split('-');
            if (parts.length !== 3) return iso;
            return parseInt(parts[2], 10) + ' ' + (MONTHS_UA[parseInt(parts[1], 10) - 1] || '') + ' ' + parts[0];
        }

        function inDays(iso) {
            var target = new Date(iso + 'T00:00:00');
            if (isNaN(target.getTime())) return null;
            var today = new Date(); today.setHours(0, 0, 0, 0);
            return Math.round((target - today) / 86400000);
        }

        function whenText(days) {
            if (days === 0) return 'сьогодні';
            if (days === 1) return 'завтра';
            if (days > 1 && days < 30) return 'через ' + days + ' дн.';
            return '';
        }

        function shortDate(iso) {
            var parts = String(iso || '').split('-');
            return parts.length === 3 ? parts[2] + '.' + parts[1] + '.' + parts[0] : (iso || '');
        }

        /** Акцентний блок: підпис і «через N дн.» угорі, велика дата нижче. */
        function fillAccent(accent, label, iso, secondary) {
            var row = $('<div class="likhtar-metrics__arow"></div>')
                .append($('<span class="likhtar-metrics__alabel"></span>').text(label))
                .append($('<span class="likhtar-metrics__awhen"></span>').text(whenText(inDays(iso))));

            var line = $('<div class="likhtar-metrics__acode"></div>');
            if (secondary) line.append($('<span></span>').text(secondary));
            line.append($('<b></b>').text(shortDate(iso)));

            accent.empty().append(row).append(line).removeClass('likhtar-card__hidden');
        }

        function factRow(grid, name, value) {
            if (!value) return;
            grid.append($('<div class="likhtar-metrics__fname"></div>').text(name));
            grid.append($('<div class="likhtar-metrics__fvalue"></div>').text(value));
        }

        /** Те саме, але значення — готові елементи, а не текст. */
        function factNodes(grid, name, nodes) {
            if (!nodes || !nodes.length) return;

            grid.append($('<div class="likhtar-metrics__fname"></div>').text(name));
            var cell = $('<div class="likhtar-metrics__fvalue likhtar-metrics__genres"></div>');
            nodes.forEach(function (node) { cell.append(node); });
            grid.append(cell);
        }

        /**
         * Жанри клікабельні: у TMDB вони мають власні ідентифікатори, тож
         * з назви одразу відкривається підбірка. Це найкоротший шлях від
         * «сподобалось» до «покажи ще такого».
         */
        function genreChips(details, isTv) {
            return (details.genres || []).slice(0, 4).map(function (genre) {
                var chip = $('<span class="likhtar-genre selector"></span>').text(genre.name);

                chip.on('hover:enter click', function () {
                    Lampa.Activity.push({
                        url: isTv ? 'discover/tv' : 'discover/movie',
                        params: {
                            with_genres: String(genre.id),
                            sort_by: 'popularity.desc',
                            'vote_count.gte': '50'
                        },
                        title: genre.name,
                        component: 'studios_view',
                        page: 1
                    });
                });

                return chip;
            });
        }

        /**
         * Бічна картка за макетом «Редизайн блоків» (1a): рейтинг і вік,
         * ряд плашок, факти таблицею, внизу акцентний блок. Збирається
         * власною розміткою з даних TMDB — рідні елементи Lampa влаштовані
         * інакше, і дотягнути їх до макета стилями не виходить.
         */
        function buildMetrics(hero, movie) {
            if (hero.find('.likhtar-metrics').length) return;

            var body = hero.find('.full-start-new__body, .full-start__body').first();
            if (!body.length) return;

            // Рідні рядки з тими ж даними ховаємо — але не чіпаємо, щоб
            // «вимкнути новий вигляд» повертало все як було
            ['.full-start-new__rate-line', '.full-start__rate-line',
             '.full-start-new__head',
             '.full-start-new__details', '.full-start__details'
            ].forEach(function (sel) {
                hero.find(sel).first().addClass('likhtar-card__hidden');
            });

            var side = $('<div class="likhtar-side"></div>');

            // Картка навмисно НЕ selector: коли вона перехоплювала фокус,
            // до жанру доводилось іти у два кроки, а між жанрами — через
            // повернення на картку. Жанри самі є selector'ами, тож пульт
            // ходить по них напряму.
            var card = $('<div class="likhtar-metrics"></div>');

            // Ярус 1: рейтинг і вік
            var top = $('<div class="likhtar-metrics__top"></div>');
            var rating = movie.vote_average ? Number(movie.vote_average).toFixed(1) : '';
            if (rating && rating !== '0.0') {
                top.append($('<div class="likhtar-metrics__rating"></div>')
                    .append($('<span class="likhtar-metrics__num"></span>').text(rating))
                    .append('<span class="likhtar-metrics__src">TMDB</span>'));
            }
            var age = $('<div class="likhtar-metrics__age likhtar-card__hidden"></div>');
            top.append(age);
            card.append(top);

            // Ярус 2: статус + мітки якості (їх домалює модуль міток)
            // Один елемент замість вкладеного: порожній ряд ховається через :empty,
            // а мітки якості приземляються сюди ж
            var chips = $('<div class="likhtar-metrics__chips likhtar-metrics__badges"></div>');
            card.append(chips);

            // Ярус 3: факти
            var facts = $('<div class="likhtar-metrics__facts"></div>');
            card.append(facts);

            // Акцент внизу
            var accent = $('<div class="likhtar-metrics__accent likhtar-card__hidden"></div>');
            card.append(accent);

            side.append(card);
            body.append(side);
            mountTrailerSlot(side, movie);

            detailsFor(movie, function (details) {
                if (!details) return;

                var cert = certificationOf(details);
                if (cert) age.text(cert).removeClass('likhtar-card__hidden');

                var status = CARD_STATUS[details.status];
                if (status) factRow(facts, 'Статус', status.text);

                var year = (details.release_date || details.first_air_date || '').substr(0, 4);
                var country = details.production_countries && details.production_countries[0]
                    ? details.production_countries[0].name : '';
                factRow(facts, 'Рік', [year, country].filter(Boolean).join(' · '));

                if (isSeries(movie)) {
                    var seasons = details.number_of_seasons
                        ? details.number_of_seasons + (details.number_of_episodes ? ' · ' + details.number_of_episodes + ' серій' : '')
                        : '';
                    factRow(facts, 'Сезони', seasons);
                } else if (details.runtime) {
                    var h = Math.floor(details.runtime / 60), m = details.runtime % 60;
                    factRow(facts, 'Тривалість', (h ? h + ' год ' : '') + m + ' хв');
                }

                factNodes(facts, 'Жанр', genreChips(details, isSeries(movie)));

                factRow(facts, 'Реліз', humanDate(details.release_date || details.first_air_date));

                refreshNavigation();

                if (details.budget && details.budget > 0) {
                    factRow(facts, 'Бюджет', '$ ' + String(details.budget).replace(/\B(?=(\d{3})+(?!\d))/g, ' '));
                }

                // Акцент: наступна серія — або, для фільму, кінець сеансу і цифра
                var next = details.next_episode_to_air;
                if (next && next.air_date) {
                    var code = 'S' + ('0' + (next.season_number || 0)).slice(-2) +
                        'E' + ('0' + (next.episode_number || 0)).slice(-2);
                    fillAccent(accent, 'Наступна серія', next.air_date, code);
                    return;
                }

                if (isSeries(movie)) return;

                // Для фільму головна новина того ж штибу — коли його можна
                // буде подивитись удома, тож показуємо в тому самому місці
                LikhtarSections.getDigitalDate(details.id, function (digital) {
                    if (digital && inDays(digital) >= 0) {
                        fillAccent(accent, 'В цифрі', digital, '');
                        return;
                    }

                    if (!details.runtime) return;

                    var end = new Date(Date.now() + details.runtime * 60000);
                    accent.empty()
                        .append($('<div class="likhtar-metrics__arow"></div>')
                            .append('<span class="likhtar-metrics__alabel">Закінчиться</span>')
                            .append($('<span class="likhtar-metrics__awhen"></span>')
                                .text('о ' + ('0' + end.getHours()).slice(-2) + ':' + ('0' + end.getMinutes()).slice(-2))));
                    accent.removeClass('likhtar-card__hidden');
                });
            });
        }

        // ===== Беззвучне превʼю трейлера =====

        var DWELL_MS = 2500;
        var trailerTimer = null;

        function trailerKey(movie, callback) {
            var type = isSeries(movie) ? 'tv' : 'movie';
            var key = 'trailer_' + type + '_' + movie.id;

            var cached = LikhtarCache.get(key);
            if (cached !== undefined) return callback(cached);

            var url = Lampa.TMDB.api(type + '/' + movie.id + '/videos?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk'));

            new Lampa.Reguest().silent(url, function (data) {
                var videos = (data && data.results) || [];
                var pick = videos.filter(function (v) {
                    return v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser');
                }).sort(function (a, b) {
                    return (a.type === 'Trailer' ? 0 : 1) - (b.type === 'Trailer' ? 0 : 1);
                })[0];

                var found = pick ? pick.key : null;
                LikhtarCache.set(key, found, LikhtarCache.TTL.WEEK);
                callback(found);
            }, function () {
                callback(null);
            });
        }

        /**
         * Повноекранний трейлер власною накладкою.
         *
         * Через плеєр Lampa це працювало лише перший раз: удруге він
         * зупинявся на «натисніть Плей». Своя накладка не залежить від його
         * внутрішнього стану — поводиться однаково щоразу.
         */
        function openCinema(key, side, movie) {
            stopTrailer();
            $('.likhtar-cinema').remove();

            var cinema = $('<div class="likhtar-cinema"></div>');
            var frame = $('<iframe allow="autoplay; encrypted-media; fullscreen" frameborder="0"></iframe>');

            frame.attr('src', LikhtarNet.workerUrl() + '/yt?sound=1&v=' + encodeURIComponent(key));
            cinema.append(frame);
            cinema.append('<div class="likhtar-cinema__hint">Назад — закрити</div>');
            $('body').append(cinema);

            function close() {
                cinema.remove();
                Lampa.Controller.toggle('full_start');
                if (side && side.closest('body').length) mountTrailerSlot(side, movie);
            }

            Lampa.Controller.add('likhtar_cinema', {
                toggle: function () { Lampa.Controller.collectionSet(cinema[0]); },
                back: close,
                left: close,
                right: function () { },
                up: function () { },
                down: function () { }
            });

            Lampa.Controller.toggle('likhtar_cinema');
        }

        var navRefreshTimer = null;

        /** Просить Lampa перечитати набір елементів, доступних пульту. */
        function refreshNavigation() {
            if (navRefreshTimer) clearTimeout(navRefreshTimer);

            navRefreshTimer = setTimeout(function () {
                navRefreshTimer = null;
                try {
                    var active = Lampa.Controller.enabled();
                    if (active && active.name === 'full_start') Lampa.Controller.toggle('full_start');
                } catch (e) { }
            }, 300);
        }

        function stopTrailer() {
            if (trailerTimer) clearTimeout(trailerTimer);
            trailerTimer = null;
            $('.likhtar-preview').remove();
            $('.likhtar-side-button').remove();
        }

        /**
         * Превʼю стартує не одразу, а після паузи: інакше кожен випадковий
         * захід на сторінку качав би відео. Звук лишається вимкненим —
         * автозапуск зі звуком браузери й так блокують, — а повний екран
         * зі звуком відкриває рідний плеєр Lampa.
         */
        /**
         * Одне місце — два стани. Коли превʼю ввімкнене й сервер указано,
         * показуємо сам трейлер; інакше — кнопку, яка відкриває його на весь
         * екран. Так на слабких пристроях місце не пустує, а на потужних
         * кнопка не дублює те, що вже грає поруч.
         */
        function mountTrailerSlot(side, movie) {
            var preview = isSettingEnabled('likhtar_trailer_preview', false) && LikhtarNet.hasWorker();

            if (preview) mountTrailer(side, movie);
            else mountTrailerButton(side, movie);
        }

        function mountTrailerButton(side, movie) {
            trailerKey(movie, function (key) {
                if (!key || !side.closest('body').length) return;
                if (side.find('.likhtar-side-button').length) return;

                var btn = $('<div class="likhtar-side-button selector">' +
                    '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">' +
                    '<path d="M8 5v14l11-7z"/></svg><span>Трейлер UA</span></div>');

                btn.on('hover:enter click', function () {
                    if (LikhtarNet.hasWorker()) return openCinema(key, side, movie);

                    // Без сервера лишається рідний плеєр Lampa
                    var item = {
                        title: movie.title || movie.name || 'Трейлер',
                        id: key, youtube: true,
                        url: 'https://www.youtube.com/watch?v=' + key
                    };
                    if (Lampa.Manifest.app_digital >= 183) {
                        Lampa.Player.play(item);
                        Lampa.Player.playlist([item]);
                    } else {
                        Lampa.YouTube.play(key);
                    }
                });

                side.append(btn);
                refreshNavigation();
            });
        }

        function mountTrailer(side, movie) {
            stopTrailer();
            if (!isSettingEnabled('likhtar_trailer_preview', false)) return;
            if (!LikhtarNet.hasWorker()) return;   // без сервера буде лише плашка помилки

            trailerTimer = setTimeout(function () {
                trailerKey(movie, function (key) {
                    if (!key || !side.closest('body').length) return;

                    var box = $('<div class="likhtar-preview selector"></div>');
                    var frame = $('<iframe allow="autoplay" frameborder="0" scrolling="no"></iframe>');

                    // Плеєр YouTube відмовляється грати (помилка 153), коли не бачить
                    // походження запиту, а застосунок Lampa відкриває сторінки не з
                    // веб-адреси. Тому вантажимо його через сторінку нашого сервера:
                    // для YouTube це нормальний домен, і питань більше немає.
                    frame.attr('src', LikhtarNet.workerUrl() + '/yt?v=' + encodeURIComponent(key));

                    box.append(frame);
                    box.append('<div class="likhtar-preview__hint">Трейлер · відкрити зі звуком</div>');

                    box.on('hover:enter click', function () {
                        openCinema(key, side, movie);
                    });

                    side.append(box);
                    refreshNavigation();
                });
            }, DWELL_MS);
        }

        /**
         * Розтягує блок героя до низу екрана.
         *
         * Міряємо відступ від початку сторінки, а не від краю вікна:
         * getBoundingClientRect().top залежить від прокрутки, і на вже
         * прокрученій сторінці дає від'ємне значення — блок роздувався
         * вище екрана, а вміст ішов під нижній край.
         */
        function pinToBottom(hero) {
            var heroBody = hero.find('.full-start-new__body, .full-start__body').first();
            if (!heroBody.length) return;

            setTimeout(function () {
                try {
                    heroBody.css('min-height', '');   // міряємо без власного впливу на верстку

                    var top = 0;
                    for (var node = heroBody[0]; node; node = node.offsetParent) top += node.offsetTop;

                    var free = window.innerHeight - top - 16;
                    // Верхня межа рятує від зациклення, нижня — від смужки замість екрана
                    if (free > 320 && free <= window.innerHeight) heroBody.css('min-height', free + 'px');
                } catch (e) { }
            }, 50);
        }

        /**
         * Lampa передає різні вузли залежно від збірки: іноді всю сторінку,
         * іноді лише обгортку героя. Секції — опис, актори, коментарі —
         * можуть лежати не всередині нього, а поруч, тож область пошуку
         * розширюємо, поки не знайдемо їх.
         */
        function scopeFor($render, hero) {
            var candidates = [
                $render,
                hero.closest('.activity__body'),
                hero.closest('.activity'),
                $('.activity--active').first(),
                $('body')
            ];

            for (var i = 0; i < candidates.length; i++) {
                var node = candidates[i];
                if (node && node.length && node.find('.items-line, .full-descr').length) return node;
            }

            return $render;
        }

        function watchSections(scope, holder) {
            if (sectionObserver) sectionObserver.disconnect();
            if (typeof MutationObserver === 'undefined' || !scope.length) return;

            var timer = null;

            // Секції довантажуються по черзі — чекаємо, поки Lampa домалює
            sectionObserver = new MutationObserver(function () {
                if (timer) return;
                timer = setTimeout(function () {
                    timer = null;
                    try {
                        collectSections(scope, holder);
                        refreshNavigation();
                    } catch (e) { }
                }, 300);
            });

            sectionObserver.observe(scope[0], { childList: true, subtree: true });
        }

        function apply(movie, renderEl) {
            if (!isEnabled() || !movie || !renderEl) return;

            var $render = $(renderEl);

            // Вузол може і сам бути блоком героя, і містити його
            var hero = $render.filter('.full-start-new, .full-start');
            if (!hero.length) hero = $render.find('.full-start-new, .full-start').first();
            if (!hero.length) return;

            var scope = scopeFor($render, hero);

            scope.addClass('likhtar-card');
            hero.addClass('likhtar-card__hero');

            // Lampa вже поклала кадр із фільму фоном сторінки — свій не малюємо,
            // інакше зображень стає два. Розтягуємо її власний і затемнюємо.
            var nativeBg = scope.find('.full-start__background').first();
            if (nativeBg.length) {
                var bgRoot = nativeBg.parent();
                bgRoot.addClass('likhtar-card__bgroot');

                if (!bgRoot.children('.likhtar-card__scrim').length) {
                    $('<div class="likhtar-card__scrim"></div>').insertAfter(nativeBg);
                }
            }

            // Опис живе окремим блоком нижче — піднімаємо його в перший екран
            var descr = scope.find('.full-descr__text').first();
            var details = hero.find('.full-start-new__details, .full-start__details').first();
            if (descr.length && details.length && !hero.find('.likhtar-card__descr').length) {
                var fullText = descr.text();
                var short = descr.clone().removeAttr('class').addClass('likhtar-card__descr selector');

                // На екрані опис обрізаний — повний текст відкривається панеллю
                short.on('hover:enter click', function () {
                    openPanel('Опис', '', function (body) {
                        body.append($('<div class="likhtar-panel__text selector"></div>').text(fullText));
                        refocusPanel();
                    });
                });

                short.insertAfter(details);
            }

            buildMetrics(hero, movie);

            pinToBottom(hero);

            hubScope = scope;

            var holder = buildModules(hero, movie);
            if (!holder) return;

            scope.find('.full-descr').addClass('likhtar-card__hidden');
            collectSections(scope, holder);
            watchSections(scope, holder);

            // Lampa збирає список елементів для пульта один раз при відкритті
            // сторінки. Наші кнопки й превʼю зʼявляються пізніше, тож без
            // перезбирання фокус на них просто не переходить.
            refreshNavigation();

            console.log('Ліхтар: нова картка — розділів', scope.find('.items-line').length,
                '· опис', descr.length ? 'знайдено' : 'немає');
        }

        function addStyles() {
            if ($('style#likhtar-card-css').length) return;

            $('head').append('<style id="likhtar-card-css">' +
                '.likhtar-card__hidden { display: none !important; }' +
                '.likhtar-card__anchor { display: none; }' +

                /* Герой */
                'body.likhtar-card-on .full-start-new__body, body.likhtar-card-on .full-start__body' +
                ' { position: relative; min-height: 26em; }' +
                /* Рідні кнопки й наші розділи — один ряд із прокруткою, як у Lampa:
                   перенос на другий ряд ламає навігацію пультом (вниз по діагоналі
                   Navigator не ходить) */
                'body.likhtar-card-on .full-start-new__buttons, body.likhtar-card-on .full-start__buttons' +
                ' { display: flex; flex-wrap: nowrap; align-items: center; gap: .7em; }' +
                'body.likhtar-card-on .full-start-new__buttons .likhtar-module { margin: 0; flex: 0 0 auto; }' +
                /* Рідний фон Lampa прив'язаний до вмісту сторінки, тому під шапкою
                   лишалася сіра смуга. Кріпимо його до екрана — тоді кадр
                   заходить і під шапку, і на всю висоту. */
                'body.likhtar-card-on .full-start__background { position: fixed !important;' +
                ' left: 0 !important; top: 0 !important; width: 100vw !important;' +
                ' height: 100vh !important; opacity: 1 !important; object-fit: cover;' +
                ' -webkit-mask-image: none !important; mask-image: none !important; }' +
                '.likhtar-card__bgroot { position: relative; }' +
                '.likhtar-card__scrim { position: fixed; left: 0; top: 0; width: 100vw; height: 100vh;' +
                ' z-index: -1; pointer-events: none;' +
                ' background: linear-gradient(100deg, rgba(7,9,15,.97) 0%, rgba(7,9,15,.9) 32%,' +
                ' rgba(7,9,15,.55) 58%, rgba(7,9,15,.1) 85%, rgba(7,9,15,.05) 100%),' +
                ' linear-gradient(to top, rgba(7,9,15,.95) 0%, rgba(7,9,15,.2) 40%, transparent 70%); }' +

                /* Бічна картка за макетом 1a — власна розмітка */
                '.likhtar-side { position: absolute; top: .6em; right: 0; width: 20em;' +
                ' display: flex; flex-direction: column; gap: .8em; }' +
                '.likhtar-preview { position: relative; padding-top: 56.25%; border-radius: 1em;' +
                ' overflow: hidden; background: #000; border: 1px solid rgba(255,255,255,.08); }' +
                '.likhtar-preview iframe { position: absolute; inset: 0; width: 100%; height: 100%;' +
                ' pointer-events: none; }' +
                '.likhtar-preview.focus { border-color: #eec37a; box-shadow: 0 0 0 2px #eec37a; }' +
                '.likhtar-side-button { display: flex; align-items: center; justify-content: center;' +
                ' gap: .6em; padding: .9em 1.1em; border-radius: 1.1em; font-weight: 600;' +
                ' background: rgba(14,14,17,.4); border: 1px solid rgba(255,255,255,.08);' +
                ' backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px); }' +
                '.likhtar-side-button svg { width: 1.4em; height: 1.4em; flex: 0 0 auto; }' +
                '.likhtar-side-button.focus { background: #fff; color: #000; border-color: #fff; }' +
                '.likhtar-cinema { position: fixed; inset: 0; z-index: 200; background: #000; }' +
                '.likhtar-cinema iframe { width: 100%; height: 100%; border: 0; }' +
                '.likhtar-cinema__hint { position: absolute; left: 1.5em; bottom: 1em; font-size: .85em;' +
                ' color: rgba(255,255,255,.55); pointer-events: none; }' +
                '.likhtar-preview__hint { position: absolute; left: 0; right: 0; bottom: 0;' +
                ' padding: .5em .8em; font-size: .78em; color: rgba(233,233,236,.8);' +
                ' background: linear-gradient(to top, rgba(8,8,10,.9), transparent); }' +
                '.likhtar-metrics { position: relative; width: 100%;' +
                ' background: rgba(14,14,17,.4); border: 1px solid rgba(255,255,255,.08);' +
                ' border-radius: 1.1em; overflow: hidden; display: flex; flex-direction: column;' +
                ' backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px); }' +


                '.likhtar-metrics__top { display: flex; align-items: flex-start;' +
                ' justify-content: space-between; padding: 1.3em 1.3em 1em; }' +
                '.likhtar-metrics__rating { display: flex; align-items: baseline; gap: .55em; }' +
                '.likhtar-metrics__num { font-size: 2.7em; font-weight: 800; line-height: 1;' +
                ' letter-spacing: -.03em; color: #eec37a; }' +
                '.likhtar-metrics__src { font-size: .72em; font-weight: 700; letter-spacing: .16em;' +
                ' color: rgba(233,233,236,.45); }' +
                '.likhtar-metrics__age { border: 1px solid rgba(255,255,255,.22); border-radius: .45em;' +
                ' padding: .2em .6em; font-size: .82em; font-weight: 700; color: rgba(233,233,236,.75);' +
                ' align-self: flex-start; }' +

                '.likhtar-metrics__chips { display: flex; flex-wrap: wrap; align-items: center;' +
                ' gap: .5em; padding: 0 1.3em 1.2em; }' +
                '.likhtar-metrics__chips:empty { display: none; }' +
                '.likhtar-metrics__status { display: inline-flex; align-items: center; gap: .5em;' +
                ' height: 2.1em; padding: 0 .8em; border-radius: .55em; background: rgba(255,255,255,.07);' +
                ' font-size: .82em; font-weight: 600; color: rgba(233,233,236,.82); }' +
                '.likhtar-metrics__status i { width: .5em; height: .5em; border-radius: 50%;' +
                ' background: #3fb46a; }' +
                '.likhtar-metrics__status--ended i { background: rgba(233,233,236,.4); }' +
                '.likhtar-metrics__status--canceled i { background: #d9534f; }' +
                '.likhtar-metrics__badges { display: inline-flex; flex-wrap: wrap; gap: .5em; }' +
                '.likhtar-metrics__badges .likhtar-full-badge { background: rgba(255,255,255,.07) !important;' +
                ' border: none !important; border-radius: .55em !important; height: 2.1em;' +
                ' display: inline-flex; align-items: center; padding: 0 .8em !important; margin: 0 !important;' +
                ' font-size: .82em !important; font-weight: 700 !important;' +
                ' letter-spacing: .03em; color: rgba(233,233,236,.82) !important; }' +

                '.likhtar-metrics__facts { display: grid; grid-template-columns: 6.2em 1fr;' +
                ' gap: .55em .9em; padding: 1.1em 1.3em; border-top: 1px solid rgba(255,255,255,.08); }' +
                '.likhtar-metrics__facts:empty { display: none; }' +
                '.likhtar-metrics__fname { font-size: .85em; color: rgba(233,233,236,.42); }' +
                '.likhtar-metrics__fvalue { font-size: .92em; font-weight: 600; line-height: 1.4; }' +
                '.likhtar-metrics__genres { display: flex; flex-wrap: wrap; gap: .35em; }' +
                '.likhtar-genre { padding: .1em .45em; margin: -.1em 0; border-radius: .4em;' +
                ' border: 1px solid rgba(255,255,255,.25); }' +
                '.likhtar-genre.focus { background: #fff; color: #000; border-color: #fff; }' +

                '.likhtar-metrics__accent { display: flex; flex-direction: column; gap: .55em;' +
                ' padding: 1.1em 1.3em 1.25em; border-top: 1px solid rgba(255,255,255,.08);' +
                ' background: rgba(255,255,255,.03); }' +
                '.likhtar-metrics__arow { display: flex; align-items: center; justify-content: space-between; }' +
                '.likhtar-metrics__alabel { font-size: .72em; font-weight: 700; letter-spacing: .16em;' +
                ' text-transform: uppercase; color: rgba(233,233,236,.45); }' +
                '.likhtar-metrics__awhen { font-size: .85em; font-weight: 700; color: #eec37a; }' +
                '.likhtar-metrics__acode { display: flex; align-items: baseline; gap: .7em; }' +
                /* Головне тут — дата, а не номер серії: саме її шукають очима */
                '.likhtar-metrics__acode b { font-size: 1.4em; font-weight: 800; letter-spacing: -.01em; }' +
                '.likhtar-metrics__acode span { font-size: .95em; font-weight: 600;' +
                ' color: rgba(233,233,236,.45); }' +

                /* Дубль плашок під логотипом ховаємо — вони тепер у картці */
                'body.likhtar-card-on .likhtar-info-line { display: none !important; }' +
                'body.likhtar-card-on .full-start-new__left, body.likhtar-card-on .full-start__left' +
                ' { display: none !important; }' +
                'body.likhtar-card-on .full-start-new__right, body.likhtar-card-on .full-start__right' +
                ' { position: relative; z-index: 1; max-width: 60%; padding-right: 1em; }' +
                /* Рідні кнопки під новий вигляд: головна — світла пігулка, решта круглі */
                'body.likhtar-card-on .full-start__button { border-radius: 999px !important;' +
                ' background: rgba(255,255,255,.14) !important; }' +
                'body.likhtar-card-on .full-start__button.focus { background: #fff !important; color: #000 !important; }' +
                'body.likhtar-card-on .full-start__button.focus svg { fill: #000 !important; }' +
                'body.likhtar-card-on .full-start-new__reactions { display: none !important; }' +
                /* Рідне «Ще» замінює хаб «Ліхтарик»; самі дії викликаються з нього */
                'body.likhtar-card-on .button--options { display: none !important; }' +
                /* Рідна кнопка «Деталі» дублює нашу панель */
                'body.likhtar-card-on .full-start__button.view--category,' +
                ' body.likhtar-card-on .button--details { display: none !important; }' +
                '.likhtar-card__descr { font-size: 1.08em; line-height: 1.5; max-width: 38em;' +
                ' margin: .8em 0 .2em; padding: 1em 1.2em; border-radius: 1em;' +
                ' background: rgba(14,14,17,.5); border: 1px solid rgba(255,255,255,.07);' +
                ' backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);' +
                ' color: rgba(233,233,236,.78);' +
                /* Довжину тримає обрізання по рядках — жорстких меж не ставимо */
                ' display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;' +
                ' overflow: hidden; }' +
                '.likhtar-card__descr.focus { border-color: rgba(255,255,255,.6);' +
                ' background: rgba(20,22,28,.75); }' +
                '.likhtar-panel__text { font-size: 1.05em; line-height: 1.6; padding: .6em;' +
                ' color: rgba(233,233,236,.85); white-space: pre-line; border-radius: .6em; }' +
                '.likhtar-panel__text.focus { background: rgba(255,255,255,.08); }' +

                /* Кнопки розділів */
                '.likhtar-modules { display: flex; flex-wrap: wrap; gap: .7em; margin-top: 1.2em;' +
                ' position: relative; z-index: 1; }' +
                /* Кнопки розділів успадковують вигляд рідних; своє — лише дрібниці */
                '.likhtar-module svg { width: 1.5em; height: 1.5em; }' +
                '.likhtar-module--hub svg { fill: #ffc700; }' +
                '.likhtar-module--hub.focus svg { fill: #000; }' +

                /* Панель */
                '.likhtar-panel { position: fixed; top: 0; right: 0; bottom: 0; width: 30em; z-index: 90;' +
                ' background: rgba(10,12,18,.96); border-left: 1px solid rgba(255,255,255,.1);' +
                ' display: flex; flex-direction: column; transform: translateX(100%);' +
                ' transition: transform .2s ease-out; }' +
                '.likhtar-panel--open { transform: none; }' +
                '.likhtar-panel__head { padding: 1.4em 1.4em .4em; }' +
                '.likhtar-panel__title { font-size: 1.4em; font-weight: 700; color: #ffc700; }' +
                '.likhtar-panel__sub { font-size: .85em; opacity: .5; margin-top: .2em; }' +
                '.likhtar-panel__body { flex: 1; overflow: auto; padding: .6em 1em 1em; }' +
                '.likhtar-panel__hint { padding: .8em 1.4em; font-size: .8em; opacity: .45;' +
                ' border-top: 1px solid rgba(255,255,255,.08); }' +
                '.likhtar-panel__group { font-size: .72em; letter-spacing: .14em; text-transform: uppercase;' +
                ' color: #ffc700; padding: 1em .6em .4em; }' +
                '.likhtar-panel__loading { padding: 1em .6em; opacity: .6; }' +

                /* Людина */
                '.likhtar-person { display: flex; align-items: center; gap: .9em; padding: .6em;' +
                ' border-radius: .7em; }' +
                '.likhtar-person.focus { background: rgba(255,255,255,.16); }' +
                '.likhtar-person__ava { width: 3.2em; height: 3.2em; border-radius: 50%; flex: 0 0 auto;' +
                ' background: #2a3450 center/cover no-repeat; display: flex; align-items: center;' +
                ' justify-content: center; font-weight: 700; }' +
                '.likhtar-person__name { font-weight: 600; }' +
                '.likhtar-person__role { font-size: .85em; opacity: .55; }' +
                '.likhtar-person__chevron { margin-left: auto; opacity: .35; font-size: 1.4em; }' +

                /* Сезони та серії */
                '.likhtar-season { display: flex; align-items: center; gap: .9em; padding: .8em .6em;' +
                ' border-radius: .7em; }' +
                '.likhtar-season.focus { background: rgba(255,255,255,.16); }' +
                '.likhtar-season__name { font-weight: 600; }' +
                '.likhtar-season__meta { font-size: .85em; opacity: .55; }' +
                '.likhtar-episode { display: flex; align-items: flex-start; gap: .8em; padding: .6em;' +
                ' border-radius: .6em; }' +
                '.likhtar-episode__num { flex: 0 0 1.8em; text-align: center; font-weight: 700; opacity: .5; }' +
                '.likhtar-episode__text { flex: 1; min-width: 0; }' +
                '.likhtar-episode__name { font-weight: 600; font-size: .95em; }' +
                '.likhtar-episode__descr { font-size: .8em; opacity: .5; overflow: hidden;' +
                ' text-overflow: ellipsis; white-space: nowrap; }' +
                '.likhtar-episode__date { flex: 0 0 auto; font-size: .8em; padding: .2em .55em;' +
                ' border-radius: .4em; background: rgba(255,255,255,.1); }' +
                /* Те, що вже вийшло, притлумлюємо; те, що попереду, підсвічуємо */
                '.likhtar-episode--aired { opacity: .55; }' +
                '.likhtar-episode__date--soon { background: linear-gradient(135deg,#0057b7,#0072e8); }' +
                '.likhtar-episode__date--upcoming { background: rgba(46,160,67,.8); }' +
                '.likhtar-episode__date--unknown { opacity: .5; }' +
                '.likhtar-episode.focus { background: rgba(255,255,255,.16); }' +
                '.likhtar-episode__still { width: 100%; padding-top: 56%; border-radius: .7em;' +
                ' background: #16181f center/cover no-repeat; margin-bottom: .8em; }' +

                /* Рядки хаба «Ліхтарик» */
                '.likhtar-hub { display: flex; align-items: center; gap: .9em; padding: .75em .7em;' +
                ' border-radius: .7em; }' +
                '.likhtar-hub.focus { background: rgba(255,255,255,.16); }' +
                '.likhtar-hub svg { width: 1.4em; height: 1.4em; flex: 0 0 auto; opacity: .8; }' +
                '.likhtar-hub__label { flex: 1; font-weight: 600; }' +

                /* Списки тайтлів у панелі — широкі банери 16:9 (макет 3a) */
                '.likhtar-title { position: relative; padding-top: 56%; border-radius: 1em;' +
                ' overflow: hidden; margin: 0 .2em .9em; background: #16181f center/cover no-repeat; }' +
                '.likhtar-title.focus { box-shadow: 0 0 0 2px #eec37a, 0 16px 36px rgba(0,0,0,.5); }' +
                '.likhtar-title__shade { position: absolute; inset: 0;' +
                ' background: linear-gradient(0deg, rgba(8,8,10,.92) 0%, rgba(8,8,10,.25) 48%,' +
                ' rgba(8,8,10,0) 78%); pointer-events: none; }' +
                '.likhtar-title__caption { position: absolute; left: 1em; right: 1em; bottom: .85em; }' +
                '.likhtar-title__name { font-size: 1.15em; font-weight: 800; letter-spacing: -.015em;' +
                ' overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }' +
                '.likhtar-title__meta { display: flex; align-items: center; gap: .6em; margin-top: .3em;' +
                ' font-size: .82em; color: rgba(233,233,236,.7); }' +
                '.likhtar-title__meta span + span:before { content: ""; display: inline-block;' +
                ' width: 3px; height: 3px; border-radius: 50%; background: rgba(255,255,255,.3);' +
                ' margin-right: .6em; vertical-align: middle; }' +
                '.likhtar-title__rate { font-weight: 800; color: #eec37a; }' +

                /* Перенесена секція має вміщатись у вужчу панель */
                '.likhtar-panel .items-line { margin: 0; }' +
                '.likhtar-panel .items-line__title { font-size: 1em; }' +
                '</style>');
        }

        return {
            init: function () {
                addStyles();
                if (isEnabled()) $('body').addClass('likhtar-card-on');

                // «Вниз» з останнього ряду кнопок Lampa віддає прихованим
                // розділам — фокус провалюється в порожнечу без вороття.
                // Перехоплюємо реєстрацію контролера сторінки і глушимо
                // перехід, коли рухатись справді нікуди.
                var originalAdd = Lampa.Controller.add;
                Lampa.Controller.add = function (name, controller) {
                    if (name === 'full_start' && isEnabled() && controller && controller.down) {
                        controller.down = function () {
                            if (Navigator.canmove('down')) Navigator.move('down');
                        };
                    }
                    return originalAdd.call(Lampa.Controller, name, controller);
                };

                if (!Lampa.Listener || !Lampa.Listener.follow) return;
                Lampa.Listener.follow('full', function (e) {
                    // Різні збірки шлють подію під різними назвами
                    if (e.type !== 'complite' && e.type !== 'complete') return;

                    try {
                        var movie = e.data && e.data.movie;
                        var renderEl = e.object && e.object.activity && e.object.activity.render && e.object.activity.render();
                        apply(movie, renderEl);
                    } catch (err) {
                        console.log('Ліхтар: не вдалося перебудувати картку', err);
                    }
                });

                // Виходячи зі сторінки, панель треба прибрати за собою
                Lampa.Listener.follow('activity', function (e) {
                    if (e.type === 'archive' || e.type === 'destroy') {
                        closePanel();
                        stopTrailer();
                        $('.likhtar-cinema').remove();
                    }
                });
            }
        };
    })();

    // =================================================================
    // ЛІХТАРИК: ВІЛЬНИЙ ЗАПИТ ДО МОДЕЛІ
    // =================================================================
    /**
     * Питання ставиться з телефона — набирати текст пультом мука, — а модель
     * повертає лише назви. Шукає їх у TMDB телевізор: у нього є ключ, і саме
     * там відсіюються вигадані фільми, яких база не знає.
     */
    var LikhtarAsk = (function () {
        var POLL_INTERVAL = 2000;
        var POLL_LIMIT = 300;

        function start() {
            var worker = LikhtarNet.workerUrl();
            if (!worker) return Lampa.Noty.show('Спершу вкажіть адресу сервера Ліхтаря в налаштуваннях');

            $.ajax({
                url: worker + '/api/session',
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ config: {} })
            }).done(function (data) {
                if (!data || !data.code) return Lampa.Noty.show('Сервер не видав код');
                showModal(worker, data.code);
            }).fail(function () {
                Lampa.Noty.show('Не вдалося зв\'язатися із сервером Ліхтаря');
            });
        }

        function showModal(worker, code) {
            var target = worker + '/ask?s=' + code;
            var html = $('<div class="likhtar-pair"></div>');

            html.append('<div class="likhtar-pair__hint">Наведіть камеру й опишіть, що хочеться подивитись</div>');
            html.append($('<img class="likhtar-pair__qr">').attr('src', worker + '/api/qr?text=' + encodeURIComponent(target)));
            html.append($('<div class="likhtar-pair__code"></div>').text(code));

            var status = $('<div class="likhtar-pair__status">Очікуємо на запитання…</div>');
            html.append(status);

            var polls = 0, timer = null, closed = false;

            function stop() {
                closed = true;
                if (timer) clearTimeout(timer);
            }

            function poll() {
                if (closed) return;

                if (++polls > POLL_LIMIT) {
                    status.text('Час сесії вичерпано — спробуйте ще раз');
                    return;
                }

                $.get(worker + '/api/session/' + code).done(function (data) {
                    if (closed) return;

                    var ai = data && data.action && data.action.ai;
                    if (ai && ai.titles && ai.titles.length) {
                        stop();
                        Lampa.Modal.close();

                        Lampa.Activity.push({
                            url: '',
                            title: ai.query || 'Підказка Ліхтарика',
                            component: 'likhtar_chronology',
                            chronology_items: ai.titles,
                            numbered: false,
                            verify_year: true,     // вигадані моделлю фільми відсіються на пошуку
                            page: 1
                        });
                        return;
                    }

                    timer = setTimeout(poll, POLL_INTERVAL);
                }).fail(function () {
                    if (!closed) timer = setTimeout(poll, POLL_INTERVAL);
                });
            }

            Lampa.Modal.open({
                title: 'Запитати Ліхтарика',
                html: html,
                size: 'medium',
                onBack: function () {
                    stop();
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('content');
                }
            });

            timer = setTimeout(poll, POLL_INTERVAL);
        }

        return { start: start };
    })();

    // =================================================================
    // КІНОРУЛЕТКА
    // =================================================================
    /**
     * Телевізор готує колоду фільмів і показує QR, далі все відбувається
     * на телефоні: гортати великі постери пальцем набагато приємніше, ніж
     * клацати пультом. Обраний фільм відкривається на телевізорі.
     */
    var LikhtarRoulette = (function () {
        var DECK_SIZE = 30;
        var RANDOM_PAGES = 5;
        var POLL_INTERVAL = 2000;
        var POLL_LIMIT = 300;          // ~10 хвилин, як і сесія на сервері

        /** Колоду тримаємо компактною: у сесії обмежений розмір, а телефону вистачить постера й короткого опису. */
        function toCard(movie) {
            return {
                id: movie.id,
                method: movie.name || movie.first_air_date ? 'tv' : 'movie',
                title: movie.title || movie.name || '',
                year: (movie.release_date || movie.first_air_date || '').substr(0, 4),
                rating: movie.vote_average ? movie.vote_average.toFixed(1) : '',
                overview: (movie.overview || '').substr(0, 240),
                poster: movie.poster_path ? Lampa.TMDB.image('t/p/w500' + movie.poster_path) : ''
            };
        }

        function buildDeck(callback) {
            // Випадкова сторінка щоразу — інакше рулетка показувала б те саме
            var page = Math.floor(Math.random() * RANDOM_PAGES) + 1;
            var url = Lampa.TMDB.api('discover/movie?api_key=' + getTmdbKey() +
                '&language=' + Lampa.Storage.get('language', 'uk') +
                '&sort_by=popularity.desc&vote_count.gte=200&page=' + page);

            new Lampa.Reguest().silent(url, function (json) {
                var results = (json && json.results) || [];
                var deck = results.filter(function (m) { return m.poster_path; })
                    .sort(function () { return Math.random() - 0.5; })
                    .slice(0, DECK_SIZE)
                    .map(toCard);

                callback(deck.length ? deck : null);
            }, function () {
                callback(null);
            });
        }

        function start() {
            var worker = LikhtarNet.workerUrl();
            if (!worker) return Lampa.Noty.show('Спершу вкажіть адресу сервера Ліхтаря в налаштуваннях');

            Lampa.Noty.show('Готуємо колоду…');

            buildDeck(function (deck) {
                if (!deck) return Lampa.Noty.show('Не вдалося отримати фільми');

                $.ajax({
                    url: worker + '/api/session',
                    method: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({ config: {} })
                }).done(function (data) {
                    if (!data || !data.code) return Lampa.Noty.show('Сервер не видав код');

                    $.ajax({
                        url: worker + '/api/session/' + data.code,
                        method: 'PUT',
                        contentType: 'application/json',
                        data: JSON.stringify({ deck: deck })
                    }).done(function () {
                        showModal(worker, data.code);
                    }).fail(function () {
                        Lampa.Noty.show('Не вдалося надіслати колоду на сервер');
                    });
                }).fail(function () {
                    Lampa.Noty.show('Не вдалося зв\'язатися із сервером Ліхтаря');
                });
            });
        }

        function showModal(worker, code) {
            var target = worker + '/roulette?s=' + code;
            var html = $('<div class="likhtar-pair"></div>');

            html.append('<div class="likhtar-pair__hint">Наведіть камеру та гортайте фільми на телефоні</div>');
            html.append($('<img class="likhtar-pair__qr">').attr('src', worker + '/api/qr?text=' + encodeURIComponent(target)));
            html.append($('<div class="likhtar-pair__code"></div>').text(code));

            var status = $('<div class="likhtar-pair__status">Очікуємо на вибір…</div>');
            html.append(status);

            var polls = 0, timer = null, closed = false;

            function stop() {
                closed = true;
                if (timer) clearTimeout(timer);
            }

            function open(movie) {
                stop();
                Lampa.Modal.close();

                Lampa.Activity.push({
                    url: '',
                    component: 'full',
                    id: movie.id,
                    method: movie.method === 'tv' ? 'tv' : 'movie',
                    card: { id: movie.id },
                    source: 'tmdb'
                });
            }

            function poll() {
                if (closed) return;

                if (++polls > POLL_LIMIT) {
                    status.text('Час сесії вичерпано — запустіть рулетку ще раз');
                    return;
                }

                $.get(worker + '/api/session/' + code).done(function (data) {
                    if (closed) return;

                    if (data && data.action && data.action.open && data.action.open.id) {
                        open(data.action.open);
                        return;
                    }

                    timer = setTimeout(poll, POLL_INTERVAL);
                }).fail(function () {
                    if (!closed) timer = setTimeout(poll, POLL_INTERVAL);
                });
            }

            Lampa.Modal.open({
                title: 'Кінорулетка',
                html: html,
                size: 'medium',
                onBack: function () {
                    stop();
                    Lampa.Modal.close();
                    Lampa.Controller.toggle('menu');
                }
            });

            timer = setTimeout(poll, POLL_INTERVAL);
        }

        function addMenu() {
            if (!isSettingEnabled('likhtar_roulette_enabled', true)) return;
            if (!LikhtarNet.hasWorker()) return;          // без сервера телефон нізвідки взяти колоду
            if ($('[data-action="likhtar_roulette"]').length) return;

            var list = $('.menu .menu__list').eq(0);
            if (!list.length) return;

            var item = $('<li class="menu__item selector" data-action="likhtar_roulette">' +
                '<div class="menu__ico" style="font-size:1.4em;line-height:1">🎲</div>' +
                '<div class="menu__text">Кінорулетка</div></li>');

            item.on('hover:enter click', start);
            list.append(item);
        }

        return {
            init: function () {
                if (window.appready) addMenu();
                else Lampa.Listener.follow('app', function (e) {
                    if (e.type === 'ready') addMenu();
                });
            },
            buildDeck: buildDeck,
            toCard: toCard
        };
    })();

    // =================================================================
    // INIT FUNCTION
    // =================================================================
    function init() {
        // Прибираємо кеш старого формату, поки він не з'їв усе сховище телевізора
        LikhtarCache.migrate();

        // Settings panel
        setupSettings();

        // Register Components
        Lampa.Component.add('studios_main', StudiosMain);
        Lampa.Component.add('studios_view', StudiosView);
        Lampa.Component.add('ukrainian_feed', UkrainianFeedMain);
        LikhtarStudioSubscription.init();
        LikhtarFullCard.init();
        LikhtarSections.init();
        LikhtarAssistant.init();
        LikhtarPairing.init();
        LikhtarRoulette.init();
        LikhtarCard.init();

        addStyles();

        // Override API BEFORE adding rows
        overrideApi();

        addHeroRow();

        if (isSettingEnabled('likhtar_section_streamings', true)) {
            addStudioRow();
        }

        addUkrainianContentRow();

        if (isSettingEnabled('likhtar_section_mood', true)) {
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
    // Позначки мови шукаємо як окремі слова. Простий пошук підрядка «ua» ловить
    // Squad, Quality, Aqua, а «eng» — Avenger, і тоді UA-мітка стоїть майже скрізь.
    // «uk» свідомо не беремо: у назвах роздач це зазвичай Велика Британія.
    var UKRAINIAN_MARK = /(^|[^a-z])(ua|ukr|ukrainian)([^a-z]|$)|укр/i;
    var ENGLISH_MARK = /(^|[^a-z])(eng|english|multi)([^a-z]|$)/i;

    function initMarksJacRed() {
        var _jacredCache = {};
        var _uafixCache = {};

        function fetchWithProxy(url, callback) {
            LikhtarNet.fetchText(url, function (text) {
                callback(null, text);
            }, function () {
                callback(new Error('All proxies failed'), null);
            });
        }

        function getBestJacred(card, callback) {
            var cacheKey = 'jacred_' + card.id;

            if (_jacredCache[cacheKey]) return callback(_jacredCache[cacheKey]);

            var stored = LikhtarCache.get(cacheKey);
            if (stored) {
                _jacredCache[cacheKey] = stored;
                return callback(stored);
            }

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
                        var emptyData = { empty: true };
                        _jacredCache[cacheKey] = emptyData;
                        // Порожній результат кешуємо ненадовго: реліз може з'явитися будь-коли
                        LikhtarCache.set(cacheKey, emptyData, LikhtarCache.TTL.DAY);
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

                        if (UKRAINIAN_MARK.test(item.title || '')) isUkr = true;
                        if (card.original_language === 'uk') isUkr = true;
                        if (ENGLISH_MARK.test(item.title || '')) isEng = true;

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

                    finalBest.empty = false;
                    _jacredCache[cacheKey] = finalBest;
                    LikhtarCache.set(cacheKey, finalBest, 2 * LikhtarCache.TTL.DAY);
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

        /** Позначає картку обробленою і навішує мітки; викликається лише для видимих. */
        function markCard(cardEl) {
            var card = $(cardEl);
            if (card.hasClass('jacred-mark-done')) return;
            card.addClass('jacred-mark-done');

            var movie = cardEl.heroMovieData || card.data('item') || cardEl.card_data || cardEl.item || null;
            if (!movie || !movie.id || movie.size) return;

            addMarksToContainer(card, movie, card.hasClass('hero-banner') ? null : '.card__view');
        }

        /**
         * Мітки рахуються тільки для карток, які реально потрапили на екран.
         * У рядку може бути 100 карток, а видно 6 — решта не варта ні запитів, ні роботи.
         */
        var visibilityWatcher = (function () {
            if (typeof IntersectionObserver === 'undefined') return null;

            return new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    visibilityWatcher.unobserve(entry.target);
                    markCard(entry.target);
                });
            }, { rootMargin: '300px' });   // трохи наперед, щоб мітки встигали з'явитись до підходу фокуса
        })();

        function processCards() {
            $('.card:not(.jacred-mark-seen)').each(function () {
                $(this).addClass('jacred-mark-seen');
                if (visibilityWatcher) visibilityWatcher.observe(this);
                else markCard(this);   // старі ТВ без IntersectionObserver — як раніше, одразу
            });
        }

        function observeCardRows() {
            var timer = null;

            // Lampa сипле мутаціями пачками (особливо під час скролу) — реагуємо один раз
            // після паузи, інакше обхід усіх карток запускається десятки разів поспіль.
            var observer = new MutationObserver(function () {
                if (timer) return;
                timer = setTimeout(function () {
                    timer = null;
                    processCards();
                }, 250);
            });

            var target = document.getElementById('app') || document.body;
            observer.observe(target, { childList: true, subtree: true });
            processCards();
        }

        function addMarksToContainer(element, movie, viewSelector) {
            if (!isSettingEnabled('likhtar_badge_enabled', true)) return;
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
            if (!isSettingEnabled('likhtar_badge_enabled', true)) return;
            if (data.ukr && isSettingEnabled('likhtar_badge_ua', true)) container.append(createBadge('ua', 'UA'));
            if (data.eng && isSettingEnabled('likhtar_badge_en', true)) container.append(createBadge('en', 'EN'));
            if (data.resolution && data.resolution !== 'SD') {
                if (data.resolution === '4K' && isSettingEnabled('likhtar_badge_4k', true)) container.append(createBadge('4k', '4K'));
                else if (data.resolution === 'FHD' && isSettingEnabled('likhtar_badge_fhd', true)) container.append(createBadge('fhd', '1080p'));
                else if (data.resolution === 'HD' && isSettingEnabled('likhtar_badge_fhd', true)) container.append(createBadge('hd', '720p'));
                else if (isSettingEnabled('likhtar_badge_fhd', true)) container.append(createBadge('hd', data.resolution));
            }
            if (data.hdr && isSettingEnabled('likhtar_badge_hdr', true)) container.append(createBadge('hdr', 'HDR'));
            if (movie) {
                var rating = parseFloat(movie.imdb_rating || movie.kp_rating || movie.vote_average || 0);
                if (rating > 0 && String(rating) !== '0.0') {
                    var rBadge = document.createElement('div');
                    rBadge.classList.add('card__mark', 'card__mark--rating', LikhtarFullCard.ratingClass(rating));
                    rBadge.innerHTML = '<span class="mark-star">★</span>' + rating.toFixed(1);
                    container.append(rBadge);
                }
            }
        }

        function injectFullCardMarks(movie, renderEl) {
            if (!movie || !movie.id || !renderEl) return;
            var $render = $(renderEl);

            if (isSettingEnabled('likhtar_show_logo_instead_text', true)) {
                var titleEl = $render.find('.full-start-new__title, .full-start__title').first();
                if (titleEl.length && titleEl.find('img.likhtar-full-logo').length === 0) {
                    LikhtarLogo.get(movie, function (logo) {
                        if (!logo) return;

                        // Сторінку могли встигнути закрити — шукаємо заголовок ще раз у поточному DOM
                        var target = $render.closest('body').length
                            ? $render.find('.full-start-new__title, .full-start__title').first()
                            : $('.full-start-new__title, .full-start__title').first();
                        if (!target.length || target.find('img.likhtar-full-logo').length) return;

                        var img = $('<img class="likhtar-full-logo">');
                        if (logo.invert) img.addClass('likhtar-logo--invert');
                        img.attr('src', logo.path);

                        target.empty().append(img);
                        target.css({ fontSize: '3em', marginTop: '0', marginBottom: '0' });
                    });
                }
            }

            // Move the Year/Country block (.full-start-new__head) to the details block
            var headEl = $render.find('.full-start-new__head').first();
            var detailsEl = $render.find('.full-start-new__details, .full-start__details').first();

            if (headEl.length && detailsEl.length && !detailsEl.find('.full-start-new__head').length) {
                headEl.detach().appendTo(detailsEl);
                headEl.addClass('likhtar-poster-head');
            }

            // Ensure our dynamic styles exist
            if (!$('style:contains("likhtar-poster-head")').length) {
                var posterHeadCSS = `
                    .likhtar-poster-head {
                        bottom: 0;
                        left: 0;
                        width: 100%;
                        backdrop-filter: blur(5px);
                        color: #fff !important;
                        font-size: 0.9em;
                        display: flex;
                        align-items: center;
                        flex-direction: row;
                    }
                    .likhtar-poster-head * {
                        color: #fff !important;
                    }
                    .full-start__poster, .full-start-new__poster {
                        position: relative;
                        overflow: hidden;
                    }
                `;
                $('head').append('<style>' + posterHeadCSS + '</style>');
            }

            // Co-existence guard: if QualityUA.js is active, skip our badge injection
            if ($('.quality-badges-container').length) return;

            // Detect layout: try to find poster.
            // У новому вигляді постера на сторінці немає — мітки мають лягти
            // в рядок фактів, інакше вони поїхали б у прихований блок.
            var poster = isSettingEnabled('likhtar_new_card', true)
                ? $()
                : $render.find('.full-start__poster, .full-start-new__poster').first();

            if (poster.length) {
                // ── REGULAR CARD: overlay badges on the poster image (top-left) ──────
                if ($render.find('.likhtar-poster-badges').length) return;

                // Ensure poster wrapper is position:relative so our absolute badges work
                poster.css('position', 'relative');
                var posterBadges = $('<div class="likhtar-poster-badges"></div>');
                poster.append(posterBadges);

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
                            if (!bestData.empty) renderInfoRowBadges(posterBadges, bestData);
                        });
                    } else if (!bestData.empty) {
                        renderInfoRowBadges(posterBadges, bestData);
                    }
                });

            } else {
                // ── FALLBACK CARD (no poster): append badges at the end of rate-line ────
                var rateLine = $render.find('.full-start-new__rate-line, .full-start__rate-line').first();
                if (!rateLine.length) return;
                if ($render.find('.likhtar-quality-row').length) return;
                var qualityRow = $('<div class="likhtar-quality-row"></div>');
                rateLine.append(qualityRow);

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
                            if (!bestData.empty) renderInfoRowBadges(qualityRow, bestData);
                        });
                    } else if (!bestData.empty) {
                        renderInfoRowBadges(qualityRow, bestData);
                    }
                });
            }
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
            // If setting is OFF — remove the row entirely so native Lampa badges remain untouched
            if (!isSettingEnabled('likhtar_badge_enabled', true)) {
                container.remove();
                return;
            }
            if (data.ukr && isSettingEnabled('likhtar_badge_ua', true)) {
                var uaTag = $('<div class="likhtar-full-badge likhtar-full-badge--ua"></div>');
                uaTag.text('UA+');
                container.append(uaTag);
            }
            if (data.resolution && data.resolution !== 'SD') {
                var resText = data.resolution;
                if (resText === 'FHD') resText = '1080p';
                else if (resText === 'HD') resText = '720p';

                var showQuality = false;
                if (data.resolution === '4K' && isSettingEnabled('likhtar_badge_4k', true)) showQuality = true;
                else if ((data.resolution === 'FHD' || data.resolution === 'HD') && isSettingEnabled('likhtar_badge_fhd', true)) showQuality = true;

                if (showQuality) {
                    var qualityTag = $('<div class="likhtar-full-badge likhtar-full-badge--quality"></div>');
                    qualityTag.text(resText);
                    container.append(qualityTag);
                }
            }
            if (data.hdr && isSettingEnabled('likhtar_badge_hdr', true)) {
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
            
            /* ====== Poster overlay badges (regular card, top-right) ====== */
            .likhtar-poster-badges {
                position: absolute;
                top: 0.8em;
                right: 0.2em;
                display: flex;
                flex-direction: column;
                flex-wrap: wrap;
                gap: 0.3em;
                z-index: 20;
                pointer-events: none;
                align-items: stretch;
            }

            .full-start__poster .card__type, .full-start-new__poster .card__type {
                position: absolute !important;
                left: 0.2em !important;
                top: 1.4em !important;
            }

            .full-start-new__body {
                align-items: center !important;
            }
            .cardify .full-start-new__body {
                align-items: flex-end !important;
            }

            /* ====== Wide card: quality row appended to rate-line (bottom-right) ====== */
            .likhtar-quality-row {
                display: inline-flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.4em;
            }

            /* Hide tagline to clean up UI */
            .full-start-new__tagline, .full--tagline {
                display: none !important;
            }

            /* Only style OUR badges — never override Lampa's native ones */
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

            .card.jacred-mark-seen .card__vote { display: none !important; }

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
