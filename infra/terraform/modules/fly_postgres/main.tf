# ──────────────────────────────────────────────────────────────────────
# Module : fly_postgres
# Crée et configure un cluster Postgres géré par Fly.io
# via local-exec (flyctl) car le provider n'expose pas cette ressource.
# Ce module est IDEMPOTENT : il ignore l'erreur si le cluster existe.
# ──────────────────────────────────────────────────────────────────────

resource "null_resource" "postgres_cluster" {
  # Re-provisionner uniquement si le nom change
  triggers = {
    cluster_name = var.cluster_name
    org_slug     = var.org_slug
    region       = var.region
  }

  provisioner "local-exec" {
    command = <<-EOT
      flyctl postgres create \
        --name "${var.cluster_name}" \
        --org "${var.org_slug}" \
        --region "${var.region}" \
        --initial-cluster-size 1 \
        --vm-size shared-cpu-1x \
        --volume-size ${var.volume_size_gb} \
        2>&1 | tee /tmp/pg_create.log
      # Ignorer l'erreur si le cluster existe déjà
      if grep -q "already exists" /tmp/pg_create.log; then
        echo "INFO: Postgres cluster '${var.cluster_name}' already exists — skipping."
        exit 0
      fi
    EOT
    environment = {
      FLY_API_TOKEN = var.fly_api_token
    }
    interpreter = ["/bin/sh", "-c"]
    on_failure  = continue
  }
}

resource "null_resource" "postgres_attach" {
  depends_on = [null_resource.postgres_cluster]

  triggers = {
    backend_app  = var.backend_app_name
    cluster_name = var.cluster_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      flyctl postgres attach "${var.cluster_name}" \
        --app "${var.backend_app_name}" \
        2>&1 | tee /tmp/pg_attach.log
      if grep -q "already" /tmp/pg_attach.log; then
        echo "INFO: Already attached — skipping."
        exit 0
      fi
    EOT
    environment = {
      FLY_API_TOKEN = var.fly_api_token
    }
    interpreter = ["/bin/sh", "-c"]
    on_failure  = continue
  }
}
