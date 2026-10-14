"""End-to-end verification of the connexion/inscription flow.

Register a unique account on /fr/inscription, assert the auto-login lands on
/fr/accueil with a live session (GET /api/session returns the user) and the
header swaps the pills for the /fr/profil avatar, then sign back in through
the /fr/connexion form. Finally log out through the proxy and assert the
session is gone. The whole happy path must log zero console errors and zero
page errors.

Then, in a separate context, the French error lines are covered: duplicate
email (409) on inscription and bad credentials (401) on connexion — those
deliberate non-2xx responses are reported as expected entries, not failures.

Saves docs/inscription.png and docs/connexion.png at 420x900.

Usage:  python scripts/verify-auth.py
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
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

EMAIL = f"e2e_{int(time.time())}@test.dev"
PASSWORD = "password123"


async def fetch_session_user(page: Page) -> dict | None:
    """GET /api/session through the page's cookie jar — `{user}` or null."""
    response = await page.request.get(f"{BASE_URL}/api/session")
    assert response.ok, f"GET /api/session -> {response.status}"
    body = await response.json()
    return body.get("user")


def track(
    page: Page,
    console_errors: list[str],
    page_errors: list[str],
    network_log: list[str] | None = None,
) -> None:
    """Record real console errors and uncaught exceptions for a page.

    When `network_log` is given, Chromium's "Failed to load resource" lines
    (non-2xx HTTP responses) are diverted there instead of `console_errors`.
    """

    def on_console(msg: ConsoleMessage) -> None:
        if msg.type == "error":
            entry = f"{page.url} : {msg.text}"
            if network_log is not None and "Failed to load resource" in msg.text:
                network_log.append(entry)
            else:
                console_errors.append(entry)

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

        # ---- 1. Inscription: register a unique account, auto-login, redirect.
        response = await page.goto(f"{BASE_URL}/fr/inscription", wait_until="load")
        check(
            "GET /fr/inscription",
            response is not None and response.status == 200,
            f"status={response.status if response else None}",
        )
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(DOCS_DIR / "inscription.png"))

        await page.fill("#email", EMAIL)
        await page.fill("#password", PASSWORD)
        await page.fill("#confirm", PASSWORD)
        await page.get_by_role("button", name="Créer mon compte").click()
        await page.wait_for_url("**/fr/accueil", timeout=15_000)
        check("register redirects to /fr/accueil", True, page.url)

        user = await fetch_session_user(page)
        check(
            "session live after registration",
            user is not None and user.get("email") == EMAIL,
            json.dumps(user),
        )

        # ---- 2. The signed-in header swaps the pills for the /fr/profil
        #         avatar; sign back in through the /fr/connexion form.
        await page.wait_for_selector('header a[href="/fr/profil"]', timeout=15_000)
        check(
            "signed-in header swaps the pills for the avatar link",
            await page.locator('header a[href="/fr/profil"]').count() == 1
            and await page.locator('header a[href="/fr/connexion"]').count() == 0,
        )
        await page.goto(f"{BASE_URL}/fr/connexion", wait_until="load")
        check("connexion form reachable for sign-in", True, page.url)
        await page.evaluate("document.fonts.ready")
        await page.wait_for_timeout(400)
        await page.screenshot(path=str(DOCS_DIR / "connexion.png"))

        await page.fill("#email", EMAIL)
        await page.fill("#password", PASSWORD)
        await page.get_by_role("button", name="Se connecter").click()
        await page.wait_for_url("**/fr/accueil", timeout=15_000)
        check("login redirects to /fr/accueil", True, page.url)

        user = await fetch_session_user(page)
        check(
            "session live after login",
            user is not None and user.get("email") == EMAIL,
            json.dumps(user),
        )

        # ---- 3. Logout through the proxy clears the frontend cookie.
        response = await page.request.post(
            f"{BASE_URL}/api/session", data={"action": "logout"}
        )
        check("POST /api/session {action:'logout'}", response.ok, f"status={response.status}")

        user = await fetch_session_user(page)
        check("session cleared after logout", user is None, json.dumps(user))

        cookies = await context.cookies(BASE_URL)
        session_cookies = [c for c in cookies if c["name"] == "session"]
        check("frontend 'session' cookie removed", not session_cookies)

        # ---- 4. Zero console / page errors on the happy path (both auth pages
        #         were visited, plus the two post-auth redirects to the home).
        check(
            "zero console errors (happy path)",
            not console_errors,
            json.dumps(console_errors, ensure_ascii=False),
        )
        check(
            "zero uncaught page errors (happy path)",
            not page_errors,
            json.dumps(page_errors, ensure_ascii=False),
        )

        await context.close()

        # ---- 5. French error lines, in a fresh context. The deliberate 409 /
        #         401 responses are logged by Chromium as failed resources,
        #         so they are collected separately as expected entries.
        context2: BrowserContext = await browser.new_context(
            viewport={"width": 420, "height": 900}, device_scale_factor=1
        )
        page2 = await context2.new_page()
        expected_resources: list[str] = []
        unexpected: list[str] = []
        page_errors2: list[str] = []
        track(page2, unexpected, page_errors2, network_log=expected_resources)

        await page2.goto(f"{BASE_URL}/fr/inscription", wait_until="load")
        await page2.fill("#email", EMAIL)
        await page2.fill("#password", PASSWORD)
        await page2.fill("#confirm", PASSWORD)
        await page2.get_by_role("button", name="Créer mon compte").click()
        await page2.wait_for_selector(
            "text=Un compte existe déjà avec cet email.", timeout=10_000
        )
        check("duplicate email shows French 409 message", True, page2.url)

        await page2.goto(f"{BASE_URL}/fr/connexion", wait_until="load")
        await page2.fill("#email", EMAIL)
        await page2.fill("#password", "wrong-password")
        await page2.get_by_role("button", name="Se connecter").click()
        await page2.wait_for_selector(
            "text=Email ou mot de passe incorrect", timeout=10_000
        )
        check("bad credentials show French 401 message", True, page2.url)

        check(
            "no unexpected JS errors on error pages",
            not unexpected and not page_errors2,
            json.dumps(unexpected + page_errors2, ensure_ascii=False),
        )
        check(
            "expected 409/401 resource logs only",
            len(expected_resources) == 2
            and all("Failed to load resource" in entry for entry in expected_resources),
            json.dumps(expected_resources, ensure_ascii=False),
        )

        await context2.close()
        await browser.close()

    report = {
        "email": EMAIL,
        "steps": steps,
        "happy_path_console_errors": console_errors,
        "expected_negative_test_logs": expected_resources,
        "screenshots": {
            "connexion": str(DOCS_DIR / "connexion.png"),
            "inscription": str(DOCS_DIR / "inscription.png"),
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
