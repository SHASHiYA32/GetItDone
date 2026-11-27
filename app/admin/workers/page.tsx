"use client";
import { useState } from "react";
import Table, { Search } from "@/components/Table.tsx";
import { Empty, Head, Photos, Rating } from "@/components/ui.tsx";
import { can } from "@/lib/engine.ts";
import { lookup, money } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Workers() {
  const { state, act } = useApp();
  const s = state!, l = lookup(s);
  const [tab, setTab] = useState("pending"), [q, setQ] = useState("");
  if (!can(s.me, "verify")) return <Empty title="Your staff role does not include workers" />;
  const list = s.workers.filter((w) => w.status === tab && `${l.name(w.userId)} ${w.city} ${l.user(w.userId)?.phone}`.toLowerCase().includes(q.toLowerCase()));
  const set = (id: string, status: string) => act("admin_review_worker", { worker_id: id, status }, `Worker ${status}`);
  return (
    <>
      <Head title="Workers" />
      <div className="toolbar">
        <div className="tabs">{["pending", "approved", "suspended", "rejected"].map((t) => <button key={t} aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)} ({s.workers.filter((w) => w.status === t).length})</button>)}</div>
        <Search value={q} onChange={setQ} label="Search name, town or phone" />
      </div>
      <Table rows={list} id={(w) => w.userId} empty="No workers here" columns={[
        { title: "Worker", cell: (w) => <b>{l.name(w.userId)}</b> },
        { title: "Town", cell: (w) => w.city },
        { title: "Experience", cell: (w) => `${w.experience} years`, num: true },
        { title: "Rating", cell: (w) => <Rating value={w.rating} count={w.reviews} /> },
        { title: "Jobs", cell: (w) => w.jobs, num: true },
        { title: "Cancelled this month", cell: (w) => w.cancelsThisMonth, num: true },
        { title: "Reliability", cell: (w) => `${w.reliability}%`, num: true },
      ]} detail={(w) => {
        const u = l.user(w.userId)!;
        return (
          <div className="detail-grid">
            <div><h3>Contact</h3><p>{u.phone}<br />{u.email}<br />{w.address}</p><p>{w.qualifications || "No certificates listed."}</p><p>{w.bio}</p>
              {w.balance !== null && <p>{w.balance === 0 ? "Account settled" : `${w.balance > 0 ? "Owes you" : "You owe"} ${money(Math.abs(w.balance))}`}{w.blocked ? ". New jobs paused." : ""}</p>}</div>
            <div><h3>Services</h3><div className="tags">{w.services.map((id) => <span key={id}>{l.service(id).name}</span>)}</div>
              <h3>Feedback ({w.reviews})</h3>{s.reviews.filter((r) => r.workerId === w.userId).slice(0, 5).map((r) => <p key={r.id}>{r.rating} of 5: {r.comment}</p>)}</div>
            <div><h3>Documents</h3>{w.documents.map((d) => <div key={d.path}><p className="label">{d.kind}</p><Photos paths={[d.path]} /></div>)}</div>
            <div className="actions">
              {w.status !== "approved" && <button className="btn" onClick={() => set(w.userId, "approved")}>Approve</button>}
              {w.status === "pending" && <button className="btn soft" onClick={() => set(w.userId, "rejected")}>Reject</button>}
              {w.status === "approved" && <button className="btn red" onClick={() => set(w.userId, "suspended")}>Suspend</button>}
            </div>
          </div>
        );
      }} />
    </>
  );
}
