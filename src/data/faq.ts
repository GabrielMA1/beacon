import { links } from '../config/site';

/** Answers are trusted HTML authored in this repository. */
export const faqs = {
  general: [
    {
      q: 'What is Gabnode?',
      a: `<p>Gabnode is an API platform for AI models. One account, one API and one prepaid balance give you access to models from several providers. You integrate once and choose the model on each request.</p>`,
    },
    {
      q: 'Is Gabnode affiliated with OpenAI, Anthropic, Google or the other model providers?',
      a: `<p>No. Gabnode is an independent company and is not affiliated with, or endorsed by, the companies whose models are available through its API. Model names are trademarks of their respective owners.</p>`,
    },
    {
      q: 'How does billing work?',
      a: `<p>You add funds to a prepaid balance in the dashboard. Each request is charged for its input, cached input and output tokens at the model’s published rate, and the amount is deducted from your balance. Your usage history shows what each request cost.</p><p>See <a href="/pricing/">Pricing</a> for every rate.</p>`,
    },
    {
      q: 'What happens when my balance runs out?',
      a: `<p>Requests are declined with a clear error instead of running up a bill. Add balance in the dashboard and you can continue straight away.</p>`,
    },
    {
      q: 'Is the API compatible with OpenAI’s?',
      a: `<p>Gabnode provides an OpenAI-compatible Chat Completions API, so the official OpenAI SDKs and many other clients work by changing the base URL and API key. Features such as tool calling or image input depend on the model you choose. Where behaviour differs, the <a href="${links.docs}">documentation</a> says so.</p>`,
    },
    {
      q: 'How are tokens counted?',
      a: `<p>Each model counts tokens with its own tokenizer, so the same text can produce slightly different counts on different models. Every response includes a <code>usage</code> object with the exact counts billed for that request.</p>`,
    },
    {
      q: 'Can I use separate keys for different projects?',
      a: `<p>Yes. Create a key for each application or environment, and rotate or revoke any of them from the dashboard. All keys draw from your account’s balance.</p>`,
    },
    {
      q: 'How do I get help?',
      a: `<p>Open a support ticket from the <a href="${links.dashboard}">dashboard</a> to keep the whole conversation in one place, or email <a href="${links.support}">${links.supportEmail}</a>.</p>`,
    },
  ],
  billing: [
    {
      q: 'When am I charged?',
      a: `<p>When you add balance. After that, each request deducts its cost from your balance as it completes.</p>`,
    },
    {
      q: 'What is cached input?',
      a: `<p>Many applications send the same long prefix on every request: instructions, a policy document, a codebase summary. On models that support prompt caching, tokens served from cache are billed at the lower cached input rate. Models without caching show a dash in the rate card and bill all input at the standard rate.</p>`,
    },
    {
      q: 'Are reasoning tokens billed?',
      a: `<p>Yes. Models that reason before answering produce tokens while they think, and those are billed as output tokens. The <code>usage</code> object in each response reports them.</p>`,
    },
    {
      q: 'Can rates change?',
      a: `<p>Rates can change, for example when a model provider changes its own pricing. The rate applied to a request is the one published at the time the request is made.</p>`,
    },
    {
      q: 'What happens when my balance runs out?',
      a: `<p>Requests are declined with a clear error instead of running up a bill. Add balance in the dashboard and you can continue straight away.</p>`,
    },
  ],
};
