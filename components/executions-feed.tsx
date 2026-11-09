'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { loadExecutionsPage } from '@/app/(app)/executions/actions';
import { ExecutionsTable } from './executions-table';
import type { Execution } from '@/lib/types';

type Filters = { env: string; status: string; trigger: string };

// The Executions list: the server renders the first batch, and each time the bottom of the list
// scrolls into view the next batch is fetched and appended, until all `total` runs are shown.
// Keyed by its filters by the page, so changing a filter starts over from the first batch.
export function ExecutionsFeed({ initial, total, filters }: { initial: Execution[]; total: number; filters: Filters }) {
  const [rows, setRows] = useState(initial);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const done = rows.length >= total;

  const loadMore = useCallback(async () => {
    if (loading || done) return;
    setLoading(true);
    setError(null);
    try {
      const next = await loadExecutionsPage(filters, page);
      // A run started meanwhile shifts every page by one; skip rows already shown.
      setRows((current) => {
        const seen = new Set(current.map((e) => e.id));
        return [...current, ...next.filter((e) => !seen.has(e.id))];
      });
      setPage((p) => p + 1);
      if (next.length === 0) setError('No more runs could be loaded.');
    } catch {
      setError('Could not load more runs.');
    } finally {
      setLoading(false);
    }
  }, [loading, done, filters, page]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || done || error) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && loadMore(), { rootMargin: '240px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, done, error]);

  return (
    <>
      <ExecutionsTable executions={rows} />
      <div ref={sentinel} className="flex items-center justify-center gap-2 py-4 text-xs text-[var(--muted)]" aria-live="polite">
        {loading && (
          <>
            <Loader2 size={14} className="animate-spin" aria-hidden /> Loading more runs…
          </>
        )}
        {!loading && error && (
          <button type="button" className="btn" onClick={() => void loadMore()}>
            {error} Try again
          </button>
        )}
        {!loading && !error && done && rows.length > 0 && <>All {total} runs shown</>}
      </div>
    </>
  );
}
