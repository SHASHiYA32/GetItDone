"use client";
import { MessageCircle, Navigation, Phone, Send, Star } from "lucide-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { CANCEL_FEE, day, MAX_CANCELS } from "@/lib/engine.ts";
import { lookup, money, time, when } from "@/lib/format.ts";
import { distanceKm } from "@/lib/pricing.ts";
import { DEMO, showError, useApp } from "@/lib/store.tsx";
import type { Booking } from "@/lib/types.ts";
import PaymentPanel from "./PaymentPanel.tsx";
import { Avatar, Empty, Head, Photos, Pill, Rating, Slide, Slip, Upload } from "./ui.tsx";

const TrackMap = dynamic(() => import("./Map.tsx"), { ssr: false });

export default function BookingDetail({ id }: { id: string }) {
  const { state, act } = useApp();
  const s = state!, me = s.me!, l = lookup(s);
  const b = s.bookings.find((x) => x.id === id);
  const [now] = useState(() => Date.now());
  if (!b) return <><Head title="Booking" back /><Empty title="Booking not found" /></>;
  const isWorker = me.role === "worker";
  const other = l.user(isWorker ? b.customerId : b.workerId);
  const w = s.workers.find((x) => x.userId === b.workerId);
  const service = l.service(b.serviceId);
  const go = (action: string, args: object = {}, ok?: string) => act(action, { booking_id: b.id, ...args }, ok);
  const open = ["accepted", "scheduled", "on_the_way", "arrived", "completed", "disputed"].includes(b.status);
  const wa = other?.phone?.replace(/\D/g, "").replace(/^0/, "94");

  return (
    <>
      <Head title={service.name} back />
      <section className="person card">
        <Avatar name={other?.name ?? "?"} />
        <span><b>{other?.name}</b>{!isWorker && w ? <Rating value={w.rating} count={w.reviews} /> : <small>{b.code}</small>}</span>
        <Pill status={b.status} />
        {open && other?.phone && (
          <div className="contact">
            <a className="btn dark" href={`tel:${other.phone}`}><Phone />Call</a>
            <a className="btn soft" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer"><MessageCircle />WhatsApp</a>
          </div>
        )}
      </section>

      {isWorker && b.status === "requested" && (
        <section className="hero-card">
          <h2>New request in {b.city}</h2>
          <p>You see the street address and phone number after you accept.</p>
          <Slide label="Slide to accept" onDone={() => go("worker_respond", { accept: true }, "Booking accepted")} />
          <button className="btn ghost wide" onClick={() => go("worker_respond", { accept: false }, "Booking declined")}>Decline</button>
        </section>
      )}

      {b.extraStatus === "pending" && (
        <section className="banner warn">
          <b>Price change: {money(b.extraAmount)} more</b><p>{b.extraReason}</p>
          {isWorker ? <small>Waiting for the customer to answer.</small> : (
            <div className="actions"><button className="btn" onClick={() => go("respond_extra", { approve: true }, "Price change approved")}>Approve</button>
              <button className="btn soft" onClick={() => go("respond_extra", { approve: false }, "Price change declined")}>Decline</button></div>
          )}
        </section>
      )}

      {["accepted", "scheduled"].includes(b.status) && <Schedule b={b} />}
      {(b.status === "scheduled" || b.status === "on_the_way" || b.status === "arrived") && <Visit b={b} />}

      {isWorker && b.status === "arrived" && <Slide label="Slide to mark completed" onDone={() => go("mark_completed", {}, "Job marked as completed")} />}
      {isWorker && b.status === "completed" && <p className="banner">Waiting for the customer to confirm.</p>}
      {!isWorker && b.status === "completed" && (
        <section className="hero-card"><h2>Is the work finished?</h2><p>Confirm only after you have checked it.</p>
          <Slide label="Slide to confirm" onDone={() => go("confirm_completion", {}, "Completion confirmed")} /></section>
      )}
      {!isWorker && b.status === "confirmed" && !s.reviews.some((r) => r.bookingId === b.id) && <ReviewForm b={b} />}
      {s.reviews.filter((r) => r.bookingId === b.id).map((r) => (
        <section className="card" key={r.id}><h3>Review: {r.rating} out of 5</h3><p>{r.comment || "No comment"}</p>{b.donePhotos.length > 0 && <Photos paths={b.donePhotos} />}</section>
      ))}
      {s.complaints.filter((c) => c.bookingId === b.id).map((c) => (
        <section className="banner warn" key={c.id}><b>{c.status === "open" ? "Support is reviewing this" : "Resolved"}</b><p>{c.resolution || c.body}</p></section>
      ))}

      <PaymentPanel b={b} />

      {open && <Chat b={b} />}

      <section className="card">
        <h3>Job details</h3>
        <p>{b.address}</p>
        <dl className="facts">{service.questions.map((q) => {
          const a = b.answers[q.key] ?? q.initial;
          return <div key={q.key}><dt>{q.label}</dt><dd>{q.type === "yesno" ? (a ? "Yes" : "No") : q.type === "choice" ? q.options?.find((o) => o.value === a)?.label : `${a} ${q.unit ?? ""}`}</dd></div>;
        })}</dl>
        {b.notes && <p>{b.notes}</p>}
        {b.photos.length > 0 && <Photos paths={b.photos} />}
      </section>
      <Slip estimate={b.estimate} extra={b.extraStatus === "approved" ? { amount: b.extraAmount, reason: b.extraReason } : null} tip={b.tip} fee={b.cancelFee} />

      {isWorker && ["accepted", "scheduled", "arrived"].includes(b.status) && !b.extraStatus && <ExtraForm b={b} />}
      {(["accepted", "scheduled", "on_the_way", "arrived", "completed"].includes(b.status) || (b.status === "confirmed" && now - Date.parse(b.completedAt!) < 48 * 3600e3)) && <Report b={b} />}
      {((!isWorker && ["requested", "accepted", "scheduled", "on_the_way"].includes(b.status)) || (isWorker && ["accepted", "scheduled", "on_the_way"].includes(b.status))) && (
        <Cancel b={b} left={MAX_CANCELS - (w?.cancelsThisMonth ?? 0)} />
      )}
    </>
  );
}

