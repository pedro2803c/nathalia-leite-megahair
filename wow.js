/* Nathália Leite — Método Invisible Light — high-ticket experiences:
   1. Cinematic intro   2. Living gold strands in the hero
   3. Mega hair tape simulator   4. ROI calculator */
(function () {
  "use strict";

  var html = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ======================================================================
     1. Cinematic intro with the logo (every visit; click skips)
     ====================================================================== */
  (function intro() {
    if (!html.classList.contains("intro-pending")) return;
    var el = document.querySelector(".intro");
    var opened = false;

    function open() {
      if (opened) return;
      opened = true;
      html.classList.add("intro-open");
      setTimeout(function () {
        html.classList.remove("intro-pending", "intro-open");
        if (el) el.remove();
      }, 1150);
    }

    // A abertura espera o clique em "Entrar": esse clique libera o som da música no navegador
    if (el) el.addEventListener("click", open);
    window.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " " || e.key === "Escape") open(); });
    var enter = el && el.querySelector(".intro__enter");
    if (enter) setTimeout(function () { try { enter.focus({ preventScroll: true }); } catch (e) {} }, 1700);
  })();

  /* ======================================================================
     2. Gold dust particles (canvas) that drift up and avoid the mouse
     ====================================================================== */
  (function strands() {
    var hero = document.querySelector(".hero__section");
    var canvas = document.querySelector(".hero__strands");
    if (!hero || !canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var w = 0, h = 0, dpr = 1;
    var lines = [];
    var mouse = { x: -9999, y: -9999, strength: 0, target: 0 };
    var running = false;
    var t0 = performance.now();

    function rand(a, b) { return a + Math.random() * (b - a); }

    // Poeira dourada: pontinhos que sobem devagar, bokeh desfocado e brilhos em estrela.
    var sprite = null;
    function makeSprite() {
      var s = document.createElement("canvas");
      s.width = s.height = 64;
      var c = s.getContext("2d");
      var g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, "rgba(255,248,224,1)");
      g.addColorStop(0.18, "rgba(255,226,160,0.85)");
      g.addColorStop(0.45, "rgba(226,182,96,0.28)");
      g.addColorStop(1, "rgba(214,168,76,0)");
      c.fillStyle = g;
      c.fillRect(0, 0, 64, 64);
      sprite = s;
    }

    function spawn(p, anywhere) {
      var kind = Math.random();
      p.type = kind < 0.12 ? "bokeh" : kind < 0.2 ? "star" : "dust";
      p.x = rand(0, w);
      p.y = anywhere ? rand(0, h) : h + rand(10, 60);
      p.r = p.type === "bokeh" ? rand(14, 34) : p.type === "star" ? rand(5, 9) : rand(1.6, 4.2);
      p.vy = p.type === "bokeh" ? rand(0.05, 0.14) : rand(0.12, 0.42);
      p.drift = rand(0.2, 0.9);
      p.phase = rand(0, Math.PI * 2);
      p.tw = rand(0.0008, 0.0024);
      p.alpha = p.type === "bokeh" ? rand(0.08, 0.2) : rand(0.35, 0.95);
      p.ox = 0; p.oy = 0;
      return p;
    }

    function build() {
      if (!sprite) makeSprite();
      var count = Math.round(Math.min(150, Math.max(55, (w * h) / 9000)));
      lines = [];
      for (var i = 0; i < count; i++) lines.push(spawn({}, true));
    }

    function drawStar(x, y, r, a) {
      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = a;
      ctx.fillStyle = "rgba(255,244,214,1)";
      ctx.beginPath();
      ctx.moveTo(0, -r * 2.2);
      ctx.quadraticCurveTo(0, 0, r * 2.2, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 2.2);
      ctx.quadraticCurveTo(0, 0, -r * 2.2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 2.2);
      ctx.fill();
      ctx.drawImage(sprite, -r * 2, -r * 2, r * 4, r * 4);
      ctx.restore();
    }

    var last = 0;
    var sparks = [];
    function addSpark(x, y, speed, star) {
      if (sparks.length > 160) sparks.shift();
      var ang = Math.random() * Math.PI * 2, v = Math.random() * speed;
      sparks.push({ x: x, y: y, vx: Math.cos(ang) * v, vy: Math.sin(ang) * v - 0.3, r: star ? rand(4, 7) : rand(1.5, 3.5), life: 1, star: star });
    }
    function burst(x, y) {
      for (var i = 0; i < 26; i++) addSpark(x, y, 5.5, i % 6 === 0);
      for (var n = 0; n < lines.length; n++) {
        var p = lines[n];
        var dx = p.x + p.ox - x, dy = p.y + p.oy - y, d = Math.sqrt(dx * dx + dy * dy) || 1;
        if (d < 320) { var f = (1 - d / 320) * 16; p.vox = (p.vox || 0) + (dx / d) * f; p.voy = (p.voy || 0) + (dy / d) * f; }
      }
    }
    function draw(now) {
      var t = now - t0;
      var dt = last ? Math.min(now - last, 50) / 16.7 : 1;
      last = now;
      mouse.strength += (mouse.target - mouse.strength) * 0.06;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (var i = 0; i < lines.length; i++) {
        var p = lines[i];
        if (!reduce) {
          p.y -= p.vy * dt;
          p.x += Math.sin(t * 0.0004 + p.phase) * p.drift * 0.25 * dt;
        }
        // O mouse funciona como um ímã: puxa as partículas e faz elas girarem em volta
        p.vox = p.vox || 0; p.voy = p.voy || 0;
        if (mouse.strength > 0.01) {
          var dx = mouse.x - (p.x + p.ox), dy = mouse.y - (p.y + p.oy);
          var d2 = dx * dx + dy * dy, R = 260;
          if (d2 < R * R) {
            var d = Math.sqrt(d2) || 1;
            var k = (1 - d / R) * mouse.strength;
            var pull = d > 34 ? 0.55 : -0.4;            // não deixa grudar no cursor
            p.vox += ((dx / d) * pull + (-dy / d) * 0.65) * k * dt;
            p.voy += ((dy / d) * pull + (dx / d) * 0.65) * k * dt;
          }
        }
        p.vox -= p.ox * 0.0045 * dt; p.voy -= p.oy * 0.0045 * dt;   // volta devagar ao lugar
        p.vox *= 0.92; p.voy *= 0.92;
        p.ox += p.vox * dt; p.oy += p.voy * dt;
        if (p.y < -60) spawn(p, false);
        if (p.x < -40) p.x = w + 30; else if (p.x > w + 40) p.x = -30;

        var x = p.x + p.ox, y = p.y + p.oy;
        var twinkle = 0.55 + 0.45 * Math.sin(t * p.tw + p.phase);
        // mais suave no topo e na base para não brigar com o texto
        var fade = Math.min(1, y / (h * 0.12), (h - y) / (h * 0.12) + 0.4);
        var a = Math.max(0, p.alpha * twinkle * fade);
        if (a <= 0.005) continue;

        if (p.type === "star") {
          drawStar(x, y, p.r * (0.7 + 0.3 * twinkle), a);
        } else {
          ctx.globalAlpha = a;
          var s = p.type === "bokeh" ? p.r * 2 : p.r * 4;
          ctx.drawImage(sprite, x - s / 2, y - s / 2, s, s);
        }
      }
      // rastro de brilhos do mouse
      for (var j = sparks.length - 1; j >= 0; j--) {
        var sp = sparks[j];
        sp.life -= 0.022 * dt;
        if (sp.life <= 0) { sparks.splice(j, 1); continue; }
        sp.x += sp.vx * dt; sp.y += sp.vy * dt;
        sp.vx *= 0.96; sp.vy = sp.vy * 0.96 - 0.02 * dt;
        if (sp.star) drawStar(sp.x, sp.y, sp.r * sp.life, sp.life);
        else {
          ctx.globalAlpha = sp.life;
          var ss = sp.r * 4 * (0.5 + sp.life * 0.5);
          ctx.drawImage(sprite, sp.x - ss / 2, sp.y - ss / 2, ss, ss);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      if (running && !reduce) requestAnimationFrame(draw);
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = hero.clientWidth;
      h = hero.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    }

    function start() {
      if (running) return;
      running = true;
      requestAnimationFrame(draw);
    }

    hero.addEventListener("pointermove", function (e) {
      var r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
      mouse.target = 1;
      if (!reduce && Math.random() < 0.7) addSpark(mouse.x, mouse.y, 1.2, Math.random() < 0.12);
    });
    hero.addEventListener("pointerleave", function () { mouse.target = 0; });
    // clique ou toque: explosão de brilho que espalha as partículas
    hero.addEventListener("pointerdown", function (e) {
      if (reduce || e.target.closest("a, button")) return;
      var r = canvas.getBoundingClientRect();
      burst(e.clientX - r.left, e.clientY - r.top);
    });

    resize();
    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { resize(); if (reduce) draw(performance.now()); }, 150);
    });

    if (reduce) { draw(performance.now()); return; }

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) start(); else running = false;
      }).observe(hero);
    } else {
      start();
    }
  })();

  /* ======================================================================
     3. Mega hair tape simulator
     ====================================================================== */
  (function faces() {
    var section = document.querySelector(".faces");
    if (!section) return;
    var svgNS = "http://www.w3.org/2000/svg";
    var outline = section.querySelector(".face-outline");
    var lightLayer = section.querySelector(".face-light");
    var tabs = Array.prototype.slice.call(section.querySelectorAll(".faces__tab"));
    var goal = section.querySelector(".faces__goal");
    var name = section.querySelector(".faces__name");
    var text = section.querySelector(".faces__text");
    var points = section.querySelector(".faces__points");

    // Silhueta do resultado final (cabelo natural + mega hair), sempre com a
    // mesma estrutura de comandos para o contorno poder se transformar suavemente.
    function facePath(p) {
      var R = function (v) { return 200 + v; }, L = function (v) { return 200 - v; };
      var t = p.t, hw = p.hw, mw = p.mw, mid = p.mid, bw = p.bw, len = p.len, e = p.e;
      return [
        "M200 " + t,
        "C" + R(hw * 0.7) + " " + t + " " + R(hw) + " " + (t + 58) + " " + R(hw) + " 176",
        "C" + R(hw) + " 226 " + R(mw) + " " + (mid - 44) + " " + R(mw) + " " + mid,
        "C" + R(mw) + " " + (mid + (len - mid) * 0.5) + " " + R(bw) + " " + (len - 24) + " " + R(bw * 0.82) + " " + len,
        "C" + R(bw * 0.4) + " " + (len + e) + " " + L(bw * 0.4) + " " + (len + e) + " " + L(bw * 0.82) + " " + len,
        "C" + L(bw) + " " + (len - 24) + " " + L(mw) + " " + (mid + (len - mid) * 0.5) + " " + L(mw) + " " + mid,
        "C" + L(mw) + " " + (mid - 44) + " " + L(hw) + " 226 " + L(hw) + " 176",
        "C" + L(hw) + " " + (t + 58) + " " + L(hw * 0.7) + " " + t + " 200 " + t,
        "Z"
      ].join(" ");
    }

    // Cada fileira de fita vira dois traços que saem do centro para as laterais.
    function tapes(rows) {
      var out = [];
      rows.forEach(function (r) {
        var y = r[0], hw = r[1], s = r[2];
        out.push("M194 " + (y + s) + " Q" + (200 - hw * 0.55) + " " + (y + s * 0.9) + " " + (200 - hw) + " " + y);
        out.push("M206 " + (y + s) + " Q" + (200 + hw * 0.55) + " " + (y + s * 0.9) + " " + (200 + hw) + " " + y);
      });
      return out;
    }

    var SHAPES = {
      volume: {
        name: "Mais volume",
        goal: "Densidade sem pesar",
        text: "Para quem tem pouco volume. As fitas são distribuídas em fileiras intercaladas na parte de trás, criando densidade uniforme e sem marcar.",
        points: ["Fileiras intercaladas da nuca ao topo", "Distância segura da raiz para não marcar", "Cor mesclada com o seu cabelo natural"],
        face: { t: 44, hw: 142, mw: 152, mid: 280, bw: 146, len: 368, e: 14 },
        light: tapes([[176, 84, 10], [214, 100, 12], [252, 106, 12], [290, 102, 10]])
      },
      comprimento: {
        name: "Mais comprimento",
        goal: "Alongar com naturalidade",
        text: "Para quem sonha com cabelo longo de verdade. As fitas ficam nas regiões média e inferior, com corte de mescla para a transição não aparecer.",
        points: ["Fileiras na nuca e na região média", "Corte de mescla entre o seu cabelo e o mega hair", "Finalização com movimento natural"],
        face: { t: 46, hw: 134, mw: 134, mid: 300, bw: 122, len: 456, e: 18 },
        light: tapes([[236, 102, 10], [272, 104, 10], [306, 98, 8]])
      },
      finos: {
        name: "Fios finos",
        goal: "Segurança para fios delicados",
        text: "Fios finos pedem menos peso em cada fita e mais espaço entre as fileiras, para o resultado ficar leve e preservar a saúde do seu cabelo.",
        points: ["Fitas mais leves e espaçadas", "Mechas de apoio finas e bem divididas", "Retornos de manutenção mais próximos"],
        face: { t: 46, hw: 136, mw: 138, mid: 286, bw: 128, len: 396, e: 12 },
        light: tapes([[200, 94, 10], [268, 104, 10]])
      },
      cacheado: {
        name: "Cabelo cacheado",
        goal: "Respeitar a curvatura",
        text: "Mega hair em cabelo cacheado é possível. O segredo está em escolher o cabelo humano na mesma curvatura do seu e posicionar as fitas para o cacho cair natural.",
        points: ["Cabelo humano na mesma curvatura", "Fileiras pensadas para o volume do cacho", "Finalização que valoriza a definição"],
        face: { t: 38, hw: 156, mw: 172, mid: 292, bw: 166, len: 404, e: 24 },
        light: tapes([[188, 92, 12], [234, 106, 12], [280, 104, 12]])
      },
      manutencao: {
        name: "Manutenção",
        goal: "Resultado sempre invisível",
        text: "Com o crescimento natural, as fitas descem. Na manutenção, elas são removidas com cuidado e reaplicadas com fita nova perto da raiz, mantendo o resultado invisível.",
        points: ["Remoção sem agredir os seus fios", "Reaplicação com fita nova", "Próximo retorno já agendado"],
        face: { t: 46, hw: 136, mw: 136, mid: 292, bw: 126, len: 424, e: 16 },
        light: tapes([[170, 82, 10], [210, 98, 12], [250, 104, 12]])
      }
    };

    var current = null;

    function render(key, instant) {
      var s = SHAPES[key];
      if (!s || key === current) return;
      current = key;

      var d = facePath(s.face);
      outline.setAttribute("d", d);
      outline.style.d = 'path("' + d + '")'; // morphs where the browser supports it

      // Light strands draw themselves in, one after another
      lightLayer.innerHTML = "";
      s.light.forEach(function (pd, i) {
        var p = document.createElementNS(svgNS, "path");
        p.setAttribute("d", pd);
        p.setAttribute("pathLength", "1");
        p.setAttribute("class", "light-strand");
        p.style.animationDelay = (instant ? 0 : 0.15 + i * 0.18) + "s";
        lightLayer.appendChild(p);

        var core = p.cloneNode();
        core.setAttribute("class", "light-strand light-strand--core");
        lightLayer.appendChild(core);

        var end = p.getPointAtLength(p.getTotalLength());
        var spark = document.createElementNS(svgNS, "circle");
        spark.setAttribute("cx", end.x.toFixed(1));
        spark.setAttribute("cy", end.y.toFixed(1));
        spark.setAttribute("r", "4");
        spark.setAttribute("class", "light-spark");
        spark.style.animationDelay = (instant ? 0 : 0.6 + i * 0.18) + "s";
        lightLayer.appendChild(spark);
      });

      // Copy
      var info = section.querySelector(".faces__info");
      info.classList.remove("is-swapping");
      void info.offsetWidth;
      info.classList.add("is-swapping");
      goal.textContent = s.goal;
      name.textContent = s.name;
      text.textContent = s.text;
      points.innerHTML = s.points.map(function (pt) { return "<li>" + pt + "</li>"; }).join("");

      tabs.forEach(function (tab) {
        var on = tab.getAttribute("data-shape") === key;
        tab.classList.toggle("is-active", on);
        tab.setAttribute("aria-selected", on ? "true" : "false");
      });
    }

    // Autoplay through the shapes until the visitor picks one
    var order = tabs.map(function (t) { return t.getAttribute("data-shape"); });
    var autoTimer = null;
    var userPicked = false;
    var AUTO_MS = 5200;

    function next() {
      var i = order.indexOf(current);
      render(order[(i + 1) % order.length]);
      restartProgress();
    }
    function restartProgress() {
      section.classList.remove("is-auto");
      void section.offsetWidth;
      if (!userPicked && !reduce) section.classList.add("is-auto");
    }
    function startAuto() {
      if (userPicked || reduce || autoTimer) return;
      restartProgress();
      autoTimer = setInterval(next, AUTO_MS);
    }
    function stopAuto() {
      clearInterval(autoTimer);
      autoTimer = null;
      section.classList.remove("is-auto");
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () {
        userPicked = true;
        stopAuto();
        render(tab.getAttribute("data-shape"));
      });
      tab.addEventListener("keydown", function (e) {
        var dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!dir) return;
        e.preventDefault();
        var nextTab = tabs[(i + dir + tabs.length) % tabs.length];
        nextTab.focus();
        nextTab.click();
      });
    });

    render("volume", true);

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) startAuto(); else stopAuto();
      }, { threshold: 0.35 }).observe(section);
    }
  })();

  /* ======================================================================
     4. ROI calculator
     ====================================================================== */
  (function roi() {
    var section = document.querySelector(".roi");
    if (!section) return;
    var invest = parseFloat(section.getAttribute("data-investment")) || 2000;
    var price = document.getElementById("roiPrice");
    var clients = document.getElementById("roiClients");
    var priceOut = document.getElementById("roiPriceOut");
    var clientsOut = document.getElementById("roiClientsOut");
    var payback = document.getElementById("roiPayback");
    var paybackUnit = document.getElementById("roiPaybackUnit");
    var monthEl = document.getElementById("roiMonth");
    var yearEl = document.getElementById("roiYear");
    var monthsEl = document.getElementById("roiMonths");
    var monthNote = document.getElementById("roiMonthNote");
    var investEl = document.getElementById("roiInvest");

    var brl = function (v) { return "R$ " + Math.round(v).toLocaleString("pt-BR"); };
    investEl.textContent = brl(invest);

    // Twelve month bars
    var bars = [];
    for (var m = 1; m <= 12; m++) {
      var bar = document.createElement("span");
      bar.className = "roi__bar";
      bar.innerHTML = "<i></i><small>" + m + "</small>";
      monthsEl.appendChild(bar);
      bars.push(bar);
    }

    // Smoothly count numbers up/down
    var tweens = new WeakMap();
    function animateNumber(el, to, fmt) {
      var from = tweens.get(el) || 0;
      if (reduce) { el.textContent = fmt(to); tweens.set(el, to); return; }
      var start = performance.now(), dur = 450;
      (function step(now) {
        var k = Math.min(1, (now - start) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        var v = from + (to - from) * e;
        el.textContent = fmt(v);
        tweens.set(el, v);
        if (k < 1) requestAnimationFrame(step);
      })(start);
    }

    function fill(range) {
      var p = (range.value - range.min) / (range.max - range.min) * 100;
      range.style.setProperty("--p", p + "%");
    }

    function update() {
      var pv = +price.value, cv = +clients.value;
      fill(price); fill(clients);
      priceOut.textContent = brl(pv);
      clientsOut.textContent = cv + (cv === 1 ? " cliente" : " clientes");

      var monthly = pv * cv;
      var sessions = Math.ceil(invest / pv);
      var monthBack = Math.ceil(invest / monthly);

      animateNumber(payback, sessions, function (v) { return Math.round(v); });
      paybackUnit.textContent = sessions === 1 ? "aplicação" : "aplicações";
      animateNumber(monthEl, monthly, brl);
      animateNumber(yearEl, monthly * 12, brl);

      var max = monthly * 12;
      bars.forEach(function (bar, i) {
        var cum = monthly * (i + 1);
        bar.style.setProperty("--h", Math.max(6, cum / max * 100) + "%");
        bar.classList.toggle("is-paid", cum >= invest);
        bar.classList.toggle("is-payback", i + 1 === monthBack);
      });

      monthNote.textContent = monthBack <= 1
        ? "Investimento recuperado já no 1º mês"
        : monthBack <= 12
          ? "Investimento recuperado no " + monthBack + "º mês"
          : "Ajuste os valores para ver o retorno no primeiro ano";
    }

    price.addEventListener("input", update);
    clients.addEventListener("input", update);
    update();
  })();
})();

