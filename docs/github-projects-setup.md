# Guide GitHub Projects — Kanban

Créez le board Kanban sur votre dépôt GitHub en suivant ces étapes :

## 1. Créer le projet

1. Allez sur https://github.com/moncef-bensalem/ai-work-stress-simulator
2. Cliquez sur l'onglet **Projects**
3. Cliquez **New project** → choisissez le template **Board**
4. Nommez-le : `AI Work Stress Simulator — Roadmap`

## 2. Configurer les colonnes

Renommez / organisez les colonnes ainsi :

| Colonne | Usage |
|---------|-------|
| **Backlog** | Tâches planifiées, pas encore commencées |
| **In Progress** | Tâches en cours de développement |
| **Review** | Tâches terminées, en attente de validation |
| **Done** | Tâches validées et mergées |

## 3. Ajouter les tâches Sprint 0

Créez ces items dans le **Backlog**, puis déplacez les terminés en **Done** :

- [x] Créer le dépôt GitHub
- [x] Initialiser la structure monorepo (frontend + backend)
- [x] Rédiger le README.md
- [x] Hello World React + FastAPI fonctionnel
- [x] Rédiger les spécifications fonctionnelles
- [ ] Configurer GitHub Projects Kanban
- [ ] Installer Docker Desktop
- [ ] Configurer la branche `develop`
- [ ] CI/CD GitHub Actions (premier push)

## 4. Ajouter les tâches Sprint 1 (Backlog)

- Docker Compose complet (PostgreSQL, Redis, Nginx)
- Modèles BDD + migrations Alembic
- Authentification JWT
- Layout bureau virtuel (sidebar, chat, zone centrale)
- Composant TaskCard + TaskList avec drag & drop
- 5 types de tâches
- Slider de stress déclaré
