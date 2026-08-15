import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '../../test/render';
import AdminUpload from './AdminUpload';

const apiMocks = vi.hoisted(() => ({
  createTeachingResource: vi.fn(),
  deleteResource: vi.fn(),
  deleteTeachingResource: vi.fn(),
  getAdminSession: vi.fn(),
  getResources: vi.fn(),
  getTeachingResources: vi.fn(),
  loginAdmin: vi.fn(),
  logoutAdmin: vi.fn(),
  replaceResource: vi.fn(),
  updateTeachingResource: vi.fn(),
  uploadAdminResource: vi.fn(),
}));

vi.mock('../../lib/api', () => apiMocks);

describe('AdminUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getAdminSession.mockResolvedValue({ authenticated: true });
    apiMocks.getResources.mockResolvedValue([]);
    apiMocks.getTeachingResources.mockResolvedValue([]);
    apiMocks.uploadAdminResource.mockResolvedValue({ id: 'uploaded' });
    apiMocks.createTeachingResource.mockResolvedValue({ id: 'linked' });
  });

  it('submits a math HTML work and refreshes the resource lists', async () => {
    renderWithProviders(<AdminUpload />, {
      initialEntries: ['/admin/upload'],
      routePath: '/admin/upload',
    });

    expect(await screen.findByRole('heading', { name: /上传.*AI 应用/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '分数实验室' } });
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: '小学数学分数互动练习' } });
    fireEvent.change(screen.getByLabelText('作品短链接（可选）'), {
      target: { value: 'fraction-lab' },
    });
    fireEvent.change(screen.getByLabelText('年级'), { target: { value: '三年级' } });

    const htmlFile = new File(['<html><body>Math</body></html>'], 'fraction-lab.html', {
      type: 'text/html',
    });
    fireEvent.change(screen.getByLabelText('作品文件（HTML 或 ZIP）'), {
      target: { files: [htmlFile] },
    });
    fireEvent.submit(screen.getByRole('button', { name: '确认上传' }).closest('form')!);

    await waitFor(() => expect(apiMocks.uploadAdminResource).toHaveBeenCalledTimes(1));
    const formData = apiMocks.uploadAdminResource.mock.calls[0][0] as FormData;
    expect(formData.get('section')).toBe('ai');
    expect(formData.get('title')).toBe('分数实验室');
    expect(formData.get('grade')).toBe('三年级');
    expect(formData.get('routeSlug')).toBe('fraction-lab');
    expect(formData.get('htmlFile')).toBe(htmlFile);
    expect(formData.has('coverFile')).toBe(false);
    expect(await screen.findByText('上传成功')).toBeInTheDocument();
    expect(screen.getByLabelText('标题')).toHaveValue('');
    expect(apiMocks.getResources).toHaveBeenCalledTimes(2);
    expect(apiMocks.getTeachingResources).toHaveBeenCalledTimes(2);
  });

  it('submits a math textbook PDF to the textbook zone', async () => {
    renderWithProviders(<AdminUpload />, {
      initialEntries: ['/admin/upload'],
      routePath: '/admin/upload',
    });

    expect(await screen.findByRole('heading', { name: /上传.*AI 应用/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '教学专区' }));
    expect(screen.getByRole('heading', { name: /上传.*教学资源/ })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '四年级数学上册' } });
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: '人教版数学电子课本' } });
    fireEvent.change(screen.getByLabelText('分区'), { target: { value: 'textbook' } });
    const pdfFile = new File(['pdf'], 'math-grade-4.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('教学文件'), { target: { files: [pdfFile] } });
    fireEvent.submit(screen.getByRole('button', { name: '确认上传' }).closest('form')!);

    await waitFor(() => expect(apiMocks.uploadAdminResource).toHaveBeenCalledTimes(1));
    const formData = apiMocks.uploadAdminResource.mock.calls[0][0] as FormData;
    expect(formData.get('section')).toBe('teaching');
    expect(formData.get('zone')).toBe('textbook');
    expect(formData.get('teachingFile')).toBe(pdfFile);
    expect(await screen.findByText('上传成功')).toBeInTheDocument();
  });

  it('adds an HTTPS official link without uploading a file', async () => {
    renderWithProviders(<AdminUpload />, {
      initialEntries: ['/admin/upload'],
      routePath: '/admin/upload',
    });

    expect(await screen.findByRole('heading', { name: /上传.*AI 应用/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '教学专区' }));
    fireEvent.change(screen.getByLabelText('标题'), { target: { value: '义务教育数学课程标准' } });
    fireEvent.change(screen.getByLabelText('描述'), { target: { value: '教育部正式发布版本' } });
    fireEvent.change(screen.getByLabelText('资源来源'), { target: { value: 'link' } });
    fireEvent.change(screen.getByLabelText('官方资源链接'), {
      target: { value: 'https://www.moe.gov.cn/math-standard.pdf' },
    });
    fireEvent.submit(screen.getByRole('button', { name: '确认添加' }).closest('form')!);

    await waitFor(() => expect(apiMocks.createTeachingResource).toHaveBeenCalledTimes(1));
    expect(apiMocks.createTeachingResource).toHaveBeenCalledWith({
      title: '义务教育数学课程标准',
      description: '教育部正式发布版本',
      zone: 'standard',
      file_url: 'https://www.moe.gov.cn/math-standard.pdf',
    });
    expect(apiMocks.uploadAdminResource).not.toHaveBeenCalled();
    expect(await screen.findByText('外链添加成功')).toBeInTheDocument();
  });
});
