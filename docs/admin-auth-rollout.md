# Admin authentication rollout

Status: prepared, not applied to production. Existing customer, inventory and sales records are not changed by the SQL.

The app replaces browser PIN authentication with Supabase email/password authentication. Only server-controlled `app_metadata.role = ADMIN` is accepted. User-editable metadata must never grant access. There is no public signup screen.

## Before cutover

1. Confirm the owner's intended admin email. Create the account through the Supabase Auth dashboard or Admin API, with the password set privately. Do not put passwords or service keys in GitHub, Vercel client variables, or chat.
2. Assign `role: ADMIN` in **app metadata** using the privileged Admin API (or a reviewed, targeted administrator SQL update for the verified user ID). Never auto-promote the first signup or all users. Verify email ownership and disable public signup for this private portal.
3. Verify a current backup and restore method. Include all five operational tables, their schema/policies and storage objects. SQL database backups do not contain the image file bytes. Backup verification remains pending.
4. Ensure preview uses the intended Supabase URL and publishable/anon key. Never expose a service-role key through `VITE_*`.
5. Test login, invalid credentials, refresh, logout and password change on preview. Local-storage admin flags must not unlock the app. An ordinary authenticated user must be denied.

## Coordinated release

Publish the tested app and run `supabase/admin-access-cutover.sql` in a short maintenance window. The SQL is transactional and refuses to run without a confirmed ADMIN account. The old PIN-only app will stop accessing data after cutover. Do not apply SQL before account setup and preview verification.

Test anonymous and non-admin reads/writes are denied, authorized admin CRUD and image upload succeed, and the existing item/customer/sale records remain intact. Run Supabase security advisors. Do not reopen anonymous access as a rollback; roll back the frontend to a compatible authenticated build or use a maintenance page.

JWT roles remain effective until tokens refresh/expire. When revoking an administrator, revoke sessions and account for outstanding token expiry. Browser-stored Supabase sessions are normal; the old custom browser flags no longer authorize requests.

## Scope

This release does not introduce employee access, checkout transactions, cloud settings synchronization, or public product-image privacy. Those are separate changes. Production remains on the original PIN version until the above steps complete.
