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
    toastEl.textContent = message;
    toastEl.classList.toggle("error", isError);
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
  };

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

    const active = students.filter((s) => s.status === "Aktif").length;
    const majors = new Set(students.map((s) => s.major)).size;
    const avgGpa = students.length
      ? (students.reduce((sum, s) => sum + s.gpa, 0) / students.length).toFixed(2)
      : "–";
    $("#statTotal").textContent = students.length;
    $("#statActive").textContent = active;
    $("#statGpa").textContent = avgGpa;
    $("#statMajor").textContent = majors;
  }

  async function load() {
    try {
      students = await api(`/api/sis/students${searchInput.value ? `?q=${encodeURIComponent(searchInput.value)}` : ""}`);
      render();
    } catch (err) {
      toast(err.message, true);
    }
  }

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
        await load();
      } catch (err) {
        toast(err.message, true);
      }
    }
  });

  /* ---------- search (debounced) ---------- */
  let searchTimer;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(load, 300);
  });

  load();
})();
