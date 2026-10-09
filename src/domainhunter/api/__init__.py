"""The local review API.

One FastAPI app over one SQLite store. Routes are grouped by concern:

* :mod:`~domainhunter.api.console` — the static shell and bookmark redirects
* :mod:`~domainhunter.api.review` — the candidate inbox and review decisions
* :mod:`~domainhunter.api.discovery` — triggering and observing CT discovery

The store is built once here and reached from handlers through the ``StoreDep``
dependency defined in :mod:`~domainhunter.api.dependencies`.
"""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from domainhunter.api import console, discovery, review
from domainhunter.storage.sqlite import SQLiteStore

__all__ = ["create_app"]


def create_app(database_path: str | Path) -> FastAPI:
    """Create a process-local review API backed by the supplied SQLite database."""
    app = FastAPI(title="DomainHunter Review API", version="0.1.0")
    app.state.store = SQLiteStore(database_path)
    app.state.discovery_log_path = Path(database_path).with_suffix(".log")

    app.mount(
        "/assets",
        StaticFiles(directory=console.STATIC_DIR / "assets"),
        name="assets",
    )
    app.include_router(console.router)
    app.include_router(review.router)
    app.include_router(discovery.router)
    return app
