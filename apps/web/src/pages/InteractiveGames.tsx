import ResourceGalleryPage from '../components/ResourceGalleryPage';

const InteractiveGames = () => {
  return (
    <ResourceGalleryPage
      title="互动游戏"
      subtitle="把益智闯关和课堂互动结合起来的游戏化资源"
      emptyText="暂无互动游戏，敬请期待。"
      accentColor="orange"
      gradientColors="from-amber-400 via-orange-400 to-rose-400"
      section="games"
      searchPlaceholder="搜索游戏..."
    />
  );
};

export default InteractiveGames;
