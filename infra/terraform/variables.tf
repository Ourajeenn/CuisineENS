# ──────────────────────────────────────────────────────────────────────────────
# Variables — CuisineEnsemble Infrastructure (Fly.io)
# Copiez terraform.tfvars.example → terraform.tfvars et remplissez les valeurs.
# NE COMMITEZ JAMAIS terraform.tfvars (il est dans .gitignore).
# ──────────────────────────────────────────────────────────────────────────────

# ── Authentification Fly.io ───────────────────────────────────────────────────
variable "fly_api_token" {
  description = "Token d'API Fly.io. Obtenez-le avec : flyctl auth token"
  type        = string
  sensitive   = true
}

# ── Organisation ──────────────────────────────────────────────────────────────
variable "fly_org_slug" {
  description = "Slug de votre organisation Fly.io (ex: 'personal' ou 'mon-org')"
  type        = string
  default     = "personal"
}

# ── Région ───────────────────────────────────────────────────────────────────
variable "region" {
  description = "Région Fly.io principale (cdg = Paris, ams = Amsterdam, fra = Francfort)"
  type        = string
  default     = "cdg"
}

# ── Noms des applications ─────────────────────────────────────────────────────
variable "backend_app_name" {
  description = "Nom unique de l'app backend sur Fly.io (doit être globalement unique)"
  type        = string
  default     = "cuisine-ensemble-api"
}

variable "frontend_app_name" {
  description = "Nom unique de l'app frontend sur Fly.io (doit être globalement unique)"
  type        = string
  default     = "cuisine-ensemble-web"
}

# ── Base de données ───────────────────────────────────────────────────────────
variable "postgres_cluster_name" {
  description = "Nom du cluster Postgres Fly.io"
  type        = string
  default     = "cuisine-ensemble-db"
}

variable "postgres_volume_size_gb" {
  description = "Taille du volume de données Postgres en Go (minimum 1)"
  type        = number
  default     = 1
}

# ── Images Docker (GHCR ou DockerHub) ────────────────────────────────────────
variable "backend_image" {
  description = "Image Docker complète pour le backend (ex: ghcr.io/user/cuisine-ensemble-backend:latest)"
  type        = string
  default     = "ghcr.io/ourajeenn/cuisine-ensemble-backend:latest"
}

variable "frontend_image" {
  description = "Image Docker complète pour le frontend (ex: ghcr.io/user/cuisine-ensemble-frontend:latest)"
  type        = string
  default     = "ghcr.io/ourajeenn/cuisine-ensemble-frontend:latest"
}

# ── Secrets applicatifs ───────────────────────────────────────────────────────
variable "secret_key" {
  description = "Clé secrète JWT pour FastAPI (minimum 32 caractères aléatoires)"
  type        = string
  sensitive   = true
}

variable "allowed_origins" {
  description = "Origines CORS autorisées (séparées par des virgules)"
  type        = string
  default     = "https://cuisine-ensemble-web.fly.dev"
}
