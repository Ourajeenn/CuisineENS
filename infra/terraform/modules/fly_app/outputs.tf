output "app_name" {
  description = "Nom de l'application Fly.io créée"
  value       = fly_app.this.name
}

output "app_hostname" {
  description = "Hostname public de l'application (.fly.dev)"
  value       = "${fly_app.this.name}.fly.dev"
}

output "ipv4_address" {
  description = "Adresse IPv4 publique allouée"
  value       = fly_ip.ipv4.address
}

output "ipv6_address" {
  description = "Adresse IPv6 publique allouée"
  value       = fly_ip.ipv6.address
}
