"""End-to-end verification of the Équipe page against the clone backend.

Reads the expected roster live from the API (squad size + first player) and
asserts the count, the first player and every French position label present in
the roster render at 420x900. Then exercises the add-player flow end-to-end:
opens the form, fills it (Test Joueur, BU, n°99, pied droit, 2012-03-10),
submits, waits for the new card, checks `GET /api/players` contains it and
removes it again through the trash button (API fallback in `finally` so the
roster is always left clean). Finally re-checks the page at 375x812 for
console errors and horizontal overflow.

Saves docs/equipe.png (roster) and docs/equipe-add.png (open, filled form).

Usage:  python scripts/verify-equipe.py
Expects the frontend dev server on http://localhost:4970 and the backend on
http://localhost:4900.
"""

from __future__ import annotations

import asyncio
import json
import tempfile
import time
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any

from playwright.async_api import async_playwright, Page

BASE_URL = "http://localhost:4970"
API_URL = "http://localhost:4900"
DOCS_DIR = Path(__file__).resolve().parent.parent / "docs"

POSITION_LABELS = {
    "GK": "Gardien",
    "DC": "Déf. central",
    "DG": "Latéral gauche",
    "DD": "Latéral droit",
    "MC": "Milieu central",
    "MDC": "Milieu déf.",
    "MOC": "Meneur de jeu",
    "MG": "Milieu gauche",
    "MD": "Milieu droit",
    "AG": "Ailier gauche",
    "AD": "Ailier droit",
    "BU": "Attaquant",
}

TEST_FIRST = "Test"
TEST_LAST = "Joueur"
TEST_CARD = 'button[aria-label="Supprimer Test Joueur"]'


def api_players() -> list[dict[str, Any]]:
    with urllib.request.urlopen(f"{API_URL}/api/players", timeout=5) as response:
        data = json.load(response)
    return data if isinstance(data, list) else []


def api_delete_player(player_id: str) -> bool:
    request = urllib.request.Request(
        f"{API_URL}/api/players/{player_id}", method="DELETE"
    )
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            return 200 <= response.status < 300
    except (urllib.error.HTTPError, urllib.error.URLError, OSError):
        return False


def find_test_players() -> list[dict[str, Any]]:
    return [
        player
        for player in api_players()
        if player.get("firstName") == TEST_FIRST and player.get("lastName") == TEST_LAST
    ]


def wait_for(predicate, timeout_s: float = 5.0, interval_s: float = 0.25):
    """Poll `predicate` until it returns a truthy value; None on timeout."""
    deadline = time.monotonic() + timeout_s
    while time.monotonic() < deadline:
        result = predicate()
        if result:
            return result
        time.sleep(interval_s)
    return None


