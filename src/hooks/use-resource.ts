/* eslint-disable react-hooks/exhaustive-deps, react-hooks/use-memo */
import { useCallback, useEffect, useState } from 'react';

export function useResource<T>(
  loader: () => Promise<T>,
  dependencies: readonly unknown[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (refresh = false) => {
      if (refresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      try {
        setData(await loader());
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Impossible de charger les données.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    dependencies
  );

  useEffect(() => {
    load();
  }, [load]);

  return {
    data,
    setData,
    loading,
    refreshing,
    error,
    reload: () => load(true),
  };
}
