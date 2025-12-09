import { api } from './client';
import type { 
  TokenResponse, 
  User, 
  UserRole, 
  LoginRequest, 
  RegisterRequest 
} from './types';

export const USER_ROLES = {
  ADMIN: 'ADMIN' as const,
  BUSINESS_OWNER: 'BUSINESS_OWNER' as const,
  EMPLOYEE: 'EMPLOYEE' as const,
} satisfies Record<string, UserRole>;

export const USER_ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Administrator',
  [USER_ROLES.BUSINESS_OWNER]: 'Business Owner',
  [USER_ROLES.EMPLOYEE]: 'Employee',
} as const;

export async function login(
  email: string,
  password: string,
  rememberMe: boolean = false
): Promise<TokenResponse> {
  const payload: LoginRequest = { email, password, remember_me: rememberMe };
  const { data } = await api.post<TokenResponse>('/auth/login', payload);
  return data;
}

export async function refreshToken(refreshToken: string): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/auth/refresh', { refresh_token: refreshToken });
  return data;
}

export async function register(
  email: string,
  username: string,
  password: string,
  role: UserRole
): Promise<TokenResponse> {
  const payload: RegisterRequest = { email, username, password, role };
  const { data } = await api.post<TokenResponse>('/auth/register', payload);
  return data;
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me');
  return data;
}

/* TODO: invalidate refresh token on the server & create it on the backend */
export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}   
