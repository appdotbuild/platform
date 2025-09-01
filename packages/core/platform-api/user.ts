type User = {
  clientReadOnlyMetadata?: { role: string };
};

export function getUserRole(user: User | null) {
  return user?.clientReadOnlyMetadata?.role;
}

export function isStaffUser(user: User | null) {
  return getUserRole(user) === 'staff';
}
