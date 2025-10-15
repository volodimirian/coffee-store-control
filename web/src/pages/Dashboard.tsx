import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t('pages.dashboard.title')}</h1>
      <p>{t('pages.dashboard.description')}</p>
    </div>
  );
}
