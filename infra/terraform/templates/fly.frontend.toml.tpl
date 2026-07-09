# fly.frontend.toml — Généré par Terraform (infra/terraform/main.tf)
# NE PAS MODIFIER MANUELLEMENT — Modifiez le template et relancez terraform apply
app            = "${app_name}"
primary_region = "${region}"

[build]
  dockerfile = "frontend/Dockerfile"

[env]
  VITE_API_URL = "https://${backend_name}.fly.dev"

[http_service]
  internal_port       = 80
  force_https         = true
  auto_stop_machines  = true
  auto_start_machines = true
  min_machines_running = 1
  processes            = ["app"]

  [http_service.concurrency]
    type       = "requests"
    hard_limit = 200
    soft_limit = 150

[[vm]]
  memory   = "256mb"
  cpu_kind = "shared"
  cpus     = 1

[checks]
  [checks.http]
    grace_period = "5s"
    interval     = "30s"
    method       = "GET"
    path         = "/"
    port         = 80
    timeout      = "5s"
    type         = "http"
