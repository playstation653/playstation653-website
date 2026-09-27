/* Play Station 653 -- the only JavaScript on the site.
   Everything else is HTML and CSS, deliberately. No framework, no build. */

(function () {
  "use strict";

  /* ---- mobile nav ------------------------------------------------------ */
  var toggle = document.querySelector("[data-nav-toggle]");
  var panel = document.getElementById("mobile-nav");

  if (toggle && panel) {
    toggle.addEventListener("click", function () {
      var open = panel.getAttribute("data-open") === "true";
      panel.setAttribute("data-open", String(!open));
      toggle.setAttribute("aria-expanded", String(!open));
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && panel.getAttribute("data-open") === "true") {
        panel.setAttribute("data-open", "false");
        toggle.setAttribute("aria-expanded", "false");
        toggle.focus();
      }
    });
  }

  /* ---- accordion: only one answer open per group ----------------------- */
  document.querySelectorAll(".accordion").forEach(function (group) {
    var items = group.querySelectorAll("details");
    items.forEach(function (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        items.forEach(function (other) {
          if (other !== d) other.open = false;
        });
      });
    });
  });

  /* ---- TidyCal embeds -------------------------------------------------- */
  /* Load the booking script only if a booking widget is actually on the page,
     and show a phone-and-email fallback if it fails to load. */
  var embeds = document.querySelectorAll(".tidycal-embed");
  if (embeds.length) {
    var s = document.createElement("script");
    s.src = "https://asset-tidycal.b-cdn.net/js/embed.js";
    s.async = true;
    s.onerror = function () {
      document.querySelectorAll("[data-booking-fallback]").forEach(function (el) {
        el.hidden = false;
      });
    };
    document.head.appendChild(s);

    window.setTimeout(function () {
      embeds.forEach(function (el) {
        if (el.children.length === 0) {
          var fb = el.parentElement.querySelector("[data-booking-fallback]");
          if (fb) fb.hidden = false;
        }
      });
    }, 6000);
  }

  /* ---- gallery: filtering + lightbox ----------------------------------- */
  var grid = document.getElementById("gallery-grid");
  var lightbox = document.getElementById("lightbox");

  if (grid) {
    var items = Array.prototype.slice.call(grid.querySelectorAll(".masonry__item"));
    var chips = Array.prototype.slice.call(document.querySelectorAll(".filter-chip"));
    var countEl = document.querySelector("[data-gallery-count]");
    var emptyEl = document.querySelector("[data-gallery-empty]");
    var visible = items.slice();

    function applyFilter(cat) {
      visible = [];
      items.forEach(function (el) {
        var show = cat === "all" || el.dataset.category === cat;
        el.hidden = !show;
        if (show) visible.push(el);
      });
      chips.forEach(function (c) {
        c.setAttribute("aria-pressed", String(c.dataset.filter === cat));
      });
      if (countEl) {
        countEl.textContent = cat === "all"
          ? "Showing all " + visible.length + " photos"
          : "Showing " + visible.length + (visible.length === 1 ? " photo" : " photos");
      }
      if (emptyEl) emptyEl.hidden = visible.length !== 0;
    }

    chips.forEach(function (c) {
      c.addEventListener("click", function () { applyFilter(c.dataset.filter); });
    });

    /* ---- lightbox ---- */
    if (lightbox) {
      var lbImg = lightbox.querySelector("[data-lightbox-img]");
      var lbNum = lightbox.querySelector("[data-lightbox-counter]");
      var current = 0;
      var lastFocus = null;

      function show(i) {
        if (!visible.length) return;
        current = (i + visible.length) % visible.length;
        var el = visible[current];
        lbImg.src = el.dataset.full;
        lbImg.alt = el.dataset.alt || "";
        lbNum.textContent = (current + 1) + " / " + visible.length;
        /* Warm the neighbours so arrowing through feels instant. */
        [current + 1, current - 1].forEach(function (n) {
          var nb = visible[(n + visible.length) % visible.length];
          if (nb) { var p = new Image(); p.src = nb.dataset.full; }
        });
      }

      function open(i) {
        lastFocus = document.activeElement;
        lightbox.hidden = false;
        lightbox.setAttribute("aria-hidden", "false");
        document.body.classList.add("is-locked");
        show(i);
        lightbox.querySelector(".lightbox__btn--close").focus();
      }

      function close() {
        lightbox.hidden = true;
        lightbox.setAttribute("aria-hidden", "true");
        document.body.classList.remove("is-locked");
        /* A transparent pixel rather than removing src: an <img> with an
           empty src counts as a broken image and some browsers re-request the
           page URL. */
        lbImg.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        if (lastFocus) lastFocus.focus();
      }

      items.forEach(function (el) {
        el.addEventListener("click", function () {
          var i = visible.indexOf(el);
          if (i >= 0) open(i);
        });
      });

      lightbox.querySelectorAll("[data-lightbox-close]").forEach(function (b) {
        b.addEventListener("click", close);
      });
      lightbox.querySelector("[data-lightbox-prev]").addEventListener("click", function () { show(current - 1); });
      lightbox.querySelector("[data-lightbox-next]").addEventListener("click", function () { show(current + 1); });

      document.addEventListener("keydown", function (e) {
        if (lightbox.hidden) return;
        if (e.key === "Escape") { close(); }
        else if (e.key === "ArrowLeft") { show(current - 1); }
        else if (e.key === "ArrowRight") { show(current + 1); }
      });

      /* Swipe on touch devices. */
      var touchX = null;
      lightbox.addEventListener("touchstart", function (e) {
        touchX = e.changedTouches[0].clientX;
      }, { passive: true });
      lightbox.addEventListener("touchend", function (e) {
        if (touchX === null) return;
        var dx = e.changedTouches[0].clientX - touchX;
        if (Math.abs(dx) > 50) show(current + (dx < 0 ? 1 : -1));
        touchX = null;
      }, { passive: true });
    }
  }

  /* ---- conversion instrumentation -------------------------------------- */
  /* Fires a dataLayer event on every high-intent click so the value of the
     site can actually be measured. Harmless if no analytics is installed. */
  window.dataLayer = window.dataLayer || [];
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var event = null;

    if (href.indexOf("tel:") === 0) event = "click_phone";
    else if (href.indexOf("mailto:") === 0) event = "click_email";
    else if (href.indexOf("/book") === 0) event = "click_book";
    else if (href.indexOf("/waiver") === 0) event = "click_waiver";
    else if (href.indexOf("forms.gle") > -1) event = "click_waiver_form";
    else if (href.indexOf("maps.google") > -1) event = "click_directions";

    if (event) {
      window.dataLayer.push({
        event: event,
        link_url: href,
        link_text: (a.textContent || "").trim().slice(0, 80),
        page_path: window.location.pathname
      });
    }
  });
})();
