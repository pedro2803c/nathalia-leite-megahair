/* Viva Leve — reveal on scroll + draggable carousels (vanilla JS) */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- Reveal system ---------------- */

  // Attach reveal types to section-level elements that don't declare one in the markup.
  var autoReveal = [
    [".content-card", "fade-up"],
    [".feedback-card", "soft-scale"],
    [".faq__item", "fade-up"]
  ];
  autoReveal.forEach(function (pair) {
    document.querySelectorAll(pair[0]).forEach(function (el, i) {
      if (el.closest("[data-reveal]")) return; // parent already animates
      el.setAttribute("data-reveal", pair[1]);
      el.style.transitionDelay = Math.min(i * 70, 280) + "ms";
    });
  });

  var revealEls = Array.prototype.slice.call(document.querySelectorAll("[data-reveal]"));

  function show(el) { el.classList.add("is-visible"); }

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(show);
  } else {
    // Hero is visible immediately after setup.
    var hero = document.querySelector(".hero__section");
    var heroEls = revealEls.filter(function (el) { return hero && hero.contains(el); });
    heroEls.forEach(function (el, i) { el.style.transitionDelay = i * 110 + "ms"; });
    // Short timeout (not rAF) so the hero still appears in background tabs.
    // When the cinematic intro is playing, the hero waits for the curtain to open.
    var heroDelay = document.documentElement.classList.contains("intro-pending") ? 2500 : 40;
    setTimeout(function () { heroEls.forEach(show); }, heroDelay);

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          show(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });

    revealEls.forEach(function (el) {
      if (heroEls.indexOf(el) === -1) observer.observe(el);
    });
  }

  /* ---------------- Draggable carousels ---------------- */

  function initCarousel(root) {
    var track = root.querySelector(".carousel__track");
    var sideBtn = root.querySelector("[data-carousel-btn]");
    var name = root.getAttribute("data-carousel");
    var headBtn = document.querySelector('[data-carousel-next="' + name + '"]');
    var mode = root.getAttribute("data-mode"); // "toggle" | "forward"
    if (!track) return;

    // Drag to scroll
    var isDown = false;
    var startX = 0;
    var startScroll = 0;
    var moved = 0;

    track.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "touch") return; // native touch scrolling is smoother
      if (e.button !== 0) return;
      isDown = true;
      moved = 0;
      startX = e.clientX;
      startScroll = track.scrollLeft;
      track.classList.add("is-dragging");
      try { track.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    });

    track.addEventListener("pointermove", function (e) {
      if (!isDown) return;
      var dx = e.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      track.scrollLeft = startScroll - dx;
    });

    function endDrag() {
      if (!isDown) return;
      isDown = false;
      track.classList.remove("is-dragging");
    }

    track.addEventListener("pointerup", endDrag);
    track.addEventListener("pointercancel", endDrag);
    track.addEventListener("lostpointercapture", endDrag);

    // Prevent click-through after a drag
    track.addEventListener("click", function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    track.addEventListener("dragstart", function (e) { e.preventDefault(); });

    // Step = first card width + gap
    function step() {
      var card = track.firstElementChild;
      if (!card) return 300;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return card.getBoundingClientRect().width + gap;
    }

    function atEnd() { return track.scrollLeft + track.clientWidth >= track.scrollWidth - 4; }
    function atStart() { return track.scrollLeft <= 4; }

    var goingBack = false;

    function update() {
      var end = atEnd();
      root.classList.toggle("is-end", end);

      if (mode === "toggle") {
        if (end) goingBack = true;
        else if (atStart()) goingBack = false;
        root.classList.toggle("is-back", goingBack);
        if (headBtn) headBtn.classList.toggle("is-back", goingBack);
        var label = goingBack ? "Voltar conteúdos" : "Avançar conteúdos";
        if (sideBtn) sideBtn.setAttribute("aria-label", label);
        if (headBtn) headBtn.setAttribute("aria-label", label);
      } else if (sideBtn) {
        sideBtn.disabled = end;
      }
    }

    function advance() {
      var dir = mode === "toggle" && goingBack ? -1 : 1;
      track.scrollBy({ left: dir * step(), behavior: reduceMotion ? "auto" : "smooth" });
    }

    if (sideBtn) sideBtn.addEventListener("click", advance);
    if (headBtn) headBtn.addEventListener("click", advance);

    var ticking = false;
    track.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { update(); ticking = false; });
    }, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  document.querySelectorAll("[data-carousel]").forEach(initCarousel);
})();

