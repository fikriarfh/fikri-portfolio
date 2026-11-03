/**
 * server.js — zero-dependency HTTP server for the portfolio + demo apps.
 *
 * Routes:
 *   /                      → portfolio landing page (public/)
 *   /apps/<name>           → demo app pages (public/apps/<name>/index.html)
 *   /api/sis/...           → Student Information System API
 *   /api/inventory/...     → Inventory API
 *   /api/library/...       → Library API
 *   /api/health            → liveness probe
 *
 * Serves on 0.0.0.0:$PORT (default 3000).
 */
"use strict";

const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const db = require("./db");
const { hashPassword } = require("./db");

const PORT = Number(process.env.PORT) || 3000;
const HOST = "0.0.0.0";
const PUBLIC_DIR = path.join(__dirname, "public");
const BODY_LIMIT = 100 * 1024; // 100 KB

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": MIME[".json"],
    "Cache-Control": "no-store",
  });
  res.end(body);
}

const ok = (res, data) => sendJson(res, 200, { ok: true, data });
const fail = (res, status, message) => sendJson(res, status, { ok: false, error: message });

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > BODY_LIMIT) {
        reject(Object.assign(new Error("Payload too large"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (chunks.length === 0) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

/** Serve a static file if it resolves inside PUBLIC_DIR, else null. */
function serveStatic(res, relPath) {
  const filePath = path.normalize(path.join(PUBLIC_DIR, relPath));
  if (!filePath.startsWith(PUBLIC_DIR)) return false; // path traversal guard

  let target = filePath;
  let stat = null;
  try {
    stat = fs.statSync(target);
    if (stat.isDirectory()) {
      target = path.join(target, "index.html");
      stat = fs.statSync(target);
    }
  } catch {
    return false;
  }

  const ext = path.extname(target).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  res.writeHead(200, {
    "Content-Type": mime,
    // HTML: never cached. Other assets: always revalidated (304 when unchanged)
    // so visitors get fresh CSS/JS/images immediately after each deploy.
    "Cache-Control": ext === ".html" ? "no-store" : "no-cache",
  });
  fs.createReadStream(target).pipe(res);
  return true;
}

/** Coerce and validate a numeric id path segment. */
function intParam(value, res) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    fail(res, 400, "Invalid id");
    return null;
  }
  return id;
}

const clean = (v) => String(v ?? "").trim();

/* ------------------------------------------------------------------ */
/* Session auth (cookie-based, sessions stored in SQLite)              */
/* ------------------------------------------------------------------ */

const SESSION_COOKIE = "sis_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 h

function parseCookies(req) {
  const out = {};
  (req.headers.cookie || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  });
  return out;
}

function issueSession(res, userId) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))"
  ).run(tokenHash, userId);
  res.setHeader(
    "Set-Cookie",
    `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`
  );
}

