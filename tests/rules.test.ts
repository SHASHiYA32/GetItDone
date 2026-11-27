import assert from "node:assert/strict";
import { test } from "node:test";
import { apply, view } from "../lib/engine.ts";
import { sampleData } from "../lib/sample.ts";

const now = Date.parse("2026-11-25T06:00:00Z");
const db = sampleData(now);
const requested = db.bookings.find((b) => b.status === "requested")!;

test("strangers cannot see or touch a booking", () => {
  assert.ok(!view(db, "nimali").bookings.some((b) => b.id === requested.id));
  assert.throws(() => apply(db, "nimali", "cancel_booking", { booking_id: requested.id }, now), /not found/);
});
test("street address and phone stay hidden until acceptance", () => {
  assert.equal(view(db, "kasun").bookings.find((b) => b.id === requested.id)!.address, "Colombo");
});
test("late customer cancellation costs LKR 50", () => {
  const b = db.bookings.find((x) => x.customerId === "nimali" && x.status === "scheduled")!;
  assert.equal(apply(db, "nimali", "cancel_booking", { booking_id: b.id }, now).bookings.find((x) => x.id === b.id)!.cancelFee, 50);
});
test("cash commission is owed, payment clears it, and the limit blocks new jobs", () => {
  const owed = view(db, "ruwan").workers.find((w) => w.userId === "ruwan")!.balance!;
  assert.ok(owed > 0);
  const slip = db.settlements[0];
  const paid = apply(db, "admin", "admin_review_settlement", { settlement_id: slip.id, approve: true }, now);
  assert.equal(view(paid, "ruwan").workers.find((w) => w.userId === "ruwan")!.balance, owed - slip.amount);
  const over = structuredClone(db);
  over.ledger.push({ id: "x", workerId: "kasun", bookingId: null, kind: "cash_commission", amount: 20000, note: "", createdAt: new Date(now).toISOString() });
  assert.throws(() => apply(over, "kasun", "worker_respond", { booking_id: requested.id, accept: true }, now), /commission/);
  assert.equal(view(over, "nimali").workers.find((w) => w.userId === "kasun")!.balance, null);
});
test("only permitted staff can verify workers", () => {
  assert.throws(() => apply(db, "nimali", "admin_review_worker", { worker_id: "dinesh", status: "approved" }, now), /staff role/);
  assert.equal(apply(db, "verifier", "admin_review_worker", { worker_id: "dinesh", status: "approved" }, now).workers.find((w) => w.userId === "dinesh")!.status, "approved");
  assert.throws(() => apply(db, "verifier", "admin_set_staff", { email: "ashan@example.com", staff_role: "super" }, now), /staff role/);
});