/* Vídeo: toca mudo quando aparece na tela; botão liga o som do início */
(function () {
  "use strict";
  var video = document.querySelector(".reel__video");
  var btn = document.querySelector(".reel__sound");
  if (!video || !btn) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var visible = false;

  function play() { var p = video.play(); if (p && p.catch) p.catch(function () {}); }

  function setSound(on) {
    video.muted = !on;
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "Desligar o som" : "Ouvir a Nathália");
  }

  btn.addEventListener("click", function () {
    if (video.muted) { setSound(true); video.currentTime = 0; play(); }
    else setSound(false);
  });

  video.addEventListener("click", function () {
    if (video.paused) play(); else video.pause();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible && !reduce) play();
      else if (!visible) video.pause();
    }, { threshold: 0.4 }).observe(video);
  }
})();

/* Card da Nathália: story com várias fotos (troca automática, toque para avançar/voltar) */
(function () {
  var card = document.querySelector(".author-card");
  if (!card) return;
  var slides = card.querySelectorAll(".author-card__slide");
  var bars = card.querySelectorAll(".author-card__progress span");
  if (slides.length < 2) return;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var current = 0, timer = null, visible = false;

  function show(i) {
    current = (i + slides.length) % slides.length;
    slides.forEach(function (s, n) { s.classList.toggle("is-active", n === current); });
    bars.forEach(function (b, n) {
      b.classList.remove("is-active");
      b.classList.toggle("is-done", n < current);
    });
    var bar = bars[current];
    if (bar) { void bar.offsetWidth; bar.classList.add("is-active"); }
    if (reduce) { clearTimeout(timer); timer = setTimeout(function () { if (visible) show(current + 1); }, 6000); }
  }

  bars.forEach(function (b) {
    b.addEventListener("animationend", function () { if (b.classList.contains("is-active")) show(current + 1); });
  });
  card.querySelector(".author-card__nav--prev").addEventListener("click", function () { show(current - 1); });
  card.querySelector(".author-card__nav--next").addEventListener("click", function () { show(current + 1); });

  function pause(on) { card.classList.toggle("is-paused", on); }
  if (window.matchMedia("(hover: hover)").matches) {
    card.addEventListener("mouseenter", function () { pause(true); });
    card.addEventListener("mouseleave", function () { pause(!visible); });
  }

  new IntersectionObserver(function (entries) {
    visible = entries[0].isIntersecting;
    pause(!visible);
  }, { threshold: 0.35 }).observe(card);

  pause(true);
  show(0);
})();

