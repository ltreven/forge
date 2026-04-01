# eDEV MVP Scope

## MVP Goal

The MVP is a **portable software engineer agent image** built on OpenClaw.

It should run locally in Docker first, while being designed in a way that supports future deployment to Kubernetes with minimal conceptual rework.

## MVP Outcome

At the end of the MVP, the project should provide a working baseline for:
- building a container image that runs an OpenClaw-based software engineer agent
- configuring that agent with a clear engineering persona and approval policy
- connecting the agent to a project management system, starting with Linear
- operating the agent locally as a reproducible environment
- documenting how this local deployment evolves into Helm and Terraform-based infrastructure later

## In Scope

### Agent runtime
- a containerized OpenClaw runtime
- a software engineer persona for the agent
- persisted state and memory strategy
- approval-aware operating behavior

### Local deployment
- Dockerfile for local execution
- optional docker-compose setup for local orchestration
- local configuration conventions
- local credential injection strategy outside Git

### Project management integration
- Linear as the first supported system
- ability to read assigned work and use ticket context as work input
- clear separation between local automation and approval-gated external actions

### Documentation
- product vision
- MVP scope
- system overview
- setup and operating instructions for local development

## Out of Scope

The following items are explicitly out of scope for the first MVP:
- multi-agent swarm coordination in production
- Kubernetes production deployment
- Helm-based customer packaging as a complete production artifact
- Terraform-managed cloud infrastructure as a complete production artifact
- Jira support
- Kubernetes operators
- advanced observability stack
- automatic unattended external changes across customer systems

## Design Constraints

The MVP must still be designed to make future expansion easier.

That means:
- config should be environment-driven
- customer-specific integrations should not be hardcoded
- state should be portable
- infra assumptions should be explicit
- deployment steps should be reproducible

## MVP User Story

A technical operator should be able to:
1. build the eDEV Docker image
2. provide local configuration and credentials out of band
3. start the agent locally
4. connect the agent to project-management context
5. use the agent as a cautious software engineer assistant
6. preserve and restore the agent's state

## Success Criteria

The MVP is successful when all of the following are true:
- the agent runs reliably in Docker on a local machine
- the agent has a clear software engineer identity and workflow
- the agent can consume Linear-based task context
- the agent respects approval boundaries for external actions
- the repository contains enough documentation for another engineer to understand the direction and run the system locally

## Follow-On Milestones

### Milestone 2
- package the runtime for Kubernetes deployment
- introduce Helm values for customer-specific settings
- formalize secrets and configuration injection for cluster environments

### Milestone 3
- add Terraform modules for infrastructure provisioning
- support repeatable client environment setup
- establish deployment workflows for real customer environments

### Milestone 4
- add more agent personas
- introduce team-level coordination patterns
- build operators and monitoring components
