# edev: Automated AI Developer

This project aims to deploy and manage one or more autonomous AI developers as containers in a Kubernetes cluster using OpenClaw.

## 🎯 Objective
- Learn and implement OpenClaw in production.
- Deploy an autonomous developer within a K8s container.

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
