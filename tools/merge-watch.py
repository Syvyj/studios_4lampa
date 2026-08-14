#!/usr/bin/env python3
"""Вписує в картки панель «Чи варто дивитись?» з відповіді моделі.

Головне тут — білий список полів. Модель може повернути що завгодно:
зайві поля, порожній фінал, чужий id у тексті — все, крім шести полів
панелі, просто ігнорується. Решта картки береться з диска й лишається
недоторканою навіть теоретично.

Саме цього бракувало import-cards.py: там модель надсилала цілу картку,
і одного разу стерла фінал та факти в 11 із 15 карток попри пряму заборону
в промті. Тут стирати нема чого — цих полів у відповіді просто не існує.

    python3 tools/merge-watch.py review/done-001.json
    python3 tools/merge-watch.py --dry-run review/done-*.json
"""

import argparse
import importlib.util
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")

spec = importlib.util.spec_from_file_location("fx", os.path.join(ROOT, "tools", "fix-language.py"))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)

# Єдине, що ми беремо з відповіді. Решта не існує для цього скрипта.
SCORES = {"complexity": (1, 5, 3), "violence": (0, 5, 0), "erotica": (0, 5, 0)}


def parse_payload(text):
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1)
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        return None
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return None


def clamp(value, low, high, default):
    try:
        n = int(value)
    except Exception:
        return default
    return max(low, min(high, n))


def panel_from(raw):
    """Дістає з відповіді лише дозволені поля. Повертає (поля, зауваження) або (None, чому).

    Дві задачі, той самий білий список: переписування панелі («Чи варто
    дивитись?») і добір джерела з фактами. Що з цього прийшло — те й
    беремо; чого немає у відповіді, того й не чіпаємо на диску.
    """
    if not isinstance(raw, dict) or not isinstance(raw.get("id"), int):
        return None, ["немає числового id"]

    notes = []
    out = {}

    # --- добір джерела й фактів ---
    if "easter_eggs" in raw or "source" in raw:
        src = raw.get("source")
        has_src = isinstance(src, dict) and src.get("wiki")
        eggs = [e.strip() for e in (raw.get("easter_eggs") or [])
                if isinstance(e, str) and len(e.strip()) > 20]

        if has_src:
            out["source"] = {"wiki": str(src["wiki"])[:200], "lang": str(src.get("lang") or "")[:5]}
            out["easter_eggs"] = eggs[:6]
        else:
            # Факти без названого джерела — саме так виглядає вигадка
            if eggs:
                notes.append(f"джерела не названо: {len(eggs)} фактів прибрано")
            out["easter_eggs"] = []

        if "watch" not in raw:                    # добір джерела, панель не чіпаємо
            fixed, hits = fx.walk(out)
            if hits:
                notes.append(f"мовних правок: {hits}")
            return fixed, notes

    watch = raw.get("watch") or {}
    parts = {k: (watch.get(k) or "").strip() if isinstance(watch.get(k), str) else ""
             for k in ("worth", "for", "not_for")}
    if not all(parts.values()):
        return None, ["панель порожня або неповна"]

    # Тавтологія, заради якої все й затівалось: worth не має переказувати for
    words = lambda s: set(re.findall(r"[\w’']{4,}", s.lower()))
    overlap = words(parts["worth"]) & words(parts["for"])
    if len(overlap) >= 4:
        notes.append(f"worth перегукується з for ({len(overlap)} спільних слів)")

    out["watch"] = parts

    mood = raw.get("mood") or []
    mood = [m.strip() for m in mood if isinstance(m, str) and m.strip()][:5]
    if mood:
        out["mood"] = mood

    for key, (low, high, default) in SCORES.items():
        block = raw.get(key)
        if isinstance(block, dict):
            out[key] = {"score": clamp(block.get("score"), low, high, default),
                        "description": (block.get("description") or "").strip()}

    kids = raw.get("children")
    if isinstance(kids, dict):
        out["children"] = {"recommended": bool(kids.get("recommended")),
                           "description": (kids.get("description") or "").strip()}

    fixed, hits = fx.walk(out)
    if hits:
        notes.append(f"мовних правок: {hits}")
    return fixed, notes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="+")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    merged = missing = rejected = 0

    for path in args.files:
        with open(path, encoding="utf-8") as f:
            payload = parse_payload(f.read())
        if payload is None:
            print(f"{path}: не вдалось прочитати JSON")
            continue

        print(f"{path}: карток у відповіді {len(payload)}")
        for raw in payload:
            panel, notes = panel_from(raw)
            title = (raw or {}).get("title", "?") if isinstance(raw, dict) else "?"

            if panel is None:
                print(f"  ✖ {str(title)[:34]:34} {'; '.join(notes)}")
                rejected += 1
                continue

            name = f"{'tv' if raw.get('kind') == 'tv' else ''}{raw['id']}.json"
            dest = os.path.join(CARDS_DIR, name)
            if not os.path.exists(dest):
                print(f"  ✖ {str(title)[:34]:34} картки {name} немає на диску")
                missing += 1
                continue

            with open(dest, encoding="utf-8") as f:
                card = json.load(f)

            card.update(panel)          # ← ось тут і весь захист: лише панель

            if not args.dry_run:
                with open(dest, "w", encoding="utf-8") as f:
                    json.dump(card, f, ensure_ascii=False, separators=(",", ":"))

            note = ("; " + "; ".join(notes)) if notes else ""
            keep = ("фінал:" + ("є" if card.get("ending_explained") else "—") +
                    " фактів:" + str(len(card.get("easter_eggs") or [])))
            print(f"  ↻ {card.get('title', '')[:34]:34} панель оновлено · {keep}{note}")
            merged += 1

    print(f"\nоновлено {merged}, немає на диску {missing}, відхилено {rejected}")


if __name__ == "__main__":
    main()
