/* Library Management System — demo app front-end (vanilla JS) */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);

  let books = [];
  let members = [];
  let loans = [];
  let borrowBookId = null;

  /* ---------- helpers ---------- */
  const api = async (path, options = {}) => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
    if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
    return json.data;
  };

  let toastTimer;
  const toast = (message, isError = false) => {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  };

  const esc = (v) => {
    const div = document.createElement("div");
    div.textContent = v;
    return div.innerHTML;
  };

  const fmtDate = (sqliteUtc) => {
    if (!sqliteUtc) return "—";
    const d = new Date(sqliteUtc.replace(" ", "T") + "Z");
    return d.toLocaleDateString("id-ID", { dateStyle: "medium" });
  };

  const isOverdue = (loan) => !loan.returned_at && new Date(loan.due_at.replace(" ", "T") + "Z") < new Date();

  /* ---------- rendering ---------- */
  function render() {
    const q = $("#search").value.trim().toLowerCase();
    const status = $("#statusFilter").value;
    const rows = books.filter(
      (b) =>
        (!q ||
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.code.toLowerCase().includes(q)) &&
        (!status || b.status === status)
    );

    $("#bookBody").innerHTML = rows
      .map((b) => {
        const badge =
          b.status === "available"
            ? '<span class="badge badge-green">Available</span>'
            : '<span class="badge badge-red">Borrowed</span>';
        const actions = b.status === "available"
          ? `<button class="btn btn-ghost btn-sm" data-borrow="${b.id}">Borrow</button>
             <button class="btn btn-danger btn-sm" data-del="${b.id}">Del</button>`
          : `<button class="btn btn-ghost btn-sm" data-find="${b.id}">Who has it?</button>`;
        return `
        <tr>
          <td class="mono">${esc(b.code)}</td>
          <td>${esc(b.title)}</td>
          <td>${esc(b.author)}</td>
          <td>${b.year ?? "—"}</td>
          <td>${badge}</td>
          <td><div class="row-actions">${actions}</div></td>
        </tr>`;
      })
      .join("");
    $("#empty").hidden = rows.length > 0;

    $("#statBooks").textContent = books.length;
    $("#statAvailable").textContent = books.filter((b) => b.status === "available").length;
    $("#statBorrowed").textContent = books.filter((b) => b.status === "borrowed").length;
    $("#statMembers").textContent = members.length;

    $("#memberBody").innerHTML = members
      .map((m) => `<tr><td class="mono">${esc(m.code)}</td><td>${esc(m.name)}</td></tr>`)
      .join("");

    $("#loanBody").innerHTML = loans
      .map((l) => {
        const state = l.returned_at
          ? '<span class="badge badge-green">Returned</span>'
          : isOverdue(l)
            ? '<span class="badge badge-red">Overdue</span>'
            : '<span class="badge badge-yellow">On loan</span>';
        const action = l.returned_at
          ? '<span class="mono">✓</span>'
          : `<button class="btn btn-ghost btn-sm" data-return="${l.id}">Return</button>`;
        return `
        <tr>
          <td>${esc(l.book_title)} <span class="mono">${esc(l.book_code)}</span></td>
          <td>${esc(l.member_name)}</td>
          <td class="mono">${fmtDate(l.borrowed_at)}</td>
          <td class="mono">${fmtDate(l.due_at)}</td>
          <td>${state}</td>
          <td><div class="row-actions">${action}</div></td>
        </tr>`;
      })
      .join("");
    $("#loanEmpty").hidden = loans.length > 0;
  }

  async function load() {
    try {
      books = await api(`/api/library/books?q=${encodeURIComponent($("#search").value.trim())}`);
      render();
    } catch (err) {
      toast(err.message, true);
    }
    try {
      members = await api("/api/library/members");
      loans = await api("/api/library/loans");
      render();
    } catch {
      /* secondary panels — ignore */
    }
  }

  /* ---------- add book ---------- */
  $("#btnAddBook").addEventListener("click", () => {
    $("#bookForm").reset();
    $("#bookModal").classList.add("open");
    $("#bCode").focus();
  });
  $("#btnBookCancel").addEventListener("click", () => $("#bookModal").classList.remove("open"));
  $("#bookModal").addEventListener("click", (e) => {
    if (e.target === $("#bookModal")) $("#bookModal").classList.remove("open");
  });

  $("#bookForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      code: $("#bCode").value.trim(),
      title: $("#bTitle").value.trim(),
      author: $("#bAuthor").value.trim(),
      year: $("#bYear").value,
    };
    $("#btnBookSave").disabled = true;
    try {
      await api("/api/library/books", { method: "POST", body: JSON.stringify(payload) });
      toast("Book added");
      $("#bookModal").classList.remove("open");
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      $("#btnBookSave").disabled = false;
    }
  });

  /* ---------- borrow flow ---------- */
  function openBorrowModal(book) {
    borrowBookId = book.id;
    $("#borrowBookLabel").textContent = `${book.code} — ${book.title}`;
    $("#boMember").innerHTML = members
      .map((m) => `<option value="${m.id}">${esc(m.code)} · ${esc(m.name)}</option>`)
      .join("");
    $("#boDays").value = 14;
    if (members.length === 0) {
      toast("Add a member first", true);
      return;
    }
    $("#borrowModal").classList.add("open");
  }

  $("#btnBorrowCancel").addEventListener("click", () => $("#borrowModal").classList.remove("open"));
  $("#borrowModal").addEventListener("click", (e) => {
    if (e.target === $("#borrowModal")) $("#borrowModal").classList.remove("open");
  });

  $("#borrowForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("#btnBorrowSave").disabled = true;
    try {
      await api("/api/library/loans", {
        method: "POST",
        body: JSON.stringify({
          bookId: borrowBookId,
          memberId: Number($("#boMember").value),
          days: Number($("#boDays").value),
        }),
      });
      toast("Book borrowed");
      $("#borrowModal").classList.remove("open");
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      $("#btnBorrowSave").disabled = false;
    }
  });

  /* ---------- row actions (delegated) ---------- */
  document.querySelector("main").addEventListener("click", async (e) => {
    const borrowBtn = e.target.closest("[data-borrow]");
    const findBtn = e.target.closest("[data-find]");
    const returnBtn = e.target.closest("[data-return]");
    const delBtn = e.target.closest("[data-del]");

    if (borrowBtn) {
      const book = books.find((b) => b.id === Number(borrowBtn.dataset.borrow));
      if (book) openBorrowModal(book);
      return;
    }
    if (findBtn) {
      const loan = loans.find((l) => l.book_id === Number(findBtn.dataset.find) && !l.returned_at);
      toast(loan ? `Borrowed by ${loan.member_name} — due ${fmtDate(loan.due_at)}` : "Loan record not found");
      return;
    }
    if (returnBtn) {
      try {
        await api(`/api/library/loans/${returnBtn.dataset.return}/return`, { method: "POST" });
        toast("Book returned");
        await load();
      } catch (err) {
        toast(err.message, true);
      }
      return;
    }
    if (delBtn) {
      const book = books.find((b) => b.id === Number(delBtn.dataset.del));
      if (!book) return;
      if (!confirm(`Delete book "${book.title}"?`)) return;
      try {
        await api(`/api/library/books/${book.id}`, { method: "DELETE" });
        toast("Book deleted");
        await load();
      } catch (err) {
        toast(err.message, true);
      }
    }
  });

  $("#memberForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#memberName").value.trim();
    if (!name) return;
    try {
      await api("/api/library/members", { method: "POST", body: JSON.stringify({ name }) });
      toast(`Member added`);
      $("#memberName").value = "";
      await load();
    } catch (err) {
      toast(err.message, true);
    }
  });

  let searchTimer;
  $("#search").addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });
  $("#statusFilter").addEventListener("change", render);

  load();
})();
