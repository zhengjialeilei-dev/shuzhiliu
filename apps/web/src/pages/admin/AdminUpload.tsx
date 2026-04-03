import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Edit3,
  FileText,
  FolderOpen,
  Loader2,
  Lock,
  LogOut,
  Save,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteResource,
  deleteTeachingResource,
  getAdminSession,
  getResources,
  getTeachingResources,
  loginAdmin,
  logoutAdmin,
  updateResource,
  updateTeachingResource,
  uploadAdminResource,
} from '../../lib/api';
import type { Resource, TeachingResource } from '../../lib/types';

const AI_CATEGORIES = [
  '数与代数',
  '图形与几何',
  '统计与概率',
  '综合实践',
  '微课',
  '习题',
  '其他',
] as const;

const GRADES = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级', '通用', '拓展'] as const;

const TEACHING_ZONES = [
  { id: 'standard', label: '课标' },
  { id: 'textbook', label: '课本' },
  { id: 'plan', label: '教案' },
  { id: 'courseware', label: '课件' },
] as const;

type Section = 'ai' | 'tools' | 'teaching';
type Mode = 'upload' | 'manage';
type AiFormState = { title: string; description: string; category: string; grade: string };
type ToolsFormState = { title: string; description: string };
type TeachingFormState = { title: string; description: string; zone: string };
type EditingState =
  | { type: 'resource'; id: string; title: string; description: string; category: string; grade: string }
  | { type: 'teaching'; id: string; title: string; description: string; zone: string };

const emptyAiForm: AiFormState = {
  title: '',
  description: '',
  category: AI_CATEGORIES[0],
  grade: GRADES[0],
};

const emptyToolsForm: ToolsFormState = { title: '', description: '' };
const emptyTeachingForm: TeachingFormState = {
  title: '',
  description: '',
  zone: TEACHING_ZONES[0].id,
};

