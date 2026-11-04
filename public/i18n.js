/**
 * i18n.js — bilingual content (EN / ID) for the portfolio landing page.
 * Adds a language toggle in the navbar, persists the choice in localStorage,
 * and defaults to the visitor's browser language.
 */
(() => {
  "use strict";

  const STRINGS = {
    en: {
      "meta.description":
        "Portfolio of Fikri Arif Fadillah — Web Developer specializing in PHP, MySQL, JavaScript, HTML, and CSS. Based in Jakarta, Indonesia.",
      skip: "Skip to main content",

      "nav.about": "About",
      "nav.skills": "Skills",
      "nav.experience": "Experience",
      "nav.projects": "Projects",
      "nav.notes": "Notes",
      "nav.credentials": "Credentials",
      "nav.contact": "Contact",

      "hero.hello": "Hi, my name is",
      "hero.tagline": 'I build <span class="accent">responsive &amp; integrated</span> web applications.',
      "hero.desc":
        'Computer Science graduate specializing in web development — PHP, MySQL, JavaScript, HTML &amp; CSS. Based in <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg> Jakarta, Indonesia.',
      "hero.btnProjects": "View Projects",
      "hero.btnContact": "Get in Touch",

      "sec.about": '<span class="accent">01.</span> About Me',
      "about.p1":
        "I'm a Computer Science graduate (Informatics Engineering) specializing in <strong>web development</strong> with core expertise in <strong>PHP, MySQL, JavaScript, HTML, and CSS</strong>.",
      "about.p2":
        "I have experience designing web-based systems, managing relational databases, and supporting AI data validation workflows. I'm proficient in version control using <strong>Git/GitHub</strong> for structured code collaboration.",
      "about.p3":
        "Right now I'm looking for a team where I can <strong>contribute, learn fast, and build things people actually use</strong>.",
      "stat.gpa": "GPA — Informatics Engineering",
      "stat.ai": "Year of AI Data Annotation Experience",
      "stat.cert": "National-Level Web Developer Certifications",

      "sec.skills": '<span class="accent">02.</span> Skills',
      "skills.technical": "Technical Skills",
      "skills.soft": "Soft Skills",
      "skills.note": 'Core stack marked in <span class="accent">teal</span> — used across my web projects.',
      "chip.problem": "Problem-Solving",
      "chip.analytical": "Analytical Thinking",
      "chip.time": "Time Management",
      "chip.communication": "Effective Communication",
      "chip.adapt": "Adaptability",
      "chip.learning": "Continuous Learning",
      "chip.team": "Teamwork & Collaboration",

      "sec.experience": '<span class="accent">03.</span> Experience',
      "exp.b1":
        "Prepared high-quality labeled datasets for artificial intelligence (AI) projects, ensuring precision in text and image annotation.",
      "exp.b2":
        "Collaborated with developers to improve dataset quality and align data specifications with project requirements.",
      "exp.b3":
        "Followed strict annotation guidelines to enhance AI model performance across various use-case scenarios.",

      "sec.projects": '<span class="accent">04.</span> Projects',
      "proj.subtitle":
        'A few systems I\'ve built — every card links to a <span class="accent">working demo</span>, not a mockup.',
      "proj.sis.title": "Student Information System",
      "proj.sis.desc":
        "Full CRUD system for student records with search, a statistics dashboard, and a normalized relational schema — REST API built on Node.js with zero external dependencies.",
      "proj.inv.title": "Inventory Management Web App",
      "proj.inv.desc":
        "Stock tracking with incoming/outgoing transaction logs, inventory valuation, and low-stock alerts — a Node.js REST API paired with an interactive JavaScript front-end.",
      "proj.lib.title": "Library Management System",
      "proj.lib.desc":
        "Borrow-and-return workflow for a campus library — book catalog, member registry, and loan records with overdue detection, backed by relational SQL queries.",
      "proj.task.title": "Task Manager App",
      "proj.task.desc":
        "Responsive to-do application with add, complete, inline-edit, filter, and delete actions — persisted locally in the browser with vanilla JavaScript and localStorage.",
      "proj.assistant.title": "AI Job Application Assistant",
      "proj.assistant.desc":
        "Paste a job description and get a tailored cover letter or CV highlights via the Gemini API — plus an application tracker with CSV export. Your API key and data never leave the browser.",

      "sec.notes": '<span class="accent">05.</span> Engineering Notes',
      "notes.intro":
        "Some notes on how I built all this — what holds up, where I cut corners, and what I'd fix first if it went to production.",
      "notes.solid.title": "What's solid",
      "notes.s1": "No frameworks, no dependencies — just node:http and the built-in SQLite module. The whole thing deploys at ~65 KB and boots in under a second.",
      "notes.s2": "The API follows REST properly: real resources, real status codes. 400 for bad input, 409 when you try to create a duplicate NIM, that kind of thing.",
      "notes.s3": "Security basics are covered — parameterized queries everywhere, a path-traversal guard, server-side validation, and passwords hashed with scrypt.",
      "notes.s4": "Business rules live in the database itself: UNIQUE, CHECK and FK constraints, so the app can't save data the database wouldn't accept anyway.",
      "notes.s5": "30 API tests run on every push via GitHub Actions. They've caught real bugs for me — like a route-ordering mistake that broke student deletion.",
      "notes.tradeoffs.title": "Trade-offs & what I'd fix first",
      "notes.t1": "Only the SIS app has a login. Inventory and Library are open on purpose — adding auth everywhere would triple the code without teaching me much new.",
      "notes.t2": "No schema migrations. Tables are created with IF NOT EXISTS and that's it. Fine for now, but I know it's the first thing to fix before this grows.",
      "notes.t3": "The demo database resets every now and then on the cloud runtime. It's a public demo — the data isn't the point.",
      "notes.t4": "SQLite calls are synchronous, so heavy traffic would block the event loop. At demo traffic levels this is a non-issue.",
      "notes.t5": "No rate limiting or roles yet. If this went to production, those would be my first two PRs.",
      "notes.next": "Already shipped: the CI pipeline, login sessions, and pagination. Next on my list: roles and schema migrations.",

      "sec.credentials": '<span class="accent">06.</span> Credentials',
      "cred.education": "Education",
      "cred.certs": "Certifications & Training",
      "edu.role": "Bachelor of Computer Science (Informatics Engineering)",
      "edu.gpa": "GPA: 3.06 / 4.00",
      "cert.role": "Digital Talent Academy — National Level",

      "sec.contact": '<span class="accent">07.</span> Get In Touch',
      "contact.lead":
        "I'm currently open to web developer roles and freelance projects. Got something in mind, or just want to say hi? Send me a message — I usually reply fast.",
      "contact.phone": "Phone / WhatsApp",
      "contact.location": "Location",

      "footer.line": 'Designed & built by <span class="accent">Fikri Arif Fadillah</span>',
      "footer.copy": "— All rights reserved.",
    },

    id: {
      "meta.description":
        "Portofolio Fikri Arif Fadillah — Web Developer dengan keahlian PHP, MySQL, JavaScript, HTML, dan CSS. Berdomisili di Jakarta, Indonesia.",
      skip: "Lewati ke konten utama",

      "nav.about": "Tentang",
      "nav.skills": "Keahlian",
      "nav.experience": "Pengalaman",
      "nav.projects": "Proyek",
      "nav.notes": "Catatan",
      "nav.credentials": "Kredensial",
      "nav.contact": "Kontak",

      "hero.hello": "Halo, nama saya",
      "hero.tagline": 'Saya membangun <span class="accent">aplikasi web responsif &amp; terintegrasi</span>.',
      "hero.desc":
        'Lulusan Ilmu Komputer yang berfokus pada pengembangan web — PHP, MySQL, JavaScript, HTML &amp; CSS. Berdomisili di <svg class="icon" aria-hidden="true" viewBox="0 0 24 24"><path fill="currentColor" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z"/></svg> Jakarta, Indonesia.',
      "hero.btnProjects": "Lihat Proyek",
      "hero.btnContact": "Hubungi Saya",

      "sec.about": '<span class="accent">01.</span> Tentang Saya',
      "about.p1":
        "Saya lulusan Ilmu Komputer (Teknik Informatika) yang berfokus pada <strong>pengembangan web</strong> dengan keahlian utama <strong>PHP, MySQL, JavaScript, HTML, dan CSS</strong>.",
      "about.p2":
        "Saya berpengalaman merancang sistem berbasis web, mengelola database relasional, dan mendukung alur validasi data AI. Saya menguasai version control dengan <strong>Git/GitHub</strong> untuk kolaborasi kode yang terstruktur.",
      "about.p3":
        "Saat ini saya sedang mencari tim tempat saya dapat <strong>berkontribusi, belajar dengan cepat, dan membangun produk yang benar-benar bermanfaat bagi banyak orang</strong>.",
      "stat.gpa": "IPK — Teknik Informatika",
      "stat.ai": "Tahun Pengalaman Anotasi Data AI",
      "stat.cert": "Sertifikasi Web Developer Tingkat Nasional",

      "sec.skills": '<span class="accent">02.</span> Keahlian',
      "skills.technical": "Skill Teknis",
      "skills.soft": "Soft Skill",
      "skills.note": 'Tech stack utama ditandai warna <span class="accent">teal</span> — digunakan di proyek-proyek web saya.',
      "chip.problem": "Pemecahan Masalah",
      "chip.analytical": "Berpikir Analitis",
      "chip.time": "Manajemen Waktu",
      "chip.communication": "Komunikasi Efektif",
      "chip.adapt": "Adaptabilitas",
      "chip.learning": "Belajar Berkelanjutan",
      "chip.team": "Kerja Tim & Kolaborasi",

      "sec.experience": '<span class="accent">03.</span> Pengalaman',
      "exp.b1":
        "Menyiapkan dataset berlabel berkualitas tinggi untuk proyek kecerdasan buatan (AI), memastikan presisi anotasi teks dan gambar.",
      "exp.b2":
        "Berkolaborasi dengan developer untuk meningkatkan kualitas dataset dan menyelaraskan spesifikasi data dengan kebutuhan proyek.",
      "exp.b3":
        "Mengikuti pedoman anotasi yang ketat untuk meningkatkan performa model AI pada berbagai skenario penggunaan.",

      "sec.projects": '<span class="accent">04.</span> Proyek',
      "proj.subtitle":
        'Beberapa sistem berbasis web yang pernah saya bangun — setiap kartu mengarah ke <span class="accent">demo yang benar-benar berfungsi</span>, bukan sekadar tampilan.',
      "proj.sis.title": "Sistem Informasi Mahasiswa",
      "proj.sis.desc":
        "Sistem CRUD lengkap untuk data mahasiswa dengan pencarian, dashboard statistik, dan skema relasional ternormalisasi — REST API dibangun dengan Node.js tanpa dependency eksternal.",
      "proj.inv.title": "Aplikasi Manajemen Inventori",
      "proj.inv.desc":
        "Pelacakan stok dengan log transaksi masuk/keluar, valuasi inventori, dan peringatan stok menipis — REST API Node.js dipadukan dengan front-end JavaScript interaktif.",
      "proj.lib.title": "Sistem Manajemen Perpustakaan",
      "proj.lib.desc":
        "Alur peminjaman dan pengembalian untuk perpustakaan kampus — katalog buku, data anggota, dan catatan peminjaman dengan deteksi keterlambatan, didukung query SQL relasional.",
      "proj.task.title": "Aplikasi Task Manager",
      "proj.task.desc":
        "Aplikasi to-do responsif dengan aksi tambah, selesai, edit langsung, filter, dan hapus — tersimpan lokal di browser dengan vanilla JavaScript dan localStorage.",
      "proj.assistant.title": "Asisten Lamaran Kerja AI",
      "proj.assistant.desc":
        "Tempelkan deskripsi lowongan dan dapatkan surat lamaran atau sorotan CV yang disesuaikan melalui Gemini API — dilengkapi pelacak lamaran dengan ekspor CSV. API key dan data Anda tidak pernah keluar dari browser.",

      "sec.notes": '<span class="accent">05.</span> Catatan Teknis',
      "notes.intro":
        "Catatan mengenai cara saya membangun aplikasi-aplikasi ini — bagian mana yang sudah kokoh, mana yang sengaja dibuat sederhana, dan mana yang akan menjadi prioritas perbaikan apabila digunakan secara nyata.",
      "notes.solid.title": "Bagian yang Sudah Kokoh",
      "notes.s1": "Tanpa framework dan tanpa pustaka tambahan — hanya menggunakan node:http serta modul SQLite bawaan Node.js. Hasil deployment hanya sekitar 65 KB dan dapat dijalankan dalam waktu kurang dari satu detik.",
      "notes.s2": "API mengikuti prinsip REST dengan benar — resource yang jelas serta penggunaan status code yang semantik: 400 untuk masukan yang tidak valid, 409 untuk NIM yang duplikat, dan seterusnya.",
      "notes.s3": "Aspek keamanan dasar terjaga — seluruh query menggunakan parameterized query, tersedia pengaman terhadap path traversal, validasi dilakukan di sisi server, dan kata sandi di-hash menggunakan scrypt.",
      "notes.s4": "Aturan bisnis ditegakkan di tingkat database melalui constraint UNIQUE, CHECK, dan FK — aplikasi tidak mungkin menyimpan data yang ditolak oleh database itu sendiri.",
      "notes.s5": "Terdapat 30 pengujian API yang berjalan otomatis pada setiap push melalui GitHub Actions. Pengujian ini beberapa kali telah menyelamatkan proyek dari bug — salah satunya kesalahan urutan route yang membuat fitur penghapusan tidak berfungsi.",
      "notes.tradeoffs.title": "Keterbatasan dan Rencana Perbaikan",
      "notes.t1": "Fitur autentikasi saat ini hanya terdapat pada aplikasi SIS — Inventory dan Library sengaja dibiarkan terbuka; jika seluruhnya harus melewati autentikasi, kode akan membengkak tanpa menambah banyak hal baru yang dapat saya pelajari.",
      "notes.t2": "Belum ada mekanisme migrasi skema — tabel cukup dibuat dengan IF NOT EXISTS. Hal ini wajar untuk sebuah demo, tetapi menjadi prioritas perbaikan pertama apabila proyek ini dikembangkan lebih lanjut.",
      "notes.t3": "Database demo dapat ter-reset secara berkala oleh runtime cloud. Ini merupakan konsekuensi wajar dari demo publik — data bukanlah fokus utamanya.",
      "notes.t4": "Akses ke SQLite masih bersifat sinkron — pada trafik tinggi hal ini dapat memblokir event loop. Untuk skala trafik demo, hal tersebut tidak menjadi masalah.",
      "notes.t5": "Belum ada rate limiting maupun manajemen peran (role). Apabila aplikasi ini digunakan secara nyata, dua hal inilah yang akan menjadi pull request pertama saya.",
      "notes.next": "Baru saja dirilis: CI pipeline, sesi login, dan pagination. Berikutnya dalam daftar: manajemen peran dan migrasi skema.",

      "sec.credentials": '<span class="accent">06.</span> Kredensial',
      "cred.education": "Pendidikan",
      "cred.certs": "Sertifikasi & Pelatihan",
      "edu.role": "Sarjana Ilmu Komputer (Teknik Informatika)",
      "edu.gpa": "IPK: 3.06 / 4.00",
      "cert.role": "Digital Talent Academy — Tingkat Nasional",

      "sec.contact": '<span class="accent">07.</span> Hubungi Saya',
      "contact.lead":
        "Saya sedang terbuka untuk peluang sebagai web developer, baik full-time maupun freelance. Apabila Anda memiliki ide proyek atau sekadar ingin berkenalan, silakan hubungi saya — saya akan dengan senang hati membalasnya.",
      "contact.phone": "Telepon / WhatsApp",
      "contact.location": "Lokasi",

      "footer.line": 'Dirancang & dibangun oleh <span class="accent">Fikri Arif Fadillah</span>',
      "footer.copy": "— Hak cipta dilindungi.",
    },
  };

  const STORAGE_KEY = "fikri-portfolio-lang";
  const root = document.documentElement;

  let current = null;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "id") current = saved;
  } catch {
    /* localStorage unavailable — fall through to browser language */
  }
  if (!current) {
    current = (navigator.language || "en").toLowerCase().startsWith("id") ? "id" : "en";
  }

  function apply(lang) {
    current = lang;
    const dict = STRINGS[lang];

    root.lang = lang;
    document.title = "Fikri Arif Fadillah — Web Developer";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", dict["meta.description"]);

    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const value = dict[el.getAttribute("data-i18n")];
      if (value != null) el.textContent = value;
    });
    document.querySelectorAll("[data-i18n-html]").forEach((el) => {
      const value = dict[el.getAttribute("data-i18n-html")];
      if (value != null) el.innerHTML = value;
    });

    document.querySelectorAll(".lang-btn").forEach((btn) => {
      const active = btn.dataset.lang === lang;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-pressed", String(active));
    });

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* persistence is best-effort */
    }
  }

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.addEventListener("click", () => apply(btn.dataset.lang));
  });

  apply(current);
})();
