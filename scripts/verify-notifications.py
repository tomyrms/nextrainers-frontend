"""End-to-end verification of /fr/notifications against the clone backend.

1. Signs in a fresh account through the frontend `/api/session` proxy so the
   header shows the signed-in branch, then checks the bell badge equals the
   live `unreadCount` from `GET /api/notifications/inbox`.
2. Every notification title/body from the API renders, unread ones flagged
   (`data-unread`), and the inbox badge shows the live unread count.
3. Tap flow: tapping the first unread notification PATCHes it read (checked
   via the API) and navigates to its clone route when it has one.
4. "Tout marquer comme lu": API unreadCount drops to 0, badge + bell update.
5. 375x812 + 420x900: no console errors on the inbox, no horizontal overflow.

State note: inboxes are per account, and each run uses a fresh account whose
seeded inbox has an unread notification, so steps 3-4 always run for real and
nothing shared is mutated. API reads use that account's session token.

Saves docs/notifications.png (before any mutation).

Usage:  python scripts/verify-notifications.py
Expects the frontend on http://localhost:4970 and the backend on :4900.
"""

from __future__ import annotations

import asyncio
import json
import re
import sys
import time
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import Page, async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
PASSWORD = "password123"

# Mirrors lib/api-notifications.ts#cloneRoute for the paths the seeds use.
ROUTES = [
    (r"^/fr/", lambda m, p: p),
    (r"^/profile/?$", lambda m, p: "/fr/profil"),
    (r"^/trainings/([^/?#]+)", lambda m, p: f"/fr/entrainements/{m.group(1)}"),
    (r"^/analysis/([^/?#]+)", lambda m, p: f"/fr/analyses/{m.group(1)}"),
]


def clone_route(path: str | None) -> str | None:
    for pattern, build in ROUTES:
        match = re.match(pattern, path or "")
        if match:
            return build(match, path)
    return None


# Session token of the signed-in test account: inboxes are per account, so
# API reads must look at the same account as the browser.
TOKEN: dict[str, str] = {}


