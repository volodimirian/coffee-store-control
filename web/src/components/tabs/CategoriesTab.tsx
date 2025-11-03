import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import {
  expenseSectionsApi,
  expenseCategoriesApi,
  monthPeriodsApi,
  type ExpenseSection,
  type ExpenseCategory,
  type MonthPeriod,
} from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import { getShowInactivePreference, setShowInactivePreference } from '~/shared/lib/helpers/storageHelpers';
import SectionModal from '~/components/modals/SectionModal';
import CategoryModal from '~/components/modals/CategoryModal';
import ConfirmDeleteModal from '~/components/modals/ConfirmDeleteModal';

interface SectionWithCategories extends ExpenseSection {
  categories: ExpenseCategory[];
  inactiveCategories: ExpenseCategory[];
}

interface SectionCardProps {
  section: SectionWithCategories;
  showInactive: boolean;
  onAddCategory: (sectionId: number) => void;
  onEditCategory: (category: ExpenseCategory) => void;
  onEditSection: (section: ExpenseSection) => void;
  onDeleteSection: (sectionId: number) => void;
  onToggleSectionStatus: (sectionId: number, isActive: boolean) => void;
  onDeleteCategory: (categoryId: number, sectionId: number) => void;
  onToggleCategoryStatus: (categoryId: number, isActive: boolean) => void;
  isActive: boolean;
  t: (key: string, options?: Record<string, unknown>) => string;
}

