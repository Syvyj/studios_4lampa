#!/usr/bin/env python3
"""Генератор карток фільмів і серіалів для Ліхтарика.

Модель тут нічого не вигадує: вона лише переказує українською матеріал,
який ми їй дали — статтю з Вікіпедії та опис із TMDB. Усе, що не
підтверджується джерелом, відсіюється перед записом.

Результат — по файлу на назву в cards/, які плагін читає напряму.
Ніякої бази й сервера: файли лежать поруч із likhtar.js. Фільм — це
cards/<tmdb_id>.json, серіал — cards/tv<tmdb_id>.json: у TMDB нумерація
фільмів і серіалів своя, і без префікса вони б затирали одне одного.

    python3 tools/build-cards.py --year 2026 --min-votes 5
    python3 tools/build-cards.py --kind tv --year 2025 --limit 200

Мультфільми й мультсеріали окремого запуску не потребують — вони
йдуть у тих самих топах за популярністю.

Запуск можна переривати й повторювати: готові картки пропускаються.
"""

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")

TMDB_KEY = os.environ.get("TMDB_KEY", "4ef0d7355d9ffb5151e987764708ce96")
OLLAMA = os.environ.get("OLLAMA_URL", "http://100.114.237.121:11434")
MODEL = os.environ.get("OLLAMA_MODEL", "gemma4:e4b")

# Вікіпедія просить представлятися; латиниця — бо заголовки HTTP не тримають кирилиці
UA = "LikhtarBot/0.1 (https://github.com/Syvyj/studios_4lampa) card-builder"

SYSTEM = """Ти — редактор української медіатеки.

ЗАЛІЗНЕ ПРАВИЛО: факти бери ВИКЛЮЧНО з наданого матеріалу.
Нічого не додавай від себе. Якщо матеріалу для блоку бракує —
став порожній рядок або порожній масив.

Оцінки (складність, насильство, еротика, для дітей) — це твоє судження
на основі матеріалу, тут вигадка неможлива.

Пиши природною українською, без рекламних фраз.
Відповідай ТІЛЬКИ валідним JSON без Markdown."""

TEMPLATE = """Матеріал про {kind_word} «{title}» ({year}).

=== ОПИС З TMDB ===
{overview}

=== СЮЖЕТ ЗІ СТАТТІ ===
{plot}

=== ВИРОБНИЦТВО ТА ТЕМИ ===
{production}

Склади JSON:
{{
  "summary": "Про що {kind_word}, без спойлерів. До 400 символів.",
  "watch": {{
    "worth": "Чи варто дивитись і чому. Одне-два речення.",
    "for": "Кому підійде.",
    "not_for": "Кому не підійде."
  }},
  "mood": ["3-5 слів про настрій {kind_gen}"],
  "complexity": {{"score": 1, "description": "Наскільки складно дивитись."}},
  "violence": {{"score": 0, "description": "Скільки жорстокості."}},
  "erotica": {{"score": 0, "description": "Скільки відвертих сцен."}},
  "children": {{"recommended": false, "description": "Чи підійде дітям."}},
  "ending_explained": "{ending_hint}",
  "easter_eggs": ["3-5 конкретних фактів про створення: імена, числа, назви. ТІЛЬКИ з розділу ВИРОБНИЦТВО. Якщо його немає — порожній масив."]
}}"""

# Серіал відрізняється від фільму трьома речами: словом у промпті, місцем,
# де Вікіпедія тримає статтю, і тим, що фінал є не завжди — історія може
# тривати. Решта конвеєра для них однакова.
KINDS = {
    "movie": {
        "word": "фільм", "gen": "фільму", "plural": "фільмів", "prefix": "",
        "ending_hint": ("Пояснення фіналу, 300-700 символів. ТІЛЬКИ з розділу СЮЖЕТ. "
                        "Якщо сюжету немає — порожній рядок."),
    },
    "tv": {
        "word": "серіал", "gen": "серіалу", "plural": "серіалів", "prefix": "tv",
        "ending_hint": ("Чим завершується історія, 300-700 символів. ТІЛЬКИ з розділу СЮЖЕТ "
                        "і лише якщо серіал завершено. Якщо історія триває "
                        "або сюжету немає — порожній рядок."),
    },
}

