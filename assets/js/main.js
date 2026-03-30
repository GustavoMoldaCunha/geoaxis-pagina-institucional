(function ($) {
  var $window = $(window),
    $body = $("body"),
    $wrapper = $("#wrapper");

  // Dimensões
  breakpoints({
    xlarge: ["1281px", "1680px"],
    large: ["981px", "1280px"],
    medium: ["737px", "980px"],
    small: ["481px", "736px"],
    xsmall: ["361px", "480px"],
    xxsmall: [null, "360px"],
  });

  // Animação ao abrir página
  $window.on("load", function () {
    window.setTimeout(function () {
      $body.removeClass("is-preload");
    }, 100);
  });

  // IE: Flexbox min-height bug.
  if (browser.name == "ie")
    (function () {
      var flexboxFixTimeoutId;

      $window
        .on("resize.flexbox-fix", function () {
          var $x = $(".fullscreen");

          clearTimeout(flexboxFixTimeoutId);

          flexboxFixTimeoutId = setTimeout(function () {
            if ($x.prop("scrollHeight") > $window.height())
              $x.css("height", "auto");
            else $x.css("height", "100vh");
          }, 250);
        })
        .triggerHandler("resize.flexbox-fix");
    })();

  // Object fit workaround.
  if (!browser.canUse("object-fit"))
    (function () {
      $(".banner .image, .spotlight .image").each(function () {
        var $this = $(this),
          $img = $this.children("img"),
          positionClass = $this
            .parent()
            .attr("class")
            .match(/image-position-([a-z]+)/);

        // Set image.
        $this
          .css("background-image", 'url("' + $img.attr("src") + '")')
          .css("background-repeat", "no-repeat")
          .css("background-size", "cover");

        // Set position.
        switch (positionClass.length > 1 ? positionClass[1] : "") {
          case "left":
            $this.css("background-position", "left");
            break;

          case "right":
            $this.css("background-position", "right");
            break;

          default:
          case "center":
            $this.css("background-position", "center");
            break;
        }

        // Hide original.
        $img.css("opacity", "0");
      });
    })();

  // Smooth scroll.
  $(".smooth-scroll").scrolly();
  $(".smooth-scroll-middle").scrolly({ anchor: "middle" });

  // Wrapper.
  $wrapper.children().scrollex({
    top: "30vh",
    bottom: "30vh",
    initialize: function () {
      $(this).addClass("is-inactive");
    },
    terminate: function () {
      $(this).removeClass("is-inactive");
    },
    enter: function () {
      $(this).removeClass("is-inactive");
    },
    leave: function () {
      var $this = $(this);

      if ($this.hasClass("onscroll-bidirectional"))
        $this.addClass("is-inactive");
    },
  });

  // Items.
  $(".items")
    .scrollex({
      top: "30vh",
      bottom: "30vh",
      delay: 50,
      initialize: function () {
        $(this).addClass("is-inactive");
      },
      terminate: function () {
        $(this).removeClass("is-inactive");
      },
      enter: function () {
        $(this).removeClass("is-inactive");
      },
      leave: function () {
        var $this = $(this);

        if ($this.hasClass("onscroll-bidirectional"))
          $this.addClass("is-inactive");
      },
    })
    .children()
    .wrapInner('<div class="inner"></div>');

  document.querySelectorAll(".marquee-container").forEach(function (container) {
    var isDragging = false;
    var startX = 0;
    var startScrollLeft = 0;
    var moved = false;
    var resumeTimer = null;

    function pauseMarquee() {
      if (resumeTimer) {
        clearTimeout(resumeTimer);
        resumeTimer = null;
      }
      container.classList.add("is-paused");
    }

    function scheduleResumeMarquee() {
      if (resumeTimer) clearTimeout(resumeTimer);
      resumeTimer = setTimeout(function () {
        if (!isDragging) container.classList.remove("is-paused");
      }, 800);
    }

    container.addEventListener("pointerdown", function (event) {
      if (event.pointerType === "mouse" && event.button !== 0) return;

      isDragging = true;
      moved = false;
      pauseMarquee();
      startX = event.clientX;
      startScrollLeft = container.scrollLeft;
      container.classList.add("is-dragging");
      container.setPointerCapture(event.pointerId);
    });

    container.addEventListener("pointermove", function (event) {
      if (!isDragging) return;

      var deltaX = event.clientX - startX;
      if (Math.abs(deltaX) > 3) moved = true;
      container.scrollLeft = startScrollLeft - deltaX;
      event.preventDefault();
    });

    function stopDragging(event) {
      if (!isDragging) return;
      isDragging = false;
      container.classList.remove("is-dragging");
      scheduleResumeMarquee();
      if (event && event.pointerId !== undefined) {
        try {
          container.releasePointerCapture(event.pointerId);
        } catch (e) {}
      }
    }

    container.addEventListener("pointerup", stopDragging);
    container.addEventListener("pointercancel", stopDragging);
    container.addEventListener("pointerleave", function (event) {
      if (event.pointerType === "mouse") stopDragging(event);
    });

    container.addEventListener("click", function (event) {
      if (moved) {
        event.preventDefault();
        event.stopPropagation();
        moved = false;
      }
    });
  });
})(jQuery);
