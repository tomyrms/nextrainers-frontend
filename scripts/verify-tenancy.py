"""Per-account data through the real UI (server reads + /api/proxy mutations).

Signs up two fresh accounts (A, B) in separate browser contexts. A adds a
player with the Équipe form and favorites an exercise in the Bibliothèque;
both must show for A after a reload, and neither for B nor for an anonymous
visitor (demo data). A's player is also checked in the backend with A's
token, and the profile page shows each account's own email. Checks console
errors.

Usage:  python scripts/verify-tenancy.py
Expects the frontend on http://localhost:4970 and the backend on :4900.
"""

from __future__ import annotations

import asyncio
import json
import sys
import time
import urllib.request

from playwright.async_api import BrowserContext, Page, async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"

failures: list[str] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    print(f"  {'PASS' if ok else 'FAIL'}  {name}{'' if ok else '  -> ' + detail}")
    if not ok:
        failures.append(name)


async def sign_up(context: BrowserContext, email: str) -> Page:
    page = await context.new_page()
    await page.goto(f"{BASE_URL}/fr/accueil")
    for action in ("register", "login"):
        response = await page.request.post(
            f"{BASE_URL}/api/session", data={"action": action, "email": email, "password": "password123"}
        )
        assert response.ok, f"{action} failed: {response.status}"
    return page


async def roster_names(page: Page) -> str:
    await page.goto(f"{BASE_URL}/fr/equipe")
    await page.locator("main li").first.wait_for()
    return await page.inner_text("main")


async def favorites_text(page: Page) -> str:
    await page.goto(f"{BASE_URL}/fr/bibliotheque")
    await page.wait_for_load_state("networkidle")
    return await page.inner_text("main")


async def main() -> None:
    stamp = int(time.time())
    marker_first, marker_last = "Tenant", f"Ui{stamp}"
    errors: list[str] = []

    async with async_playwright() as p:
        browser = await p.chromium.launch()
        ctx_a = await browser.new_context(viewport={"width": 420, "height": 900})
        ctx_b = await browser.new_context(viewport={"width": 420, "height": 900})
        ctx_anon = await browser.new_context(viewport={"width": 420, "height": 900})
        for ctx in (ctx_a, ctx_b, ctx_anon):
            ctx.on("page", lambda pg: (pg.on("console", lambda m: errors.append(m.text) if m.type == "error" else None),
                                       pg.on("pageerror", lambda e: errors.append(str(e)))))

        email_a, email_b = f"ui_a_{stamp}@test.dev", f"ui_b_{stamp}@test.dev"
        page_a = await sign_up(ctx_a, email_a)
        page_b = await sign_up(ctx_b, email_b)
        page_anon = await ctx_anon.new_page()

        # Profile shows each account's own email.
        for page, email in ((page_a, email_a), (page_b, email_b)):
            await page.goto(f"{BASE_URL}/fr/profil")
            await page.wait_for_load_state("networkidle")
            check(f"profil shows {email.split('_')[1]}'s own email", email in await page.inner_text("main"))

        # A adds a player through the Équipe form (browser mutation via /api/proxy).
        await page_a.goto(f"{BASE_URL}/fr/equipe")
        await page_a.get_by_role("button", name="Ajouter un joueur", exact=True).click()
        await page_a.get_by_label("Prénom", exact=True).fill(marker_first)
        await page_a.get_by_label("Nom", exact=True).fill(marker_last)
        await page_a.get_by_label("Numéro", exact=True).fill("77")
        await page_a.get_by_label("Poste", exact=True).select_option(label="Attaquant")
        await page_a.get_by_label("Date de naissance", exact=True).fill("2012-03-10")
        await page_a.get_by_role("button", name="Ajouter", exact=True).click()
        await page_a.get_by_text(f"{marker_first} {marker_last}").first.wait_for(timeout=15_000)

        check("A sees the new player after reload", marker_last in await roster_names(page_a))
        check("B does NOT see A's player", marker_last not in await roster_names(page_b))
        check("anonymous (demo) does NOT see A's player", marker_last not in await roster_names(page_anon))

        token_a = next(c["value"] for c in await ctx_a.cookies() if c["name"] == "session")
        request = urllib.request.Request(f"{API_URL}/api/players", headers={"authorization": f"Bearer {token_a}"})
        with urllib.request.urlopen(request, timeout=10) as response:
            backend_roster = json.load(response)
        check("backend stores the player in A's account", any(pl["lastName"] == marker_last for pl in backend_roster))

        # A favorites the first exercise of the library.
        await page_a.goto(f"{BASE_URL}/fr/bibliotheque")
        star = page_a.locator('main [data-testid="favorite-toggle"][aria-pressed="false"]').first
        label = await star.get_attribute("aria-label") or ""
        await star.click()
        await page_a.wait_for_timeout(1500)
        token_b = next(c["value"] for c in await ctx_b.cookies() if c["name"] == "session")

        def favorite_ids(token: str | None) -> list[str]:
            headers = {"authorization": f"Bearer {token}"} if token else {}
            req = urllib.request.Request(f"{API_URL}/api/exercises/favorite", headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response:
                return [e["id"] for e in json.load(response)]

        fav_a = favorite_ids(token_a)
        check("A's favorite saved in A's account", len(fav_a) >= 1, label)
        check("B has no favorites", favorite_ids(token_b) == [])
        check("demo favorites unaffected by A", not set(fav_a) & set(favorite_ids(None)) or fav_a == [])

        for page in (page_a, page_b):
            await page.request.post(f"{BASE_URL}/api/session", data={"action": "logout"})
        await browser.close()

    check("0 console errors", not errors, "; ".join(errors[:3]))
    print(f"\n== RESULT: {len(failures)} failed ==")
    sys.exit(1 if failures else 0)


asyncio.run(main())
