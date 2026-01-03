import { useState } from "react";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { fetchMe, login } from "~/shared/api/authentication"
import type { AuthResponse, UserResponse } from "~/shared/api/types"
import { useAppContext } from "~/shared/context/AppContext";
import { saveToken, saveRefreshToken } from "~/shared/lib/helpers/storageHelpers";

type FieldErrors = {
  email?: string;
  password?: string;
};

export default function Login() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("test@test.com");
  const [password, setPassword] = useState("12345678");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const location = useLocation() as Location;
  const from = location.state?.from?.pathname || "/locations";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);
    
    try {
      const data: AuthResponse = await login(email, password, rememberMe);
      // Store clean token using helper function
      saveToken(data.access_token);
      
      // Always store refresh token (backend controls expiry based on remember_me)
      if (data.refresh_token) {
        saveRefreshToken(data.refresh_token);
      }
      
      const me: UserResponse = await fetchMe();
      setUser(me);
      
      // Clear all cached permissions when user logs in
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      
      navigate(from, { replace: true });
    } catch (e: unknown) {
      const error = e as { response?: { data?: { detail?: string } } };
      const errorMessage = error?.response?.data?.detail || t('auth.loginFailed');
      
      // Handle specific server errors
      if (errorMessage.includes("Invalid credentials") || errorMessage.includes("Incorrect")) {
        setFieldErrors({ 
          email: t('auth.invalidCredentials') || 'Invalid email or password',
          password: ' ' // Just to show error state on password field
        });
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">{t('auth.signIn')}</h1>
      
      {/* Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {t('auth.signIn')}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('auth.signInDescription') || 'Enter your credentials to access your account'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input
              className={`w-full border rounded-lg px-4 py-3 transition-colors ${
                fieldErrors.email 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              } focus:outline-none focus:ring-2`}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={t('auth.emailAddress')}
              disabled={isLoading}
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <input
              className={`w-full border rounded-lg px-4 py-3 transition-colors ${
                fieldErrors.password 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              } focus:outline-none focus:ring-2`}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={t('auth.password')}
              disabled={isLoading}
            />
            {fieldErrors.password && fieldErrors.password.trim() && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              disabled={isLoading}
              className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
              {t('auth.rememberMe') || 'Remember me for 30 days'}
            </label>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            } text-white`}
          >
            {isLoading ? (t('common.loading') || 'Loading...') : t('auth.signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
