// Адреса веб-застосунку Google Apps Script (закінчується на /exec), який пише заявки в таблицю.
// Як отримати — див. README.md. Поки порожньо, форма працює в демо-режимі (лише показує подяку).
const FORM_ENDPOINT = "https://script.google.com/macros/s/AKfycbyfq8v9Sb-Yi3S5a6eX1oM0KJY59ai_xK1jj44JWex57pMexmaHNeoWy5MLAQQapas/exec";

// UTM-мітки та ідентифікатори кліків: зберігаємо при вході, щоб не загубились
// після переходів чи перезавантаження, і передаємо разом з анкетою.
const TRACK_KEYS = [
  "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "utm_id",
  "fbclid", "gclid", "ttclid",
];
const TRACK_STORE = "lead_tracking";

function loadTracking() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(TRACK_STORE)) || {}; } catch {}
  const qs = new URLSearchParams(location.search);
  const fresh = {};
  TRACK_KEYS.forEach((k) => { const v = qs.get(k); if (v) fresh[k] = v; });
  // Нові мітки з URL повністю замінюють старі (атрибуція за останнім переходом)
  if (Object.keys(fresh).length) {
    saved = { ...fresh, landing: location.href, referrer: document.referrer || "" };
    try { localStorage.setItem(TRACK_STORE, JSON.stringify(saved)); } catch {}
  }
  if (!saved.referrer && document.referrer) saved.referrer = document.referrer;
  return saved;
}
const tracking = loadTracking();

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

  const data = new URLSearchParams(new FormData(form));
  data.delete("agree");
  data.set("page", location.href);
  TRACK_KEYS.forEach((k) => data.set(k, tracking[k] || ""));
  data.set("landing", tracking.landing || location.href);
  data.set("referrer", tracking.referrer || "");
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true;
  try {
    if (FORM_ENDPOINT) {
      // Apps Script не віддає CORS-заголовки, тому шлемо простий form-запит у режимі no-cors
      await fetch(FORM_ENDPOINT, { method: "POST", mode: "no-cors", body: data });
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
