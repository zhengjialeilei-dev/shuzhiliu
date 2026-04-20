import React from 'react';
import { FolderOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface ZoneInfo {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  gradient: string;
  lightBg: string;
  borderColor: string;
  textColor: string;
  hoverBg: string;
}

interface ZoneCardProps {
  zone: ZoneInfo;
  isActive: boolean;
  resourceCount: number;
  onClick: () => void;
}

const ZoneCard: React.FC<ZoneCardProps> = ({ zone, isActive, resourceCount, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`relative p-4 sm:p-6 rounded-2xl sm:rounded-3xl transition-all duration-500 text-left overflow-hidden group ${
        isActive
          ? 'shadow-2xl scale-[1.02]'
          : 'bg-white hover:shadow-xl hover:scale-[1.01] border border-slate-100'
      }`}
    >
      {isActive && <div className={`absolute inset-0 bg-gradient-to-br ${zone.gradient} opacity-100`} />}

      <div
        className={`absolute -right-4 -bottom-4 w-16 sm:w-24 h-16 sm:h-24 rounded-full ${
          isActive ? 'bg-white/10' : zone.lightBg
        } transition-all duration-300`}
      />
      <div
        className={`absolute -right-8 -bottom-8 w-24 sm:w-32 h-24 sm:h-32 rounded-full ${
          isActive ? 'bg-white/5' : `${zone.lightBg} opacity-50`
        } transition-all duration-300`}
      />

      <div className="relative z-10">
        <div
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center mb-2 sm:mb-4 transition-all duration-300 ${
            isActive ? 'bg-white/20 text-white' : `${zone.lightBg} ${zone.textColor}`
          }`}
        >
          <zone.icon className="w-5 h-5 sm:w-6 sm:h-6" />
        </div>

        <h3
          className={`text-base sm:text-xl font-bold mb-0.5 sm:mb-1 transition-colors ${
            isActive ? 'text-white' : 'text-slate-800'
          }`}
        >
          {zone.label}
        </h3>

        <p
          className={`text-xs sm:text-sm mb-2 sm:mb-3 transition-colors line-clamp-1 ${
            isActive ? 'text-white/80' : 'text-slate-400'
          }`}
        >
          {zone.description}
        </p>

        <div
          className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full transition-all ${
            isActive ? 'bg-white/20 text-white' : `${zone.lightBg} ${zone.textColor}`
          }`}
        >
          <FolderOpen className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          {resourceCount} 项
        </div>
      </div>
    </button>
  );
};

export default ZoneCard;
