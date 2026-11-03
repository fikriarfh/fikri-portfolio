/* ============================================================
   Fikri Arif Fadillah — Portfolio · vanilla JS
   Mobile menu, active nav highlighting, scroll reveal, footer year
   ============================================================ */

(() => {
  "use strict";

  /* ---------- Footer year ---------- */
  document.getElementById("year").textContent = new Date().getFullYear();

  /* ---------- Mobile menu ---------- */
  const toggle = document.getElementById("navToggle");
  const menu = document.getElementById("navMenu");

  const closeMenu = () => {
    toggle.classList.remove("open");
    menu.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const isOpen = menu.classList.toggle("open");
    toggle.classList.toggle("open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  // Close the menu when a link is chosen
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));

  // Close when tapping outside on mobile
  document.addEventListener("click", (e) => {
    if (
      menu.classList.contains("open") &&
      !menu.contains(e.target) &&
      !toggle.contains(e.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ---------- Navbar border on scroll ---------- */
  const navbar = document.getElementById("navbar");
  const onScroll = () => navbar.classList.toggle("scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Active nav link highlighting ---------- */
  const sections = document.querySelectorAll("main section[id]");
  const navLinks = document.querySelectorAll(".nav-link");

  const setActiveLink = () => {
    const pos = window.scrollY + window.innerHeight * 0.35;
    let currentId = "";

    sections.forEach((section) => {
      if (section.offsetTop <= pos) currentId = section.id;
    });

    navLinks.forEach((link) => {
      link.classList.toggle("active", link.getAttribute("href") === `#${currentId}`);
    });
  };
  window.addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();

  /* ---------- Scroll reveal ---------- */
  const revealables = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach((el) => observer.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("visible"));
  }
})();
