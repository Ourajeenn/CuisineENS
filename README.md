# CuisineEnsemble

<div align="center">

![CuisineEnsemble](https://img.shields.io/badge/CuisineEnsemble-v1.0.0-terracotta?style=for-the-badge&color=C0392B)
![Python](https://img.shields.io/badge/Python-3.12-blue?style=for-the-badge&logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111-green?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Docker](https://img.shields.io/badge/Docker-ready-2496ED?style=for-the-badge&logo=docker)
![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions)

**Une plateforme conviviale pour organiser des repas partagés dans le quartier et diviser les coûts intelligemment.**

[ Demo Live](#) • [📖 Documentation API](http://localhost:8000/docs) • [🐛 Issues](https://github.com/Ourajeenn/CuisineEnsemble/issues)

</div>

---

## ✨ Fonctionnalités

| Feature | Description |
|---|---|
| 👨‍🍳 **Cuisiniers & Convives** | Rôles distincts avec profils vérifiés |
| 💰 **Partage de coûts en temps réel** | Le prix par personne se recalcule dynamiquement à chaque inscription |
| 🗺️ **Géolocalisation** | Filtrage des repas par distance (Haversine) |
| 🌿 **Filtres alimentaires** | Végétarien, Vegan, Sans gluten, Halal... |
| ⭐ **Système de notes** | Notation mutuelle cuisiniers/convives |
| 🔔 **Temps réel via WebSocket** | Notifications push instantanées |
| 📊 **Monitoring** | Prometheus + Grafana intégrés |
| 🔒 **Sécurité** | JWT (access + refresh tokens), Semgrep SAST |

---

##  Architecture

```
CuisineEnsemble/
├── backend/          # FastAPI + SQLAlchemy + SQLite/PostgreSQL
│   ├── app/
│   │   ├── main.py       # Routes API complètes
│   │   ├── models.py     # Modèles ORM
│   │   ├── schemas.py    # Schémas Pydantic
│   │   ├── crud.py       # Logique métier + répartition coûts
│   │   ├── auth.py       # JWT auth
│   │   ├── websocket.py  # Notifications temps réel
│   │   └── metrics.py    # Métriques Prometheus
│   └── tests/
│       └── test_api.py   # Tests d'intégration complets
├── frontend/         # React 18 + Vite + Bootstrap
│   └── src/
│       ├── App.jsx       # SPA complète (routing, état global)
│       └── index.css     # Design system terracotta
├── k8s/              # Manifestes Kubernetes
├── prometheus/       # Config Prometheus
├── .github/
│   └── workflows/
│       └── ci.yml    # Pipeline CI/CD complet
└── docker-compose.yml  # Stack complète
```

---

## 🚀 Démarrage rapide

### Prérequis
- Python 3.12+
- Node.js 20+
- Docker & Docker Compose (optionnel)

### Option 1 — Dev local

**Backend (FastAPI)**
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

📖 Documentation interactive : http://localhost:8000/docs

**Frontend (React + Vite)**
```bash
cd frontend
npm install
npm run dev
```

🌐 Application : http://localhost:5173

### Option 2 — Docker Compose (stack complète)

```bash
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| Prometheus | http://localhost:9090 |
| Grafana | http://localhost:3100 |

---

## 🔌 API Endpoints

### Authentification
| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/v1/auth/register` | Créer un compte |
| `POST` | `/api/v1/auth/login` | Se connecter (JWT) |
| `POST` | `/api/v1/auth/refresh` | Rafraîchir le token |

### Repas
| Méthode | Route | Description |
|---|---|---|
| `GET` | `/api/v1/meals` | Lister avec filtres (distance, régime, allergènes) |
| `POST` | `/api/v1/meals` | Proposer un repas (cuisinier) |
| `GET` | `/api/v1/meals/{id}` | Détail d'un repas |

### Participations & Coûts
| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/v1/participations` | S'inscrire à un repas |
| `DELETE` | `/api/v1/participations/meals/{id}` | Se désinscrire |
| `GET` | `/api/v1/participations/meals/{id}` | Voir la répartition des coûts |

### Évaluations
| Méthode | Route | Description |
|---|---|---|
| `POST` | `/api/v1/ratings` | Laisser une note |
| `GET` | `/api/v1/users/me` | Profil + note moyenne |

---

## 🧪 Tests

```bash
cd backend
python -m pytest --cov=app --cov-report=term-missing tests/
```

La suite de tests couvre :
- ✅ Health check
- ✅ Workflow d'authentification complet (register / login / JWT)
- ✅ Création de repas avec géolocalisation
- ✅ Filtrage par distance et allergènes
- ✅ Répartition dynamique des coûts (en temps réel)
- ✅ Annulation et recalcul des prix
- ✅ Système de notation mutuelle

---

## 🔄 Pipeline CI/CD

Le pipeline GitHub Actions comprend 5 étapes :

```
lint → test-backend → docker-build → deploy-staging
       security-scan ↗
```

1. **Lint** — Flake8 (Python) + ESLint (React)
2. **SAST** — Semgrep security scan
3. **Tests** — Pytest avec couverture de code
4. **Docker** — Build des images backend + frontend
5. **Staging** — Simulation de déploiement Kubernetes

---

## 🛡️ Sécurité

- **JWT** avec access token (15 min) + refresh token (7 jours)
- **Password hashing** — bcrypt via passlib
- **Semgrep SAST** intégré dans le CI
- **CORS** configuré pour les origines autorisées
- **Rate limiting** via middleware FastAPI

---

## 🤝 Contribuer

1. Fork le projet
2. Créez votre branche (`git checkout -b feature/ma-fonctionnalite`)
3. Committez (`git commit -m 'feat: ajouter ma fonctionnalité'`)
4. Poussez (`git push origin feature/ma-fonctionnalite`)
5. Ouvrez une Pull Request

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE) pour les détails.

---

<div align="center">
Fait le 10.05.26 pour la convivialité et le partage
</div>
