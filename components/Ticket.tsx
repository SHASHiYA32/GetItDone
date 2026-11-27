"use client";
import Link from "next/link";
import { date, jobValue, lookup, money, time } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import type { Booking } from "@/lib/types.ts";
import { Avatar, ICONS, Pill } from "./ui.tsx";

export default function Ticket({ b }: { b: Booking }) {
  const { state } = useApp();
  const l = lookup(state!);
  const worker = state!.me!.role === "worker";
  const other = l.name(worker ? b.customerId : b.workerId);
  const s = l.service(b.serviceId), Icon = ICONS[s.category];
  const at = b.appointmentAt;
  return (
    <Link className="ticket" href={`/${worker ? "worker/jobs" : "customer/bookings"}/${b.id}`}>
      <div className="who"><Avatar name={other} size={44} /><span><b>{other}</b><small>{b.code}</small></span><Pill status={b.status} /></div>
      <div className="leg">
        <span><strong>{at ? time(at) : "Time"}</strong><small>{at ? date(at) : "not set"}</small></span>
        <span className="trail"><i><Icon /></i></span>
        <span><strong>{b.city}</strong><small>{s.name}</small></span>
      </div>
      <div className="foot"><span>Estimate</span><b>{money(jobValue(b))}</b></div>
    </Link>
  );
}
