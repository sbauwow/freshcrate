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

source "qemu" "agent_edition" {
  accelerator      = "kvm"
  disk_interface   = "virtio"
  format           = "qcow2"
  iso_url          = "https://cloud-images.ubuntu.com/releases/24.04/release/ubuntu-24.04-server-cloudimg-amd64.img"
  iso_checksum     = "none"
  output_directory = "output/vm-qcow2-headless"
  ssh_username     = "ubuntu"
  vm_name          = "freshcrate-${var.bundle}-${var.channel}"
}

build {
  name    = "vm-qcow2-headless"
  sources = ["source.qemu.agent_edition"]

  provisioner "shell" {
    inline = [
      "echo freshcrate-agent-edition > /tmp/freshcrate-release",
      "echo bundle=${var.bundle} mode=${var.mode} channel=${var.channel} version=${var.version}",
    ]
  }
}
