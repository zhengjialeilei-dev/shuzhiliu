import fs from 'node:fs/promises';
import { config } from '../config.js';

const EXTRA_SEED_FILE = new URL('../../seed/resources.extra.local.json', import.meta.url);

function normalizeSeedRecord(record) {
  if (!record || typeof record !== 'object') return null;
  if (!record.id || !record.title || !record.category || !record.grade) return null;
  if (!record.image_url || !record.description || !record.file_path) return null;

  return {
    id: String(record.id),
    title: String(record.title),
    category: String(record.category),
    grade: String(record.grade),
    image_url: String(record.image_url),
    description: String(record.description),
    file_path: String(record.file_path),
    route_path: record.route_path ? String(record.route_path) : null,
    resource_type: String(record.resource_type || 'html'),
    created_at: String(record.created_at || new Date().toISOString()),
  };
}

export async function loadSeedResources() {
  const seedFiles = [config.resourceSeedFile, EXTRA_SEED_FILE];
  const resources = [];

  for (const seedFile of seedFiles) {
    try {
      const raw = await fs.readFile(seedFile, 'utf8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) continue;
      resources.push(...parsed.map(normalizeSeedRecord).filter(Boolean));
    } catch {
      continue;
    }
  }

  return resources;
}

export function mergeResources(primaryResources, seedResources) {
  if (Array.isArray(primaryResources) && primaryResources.length > 0) {
    return [...primaryResources].sort((a, b) =>
      String(b.created_at || '').localeCompare(String(a.created_at || ''))
    );
  }

  const merged = [...primaryResources];
  const seenKeys = new Set(
    primaryResources.map((item) => `${item.route_path || ''}|${item.file_path || ''}|${item.title}`)
  );

  for (const item of seedResources) {
    const key = `${item.route_path || ''}|${item.file_path || ''}|${item.title}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    merged.push(item);
  }

  return merged.sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')));
}
