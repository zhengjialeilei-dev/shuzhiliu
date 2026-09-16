import ResourceGalleryPage from '../components/ResourceGalleryPage';

const Empowerment = () => {
  return (
    <ResourceGalleryPage
      title="实用工具"
      subtitle="让课堂更顺手的即时教学辅助工具"
      emptyText="暂无实用工具，敬请期待。"
      accentColor="emerald"
      gradientColors="from-emerald-400 to-teal-500"
      section="tools"
      searchPlaceholder="搜索工具..."
    />
  );
};

export default Empowerment;
