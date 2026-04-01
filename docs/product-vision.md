# eDEV Product Vision

## Overview

**eDEV** is a deployment framework for running specialized OpenClaw-based autonomous agents in repeatable, controllable environments.

The long-term vision is to let a consultant or operator deploy agent teams into customer environments using standardized infrastructure, configuration, and operational workflows.

In the near term, eDEV is a personal laboratory for designing, validating, and hardening that model.

## Core Idea

The product is not a hosted SaaS.

Instead, eDEV is a **deployable agent platform** that can be installed into environments controlled by the operator or by the customer. The system should make it easy to provision infrastructure, deploy OpenClaw-based agents, configure customer-specific integrations, and operate those agents safely.

## Who It Is For

### Current user
- Lourenço, acting as the initial operator, architect, and consultant

### Future users
- consultants deploying agent systems for clients
- technical operators responsible for customer-specific agent environments
- engineering organizations that want dedicated autonomous software agents inside their own infrastructure boundaries

## Problem Statement

Organizations interested in AI agents often run into the same problems:

- deployments are ad hoc and difficult to reproduce
- agents are not packaged as operational infrastructure
- environment-specific integrations are hard to configure cleanly
- cost and capacity are not managed systematically
- human approval boundaries are unclear
- project management integrations are inconsistent

There is a gap between a useful local AI agent and a deployable, client-ready agent system.

## Value Proposition

eDEV provides a structured path from local experimentation to production-grade agent deployment.

It aims to offer:
- repeatable deployment patterns
- infrastructure automation
- configurable agent personas
- integration with project management tools such as Linear, with room for Jira and other systems later
- strong human approval boundaries
- portability across local, containerized, and Kubernetes-based environments

## Strategic Positioning

eDEV should be understood as an **agent deployment and operations framework**, not just a single AI developer container.

Its differentiation comes from treating agents as operational units that can be:
- provisioned
- configured
- scaled
- monitored
- replaced
- assigned to customer-specific workflows

## Product Principles

1. **Deployment first**
   - Agents must be easy to package, launch, and re-create.

2. **Human approval remains central**
   - Agents may assist aggressively, but they should not act externally without explicit approval where required.

3. **Portable by design**
   - The same agent model should work locally, in Docker, and later in Kubernetes.

4. **Customer-specific configuration**
   - Integrations and policy should be driven by environment-specific configuration, not hardcoded assumptions.

5. **Infrastructure as product surface**
   - Terraform, Helm, scripts, and future operators are first-class parts of the product.

6. **Capability with governance**
   - Real engineering tools matter, but sensitive execution capability should be mediated through clearly bounded environments instead of being granted directly by default.

## Product Direction

### Near term
- create a local Docker-based software engineer agent
- define the baseline project structure
- establish configuration patterns for project-management integration
- document workflow, operating model, and approval expectations

### Mid term
- package the system for Kubernetes deployment
- introduce Helm-based customer configuration
- support multiple agent roles and team topologies
- improve observability and operational controls

### Long term
- provision infrastructure automatically with Terraform
- add deeper multi-customer deployment patterns
- add Kubernetes operators for monitoring, health management, and team performance insights
- support multiple ticketing backends such as Linear and Jira

## What eDEV Is Not

At least for now, eDEV is not:
- a generic chatbot product
- a hosted multi-tenant SaaS
- a replacement for human engineering leadership
- an autonomous system allowed to perform unrestricted external actions

## Initial Product Shape

The first concrete deliverable is a containerized OpenClaw-based software engineer agent that:
- can run locally
- can be configured for project management integration
- behaves conservatively around external actions
- is ready to evolve into a Kubernetes-deployed agent model
