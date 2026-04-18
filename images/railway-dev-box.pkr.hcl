packer {
  required_plugins {
    docker = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/docker"
    }
  }
}

variable "bundle" { type = string }
variable "mode" { type = string }
variable "channel" { type = string }
variable "version" { type = string }
variable "target" { type = string }

source "docker" "agent_edition" {
  image  = "ubuntu:24.04"
  commit = true
}

build {
  name    = "railway-dev-box"
  sources = ["source.docker.agent_edition"]

  provisioner "file" {
    source      = "scripts/provision-agent-edition-image.sh"
    destination = "/tmp/provision-agent-edition-image.sh"
  }

  provisioner "file" {
    source      = "scripts/bootstrap-agent-edition.sh"
    destination = "/tmp/bootstrap-agent-edition.sh"
  }

  provisioner "file" {
    source      = "scripts/verify-agent-edition.sh"
    destination = "/tmp/verify-agent-edition.sh"
  }

  provisioner "file" {
    source      = "scripts/lib/bootstrap-common.sh"
    destination = "/tmp/bootstrap-common.sh"
  }

  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get install -y sudo curl ca-certificates software-properties-common gnupg lsb-release",
      "mkdir -p /opt/freshcrate/scripts/lib",
      "mv /tmp/provision-agent-edition-image.sh /opt/freshcrate/scripts/provision-agent-edition-image.sh",
      "mv /tmp/bootstrap-agent-edition.sh /opt/freshcrate/scripts/bootstrap-agent-edition.sh",
      "mv /tmp/verify-agent-edition.sh /opt/freshcrate/scripts/verify-agent-edition.sh",
      "mv /tmp/bootstrap-common.sh /opt/freshcrate/scripts/lib/bootstrap-common.sh",
      "chmod +x /opt/freshcrate/scripts/provision-agent-edition-image.sh /opt/freshcrate/scripts/bootstrap-agent-edition.sh /opt/freshcrate/scripts/verify-agent-edition.sh",
      "cd /opt/freshcrate/scripts && FRESHCRATE_HOME=/opt/freshcrate/home WORKSPACE_DIR=/opt/freshcrate/workspace ./provision-agent-edition-image.sh ${var.bundle} ${var.mode} ${var.channel} railway-dev-box",
    ]
  }
}
