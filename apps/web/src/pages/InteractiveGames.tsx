import { useMemo } from 'react';
import ResourceGalleryPage from '../components/ResourceGalleryPage';
import { useResources } from '../hooks/useResources';
import { GAME_CATEGORY } from '../lib/resourceCategories';

const InteractiveGames = () => {
  const { allResources, loading } = useResources();
  const gameResources = useMemo(
    () => allResources.filter((resource) => resource.category === GAME_CATEGORY && (resource.route_path || resource.file_path)),
    [allResources]
  );

  return (
    <ResourceGalleryPage
      title="互动游戏"
      subtitle="把益智闯关和课堂互动结合起来的游戏化资源"
      emptyText="暂无互动游戏，敬请期待。"
      accentColor="orange"
      gradientColors="from-amber-400 via-orange-400 to-rose-400"
      resources={gameResources}
      loading={loading}
      searchPlaceholder="搜索游戏..."
    />
  );
};

export default InteractiveGames;
