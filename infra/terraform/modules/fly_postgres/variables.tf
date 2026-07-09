variable "cluster_name" {
  description = "Nom du cluster Postgres Fly.io"
  type        = string
}

variable "org_slug" {
  description = "Slug de l'organisation Fly.io"
  type        = string
}

variable "region" {
  description = "Région Fly.io pour le cluster (ex: cdg = Paris)"
  type        = string
  default     = "cdg"
}

variable "volume_size_gb" {
  description = "Taille du volume de données en Go"
  type        = number
  default     = 1
}

variable "backend_app_name" {
  description = "Nom de l'app backend à attacher à ce cluster Postgres"
  type        = string
}

variable "fly_api_token" {
  description = "Token d'API Fly.io pour flyctl"
  type        = string
  sensitive   = true
}
