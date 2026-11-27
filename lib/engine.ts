// Sample-data backend used when Supabase keys are not set. Same rules as supabase/schema.sql.
import { calcEstimate, COMMISSION, distanceKm } from "./pricing.ts";
import type { Answers, Args, Booking, State, Status, User, Worker } from "./types.ts";

export type DB = Omit<State, "me" | "mfaRequired">;
const HOUR = 3600e3;
export const CANCEL_FEE = 50;
export const MAX_CANCELS = 6;
/** A worker who owes this much commission cannot take new jobs until they pay. */
export const OWE_LIMIT = 5000;
export const jobValue = (b: Booking) => b.estimate.total + (b.extraStatus === "approved" ? b.extraAmount : 0);
export const commissionOf = (b: Booking) => Math.round(jobValue(b) * b.commissionRate);
export const balanceOf = (db: Pick<DB, "ledger">, workerId: string) => db.ledger.reduce((t, e) => t + (e.workerId === workerId ? e.amount : 0), 0);
export const day = (d: string | number | Date) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Colombo" });
const fail = (m: string): never => { throw new Error(m); };
const uid = () => globalThis.crypto.randomUUID();
const text = (v: unknown, name: string, max = 500, min = 1) => {
  const t = String(v ?? "").trim();
  if (t.length < min || t.length > max) fail(`${name} must be ${min} to ${max} characters`);
  return t;
};

export function stats(db: DB, w: Worker, now = Date.now()): Worker {
  const reviews = db.reviews.filter((r) => r.workerId === w.userId);
  const cancels = db.bookings.filter((b) => b.workerId === w.userId && b.cancelledBy === "worker");
  const avg = reviews.length ? reviews.reduce((t, r) => t + r.rating, 0) / reviews.length : null;
  const balance = balanceOf(db, w.userId);
  return {
    ...w,
    balance, blocked: balance >= OWE_LIMIT,
    reviews: reviews.length,
    rating: avg === null ? null : Math.max(1, Math.round((avg - 0.05 * cancels.length) * 10) / 10),
    jobs: db.bookings.filter((b) => b.workerId === w.userId && b.status === "confirmed").length,
    reliability: Math.max(0, 100 - 5 * cancels.filter((b) => now - Date.parse(b.cancelledAt!) < 90 * 24 * HOUR).length),
    cancelsThisMonth: cancels.filter((b) => day(b.cancelledAt!).slice(0, 7) === day(now).slice(0, 7)).length,
  };
}

const PERMS: Record<string, string[]> = {
  verify: ["super", "verification"], customers: ["super", "support"],
  bookings: ["super", "bookings", "support"], staff: ["super"], finance: ["super", "finance"],
};
export const can = (u: User | null, perm: string) => !!u && u.role === "admin" && !u.suspended && PERMS[perm].includes(u.staffRole ?? "");

export function view(db: DB, userId: string | null): State {
  const me = db.users.find((u) => u.id === userId) ?? null;
  const empty: State = { me, services: db.services, users: [], workers: [], addresses: [], bookings: [], messages: [], reviews: [], locations: [], notifications: [], complaints: [], ledger: [], settlements: [] };
  if (!me) return empty;
  const admin = me.role === "admin";
  const mine = db.bookings.filter((b) => admin || b.customerId === me.id || b.workerId === me.id);
  const open = mine.filter((b) => !["requested", "declined", "cancelled"].includes(b.status));
  const contacts = new Set(open.flatMap((b) => [b.customerId, b.workerId]));
  const workers = db.workers.map((w) => stats(db, w)).filter((w) => admin || w.userId === me.id || w.status === "approved" || mine.some((b) => b.workerId === w.userId));
  const visible = new Set([me.id, ...workers.map((w) => w.userId), ...mine.flatMap((b) => [b.customerId, b.workerId])]);
  const ids = new Set(mine.map((b) => b.id));
  const disputed = new Set(db.complaints.map((c) => c.bookingId));
  return {
    ...empty,
    users: db.users.filter((u) => admin || visible.has(u.id)).map((u) =>
      admin || u.id === me.id || contacts.has(u.id) ? u : { ...u, phone: null, email: null, staffRole: null }),
    workers: workers.map((w) => ({ ...w,
      ...(w.userId === me.id || can(me, "verify") ? {} : { documents: [], address: null }),
      ...(w.userId === me.id || can(me, "finance") ? {} : { balance: null }) })),
    ledger: db.ledger.filter((e) => e.workerId === me.id || can(me, "finance")),
    settlements: db.settlements.filter((e) => e.workerId === me.id || can(me, "finance")),
    addresses: db.addresses.filter((a) => a.userId === me.id),
    bookings: mine.map((b) => me.role === "worker" && ["requested", "declined", "cancelled"].includes(b.status)
      ? { ...b, address: b.city, lat: null, lng: null } : b),
    messages: db.messages.filter((m) => admin ? can(me, "bookings") && disputed.has(m.bookingId) : ids.has(m.bookingId)),
    reviews: db.reviews,
    locations: db.locations.filter((l) => mine.some((b) => b.id === l.bookingId && ["on_the_way", "arrived"].includes(b.status))),
    notifications: db.notifications.filter((n) => n.userId === me.id),
    complaints: db.complaints.filter((c) => can(me, "bookings") || c.userId === me.id),
  };
}