function SectionCard({
  section,
  showInactive,
  onAddCategory,
  onEditCategory,
  onEditSection,
  onDeleteSection,
  onToggleSectionStatus,
  onDeleteCategory,
  onToggleCategoryStatus,
  isActive,
  t
}: SectionCardProps) {
  return (
    <div className={`bg-white shadow rounded-lg border overflow-hidden ${!isActive ? 'opacity-75' : ''}`}>
      {/* Section Header */}
      <div className={`px-4 py-3 border-b border-gray-200 ${isActive ? 'bg-green-50' : 'bg-gray-50'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex flex-col">
              <h3 className={`text-lg font-medium ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                {section.name}
              </h3>
              <p className={`text-xs ${isActive ? 'text-gray-500' : 'text-gray-400'} mt-1`}>
                {t('common.order')}: {section.order_index}
              </p>
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
            }`}>
              {t('expenses.categories.categoriesCount', { count: section.categories.length })}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {isActive ? (
              <button
                onClick={() => onToggleSectionStatus(section.id, true)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
                title={t('expenses.categories.deactivateSection')}
              >
                <EyeSlashIcon className="h-3 w-3 mr-1" />
                {t('expenses.categories.deactivate')}
              </button>
            ) : (
              <button
                onClick={() => onToggleSectionStatus(section.id, false)}
                className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                title={t('expenses.categories.activateSection')}
              >
                <EyeIcon className="h-3 w-3 mr-1" />
                {t('expenses.categories.activate')}
              </button>
            )}
            <button
              onClick={() => onAddCategory(section.id)}
              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              {t('expenses.categories.addCategory')}
            </button>
            {isActive && (
              <button 
                onClick={() => onEditSection(section)}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                title={t('expenses.categories.editSection')}
              >
                <PencilIcon className="h-4 w-4" />
              </button>
            )}
            <button 
              onClick={() => onDeleteSection(section.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 py-5 sm:p-6">
        {/* Active Categories */}
        {section.categories.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              {t('expenses.categories.activeCategories')} ({section.categories.length})
            </h4>
            <div className="grid gap-3">
              {section.categories.map((category) => (
                <div
                  key={category.id}
                  className="border border-green-200 bg-green-50 rounded-lg p-3 hover:bg-green-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900">
                        {category.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        {t('common.order')}: {category.order_index}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onToggleCategoryStatus(category.id, true)}
                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-orange-700 bg-orange-100 hover:bg-orange-200 rounded-md transition-colors"
                        title={t('expenses.categories.deactivate')}
                      >
                        <EyeSlashIcon className="h-3 w-3 mr-1" />
                        {t('expenses.categories.deactivate')}
                      </button>
                      <button 
                        onClick={() => onEditCategory(category)}
                        className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title={t('expenses.categories.editCategory')}
                      >
                        <PencilIcon className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => onDeleteCategory(category.id, section.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Inactive Categories (Collapsible) */}
        {showInactive && section.inactiveCategories.length > 0 && (
          <div className={section.categories.length > 0 ? "border-t border-gray-200 pt-6" : ""}>
            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center">
              <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
              {t('expenses.categories.inactiveCategories')} ({section.inactiveCategories.length})
            </h4>
            <div className="grid gap-3">
              {section.inactiveCategories.map((category) => (
                <div
                  key={category.id}
                  className="border border-gray-200 bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-600">
                        {category.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {t('common.order')}: {category.order_index}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Category activation button is only available in active sections */}
                      {isActive && (
                        <button
                          onClick={() => onToggleCategoryStatus(category.id, false)}
                          className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-700 bg-green-100 hover:bg-green-200 rounded-md transition-colors"
                          title={t('expenses.categories.activate')}
                        >
                          <EyeIcon className="h-3 w-3 mr-1" />
                          {t('expenses.categories.activate')}
                        </button>
                      )}
                      <button 
                        onClick={() => onDeleteCategory(category.id, section.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No categories in section */}
        {section.categories.length === 0 && section.inactiveCategories.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">{t('expenses.categories.noCategories')}</p>
            <button
              onClick={() => onAddCategory(section.id)}
              className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <PlusIcon className="h-3 w-3 mr-1" />
              {t('expenses.categories.addFirstCategory')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CategoriesTab() {
  const { t } = useTranslation();
  const [activeSections, setActiveSections] = useState<SectionWithCategories[]>([]);
  const [inactiveSections, setInactiveSections] = useState<SectionWithCategories[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<MonthPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize showInactive from localStorage, default to false (hide inactive)
  const [showInactive, setShowInactive] = useState(() => getShowInactivePreference());
  
  // Modals
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isEditSectionModalOpen, setIsEditSectionModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [isConfirmDeleteModalOpen, setIsConfirmDeleteModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [selectedSection, setSelectedSection] = useState<ExpenseSection | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [deleteType, setDeleteType] = useState<'section' | 'category'>('section');
  const [deleteItemName, setDeleteItemName] = useState<string>('');
  const [pendingDeleteAction, setPendingDeleteAction] = useState<(() => Promise<void>) | null>(null);


  const { currentLocation } = useAppContext();

  // Sorting functions - match backend logic exactly
  // Backend SQL: ORDER BY order_index, name
  // This ensures consistent sorting when order_index values are identical
  const sortSections = (sections: SectionWithCategories[]) => {
    return sections.sort((a, b) => {
      // First sort by order_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      // If order_index is the same, sort by name (alphabetically)
      return a.name.localeCompare(b.name);
    });
  };

  const sortCategories = (categories: ExpenseCategory[]) => {
    return categories.sort((a, b) => {
      // First sort by order_index
      if (a.order_index !== b.order_index) {
        return a.order_index - b.order_index;
      }
      // If order_index is the same, sort by name (alphabetically)
      return a.name.localeCompare(b.name);
    });
  };

  // Load current active period and sections
  const loadData = useCallback(async () => {
    if (!currentLocation?.id) return;

    setIsLoading(true);
    setError(null);

    try {
              // Get current active period
      const periodsResponse = await monthPeriodsApi.list({
        business_id: currentLocation.id,
        status: 'active',
        is_active: true,
        limit: 1,
      });

      if (periodsResponse.periods.length === 0) {
        setError(t('expenses.categories.noActivePeriod'));
        return;
      }

      const period = periodsResponse.periods[0];
      setCurrentPeriod(period);

      // Get sections for this period
      const sectionsResponse = await expenseSectionsApi.list({
        business_id: currentLocation.id,
        include_categories: true
      });

      // Load categories for each section and separate active/inactive sections
      const allSectionsWithCategories: SectionWithCategories[] = await Promise.all(
        sectionsResponse.sections.map(async (section) => {
          try {
            // Get ALL categories (both active and inactive) for the section
            const categoriesResponse = await expenseCategoriesApi.listBySection(section.id, {
              // Explicitly set is_active to undefined to get both active and inactive categories
              is_active: undefined,
            });
            const allCategories = categoriesResponse.categories;
            
            return {
              ...section,
              // Active categories: only if both category and section are active
              categories: sortCategories(allCategories.filter(cat => cat.is_active && section.is_active)),
              // Inactive categories: if category is inactive OR section is inactive
              inactiveCategories: sortCategories(allCategories.filter(cat => !cat.is_active || !section.is_active)),
            };
          } catch (err) {
            console.error(`Error loading categories for section ${section.id}:`, err);
            return {
              ...section,
              categories: [],
              inactiveCategories: [],
            };
          }
        })
      );

      // Separate active and inactive sections and sort them
      const activeSecs = sortSections(allSectionsWithCategories.filter(section => section.is_active));
      const inactiveSecs = sortSections(allSectionsWithCategories.filter(section => !section.is_active));
      
      setActiveSections(activeSecs);
      setInactiveSections(inactiveSecs);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : t('expenses.categories.loadingError'));
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation?.id, t]);

  useEffect(() => {
    if (currentLocation?.id) {
      loadData();
    }
  }, [currentLocation?.id, t, loadData]);

  const handleSectionAdded = (newSection: ExpenseSection) => {
    setActiveSections(prev => sortSections([...prev, { ...newSection, categories: [], inactiveCategories: [] }]));
  };

  const handleDeleteSection = (sectionId: number, isActive: boolean) => {
    // Find section to get its name
    const section = isActive 
      ? activeSections.find(s => s.id === sectionId)
      : inactiveSections.find(s => s.id === sectionId);
    
    const sectionName = section ? section.name : '';

    setDeleteType('section');
    setDeleteItemName(sectionName);
    setPendingDeleteAction(() => async () => {
      await expenseSectionsApi.hardDelete(sectionId);
      
      if (isActive) {
        setActiveSections(prev => prev.filter(section => section.id !== sectionId));
      } else {
        setInactiveSections(prev => prev.filter(section => section.id !== sectionId));
      }
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (pendingDeleteAction) {
      try {
        await pendingDeleteAction();
        setIsConfirmDeleteModalOpen(false);
        setPendingDeleteAction(null);
      } catch (err) {
        console.error(`Error deleting ${deleteType}:`, err);
        alert(t(`expenses.categories.errorDelete${deleteType === 'section' ? 'Section' : 'Category'}`));
      }
    }
  };

  const handleToggleSectionStatus = async (sectionId: number, isActive: boolean) => {
    try {
      if (isActive) {
        await expenseSectionsApi.deactivate(sectionId);
      } else {
        await expenseSectionsApi.activate(sectionId);
      }

      if (isActive) {
        // Move from active to inactive
        const section = activeSections.find(s => s.id === sectionId);
        if (section) {
          setActiveSections(prev => prev.filter(s => s.id !== sectionId));
          // When deactivating a section, all categories become inactive
          const updatedSection = {
            ...section,
            is_active: false,
            categories: [], // Clear active categories
            inactiveCategories: sortCategories([...section.categories, ...section.inactiveCategories]) // All categories become inactive
          };
          setInactiveSections(prev => sortSections([...prev, updatedSection]));
        }
      } else {
        // Move from inactive to active
        const section = inactiveSections.find(s => s.id === sectionId);
        if (section) {
          setInactiveSections(prev => prev.filter(s => s.id !== sectionId));
          
          // ВАЖНО: При активации секции нужно получить актуальное состояние категорий с сервера,
          // так как на бэкенде категории могли остаться деактивированными
          try {
            const categoriesResponse = await expenseCategoriesApi.listBySection(sectionId, {
              is_active: undefined, // Получаем все категории
            });
            const allCategories = categoriesResponse.categories;
            
            const updatedSection = {
              ...section,
              is_active: true,
              // Active categories: только те, которые действительно активны на бэкенде
              categories: sortCategories(allCategories.filter(cat => cat.is_active)),
              // Inactive categories: только те, которые действительно неактивны на бэкенде
              inactiveCategories: sortCategories(allCategories.filter(cat => !cat.is_active)),
            };
            setActiveSections(prev => sortSections([...prev, updatedSection]));
          } catch (err) {
            console.error('Error reloading categories after section activation:', err);
            // Fallback: если не удалось загрузить категории, показываем все как неактивные
            const allSectionCategories = [...section.categories, ...section.inactiveCategories];
            const updatedSection = {
              ...section,
              is_active: true,
              categories: [],
              inactiveCategories: sortCategories(allSectionCategories.map(cat => ({ ...cat, is_active: false }))),
            };
            setActiveSections(prev => sortSections([...prev, updatedSection]));
          }
        }
      }
    } catch (error) {
      console.error('Failed to toggle section status:', error);
    }
  };

  const handleCategoryAdded = (newCategory: ExpenseCategory) => {
    const updateSection = (sections: SectionWithCategories[]) => 
      sections.map(section => 
        section.id === newCategory.section_id 
          ? { ...section, categories: sortCategories([...section.categories, newCategory]) }
          : section
      );
    
    setActiveSections(updateSection);
    setInactiveSections(updateSection);
    setSelectedSectionId(null);
  };

  const handleAddCategory = (sectionId: number) => {
    setSelectedSectionId(sectionId);
    setIsAddCategoryModalOpen(true);
  };

  const handleEditCategory = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsEditCategoryModalOpen(true);
  };

  const handleCategoryUpdated = (updatedCategory: ExpenseCategory) => {
    const updateSections = (sections: SectionWithCategories[]) =>
      sections.map(section => {
        // Update in active categories
        const updatedActiveCategories = section.categories.map(cat =>
          cat.id === updatedCategory.id ? updatedCategory : cat
        );
        
        // Update in inactive categories
        const updatedInactiveCategories = section.inactiveCategories.map(cat =>
          cat.id === updatedCategory.id ? updatedCategory : cat
        );

        // If category status changed, move between active/inactive
        if (updatedCategory.is_active) {
          // Move to active if not already there
          const categoryInActive = updatedActiveCategories.find(cat => cat.id === updatedCategory.id);
          const categoryInInactive = updatedInactiveCategories.find(cat => cat.id === updatedCategory.id);
          
          if (!categoryInActive && categoryInInactive) {
            const newCategories = [...section.categories.filter(cat => cat.id !== updatedCategory.id), updatedCategory];
            return {
              ...section,
              categories: sortCategories(newCategories),
              inactiveCategories: section.inactiveCategories.filter(cat => cat.id !== updatedCategory.id)
            };
          }
        } else {
          // Move to inactive if not already there
          const categoryInActive = updatedActiveCategories.find(cat => cat.id === updatedCategory.id);
          const categoryInInactive = updatedInactiveCategories.find(cat => cat.id === updatedCategory.id);
          
          if (categoryInActive && !categoryInInactive) {
            const newInactiveCategories = [...section.inactiveCategories.filter(cat => cat.id !== updatedCategory.id), updatedCategory];
            return {
              ...section,
              categories: section.categories.filter(cat => cat.id !== updatedCategory.id),
              inactiveCategories: sortCategories(newInactiveCategories)
            };
          }
        }

        return {
          ...section,
          categories: sortCategories(updatedActiveCategories),
          inactiveCategories: sortCategories(updatedInactiveCategories)
        };
      });

    setActiveSections(updateSections);
    setInactiveSections(updateSections);
  };

  const handleEditSection = (section: ExpenseSection) => {
    setSelectedSection(section);
    setIsEditSectionModalOpen(true);
  };

  const handleSectionUpdated = (updatedSection: ExpenseSection) => {
    // Find the existing section to check if status changed
    const existingSection = [...activeSections, ...inactiveSections]
      .find(section => section.id === updatedSection.id);
    
    // If section status changed (active <-> inactive), reload all data
    // because when section becomes inactive, all its categories also become inactive
    if (existingSection && existingSection.is_active !== updatedSection.is_active) {
      loadData();
      return;
    }
    
    // Otherwise, just update the section data without changing categories
    const removeFromBothLists = (sections: SectionWithCategories[]) =>
      sections.filter(section => section.id !== updatedSection.id);
    
    let updatedActiveSections = removeFromBothLists(activeSections);
    let updatedInactiveSections = removeFromBothLists(inactiveSections);
    
    if (existingSection) {
      const sectionWithCategories = {
        ...existingSection,
        ...updatedSection
      };
      
      // Add to the appropriate list based on active status
      if (updatedSection.is_active) {
        updatedActiveSections = [...updatedActiveSections, sectionWithCategories];
      } else {
        updatedInactiveSections = [...updatedInactiveSections, sectionWithCategories];
      }
    }
    
    setActiveSections(sortSections(updatedActiveSections));
    setInactiveSections(sortSections(updatedInactiveSections));
  };

  const handleDeleteCategory = (categoryId: number, sectionId: number) => {
    // Find category to get its name
    const allSections = [...activeSections, ...inactiveSections];
    let categoryName = '';
    
    for (const section of allSections) {
      const category = [...section.categories, ...section.inactiveCategories]
        .find(cat => cat.id === categoryId);
      if (category) {
        categoryName = category.name;
        break;
      }
    }

    setDeleteType('category');
    setDeleteItemName(categoryName);
    setSelectedSectionId(sectionId);
    setSelectedCategory({ id: categoryId } as ExpenseCategory);
    setPendingDeleteAction(() => async () => {
      await expenseCategoriesApi.delete(categoryId);
      const updateSections = (sections: SectionWithCategories[]) =>
        sections.map(section => 
          section.id === sectionId 
            ? { 
                ...section, 
                categories: section.categories.filter(cat => cat.id !== categoryId),
                inactiveCategories: section.inactiveCategories.filter(cat => cat.id !== categoryId)
              }
            : section
        );
      
      setActiveSections(updateSections);
      setInactiveSections(updateSections);
    });
    setIsConfirmDeleteModalOpen(true);
  };

  const handleToggleCategoryStatus = async (categoryId: number, isActive: boolean) => {
    try {
      if (isActive) {
        await expenseCategoriesApi.deactivate(categoryId);
      } else {
        await expenseCategoriesApi.activate(categoryId);
      }

      const updateSections = (sections: SectionWithCategories[]) =>
        sections.map(section => {
          const activeCategory = section.categories.find(cat => cat.id === categoryId);
          const inactiveCategory = section.inactiveCategories.find(cat => cat.id === categoryId);
          
          if (activeCategory) {
            // Move from active to inactive
            return {
              ...section,
              categories: section.categories.filter(cat => cat.id !== categoryId),
              inactiveCategories: sortCategories([...section.inactiveCategories, { ...activeCategory, is_active: false }])
            };
          } else if (inactiveCategory) {
            // Move from inactive to active
            return {
              ...section,
              categories: sortCategories([...section.categories, { ...inactiveCategory, is_active: true }]),
              inactiveCategories: section.inactiveCategories.filter(cat => cat.id !== categoryId)
            };
          }
          
          return section;
        });

      setActiveSections(updateSections);
      setInactiveSections(updateSections);
    } catch (error) {
      console.error('Failed to toggle category status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">{t('expenses.categories.loadingData')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <div className="text-sm text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">{t('expenses.categories.title')}</h2>
          <p className="text-sm text-gray-500">
            {t('expenses.categories.description')}
            {currentPeriod && (
              <span className="ml-2 font-medium text-blue-600">
                ({currentPeriod.name})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Toggle for showing all inactive elements */}
          <button
            onClick={() => {
              const newShowInactive = !showInactive;
              setShowInactive(newShowInactive);
              // Save to localStorage
              setShowInactivePreference(newShowInactive);
            }}
            title={showInactive ? 
              t('expenses.categories.hideAllInactiveTooltip') : 
              t('expenses.categories.showAllInactiveTooltip')
            }
            className={`inline-flex items-center px-3 py-2 border rounded-md text-sm font-medium transition-colors ${
              showInactive
                ? 'border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100'
                : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
            }`}
          >
            {showInactive ? (
              <>
                <EyeSlashIcon className="h-4 w-4 mr-2" />
                {t('expenses.categories.hideAllInactive')}
              </>
            ) : (
              <>
                <EyeIcon className="h-4 w-4 mr-2" />
                {t('expenses.categories.showAllInactive')}
              </>
            )}
          </button>
          
          <button
            onClick={() => setIsAddSectionModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('expenses.categories.addSection')}
          </button>
        </div>
      </div>

      {/* Sections and Categories */}
      {activeSections.length === 0 && inactiveSections.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('expenses.categories.noSections')}</p>
          <button
            onClick={() => setIsAddSectionModalOpen(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('expenses.categories.createFirstSection')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Sections */}
          {activeSections.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                {t('expenses.categories.activeSections')} ({activeSections.length})
              </h3>
              {activeSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  showInactive={showInactive}
                  onAddCategory={handleAddCategory}
                  onEditCategory={handleEditCategory}
                  onEditSection={handleEditSection}
                  onDeleteSection={(sectionId) => handleDeleteSection(sectionId, true)}
                  onToggleSectionStatus={handleToggleSectionStatus}
                  onDeleteCategory={handleDeleteCategory}
                  onToggleCategoryStatus={handleToggleCategoryStatus}
                  isActive={true}
                  t={t}
                />
              ))}
            </div>
          )}

          {/* Inactive Sections (Collapsible) */}
          {showInactive && inactiveSections.length > 0 && (
            <div className={activeSections.length > 0 ? "border-t border-gray-200 pt-6" : ""}>
              <h3 className="text-lg font-medium text-gray-500 mb-4 flex items-center">
                <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>
                {t('expenses.categories.inactiveSections')} ({inactiveSections.length})
              </h3>
              <div className="space-y-4">
                {inactiveSections.map((section) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  showInactive={showInactive}
                  onAddCategory={handleAddCategory}
                  onEditCategory={handleEditCategory}
                  onEditSection={handleEditSection}
                  onDeleteSection={(sectionId) => handleDeleteSection(sectionId, false)}
                  onToggleSectionStatus={handleToggleSectionStatus}
                  onDeleteCategory={handleDeleteCategory}
                  onToggleCategoryStatus={handleToggleCategoryStatus}
                  isActive={false}
                  t={t}
                />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <SectionModal
        mode="create"
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        onSectionAdded={handleSectionAdded}
      />

      <SectionModal
        mode="edit"
        isOpen={isEditSectionModalOpen}
        onClose={() => {
          setIsEditSectionModalOpen(false);
          setSelectedSection(null);
        }}
        section={selectedSection}
        onSectionUpdated={handleSectionUpdated}
      />

      <CategoryModal
        mode="create"
        isOpen={isAddCategoryModalOpen}
        onClose={() => {
          setIsAddCategoryModalOpen(false);
          setSelectedSectionId(null);
        }}
        sectionId={selectedSectionId || 0}
        onCategoryAdded={handleCategoryAdded}
      />

      <CategoryModal
        mode="edit"
        isOpen={isEditCategoryModalOpen}
        onClose={() => {
          setIsEditCategoryModalOpen(false);
          setSelectedCategory(null);
        }}
        category={selectedCategory}
        onCategoryUpdated={handleCategoryUpdated}
      />

      <ConfirmDeleteModal
        isOpen={isConfirmDeleteModalOpen}
        onClose={() => {
          setIsConfirmDeleteModalOpen(false);
          setPendingDeleteAction(null);
        }}
        onConfirm={handleConfirmDelete}
        type={deleteType}
        itemName={deleteItemName}
      />
    </div>
  );
}
