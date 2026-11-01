'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { Server, Trash2 } from 'lucide-react';
import { deleteEnvironment, saveEnvironment, type SaveEnvironmentState } from '@/app/(app)/environments/actions';
import type { Environment } from '@/lib/types';
import { FormError, Modal, useCloseModal } from './modal';

// Opens with ?environment=new (add) or ?environment=<id> (edit) on the Environments page.
export function EnvironmentModal({ environments }: { environments: Environment[] }) {
  const param = useSearchParams().get('environment');
  const close = useCloseModal(['environment']);
  if (!param) return null;
  const env = param === 'new' ? undefined : environments.find((e) => e.id === param);
  if (param !== 'new' && !env) return null;

  return (
    <Modal
      title={env ? 'Edit environment' : 'Add environment'}
      subtitle={env ? `${env.name} · ${env.key}` : 'A target the suite can run against'}
      icon={<Server size={22} />}
      onClose={close}
      width={680}
    >
      <EnvironmentForm key={param} env={env} onCancel={close} />
    </Modal>
  );
}

function EnvironmentForm({ env, onCancel }: { env?: Environment; onCancel: () => void }) {
  const [state, action] = useActionState<SaveEnvironmentState, FormData>(saveEnvironment, {});

  return (
    <form action={action}>
      {env && <input type="hidden" name="id" value={env.id} />}
      <FormError message={state.error} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="key" label="Key" placeholder="dev-7" defaultValue={env?.key} required mono />
        <Field name="name" label="Name" placeholder="Dev-Shared 7" defaultValue={env?.name} required />
        <Field name="base_url" label="Storefront URL" placeholder="https://…/kr" defaultValue={env?.base_url} type="url" />
        <Field name="api_url" label="API URL" placeholder="https://…/index.php" defaultValue={env?.api_url} type="url" />
        <Field name="admin_url" label="Admin URL" placeholder="https://…" defaultValue={env?.admin_url} type="url" />
        <Field name="description" label="Description" defaultValue={env?.description} />
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" name="is_production" defaultChecked={env?.is_production} /> Production (live customers)
        </label>
      </div>
      {!env && (
        <p className="mt-4 text-xs text-[var(--muted)]">
          To dispatch runs to a new key, add it to manual-playwright.yml, tests/fixtures/environments.ts and lib/constants.ts too.
        </p>
      )}

      <div className="mt-6 flex items-center gap-2">
        {env && (
          <button
            type="submit"
            formAction={deleteEnvironment}
            formNoValidate
            className="btn btn-danger"
            onClick={(e) => {
              if (!window.confirm(`Delete the ${env.name} environment? Its runs stay in Executions.`)) e.preventDefault();
            }}
          >
            <Trash2 size={15} aria-hidden /> Delete
          </button>
        )}
        <div className="ml-auto flex gap-2">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <SaveButton label={env ? 'Save changes' : 'Add environment'} />
        </div>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  required,
  type = 'text',
  mono
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  placeholder?: string;
  required?: boolean;
  type?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="label" htmlFor={`env-${name}`}>
        {label}
      </label>
      <input
        id={`env-${name}`}
        name={name}
        type={type}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        required={required}
        className={`input w-full ${mono ? 'font-mono' : ''}`}
      />
    </div>
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
