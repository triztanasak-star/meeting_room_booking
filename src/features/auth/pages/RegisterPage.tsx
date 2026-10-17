import { useState, type FormEvent } from 'react';
import AvatarPicker from '../../../components/AvatarPicker';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../context/AuthContext';
import * as db from '../../../lib/db';

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [avatarStatus, setAvatarStatus] = useState<'ready' | 'processing' | 'error'>('ready');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (isSubmitting || avatarStatus !== 'ready') return;

    if (password.length < 8) {
      setError(t('auth.register.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.register.passwordMismatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      await db.register(name, email, password, avatar);
      navigate('/login', { replace: true, state: { registered: true } });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message === 'Email already exists' ? t('auth.register.emailInUse') : err instanceof Error && err.message === 'Avatar was not saved' ? t('avatar.notSaved') : message === 'Invalid avatar image' ? t('avatar.error') : t('auth.register.failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="h4 mb-4 text-center">{t('auth.register.title')}</h1>
        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <form onSubmit={handleSubmit}>
          <AvatarPicker name={name} value={avatar} onChange={setAvatar} onStatusChange={setAvatarStatus} disabled={isSubmitting} />
          <div className="mb-3">
            <label className="form-label" htmlFor="name">{t('auth.register.name')}</label>
            <input
              id="name"
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="email">{t('auth.register.email')}</label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">{t('auth.register.password')}</label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <div className="form-text">{t('auth.register.passwordHint')}</div>
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="confirmPassword">{t('auth.register.confirmPassword')}</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || avatarStatus !== 'ready'}>
            {isSubmitting ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>
        <p className="text-center mt-3 mb-0 text-muted">
          {t('auth.register.haveAccount')} <Link to="/login">{t('auth.register.loginNow')}</Link>
        </p>
      </div>
    </div>
  );
}
