import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppContext } from "~/shared/context/AppContext";
import { hasToken, logout } from "~/shared/lib/helpers";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "~/shared/ui/LanguageSelector";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  "px-3 py-2 rounded " +
  (isActive ? "bg-blue-600 text-white" : "hover:bg-gray-100");

export default function Layout() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Top bar with auth buttons and language selector */}
      <div className="flex justify-between items-center px-6 py-2 bg-white border-b border-gray-200">
        {/* Language Selector */}
        <LanguageSelector />
        
        {/* Auth buttons */}
        <div className="flex items-center">
          {!hasToken() ? (
            <>
              <button
                className="text-sm px-3 py-1 mr-2 rounded hover:bg-gray-100"
                onClick={() => navigate("/register")}
              >
                {t('navigation.register')}
              </button>
              <button
                className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                onClick={() => navigate("/login")}
              >
                {t('navigation.signIn')}
              </button>
            </>
          ) : (
            <>
              <div className="mr-4 text-sm">{t('greetings.hi', { username: user?.username })}</div>
              <button
                className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                onClick={logout}
              >
                {t('navigation.logOut')}
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Static header with horizontal menu */}
      <header className="w-full bg-blue-600 text-white shadow">
        <nav className="container mx-auto flex items-center h-14 px-6">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <span className="font-bold text-xl mr-8">{t('common.brandName')}</span>
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-4">
            <NavLink to="/dashboard" className={linkClass}>{t('navigation.dashboard')}</NavLink>
            <NavLink to="/account" className={linkClass}>{t('navigation.account')}</NavLink>
          </div>
        </nav>
      </header>
      
      <main className="flex-1 container mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
