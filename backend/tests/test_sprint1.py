import uuid

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["service"] == "backend"


def test_register_login_and_update_task():
    email = f"sprint1_{uuid.uuid4().hex[:8]}@example.com"
    client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Sprint1 Test", "password": "test1234"},
    )
    login = client.post(
        "/api/auth/login",
        data={"username": email, "password": "test1234"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    session = client.post(
        "/api/sessions",
        json={"display_name": "Test", "mode": "bienveillante"},
        headers=headers,
    )
    assert session.status_code == 201
    session_id = session.json()["id"]

    tasks = client.get(f"/api/sessions/{session_id}/tasks", headers=headers)
    assert tasks.status_code == 200
    assert len(tasks.json()) == 5

    task_id = tasks.json()[0]["id"]
    updated = client.put(
        f"/api/tasks/{task_id}",
        json={"status": "completed"},
        headers=headers,
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "completed"
