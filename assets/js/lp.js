/**
 * Ember Chimney — Offer Landing Page scripts (refined)
 * - Auto limited-time offer end date (+7 days, rolls daily)
 * - Sticky header state on scroll
 * - Smooth in-page anchors with sticky offset
 * - Placeholder form handlers (no webhook yet)
 */
(function () {
  "use strict";

  function formatOfferDate(date) {
    return date.getMonth() + 1 + "/" + date.getDate();
  }

  /** Always ~7 days out from today (7/20 → 7/27; next day → 7/28). */
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

  /**
   * Smooth-scroll for same-page # links, accounting for sticky header.
   * Only handles # anchors (tel: and external left alone).
   */
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

      // Move focus for a11y without jumping
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      try {
        target.focus({ preventScroll: true });
      } catch (err) {
        /* ignore */
      }

      if (history.pushState) {
        history.pushState(null, "", id);
      }
    });
  }

  /** Placeholder forms — prevent submit; client wires webhook later. */
  function bindForms() {
    document.querySelectorAll("form[data-lp-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var status = form.querySelector(".form-status");
        if (status) {
          status.classList.add("show");
          status.textContent =
            "Thanks — form is in demo mode. Call (844) 803-0373 to book now.";
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

  document.addEventListener("DOMContentLoaded", function () {
    setOfferEndDates();
    bindHeaderScroll();
    bindSmoothAnchors();
    bindForms();
    setYear();
  });
})();
