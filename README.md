# edev: Automated AI Developer

This project aims to deploy and manage one or more autonomous AI developers as containers in a Kubernetes cluster using OpenClaw.

## 🎯 Objective
- Learn and implement OpenClaw in production.
- Deploy an autonomous developer within a K8s container.

## 📁 Project Structure

```text
.
├── .github/                # Pipelines (GitHub Actions Workflows)
│   └── workflows/          # CI/CD for Docker, Terraform, and Helm
├── infra/                  # Infrastructure as Code (IaC)
│   ├── terraform/
│   │   ├── aws/            # AWS Resources (EC2, VPC, EKS/K3s)
│   │   ├── gcp/            # GCP Resources (for comparison)
│   │   └── modules/        # Reusable modules
├── k8s/                    # Kubernetes Orchestration
│   ├── helm/               # Custom Helm Chart for eDev
│   │   └── edev-agent/     # Deployment templates, PVC, ConfigMap
│   └── overlays/           # Environment-specific differences (dev/prod)
├── src/                    # Source Code and Scripts
│   ├── agent/              # OpenClaw configurations and prompts
│   ├── mcp/                # Custom MCP servers (Linear, etc.)
│   └── telegram/           # Telegram bot webhook and handlers
├── build/                  # Build Artifacts
│   └── docker/
│       ├── Dockerfile      # Base eDev image
│       └── scripts/        # Entrypoint and bootstrap scripts
├── tests/                  # Unit and Integration Tests
│   ├── e2e/                # End-to-end agent workflow tests
│   └── unit/               # Internal script tests
├── docs/                   # Technical documentation and ADRs
├── .env.example            # Environment variables template
├── Makefile                # Shortcuts for common commands (make up, make deploy)
└── README.md               # Project overview and documentation
```

## 🛠 Installation
The agent container must include:
- **OpenClaw**: The agent's core.
- **Git**: For version control and memory persistence.
- **Development Stack**: Node.js, React, and necessary tools.
- **MCP (Model Context Protocol)**: Linear integration for ticket management.

## 🔑 Granting Access
- **Telegram**: Main interface for the developer to receive commands and send status updates.
- **SSH**: For direct container access and management.

## 🛡 Security (Hardening)
Following best practices for OpenClaw in cloud environments (AWS/K8s):
- **Loopback Bind**: The OpenClaw gateway must be configured for `bind: "loopback"`. **Never** expose `0.0.0.0` directly.
- **Authentication**: Use strong access tokens and pairing policies.
- **Secure Access**: Always access the OpenClaw web interface (port 18789) via an SSH tunnel or VPN (Tailscale). **Never** open this port in the Security Group/Firewall.
- **Least Privilege**: Run OpenClaw with a non-privileged user and enable the Docker sandbox.

## 🧠 Skills and Knowledge
The autonomous developer is prepared to:
1. **Ticket Management**: Read Linear tickets to start work units.
2. **Product Context**: Understand code, architecture, design principles, and customer problems.
3. **Definition of Ready (DoR)**: Question incomplete tickets (lacking acceptance criteria or clear descriptions).
4. **Tech Planning**: Produce technical documentation before starting any code.
5. **Approval**: Request approval for technical planning (back and forth).
6. **Execution**: Code, test, and submit Pull Requests.

## 💾 Memory
- **Git Persistence**: All state and "memory" of the developer are stored in Git. This allows the agent to be rebuilt from scratch in any environment while maintaining its historical context.