function Schedule({ b }: { b: Booking }) {
  const { state, act } = useApp();
  const side = state!.me!.role;
  const [now] = useState(() => Date.now());
  const days = Array.from({ length: 21 }, (_, i) => day(now + i * 864e5));
  const [d, setD] = useState(days[1]), [t, setT] = useState("09:00"), [open, setOpen] = useState(!b.appointmentAt);
  return (
    <section className="card">
      <h3>{b.appointmentAt ? when(b.appointmentAt) : "Pick a visit date"}</h3>
      {b.proposedAt && (b.proposedBy === side ? <p className="banner">You suggested {when(b.proposedAt)}. Waiting for an answer.</p> : (
        <div className="banner warn"><b>Suggested: {when(b.proposedAt)}</b>
          <div className="actions"><button className="btn" onClick={() => act("respond_time", { booking_id: b.id, accept: true }, "Date confirmed")}>Accept date</button>
            <button className="btn soft" onClick={() => act("respond_time", { booking_id: b.id, accept: false }, "Date declined")}>Decline</button></div></div>
      ))}
      {!open ? <button className="btn soft wide" onClick={() => setOpen(true)}>Ask to change the date</button> : <>
        <div className="strip" role="group" aria-label="Day">{days.map((x) => {
          const dt = new Date(`${x}T12:00:00+05:30`);
          return <button key={x} aria-pressed={x === d} onClick={() => setD(x)}><small>{dt.toLocaleDateString("en-GB", { weekday: "short" })}</small><b>{dt.getDate()}</b></button>;
        })}</div>
        <label className="field">Time (Sri Lanka)<input type="time" value={t} onChange={(e) => setT(e.target.value)} required /></label>
        <button className="btn wide" disabled={!t} onClick={async () => {
          if (await act("propose_time", { booking_id: b.id, at: new Date(`${d}T${t}:00+05:30`).toISOString() }, "Date sent")) setOpen(false);
        }}>Suggest this date</button>
      </>}
    </section>
  );
}

function Visit({ b }: { b: Booking }) {
  const { state, act } = useApp();
  const isWorker = state!.me!.role === "worker";
  const loc = state!.locations.find((x) => x.bookingId === b.id);
  const [sharing, setSharing] = useState(false);
  const today = day(b.appointmentAt!) === day(Date.now());
  const last = useRef(0);

  // Send the worker's position while this screen is open and sharing is on
  useEffect(() => {
    if (!isWorker || !sharing || b.status !== "on_the_way") return;
    if (!navigator.geolocation) { showError(new Error("This device cannot share location")); setSharing(false); return; }
    const id = navigator.geolocation.watchPosition((p) => {
      if (Date.now() - last.current < 8000) return;
      last.current = Date.now();
      act("share_location", { booking_id: b.id, lat: p.coords.latitude, lng: p.coords.longitude });
    }, () => { showError(new Error("Allow location access to share your trip")); setSharing(false); }, { enableHighAccuracy: true });
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line
  }, [isWorker, sharing, b.status, b.id]);

  if (!today && b.status === "scheduled") return null;
  const home: [number, number] = [b.lat!, b.lng!];
  const km = loc ? distanceKm(loc.lat, loc.lng, ...home) : null;
  const demoMove = () => {
    const w = state!.workers.find((x) => x.userId === b.workerId)!;
    const from = loc ?? { lat: w.lat - 0.02, lng: w.lng + 0.015 };
    act("share_location", { booking_id: b.id, lat: from.lat + (home[0] - from.lat) * 0.35, lng: from.lng + (home[1] - from.lng) * 0.35 });
  };
  return (
    <section className="visit">
      {b.status !== "scheduled" && <>
        <TrackMap home={home} worker={loc ? [loc.lat, loc.lng] : null} />
        <div className="eta">
          <Navigation />
          {b.status === "arrived" ? <span><b>Arrived</b><small>At the job address</small></span>
            : km === null ? <span><b>Waiting for location</b><small>{isWorker ? "Turn on sharing below" : "Your worker has not shared it yet"}</small></span>
            : <span><b>About {Math.max(1, Math.round((km / 25) * 60))} min</b><small>{km} km away, updated {time(loc!.updatedAt)}</small></span>}
        </div>
      </>}
      {isWorker && b.status === "scheduled" && <Slide label="Slide when you set off" onDone={async () => { if (await act("start_trip", { booking_id: b.id }, "Customer notified")) setSharing(true); }} />}
      {isWorker && b.status === "on_the_way" && <>
        <label className="switch"><input type="checkbox" checked={sharing} onChange={(e) => setSharing(e.target.checked)} /><span>Share my location<small>Only the customer and support can see it. Keep this screen open.</small></span></label>
        {DEMO && <button className="btn soft wide" onClick={demoMove}>Simulate movement</button>}
        <Slide label="Slide when you arrive" onDone={() => act("mark_arrived", { booking_id: b.id }, "Arrival sent")} />
      </>}
    </section>
  );
}

