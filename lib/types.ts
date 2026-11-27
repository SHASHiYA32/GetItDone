export type Role = "customer" | "worker" | "admin";
export type StaffRole = "super" | "verification" | "support" | "bookings" | "finance";
export type Status =
  | "requested" | "accepted" | "scheduled" | "on_the_way" | "arrived"
  | "completed" | "confirmed" | "disputed" | "cancelled" | "declined";

export interface Question {
  key: string; label: string; type: "number" | "choice" | "yesno";
  unit?: string; min?: number; max?: number; initial?: number | string | boolean;
  included?: number; labour?: number; material?: number; minutes?: number;
  options?: { value: string; label: string; pct?: number; labour?: number; material?: number }[];
}
export interface Service {
  id: string; category: string; name: string; labour: number; material: number; minutes: number; questions: Question[];
}
export type Answers = Record<string, number | string | boolean>;
export interface Estimate { lines: { label: string; amount: number }[]; total: number; hours: number; km: number }

export interface User {
  id: string; role: Role; name: string; phone: string | null; email: string | null;
  suspended: boolean; staffRole: StaffRole | null;
}
export interface Worker {
  userId: string; status: "pending" | "approved" | "rejected" | "suspended";
  city: string; lat: number; lng: number; experience: number; bio: string; qualifications: string;
  address: string | null; services: string[]; rating: number | null; reviews: number; jobs: number;
  reliability: number; cancelsThisMonth: number; balance: number | null; blocked: boolean; documents: { kind: string; path: string }[];
}
export interface Address { id: string; userId: string; label: string; line: string; city: string; lat: number; lng: number }
export type PaymentMethod = "cash" | "card";
/** Worker account. Positive amounts are owed to the platform, negative are owed to the worker. */
export interface Entry { id: string; workerId: string; bookingId: string | null; kind: "cash_commission" | "card_earning" | "payment" | "payout" | "reversal"; amount: number; note: string; createdAt: string }
export interface Settlement { id: string; workerId: string; amount: number; reference: string; slip: string; status: "pending" | "approved" | "rejected"; note: string; createdAt: string }
export interface Booking {
  id: string; code: string; customerId: string; workerId: string; serviceId: string;
  answers: Answers; notes: string; address: string; city: string; lat: number | null; lng: number | null;
  estimate: Estimate; commissionRate: number; status: Status; createdAt: string;
  appointmentAt: string | null; proposedAt: string | null; proposedBy: "customer" | "worker" | null;
  wasRescheduled: boolean; completedAt: string | null; cancelledAt: string | null; cancelledBy: Role | null;
  cancelFee: number; tip: number; extraAmount: number; extraReason: string;
  extraStatus: "pending" | "approved" | "declined" | null; photos: string[]; donePhotos: string[];
  paymentMethod: PaymentMethod; paidAt: string | null;
}
export interface Message { id: string; bookingId: string; senderId: string; body: string; createdAt: string }
export interface Review { id: string; bookingId: string; workerId: string; author: string; rating: number; comment: string; createdAt: string }
export interface Location { bookingId: string; lat: number; lng: number; updatedAt: string }
export interface Note { id: string; userId: string; title: string; body: string; bookingId: string | null; read: boolean; createdAt: string }
export interface Complaint { id: string; bookingId: string; userId: string; body: string; status: "open" | "resolved"; resolution: string; createdAt: string }

export interface State {
  me: User | null; mfaRequired?: boolean;
  services: Service[]; users: User[]; workers: Worker[]; addresses: Address[]; bookings: Booking[];
  messages: Message[]; reviews: Review[]; locations: Location[]; notifications: Note[]; complaints: Complaint[]; ledger: Entry[]; settlements: Settlement[];
}
export type Args = Record<string, unknown>;
