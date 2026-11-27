"use client";
import Link from "next/link";
import { useState } from "react";
import { CityPoint, defaultPoint } from "@/components/AddressForm.tsx";
import ServicePicker from "@/components/ServicePicker.tsx";
import Theme from "@/components/Theme.tsx";
import Ticket from "@/components/Ticket.tsx";
import { Empty, Head, Upload } from "@/components/ui.tsx";
import { day, MAX_CANCELS, OWE_LIMIT } from "@/lib/engine.ts";
import { ACTIVE, jobValue, lookup, money, when } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Dashboard() {
  const { state } = useApp();
  const s = state!, me = s.me!, w = s.workers.find((x) => x.userId === me.id), l = lookup(s);
  const [now] = useState(() => Date.now());
  const head = <Head title={`Hey, ${me.name.split(" ")[0]}`}><Theme /></Head>;
  if (!w || w.status === "rejected") return <>{head}{w && <p className="banner warn">Your application was not approved. Correct your details and send it again.</p>}<Register /></>;
  if (w.status !== "approved") return <>{head}<Empty title={w.status === "pending" ? "We are checking your documents" : "Your account is suspended"}>
    <p>{w.status === "pending" ? "You can accept jobs once an administrator approves you." : "Contact support."}</p></Empty></>;

  const month = day(now).slice(0, 7);
  const done = s.bookings.filter((b) => b.status === "confirmed" && day(b.completedAt ?? b.createdAt).startsWith(month));
  const earned = done.reduce((t, b) => t + jobValue(b) * (1 - b.commissionRate) + b.tip, 0);
  const requests = s.bookings.filter((b) => b.status === "requested");
  const upcoming = s.bookings.filter((b) => ACTIVE.includes(b.status) && b.status !== "requested").sort((a, b) => (a.appointmentAt ?? "z").localeCompare(b.appointmentAt ?? "z"));
  // Reminder for visits in the next 24 hours
  const soon = upcoming.filter((b) => b.appointmentAt && ["scheduled", "on_the_way"].includes(b.status) && Date.parse(b.appointmentAt) - now < 864e5);

  return (
    <>
      {head}
      <section className="earn"><p>Earned this month, after commission</p><strong>{money(earned)}</strong><small>{done.length} completed {done.length === 1 ? "job" : "jobs"}, tips included</small></section>
      {w.balance! > 0 && <Link className={`banner${w.blocked ? " warn" : ""}`} href="/worker/wallet"><b>You owe {money(w.balance!)} commission</b><span>{w.blocked ? "New jobs are paused. Pay now to continue." : `New jobs pause at ${money(OWE_LIMIT)}.`}</span></Link>}
      <div className="tiles">
        <div className="tile amber"><strong>{requests.length}</strong><span>New requests</span></div>
        <div className="tile dark"><strong>{w.rating?.toFixed(1) ?? "New"}</strong><span>Rating from {w.reviews}</span></div>
        <div className="tile"><strong>{w.jobs}</strong><span>Jobs completed</span></div>
        <div className="tile"><strong>{MAX_CANCELS - w.cancelsThisMonth}</strong><span>Cancellations left</span></div>
        <div className="tile violet"><strong>{w.reliability}%</strong><span>Reliability</span></div>
        <div className="tile"><strong>{s.bookings.filter((b) => b.status === "cancelled").length}</strong><span>Cancelled bookings</span></div>
      </div>
      {soon.map((b) => {
        const c = l.user(b.customerId);
        return <Link key={b.id} className="reminder" href={`/worker/jobs/${b.id}`}>
          <b>Visit {when(b.appointmentAt!)}</b>
          <span>{l.service(b.serviceId).name} for {c?.name}, {c?.phone}</span><span>{b.address}, {money(jobValue(b))}</span>{b.notes && <span>{b.notes}</span>}
        </Link>;
      })}
      <h3 className="section">Requests</h3>
      <div className="grid">{requests.map((b) => <Ticket key={b.id} b={b} />)}</div>
      {requests.length === 0 && <Empty title="No new requests" />}
      <h3 className="section">Upcoming</h3>
      <div className="grid">{upcoming.map((b) => <Ticket key={b.id} b={b} />)}</div>
      {upcoming.length === 0 && <Empty title="Nothing scheduled" />}
    </>
  );
}

function Register() {
  const { act } = useApp();
  const [point, setPoint] = useState(defaultPoint), [services, setServices] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string[]>([]), [idDoc, setId] = useState<string[]>([]), [cert, setCert] = useState<string[]>([]);
  return (
    <form onSubmit={(e) => {
      e.preventDefault(); const f = new FormData(e.currentTarget);
      act("register_worker", { address: f.get("address"), ...point, experience: Number(f.get("experience")), qualifications: f.get("qualifications"), bio: f.get("bio"),
        service_ids: services, photo_path: photo[0] ?? null, id_doc_path: idDoc[0] ?? null, cert_path: cert[0] ?? null }, "Application sent");
    }}>
      <h2 className="display">Apply to work</h2>
      <div className="card">
        <label className="field">Residential address<input name="address" required minLength={5} maxLength={200} /></label>
        <CityPoint value={point} onChange={setPoint} />
        <label className="field">Years of experience<input name="experience" type="number" min={0} max={60} required /></label>
        <label className="field">Qualifications or certificates<input name="qualifications" maxLength={600} /></label>
        <label className="field">About your work<textarea name="bio" maxLength={600} /></label>
      </div>
      <h3 className="section">Services you can do</h3>
      <ServicePicker value={services} onChange={setServices} />
      <h3 className="section">Documents</h3>
      <Upload label="Profile photo" value={photo} onChange={setPhoto} max={1} />
      <Upload label="National identity card or passport" value={idDoc} onChange={setId} max={1} accept="image/jpeg,image/png,image/webp,application/pdf" />
      <Upload label="Certificate (optional)" value={cert} onChange={setCert} max={1} accept="image/jpeg,image/png,image/webp,application/pdf" />
      <button className="btn wide" disabled={!services.length || !photo.length || !idDoc.length}>Send application</button>
    </form>
  );
}
