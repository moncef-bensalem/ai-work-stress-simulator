# Spécifications Fonctionnelles — AI Work Stress Simulator

**Projet :** AI Work Stress Simulator  
**Établissement :** ESPRIT — Honoris United Universities  
**Étudiante :** Moncef Bensalem  
**Date :** Mars 2026  
**Durée du stage :** 2 mois

---

## 1. Objectifs du projet

L'intégration croissante de l'intelligence artificielle dans l'environnement de travail soulève des questions majeures sur le bien-être des salariés. Les systèmes de surveillance algorithmique, les chatbots managériaux et l'automatisation des tâches créent une pression inédite pouvant conduire à l'**aliénation numérique**.

Ce projet vise à développer une **plateforme interactive** simulant une journée de travail sous supervision d'une IA managériale nommée **ARIA**, afin de :

- **Sensibiliser** les utilisateurs aux effets psychologiques de la pression algorithmique en entreprise ;
- **Mesurer objectivement** l'impact comportemental via des métriques (productivité, charge cognitive, fatigue, stress déclaré) ;
- **Fournir des recommandations** personnalisées pour un usage éthique de l'IA au travail.

> **Note :** La simulation ne constitue pas un diagnostic médical. Les mesures sont indicatives et basées sur des proxies comportementaux.

---

## 2. Périmètre fonctionnel

Le stage couvre le développement complet de **4 modules** répartis sur 4 sprints de 2 semaines :

| Module | Fonctionnalités | Sprint |
|--------|----------------|--------|
| **Bureau Virtuel** | File de tâches dynamiques (5 types), drag & drop, notifications, slider de stress, authentification JWT | Sprint 1 |
| **Manager IA (ARIA)** | Chatbot adaptatif (3 personnalités), machine à états (4 phases), messages proactifs, WebSockets temps réel | Sprint 2 |
| **Analyse Comportementale** | Collecte d'événements, calcul de métriques (productivité, charge cognitive, fatigue), dashboard temps réel avec graphiques | Sprint 3 |
| **Rapport Final** | Score de stress numérique (0-100), recommandations IA, export PDF, page de débriefing | Sprint 4 |

### Hors périmètre (non réalisé durant ce stage)

- Environnement 3D immersif (Unreal Engine 5) — version avancée optionnelle ;
- Application mobile native ;
- Intégration avec des systèmes RH réels ;
- Diagnostic médical ou thérapeutique.

### Livrables finaux attendus

1. Application web déployée en production (4 modules opérationnels)
2. Dépôt GitHub documenté avec CI/CD
3. Rapport technique (40-60 pages)
4. Vidéo de démonstration (5-10 minutes)
5. Poster scientifique (format A1)
6. Rapport PDF généré automatiquement à la fin de chaque session

---

**Stack technique :** React 18 + TypeScript + Tailwind CSS · FastAPI + PostgreSQL + Redis · Claude API · Docker + Nginx + GitHub Actions
