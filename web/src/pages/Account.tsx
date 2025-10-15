import { useTranslation } from 'react-i18next';

export default function Account() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">{t('pages.account.title')}</h1>
      <p>{t('pages.account.description')}</p>
    </div>
  );
}