function clearSession(res) {
  res.setHeader("Set-Cookie", `${SESSION_COOKIE}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

/** Resolve the current session to its user, or null. Lazily purges expired rows. */
function getSessionUser(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return null;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM sessions WHERE expires_at <= datetime('now')").run();
  const row = db
    .prepare(
      `SELECT s.id AS session_id, u.username
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > datetime('now')`
    )
    .get(tokenHash);
  return row || null;
}

function destroySession(req) {
  const token = parseCookies(req)[SESSION_COOKIE];
  if (!token) return;
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(tokenHash);
}

async function apiAuth(req, res, segments) {
  const [action] = segments;

  if (action === "login" && req.method === "POST") {
    const body = await readBody(req);
    const username = clean(body.username);
    const password = String(body.password ?? "");
    if (!username || !password) return fail(res, 400, "Username and password are required");

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    const attempt = user ? hashPassword(password, user.salt) : "invalid";
    const okLogin =
      user &&
      crypto.timingSafeEqual(Buffer.from(attempt, "hex"), Buffer.from(user.password_hash, "hex"));
    if (!okLogin) return fail(res, 401, "Invalid username or password");

    issueSession(res, user.id);
    return ok(res, { username: user.username });
  }

  if (action === "logout" && req.method === "POST") {
    destroySession(req);
    clearSession(res);
    return ok(res, { loggedOut: true });
  }

  if (action === "me" && req.method === "GET") {
    const user = getSessionUser(req);
    if (!user) return fail(res, 401, "Not signed in");
    return ok(res, { username: user.username });
  }

  return fail(res, 404, "Unknown auth endpoint");
}

/* ------------------------------------------------------------------ */
/* API handlers — Student Information System                           */
/* ------------------------------------------------------------------ */

async function apiSis(req, res, segments, query) {
  const [resource, id] = segments; // e.g. ["students", "3"]

  // SIS is the auth-protected demo: every endpoint requires a valid session.
  const sessionUser = getSessionUser(req);
  if (!sessionUser) return fail(res, 401, "Authentication required");

  if (resource === "students") {
    if (req.method === "GET") {
      const q = clean(query.get("q")).toLowerCase();
      let rows;
      if (q) {
        const like = `%${q}%`;
        rows = db
          .prepare(
            "SELECT * FROM students WHERE LOWER(name) LIKE ? OR nim LIKE ? OR LOWER(major) LIKE ? ORDER BY name"
          )
          .all(like, like, like);
      } else {
        rows = db.prepare("SELECT * FROM students ORDER BY name").all();
      }
      return ok(res, rows);
    }

    if (req.method === "POST" || req.method === "PUT") {
      const body = await readBody(req);
      const name = clean(body.name);
      const nim = clean(body.nim);
      const major = clean(body.major);
      const gpa = Number(body.gpa);
      const status = clean(body.status) || "Aktif";

      if (!name || !nim || !major) return fail(res, 400, "Name, NIM and major are required");
      if (!Number.isFinite(gpa) || gpa < 0 || gpa > 4) return fail(res, 400, "GPA must be between 0 and 4");
      if (!["Aktif", "Cuti", "Lulus"].includes(status)) return fail(res, 400, "Invalid status");

      try {
        if (req.method === "POST") {
          const info = db
            .prepare("INSERT INTO students (nim, name, major, gpa, status) VALUES (?, ?, ?, ?, ?)")
            .run(nim, name, major, gpa, status);
          return ok(res, db.prepare("SELECT * FROM students WHERE id = ?").get(info.lastInsertRowid));
        }
        // PUT — update an existing record
        const studentId = intParam(id, res);
        if (studentId === null) return;
        const info = db
          .prepare("UPDATE students SET nim = ?, name = ?, major = ?, gpa = ?, status = ? WHERE id = ?")
          .run(nim, name, major, gpa, status, studentId);
        if (info.changes === 0) return fail(res, 404, "Student not found");
        return ok(res, db.prepare("SELECT * FROM students WHERE id = ?").get(studentId));
      } catch (err) {
        if (String(err.message).includes("UNIQUE")) return fail(res, 409, "NIM already exists");
        throw err;
      }
    }

    if (req.method === "DELETE") {
      const studentId = intParam(id, res);
      if (studentId === null) return;
      const info = db.prepare("DELETE FROM students WHERE id = ?").run(studentId);
      if (info.changes === 0) return fail(res, 404, "Student not found");
      return ok(res, { id: studentId });
    }
  }

  return fail(res, 404, "Unknown SIS endpoint");
}

/* ------------------------------------------------------------------ */
/* API handlers — Inventory                                            */
/* ------------------------------------------------------------------ */

async function apiInventory(req, res, segments, query) {
  const [resource, id, action] = segments;

  // Stock movement — checked first so POST /products/:id/stock is not
  // swallowed by the generic products branch below.
  if (resource === "products" && action === "stock" && req.method === "POST") {
    const productId = intParam(id, res);
    if (productId === null) return;
    const body = await readBody(req);
    const type = clean(body.type);
    const qty = Number(body.qty);
    const note = clean(body.note);

    if (!["in", "out"].includes(type)) return fail(res, 400, "Stock type must be 'in' or 'out'");
    if (!Number.isInteger(qty) || qty <= 0) return fail(res, 400, "Quantity must be a positive integer");

    const product = db.prepare("SELECT * FROM products WHERE id = ?").get(productId);
    if (!product) return fail(res, 404, "Product not found");
    if (type === "out" && product.qty < qty)
      return fail(res, 400, `Insufficient stock: only ${product.qty} left`);

    const newQty = type === "in" ? product.qty + qty : product.qty - qty;
    db.prepare("UPDATE products SET qty = ? WHERE id = ?").run(newQty, productId);
    const info = db
      .prepare("INSERT INTO stock_transactions (product_id, type, qty, note) VALUES (?, ?, ?, ?)")
      .run(productId, type, qty, note);

    return ok(res, {
      product: db.prepare("SELECT * FROM products WHERE id = ?").get(productId),
      transaction: db.prepare("SELECT * FROM stock_transactions WHERE id = ?").get(info.lastInsertRowid),
    });
  }

  if (resource === "products") {
    if (req.method === "GET") {
      const q = clean(query.get("q")).toLowerCase();
      const category = clean(query.get("category"));
      let rows = db.prepare("SELECT * FROM products ORDER BY name").all();
      if (q) rows = rows.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
      if (category) rows = rows.filter((p) => p.category === category);
      const categories = db.prepare("SELECT DISTINCT category FROM products ORDER BY category").all();
      return ok(res, { products: rows, categories: categories.map((c) => c.category) });
    }

    const body = await readBody(req);
    const sku = clean(body.sku).toUpperCase();
    const name = clean(body.name);
    const category = clean(body.category);
    const price = Number(body.price);

    if (!sku || !name || !category) return fail(res, 400, "SKU, name and category are required");
    if (!Number.isFinite(price) || price < 0) return fail(res, 400, "Price must be a non-negative number");

    if (req.method === "POST") {
      try {
        const info = db
          .prepare("INSERT INTO products (sku, name, category, qty, price) VALUES (?, ?, ?, 0, ?)")
          .run(sku, name, category, price);
        return ok(res, db.prepare("SELECT * FROM products WHERE id = ?").get(info.lastInsertRowid));
      } catch (err) {
        if (String(err.message).includes("UNIQUE")) return fail(res, 409, "SKU already exists");
        throw err;
      }
    }

    if (req.method === "PUT") {
      const productId = intParam(id, res);
      if (productId === null) return;
      try {
        const info = db
          .prepare("UPDATE products SET sku = ?, name = ?, category = ?, price = ? WHERE id = ?")
          .run(sku, name, category, price, productId);
        if (info.changes === 0) return fail(res, 404, "Product not found");
        return ok(res, db.prepare("SELECT * FROM products WHERE id = ?").get(productId));
      } catch (err) {
        if (String(err.message).includes("UNIQUE")) return fail(res, 409, "SKU already exists");
        throw err;
      }
    }

    if (req.method === "DELETE") {
      const productId = intParam(id, res);
      if (productId === null) return;
      const info = db.prepare("DELETE FROM products WHERE id = ?").run(productId); // transactions cascade
      if (info.changes === 0) return fail(res, 404, "Product not found");
      return ok(res, { id: productId });
    }
  }

  if (resource === "transactions" && req.method === "GET") {
    const limit = Math.min(Number(query.get("limit")) || 20, 100);
    const rows = db
      .prepare(
        `SELECT t.*, p.name AS product_name, p.sku
         FROM stock_transactions t JOIN products p ON p.id = t.product_id
         ORDER BY t.id DESC LIMIT ?`
      )
      .all(limit);
    return ok(res, rows);
  }

  return fail(res, 404, "Unknown inventory endpoint");
}

/* ------------------------------------------------------------------ */
/* API handlers — Library                                              */
/* ------------------------------------------------------------------ */

async function apiLibraryFull(req, res, segments, query) {
  const [resource, id, action] = segments;

  if (resource === "books") {
    if (req.method === "GET") {
      const q = clean(query.get("q")).toLowerCase();
      let rows = db.prepare("SELECT * FROM books ORDER BY title").all();
      if (q)
        rows = rows.filter(
          (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
        );
      return ok(res, rows);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const code = clean(body.code).toUpperCase();
      const title = clean(body.title);
      const author = clean(body.author);
      const year = body.year === "" || body.year == null ? null : Number(body.year);
      if (!code || !title || !author) return fail(res, 400, "Code, title and author are required");
      if (year !== null && (!Number.isInteger(year) || year < 1500 || year > 2100))
        return fail(res, 400, "Year must be a valid calendar year");
      try {
        const info = db
          .prepare("INSERT INTO books (code, title, author, year) VALUES (?, ?, ?, ?)")
          .run(code, title, author, year);
        return ok(res, db.prepare("SELECT * FROM books WHERE id = ?").get(info.lastInsertRowid));
      } catch (err) {
        if (String(err.message).includes("UNIQUE")) return fail(res, 409, "Book code already exists");
        throw err;
      }
    }

    if (req.method === "DELETE") {
      const bookId = intParam(id, res);
      if (bookId === null) return;
      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
      if (!book) return fail(res, 404, "Book not found");
      if (book.status === "borrowed") return fail(res, 400, "Cannot delete a borrowed book");
      db.prepare("DELETE FROM loans WHERE book_id = ? AND returned_at IS NOT NULL").run(bookId);
      db.prepare("DELETE FROM books WHERE id = ?").run(bookId);
      return ok(res, { id: bookId });
    }
  }

  if (resource === "members") {
    if (req.method === "GET") return ok(res, db.prepare("SELECT * FROM members ORDER BY name").all());

    if (req.method === "POST") {
      const body = await readBody(req);
      const name = clean(body.name);
      if (!name) return fail(res, 400, "Member name is required");
      const count = db.prepare("SELECT COUNT(*) AS n FROM members").get().n;
      const code = `M-${String(count + 1).padStart(3, "0")}`;
      try {
        const info = db.prepare("INSERT INTO members (code, name) VALUES (?, ?)").run(code, name);
        return ok(res, db.prepare("SELECT * FROM members WHERE id = ?").get(info.lastInsertRowid));
      } catch (err) {
        if (String(err.message).includes("UNIQUE")) return fail(res, 409, "Member code already exists");
        throw err;
      }
    }
  }

  // Return a loan — checked first so POST /loans/:id/return is not
  // swallowed by the generic loans branch below.
  if (resource === "loans" && action === "return" && req.method === "POST") {
    const loanId = intParam(id, res);
    if (loanId === null) return;
    const loan = db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId);
    if (!loan) return fail(res, 404, "Loan not found");
    if (loan.returned_at) return fail(res, 400, "Loan already returned");

    db.prepare("UPDATE loans SET returned_at = datetime('now') WHERE id = ?").run(loanId);
    db.prepare("UPDATE books SET status = 'available' WHERE id = ?").run(loan.book_id);
    return ok(res, db.prepare("SELECT * FROM loans WHERE id = ?").get(loanId));
  }

  if (resource === "loans") {
    if (req.method === "GET") {
      const rows = db
        .prepare(
          `SELECT l.*, b.title AS book_title, b.code AS book_code, m.name AS member_name
           FROM loans l
           JOIN books b ON b.id = l.book_id
           JOIN members m ON m.id = l.member_id
           ORDER BY l.id DESC LIMIT 50`
        )
        .all();
      return ok(res, rows);
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const bookId = Number(body.bookId);
      const memberId = Number(body.memberId);
      const days = Number(body.days) || 14;
      if (!Number.isInteger(bookId) || !Number.isInteger(memberId))
        return fail(res, 400, "Book and member must be selected");
      if (!Number.isInteger(days) || days < 1 || days > 90) return fail(res, 400, "Loan duration must be 1–90 days");

      const book = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
      if (!book) return fail(res, 404, "Book not found");
      if (book.status === "borrowed") return fail(res, 409, "Book is currently borrowed");
      const member = db.prepare("SELECT * FROM members WHERE id = ?").get(memberId);
      if (!member) return fail(res, 404, "Member not found");

      db.prepare("UPDATE books SET status = 'borrowed' WHERE id = ?").run(bookId);
      const info = db
        .prepare(
          "INSERT INTO loans (book_id, member_id, borrowed_at, due_at) VALUES (?, ?, datetime('now'), datetime('now', ?))"
        )
        .run(bookId, memberId, `+${days} days`);
      return ok(res, db.prepare("SELECT * FROM loans WHERE id = ?").get(info.lastInsertRowid));
    }
  }

  return fail(res, 404, "Unknown library endpoint");
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const API_ROUTES = {
  sis: apiSis,
  inventory: apiInventory,
  library: apiLibraryFull,
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    // Health probe
    if (pathname === "/api/health") return ok(res, { status: "live", time: new Date().toISOString() });

    // JSON API
    if (pathname.startsWith("/api/")) {
      const segments = pathname.split("/").filter(Boolean).slice(1); // drop "api"
      const [app] = segments;

      // Session auth endpoints (public)
      if (app === "auth") return await apiAuth(req, res, segments.slice(1));

      const handler = API_ROUTES[app];
      if (!handler) return fail(res, 404, "Unknown API");
      return await handler(req, res, segments.slice(1), url.searchParams);
    }

    // Portfolio root
    if (pathname === "/" || pathname === "/index.html") {
      if (serveStatic(res, "index.html")) return;
      return fail(res, 500, "Portfolio page missing");
    }

    // Demo apps — pretty URLs: /apps/sis → /apps/sis/index.html.
    // Add a trailing slash so relative asset URLs (../shared.css, app.js)
    // resolve against the app directory, not its parent.
    if (pathname.startsWith("/apps/")) {
      try {
        const dirStat = fs.statSync(path.join(PUBLIC_DIR, pathname.slice(1)));
        if (dirStat.isDirectory() && !pathname.endsWith("/")) {
          res.writeHead(308, { Location: pathname + "/", "Cache-Control": "no-store" });
          res.end();
          return;
        }
      } catch {
        /* not a directory — fall through to the 404 below */
      }
      if (serveStatic(res, pathname.slice(1))) return;
      res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
      res.end("<h1>404 — App not found</h1><p><a href='/'>Back to portfolio</a></p>");
      return;
    }

    // Portfolio assets (style.css, script.js, etc.)
    if (serveStatic(res, pathname.slice(1))) return;

    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>404 — Not found</h1><p><a href='/'>Back to portfolio</a></p>");
  } catch (err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error(`[error] ${req.method} ${pathname}:`, err);
    if (!res.headersSent) fail(res, status, status >= 500 ? "Internal server error" : err.message);
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Portfolio server listening on http://${HOST}:${PORT}`);
});
