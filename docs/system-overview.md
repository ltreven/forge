# Forge System Overview

## System Summary

Forge is a framework for packaging and operating OpenClaw-based agents across multiple environments.

The architecture is intentionally staged:
- start with a local Docker-based agent
- grow into customer-configurable Kubernetes deployments
- later add automation for infrastructure provisioning and operational monitoring

## Core Building Blocks

### 1. Agent Runtime
The runtime is an OpenClaw-based agent configured with:
- a specific persona
- operating rules
- memory persistence strategy
- integration access patterns
- approval boundaries

The first runtime target is a **software engineer agent**.

### 2. Container Layer
The agent is packaged into a portable container image.

This layer should define:
- operating system base image
- OpenClaw installation
- required developer tooling
- runtime entrypoint
- mounted paths for workspace, memory, and credentials

### 3. Local Operations Layer
For the MVP, local Docker-based execution is the main operating mode.

This layer should make it easy to:
- run the agent locally
- inject secrets without committing them
- mount persistent state
- test agent behavior safely before any Kubernetes deployment

### 4. Integration Layer
The first integration target is **Linear**.

Over time, the integration model should be generalized so that customer deployments can swap or extend project-management systems, including support for systems such as Jira.

This layer should define:
- ticket ingestion patterns
- approval-aware write behavior
- customer-specific configuration points

### 5. Kubernetes Deployment Layer
After the local MVP, the next target is Kubernetes.

This layer should provide:
- Helm charts for agent deployment
- values-driven customer configuration
- resource sizing based on workload
- scaling and lifecycle controls
- deployment portability across environments

### 6. Infrastructure Provisioning Layer
Terraform is the planned mechanism for provisioning infrastructure where needed.

This layer should eventually provision:
- Kubernetes clusters
- node pools
- identity and access bindings
- secret management dependencies
- network and environment prerequisites

### 7. Future Operations Layer
In the longer term, the system may include Kubernetes operators or similar controllers for:
- health monitoring
- performance monitoring
- team topology management
- autonomous maintenance workflows
- environment-specific policy enforcement

## Initial Workflow

### MVP workflow
1. Build the Forge container image.
2. Inject local configuration and secrets outside Git.
3. Run the OpenClaw-based software engineer agent locally.
4. Provide project context through supported integrations, starting with Linear.
5. Keep external writes approval-gated.
6. Persist state so the agent can be restored.

### Future customer workflow
1. Provision infrastructure with Terraform.
2. Deploy customer-specific agents with Helm.
3. Configure integrations using customer-provided values.
4. Operate the agents through approved workflows.
5. Observe and optimize the deployment over time.

## Configuration Philosophy

Configuration must be:
- explicit
- portable
- customer-specific where needed
- separate from secrets
- suitable for local and cluster-based deployment modes

Examples of customer-specific configuration include:
- project-management backend selection
- backend URLs and credentials
- agent personas and team composition
- approval policies
- environment sizing

## Security Model

Security principles include:
- loopback-only exposure for sensitive interfaces where possible
- explicit approval boundaries for external actions
- no secrets committed to Git
- customer-specific credentials managed outside the repository
- clear separation between operator identity and agent identity
- sensitive execution capabilities should be routed through clearly bounded sandbox environments rather than granted to the main agent runtime by default

## Execution Model Principle

The software engineer agent should have access to realistic engineering tooling, but deeper execution capabilities should be mediated through controlled, auditable sandbox layers.

In practice, that means the architecture should distinguish between:
- the main agent runtime used for reasoning, planning, editing, and coordination
- separate execution environments used for heavier or more sensitive work such as builds, container operations, or broader system interaction

A future implementation may realize those execution environments as separate VMs, isolated containers, or other clearly bounded workers with explicit access rules.

## Architectural Direction

The architecture should evolve from **single-agent local runtime** to **configurable agent deployment framework**.

That means the system is not only about what one agent does. It is about how agents are:
- created
- configured
- deployed
- constrained
- integrated
- operated
- restored