class ConsoleLog:
    """Collects console errors + uncaught page errors for one page."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def attach(self, page: Page) -> None:
        page.on("console", self._on_console)
        page.on("pageerror", lambda exc: self.errors.append(f"pageerror: {exc}"))

    def _on_console(self, msg) -> None:
        line = f"{msg.type}: {msg.text}"
        if msg.type == "error":
            self.errors.append(line)
        elif msg.type == "warning":
            self.warnings.append(line)


async def load_equipe(
    page: Page, log: ConsoleLog, anchor: str
) -> tuple[int | None, str]:
    """Loads /fr/equipe, waits for `anchor` to stream in, returns (status, text)."""
    response = await page.goto(f"{BASE_URL}/fr/equipe", wait_until="load")
    try:
        await page.wait_for_load_state("networkidle", timeout=15_000)
    except Exception as exc:  # noqa: BLE001 - dev HMR socket keeps a connection open
        log.warnings.append(f"networkidle-timeout: {exc.__class__.__name__}")
    await page.wait_for_selector(f"text={anchor}", timeout=15_000)
    await page.evaluate("document.fonts.ready")
    await page.wait_for_timeout(400)
    return response.status if response else None, await page.inner_text("body")


async def main() -> None:
    # Leave no residue from a previous failed run before reading expectations.
    leftovers = find_test_players()
    for player in leftovers:
        api_delete_player(player["id"])

    roster = api_players()
    count = len(roster)
    first_player = roster[0] if roster else {}
    first_name = f"{first_player.get('firstName', '')} {first_player.get('lastName', '')}".strip()
    count_label = f"{count} joueur{'s' if count > 1 else ''}"
    labels = sorted(
        {
            POSITION_LABELS.get(player.get("position", ""), player.get("position", ""))
            for player in roster
        }
    )
    required = [count_label, first_name, *labels]
    anchor = first_name or "Effectif"

    problems: list[str] = []
    report: dict[str, Any] = {
        "expected_count_label": count_label,
        "expected_first_player": first_name,
        "expected_position_labels": labels,
        "leftovers_cleaned": len(leftovers),
        "views": {},
        "add_flow": {},
    }

    async with async_playwright() as pw:
        browser = await pw.chromium.launch()

        try:
            # --- 420x900: roster assertions, screenshot, add flow -------------
            context = await browser.new_context(
                viewport={"width": 420, "height": 900}, device_scale_factor=1
            )
            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)

            status, text = await load_equipe(page, log, anchor)
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            missing = [item for item in required if item not in text]

            DOCS_DIR.mkdir(parents=True, exist_ok=True)
            roster_shot = DOCS_DIR / "equipe.png"
            await page.screenshot(path=str(roster_shot))

            entry: dict[str, Any] = {
                "status": status,
                "missing_texts": missing,
                "horizontal_overflow_px": overflow,
                "console_errors": list(log.errors),
                "console_warnings": list(log.warnings),
                "screenshot": str(roster_shot),
            }
            if missing:
                problems.append(f"420x900: missing texts {missing}")
            if overflow > 0:
                problems.append(f"420x900: horizontal overflow of {overflow}px")

            # Add flow: open, fill, screenshot, submit, verify, delete via UI.
            await page.get_by_role(
                "button", name="Ajouter un joueur", exact=True
            ).click()
            await page.get_by_label("Prénom", exact=True).wait_for()
            await page.get_by_label("Prénom", exact=True).fill(TEST_FIRST)
            await page.get_by_label("Nom", exact=True).fill(TEST_LAST)
            await page.get_by_label("Numéro", exact=True).fill("99")
            await page.get_by_label("Pied fort", exact=True).select_option(
                label="Droit"
            )
            await page.get_by_label("Poste", exact=True).select_option(
                label="Attaquant"
            )
            await page.get_by_label("Date de naissance", exact=True).fill(
                "2012-03-10"
            )
            await page.wait_for_timeout(200)

            add_shot = DOCS_DIR / "equipe-add.png"
            await page.screenshot(path=str(add_shot))
            entry["add_screenshot"] = str(add_shot)

            await page.get_by_role("button", name="Ajouter", exact=True).click()
            await page.wait_for_selector(TEST_CARD, timeout=15_000)

            text_after = await page.inner_text("body")
            entry["success_line_shown"] = (
                f"{TEST_FIRST} {TEST_LAST} ajouté à l'effectif" in text_after
            )
            if not entry["success_line_shown"]:
                problems.append("add flow: success line not shown after submit")

            created = wait_for(find_test_players, timeout_s=5.0)
            entry["api_contains_new_player"] = bool(created)
            if not created:
                problems.append("add flow: GET /api/players does not contain Test Joueur")
            else:
                entry["created_id"] = created[0]["id"]

                await page.click(TEST_CARD)
                try:
                    await page.wait_for_selector(
                        TEST_CARD, state="detached", timeout=15_000
                    )
                    entry["removed_from_page"] = True
                except Exception:  # noqa: BLE001
                    entry["removed_from_page"] = False
                    problems.append("delete flow: Test Joueur card still on the page")

                gone = wait_for(
                    lambda: not any(
                        player["id"] == created[0]["id"]
                        for player in api_players()
                    ),
                    timeout_s=5.0,
                )
                entry["api_removed_after_delete"] = bool(gone)
                if not gone:
                    problems.append(
                        "delete flow: GET /api/players still contains Test Joueur"
                    )

            entry["console_errors"] = list(log.errors)
            report["views"]["420x900"] = entry
            problems.extend(
                f"420x900 console -> {line}" for line in entry["console_errors"]
            )
            await context.close()

            # --- 375x812: layout + console re-check ---------------------------
            context = await browser.new_context(
                viewport={"width": 375, "height": 812}, device_scale_factor=1
            )
            page = await context.new_page()
            log = ConsoleLog()
            log.attach(page)

            status, text = await load_equipe(page, log, anchor)
            overflow = await page.evaluate(
                "document.documentElement.scrollWidth - window.innerWidth"
            )
            missing = [item for item in required if item not in text]
            temp_shot = Path(tempfile.gettempdir()) / "equipe-375.png"
            await page.screenshot(path=str(temp_shot))

            entry = {
                "status": status,
                "missing_texts": missing,
                "horizontal_overflow_px": overflow,
                "console_errors": list(log.errors),
                "console_warnings": list(log.warnings),
                "screenshot": str(temp_shot),
            }
            report["views"]["375x812"] = entry
            problems.extend(
                f"375x812 console -> {line}" for line in entry["console_errors"]
            )
            if missing:
                problems.append(f"375x812: missing texts {missing}")
            if overflow > 0:
                problems.append(f"375x812: horizontal overflow of {overflow}px")
            await context.close()
        finally:
            # Always leave the roster clean, even if an assertion above failed.
            remaining = find_test_players()
            report["cleanup_deleted"] = [player["id"] for player in remaining]
            for player in remaining:
                api_delete_player(player["id"])
            await browser.close()

    print(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nPROBLEMS: {len(problems)}")
    for line in problems:
        print(" -", line)
    if problems:
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
