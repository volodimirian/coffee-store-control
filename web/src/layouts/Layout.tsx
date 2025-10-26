import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useAppContext } from "~/shared/context/AppContext";
import { hasToken } from "~/shared/lib/helpers/storageHelpers";
import { useTranslation } from 'react-i18next';
import LanguageSelector from "~/shared/ui/LanguageSelector";
import Sidebar from "~/components/Sidebar";
import LocationIndicator from "~/components/LocationIndicator";

export default function Layout() {
  const navigate = useNavigate();
  const { user, setUser } = useAppContext();
  const { t } = useTranslation();
  
  // Check if user is authenticated (either has user data or valid token)
  const isAuthenticated = Boolean(user || hasToken());
  
  // Custom logout function that updates context
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    navigate("/");
  };
  
  // Sidebar state management
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState !== null) {
      setIsSidebarCollapsed(JSON.parse(savedState));
    }
  }, []);

  // Save sidebar state to localStorage
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar - only for authenticated users */}
      {isAuthenticated && (
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggle={toggleSidebar}
          isMobileOpen={isMobileSidebarOpen}
          onMobileClose={closeMobileSidebar}
        />
      )}

      {/* Main content area */}
      <div className={`lg:transition-all lg:duration-300 lg:ease-in-out ${
        isAuthenticated ? (isSidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64') : ''
      }`}>
        {/* Top header bar */}
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left side: Logo (when sidebar collapsed) or Mobile menu button */}
            <div className="flex items-center">
              {/* Mobile menu button - only for authenticated users */}
              {isAuthenticated && (
                <button
                  onClick={toggleMobileSidebar}
                  className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
                  aria-label={t('navigation.openSidebar')}
                >
                  <Bars3Icon className="w-6 h-6" />
                </button>
              )}
              
              {/* Desktop logo - show when sidebar is collapsed OR when not authenticated */}
              {(isSidebarCollapsed || !isAuthenticated) && (
                <div className="hidden lg:flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CC</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 ml-4">
                    {t('common.brandName')}
                  </span>
                </div>
              )}

              {/* Mobile logo - show when not authenticated */}
              {!isAuthenticated && (
                <div className="lg:hidden flex items-center">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">CC</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900 ml-4">
                    {t('common.brandName')}
                  </span>
                </div>
              )}
            </div>

            {/* Center: Current Location Indicator - only for authenticated users */}
            {isAuthenticated && <LocationIndicator />}

            {/* Right side: Language + Auth buttons */}
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              
              {/* Separator */}
              <div className="h-6 w-px bg-gray-200"></div>
              
              {/* Auth buttons */}
              {!isAuthenticated ? (
                <>
                  <button
                    className="px-3 py-2 rounded transition-colors border border-blue-200 text-blue-600 hover:bg-blue-50"
                    onClick={() => navigate("/register")}
                  >
                    {t('navigation.register')}
                  </button>
                  <button
                    className="px-3 py-2 rounded transition-colors bg-blue-600 text-white hover:bg-blue-700"
                    onClick={() => navigate("/login")}
                  >
                    {t('navigation.signIn')}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-sm text-gray-600">{t('greetings.hi', { username: user?.username })}</div>
                  <button
                    className="px-3 py-2 rounded transition-colors border border-gray-200 text-gray-600 hover:bg-gray-50"
                    onClick={handleLogout}
                  >
                    {t('navigation.logOut')}
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
