(function () {
  "use strict";

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;

  /* ================= ПОЛИРОВКА В ПЕРВОМ ЭКРАНЕ ================= */
  var polish = document.getElementById("polish");
  var pImg = document.getElementById("polishImg");
  var canvas = document.getElementById("polishCanvas");
  var bar = document.getElementById("polishBar");
  var val = document.getElementById("polishVal");
  var done = document.getElementById("polishDone");
  var bursts = document.getElementById("bursts");
  var ctx = canvas.getContext("2d");
  var COLS = 24, ROWS = 30, cells = [], cleaned = 0, finished = false, touched = false;
  var W = 0, H = 0, dpr = 1, last = null, lastBurst = 0;
  var rect = [0, 0, 1, 1], eligible = [], total = 1;

  // силуэт машины: только по нему лежит пыль и считается блеск
  var carMask = new Image();
  carMask.src = "assets/images/harrier-car-mask.png";
  var GRID_N = 64, GRID_HEX = "00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000ffc0000000001fffffe0000000007ffffff000000000fffffff800000003fffffffc00000007fffffffc0000003ffffffffe0000003ffffffffe000000ffffffffff000007ffffffffff00003fffffffffff0000ffffffffffff8001ffffffffffff0007ffffffffffff000fffffffffffff800fffffffffffff800fffffffffffff803fffffffffffffc07fffffffffffffc0ffffffffffffffc0ffffffffffffff80ffffffffffffff81ffffffffffffe781ffffffffffffe301ffffffffffffe000ffffffffffffe0007fffffffffffe000fffffffffffff000fffffffffffff000fffffffffffff001fffffffffffff001fffffffffffff000fffffffffffff000fffffffffffff0003ffffffffffff0000fffffffffffe00001ffffffffffe000003ffffffc3fe0000007ffffc03fc00000007ff8001f800000000000000f80000000000000000000000000000000000000000000000000000000000000000000000000000000000";
  var carGrid = [];
  for (var gi = 0; gi < GRID_HEX.length; gi++) {
    var nib = parseInt(GRID_HEX[gi], 16);
    carGrid.push(!!(nib & 8), !!(nib & 4), !!(nib & 2), !!(nib & 1));
  }
  function onCar(x, y) {
    var ix = Math.floor((x - rect[0]) / rect[2] * GRID_N), iy = Math.floor((y - rect[1]) / rect[3] * GRID_N);
    if (ix < 0 || iy < 0 || ix >= GRID_N || iy >= GRID_N) return false;
    return carGrid[iy * GRID_N + ix];
  }

  function coverRect(iw, ih, w, h) {
    var s = Math.max(w / iw, h / ih);
    var dw = iw * s, dh = ih * s;
    return [(w - dw) / 2, (h - dh) / 2, dw, dh];
  }

  function rand(seed) { // повторяемая «пыль» для одного размера
    return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  }

  function paintDust() {
    var r = polish.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    var c = coverRect(pImg.naturalWidth || 1024, pImg.naturalHeight || 1024, W, H);
    rect = c;
    ctx.drawImage(pImg, c[0], c[1], c[2], c[3]);
    // тусклый, выгоревший кузов
    ctx.globalCompositeOperation = "saturation";
    ctx.globalAlpha = 0.82; ctx.fillStyle = "#808080"; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 0.42; ctx.fillStyle = "#1c211c"; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 0.16; ctx.fillStyle = "#c9cfc4"; ctx.fillRect(0, 0, W, H);
    // пыль и разводы
    var rnd = rand(42);
    ctx.globalAlpha = 1;
    for (var i = 0; i < 900; i++) {
      ctx.fillStyle = "rgba(210,214,205," + (0.08 + rnd() * 0.22).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, rnd() * 1.6 + 0.3, 0, 6.283); ctx.fill();
    }
    ctx.lineWidth = 1;
    for (var j = 0; j < 46; j++) {
      ctx.strokeStyle = "rgba(220,224,215," + (0.08 + rnd() * 0.12).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(rnd() * W, rnd() * H, 4 + rnd() * 16, 0, 6.283); ctx.stroke();
    }
    // разводы-«паутинка» от плохой мойки
    for (var k = 0; k < 60; k++) {
      var cx = rnd() * W, cy = rnd() * H, rr = 20 + rnd() * 60;
      ctx.strokeStyle = "rgba(230,232,225,0.07)";
      ctx.beginPath(); ctx.arc(cx, cy, rr, rnd() * 6, rnd() * 6 + 1.2); ctx.stroke();
    }
    // оставляем пыль только на машине
    if (carMask.complete && carMask.naturalWidth) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.globalAlpha = 1;
      ctx.drawImage(carMask, c[0], c[1], c[2], c[3]);
      ctx.globalCompositeOperation = "source-over";
    }
    cells = new Array(COLS * ROWS).fill(false); cleaned = 0;
    eligible = []; total = 0;
    for (var a = 0; a < ROWS; a++) for (var b = 0; b < COLS; b++) {
      var ok = onCar((b + 0.5) * W / COLS, (a + 0.5) * H / ROWS);
      eligible.push(ok); if (ok) total++;
    }
    total = Math.max(total, 1);
    updateMeter();
  }

  function brushR() { return Math.max(28, W * 0.085); }

  function stamp(x, y) {
    var r = brushR();
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.6, "rgba(0,0,0,.85)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    // отметить клетки
    var cw = W / COLS, ch = H / ROWS, rc = r * 0.7;
    var c0 = Math.max(0, Math.floor((x - rc) / cw)), c1 = Math.min(COLS - 1, Math.floor((x + rc) / cw));
    var r0 = Math.max(0, Math.floor((y - rc) / ch)), r1 = Math.min(ROWS - 1, Math.floor((y + rc) / ch));
    for (var a = r0; a <= r1; a++) for (var b = c0; b <= c1; b++) {
      var dx = (b + 0.5) * cw - x, dy = (a + 0.5) * ch - y;
      var idx = a * COLS + b;
      if (dx * dx + dy * dy <= rc * rc && eligible[idx] && !cells[idx]) { cells[idx] = true; cleaned++; }
    }
  }

  function erase(from, to) {
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = 1;
    var dx = to.x - from.x, dy = to.y - from.y, dist = Math.sqrt(dx * dx + dy * dy);
    var step = brushR() / 3, n = Math.max(1, Math.ceil(dist / step));
    for (var i = 1; i <= n; i++) stamp(from.x + dx * i / n, from.y + dy * i / n);
    ctx.globalCompositeOperation = "source-over";
    updateMeter();
  }

  function pct() { return Math.round(cleaned / total * 100); }

  function updateMeter() {
    var p = finished ? 100 : Math.min(99, Math.round(pct() / 0.7));
    bar.style.width = p + "%";
    val.textContent = p + "%";
    if (!finished && pct() >= 70) finish();
  }

  function burstAt(x, y) {
    if (reduce) return;
    var s = document.createElement("span");
    s.className = "burst";
    s.style.left = x + "px"; s.style.top = y + "px";
    var sz = 10 + Math.random() * 14;
    s.style.width = s.style.height = sz + "px";
    bursts.appendChild(s);
    setTimeout(function () { s.remove(); }, 1000);
  }

  function finish() {
    finished = true;
    updateMeter();
    canvas.style.transition = "opacity .8s ease";
    canvas.style.opacity = "0";
    polish.classList.add("is-done", "is-touched");
    done.hidden = false;
    for (var i = 0; i < 9; i++) (function (i) {
      setTimeout(function () {
        for (var t = 0; t < 20; t++) {
          var bx = W * (0.08 + Math.random() * 0.84), by = H * (0.25 + Math.random() * 0.7);
          if (onCar(bx, by)) { burstAt(bx, by); break; }
        }
      }, i * 90);
    })(i);
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function onMove(e) {
    if (finished) return;
    if (e.pointerType === "touch" && e.buttons === 0 && e.type !== "pointerdown") return;
    var p = pos(e);
    if (!touched) { touched = true; polish.classList.add("is-touched"); }
    erase(last || p, p);
    last = p;
    var now = Date.now();
    if (now - lastBurst > 140 && onCar(p.x, p.y)) { lastBurst = now; burstAt(p.x, p.y); }
  }

  if (canvas && ctx) {
    var start = function () {
      paintDust();
      canvas.addEventListener("pointerdown", function (e) { last = pos(e); onMove(e); });
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerleave", function () { last = null; });
      canvas.addEventListener("pointerup", function () { last = null; });
      var rt;
      window.addEventListener("resize", function () {
        clearTimeout(rt);
        rt = setTimeout(function () { if (!finished && Math.abs(polish.getBoundingClientRect().width - W) > 2) paintDust(); }, 200);
      });
      // одна демонстрационная полоса, чтобы было понятно, что делать
      if (!reduce) setTimeout(demo, 1100);
    };
    var waiting = 2, started = false;
    var ready = function () { if (--waiting <= 0 && !started) { started = true; start(); } };
    if (pImg.complete && pImg.naturalWidth) ready(); else pImg.addEventListener("load", ready, { once: true });
    if (carMask.complete && carMask.naturalWidth) ready(); else { carMask.onload = ready; carMask.onerror = ready; }
  }

  function demo() {
    if (touched || finished) return;
    var t0 = null, dur = 1100, prev = null;
    function f(ts) {
      if (touched || finished) return;
      if (!t0) t0 = ts;
      var t = Math.min((ts - t0) / dur, 1);
      var e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      var p = { x: W * (0.12 + 0.76 * e), y: H * (0.62 - 0.22 * Math.sin(e * Math.PI)) };
      erase(prev || p, p); prev = p;
      if (t < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  /* ================= СМЕНА ЦВЕТА ================= */
  var films = [
    { car: "Mercedes A-класс", film: "хамелеон, глянец", img: "assets/images/a-class-side.jpg", w: 1050, h: 1400, glow: "#a12bb0", alt: "Mercedes A-класс в плёнке хамелеон" },
    { car: "Toyota Harrier", film: "розовый, глянец", img: "assets/images/harrier-pink.jpg", w: 1024, h: 1024, glow: "#e0167a", alt: "Toyota Harrier в розовой глянцевой плёнке" },
    { car: "Mercedes C-класс", film: "изумрудный, глянец", img: "assets/images/c-class-emerald.jpg", w: 853, h: 1280, glow: "#0fa862", alt: "Mercedes C-класс в изумрудной плёнке" },
    { car: "Honda Shuttle", film: "песочный, глянец", img: "assets/images/shuttle-sand.jpg", w: 853, h: 1280, glow: "#c9a179", alt: "Honda Shuttle в песочной плёнке" },
    { car: "Lexus GS", film: "чёрный, мат", img: "assets/images/lexus-gs-matte.jpg", w: 853, h: 1280, glow: "#4dfc12", alt: "Lexus GS в матовой чёрной плёнке" }
  ];
  var chips = document.querySelectorAll(".chip");
  var cfgA = document.getElementById("cfgA"), cfgB = document.getElementById("cfgB");
  var front = cfgA, back = cfgB, cur = 0;

  function setFilm(i) {
    if (i === cur) return;
    cur = i;
    var f = films[i];
    root.style.setProperty("--film", f.glow);
    chips.forEach(function (c, k) { c.setAttribute("aria-checked", k === i ? "true" : "false"); });
    document.getElementById("cfgCar").textContent = f.car;
    document.getElementById("cfgFilm").textContent = f.film;
    var next = back;
    var swap = function () {
      next.alt = f.alt; next.removeAttribute("aria-hidden");
      front.alt = ""; front.setAttribute("aria-hidden", "true");
      next.classList.add("is-on"); front.classList.remove("is-on");
      back = front; front = next;
    };
    next.onload = null;
    next.loading = "eager";
    next.width = f.w; next.height = f.h;
    if (next.getAttribute("src") === f.img && next.complete) swap();
    else { next.onload = swap; next.src = f.img; }
  }
  chips.forEach(function (c, i) { c.addEventListener("click", function () { setFilm(i); }); });
  var chipBox = document.getElementById("chips");
  chipBox.addEventListener("keydown", function (e) {
    var d = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    var n = (cur + d + films.length) % films.length;
    setFilm(n); chips[n].focus();
  });

  // счётчики цены при появлении
  function fmt(n) { return Math.round(n).toLocaleString("ru-RU").replace(/ | /g, " "); }
  var counters = document.querySelectorAll("[data-count]");
  if ("IntersectionObserver" in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var el = en.target, to = +el.dataset.count, t0 = null;
        (function step(ts) {
          if (!t0) t0 = ts;
          var p = Math.min((ts - t0) / 1100, 1), e2 = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(to * e2);
          if (p < 1) requestAnimationFrame(step);
        })(performance.now());
      });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { io.observe(c); });
  }

  /* ================= ПОДБОР ЗА 3 КЛИКА ================= */
  var form = document.getElementById("quizForm");
  var steps = form.querySelectorAll(".q");
  var dots = document.querySelectorAll(".quiz__dots li");
  var backBtn = document.getElementById("quizBack");
  var msg = document.getElementById("quizMsg");
  var step = 0;

  function show(n) {
    step = n;
    steps.forEach(function (s, i) { s.classList.toggle("is-on", i === n); });
    dots.forEach(function (d, i) { d.classList.toggle("is-on", i <= n); });
    backBtn.hidden = n === 0 || n === 3;
  }
  function val2(name) { var el = form.querySelector('input[name="' + name + '"]:checked'); return el ? el.value : ""; }
  function compose() {
    msg.value = "Здравствуйте! Хочу записаться в Fresh Studio.\n" +
      "Что нужно: " + val2("goal") + ".\nМашина: " + val2("car") + ".\nКогда: " + val2("when") + ".\nФото машины прикладываю.";
  }
  form.addEventListener("change", function (e) {
    if (e.target.type !== "radio") return;
    var at = step;
    setTimeout(function () {
      if (at !== step) return;
      if (step < 2) show(step + 1);
      else { compose(); show(3); }
    }, reduce ? 0 : 260);
  });
  backBtn.addEventListener("click", function () { if (step > 0) show(step - 1); });
  document.getElementById("quizRestart").addEventListener("click", function () {
    form.reset(); document.getElementById("quizOk").textContent = ""; show(0);
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); });
  document.getElementById("quizSend").addEventListener("click", function () {
    var ok = document.getElementById("quizOk");
    try {
      navigator.clipboard.writeText(msg.value).then(function () {
        ok.textContent = "Текст скопирован. Вставьте его в чат и приложите фото.";
      }, function () { msg.select(); ok.textContent = "Текст выделен: скопируйте его и вставьте в чат."; });
    } catch (err) { msg.select(); ok.textContent = "Текст выделен: скопируйте его и вставьте в чат."; }
  });

  /* ================= ЛЕНТА РАБОТ ================= */
  var reel = document.getElementById("reel");
  function by(d) {
    var item = reel.querySelector(".shot");
    var w = item ? item.getBoundingClientRect().width + 18 : 340;
    reel.scrollBy({ left: d * w, behavior: reduce ? "auto" : "smooth" });
  }
  document.getElementById("wPrev").addEventListener("click", function () { by(-1); });
  document.getElementById("wNext").addEventListener("click", function () { by(1); });
  var drag = null, moved = false;
  reel.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX, s: reel.scrollLeft }; moved = false;
  });
  window.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (Math.abs(dx) > 5) { moved = true; reel.classList.add("is-drag"); }
    reel.scrollLeft = drag.s - dx;
  });
  window.addEventListener("pointerup", function () {
    if (!drag) return;
    drag = null;
    setTimeout(function () { reel.classList.remove("is-drag"); }, 30);
  });
  reel.addEventListener("click", function (e) { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } }, true);

  /* ================= ПРОСМОТР ФОТО ================= */
  var lb = document.getElementById("lightbox"), lbImg = document.getElementById("lbImg"), lbClose = document.getElementById("lbClose"), lastFocus = null;
  document.querySelectorAll("[data-full]").forEach(function (b) {
    b.addEventListener("click", function () {
      var im = b.querySelector("img");
      lastFocus = b; lbImg.src = b.dataset.full; lbImg.alt = im ? im.alt : "";
      lb.hidden = false; document.body.style.overflow = "hidden"; lbClose.focus();
    });
  });
  function closeLb() { lb.hidden = true; document.body.style.overflow = ""; if (lastFocus) lastFocus.focus(); }
  lbClose.addEventListener("click", closeLb);
  lb.addEventListener("click", function (e) { if (e.target === lb) closeLb(); });

  /* ================= ШАПКА, МЕНЮ, КНОПКА TELEGRAM ================= */
  var top = document.getElementById("top");
  var fab = document.querySelector(".fab");
  var hero = document.getElementById("hero");
  function onScroll() {
    var y = window.scrollY;
    top.classList.toggle("is-solid", y > 24);
    fab.classList.toggle("is-on", y > hero.offsetHeight * 0.8);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  var burger = document.getElementById("burger"), nav = document.getElementById("nav");
  function closeNav() { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); burger.setAttribute("aria-label", "Открыть меню"); }
  burger.addEventListener("click", function () {
    var open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    burger.setAttribute("aria-expanded", open ? "true" : "false");
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
  });
  nav.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", closeNav); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") { if (!lb.hidden) closeLb(); closeNav(); } });

  /* свечение за курсором */
  var glow = document.querySelector(".cursor-glow");
  if (finePointer && !reduce && glow) {
    var gx = 0, gy = 0, tx = 0, ty = 0, raf = 0;
    window.addEventListener("pointermove", function (e) {
      tx = e.clientX; ty = e.clientY;
      root.classList.add("has-pointer");
      if (!raf) raf = requestAnimationFrame(function loop() {
        gx += (tx - gx) * 0.15; gy += (ty - gy) * 0.15;
        glow.style.transform = "translate(" + gx + "px," + gy + "px)";
        raf = Math.abs(tx - gx) + Math.abs(ty - gy) > 0.5 ? requestAnimationFrame(loop) : 0;
      });
    }, { passive: true });
  }

  /* ================= АДРЕС И COOKIE ================= */
  var copyOk = document.getElementById("copyOk");
  document.getElementById("copyAddr").addEventListener("click", function () {
    function fallback() {
      var r = document.createRange(); r.selectNodeContents(document.getElementById("addrText"));
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      copyOk.textContent = "Адрес выделен, скопируйте его.";
    }
    try { navigator.clipboard.writeText("Хабаровск, ул. Лучистая, 101").then(function () { copyOk.textContent = "Адрес скопирован."; }, fallback); }
    catch (e) { fallback(); }
  });

  var cookie = document.getElementById("cookie"), seen = false;
  try { seen = localStorage.getItem("fresh-cookie") === "1"; } catch (e) {}
  if (!seen) setTimeout(function () { cookie.hidden = false; }, 2200);
  document.getElementById("cookieOk").addEventListener("click", function () {
    cookie.hidden = true;
    try { localStorage.setItem("fresh-cookie", "1"); } catch (e) {}
  });
})();
