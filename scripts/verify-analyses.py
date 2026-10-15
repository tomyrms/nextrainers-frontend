"""End-to-end verification of the Analyses screens against the clone backend.

1. /fr/analyses at 420x900: every analysis returned live by `GET /api/analysis`
   renders (opponent name + "A vs B" formations); `?opponent=` prefills the form.
2. Create flow: fills the form (opponent "Test Analyse PW", 4-3-3 vs 3-5-2),
   submits, lands on /fr/analyses/<id>, and the tips shown are exactly the ones
   `GET /api/analysis/<id>` returns (grouped under their French category).
3. Unknown id -> "Analyse introuvable".
4. 375x812 + 420x900: no console errors, no horizontal overflow.

Saves docs/analyses.png (list) and docs/analyse-detail.png (detail + tips).
The backend has no DELETE /api/analysis/:id, so the created analysis stays
(one per run, all named "Test Analyse PW").

Usage:  python scripts/verify-analyses.py
Expects the frontend on http://localhost:4970 and the backend on :4900.
"""

from __future__ import annotations

import asyncio
import json
import sys
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import Page, async_playwright

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"
TEST_OPPONENT = "Test Analyse PW"
CATEGORY_LABELS = {
    "attack": "Attaque",
    "defense": "Défense",
    "transition": "Transitions",
    "setPieces": "Coups de pied arrêtés",
}


def api_get(path: str) -> Any:
    with urllib.request.urlopen(f"{API_URL}{path}", timeout=5) as response:
        return json.load(response)


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


async def main() -> int:
    problems: list[str] = []
    checks = 0

    def check(name: str, ok: bool, detail: str = "") -> None:
        nonlocal checks
        checks += 1
        print(f"  {'PASS' if ok else 'FAIL'}  {name}{'' if ok else '  -> ' + detail}")
        if not ok:
            problems.append(name)

    analyses = api_get("/api/analysis")
    check("API returns an analyses array", isinstance(analyses, list), str(analyses)[:80])

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()
        try:
            context = await browser.new_context(viewport={"width": 420, "height": 900})
            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)

            # --- list ---------------------------------------------------------
            response = await page.goto(f"{BASE_URL}/fr/analyses", wait_until="load")
            await settle(page)
            check("/fr/analyses -> 200", bool(response and response.status == 200))
            count_label = f"{len(analyses)} analyse{'s' if len(analyses) > 1 else ''}"
            await page.wait_for_selector(f"text={count_label}", timeout=15_000)
            for analysis in analyses[:6]:
                card = page.locator(f'[data-analysis-id="{analysis["id"]}"]')
                text = await card.inner_text() if await card.count() else ""
                vs = f'{analysis["teamFormation"]} vs {analysis["opponentTeamFormation"]}'
                check(
                    f"card {analysis['id']} shows opponent + formations",
                    analysis["opponentTeamName"] in text and vs in text,
                    text[:80],
                )
            check("list 420px: no horizontal overflow", await overflow(page) <= 0)
            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(DOCS_DIR / "analyses.png"))

            # --- ?opponent= prefill -------------------------------------------
            await page.goto(f"{BASE_URL}/fr/analyses?opponent=FC%20Prefill", wait_until="load")
            await settle(page)
            prefill = await page.get_by_label("Adversaire", exact=True).input_value()
            check("?opponent= prefills the form", prefill == "FC Prefill", prefill)

            # --- create flow ----------------------------------------------------
            await page.get_by_label("Adversaire", exact=True).fill(TEST_OPPONENT)
            await page.get_by_label("Mon système", exact=True).select_option("4-3-3")
            await page.get_by_label("Son système", exact=True).select_option("3-5-2")
            await page.get_by_role("button", name="Analyser l'adversaire").click()
            await page.wait_for_url("**/fr/analyses/an_*", timeout=15_000)
            new_id = page.url.rsplit("/", 1)[-1]
            await settle(page)
            await page.wait_for_selector("[data-tip-id]", timeout=15_000)

            detail = api_get(f"/api/analysis/{new_id}")
            check("created analysis persisted with our input",
                  detail.get("opponentTeamName") == TEST_OPPONENT
                  and detail.get("opponentTeamFormation") == "3-5-2", str(detail)[:100])
            tips = detail.get("tips") or []
            check("generate-tips ran (API has tips)", len(tips) >= 3, str(len(tips)))
            shown = await page.locator("[data-tip-id]").evaluate_all("els => els.map(e => e.dataset.tipId)")
            check("detail renders exactly the API tips", sorted(shown) == sorted(t["id"] for t in tips), f"{shown}")
            body = await page.inner_text("body")
            for tip in tips:
                check(f"tip '{tip['id']}' title + category label shown",
                      tip["title"] in body
                      # Category headings are CSS-uppercased in innerText.
                      and CATEGORY_LABELS.get(tip["category"], "Autres").upper() in body.upper())
            check("detail shows both formations", "4-3-3" in body and "3-5-2" in body and TEST_OPPONENT in body)
            check("detail 420px: no horizontal overflow", await overflow(page) <= 0)
            await page.screenshot(path=str(DOCS_DIR / "analyse-detail.png"), full_page=True)

            # --- 404 ------------------------------------------------------------
            await page.goto(f"{BASE_URL}/fr/analyses/does-not-exist", wait_until="load")
            await settle(page)
            await page.wait_for_selector("text=Analyse introuvable", timeout=15_000)
            check("unknown id -> friendly not-found state", True)

            # --- 375px ----------------------------------------------------------
            await page.set_viewport_size({"width": 375, "height": 812})
            for path in ("/fr/analyses", f"/fr/analyses/{new_id}"):
                await page.goto(f"{BASE_URL}{path}", wait_until="load")
                await settle(page)
                check(f"{path} 375px: no horizontal overflow", await overflow(page) <= 0)

            check("0 console errors", not log.errors, "; ".join(log.errors)[:300])
            await context.close()
        finally:
            await browser.close()

    print(f"\n== {checks - len(problems)} passed, {len(problems)} failed ==")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
