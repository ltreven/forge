# Persistence Requirements

This document explains the persistence model expected for deployed eDEV instances.

## Principle

An eDEV instance should be portable across environments while preserving enough state to remain operationally useful.

## Required persistence concerns

### 1. Runtime workspace persistence
The runtime needs a persistent workspace path so local files, working state, and operational context are not lost on restart.

### 2. Internal state persistence
Important internal files such as memory and agent-specific context should survive pod rescheduling or recreation.

### 3. Mirrored state repository
Each deployed eDEV instance should have a defined strategy for mirroring important internal state into a Git repository or another durable versioned store.

That mirrored repository should not contain secrets.

### 4. Secret separation
Secrets must remain outside Git and should be delivered through cluster secret-management mechanisms.

## Why this matters

A deployable agent without a persistence strategy is harder to restore, migrate, and reason about.

If eDEV is expected to run in ephemeral environments, spot instances, or replaceable pods, then state handling must be part of the deployment design.

## Current chart baseline

The first Helm chart includes a PersistentVolumeClaim for runtime state.

This is only the baseline. A full production strategy may later include:
- remote Git mirroring
- snapshots or backups
- object storage or other durable stores
- clearer per-profile persistence rules
