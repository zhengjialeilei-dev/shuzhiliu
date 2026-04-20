import { useMemo, useState } from 'react';
import { Filter, Loader2, Search } from 'lucide-react';
import PageHeader from './PageHeader';
import ResourceCard from './ResourceCard';
import type { Resource } from '../lib/types';

interface ResourceGalleryPageProps {
  title: string;
  subtitle: string;
  emptyText: string;
  accentColor: 'orange' | 'emerald';
  gradientColors: string;
  resources: Resource[];
  loading: boolean;
  searchPlaceholder: string;
}

export default function ResourceGalleryPage({
  title,
  subtitle,
  emptyText,
  accentColor,
  gradientColors,
  resources,
  loading,
  searchPlaceholder,
}: ResourceGalleryPageProps) {
  const [search, setSearch] = useState('');

  const filteredResources = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return resources;
    }

    return resources.filter((resource) => {
      const haystacks = [resource.title, resource.description, resource.category, resource.grade];
      return haystacks.some((value) => value.toLowerCase().includes(keyword));
    });
  }, [resources, search]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
      <div className="flex flex-col gap-4 mb-6 sm:mb-10">
        <PageHeader title={title} subtitle={subtitle} gradientColors={gradientColors} />

        <div className="flex items-center gap-2 sm:gap-4 bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-white/50 shadow-sm w-full">
          <div className="relative group flex-1">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-10 pr-4 py-2.5 sm:py-3 bg-white rounded-xl border-none ring-1 ring-gray-100 w-full focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all duration-300 placeholder-gray-400 text-sm"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-emerald-500 transition-colors" />
          </div>

          <button className="p-2.5 hover:bg-white hover:shadow-md rounded-xl text-gray-500 hover:text-emerald-600 transition-all duration-300 flex-shrink-0">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
        {filteredResources.map((resource) => (
          <ResourceCard key={resource.id} resource={resource} accentColor={accentColor} />
        ))}
        {filteredResources.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            {emptyText}
          </div>
        )}
      </div>
    </div>
  );
}
