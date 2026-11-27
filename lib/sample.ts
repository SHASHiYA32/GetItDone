import { CITIES, SERVICES } from "./catalog.ts";
import { apply, day, type DB } from "./engine.ts";
import type { Answers, User, Worker } from "./types.ts";

const H = 3600e3, D = 24 * H;
const user = (id: string, role: User["role"], name: string, phone: string, staffRole: User["staffRole"] = null): User =>
  ({ id, role, name, phone, email: `${id}@example.com`, suspended: false, staffRole });
const worker = (userId: string, city: string, experience: number, services: string[], bio: string, status: Worker["status"] = "approved"): Worker => ({
  userId, status, city, lat: CITIES[city][0], lng: CITIES[city][1], experience, bio, qualifications: "NVQ Level 4", address: `Sample address, ${city}`,
  services, rating: null, reviews: 0, jobs: 0, reliability: 100, cancelsThisMonth: 0, balance: 0, blocked: false,
  documents: [{ kind: "identity", path: "sample-id.jpg" }],
});
const defaults = (id: string): Answers => Object.fromEntries(SERVICES.find((s) => s.id === id)!.questions.map((q) => [q.key, q.type === "number" ? Math.max(q.initial as number, q.min ?? 0) : q.initial!]));

/** Fictional people and bookings, built by running real actions so every record obeys the rules. */
export function sampleData(now = Date.now()): DB {
  let db: DB = {
    services: SERVICES,
    users: [
      user("nimali", "customer", "Nimali Perera", "0700000001"), user("ashan", "customer", "Ashan Fernando", "0700000002"),
      user("kasun", "worker", "Kasun Silva", "0700000011"), user("ruwan", "worker", "Ruwan Jayasuriya", "0700000012"),
      user("fazil", "worker", "Mohamed Fazil", "0700000013"), user("selvan", "worker", "Selvan Kumar", "0700000014"),
      user("dinesh", "worker", "Dinesh Bandara", "0700000015"),
      user("admin", "admin", "Tharushi Wickrama", "0700000021", "super"), user("verifier", "admin", "Isuru Peris", "0700000022", "verification"),
    ],
    workers: [
      worker("kasun", "Nugegoda", 8, ["new-wiring", "electrical-repair", "lights-fans", "ac-service"], "House wiring and fault finding across the southern suburbs."),
      worker("ruwan", "Maharagama", 12, ["building", "renovation", "masonry", "interior-paint", "exterior-paint"], "Small building and renovation jobs with my own crew."),
      worker("fazil", "Dehiwala", 6, ["pipe-repair", "plumbing-install", "handyman", "electrical-repair"], "Leaks, pumps and bathroom fittings."),
      worker("selvan", "Colombo", 10, ["furniture", "doors-cupboards", "ac-install", "ac-service", "new-wiring"], "Joinery and AC work, weekends included."),
      worker("dinesh", "Gampaha", 3, ["interior-paint", "handyman"], "Painting and general repairs.", "pending"),
    ],
    addresses: [
      { id: "a1", userId: "nimali", label: "Home", line: "Sample Lane 12, Nugegoda", city: "Nugegoda", lat: 6.872, lng: 79.889 },
      { id: "a2", userId: "nimali", label: "Parents", line: "Sample Road 4, Moratuwa", city: "Moratuwa", lat: 6.773, lng: 79.8816 },
      { id: "a3", userId: "ashan", label: "Flat", line: "Sample Place 8, Colombo", city: "Colombo", lat: 6.9101, lng: 79.8683 },
    ],
    bookings: [], messages: [], reviews: [], locations: [], notifications: [], complaints: [], ledger: [], settlements: [],
  };
  const run = (who: string, action: string, args: object, at: number) => { db = apply(db, who, action, args as Record<string, unknown>, at); };
  const book = (who: string, w: string, service: string, address: string, at: number, method = "cash") => {
    run(who, "create_booking", { service_id: service, worker_id: w, address_id: address, answers: defaults(service), notes: "", payment_method: method }, at);
    return db.bookings[0].id;
  };
  const finish = (who: string, w: string, service: string, address: string, at: number, rating: number, comment: string, method = "cash") => {
    const id = book(who, w, service, address, at, method);
    run(w, "worker_respond", { booking_id: id, accept: true }, at + H);
    run(w, "propose_time", { booking_id: id, at: new Date(at + D).toISOString() }, at + H);
    run(who, "respond_time", { booking_id: id, accept: true }, at + 2 * H);
    run(w, "start_trip", { booking_id: id }, at + D);
    run(w, "mark_arrived", { booking_id: id }, at + D);
    run(w, "mark_completed", { booking_id: id }, at + D + 2 * H);
    run(who, "confirm_completion", { booking_id: id }, at + D + 3 * H);
    if (method === "card") run(who, "demo_card_payment", { booking_id: id }, at + D + 3 * H);
    run(who, "submit_review", { booking_id: id, rating, comment, tip: 0 }, at + D + 3 * H);
  };
  finish("ashan", "kasun", "lights-fans", "a3", now - 40 * D, 5, "Arrived on time and left the place clean.");
  finish("nimali", "fazil", "pipe-repair", "a1", now - 21 * D, 4, "Fixed the leak quickly.");
  finish("ashan", "ruwan", "interior-paint", "a3", now - 12 * D, 5, "Neat finish on both rooms.");
  finish("ashan", "selvan", "furniture", "a3", now - 6 * D, 4, "Solid repair.", "card");
  finish("ashan", "ruwan", "masonry", "a3", now - 4 * D, 5, "Good wall repair.");
  run("ruwan", "submit_settlement", { amount: 1500, reference: "BANK-SAMPLE-01", slip_path: "demo:bank-slip.pdf" }, now - 5 * H);

  const today = book("nimali", "kasun", "new-wiring", "a1", now - 2 * D);
  run("kasun", "worker_respond", { booking_id: today, accept: true }, now - 2 * D + H);
  run("kasun", "send_message", { booking_id: today, body: "I can come today. Is someone home?" }, now - 3 * H);
  run("kasun", "propose_time", { booking_id: today, at: new Date(Math.max(Date.parse(`${day(now)}T15:00:00+05:30`), now - 60e3)).toISOString() }, now - 4 * H);
  run("nimali", "respond_time", { booking_id: today, accept: true }, now - 2 * H);
  book("ashan", "kasun", "electrical-repair", "a3", now - 20 * 60e3);
  const bad = book("ashan", "fazil", "handyman", "a3", now - 3 * D);
  run("fazil", "worker_respond", { booking_id: bad, accept: true }, now - 3 * D + H);
  run("ashan", "raise_issue", { booking_id: bad, body: "We could not agree on what the job includes." }, now - D);
  return db;
}
