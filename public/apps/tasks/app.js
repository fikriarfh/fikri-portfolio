/* Task Manager — front-end only demo (vanilla JS + localStorage) */
(() => {
  "use strict";

  const STORAGE_KEY = "fikri-demo-tasks";
  const listEl = document.getElementById("list");
  const countEl = document.getElementById("count");

  let tasks = [];
  let filter = "all";

  /* ---------- storage ---------- */
  function loadTasks() {
    try {
      tasks = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      tasks = [];
    }
    if (tasks.length === 0 && !localStorage.getItem(STORAGE_KEY)) seed();
  }

  function saveTasks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }

  function seed() {
    tasks = [
      { id: crypto.randomUUID(), text: "Explore this demo — click the checkbox to complete me", done: false, created: Date.now() },
      { id: crypto.randomUUID(), text: "Double-click a task text to edit it inline", done: false, created: Date.now() },
      { id: crypto.randomUUID(), text: "Refresh the page — tasks persist in localStorage", done: false, created: Date.now() },
    ];
    saveTasks();
  }

  /* ---------- rendering ---------- */
  const visible = () =>
    tasks.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done));

  function render() {
    const items = visible();
    listEl.innerHTML = items
      .map(
        (t) => `
        <div class="task ${t.done ? "done" : ""}" data-id="${t.id}">
          <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark task complete" />
          <span class="text" title="Double-click to edit">${escapeHtml(t.text)}</span>
          <span class="when">${new Date(t.created).toLocaleDateString("id-ID")}</span>
          <button class="btn btn-danger btn-sm" data-del aria-label="Delete task">✕</button>
        </div>`
      )
      .join("");
    if (items.length === 0) {
      listEl.innerHTML = '<div class="empty">Nothing here — add a task above.</div>';
    }
    const remaining = tasks.filter((t) => !t.done).length;
    countEl.textContent = `${remaining} task${remaining === 1 ? "" : "s"} remaining · ${tasks.length - remaining} done`;
  }

  function escapeHtml(v) {
    const div = document.createElement("div");
    div.textContent = v;
    return div.innerHTML;
  }

  let toastTimer;
  function toast(message) {
    const el = document.getElementById("toast");
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2200);
  }

  /* ---------- actions ---------- */
  document.getElementById("taskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("taskInput");
    const text = input.value.trim();
    if (!text) return;
    tasks.unshift({ id: crypto.randomUUID(), text, done: false, created: Date.now() });
    input.value = "";
    saveTasks();
    render();
    toast("Task added");
  });

  listEl.addEventListener("click", (e) => {
    const taskEl = e.target.closest(".task");
    if (!taskEl) return;
    const id = taskEl.dataset.id;
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    if (e.target.dataset.del !== undefined) {
      tasks = tasks.filter((t) => t.id !== id);
      saveTasks();
      render();
      toast("Task deleted");
      return;
    }
    if (e.target.type === "checkbox") {
      task.done = e.target.checked;
      saveTasks();
      render();
    }
  });

  // Inline edit on double-click of the text
  listEl.addEventListener("dblclick", (e) => {
    const textEl = e.target.closest(".text");
    if (!textEl) return;
    const taskEl = textEl.closest(".task");
    const task = tasks.find((t) => t.id === taskEl.dataset.id);
    if (!task) return;

    textEl.contentEditable = "true";
    textEl.focus();
    // Select all text for quick replacement
    const range = document.createRange();
    range.selectNodeContents(textEl);
    const sel = getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const commit = () => {
      textEl.contentEditable = "false";
      const newText = textEl.textContent.trim();
      if (newText && newText !== task.text) {
        task.text = newText;
        saveTasks();
        toast("Task updated");
      }
      render();
    };
    textEl.addEventListener("blur", commit, { once: true });
    textEl.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        textEl.blur();
      }
      if (ev.key === "Escape") {
        textEl.removeEventListener("blur", commit);
        render();
      }
    });
  });

  document.querySelectorAll(".filter-btn").forEach((btn) =>
    btn.addEventListener("click", () => {
      filter = btn.dataset.filter;
      document.querySelectorAll(".filter-btn").forEach((b) => b.classList.toggle("active", b === btn));
      render();
    })
  );

  document.getElementById("clearDone").addEventListener("click", () => {
    const doneCount = tasks.filter((t) => t.done).length;
    if (doneCount === 0) return toast("No completed tasks to clear");
    tasks = tasks.filter((t) => !t.done);
    saveTasks();
    render();
    toast(`${doneCount} completed task${doneCount === 1 ? "" : "s"} cleared`);
  });

  loadTasks();
  render();
})();
