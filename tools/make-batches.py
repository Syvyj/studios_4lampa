#!/usr/bin/env python3
"""Готує пачки назв для зовнішньої моделі.

Складає файли, які можна прикріпити в чат до Gemini, ChatGPT чи Perplexity
разом із промтом docs/prompt-cards-ai.md. У кожній пачці — те, що моделі
треба знати про назву, і нічого зайвого.

Порядок — за популярністю TMDB, тож перші пачки закривають найпотрібніше.

    python3 tools/make-batches.py --size 15
    python3 tools/make-batches.py --size 15 --need weak   # ще й слабкі картки

Результат — batches/batch-001.json і далі. Готові відповіді приймає
tools/import-cards.py.
"""

import argparse
import json
import os
import time
import importlib.util

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")
OUT_DIR = os.path.join(ROOT, "batches")

# Тягнемо TMDB-частину з генератора, щоб ключ і запити жили в одному місці
spec = importlib.util.spec_from_file_location("bc", os.path.join(ROOT, "tools", "build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)

# Що саме шукати: рік і тип, у порядку важливості
SOURCES = [("movie", 2026), ("movie", 2025), ("tv", 2025)]


def needs_work(card, mode):
    if not card.get("source"):
        return True
    if mode == "weak":
        return not card.get("ending_explained") and not card.get("easter_eggs")
    return False


def load_card(kind, tmdb_id):
    path = os.path.join(CARDS_DIR, f"{'tv' if kind == 'tv' else ''}{tmdb_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def en_title(kind, tmdb_id):
    """Англійська назва потрібна моделі для пошуку: за нею стаття знайдеться
    навіть тоді, коли оригінал написаний ієрогліфами."""
    try:
        d = bc.tmdb(f"{kind}/{tmdb_id}?language=en-US")
        return d.get("title") or d.get("name") or ""
    except Exception:
        return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=15, help="назв у пачці")
    parser.add_argument("--need", choices=("empty", "weak"), default="empty",
                        help="empty — лише без джерела; weak — ще й порожні за змістом")
    parser.add_argument("--limit", type=int, default=0, help="0 — усі знайдені")
    parser.add_argument("--no-wiki", action="store_true",
                        help="не шукати статті наперед — швидше, але модель шукатиме сама")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)

    # Спершу список назв — це швидко, лише TMDB. Пошук статей іде окремим
    # проходом, щоб було видно, скільки лишилось, і щоб Ctrl+C не з'їдав
    # усю роботу: пачки пишуться щойно назбирається розмір.
    print("збираю список назв із TMDB…", flush=True)
    todo, seen = [], set()

    for kind, year in SOURCES:
        page = 1
        while True:
            data = bc.discover(kind, year, 5, page)
            for raw in data.get("results", []):
                item = bc.normalize(raw, kind)
                key = (kind, item["id"])
                if key in seen:
                    continue
                seen.add(key)

                card = load_card(kind, item["id"])
                if card and not needs_work(card, args.need):
                    continue

                todo.append(item)
                if args.limit and len(todo) >= args.limit:
                    break

            if args.limit and len(todo) >= args.limit:
                break
            if page >= min(data.get("total_pages", 1), 500):
                break
            page += 1
            time.sleep(0.15)

        if args.limit and len(todo) >= args.limit:
            break

    print(f"назв до опрацювання: {len(todo)}")
    if not args.no_wiki:
        print("шукаю статті наперед — це найдовше; перервати можна будь-коли,\n"
              "готові пачки вже лежатимуть у batches/\n", flush=True)

    for old in os.listdir(OUT_DIR):
        if old.startswith("batch-") and old.endswith(".json"):
            os.remove(os.path.join(OUT_DIR, old))

    def flush_batch(batch, n):
        path = os.path.join(OUT_DIR, f"batch-{n:03d}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(batch, f, ensure_ascii=False, indent=1)
        print(f"   → {os.path.basename(path)} готова ({len(batch)} назв)", flush=True)

    batch, batch_no, with_wiki = [], 1, 0
    started = time.time()

    for i, item in enumerate(todo, 1):
        entry = {
            "id": item["id"],
            "kind": item["kind"],
            "title_uk": item["title"],
            "title_original": item["original"],
            "title_en": en_title(item["kind"], item["id"]),
            "year": item["year"],
            "overview": item["overview"],
            "tmdb": f"https://www.themoviedb.org/{item['kind']}/{item['id']}",
        }

        # Стаття, яку ми вже перевірили за назвою і роком. Модель не мусить
        # шукати наосліп — і не потрапить на однойменний твір, на чому ми
        # вже двічі горіли.
        note = ""
        if not args.no_wiki:
            art = bc.find_article(item)
            if art:
                entry["wikipedia"] = {
                    "title": art["title"],
                    "lang": art["lang"],
                    "url": f"https://{art['lang']}.wikipedia.org/wiki/"
                           + art["title"].replace(" ", "_"),
                }
                with_wiki += 1
                note = f"стаття: {art['lang']}:{art['title'][:40]}"
            else:
                note = "статті немає"

        eta = (time.time() - started) / i * (len(todo) - i) / 60
        print(f"{i}/{len(todo)} {item['title'][:32]:32} {note:52} ~{eta:.0f} хв", flush=True)

        batch.append(entry)
        if len(batch) >= args.size:
            flush_batch(batch, batch_no)
            batch, batch_no = [], batch_no + 1

    if batch:
        flush_batch(batch, batch_no)

    print(f"\nпачок по {args.size}: {batch_no if batch else batch_no - 1}"
          f" · зі знайденою статтею {with_wiki} із {len(todo)}")
    print("\nдалі: відкрий docs/prompt-cards-ai.md, скопіюй промт у чат,")
    print("прикріпи одну пачку, відповідь збережи як batches/done-001.json,")
    print("потім: python3 tools/import-cards.py batches/done-*.json")


if __name__ == "__main__":
    main()
