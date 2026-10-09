"""Tests for the manual CT backfill: start-index search and bounded fan-out."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from domainhunter.filter.pipeline import FilterPipeline
from domainhunter.filter.rdap_age import Registration
from domainhunter.ingest.runner import StartConfig, locate_start_index


class _FakeTimestampFetcher:
    """Answers tree_sizes/leaf_timestamp from a monotonic timestamp table."""

    def __init__(self, stamps: dict[str, list[datetime]]) -> None:
        self._stamps = stamps

    @property
    def logs(self):  # noqa: ANN201 - duck-typed for the search
        return tuple(
            type("_Log", (), {"log_id": log_id})() for log_id in self._stamps
        )

    async def tree_sizes(self) -> dict[str, int]:
        return {log_id: len(stamps) for log_id, stamps in self._stamps.items()}

    async def leaf_timestamp(self, log_id: str, index: int) -> datetime | None:
        stamps = self._stamps[log_id]
        if index < 0 or index >= len(stamps):
            return None
        return stamps[index]


_BASE = datetime(2026, 9, 7, 12, 0, tzinfo=UTC)


def _stamps(count: int, gap_seconds: int = 60) -> list[datetime]:
    return [_BASE + timedelta(seconds=gap_seconds * i) for i in range(count)]


def test_locate_start_index_finds_hour_boundary() -> None:
    fetcher = _FakeTimestampFetcher({"log": _stamps(600)})  # 600 minutes of entries
    since = _BASE + timedelta(minutes=240)

    result = _run_search(fetcher, "log", since, 600)

    assert result == 240


def _run_search(fetcher, log_id: str, since: datetime, tree_size: int) -> int:
    import asyncio

    return asyncio.run(
        locate_start_index(fetcher, log_id=log_id, since=since, tree_size=tree_size)
    )


def test_locate_start_index_clamps_to_bounds() -> None:
    fetcher = _FakeTimestampFetcher({"log": _stamps(100)})

    before_all = _run_search(fetcher, "log", _BASE - timedelta(days=1), 100)
    after_all = _run_search(fetcher, "log", _BASE + timedelta(days=1), 100)

    assert before_all == 0
    assert after_all == 100


def test_locate_start_index_survives_unparseable_entries() -> None:
    stamps = _stamps(50)
    fetcher = _FakeTimestampFetcher({"log": stamps})

    class _HoleyFetcher(_FakeTimestampFetcher):
        async def leaf_timestamp(self, log_id: str, index: int) -> datetime | None:
            if index in (23, 24):
                return None  # simulate unparseable leaves
            return stamps[index]

    result = _run_search(_HoleyFetcher({"log": stamps}), "log", stamps[30], 50)

    assert result == 30


def test_start_config_rejects_bad_knobs() -> None:
    with pytest.raises(ValueError):
        StartConfig(hours=0)
    with pytest.raises(ValueError):
        StartConfig(hours=1, probe_concurrency=0)
    with pytest.raises(ValueError):
        StartConfig(hours=1, claim_limit=-1)


def test_run_follow_cancels_the_digest_loop_when_the_sweep_fails() -> None:
    """A failed sweep must not leave the digest loop running in the background.

    ``_run_follow`` awaits the ingest task first; if that raises, the digest
    task used to be neither awaited nor cancelled, so it kept spinning against
    a work queue that could never be refilled.
    """
    import asyncio

    from domainhunter.ingest.runner import _run_follow

    class _Store:
        def get_source_cursor(self, _name: str) -> None:
            return None

        def pending_ct_discovery_work_count(self) -> int:
            return 1  # never drains, so the digest loop would spin forever

    class _Log:
        log_id = "log"

    class _Fetcher:
        logs = (_Log(),)

        async def tree_sizes(self) -> dict[str, int]:
            return {"log": 20}

        async def fetch_entries(self, *_args, **_kwargs):
            await asyncio.sleep(0.05)  # let the digest loop start first
            raise RuntimeError("sweep exploded")

    class _Poller:
        source_name = "ct_log"

    digest = {"rounds": 0, "cancelled": False}

    async def digest_once():
        digest["rounds"] += 1
        try:
            await asyncio.sleep(3600)
        except asyncio.CancelledError:
            digest["cancelled"] = True
            raise
        raise AssertionError("digest_once should have been cancelled")

    async def go() -> None:
        with pytest.raises(RuntimeError, match="sweep exploded"):
            await _run_follow(
                store=_Store(),
                fetcher=_Fetcher(),
                poller=_Poller(),
                digest_once=digest_once,
                config=StartConfig(follow=True, idle_seconds=0.0, entries=5),
                progress=lambda _event: None,
            )
        # Asserted here, not after asyncio.run(): teardown would cancel any
        # leftover task itself and hide the leak this test exists to catch.
        assert digest["rounds"] == 1, "the digest loop should have been entered"
        assert digest["cancelled"] is True, "the digest loop was left running"
        leftover = [
            task
            for task in asyncio.all_tasks()
            if task is not asyncio.current_task() and not task.done()
        ]
        assert leftover == [], f"tasks outlived _run_follow: {leftover}"

    asyncio.run(go())


def test_filter_pipeline_parallel_rdap_matches_sequential() -> None:
    seen: list[str] = []
    observed_peak = {"concurrent": 0, "current": 0}

    def slow_fetcher(domain: str) -> Registration | None:
        import threading
        import time

        with threading.Lock():
            observed_peak["current"] += 1
            observed_peak["concurrent"] = max(
                observed_peak["concurrent"], observed_peak["current"]
            )
        time.sleep(0.02)
        seen.append(domain)
        with threading.Lock():
            observed_peak["current"] -= 1
        return Registration(
            domain=domain,
            registration_date=datetime.now(UTC) - timedelta(days=2),
            registrar="Test",
            statuses=(),
        )

    domains = [f"d{i}.com" for i in range(12)]
    pipeline = FilterPipeline(
        rdap_fetcher=slow_fetcher,
        dns_checker=lambda kept: {},
        rdap_concurrency=4,
        require_dns=False,
    )
    decisions = pipeline.evaluate(domains)

    assert [d.domain for d in decisions] == domains
    assert all(d.candidate is not None for d in decisions)
    assert len(seen) == 12
    assert observed_peak["concurrent"] <= 4
    assert observed_peak["concurrent"] >= 2  # actually parallel, not accidental serial
