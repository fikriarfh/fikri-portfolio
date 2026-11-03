/**
 * db.js — SQLite database layer for the portfolio demo apps.
 * Uses the built-in node:sqlite module (no external dependencies).
 *
 * On ZCode Sites the SQLite file lives under $DATA_DIR (writable, temporary —
 * data is re-seeded on a fresh instance). Locally it defaults to ./data.
 */
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, "portfolio-demo.db"));
db.exec("PRAGMA journal_mode = WAL;");

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

db.exec(`
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nim TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  major TEXT NOT NULL,
  gpa REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Aktif'
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS stock_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('in','out')),
  qty INTEGER NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  year INTEGER,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','borrowed'))
);

CREATE TABLE IF NOT EXISTS loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL REFERENCES books(id),
  member_id INTEGER NOT NULL REFERENCES members(id),
  borrowed_at TEXT NOT NULL DEFAULT (datetime('now')),
  due_at TEXT NOT NULL,
  returned_at TEXT
);
`);

/* ------------------------------------------------------------------ */
/* Seed — only when tables are empty (fresh database)                  */
/* ------------------------------------------------------------------ */

function seed() {
  const studentCount = db.prepare("SELECT COUNT(*) AS n FROM students").get().n;
  if (studentCount === 0) {
    const insert = db.prepare(
      "INSERT INTO students (nim, name, major, gpa, status) VALUES (?, ?, ?, ?, ?)"
    );
    [
      ["10122001", "Andi Pratama", "Informatika", 3.72, "Aktif"],
      ["10122002", "Bunga Sari", "Sistem Informasi", 3.48, "Aktif"],
      ["10122003", "Candra Wijaya", "Informatika", 3.15, "Aktif"],
      ["10122004", "Dewi Lestari", "Teknik Komputer", 3.86, "Aktif"],
      ["10122005", "Eko Saputra", "Sistem Informasi", 2.94, "Cuti"],
      ["10122006", "Fitri Handayani", "Informatika", 3.55, "Aktif"],
      ["10122007", "Gilang Ramadhan", "Teknik Komputer", 3.21, "Aktif"],
      ["10122008", "Hana Maharani", "Sistem Informasi", 3.63, "Lulus"],
    ].forEach((row) => insert.run(...row));
  }

  const productCount = db.prepare("SELECT COUNT(*) AS n FROM products").get().n;
  if (productCount === 0) {
    const insert = db.prepare(
      "INSERT INTO products (sku, name, category, qty, price) VALUES (?, ?, ?, ?, ?)"
    );
    [
      ["ELC-001", 'Mouse Wireless "ProFit M2"', "Elektronik", 42, 185000],
      ["ELC-002", "Keyboard Mechanical K100", "Elektronik", 18, 645000],
      ["ELC-003", "Monitor LED 24 inci", "Elektronik", 7, 1450000],
      ["STF-001", "Kursi Kantor Ergonomis", "Furniture", 12, 890000],
      ["STF-002", "Meja Lipat 120cm", "Furniture", 5, 620000],
      ["ATK-001", "Tinta Printer Hitam 65ml", "ATK", 96, 92000],
      ["ATK-002", "Kertas A4 80gsm (rim)", "ATK", 140, 58000],
      ["ATK-003", "Stapler Besar HD-12", "ATK", 25, 47000],
    ].forEach((row) => insert.run(...row));

    const txn = db.prepare(
      "INSERT INTO stock_transactions (product_id, type, qty, note) VALUES (?, ?, ?, ?)"
    );
    txn.run(1, "in", 50, "Stok awal gudang utama");
    txn.run(1, "out", 8, "Pesanan toko Cabang A");
    txn.run(6, "in", 100, "Restock bulanan ATK");
    txn.run(6, "out", 60, "Penjualan retail");
  }

  const bookCount = db.prepare("SELECT COUNT(*) AS n FROM books").get().n;

  const memberCount = db.prepare("SELECT COUNT(*) AS n FROM members").get().n;
  if (memberCount === 0) {
    const memberIns = db.prepare("INSERT INTO members (code, name) VALUES (?, ?)");
    [
      ["M-001", "Rina Oktaviani"],
      ["M-002", "Joko Susilo"],
      ["M-003", "Maya Anggraeni"],
      ["M-004", "Bayu Nugroho"],
      ["M-005", "Salsabila Putri"],
    ].forEach((row) => memberIns.run(...row));
  }

  if (bookCount === 0) {
    const bookIns = db.prepare(
      "INSERT INTO books (code, title, author, year, status) VALUES (?, ?, ?, ?, ?)"
    );
    [
      ["B-001", "Clean Code", "Robert C. Martin", 2008, "borrowed"],
      ["B-002", "The Pragmatic Programmer", "Andrew Hunt", 1999, "available"],
      ["B-003", "Introduction to Algorithms", "Thomas H. Cormen", 2009, "available"],
      ["B-004", "Database System Concepts", "Abraham Silberschatz", 2019, "borrowed"],
      ["B-005", "Web Engineering", "Gero Hludovski", 2006, "available"],
      ["B-006", "JavaScript: The Good Parts", "Douglas Crockford", 2008, "available"],
      ["B-007", "PHP Objects, Patterns, and Practice", "Matt Zandstra", 2016, "available"],
      ["B-008", "Design Patterns", "Erich Gamma", 1994, "borrowed"],
      ["B-009", "Soft Skills", "John Sonmez", 2014, "available"],
      ["B-010", "Cracking the Coding Interview", "Gayle McDowell", 2015, "available"],
    ].forEach((row) => bookIns.run(...row));

    // Active loans: book 1, 4, 8 (book 8 overdue)
    const loanIns = db.prepare(
      "INSERT INTO loans (book_id, member_id, borrowed_at, due_at) VALUES (?, ?, datetime('now', ?), datetime('now', ?))"
    );
    loanIns.run(1, 2, "-5 days", "9 days");
    loanIns.run(4, 1, "-10 days", "4 days");
    loanIns.run(8, 3, "-20 days", "-6 days"); // overdue
    // A returned loan history
    db.prepare(
      "INSERT INTO loans (book_id, member_id, borrowed_at, due_at, returned_at) VALUES (?, ?, datetime('now','-40 days'), datetime('now','-26 days'), datetime('now','-27 days'))"
    ).run(2, 4);
  }
}

seed();

module.exports = db;
