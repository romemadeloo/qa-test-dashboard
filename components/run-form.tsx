'use client';

import { useState } from 'react';
import { BROWSER_PROJECTS, ENVIRONMENT_KEYS, SUITES, WORKER_OPTIONS, WORKFLOW_EXCLUDED_TAGS } from '@/lib/constants';

// Shared by the Run tests modal and the schedule editor. Values map 1:1 to manual-playwright.yml inputs.
export function RunFields({
  defaults,
  tags,
  idPrefix = '',
  showWorkers = false
}: {
  defaults: { environment?: string; suite?: string; browser_project?: string; custom_grep?: string | null };
  // Tags synced from the test catalog; custom grep picks from these.
  tags: string[];
  idPrefix?: string;
  // Run tests only: schedules are not stored with a worker count, so they keep the workflow's default.
  showWorkers?: boolean;
}) {
  const [environment, setEnvironment] = useState(defaults.environment ?? 'qa');
  const [suite, setSuite] = useState(defaults.suite ?? 'smoke');
  const [workers, setWorkers] = useState('auto');

  return (
    <>
      <div>
        <label className="label" htmlFor={`${idPrefix}environment`}>
          Environment
        </label>
        <select id={`${idPrefix}environment`} name="environment" value={environment} onChange={(e) => setEnvironment(e.target.value)} className="input w-full">
          {ENVIRONMENT_KEYS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}suite`}>
          Suite
        </label>
        <select id={`${idPrefix}suite`} name="suite" value={suite} onChange={(e) => setSuite(e.target.value)} className="input w-full">
          {SUITES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor={`${idPrefix}browser_project`}>
          Browser project
        </label>
        <select id={`${idPrefix}browser_project`} name="browser_project" defaultValue={defaults.browser_project ?? 'chromium-desktop'} className="input w-full">
          {BROWSER_PROJECTS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>
      {showWorkers && (
        <div>
          <label className="label" htmlFor={`${idPrefix}workers`}>
            Workers
          </label>
          <select id={`${idPrefix}workers`} name="workers" value={workers} onChange={(e) => setWorkers(e.target.value)} className="input w-full">
            {WORKER_OPTIONS.map((w) => (
              <option key={w} value={w}>
                {w === 'auto' ? `auto (${environment === 'production' ? '1 on production' : '2'})` : w}
              </option>
            ))}
          </select>
        </div>
      )}
      {suite === 'custom-grep' && <TagPicker tags={tags} initialGrep={defaults.custom_grep ?? ''} />}
      {showWorkers && environment === 'production' && !['auto', '1'].includes(workers) && (
        <p className="col-span-full text-xs text-critical-text">
          More than 1 worker on production makes its firewall refuse requests (403), so expect failures that are not real defects.
        </p>
      )}
      {environment === 'production' && (
        <p className="col-span-full text-xs text-warning-text">
          Production: the workflow excludes @payment, @slow and @destructive, and destructive specs refuse production regardless.
        </p>
      )}
    </>
  );
}

const excluded: readonly string[] = WORKFLOW_EXCLUDED_TAGS;

// Checked tags become the custom grep as an OR list (@cart|@validation), which is what the workflow
// hands to --grep. Tags in a saved grep that the catalog no longer has stay listed so they are not lost.
function TagPicker({ tags, initialGrep }: { tags: string[]; initialGrep: string }) {
  const initial = initialGrep
    .split('|')
    .map((t) => t.trim())
    .filter(Boolean);
  const [selected, setSelected] = useState<string[]>(initial);
  const options = [...new Set([...tags, ...initial])].sort();
  const grep = options.filter((t) => selected.includes(t)).join('|');

  function toggle(tag: string, on: boolean) {
    setSelected((prev) => (on ? [...prev, tag] : prev.filter((t) => t !== tag)));
  }

  return (
    <fieldset className="col-span-full">
      <legend className="label">Tags</legend>
      <input type="hidden" name="custom_grep" value={grep} />
      {options.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">No tags yet. They appear after the reporter syncs the test catalog from a run.</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {options.map((tag) => {
            const disabled = excluded.includes(tag);
            const checked = selected.includes(tag);
            return (
              <label
                key={tag}
                title={disabled ? 'The workflow always excludes this tag' : undefined}
                className={`btn !px-3 !py-1.5 text-xs font-mono ${checked ? '!border-[var(--accent)] !text-accent' : ''} ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <input type="checkbox" className="mr-1.5" checked={checked} disabled={disabled} onChange={(e) => toggle(tag, e.target.checked)} />
                {tag}
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-[var(--muted)]">
        {grep ? (
          <>
            Runs tests with any of: <span className="font-mono">{grep}</span>
          </>
        ) : (
          'Pick at least one tag.'
        )}{' '}
        {excluded.join(', ')} are always excluded by the workflow.
      </p>
    </fieldset>
  );
}
