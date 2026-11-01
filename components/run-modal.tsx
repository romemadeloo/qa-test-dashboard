'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Play } from 'lucide-react';
import { startRun, type StartRunState } from '@/app/(app)/executions/actions';
import { FormError, Modal, useCloseModal } from './modal';
import { RunFields } from './run-form';

export type RunTarget = {
  // owner/repo@ref, or null when GitHub dispatch is not configured yet.
  repo: string | null;
  workflow: string;
  defaultEnvironment: string;
  defaultBrowser: string;
};

// Opens with ?run=1 on any page; ?runEnv=<key> preselects the environment.
export function RunModal({ target }: { target: RunTarget }) {
  const searchParams = useSearchParams();
  const close = useCloseModal(['run', 'runEnv']);
  if (searchParams.get('run') !== '1') return null;
  // Mounted fresh on every open, so a previous error never carries over.
  return <RunDialog target={target} environment={searchParams.get('runEnv')} onClose={close} />;
}

function RunDialog({ target, environment, onClose }: { target: RunTarget; environment: string | null; onClose: () => void }) {
  const [state, action] = useActionState<StartRunState, FormData>(startRun, {});

  return (
    <Modal
      title="Run tests"
      subtitle={target.repo ? `Dispatches ${target.workflow} on ${target.repo}` : 'GitHub Actions dispatch is not configured'}
      icon={<Play size={22} />}
      onClose={onClose}
    >
      <form action={action}>
        {!target.repo && (
          <p className="mb-4 rounded-2xl bg-[var(--warning-soft)] px-4 py-3 text-sm font-semibold text-warning-text">
            Set the GitHub owner and repository in{' '}
            <Link href="/settings" className="underline">
              Settings
            </Link>{' '}
            first.
          </p>
        )}
        <FormError message={state.error} />
        <div className="grid gap-4 sm:grid-cols-2">
          <RunFields idPrefix="modal-" defaults={{ environment: environment ?? target.defaultEnvironment, browser_project: target.defaultBrowser }} />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <DispatchButton disabled={!target.repo} />
        </div>
      </form>
    </Modal>
  );
}

function DispatchButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={disabled || pending}>
      <Play size={15} aria-hidden />
      {pending ? 'Dispatching…' : 'Dispatch run'}
    </button>
  );
}
