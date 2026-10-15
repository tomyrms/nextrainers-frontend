"""End-to-end verification of the "+" create flow and the training detail page.

Opens /fr/creer, checks the three entry points (manual / analyses / saison),
builds a session through the UI with three exercises picked from three
categories, submits, and lands on /fr/entrainements/<id>. The detail page is
asserted against `GET /api/trainings/<id>` (name, plan order, duration) and
the rendered exercise order. Both pages are re-checked at 375 and 420 px for
console errors and horizontal overflow. The test training is always deleted
(`DELETE /api/trainings?id=`), even when an assertion fails.

Saves docs/creer.png (filled builder) and docs/entrainement.png (detail).

Usage:  python scripts/verify-creer.py
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

TEST_PREFIX = "Test Séance Playwright"
PICK_TYPES = ["warmup", "mainExercises", "cooldown"]


def api_json(path: str, method: str = "GET") -> Any:
    request = urllib.request.Request(f"{API_URL}{path}", method=method)
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
    name = f"{TEST_PREFIX} {int(time.time())}"
    created_id: str | None = None

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            context = await browser.new_context(viewport={"width": 420, "height": 900})
            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)

            # --- chooser -----------------------------------------------------
            await page.goto(f"{BASE_URL}/fr/creer")
            await settle(page)
            hrefs = {
                "match": await page.get_attribute('[data-testid="choice-match"]', "href"),
                "season": await page.get_attribute('[data-testid="choice-season"]', "href"),
            }
            report["chooser_links"] = hrefs
            if hrefs != {"match": "/fr/analyses", "season": "/fr/saison"}:
                problems.append(f"chooser links wrong: {hrefs}")
            plus_href = await page.get_attribute('nav a[aria-label="Créer"]', "href")
            if plus_href != "/fr/creer":
                problems.append(f"BottomNav + does not link to /fr/creer ({plus_href})")

            # --- builder -----------------------------------------------------
            await page.click('[data-testid="choice-manual"]')
            await page.fill('input[name="name"]', name)
            await page.select_option('select[name="theme"]', "Pressing")
            await page.fill('input[name="date"]', "2026-11-03")

            picked: list[str] = []
            for exercise_type in PICK_TYPES:
                await page.click(f'[data-testid="filter-{exercise_type}"]')
                first = page.locator('[data-testid="pick-exercise"]').first
                await first.wait_for(timeout=10_000)
                picked.append(await first.get_attribute("data-exercise-id"))
                await first.click()
            report["picked"] = picked

            library = {e["id"]: e for e in (api_json("/api/exercises") or [])}
            expected_duration = sum(library.get(i, {}).get("duration", 0) for i in picked)
            summary = await page.inner_text('[data-testid="plan-summary"]')
            report["plan_summary"] = summary
            if summary != f"3 sélectionnés · {expected_duration} min":
                problems.append(f"plan summary {summary!r} != 3 / {expected_duration} min")

            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            report["builder_overflow_px"] = await overflow(page)
            await page.screenshot(path=str(DOCS_DIR / "creer.png"), full_page=True)

            await page.click('[data-testid="create-training"]')
            await page.wait_for_url("**/fr/entrainements/**", timeout=15_000)
            created_id = page.url.rstrip("/").split("/")[-1]
            report["created_id"] = created_id
            await page.wait_for_selector('[data-testid="training-plan"]', timeout=15_000)
            await settle(page)

            # --- detail vs API -------------------------------------------------
            api = api_json(f"/api/trainings/{created_id}") or {}
            api_plan = [e.get("id") for e in api.get("plan") or []]
            ui_plan = await page.eval_on_selector_all(
                '[data-testid="training-plan"] > li', "els => els.map(e => e.dataset.exerciseId)"
            )
            ui_name = await page.inner_text('[data-testid="training-name"]')
            body = await page.inner_text("body")
            report["detail"] = {
                "api_name": api.get("name"), "ui_name": ui_name, "api_plan": api_plan,
                "ui_plan": ui_plan, "api_duration": api.get("duration"), "api_theme": api.get("theme"),
            }
            if api.get("name") != name or ui_name != name:
                problems.append("detail: name mismatch with API")
            if api_plan != picked or ui_plan != picked:
                problems.append("detail: plan order differs from the picked exercises")
            if api.get("duration") != expected_duration or f"{expected_duration} min" not in body:
                problems.append("detail: duration mismatch")
            if "Mardi 3 novembre 2026" not in body:
                problems.append("detail: French long date missing")
            report["detail_overflow_px"] = await overflow(page)
            await page.screenshot(path=str(DOCS_DIR / "entrainement.png"), full_page=True)

            # Accueil lists the new session first and links to the detail page.
            await page.goto(f"{BASE_URL}/fr/accueil")
            await settle(page)
            link = page.locator(f'a[href="/fr/entrainements/{created_id}"]')
            if await link.count() != 1:
                problems.append("accueil: new training row does not link to its detail page")

            report["console_errors_420"] = list(log.errors)
            await context.close()

            # --- 375 px re-check ------------------------------------------------
            context = await browser.new_context(viewport={"width": 375, "height": 812})
            page = await context.new_page()
            log375 = ConsoleLog()
            log375.attach(page)
            narrow: dict[str, int] = {}
            for path in ["/fr/creer", f"/fr/entrainements/{created_id}", "/fr/entrainements/does-not-exist"]:
                await page.goto(f"{BASE_URL}{path}")
                await settle(page)
                if path == "/fr/creer":
                    await page.click('[data-testid="choice-manual"]')
                    await page.wait_for_selector('[data-testid="pick-exercise"]', timeout=10_000)
                narrow[path] = await overflow(page)
            body = await page.inner_text("body")
            if "Séance introuvable" not in body:
                problems.append("unknown training id: friendly state missing")
            report["overflow_375_px"] = narrow
            report["console_errors_375"] = list(log375.errors)
            await context.close()

            for key in ("builder_overflow_px", "detail_overflow_px"):
                if report[key] > 0:
                    problems.append(f"420px {key} = {report[key]}")
            problems += [f"375px overflow {p}: {v}px" for p, v in narrow.items() if v > 0]
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
