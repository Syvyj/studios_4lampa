#!/usr/bin/env python3
"""Приймає картки, зроблені зовнішньою моделлю, і кладе їх у cards/.

Довіряти відповіді з чату не можна: моделі плутають поля, вигадують id,
загортають JSON у Markdown і пишуть «глядателям». Тому все, що приходить,
перевіряється, а мовні покручі лагодяться тим самим tools/fix-language.py.

    python3 tools/import-cards.py batches/done-001.json
    python3 tools/import-cards.py --dry-run batches/done-*.json

Картку відхиляємо цілком, якщо зламана структура. Якщо ж підозріле лише
одне поле — прибираємо поле, а картку беремо.
"""

import argparse
import importlib.util
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")

spec = importlib.util.spec_from_file_location("fx", os.path.join(ROOT, "tools", "fix-language.py"))
fx = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fx)

TEXT_MIN = {"summary": 40, "ending_explained": 180}

# Фрази, якими модель прикриває незнання: якщо фінал такий — його немає
VAGUE = re.compile(
    r"залиша(є|ють)\s+(простір|місце)|неоднозначн|для інтерпретац|"
    r"відкрит(ий|им)\s+фінал|кожен глядач|можна трактувати|"
    r"інформації про фінал|невідомо|"
    # Відписки замість порожнього поля: модель звітує, що не знайшла, і це
    # потрапляє в базу як «пояснення фіналу». Порожнє поле краще за таке.
    r"не вдалося (під|з)твердити|не описано|немає (даних|відомостей)|"
    r"джерел(а|о) не знайдено|бракує (даних|матеріалу)", re.I)


def parse_payload(text):
    """Дістає JSON навіть із відповіді, загорнутої в Markdown чи балачки."""
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", text)
    if fence:
        text = fence.group(1)
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1:
        start, end = text.find("{"), text.rfind("}")
        if start == -1:
            return None
        try:
            return [json.loads(text[start:end + 1])]
        except Exception:
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


