const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

const research = document.querySelector("#research");
if (research) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    research.classList.add("is-visible");
  } else {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        research.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.32 }
    );
    observer.observe(research);
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const publications = document.querySelectorAll(".publication");

if (!reduceMotion && "IntersectionObserver" in window) {
  const publicationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        publicationObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -4%" }
  );

  publications.forEach((publication) => {
    publication.classList.add("reveal-ready");
    publicationObserver.observe(publication);
  });
}

if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".paper-demo").forEach((demo) => {
    demo.addEventListener("pointermove", (event) => {
      const bounds = demo.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      demo.style.setProperty("--pointer-x", `${x * 100}%`);
      demo.style.setProperty("--pointer-y", `${y * 100}%`);
      demo.style.setProperty("--tilt-x", `${(x - 0.5) * 3.2}deg`);
      demo.style.setProperty("--tilt-y", `${(0.5 - y) * 3.2}deg`);
    });

    demo.addEventListener("pointerleave", () => {
      demo.style.removeProperty("--pointer-x");
      demo.style.removeProperty("--pointer-y");
      demo.style.removeProperty("--tilt-x");
      demo.style.removeProperty("--tilt-y");
    });
  });
}
