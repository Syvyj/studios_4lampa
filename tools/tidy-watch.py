#!/usr/bin/env python3
"""
Причісує «Для тебе, якщо…» та «Не для тебе, бо…» в базі карток.

Панель переїхала на перший екран, і різнобій став видно: частина значень
з малої літери, частина без крапки, а кожне третє починається з «Для» —
того самого прийменника, що вже стоїть у підписі над рядком.

Правки лише механічні, зміст не чіпаємо: прибрати початкове «Для/для»,
велика перша літера, крапка в кінці. Пише тільки watch.for і watch.not_for,
решта картки лишається як була (те саме правило, що в merge-watch.py).

    python3 tools/tidy-watch.py --dry-run
    python3 tools/tidy-watch.py
"""

import argparse
import json
import os
import re

CARDS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "cards")

# «Для тих, хто…» → «Тих, хто…». Але «Для дітей» лишаємо: без прийменника
# воно втрачає сенс рядка, а не лише повторення підпису.
LEAD_FOR = re.compile(r"^\s*[Дд]ля\s+(?=тих|тим|шануваль|фанат|любител|глядач|люд|дошкільн|маленьк|сімейн|родинн|поціновув)", re.I)

# У «не для тебе, бо…» заперечення вже стоїть у підписі: «Не для тих, хто
# очікує…» читалося б як подвійне.
LEAD_NOT_FOR = re.compile(r"^\s*[Нн]е\s+для\s+(?=тих|тим|шануваль|фанат|любител|глядач|люд|дошкільн|маленьк)", re.I)


def tidy(text, negative=False):
    if not text:
        return text

    out = (LEAD_NOT_FOR if negative else LEAD_FOR).sub("", text)
    out = LEAD_FOR.sub("", out).strip()
    if not out:
        return text

    out = out[0].upper() + out[1:]
    if not out.endswith((".", "!", "?", "…")):
        out += "."
    return out


def selftest():
    cases = [
        ("для тих, хто любить драми", False, "Тих, хто любить драми."),
        ("Не для тих, хто очікує оригінальності.", True, "Тих, хто очікує оригінальності."),
        ("не для тих, хто не любить фентезі", True, "Тих, хто не любить фентезі."),
        ("Любителям трешу.", False, "Любителям трешу."),
        ("Для дітей від 8 років", False, "Для дітей від 8 років."),
        ("Тим, хто любить саспенс", True, "Тим, хто любить саспенс."),
        ("", False, ""),
        (None, False, None),
    ]
    for src, negative, expected in cases:
        got = tidy(src, negative=negative)
        assert got == expected, f"{src!r} → {got!r}, а мало бути {expected!r}"
    print("самоперевірка: ok")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--show", type=int, default=8, help="скільки прикладів показати")
    args = ap.parse_args()

    if args.selftest:
        return selftest()

    changed = shown = 0

    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue

        path = os.path.join(CARDS_DIR, name)
        with open(path, encoding="utf-8") as f:
            card = json.load(f)

        watch = card.get("watch") or {}
        touched = False

        for key in ("for", "not_for"):
            before = watch.get(key)
            after = tidy(before, negative=(key == "not_for"))
            if after and after != before:
                watch[key] = after
                touched = True
                if shown < args.show:
                    print(f"  {name}\n    – {before}\n    + {after}")
                    shown += 1

        if not touched:
            continue

        changed += 1
        if not args.dry_run:
            card["watch"] = watch
            with open(path, "w", encoding="utf-8") as f:
                json.dump(card, f, ensure_ascii=False, separators=(",", ":"))

    print(f"\n{'було б виправлено' if args.dry_run else 'виправлено'}: {changed} карток")


if __name__ == "__main__":
    main()
