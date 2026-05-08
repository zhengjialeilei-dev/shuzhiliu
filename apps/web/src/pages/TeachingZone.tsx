import { useMemo, useState, useCallback, useEffect } from 'react';
import { FolderOpen, Loader2, ScrollText, BookOpen, FileCheck, Presentation } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getTeachingResources } from '../lib/api';
import { LOCAL_TEXTBOOK_RESOURCES, mergeLocalTextbooks } from '../lib/localTeachingResources';
import { parseTextbookOrder } from '../lib/utils';
import PageHeader from '../components/PageHeader';
import ZoneCard from '../components/ZoneCard';
import TeachingResourceCard from '../components/TeachingResourceCard';
import ToastNotice from '../components/ToastNotice';
import type { ZoneInfo } from '../components/ZoneCard';
import type { TeachingResource } from '../lib/types';

const ZONES: ZoneInfo[] = [
  {
    id: 'standard',
    label: '课标',
    icon: ScrollText,
    description: '课程标准与实施方案',
    gradient: 'from-blue-500 to-indigo-600',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-600',
    hoverBg: 'hover:bg-blue-100',
  },
  {
    id: 'textbook',
    label: '课本',
    icon: BookOpen,
    description: '教材资源与电子课本',
    gradient: 'from-emerald-500 to-teal-600',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-600',
    hoverBg: 'hover:bg-emerald-100',
  },
  {
    id: 'plan',
    label: '教案',
    icon: FileCheck,
    description: '优质教学设计与案例',
    gradient: 'from-amber-500 to-orange-600',
    lightBg: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-600',
    hoverBg: 'hover:bg-amber-100',
  },
  {
    id: 'courseware',
    label: '课件',
    icon: Presentation,
    description: '精品教学课件资源',
    gradient: 'from-purple-500 to-fuchsia-600',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-600',
    hoverBg: 'hover:bg-purple-100',
  },
];

const LOCAL_RESOURCES: TeachingResource[] = [
  {
    id: 'local-1',
    title: '数学课程标准',
    description: '本地静态示例资源，可作为部署前的占位内容。',
    zone: 'standard',
    file_url: '/files/数学课标.pdf',
    file_type: 'pdf',
  },
  {
    id: 'local-2',
    title: '课程实施方案',
    description: '本地静态示例资源，可作为部署前的占位内容。',
    zone: 'standard',
    file_url: '/files/课标方案.pdf',
    file_type: 'pdf',
  },
  ...LOCAL_TEXTBOOK_RESOURCES,
];

const CN_GRADE_LABELS: Record<string, string> = {
  一: '一年级',
  二: '二年级',
  三: '三年级',
  四: '四年级',
  五: '五年级',
  六: '六年级',
  1: '一年级',
  2: '二年级',
  3: '三年级',
  4: '四年级',
  5: '五年级',
  6: '六年级',
};

const getDisplayDescription = (resource: TeachingResource) => {
  const rawDesc = (resource.description || '').trim();
  const rawTitle = (resource.title || '').trim();

  if (resource.zone !== 'textbook') return rawDesc || rawTitle;

  if (
    rawDesc.length >= 8 &&
    /(年级|上册|下册|电子课本|教材)/.test(rawDesc) &&
    /数学/.test(rawDesc)
  ) {
    return rawDesc;
  }

  const source = (rawTitle || rawDesc).replace(/\s+/g, '');
  const gradeMatch = source.match(/([一二三四五六1-6])(?=年级|上册|下册|$)/);
  const gradeLabel = gradeMatch ? CN_GRADE_LABELS[gradeMatch[1]] : '';
  const term = /下册/.test(source) ? '下册' : /上册/.test(source) ? '上册' : '';

  if (gradeLabel && term) return `${gradeLabel}${term}数学电子课本`;
  if (gradeLabel) return `${gradeLabel}数学电子课本`;
  if (rawDesc) return rawDesc;
  if (rawTitle) return rawTitle;
  return '数学电子课本';
};

const fetchTeachingResources = async () => {
  const remoteResources = await getTeachingResources().catch(() => []);
  return remoteResources.length > 0 ? mergeLocalTextbooks(remoteResources) : LOCAL_RESOURCES;
};

const TeachingZone = () => {
  const [activeZone, setActiveZone] = useState('standard');
  const [notice, setNotice] = useState<string | null>(null);

  const { data: resources = LOCAL_RESOURCES, isLoading: loading } = useQuery({
    queryKey: ['teachingResources'],
    queryFn: fetchTeachingResources,
  });

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 2500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const activeZoneInfo = ZONES.find((zone) => zone.id === activeZone) || ZONES[0];

  const filteredResources = useMemo(() => {
    const list = resources.filter((resource) => resource.zone === activeZone);
    if (activeZone !== 'textbook') return list;

    return [...list].sort((a, b) => {
      const left = parseTextbookOrder(a.title || a.description);
      const right = parseTextbookOrder(b.title || b.description);
      if (left.gradeNum !== right.gradeNum) return left.gradeNum - right.gradeNum;
      if (left.term !== right.term) return left.term - right.term;
      return (a.title || '').localeCompare(b.title || '', 'zh-Hans-CN');
    });
  }, [activeZone, resources]);

  const handleOpenFile = useCallback((url: string) => {
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      setNotice('浏览器拦截了新窗口，请允许本站打开文件。');
    }
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-[1600px] mx-auto">
      {notice ? <ToastNotice message={notice} /> : null}
      <div className="mb-6 sm:mb-10">
        <PageHeader
          title="教学专区"
          subtitle="统一收录课程标准、教材、教案与课件资源"
          gradientColors="from-blue-400 to-indigo-500"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-10">
        {ZONES.map((zone) => (
          <ZoneCard
            key={zone.id}
            zone={zone}
            isActive={activeZone === zone.id}
            resourceCount={resources.filter((resource) => resource.zone === zone.id).length}
            onClick={() => setActiveZone(zone.id)}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className={`p-4 sm:p-6 bg-gradient-to-r ${activeZoneInfo.gradient}`}>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center">
              <activeZoneInfo.icon className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-white">{activeZoneInfo.label}资源</h2>
              <p className="text-white/80 text-xs sm:text-sm">{activeZoneInfo.description}</p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="py-12 sm:py-16 text-center">
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-slate-300 mx-auto" />
            </div>
          ) : filteredResources.length === 0 ? (
            <div className="py-12 sm:py-16 text-center">
              <div
                className={`w-16 h-16 sm:w-20 sm:h-20 ${activeZoneInfo.lightBg} rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4`}
              >
                <FolderOpen className={`w-8 h-8 sm:w-10 sm:h-10 ${activeZoneInfo.textColor}`} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-slate-700 mb-2">
                暂无{activeZoneInfo.label}资料
              </h3>
              <p className="text-xs sm:text-sm text-slate-400">请到后台上传对应资源。</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {filteredResources.map((resource) => (
                <TeachingResourceCard
                  key={resource.id}
                  resource={resource}
                  zoneInfo={activeZoneInfo}
                  displayDescription={getDisplayDescription(resource)}
                  onClick={() => handleOpenFile(resource.file_url)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeachingZone;
