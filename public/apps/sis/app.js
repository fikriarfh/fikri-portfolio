/* Student Information System — demo app front-end (vanilla JS) */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const tbody = $("#tbody");
  const empty = $("#empty");
  const searchInput = $("#search");
  const modal = $("#modal");
  const form = $("#form");
  const toastEl = $("#toast");

  let students = [];
  let editingId = null;
  let page = 1;
  let totalPages = 1;
  let total = 0;
  const PAGE_SIZE = 6;

  /* ---------- helpers ---------- */
  const api = async (path, options = {}) => {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    const json = await res.json().catch(() => ({ ok: false, error: "Bad response" }));
    if (!res.ok || !json.ok) {
      const err = new Error(json.error || `HTTP ${res.status}`);
      err.status = res.status;
      throw err;
    }
    return json.data;
  };

  let toastTimer;
  const toast = (message, isError = false) => {
    toastEl.textContent = message;
    toastEl.classList.toggle("error", isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

  /* ---------- auth gate ---------- */
  const loginView = document.getElementById("loginView");
  const topbarUser = document.getElementById("topbarUser");
  const userLabel = document.getElementById("userLabel");

  const showLogin = () => {
    loginView.classList.add("open");
    topbarUser.hidden = true;
    $("#lPass").value = "";
    $("#lUser").focus();
  };

  const showApp = (username) => {
    loginView.classList.remove("open");
    topbarUser.hidden = false;
    userLabel.textContent = `Signed in as ${username}`;
  };

  async function checkSession() {
    try {
      const user = await api("/api/auth/me");
      showApp(user.username);
      await refresh();
    } catch {
      showLogin();
    }
  }

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("btnLogin");
    btn.disabled = true;
    try {
      const user = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: $("#lUser").value.trim(), password: $("#lPass").value }),
      });
      showApp(user.username);
      await refresh();
      toast(`Welcome back, ${user.username}`);
    } catch (err) {
      toast(err.message, true);
    } finally {
      btn.disabled = false;
    }
  });

  document.getElementById("btnLogout").addEventListener("click", async () => {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* even if the server call fails, drop to the login screen */
    }
    showLogin();
    toast("Signed out");
  });

  const statusBadge = (status) =>
    status === "Aktif" ? '<span class="badge badge-green">Aktif</span>'
      : status === "Cuti" ? '<span class="badge badge-yellow">Cuti</span>'
      : '<span class="badge">Lulus</span>';

  const esc = (v) => {
    const div = document.createElement("div");
    div.textContent = v;
    return div.innerHTML;
  };

  /* ---------- rendering ---------- */
  function render() {
    tbody.innerHTML = students
      .map(
        (s) => `
        <tr>
          <td class="mono">${esc(s.nim)}</td>
          <td>${esc(s.name)}</td>
          <td>${esc(s.major)}</td>
          <td class="num">${s.gpa.toFixed(2)}</td>
          <td>${statusBadge(s.status)}</td>
          <td>
            <div class="row-actions">
              <button class="btn btn-ghost btn-sm" data-edit="${s.id}">Edit</button>
              <button class="btn btn-danger btn-sm" data-del="${s.id}">Delete</button>
            </div>
          </td>
        </tr>`
      )
      .join("");
    empty.hidden = students.length > 0;
  }

  function renderPager() {
    const pager = document.getElementById("pager");
    pager.hidden = totalPages <= 1;
    document.getElementById("pageInfo").textContent = `Page ${page} of ${totalPages} — ${total} students`;
    $("#pagePrev").disabled = page <= 1;
    $("#pageNext").disabled = page >= totalPages;
  }

  async function load() {
    try {
      const data = await api(
        `/api/sis/students?page=${page}&pageSize=${PAGE_SIZE}${searchInput.value ? `&q=${encodeURIComponent(searchInput.value)}` : ""}`
      );
      students = data.items;
      total = data.total;
      totalPages = data.totalPages;
      page = data.page;
      render();
      renderPager();
    } catch (err) {
      if (err.status === 401) return showLogin();
      toast(err.message, true);
    }
  }

  async function loadStats() {
    try {
      const s = await api("/api/sis/stats");
      $("#statTotal").textContent = s.total;
      $("#statActive").textContent = s.active;
      $("#statGpa").textContent = s.total ? s.avgGpa.toFixed(2) : "–";
      $("#statMajor").textContent = s.majors;
    } catch (err) {
      if (err.status === 401) return showLogin();
    }
  }

  const refresh = () => Promise.all([load(), loadStats()]);

  /* ---------- modal ---------- */
  function openModal(student) {
    editingId = student ? student.id : null;
    $("#modalTitle").textContent = student ? "Edit Student" : "Add Student";
    $("#fNim").value = student ? student.nim : "";
    $("#fName").value = student ? student.name : "";
    $("#fMajor").value = student ? student.major : "Informatika";
    $("#fGpa").value = student ? student.gpa : "";
    $("#fStatus").value = student ? student.status : "Aktif";
    modal.classList.add("open");
    $("#fNim").focus();
  }

  const closeModal = () => modal.classList.remove("open");

  $("#btnAdd").addEventListener("click", () => openModal(null));
  $("#btnCancel").addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      nim: $("#fNim").value.trim(),
      name: $("#fName").value.trim(),
      major: $("#fMajor").value,
      gpa: Number($("#fGpa").value),
      status: $("#fStatus").value,
    };
    const btnSave = $("#btnSave");
    btnSave.disabled = true;
    try {
      if (editingId) {
        await api(`/api/sis/students/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
        toast("Student updated");
      } else {
        await api("/api/sis/students", { method: "POST", body: JSON.stringify(payload) });
        toast("Student added");
      }
      closeModal();
      await load();
    } catch (err) {
      toast(err.message, true);
    } finally {
      btnSave.disabled = false;
    }
  });

  /* ---------- row actions (delegated) ---------- */
  tbody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const delBtn = e.target.closest("[data-del]");
    if (editBtn) {
      const student = students.find((s) => s.id === Number(editBtn.dataset.edit));
      if (student) openModal(student);
      return;
    }
    if (delBtn) {
      const id = Number(delBtn.dataset.del);
      const student = students.find((s) => s.id === id);
      if (!student) return;
      if (!confirm(`Delete student "${student.name}"?`)) return;
      try {
        await api(`/api/sis/students/${id}`, { method: "DELETE" });
        toast("Student deleted");
        await refresh();
      } catch (err) {
        toast(err.message, true);
      }
    }
  });

  /* ---------- pager ---------- */
  document.getElementById("pagePrev").addEventListener("click", () => {
    if (page > 1) {
      page--;
      load();
    }
  });
  document.getElementById("pageNext").addEventListener("click", () => {
    if (page < totalPages) {
      page++;
      load();
    }
  });

  /* ---------- search (debounced, resets to page 1) ---------- */
  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      page = 1;
      load();
    }, 300);
  });

  checkSession();
})();
