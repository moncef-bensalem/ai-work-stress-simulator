from app.services.analytics_service import (
    compute_global_stress_score,
    stress_score_label,
)


def test_global_stress_score_range():
    scores = {
        "declared_stress": 5,
        "productivity": 70.0,
        "cognitive_load": 50.0,
        "fatigue": 40.0,
    }
    score = compute_global_stress_score(scores, "bienveillante")
    assert 0 <= score <= 100


def test_global_stress_score_higher_in_toxique_mode():
    scores = {
        "declared_stress": 7,
        "productivity": 50.0,
        "cognitive_load": 60.0,
        "fatigue": 55.0,
    }
    bien = compute_global_stress_score(scores, "bienveillante")
    tox = compute_global_stress_score(scores, "toxique")
    assert tox > bien


def test_global_stress_score_increases_with_stress():
    low = compute_global_stress_score(
        {"declared_stress": 2, "productivity": 90.0, "cognitive_load": 20.0, "fatigue": 15.0},
        "bienveillante",
    )
    high = compute_global_stress_score(
        {"declared_stress": 9, "productivity": 30.0, "cognitive_load": 80.0, "fatigue": 75.0},
        "bienveillante",
    )
    assert high > low


def test_stress_score_labels():
    assert stress_score_label(20) == "Faible"
    assert stress_score_label(50) == "Modéré"
    assert stress_score_label(70) == "Élevé"
    assert stress_score_label(90) == "Critique"
