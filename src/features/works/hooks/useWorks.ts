import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as db from '../../../lib/db';

export function useWorks(params: { page?: number; limit?: number; project_id?: number; assigned_to?: number } = {}) {
  return useQuery({ queryKey: ['works', params], queryFn: () => db.listWorks(params) });
}

export function useCreateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.createWork,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  });
}

export function useUpdateWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof db.updateWork>[1] }) =>
      db.updateWork(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  });
}

export function useUpdateWorkProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof db.updateWorkProgress>[1] }) =>
      db.updateWorkProgress(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  });
}

export function useDeleteWork() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.deleteWork,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['works'] }),
  });
}

export function useTaskPlans(workId: number | null) {
  return useQuery({
    queryKey: ['task-plans', workId],
    queryFn: () => db.listTaskPlans(workId as number),
    enabled: workId !== null,
  });
}

export function useCreateTaskPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workId, payload }: { workId: number; payload: Parameters<typeof db.createTaskPlan>[1] }) =>
      db.createTaskPlan(workId, payload),
    onSuccess: (_data, variables) => queryClient.invalidateQueries({ queryKey: ['task-plans', variables.workId] }),
  });
}

export function useUpdateTaskPlan(workId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Parameters<typeof db.updateTaskPlan>[1] }) =>
      db.updateTaskPlan(id, payload),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['task-plans', workId] }), queryClient.invalidateQueries({ queryKey: ['works'] })]),
  });
}

export function useDeleteTaskPlan(workId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: db.deleteTaskPlan,
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['task-plans', workId] }), queryClient.invalidateQueries({ queryKey: ['works'] })]),
  });
}
