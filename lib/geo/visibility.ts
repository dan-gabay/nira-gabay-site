// Does Nira appear when someone asks an AI tool for a therapist? (Backlog B-49.)
//
// There is no API that answers this for ChatGPT, Perplexity, Gemini or Copilot.
// Their consumer answers are personalised, change between runs and are not
// exposed to anyone outside the product - and a plain LLM API call is not the
// same thing at all: it has no search step, no location and none of the
// sources the real product would cite. Treating one as the other would be
// inventing a ranking. So this module does three honest things instead:
//
//   1. Keeps a fixed, editable list of prompts (visibility-prompts.json).
//   2. Keeps every observation as it was seen, append-only, with how it was
//      seen (visibility-observations.json). Google AI Overviews can be read
//      through SerpApi, read-only; the others are checked by hand.
//   3. Says, per prompt and provider, either what the latest observation was
//      or that it has never been measured - never a number in between.
//
// A file in the repo rather than a table, on purpose: Dan prefers no
// migrations, observations are rare (monthly), each one is reviewed in a PR
// before it reaches the dashboard, and the history is the git history.

import promptsFile from './visibility-prompts.json';
import observationsFile from './visibility-observations.json';

export type Provider =
  | 'google_ai_overview'
  | 'google_ai_mode'
  | 'chatgpt_search'
  | 'perplexity'
  | 'gemini'
  | 'copilot'
  | 'claude';

/**
 * How an observation was made. 'api' is for an approved integration that
 * returns the product's own answer (for example SerpApi for AI Overviews);
 * a generic model API is deliberately NOT a method - see the header.
 */
export type Method = 'serpapi' | 'manual' | 'api';

export type ProviderInfo = {
  id: Provider;
  label: string;
  /** The ways this provider can be measured today. */
  methods: Method[];
  /** One line on what is and is not available, shown on the page. */
  access: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    id: 'google_ai_overview',
    label: 'Google AI Overview',
    methods: ['serpapi', 'manual'],
    access: 'נמדד דרך SerpApi (קריאה בלבד), מיקום ירושלים.',
  },
  {
    id: 'google_ai_mode',
    label: 'Google AI Mode',
    methods: ['manual'],
    access: 'בדיקה ידנית בלבד.',
  },
  {
    id: 'chatgpt_search',
    label: 'ChatGPT',
    methods: ['manual'],
    access: 'אין גישה אוטומטית. בדיקה ידנית בחשבון רגיל, עם חיפוש פעיל.',
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    methods: ['manual'],
    access: 'אין גישה אוטומטית מאושרת. בדיקה ידנית.',
  },
  {
    id: 'gemini',
    label: 'Gemini',
    methods: ['manual'],
    access: 'אין גישה אוטומטית. בדיקה ידנית.',
  },
  {
    id: 'copilot',
    label: 'Copilot',
    methods: ['manual'],
    access: 'אין גישה אוטומטית. בדיקה ידנית (מבוסס Bing).',
  },
  {
    id: 'claude',
    label: 'Claude',
    methods: ['manual'],
    access: 'בדיקה ידנית עם חיפוש באינטרנט פעיל.',
  },
];

const PROVIDER_IDS = new Set<string>(PROVIDERS.map((p) => p.id));

export type Prompt = {
  id: string;
  text: string;
  service: string;
  area: string;
  active: boolean;
  added: string;
};

export type Observation = {
  id: string;
  prompt_id: string;
  provider: Provider;
  observed_at: string;
  method: Method;
  /** 'observed' = an answer someone actually saw. 'estimate' is never shown as a result. */
  evidence: 'observed' | 'estimate';
  location?: string | null;
  /** Did the tool give an AI answer at all for this prompt? */
  answer_present: boolean;
  /** null = could not tell (for example a name the response left out). */
  nira_mentioned: boolean | null;
  nira_linked: boolean | null;
  /** 1-based place among the providers the answer named, when it is a list. */
  position: number | null;
  /** Named providers in the answer, as written. null = not recorded. */
  competitors: string[] | null;
  /** Domains the answer cited ('google-business-profile' for a Maps listing). */
  cited_sources: string[];
  /** Google only: the ordinary results page around the answer. */
  serp?: { organic_top10: boolean | null; local_pack: boolean | null } | null;
  observer: string;
  notes?: string;
};

