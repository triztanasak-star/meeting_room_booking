import { useState, type FormEvent } from 'react';
import AvatarPicker from '../../../components/AvatarPicker';
import { useTranslation } from 'react-i18next';
import LoadingOverlay from '../../../components/LoadingOverlay';
import ErrorState from '../../../components/ErrorState';
import EmptyState from '../../../components/EmptyState';
import UserAvatar from '../../../components/UserAvatar';
import { useCreateUser, useUpdateUser, useUsers } from '../hooks/useUsers';
import type { Role } from '../../../lib/db';

export default function UsersPage() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useUsers();
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<'ready' | 'processing' | 'error'>('ready');
  const [createError, setCreateError] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('user');

  // Lưu trữ role đang chỉnh sửa tạm thời cho từng user theo ID: { [userId]: roleValue }
  const [editingRoles, setEditingRoles] = useState<Record<string, Role>>({});

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (createUser.isPending || avatarStatus !== 'ready') return;
    setCreateError(false);
    try {
      await createUser.mutateAsync({ name, email, password, role, avatar_url: avatar });
    } catch { setCreateError(true); return; }
    setName('');
    setAvatar(null);
    setEmail('');
    setPassword('');
    setRole('user');
  };

  const handleRoleChange = (userId: string, newRole: Role) => {
    setEditingRoles((prev) => ({ ...prev, [userId]: newRole }));
  };

  const handleSaveRole = (userId: string) => {
    const newRole = editingRoles[userId];
    if (!newRole) return;
    
    updateUser.mutate({ id: Number(userId), payload: { role: newRole } }, {
      onSuccess: () => {
        // Xóa khỏi trạng thái tạm sau khi lưu thành công
        setEditingRoles((prev) => {
          const copy = { ...prev };
          delete copy[userId];
          return copy;
        });
      }
    });
  };

  return (
    <div>
      <h1 className="h4 mb-4">{t('users.title')}</h1>

      <form className="card-surface mb-4" onSubmit={handleCreate}>
        {createError && <div className="alert alert-danger" role="alert">{t('avatar.createFailed')}</div>}
        <AvatarPicker name={name} value={avatar} onChange={setAvatar} onStatusChange={setAvatarStatus} disabled={createUser.isPending} />
        <div className="row g-2 align-items-end">
          <div className="col-md-3">
            <label className="form-label">{t('users.name')}</label>
            <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="col-md-3">
            <label className="form-label">{t('users.email')}</label>
            <input type="email" className="form-control" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t('users.password')}</label>
            <input type="password" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <div className="col-md-2">
            <label className="form-label">{t('users.role')}</label>
            <select className="form-select" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="user">{t('users.roleOptions.user')}</option>
              <option value="manager">{t('users.roleOptions.manager')}</option>
              <option value="admin">{t('users.roleOptions.admin')}</option>
            </select>
          </div>
          <div className="col-md-2">
            <button type="submit" className="btn btn-primary w-100" disabled={createUser.isPending || avatarStatus !== 'ready'}>
              {t('users.create')}
            </button>
          </div>
        </div>
      </form>

      {isLoading && <LoadingOverlay />}
      {isError && <ErrorState />}
      {!isLoading && !isError && (data?.documents.length ?? 0) === 0 && <EmptyState message={t('users.noUsers')} />}

      {!isLoading && !isError && (data?.documents.length ?? 0) > 0 && (
        <div className="card-surface p-0">
          <table className="table mb-0 align-middle">
            <thead>
              <tr>
                <th>{t('users.columns.name')}</th>
                <th>{t('users.columns.email')}</th>
                <th>{t('users.columns.role')}</th>
                <th>{t('users.columns.status')}</th>
                <th className="text-end">{t('users.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {data!.documents.map((u) => {
                const isActive = u.status === 'active';
                const currentSelectedRole = editingRoles[u.id] !== undefined ? editingRoles[u.id] : u.role;
                const isChanged = editingRoles[u.id] !== undefined && editingRoles[u.id] !== u.role;

                return (
                  <tr key={u.id}>
                    <td><div className="d-flex align-items-center gap-2"><UserAvatar name={u.name} src={u.avatar_url} /><span>{u.name}</span></div></td>
                    <td>{u.email}</td>
                    <td>
                      <div className="d-flex align-items-center gap-2">
                        <select
                          className="form-select form-select-sm"
                          style={{ width: '130px' }}
                          value={currentSelectedRole}
                          onChange={(e) => handleRoleChange(String(u.id), e.target.value as Role)}
                        >
                          <option value="user">{t('users.roleOptions.user')}</option>
                          <option value="manager">{t('users.roleOptions.manager')}</option>
                          <option value="admin">{t('users.roleOptions.admin')}</option>
                        </select>

                        {/* Chỉ hiện nút Lưu khi người dùng thay đổi quyền khác với database */}
                        {isChanged && (
                          <button
                            type="button"
                            className="btn btn-sm btn-success px-2 py-1"
                            onClick={() => handleSaveRole(String(u.id))}
                            disabled={updateUser.isPending}
                          >
                            {t('users.save')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`badge text-bg-${isActive ? 'success' : 'secondary'}`}>{u.status}</span>
                    </td>
                    <td className="text-end">
                      {isActive ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => updateUser.mutate({ id: u.id, payload: { status: 'disabled' } })}
                        >
                          {t('users.lock')}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success"
                          onClick={() => updateUser.mutate({ id: u.id, payload: { status: 'active' } })}
                        >
                          {t('users.unlock')}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}