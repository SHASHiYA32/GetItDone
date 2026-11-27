// Prints SQL that counts price mismatches between lib/pricing.ts and the database.
import { SERVICES } from "../lib/catalog.ts";
import { calcEstimate } from "../lib/pricing.ts";
import type { Answers } from "../lib/types.ts";
let seed = 7;
const rnd = (n: number) => (seed = (seed * 48271) % 2147483647) % n;
const rows: string[] = [];
for (const s of SERVICES) for (let i = 0; i < 40; i++) {
  const a: Answers = {};
  for (const q of s.questions) a[q.key] = q.type === "number" ? (q.min ?? 0) + rnd((q.max ?? 100) - (q.min ?? 0) + 1) : q.type === "yesno" ? !!rnd(2) : q.options![rnd(q.options!.length)].value;
  const km = rnd(600) / 10;
  rows.push(`('${s.id}', '${JSON.stringify(a)}'::jsonb, ${km}::numeric, '${JSON.stringify(calcEstimate(s, a, km))}'::jsonb)`);
}
console.log(`select count(*) from (values ${rows.join(",")}) t(s, a, km, e) where public.calc_estimate(s, a, km) is distinct from e;`);
