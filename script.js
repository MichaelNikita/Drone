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

// Відео: YouTube без його інтерфейсу — власні кнопки, без назви, субтитрів,
// «Інші відео» та кінцевих підказок. Плеєр вантажиться лише після кліку.
const video = document.getElementById("video");
const cover = video.querySelector(".video__play");
const bar = video.querySelector(".video__bar");
const fill = video.querySelector(".video__fill");
const track = video.querySelector(".video__track");
const timeEl = video.querySelector(".video__time");
let player = null;
let tick = null;

const fmt = (t) => {
  t = Math.max(0, Math.floor(t || 0));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = String(t % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};
const hideCaptions = () => {
  try { player.unloadModule("captions"); player.unloadModule("cc"); } catch {}
};
const update = () => {
  if (!player || !player.getDuration) return;
  const d = player.getDuration() || 0, c = player.getCurrentTime() || 0;
  fill.style.width = d ? (c / d) * 100 + "%" : "0";
  timeEl.textContent = `${fmt(c)} / ${fmt(d)}`;
};

function onState(e) {
  const S = YT.PlayerState;
  video.classList.toggle("is-playing", e.data === S.PLAYING || e.data === S.BUFFERING);
  if (e.data === S.PLAYING) {
    hideCaptions();
    video.classList.add("is-started");
    cover.hidden = true;
    clearInterval(tick); tick = setInterval(update, 250);
  } else {
    clearInterval(tick); update();
  }
  // На паузі й наприкінці ховаємо екран YouTube з рекомендаціями своєю обкладинкою
  if (e.data === S.PAUSED || e.data === S.ENDED) {
    cover.hidden = false;
    cover.querySelector(".video__label").textContent = e.data === S.ENDED ? "Переглянути ще раз" : "Продовжити перегляд";
  }
}

function createPlayer() {
  player = new YT.Player("yt-player", {
    host: "https://www.youtube-nocookie.com",
    videoId: video.dataset.yt,
    playerVars: {
      autoplay: 1, controls: 0, rel: 0, modestbranding: 1, iv_load_policy: 3,
      cc_load_policy: 0, disablekb: 1, fs: 0, playsinline: 1, showinfo: 0,
      origin: location.origin,
    },
    events: {
      onReady: (e) => { hideCaptions(); e.target.playVideo(); bar.hidden = false; update(); },
      onStateChange: onState,
      onApiChange: hideCaptions,
    },
  });
}

const togglePlay = () => {
  if (!player || !player.getPlayerState) return;
  const st = player.getPlayerState();
  st === YT.PlayerState.PLAYING || st === YT.PlayerState.BUFFERING ? player.pauseVideo() : player.playVideo();
};

cover.addEventListener("click", () => {
  if (player) { player.playVideo(); return; }
  cover.querySelector(".video__label").textContent = "Завантаження…";
  if (window.YT && YT.Player) return createPlayer();
  window.onYouTubeIframeAPIReady = createPlayer;
  const tag = document.createElement("script");
  tag.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(tag);
});
video.querySelector(".video__shield").addEventListener("click", togglePlay);

bar.addEventListener("click", (e) => {
  const act = e.target.closest("[data-act]")?.dataset.act;
  if (act === "toggle") togglePlay();
  if (act === "mute") {
    player.isMuted() ? player.unMute() : player.mute();
    video.classList.toggle("is-muted", !player.isMuted());
  }
  if (act === "fs") {
    if (document.fullscreenElement) document.exitFullscreen();
    else (video.requestFullscreen || video.webkitRequestFullscreen)?.call(video);
  }
});
const seek = (clientX) => {
  const r = track.getBoundingClientRect();
  const k = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  player.seekTo(k * player.getDuration(), true); update();
};
track.addEventListener("click", (e) => seek(e.clientX));
track.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") player.seekTo(player.getCurrentTime() + 10, true);
  if (e.key === "ArrowLeft") player.seekTo(player.getCurrentTime() - 10, true);
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
    // Подія «Lead» для Meta Pixel — для оптимізації реклами на заявки
    if (window.fbq) fbq("track", "Lead");
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