export function apply(source: DB, userId: string, action: string, args: Args, now = Date.now()): DB {
  const db: DB = structuredClone(source);
  const me = db.users.find((u) => u.id === userId) ?? fail("Sign in again");
  if (me.suspended) fail("This account is suspended. Contact support.");
  const iso = new Date(now).toISOString();
  const note = (to: string, title: string, body: string, bookingId: string | null = null) =>
    db.notifications.unshift({ id: uid(), userId: to, title, body, bookingId, read: false, createdAt: iso });
  const booking = (role?: "customer" | "worker", ...allowed: Status[]): Booking => {
    const b = db.bookings.find((x) => x.id === args.booking_id) ?? fail("Booking not found");
    const side = b.customerId === me.id ? "customer" : b.workerId === me.id ? "worker" : fail("Booking not found");
    if (role && role !== side) fail("You cannot do this on this booking");
    if (allowed.length && !allowed.includes(b.status)) fail("This booking has moved on. Refresh and try again.");
    return b;
  };
  const other = (b: Booking) => (b.customerId === me.id ? b.workerId : b.customerId);
  const need = (perm: string) => { if (!can(me, perm)) fail("Your staff role does not allow this"); };
  const entry = (workerId: string, kind: DB["ledger"][number]["kind"], amount: number, text_: string, bookingId: string | null = null) =>
    db.ledger.unshift({ id: uid(), workerId, bookingId, kind, amount, note: text_, createdAt: iso });
  // Cash goes straight to the worker, so they now owe the commission
  const charge = (b: Booking) => {
    if (b.paymentMethod !== "cash" || b.paidAt) return;
    b.paidAt = iso; entry(b.workerId, "cash_commission", commissionOf(b), `Commission on cash job ${b.code}`, b.id);
    if (balanceOf(db, b.workerId) >= OWE_LIMIT) note(b.workerId, "Pay your commission", "You cannot take new jobs until you pay.");
  };
  const money = (v: unknown) => { const n = Number(v); if (!(Number.isInteger(n) && n > 0 && n <= 10000000)) fail("Enter an amount in whole rupees"); return n; };

  switch (action) {
    case "create_booking": {
      if (me.role !== "customer") fail("Only customers can book");
      if (db.bookings.filter((b) => b.customerId === me.id && now - Date.parse(b.createdAt) < HOUR).length >= 10) fail("Too many bookings in one hour. Try again later.");
      if (db.bookings.some((b) => b.customerId === me.id && b.status === "confirmed" && b.paymentMethod === "card" && !b.paidAt)) fail("Pay for your last card job before booking again");
      const method = args.payment_method ?? "cash";
      if (method !== "cash" && method !== "card") fail("Choose cash or card");
      const service = db.services.find((s) => s.id === args.service_id) ?? fail("Service not found");
      const w = db.workers.find((x) => x.userId === args.worker_id && x.status === "approved" && x.services.includes(service.id)) ?? fail("This worker is not available for this service");
      if (db.users.find((u) => u.id === w.userId)!.suspended || balanceOf(db, w.userId) >= OWE_LIMIT) fail("This worker is not available");
      const a = db.addresses.find((x) => x.id === args.address_id && x.userId === me.id) ?? fail("Choose one of your addresses");
      const answers = args.answers as Answers;
      const id = uid();
      db.bookings.unshift({
        id, code: "GD-" + id.slice(0, 6).toUpperCase(), customerId: me.id, workerId: w.userId, serviceId: service.id, answers,
        notes: text(args.notes, "Notes", 1000, 0), address: a.line, city: a.city, lat: a.lat, lng: a.lng,
        estimate: calcEstimate(service, answers, distanceKm(w.lat, w.lng, a.lat, a.lng)), commissionRate: COMMISSION,
        status: "requested", createdAt: iso, appointmentAt: null, proposedAt: null, proposedBy: null, wasRescheduled: false,
        completedAt: null, cancelledAt: null, cancelledBy: null, cancelFee: 0, tip: 0, extraAmount: 0, extraReason: "", extraStatus: null,
        photos: ((args.photos as string[]) ?? []).slice(0, 4), donePhotos: [], paymentMethod: method as Booking["paymentMethod"], paidAt: null,
      });
      note(w.userId, "New booking request", `${service.name} in ${a.city}`, id);
      break;
    }
    case "worker_respond": {
      const b = booking("worker", "requested");
      if (db.workers.find((w) => w.userId === me.id)?.status !== "approved") fail("Your account is not approved yet");
      if (args.accept && balanceOf(db, me.id) >= OWE_LIMIT) fail("Pay your commission before accepting new jobs");
      b.status = args.accept ? "accepted" : "declined";
      note(b.customerId, args.accept ? "Booking accepted" : "Booking declined", args.accept ? `${me.name} accepted ${b.code}. Agree a date next.` : `${me.name} cannot take ${b.code}. Choose another worker.`, b.id);
      break;
    }
    case "send_message": {
      const b = booking(undefined, "accepted", "scheduled", "on_the_way", "arrived", "completed", "disputed");
      if (db.messages.filter((m) => m.senderId === me.id && now - Date.parse(m.createdAt) < 60e3).length >= 20) fail("Slow down a little, then send again");
      db.messages.push({ id: uid(), bookingId: b.id, senderId: me.id, body: text(args.body, "Message", 1000), createdAt: iso });
      note(other(b), `Message from ${me.name}`, String(args.body).slice(0, 80), b.id);
      break;
    }
    case "propose_time": {
      const b = booking(undefined, "accepted", "scheduled");
      const at = Date.parse(String(args.at));
      if (!(at > now)) fail("Pick a time in the future");
      b.proposedAt = new Date(at).toISOString(); b.proposedBy = me.id === b.workerId ? "worker" : "customer";
      note(other(b), "New date proposed", `${me.name} suggested a time for ${b.code}`, b.id);
      break;
    }
    case "respond_time": {
      const b = booking(undefined, "accepted", "scheduled");
      const side = me.id === b.workerId ? "worker" : "customer";
      if (!b.proposedAt || b.proposedBy === side) fail("There is no date waiting for your answer");
      if (args.accept) { b.wasRescheduled = !!b.appointmentAt; b.appointmentAt = b.proposedAt; b.status = "scheduled"; }
      b.proposedAt = null; b.proposedBy = null;
      note(other(b), args.accept ? "Date confirmed" : "Date declined", `${b.code}`, b.id);
      break;
    }
    case "start_trip": {
      const b = booking("worker", "scheduled");
      if (day(b.appointmentAt!) !== day(now)) fail("You can share your location on the appointment date only");
      b.status = "on_the_way"; b.proposedAt = null; b.proposedBy = null;
      note(b.customerId, "Your worker is on the way", `${me.name} is travelling to you`, b.id);
      break;
    }
    case "share_location": {
      const b = booking("worker", "on_the_way");
      const lat = Number(args.lat), lng = Number(args.lng);
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) fail("Location is not valid");
      db.locations = db.locations.filter((l) => l.bookingId !== b.id);
      db.locations.push({ bookingId: b.id, lat, lng, updatedAt: iso });
      break;
    }
    case "mark_arrived": {
      const b = booking("worker", "on_the_way"); b.status = "arrived";
      db.locations = db.locations.filter((l) => l.bookingId !== b.id);
      note(b.customerId, "Your worker has arrived", me.name, b.id);
      break;
    }
    case "mark_completed": {
      const b = booking("worker", "arrived");
      if (b.extraStatus === "pending") fail("Wait for the customer to answer your price change");
      b.status = "completed"; b.completedAt = iso;
      note(b.customerId, "Job marked as completed", `Check the work and confirm ${b.code}`, b.id);
      break;
    }
    case "confirm_completion": {
      const b = booking("customer", "completed"); b.status = "confirmed"; charge(b);
      note(b.workerId, "Completion confirmed", b.code, b.id);
      break;
    }
    case "submit_review": {
      const b = booking("customer", "confirmed");
      if (db.reviews.some((r) => r.bookingId === b.id)) fail("You already reviewed this job");
      const rating = Number(args.rating), tip = Number(args.tip ?? 0);
      if (![1, 2, 3, 4, 5].includes(rating)) fail("Choose 1 to 5 stars");
      if (!(Number.isInteger(tip) && tip >= 0 && tip <= 100000)) fail("Tip must be from 0 to 100,000");
      b.tip = tip; b.donePhotos = ((args.photos as string[]) ?? []).slice(0, 4);
      db.reviews.unshift({ id: uid(), bookingId: b.id, workerId: b.workerId, author: me.name.split(" ")[0], rating, comment: text(args.comment, "Review", 1000, 0), createdAt: iso });
      note(b.workerId, "You have a new review", `${rating} out of 5`, b.id);
      break;
    }
    case "cancel_booking": {
      const b = booking(undefined, "requested", "accepted", "scheduled", "on_the_way");
      const side = me.id === b.workerId ? "worker" : "customer";
      if (side === "worker") {
        if (b.status === "requested") fail("Decline the request instead");
        if (stats(db, db.workers.find((w) => w.userId === me.id)!, now).cancelsThisMonth >= MAX_CANCELS) fail(`You have used all ${MAX_CANCELS} cancellations this month. Contact support.`);
      } else if (b.status !== "requested" && now - Date.parse(b.createdAt) > HOUR) b.cancelFee = CANCEL_FEE;
      b.status = "cancelled"; b.cancelledAt = iso; b.cancelledBy = side;
      db.locations = db.locations.filter((l) => l.bookingId !== b.id);
      note(other(b), "Booking cancelled", `${me.name} cancelled ${b.code}`, b.id);
      break;
    }
    case "request_extra": {
      const b = booking("worker", "accepted", "scheduled", "arrived");
      const amount = Number(args.amount);
      if (!(Number.isInteger(amount) && amount > 0 && amount <= 1000000)) fail("Enter an amount in whole rupees");
      if (b.extraStatus) fail("A price change was already requested for this job");
      b.extraAmount = amount; b.extraReason = text(args.reason, "Reason", 300, 5); b.extraStatus = "pending";
      note(b.customerId, "Price change needs your approval", b.extraReason, b.id);
      break;
    }
    case "respond_extra": {
      const b = booking("customer", "accepted", "scheduled", "arrived");
      if (b.extraStatus !== "pending") fail("Nothing to approve");
      b.extraStatus = args.approve ? "approved" : "declined";
      note(b.workerId, args.approve ? "Price change approved" : "Price change declined", b.code, b.id);
      break;
    }
    case "raise_issue": {
      const b = booking(undefined, "accepted", "scheduled", "on_the_way", "arrived", "completed", "confirmed");
      if (b.status === "confirmed" && now - Date.parse(b.completedAt!) > 48 * HOUR) fail("Problems can be reported for 48 hours after completion");
      db.complaints.unshift({ id: uid(), bookingId: b.id, userId: me.id, body: text(args.body, "Description", 1000, 10), status: "open", resolution: "", createdAt: iso });
      b.status = "disputed"; db.locations = db.locations.filter((l) => l.bookingId !== b.id);
      note(other(b), "A problem was reported", `${b.code} is under review`, b.id);
      break;
    }
    case "save_address": {
      if (db.addresses.filter((a) => a.userId === me.id).length >= 10) fail("You can save up to 10 addresses");
      const lat = Number(args.lat), lng = Number(args.lng);
      if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) fail("Location is not valid");
      db.addresses.push({ id: uid(), userId: me.id, label: text(args.label, "Label", 40), line: text(args.line, "Address", 200, 5), city: text(args.city, "City", 60), lat, lng });
      break;
    }
    case "delete_address": db.addresses = db.addresses.filter((a) => !(a.id === args.id && a.userId === me.id)); break;
    case "update_profile": me.name = text(args.name, "Name", 80, 2); me.phone = text(args.phone, "Phone", 20, 9); break;
    case "register_worker": {
      if (me.role !== "worker") fail("Use a worker account");
      const old = db.workers.find((w) => w.userId === me.id);
      if (old && old.status !== "rejected") fail("You already applied");
      const services = args.service_ids as string[];
      if (!services?.length) fail("Choose at least one service");
      if (!args.id_doc_path || !args.photo_path) fail("Add your photo and identity document");
      db.workers = db.workers.filter((w) => w.userId !== me.id);
      db.workers.push({
        userId: me.id, status: "pending", city: text(args.city, "City", 60), lat: Number(args.lat), lng: Number(args.lng),
        address: text(args.address, "Address", 200, 5), experience: Math.min(60, Math.max(0, Number(args.experience) || 0)),
        bio: text(args.bio, "About you", 600, 0), qualifications: text(args.qualifications, "Qualifications", 600, 0), services,
        documents: [["photo", args.photo_path], ["identity", args.id_doc_path], ["certificate", args.cert_path]].filter(([, p]) => p).map(([kind, path]) => ({ kind: String(kind), path: String(path) })),
        rating: null, reviews: 0, jobs: 0, reliability: 100, cancelsThisMonth: 0, balance: 0, blocked: false,
      });
      db.users.filter((u) => can(u, "verify")).forEach((u) => note(u.id, "Worker waiting for verification", me.name));
      break;
    }
    case "set_worker_services": {
      const w = db.workers.find((x) => x.userId === me.id) ?? fail("Complete your registration first");
      const ids = (args.service_ids as string[]).filter((i) => db.services.some((s) => s.id === i));
      if (!ids.length) fail("Keep at least one service");
      w.services = ids; break;
    }
    case "admin_review_worker": {
      need("verify");
      const w = db.workers.find((x) => x.userId === args.worker_id) ?? fail("Worker not found");
      if (!["approved", "rejected", "suspended"].includes(String(args.status))) fail("Unknown status");
      w.status = args.status as Worker["status"];
      note(w.userId, `Your account is ${w.status}`, w.status === "approved" ? "You can now accept jobs." : "Contact support for details.");
      break;
    }
    case "admin_set_suspended": {
      need("customers");
      const u = db.users.find((x) => x.id === args.user_id && x.role === "customer") ?? fail("Customer not found");
      u.suspended = !!args.suspended; break;
    }
    case "admin_resolve": {
      need("bookings");
      const c = db.complaints.find((x) => x.id === args.complaint_id && x.status === "open") ?? fail("Complaint not found");
      const b = db.bookings.find((x) => x.id === c.bookingId)!;
      if (!["confirmed", "cancelled"].includes(String(args.outcome))) fail("Unknown outcome");
      c.resolution = text(args.note, "Resolution note", 500, 5); c.status = "resolved";
      b.status = args.outcome as Status;
      if (b.status === "confirmed") { b.completedAt ??= iso; charge(b); }
      if (b.status === "cancelled") {
        b.cancelledAt = iso; b.cancelledBy = "admin";
        // Take back anything this job put on the worker's account
        const net = db.ledger.filter((e) => e.bookingId === b.id).reduce((t, e) => t + e.amount, 0);
        if (net) entry(b.workerId, "reversal", -net, `Reversed after dispute on ${b.code}`, b.id);
      }
      [b.customerId, b.workerId].forEach((id) => note(id, "Dispute resolved", c.resolution, b.id));
      break;
    }
    case "admin_cancel_booking": {
      need("bookings");
      const b = db.bookings.find((x) => x.id === args.booking_id && ["requested", "accepted", "scheduled", "on_the_way", "arrived"].includes(x.status)) ?? fail("This booking cannot be cancelled");
      b.status = "cancelled"; b.cancelledAt = iso; b.cancelledBy = "admin";
      [b.customerId, b.workerId].forEach((id) => note(id, "Booking cancelled by support", b.code, b.id));
      break;
    }
    case "admin_set_staff": {
      need("staff");
      const u = db.users.find((x) => x.email?.toLowerCase() === String(args.email).trim().toLowerCase()) ?? fail("No account with that email. Ask them to sign up first.");
      if (u.id === me.id) fail("You cannot change your own role");
      const role = String(args.staff_role || "") as User["staffRole"] | "";
      if (role && !["super", "verification", "support", "bookings", "finance"].includes(role)) fail("Unknown role");
      if (u.role !== "admin" && db.bookings.some((b) => b.customerId === u.id || b.workerId === u.id)) fail("Use a separate account for staff");
      u.role = role ? "admin" : "customer"; u.staffRole = role || null; break;
    }
    case "confirm_cash": {
      // The customer could not or did not pay by card and handed over cash instead
      const b = booking("worker", "confirmed");
      if (b.paymentMethod !== "card" || b.paidAt) fail("This job is already paid");
      b.paymentMethod = "cash"; charge(b);
      note(b.customerId, "Cash payment recorded", b.code, b.id); break;
    }
    case "demo_card_payment": {
      // Sample mode only. Real payments are recorded by the PayHere server callback.
      const b = booking("customer", "confirmed");
      if (b.paymentMethod !== "card" || b.paidAt) fail("This job is already paid");
      b.paidAt = iso; entry(b.workerId, "card_earning", -(jobValue(b) - commissionOf(b)), `Card job ${b.code}, after commission`, b.id);
      note(b.workerId, "Customer paid by card", b.code, b.id); break;
    }
    case "submit_settlement": {
      const amount = money(args.amount);
      if (amount > balanceOf(db, me.id)) fail("That is more than you owe");
      if (db.settlements.some((s) => s.workerId === me.id && s.status === "pending")) fail("Your last payment is still being checked");
      if (!args.slip_path) fail("Add a photo of the bank slip");
      db.settlements.unshift({ id: uid(), workerId: me.id, amount, reference: text(args.reference, "Reference", 80, 3), slip: String(args.slip_path), status: "pending", note: "", createdAt: iso });
      db.users.filter((u) => can(u, "finance")).forEach((u) => note(u.id, "Commission payment to check", me.name));
      break;
    }
    case "admin_review_settlement": {
      need("finance");
      const s = db.settlements.find((x) => x.id === args.settlement_id && x.status === "pending") ?? fail("Payment not found");
      s.status = args.approve ? "approved" : "rejected";
      s.note = args.approve ? "" : text(args.note, "Reason", 300, 5);
      if (args.approve) entry(s.workerId, "payment", -s.amount, `Bank payment ${s.reference}`);
      note(s.workerId, args.approve ? "Payment approved" : "Payment not accepted", s.note || s.reference); break;
    }
    case "admin_record_settlement": {
      need("finance");
      const w = db.workers.find((x) => x.userId === args.worker_id) ?? fail("Worker not found");
      const amount = money(args.amount), balance = balanceOf(db, w.userId), ref = text(args.reference, "Reference", 80, 3);
      if (args.kind === "payment") { if (amount > balance) fail("That is more than the worker owes"); entry(w.userId, "payment", -amount, `Received ${ref}`); }
      else if (args.kind === "payout") { if (amount > -balance) fail("That is more than you owe the worker"); entry(w.userId, "payout", amount, `Paid out ${ref}`); }
      else fail("Unknown payment type");
      note(w.userId, args.kind === "payment" ? "Commission payment received" : "Payout sent", ref); break;
    }
    case "admin_confirm_booking": {
      need("bookings");
      const b = db.bookings.find((x) => x.id === args.booking_id && x.status === "completed" && now - Date.parse(x.completedAt!) > 48 * HOUR) ?? fail("Only jobs unconfirmed for 48 hours can be closed");
      b.status = "confirmed"; charge(b);
      [b.customerId, b.workerId].forEach((id) => note(id, "Job closed by support", b.code, b.id)); break;
    }
    case "mark_notifications_read": db.notifications.forEach((n) => { if (n.userId === me.id) n.read = true; }); break;
    default: fail("Unknown action");
  }
  return db;
}
