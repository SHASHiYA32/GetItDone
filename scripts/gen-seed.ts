import { writeFileSync } from "node:fs";
import { SERVICES } from "../lib/catalog.ts";
const q = (v: string) => `'${v.replaceAll("'", "''")}'`;
writeFileSync(new URL("../supabase/seed.sql", import.meta.url),
  "-- Generated from lib/catalog.ts by `npm run seed:gen`\n" +
  SERVICES.map((s) => `insert into public.services values (${q(s.id)}, ${q(s.category)}, ${q(s.name)}, ${s.labour}, ${s.material}, ${s.minutes}, ${q(JSON.stringify(s.questions))}) on conflict (id) do update set category=excluded.category, name=excluded.name, labour=excluded.labour, material=excluded.material, minutes=excluded.minutes, questions=excluded.questions;`).join("\n") + "\n");
