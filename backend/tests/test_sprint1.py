import uuid


def test_register_login_and_update_task(client):
    email = f"sprint1_{uuid.uuid4().hex[:8]}@example.com"

    register = client.post(
        "/api/auth/register",
        json={"email": email, "full_name": "Sprint1 Test", "password": "test1234"},
    )
    assert register.status_code == 201

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
