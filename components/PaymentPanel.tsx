"use client";
import { Banknote, CreditCard } from "lucide-react";
import { useState } from "react";
import { commissionOf } from "@/lib/engine.ts";
import { jobValue, money } from "@/lib/format.ts";
import { DEMO, useApp } from "@/lib/store.tsx";
import type { Booking } from "@/lib/types.ts";

export default function PaymentPanel({ b }: { b: Booking }) {
  const { state, act, payByCard } = useApp();
  const [busy, setBusy] = useState(false);
  if (["cancelled", "declined"].includes(b.status)) return null;
  const worker = state!.me!.role === "worker", card = b.paymentMethod === "card";
  const total = money(jobValue(b)), cut = money(commissionOf(b)), done = b.status === "confirmed";
  const title = b.paidAt ? (card ? "Paid by card" : "Cash job") : card ? (done ? "Card payment due" : "Paying by card") : "Paying in cash";
  const text = worker
    ? card ? (b.paidAt ? `Your share, ${money(jobValue(b) - commissionOf(b))}, is on your account.` : done ? "Waiting for the customer to pay." : `You receive ${money(jobValue(b) - commissionOf(b))} after the customer pays online.`)
      : `Collect ${total} from the customer. Commission of ${cut} ${b.paidAt ? "was added" : "is added"} to your account.`
    : card ? (b.paidAt ? `${total} received.` : done ? `Pay ${total} to finish this booking.` : "You pay online after you confirm the work.")
      : done ? `Hand ${total} to the worker in cash.` : `Pay the worker ${total} in cash when the job is done.`;
  return (
    <section className={`card paybox${card && done && !b.paidAt ? " due" : ""}`}>
      <div className="who">{card ? <CreditCard /> : <Banknote />}<span><b>{title}</b><small>{text}</small></span></div>
      {!worker && card && done && !b.paidAt && <button className="btn wide" disabled={busy} onClick={async () => {
        setBusy(true);
        if (DEMO) await act("demo_card_payment", { booking_id: b.id }, "Test payment recorded"); else await payByCard(b.id);
        setBusy(false);
      }}>Pay {total}{DEMO ? " (test)" : ""}</button>}
      {!worker && card && done && !b.paidAt && <small>{DEMO ? "Sample mode. No card is charged." : "You pay on PayHere's secure page. It can take a minute to show here. You can also pay the worker in cash."}</small>}
      {worker && card && done && !b.paidAt && <details><summary>The customer paid me in cash</summary>
        <p>Use this only after you have the money. {cut} commission goes on your account.</p>
        <button className="btn wide" onClick={() => act("confirm_cash", { booking_id: b.id }, "Cash recorded")}>I received {total}</button></details>}
    </section>
  );
}
