#!/usr/bin/env python3
"""Лагодить мову в готових картках.

Модель пише здебільшого пристойно, але має сталі покручі: «глядателям»
замість «глядачам», «поклонникам» замість «шанувальникам», активні
дієприкметники («захоплюючий») і канцелярське «рекомендується для».
Перегенерувати 1482 картки заради цього — години роботи, тож правимо текст.

Заміни навмисно лише лексичні й однозначні: жодних спроб перебудувати
речення. Те, що потребує зміни відмінків, лишаємо моделі — вона тепер
має відповідні правила в SYSTEM.

    python3 tools/fix-language.py --dry-run    # показати, нічого не чіпати
    python3 tools/fix-language.py              # застосувати
"""

import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")

# Заміни за основою слова: закінчення зберігається, тож одне правило
# накриває всі відмінки. Порядок має значення — довші основи спершу.
STEMS = [
    ("глядател", "глядач"),        # глядателям → глядачам
    ("поклонник", "шанувальник"),
    ("мужчин", "чоловік"),
    ("женщин", "жінк"),
    # Активні дієприкметники — найпомітніша ознака машинної української
    ("захоплююч", "захоплив"),     # захоплюючий → захопливий
    ("вражаюч", "приголомшлив"),
    ("потрясаюч", "приголомшлив"),
    ("інтригуюч", "загадков"),
    ("шокуюч", "приголомшлив"),
]

# Цілі звороти. Зміни відмінків не потребують: перевірено на корпусі.
PHRASES = [
    (r"\bНе рекомендується для\b", "Не для"),
    (r"\bне рекомендується для\b", "не для"),
    (r"\bРекомендується для\b", "Для"),
    (r"\bрекомендується для\b", "для"),
    (r"\bРекомендується\b", "Підійде"),
    (r"\bрекомендується\b", "підійде"),
    (r"\bна протязі\b", "протягом"),
    (r"\bне дивлячись на\b", "попри"),
    (r"\bв кінці кінців\b", "зрештою"),
    (r"\bпо крайній мірі\b", "принаймні"),
    (r"\bданий фільм\b", "фільм"),
    (r"\bданий серіал\b", "серіал"),
]


def keep_case(src, dst):
    """Заміна не має ламати велику літеру на початку речення."""
    if src[:1].isupper():
        return dst[:1].upper() + dst[1:]
    return dst


# Основа й закінчення мають узгодитись за твердістю: у «глядател-ям» основа
# мʼяка, у «глядач-» тверда, тож механічне склеювання дає «глядачям».
SOFTEN = str.maketrans({"я": "а", "ю": "у", "є": "е", "ї": "і",
                        "Я": "А", "Ю": "У", "Є": "Е", "Ї": "І"})
HARD_END = ("ч", "ш", "ж", "щ", "к", "г", "х", "в", "б", "п", "м", "ф")


def join_stem(stem, ending):
    """Приклеює закінчення до нової основи, твердячи його за потреби."""
    if stem.endswith(HARD_END) and ending[:1] in "яюєї":
        return stem + ending.translate(SOFTEN)
    return stem + ending


def fix_text(text):
    if not isinstance(text, str) or not text:
        return text, 0

    hits = 0
    for stem, repl in STEMS:
        def sub(m):
            nonlocal hits
            hits += 1
            return keep_case(m.group(0), join_stem(repl, m.group(1)))
        # Основа плюс закінчення: (\w*) — це відмінкове закінчення
        text = re.sub(stem + r"(\w*)", sub, text, flags=re.I)

    for pat, repl in PHRASES:
        text, n = re.subn(pat, repl, text)
        hits += n

    return text, hits


def walk(node):
    """Проходить картку й лагодить кожен рядок, лишаючи структуру як є."""
    if isinstance(node, str):
        return fix_text(node)
    if isinstance(node, list):
        total = 0
        out = []
        for v in node:
            v, n = walk(v)
            out.append(v)
            total += n
        return out, total
    if isinstance(node, dict):
        total = 0
        out = {}
        for k, v in node.items():
            # Назву фільму, джерело й дати не чіпаємо: там заміна лише зашкодить
            if k in ("title", "source", "generated", "searched", "id", "kind", "year"):
                out[k] = v
                continue
            v, n = walk(v)
            out[k] = v
            total += n
        return out, total
    return node, 0


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--show", type=int, default=12, help="скільки прикладів показати")
    args = parser.parse_args()

    changed = total_hits = 0
    shown = 0

    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue
        path = os.path.join(CARDS_DIR, name)
        with open(path, encoding="utf-8") as f:
            card = json.load(f)

        before = json.dumps(card, ensure_ascii=False)
        fixed, hits = walk(card)
        if not hits:
            continue

        changed += 1
        total_hits += hits

        if shown < args.show:
            after = json.dumps(fixed, ensure_ascii=False)
            for a, b in zip(before.split(". "), after.split(". ")):
                if a != b:
                    print(f"  {name}\n    було:  {a[:110]}\n    стало: {b[:110]}")
                    shown += 1
                    break

        if not args.dry_run:
            with open(path, "w", encoding="utf-8") as f:
                json.dump(fixed, f, ensure_ascii=False, separators=(",", ":"))

    verb = "потребують правки" if args.dry_run else "виправлено"
    print(f"\n{verb}: {changed} карток, замін {total_hits}")


if __name__ == "__main__":
    main()
