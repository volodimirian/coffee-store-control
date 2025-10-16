import { useTranslation } from 'react-i18next';

export default function Orders() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('orders.title')}</h1>
        <p className="mt-2 text-gray-600">{t('orders.description')}</p>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5L20 18" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">{t('orders.noOrdersYet')}</h3>
          <p className="mt-1 text-sm text-gray-500">{t('orders.ordersMessage')}</p>
        </div>
      </div>
    </div>
  );
}
