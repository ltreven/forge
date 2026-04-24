# Kubernetes Deployment

This document explains the Kubernetes deployment model for Forge.

## Goal

Package Forge so it can be deployed into a generic Kubernetes cluster using Helm.

The architecture separates the platform into two primary planes for security and management:
- **Control Plane (`forge-admin` namespace):** Manages users, workspaces, and global metadata.
- **Application Plane (`forge` namespace):** Manages teams, agents, and day-to-day operations.

## Helm Chart

The platform is packaged as a single Helm chart located at:
```
charts/forge/
```

## Basic deployment flow

1. Prepare a Kubernetes cluster.
2. Review and override `values.yaml` for your environment (e.g., `values-uat.yaml`, `values-prod.yaml`).
3. Install with Helm.

```bash
# Example: Install everything
helm upgrade --install forge ./charts/forge \
  --namespace forge \
  --create-namespace \
  -f ./charts/forge/values-prod.yaml
```

*Note: The chart automatically creates the `forge-admin` and `forge` namespaces if configured.*

## Multi-Namespace Architecture

When deployed, Forge uses several namespaces to isolate different components:

| Namespace | Components | Plane |
|---|---|---|
| `forge-admin` | `admin-api`, `admin-web` | Control Plane |
| `forge` | `api`, `forge-web`, `controller`, `postgresql`, `rabbitmq` | Application Plane |
| `forge-ws-*` | Isolated namespaces for each customer's agent teams | Execution Cell |

## Component Overview

- **`admin-api`:** Control Plane logic, user authentication, and workspace management.
- **`api`:** Application Plane logic, team management, and agent coordination.
- **`web`:** The SaaS frontend (Next.js).
- **`controller`:** Kubernetes Controller that manages ForgeAgent CRDs and provisions workspace namespaces.
- **`postgresql`:** Shared database instance (contains `forge` and `forge_admin` databases).
- **`rabbitmq`:** Message bus for agent communication.

## Persistent Storage

Persistence is managed via:
- **PostgreSQL StatefulSet:** Persistent Volume Claims (PVCs) for database state.
- **RabbitMQ StatefulSet:** PVCs for message queues and metadata.
- **Agent Pods:** Each agent pod gets a dedicated PVC for its local workspace and memory state (managed by the controller).

## Troubleshooting

```bash
# Check status in both namespaces
kubectl get pods -n forge
kubectl get pods -n forge-admin

# Check the controller logs if agents aren't provisioning
kubectl logs -n forge deployment/forge-controller
```
