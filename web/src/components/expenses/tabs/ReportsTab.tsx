import { ChartBarIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

export default function ReportsTab() {
  return (
    <div className="space-y-6">
      <div className="text-center py-12">
        <ChartBarIcon className="mx-auto h-16 w-16 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Отчеты в разработке
        </h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Здесь будут доступны различные отчеты и аналитика по расходам.
          Функционал будет добавлен в следующих обновлениях.
        </p>
        
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-3xl mx-auto">
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm opacity-50">
            <div className="flex items-center space-x-3">
              <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Экспорт в Excel
                </p>
                <p className="text-sm text-gray-500">
                  Скоро будет доступен
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm opacity-50">
            <div className="flex items-center space-x-3">
              <DocumentArrowDownIcon className="h-6 w-6 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Экспорт в PDF
                </p>
                <p className="text-sm text-gray-500">
                  Скоро будет доступен
                </p>
              </div>
            </div>
          </div>
          
          <div className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm opacity-50">
            <div className="flex items-center space-x-3">
              <ChartBarIcon className="h-6 w-6 text-gray-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  Аналитика
                </p>
                <p className="text-sm text-gray-500">
                  Скоро будет доступен
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
