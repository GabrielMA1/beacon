# Launch checklist

What must be true before gabnode.com is used to sell prepaid credit. Items marked
**Blocker** stop a commercial launch. Everything here needs a decision from Gabnode;
none of it can be settled in this repository alone.

## 1. Blockers

- [ ] **Real catalog and rates.** The site currently builds from
  `src/data/sample-catalog.json`. Model availability and every rate in it are
  unconfirmed placeholders. The site labels them "Sample rates" everywhere they
  appear. Before launch, either set `PUBLIC_MODELS_API_URL` to the live
  `GET /api/models` endpoint (see README), or replace the file's contents with
  confirmed data and set `"sample": false` in it. Only that explicit flag removes
  the sample labelling.
- [ ] **Terms of Service and Privacy Policy.** `/legal/terms/` and `/legal/privacy/`
  exist only as "not yet published" placeholders (noindex, not in the sitemap).
  Section 3 lists what the drafting needs.
- [ ] **Model IDs.** Confirm that every `id` in the catalog is exactly the string the
  API accepts in `model`. The site tells customers to copy these IDs verbatim.
- [ ] **Sign-up route.** `links.signup` in `src/config/site.ts` points at the dashboard
  root. Point it at the real sign-up page.
- [ ] **Support mailbox.** `support@gabnode.com` is published on the site and must
  receive mail.

## 2. Product and billing decisions to confirm

These are commercial policies. The site does **not** currently state any of them.
Earlier drafts did; those claims were removed until they are confirmed.

| Question | Why it matters | Current site copy |
| --- | --- | --- |
| What happens when a balance reaches zero mid-request or between requests? Declined with which error? Is there any overdraft? | Developers design error handling around it. | Not stated |
| When is a request charged? On completion, on stream start, for failed/cancelled requests? | Affects disputes and support. | Not stated |
| Are reasoning ("thinking") tokens billed, and at the output rate? | Can dominate cost on reasoning models. | Not stated |
| Does every response include a `usage` object with the billed token counts? | Lets customers reconcile charges. | Not stated |
| Which rate applies when rates change: the one at request time? Notice period for increases? | Needed for terms and trust. | Not stated |
| How is cached input determined and billed? Who decides what is cached? Any cache-write charge? | The rate card shows cached-input rates. | Defined only as "billed at the cached-input rate where one exists" |
| Minimum and maximum top-up amounts; payment methods; currencies; taxes/VAT | Purchase flow and terms. | Not stated (estimator says "excludes any taxes") |
| Do balances expire? Are unused balances refundable? Refunds for failed requests? | Consumer-law and terms requirement in many jurisdictions. | Not stated |
| Is the API OpenAI-compatible for streaming, tool calling, structured output, image input, error format? Per model? | The site says requests use the Chat Completions format and that optional features vary by model. | Kept deliberately general |
| Is there a public `GET /v1/models` endpoint for API clients? | Earlier copy promised it; removed. | Not stated |
| Rate limits per account/key | Developers need them for capacity planning. | Not stated |
| Key management at launch: create, rotate, revoke, per-key limits? | Home page and FAQ say keys can be created, rotated and revoked in the dashboard. | **Stated** — confirm it ships at launch |
| Dashboard at launch: balance, purchases, usage by model, support tickets | The home page describes these. | **Stated** — confirm they ship at launch |
| Which clients have actually been tested against the API? | The client list says "not certified". | Labelled uncertified |

## 3. Inputs needed for the Terms of Service and Privacy Policy

The legal text must come from counsel. Drafting needs these facts:

**Company**
- Legal entity name, registration number, registered address, jurisdiction and governing law.
- Contact addresses for legal notices and privacy requests.

**Commercial terms**
- Everything in section 2 (billing, balances, refunds, expiry, rate changes, taxes).
- Payment processor(s) and what they receive.
- Acceptable use policy, including how upstream model providers' usage policies apply
  to customers, and what content or uses are prohibited.
- Suspension and termination conditions; what happens to a remaining balance.
- Service levels: whether there is any SLA (the site makes no uptime, latency or capacity claims).
- Liability limits, warranties, indemnities; age and eligibility; export controls and sanctions.
- Whether business customers need a DPA.

**Data and privacy**
- What is stored from API traffic: prompts, completions, metadata, token counts — and for how long.
- Logging: what is logged, retention, who can access logs, whether logs are used for abuse detection.
- Sub-processors: which upstream model providers and infrastructure vendors receive customer
  data, in which regions, and under which of *their* retention and training terms.
- Whether any customer data is used for training by Gabnode or by upstream providers.
- Account data collected by the dashboard; authentication provider; payment data handling.
- Data subject rights process (access, deletion, export); account deletion behaviour.
- GDPR/UK GDPR roles (controller/processor), international transfer mechanism, CCPA/CPRA notices if applicable.
- Website: this site currently sets no cookies, loads no analytics and self-hosts its fonts.
  It is hosted on GitHub Pages, which processes visitor IP addresses. Keep the privacy policy
  in step if analytics or third-party scripts are ever added.

## 4. Technical and operational

- [ ] GitHub → Settings → Pages: Source "GitHub Actions"; custom domain `gabnode.com`; Enforce HTTPS.
- [ ] DNS records as listed in the README (apex A/AAAA, `www` CNAME). Not changed by this repository.
- [ ] Optional: Actions variable `PUBLIC_MODELS_API_URL` (a public URL, not a secret).
- [ ] The platform should call `repository_dispatch` (`catalog-updated`) when rates change,
  so the static site rebuilds. Rates on the site are only as fresh as the last build.
- [ ] docs.gabnode.com and dashboard.gabnode.com resolve and serve the pages linked from the site.
  The docs topic list on the home page (`docTopics` in `src/pages/index.astro`) should match real pages.
- [ ] Run `npm run audit` (axe-core, overflow, layout shift, JS errors) before each release.

## 5. Already public

`main` was deployed to GitHub Pages on 8 October 2026 from the first version of the site.
That version shows the placeholder rates **without** "sample" labelling and includes some
unconfirmed billing claims (zero-balance behaviour, reasoning-token billing, rate timing).
Merging the current branch replaces it. If gabnode.com already points at Pages, consider
doing that promptly.
