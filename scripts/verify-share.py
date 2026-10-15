"""End-to-end verification of training sharing and the public /share/[token] page.

Seeds a test training through the API (3 library exercises), opens its detail
page, clicks "Partager" and reads the generated link, which must point at this
frontend's /share/<token>. The link is opened in a fresh browser context (no
cookies) and asserted against `GET /api/trainings/share/<token>`: name, the
"Partagée par" line, exercise order, the sign-up CTA and the absence of the app
BottomNav. Then "Dupliquer" on the detail page must open a copy that the API
lists. An unknown token must show the friendly invalid-link state. Pages are
checked at 375 and 420 px for console errors and horizontal overflow. Test
trainings are always deleted afterwards.

Saves docs/share.png (public page, 420 px).

Usage:  python scripts/verify-share.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import json
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import Page, async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

TEST_PREFIX = "Test Partage Playwright"


def api_json(path: str, method: str = "GET", body: Any = None) -> Any:
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(
        f"{API_URL}{path}", method=method, data=data,
        headers={"content-type": "application/json"} if data else {},
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return json.load(response)
    except (urllib.error.HTTPError, urllib.error.URLError, OSError, ValueError):
        return None


def test_trainings() -> list[dict[str, Any]]:
    data = api_json("/api/trainings")
    return [
        t for t in (data if isinstance(data, list) else [])
        if str(t.get("name", "")).startswith(TEST_PREFIX)
    ]


def delete_training(training_id: str) -> None:
    api_json(f"/api/trainings?id={urllib.request.quote(training_id)}", method="DELETE")


class ConsoleLog:
    def __init__(self) -> None:
        self.errors: list[str] = []

    def attach(self, page: Page) -> None:
        page.on("console", lambda m: m.type == "error" and self.errors.append(f"{m.type}: {m.text}"))
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


async def main() -> None:
    for leftover in test_trainings():
        delete_training(leftover["id"])

    problems: list[str] = []
    report: dict[str, Any] = {}

    library = api_json("/api/exercises") or []
    plan = library[:3]
    name = f"{TEST_PREFIX} {int(time.time())}"
    seeded = api_json("/api/trainings", "POST", {
        "name": name, "theme": "Possession", "date": "2026-11-05",
        "duration": sum(e["duration"] for e in plan), "plan": plan,
    })
    if not seeded or len(plan) < 3:
        print("could not seed the test training through the API")
        raise SystemExit(1)
    training_id = seeded["id"]
    report["seeded_id"] = training_id

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            # --- share from the detail page -------------------------------------
            context = await browser.new_context(viewport={"width": 420, "height": 900})
            await context.grant_permissions(["clipboard-read", "clipboard-write"], origin=BASE_URL)
            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)
            await page.goto(f"{BASE_URL}/fr/entrainements/{training_id}")
            await page.wait_for_selector('[data-testid="share-training"]', timeout=15_000)
            await settle(page)
            await page.click('[data-testid="share-training"]')
            link_el = page.locator('[data-testid="share-link"]')
            await link_el.wait_for(timeout=10_000)
            link = await link_el.get_attribute("href")
            status_text = await page.inner_text('[role="status"]')
            report["share_link"] = link
            report["share_status"] = status_text
            if not link or not link.startswith(f"{BASE_URL}/share/"):
                problems.append(f"share link does not target this frontend: {link}")
            if "Lien copié" not in status_text:
                problems.append("clipboard copy not confirmed")
            token = (link or "").rstrip("/").split("/")[-1]
            api_shared = api_json(f"/api/trainings/share/{token}") or {}
            if (api_shared.get("training") or {}).get("id") != training_id:
                problems.append("API does not resolve the share token to the training")

            # --- public page, fresh context ---------------------------------------
            public = await browser.new_context(viewport={"width": 420, "height": 900})
            ppage = await public.new_page()
            plog = ConsoleLog()
            plog.attach(ppage)
            await ppage.goto(link or f"{BASE_URL}/share/{token}")
            await ppage.wait_for_selector('[data-testid="training-plan"]', timeout=15_000)
            await settle(ppage)
            ui_plan = await ppage.eval_on_selector_all(
                '[data-testid="training-plan"] > li', "els => els.map(e => e.dataset.exerciseId)"
            )
            shared_by = await ppage.inner_text('[data-testid="shared-by"]')
            body = await ppage.inner_text("body")
            cta = await ppage.get_attribute('a[href="/fr/inscription"]', "href")
            nav_count = await ppage.locator("nav").count()
            sharer = api_shared.get("sharedBy") or {}
            report["public"] = {"ui_plan": ui_plan, "shared_by": shared_by, "nav": nav_count}
            if ui_plan != [e["id"] for e in plan]:
                problems.append("public page: plan order differs from the API")
            if name not in body:
                problems.append("public page: training name missing")
            if sharer.get("fullName") and sharer["fullName"] not in shared_by:
                problems.append("public page: sharedBy missing")
            if not cta:
                problems.append("public page: sign-up CTA missing")
            if nav_count:
                problems.append("public page: app navigation should not be shown")
            report["public_overflow_420"] = await overflow(ppage)
            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            await ppage.screenshot(path=str(DOCS_DIR / "share.png"), full_page=True)

            # Unknown token -> friendly state.
            await ppage.goto(f"{BASE_URL}/share/does-not-exist")
            await ppage.wait_for_selector('[data-testid="share-missing"]', timeout=15_000)
            await public.close()

            # --- duplicate --------------------------------------------------------
            await page.click('[data-testid="duplicate-training"]')
            await page.wait_for_function(
                f"!location.pathname.endsWith('/{training_id}')", timeout=15_000
            )
            copy_id = page.url.rstrip("/").split("/")[-1]
            await page.wait_for_selector('[data-testid="training-name"]', timeout=15_000)
            copy = api_json(f"/api/trainings/{copy_id}") or {}
            report["duplicate"] = {"copy_id": copy_id, "name": copy.get("name")}
            if copy.get("name") != f"{name} (copie)" or len(copy.get("plan") or []) != 3:
                problems.append("duplicate: API copy missing or incomplete")
            if f"{name} (copie)" not in await page.inner_text('[data-testid="training-name"]'):
                problems.append("duplicate: copy page does not show the copy")
            report["console_errors_420"] = log.errors + plog.errors
            await context.close()

            # --- 375 px -------------------------------------------------------------
            narrow = await browser.new_context(viewport={"width": 375, "height": 812})
            npage = await narrow.new_page()
            nlog = ConsoleLog()
            nlog.attach(npage)
            report["overflow_375"] = {}
            for path in [f"/share/{token}", "/share/does-not-exist"]:
                await npage.goto(f"{BASE_URL}{path}")
                await settle(npage)
                report["overflow_375"][path] = await overflow(npage)
            report["console_errors_375"] = nlog.errors
            await narrow.close()

            if report["public_overflow_420"] > 0:
                problems.append(f"420px overflow {report['public_overflow_420']}px")
            problems += [f"375px overflow {p}: {v}px" for p, v in report["overflow_375"].items() if v > 0]
            problems += [f"console -> {e}" for e in report["console_errors_420"] + report["console_errors_375"]]
        finally:
            leftovers = test_trainings()
            for training in leftovers:
                delete_training(training["id"])
            report["cleanup_deleted"] = [t["id"] for t in leftovers]
            if test_trainings():
                problems.append("cleanup: test training still listed")
            await browser.close()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nPROBLEMS: {len(problems)}")
    for line in problems:
        print(" -", line)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
