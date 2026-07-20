import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function usePolling(queryKey, enabled, intervalMs = 3000) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => {
      queryClient.invalidateQueries({ queryKey });
    }, intervalMs);
    return () => clearInterval(id);
  }, [JSON.stringify(queryKey), enabled, intervalMs, queryClient]);
}