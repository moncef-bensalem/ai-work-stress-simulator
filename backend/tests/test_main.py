def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["service"] == "backend"
    assert response.json()["database"] == "ok"
