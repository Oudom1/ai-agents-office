# Deployment Source — Verify Kai Smooth Fix

This deployment uses the current `main` source while preserving the verified Kai pipeline work and all later office/login fixes.

## Kai baseline carried forward
- Smooth Kai error/blocker handling.
- Hugging Face ZeroGPU LTX Video compatibility build patch.
- Multi-scene video merge pipeline.
- Free voice narration path.
- Google Drive upload support when OAuth is configured.
- FREE ONLY policy: no paid fallback and Kai is complete only when a real MP4 exists.

## Current office changes carried forward
- Leo development queue.
- Lina QA queue.
- Sam RBAC/ABAC access-control queue.
- Mina security/monitoring queue.
- Noah deployment/CI-CD queue.
- Alex blocker/coordination queue.
- Task Board and Active Tasks office displays.
- Resilient login gate/API timeout handling.

## Deployment behavior
Both GitHub Pages and the Render `ai-agents-office-api` service use `main`. This commit intentionally refreshes the deployment from the current combined source rather than rolling back later fixes.
