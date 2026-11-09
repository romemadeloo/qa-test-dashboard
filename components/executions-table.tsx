import Link from 'next/link';
import { StatusBadge } from './status-badge';
import { ResultBar, TableWrap } from './ui';
import { formatDateParts, formatDuration, formatRelative } from '@/lib/format';
import type { Execution } from '@/lib/types';

// `scrolling`: the caller provides the scroll container (the Executions list), so the table drops its
// own horizontal-scroll wrapper -- a sticky header only sticks to its nearest scroll container.
export function ExecutionsTable({
  executions,
  compact = false,
  scrolling = false
}: {
  executions: Execution[];
  compact?: boolean;
  scrolling?: boolean;
}) {
  const table = (
    <table className={scrolling ? 'data-table sticky-head' : 'data-table'}>
      <thead>
        <tr>
          <th>Status</th>
          <th>Run</th>
          <th>Environment</th>
          {!compact && <th>Browser</th>}
          {!compact && <th>Trigger</th>}
          <th className="w-40">Results</th>
          <th className="num">Tests</th>
          <th className="num">Duration</th>
          <th className="num">Executed</th>
        </tr>
      </thead>
      <tbody>
        {executions.map((e) => (
          <tr key={e.id}>
            <td>
              <StatusBadge status={e.status} />
            </td>
            <td>
              <Link href={`/executions/${e.id}`} className="font-medium text-accent hover:underline">
                {e.suite ?? 'run'}
              </Link>
              {e.grep && <span className="ml-1.5 tag">{e.grep}</span>}
            </td>
            <td>{e.environment_key ?? '—'}</td>
            {!compact && <td className="whitespace-nowrap text-ink-2">{e.browser_project ?? '—'}</td>}
            {!compact && <td className="whitespace-nowrap text-ink-2 capitalize">{e.trigger}</td>}
            <td className="align-middle">
              <ResultBar passed={e.passed} flaky={e.flaky} failed={e.failed} skipped={e.skipped} />
            </td>
            <td className="num">
              {e.failed > 0 ? <span className="text-critical-text">{e.failed} failed</span> : null}
              {e.failed > 0 ? ' / ' : ''}
              {e.total}
            </td>
            <td className="num">{formatDuration(e.duration_ms)}</td>
            <ExecutedAt value={e.started_at ?? e.created_at} />
          </tr>
        ))}
      </tbody>
    </table>
  );
  return scrolling ? table : <TableWrap>{table}</TableWrap>;
}

// Date and time (KST) of the run on one line, so a page of runs fits the screen; how long ago on hover.
function ExecutedAt({ value }: { value: string }) {
  const parts = formatDateParts(value);
  return (
    <td className="num whitespace-nowrap" title={formatRelative(value)}>
      <span className="font-semibold text-ink">{parts?.date ?? '—'}</span>
      <span className="ml-2 text-xs text-[var(--muted)]">{parts?.time}</span>
    </td>
  );
}
