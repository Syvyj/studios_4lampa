#!/usr/bin/env python3
"""Готує пачки готових карток для редагування "Чи варто дивитись?".

На відміну від make-batches.py, тут не бракує матеріалу — картки вже мають
watch/mood/оцінки, треба лише прибрати тавтологію між полями та випадкові
перекручення слів. Жодного нового пошуку, тож моделі не потрібен доступ
до мережі — чиста робота з текстом, яка коштує дешевше за наповнення.

    python3 tools/make-review-batches.py --size 40

Результат — review/batch-001.json і далі. Відповідь ChatGPT/Gemini приймає
tools/import-cards.py так само, як і звичайні картки.
"""

import argparse
import glob
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")
OUT_DIR = os.path.join(ROOT, "review")


def has_watch(card):
    w = card.get("watch") or {}
    return bool(w.get("worth") and w.get("for") and w.get("not_for"))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=40)
    parser.add_argument("--limit", type=int, default=0, help="0 — усі знайдені")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        if old.startswith("batch-") and old.endswith(".json"):
            os.remove(os.path.join(OUT_DIR, old))

    cards = []
    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue
        with open(os.path.join(CARDS_DIR, name), encoding="utf-8") as f:
            card = json.load(f)
        if has_watch(card):
            cards.append(card)
        if args.limit and len(cards) >= args.limit:
            break

    print(f"карток на редагування: {len(cards)}")

    batches = [cards[i:i + args.size] for i in range(0, len(cards), args.size)]
    for n, batch in enumerate(batches, 1):
        path = os.path.join(OUT_DIR, f"batch-{n:03d}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(batch, f, ensure_ascii=False, indent=1)

    print(f"пачок по {args.size}: {len(batches)} → {OUT_DIR}/batch-001.json …")
    print("\nдалі: docs/prompt-review-watch.md → чат → одна пачка,")
    print("відповідь зберегти як review/done-001.json, потім:")
    print("python3 tools/import-cards.py review/done-*.json")


if __name__ == "__main__":
    main()
