import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAppContext } from "~/shared/context/AppContext";
import { hasToken, logout } from "~/shared/lib/helpers";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "~/shared/ui/LanguageSelector";

const linkClass = ({ isActive }: { isActive: boolean }) =>
  "px-3 py-2 rounded transition-colors " +
  (isActive ? "bg-blue-800 text-white" : "text-white hover:bg-blue-700");

const authButtonClass = "px-3 py-2 rounded transition-colors border border-white/20 text-white hover:bg-white/10";

export default function Layout() {
  const navigate = useNavigate();
  const { user } = useAppContext();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main header with navigation and auth */}
      <header className="w-full bg-blue-600 text-white shadow">
        <nav className="w-full flex items-center justify-between h-16 px-8">
          {/* Left side: Logo + Navigation */}
          <div className="flex items-center space-x-8">
            <span className="font-bold text-xl">{t('common.brandName')}</span>
            <div className="flex items-center space-x-4">
              <NavLink to="/dashboard" className={linkClass}>{t('navigation.dashboard')}</NavLink>
              <NavLink to="/account" className={linkClass}>{t('navigation.account')}</NavLink>
            </div>
          </div>
          
          {/* Right side: Language + Auth buttons */}
          <div className="flex items-center space-x-4">
            <LanguageSelector />
            
            {/* Separator */}
            <div className="h-6 w-px bg-white/20"></div>
            
            {/* Auth buttons */}
            {!hasToken() ? (
              <>
                <button
                  className={authButtonClass}
                  onClick={() => navigate("/register")}
                >
                  {t('navigation.register')}
                </button>
                <button
                  className={authButtonClass}
                  onClick={() => navigate("/login")}
                >
                  {t('navigation.signIn')}
                </button>
              </>
            ) : (
              <>
                <div className="text-sm text-white/90">{t('greetings.hi', { username: user?.username })}</div>
                <button
                  className={authButtonClass}
                  onClick={logout}
                >
                  {t('navigation.logOut')}
                </button>
              </>
            )}
          </div>
        </nav>
      </header>
      
      <main className="flex-1 w-full px-8 py-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
