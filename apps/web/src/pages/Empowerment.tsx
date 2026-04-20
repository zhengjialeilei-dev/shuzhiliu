import { useMemo } from 'react';
import ResourceGalleryPage from '../components/ResourceGalleryPage';
import { useResources } from '../hooks/useResources';
import { TOOL_CATEGORY } from '../lib/resourceCategories';

const Empowerment = () => {
  const { allResources, loading } = useResources();
  const toolResources = useMemo(
    () => allResources.filter((resource) => resource.category === TOOL_CATEGORY && (resource.route_path || resource.file_path)),
    [allResources]
  );

  return (
    <ResourceGalleryPage
      title="实用工具"
      subtitle="让课堂更顺手的即时教学辅助工具"
      emptyText="暂无实用工具，敬请期待。"
      accentColor="emerald"
      gradientColors="from-emerald-400 to-teal-500"
      resources={toolResources}
      loading={loading}
      searchPlaceholder="搜索工具..."
    />
  );
};

export default Empowerment;
