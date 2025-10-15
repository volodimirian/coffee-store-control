import { Link } from "react-router-dom";
import type { Category, Subcategory } from "~/shared/api/types";

interface CategorySubcategoriesSidebarProps {
  category: Category;
  subcategories: Subcategory[];
  activeSubcategorySlug?: string;
}

export default function CategorySubcategoriesSidebar({ 
  category, 
  subcategories, 
  activeSubcategorySlug 
}: CategorySubcategoriesSidebarProps) {
  const categorySlug = category.name.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-64 bg-white border border-gray-200 rounded-lg p-4 h-fit">
      <h3 className="font-semibold text-lg mb-4 text-gray-900">
        {category.name}
      </h3>
      
      <nav className="space-y-2">
        {/* Links to subcategories */}
        {subcategories.map(subcategory => {
          const subcategorySlug = subcategory.name.toLowerCase().replace(/\s+/g, '-');
          const isActive = activeSubcategorySlug === subcategorySlug;
          
          return (
            <Link
              key={subcategory.id}
              to={`/category/${categorySlug}/${subcategorySlug}`}
              className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-700 font-medium' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {subcategory.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
