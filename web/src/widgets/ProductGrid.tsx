import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getProductsByCategory, getProductsBySubcategory } from "~/shared/api/products";
import type { Product } from "~/shared/api/types";

interface ProductGridProps {
  categoryId: number;
  subcategoryId?: number;
  title: string;
}

export default function ProductGrid({ categoryId, subcategoryId, title }: ProductGridProps) {
  const { t } = useTranslation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        console.log('Loading products for category:', categoryId, 'subcategory:', subcategoryId);
        
        // Load products by subcategory or category
        const results = subcategoryId 
          ? await getProductsBySubcategory(subcategoryId, { limit: 20 })
          : await getProductsByCategory(categoryId, { limit: 20 });
        
        console.log('API results:', results);
        setProducts(results.items || []);
      } catch (error) {
        console.error('Failed to load products:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [categoryId, subcategoryId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">{t('common.loading')}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <div className="text-sm text-gray-600">
          {products.length} {t('products.found')}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg">{t('products.noProductsFound')}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {products.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="aspect-square bg-gray-100 rounded-md mb-3 flex items-center justify-center">
                <span className="text-gray-400 text-sm">No Image</span>
              </div>
              
              <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                {product.title}
              </h3>
              
              {product.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">
                  ${product.price}
                </span>
                
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors">
                  {t('products.addToCart')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
