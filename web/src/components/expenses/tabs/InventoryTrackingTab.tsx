import { useState } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  PlusIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

// Mock data - later we'll replace with API calls
const mockCategories = [
  {
    id: 1,
    name: 'КОФЕ',
    items: [
      { id: 1, name: 'Кофе' },
      { id: 2, name: 'Кофе' },
    ]
  },
  {
    id: 2,
    name: 'МОЛОКО',
    items: [
      { id: 3, name: 'Молоко' },
      { id: 4, name: 'Сливки' },
      { id: 5, name: 'Безлактозное' },
      { id: 6, name: 'Банановое' },
      { id: 7, name: 'Кокосовое' },
    ]
  },
  {
    id: 3,
    name: 'СИРОПЫ',
    items: [
      { id: 8, name: 'Карамель' },
      { id: 9, name: 'Соленая карамель' },
      { id: 10, name: 'Фундук' },
      { id: 11, name: 'Миндаль' },
      { id: 12, name: 'Фундук/Пекан' },
    ]
  }
];

export default function InventoryTrackingTab() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Calculate days of current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const handlePrevMonth = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow border">
        <div className="flex items-center space-x-4">
          {/* Month Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronLeftIcon className="h-5 w-5" />
            </button>
            
            <div className="text-lg font-semibold min-w-[200px] text-center">
              {format(currentDate, 'LLLL yyyy', { locale: ru })}
            </div>
            
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-gray-100 rounded-md"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200"
          >
            Сегодня
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1">
            <button className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500">
              <PlusIcon className="h-4 w-4 mr-1" />
              Товар
            </button>
            <button className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500">
              Раздел
            </button>
          </div>
          
          <button className="flex items-center px-3 py-2 text-sm bg-yellow-400 text-yellow-900 rounded-md hover:bg-yellow-500">
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Скачать в excel, ПДФ
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="sticky left-0 bg-gray-50 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r z-10">
                  Раздел/Товар
                </th>
                {monthDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-r min-w-[80px]"
                  >
                    <div>{format(day, 'd')}</div>
                    <div className="text-[10px] text-gray-400">
                      {format(day, 'MMM', { locale: ru })}
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Итого
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mockCategories.map((category) => (
                <>
                  {/* Category Header */}
                  <tr key={`category-${category.id}`} className="bg-blue-50">
                    <td className="sticky left-0 bg-blue-50 px-4 py-2 font-medium text-blue-900 border-r z-10">
                      {category.name}
                    </td>
                    {monthDays.map((day) => (
                      <td key={day.toISOString()} className="px-3 py-2 border-r bg-blue-50"></td>
                    ))}
                    <td className="px-4 py-2 text-center font-medium bg-blue-50"></td>
                  </tr>
                  
                  {/* Category Items */}
                  {category.items.map((item) => (
                    <tr key={`item-${item.id}`} className="hover:bg-gray-50">
                      <td className="sticky left-0 bg-white hover:bg-gray-50 px-4 py-2 text-sm text-gray-900 border-r z-10">
                        {item.name}
                      </td>
                      {monthDays.map((day) => (
                        <td key={day.toISOString()} className="px-3 py-2 border-r">
                          <input
                            type="number"
                            className="w-full p-1 text-center text-sm border-0 focus:ring-1 focus:ring-blue-500 rounded"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="px-4 py-2 text-center text-sm font-medium">
                        0
                      </td>
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Current Day Highlight and Add Form */}
      <div className="bg-yellow-100 border border-yellow-400 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-yellow-800">
              Выделение текущего дня недели
            </h3>
            <p className="text-sm text-yellow-700 mt-1">
              При добавлении «Раздела» в таблице добавляется новый раздел без ничего
            </p>
          </div>
          <div className="text-sm text-yellow-700">
            Сегодня: {format(new Date(), 'd MMMM yyyy', { locale: ru })}
          </div>
        </div>
      </div>
    </div>
  );
}
