import { useTranslation } from 'react-i18next';

export default function Products() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('products.title')}</h1>
        <p className="mt-2 text-gray-600">{t('products.description')}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('products.noProductsYet')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('products.getStartedMessage')}</p>
          <div className="mt-6">
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              {t('products.addProduct')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
