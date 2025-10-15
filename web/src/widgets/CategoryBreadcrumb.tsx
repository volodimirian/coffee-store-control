import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import type { Category, Subcategory } from "~/shared/api/types";

interface CategoryBreadcrumbProps {
  category: Category;
  subcategory?: Subcategory | null;
}

export default function CategoryBreadcrumb({ category, subcategory }: CategoryBreadcrumbProps) {
  const { t } = useTranslation();
  
  const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
      <Link 
        to="/" 
        className="hover:text-blue-600 transition-colors"
      >
        {t('navigation.home')}
      </Link>
      
      <span>/</span>
      
      <Link 
        to={`/category/${categorySlug}`}
        className="hover:text-blue-600 transition-colors"
      >
        {category.name}
      </Link>
      
      {subcategory && (
        <>
          <span>/</span>
          <span className="text-gray-900 font-medium">
            {subcategory.name}
          </span>
        </>
      )}
    </nav>
  );
}
