# ══════════════════════════════════════════════════════════════════════════════
# CuisineEnsemble — Infrastructure as Code
# Provider : fly-apps/fly (community) + null_resource (local-exec flyctl)
# Platform : Fly.io
# ══════════════════════════════════════════════════════════════════════════════

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    # Provider communautaire Fly.io (le seul disponible)
    # Source : https://registry.terraform.io/providers/fly-apps/fly/latest
    fly = {
      source  = "fly-apps/fly"
      version = "~> 0.0.23"
    }
    # Pour générer les fichiers fly.toml via templatefile()
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
    # Pour null_resource (flyctl local-exec)
    null = {
      source  = "hashicorp/null"
      version = "~> 3.2"
    }
  }
}

# ── Configuration du provider Fly.io ─────────────────────────────────────────
provider "fly" {
  # Le token peut aussi être passé via la variable d'env FLY_API_TOKEN
  fly_api_token = var.fly_api_token
}

# ══════════════════════════════════════════════════════════════════════════════
# APPLICATIONS FLY.IO
# ══════════════════════════════════════════════════════════════════════════════

# ── Backend FastAPI ───────────────────────────────────────────────────────────
module "backend_app" {
  source = "./modules/fly_app"

  app_name = var.backend_app_name
  org_slug = var.fly_org_slug
}

# ── Frontend React/Nginx ──────────────────────────────────────────────────────
module "frontend_app" {
  source = "./modules/fly_app"

  app_name = var.frontend_app_name
  org_slug = var.fly_org_slug
}

# ══════════════════════════════════════════════════════════════════════════════
# BASE DE DONNÉES POSTGRES
# ══════════════════════════════════════════════════════════════════════════════

module "postgres" {
  source = "./modules/fly_postgres"

  cluster_name     = var.postgres_cluster_name
  org_slug         = var.fly_org_slug
  region           = var.region
  volume_size_gb   = var.postgres_volume_size_gb
  backend_app_name = module.backend_app.app_name
  fly_api_token    = var.fly_api_token

  depends_on = [module.backend_app]
}

# ══════════════════════════════════════════════════════════════════════════════
# SECRETS APPLICATIFS
# Injectés dans l'app backend via flyctl secrets set
# ══════════════════════════════════════════════════════════════════════════════

resource "null_resource" "backend_secrets" {
  depends_on = [module.backend_app]

  # Re-déployer si l'un des secrets change
  triggers = {
    secret_key      = sha256(var.secret_key)
    allowed_origins = var.allowed_origins
    app_name        = module.backend_app.app_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      flyctl secrets set \
        SECRET_KEY="${var.secret_key}" \
        ALLOWED_ORIGINS="${var.allowed_origins}" \
        ENVIRONMENT="production" \
        --app "${module.backend_app.app_name}"
      echo "✅ Secrets injectés dans ${module.backend_app.app_name}"
    EOT
    environment = {
      FLY_API_TOKEN = var.fly_api_token
    }
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DES FICHIERS fly.toml
# Générés à partir de templates HCL et sauvegardés à la racine du projet
# ══════════════════════════════════════════════════════════════════════════════

resource "local_file" "backend_fly_toml" {
  filename = "${path.module}/../../fly.backend.toml"
  content  = templatefile("${path.module}/templates/fly.backend.toml.tpl", {
    app_name        = module.backend_app.app_name
    region          = var.region
    allowed_origins = var.allowed_origins
  })

  depends_on = [module.backend_app]
}

resource "local_file" "frontend_fly_toml" {
  filename = "${path.module}/../../fly.frontend.toml"
  content  = templatefile("${path.module}/templates/fly.frontend.toml.tpl", {
    app_name     = module.frontend_app.app_name
    backend_name = module.backend_app.app_name
    region       = var.region
  })

  depends_on = [module.frontend_app]
}

# ══════════════════════════════════════════════════════════════════════════════
# DÉPLOIEMENT DES IMAGES DOCKER
# Déclenché uniquement quand les images changent
# ══════════════════════════════════════════════════════════════════════════════

resource "null_resource" "deploy_backend" {
  depends_on = [
    module.backend_app,
    module.postgres,
    null_resource.backend_secrets,
    local_file.backend_fly_toml,
  ]

  triggers = {
    image    = var.backend_image
    app_name = module.backend_app.app_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "🚀 Déploiement du backend : ${var.backend_image}"
      flyctl deploy \
        --app "${module.backend_app.app_name}" \
        --image "${var.backend_image}" \
        --config "${path.module}/../../fly.backend.toml" \
        --remote-only
      echo "✅ Backend déployé avec succès"
    EOT
    environment = {
      FLY_API_TOKEN = var.fly_api_token
    }
  }
}

resource "null_resource" "deploy_frontend" {
  depends_on = [
    module.frontend_app,
    local_file.frontend_fly_toml,
    null_resource.deploy_backend,
  ]

  triggers = {
    image    = var.frontend_image
    app_name = module.frontend_app.app_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      echo "🚀 Déploiement du frontend : ${var.frontend_image}"
      flyctl deploy \
        --app "${module.frontend_app.app_name}" \
        --image "${var.frontend_image}" \
        --config "${path.module}/../../fly.frontend.toml" \
        --remote-only
      echo "✅ Frontend déployé avec succès"
    EOT
    environment = {
      FLY_API_TOKEN = var.fly_api_token
    }
  }
}
