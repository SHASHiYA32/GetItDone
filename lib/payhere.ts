// Server only. PayHere signature rules: https://support.payhere.lk/api-&-mobile-sdk/checkout-api
import { createHash, timingSafeEqual } from "node:crypto";
const md5 = (v: string) => createHash("md5").update(v).digest("hex").toUpperCase();

export const checkoutHash = (merchantId: string, orderId: string, amount: string, currency: string, secret: string) =>
  md5(merchantId + orderId + amount + currency + md5(secret));

export function validNotice(f: Record<string, string>, merchantId: string, secret: string) {
  const expected = md5(f.merchant_id + f.order_id + f.payhere_amount + f.payhere_currency + f.status_code + md5(secret));
  const got = String(f.md5sig ?? "");
  return f.merchant_id === merchantId && got.length === expected.length && timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}
