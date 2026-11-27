"use client";
import { useState } from "react";
import { Empty, Head, Upload } from "@/components/ui.tsx";
import { OWE_LIMIT } from "@/lib/engine.ts";
import { date, money } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";

export default function Wallet() {
  const { state, act } = useApp();
  const s = state!, w = s.workers.find((x) => x.userId === s.me!.id);
  const [slip, setSlip] = useState<string[]>([]);
  if (!w) return <><Head title="Wallet" /><Empty title="Your wallet opens after you register" /></>;
  const balance = w.balance ?? 0, pending = s.settlements.find((x) => x.status === "pending");
  const bank = process.env.NEXT_PUBLIC_BANK_DETAILS || "Ask GetItDone support for the bank account.";
  return (
    <>
      <Head title="Wallet" />
      <section className="earn">
        <p>{balance > 0 ? "You owe GetItDone" : balance < 0 ? "GetItDone owes you" : "Nothing to pay"}</p>
        <strong>{money(Math.abs(balance))}</strong>
        {balance > 0 && <div className="meter" role="meter" aria-label="Commission limit used" aria-valuemin={0} aria-valuemax={OWE_LIMIT} aria-valuenow={Math.min(balance, OWE_LIMIT)}><i style={{ width: `${Math.min(100, (balance / OWE_LIMIT) * 100)}%` }} /></div>}
        <small>{balance >= OWE_LIMIT ? "New jobs are paused until you pay." : balance > 0 ? `New jobs pause at ${money(OWE_LIMIT)}.` : balance < 0 ? "Paid out by the finance team. It also covers future cash commission." : "Commission from cash jobs appears here."}</small>
      </section>
      {pending && <p className="banner">Checking your payment of {money(pending.amount)}, reference {pending.reference}.</p>}
      {balance > 0 && !pending && (
        <form key={balance} className="card" onSubmit={async (e) => {
          e.preventDefault(); const f = new FormData(e.currentTarget);
          if (await act("submit_settlement", { amount: Number(f.get("amount")), reference: f.get("reference"), slip_path: slip[0] }, "Sent for checking")) setSlip([]);
        }}>
          <h3>Pay by bank transfer</h3>
          <p className="banner">{bank}</p>
          <label className="field">Amount (LKR)<input name="amount" type="number" min={1} max={balance} defaultValue={balance} required /></label>
          <label className="field">Bank reference number<input name="reference" required minLength={3} maxLength={80} /></label>
          <Upload label="Add a photo of the bank slip" value={slip} onChange={setSlip} max={1} accept="image/jpeg,image/png,image/webp,application/pdf" />
          <button className="btn wide" disabled={!slip.length}>Send payment details</button>
        </form>
      )}
      {s.settlements.filter((x) => x.status === "rejected").slice(0, 2).map((x) => <p className="banner warn" key={x.id}>{money(x.amount)} was not accepted: {x.note}</p>)}
      <h3 className="section">History</h3>
      {s.ledger.length > 0 && <p className="muted">Plus is in your favour. Minus is taken from your account.</p>}
      {!s.ledger.length && <Empty title="No payments yet" />}
      <ul className="list">{s.ledger.map((e) => (
        <li className="card entry" key={e.id}><span><b>{e.note}</b><small>{date(e.createdAt)}</small></span><b>{e.amount < 0 ? "+" : "−"}{money(Math.abs(e.amount))}</b></li>
      ))}</ul>
    </>
  );
}
