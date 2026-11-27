// Mirrors public.calc_estimate in supabase/schema.sql. The database result is the one that counts.
import type { Answers, Estimate, Service } from "./types.ts";

export const TRAVEL_PER_KM = 60;
export const COMMISSION = 0.1;

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = Math.PI / 180;
  const h = Math.sin(((bLat - aLat) * r) / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(((bLng - aLng) * r) / 2) ** 2;
  // 1.3 approximates road distance from straight-line distance
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 1.3 * 10) / 10;
}

export function calcEstimate(service: Service, answers: Answers, km: number): Estimate {
  let labour = service.labour, material = service.material, extraL = 0, extraM = 0, pct = 0, minutes = service.minutes;
  for (const q of service.questions) {
    const a = answers[q.key] ?? q.initial;
    if (q.type === "number") {
      const n = Number(a);
      if (!Number.isFinite(n) || n < (q.min ?? 0) || n > (q.max ?? 100000)) throw new Error(`${q.label}: enter a number from ${q.min} to ${q.max}`);
      const over = Math.max(0, Math.floor(n) - (q.included ?? 0));
      extraL += over * (q.labour ?? 0); extraM += over * (q.material ?? 0); minutes += over * (q.minutes ?? 0);
    } else if (q.type === "yesno") {
      if (typeof a !== "boolean") throw new Error(`${q.label}: choose yes or no`);
      if (a) { extraL += q.labour ?? 0; extraM += q.material ?? 0; minutes += q.minutes ?? 0; }
    } else {
      const o = q.options?.find((x) => x.value === a);
      if (!o) throw new Error(`${q.label}: choose one of the options`);
      extraL += o.labour ?? 0; extraM += o.material ?? 0; pct += o.pct ?? 0;
    }
  }
  const adjust = Math.round(((labour + material + extraL + extraM) * pct) / 100);
  const travel = Math.round(km * TRAVEL_PER_KM);
  const lines = [
    { label: "Labour", amount: labour },
    { label: "Materials", amount: material },
    { label: "Extra work from your answers", amount: extraL + extraM },
    { label: pct < 0 ? "Site discount" : "Complexity and grade", amount: adjust },
    { label: `Travel, ${km} km`, amount: travel },
  ].filter((l) => l.amount !== 0);
  return { lines, total: lines.reduce((t, l) => t + l.amount, 0), hours: Math.ceil(minutes / 30) / 2, km };
}
