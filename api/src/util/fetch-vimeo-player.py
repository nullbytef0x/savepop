#!/usr/bin/env python3

import sys
from urllib.parse import urlparse

from curl_cffi import requests


def main():
    if len(sys.argv) != 2:
        raise SystemExit(2)

    url = sys.argv[1]
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname != "player.vimeo.com":
        raise SystemExit(2)

    response = None
    for _ in range(3):
        try:
            candidate = requests.get(
                url,
                impersonate="chrome131",
                headers={
                    "Accept-Encoding": "identity",
                    "Referer": "https://vimeo.com/",
                },
                timeout=10,
            )
            if candidate.status_code == 200:
                response = candidate
                break
        except Exception:
            pass

    if response is None or len(response.content) > 3 * 1024 * 1024:
        raise SystemExit(1)

    sys.stdout.buffer.write(response.content)


if __name__ == "__main__":
    main()
