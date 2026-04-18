packer {
  required_plugins {
    amazon = {
      version = ">= 1.3.0"
      source  = "github.com/hashicorp/amazon"
    }
  }
}

variable "bundle" { type = string }
variable "mode" { type = string }
variable "channel" { type = string }
variable "version" { type = string }
variable "target" { type = string }
variable "region" {
  type    = string
  default = "us-east-1"
}

source "amazon-ebs" "agent_edition" {
  region        = var.region
  instance_type = "t3.small"
  ssh_username  = "ubuntu"
  ami_name      = "freshcrate-${var.bundle}-${var.channel}-${var.version}"
  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    owners      = ["099720109477"]
    most_recent = true
  }
}

build {
  name    = "aws-ami-builder"
  sources = ["source.amazon-ebs.agent_edition"]

  provisioner "shell" {
    inline = [
      "echo freshcrate-agent-edition > /tmp/freshcrate-release",
      "echo bundle=${var.bundle} mode=${var.mode} channel=${var.channel} version=${var.version}",
    ]
  }
}
