"use client";
import { CATEGORIES } from "@/lib/catalog.ts";
import { useApp } from "@/lib/store.tsx";

export default function ServicePicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { state } = useApp();
  return <>{CATEGORIES.map((c) => (
    <fieldset className="card question" key={c.id}><legend>{c.name}</legend>
      <div className="chips">{state!.services.filter((s) => s.category === c.id).map((s) => (
        <button type="button" key={s.id} aria-pressed={value.includes(s.id)} onClick={() => onChange(value.includes(s.id) ? value.filter((v) => v !== s.id) : [...value, s.id])}>{s.name}</button>
      ))}</div></fieldset>
  ))}</>;
}
