/**
 * HTML Viewer 骨架屏组件
 * 在 HTML 内容加载时显示，提供更好的用户体验
 */
export default function HtmlViewerSkeleton() {
  return (
    <div className="w-full h-full bg-white border border-gray-200 rounded-lg overflow-hidden animate-pulse">
      {/* 模拟浏览器顶部栏 */}
      <div className="h-10 bg-gray-100 border-b border-gray-200 flex items-center px-4 gap-2">
        <div className="w-3 h-3 rounded-full bg-red-400"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
        <div className="w-3 h-3 rounded-full bg-green-400"></div>
        <div className="flex-1 mx-4 h-6 bg-gray-200 rounded"></div>
      </div>

      {/* 模拟内容区域 */}
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-3 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-4/6"></div>
        </div>

        <div className="h-48 bg-gray-200 rounded-lg mt-6"></div>

        <div className="flex gap-4 mt-6">
          <div className="h-10 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    </div>
  );
}
