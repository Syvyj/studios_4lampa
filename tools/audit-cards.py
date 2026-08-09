#!/usr/bin/env python3
"""Перевіряє базу на чужі статті та інші тихі дефекти.

Найнебезпечніший брак не виглядає як брак: картка має справжнє джерело,
складний фінал і конкретні факти — просто все це про інший фільм. Так уже
двічі ставалось: «Друзі та сусіди» тягнули статтю про «Друзі», «The
Huntsman» — про «Snow White and the Huntsman». Заземлення такого не ловить,
бо стаття справжня.

Тому звіряємо назву джерела з назвою в TMDB — і окремо шукаємо дрібніші
дефекти, які теж не видно оком у базі на тисячі карток.

    python3 tools/audit-cards.py              # вибірка на 80 карток
    python3 tools/audit-cards.py --all        # усі (довго: запит на картку)
    python3 tools/audit-cards.py --offline    # без мережі, лише тексти
"""

import argparse
import importlib.util
import json
import os
import random
import re
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CARDS_DIR = os.path.join(ROOT, "cards")

spec = importlib.util.spec_from_file_location("bc", os.path.join(ROOT, "tools", "build-cards.py"))
bc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bc)

# Сліди сирої розмітки: модель інколи вставляє шматок статті як є
MARKUP = re.compile(r"<!--|\[\[|\{\{|<ref|WP:")
# Відписки замість порожнього поля
EXCUSE = re.compile(r"не вдалося (під|з)твердити|у доступних матеріалах|"
                    r"немає (даних|відомостей)|інформації про фінал", re.I)

# Тавтологія в панелі. Порівнювати слова worth і for марно — українська
# словозміна ламає збіг («історії» проти «історій»). Але ознака структурна:
# коли worth починається зі звернення до глядача, він переказує for, бо
# думки про сам твір у ньому немає.
WEAK_WORTH = re.compile(r"^\s*(якщо|тим,? хто|для тих,? хто|шанувальник|фанат|любител)", re.I)
SOFT_WORTH = re.compile(r"може (сподобатися|зацікавити|бути цікав|припасти)", re.I)


def load_all():
    out = []
    for name in sorted(os.listdir(CARDS_DIR)):
        if not name.endswith(".json") or name == "index.json":
            continue
        with open(os.path.join(CARDS_DIR, name), encoding="utf-8") as f:
            out.append((name, json.load(f)))
    return out


def offline_checks(name, card):
    """Те, що видно без мережі."""
    problems = []
    blob = " ".join(filter(None, [
        card.get("summary") or "",
        card.get("ending_explained") or "",
        " ".join(card.get("easter_eggs") or []),
        json.dumps(card.get("watch") or {}, ensure_ascii=False),
    ]))

    if MARKUP.search(blob):
        problems.append("сира розмітка зі статті")
    if EXCUSE.search(blob):
        problems.append("відписка замість порожнього поля")

    lat = len(re.findall(r"[A-Za-z]", blob))
    cyr = len(re.findall(r"[А-Яа-яІіЇїЄєҐґ]", blob))
    if lat > cyr and len(blob) > 200:
        problems.append("текст переважно не українською")

    # Фінал чи факти без названого джерела — саме так виглядає вигадка
    if not card.get("source") and (card.get("ending_explained") or card.get("easter_eggs")):
        problems.append("фінал/факти без джерела")

    if WEAK_WORTH.match((card.get("watch") or {}).get("worth") or "") or \
       SOFT_WORTH.search((card.get("watch") or {}).get("worth") or ""):
        problems.append("worth звернений до глядача замість думки про твір")

    return problems


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--all", action="store_true", help="перевірити всі картки з джерелом")
    parser.add_argument("--sample", type=int, default=80)
    parser.add_argument("--offline", action="store_true", help="без запитів до TMDB")
    args = parser.parse_args()

    cards = load_all()
    print(f"карток у базі: {len(cards)}")

    # --- офлайнові перевірки: по всій базі, це швидко ---
    found = {}
    for name, card in cards:
        for p in offline_checks(name, card):
            found.setdefault(p, []).append(card.get("title") or name)

    print("\nтекстові дефекти:")
    if not found:
        print("  не знайдено")
    for problem, titles in sorted(found.items(), key=lambda kv: -len(kv[1])):
        print(f"  {len(titles):5}  {problem}")
        for t in titles[:3]:
            print(f"           · {t[:60]}")

    if args.offline:
        return

    # --- звірка джерела з TMDB: потребує запиту на кожну картку ---
    sourced = [(n, c) for n, c in cards if c.get("source")]
    if not args.all:
        random.seed(11)
        sourced = random.sample(sourced, min(args.sample, len(sourced)))

    print(f"\nзвіряю джерело з TMDB: {len(sourced)} карток…")
    wrong = []
    for name, card in sourced:
        kind = card.get("kind") or ("tv" if name.startswith("tv") else "movie")
        lang = card["source"].get("lang")
        try:
            d = bc.tmdb(f"{kind}/{card['id']}?language={'uk' if lang == 'uk' else 'en-US'}")
        except Exception:
            continue
        expected = d.get("title") or d.get("name") or ""
        if not bc.same_title(card["source"].get("wiki") or "", expected):
            wrong.append((card.get("title"), card["source"].get("wiki"), expected))
        time.sleep(0.02)

    print(f"чужа стаття: {len(wrong)}")
    for title, wiki, expected in wrong[:15]:
        print(f"  {str(title)[:30]:30} ← {str(wiki)[:34]:34} (очікувалось: {expected[:30]})")
    if wrong:
        print("\nПримітка: частина може бути хибним спрацюванням — стаття")
        print("англійською для назви, яку TMDB тримає іншою мовою.")


if __name__ == "__main__":
    main()
