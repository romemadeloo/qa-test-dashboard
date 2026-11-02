'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { CalendarClock } from 'lucide-react';
import { saveSchedule, type SaveScheduleState } from '@/app/(app)/scheduler/actions';
import { CRON_PRESETS } from '@/lib/constants';
import { nextRuns, validateCron } from '@/lib/cron';
import { formatDateTime } from '@/lib/format';
import type { Schedule } from '@/lib/types';
import { FormError, Modal, useCloseModal } from './modal';
import { RunFields } from './run-form';

// Opens with ?schedule=new (create) or ?schedule=<id> (edit) on the Scheduler page.
export function ScheduleModal({ schedules, tags }: { schedules: Schedule[]; tags: string[] }) {
  const param = useSearchParams().get('schedule');
  const close = useCloseModal(['schedule']);
  if (!param) return null;
  const schedule = param === 'new' ? undefined : schedules.find((s) => s.id === param);
  if (param !== 'new' && !schedule) return null;

  return (
    <Modal
      title={schedule ? 'Edit schedule' : 'Create schedule'}
      subtitle={schedule ? schedule.name : 'A recurring Playwright run dispatched to GitHub Actions'}
      icon={<CalendarClock size={22} />}
      onClose={close}
      width={680}
    >
      <ScheduleForm key={param} schedule={schedule} tags={tags} onCancel={close} />
    </Modal>
  );
}

function ScheduleForm({ schedule, tags, onCancel }: { schedule?: Schedule; tags: string[]; onCancel: () => void }) {
  const [state, action] = useActionState<SaveScheduleState, FormData>(saveSchedule, {});
  const [cron, setCron] = useState(schedule?.cron ?? '0 2 * * *');
  const [timezone, setTimezone] = useState(schedule?.timezone ?? 'Asia/Seoul');
  const cronError = validateCron(cron, timezone);
  const upcoming = cronError ? [] : nextRuns(cron, timezone, 3);

  return (
    <form action={action}>
      {schedule && <input type="hidden" name="id" value={schedule.id} />}
      <FormError message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="schedule-name">
            Name
          </label>
          <input id="schedule-name" name="name" required defaultValue={schedule?.name} className="input w-full" placeholder="Nightly smoke on QA" />
        </div>
        <div>
          <label className="label" htmlFor="schedule-cron">
            Cron <span className="font-semibold text-[var(--muted)]">(min hour day month weekday)</span>
          </label>
          <input id="schedule-cron" name="cron" required value={cron} onChange={(e) => setCron(e.target.value)} className="input w-full font-mono" />
        </div>
        <div>
          <label className="label" htmlFor="schedule-tz">
            Timezone
          </label>
          <input id="schedule-tz" name="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input w-full" />
        </div>
        <div className="flex flex-wrap gap-1.5 sm:col-span-2">
          {CRON_PRESETS.map((p) => (
            <button
              key={p.cron}
              type="button"
              className={`btn !px-3 !py-1.5 text-xs ${cron === p.cron ? '!border-[var(--accent)] !text-accent' : ''}`}
              onClick={() => setCron(p.cron)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <p className={`text-xs font-semibold sm:col-span-2 ${cronError ? 'text-critical-text' : 'text-[var(--muted)]'}`}>
          {cronError ? `Invalid cron or timezone: ${cronError}` : `Next: ${upcoming.map((d) => formatDateTime(d)).join(' · ')}`}
        </p>

        <RunFields
          idPrefix="schedule-"
          tags={tags}
          defaults={{
            environment: schedule?.environment_key,
            suite: schedule?.suite,
            browser_project: schedule?.browser_project,
            custom_grep: schedule?.custom_grep
          }}
        />

        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" name="enabled" defaultChecked={schedule?.enabled ?? true} /> Enabled
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <SaveButton label={schedule ? 'Save changes' : 'Create schedule'} />
      </div>
    </form>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? 'Saving…' : label}
    </button>
  );
}
