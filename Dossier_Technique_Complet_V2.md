# Dossier Technique Complet & Pitch Deck - CuisinierEnsemble

Ce document regroupe l'intégralité du dossier technique, le pitch deck investisseur et les détails des maquettes pour le projet CuisinierEnsemble.

---

# 📑 PARTIE 1 : ARCHITECTURE TECHNIQUE COMPLÈTE

## 1.1 Architecture Technique & Stack Technologique

### Vue d'ensemble des composants

```mermaid
graph TD
    subgraph "Clients (Frontend)"
        Mobile[App Mobile (RN) - Mobile First]
        Web[WebApp (PWA) - Admin & Public]
    end

    subgraph "Cloud Infrastructure (Backend)"
        API[API Gateway (Node.js/Express)]
        Auth[Service Auth (JWT / Oauth2)]
        Engine[Core Engine (Réservation/Stock)]
        AI[AI Service (Recommandation)]
    end

    subgraph "Data Persistence"
        DB[(PostgreSQL - Données)]
        Cache[(Redis - Performance)]
        Storage[S3 - Médias]
    end

    subgraph "External Ecosystem"
        Stripe[Stripe (Paiements)]
        FCM[Firebase (Notifs Push)]
        Maps[Google Maps API]
    end

    Mobile & Web -->|HTTPS/TLS 1.3| API
    API --> Auth
    API --> Engine
    Engine --> AI
    Engine --> DB
    Engine --> Cache
    Engine --> Storage
    Engine --> Stripe & FCM & Maps
```

### Stack Technologique Détaillée

1.  **Frontend (App mobile + Web)**
    *   **Technologie** : React Native (Mobile) + React.js (Web PWA).
    *   **UX Strategy** : **Mobile-First**. Design pensé pour le pouce, navigation via bottom tab bar.
    *   **Charte Graphique** :
        *   **Couleurs** : Vert Forêt (`#1A5762` - Confiance), Vert Herbe (`#449768` - Action/Eco), Crème (`#FDFBF7` - Fond Apaisant).
        *   **Typographie** : *Outfit* (Moderne, géométrique, lisible).
    *   **Fonctionnalités Clés** : Géolocalisation précise, Scanner QR Code natif, Mode hors-ligne partiel.

2.  **Backend (API REST)**
    *   **Runtime** : Node.js avec framework Express (ou NestJS pour scalabilité).
    *   **API Standard** : RESTful, documentée en OpenAPI 3.0 (Swagger).
    *   **Architecture** : Modulaire (Séparation des services : Auth, Payment, Inventory).

3.  **Base de Données & Stockage**
    *   **SGBD** : PostgreSQL (Données relationnelles : User, Order, Product).
    *   **Cache** : Redis (Sessions, paniers temporaires, cache API).
    *   **Stockage Fichiers** : AWS S3 ou Compatible (MinIO) pour les photos des paniers et avatars.

4.  **Services Externes & Infrastructure**
    *   **Paiement** : Stripe Connect (Gestion des flux marketplace).
    *   **Notifications** : Firebase Cloud Messaging (FCM) pour push "Panier disponible !".
    *   **Hébergement** :
        *   **Frontend** : Netlify (CDN Global, déploiement continu).
        *   **Backend** : Railway ou AWS ECS (Conteneurisé via Docker).
    *   **CDN** : Cloudflare (Sécurité DDoS, Accélération contenu statique).

5.  **Sécurité & Conformité**
    *   **RGPD** : Privacy by Design, chiffrement des données au repos.
    *   **PCI DSS** : Paiements délégués intégralement à Stripe (SAQ A).
    *   **Authentification** : JWT (Access Token courte durée + Refresh Token HttpOnly).

---

## 1.2 Schéma Base de Données Optimisé (MLD)

Modèle relationnel normalisé pour garantir l'intégrité des transactions.

*   **USERS** `(id, email, password_hash, role [student/merchant], phone, wallet_balance, created_at)`
*   **SHOPS** `(id, owner_id, name, address, lat, lng, siret, rating, image_url)`
*   **BASKETS** `(id, shop_id, title, description, price, original_price, pickup_start, pickup_end, stock_initial, stock_current, status, tags [bio, veggie])`
*   **RESERVATIONS** `(id, user_id, basket_id, status [pending/paid/collected/cancelled], stripe_payment_id, qr_token, created_at, collected_at)`
*   **AUDIT_LOGS** `(id, user_id, action, ip_address, timestamp)` *(Sécurité)*

---

## 1.3 Endpoints API (MVP - Top 10)

Documentation pour les développeurs Frontend et Partenaires.

