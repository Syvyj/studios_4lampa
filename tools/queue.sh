#!/bin/bash
# Черга генерації карток.
#
# Модель одна, тож завдання виконуються строго одне за одним: паралельні
# запуски лише сповільнюють обидва. Якщо генератор уже працює (наприклад,
# фільми 2026), черга чекає, поки він закінчить.
#
#   tools/queue.sh "--kind movie --year 2025" "--kind tv --year 2025"
#   tail -f /tmp/cards-queue.log
#
# Перериватися безпечно: готові картки при повторному запуску пропускаються.

set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG=/tmp/cards-queue.log
cd "$ROOT" || exit 1

if [ $# -eq 0 ]; then
  echo "вкажіть хоча б одне завдання, напр.: $0 \"--kind tv --year 2025\"" >&2
  exit 1
fi

# Дужки в шаблоні — щоб pgrep не знайшов сам себе.
while pgrep -f "[b]uild-cards.py" >/dev/null; do
  echo "$(date '+%H:%M:%S') чекаю: генератор ще працює" >> "$LOG"
  sleep 60
done

for job in "$@"; do
  {
    echo
    echo "=== $(date '+%Y-%m-%d %H:%M:%S')  build-cards.py $job"
  } >> "$LOG"
  # shellcheck disable=SC2086 — параметри завдання мають розбитися на слова
  python3 tools/build-cards.py $job >> "$LOG" 2>&1
done

echo "=== $(date '+%Y-%m-%d %H:%M:%S')  черга порожня" >> "$LOG"
