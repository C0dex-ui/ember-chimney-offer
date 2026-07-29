/**
 * Ember Chimney — Offer Landing Page scripts
 * - Auto limited-time offer end date (+7 days, rolls daily): 7/20 → 7/27, next day → 7/28
 * - Sticky header state
 * - Smooth in-page # anchors
 * - Form placeholder only (no webhook / no thank-you redirect yet — client wires later)
 */
(function () {
  "use strict";

  function formatOfferDate(date) {
    return date.getMonth() + 1 + "/" + date.getDate();
  }

  /** Always 7 days out from today. */
  function setOfferEndDates() {
    var end = new Date();
    end.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() + 7);
    var label = formatOfferDate(end);
    document.querySelectorAll("[data-offer-end]").forEach(function (el) {
      el.textContent = label;
    });
  }

  function bindHeaderScroll() {
    var header = document.querySelector("[data-header]");
    if (!header) return;
    var ticking = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
      ticking = false;
    }
    window.addEventListener(
      "scroll",
      function () {
        if (!ticking) {
          window.requestAnimationFrame(update);
          ticking = true;
        }
      },
      { passive: true }
    );
    update();
  }

  function bindSmoothAnchors() {
    document.addEventListener("click", function (e) {
      var link = e.target.closest('a[href^="#"]');
      if (!link) return;
      var id = link.getAttribute("href");
      if (!id || id === "#") return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      try {
        target.focus({ preventScroll: true });
      } catch (err) {}
      if (history.pushState) history.pushState(null, "", id);
    });
  }

  /** Placeholder forms — prevent submit; client wires webhook + thank-you later. */
  function bindForms() {
    document.querySelectorAll("form[data-lp-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var status = form.querySelector(".form-status");
        if (status) {
          status.classList.add("show", "is-ok");
          status.classList.remove("is-error");
          status.textContent =
            "Thanks! Call (844) 803-0373 for the fastest booking. (Form not connected yet.)";
        }
      });
    });
  }

  function setYear() {
    var y = String(new Date().getFullYear());
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = y;
    });
  }

  /** Expand/collapse review text (Google-style "Read more") */
  function bindReviewMore() {
    document.querySelectorAll("[data-review-more]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var card = btn.closest(".g-review-card");
        if (!card) return;
        var open = card.classList.toggle("is-open");
        btn.textContent = open ? "Read less" : "Read more";
      });
    });
  }

  /** Horizontal reviews slider (10 cards) */
  function bindReviewsSlider() {
    document.querySelectorAll("[data-reviews-slider]").forEach(function (root) {
      var track = root.querySelector("[data-slider-track]");
      var prev = root.querySelector("[data-slider-prev]");
      var next = root.querySelector("[data-slider-next]");
      var dotsHost = root.querySelector("[data-slider-dots]");
      if (!track) return;

      var cards = track.querySelectorAll(".g-review-card");
      if (!cards.length) return;

      function cardStep() {
        var card = cards[0];
        var styles = window.getComputedStyle(track);
        var gap = parseFloat(styles.columnGap || styles.gap || "16") || 16;
        return card.getBoundingClientRect().width + gap;
      }

      function maxScroll() {
        return Math.max(0, track.scrollWidth - track.clientWidth - 2);
      }

      function pageCount() {
        var step = cardStep();
        if (step <= 0) return 1;
        return Math.max(1, Math.ceil((maxScroll() + step) / step));
      }

      function currentPage() {
        var step = cardStep();
        if (step <= 0) return 0;
        return Math.round(track.scrollLeft / step);
      }

      function updateChrome() {
        var max = maxScroll();
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= max - 2;
        if (dotsHost) {
          var page = currentPage();
          dotsHost.querySelectorAll("button").forEach(function (dot, i) {
            dot.classList.toggle("is-active", i === page);
          });
        }
      }

      function buildDots() {
        if (!dotsHost) return;
        dotsHost.innerHTML = "";
        var n = pageCount();
        for (var i = 0; i < n; i++) {
          (function (idx) {
            var b = document.createElement("button");
            b.type = "button";
            b.setAttribute("aria-label", "Go to reviews page " + (idx + 1));
            b.addEventListener("click", function () {
              track.scrollTo({ left: idx * cardStep(), behavior: "smooth" });
            });
            dotsHost.appendChild(b);
          })(i);
        }
        updateChrome();
      }

      if (prev) {
        prev.addEventListener("click", function () {
          track.scrollBy({ left: -cardStep() * Math.max(1, Math.floor(track.clientWidth / cardStep())), behavior: "smooth" });
        });
      }
      if (next) {
        next.addEventListener("click", function () {
          track.scrollBy({ left: cardStep() * Math.max(1, Math.floor(track.clientWidth / cardStep())), behavior: "smooth" });
        });
      }

      track.addEventListener("scroll", function () {
        window.requestAnimationFrame(updateChrome);
      }, { passive: true });

      window.addEventListener("resize", function () {
        buildDots();
      });

      buildDots();
      updateChrome();
    });
  }

  /**
   * Before/after comparison sliders — drag the handle / surface to reveal.
   * Markup: [data-ba-slider] > .ba-slider-before-wrap > .ba-slider-before
   *          + .ba-slider-range (a11y)
   */
  function bindBeforeAfterSliders() {
    document.querySelectorAll("[data-ba-slider]").forEach(function (root) {
      var beforeImg = root.querySelector(".ba-slider-before");
      var range = root.querySelector(".ba-slider-range");
      if (!beforeImg) return;

      var pos = 50;

      function setPos(pct) {
        pos = Math.max(0, Math.min(100, Number(pct) || 0));
        root.style.setProperty("--pos", pos + "%");
        if (range) range.value = String(Math.round(pos));
      }

      function syncBeforeSize() {
        var w = root.clientWidth;
        var h = root.clientHeight;
        if (w > 0 && h > 0) {
          beforeImg.style.width = w + "px";
          beforeImg.style.height = h + "px";
        }
      }

      function pctFromClientX(clientX) {
        var rect = root.getBoundingClientRect();
        if (rect.width <= 0) return pos;
        return ((clientX - rect.left) / rect.width) * 100;
      }

      var dragging = false;

      function startDrag(e) {
        dragging = true;
        root.classList.add("is-dragging");
        var x = e.clientX;
        if (e.touches && e.touches[0]) x = e.touches[0].clientX;
        setPos(pctFromClientX(x));
        e.preventDefault();
      }

      function moveDrag(e) {
        if (!dragging) return;
        var x = e.clientX;
        if (e.touches && e.touches[0]) x = e.touches[0].clientX;
        setPos(pctFromClientX(x));
        e.preventDefault();
      }

      function endDrag() {
        if (!dragging) return;
        dragging = false;
        root.classList.remove("is-dragging");
      }

      root.addEventListener("pointerdown", function (e) {
        if (e.button != null && e.button !== 0) return;
        startDrag(e);
        if (root.setPointerCapture && e.pointerId != null) {
          try {
            root.setPointerCapture(e.pointerId);
          } catch (err) {}
        }
      });
      root.addEventListener("pointermove", moveDrag);
      root.addEventListener("pointerup", endDrag);
      root.addEventListener("pointercancel", endDrag);
      root.addEventListener("lostpointercapture", endDrag);

      if (range) {
        range.addEventListener("input", function () {
          setPos(range.value);
        });
      }

      if (typeof ResizeObserver !== "undefined") {
        new ResizeObserver(syncBeforeSize).observe(root);
      } else {
        window.addEventListener("resize", syncBeforeSize);
      }

      if (beforeImg.complete) syncBeforeSize();
      else beforeImg.addEventListener("load", syncBeforeSize);

      setPos(50);
      syncBeforeSize();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setOfferEndDates();
    bindHeaderScroll();
    bindSmoothAnchors();
    bindForms();
    setYear();
    bindReviewMore();
    bindReviewsSlider();
    bindBeforeAfterSliders();
  });
})();
