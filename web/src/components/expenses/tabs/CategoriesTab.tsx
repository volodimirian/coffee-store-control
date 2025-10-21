import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import {
  expenseSectionsApi,
  expenseCategoriesApi,
  monthPeriodsApi,
  type ExpenseSection,
  type ExpenseCategory,
  type MonthPeriod,
} from '~/shared/api';
import { useAppContext } from '~/shared/context/AppContext';
import AddSectionModal from '~/components/expenses/modals/AddSectionModal';
import AddCategoryModal from '~/components/expenses/modals/AddCategoryModal';

interface SectionWithCategories extends ExpenseSection {
  categories: ExpenseCategory[];
}

export default function CategoriesTab() {
  const { t } = useTranslation();
  const [sections, setSections] = useState<SectionWithCategories[]>([]);
  const [currentPeriod, setCurrentPeriod] = useState<MonthPeriod | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modals
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);

  const { currentLocation } = useAppContext();

  // Load current active period and sections
  useEffect(() => {
    const loadData = async () => {
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

        // Load categories for each section
        const sectionsWithCategories: SectionWithCategories[] = await Promise.all(
          sectionsResponse.sections.map(async (section) => {
            try {
              const categoriesResponse = await expenseCategoriesApi.listBySection(section.id);
              return {
                ...section,
                categories: categoriesResponse.categories,
              };
            } catch (err) {
              console.error(`Error loading categories for section ${section.id}:`, err);
              return {
                ...section,
                categories: [],
              };
            }
          })
        );

        setSections(sectionsWithCategories);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : t('expenses.categories.loadingError'));
      } finally {
        setIsLoading(false);
      }
    };

    if (currentLocation?.id) {
      loadData();
    }
  }, [currentLocation?.id, t]);

  const handleSectionAdded = (newSection: ExpenseSection) => {
    setSections(prev => [...prev, { ...newSection, categories: [] }]);
  };

  const handleCategoryAdded = (newCategory: ExpenseCategory) => {
    setSections(prev => prev.map(section => 
      section.id === newCategory.section_id 
        ? { ...section, categories: [...section.categories, newCategory] }
        : section
    ));
    setSelectedSectionId(null);
  };

  const handleAddCategory = (sectionId: number) => {
    setSelectedSectionId(sectionId);
    setIsAddCategoryModalOpen(true);
  };

  const handleDeleteSection = async (sectionId: number) => {
    if (!confirm(t('expenses.categories.confirmDeleteSection'))) return;

    try {
      await expenseSectionsApi.delete(sectionId);
      setSections(prev => prev.filter(section => section.id !== sectionId));
    } catch (err) {
      console.error('Error deleting section:', err);
      alert(t('expenses.categories.errorDeleteSection'));
    }
  };

  const handleDeleteCategory = async (categoryId: number, sectionId: number) => {
    if (!confirm(t('expenses.categories.confirmDeleteCategory'))) return;

    try {
      await expenseCategoriesApi.delete(categoryId);
      setSections(prev => prev.map(section => 
        section.id === sectionId 
          ? { ...section, categories: section.categories.filter(cat => cat.id !== categoryId) }
          : section
      ));
    } catch (err) {
      console.error('Error deleting category:', err);
      alert(t('expenses.categories.errorDeleteCategory'));
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
        <button
          onClick={() => setIsAddSectionModalOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('expenses.categories.addSection')}
        </button>
      </div>

      {/* Sections and Categories */}
      {sections.length === 0 ? (
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
          {sections.map((section) => (
            <div key={section.id} className="bg-white shadow rounded-lg border overflow-hidden">
              {/* Section Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {section.name}
                    </h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {t('expenses.categories.categoriesCount', { count: section.categories.length })}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAddCategory(section.id)}
                      className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      {t('expenses.categories.addCategory')}
                    </button>
                    <button 
                      onClick={() => handleDeleteSection(section.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Categories */}
              <div className="px-4 py-5 sm:p-6">
                {section.categories.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">{t('expenses.categories.noCategories')}</p>
                    <button
                      onClick={() => handleAddCategory(section.id)}
                      className="mt-2 inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200"
                    >
                      <PlusIcon className="h-3 w-3 mr-1" />
                      {t('expenses.categories.addFirstCategory')}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {section.categories.map((category) => (
                      <div
                        key={category.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50"
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
                            <button className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <PencilIcon className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(category.id, section.id)}
                              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <TrashIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <AddSectionModal
        isOpen={isAddSectionModalOpen}
        onClose={() => setIsAddSectionModalOpen(false)}
        onSectionAdded={handleSectionAdded}
      />

      <AddCategoryModal
        isOpen={isAddCategoryModalOpen}
        onClose={() => {
          setIsAddCategoryModalOpen(false);
          setSelectedSectionId(null);
        }}
        sectionId={selectedSectionId || 0}
        onCategoryAdded={handleCategoryAdded}
      />
    </div>
  );
}
