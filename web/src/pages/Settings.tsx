import { useTranslation } from 'react-i18next';

export default function Settings() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="mt-2 text-gray-600">{t('settings.description')}</p>
      </div>
      
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">{t('settings.applicationSettings')}</h3>
          
          <div className="space-y-6">
            {/* Language Settings */}
            <div>
              <label className="text-base font-medium text-gray-900">{t('settings.language')}</label>
              <p className="text-sm leading-5 text-gray-500">{t('settings.languageDescription')}</p>
              <fieldset className="mt-4">
                <legend className="sr-only">Language selection</legend>
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      id="english"
                      name="language"
                      type="radio"
                      defaultChecked
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="english" className="ml-3 block text-sm font-medium text-gray-700">
                      {t('settings.english')}
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      id="russian"
                      name="language"
                      type="radio"
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
                    />
                    <label htmlFor="russian" className="ml-3 block text-sm font-medium text-gray-700">
                      {t('settings.russian')}
                    </label>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Notifications */}
            <div>
              <label className="text-base font-medium text-gray-900">{t('settings.notifications')}</label>
              <p className="text-sm leading-5 text-gray-500">{t('settings.notificationsDescription')}</p>
              <fieldset className="mt-4">
                <legend className="sr-only">Notification settings</legend>
                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="email-notifications"
                        name="email-notifications"
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="email-notifications" className="font-medium text-gray-700">
                        {t('settings.emailNotifications')}
                      </label>
                      <p className="text-gray-500">{t('settings.emailNotificationsDescription')}</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="push-notifications"
                        name="push-notifications"
                        type="checkbox"
                        className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="push-notifications" className="font-medium text-gray-700">
                        {t('settings.pushNotifications')}
                      </label>
                      <p className="text-gray-500">{t('settings.pushNotificationsDescription')}</p>
                    </div>
                  </div>
                </div>
              </fieldset>
            </div>

            {/* Business Settings */}
            <div>
              <label className="text-base font-medium text-gray-900">{t('settings.businessInformation')}</label>
              <p className="text-sm leading-5 text-gray-500">{t('settings.businessDescription')}</p>
              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="business-name" className="block text-sm font-medium text-gray-700">
                    {t('settings.businessName')}
                  </label>
                  <input
                    type="text"
                    name="business-name"
                    id="business-name"
                    placeholder={t('settings.businessNamePlaceholder')}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label htmlFor="business-address" className="block text-sm font-medium text-gray-700">
                    {t('settings.address')}
                  </label>
                  <textarea
                    id="business-address"
                    name="business-address"
                    rows={3}
                    placeholder={t('settings.addressPlaceholder')}
                    className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {t('settings.saveSettings')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
