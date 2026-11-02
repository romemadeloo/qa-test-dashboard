// Mirrors the workflow_dispatch inputs of .github/workflows/manual-playwright.yml. GitHub rejects a
// value the workflow does not list, so keep these in step with it.
export const ENVIRONMENT_KEYS = ['production', 'qa', 'dev-1', 'dev-2', 'dev-3', 'dev-4', 'dev-5', 'dev-6'] as const;

export const SUITES = ['smoke', 'full', 'api', 'auth', 'regression', 'admin', 'purchasing', 'validation', 'a11y', 'custom-grep'] as const;

// manual-playwright.yml passes these to --grep-invert for every suite but api, custom-grep included,
// so a custom-grep run on them alone selects nothing.
export const WORKFLOW_EXCLUDED_TAGS = ['@payment', '@slow', '@destructive'] as const;

export const BROWSER_PROJECTS = [
  'chromium-desktop',
  'firefox-desktop',
  'webkit-desktop',
  'chromium-mobile',
  'all-desktop'
] as const;

export const CASE_STATUSES = ['active', 'quarantined', 'retired'] as const;

export const CRON_PRESETS = [
  { label: 'Every hour', cron: '0 * * * *' },
  { label: 'Daily 02:00', cron: '0 2 * * *' },
  { label: 'Weekdays 09:00', cron: '0 9 * * 1-5' },
  { label: 'Sundays 03:00', cron: '0 3 * * 0' }
] as const;

export const PROJECT_COOKIE = 'qa_project';

export const ROLES = ['QA', 'Frontend', 'Backend', 'Supervisor', 'General Manager', 'Manager'] as const;

// Supabase Auth needs an email; accounts created on the Users page get one under this domain,
// which never receives mail. Sign-in accepts the bare username and maps it here.
export const USERNAME_EMAIL_DOMAIN = 'users.qa-dashboard.internal';
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/;

export function loginEmailFor(identifier: string): string {
  const id = identifier.trim().toLowerCase();
  return id.includes('@') ? id : `${id}@${USERNAME_EMAIL_DOMAIN}`;
}

// Sidebar state: 'collapsed' hides the nav panel; folded holds group titles joined by '|'.
export const NAV_COOKIE = 'qa_nav';
export const FOLDED_COOKIE = 'qa_nav_folded';