function Chat({ b }: { b: Booking }) {
  const { state, act } = useApp();
  const msgs = state!.messages.filter((m) => m.bookingId === b.id);
  const [text, setText] = useState("");
  return (
    <section className="card">
      <h3>Messages</h3>
      <ol className="chat">{msgs.length === 0 && <li className="muted">No messages yet. Agree the details here.</li>}
        {msgs.map((m) => <li key={m.id} className={m.senderId === state!.me!.id ? "mine" : ""}><p>{m.body}</p><small>{time(m.createdAt)}</small></li>)}</ol>
      <form className="send" onSubmit={async (e) => { e.preventDefault(); if (text.trim() && await act("send_message", { booking_id: b.id, body: text })) setText(""); }}>
        <input aria-label="Message" placeholder="Write a message" maxLength={1000} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="round accent" aria-label="Send"><Send /></button>
      </form>
    </section>
  );
}

function ReviewForm({ b }: { b: Booking }) {
  const { act } = useApp();
  const [rating, setRating] = useState(0), [comment, setComment] = useState(""), [tip, setTip] = useState(0), [photos, setPhotos] = useState<string[]>([]);
  return (
    <section className="card">
      <h3>Rate this job</h3>
      <div className="stars" role="group" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => <button key={n} aria-pressed={n <= rating} aria-label={`${n} stars`} onClick={() => setRating(n)}><Star /></button>)}</div>
      <label className="field">Review<textarea maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could be better?" /></label>
      <Upload label="Add photos of the finished work" value={photos} onChange={setPhotos} />
      <p className="label">Tip (optional, paid directly to the worker)</p>
      <div className="chips">{[0, 200, 500, 1000].map((n) => <button key={n} aria-pressed={tip === n} onClick={() => setTip(n)}>{n ? money(n) : "No tip"}</button>)}</div>
      <button className="btn wide" disabled={!rating} onClick={() => act("submit_review", { booking_id: b.id, rating, comment, tip, photos }, "Review saved")}>Save review</button>
    </section>
  );
}

function ExtraForm({ b }: { b: Booking }) {
  const { act } = useApp();
  return (
    <details className="card"><summary>The work is different from the request</summary>
      <form onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("request_extra", { booking_id: b.id, amount: Number(f.get("amount")), reason: f.get("reason") }, "Sent for approval"); }}>
        <label className="field">Extra amount (LKR)<input name="amount" type="number" min={1} max={1000000} step={1} required /></label>
        <label className="field">Reason<input name="reason" minLength={5} maxLength={300} required /></label>
        <button className="btn wide">Ask for approval</button>
      </form></details>
  );
}

function Report({ b }: { b: Booking }) {
  const { act } = useApp();
  return (
    <details className="card"><summary>Report a problem</summary>
      <form onSubmit={(e) => { e.preventDefault(); act("raise_issue", { booking_id: b.id, body: new FormData(e.currentTarget).get("body") }, "Sent to support"); }}>
        <label className="field">What happened?<textarea name="body" minLength={10} maxLength={1000} required /></label>
        <button className="btn wide">Send to support</button>
      </form></details>
  );
}

function Cancel({ b, left }: { b: Booking; left: number }) {
  const { state, act } = useApp();
  const isWorker = state!.me!.role === "worker";
  const fee = !isWorker && b.status !== "requested" && Date.now() - Date.parse(b.createdAt) > 3600e3;
  return (
    <details className="card danger"><summary>Cancel booking</summary>
      <p>{isWorker ? `You have ${Math.max(0, left)} of ${MAX_CANCELS} cancellations left this month. Each one lowers your rating and reliability score.`
        : fee ? `It is more than one hour since you booked, so a ${money(CANCEL_FEE)} fee applies.` : "No fee applies right now."}</p>
      <button className="btn red wide" disabled={isWorker && left <= 0} onClick={() => act("cancel_booking", { booking_id: b.id }, "Booking cancelled")}>Cancel booking</button>
    </details>
  );
}
