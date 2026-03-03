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
                if (!isSettingEnabled('likhtar_show_logo_instead_text', true)) return;
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
                    var iconHtml = '<div style="width: 1.2em; height: 1.2em; display: inline-block; vertical-align: middle; margin-right: 0.4em; margin-bottom: 0.1em; color: inherit; filter: invert(1) brightness(2);">' + config.icon + '</div>';
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
                    rBadge.classList.add('card__mark', 'card__mark--rating');
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

            // Co-existence guard: if QualityUA.js is active, skip our badge injection
            if ($('.quality-badges-container').length) return;

            // Detect layout: wide card = full-start-new with no separate poster column
            var isWide = $render.find('.full-start-new').length > 0 && !$render.find('.full-start__poster').length;

            if (!isWide) {
                // ── REGULAR CARD: overlay badges on the poster image (bottom-left) ──────
                var poster = $render.find('.full-start__poster, .full-start-new__poster').first();
                if (!poster.length) return;
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
                // ── WIDE CARD: append badges at the end of rate-line (bottom-right) ────
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
            
            /* ====== Poster overlay badges (regular card, bottom-left) ====== */
            .likhtar-poster-badges {
                position: absolute;
                bottom: 0.5em;
                left: 0.5em;
                display: flex;
                flex-direction: column;
                gap: 0.3em;
                z-index: 20;
                pointer-events: none;
            }

            /* ====== Wide card: quality row appended to rate-line (bottom-right) ====== */
            .likhtar-quality-row {
                display: inline-flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.4em;
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
