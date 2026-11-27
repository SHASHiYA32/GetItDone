"use client";
import Link from "next/link";
import { useEffect } from "react";
import { when } from "@/lib/format.ts";
import { useApp } from "@/lib/store.tsx";
import { Empty, Head } from "./ui.tsx";

export default function Alerts() {
  const { state, act } = useApp();
  const me = state!.me!;
  const unread = state!.notifications.some((n) => !n.read);
  useEffect(() => () => { if (unread) act("mark_notifications_read"); /* mark when leaving */ // eslint-disable-next-line
  }, [unread]);
  return (
    <>
      <Head title="Notifications" back />
      {state!.notifications.length === 0 && <Empty title="Nothing new"><p>Booking updates appear here.</p></Empty>}
      <ul className="list">{state!.notifications.map((n) => {
        const body = <><b>{n.title}</b><span>{n.body}</span><small>{when(n.createdAt)}</small></>;
        return <li key={n.id} className={`card note${n.read ? "" : " new"}`}>{n.bookingId
          ? <Link href={`/${me.role}/${me.role === "worker" ? "jobs" : "bookings"}/${n.bookingId}`}>{body}</Link> : <div>{body}</div>}</li>;
      })}</ul>
    </>
  );
}
