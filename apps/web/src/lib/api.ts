import type { AdminSession, HealthCheck, Resource, TeachingResource } from './types';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export function buildApiUrl(path: string) {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL}${path}`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Accept', 'application/json');

  const hasBody = init?.body !== undefined && init?.body !== null;
  if (hasBody && !(init?.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(buildApiUrl(path), {
    credentials: 'include',
    ...init,
    headers,
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

export function getResolvedHtmlResource(params: { path?: string | null; url?: string | null }) {
  const searchParams = new URLSearchParams();

  if (params.path) searchParams.set('path', params.path);
  if (params.url) searchParams.set('url', params.url);

  return request<Resource>(`/api/resources/resolve?${searchParams.toString()}`);
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
