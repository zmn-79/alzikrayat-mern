import { useCallback, useEffect, useState } from 'react';

/**
 * Runs an async loader inside useEffect with loading/error state and request
 * cancellation. `reload()` re-runs it (used by the "Try again" buttons).
 */
export function useAsync(loader, deps) {
  const [state, setState] = useState({ loading: true, error: null, data: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    loader(controller.signal)
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => {
        if (error.name !== 'AbortError') setState({ loading: false, error, data: null });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}
