(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Плёнки из реальных работ ---------- */
  var films = [
    { name: "розовый глянец", car: "Toyota Harrier", img: "assets/images/harrier-pink.jpg", w: 1024, h: 1024,
      c: "linear-gradient(160deg,#ff3d97,#d4136f 55%,#9e0b52)", film: "#d4136f", l: "#b10f5c", d: "#ff4f9d", on: "#ffffff", t: "#ffffff", gloss: 1,
      alt: "Toyota Harrier в розовой глянцевой плёнке в боксе студии" },
    { name: "хамелеон", car: "Mercedes A-класс", img: "assets/images/a-class-front.jpg", w: 1050, h: 1400,
      c: "linear-gradient(160deg,#c42fd0,#7a1d78 50%,#3e0f4a)", film: "#8a2391", l: "#7a1d80", d: "#d777e6", on: "#ffffff", t: "#ffffff", gloss: 1,
      alt: "Mercedes A-класс в плёнке хамелеон" },
    { name: "изумрудный глянец", car: "Mercedes C-класс", img: "assets/images/c-class-emerald.jpg", w: 853, h: 1280,
      c: "linear-gradient(160deg,#21b371,#0b7a4c 55%,#05452b)", film: "#0b7a4c", l: "#086a41", d: "#3fd18f", on: "#ffffff", t: "#ffffff", gloss: 1,
      alt: "Mercedes C-класс в изумрудной глянцевой плёнке" },
    { name: "песочный глянец", car: "Honda Shuttle", img: "assets/images/shuttle-sand.jpg", w: 853, h: 1280,
      c: "linear-gradient(160deg,#ecd4b8,#d2b08c 55%,#a8825c)", film: "#c9a179", l: "#7f5a35", d: "#e2c19c", on: "#2b2016", t: "#3a2a1b", gloss: 1,
      alt: "Honda Shuttle в песочной плёнке" },
    { name: "матовый графит", car: "Lada Granta", img: "assets/images/granta-matte.jpg", w: 960, h: 1280,
      c: "#33373a", film: "#33373a", l: "#2c3033", d: "#b9c0c4", on: "#ffffff", t: "#e4e6e6", gloss: 0.12,
      alt: "Lada Granta в матовой графитовой плёнке" }
  ];

  var fan = document.getElementById("fan");
  var strips = fan ? fan.querySelectorAll(".fan__strip") : [];
  var shotA = document.getElementById("shotA");
  var shotB = document.getElementById("shotB");
  var sheen = document.querySelector(".shot__sheen");
  var capCar = document.getElementById("capCar");
  var capFilm = document.getElementById("capFilm");
  var current = 0;
  var front = shotA, back = shotB;

  strips.forEach(function (s, i) {
    s.style.setProperty("--c", films[i].c);
    s.style.setProperty("--t", films[i].t);
    s.style.setProperty("--gloss", films[i].gloss);
    s.setAttribute("aria-label", films[i].name + ", " + films[i].car);
  });

  function paint(f) {
    root.style.setProperty("--film", f.film);
    root.style.setProperty("--film-text-l", f.l);
    root.style.setProperty("--film-text-d", f.d);
    root.style.setProperty("--on-film", f.on);
  }

  function setFilm(i) {
    if (i === current) return;
    var f = films[i];
    current = i;
    paint(f);
    strips.forEach(function (s, k) { s.setAttribute("aria-pressed", k === i ? "true" : "false"); });

    // плавная смена фото: грузим в задний слой, затем меняем слои
    var next = back;
    next.onload = null;
    var swap = function () {
      next.alt = f.alt;
      next.removeAttribute("aria-hidden");
      front.setAttribute("aria-hidden", "true");
      front.alt = "";
      next.classList.add("is-on");
      front.classList.remove("is-on");
      back = front; front = next;
    };
    if (next.getAttribute("src") === f.img && next.complete) { swap(); }
    else { next.onload = swap; next.src = f.img; }
    next.width = f.w; next.height = f.h;

    capCar.textContent = f.car;
    capFilm.textContent = f.name;

    if (!reduce && sheen) {
      sheen.classList.remove("is-run");
      void sheen.offsetWidth;
      sheen.classList.add("is-run");
    }
  }

  strips.forEach(function (s, i) {
    s.addEventListener("click", function () { setFilm(i); });
  });
  if (fan) {
    fan.addEventListener("keydown", function (e) {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      var n = (current + (e.key === "ArrowRight" ? 1 : -1) + films.length) % films.length;
      setFilm(n);
      strips[n].focus();
    });
  }

  // единственный «загрузочный» момент: веер раскрывается и по фото проходит блик
  paint(films[0]);
  requestAnimationFrame(function () {
    setTimeout(function () {
      if (fan) fan.classList.add("is-open");
      if (!reduce && sheen) sheen.classList.add("is-run");
    }, reduce ? 0 : 350);
  });

  // заранее подгружаем остальные фото
  window.addEventListener("load", function () {
    films.slice(1).forEach(function (f) { var im = new Image(); im.src = f.img; });
  });

  /* ---------- Мат / глянец ---------- */
  var finish = document.querySelector(".finish");
  var finishImg = document.getElementById("finishImg");
  var sw = document.querySelector(".switch");
  var opts = sw ? sw.querySelectorAll(".switch__opt") : [];
  var priceNum = document.getElementById("priceNum");
  var priceNote = document.getElementById("priceNote");
  var finishes = {
    gloss: { price: 110000, img: "assets/images/a-class-hood.jpg", w: 1050, h: 1400,
      alt: "Капот Mercedes A-класса в глянцевой плёнке хамелеон",
      note: "Глянец отражает свет как свежий лак, оттенок играет на изгибах кузова." },
    matte: { price: 90000, img: "assets/images/granta-matte.jpg", w: 960, h: 1280,
      alt: "Lada Granta в матовой графитовой плёнке",
      note: "Мат гасит блики и подчёркивает форму кузова. Пример матовой плёнки на Lada Granta." }
  };
  var shownPrice = 110000;

  function fmt(n) { return Math.round(n).toLocaleString("ru-RU").replace(/ | /g, " "); }

  function countTo(target) {
    if (reduce) { priceNum.textContent = fmt(target); shownPrice = target; return; }
    var from = shownPrice, t0 = null, dur = 650;
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      priceNum.textContent = fmt(from + (target - from) * e);
      if (p < 1) requestAnimationFrame(step); else shownPrice = target;
    }
    requestAnimationFrame(step);
  }

  function setFinish(key) {
    var f = finishes[key];
    opts.forEach(function (o) { o.setAttribute("aria-checked", o.dataset.finish === key ? "true" : "false"); });
    sw.classList.toggle("is-matte", key === "matte");
    finish.classList.toggle("is-matte", key === "matte");
    priceNote.textContent = f.note;
    countTo(f.price);
    finishImg.classList.add("is-fading");
    setTimeout(function () {
      finishImg.onload = function () { finishImg.classList.remove("is-fading"); };
      finishImg.src = f.img; finishImg.alt = f.alt; finishImg.width = f.w; finishImg.height = f.h;
      if (finishImg.complete) finishImg.classList.remove("is-fading");
    }, reduce ? 0 : 260);
  }
  opts.forEach(function (o) {
    o.addEventListener("click", function () { setFinish(o.dataset.finish); });
  });
  if (sw) {
    sw.addEventListener("keydown", function (e) {
      if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown"].indexOf(e.key) < 0) return;
      e.preventDefault();
      var key = sw.classList.contains("is-matte") ? "gloss" : "matte";
      setFinish(key);
      sw.querySelector('[data-finish="' + key + '"]').focus();
    });
  }
  // блик на глянце ходит за курсором
  var pic = document.querySelector(".finish__pic");
  if (pic && !reduce) {
    pic.addEventListener("pointermove", function (e) {
      var r = pic.getBoundingClientRect();
      pic.style.setProperty("--gx", ((e.clientX - r.left) / r.width * 100).toFixed(1) + "%");
      pic.style.setProperty("--gy", ((e.clientY - r.top) / r.height * 100).toFixed(1) + "%");
    });
  }

  /* ---------- Шапка и меню ---------- */
  var top = document.getElementById("top");
  function onScroll() { top.classList.toggle("is-solid", window.scrollY > 24); }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("burger");
  var nav = document.getElementById("nav");
  function closeNav() { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Открыть меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });
  nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });

  /* ---------- Просмотр фото ---------- */
  var lb = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbClose = document.getElementById("lbClose");
  var lastFocus = null;
  document.querySelectorAll("[data-full]").forEach(function (b) {
    b.addEventListener("click", function () {
      var im = b.querySelector("img");
      lastFocus = b;
      lbImg.src = b.dataset.full;
      lbImg.alt = im ? im.alt : "";
      lb.hidden = false;
      document.body.style.overflow = "hidden";
      lbClose.focus();
    });
  });
  function closeLb() {
    lb.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus) lastFocus.focus();
  }
  lbClose.addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { if (!lb.hidden) closeLb(); closeNav(); }
  });

  /* ---------- Копировать адрес ---------- */
  var copyBtn = document.getElementById("copyAddr");
  var copyOk = document.getElementById("copyOk");
  var addr = "Хабаровск, ул. Лучистая, 101";
  copyBtn.addEventListener("click", function () {
    function fallback() {
      var r = document.createRange();
      r.selectNodeContents(document.getElementById("addrText"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      copyOk.textContent = "Адрес выделен, нажмите Ctrl+C, чтобы скопировать.";
    }
    try {
      navigator.clipboard.writeText(addr).then(function () {
        copyOk.textContent = "Адрес скопирован.";
      }, fallback);
    } catch (e) { fallback(); }
  });

  /* ---------- Cookie ---------- */
  var cookie = document.getElementById("cookie");
  var seen = false;
  try { seen = localStorage.getItem("fresh-cookie") === "1"; } catch (e) {}
  if (!seen) setTimeout(function () { cookie.hidden = false; }, 1600);
  document.getElementById("cookieOk").addEventListener("click", function () {
    cookie.hidden = true;
    try { localStorage.setItem("fresh-cookie", "1"); } catch (e) {}
  });
})();
