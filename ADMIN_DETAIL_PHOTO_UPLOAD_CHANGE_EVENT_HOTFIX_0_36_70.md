# ADMIN DETAIL PHOTO UPLOAD CHANGE EVENT HOTFIX 0.36.70

- Root cause: politician file processing was attached to the generic `input` event path.
- Fix: politician file selection/save is handled by the file input's `change` event path.
- Scope: admin politician-detail photo upload only; upload/optimization/storage pipeline unchanged.
