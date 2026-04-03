

const CustomWidget = () => {
  return (
    // 这里是你的 HTML 结构，需要转换为 JSX
    // 1. class 变为 className
    // 2. 闭合所有标签 (如 <img /> <br />)
    // 3. style 属性变为对象 {{ width: '100%' }}
    <div className="my-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-100">
      <h2 className="text-xl font-bold text-blue-900 mb-2">这是你植入的 HTML 区域</h2>
      <p className="text-blue-700">
        你可以在这里放置任何自定义的 HTML 内容。只需将其转换为 React 组件格式即可。
      </p>
      
      {/* 示例：一个简单的自定义按钮 */}
      <div className="mt-4">
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          点击我
        </button>
      </div>
    </div>
  );
};

export default CustomWidget;
