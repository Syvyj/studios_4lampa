#!/usr/bin/env python3
"""Наповнює картки з посилань, які make-batches.py вже знайшов і перевірив.

Коли пачку робить зовнішня модель, вона отримує "wikipedia" — готову
статтю, звірену за назвою й роком. Якщо пачку в чат так і не віддали,
це посилання нікуди не зникає — можна прогнати ним локальну модель,
без жодного нового пошуку й без жодної оплати.

Це саме той шлях, яким робились фільми 2026 і 2025: build-cards.py, тільки
статтю бере не сам, а з файлу. Повторний пошук став би тисячами зайвих
запитів до Вікіпедії — тут його немає.

    python3 tools/fill-from-batches.py

Переривати можна: готові картки пропускаються, як і завжди.
"""

import glob
import importlib.util
import json
import os
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("bc", os.path.join(ROOT, "tools", "build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)


def article_from_hint(hint, item):
    """Повторює розбір статті з build-cards.py, але за вже відомою назвою —
    без wiki_search, лише wiki_extract і перевірка розміру/сюжету."""
    try:
        text = bc.wiki_extract(hint["lang"], hint["title"])
    except Exception:
        return None
    if len(text) < 1200:
        return None
    if not bc.same_work(hint["title"], text, item["year"]):
        return None

    sections = bc.split_sections(text)
    plot = next((sections[k] for k in bc.PLOT_SECTIONS if len(sections.get(k, "")) > 300), "")
    if not plot:
        return None

    production = "\n\n".join(
        f"{name}:\n{body}" for name, body in sections.items()
        if bc.PROD_SECTIONS.search(name) and len(body) > 200
    )
    return {"lang": hint["lang"], "title": hint["title"], "plot": plot,
            "production": production, "raw": text}


def build_with_known_article(item, article):
    """Копія build-cards.py:build(), тільки find_article() не викликається."""
    kind = bc.KINDS[item["kind"]]
    prompt = bc.TEMPLATE.format(
        kind_word=kind["word"], kind_gen=kind["gen"], ending_hint=kind["ending_hint"],
        title=item["title"], year=item["year"] or "невідомо",
        overview=item["overview"].strip() or "(немає)",
        plot=(article["plot"][:6000] if article else "(матеріалу немає)"),
        production=(article["production"][:8000] if article and article["production"] else "(матеріалу немає)"),
    )
    card = None
    for _ in range(2):
        card = bc.parse_json(bc.ask_model(prompt))
        if card:
            break
    if not card:
        return None, ["відповідь моделі не є JSON навіть після повтору"]

    report = bc.validate(card, article)
    card["id"] = item["id"]
    card["kind"] = item["kind"]
    card["title"] = item["title"]
    card["year"] = item["year"]
    card["source"] = {"wiki": article["title"], "lang": article["lang"]} if article else None
    card["generated"] = time.strftime("%Y-%m-%d")
    if not article:
        card["searched"] = time.strftime("%Y-%m-%d")
    return card, report


def main():
    todo = []
    for path in sorted(glob.glob(os.path.join(ROOT, "batches", "batch-*.json"))):
        for x in json.load(open(path, encoding="utf-8")):
            if x.get("wikipedia"):
                todo.append(x)

    print(f"назв зі знайденою статтею: {len(todo)}", flush=True)

    made = skipped = failed = 0
    started = time.time()

    for i, x in enumerate(todo, 1):
        item = {"id": x["id"], "kind": x["kind"], "title": x["title_uk"],
                "original": x["title_original"], "year": x["year"],
                "overview": x.get("overview") or ""}
        path = bc.card_path(item)

        if os.path.exists(path):
            with open(path, encoding="utf-8") as f:
                existing = json.load(f)
            if existing.get("source") and (existing.get("ending_explained") or existing.get("easter_eggs")):
                skipped += 1
                continue

        t0 = time.time()
        article = article_from_hint(x["wikipedia"], item)
        try:
            card, report = build_with_known_article(item, article)
        except Exception as e:
            print(f"{i}/{len(todo)} ✖ {item['title']}: {e}", flush=True)
            failed += 1
            continue

        if not card:
            print(f"{i}/{len(todo)} ✖ {item['title']}: {report}", flush=True)
            failed += 1
            continue

        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(card, f, ensure_ascii=False, separators=(",", ":"))

        made += 1
        eggs = len(card.get("easter_eggs") or [])
        ending = "є" if card.get("ending_explained") else "—"
        note = ("; " + "; ".join(report)) if report else ""
        eta = (time.time() - started) / made * (len(todo) - i) / 60
        print(f"{i}/{len(todo)} ✔ {item['title'][:34]:34} "
              f"{time.time()-t0:4.1f}с фінал:{ending} фактів:{eggs}{note}  "
              f"(лишилось ~{eta:.0f} хв)", flush=True)

    print(f"\nстворено {made}, пропущено {skipped}, помилок {failed}, "
          f"загалом {(time.time()-started)/60:.0f} хв", flush=True)

    from importlib import import_module
    movies, series = [], []
    cards_dir = os.path.join(ROOT, "cards")
    for name in os.listdir(cards_dir):
        if not name.endswith(".json") or name == "index.json":
            continue
        stem = name[:-5]
        if stem.startswith("tv") and stem[2:].isdigit():
            series.append(int(stem[2:]))
        elif stem.isdigit():
            movies.append(int(stem))
    with open(os.path.join(cards_dir, "index.json"), "w", encoding="utf-8") as f:
        json.dump({"ids": sorted(movies), "tv": sorted(series),
                   "updated": time.strftime("%Y-%m-%d")}, f, separators=(",", ":"))
    print(f"індекс: {len(movies)} фільмів, {len(series)} серіалів", flush=True)


if __name__ == "__main__":
    main()
