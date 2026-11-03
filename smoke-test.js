/**
 * smoke-test.js — API smoke test against a locally running server.
 * Usage: node smoke-test.js [baseUrl]
 */
"use strict";

const BASE = process.argv[2] || "http://127.0.0.1:3000";
const JSONH = { "Content-Type": "application/json" };

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: JSONH,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  return { status: res.status, json };
}

let failures = 0;
function check(label, cond, extra = "") {
  console.log(`${cond ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!cond) failures++;
}

(async () => {
  // Health
  const health = await call("GET", "/api/health");
  check("health returns live", health.json.ok && health.json.data.status === "live");

  // --- Students CRUD ---
  const created = await call("POST", "/api/sis/students", {
    nim: "99990001", name: "Uji Coba", major: "Informatika", gpa: 3.5, status: "Aktif",
  });
  check("student created", created.status === 200 && created.json.data.id > 0, `id=${created.json?.data?.id}`);
  const id = created.json.data.id;

  const dup = await call("POST", "/api/sis/students", {
    nim: "99990001", name: "Duplikat", major: "Informatika", gpa: 3, status: "Aktif",
  });
  check("duplicate NIM rejected with 409", dup.status === 409, `status=${dup.status}`);

  const badGpa = await call("POST", "/api/sis/students", {
    nim: "99990002", name: "GPA Invalid", major: "Informatika", gpa: 7, status: "Aktif",
  });
  check("invalid GPA rejected with 400", badGpa.status === 400, `status=${badGpa.status}`);

  const updated = await call("PUT", `/api/sis/students/${id}`, {
    nim: "99990001", name: "Uji Coba Revisi", major: "Sistem Informasi", gpa: 3.9, status: "Cuti",
  });
  check("student updated", updated.json.ok && updated.json.data.name === "Uji Coba Revisi");

  const deleted = await call("DELETE", `/api/sis/students/${id}`);
  check("student deleted", deleted.json.ok);

  // --- Inventory stock ---
  const before = (await call("GET", "/api/inventory/products")).json.data.products.find((p) => p.id === 1);
  const stock = await call("POST", "/api/inventory/products/1/stock", { type: "out", qty: 2, note: "test out" });
  check("stock out decrements qty", stock.json.ok && stock.json.data.product.qty === before.qty - 2,
    `qty ${before.qty} -> ${stock.json?.data?.product?.qty}`);
  // restore
  await call("POST", "/api/inventory/products/1/stock", { type: "in", qty: 2, note: "test restore" });

  const overdraw = await call("POST", "/api/inventory/products/1/stock", { type: "out", qty: 9999 });
  check("overselling rejected with 400", overdraw.status === 400, `status=${overdraw.status}`);

  const badStock = await call("POST", "/api/inventory/products/1/stock", { type: "sideways", qty: 3 });
  check("invalid stock type rejected with 400", badStock.status === 400, `status=${badStock.status}`);

  // --- Library borrow/return ---
  const loan = await call("POST", "/api/library/loans", { bookId: 2, memberId: 5, days: 7 });
  check("book borrowed", loan.json.ok && loan.json.data.id > 0, `loan id=${loan.json?.data?.id}`);
  const loanId = loan.json.data.id;

  const doubleBorrow = await call("POST", "/api/library/loans", { bookId: 2, memberId: 1, days: 7 });
  check("borrowing same book twice rejected with 409", doubleBorrow.status === 409, `status=${doubleBorrow.status}`);

  const returned = await call("POST", `/api/library/loans/${loanId}/return`);
  check("book returned", returned.json.ok && returned.json.data.returned_at !== null);

  const doubleReturn = await call("POST", `/api/library/loans/${loanId}/return`);
  check("double return rejected with 400", doubleReturn.status === 400, `status=${doubleReturn.status}`);

  // --- Static pages ---
  for (const page of ["/", "/apps/sis", "/apps/inventory", "/apps/library", "/apps/tasks"]) {
    const res = await fetch(BASE + page);
    check(`GET ${page} -> 200 html`, res.status === 200 && (res.headers.get("content-type") || "").includes("text/html"));
  }
  const missing = await fetch(BASE + "/apps/does-not-exist");
  check("unknown app path -> 404", missing.status === 404);

  // Path traversal guard
  const traversal = await fetch(BASE + "/../db.js");
  check("path traversal blocked", traversal.status === 404 || traversal.status === 403, `status=${traversal.status}`);

  console.log(failures === 0 ? "\nALL TESTS PASSED" : `\n${failures} TEST(S) FAILED`);
  process.exit(failures === 0 ? 0 : 1);
})().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
