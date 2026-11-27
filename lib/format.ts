import type { State, Status } from "./types.ts";
export { jobValue } from "./engine.ts";
export const money = (n: number) => `LKR ${Math.round(n).toLocaleString("en-LK")}`;
const tz = "Asia/Colombo";
export const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: tz, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });
export const time = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true });
export const date = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: tz, day: "numeric", month: "short" });
export const STATUS: Record<Status, string> = {
  requested: "Waiting for worker", accepted: "Agree a date", scheduled: "Scheduled", on_the_way: "On the way", arrived: "Arrived",
  completed: "Check the work", confirmed: "Completed", disputed: "Under review", cancelled: "Cancelled", declined: "Declined",
};
export const ACTIVE: Status[] = ["requested", "accepted", "scheduled", "on_the_way", "arrived", "completed", "disputed"];
export const lookup = (s: State) => ({
  user: (id: string) => s.users.find((u) => u.id === id),
  name: (id: string) => s.users.find((u) => u.id === id)?.name ?? "Unknown",
  service: (id: string) => s.services.find((x) => x.id === id)!,
});