PROD_SECTIONS = re.compile(
    r"виробництв|фільмуванн|знімання|кошторис|музика|розробк|створенн|теми|"
    r"production|filming|development|casting|photography|design|music|themes|"
    r"visual effects|scientific",
    re.I,
)
PLOT_SECTIONS = ("Сюжет", "Plot", "Synopsis", "Сюжетна лінія",
                 "Зміст", "Premise", "Series overview", "Огляд")


def fetch(url, timeout=40):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def tmdb(path):
    sep = "&" if "?" in path else "?"
    return fetch(f"https://api.themoviedb.org/3/{path}{sep}api_key={TMDB_KEY}")


def wiki_search(lang, query):
    url = (f"https://{lang}.wikipedia.org/w/api.php?action=query&list=search&format=json"
           f"&srlimit=1&srsearch={urllib.parse.quote(query)}")
    hits = fetch(url).get("query", {}).get("search", [])
    return hits[0]["title"] if hits else None


def wiki_extract(lang, title):
    url = (f"https://{lang}.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1"
           f"&redirects=1&format=json&titles={urllib.parse.quote(title)}")
    pages = fetch(url).get("query", {}).get("pages", {})
    if not pages:
        return ""
    return list(pages.values())[0].get("extract", "") or ""


def split_sections(text):
    parts = re.split(r"\n==+\s*([^=\n]+?)\s*==+\n?", text)
    return {parts[i].strip(): parts[i + 1].strip() for i in range(1, len(parts) - 1, 2)}


def normalize(item, kind):
    """Зводить фільм і серіал до однакових полів: далі конвеєр їх не розрізняє."""
    if kind == "tv":
        return {"id": item["id"], "kind": "tv",
                "title": item.get("name") or item.get("original_name") or "",
                "original": item.get("original_name") or "",
                "year": (item.get("first_air_date") or "")[:4],
                "overview": item.get("overview") or ""}
    return {"id": item["id"], "kind": "movie",
            "title": item.get("title") or item.get("original_title") or "",
            "original": item.get("original_title") or "",
            "year": (item.get("release_date") or "")[:4],
            "overview": item.get("overview") or ""}


def card_path(item):
    return os.path.join(CARDS_DIR, f"{KINDS[item['kind']]['prefix']}{item['id']}.json")


PUNCT = re.compile(r"[^\w\s]", re.U)


def same_title(found, expected):
    """Чи стаття справді про нашу назву.

    Пошук Вікіпедії завжди щось повертає: на «Друзі та сусіди» він віддав
    статтю про «Друзі». Далі це перетворилось би на впевнений переказ
    чужого сюжету, тож беремо лише точний збіг назви — уточнення в дужках
    («(телесеріал)», «(фільм)») відкидаємо.
    """
    def words(s):
        s = re.sub(r"\s*\([^)]*\)\s*$", " ", s or "")
        return PUNCT.sub(" ", s).lower().split()

    f, e = words(found), words(expected)
    if not f or not e:
        return False
    # Назва статті може бути довшою («Нова надія» → «Зоряні війни: Нова надія»),
    # але не коротшою: коротша означає, що ми потрапили на інший твір.
    return " ".join(e) in " ".join(f)


def find_article(item):
    """Шукає статтю: спершу українську, потім англійську.

    Серіал шукаємо ще й за словом «телесеріал»: без нього Вікіпедія часто
    віддає статтю про однойменний фільм.
    """
    year = item["year"]
    if item["kind"] == "tv":
        attempts = [
            ("uk", f"{item['title']} телесеріал", item["title"]),
            ("uk", f"{item['title']} {year}", item["title"]),
            ("en", f"{item['original']} {year} TV series", item["original"]),
        ]
    else:
        attempts = [
            ("uk", f"{item['title']} {year}", item["title"]),
            ("en", f"{item['original']} {year} film", item["original"]),
        ]

    for lang, query, expected in attempts:
        if not query.strip():
            continue
        try:
            title = wiki_search(lang, query)
            if not title or not same_title(title, expected):
                continue
            text = wiki_extract(lang, title)
        except Exception:
            continue

        if len(text) < 1200:
            continue

        sections = split_sections(text)
        plot = next((sections[k] for k in PLOT_SECTIONS if len(sections.get(k, "")) > 300), "")
        if not plot:
            continue

        production = "\n\n".join(
            f"{name}:\n{body}" for name, body in sections.items()
            if PROD_SECTIONS.search(name) and len(body) > 200
        )
        return {"lang": lang, "title": title, "plot": plot, "production": production, "raw": text}

    return None