/* Música de fundo: tenta tocar ao abrir a LP; se o navegador bloquear,
   começa no primeiro toque/clique/tecla. O botão dourado liga e desliga. */
(function () {
  "use strict";
  var box = document.querySelector(".music");
  if (!box) return;
  var audio = box.querySelector(".music__audio");
  var btn = box.querySelector(".music__btn");
  var TARGET = 0.4;
  var userOff = false;
  try { userOff = sessionStorage.getItem("nl-music-off") === "1"; } catch (e) {}
  var fadeTimer = null;
  var pausedForVideo = false;

  function setState(playing) {
    box.setAttribute("data-state", playing ? "playing" : "paused");
    btn.setAttribute("aria-pressed", playing ? "true" : "false");
    btn.setAttribute("aria-label", playing ? "Pausar música" : "Tocar música");
  }

  function fadeTo(v, done) {
    clearInterval(fadeTimer);
    fadeTimer = setInterval(function () {
      var d = v - audio.volume;
      if (Math.abs(d) < 0.03) { audio.volume = v; clearInterval(fadeTimer); if (done) done(); return; }
      audio.volume = Math.max(0, Math.min(1, audio.volume + d * 0.18));
    }, 50);
  }

  function play() {
    audio.volume = 0;
    var p = audio.play();
    if (p && p.then) {
      return p.then(function () { setState(true); fadeTo(TARGET); return true; })
              .catch(function () { setState(false); return false; });
    }
    setState(true); fadeTo(TARGET);
    return Promise.resolve(true);
  }

  function pause() { setState(false); fadeTo(0, function () { audio.pause(); }); }

  btn.addEventListener("click", function () {
    if (audio.paused || box.getAttribute("data-state") === "paused") {
      userOff = false;
      try { sessionStorage.removeItem("nl-music-off"); } catch (e) {}
      play();
    } else {
      userOff = true;
      try { sessionStorage.setItem("nl-music-off", "1"); } catch (e) {}
      pause();
    }
  });

  // Primeira interação libera o áudio quando o autoplay foi bloqueado
  var events = ["pointerdown", "pointerup", "click", "keydown", "touchend"];
  function unlock(e) {
    if (e && e.target && e.target.closest && e.target.closest(".music__btn")) return cleanup();
    if (!userOff && audio.paused) play();
    cleanup();
  }
  function cleanup() { events.forEach(function (ev) { window.removeEventListener(ev, unlock, true); }); }

  // Só busca o áudio depois que a página carregou, para não atrasar o que aparece primeiro
  if (!userOff) events.forEach(function (ev) { window.addEventListener(ev, unlock, true); });
  function autostart() {
    if (userOff || !audio.paused) return;
    play().then(function (ok) { if (ok) cleanup(); });
  }
  if (document.readyState === "complete") autostart();
  else window.addEventListener("load", autostart, { once: true });

  // Quando o vídeo da Nathália toca com som, a música pausa e volta depois
  var video = document.querySelector(".reel__video");
  if (video) {
    function check() {
      var talking = !video.muted && !video.paused;
      if (talking && !audio.paused) { pausedForVideo = true; pause(); }
      else if (!talking && pausedForVideo && !userOff) { pausedForVideo = false; play(); }
    }
    ["volumechange", "play", "pause", "ended"].forEach(function (ev) { video.addEventListener(ev, check); });
  }
})();

/* Carrega fotos de fundo só quando chegam perto da tela */
(function () {
  "use strict";
  var els = document.querySelectorAll(".content-card__image, .author-card__slide, .reason-card__photo");
  function show(el) { el.classList.add("bg-in"); }
  if (!("IntersectionObserver" in window)) { els.forEach(show); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      // no story e no carrossel, carrega o grupo inteiro de uma vez
      var group = e.target.closest(".author-card, .carousel__track") || e.target;
      group.querySelectorAll(".content-card__image, .author-card__slide, .reason-card__photo").forEach(function (x) { show(x); io.unobserve(x); });
      show(e.target); io.unobserve(e.target);
    });
  }, { rootMargin: "600px 0px" });
  els.forEach(function (el) { io.observe(el); });
})();