def check(card):
    """Повертає (вичищена картка, список зауважень) або (None, причина відмови)."""
    notes = []

    if not isinstance(card, dict):
        return None, ["не обʼєкт"]
    if not isinstance(card.get("id"), int):
        return None, ["немає числового id"]
    if card.get("kind") not in ("movie", "tv"):
        return None, ["kind має бути movie або tv"]
    if not isinstance(card.get("title"), str) or not card["title"].strip():
        return None, ["немає назви"]

    out = {"id": card["id"], "kind": card["kind"], "title": card["title"].strip(),
           "year": str(card.get("year") or "")[:4]}

    summary = card.get("summary")
    if not isinstance(summary, str) or len(summary) < TEXT_MIN["summary"]:
        return None, ["опис відсутній або надто короткий"]
    out["summary"] = summary.strip()

    watch = card.get("watch") or {}
    out["watch"] = {k: (watch.get(k) or "").strip() if isinstance(watch.get(k), str) else ""
                    for k in ("worth", "for", "not_for")}

    mood = card.get("mood") or []
    out["mood"] = [m.strip() for m in mood if isinstance(m, str) and m.strip()][:5]

    for key, low, high, default in (("complexity", 1, 5, 3), ("violence", 0, 5, 0),
                                    ("erotica", 0, 5, 0)):
        block = card.get(key) or {}
        if not isinstance(block, dict):
            block = {}
        out[key] = {"score": clamp(block.get("score"), low, high, default),
                    "description": (block.get("description") or "").strip()}

    kids = card.get("children") or {}
    out["children"] = {"recommended": bool(kids.get("recommended")),
                       "description": (kids.get("description") or "").strip()}

    ending = card.get("ending_explained")
    ending = ending.strip() if isinstance(ending, str) else ""
    if ending and len(ending) < TEXT_MIN["ending_explained"]:
        notes.append("фінал прибрано: надто коротко")
        ending = ""
    if ending and VAGUE.search(ending):
        notes.append("фінал прибрано: загальні фрази замість подій")
        ending = ""
    out["ending_explained"] = ending

    eggs = card.get("easter_eggs") or []
    kept = [e.strip() for e in eggs if isinstance(e, str) and len(e.strip()) > 20]
    if len(kept) != len(eggs):
        notes.append(f"фактів відкинуто: {len(eggs) - len(kept)}")
    out["easter_eggs"] = kept[:6]

    src = card.get("source")
    if isinstance(src, dict) and src.get("wiki"):
        out["source"] = {"wiki": str(src["wiki"])[:200], "lang": str(src.get("lang") or "")[:5]}
    else:
        out["source"] = None
        if ending or kept:
            # Фінал і факти без названого джерела — саме так виглядає вигадка
            notes.append("джерела не названо: фінал і факти прибрано")
            out["ending_explained"] = ""
            out["easter_eggs"] = []

    out["generated"] = card.get("generated") or ""
    fixed, hits = fx.walk(out)
    if hits:
        notes.append(f"мовних правок: {hits}")
    return fixed, notes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("files", nargs="*")
    parser.add_argument("--clipboard", action="store_true",
                        help="взяти відповідь просто з буфера обміну")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--overwrite", action="store_true",
                        help="перезаписувати картки, які вже мають джерело")
    args = parser.parse_args()

    added = replaced = skipped = rejected = 0

    # Буфер обміну — щоб не створювати файл руками: скопіював відповідь у
    # чаті й одразу залив. Для моделей, які не вміють писати на диск.
    sources = []
    if args.clipboard:
        import subprocess
        try:
            # pbpaste віддає текст у кодуванні локалі, а якщо LANG не задано —
            # трактує його як MacRoman, і кирилиця перетворюється на «–Ґ–Њ».
            # Тому вимагаємо UTF-8 явно й декодуємо самі.
            env = dict(os.environ, LANG="en_US.UTF-8", LC_CTYPE="UTF-8")
            raw = subprocess.run(["pbpaste"], capture_output=True, check=True,
                                 env=env).stdout
            text = raw.decode("utf-8", "replace")
        except Exception as e:
            print(f"не вдалось прочитати буфер обміну: {e}")
            return
        sources.append(("буфер обміну", text))

    for path in args.files:
        with open(path, encoding="utf-8") as f:
            sources.append((path, f.read()))

    if not sources:
        print("вкажіть файл або --clipboard")
        return

    for path, text in sources:
        payload = parse_payload(text)
        if payload is None:
            print(f"{path}: не вдалось прочитати JSON")
            continue
        print(f"{path}: карток у відповіді {len(payload)}")

        for raw in payload:
            card, notes = check(raw)
            title = (raw or {}).get("title", "?") if isinstance(raw, dict) else "?"
            if card is None:
                print(f"  ✖ {str(title)[:34]:34} {'; '.join(notes)}")
                rejected += 1
                continue

            name = f"{'tv' if card['kind'] == 'tv' else ''}{card['id']}.json"
            dest = os.path.join(CARDS_DIR, name)

            if os.path.exists(dest) and not args.overwrite:
                with open(dest, encoding="utf-8") as f:
                    old = json.load(f)
                if old.get("source") and not card["source"]:
                    print(f"  = {card['title'][:34]:34} лишаю наявну: у новій немає джерела")
                    skipped += 1
                    continue

            existed = os.path.exists(dest)
            if not args.dry_run:
                with open(dest, "w", encoding="utf-8") as f:
                    json.dump(card, f, ensure_ascii=False, separators=(",", ":"))

            mark = "↻" if existed else "+"
            note = ("; " + "; ".join(notes)) if notes else ""
            print(f"  {mark} {card['title'][:34]:34} "
                  f"джерело:{'є' if card['source'] else '—'} "
                  f"фінал:{'є' if card['ending_explained'] else '—'} "
                  f"фактів:{len(card['easter_eggs'])}{note}")
            replaced += existed
            added += not existed

    print(f"\nдодано {added}, оновлено {replaced}, лишено {skipped}, відхилено {rejected}")

    if not args.dry_run:
        movies, series = [], []
        for name in os.listdir(CARDS_DIR):
            if not name.endswith(".json") or name == "index.json":
                continue
            stem = name[:-5]
            if stem.startswith("tv") and stem[2:].isdigit():
                series.append(int(stem[2:]))
            elif stem.isdigit():
                movies.append(int(stem))
        import time
        with open(os.path.join(CARDS_DIR, "index.json"), "w", encoding="utf-8") as f:
            json.dump({"ids": sorted(movies), "tv": sorted(series),
                       "updated": time.strftime("%Y-%m-%d")}, f, separators=(",", ":"))
        print(f"індекс: {len(movies)} фільмів, {len(series)} серіалів")


if __name__ == "__main__":
    main()