export default function AdminUpload() {
  const navigate = useNavigate();
  const [loadingSession, setLoadingSession] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('upload');
  const [section, setSection] = useState<Section>('ai');
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resources, setResources] = useState<Resource[]>([]);
  const [teachingResources, setTeachingResources] = useState<TeachingResource[]>([]);
  const [editing, setEditing] = useState<EditingState | null>(null);
  const [deleting, setDeleting] = useState<{ type: 'resource' | 'teaching'; id: string; title: string } | null>(
    null
  );

  const [aiForm, setAiForm] = useState(emptyAiForm);
  const [toolsForm, setToolsForm] = useState(emptyToolsForm);
  const [teachingForm, setTeachingForm] = useState(emptyTeachingForm);

  const [aiHtmlFile, setAiHtmlFile] = useState<File | null>(null);
  const [aiCoverFile, setAiCoverFile] = useState<File | null>(null);
  const [toolsHtmlFile, setToolsHtmlFile] = useState<File | null>(null);
  const [toolsCoverFile, setToolsCoverFile] = useState<File | null>(null);
  const [teachingFile, setTeachingFile] = useState<File | null>(null);

  const clearStatusSoon = useCallback(() => {
    window.setTimeout(() => setSuccess(null), 2500);
  }, []);

  const fetchLists = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [resourceList, teachingList] = await Promise.all([getResources(), getTeachingResources()]);
      setResources(resourceList);
      setTeachingResources(teachingList);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载资源失败');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        const session = await getAdminSession();
        setIsAuthenticated(session.authenticated);
        if (session.authenticated) {
          await fetchLists();
        }
      } catch {
        setIsAuthenticated(false);
      } finally {
        setLoadingSession(false);
      }
    };
    run();
  }, [fetchLists]);

  useEffect(() => {
    if (isAuthenticated && mode === 'manage') {
      fetchLists();
    }
  }, [fetchLists, isAuthenticated, mode]);

  const aiResources = useMemo(
    () => resources.filter((item) => item.category !== '赋能教学'),
    [resources]
  );
  const toolResources = useMemo(
    () => resources.filter((item) => item.category === '赋能教学'),
    [resources]
  );
  const currentList = section === 'teaching' ? teachingResources : section === 'ai' ? aiResources : toolResources;

  const setMessage = (message: string) => {
    setSuccess(message);
    clearStatusSoon();
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await loginAdmin(password);
      setIsAuthenticated(true);
      setPassword('');
      await fetchLists();
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutAdmin();
    } finally {
      setIsAuthenticated(false);
      setResources([]);
      setTeachingResources([]);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.set('section', section);

      if (section === 'ai') {
        if (!aiHtmlFile || !aiCoverFile) throw new Error('请上传 HTML 文件和封面图');
        formData.set('title', aiForm.title);
        formData.set('description', aiForm.description);
        formData.set('category', aiForm.category);
        formData.set('grade', aiForm.grade);
        formData.set('htmlFile', aiHtmlFile);
        formData.set('coverFile', aiCoverFile);
      }

      if (section === 'tools') {
        if (!toolsHtmlFile || !toolsCoverFile) throw new Error('请上传 HTML 文件和封面图');
        formData.set('title', toolsForm.title);
        formData.set('description', toolsForm.description);
        formData.set('htmlFile', toolsHtmlFile);
        formData.set('coverFile', toolsCoverFile);
      }

      if (section === 'teaching') {
        if (!teachingFile) throw new Error('请上传教学资源文件');
        formData.set('title', teachingForm.title);
        formData.set('description', teachingForm.description);
        formData.set('zone', teachingForm.zone);
        formData.set('teachingFile', teachingFile);
      }

      await uploadAdminResource(formData);
      await fetchLists();
      setMessage('上传成功');
      setAiForm(emptyAiForm);
      setToolsForm(emptyToolsForm);
      setTeachingForm(emptyTeachingForm);
      setAiHtmlFile(null);
      setAiCoverFile(null);
      setToolsHtmlFile(null);
      setToolsCoverFile(null);
      setTeachingFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item: Resource | TeachingResource, type: 'resource' | 'teaching') => {
    if (type === 'resource') {
      const resource = item as Resource;
      setEditing({
        type,
        id: resource.id,
        title: resource.title,
        description: resource.description,
        category: resource.category,
        grade: resource.grade,
      });
      return;
    }

    const resource = item as TeachingResource;
    setEditing({
      type,
      id: resource.id,
      title: resource.title,
      description: resource.description,
      zone: resource.zone,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSubmitting(true);
    setError(null);

    try {
      if (editing.type === 'resource') {
        await updateResource(editing.id, {
          title: editing.title,
          description: editing.description,
          category: editing.category,
          grade: editing.grade,
        });
      } else {
        await updateTeachingResource(editing.id, {
          title: editing.title,
          description: editing.description,
          zone: editing.zone,
        });
      }

      await fetchLists();
      setEditing(null);
      setMessage('保存成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSubmitting(true);
    setError(null);

    try {
      if (deleting.type === 'resource') {
        await deleteResource(deleting.id);
      } else {
        await deleteTeachingResource(deleting.id);
      }

      await fetchLists();
      setDeleting(null);
      setMessage('删除成功');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-slate-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">管理员登录</h2>
          <p className="text-center text-slate-400 mb-8 text-sm">
            当前通过后端会话认证管理资源，不再依赖前端弱口令兜底。
          </p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-slate-800 focus:outline-none"
              placeholder="管理员密码"
              autoFocus
            />
            {error && <MessageBar tone="error" message={error} />}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 disabled:opacity-50"
            >
              {submitting ? '登录中...' : '进入后台'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">内容管理后台</h1>
              <p className="text-xs text-slate-400 mt-1">统一通过后端 API 管理数据库与文件存储</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-6">
          <TabButton active={mode === 'upload'} onClick={() => setMode('upload')} label="上传新资源" />
          <TabButton active={mode === 'manage'} onClick={() => setMode('manage')} label="管理资源" />
        </div>

        <div className="grid grid-cols-3 gap-2 mb-6">
          <TabButton active={section === 'ai'} onClick={() => setSection('ai')} label="AI 应用" />
          <TabButton active={section === 'tools'} onClick={() => setSection('tools')} label="互动工具" />
          <TabButton active={section === 'teaching'} onClick={() => setSection('teaching')} label="教学专区" />
        </div>

        {error && (
          <div className="mb-4">
            <MessageBar tone="error" message={error} />
          </div>
        )}
        {success && (
          <div className="mb-4">
            <MessageBar tone="success" message={success} />
          </div>
        )}

        {mode === 'upload' ? (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <h2 className="text-lg font-bold text-slate-800 mb-2">
              上传{section === 'ai' ? ' AI 应用' : section === 'tools' ? '互动工具' : '教学资源'}
            </h2>
            <p className="text-sm text-slate-500 mb-6">文件会先上传到后端，再由后端写入 PostgreSQL。</p>

            <form onSubmit={handleUpload} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LabeledInput
                  label="标题"
                  value={
                    section === 'ai' ? aiForm.title : section === 'tools' ? toolsForm.title : teachingForm.title
                  }
                  onChange={(value) => {
                    if (section === 'ai') setAiForm((prev) => ({ ...prev, title: value }));
                    if (section === 'tools') setToolsForm((prev) => ({ ...prev, title: value }));
                    if (section === 'teaching') setTeachingForm((prev) => ({ ...prev, title: value }));
                  }}
                />
                <LabeledTextarea
                  label="描述"
                  value={
                    section === 'ai'
                      ? aiForm.description
                      : section === 'tools'
                        ? toolsForm.description
                        : teachingForm.description
                  }
                  onChange={(value) => {
                    if (section === 'ai') setAiForm((prev) => ({ ...prev, description: value }));
                    if (section === 'tools') setToolsForm((prev) => ({ ...prev, description: value }));
                    if (section === 'teaching') setTeachingForm((prev) => ({ ...prev, description: value }));
                  }}
                />
              </div>

              {section === 'ai' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LabeledSelect
                    label="分类"
                    value={aiForm.category}
                    onChange={(value) =>
                      setAiForm((prev) => ({ ...prev, category: value as (typeof AI_CATEGORIES)[number] }))
                    }
                    options={AI_CATEGORIES}
                  />
                  <LabeledSelect
                    label="年级"
                    value={aiForm.grade}
                    onChange={(value) =>
                      setAiForm((prev) => ({ ...prev, grade: value as (typeof GRADES)[number] }))
                    }
                    options={GRADES}
                  />
                  <LabeledFile label="HTML 文件" accept=".html,.htm" onChange={setAiHtmlFile} />
                  <LabeledFile label="封面图片" accept="image/*" onChange={setAiCoverFile} />
                </div>
              )}

              {section === 'tools' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LabeledFile label="HTML 文件" accept=".html,.htm" onChange={setToolsHtmlFile} />
                  <LabeledFile label="封面图片" accept="image/*" onChange={setToolsCoverFile} />
                </div>
              )}

              {section === 'teaching' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <LabeledSelect
                    label="分区"
                    value={teachingForm.zone}
                    onChange={(value) => setTeachingForm((prev) => ({ ...prev, zone: value }))}
                    options={TEACHING_ZONES.map((item) => item.id)}
                    renderOption={(value) => TEACHING_ZONES.find((item) => item.id === value)?.label || value}
                  />
                  <LabeledFile
                    label="教学文件"
                    accept=".pdf,.doc,.docx,.ppt,.pptx"
                    onChange={setTeachingFile}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                {submitting ? '上传中...' : '确认上传'}
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">资源列表</h2>
                <p className="text-xs text-slate-400">共 {currentList.length} 个资源</p>
              </div>
              <button
                onClick={fetchLists}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
                title="刷新"
              >
                <Loader2 className={`w-4 h-4 text-slate-600 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {currentList.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500">暂无资源</p>
              </div>
            ) : (
              <div className="space-y-3">
                {section !== 'teaching' &&
                  (currentList as Resource[]).map((item) => (
                    <ResourceListItem
                      key={item.id}
                      title={item.title}
                      description={item.description}
                      meta={[item.category, item.grade]}
                      imageUrl={item.image_url}
                      onEdit={() => openEdit(item, 'resource')}
                      onDelete={() => setDeleting({ type: 'resource', id: item.id, title: item.title })}
                    />
                  ))}
                {section === 'teaching' &&
                  (currentList as TeachingResource[]).map((item) => (
                    <TeachingListItem
                      key={item.id}
                      title={item.title}
                      description={item.description}
                      zone={TEACHING_ZONES.find((zone) => zone.id === item.zone)?.label || item.zone}
                      fileType={item.file_type}
                      onEdit={() => openEdit(item, 'teaching')}
                      onDelete={() => setDeleting({ type: 'teaching', id: item.id, title: item.title })}
                    />
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">编辑资源</h3>
                <p className="text-sm text-slate-500">这里只修改元数据，不替换上传文件。</p>
              </div>
              <button onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-slate-100">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="space-y-4">
              <LabeledInput
                label="标题"
                value={editing.title}
                onChange={(value) => setEditing((prev) => (prev ? { ...prev, title: value } : prev))}
              />
              <LabeledTextarea
                label="描述"
                value={editing.description}
                onChange={(value) =>
                  setEditing((prev) => (prev ? { ...prev, description: value } : prev))
                }
              />
              {editing.type === 'resource' ? (
                <div className="grid grid-cols-2 gap-4">
                  <LabeledSelect
                    label="分类"
                    value={editing.category}
                    onChange={(value) =>
                      setEditing((prev) =>
                        prev && prev.type === 'resource' ? { ...prev, category: value } : prev
                      )
                    }
                    options={[...AI_CATEGORIES, '赋能教学']}
                  />
                  <LabeledSelect
                    label="年级"
                    value={editing.grade}
                    onChange={(value) =>
                      setEditing((prev) =>
                        prev && prev.type === 'resource' ? { ...prev, grade: value } : prev
                      )
                    }
                    options={GRADES}
                  />
                </div>
              ) : (
                <LabeledSelect
                  label="分区"
                  value={editing.zone}
                  onChange={(value) =>
                    setEditing((prev) =>
                      prev && prev.type === 'teaching' ? { ...prev, zone: value } : prev
                    )
                  }
                  options={TEACHING_ZONES.map((item) => item.id)}
                  renderOption={(value) => TEACHING_ZONES.find((item) => item.id === value)?.label || value}
                />
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">确认删除</h3>
            <p className="text-sm text-slate-500 mb-6">删除时会同步尝试清理数据库记录和上传文件。</p>
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <p className="font-medium text-slate-800">{deleting.title}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                disabled={submitting}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 disabled:opacity-50"
              >
                {submitting ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-2xl border transition-all font-medium ${
        active ? 'bg-white border-emerald-200 shadow-sm' : 'bg-white/60 border-slate-200'
      }`}
    >
      {label}
    </button>
  );
}

function MessageBar({ tone, message }: { tone: 'error' | 'success'; message: string }) {
  const base =
    tone === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700';
  return (
    <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${base}`}>
      <AlertCircle className="w-4 h-4" />
      {message}
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200"
        required
      />
    </div>
  );
}

function LabeledTextarea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 h-24 resize-none"
        required
      />
    </div>
  );
}

function LabeledSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  renderOption?: (value: string) => string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white"
      >
        {options.map((item) => (
          <option key={item} value={item}>
            {renderOption ? renderOption(item) : item}
          </option>
        ))}
      </select>
    </div>
  );
}

function LabeledFile({
  label,
  accept,
  onChange,
}: {
  label: string;
  accept: string;
  onChange: (file: File | null) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-slate-700">{label}</label>
      <input
        type="file"
        accept={accept}
        onChange={(e) => onChange(e.target.files?.[0] || null)}
        className="block w-full text-sm text-slate-500 file:mr-4 file:py-3 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-slate-50 file:text-slate-700 cursor-pointer border border-slate-200 rounded-xl"
        required
      />
    </div>
  );
}

function ResourceListItem({
  title,
  description,
  meta,
  imageUrl,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  meta: string[];
  imageUrl: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <img src={imageUrl} alt={title} className="w-16 h-16 rounded-xl object-cover" />
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 truncate">{title}</h3>
        <p className="text-xs text-slate-500 truncate">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          {meta.map((item) => (
            <span key={item} className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
              {item}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function TeachingListItem({
  title,
  description,
  zone,
  fileType,
  onEdit,
  onDelete,
}: {
  title: string;
  description: string;
  zone: string;
  fileType: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
      <div className="w-16 h-16 rounded-xl bg-sky-100 flex items-center justify-center">
        <FileText className="w-8 h-8 text-sky-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 truncate">{title}</h3>
        <p className="text-xs text-slate-500 truncate">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">{zone}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase">
            {fileType}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={onEdit} className="p-2 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
