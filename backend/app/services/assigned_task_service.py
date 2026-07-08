"""Gestion des tâches assignées par le Manager — séparées des tâches de simulation."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.assigned_task import AssignedTask
from app.models.user import User

POSTE_LABELS = {
    "developpeur": "Développeur",
    "designer": "Designer",
    "rh": "RH",
    "commercial": "Commercial",
    "all": "Tous les postes",
}

PRIORITY_ORDER = {"urgente": 0, "haute": 1, "moyenne": 2, "basse": 3}

STATUS_LABELS = {
    "todo": "À faire",
    "in_progress": "En cours",
    "waiting": "En attente",
    "done": "Terminée",
    "validated": "Validée",
}

KANBAN_COLUMNS = ("todo", "in_progress", "done")

TASK_TEMPLATES_BY_POSTE: dict[str, list[dict]] = {
    "developpeur": [
        {"title": "Développer une fonctionnalité", "category": "dev", "priority": "haute", "estimated_minutes": 480},
        {"title": "Corriger un bug critique", "category": "dev", "priority": "urgente", "estimated_minutes": 120},
        {"title": "Créer une API REST", "category": "dev", "priority": "haute", "estimated_minutes": 360},
        {"title": "Effectuer des tests unitaires", "category": "qa", "priority": "moyenne", "estimated_minutes": 180},
    ],
    "designer": [
        {"title": "Créer une maquette Figma", "category": "design", "priority": "haute", "estimated_minutes": 240},
        {"title": "Améliorer l'interface UI/UX", "category": "design", "priority": "moyenne", "estimated_minutes": 300},
        {"title": "Créer une identité visuelle", "category": "design", "priority": "moyenne", "estimated_minutes": 480},
    ],
    "rh": [
        {"title": "Gérer les candidatures", "category": "rh", "priority": "haute", "estimated_minutes": 120},
        {"title": "Planifier un entretien", "category": "rh", "priority": "moyenne", "estimated_minutes": 60},
        {"title": "Évaluer un candidat", "category": "rh", "priority": "haute", "estimated_minutes": 90},
    ],
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _is_overdue(task: AssignedTask) -> bool:
    if not task.due_date or task.status in ("done", "validated"):
        return False
    due = task.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    return due < _now()


def _task_to_dict(task: AssignedTask, assignee: User | None = None) -> dict:
    assignee_user = assignee or task.assignee
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "category": task.category,
        "poste": task.poste,
        "poste_label": POSTE_LABELS.get(task.poste, task.poste),
        "priority": task.priority,
        "difficulty": task.difficulty,
        "status": task.status,
        "status_label": STATUS_LABELS.get(task.status, task.status),
        "progress": task.progress,
        "estimated_minutes": task.estimated_minutes,
        "start_date": task.start_date.isoformat() if task.start_date else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "assignee_id": task.assignee_id,
        "assignee_name": assignee_user.full_name if assignee_user else None,
        "created_by_id": task.created_by_id,
        "team": task.team,
        "sort_order": task.sort_order,
        "is_overdue": _is_overdue(task),
        "validated_at": task.validated_at.isoformat() if task.validated_at else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
    }


def _team_employees(db: Session, manager: User) -> list[User]:
    team = manager.team or "developpement"
    return (
        db.query(User)
        .filter(User.role == "user", User.team == team)
        .order_by(User.full_name.asc())
        .all()
    )


def _manager_tasks_query(db: Session, manager: User):
    team = manager.team or "developpement"
    return db.query(AssignedTask).filter(AssignedTask.team == team)


def get_task_templates() -> dict:
    return {
        poste: [{"poste": poste, **tpl} for tpl in templates]
        for poste, templates in TASK_TEMPLATES_BY_POSTE.items()
    }


def get_manager_task_board(db: Session, manager: User) -> dict:
    employees = _team_employees(db, manager)
    tasks = _manager_tasks_query(db, manager).order_by(AssignedTask.sort_order.asc()).all()

    available = [_task_to_dict(t) for t in tasks if t.assignee_id is None]
    employee_cards = []
    for emp in employees:
        emp_tasks = [_task_to_dict(t, emp) for t in tasks if t.assignee_id == emp.id]
        employee_cards.append(
            {
                "id": emp.id,
                "full_name": emp.full_name,
                "email": emp.email,
                "poste": emp.poste or "developpeur",
                "poste_label": POSTE_LABELS.get(emp.poste or "developpeur", emp.poste or "developpeur"),
                "team": emp.team,
                "tasks": emp_tasks,
            }
        )

    kanban: dict[str, list] = {col: [] for col in KANBAN_COLUMNS}
    for task in tasks:
        if task.assignee_id is None:
            if task.status == "todo":
                kanban["todo"].append(_task_to_dict(task))
            continue
        col = "done" if task.status in ("done", "validated") else (
            "in_progress" if task.status in ("in_progress", "waiting") else "todo"
        )
        kanban[col].append(_task_to_dict(task))

    all_assigned = [t for t in tasks if t.assignee_id]
    stats = {
        "total": len(tasks),
        "todo": sum(1 for t in tasks if t.status == "todo" and t.assignee_id),
        "in_progress": sum(1 for t in tasks if t.status in ("in_progress", "waiting")),
        "done": sum(1 for t in tasks if t.status in ("done", "validated")),
        "overdue": sum(1 for t in tasks if _is_overdue(t)),
        "unassigned": sum(1 for t in tasks if t.assignee_id is None),
        "team_progress": round(
            sum(t.progress for t in all_assigned) / len(all_assigned), 1
        ) if all_assigned else 0,
    }

    return {
        "available_tasks": available,
        "employees": employee_cards,
        "kanban": kanban,
        "stats": stats,
        "postes": POSTE_LABELS,
    }


def create_assigned_task(db: Session, manager: User, data: dict) -> dict:
    team = manager.team or "developpement"
    assignee_id = data.get("assignee_id")
    assignee = None
    if assignee_id:
        assignee = db.query(User).filter(User.id == assignee_id, User.role == "user", User.team == team).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Utilisateur introuvable dans votre équipe")

    poste = data.get("poste") or (assignee.poste if assignee else "all")
    task = AssignedTask(
        title=data["title"],
        description=data.get("description") or "",
        category=data.get("category") or "general",
        poste=poste,
        priority=data.get("priority") or "moyenne",
        difficulty=data.get("difficulty") or "moyen",
        status="in_progress" if assignee_id and data.get("status") == "in_progress" else "todo",
        progress=0,
        estimated_minutes=int(data.get("estimated_minutes") or 60),
        start_date=data.get("start_date"),
        due_date=data.get("due_date"),
        assignee_id=assignee_id,
        created_by_id=manager.id,
        team=team,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, assignee)


def get_task_for_manager(db: Session, manager: User, task_id: str) -> AssignedTask:
    task = _manager_tasks_query(db, manager).filter(AssignedTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    return task


def assign_task(db: Session, manager: User, task_id: str, assignee_id: str | None) -> dict:
    task = get_task_for_manager(db, manager, task_id)
    assignee = None
    if assignee_id:
        team = manager.team or "developpement"
        assignee = db.query(User).filter(User.id == assignee_id, User.role == "user", User.team == team).first()
        if not assignee:
            raise HTTPException(status_code=400, detail="Utilisateur introuvable")
        if task.poste not in ("all", assignee.poste or "developpeur"):
            raise HTTPException(
                status_code=400,
                detail=f"Cette tâche est réservée au poste {POSTE_LABELS.get(task.poste, task.poste)}",
            )
    task.assignee_id = assignee_id
    if assignee_id and task.status == "todo":
        task.status = "todo"
    if not assignee_id:
        task.status = "todo"
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, assignee)


def update_manager_task(db: Session, manager: User, task_id: str, data: dict) -> dict:
    task = get_task_for_manager(db, manager, task_id)
    if "status" in data and data["status"]:
        task.status = data["status"]
        if data["status"] == "validated":
            task.validated_at = _now()
            task.progress = 100
    if "priority" in data and data["priority"]:
        task.priority = data["priority"]
    if "progress" in data and data["progress"] is not None:
        task.progress = max(0, min(100, int(data["progress"])))
    if "sort_order" in data and data["sort_order"] is not None:
        task.sort_order = int(data["sort_order"])
    if "assignee_id" in data:
        return assign_task(db, manager, task_id, data["assignee_id"])
    db.commit()
    db.refresh(task)
    return _task_to_dict(task)


def validate_task(db: Session, manager: User, task_id: str) -> dict:
    task = get_task_for_manager(db, manager, task_id)
    if task.status != "done":
        raise HTTPException(status_code=400, detail="La tâche doit être terminée avant validation")
    task.status = "validated"
    task.validated_at = _now()
    task.progress = 100
    db.commit()
    db.refresh(task)
    return _task_to_dict(task)


def delete_assigned_task(db: Session, manager: User, task_id: str) -> None:
    task = get_task_for_manager(db, manager, task_id)
    db.delete(task)
    db.commit()


def get_user_assigned_tasks(db: Session, user: User) -> list[dict]:
    tasks = (
        db.query(AssignedTask)
        .filter(AssignedTask.assignee_id == user.id)
        .order_by(AssignedTask.sort_order.asc(), AssignedTask.due_date.asc())
        .all()
    )
    return [_task_to_dict(t, user) for t in tasks]


def update_user_task_status(db: Session, user: User, task_id: str, status_value: str, progress: int | None = None) -> dict:
    task = db.query(AssignedTask).filter(AssignedTask.id == task_id, AssignedTask.assignee_id == user.id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Tâche introuvable")
    allowed = ("todo", "in_progress", "waiting", "done")
    if status_value not in allowed:
        raise HTTPException(status_code=400, detail="Statut invalide")
    task.status = status_value
    if progress is not None:
        task.progress = max(0, min(100, progress))
    elif status_value == "done":
        task.progress = 100
    elif status_value == "in_progress" and task.progress < 10:
        task.progress = 10
    db.commit()
    db.refresh(task)
    return _task_to_dict(task, user)


def seed_default_tasks(db: Session, manager: User) -> int:
    """Crée des tâches modèles si le backlog est vide."""
    team = manager.team or "developpement"
    existing = _manager_tasks_query(db, manager).count()
    if existing > 0:
        return 0
    created = 0
    for poste, templates in TASK_TEMPLATES_BY_POSTE.items():
        for tpl in templates:
            task = AssignedTask(
                title=tpl["title"],
                description=f"Tâche type pour {POSTE_LABELS.get(poste, poste)}",
                category=tpl.get("category", "general"),
                poste=poste,
                priority=tpl.get("priority", "moyenne"),
                difficulty="moyen",
                estimated_minutes=tpl.get("estimated_minutes", 120),
                created_by_id=manager.id,
                team=team,
            )
            db.add(task)
            created += 1
    db.commit()
    return created
