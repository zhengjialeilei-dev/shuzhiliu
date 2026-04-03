import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Database,
  FolderOpen,
  Loader2,
  Server,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { getHealthCheck } from '../lib/api';
import type { HealthCheck } from '../lib/types';

type Status = 'loading' | 'success' | 'error';

interface TestResult {
  name: string;
  status: Status;
  message: string;
  details?: Record<string, unknown>;
}

const STATUS_CLASS: Record<Status, string> = {
  loading: 'bg-blue-50 border-blue-200',
  success: 'bg-emerald-50 border-emerald-200',
  error: 'bg-red-50 border-red-200',
};

function statusIcon(status: Status) {
  if (status === 'loading') return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
  if (status === 'success') return <CheckCircle className="w-5 h-5 text-emerald-500" />;
  return <XCircle className="w-5 h-5 text-red-500" />;
}

function buildResults(health: HealthCheck): TestResult[] {
  return [
    {
      name: 'api',
      status: health.api.status,
      message: health.api.message,
      details: { storageDriver: health.api.storageDriver },
    },
    {
      name: 'auth',
      status: health.auth.status,
      message: health.auth.message,
    },
    {
      name: 'database',
      status: health.database.status,
      message: health.database.message,
      details:
        health.database.status === 'success'
          ? {
              resourcesCount: health.database.resourcesCount ?? 0,
              teachingCount: health.database.teachingCount ?? 0,
            }
          : undefined,
    },
    {
      name: 'storage',
      status: health.storage.status,
      message: health.storage.message,
    },
  ];
}

const TestConnection = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);

  const runTests = async () => {
    setTesting(true);
    setResults([
      { name: 'api', status: 'loading', message: '检查 API 服务中...' },
      { name: 'auth', status: 'loading', message: '检查管理员认证配置中...' },
      { name: 'database', status: 'loading', message: '检查 PostgreSQL 中...' },
      { name: 'storage', status: 'loading', message: '检查对象存储或本地存储中...' },
    ]);

    try {
      const health = await getHealthCheck();
      setResults(buildResults(health));
    } catch (error) {
      setResults([
        {
          name: 'api',
          status: 'error',
          message: error instanceof Error ? error.message : '无法连接到 API',
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6 lg:p-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-slate-200">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">后端连接测试</h1>
              <p className="text-slate-500">检查 API、认证、PostgreSQL 和存储链路</p>
            </div>
            <button
              onClick={runTests}
              disabled={testing}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {testing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  测试中...
                </>
              ) : (
                '重新测试'
              )}
            </button>
          </div>

          <div className="space-y-4">
            {results.map((result) => (
              <div
                key={result.name}
                className={`p-6 rounded-2xl border-2 ${STATUS_CLASS[result.status]} transition-all`}
              >
                <div className="flex items-start gap-4">
                  <div className="mt-0.5">{statusIcon(result.status)}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                      {result.name === 'api' && <Server className="w-4 h-4" />}
                      {result.name === 'auth' && <ShieldCheck className="w-4 h-4" />}
                      {result.name === 'database' && <Database className="w-4 h-4" />}
                      {result.name === 'storage' && <FolderOpen className="w-4 h-4" />}
                      {result.name === 'api' && 'API 服务'}
                      {result.name === 'auth' && '管理员认证'}
                      {result.name === 'database' && '数据库'}
                      {result.name === 'storage' && '文件存储'}
                    </h3>
                    <p className="text-slate-700 mb-2">{result.message}</p>
                    {result.details && (
                      <div className="mt-3 p-3 bg-white/60 rounded-lg text-xs text-slate-600">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(result.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <h3 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              当前检查内容
            </h3>
            <ul className="text-sm text-slate-600 space-y-1">
              <li>确保 `ADMIN_PASSWORD` 和 `JWT_SECRET` 已配置</li>
              <li>确保 PostgreSQL 中存在 `resources` 与 `teaching_resources` 两张表</li>
              <li>确保 `STORAGE_DRIVER` 与对应的本地目录或 S3/COS 参数可用</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestConnection;
