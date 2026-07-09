output "backend_url" {
  description = "URL publique de l'API backend"
  value       = "https://${module.backend_app.app_hostname}"
}

output "frontend_url" {
  description = "URL publique du frontend"
  value       = "https://${module.frontend_app.app_hostname}"
}

output "api_docs_url" {
  description = "URL de la documentation interactive FastAPI (Swagger)"
  value       = "https://${module.backend_app.app_hostname}/docs"
}

output "backend_ipv4" {
  description = "Adresse IPv4 du backend"
  value       = module.backend_app.ipv4_address
}

output "frontend_ipv4" {
  description = "Adresse IPv4 du frontend"
  value       = module.frontend_app.ipv4_address
}

output "postgres_hostname" {
  description = "Hostname interne Fly.io du cluster Postgres"
  value       = module.postgres.cluster_hostname
}

output "deployment_summary" {
  description = "Résumé du déploiement"
  value = {
    backend_app  = module.backend_app.app_name
    frontend_app = module.frontend_app.app_name
    postgres     = module.postgres.cluster_name
    region       = var.region
  }
}
