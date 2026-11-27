"use client";
import { useState } from "react";
import { ACTIVE } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import Ticket from "./Ticket.tsx";
import { Empty, Head } from "./ui.tsx";

export default function BookingList({ title }: { title: string }) {
  const { state } = useApp();
  const [past, setPast] = useState(false);
  const list = state!.bookings.filter((b) => ACTIVE.includes(b.status) !== past);
  return (
    <>
      <Head title={title} />
      <div className="tabs"><button aria-selected={!past} onClick={() => setPast(false)}>Active</button><button aria-selected={past} onClick={() => setPast(true)}>History</button></div>
      <div className="grid">{list.map((b) => <Ticket key={b.id} b={b} />)}</div>
      {list.length === 0 && <Empty title={past ? "No past bookings" : "No active bookings"} />}
    </>
  );
}
