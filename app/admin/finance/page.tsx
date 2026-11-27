"use client";
import { useState } from "react";
import Table, { Search } from "@/components/Table.tsx";
import { Empty, Head, Photos } from "@/components/ui.tsx";
import { can, OWE_LIMIT } from "@/lib/engine.ts";
import { date, lookup, money } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Finance() {
  const { state, act } = useApp();
  const s = state!, l = lookup(s);
  const [q, setQ] = useState("");
  if (!can(s.me, "finance")) return <Empty title="Your staff role does not include payments" />;
  const owed = s.workers.reduce((t, w) => t + Math.max(0, w.balance ?? 0), 0);
  const owing = s.workers.reduce((t, w) => t + Math.max(0, -(w.balance ?? 0)), 0);
  const pending = s.settlements.filter((x) => x.status === "pending");
  const accounts = s.workers.filter((w) => w.balance !== 0 && l.name(w.userId).toLowerCase().includes(q.toLowerCase())).sort((a, b) => b.balance! - a.balance!);
  return (
    <>
      <Head title="Payments" />
      <div className="tiles">
        <div className="tile violet"><strong>{money(owed)}</strong><span>Workers owe you</span></div>
        <div className="tile"><strong>{money(owing)}</strong><span>You owe workers</span></div>
        <div className="tile amber"><strong>{pending.length}</strong><span>Bank slips to check</span></div>
        <div className="tile dark"><strong>{s.workers.filter((w) => w.blocked).length}</strong><span>Paused at {money(OWE_LIMIT)}</span></div>
      </div>

      <h2 className="subhead">Bank slips to check</h2>
      {!pending.length && <Empty title="No payments to check" />}
      <div className="grid">{pending.map((x) => (
        <article className="card" key={x.id}>
          <div className="entry"><span><b>{l.name(x.workerId)}</b><small>{date(x.createdAt)}, reference {x.reference}</small></span><b>{money(x.amount)}</b></div>
          <Photos paths={[x.slip]} />
          <p className="muted">Match the amount and reference against your bank statement before approving.</p>
          <button className="btn wide" onClick={() => act("admin_review_settlement", { settlement_id: x.id, approve: true }, "Payment approved")}>Approve payment</button>
          <details><summary>Reject</summary><form onSubmit={(e) => { e.preventDefault(); act("admin_review_settlement", { settlement_id: x.id, approve: false, note: new FormData(e.currentTarget).get("note") }, "Payment rejected"); }}>
            <label className="field">Reason<input name="note" required minLength={5} maxLength={300} /></label><button className="btn red wide">Reject payment</button></form></details>
        </article>
      ))}</div>

      <div className="toolbar"><h2 className="subhead">Worker accounts</h2><Search value={q} onChange={setQ} label="Search worker" /></div>
      <Table rows={accounts} id={(w) => w.userId} empty="All accounts are settled" columns={[
        { title: "Worker", cell: (w) => <><b>{l.name(w.userId)}</b><small>{l.user(w.userId)?.phone}</small></> },
        { title: "Direction", cell: (w) => (w.balance! > 0 ? "Owes you" : "You owe") },
        { title: "Amount", cell: (w) => money(Math.abs(w.balance!)), num: true },
        { title: "Jobs", cell: (w) => (w.blocked ? <span className="pill s-disputed">Paused</span> : <span className="pill">Active</span>) },
      ]} detail={(w) => {
        const due = w.balance! > 0, kind = due ? "payment" : "payout";
        return (
          <div className="detail-grid">
            <form key={w.balance} onSubmit={(e) => { e.preventDefault(); const f = new FormData(e.currentTarget); act("admin_record_settlement", { worker_id: w.userId, kind, amount: Number(f.get("amount")), reference: f.get("reference") }, "Recorded"); }}>
              <h3>{due ? "Record money received" : "Record a payout you made"}</h3>
              <label className="field">Amount (LKR)<input name="amount" type="number" min={1} max={Math.abs(w.balance!)} defaultValue={Math.abs(w.balance!)} required /></label>
              <label className="field">Receipt or transfer reference<input name="reference" required minLength={3} maxLength={80} /></label>
              <button className="btn wide">{due ? "Record payment" : "Record payout"}</button>
            </form>
            <div><h3>Recent entries</h3>{s.ledger.filter((e) => e.workerId === w.userId).slice(0, 8).map((e) => <p className="entry" key={e.id}><span>{date(e.createdAt)}, {e.note}</span><b>{e.amount > 0 ? "+" : "−"}{money(Math.abs(e.amount))}</b></p>)}</div>
          </div>
        );
      }} />
    </>
  );
}
