# AI Work Stress Simulator

Plateforme interactive de sensibilisation à l'aliénation numérique — simulation immersive d'une journée de travail sous supervision de l'IA managériale **ARIA**.

**Établissement :** ESPRIT — Honoris United Universities  
**Stage :** Été 2025-2026  
**Durée :** 2 mois (4 sprints de 2 semaines)

## Stack technique

| Couche | Technologies |
|--------|-------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Alembic |
| Base de données | PostgreSQL 15, Redis |
| IA | Claude API (Anthropic) |
| Infrastructure | Docker, Docker Compose, Nginx, GitHub Actions |

## Structure du projet

```
ai-work-stress-simulator/
├── frontend/          # Application React
├── backend/           # API FastAPI
├── docker/            # Configuration Nginx
├── docs/              # Documentation projet
├── docker-compose.yml
└── .github/workflows/ # CI/CD
```

## Prérequis

- [Node.js](https://nodejs.org/) 20+
- [Python](https://www.python.org/) 3.11+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (optionnel, recommandé)
- [Git](https://git-scm.com/)

## Démarrage rapide (sans Docker)

### 1. Backend

> **Note :** Python **3.11** est recommandé (stack complète). Si vous utilisez Python 3.14+, installez `requirements-minimal.txt` pour le Sprint 0.

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Application : http://localhost:5173

## Démarrage avec Docker

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| Swagger docs | http://localhost:8000/docs |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Parcours utilisateur (Sprint 1)

1. S'inscrire / se connecter (`/register`, `/login`)
2. Choisir un mode ARIA et démarrer une session
3. Gérer les 5 tâches : drag & drop, terminer, déléguer
4. Déclarer son niveau de stress via le slider

## API principale

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth/register` | Inscription |
| POST | `/api/auth/login` | Connexion JWT |
| POST | `/api/auth/refresh` | Rafraîchir le token |
| GET | `/api/auth/me` | Profil utilisateur |
| POST | `/api/sessions` | Démarrer une session |
| GET | `/api/sessions/{id}/tasks` | Liste des tâches |
| PUT | `/api/tasks/{id}` | Mettre à jour une tâche |
| POST | `/api/sessions/{id}/stress` | Enregistrer le stress |

## Tests

```bash
# Backend
cd backend
pytest -v

# Frontend (build)
cd frontend
npm run build
```

## Branches Git

- `main` — code stable en production
- `develop` — intégration des fonctionnalités
- `feature/*` — développement par fonctionnalité

## Modules fonctionnels

1. **Bureau Virtuel** — tâches, notifications, drag & drop
2. **Manager IA (ARIA)** — chatbot adaptatif, WebSockets, FSM
3. **Analyse Comportementale** — métriques, dashboard temps réel
4. **Rapport Final** — score de stress, recommandations, export PDF

## Licence

Projet académique — ESPRIT, Honoris United Universities.