| Verbe | Endpoint | Description | Paramètres Clés |
| :--- | :--- | :--- | :--- |
| **AUTH** | | | |
| `POST` | `/auth/register` | Inscription nouvel utilisateur | `email`, `password`, `role` |
| `POST` | `/auth/login` | Connexion & Récupération Token | `email`, `password` |
| **BASKETS** | | | |
| `GET` | `/baskets` | Recherche avec géolocalisation | `lat`, `lng`, `radius`, `filter` |
| `GET` | `/baskets/:id` | Détail d'un panier spécifique | `id` |
| `POST` | `/baskets` | Création panier (Marchand) | `title`, `price`, `stock`, `pickup_time` |
| **RESERVATIONS** | | | |
| `POST` | `/reservations` | Réserver un panier | `basket_id`, `payment_token` |
| `GET` | `/reservations/me` | Historique de l'utilisateur | `status` (active/history) |
| `POST` | `/reservations/:id/collect` | Valider retrait (Scan QR) | `qr_token` (Marchand uniquement) |
| **USER** | | | |
| `GET` | `/users/profile` | Infos profil et stats impact | *Token Auth* |
| `PUT` | `/users/settings` | Préférences (Notifs, Diet) | `notifications_enabled`, `diet_tags` |

---

## 1.4 Cycle de vie d'une réservation (Business Process)

1.  **Découverte** : L'étudiant voit un panier "Boulangerie Ange" à 500m (API `GET /baskets`).
2.  **Réservation** : Il clique "Réserver", paie via Stripe.
3.  **Verrouillage** : Le stock baisse de 1. Le statut passe à `CONFIRMED`.
4.  **Preuve** : Un QR Code unique chiffré est généré et stocké dans l'app.
5.  **Retrait** : L'étudiant présente le QR au commerçant entre 18h et 19h.
6.  **Validation** : Le commerçant scanne. Statut passe à `COLLECTED`.
7.  **Impact** : Le compteur "Kg sauvés" de l'étudiant s'incrémente. Les fonds sont débloqués pour le marchand.

---

## 1.5 Sécurité, RGPD & Performance

### Authentification & Sécurité
*   **Hashage** : Mots de passe chiffrés avec **Argon2id**.
*   **JWT** : Signature RS256 pour prévenir la falsification des tokens.
*   **Rate Limiting** : Protection API (max 100 req/min par IP via Redis) pour éviter les attaques DoS.

### Conformité RGPD 🔒
*   **Consentement** : Banderole cookies + Opt-in explicite géolocalisation.
*   **Minimisation** : On ne stocke pas les données bancaires (Stripe le fait).
*   **Droit à l'oubli** : Anonymisation des commandes après suppression de compte.

### Performance & Scalabilité 🚀
*   **Horizontal Scaling** : Le backend Node.js est stateless, permettant d'ajouter des instances serveurs à la volée lors des pics (ex: 18h).
*   **CDN** : Les assets statiques sont servis en <50ms mondialement.
*   **Database Read-Replicas** : Séparation lectures/écritures si le trafic explose.

---

# 📊 PARTIE 2 : PITCH DECK INVESTISSEUR

## Slide 1 : Couverture
**Titre** : CuisinierEnsemble
**Slogan** : Le marché anti-gaspi pour les étudiants.
**Visuel** : Logo grand format sur fond vert rassurant.

## Slide 2 : Le Problème
*   **Constat** : En France, **10 millions de tonnes** de nourriture sont jetées par an.
*   **Dilemme Étudiant** : 20% des étudiants vivent sous le seuil de pauvreté. Manger sain coûte trop cher.
*   **Dilemme Magasin** : Jeter coûte de l'argent (taxes déchets) et nuit à l'image.

## Slide 3 : Notre Solution
**CuisinierEnsemble** reconnecte ces deux mondes.
1.  **Magasin** : Met en ligne ses invendus en 3 clics.
2.  **Panier -60%** : Vendu 3,50€ (valeur 10€).
3.  **Retrait** : Directement en magasin, créneau court (fin de journée).
4.  **Impact** : 1,2 kg de nourriture sauvée par panier.

