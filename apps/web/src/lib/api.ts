import type { AdminSession, HealthCheck, Resource, TeachingResource } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function buildUrl(path: string) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...init?.headers,
    },
    ...init,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function getResources() {
  return request<Resource[]>('/api/resources');
}

export function getTeachingResources() {
  return request<TeachingResource[]>('/api/teaching-resources');
}

export function getHealthCheck() {
  return request<HealthCheck>('/api/health');
}

export function getAdminSession() {
  return request<AdminSession>('/api/admin/session');
}

export function loginAdmin(password: string) {
  return request<{ success: boolean }>('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function logoutAdmin() {
  return request<{ success: boolean }>('/api/admin/logout', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function uploadAdminResource(formData: FormData) {
  return request<Resource | TeachingResource>('/api/admin/upload', {
    method: 'POST',
    body: formData,
  });
}

export function updateResource(
  id: string,
  payload: Pick<Resource, 'title' | 'description' | 'category' | 'grade'>
) {
  return request<Resource>(`/api/admin/resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteResource(id: string) {
  return request<{ success: boolean }>(`/api/admin/resources/${id}`, {
    method: 'DELETE',
  });
}

export function updateTeachingResource(
  id: string,
  payload: Pick<TeachingResource, 'title' | 'description' | 'zone'>
) {
  return request<TeachingResource>(`/api/admin/teaching-resources/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function deleteTeachingResource(id: string) {
  return request<{ success: boolean }>(`/api/admin/teaching-resources/${id}`, {
    method: 'DELETE',
  });
}
