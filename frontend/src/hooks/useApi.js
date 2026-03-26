import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useApi – generic hook that wraps any async API function.
 *
 * @param {Function}  apiFn     - Async function that returns data
 * @param {Array}     deps      - Dependency array (re-fetches when deps change)
 * @param {object}    [options]
 * @param {boolean}   [options.immediate=true] - Call apiFn immediately on mount
 * @param {any}       [options.defaultData]    - Default data value
 *
 * @returns {{ data, loading, error, refetch, setData }}
 */
export function useApi(apiFn, deps = [], { immediate = true, defaultData = null } = {}) {
  const [data, setData]       = useState(defaultData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError]     = useState(null);
  const mountedRef            = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetch = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiFn(...args);
      if (mountedRef.current) setData(result);
      return result;
    } catch (err) {
      if (mountedRef.current) setError(err?.message || 'An error occurred');
      return null;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetch]);

  return { data, loading, error, refetch: fetch, setData };
}

export default useApi;