/* ==========================================================================
   Luxo: cursor dourado, rastro de brilho, aurora animada e spotlight nos cards
   ========================================================================== */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------- Aurora: moving gold light layers behind each section ---------- */
  var auroraTargets = [
    [".hero__section", "aurora--dark"],
    [".reasons", "aurora--dark"],
    [".contents", "aurora--dark"],
    [".pricing", "aurora--dark"],
    [".offer", "aurora--dark"],
    [".author", "aurora--dark"],
    [".studio", "aurora--dark"],
    [".faces", "aurora--dark"],
    [".roi", "aurora--light"],
    [".about-ebook", "aurora--light"],
    [".bonus", "aurora--light"],
    [".feedbacks", "aurora--light"],
    [".guarantee", "aurora--light"],
    [".faq", "aurora--light"]
  ];
  auroraTargets.forEach(function (pair) {
    var section = document.querySelector(pair[0]);
    if (!section) return;
    var layer = document.createElement("span");
    layer.className = "aurora " + pair[1];
    layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = "<i></i><i></i><i></i>";
    section.classList.add("has-aurora");
    section.insertBefore(layer, section.firstChild);
  });

  /* ---------- Card spotlight: gold light follows the mouse inside cards ---------- */
  if (finePointer) {
    var cards = document.querySelectorAll(".reason-card, .content-card, .price-card, .feedback-card, .offer__card, .pain-list li, .faq__item");
    cards.forEach(function (card) {
      card.classList.add("spotlight");
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        card.style.setProperty("--mx", (e.clientX - r.left) + "px");
        card.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* ---------- Gold arrow cursor with "Você" tag (multiplayer style) ---------- */
  if (!finePointer || reduce) return;

  var cursor = document.createElement("div");
  cursor.className = "gold-cursor";
  cursor.setAttribute("aria-hidden", "true");
  cursor.innerHTML =
    '<svg class="gold-cursor__arrow" viewBox="0 0 28 32" width="28" height="32">' +
      '<defs>' +
        '<linearGradient id="goldArrow" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#fff3c4"/>' +
          '<stop offset="0.45" stop-color="#e9c46f"/>' +
          '<stop offset="1" stop-color="#9a7128"/>' +
        '</linearGradient>' +
      '</defs>' +
      '<path d="M3 2.5 L3 26 L9.6 19.8 L14.2 29.5 L18.6 27.4 L14.1 17.9 L23.5 17.6 Z" ' +
        'fill="url(#goldArrow)" stroke="#1a1408" stroke-width="1.6" stroke-linejoin="round"/>' +
      '<path d="M5.2 7 L5.2 20.5 L9 17" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="1.1" stroke-linecap="round"/>' +
    '</svg>' +
    '<span class="gold-cursor__tag"><span class="gold-cursor__dot"></span><span class="gold-cursor__text">Você está aqui</span></span>';

  var glow = document.createElement("div");
  glow.className = "cursor-glow";
  glow.setAttribute("aria-hidden", "true");
  document.body.appendChild(glow);
  document.body.appendChild(cursor);
  document.documentElement.classList.add("has-gold-cursor");

  var tagText = cursor.querySelector(".gold-cursor__text");
  var defaultLabel = "Você";
  var currentLabel = "Você está aqui";
  function setLabel(text) {
    if (text === currentLabel) return;
    currentLabel = text;
    tagText.textContent = text;
  }

  var mx = innerWidth / 2, my = innerHeight / 2;
  var gx = mx, gy = my;
  var visible = false;
  var greeted = false;
  var lastSpark = 0, lastSx = 0, lastSy = 0, sparks = 0;

  function spawnSpark(x, y) {
    if (sparks > 30) return;
    var s = document.createElement("span");
    s.className = "cursor-spark";
    var size = 2 + Math.random() * 4;
    s.style.left = x + "px";
    s.style.top = y + "px";
    s.style.width = s.style.height = size + "px";
    s.style.setProperty("--dx", (Math.random() * 30 - 15) + "px");
    s.style.setProperty("--dy", (Math.random() * 24 + 8) + "px");
    s.style.setProperty("--rot", (Math.random() * 180) + "deg");
    document.body.appendChild(s);
    sparks++;
    s.addEventListener("animationend", function () { s.remove(); sparks--; });
  }

  var lastTarget = null;
  var hoverLabel = null;
  function updateHover(t) {
    if (t === lastTarget) return;
    lastTarget = t;
    var drag = t.closest && t.closest(".carousel__track");
    var link = t.closest && t.closest("a, button, summary, .studio__item");
    cursor.classList.toggle("is-hover", !!link);
    hoverLabel = drag && !link ? "Arraste" : null;
    if (greeted) setLabel(hoverLabel || defaultLabel);
  }

  window.addEventListener("pointermove", function (e) {
    if (e.pointerType !== "mouse") return;
    mx = e.clientX; my = e.clientY;
    updateHover(e.target);
    if (!visible) {
      visible = true;
      gx = mx; gy = my;
      document.documentElement.classList.add("cursor-visible");
      if (!greeted) {
        // First arrival: "Você está aqui", then it settles into "Você"
        setTimeout(function () {
          greeted = true;
          setLabel(hoverLabel || defaultLabel);
        }, 3200);
      }
    }
    var now = performance.now();
    var dist = Math.hypot(mx - lastSx, my - lastSy);
    if (now - lastSpark > 40 && dist > 16) {
      spawnSpark(mx + 2, my + 2);
      lastSpark = now; lastSx = mx; lastSy = my;
    }
  }, { passive: true });

  document.addEventListener("pointerover", function (e) { updateHover(e.target); });

  document.addEventListener("mouseleave", function () {
    visible = false;
    document.documentElement.classList.remove("cursor-visible");
  });

  window.addEventListener("pointerdown", function () { cursor.classList.add("is-down"); });
  window.addEventListener("pointerup", function () { cursor.classList.remove("is-down"); });

  (function loop() {
    gx += (mx - gx) * 0.08; gy += (my - gy) * 0.08;
    cursor.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    glow.style.transform = "translate3d(" + gx + "px," + gy + "px,0)";
    requestAnimationFrame(loop);
  })();
})();
