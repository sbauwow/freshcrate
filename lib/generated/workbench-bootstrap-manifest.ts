export const BOOTSTRAP_MANIFEST = {
  "solo-builder-core": {
    "packages": [
      "git",
      "zsh",
      "tmux",
      "curl",
      "jq",
      "ripgrep",
      "fd-find",
      "sqlite3",
      "python3",
      "python3-venv",
      "python3-pip",
      "nodejs",
      "npm",
      "gh"
    ],
    "services": [
      "docker"
    ]
  },
  "research-node": {
    "packages": [
      "git",
      "zsh",
      "tmux",
      "curl",
      "jq",
      "ripgrep",
      "fd-find",
      "sqlite3",
      "python3",
      "python3-venv",
      "python3-pip",
      "nodejs",
      "npm",
      "gh"
    ],
    "services": [
      "docker"
    ]
  },
  "local-model-box": {
    "packages": [
      "git",
      "zsh",
      "tmux",
      "curl",
      "jq",
      "ripgrep",
      "fd-find",
      "sqlite3",
      "python3",
      "python3-venv",
      "python3-pip",
      "nodejs",
      "npm",
      "gh"
    ],
    "services": [
      "docker"
    ]
  }
} as const;
