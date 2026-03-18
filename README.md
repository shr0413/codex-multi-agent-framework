# Codex Multi-Agent Framework

Controlled execution framework for Codex-style coding agents.

Build agent workflows as explicit gates, disk-backed state, and independent verification instead of fragile long-context prompt loops.

Docs:

- [Framework Overview](docs/framework-overview.md)
- [Process Layer](docs/process-layer.md)
- [State Layer](docs/state-layer.md)
- [Execution Layer](docs/execution-layer.md)
- [Evaluation and Stopping](docs/evaluation-and-stopping.md)

## Why This Project

Most agent demos show multiple workers talking to each other. That is not the hard part in production. The hard part is keeping execution controlled, resumable, and verifiable.

This framework focuses on that control plane:

- process gates instead of free-form agent loops
- persistent run state instead of volatile chat memory
- fresh verification before completion
- explicit stop logic for autonomous optimization

## Features

- `Design Gate`, `Planning Gate`, `Debugging Gate`, and `Verification Gate`
- disk-backed run bundles with state, events, evidence, and working summary
- execution runtime with orchestrator, router, worker pool, verifier, and watcher
- resumable runs through task snapshots and persisted run state
- two execution modes:
  - normal mode
  - autonomous optimization mode

## Quick Start

Requirements:

- Node.js `>=22`

Run the included normal-mode example:

```bash
node src/cli.mjs run examples/tasks/normal-mode-demo.json
```

Run the autonomous-optimization example:

```bash
node src/cli.mjs run examples/tasks/autonomous-mode-demo.json
```

Run the test suite:

```bash
node tests/framework.test.mjs
```

Framework state is written to:

```text
.codex-framework/
```

## CLI

Run a task file:

```bash
node src/cli.mjs run path/to/task.json --project-root path/to/project
```

Resume a previous run:

```bash
node src/cli.mjs resume <run-id> --project-root path/to/project
```

Inspect a stored run:

```bash
node src/cli.mjs show-run <run-id> --project-root path/to/project
```

Included task examples:

- `examples/tasks/normal-mode-demo.json`
- `examples/tasks/autonomous-mode-demo.json`

## How It Works

```text
Task Ingress
    |
    v
Process Layer
    |
    v
State Layer
    |
    v
Execution Layer
    |
    v
Domain Skill Layer
```

The design priority is simple:

> solve process control and state boundaries first, then add richer workers and domain skills

## Task Model

The framework consumes JSON task files.

Normal mode requires:

- task identity and title
- task kind
- complexity metadata
- a runnable plan
- verification rules

Autonomous optimization mode additionally requires:

- metric definition
- evaluation procedure
- mutable file set
- explicit iteration list
- at least one `improvement` phase
- at least one `refinement` phase

## What This Project Is

This project is a small framework for enforcing a controlled execution chain:

1. classify the task
2. pass the right gates
3. execute through explicit workers
4. verify with fresh evidence
5. stop through system rules, not agent self-discipline

It is not a "many agents chatting" demo and not a clone of a research multi-agent runtime.

## Repository Layout

```text
src/
  cli.mjs
  index.mjs
  process/
  state/
  execution/
  shared/
docs/
examples/
tests/
framework.config.json
```

## Current Scope

Intentional v1 constraints:

- local single-process control plane
- built-in worker types only: `note`, `write_file`, `append_file`, `shell`
- no distributed runtime
- no skill marketplace
- no automatic strategy search beyond explicit autonomous iterations

Implemented in v1:

- `Process Layer`
  - `Design Gate`
  - `Planning Gate`
  - `Debugging Gate`
  - `Verification Gate`
- `State Layer`
  - run state
  - project memory
  - evidence log
  - working summary
- `Execution Layer`
  - orchestrator
  - router
  - worker pool
  - verifier
  - watcher

## Roadmap

Next likely steps:

1. fresh-context worker abstraction
2. richer worker and planner DSL
3. stronger resume semantics
4. remote or distributed execution
5. observability and policy layers

## Non-Goals For V1

- fully decentralized agent topology
- latent or KV-style agent communication
- benchmark platform
- social simulation of agents
- uncontrolled autonomous loops

## Development Notes

- framework docs stay in version control
- local checkpoint files are private workflow artifacts and are intentionally excluded from GitHub-facing repository contents
