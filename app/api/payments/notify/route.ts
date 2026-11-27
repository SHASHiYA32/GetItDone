import { createClient } from "@supabase/supabase-js";
import { validNotice } from "@/lib/payhere.ts";

// PayHere calls this server to server. Nothing is recorded unless the signature matches.
export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: service, PAYHERE_MERCHANT_ID: id, PAYHERE_MERCHANT_SECRET: secret } = process.env;
  if (!url || !service || !id || !secret) return new Response("not configured", { status: 503 });
  const form = await req.formData().catch(() => null);
  if (!form) return new Response("bad request", { status: 400 });
  const f = Object.fromEntries([...form].map(([k, v]) => [k, String(v)]));
  if (!validNotice(f, id, secret) || f.payhere_currency !== "LKR") return new Response("invalid signature", { status: 403 });
  const sb = createClient(url, service, { auth: { persistSession: false } });
  const { error } = await sb.rpc("record_card_payment", { p_booking_id: f.order_id, p_payment_id: f.payment_id, p_amount: Number(f.payhere_amount), p_status: Number(f.status_code) });
  // A failed save returns 500 so it shows up in server logs
  if (error) { console.error("payment record failed", f.order_id, error.message); return new Response("error", { status: 500 }); }
  return new Response("ok");
}