def api(method: str, path: str, body: Any = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    headers = {"content-type": "application/json"}
    if TOKEN.get("value"):
        headers["authorization"] = f"Bearer {TOKEN['value']}"
    request = urllib.request.Request(f"{API_URL}{path}", data=data, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=5) as response:
        text = response.read().decode()
    return json.loads(text) if text else None


class ConsoleLog:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def attach(self, page: Page) -> None:
        page.on("console", lambda m: self.errors.append(f"{m.type}: {m.text}") if m.type == "error" else None)
        page.on("pageerror", lambda exc: self.errors.append(f"pageerror: {exc}"))


async def settle(page: Page) -> None:
    try:
        await page.wait_for_load_state("networkidle", timeout=10_000)
    except Exception:  # noqa: BLE001 - dev HMR socket keeps a connection open
        pass
    await page.evaluate("document.fonts.ready")
    await page.wait_for_timeout(300)


async def overflow(page: Page) -> int:
    return await page.evaluate("document.documentElement.scrollWidth - window.innerWidth")


async def badge_text(page: Page) -> str | None:
    badge = page.locator('[data-testid="bell-badge"]')
    return (await badge.inner_text()).strip() if await badge.count() else None


async def main() -> int:
    problems: list[str] = []
    checks = 0

    def check(name: str, ok: bool, detail: str = "") -> None:
        nonlocal checks
        checks += 1
        print(f"  {'PASS' if ok else 'FAIL'}  {name}{'' if ok else '  -> ' + detail}")
        if not ok:
            problems.append(name)

    email = f"notif_{int(time.time())}@test.dev"
    api("POST", "/api/auth/register", {"email": email, "password": PASSWORD})

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            context = await browser.new_context(viewport={"width": 420, "height": 900})
            login = await context.request.post(
                f"{BASE_URL}/api/session", data={"action": "login", "email": email, "password": PASSWORD}
            )
            check("signed in through /api/session", login.ok, str(login.status))
            TOKEN["value"] = next(c["value"] for c in await context.cookies() if c["name"] == "session")

            inbox = api("GET", "/api/notifications/inbox")
            notifications = inbox["notifications"]
            unread = inbox["unreadCount"]
            check("API inbox shape", isinstance(notifications, list) and isinstance(unread, int))
            check("fresh account starts with an unread notification", unread >= 1, str(unread))

            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)

            response = await page.goto(f"{BASE_URL}/fr/notifications", wait_until="load")
            await settle(page)
            check("/fr/notifications -> 200", bool(response and response.status == 200))
            await page.wait_for_selector('[data-testid="unread-count"]', timeout=15_000)
            if notifications:
                await page.wait_for_selector("[data-notification-id]", timeout=15_000)

            shown = (await page.locator('[data-testid="unread-count"]').inner_text()).strip()
            check("inbox badge = API unreadCount", shown == str(unread), f"{shown} vs {unread}")
            expected_bell = None if unread == 0 else ("9+" if unread > 9 else str(unread))
            check("header bell badge = API unreadCount", await badge_text(page) == expected_bell,
                  f"{await badge_text(page)} vs {expected_bell}")
            check("bell links to /fr/notifications",
                  await page.locator('header a[href="/fr/notifications"]').count() == 1)

            for n in notifications:
                item = page.locator(f'[data-notification-id="{n["id"]}"]')
                text = await item.inner_text() if await item.count() else ""
                flag = await item.get_attribute("data-unread") if await item.count() else None
                check(f"{n['id']} renders title/body + read state",
                      n["title"] in text and n["body"][:30] in text
                      and flag == ("false" if n["readAt"] else "true"), text[:80])

            check("inbox 420px: no horizontal overflow", await overflow(page) <= 0)
            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(DOCS_DIR / "notifications.png"))
            inbox_errors = list(log.errors)

            # --- tap flow ------------------------------------------------------
            first_unread = next((n for n in notifications if not n["readAt"]), None)
            if first_unread:
                target = clone_route(first_unread.get("path"))
                await page.locator(f'[data-notification-id="{first_unread["id"]}"]').click()
                if target:
                    await page.wait_for_url(f"**{target}", timeout=15_000)
                    check(f"tap navigates to {target}", page.url.endswith(target), page.url)
                else:
                    await page.wait_for_timeout(1500)
                after = api("GET", "/api/notifications/inbox")
                read_now = next(n for n in after["notifications"] if n["id"] == first_unread["id"])
                check("tap -> PATCH read (API readAt set)", bool(read_now["readAt"]))
                unread = after["unreadCount"]
                await page.goto(f"{BASE_URL}/fr/notifications", wait_until="load")
                await settle(page)
            else:
                print("  INFO  no unread notification: tap flow skipped (backend cannot mark unread)")

            # --- mark all read -------------------------------------------------
            button = page.get_by_role("button", name="Tout marquer comme lu")
            if unread > 0:
                await button.click()
                await page.wait_for_function(
                    "document.querySelector('[data-testid=\"unread-count\"]')?.textContent.trim() === '0'",
                    timeout=15_000,
                )
                check("mark-all-read -> API unreadCount 0",
                      api("GET", "/api/notifications/inbox")["unreadCount"] == 0)
            check("all read -> button disabled", await button.is_disabled())
            await page.reload(wait_until="load")
            await settle(page)
            check("all read -> no bell badge", await badge_text(page) is None, str(await badge_text(page)))
            check("all read -> no unread rows",
                  await page.locator('[data-unread="true"]').count() == 0)

            await page.set_viewport_size({"width": 375, "height": 812})
            await page.reload(wait_until="load")
            await settle(page)
            check("inbox 375px: no horizontal overflow", await overflow(page) <= 0)
            check("0 console errors on the inbox", not inbox_errors, "; ".join(inbox_errors)[:300])
            await context.close()
        finally:
            await browser.close()

    print(f"\n== {checks - len(problems)} passed, {len(problems)} failed ==")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
