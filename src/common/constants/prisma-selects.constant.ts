export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
  phone: true,
  createdAt: true,
} as const;

export const SAFE_USER_MINIMAL_SELECT = {
  id: true,
  name: true,
  email: true,
  avatar: true,
} as const;
