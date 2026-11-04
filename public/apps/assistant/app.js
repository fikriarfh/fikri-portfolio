/* AI Job Application Assistant — Gemini API + application tracker (vanilla JS) */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const KEY_STORAGE = "fikri-assistant-key";
  const MODEL_STORAGE = "fikri-assistant-model";
  const TRACK_STORAGE = "fikri-assistant-apps";

  // Compact profile used in every prompt — matches Fikri's real CV.
  const PROFILE = `Fikri Arif Fadillah — junior web developer based in Jakarta, Indonesia.
Education: Bachelor of Computer Science (Informatics Engineering), Universitas Indraprasta PGRI, GPA 3.06/4.00.
Skills: PHP, MySQL, JavaScript, HTML, CSS, Java, Git & GitHub.
Experience: AI Data Annotator (freelance, Nexter AI — South Korea, Apr 2024 - May 2025): prepared labeled datasets for AI projects, collaborated with developers, followed strict annotation guidelines.
Certifications: Fundamental & Intermediate Assistant Web Developer (Digital Talent Academy, national level); Java NetBeans + MySQL workshop.
Projects (all built with Node.js + SQLite, zero dependencies, 30 automated tests in CI): Student Information System, Inventory Management app, Library Management System, Task Manager.`;

  /* ---------- helpers ---------- */
  let toastTimer;
  const toast = (message, isError = false) => {
    const el = $("#toast");
    el.textContent = message;
    el.classList.toggle("error", isError);
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
  };

  const getKey = () => $("#apiKey").value.trim() || localStorage.getItem(KEY_STORAGE) || "";
  const getModel = () => $("#model").value.trim() || localStorage.getItem(MODEL_STORAGE) || "gemini-2.0-flash";

  const busy = (btn, on, label) => {
    btn.disabled = on;
    btn.innerHTML = on ? `<span class="spinner"></span>${label || "Generating…"}` : btn.dataset.label;
  };
  const arm = (btn) => { btn.dataset.label = btn.innerHTML; };

  /* ---------- settings ---------- */
  const refreshKeyStatus = () => {
    const el = $("#keyStatus");
    const saved = localStorage.getItem(KEY_STORAGE);
    if (saved) {
      el.textContent = "● API key saved in this browser";
      el.className = "key-status ok";
    } else {
      el.textContent = "● No API key yet — generation is disabled until you add one";
      el.className = "key-status missing";
    }
  };

  $("#btnSettings").addEventListener("click", () => {
    $("#settingsPanel").classList.toggle("open");
    $("#apiKey").value = localStorage.getItem(KEY_STORAGE) || "";
    $("#model").value = localStorage.getItem(MODEL_STORAGE) || "";
  });

  $("#btnSaveKey").addEventListener("click", () => {
    const key = $("#apiKey").value.trim();
    const model = $("#model").value.trim();
    if (key) localStorage.setItem(KEY_STORAGE, key); else localStorage.removeItem(KEY_STORAGE);
    if (model) localStorage.setItem(MODEL_STORAGE, model);
    refreshKeyStatus();
    toast(key ? "Settings saved" : "API key removed");
  });

  /* ---------- Gemini ---------- */
  async function callGemini(prompt) {
    const key = getKey();
    if (!key) {
      $("#settingsPanel").classList.add("open");
      $("#apiKey").focus();
      throw new Error("Add your Gemini API key in Settings first (free at aistudio.google.com)");
    }
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(getModel())}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      if (res.status === 400 && /API key/i.test(msg)) throw new Error("API key looks invalid — check it in Settings");
      if (res.status === 429) throw new Error("Rate limit / quota reached on your free tier — try again in a minute");
      if (res.status === 404) throw new Error(`Model "${getModel()}" not found — pick another model name in Settings`);
      throw new Error(msg);
    }
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini — try again");
    return text.trim();
  }

  const buildContext = () => {
    const title = $("#jobTitle").value.trim() || "the advertised position";
    const company = $("#company").value.trim() || "your company";
    const desc = $("#jobDesc").value.trim();
    if (!desc) {
      toast("Paste the job description first", true);
      return null;
    }
    return { title, company, desc };
  };

  $("#btnLetter").addEventListener("click", async (e) => {
    arm(e.currentTarget);
    const ctx = buildContext();
    if (!ctx) return;
    const lang = $("#lang").value;
    const tone = $("#tone").value;
    const prompt = `You are helping a job seeker write a cover letter.

Candidate profile:
${PROFILE}

Job title: ${ctx.title}
Company: ${ctx.company}
Language: write the letter in ${lang}
Tone: ${tone}

Job description:
"""
${ctx.desc}
"""

Write a concise, specific cover letter (max 300 words) tailored to this job.
Rules: reference the candidate's real projects and skills ONLY where they genuinely match the description; no invented experience; no generic filler sentences; address it to "Hiring Team" unless a contact name is in the description; end with the candidate's name. Output ONLY the letter text, no preamble.`;

    const btn = e.currentTarget;
    busy(btn, true);
    try {
      $("#result").value = await callGemini(prompt);
      $("#result").dataset.kind = "letter";
      toast("Cover letter drafted — edit freely before sending");
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(btn, false);
    }
  });

  $("#btnCv").addEventListener("click", async (e) => {
    arm(e.currentTarget);
    const ctx = buildContext();
    if (!ctx) return;
    const lang = $("#lang").value;
    const prompt = `You are helping a job seeker tailor their CV to a job posting.

Candidate profile:
${PROFILE}

Job title: ${ctx.title}
Language: write in ${lang}
Job description:
"""
${ctx.desc}
"""

Task: rewrite the candidate's CV summary and pick/order the most relevant skills and projects for THIS job.
Output format (plain text, no markdown headers):
1. A 2-sentence professional summary.
2. Six bullet points (start each with "- ") tailored to the job — only real experience from the profile, no inventions.
3. One short line: "Skill gaps to consider learning: …" based on the description.`;

    const btn = e.currentTarget;
    busy(btn, true);
    try {
      $("#result").value = await callGemini(prompt);
      $("#result").dataset.kind = "cv";
      toast("CV highlights tailored");
    } catch (err) {
      toast(err.message, true);
    } finally {
      busy(btn, false);
    }
  });

  $("#btnCopy").addEventListener("click", async () => {
    const text = $("#result").value;
    if (!text) return toast("Nothing to copy yet", true);
    await navigator.clipboard.writeText(text);
    toast("Copied to clipboard");
  });

  /* ---------- application tracker ---------- */
  const loadApps = () => {
    try { return JSON.parse(localStorage.getItem(TRACK_STORAGE)) || []; }
    catch { return []; }
  };
  const saveApps = (apps) => localStorage.setItem(TRACK_STORAGE, JSON.stringify(apps));

  const statusClass = (s) =>
    s === "Offer" ? "badge-green" : s === "Interview" ? "badge-yellow" : s === "Rejected" ? "badge-red" : "";

  function renderTracker() {
    const apps = loadApps();
    $("#trackBody").innerHTML = apps
      .map((a, i) => {
        const link = a.link
          ? ` <a href="${escapeAttr(a.link)}" target="_blank" rel="noopener">↗</a>`
          : "";
        return `
        <tr>
          <td>${escapeHtml(a.company)}</td>
          <td>${escapeHtml(a.role)}${link}</td>
          <td class="mono">${escapeHtml(a.date)}</td>
          <td><span class="badge ${statusClass(a.status)} status-chip" data-cycle="${i}" title="Click to change status">${escapeHtml(a.status)}</span></td>
          <td><div class="row-actions"><button class="btn btn-danger btn-sm" data-del="${i}">Del</button></div></td>
        </tr>`;
      })
      .join("");
    $("#trackEmpty").hidden = apps.length > 0;
    $("#trackCount").textContent = `${apps.length} application${apps.length === 1 ? "" : "s"} tracked`;
  }

  function escapeHtml(v) {
    const div = document.createElement("div");
    div.textContent = v;
    return div.innerHTML;
  }
  const escapeAttr = (v) => escapeHtml(v).replace(/"/g, "&quot;");

  $("#trackForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const apps = loadApps();
    apps.unshift({
      company: $("#tCompany").value.trim(),
      role: $("#tRole").value.trim(),
      link: $("#tLink").value.trim(),
      status: $("#tStatus").value,
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    });
    saveApps(apps);
    $("#trackForm").reset();
    renderTracker();
    toast("Application tracked");
  });

  document.querySelector("#trackBody").addEventListener("click", (e) => {
    const del = e.target.closest("[data-del]");
    const chip = e.target.closest("[data-cycle]");
    const apps = loadApps();
    if (del) {
      apps.splice(Number(del.dataset.del), 1);
      saveApps(apps);
      renderTracker();
      toast("Entry removed");
      return;
    }
    if (chip) {
      const cycle = ["Applied", "Interview", "Offer", "Rejected"];
      const i = Number(chip.dataset.cycle);
      apps[i].status = cycle[(cycle.indexOf(apps[i].status) + 1) % cycle.length];
      saveApps(apps);
      renderTracker();
    }
  });

  $("#btnExport").addEventListener("click", () => {
    const apps = loadApps();
    if (!apps.length) return toast("Nothing to export yet", true);
    const rows = [["Company", "Role", "Date", "Status", "Link"]]
      .concat(apps.map((a) => [a.company, a.role, a.date, a.status, a.link || ""]))
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + rows], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "job-applications.csv";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("CSV exported");
  });

  /* ---------- save generated draft into tracker ---------- */
  $("#btnSaveDraft").addEventListener("click", () => {
    const company = $("#company").value.trim();
    const role = $("#jobTitle").value.trim();
    if (!company || !role) return toast("Fill the job title and company first", true);
    const apps = loadApps();
    apps.unshift({
      company,
      role: role + " (draft ready)",
      link: "",
      status: "Applied",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    });
    saveApps(apps);
    renderTracker();
    toast("Added to tracker");
  });

  refreshKeyStatus();
  renderTracker();
})();
