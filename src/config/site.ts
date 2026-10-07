/**
 * Public site configuration.
 *
 * Everything in this file ships to the browser. Never put secrets,
 * credentials or private infrastructure details here.
 */

export const site = {
  name: 'Gabnode',
  url: 'https://gabnode.com',
  description:
    'One API for leading AI models. Access models from OpenAI, Anthropic, Google, DeepSeek and more with a single prepaid balance and transparent per-token pricing.',
  locale: 'en',
} as const;

/**
 * Endpoints and destinations on other Gabnode properties.
 * Update these if routes on the dashboard or docs sites change.
 */
export const links = {
  api: 'https://api.gabnode.com',
  apiBase: 'https://api.gabnode.com/v1',
  docs: 'https://docs.gabnode.com',
  dashboard: 'https://dashboard.gabnode.com',
  /** Where "Get started" sends people. Point at a dedicated sign-up route once one exists. */
  signup: 'https://dashboard.gabnode.com',
  support: 'mailto:support@gabnode.com',
  supportEmail: 'support@gabnode.com',
} as const;

export const nav = [
  { label: 'Models', href: '/models/' },
  { label: 'Pricing', href: '/pricing/' },
  { label: 'Docs', href: links.docs, external: true },
] as const;

/** Currency used for every rate shown on the site. */
export const currency = 'USD';
