export type AppStatus = 'success' | 'error';

export interface Resource {
  id: string;
  title: string;
  category: string;
  grade: string;
  image_url: string;
  description: string;
  file_path?: string | null;
  route_path?: string | null;
  resource_type: string;
  created_at: string;
  updated_at?: string | null;
  version?: number;
}

export interface TeachingResource {
  id: string;
  title: string;
  description: string;
  zone: string;
  file_url: string;
  file_type: string;
  created_at?: string;
  updated_at?: string | null;
  version?: number;
}

export interface HealthCheck {
  api: {
    status: AppStatus;
    message: string;
    storageDriver: string;
  };
  auth: {
    status: AppStatus;
    message: string;
  };
  database: {
    status: AppStatus;
    message: string;
    resourcesCount?: number;
    teachingCount?: number;
  };
  storage: {
    status: AppStatus;
    message: string;
  };
}

export interface AdminSession {
  authenticated: boolean;
}

export type UploadSection = 'ai' | 'games' | 'tools' | 'teaching';
