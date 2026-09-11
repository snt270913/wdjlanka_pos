// Single-admin username alias. The email is an identifier, never a secret or password.
export function resolveLoginEmail(username: string, configuredUsername: string, adminEmail: string): string | null {
  const alias = configuredUsername.trim().toLowerCase();
  return alias && username.trim().toLowerCase() === alias && adminEmail.trim().includes('@')
    ? adminEmail.trim() : null;
}