def ask_model(prompt):
    body = {
        "model": MODEL,
        "messages": [{"role": "system", "content": SYSTEM},
                     {"role": "user", "content": prompt}],
        "stream": False,
        "think": False,
        "options": {"temperature": 0.3, "num_ctx": 16384},
    }
    req = urllib.request.Request(f"{OLLAMA}/api/chat", data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=600) as r:
        data = json.loads(r.read())
    return data["message"]["content"]


def parse_json(text):
    """Модель зрідка обгортає відповідь у ```json — дістаємо обʼєкт."""
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return None


# Якорі, за якими можна звірити твердження з джерелом. Числа й латиниця
# працюють з будь-якою мовою статті; кириличні назви — лише коли стаття
# українська, бо в англійському тексті «Гіллеспі» ніколи не знайдеться.
NUMERIC = re.compile(r"\b\d{3,4}\b")
LATIN = re.compile(r"\b[A-Za-z][A-Za-z0-9'’-]{2,}\b")
CYRILLIC = re.compile(r"\b[А-ЯІЇЄҐ][а-яіїєґ’'-]{3,}\b")

# Фрази, якими модель прикриває незнання — саме так виглядали вигадані
# фінали, коли матеріалу не було
VAGUE = re.compile(
    r"залиша(є|ють)\s+(простір|місце)|неоднозначн|для інтерпретац|"
    r"відкрит(ий|им)\s+фінал|кожен глядач|можна трактувати",
    re.I,
)


def anchors_of(claim, lang):
    found = set(NUMERIC.findall(claim)) | set(LATIN.findall(claim))
    if lang == "uk":
        found |= set(CYRILLIC.findall(claim))
    return {a for a in found if len(a) > 3}


