"""Capture the reproduced screens with Playwright and report console errors.

Usage:  python scripts/capture.py
The dev server is expected on http://localhost:4970 (npm run dev -- -p 4970).
"""

from __future__ import annotations

import asyncio
import json
from pathlib import Path

from playwright.async_api import async_playwright

BASE_URL = "http://localhost:4970"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

# (file name, path, viewport width, viewport height)
SHOTS = [
    ("landing-mobile.png", "/fr", 420, 900),
    ("landing-desktop.png", "/fr", 1280, 850),
    ("accueil.png", "/fr/accueil", 420, 900),
]

# Responsive sanity checks: no horizontal overflow at these widths.
OVERFLOW_CHECKS = [
    ("/fr", 360, 780),
    ("/fr", 768, 1024),
    ("/fr", 1440, 900),
    ("/fr/accueil", 360, 780),
    ("/fr/accueil", 480, 900),
    ("/fr/accueil", 1440, 900),
]


async def capture() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []
    report: list[dict[str, object]] = []

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()

        for name, path, width, height in SHOTS:
            context = await browser.new_context(
                viewport={"width": width, "height": height},
                device_scale_factor=1,
            )
            page = await context.new_page()

            console: list[str] = []
            page.on(
                "console",
                lambda msg, sink=console: sink.append(f"{msg.type}: {msg.text}")
                if msg.type in ("error", "warning")
                else None,
            )
            page.on(
                "pageerror",
                lambda exc, sink=console: sink.append(f"pageerror: {exc}"),
            )

            response = await page.goto(f"{BASE_URL}{path}", wait_until="load")
            try:
                await page.wait_for_load_state("networkidle", timeout=10_000)
            except Exception as exc:  # noqa: BLE001 - dev server keeps a hot socket open
                console.append(f"networkidle-timeout: {exc.__class__.__name__}")
            await page.evaluate("document.fonts.ready")
            await page.wait_for_timeout(400)

            target = DOCS_DIR / name
            await page.screenshot(path=str(target))

            font_family = await page.evaluate(
                "getComputedStyle(document.body).fontFamily"
            )
            background = await page.evaluate(
                "getComputedStyle(document.body).backgroundColor"
            )
            scroll_height = await page.evaluate(
                "document.documentElement.scrollHeight"
            )
            fonts = await page.evaluate(
                "[...document.fonts].map(f => `${f.family} ${f.weight} ${f.status}`)"
            )
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )

            report.append(
                {
                    "shot": name,
                    "url": page.url,
                    "status": response.status if response else None,
                    "body_font": font_family,
                    "fonts_loaded": fonts,
                    "body_bg": background,
                    "scroll_height": scroll_height,
                    "horizontal_overflow_px": overflow,
                }
            )
            if overflow > 0:
                problems.append(f"{name} -> horizontal overflow of {overflow}px")
            if console:
                problems.extend(f"{name} -> {line}" for line in console)
            await context.close()

        # Responsive overflow sweep
        for path, width, height in OVERFLOW_CHECKS:
            page = await browser.new_page(
                viewport={"width": width, "height": height}
            )
            await page.goto(f"{BASE_URL}{path}", wait_until="domcontentloaded")
            await page.wait_for_timeout(600)
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            report.append(
                {
                    "shot": f"overflow-check {path} @{width}",
                    "horizontal_overflow_px": overflow,
                }
            )
            if overflow > 0:
                problems.append(
                    f"{path} @{width}px -> horizontal overflow of {overflow}px"
                )
            await page.close()

        # "/" must land on the landing page
        page = await browser.new_page(viewport={"width": 420, "height": 900})
        await page.goto(BASE_URL, wait_until="domcontentloaded")
        await page.wait_for_timeout(500)
        report.append({"shot": "root-redirect", "url": page.url})
        await page.close()

        await browser.close()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print("\nCONSOLE ERRORS/WARNINGS:", len(problems))
    for line in problems:
        print(" -", line)


if __name__ == "__main__":
    asyncio.run(capture())
