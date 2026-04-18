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
      "sudo mkdir -p /opt/freshcrate/scripts/lib",
      "sudo mv /tmp/provision-agent-edition-image.sh /opt/freshcrate/scripts/provision-agent-edition-image.sh",
      "sudo mv /tmp/bootstrap-agent-edition.sh /opt/freshcrate/scripts/bootstrap-agent-edition.sh",
      "sudo mv /tmp/verify-agent-edition.sh /opt/freshcrate/scripts/verify-agent-edition.sh",
      "sudo mv /tmp/bootstrap-common.sh /opt/freshcrate/scripts/lib/bootstrap-common.sh",
      "sudo chmod +x /opt/freshcrate/scripts/provision-agent-edition-image.sh /opt/freshcrate/scripts/bootstrap-agent-edition.sh /opt/freshcrate/scripts/verify-agent-edition.sh",
      "cd /opt/freshcrate/scripts && sudo FRESHCRATE_HOME=/opt/freshcrate/home WORKSPACE_DIR=/opt/freshcrate/workspace ./provision-agent-edition-image.sh ${var.bundle} ${var.mode} ${var.channel} aws-ami-builder",
    ]
  }
}
