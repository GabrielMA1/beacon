import { links } from '../config/site';

/**
 * Answers are trusted HTML authored in this repository.
 *
 * Only state things that are true by definition of the product or confirmed
 * by the platform. Policy answers (what happens at a zero balance, refunds,
 * when a new rate applies, how reasoning tokens are billed, …) stay out until
 * confirmed — see LAUNCH.md, "Product decisions".
 */
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
      a: `<p>You add funds to a prepaid balance in the dashboard. Usage is charged against that balance at each model’s per-token rates, with input, cached input and output tokens priced separately.</p><p>See <a href="/pricing/">Pricing</a> for the rate card and an estimator.</p>`,
    },
    {
      q: 'Is the API compatible with OpenAI’s?',
      a: `<p>Gabnode accepts requests in the OpenAI Chat Completions format, so the official OpenAI SDKs and many other clients can be pointed at Gabnode by changing the base URL and API key. Optional features such as streaming, tool calling and image input vary by model; check the <a href="${links.docs}">documentation</a> before relying on one.</p>`,
    },
    {
      q: 'How are tokens counted?',
      a: `<p>Each model counts tokens with its own tokenizer, so the same text can produce different token counts on different models. That is why the same prompt can cost slightly different amounts on two models with the same rates.</p>`,
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
      q: 'What is cached input?',
      a: `<p>Many applications send the same long prefix on every request: instructions, a policy document, a codebase summary. When a model serves part of your input from its cache and has a cached-input rate, those tokens are billed at that lower rate. Models without a cached-input rate show a dash in the rate card, and all of their input is billed at the input rate.</p>`,
    },
    {
      q: 'Is the estimate what I will be charged?',
      a: `<p>No. The estimator multiplies the volumes you enter by the rates in the rate card. Your actual charges are calculated by Gabnode from the tokens each request really uses, which depend on each model’s tokenizer and on how much of your input is served from cache.</p>`,
    },
    {
      q: 'Which currency are rates in?',
      a: `<p>All rates are shown in US dollars per million tokens.</p>`,
    },
  ],
};
