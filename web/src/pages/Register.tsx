import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { fetchMe, register, USER_ROLES } from "~/shared/api/authentication"
import type { AuthResponse, UserResponse, UserRole } from "~/shared/api/types"
import { useAppContext } from "~/shared/context/AppContext";
import { VALIDATION_RULES, getValidationMessages } from "~/shared/constants/validation";
import { saveToken } from "~/shared/lib/helpers";

type FieldErrors = {
  email?: string;
  username?: string;
  password?: string;
  repassword?: string;
};

export default function Register() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<UserRole>(USER_ROLES.BUYER);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repassword, setRePassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { setUser } = useAppContext();
  const navigate = useNavigate();
  const to = "/dashboard";

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors: FieldErrors = {};
    const messages = getValidationMessages();
    
    if (!email) {
      errors.email = messages.REQUIRED.EMAIL;
    } else if (!validateEmail(email)) {
      errors.email = messages.INVALID.EMAIL;
    }
    
    if (!username) {
      errors.username = messages.REQUIRED.USERNAME;
    } else if (username.length < VALIDATION_RULES.USERNAME.MIN_LENGTH) {
      errors.username = messages.LENGTH.USERNAME_MIN;
    }
    
    if (!password) {
      errors.password = messages.REQUIRED.PASSWORD;
    } else if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
      errors.password = messages.LENGTH.PASSWORD_MIN;
    }
    
    if (!repassword) {
      errors.repassword = messages.REQUIRED.PASSWORD_CONFIRM;
    } else if (password !== repassword) {
      errors.repassword = messages.INVALID.PASSWORD_MISMATCH;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data: AuthResponse = await register(email, username, password, activeTab);
      // Store clean token using helper function
      saveToken(data.access_token);

      const me: UserResponse = await fetchMe();
      setUser(me);

      navigate(to, { replace: true });
    } catch (e: unknown) {
      const error = e as { response?: { data?: { detail?: string } } };
      const errorMessage = error?.response?.data?.detail || t('auth.registrationFailed');
      
      // Handle specific server errors
      if (errorMessage.includes("Email already registered")) {
        setFieldErrors({ email: t('auth.emailAlreadyRegistered') });
      } else if (errorMessage.includes("Username already taken")) {
        setFieldErrors({ username: t('auth.usernameAlreadyTaken') });
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const tabs = [
    { id: USER_ROLES.BUYER, label: t('roles.buyer'), description: t('auth.registerAsCustomer') },
    { id: USER_ROLES.SUPPLIER, label: t('roles.supplier'), description: t('auth.registerAsSeller') }
  ];

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">{t('auth.createAccount')}</h1>
      
      {/* Tabs */}
      <div className="w-full">
        <div className="flex w-full border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 px-4 text-center font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="font-semibold">{tab.label}</div>
              <div className="text-xs mt-1">{tab.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">
            {t('auth.registerAs', { role: t(`roles.${activeTab.toLowerCase()}`) })}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            {activeTab === USER_ROLES.BUYER 
              ? t('auth.findAndPurchase')
              : t('auth.createAndManage')
            }
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
                fieldErrors.username 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              } focus:outline-none focus:ring-2`}
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder={t('auth.username')}
              disabled={isLoading}
            />
            {fieldErrors.username && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.username}</p>
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
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          <div>
            <input
              className={`w-full border rounded-lg px-4 py-3 transition-colors ${
                fieldErrors.repassword 
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
              } focus:outline-none focus:ring-2`}
              type="password"
              value={repassword}
              onChange={e => setRePassword(e.target.value)}
              placeholder={t('auth.confirmPassword')}
              disabled={isLoading}
            />
            {fieldErrors.repassword && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.repassword}</p>
            )}
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
            {isLoading ? t('auth.creatingAccount') : t('auth.registerAs', { role: t(`roles.${activeTab.toLowerCase()}`) })}
          </button>
        </form>
      </div>
    </div>
  );
}
