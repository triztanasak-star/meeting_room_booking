import client, { setAccessToken } from './adapters/nodeAdapter';

export type Role = 'admin' | 'manager' | 'user';

export interface User {
  $id: string;
  id: number;
  name: string;
  avatar_url?: string | null;
  email: string;
  role: Role;
  status: 'active' | 'disabled';
  created_at: string;
}

export interface Project {
  $id: string;
  id: number;
  project_name: string;
  description: string | null;
  manager_id: number | null;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

// Thêm cấu trúc kiểu dữ liệu cho hạng mục (milestone)
export interface MilestoneItem {
  id: string | number;
  name: string;
  progress: number;
  status: string;
  dueDate?: string; // 👈 ĐÃ THÊM: hạn hoàn thành của hạng mục (camelCase cho frontend)
}

export interface DigitalWork {
  $id: string;
  id: number;
  task_name: string;
  description: string | null;
  factory_name: string | null;
  status: number;
  workflow_status: 'requested' | 'approved' | 'rejected' | 'in_progress' | 'completed';
  rejection_reason?: string | null;
  priority: 'high' | 'medium' | 'low';
  progress_percent: number;
  progress_increased_at?: string | null;
  expected_deadline: string | null;
  desired_deadline: string | null;
  completed_at: string | null;
  lead_project: string | null;
  assistant: string | null;
  representative_name: string | null;
  representative_email: string | null;
  representative_phone: string | null;
  project_id: number | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  pic_users?: Pick<User, 'id' | 'name' | 'email' | 'avatar_url'>[];
  support_id: number | null;
  support_name: string | null;
  created_by: number | null;
  capex_amount: number | null;
  estimated_saving_per_year: number | null;
  saving_is_estimated?: boolean;
  payback_years: number | null;
  manager_comment: string | null;
  progress_comment: string | null;
  support_request: string | null;
  has_feedback: boolean;
  feedback_comment: string | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
  milestones?: MilestoneItem[]; // Bổ sung trường milestones tại đây
}

export interface TaskPlan {
  $id: string;
  id: number;
  work_id: number;
  created_by: number | null;
  step_name: string;
  step_order: number;
  status: 'pending' | 'in_progress' | 'done';
  progress_percent: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkAttachment {
  $id: string;
  id: number;
  work_id: number;
  url: string;
  original_name: string;
  mime_type: string | null;
  category: string | null;
  uploaded_by: number | null;
  created_at: string;
}

interface ListResponse<T> {
  documents: T[];
  total: number;
  page: number;
  limit: number;
}

// --- Auth ---
export const register = async (name: string, email: string, password: string, avatar_url?: string | null) => {
  const res = await client.post('/api/auth/register', { name, email, password, avatar_url });
  if (!res.data?.id) throw new Error('Invalid registration response');
  if (avatar_url && res.data.avatar_url !== avatar_url) throw new Error('Avatar was not saved');
  return res.data as User;
};

export const login = async (email: string, password: string) => {
  const res = await client.post('/api/auth/login', { email, password });
  setAccessToken(res.data.token);
  return res.data.user as User;
};

export const logout = async () => {
  await client.post('/api/auth/logout');
  setAccessToken(null);
};

export const fetchMe = async () => {
  const res = await client.get('/api/auth/me');
  return res.data as User;
};

export const refreshSession = async () => {
  const res = await client.post('/api/auth/refresh');
  setAccessToken(res.data.token);
};

// --- Users ---
export const listUsers = async (page = 1) => {
  const res = await client.get('/api/users', { params: { page } });
  return res.data as ListResponse<User>;
};

export const createUser = async (payload: { name: string; email: string; password: string; role: Role; avatar_url?: string | null }) => {
  const res = await client.post('/api/users', payload);
  if (!res.data?.id) throw new Error('Invalid user creation response');
  if (payload.avatar_url && res.data.avatar_url !== payload.avatar_url) throw new Error('Avatar was not saved');
  return res.data as User;
};

export const updateUser = async (id: number, payload: Partial<Pick<User, 'name' | 'email' | 'role' | 'status'>>) => {
  const res = await client.put(`/api/users/${id}`, payload);
  return res.data as User;
};

export const disableUser = async (id: number) => {
  await client.delete(`/api/users/${id}`);
};

// --- Projects ---
export const listProjects = async (page = 1) => {
  const res = await client.get('/api/projects', { params: { page } });
  return res.data as ListResponse<Project>;
};

export const createProject = async (payload: { project_name: string; description?: string; manager_id?: number }) => {
  const res = await client.post('/api/projects', payload);
  return res.data as Project;
};

export const updateProject = async (id: number, payload: Partial<Pick<Project, 'project_name' | 'description' | 'manager_id' | 'status'>>) => {
  const res = await client.put(`/api/projects/${id}`, payload);
  return res.data as Project;
};

export const deleteProject = async (id: number) => {
  await client.delete(`/api/projects/${id}`);
};

// --- Digital Works ---
export const listWorks = async (params: { page?: number; limit?: number; project_id?: number; assigned_to?: number } = {}) => {
  const res = await client.get('/api/works', { params });
  return res.data as ListResponse<DigitalWork>;
};

export const createWork = async (payload: Partial<DigitalWork> & { task_name: string }) => {
  const res = await client.post('/api/works', payload);
  return res.data as DigitalWork;
};

export const updateWork = async (id: number, payload: Partial<DigitalWork>) => {
  const res = await client.put(`/api/works/${id}`, payload);
  return res.data as DigitalWork;
};

export const updateWorkProgress = async (id: number, payload: Partial<DigitalWork>) => {
  const res = await client.patch(`/api/works/${id}/progress`, payload);
  return res.data as DigitalWork;
};

export const deleteWork = async (id: number) => {
  await client.delete(`/api/works/${id}`);
};


// --- Task Plans ---
export const listTaskPlans = async (workId: number) => {
  const res = await client.get(`/api/works/${workId}/plans`);
  // Hỗ trợ trả về cả 2 trường hợp: res.data chứa trực tiếp mảng hoặc nằm trong thuộc tính documents/data
  if (Array.isArray(res.data)) {
    return { documents: res.data };
  }
  return res.data as { documents: TaskPlan[] };
};

export const createTaskPlan = async (workId: number, payload: { step_name: string; step_order?: number; due_date?: string; progress_percent?: number }) => {
  const res = await client.post(`/api/works/${workId}/plans`, payload);
  return res.data as TaskPlan;
};

export const updateTaskPlan = async (id: number, payload: Partial<Pick<TaskPlan, 'step_name' | 'step_order' | 'status' | 'due_date' | 'progress_percent'>> & { confirm_completion?: boolean }) => {
  const res = await client.put(`/api/plans/${id}`, payload);
  return res.data as TaskPlan;
};

export const deleteTaskPlan = async (id: number) => {
  await client.delete(`/api/plans/${id}`);
};

// --- Work Attachments ---
export const listAttachments = async (workId: number) => {
  const res = await client.get(`/api/works/${workId}/attachments`);
  return res.data as { documents: WorkAttachment[] };
};

export const uploadAttachments = async (workId: number, files: File[], category?: string, links: string[] = []) => {
  const formData = new FormData();
  for (const file of files) formData.append('files', file);
  if (category) formData.append('category', category);
  if (links.length) formData.append('links', JSON.stringify(links));

  // Đã bỏ headers cứng để Axios tự động gắn token xác thực
  const res = await client.post(`/api/works/${workId}/attachments`, formData);
  return res.data as { documents: WorkAttachment[] };
};

export const deleteAttachment = async (id: number) => {
  await client.delete(`/api/attachments/${id}`);
};

export const downloadAttachment = async (id: number, fileName: string) => {
  const res = await client.get(`/api/attachments/${id}/download`, { responseType: 'blob' });
  const blob = res.data as Blob;
  if (/\.pdf$/i.test(fileName) || blob.type === 'application/pdf') {
    const header = await blob.slice(0, 1024).text();
    if (!header.includes('%PDF-')) throw new Error('Invalid PDF response');
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
export const rejectWork = async (id: number, reason: string) => {
  const res = await client.post(`/api/works/${id}/reject`, { reason });
  return res.data as DigitalWork & { notification_sent: boolean };
};
