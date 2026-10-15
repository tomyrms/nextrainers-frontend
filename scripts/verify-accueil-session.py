"""Accueil signed-out vs signed-in "Informations" block.

Signed out: the "Rejoignez Nextrainers" sign-up card shows (CTA -> inscription)
and no coach banner. Then registers a fresh account through the /api/session
proxy (the same calls the forms make) and reloads: the sign-up card is gone,
the coach banner shows, "Masquer" dismisses it and the dismissal survives a
reload. The hero CTA links to /fr/creer. Checks console errors and horizontal
overflow at 375 and 420 px in both states.

Saves docs/accueil-signedin.png.

Usage:  python scripts/verify-accueil-session.py
Expects the frontend on http://localhost:4970 (backend on :4900).
"""

from __future__ import annotations

import asyncio
import sys
import time
from pathlib import Path

from playwright.async_api import Page, async_playwright

BASE_URL = "http://localhost:4970"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'' if ok else '  -> ' + detail}")
    if not ok:
        failures.append(name)


async def no_overflow(page: Page) -> bool:
    return not await page.evaluate("document.documentElement.scrollWidth > window.innerWidth")


async def main() -> None:
    errors: list[str] = []
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        context = await browser.new_context(viewport={"width": 375, "height": 812})
        page = await context.new_page()
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))

        await page.goto(f"{BASE_URL}/fr/accueil")
        await page.locator("main").get_by_test_id("home-signup-card").wait_for()
        check("signed out: sign-up card visible", await page.locator("main").get_by_text("Rejoignez Nextrainers").is_visible())
        href = await page.get_by_role("link", name="S'inscrire").get_attribute("href")
        check("sign-up CTA -> /fr/inscription", href == "/fr/inscription", str(href))
        check("signed out: no coach banner", await page.locator("main").get_by_test_id("coach-dna-banner").count() == 0)
        cta = await page.get_by_role("link", name="Créer un nouvel entraînement").get_attribute("href")
        check("hero CTA -> /fr/creer", cta == "/fr/creer", str(cta))
        check("signed out: no overflow at 375px", await no_overflow(page))

        email = f"accueil_{int(time.time())}@test.dev"
        password = "password123"
        reg = await page.request.post(f"{BASE_URL}/api/session", data={"action": "register", "email": email, "password": password})
        log = await page.request.post(f"{BASE_URL}/api/session", data={"action": "login", "email": email, "password": password})
        check("register + login through /api/session", reg.ok and log.ok, f"{reg.status}/{log.status}")

        for width, height in ((375, 812), (420, 900)):
            await page.set_viewport_size({"width": width, "height": height})
            await page.goto(f"{BASE_URL}/fr/accueil")
            await page.locator("main").get_by_test_id("home-signed-in-infos").wait_for()
            check(f"signed in ({width}px): sign-up card hidden", await page.locator("main").get_by_text("Rejoignez Nextrainers").count() == 0)
            await page.locator("main").get_by_test_id("coach-dna-banner").wait_for()
            check(f"signed in ({width}px): coach banner visible", True)
            check(f"signed in: no overflow at {width}px", await no_overflow(page))
        await page.screenshot(path=str(DOCS_DIR / "accueil-signedin.png"), full_page=True)

        await page.get_by_role("button", name="Masquer").click()
        check("banner dismissed", await page.locator("main").get_by_test_id("coach-dna-banner").count() == 0)
        await page.reload()
        await page.locator("main").get_by_test_id("home-signed-in-infos").wait_for()
        await page.wait_for_timeout(500)
        check("dismissal survives reload", await page.locator("main").get_by_test_id("coach-dna-banner").count() == 0)

        await page.request.post(f"{BASE_URL}/api/session", data={"action": "logout"})
        await page.goto(f"{BASE_URL}/fr/accueil")
        await page.locator("main").get_by_test_id("home-signup-card").wait_for()
        check("after logout: sign-up card back", True)
        await browser.close()

    check("0 console errors", not errors, "; ".join(errors[:3]))
    print(f"\n== RESULT: {len(failures)} failed ==")
    sys.exit(1 if failures else 0)


asyncio.run(main())
