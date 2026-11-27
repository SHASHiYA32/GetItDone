"use client";
import { useRouter } from "next/navigation";
import { use, useState } from "react";
import AddressForm from "@/components/AddressForm.tsx";
import PaymentChoice from "@/components/PaymentChoice.tsx";
import { Avatar, Empty, Head, Rating, Slide, Slip, Upload } from "@/components/ui.tsx";
import { money } from "@/lib/format.ts";
import { calcEstimate, distanceKm } from "@/lib/pricing.ts";
import { useApp } from "@/lib/store.tsx";
import type { Answers, Estimate, PaymentMethod } from "@/lib/types.ts";

const STEPS = ["Job", "Address", "Worker", "Price"];

export default function Book({ params }: { params: Promise<{ service: string }> }) {
  const id = use(params).service;
  const { state, act } = useApp();
  const router = useRouter();
  const s = state!.services.find((x) => x.id === id);
  const [step, setStep] = useState(0), [answers, setAnswers] = useState<Answers>({}), [notes, setNotes] = useState(""), [photos, setPhotos] = useState<string[]>([]);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [addressId, setAddress] = useState(""), [workerId, setWorker] = useState(""), [adding, setAdding] = useState(false);
  if (!s) return <><Head title="Book" back /><Empty title="Service not found" /></>;

  const full: Answers = { ...Object.fromEntries(s.questions.map((q) => [q.key, q.type === "number" ? Math.max(Number(q.initial ?? 0), q.min ?? 0) : q.initial!])), ...answers };
  const set = (k: string, v: Answers[string]) => setAnswers({ ...answers, [k]: v });
  const problem = s.questions.find((q) => q.type === "number" && !(typeof full[q.key] === "number" && (full[q.key] as number) >= q.min! && (full[q.key] as number) <= q.max!));
  const address = state!.addresses.find((a) => a.id === addressId) ?? state!.addresses[0];
  const options = !address || problem ? [] : state!.workers
    .filter((w) => w.status === "approved" && w.services.includes(s.id))
    .map((w) => ({ w, e: calcEstimate(s, full, distanceKm(w.lat, w.lng, address.lat, address.lng)) as Estimate }))
    .sort((a, b) => (b.w.rating ?? 0) - (a.w.rating ?? 0) || a.e.km - b.e.km);
  const chosen = options.find((o) => o.w.userId === workerId);

  return (
    <>
      <Head title={s.name} back />
      <ol className="steps">{STEPS.map((n, i) => <li key={n} className={i === step ? "on" : i < step ? "past" : ""} aria-current={i === step ? "step" : undefined}>
        <button disabled={i >= step} onClick={() => setStep(i)}>{n}</button></li>)}</ol>

      {step === 0 && (
        <form onSubmit={(e) => { e.preventDefault(); setStep(1); }}>
          {s.questions.map((q) => (
            <fieldset className="card question" key={q.key}>
              <legend>{q.label}</legend>
              {q.type === "number" && <div className="number">
                <button type="button" className="round" aria-label="Less" onClick={() => set(q.key, Math.max(q.min!, Number(full[q.key]) - (q.unit ? 10 : 1)))}>−</button>
                <input type="number" inputMode="numeric" aria-label={q.label} min={q.min} max={q.max} step={1} required value={full[q.key] === "" ? "" : Number(full[q.key])} onChange={(e) => set(q.key, e.target.value === "" ? "" : Math.floor(Number(e.target.value)))} />
                {q.unit && <span>{q.unit}</span>}
                <button type="button" className="round accent" aria-label="More" onClick={() => set(q.key, Math.min(q.max!, Number(full[q.key]) + (q.unit ? 10 : 1)))}>+</button>
              </div>}
              {q.type === "yesno" && <div className="chips">{[true, false].map((v) => <button type="button" key={String(v)} aria-pressed={full[q.key] === v} onClick={() => set(q.key, v)}>{v ? "Yes" : "No"}</button>)}</div>}
              {q.type === "choice" && <div className="chips">{q.options!.map((o) => <button type="button" key={o.value} aria-pressed={full[q.key] === o.value} onClick={() => set(q.key, o.value)}>{o.label}</button>)}</div>}
            </fieldset>
          ))}
          <label className="field">Anything else the worker should know?<textarea maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          <Upload label="Add photos of the work area (optional)" value={photos} onChange={setPhotos} />
          <button className="btn wide">Continue</button>
        </form>
      )}

      {step === 1 && <>
        {state!.addresses.map((a) => (
          <button key={a.id} className="row card choice" aria-pressed={a.id === address?.id} onClick={() => setAddress(a.id)}><span><b>{a.label}</b><small>{a.line}, {a.city}</small></span></button>
        ))}
        {adding || state!.addresses.length === 0 ? <AddressForm onSaved={() => setAdding(false)} /> : <button className="btn soft wide" onClick={() => setAdding(true)}>Add another address</button>}
        <button className="btn wide" disabled={!address} onClick={() => setStep(2)}>See workers and prices</button>
      </>}

      {step === 2 && <>
        {options.length === 0 && <Empty title="No verified workers yet"><p>Nobody offers this service right now. Check again soon.</p></Empty>}
        {options.map(({ w, e }) => {
          const name = state!.users.find((u) => u.id === w.userId)?.name ?? "Worker";
          return (
            <article className="pro card" key={w.userId}>
              <Avatar name={name} size={56} />
              <div><h3>{name}</h3><Rating value={w.rating} count={w.reviews} /><p>{w.bio}</p>
                <div className="tags"><span>{w.experience} years</span><span>{e.km} km away</span><span>{w.jobs} {w.jobs === 1 ? "job" : "jobs"} done</span><span>{w.reliability}% reliable</span></div></div>
              {state!.reviews.filter((r) => r.workerId === w.userId && r.comment).slice(0, 2).map((r) => <blockquote key={r.id}>{r.comment} <cite>{r.author}</cite></blockquote>)}
              <button className="btn wide" onClick={() => { setWorker(w.userId); setStep(3); }}>Choose, {money(e.total)}</button>
            </article>
          );
        })}
      </>}

      {step === 3 && chosen && address && <>
        <p className="banner">This is an estimate. If the actual work differs, the price changes only after you approve it.</p>
        <Slip estimate={chosen.e} />
        <PaymentChoice value={method} onChange={setMethod} />
        <p className="muted">Cancelling is free for one hour after booking. After that, if the worker has accepted, a LKR 50 fee applies.</p>
        <Slide label="Slide to book" onDone={async () => {
          if (await act("create_booking", { service_id: s.id, worker_id: workerId, address_id: address.id, answers: full, notes, photos, payment_method: method }, "Request sent")) router.replace("/customer/bookings");
        }} />
        <button className="btn ghost wide" onClick={() => router.replace("/customer")}>Cancel</button>
      </>}
    </>
  );
}
