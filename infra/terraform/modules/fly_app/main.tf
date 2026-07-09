# ──────────────────────────────────────────────────────────────────────
# Module : fly_app
# Crée une application Fly.io via le provider fly-apps/fly
# et alloue des adresses IP publiques (IPv4 + IPv6)
# ──────────────────────────────────────────────────────────────────────

resource "fly_app" "this" {
  name = var.app_name
  org  = var.org_slug
}

resource "fly_ip" "ipv4" {
  app        = fly_app.this.name
  type       = "v4"
  depends_on = [fly_app.this]
}

resource "fly_ip" "ipv6" {
  app        = fly_app.this.name
  type       = "v6"
  depends_on = [fly_app.this]
}
