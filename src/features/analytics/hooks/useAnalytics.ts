import { useEffect, useState } from 'react';
import { ApiError }      from '../../../shared/lib/apiClient';
import { analyticsApi }   from '../api/analyticsApi';
import type { AnalyticsOverview } from '../types';

export function useAnalytics() {
  const [data,    setData]    = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    analyticsApi.getOverview()
      .then(d => { if (alive) setData(d); })
      .catch(err => { if (alive) setError(err instanceof ApiError ? err.message : "L'analyse n'a pas pu être chargée. Rechargez la page."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { data, loading, error };
}
