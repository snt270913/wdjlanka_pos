// Single-admin username alias. The email is an identifier, never a secret or password.
export function resolveLoginEmail(username: string, configuredUsername: string, adminEmail: string): string | null {
  const alias = configuredUsername.trim().toLowerCase();
  return alias && username.trim().toLowerCase() === alias && adminEmail.trim().includes('@')
    ? adminEmail.trim() : /^[a-z0-9_]{3,32}$/.test(username.trim().toLowerCase()) ? `${username.trim().toLowerCase()}@staff.wdjlanka.invalid` : null;
}
