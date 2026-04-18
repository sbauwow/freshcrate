packer {
  required_plugins {
    qemu = {
      version = ">= 1.1.0"
      source  = "github.com/hashicorp/qemu"
    }
  }
}

variable "bundle" { type = string }
variable "mode" { type = string }
variable "channel" { type = string }
variable "version" { type = string }
variable "target" { type = string }
variable "accelerator" {
  type    = string
  default = "none"
}

source "qemu" "agent_edition" {
  accelerator      = var.accelerator
  cd_files         = ["images/cloud-init/vm-qcow2-headless/meta-data", "images/cloud-init/vm-qcow2-headless/user-data"]
  cd_label         = "cidata"
  disk_image       = true
  headless         = true
  disk_interface   = "virtio"
  format           = "qcow2"
  iso_url          = "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"
  iso_checksum     = "none"
  output_directory = "output/vm-qcow2-headless"
  ssh_username     = "ubuntu"
  ssh_password     = "freshcrate"
  ssh_timeout      = "20m"
  vm_name          = "freshcrate-${var.bundle}-${var.channel}"
}

build {
  name    = "vm-qcow2-headless"
  sources = ["source.qemu.agent_edition"]

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
      "cd /opt/freshcrate/scripts && sudo FRESHCRATE_HOME=/opt/freshcrate/home WORKSPACE_DIR=/opt/freshcrate/workspace ./provision-agent-edition-image.sh ${var.bundle} ${var.mode} ${var.channel} vm-qcow2-headless",
    ]
  }
}
