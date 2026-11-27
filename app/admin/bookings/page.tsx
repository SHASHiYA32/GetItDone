"use client";
import { useState } from "react";
import Table, { Search } from "@/components/Table.tsx";
import { Empty, Head, Pill, Photos, Slip } from "@/components/ui.tsx";
import { can } from "@/lib/engine.ts";
import { jobValue, lookup, money, when } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import type { Booking } from "@/lib/types.ts";

const TABS: [string, (b: Booking) => boolean][] = [
  ["Disputed", (b) => b.status === "disputed"], ["New", (b) => b.status === "requested"], ["Accepted", (b) => b.status === "accepted"],
  ["Pending visits", (b) => ["scheduled", "on_the_way", "arrived", "completed"].includes(b.status)],
  ["Rescheduled", (b) => b.wasRescheduled], ["Completed", (b) => b.status === "confirmed"], ["Cancelled", (b) => ["cancelled", "declined"].includes(b.status)],
];

export default function Bookings() {
  const { state, act } = useApp();
  const s = state!, l = lookup(s);
  const [tab, setTab] = useState(0), [q, setQ] = useState("");
  const [now] = useState(() => Date.now());
  if (!can(s.me, "bookings")) return <Empty title="Your staff role does not include bookings" />;
  const list = s.bookings.filter((b) => TABS[tab][1](b) && `${b.code} ${l.name(b.customerId)} ${l.name(b.workerId)} ${b.city}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <>
      <Head title="Bookings" />
      <div className="toolbar">
        <div className="tabs">{TABS.map(([n, f], i) => <button key={n} aria-selected={i === tab} onClick={() => setTab(i)}>{n} ({s.bookings.filter(f).length})</button>)}</div>
        <Search value={q} onChange={setQ} label="Search code, name or town" />
      </div>
      <Table rows={list} id={(b) => b.id} empty="Nothing in this list" columns={[
        { title: "Booking", cell: (b) => <><b>{l.service(b.serviceId).name}</b><small>{b.code}</small></> },
        { title: "Customer", cell: (b) => l.name(b.customerId) },
        { title: "Worker", cell: (b) => l.name(b.workerId) },
        { title: "Town", cell: (b) => b.city },
        { title: "Visit", cell: (b) => (b.appointmentAt ? when(b.appointmentAt) : "No date yet") },
        { title: "Amount", cell: (b) => money(jobValue(b)), num: true },
        { title: "Payment", cell: (b) => `${b.paymentMethod === "card" ? "Card" : "Cash"}${b.status === "confirmed" && !b.paidAt ? ", unpaid" : ""}` },
        { title: "Status", cell: (b) => <Pill status={b.status} /> },
      ]} detail={(b) => (
        <div className="detail-grid">
          <div><h3>Job</h3><p>{b.address}</p><p>{b.notes}</p><Photos paths={[...b.photos, ...b.donePhotos]} /></div>
          <div><Slip estimate={b.estimate} extra={b.extraStatus === "approved" ? { amount: b.extraAmount, reason: b.extraReason } : null} tip={b.tip} fee={b.cancelFee} /></div>
          <div>
            {s.complaints.filter((c) => c.bookingId === b.id).map((c) => (
              <div className="banner warn" key={c.id}><b>Complaint from {l.name(c.userId)}</b><p>{c.body}</p>
                <details><summary>Messages</summary>{s.messages.filter((m) => m.bookingId === b.id).map((m) => <p key={m.id}>{l.name(m.senderId)}: {m.body}</p>)}</details>
                {c.status === "open" ? (
                  <form onSubmit={(e) => { e.preventDefault(); const ev = e.nativeEvent as SubmitEvent; act("admin_resolve", { complaint_id: c.id, note: new FormData(e.currentTarget).get("note"), outcome: (ev.submitter as HTMLButtonElement).value }, "Dispute resolved"); }}>
                    <label className="field">Resolution note<input name="note" required minLength={5} maxLength={500} /></label>
                    <div className="actions"><button className="btn" value="confirmed">Close as completed</button><button className="btn soft" value="cancelled">Cancel booking</button></div>
                    <small>Cancelling reverses any commission or earnings. Refund card payments in PayHere.</small>
                  </form>
                ) : <p>Resolved: {c.resolution}</p>}
              </div>
            ))}
            {b.status === "completed" && now - Date.parse(b.completedAt!) > 48 * 3600e3 && <button className="btn wide" onClick={() => act("admin_confirm_booking", { booking_id: b.id }, "Job closed")}>Close unconfirmed job</button>}
            {["requested", "accepted", "scheduled", "on_the_way", "arrived"].includes(b.status) && <details><summary>Cancel this booking</summary><button className="btn red" onClick={() => act("admin_cancel_booking", { booking_id: b.id }, "Booking cancelled")}>Cancel booking</button></details>}
          </div>
        </div>
      )} />
    </>
  );
}
