import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { handleApiError } from '../services/api';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('reason') === 'session_expired' ? 'מערכת עודכנה, נא להתחבר מחדש' : '';
  });
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login({ username, password });
      login(response.user, response.token);
      navigate('/dashboard');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-50 via-primary-50/30 to-accent-50/20 flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-float p-6 sm:p-10 border border-white/50">
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img 
                src="/FreshMorLogo.png" 
                alt="FreshMor App" 
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                style={{ imageRendering: 'auto' }}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-l from-primary-600 to-primary-500 bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
            <p className="text-surface-500 mt-2 font-medium">{t('auth.login')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            {error && (
              <div className="bg-danger-50 text-danger-600 p-3 sm:p-4 rounded-xl text-sm font-medium border border-danger-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5 sm:mb-2">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white/80 text-surface-800 placeholder:text-surface-400 text-base"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5 sm:mb-2">
                {t('auth.password')}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 sm:py-3.5 border border-surface-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all bg-white/80 text-surface-800 placeholder:text-surface-400 text-base"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-l from-primary-600 to-primary-500 text-white py-3 sm:py-3.5 rounded-xl font-semibold hover:from-primary-700 hover:to-primary-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 active:scale-[0.98] text-base"
            >
              {loading ? t('app.loading') : t('auth.loginButton')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
