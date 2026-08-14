#!/usr/bin/env python3
"""Шукає назви, яких бракує в базі — але лише ті, що проходять фільтр каталогу.

Сенс у тому, що наповнювати треба не «все, що є в TMDB», а тільки те, що
Ліхтар узагалі показуватиме. З фільтром «Режиму студії» задача з тисяч
перетворюється на сотні.

Для серіалів шукаємо за air_date, а не за роком першого ефіру: інакше
«Дім дракона» з новим сезоном 2026 року не потрапить у вибірку ніколи,
бо стартував 2022-го.

    python3 tools/find-missing.py --size 40

Результат — inbox/missing-001.json і далі: готові списки для промту
docs/prompt-fill-year.md.
"""

import argparse
import importlib.util
import json
import os
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")
OUT_DIR = os.path.join(ROOT, "inbox")

spec = importlib.util.spec_from_file_location("bc", os.path.join(ROOT, "tools", "build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)

# Ті самі правила, що в likhtar.js: studioAllows(). Тримати синхронно —
# інакше наповнимо те, чого каталог не покаже, або навпаки.
BLOCK_COUNTRY = ["RU", "BY", "IN", "TW", "TH", "PH"]
BLOCK_LANG = ["ru", "be", "hi", "ta", "te", "ml", "kn", "bn", "mr", "pa", "th", "tl"]
MIN_VOTES = 150

SWEEPS = [
    ("tv", "air_date.gte=2026-01-01&air_date.lte=2026-12-31"),
    ("tv", "air_date.gte=2025-01-01&air_date.lte=2025-12-31"),
    ("movie", "primary_release_year=2026"),
    ("movie", "primary_release_year=2025"),
]


def allowed(item):
    countries = item.get("origin_country") or []
    if any(c in BLOCK_COUNTRY for c in countries):
        return False
    if not countries and item.get("original_language") in BLOCK_LANG:
        return False
    return (item.get("vote_count") or 0) >= MIN_VOTES


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=40)
    parser.add_argument("--max-pages", type=int, default=30)
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        if old.startswith("missing-") and old.endswith(".json"):
            os.remove(os.path.join(OUT_DIR, old))

    missing = {}
    for kind, query in SWEEPS:
        found = passed = 0
        page = 1
        while page <= args.max_pages:
            url = (f"discover/{kind}?{query}&vote_count.gte={MIN_VOTES}"
                   f"&sort_by=popularity.desc&language=uk&page={page}")
            data = bc.tmdb(url)
            if not data.get("results"):
                break
            for item in data["results"]:
                if not allowed(item):
                    continue
                passed += 1
                path = os.path.join(CARDS_DIR, f"{'tv' if kind == 'tv' else ''}{item['id']}.json")
                if os.path.exists(path):
                    continue
                missing[(kind, item["id"])] = {
                    "id": item["id"],
                    "kind": kind,
                    "title": item.get("name") or item.get("title") or "",
                    "year": (item.get("first_air_date") or item.get("release_date") or "")[:4],
                    "overview": item.get("overview") or "",
                    "votes": item.get("vote_count"),
                    "tmdb": f"https://www.themoviedb.org/{kind}/{item['id']}",
                }
                found += 1
            if page >= min(data.get("total_pages", 1), args.max_pages):
                break
            page += 1
            time.sleep(0.05)
        print(f"{kind} [{query[:34]:34}] проходить {passed:4}, бракує {found:4}", flush=True)

    items = sorted(missing.values(), key=lambda x: -(x["votes"] or 0))
    print(f"\nразом бракує: {len(items)}")

    batches = [items[i:i + args.size] for i in range(0, len(items), args.size)]
    for n, batch in enumerate(batches, 1):
        with open(os.path.join(OUT_DIR, f"missing-{n:03d}.json"), "w", encoding="utf-8") as f:
            json.dump(batch, f, ensure_ascii=False, indent=1)
    print(f"пачок по {args.size}: {len(batches)} → {OUT_DIR}/missing-001.json …")


if __name__ == "__main__":
    main()
