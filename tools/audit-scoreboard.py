#!/usr/bin/env python3
"""Звіряє скорборд карток з офіційними віковими рейтингами TMDB.

Скорборд — це судження моделі, і Gemma виносила його з самого лише короткого
опису. Звідси «насильство 0» і «дітям підходить» у «Вбивці демонів» — одному
з найкривавіших аніме року.

Вікові рейтинги натомість не думка, а присвоєння: MPAA, BBFC, FSK та інші
органи класифікації. Якщо картка каже «дітям можна», а фільм має R або
TV-MA — бреше картка, і це видно без жодної моделі.

Запити кешуються у tools/.cert-cache.json, тож повторний прогін безкоштовний.

    python3 tools/audit-scoreboard.py                 # звіт
    python3 tools/audit-scoreboard.py --write-list    # + список у review/
"""

import argparse
import importlib.util
import json
import os
import re
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")
CACHE = os.path.join(ROOT, "tools", ".cert-cache.json")

spec = importlib.util.spec_from_file_location("bc", os.path.join(ROOT, "tools", "build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)

# Вік, з якого дозволено. Беремо найпоширеніші системи; решту країн
# розбираємо як число, бо більшість світу позначає рейтинг просто віком.
US_MOVIE = {"G": 0, "PG": 7, "PG-13": 13, "R": 17, "NC-17": 18}
US_TV = {"TV-Y": 0, "TV-Y7": 7, "TV-G": 0, "TV-PG": 10, "TV-14": 14, "TV-MA": 17}
GB = {"U": 0, "PG": 8, "12": 12, "12A": 12, "15": 15, "18": 18, "R18": 18}

# Порядок країн: спершу ті, чиї системи ми знаємо точно
PREFERRED = ["US", "GB", "DE", "FR", "BR", "AU", "CA"]

# Жанри, у яких «насильство 0» майже завжди помилка
VIOLENT_GENRES = {"Бойовик", "Жахи", "Трилер", "Кримінал", "Війна", "Детектив"}


def age_from(country, value):
    """Перетворює рейтинг на мінімальний вік або None, якщо не розібрали."""
    if not value:
        return None
    v = value.strip().upper()

    if country == "US":
        if v in US_MOVIE:
            return US_MOVIE[v]
        if v in US_TV:
            return US_TV[v]
    if country == "GB" and v in GB:
        return GB[v]

    # «16», «MA 15+», «SAM 18», «+13», «14A» — усе це вік із оздобами
    m = re.search(r"(\d{1,2})", v)
    if m:
        n = int(m.group(1))
        if 0 <= n <= 21:
            return n
    return None


def fetch_cert(kind, tmdb_id):
    """Повертає (вік, країна, сира_позначка) або (None, None, None)."""
    path = f"{kind}/{tmdb_id}/" + ("content_ratings" if kind == "tv" else "release_dates")
    try:
        data = bc.tmdb(path)
    except Exception:
        return None, None, None

    by_country = {}
    for r in data.get("results", []):
        code = r.get("iso_3166_1")
        if kind == "tv":
            if r.get("rating"):
                by_country.setdefault(code, r["rating"])
        else:
            for rel in r.get("release_dates", []):
                if rel.get("certification"):
                    by_country.setdefault(code, rel["certification"])
                    break

    for code in PREFERRED + sorted(by_country):
        if code in by_country:
            age = age_from(code, by_country[code])
            if age is not None:
                return age, code, by_country[code]
    return None, None, None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write-list", action="store_true")
    parser.add_argument("--limit", type=int, default=0)
    args = parser.parse_args()

    cache = {}
    if os.path.exists(CACHE):
        with open(CACHE, encoding="utf-8") as f:
            cache = json.load(f)

    cards = []
    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue
        with open(os.path.join(CARDS_DIR, name), encoding="utf-8") as f:
            cards.append((name, json.load(f)))
    if args.limit:
        cards = cards[:args.limit]

    print(f"карток: {len(cards)}, у кеші рейтингів: {len(cache)}")

    kids_lie, violence_lie, no_cert = [], [], 0
    checked = 0
    started = time.time()

    for i, (name, card) in enumerate(cards, 1):
        kind = card.get("kind") or ("tv" if name.startswith("tv") else "movie")
        key = f"{kind}/{card['id']}"

        if key not in cache:
            age, country, raw = fetch_cert(kind, card["id"])
            cache[key] = {"age": age, "country": country, "raw": raw}
            time.sleep(0.02)
            if i % 200 == 0:
                with open(CACHE, "w", encoding="utf-8") as f:
                    json.dump(cache, f, ensure_ascii=False)
                eta = (time.time() - started) / i * (len(cards) - i) / 60
                print(f"  {i}/{len(cards)}… (~{eta:.0f} хв)", flush=True)

        rec = cache[key]
        age = rec.get("age")
        if age is None:
            no_cert += 1
            continue
        checked += 1

        title = card.get("title") or name
        kids_ok = (card.get("children") or {}).get("recommended")
        viol = (card.get("violence") or {}).get("score")

        # Дітям можна, а рейтинг дорослий — однозначна брехня
        if kids_ok and age >= 16:
            kids_lie.append((title, age, rec.get("raw"), rec.get("country")))

        # Насильства нібито нема, а рейтинг дорослий. Мʼякіша ознака:
        # рейтинг 18+ дають і за мову чи секс, тож дивимось ще й жанр.
        if isinstance(viol, int) and viol <= 1 and age >= 16:
            violence_lie.append((title, age, viol, rec.get("raw")))

    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False)

    print(f"\nз відомим віковим рейтингом: {checked}")
    print(f"без рейтингу в TMDB: {no_cert}\n")

    print(f"«дітям можна» при дорослому рейтингу: {len(kids_lie)}")
    for t, a, raw, c in kids_lie[:10]:
        print(f"   {t[:38]:38} {c}:{raw} ({a}+)")

    print(f"\n«насильства майже нема» при дорослому рейтингу: {len(violence_lie)}")
    for t, a, v, raw in violence_lie[:10]:
        print(f"   {t[:38]:38} насильство={v}, рейтинг {raw} ({a}+)")

    if args.write_list:
        os.makedirs(os.path.join(ROOT, "review"), exist_ok=True)
        out = os.path.join(ROOT, "review", "scoreboard-problems.json")
        ids = sorted({t for t, *_ in kids_lie} | {t for t, *_ in violence_lie})
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"kids": [t for t, *_ in kids_lie],
                       "violence": [t for t, *_ in violence_lie]}, f,
                      ensure_ascii=False, indent=1)
        print(f"\nсписок: {out} ({len(ids)} назв)")


if __name__ == "__main__":
    main()
