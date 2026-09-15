/**
 * Ember Chimney — Offer Landing Page scripts
 * - Rolling offer end date: Sunday of next week (if today is Sunday, the following Sunday)
 * - Sticky header, smooth # anchors, reviews, media
 * - Forms → POST /api/lead → /offer/thank-you/
 *
 * NJ phone (one-line swap when CallRail number arrives):
 *   NJ_DISPLAY_NUMBER / NJ_TEL_HREF below
 */
(function () {
  "use strict";

  var NJ_DISPLAY_NUMBER = window.NJ_DISPLAY_NUMBER || "(XXX) XXX-XXXX";
  var NJ_TEL_HREF = window.NJ_TEL_HREF || "tel:+1XXXXXXXXXX";

  function isNjPage() {
    return /\/nj\//.test(window.location.pathname || "");
  }

  function pageMarket() {
    return isNjPage() ? "NJ" : "DFW";
  }

  function formatOfferDate(date) {
    return date.getMonth() + 1 + "/" + date.getDate();
  }

  /** Next Sunday (M/D). If today is Sunday, use the following Sunday. */
  function nextSunday() {
    var end = new Date();
    end.setHours(0, 0, 0, 0);
    var add = end.getDay() === 0 ? 7 : 7 - end.getDay();
    end.setDate(end.getDate() + add);
    return end;
  }

  function setOfferEndDates() {
    var label = formatOfferDate(nextSunday());
    document.querySelectorAll("[data-offer-end]").forEach(function (el) {
      el.textContent = label;
    });
  }

  function applyNjPhone() {
    if (!isNjPage()) return;
    document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
      a.setAttribute("href", NJ_TEL_HREF);
      a.innerHTML = a.innerHTML.replace(
        /\(844\) 803-0373|\(XXX\) XXX-XXXX/g,
        NJ_DISPLAY_NUMBER
      );
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

  /**
   * Forms → POST /api/lead (email Yuval + Raz) → always redirect to thank-you.
   * Conversion tracking depends on thank-you pageview; never skip redirect.
   */
  function bindForms() {
    document.querySelectorAll("form[data-lp-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();

        var nameInput = form.querySelector('[name="name"], #name');
        var phoneInput = form.querySelector('[name="phone"], #phone');
        var zipInput = form.querySelector('[name="zip"], #zip');
        var msgInput = form.querySelector('[name="message"], #msg, #message');
        var name = nameInput ? String(nameInput.value || "").trim() : "";
        var phone = phoneInput ? String(phoneInput.value || "").trim() : "";
        var zip = zipInput ? String(zipInput.value || "").trim() : "";
        var message = msgInput ? String(msgInput.value || "").trim() : "";
        var status = form.querySelector(".form-status");
        var submitBtn = form.querySelector('button[type="submit"], .btn-send');

        if (!name || !phone || !zip) {
          if (status) {
            status.classList.add("show", "is-error");
            status.classList.remove("is-ok");
            status.textContent =
              "Please fill in name, phone, and zip so we can call you back.";
          }
          return;
        }

        var service = form.getAttribute("data-service") || "chimney-service";
        var params = new URLSearchParams(window.location.search);
        var loc = params.get("loc") || "";
        var kw = params.get("kw") || "";
        var gclid = params.get("gclid") || "";
        var market = pageMarket();
        var variant = "";
        var path = window.location.pathname || "";
        if (market === "DFW" && /chimney-sweep/.test(path)) {
          variant =
            document.body.getAttribute("data-ab") ||
            document.documentElement.getAttribute("data-ab") ||
            "";
          try {
            if (variant) sessionStorage.setItem("ab_sweep_conv", variant);
          } catch (err) {}
        }

        var payload = {
          name: name,
          phone: phone,
          zip: zip,
          message: message,
          page: path,
          loc: loc,
          kw: kw,
          gclid: gclid,
          service: service,
          market: market,
        };
        if (variant) payload.variant = variant;

        var qs = new URLSearchParams();
        qs.set("name", name);
        qs.set("service", service);
        if (loc) qs.set("loc", loc);
        if (zip) qs.set("zip", zip);
        if (kw) qs.set("kw", kw);
        // Shared thank-you for DFW and NJ
        var thankYouUrl = "/offer/thank-you/?" + qs.toString();

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.setAttribute("aria-busy", "true");
        }
        if (status) {
          status.classList.add("show");
          status.classList.remove("is-error", "is-ok");
          status.textContent = "Sending…";
        }

        function goThankYou() {
          window.location.href = thankYouUrl;
        }

        var finished = false;
        function finish() {
          if (finished) return;
          finished = true;
          goThankYou();
        }

        // Never strand the customer if the network hangs
        var safety = window.setTimeout(finish, 8000);

        fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        })
          .catch(function () {
            /* email failures are logged server-side; still redirect */
          })
          .then(function () {
            window.clearTimeout(safety);
            finish();
          });
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

  function bindMediaVideos() {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var autoplayVideos = document.querySelectorAll("video.hero-atlas-video");
    var workVideos = document.querySelectorAll("video[data-work-video]");

    function muteAndInline(v) {
      v.muted = true;
      v.defaultMuted = true;
      v.playsInline = true;
      v.setAttribute("playsinline", "");
    }

    autoplayVideos.forEach(function (v) {
      muteAndInline(v);
      if (reduce) {
        v.removeAttribute("autoplay");
        v.pause();
        return;
      }
      var play = v.play();
      if (play && play.catch) play.catch(function () {});
    });

    workVideos.forEach(function (v) {
      muteAndInline(v);
      if (reduce) return;
      if (!("IntersectionObserver" in window)) {
        var play = v.play();
        if (play && play.catch) play.catch(function () {});
      }
    });

    if (reduce || !("IntersectionObserver" in window) || !workVideos.length) return;

    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var v = entry.target;
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            var play = v.play();
            if (play && play.catch) play.catch(function () {});
          } else {
            v.pause();
          }
        });
      },
      { threshold: [0, 0.35, 0.7] }
    );
    workVideos.forEach(function (v) {
      io.observe(v);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    setOfferEndDates();
    applyNjPhone();
    bindHeaderScroll();
    bindSmoothAnchors();
    bindForms();
    setYear();
    bindReviewMore();
    bindReviewsSlider();
    bindMediaVideos();
  });
})();
