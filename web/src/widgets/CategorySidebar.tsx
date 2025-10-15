import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCategories } from '../shared/api/categories';
import type { Category } from '../shared/api/types';

interface CategorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategorySidebar({ isOpen, onClose }: CategorySidebarProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCategory, setHoveredCategory] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Enhanced close function that also clears subcategories
  const handleClose = useCallback(() => {
    setHoveredCategory(null); // Clear subcategories
    onClose(); // Close sidebar
  }, [onClose]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const categories = await getCategories();
      setCategories(categories);
    } catch (error) {
      console.error('Failed to load categories:', error);
      setError(t('errors.FAILED_TO_LOAD_CATEGORIES'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const generateSlug = (name: string) => {
    return name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  };

  const handleCategoryHover = (categoryId: number) => {
    // Only change if hovering different category
    if (hoveredCategory !== categoryId) {
      setHoveredCategory(categoryId);
    }
  };

  const handleOutsideClick = useCallback((event: MouseEvent) => {
    const target = event.target as Node;
    const sidebarElement = sidebarRef.current;
    
    // Check if click is outside sidebar
    if (sidebarElement && !sidebarElement.contains(target)) {     
      // Click is truly outside both sidebar and subcategories
      setHoveredCategory(null);
      if (isOpen) {
        handleClose();
      }
    }
  }, [isOpen, handleClose]);

  // Add click outside listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }
  }, [isOpen, handleOutsideClick]);

  // Clear subcategories when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setHoveredCategory(null);
    }
  }, [isOpen]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed top-30 left-0 right-0 bottom-0 z-40"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.2)' }}
          onClick={handleClose}
        />
      )}
      
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className={`
          fixed top-30 left-0 h-[calc(100vh-7.5rem)] w-80 bg-white shadow-lg transform transition-transform duration-300 z-50
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        style={{ overflow: 'visible' }}
      >
        <div className="h-full flex flex-col relative" style={{ overflow: 'visible' }}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              {t('navigation.categories')}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto" style={{ overflowX: 'visible' }}>
            <div className="relative" style={{ overflow: 'visible' }}>
              {loading ? (
                <div className="p-4">{t('common.loading')}</div>
              ) : error ? (
                <div className="p-4 text-red-500">{error}</div>
              ) : (
                <div className="space-y-0 relative">
                  {categories.map((category) => (
                    <div 
                      key={category.id} 
                      className="relative group"
                      onMouseEnter={() => handleCategoryHover(category.id)}
                    >
                      <Link
                        to={`/category/${generateSlug(category.name)}`}
                        className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100"
                        onClick={handleClose}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-800">{category.name}</span>
                          {category.subcategories && category.subcategories.length > 0 && (
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                            </svg>
                          )}
                        </div>
                      </Link>
                      
                      {/* Second level dropdown */}
                      {hoveredCategory === category.id && category.subcategories && category.subcategories.length > 0 && (
                        <div 
                          data-subcategories-panel="true"
                          className="fixed w-80 bg-white shadow-xl border border-gray-200 overflow-y-auto"
                          onMouseEnter={() => setHoveredCategory(category.id)}
                          style={{ 
                            left: '320px',
                            top: '0',
                            bottom: '0',
                            zIndex: 9999,
                            height: '100vh',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <div className="p-4 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900">{category.name}</h3>
                          </div>
                          <div className="py-2">
                            {category.subcategories?.map((subcategory) => (
                              <Link
                                key={subcategory.id}
                                to={`/category/${generateSlug(category.name)}/${generateSlug(subcategory.name)}`}
                                className="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 text-gray-700"
                                onClick={handleClose}
                              >
                                {subcategory.name}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
