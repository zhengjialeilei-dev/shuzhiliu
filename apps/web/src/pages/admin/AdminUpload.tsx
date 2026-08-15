import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Edit3, ExternalLink, FileText, FolderOpen, Loader2, Lock, LogOut, Save, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  deleteResource,
  deleteTeachingResource,
  createTeachingResource,
  getAdminSession,
  getResources,
  getTeachingResources,
  loginAdmin,
  logoutAdmin,
  replaceResource,
  updateTeachingResource,
  uploadAdminResource,
} from '../../lib/api';
import type { Resource, TeachingResource } from '../../lib/types';
import { ALL_RESOURCE_CATEGORIES, GAME_CATEGORY, TOOL_CATEGORY } from '../../lib/resourceCategories';
import { formatCategoryLabel } from '../../lib/displayLabels';
import { LabeledFile, LabeledInput, LabeledSelect, LabeledTextarea } from './AdminFields';
import { AdminUploadPanel } from './AdminUploadPanel';
import {
  GRADES,
  TEACHING_ZONES,
  buildExternalTeachingPayload,
  buildUploadFormData,
  createDrafts,
  createEmptyDraft,
  createEmptyFiles,
  createUploadFiles,
  type Section,
} from './adminUploadModel';

type Mode = 'upload' | 'manage';
type EditState =
  | { type: 'resource'; id: string; title: string; description: string; category: string; grade: string; routePath: string | null }
  | { type: 'teaching'; id: string; title: string; description: string; zone: string; fileUrl: string; fileType: string };

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
  const [editing, setEditing] = useState<EditState | null>(null);
  const [deleting, setDeleting] = useState<{ type: 'resource' | 'teaching'; id: string; title: string } | null>(null);
  const [editWorkFile, setEditWorkFile] = useState<File | null>(null);
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null);
  const [regenerateEditCover, setRegenerateEditCover] = useState(false);

  const [drafts, setDrafts] = useState(createDrafts);
  const [uploadFiles, setUploadFiles] = useState(createUploadFiles);

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
        if (session.authenticated) await fetchLists();
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
    () => resources.filter((item) => item.category !== TOOL_CATEGORY && item.category !== GAME_CATEGORY),
    [resources]
  );
  const gameResources = useMemo(() => resources.filter((item) => item.category === GAME_CATEGORY), [resources]);
  const toolResources = useMemo(() => resources.filter((item) => item.category === TOOL_CATEGORY), [resources]);
  const currentList = section === 'teaching' ? teachingResources : section === 'games' ? gameResources : section === 'tools' ? toolResources : aiResources;

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
    const form = event.currentTarget as HTMLFormElement;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const draft = drafts[section];
      const isExternalTeachingLink = section === 'teaching' && draft.teachingSource === 'link';
      if (isExternalTeachingLink) {
        await createTeachingResource(buildExternalTeachingPayload(draft));
      } else {
        const formData = buildUploadFormData(section, draft, uploadFiles[section]);
        await uploadAdminResource(formData);
      }
      await fetchLists();
      setMessage(isExternalTeachingLink ? '外链添加成功' : '上传成功');
      setDrafts((current) => ({ ...current, [section]: createEmptyDraft(section) }));
      setUploadFiles((current) => ({ ...current, [section]: createEmptyFiles() }));
      form.reset();
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
        routePath: resource.route_path,
      });
      setEditWorkFile(null);
      setEditCoverFile(null);
      setRegenerateEditCover(false);
      return;
    }

    const resource = item as TeachingResource;
    setEditing({
      type,
      id: resource.id,
      title: resource.title,
      description: resource.description,
      zone: resource.zone,
      fileUrl: resource.file_url,
      fileType: resource.file_type,
    });
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSubmitting(true);
    setError(null);
    try {
      if (editing.type === 'resource') {
        const formData = new FormData();
        formData.set('title', editing.title);
        formData.set('description', editing.description);
        formData.set('category', editing.category);
        formData.set('grade', editing.grade);
        formData.set('regenerateCover', String(regenerateEditCover));
        if (editWorkFile) formData.set('htmlFile', editWorkFile);
        if (editCoverFile) formData.set('coverFile', editCoverFile);
        await replaceResource(editing.id, formData);
      } else {
        await updateTeachingResource(editing.id, {
          title: editing.title,
          description: editing.description,
          zone: editing.zone,
          ...(editing.fileType === 'link' ? { file_url: editing.fileUrl } : {}),
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          <TabButton active={section === 'ai'} onClick={() => setSection('ai')} label="AI 应用" />
          <TabButton active={section === 'games'} onClick={() => setSection('games')} label="互动游戏" />
          <TabButton active={section === 'tools'} onClick={() => setSection('tools')} label="实用工具" />
          <TabButton active={section === 'teaching'} onClick={() => setSection('teaching')} label="教学专区" />
        </div>

        {error && <div className="mb-4"><MessageBar tone="error" message={error} /></div>}
        {success && <div className="mb-4"><MessageBar tone="success" message={success} /></div>}

        {mode === 'upload' ? (
          <AdminUploadPanel
            section={section}
            draft={drafts[section]}
            submitting={submitting}
            onDraftChange={(patch) =>
              setDrafts((current) => ({
                ...current,
                [section]: { ...current[section], ...patch },
              }))
            }
            onFilesChange={(patch) =>
              setUploadFiles((current) => ({
                ...current,
                [section]: { ...current[section], ...patch },
              }))
            }
            onSubmit={handleUpload}
          />
        ) : (          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800">资源列表</h2>
                <p className="text-xs text-slate-400">共 {currentList.length} 个资源</p>
              </div>
              <button onClick={fetchLists} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200" title="刷新">
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
                      meta={[formatCategoryLabel(item.category), item.grade]}
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
          <div className="bg-white rounded-3xl p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-800">编辑资源</h3>
                <p className="text-sm text-slate-500">可更新文字、作品文件或封面，原短链接保持不变。</p>
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
                onChange={(value) => setEditing((prev) => (prev ? { ...prev, description: value } : prev))}
              />
              {editing.type === 'resource' ? (
                <div className="space-y-4">
                  {editing.routePath && (
                    <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                      短链接保持不变：{editing.routePath}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <LabeledSelect
                      label="分类"
                      value={editing.category}
                      onChange={(value) =>
                        setEditing((prev) => (prev && prev.type === 'resource' ? { ...prev, category: value } : prev))
                      }
                      options={ALL_RESOURCE_CATEGORIES}
                      renderOption={formatCategoryLabel}
                    />
                    <LabeledSelect
                      label="年级"
                      value={editing.grade}
                      onChange={(value) =>
                        setEditing((prev) => (prev && prev.type === 'resource' ? { ...prev, grade: value } : prev))
                      }
                      options={GRADES}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <LabeledFile
                      label="替换作品（可选）"
                      accept=".html,.htm,.zip"
                      onChange={(file) => {
                        setEditWorkFile(file);
                        if (!file) setRegenerateEditCover(false);
                      }}
                      required={false}
                    />
                    <LabeledFile
                      label="替换封面（可选）"
                      accept="image/*"
                      onChange={(file) => {
                        setEditCoverFile(file);
                        if (file) setRegenerateEditCover(false);
                      }}
                      required={false}
                    />
                  </div>
                  <label className={`flex items-start gap-3 rounded-xl border p-4 ${editWorkFile ? 'cursor-pointer border-slate-200' : 'cursor-not-allowed border-slate-100 opacity-50'}`}>
                    <input
                      type="checkbox"
                      checked={regenerateEditCover}
                      disabled={!editWorkFile || Boolean(editCoverFile)}
                      onChange={(event) => setRegenerateEditCover(event.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-slate-600">根据新作品自动重新生成封面（选择了新封面时无需勾选）</span>
                  </label>
                </div>
              ) : (
                <div className="space-y-4">
                  <LabeledSelect
                    label="分区"
                    value={editing.zone}
                    onChange={(value) =>
                      setEditing((prev) => (prev && prev.type === 'teaching' ? { ...prev, zone: value } : prev))
                    }
                    options={TEACHING_ZONES.map((item) => item.id)}
                    renderOption={(value) => TEACHING_ZONES.find((item) => item.id === value)?.label || value}
                  />
                  {editing.fileType === 'link' ? (
                    <LabeledInput
                      label="官方资源链接"
                      type="url"
                      value={editing.fileUrl}
                      onChange={(fileUrl) =>
                        setEditing((prev) => (prev && prev.type === 'teaching' ? { ...prev, fileUrl } : prev))
                      }
                    />
                  ) : null}
                </div>
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
    <div role="status" aria-live="polite" className={`flex items-center gap-2 rounded-2xl border px-4 py-3 ${base}`}>
      <AlertCircle className="w-4 h-4" />
      {message}
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
      <img
        src={imageUrl}
        alt={title}
        loading="lazy"
        decoding="async"
        className="w-16 h-16 rounded-xl object-cover"
      />
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
        {fileType === 'link' ? <ExternalLink className="w-8 h-8 text-sky-600" /> : <FileText className="w-8 h-8 text-sky-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-slate-800 truncate">{title}</h3>
        <p className="text-xs text-slate-500 truncate">{description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-600">{zone}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 uppercase">
            {fileType === 'link' ? '官方外链' : fileType}
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
