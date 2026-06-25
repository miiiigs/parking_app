# Project Document Index

This file is the workflow folder's bridge to project-specific documents that may live outside `workflow/`.

The workflow system itself is self-contained inside `workflow/`.

This file is supplementary.

It is not required to create the first master production plan.

For project initialization, start with [MASTER_PRODUCTION_PLAN_INITIALIZER.md](./MASTER_PRODUCTION_PLAN_INITIALIZER.md) and [MASTER_PRODUCTION_PLAN.md](./MASTER_PRODUCTION_PLAN.md).

Project-specific technical evidence, rollout guides, design decisions, environment playbooks, and implementation artifacts may still live elsewhere in the repository. When that happens, list them here so every persona can discover them through the workflow folder instead of relying on memory.

## How To Use This File

- Update this file whenever a durable project document outside `workflow/` becomes important to planning, implementation, review, rollout, or validation.
- In a different project, this is one of the first files you should rewrite.
- Keep entries short and practical.

## Current Project Documents

- [apps/mobile/.env.example](../apps/mobile/.env.example)
  Current mobile environment variable template.

- [apps/mobile/ANDROID_RELEASE_GUIDE.md](../apps/mobile/ANDROID_RELEASE_GUIDE.md)
  Android-specific release notes and guidance.

- [apps/mobile/PRODUCTION_READINESS_CHECKLIST.md](../apps/mobile/PRODUCTION_READINESS_CHECKLIST.md)
  Mobile production-readiness checklist.

- [apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md](../apps/parking-app-operator/PRODUCTION_READINESS_CHECKLIST.md)
  Operator dashboard production-readiness checklist.

- [supabase/README.md](../supabase/README.md)
  Supabase bootstrap, RLS, walk-in cleanup, and gate-entry confirmation rollout guidance.

- [ANDROID_BUILD_CHECKLIST.md](../ANDROID_BUILD_CHECKLIST.md)
  Root-level Android build checklist currently used by the repo.
