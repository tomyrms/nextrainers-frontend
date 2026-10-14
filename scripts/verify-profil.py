"""End-to-end verification of the Profil page and the session-aware header.

Flow, in one 420x900 context:

1. Signed out: /fr/profil shows the "Connecte-toi pour voir ton profil" prompt
   and /fr/accueil's header shows the Connexion/Inscription pills.
2. Register a fresh account through the /api/session proxy, then log in.
3. Reload /fr/profil: the seeded "Coach Demo" / "AS Démo" data is visible, the
   header swaps the pills for the initials avatar linking to /fr/profil.
4. Edit teamName in the "Modifier" form, save, see "Profil mis à jour", reload
   and assert the new value; the backend GET confirms it.
5. "Se déconnecter" lands on /fr and /fr/profil prompts for sign-in again.
6. The landing CTAs link to /fr/inscription and /fr/connexion.

The whole run must produce zero console errors and zero page errors.
Saves docs/profil-signedout.png, docs/profil.png and docs/profil-edit.png.

Usage:  python scripts/verify-profil.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import json
import time
from pathlib import Path

from playwright.async_api import (
    Browser,
    BrowserContext,
    ConsoleMessage,
    Page,
    async_playwright,
)

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

EMAIL = f"e2e_{int(time.time())}@test.dev"
PASSWORD = "password123"
NEW_TEAM_NAME = "AS Démo E2E"


def track(page: Page, console_errors: list[str], page_errors: list[str]) -> None:
    """Record real console errors and uncaught exceptions for a page."""

    def on_console(msg: ConsoleMessage) -> None:
        if msg.type == "error":
            console_errors.append(f"{page.url} : {msg.text}")

    page.on("console", on_console)
    page.on("pageerror", lambda exc: page_errors.append(f"{page.url} : {exc}"))


async def main() -> None:
    problems: list[str] = []
    steps: list[dict[str, object]] = []
    console_errors: list[str] = []
    page_errors: list[str] = []

    def check(name: str, ok: bool, detail: str = "") -> None:
        steps.append({"check": name, "ok": ok, "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'} {name}" + (f" - {detail}" if detail else ""))
        if not ok:
            problems.append(f"{name}: {detail}" if detail else name)

    async with async_playwright() as pw:
        browser: Browser = await pw.chromium.launch()
        context: BrowserContext = await browser.new_context(
            viewport={"width": 420, "height": 900}, device_scale_factor=1
        )
        page = await context.new_page()
        track(page, console_errors, page_errors)
        DOCS_DIR.mkdir(parents=True, exist_ok=True)

        # ---- 1. Signed out: profil prompt + accueil header pills.
        response = await page.goto(f"{BASE_URL}/fr/profil", wait_until="load")
        check(
            "GET /fr/profil (signed out)",
            response is not None and response.status == 200,
            f"status={response.status if response else None}",
        )
        await page.wait_for_selector(
            "text=Connecte-toi pour voir ton profil", timeout=15_000
        )
        prompt_link = await page.locator('main a[href="/fr/connexion"]').count()
        check("signed-out prompt links to /fr/connexion", prompt_link == 1)
        avatar_signed_out = await page.locator('header a[href="/fr/profil"]').count()
        check("no avatar in the signed-out header", avatar_signed_out == 0)
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(DOCS_DIR / "profil-signedout.png"))

        await page.goto(f"{BASE_URL}/fr/accueil", wait_until="load")
        await page.wait_for_selector('header a[href="/fr/connexion"]', timeout=15_000)
        pill_text = await page.locator('header a[href="/fr/connexion"]').inner_text()
        check("accueil header shows the Connexion pill", pill_text == "Connexion")

        # ---- 2. Register a fresh account through the proxy, then log in.
        response = await page.request.post(
            f"{BASE_URL}/api/session",
            data={"action": "register", "email": EMAIL, "password": PASSWORD},
        )
        check(
            "register via /api/session",
            response.ok,
            f"status={response.status}",
        )
        response = await page.request.post(
            f"{BASE_URL}/api/session",
            data={"action": "login", "email": EMAIL, "password": PASSWORD},
        )
        body = await response.json()
        check(
            "login via /api/session",
            response.ok and body.get("user", {}).get("email") == EMAIL,
            json.dumps(body),
        )
        session = await page.request.get(f"{BASE_URL}/api/session")
        check(
            "session live for /fr/profil",
            (await session.json()).get("user", {}).get("email") == EMAIL,
        )

        # ---- 3. Signed in: seeded profile data + header avatar.
        await page.goto(f"{BASE_URL}/fr/profil", wait_until="load")
        await page.wait_for_selector("text=Coach Demo", timeout=15_000)
        body_text = await page.inner_text("body")
        check("profile shows the seeded fullName", "Coach Demo" in body_text)
        check("profile shows the seeded teamName", "AS Démo" in body_text)
        await page.wait_for_selector('header a[href="/fr/profil"]', timeout=15_000)
        avatar_visible = await page.locator('header a[href="/fr/profil"]').is_visible()
        check("header shows the avatar link to /fr/profil", avatar_visible)
        header_pills = await page.locator('header a[href="/fr/connexion"]').count()
        check("header pills are gone when signed in", header_pills == 0)
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(DOCS_DIR / "profil.png"))

        # ---- 4. Edit teamName, save, reload, confirm on the backend.
        profile = await (await page.request.get(f"{API_URL}/api/user/profile")).json()
        original_team_name = profile.get("teamName")

        await page.get_by_role("button", name="Modifier").click()
        await page.wait_for_selector("#profile-team-name", timeout=10_000)
        await page.fill("#profile-team-name", NEW_TEAM_NAME)
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(DOCS_DIR / "profil-edit.png"))

        await page.get_by_role("button", name="Enregistrer").click()
        await page.wait_for_selector("text=Profil mis à jour", timeout=15_000)
        check("save shows 'Profil mis à jour'", True)

        await page.reload(wait_until="load")
        await page.wait_for_selector(f"text={NEW_TEAM_NAME}", timeout=15_000)
        check("edited teamName survives a reload", True, NEW_TEAM_NAME)

        backend = await (await page.request.get(f"{API_URL}/api/user/profile")).json()
        check(
            "backend GET confirms the new teamName",
            backend.get("teamName") == NEW_TEAM_NAME,
            json.dumps(backend.get("teamName")),
        )

        # Restore the shared/global seed value for the other test suites.
        await page.request.put(
            f"{API_URL}/api/user/profile", data={"teamName": original_team_name}
        )
        restored = await (await page.request.get(f"{API_URL}/api/user/profile")).json()
        check(
            "teamName restored for the other suites",
            restored.get("teamName") == original_team_name,
            json.dumps(restored.get("teamName")),
        )

        # ---- 5. Log out: lands on /fr, profil prompts for sign-in again.
        await page.get_by_role("button", name="Se déconnecter").click()
        await page.wait_for_url("**/fr", timeout=15_000)
        check("logout lands on /fr", page.url.rstrip("/").endswith("/fr"), page.url)

        await page.goto(f"{BASE_URL}/fr/profil", wait_until="load")
        await page.wait_for_selector(
            "text=Connecte-toi pour voir ton profil", timeout=15_000
        )
        check("profil prompts for sign-in after logout", True)

        # ---- 6. Landing CTAs link to the auth pages.
        await page.goto(f"{BASE_URL}/fr", wait_until="load")
        signup = page.locator('a[href="/fr/inscription"]')
        login = page.locator('a[href="/fr/connexion"]')
        check(
            "landing CTA -> /fr/inscription",
            await signup.count() == 1
            and (await signup.inner_text()).strip() == "Commencer maintenant",
        )
        check(
            "landing CTA -> /fr/connexion",
            await login.count() == 1
            and (await login.inner_text()).strip() == "Se connecter",
        )

        # ---- 7. Zero console / page errors over the whole run.
        check(
            "zero console errors",
            not console_errors,
            json.dumps(console_errors, ensure_ascii=False),
        )
        check(
            "zero uncaught page errors",
            not page_errors,
            json.dumps(page_errors, ensure_ascii=False),
        )

        await context.close()
        await browser.close()

    report = {
        "email": EMAIL,
        "steps": steps,
        "console_errors": console_errors,
        "page_errors": page_errors,
        "screenshots": {
            "signedout": str(DOCS_DIR / "profil-signedout.png"),
            "signedin": str(DOCS_DIR / "profil.png"),
            "edit": str(DOCS_DIR / "profil-edit.png"),
        },
    }
    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nPROBLEMS: {len(problems)}")
    for line in problems:
        print(" -", line)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
