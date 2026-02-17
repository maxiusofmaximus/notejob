type TrialState = {
  creditsRemaining: number;
  trialUsed: number;
  updatedAt: string;
};

const DEFAULT_TRIAL_CREDITS = 1;
const trialByEmail = new Map<string, TrialState>();

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function getOrCreateState(email: string): TrialState {
  const key = normalizeEmail(email);
  const found = trialByEmail.get(key);
  if (found) return found;
  const initial: TrialState = {
    creditsRemaining: DEFAULT_TRIAL_CREDITS,
    trialUsed: 0,
    updatedAt: nowIso()
  };
  trialByEmail.set(key, initial);
  return initial;
}

export function getTrialState(email: string) {
  if (!email.trim()) return null;
  const state = getOrCreateState(email);
  return { ...state };
}

export function consumeTrialCredit(email: string) {
  const key = normalizeEmail(email);
  const state = getOrCreateState(key);
  if (state.creditsRemaining <= 0) return { ok: false as const, state: { ...state } };
  state.creditsRemaining -= 1;
  state.trialUsed += 1;
  state.updatedAt = nowIso();
  trialByEmail.set(key, state);
  return { ok: true as const, state: { ...state } };
}

export function resetTrialCredits(email: string, credits = DEFAULT_TRIAL_CREDITS) {
  const key = normalizeEmail(email);
  const next: TrialState = {
    creditsRemaining: Math.max(0, Number(credits || 0)),
    trialUsed: 0,
    updatedAt: nowIso()
  };
  trialByEmail.set(key, next);
  return { ...next };
}

export function grantTrialCredits(email: string, credits: number) {
  const key = normalizeEmail(email);
  const state = getOrCreateState(key);
  state.creditsRemaining += Math.max(0, Number(credits || 0));
  state.updatedAt = nowIso();
  trialByEmail.set(key, state);
  return { ...state };
}