**3 Gagnants** : 🎓 Étudiant (Pouvoir d'achat) + 🏪 Magasin (Revenus + Flux) + 🌍 Planète.

## Slide 4 : Personas Clés
*   **Lucas (21 ans, Étudiant)** : Budget serré (120€/mois pour manger). Veut bien manger mais c'est cher. Adore la "chasse aux bons plans" (Gamification).
*   **Sophie (30 ans, Gérante Supermarché)** : Doit réduire la démarque inconnue. Veut rajeunir sa clientèle. Cherche une solution "Zero Effort".

## Slide 5 : Marché & Opportunité
*   **TAM (Total Addressable Market)** : Marché Anti-Gaspi France (Milliards €).
*   **SAM (Serviceable Available Market)** : Étudiants & Jeunes actifs urbains (8M personnes).
*   **SOM (Serviceable Obtainable Market)** : Île-de-France Année 1.
    *   45 Magasins partenaires cibles sur Y1.
    *   700 000 Étudiants en IDF.
    *   Potentiel : 3.2M€ (Revenue Y1 estimé).

## Slide 6 : Modèle Économique
Commission transparente à la performance.
*   Prix Panier Moyen : **3,50€**
*   **CuisinierEnsemble (25%)** : 0,88€ (Marge Brute)
*   **Magasin (75%)** : 2,62€ (Revenu Net)
*   *Exemple* : 500 paniers/jour = 440€ de revenu quotidien pour nous.

## Slide 8 : Concurrence & Différenciation
| Acteur | Focus | Faiblesse |
| :--- | :--- | :--- |
| **Too Good To Go** | Mass Market | UX dense, concurrence féroce pour l'utilisateur |
| **Phenix** | B2B / Pro | Moins orienté consommateurs étudiants |
| **CuisinierEnsemble** | **Niche Étudiante** | **Prix unique (3,50€), Gamification forte, UX Gen-Z** |

**Notre Secret Sauce** : L'approche communautaire campus ambassadeurs + Gamification de l'impact écologique.

## Slide 9 : Équipe & Roadmap
*   **CEO** : Vision & Partenariats GMS.
*   **CTO** : Expert Tech (Node/React), Architecture scalable.
*   **Product** : Ex-FoodTech, obsédé par l'UX.
*   **Growth** : Expert TikTok/Campus.

## Slide 10 : Projections Financières
*   **M1-M3** : Lancement Pilote (5K users).
*   **M6** : **Break-Even** (40K users, 150K€ MRR).
*   **Y1** : 1.2M€ Revenu Annuel. EBITDA Positif (+180K€).

## Slide 11 : Financement (Seed Round)
**Recherche : 500K€**
*   30% R&D (Tech & App).
*   30% Marketing (Acquisition Campus).
*   20% Ops (Partenariats magasins).
*   20% Admin/Legal.
**Timeline** : Closing Février 2026 -> Go Live Mars 2026.

## Slide 12 : Call to Action
**Pourquoi maintenant ?**
1.  **Inflation** : Les étudiants ont faim de solutions économiques.
2.  **Tech Ready** : Notre MVP est prêt et testé.
3.  **Législation** : Lois anti-gaspillage de plus en plus strictes pour les GMS.
*Investissez dans un avenir durable et rentable.*

## Slide 13 : Contact
**Questions ?**
contact@cuisinierensemble.com | www.cuisinierensemble.com

---

# 📱 PARTIE 3 : MAQUETTES INTÉGRÉES & UX

Description détaillée des 6 écrans clés du MVP (Visibles dans le prototype Figma/Web).

### Écran 1 : Accueil & Découverte (La "Map")
*   **Objectif** : "Je veux manger maintenant et pas cher."
*   **UX** : Carte interactive occupant 80% de l'écran. Pins verts pour les magasins avec stock.
*   **Header** : Barre de recherche "Pizza, Fruits..." + Filtres rapides (Bio, Végé).

### Écran 2 : Liste des Paniers (Le "Feed")
*   **Objectif** : Comparer les offres.
*   **UI** : Cartes visuelles avec photo appétissante, Prix barré (ex: ~~12€~~ **3,50€**) et Badge "-70%".
*   **Info clé** : Distance ("à 300m") et Heure de retrait ("18h-19h").

### Écran 3 : Détail & Réservation
*   **Objectif** : Rassurer et convertir.
*   **Contenu** : Détail du contenu (ex: "Panier Surprise Boulangerie"), Note du commerçant (⭐️ 4.8), Adresse exacte.
*   **CTA** : Gros bouton vert "Réserver - 3,50€" sticky en bas d'écran.

### Écran 4 : Confirmation & QR Code
*   **Objectif** : Preuve d'achat.
*   **Visuel** : Grand QR Code central. Timer dégressif avant l'heure de fin de retrait.
*   **Message** : "Bravo Lucas ! Fonce chez Boulangerie Ange avant 19h."

### Écran 5 : Profil & Impact (Gamification)
*   **Objectif** : Rétention et Fierté.
*   **Stats** : "12 Paniers sauvés", "45€ Économisés", "15kg CO2 évités".
*   **Niveau** : Barre de progression "Éco-Guerrier niveau 3". Badges débloqués.

### Écran 6 : Recherche & Filtres Avancés
*   **Objectif** : Précision.
*   **Filtres** : Slider de distance (1km - 10km), Régime alimentaire (Sans gluten, Vegan), Heure de collecte préférée.
