import { useQuery } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { fetchHealth } from "~/shared/api/health";

export default function Home() {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth
});

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('navigation.home')}</h1>
      {isLoading && <div className="p-3 bg-gray-100 rounded">{t('common.loading')}</div>}
      {isError && <div className="p-3 bg-red-100 text-red-700 rounded">Backend error</div>}
      {data && (
        <div className="p-3 bg-green-100 text-green-800 rounded">
          /health: <b>{data.status}</b>
        </div>
      )}
    </div>
  );
}
