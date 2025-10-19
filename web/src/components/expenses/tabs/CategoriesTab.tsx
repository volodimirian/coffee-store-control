import { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

// Mock data for categories
const mockCategories = [
  {
    id: 1,
    name: 'Кофе',
    description: 'Все виды кофе и кофейных зерен',
    itemsCount: 2,
    defaultUnit: 'кг',
  },
  {
    id: 2,
    name: 'Молоко',
    description: 'Молочные продукты',
    itemsCount: 5,
    defaultUnit: 'л',
  },
  {
    id: 3,
    name: 'Сиропы',
    description: 'Сиропы и топинги',
    itemsCount: 5,
    defaultUnit: 'мл',
  },
];

export default function CategoriesTab() {
  const [categories] = useState(mockCategories);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Управление категориями</h2>
          <p className="text-sm text-gray-500">
            Создавайте и редактируйте разделы и подразделы для учета расходов
          </p>
        </div>
        <button
          onClick={() => setIsAddingCategory(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Добавить раздел
        </button>
      </div>

      {/* Categories List */}
      <div className="bg-white shadow rounded-lg border overflow-hidden">
        <div className="px-4 py-5 sm:p-6">
          <div className="grid gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-medium text-gray-900">
                        {category.name}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {category.itemsCount} товаров
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {category.defaultUnit}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Category Form */}
      {isAddingCategory && (
        <div className="bg-white shadow rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Добавить новый раздел
            </h3>
            
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Название раздела
                </label>
                <input
                  type="text"
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Например: Кофе"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Единица измерения по умолчанию
                </label>
                <select className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm">
                  <option>кг</option>
                  <option>г</option>
                  <option>л</option>
                  <option>мл</option>
                  <option>шт</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700">
                Описание
              </label>
              <textarea
                rows={3}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Описание раздела (необязательно)"
              />
            </div>
            
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                onClick={() => setIsAddingCategory(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  // TODO: Add category logic
                  setIsAddingCategory(false);
                }}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Создать раздел
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
