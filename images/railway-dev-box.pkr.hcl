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

  provisioner "shell" {
    inline = [
      "apt-get update",
      "apt-get install -y curl ca-certificates",
      "echo freshcrate-agent-edition > /tmp/freshcrate-release",
      "echo bundle=${var.bundle} mode=${var.mode} channel=${var.channel} version=${var.version}",
    ]
  }
}
