"use client";
import { useState } from "react";
import Install from "@/components/Install.tsx";
import ProfileForm from "@/components/ProfileForm.tsx";
import ServicePicker from "@/components/ServicePicker.tsx";
import Theme from "@/components/Theme.tsx";
import { Head } from "@/components/ui.tsx";
import { useApp } from "@/lib/store.tsx";

export default function Profile() {
  const { state, act, signOut } = useApp();
  const w = state!.workers.find((x) => x.userId === state!.me!.id);
  const [services, setServices] = useState<string[] | null>(null);
  const reviews = state!.reviews.filter((r) => r.workerId === state!.me!.id);
  return (
    <>
      <Head title="Profile"><Theme /></Head>
      <ProfileForm />
      {w && <>
        <h3 className="section">Your services</h3>
        <ServicePicker value={services ?? w.services} onChange={setServices} />
        <button className="btn wide" disabled={!services} onClick={async () => { if (await act("set_worker_services", { service_ids: services }, "Services saved")) setServices(null); }}>Save services</button>
        <h3 className="section">Reviews</h3>
        {reviews.map((r) => <div className="card" key={r.id}><b>{r.rating} out of 5, {r.author}</b><p>{r.comment}</p></div>)}
        {!reviews.length && <p className="muted">Reviews appear after your first completed job.</p>}
      </>}
      <Install />
      <button className="btn soft wide mobile-only" onClick={signOut}>Sign out</button>
    </>
  );
}
