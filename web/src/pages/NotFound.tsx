import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

export default function NotFound() {
  const { t } = useTranslation();
  
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold">{t('pages.notFound.title')}</h1>
      <p>{t('pages.notFound.description')}</p>
      <Link to="/" className="text-blue-600 underline">{t('pages.notFound.goHome')}</Link>
    </div>
  );
}
