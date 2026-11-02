'use client';

import { useSearchParams } from 'next/navigation';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { FolderKanban, Trash2 } from 'lucide-react';
import { deleteProject, saveProject, type ProjectFormState } from '@/app/(app)/projects/actions';
import type { Project } from '@/lib/types';
import { FormError, Modal, useCloseModal } from './modal';

// Opens with ?project=new (create) or ?project=<id> (edit) on the Projects page.
export function ProjectModal({ projects }: { projects: Project[] }) {
  const param = useSearchParams().get('project');
  const close = useCloseModal(['project']);
  if (!param) return null;
  const project = param === 'new' ? undefined : projects.find((p) => p.id === param);
  if (param !== 'new' && !project) return null;

  return (
    <Modal
      title={project ? 'Edit project' : 'New project'}
      subtitle={project ? `${project.name} · ${project.slug}` : 'One Playwright repository reporting into this dashboard'}
      icon={<FolderKanban size={22} />}
      onClose={close}
      width={640}
    >
      <ProjectForm key={param} project={project} onCancel={close} />
      {project && <DangerZone key={`delete-${param}`} project={project} />}
    </Modal>
  );
}

function ProjectForm({ project, onCancel }: { project?: Project; onCancel: () => void }) {
  const [state, action] = useActionState<ProjectFormState, FormData>(saveProject, {});

  return (
    <form action={action}>
      {project && <input type="hidden" name="id" value={project.id} />}
      <FormError message={state.error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="project-name">
            Name
          </label>
          <input id="project-name" name="name" required defaultValue={project?.name} className="input w-full" placeholder="Musticker E2E" />
        </div>
        <div>
          <label className="label" htmlFor="project-slug">
            Slug <span className="font-semibold text-[var(--muted)]">(reporter&apos;s DASHBOARD_PROJECT)</span>
          </label>
          <input id="project-slug" name="slug" required defaultValue={project?.slug} className="input w-full font-mono" placeholder="musticker" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="project-repo">
            Repository URL
          </label>
          <input id="project-repo" name="repo_url" type="url" defaultValue={project?.repo_url ?? ''} className="input w-full" placeholder="https://github.com/…" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="project-description">
            Description
          </label>
          <input id="project-description" name="description" defaultValue={project?.description ?? ''} className="input w-full" />
        </div>
      </div>
      {project && (
        <p className="mt-3 text-xs text-[var(--muted)]">Changing the slug means updating DASHBOARD_PROJECT wherever the reporter runs.</p>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          Cancel
        </button>
        <Submit label={project ? 'Save changes' : 'Create project'} pendingLabel="Saving…" />
      </div>
    </form>
  );
}

function DangerZone({ project }: { project: Project }) {
  const [state, action] = useActionState<ProjectFormState, FormData>(deleteProject, {});
  const [confirm, setConfirm] = useState('');

  return (
    <form action={action} className="mt-6 rounded-2xl border border-[var(--critical-soft)] bg-[var(--critical-soft)] p-4">
      <input type="hidden" name="id" value={project.id} />
      <div className="text-sm font-bold text-critical-text">Delete project</div>
      <p className="mt-1 text-xs text-ink-2">Removes the project with all its runs, test cases, suites and schedules. Type its slug to confirm.</p>
      <FormError message={state.error} />
      <div className="mt-3 flex flex-wrap gap-2">
        <input
          name="confirm"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={project.slug}
          aria-label={`Type ${project.slug} to confirm`}
          className="input min-w-0 flex-1 font-mono"
        />
        <DeleteButton disabled={confirm.trim() !== project.slug} />
      </div>
    </form>
  );
}

function Submit({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

function DeleteButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" type="submit" disabled={disabled || pending}>
      <Trash2 size={15} aria-hidden /> {pending ? 'Deleting…' : 'Delete with all runs'}
    </button>
  );
}
