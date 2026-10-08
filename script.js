// Куди надсилати анкету. Залиш порожнім — заявка лише покаже подяку (демо-режим).
// Наприклад: адреса Google Apps Script, Formspree, Make/Zapier webhook або твого бекенда.
const FORM_ENDPOINT = "";

document.getElementById("year").textContent = new Date().getFullYear();

// Відео: вставляє iframe лише після кліку
const play = document.querySelector(".video__play");
play.addEventListener("click", () => {
  const src = play.dataset.src;
  if (!src) {
    play.querySelector(".video__label").textContent = "Відео скоро з’явиться";
    return;
  }
  const iframe = document.createElement("iframe");
  iframe.src = src + (src.includes("?") ? "&" : "?") + "autoplay=1";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.title = "Відеоурок: Пайка дронів з нуля";
  play.replaceWith(iframe);
});

// Анкета
const form = document.getElementById("lead-form");
const msg = form.querySelector(".form__msg");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.className = "form__msg";
  let ok = true;
  form.querySelectorAll("[required]").forEach((el) => {
    const bad = el.type === "checkbox" ? !el.checked : !el.value.trim();
    if (el.name === "phone" && el.value.replace(/\D/g, "").length < 10) ok = false, el.classList.add("invalid");
    else el.classList.toggle("invalid", bad);
    if (bad) ok = false;
  });
  if (!ok) {
    msg.textContent = "Заповни ім’я, коректний телефон і постав згоду.";
    msg.classList.add("err");
    return;
  }

  const data = Object.fromEntries(new FormData(form));
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    if (FORM_ENDPOINT) {
      const res = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(res.status);
    }
    form.reset();
    msg.textContent = "Дякую! Анкету отримано — наша команда зв’яжеться з тобою.";
    msg.classList.add("ok");
  } catch {
    msg.textContent = "Не вдалося надіслати. Спробуй ще раз трохи пізніше.";
    msg.classList.add("err");
  } finally {
    btn.disabled = false;
  }
});

form.addEventListener("input", (e) => e.target.classList.remove("invalid"));

// Плавна поява блоків при прокрутці
const io = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 })
  : null;
document.querySelectorAll(".card, .row, .banner, .timeline li").forEach((el) => {
  if (!io) return;
  el.classList.add("reveal");
  io.observe(el);
});
