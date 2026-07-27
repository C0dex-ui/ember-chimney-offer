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

  document.addEventListener("DOMContentLoaded", function () {
    setOfferEndDates();
    bindHeaderScroll();
    bindSmoothAnchors();
    bindForms();
    setYear();
  });
})();
