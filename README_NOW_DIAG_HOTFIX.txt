JCV3 NOW ADMIN ERROR DETAIL HOTFIX 2026-09-01

Apply over current R3 project root and overwrite matching files.
Purpose:
- Preserve and display actual server error detail instead of only NOW_DATA_ADMIN_FAILED.
- Show error code / stage / path / cause directly in NOW Data Center.
- Gateway module-load and handler failures return the real message.
- No data model, roster, Redis keys, or refresh algorithm changes.

After deploy: open 관리자 > NOW 데이터. The actual cause should be visible immediately without running a refresh.
