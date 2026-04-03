import React from 'react';
import { FileText, FileCheck, Presentation, ExternalLink } from 'lucide-react';
import type { ZoneInfo } from './ZoneCard';

interface TeachingResource {
  id: string;
  title: string;
  description: string;
  zone: string;
  file_url: string;
  file_type: string;
}

interface TeachingResourceCardProps {
  resource: TeachingResource;
  zoneInfo: ZoneInfo;
  displayDescription: string;
  onClick: () => void;
}

const getFileIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'pdf':
      return <FileText className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'doc':
    case 'docx':
      return <FileCheck className="w-4 h-4 sm:w-5 sm:h-5" />;
    case 'ppt':
    case 'pptx':
      return <Presentation className="w-4 h-4 sm:w-5 sm:h-5" />;
    default:
      return <FileText className="w-4 h-4 sm:w-5 sm:h-5" />;
  }
};

const TeachingResourceCard: React.FC<TeachingResourceCardProps> = ({
  resource,
  zoneInfo,
  displayDescription,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`group cursor-pointer p-4 sm:p-5 rounded-xl sm:rounded-2xl border-2 ${zoneInfo.borderColor} ${zoneInfo.hoverBg} transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5`}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={`p-2.5 sm:p-3 rounded-lg sm:rounded-xl ${zoneInfo.lightBg} ${zoneInfo.textColor} group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}
        >
          {getFileIcon(resource.file_type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-slate-800 text-sm sm:text-base mb-0.5 sm:mb-1 group-hover:text-slate-900 truncate">
            {resource.title}
          </h4>
          <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 mb-2 sm:mb-3">
            {displayDescription}
          </p>
          <div className="flex items-center justify-between">
            <span
              className={`text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded ${zoneInfo.lightBg} ${zoneInfo.textColor} uppercase`}
            >
              {resource.file_type}
            </span>
            <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeachingResourceCard;
