from datetime import datetime, timezone


def ensure_utc(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def elapsed_minutes_since(started_at: datetime | None) -> int:
    started = ensure_utc(started_at)
    if not started:
        return 0
    return int((datetime.now(timezone.utc) - started).total_seconds() / 60)