def grounded(claim, article):
    """Чи спирається твердження на джерело."""
    if not article:
        return False

    anchors = anchors_of(claim or "", article["lang"])
    if not anchors:
        return False

    low = article["raw"].lower()
    hits = sum(1 for a in anchors if a.lower() in low)
    return hits >= max(1, len(anchors) // 3)


def verify_ending(text, article):
    """Пояснення фіналу: між мовами імена не звірити, тож ловимо порожнечу.

    Українську статтю перевіряємо якорями як завжди. Для англійської
    вимагаємо конкретики: кілька власних назв і жодних фраз на кшталт
    «фінал залишає простір для інтерпретацій» — саме такими були
    вигадані відповіді, коли матеріалу бракувало.
    """
    if not article or not article["plot"]:
        return False, "сюжету в джерелі немає"
    if len(text or "") < 180:
        return False, "надто коротко"
    if VAGUE.search(text):
        return False, "загальні фрази замість подій"

    if article["lang"] == "uk":
        return (grounded(text, article), "не підтверджується джерелом")

    names = set(CYRILLIC.findall(text)) | set(LATIN.findall(text))
    return (len(names) >= 3, "замало конкретики")


def clamp(value, low, high, default):
    try:
        n = int(value)
    except Exception:
        return default
    return max(low, min(high, n))


def validate(card, article):
    """Прибирає з картки все, що не підтверджується джерелом."""
    report = []

    ending = card.get("ending_explained") or ""
    ok, why = verify_ending(ending, article)
    if ending and not ok:
        report.append("фінал прибрано: " + why)
    if not ok:
        card["ending_explained"] = ""

    eggs = card.get("easter_eggs") or []
    if not isinstance(eggs, list):
        eggs = []
    kept = [e for e in eggs if isinstance(e, str) and grounded(e, article)]
    if len(kept) != len(eggs):
        report.append(f"фактів відсіяно: {len(eggs) - len(kept)}")
    card["easter_eggs"] = kept

    for key, low, high, default in (("complexity", 1, 5, 3), ("violence", 0, 5, 0), ("erotica", 0, 5, 0)):
        block = card.get(key) or {}
        block["score"] = clamp(block.get("score"), low, high, default)
        card[key] = block

    mood = card.get("mood") or []
    card["mood"] = [m for m in mood if isinstance(m, str)][:5]

    return report


def build(item):
    article = find_article(item)
    kind = KINDS[item["kind"]]

    prompt = TEMPLATE.format(
        kind_word=kind["word"],
        kind_gen=kind["gen"],
        ending_hint=kind["ending_hint"],
        title=item["title"],
        year=item["year"] or "невідомо",
        overview=item["overview"].strip() or "(немає)",
        plot=(article["plot"][:6000] if article else "(матеріалу немає)"),
        production=(article["production"][:8000] if article and article["production"] else "(матеріалу немає)"),
    )

    # Зрідка модель ламає JSON — одна повторна спроба дешевша за втрачену картку
    card = None
    for attempt in range(2):
        card = parse_json(ask_model(prompt))
        if card:
            break
    if not card:
        return None, ["відповідь моделі не є JSON навіть після повтору"]

    report = validate(card, article)

    card["id"] = item["id"]
    card["kind"] = item["kind"]
    card["title"] = item["title"]
    card["year"] = item["year"]
    card["source"] = ({"wiki": article["title"], "lang": article["lang"]} if article else None)
    card["generated"] = time.strftime("%Y-%m-%d")

    return card, report


def discover(kind, year, min_votes, page):
    if kind == "tv":
        # Ток-шоу, новини й реаліті відсіюємо: у них немає ні сюжету,
        # ні фіналу — картка вийшла б порожньою.
        return tmdb(f"discover/tv?first_air_date_year={year}"
                    f"&vote_count.gte={min_votes}&sort_by=popularity.desc"
                    f"&without_genres=10763,10764,10767"
                    f"&language=uk&page={page}")
    return tmdb(f"discover/movie?primary_release_year={year}"
                f"&vote_count.gte={min_votes}&sort_by=popularity.desc"
                f"&language=uk&page={page}")


def write_index():
    """Індекс тримає фільми й серіали окремо — плагін шукає за своїм типом."""
    movies, series = [], []
    for name in os.listdir(CARDS_DIR):
        if not name.endswith(".json"):
            continue
        stem = name[:-5]
        if stem.startswith("tv") and stem[2:].isdigit():
            series.append(int(stem[2:]))
        elif stem.isdigit():
            movies.append(int(stem))

    with open(os.path.join(CARDS_DIR, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"ids": sorted(movies), "tv": sorted(series),
                   "updated": time.strftime("%Y-%m-%d")}, f, separators=(",", ":"))
    return movies, series


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kind", choices=("movie", "tv"), default="movie")
    parser.add_argument("--year", type=int, default=2026)
    parser.add_argument("--min-votes", type=int, default=5)
    parser.add_argument("--limit", type=int, default=0, help="0 — усі знайдені")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    os.makedirs(CARDS_DIR, exist_ok=True)
    plural = KINDS[args.kind]["plural"]

    items, page = [], 1
    while True:
        data = discover(args.kind, args.year, args.min_votes, page)
        items += [normalize(x, args.kind) for x in data.get("results", [])]
        if page >= min(data.get("total_pages", 1), 500) or (args.limit and len(items) >= args.limit):
            break
        page += 1
        time.sleep(0.2)

    if args.limit:
        items = items[:args.limit]

    print(f"{plural} до обробки: {len(items)} ({args.year})", flush=True)

    made = skipped = failed = 0
    started = time.time()

    for i, item in enumerate(items, 1):
        path = card_path(item)
        if os.path.exists(path):
            skipped += 1
            continue

        t0 = time.time()
        try:
            card, report = build(item)
        except Exception as e:
            print(f"{i}/{len(items)} ✖ {item['title']}: {e}", flush=True)
            failed += 1
            continue

        if not card:
            print(f"{i}/{len(items)} ✖ {item['title']}: {report}", flush=True)
            failed += 1
            continue

        if not args.dry_run:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(card, f, ensure_ascii=False, separators=(",", ":"))

        made += 1
        eggs = len(card.get("easter_eggs") or [])
        ending = "є" if card.get("ending_explained") else "—"
        note = ("; " + "; ".join(report)) if report else ""
        elapsed = time.time() - started
        eta = (elapsed / max(made, 1)) * (len(items) - i) / 60

        print(f"{i}/{len(items)} ✔ {item['title'][:34]:34} "
              f"{time.time()-t0:4.1f}с  фінал:{ending} фактів:{eggs}{note}  "
              f"(лишилось ~{eta:.0f} хв)", flush=True)

    print(f"\nстворено {made}, пропущено {skipped}, помилок {failed}, "
          f"загалом {(time.time()-started)/60:.0f} хв", flush=True)

    movies, series = write_index()
    print(f"індекс: {len(movies)} фільмів, {len(series)} серіалів", flush=True)


if __name__ == "__main__":
    main()
