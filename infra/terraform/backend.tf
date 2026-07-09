terraform {
  # Backend local — le state est stocké dans ce répertoire
  # Pour la production, migrez vers un backend distant (S3, GCS, Terraform Cloud)
  backend "local" {
    path = "terraform.tfstate"
  }
}
