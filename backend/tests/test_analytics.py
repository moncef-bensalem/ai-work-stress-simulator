from app.services.analytics_service import (
    compute_cognitive_load_from_counts,
    compute_fatigue,
    compute_productivity_from_counts,
)


def test_productivity_zero_tasks():
    assert compute_productivity_from_counts(0, 0, 10.0) == 0.0


def test_productivity_all_done():
    score = compute_productivity_from_counts(5, 5, 15.0)
    assert score >= 80.0


def test_cognitive_load_increases_with_pending():
    low = compute_cognitive_load_from_counts(1, 5, 0, 0, "accueil", 10.0)
    high = compute_cognitive_load_from_counts(4, 5, 2, 3, "pic", 10.0)
    assert high > low


def test_fatigue_increases_with_stress():
    low = compute_fatigue(3.0, 10.0, [])
    high = compute_fatigue(9.0, 30.0, [])
    assert high > low
