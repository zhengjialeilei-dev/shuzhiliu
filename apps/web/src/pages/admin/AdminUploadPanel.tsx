import { Loader2, Upload } from 'lucide-react';
import { AI_CATEGORIES } from '../../lib/resourceCategories';
import { LabeledFile, LabeledInput, LabeledSelect, LabeledTextarea } from './AdminFields';
import {
  GRADES,
  SECTION_LABELS,
  TEACHING_ZONES,
  type Section,
  type TeachingSource,
  type UploadDraft,
  type UploadFiles,
} from './adminUploadModel';

type Props = {
  section: Section;
  draft: UploadDraft;
  submitting: boolean;
  onDraftChange: (patch: Partial<UploadDraft>) => void;
  onFilesChange: (patch: Partial<UploadFiles>) => void;
  onSubmit: (event: React.FormEvent) => void;
};

export function AdminUploadPanel({
  section,
  draft,
  submitting,
  onDraftChange,
  onFilesChange,
  onSubmit,
}: Props) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
      <h2 className="text-lg font-bold text-slate-800 mb-2">上传{SECTION_LABELS[section]}</h2>
      <p className="text-sm text-slate-500 mb-6">
        {section === 'teaching'
          ? draft.teachingSource === 'link'
            ? '填写可信来源的 HTTPS 链接，添加后会立即出现在所选教学分区。'
            : '支持 PDF、Word 和 PowerPoint 文件，上传成功后会立即出现在所选教学分区。'
          : '单文件作品选择 HTML；包含图片、音频或脚本目录的作品请上传 ZIP，压缩包内需要有 index.html。封面留空时会自动截图。'}
      </p>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LabeledInput label="标题" value={draft.title} onChange={(title) => onDraftChange({ title })} />
          <LabeledTextarea
            label="描述"
            value={draft.description}
            onChange={(description) => onDraftChange({ description })}
          />
        </div>

        {section !== 'teaching' && (
          <LabeledInput
            label="作品短链接（可选）"
            value={draft.routeSlug}
            onChange={(value) => onDraftChange({ routeSlug: value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
            placeholder="例如 fraction-lab，对应 /works/fraction-lab"
            required={false}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {section === 'ai' && (
            <>
              <LabeledSelect
                label="分类"
                value={draft.category}
                onChange={(category) => onDraftChange({ category })}
                options={AI_CATEGORIES}
              />
              <LabeledSelect
                label="年级"
                value={draft.grade}
                onChange={(grade) => onDraftChange({ grade })}
                options={GRADES}
              />
            </>
          )}

          {section === 'teaching' ? (
            <>
              <LabeledSelect
                label="分区"
                value={draft.zone}
                onChange={(zone) => onDraftChange({ zone })}
                options={TEACHING_ZONES.map((item) => item.id)}
                renderOption={(value) => TEACHING_ZONES.find((item) => item.id === value)?.label || value}
              />
              <LabeledSelect
                label="资源来源"
                value={draft.teachingSource}
                onChange={(value) => {
                  const teachingSource = value as TeachingSource;
                  onDraftChange({ teachingSource, externalUrl: teachingSource === 'file' ? '' : draft.externalUrl });
                  if (teachingSource === 'link') onFilesChange({ teachingFile: null });
                }}
                options={['file', 'link']}
                renderOption={(value) => (value === 'file' ? '上传文件' : '官方外链')}
              />
            </>
          ) : (
            <>
              <LabeledFile
                label="作品文件（HTML 或 ZIP）"
                accept=".html,.htm,.zip"
                onChange={(workFile) => onFilesChange({ workFile })}
              />
              <LabeledFile
                label="封面图片（可选，留空自动截图）"
                accept="image/*"
                onChange={(coverFile) => onFilesChange({ coverFile })}
                required={false}
              />
            </>
          )}
        </div>

        {section === 'teaching' &&
          (draft.teachingSource === 'file' ? (
            <LabeledFile
              label="教学文件"
              accept=".pdf,.doc,.docx,.ppt,.pptx"
              onChange={(teachingFile) => onFilesChange({ teachingFile })}
            />
          ) : (
            <LabeledInput
              label="官方资源链接"
              type="url"
              value={draft.externalUrl}
              onChange={(externalUrl) => onDraftChange({ externalUrl })}
              placeholder="https://basic.smartedu.cn/..."
            />
          ))}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          {submitting ? '处理中...' : section === 'teaching' && draft.teachingSource === 'link' ? '确认添加' : '确认上传'}
        </button>
      </form>
    </div>
  );
}
