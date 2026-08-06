#!/usr/bin/env python3
"""Дев-сервер плагіна.

Відрізняється від `python -m http.server` одним, але критичним: забороняє
кешування. Без заголовка Cache-Control браузер телевізора сам вирішує,
скільки тримати стару копію likhtar.js — і оновлення «не доїжджають»,
хоч файл на диску вже новий.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8099
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()


if __name__ == '__main__':
    print(f'Ліхтар: віддаю {ROOT} на 0.0.0.0:{PORT} (кеш вимкнено)')
    http.server.ThreadingHTTPServer(('0.0.0.0', PORT), NoCacheHandler).serve_forever()
