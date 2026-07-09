output "cluster_name" {
  description = "Nom du cluster Postgres créé"
  value       = var.cluster_name
}

output "cluster_hostname" {
  description = "Hostname interne Fly.io du cluster Postgres"
  value       = "${var.cluster_name}.internal"
}

output "connection_string_placeholder" {
  description = "DATABASE_URL est injectée automatiquement par 'fly postgres attach'"
  value       = "postgres://[user]:[password]@${var.cluster_name}.internal:5432/[dbname]"
}
