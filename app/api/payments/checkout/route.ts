import { createClient } from "@supabase/supabase-js";
import { checkoutHash } from "@/lib/payhere.ts";

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(req: Request) {
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key, PAYHERE_MERCHANT_ID: id, PAYHERE_MERCHANT_SECRET: secret, APP_URL: app } = process.env;
  if (!url || !key || !id || !secret || !app) return bad("Card payments are not set up yet. Pay the worker in cash.", 503);
  const auth = req.headers.get("authorization");
  if (!auth) return bad("Sign in again", 401);
  const body = await req.json().catch(() => null);
  // Runs as the signed-in customer, so the database checks ownership and the amount
  const sb = createClient(url, key, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc("card_checkout", { p_booking_id: String(body?.bookingId ?? "") });
  if (error) return bad(error.code === "P0001" ? error.message : "Payment could not be started");
  const amount = Number(data.amount).toFixed(2);
  const [first, ...rest] = String(data.name).split(" ");
  const back = `${app}/customer/bookings/${data.id}`;
  return Response.json({
    action: process.env.PAYHERE_LIVE === "true" ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout",
    fields: {
      merchant_id: id, return_url: back, cancel_url: back, notify_url: `${app}/api/payments/notify`,
      order_id: data.id, items: `GetItDone job ${data.code}`, currency: "LKR", amount,
      first_name: first, last_name: rest.join(" ") || first, email: data.email, phone: data.phone ?? "", address: data.address, city: data.city, country: "Sri Lanka",
      hash: checkoutHash(id, data.id, amount, "LKR", secret),
    },
  });
}
