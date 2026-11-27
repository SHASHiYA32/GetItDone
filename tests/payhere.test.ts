import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { validNotice } from "../lib/payhere.ts";
const md5 = (v: string) => createHash("md5").update(v).digest("hex").toUpperCase();

test("payment notices need a matching signature", () => {
  const f = { merchant_id: "M1", order_id: "O1", payhere_amount: "100.00", payhere_currency: "LKR", status_code: "2", md5sig: "" };
  f.md5sig = md5("M1O1100.00LKR2" + md5("secret"));
  assert.ok(validNotice(f, "M1", "secret"));
  assert.ok(!validNotice({ ...f, payhere_amount: "1.00" }, "M1", "secret"));
  assert.ok(!validNotice({ ...f, md5sig: "" }, "M1", "secret"));
  assert.ok(!validNotice(f, "M2", "secret"));
});
