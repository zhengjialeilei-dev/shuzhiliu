import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  gradientColors?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  gradientColors = 'from-yellow-400 to-orange-500',
}) => {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 tracking-tight flex items-center gap-3">
        <span className={`w-2 h-6 sm:h-8 bg-gradient-to-b ${gradientColors} rounded-full block`} />
        {title}
      </h1>
      <p className="text-gray-400 mt-2 text-xs sm:text-sm font-medium pl-5">{subtitle}</p>
    </div>
  );
};

export default PageHeader;
