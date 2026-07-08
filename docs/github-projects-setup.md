# Sprint 0 — Terminé

- [x] Repo GitHub, README, specs, Kanban, Docker, CI/CD, branche `develop`

## Sprint 1 — Terminé

- [x] Docker Compose (PostgreSQL, Redis)
- [x] Auth JWT + modèles BDD + Alembic
- [x] Bureau virtuel : tâches, drag & drop, Terminer/Déléguer, slider stress

## Sprint 2 — Terminé

- [x] Modèle `ChatMessage` + persistance messages
- [x] Service ARIA multi-LLM (Groq / Gemini / Ollama / mock)
- [x] FSM 4 phases (accueil → pression → pic → débriefing)
- [x] WebSockets Socket.IO (messages temps réel)
- [x] Messages proactifs ARIA (intervalle selon phase)
- [x] ChatPanel frontend + hook `useAriaChat`
- [x] Fix timezone datetime

## Sprint 3 — En cours (Analyse comportementale)

### Plan complet

| # | Tâche | Priorité | Statut |
|---|--------|----------|--------|
| 1 | Définir formules métriques (productivité, charge cognitive, fatigue) | P0 | ✅ |
| 2 | `analytics_service.py` — agrégation événements + stress + chat | P0 | ✅ |
| 3 | API `GET /api/sessions/{id}/metrics` | P0 | ✅ |
| 4 | WebSocket `metrics_update` (temps réel) | P1 | ✅ |
| 5 | Frontend `MetricsPanel` + Recharts | P0 | ✅ |
| 6 | Hook `useMetrics` (poll 8s + socket) | P1 | ✅ |
| 7 | Debounce slider stress (500 ms) | P2 | ✅ |
| 8 | Tests unitaires métriques | P1 | ✅ |
| 9 | `GET /api/sessions/{id}/stress` (historique seul) | P2 | ⬜ |
| 10 | Persister transitions de phase comme événements | P2 | ⬜ |
| 11 | Endpoint clôture session (`ended_at`) | P2 | ⬜ |
| 12 | Migration Alembic `chat_messages` | P2 | ⬜ |
| 13 | Tests intégration endpoint metrics | P2 | ⬜ |
| 14 | Démo encadrant Sprint 3 | P1 | ⬜ |

### Métriques calculées (proxies 0–100)

- **Productivité** : taux d'achèvement + rythme tâches / 15 min
- **Charge cognitive** : tâches pending, réordonnancements, messages chat, phase FSM
- **Fatigue** : stress déclaré + durée session + tendance stress montante
- **Stress déclaré** : dernière valeur slider (1–10)

### Fichiers Sprint 3

- `backend/app/services/analytics_service.py`
- `backend/app/schemas/metrics.py`
- `backend/app/routers/metrics.py`
- `backend/tests/test_analytics.py`
- `frontend/src/components/MetricsPanel.tsx`
- `frontend/src/hooks/useMetrics.ts`

## Sprint 4 — À venir

- Score stress numérique global (0–100)
- Recommandations IA personnalisées
- Export PDF rapport final
- Page débriefing
