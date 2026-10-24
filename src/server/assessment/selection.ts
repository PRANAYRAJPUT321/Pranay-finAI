/**
 * Question selection: seeded randomisation, weight-proportional topic
 * allocation, item-set grouping and duplicate prevention. Pure functions.
 */

export interface PoolQuestion {
  id: string;
  topicId: string; // top-level syllabus topic used for distribution
  difficulty: number;
  itemSetId: string | null;
}

export interface TopicWeight {
  topicId: string;
  weight: number; // relative; need not sum to 1
}

/** Mulberry32 PRNG — deterministic for a given seed so selections are reproducible in tests. */
export function createRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle with a fresh random seed (for non-reproducible orderings such as drills). */
export function randomShuffle<T>(items: T[]): T[] {
  return shuffle(items, createRng(crypto.getRandomValues(new Uint32Array(1))[0]));
}

export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Largest-remainder apportionment of `total` slots by weight, respecting per-topic capacity. */
export function allocate(total: number, weights: TopicWeight[], capacity: Record<string, number>): Record<string, number> {
  const result: Record<string, number> = {};
  let active = weights.filter((w) => w.weight > 0 && (capacity[w.topicId] ?? 0) > 0);
  let remaining = Math.min(total, active.reduce((a, w) => a + (capacity[w.topicId] ?? 0), 0));
  for (const w of weights) result[w.topicId] = 0;
  while (remaining > 0 && active.length > 0) {
    const sum = active.reduce((a, w) => a + w.weight, 0);
    const quotas = active.map((w) => ({ id: w.topicId, exact: (remaining * w.weight) / sum }));
    let assigned = 0;
    for (const q of quotas) {
      const room = capacity[q.id] - result[q.id];
      const take = Math.min(Math.floor(q.exact), room);
      result[q.id] += take;
      assigned += take;
    }
    let left = remaining - assigned;
    const byRemainder = [...quotas].sort((x, y) => (y.exact % 1) - (x.exact % 1));
    for (const q of byRemainder) {
      if (left === 0) break;
      if (result[q.id] < capacity[q.id]) {
        result[q.id] += 1;
        left -= 1;
      }
    }
    remaining = left;
    active = active.filter((w) => result[w.topicId] < capacity[w.topicId]);
    if (assigned === 0 && left === remaining && byRemainder.every((q) => result[q.id] >= capacity[q.id])) break;
  }
  return result;
}

export interface SelectOptions {
  count: number;
  weights?: TopicWeight[]; // omit for uniform random across the pool
  excludeIds?: Set<string>;
  preferIds?: Set<string>; // e.g. due-for-review or previously missed questions
  difficulty?: number | null;
  seed: number;
}

/**
 * Selects up to `count` distinct questions. Item sets are kept together and
 * counted by their number of questions. Returns ids in presentation order.
 */
export function selectQuestions(pool: PoolQuestion[], opts: SelectOptions): string[] {
  const rng = createRng(opts.seed);
  const exclude = opts.excludeIds ?? new Set<string>();
  const unique = new Map<string, PoolQuestion>();
  for (const q of pool) if (!exclude.has(q.id)) unique.set(q.id, q);
  let candidates = [...unique.values()];
  if (opts.difficulty) {
    const filtered = candidates.filter((q) => q.difficulty === opts.difficulty);
    if (filtered.length >= Math.min(opts.count, candidates.length)) candidates = filtered;
  }

  // Build selection units: single questions or whole item sets.
  const units = new Map<string, PoolQuestion[]>();
  for (const q of candidates) {
    const key = q.itemSetId ? `set:${q.itemSetId}` : `q:${q.id}`;
    units.set(key, [...(units.get(key) ?? []), q]);
  }

  const byTopic = new Map<string, PoolQuestion[][]>();
  for (const unit of units.values()) {
    const t = unit[0].topicId;
    byTopic.set(t, [...(byTopic.get(t) ?? []), unit]);
  }

  const prefer = opts.preferIds ?? new Set<string>();
  const ordered = (list: PoolQuestion[][]) => {
    const shuffled = shuffle(list, rng);
    return [...shuffled.filter((u) => u.some((q) => prefer.has(q.id))), ...shuffled.filter((u) => !u.some((q) => prefer.has(q.id)))];
  };

  const capacity: Record<string, number> = {};
  for (const [t, list] of byTopic) capacity[t] = list.reduce((a, u) => a + u.length, 0);
  const weights = opts.weights ?? [...byTopic.keys()].map((topicId) => ({ topicId, weight: capacity[topicId] }));
  const quota = allocate(opts.count, weights, capacity);

  const chosen: PoolQuestion[][] = [];
  let used = 0;
  for (const [topicId, n] of Object.entries(quota)) {
    let taken = 0;
    for (const unit of ordered(byTopic.get(topicId) ?? [])) {
      if (taken >= n || used >= opts.count) break;
      if (unit.length > opts.count - used) continue;
      chosen.push(unit);
      taken += unit.length;
      used += unit.length;
    }
  }
  // Fill any gap (e.g. item sets that did not fit a quota) from what is left.
  if (used < opts.count) {
    const chosenKeys = new Set(chosen.flat().map((q) => q.id));
    for (const unit of ordered([...units.values()].filter((u) => !u.some((q) => chosenKeys.has(q.id))))) {
      if (used >= opts.count) break;
      if (unit.length > opts.count - used) continue;
      chosen.push(unit);
      used += unit.length;
    }
  }
  return shuffle(chosen, rng).flatMap((unit) => unit.map((q) => q.id));
}