/** Problems that make an observation unusable, so the page never shows it. */
export function validateObservation(o: Observation, promptIds: ReadonlySet<string>): string[] {
  const errors: string[] = [];
  if (!o.id) errors.push('missing id');
  if (!promptIds.has(o.prompt_id)) errors.push(`unknown prompt ${o.prompt_id}`);
  if (!PROVIDER_IDS.has(o.provider)) errors.push(`unknown provider ${o.provider}`);
  const info = PROVIDERS.find((p) => p.id === o.provider);
  if (info && !info.methods.includes(o.method)) {
    errors.push(`${o.provider} cannot be measured by ${o.method}`);
  }
  if (Number.isNaN(Date.parse(o.observed_at))) errors.push('observed_at is not a date');
  if (o.evidence !== 'observed' && o.evidence !== 'estimate') errors.push('evidence must be observed or estimate');
  if (!o.answer_present && (o.nira_mentioned || o.position !== null)) {
    errors.push('no answer, but a mention or position is recorded');
  }
  if (o.position !== null && (!Number.isInteger(o.position) || o.position < 1)) {
    errors.push('position must be a whole number from 1');
  }
  if (o.position !== null && o.nira_mentioned !== true) errors.push('a position needs nira_mentioned = true');
  if (!Array.isArray(o.cited_sources)) errors.push('cited_sources must be a list');
  return errors;
}

export type Cell = {
  prompt_id: string;
  provider: Provider;
  /** Latest usable observation, or null = never measured. */
  latest: Observation | null;
  /** The one before it, for "has it changed". */
  previous: Observation | null;
  /** Every usable observation, newest first. */
  history: Observation[];
};

export type VisibilityReport = {
  prompts: Prompt[];
  providers: ProviderInfo[];
  cells: Cell[];
  /** Kept out of every result; listed so they are not lost either. */
  estimates: Observation[];
  invalid: Array<{ id: string; errors: string[] }>;
  lastObserved: string | null;
  /** Of the active prompt x provider pairs, how many have any observation. */
  measuredPairs: number;
  totalPairs: number;
  /** Active prompts whose latest observation in any provider mentions Nira. */
  mentionedPrompts: number;
  measuredPrompts: number;
  /** How often each source was cited across the latest observations. */
  sources: Array<{ source: string; count: number }>;
};

export function buildVisibilityReport(prompts: Prompt[], observations: Observation[]): VisibilityReport {
  const promptIds = new Set(prompts.map((p) => p.id));
  const invalid: VisibilityReport['invalid'] = [];
  const usable: Observation[] = [];
  const estimates: Observation[] = [];

  for (const o of observations) {
    const errors = validateObservation(o, promptIds);
    if (errors.length) invalid.push({ id: o.id || '(no id)', errors });
    else if (o.evidence === 'estimate') estimates.push(o);
    else usable.push(o);
  }

  const active = prompts.filter((p) => p.active);
  const byPair = new Map<string, Observation[]>();
  for (const o of usable) {
    const key = `${o.prompt_id}|${o.provider}`;
    byPair.set(key, [...(byPair.get(key) ?? []), o]);
  }

  const cells: Cell[] = [];
  for (const p of active) {
    for (const prov of PROVIDERS) {
      const history = (byPair.get(`${p.id}|${prov.id}`) ?? []).sort((a, b) =>
        b.observed_at.localeCompare(a.observed_at),
      );
      cells.push({
        prompt_id: p.id,
        provider: prov.id,
        latest: history[0] ?? null,
        previous: history[1] ?? null,
        history,
      });
    }
  }

  const measured = cells.filter((c) => c.latest);
  const measuredPromptIds = new Set(measured.map((c) => c.prompt_id));
  const mentionedPromptIds = new Set(measured.filter((c) => c.latest?.nira_mentioned === true).map((c) => c.prompt_id));

  const sourceCounts = new Map<string, number>();
  for (const c of measured) {
    for (const s of new Set(c.latest!.cited_sources)) sourceCounts.set(s, (sourceCounts.get(s) ?? 0) + 1);
  }

  return {
    prompts: active,
    providers: PROVIDERS,
    cells,
    estimates,
    invalid,
    lastObserved: usable.map((o) => o.observed_at).sort().pop() ?? null,
    measuredPairs: measured.length,
    totalPairs: cells.length,
    mentionedPrompts: mentionedPromptIds.size,
    measuredPrompts: measuredPromptIds.size,
    sources: [...sourceCounts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count || a.source.localeCompare(b.source)),
  };
}

/** The report from the files in the repo. */
export function loadVisibilityReport(): VisibilityReport {
  return buildVisibilityReport(
    promptsFile.prompts as Prompt[],
    observationsFile.observations as Observation[],
  );
}
