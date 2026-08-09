#!/usr/bin/env python3
"""Готує пачки для написання панелі «Чи варто дивитись?».

Модель отримує лише матеріал для судження — назву, рік і опис — і більше
нічого. Ні фіналу, ні фактів, ні джерела, ні поточного тексту панелі.

Так зроблено навмисно, після того як ChatGPT стер фінал і факти в 11 із 15
карток, хоча промт прямо це забороняв. Поки заборонене поле лежить у
відповіді, воно може бути зіпсоване; якщо його там немає — не може.
Захист має бути в даних, а не в слухняності моделі.

Поточний текст панелі теж не надсилаємо: інакше модель «покращує» наявну
тавтологію, чіпляючись за неї, замість написати свіже.

    python3 tools/make-review-batches.py --size 40

Результат — review/batch-001.json і далі. Відповідь приймає merge-watch.py,
який вписує назад ЛИШЕ поля панелі, а решту картки бере з диска.
"""

import argparse
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")
OUT_DIR = os.path.join(ROOT, "review")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--size", type=int, default=40)
    parser.add_argument("--limit", type=int, default=0, help="0 — усі знайдені")
    args = parser.parse_args()

    os.makedirs(OUT_DIR, exist_ok=True)
    for old in os.listdir(OUT_DIR):
        if old.startswith("batch-") and old.endswith(".json"):
            os.remove(os.path.join(OUT_DIR, old))

    items = []
    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue
        with open(os.path.join(CARDS_DIR, name), encoding="utf-8") as f:
            card = json.load(f)

        # Без опису судити нема з чого — така картка порожня в принципі
        if not (card.get("summary") or "").strip():
            continue

        items.append({
            "id": card["id"],
            "kind": card.get("kind", "movie"),
            "title": card.get("title", ""),
            "year": card.get("year", ""),
            "summary": card["summary"],
        })
        if args.limit and len(items) >= args.limit:
            break

    print(f"карток з матеріалом для судження: {len(items)}")

    batches = [items[i:i + args.size] for i in range(0, len(items), args.size)]
    for n, batch in enumerate(batches, 1):
        path = os.path.join(OUT_DIR, f"batch-{n:03d}.json")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(batch, f, ensure_ascii=False, indent=1)

    print(f"пачок по {args.size}: {len(batches)} → {OUT_DIR}/batch-001.json …")
    print("\nдалі: docs/prompt-review-watch.md → чат → одна пачка,")
    print("відповідь зберегти як review/done-001.json, потім:")
    print("python3 tools/merge-watch.py review/done-*.json")


if __name__ == "__main__":
    main()
