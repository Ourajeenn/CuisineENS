# fly.backend.toml — Généré par Terraform (infra/terraform/main.tf)
# NE PAS MODIFIER MANUELLEMENT — Modifiez le template et relancez terraform apply
app            = "${app_name}"
primary_region = "${region}"

[build]
  # L'image est passée via --image dans flyctl deploy
  # Ce champ est utilisé comme fallback si aucune image n'est spécifiée
  dockerfile = "backend/Dockerfile"

[env]
  PORT        = "8000"
  ENVIRONMENT = "production"
  ALLOWED_ORIGINS = "${allowed_origins}"

[http_service]
  internal_port       = 8000
  force_https         = true
  auto_stop_machines  = true
  auto_start_machines = true
  min_machines_running = 1
  processes            = ["app"]

  [http_service.concurrency]
    type       = "connections"
    hard_limit = 100
    soft_limit = 80

[[vm]]
  memory   = "512mb"
  cpu_kind = "shared"
  cpus     = 1

[checks]
  [checks.health]
    grace_period = "10s"
    interval     = "30s"
    method       = "GET"
    path         = "/health"
    port         = 8000
    timeout      = "10s"
    type         = "http"

  [checks.api_ready]
    grace_period = "15s"
    interval     = "60s"
    method       = "GET"
    path         = "/api/v1/meals"
    port         = 8000
    timeout      = "15s"
    type         = "http"
