# Engineering Guide

This document defines how code should be designed and written in this repository, for both humans and AI coding agents.

The goals are:

- Code that is easy to read, reason about, and maintain.
- Minimal, non-bloated designs that solve the current problem cleanly.
- Business logic that is kept simple and localized instead of over-generalized.

---

## 1. Workflow and artifacts

### 1.1 When to create an implementation plan

Use an implementation plan for any non-trivial work:

- Refactors that touch multiple files or core abstractions.
- New features, flows, or behavior changes that are more than a small tweak.
- Changes where rollback would be painful or risky.

For these cases, before coding:

1. Read the existing code, docs, and this guide.
2. Create or update `IMPLEMENTATION_PLAN.md` at the project root, with:
   - Current state summary.
   - Objective for this change.
   - Proposed design (at a clear, concrete level).
   - Migration steps, risks, and open questions.
3. Only start coding once the plan is coherent end to end.

Small, obvious changes (e.g., typo fixes, log message adjustments, tiny guard clauses, or very local bug fixes) do not need a full implementation plan, but should still follow the style and principles in this guide.

### 1.2 Small, focused changes

When implementing:

- Prefer small, vertical slices that deliver a complete behavior end to end.
- Avoid large cross-cutting refactors unless explicitly requested.
- Keep each change scoped to a few files and concepts.

---

## 2. Core principles

### 2.1 Clarity over cleverness

- Write code that is obvious to a competent engineer on first read.
- Use explicit, descriptive names for variables, functions, methods, and modules.
- Keep control flow straightforward. Prefer clear conditionals and loops over clever tricks.
- Avoid code golf and dense one-liners unless explicitly requested.

### 2.2 Minimal necessary abstraction

Business requirements tend to branch and diverge over time, not converge. Over-generalizing business logic early often creates hard-to-change abstractions and tangled flows.

In this codebase:

- Do not build generic business frameworks “just in case”.
- Model each concrete flow explicitly (for example, each signup or scraping flow) before trying to unify them.
- Accept some duplication in business logic. Duplication is preferable to a wrong abstraction.
- Only factor out common business code after there are at least two or three real, stable, similar cases.

Shared abstractions are welcome only when they are stable and infrastructure-oriented, for example:

- HTTP clients and request helpers.
- File, storage, or database utilities.
- Logging, configuration, and environment handling.
- Domain-independent helpers (parsing, formatting, small utilities).

### 2.3 Vertical slices over horizontal reuse

When adding features:

- Treat each user or system flow as a vertical slice that goes from input to output.
- Keep the code for a single flow close together and easy to follow.
- Avoid large “god” services or controllers that try to handle many different flows through flags and conditionals.
- Prefer a new small function or class for a new flow over pushing more branches into an existing generic handler.

### 2.4 Small, cohesive modules

- Classes and modules should have a focused responsibility that can be described in one sentence.
- It is better to have a few small, clearly named classes than one over-abstracted framework.
- Public APIs should be small and intentional. Avoid large classes with many loosely related methods.

Examples of good separation:

- One module for file and state management.
- One module focused on a specific external integration or flow.
- One top-level orchestrator that wires modules together at the edges (CLI, HTTP handlers, jobs).

### 2.5 Comments and documentation

- Use comments to explain “why”, not “what”, when the why is not obvious from the code.
- Prefer improving names and structure over adding comments to explain confusing code.
- Keep `README.md` and `IMPLEMENTATION_PLAN.md` updated when architecture or behavior changes in significant ways.

---

## 3. Guidance for AI coding agents

When you generate or modify code in this project:

1. **Read first**
   - Read this guide, `IMPLEMENTATION_PLAN.md`, and the relevant modules before writing new code.
   - Align with existing patterns and naming instead of inventing new ones.

2. **Plan briefly before coding**
   - Summarize the change you will implement in a few steps.
   - Make sure those steps match the current implementation plan. If they do not, update the plan first.

3. **Prefer direct solutions**
   - Solve the concrete problem in front of you with the smallest reasonable change.
   - Do not introduce new layers of abstraction, wrappers, decorators, or indirection unless they clearly reduce complexity for the current use case.

4. **Avoid common forms of “AI code slop”**
   - Do not:
     - Create generic “manager” or “service” classes with vague names and mixed responsibilities.
     - Wrap stable libraries only to forward every call without adding real value.
     - Add configuration systems, plugin systems, or strategy patterns where simple branching would do.
     - Add complex type gymnastics or generics when a plain type works.

5. **Respect existing boundaries**
   - Keep file and class responsibilities consistent with current design.
   - Extend existing modules when appropriate instead of adding parallel, competing ones.
   - If a refactor is truly needed, describe it in `IMPLEMENTATION_PLAN.md` first.

6. **Favor explicit, verbose code in tools**
   - Write expanded, readable code rather than compressed or “smart” constructs.
   - Use clear error messages and log messages.
   - Prefer simple data structures (dicts, lists, small dataclasses) over invented mini-frameworks.

7. **Verification**
   - After coding, validate that:
     - The change matches the plan and does not introduce unrelated behavior.
     - The new code path is easy to explain in a short narrative.
     - The complexity is proportionate to the problem being solved.

---

## 4. When to introduce abstractions

You may introduce a new abstraction (helper, base class, shared module) if all of the following are true:

1. There are at least two real, existing uses with very similar behavior.
2. The abstraction makes both call sites simpler and clearer than before.
3. The abstraction is named after the problem domain, not after the mechanism, for example `GroupScraper` instead of `FlowManager`.
4. The abstraction does not force future flows into an awkward shape.
5. The implementation remains small, testable, and easy to delete or replace.

If any of these do not hold, keep the code duplicated and explicit.

---

## 5. Dealing with legacy or messy code

When touching older or messy areas:

- Do not attempt a large cleanup unless requested.
- Apply the “boy scout rule”: leave the code a bit better than you found it.
- Prefer local, low-risk improvements:
  - Extract a small helper function.
  - Improve naming.
  - Reduce a complex conditional into a clearer structure.
- If a larger refactor seems necessary, capture it as a proposal in `IMPLEMENTATION_PLAN.md` with scope and risks.

---

## 6. Summary

- Use an implementation plan for refactors and non-trivial new features.
- Optimize for readability and straightforward control flow.
- Keep business logic concrete and localized. Avoid early generalization.
- Accept duplication when it protects you from wrong abstractions.
- Introduce abstractions carefully, based on real repetition and stability.
- Aim for small, vertical slices that are easy to reason about end to end.
- Avoid over-engineering, unnecessary frameworks, and shallow wrappers.

This guide is the default contract for how code is structured and evolved in this project.
