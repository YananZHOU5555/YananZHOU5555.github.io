const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    siteNav.classList.toggle("is-open", !isOpen);
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navToggle.setAttribute("aria-expanded", "false");
      siteNav.classList.remove("is-open");
    });
  });
}

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

const research = document.querySelector("#research");
if (research) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    research.classList.add("is-visible");
  } else {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        research.classList.add("is-visible");
        observer.disconnect();
      },
      { threshold: 0.32 }
    );
    observer.observe(research);
  }
}

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const publications = document.querySelectorAll(".publication");

const wordmarkBot = document.querySelector(".wordmark-bot");

if (wordmarkBot && !reduceMotion) {
  let eyeTimer = 0;

  const clearEyePose = () => {
    wordmarkBot.classList.remove("is-looking-left", "is-looking-right", "is-blinking");
  };

  const scheduleEyeAction = () => {
    window.clearTimeout(eyeTimer);
    eyeTimer = window.setTimeout(runEyeAction, 1200 + Math.random() * 1600);
  };

  const blink = (doubleBlink = false) => {
    wordmarkBot.classList.add("is-blinking");
    eyeTimer = window.setTimeout(() => {
      wordmarkBot.classList.remove("is-blinking");

      if (!doubleBlink) {
        scheduleEyeAction();
        return;
      }

      eyeTimer = window.setTimeout(() => {
        wordmarkBot.classList.add("is-blinking");
        eyeTimer = window.setTimeout(() => {
          wordmarkBot.classList.remove("is-blinking");
          scheduleEyeAction();
        }, 105);
      }, 145);
    }, 105);
  };

  function runEyeAction() {
    clearEyePose();

    if (Math.random() < 0.52) {
      blink(Math.random() < 0.22);
      return;
    }

    const direction = Math.random() < 0.5 ? "is-looking-left" : "is-looking-right";
    wordmarkBot.classList.add(direction);
    eyeTimer = window.setTimeout(() => {
      wordmarkBot.classList.remove(direction);

      if (Math.random() < 0.28) {
        blink(false);
      } else {
        scheduleEyeAction();
      }
    }, 420 + Math.random() * 620);
  }

  wordmarkBot.closest(".wordmark")?.addEventListener("pointerenter", () => {
    window.clearTimeout(eyeTimer);
    clearEyePose();
    wordmarkBot.classList.add("is-looking-right");
  });

  wordmarkBot.closest(".wordmark")?.addEventListener("pointerleave", () => {
    clearEyePose();
    blink(false);
  });

  scheduleEyeAction();
}

if (!reduceMotion && "IntersectionObserver" in window) {
  const publicationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        publicationObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -4%" }
  );

  publications.forEach((publication) => {
    publication.classList.add("reveal-ready");
    publicationObserver.observe(publication);
  });
}

const evidenceVideos = [...document.querySelectorAll(".paper-demo video, .experience-demo video")];

if (evidenceVideos.length) {
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mediaControllers = [];
  let activeController = null;
  let activationToken = 0;
  let schedulerFrame = 0;
  let nearObserver = null;

  const setMediaState = (controller, state) => {
    controller.state = state;
    controller.figure.dataset.mediaState = state;

    const isPlaying = state === "playing";
    controller.button.dataset.playing = String(isPlaying);
    controller.button.setAttribute("aria-pressed", String(isPlaying));
    const actionLabel = state === "error" ? "Retry" : isPlaying ? "Pause" : "Play";
    controller.button.setAttribute("aria-label", `${actionLabel} ${controller.label}`);
  };

  const stopFrameLoop = (controller) => {
    if (
      controller.frameRequest &&
      "cancelVideoFrameCallback" in controller.video
    ) {
      controller.video.cancelVideoFrameCallback(controller.frameRequest);
    }
    if (controller.animationRequest) window.cancelAnimationFrame(controller.animationRequest);
    window.clearTimeout(controller.stallTimer);
    controller.frameRequest = 0;
    controller.animationRequest = 0;
    controller.stallTimer = 0;
  };

  const revealDecodedFrame = (controller) => {
    if (!controller.frameReady) {
      controller.frameReady = true;
      controller.figure.classList.add("is-frame-ready");
    }
    setMediaState(controller, "playing");
  };

  const startFrameLoop = (controller) => {
    stopFrameLoop(controller);

    const onVideoFrame = () => {
      controller.frameRequest = 0;
      if (controller.video.paused || activeController !== controller || document.hidden) return;
      revealDecodedFrame(controller);
      controller.frameRequest = controller.video.requestVideoFrameCallback(onVideoFrame);
    };

    const onAnimationFrame = () => {
      controller.animationRequest = 0;
      if (controller.video.paused || activeController !== controller || document.hidden) return;
      if (controller.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) revealDecodedFrame(controller);
      controller.animationRequest = window.requestAnimationFrame(onAnimationFrame);
    };

    if ("requestVideoFrameCallback" in controller.video) {
      controller.frameRequest = controller.video.requestVideoFrameCallback(onVideoFrame);
    } else {
      controller.animationRequest = window.requestAnimationFrame(onAnimationFrame);
    }
  };

  const prepareMedia = (controller) => {
    if (controller.prepared || controller.state === "error") return;
    controller.prepared = true;
    controller.video.preload = "metadata";
    setMediaState(controller, "loading");
  };

  const pauseMedia = (controller, reason = "scheduler") => {
    stopFrameLoop(controller);
    if (!controller.video.paused) controller.video.pause();
    controller.figure.classList.remove("is-media-buffering");

    if (controller.state !== "error") {
      setMediaState(controller, controller.frameReady ? "paused" : controller.prepared ? "ready" : "poster");
    }

    if (reason === "offscreen") controller.userPaused = false;
    if (activeController === controller) activeController = null;
  };

  const playMedia = async (controller, source = "scheduler") => {
    if (document.hidden || controller.state === "error") return;
    if (motionPreference.matches && source !== "user") return;

    prepareMedia(controller);
    const token = ++activationToken;

    mediaControllers.forEach((other) => {
      if (other !== controller && !other.video.paused) pauseMedia(other);
      if (other !== controller) other.figure.classList.remove("is-media-buffering");
    });

    activeController = controller;
    setMediaState(controller, controller.video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA ? "ready" : "loading");

    try {
      await controller.video.play();
      if (token !== activationToken || activeController !== controller || document.hidden) {
        pauseMedia(controller);
        return;
      }
      startFrameLoop(controller);
    } catch (error) {
      if (token !== activationToken) return;
      controller.figure.classList.remove("is-media-buffering");
      setMediaState(controller, controller.frameReady ? "paused" : "ready");
    }
  };

  const scoreController = (controller) => {
    const bounds = controller.figure.getBoundingClientRect();
    const visibleTop = Math.max(bounds.top, 0);
    const visibleBottom = Math.min(bounds.bottom, window.innerHeight);
    const visiblePixels = Math.max(visibleBottom - visibleTop, 0);
    const visibleRatio = bounds.height > 0 ? visiblePixels / bounds.height : 0;

    if (visiblePixels < Math.min(92, bounds.height * 0.24)) return -Infinity;

    const viewportCenter = window.innerHeight * 0.5;
    const mediaCenter = bounds.top + bounds.height * 0.5;
    const centerAffinity = 1 - Math.min(Math.abs(mediaCenter - viewportCenter) / window.innerHeight, 1);
    return visibleRatio * 1.7 + centerAffinity;
  };

  const runMediaScheduler = () => {
    schedulerFrame = 0;

    if (document.hidden || motionPreference.matches) {
      mediaControllers.forEach((controller) => {
        if (!controller.video.paused) pauseMedia(controller);
      });
      return;
    }

    const candidates = mediaControllers
      .filter((controller) => controller.nearViewport && !controller.userPaused && controller.state !== "error")
      .map((controller) => ({ controller, score: scoreController(controller) }))
      .filter(({ score }) => Number.isFinite(score))
      .sort((a, b) => b.score - a.score);

    const nextController = candidates[0]?.controller || null;

    mediaControllers.forEach((controller) => {
      if (controller !== nextController && !controller.video.paused) pauseMedia(controller, "offscreen");
    });

    if (!nextController) {
      activeController = null;
      return;
    }

    if (activeController !== nextController || nextController.video.paused) {
      playMedia(nextController);
    }
  };

  const requestMediaSchedule = () => {
    if (!schedulerFrame) schedulerFrame = window.requestAnimationFrame(runMediaScheduler);
  };

  const toggleMediaPlayback = (controller) => {
    if (controller.state === "error") {
      controller.video.load();
      controller.prepared = false;
      setMediaState(controller, "poster");
    }

    if (controller.video.paused || activeController !== controller) {
      controller.userPaused = false;
      playMedia(controller, "user");
    } else {
      controller.userPaused = true;
      pauseMedia(controller, "user");
    }
  };

  evidenceVideos.forEach((video, index) => {
    const figure = video.closest(".paper-demo, .experience-demo");
    if (!figure) return;

    const label = figure.getAttribute("aria-label") || `research preview ${index + 1}`;
    const posterSource = video.getAttribute("poster");
    const poster = document.createElement("img");
    poster.className = "media-poster";
    poster.alt = "";
    poster.decoding = "async";
    poster.setAttribute("aria-hidden", "true");
    if (posterSource) poster.src = posterSource;

    const chrome = document.createElement("div");
    chrome.className = "media-chrome";
    chrome.innerHTML = `
      <button class="media-toggle" type="button" aria-pressed="false">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path class="media-toggle__play" d="M9 7.5v9l7-4.5-7-4.5Z"></path>
          <g class="media-toggle__pause"><rect x="8" y="7.5" width="3" height="9" rx="1"></rect><rect x="13" y="7.5" width="3" height="9" rx="1"></rect></g>
        </svg>
      </button>
    `;

    video.removeAttribute("autoplay");
    video.autoplay = false;
    video.preload = "none";
    video.controls = false;
    figure.classList.add("evidence-media");
    figure.insertBefore(poster, video);
    figure.append(chrome);

    const controller = {
      video,
      figure,
      poster,
      chrome,
      button: chrome.querySelector(".media-toggle"),
      label,
      state: "poster",
      prepared: false,
      frameReady: false,
      nearViewport: false,
      userPaused: false,
      frameRequest: 0,
      animationRequest: 0,
      stallTimer: 0,
    };

    const failMedia = () => {
      stopFrameLoop(controller);
      controller.figure.classList.remove("is-media-buffering", "is-frame-ready");
      controller.frameReady = false;
      controller.prepared = false;
      setMediaState(controller, "error");
      if (activeController === controller) activeController = null;
      requestMediaSchedule();
    };

    setMediaState(controller, "poster");

    controller.button.addEventListener("click", () => toggleMediaPlayback(controller));
    video.addEventListener("click", () => toggleMediaPlayback(controller));

    video.addEventListener("loadedmetadata", () => {
      if (controller.state !== "error" && controller.video.paused) setMediaState(controller, "ready");
    });

    video.addEventListener("playing", () => {
      window.clearTimeout(controller.stallTimer);
      controller.stallTimer = 0;
      controller.figure.classList.remove("is-media-buffering");
      startFrameLoop(controller);
    });

    video.addEventListener("waiting", () => {
      if (activeController !== controller) return;
      controller.figure.classList.add("is-media-buffering");
      setMediaState(controller, "buffering");
      window.clearTimeout(controller.stallTimer);
      controller.stallTimer = window.setTimeout(() => {
        if (
          activeController === controller &&
          !controller.frameReady &&
          controller.video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          failMedia();
        }
      }, 12000);
    });

    video.addEventListener("pause", () => {
      stopFrameLoop(controller);
      controller.figure.classList.remove("is-media-buffering");
      if (controller.state !== "error" && activeController !== controller) {
        setMediaState(controller, controller.frameReady ? "paused" : controller.prepared ? "ready" : "poster");
      }
    });

    video.addEventListener("error", failMedia);
    video.querySelectorAll("source").forEach((source) => {
      source.addEventListener("error", () => {
        window.setTimeout(() => {
          if (
            controller.video.error ||
            controller.video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE
          ) {
            failMedia();
          }
        });
      });
    });

    mediaControllers.push(controller);
  });

  if ("IntersectionObserver" in window) {
    nearObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const controller = mediaControllers.find(({ figure }) => figure === entry.target);
          if (!controller) return;
          controller.nearViewport = entry.isIntersecting;
          if (!entry.isIntersecting && activeController === controller) pauseMedia(controller, "offscreen");
        });
        requestMediaSchedule();
      },
      { rootMargin: "280px 0px", threshold: 0 }
    );

    mediaControllers.forEach(({ figure }) => nearObserver.observe(figure));
  } else {
    mediaControllers.forEach((controller) => {
      controller.nearViewport = true;
    });
  }

  const handleVisibilityChange = () => {
    if (document.hidden) {
      ++activationToken;
      mediaControllers.forEach((controller) => {
        if (!controller.video.paused) pauseMedia(controller);
      });
    } else {
      requestMediaSchedule();
    }
  };

  const handleMotionPreference = () => {
    if (motionPreference.matches) {
      ++activationToken;
      mediaControllers.forEach((controller) => {
        if (!controller.video.paused) pauseMedia(controller);
      });
    } else {
      requestMediaSchedule();
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("scroll", requestMediaSchedule, { passive: true });
  window.addEventListener("resize", requestMediaSchedule, { passive: true });
  window.addEventListener("pagehide", () => {
    ++activationToken;
    if (nearObserver) nearObserver.disconnect();
    mediaControllers.forEach((controller) => {
      stopFrameLoop(controller);
      controller.video.pause();
    });
  }, { once: true });
  motionPreference.addEventListener?.("change", handleMotionPreference);
  requestMediaSchedule();
}

if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".paper-demo").forEach((demo) => {
    demo.addEventListener("pointermove", (event) => {
      const bounds = demo.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      demo.style.setProperty("--pointer-x", `${x * 100}%`);
      demo.style.setProperty("--pointer-y", `${y * 100}%`);
      demo.style.setProperty("--tilt-x", `${(x - 0.5) * 3.2}deg`);
      demo.style.setProperty("--tilt-y", `${(0.5 - y) * 3.2}deg`);
    });

    demo.addEventListener("pointerleave", () => {
      demo.style.removeProperty("--pointer-x");
      demo.style.removeProperty("--pointer-y");
      demo.style.removeProperty("--tilt-x");
      demo.style.removeProperty("--tilt-y");
    });
  });
}

const laundryProgress = document.querySelector(".laundry-progress");

if (laundryProgress && !reduceMotion) {
  const robot = laundryProgress.querySelector(".laundry-robot");
  const wardrobe = laundryProgress.querySelector(".laundry-wardrobe");
  const track = laundryProgress.querySelector(".laundry-progress__track");
  const fill = laundryProgress.querySelector(".laundry-progress__fill");
  let animationFrame = 0;
  let movementTimer = 0;

  const renderDelivery = () => {
    animationFrame = 0;
    const scrollRange = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
    const progress = Math.min(Math.max(window.scrollY / scrollRange, 0), 1);
    const arrivalProgress = Math.min(progress / 0.93, 1);
    const travel = Math.max(track.clientWidth - robot.offsetWidth - wardrobe.offsetWidth + 8, 0);

    robot.style.transform = `translate3d(${(travel * arrivalProgress).toFixed(2)}px, 0, 0)`;
    fill.style.transform = `scaleX(${Math.min(progress / 0.93, 1).toFixed(4)})`;
    laundryProgress.classList.toggle("is-active", window.scrollY > 54);
    laundryProgress.classList.toggle("is-near", progress > 0.78);
    laundryProgress.classList.toggle("is-delivered", progress > 0.935);
    laundryProgress.classList.toggle("is-complete", progress > 0.992);
  };

  const requestDeliveryRender = () => {
    laundryProgress.classList.add("is-moving");
    window.clearTimeout(movementTimer);
    movementTimer = window.setTimeout(() => {
      laundryProgress.classList.remove("is-moving");
    }, 130);

    if (!animationFrame) animationFrame = window.requestAnimationFrame(renderDelivery);
  };

  window.addEventListener("scroll", requestDeliveryRender, { passive: true });
  window.addEventListener("resize", requestDeliveryRender, { passive: true });
  renderDelivery();
}

const homeHero = document.querySelector(".hero");
const homeLinenCanvas = document.querySelector("[data-home-linen]");

if (homeHero && homeLinenCanvas) {
  const context = homeLinenCanvas.getContext("2d");

  if (context) {
    let width = 1;
    let height = 1;
    let deviceScale = 1;
    let linenFrame = 0;
    let linenVisible = true;
    const pointer = { x: 0.62, y: 0.34 };
    const target = { ...pointer };

    const drawHomeLinen = (now = 0) => {
      context.clearRect(0, 0, width, height);
      pointer.x += (target.x - pointer.x) * 0.04;
      pointer.y += (target.y - pointer.y) * 0.04;

      const base = context.createLinearGradient(0, 0, width, height);
      base.addColorStop(0, "rgba(252,254,254,0.48)");
      base.addColorStop(0.48, "rgba(233,245,250,0.72)");
      base.addColorStop(1, "rgba(204,226,237,0.84)");
      context.fillStyle = base;
      context.fillRect(0, 0, width, height);

      const ambientTime = reduceMotion ? 0 : now * 0.00022;
      const lightX = (pointer.x + Math.sin(ambientTime * 1.7) * 0.055) * width;
      const lightY = (pointer.y + Math.cos(ambientTime * 1.25) * 0.05) * height;
      const light = context.createRadialGradient(lightX, lightY, 0, lightX, lightY, width * 0.58);
      light.addColorStop(0, "rgba(255,255,252,0.98)");
      light.addColorStop(0.26, "rgba(244,251,253,0.62)");
      light.addColorStop(0.58, "rgba(232,244,249,0.18)");
      light.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = light;
      context.fillRect(0, 0, width, height);

      const sheen = context.createLinearGradient(lightX - width * 0.24, 0, lightX + width * 0.24, height);
      sheen.addColorStop(0, "rgba(255,255,255,0)");
      sheen.addColorStop(0.5, "rgba(255,255,255,0.18)");
      sheen.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = sheen;
      context.fillRect(0, 0, width, height);

      const time = reduceMotion ? 0.45 : now * 0.0002;
      context.lineWidth = 0.72;

      for (let y = -10; y < height + 10; y += 7) {
        context.beginPath();
        for (let x = -10; x <= width + 10; x += 8) {
          const distance = Math.hypot(x - lightX, y - lightY) / Math.max(width, height);
          const influence = Math.max(0, 1 - distance * 1.92);
          const px = x + Math.sin(y * 0.018 + time) * (1.25 + influence * 1.4);
          const py = y + Math.sin(x * 0.021 + y * 0.015 + time * 7) * (1.7 + influence * 6.2);
          if (x === -10) context.moveTo(px, py);
          else context.lineTo(px, py);
        }
        context.strokeStyle = "rgba(63,110,134,0.17)";
        context.stroke();
      }

      for (let x = -10; x < width + 10; x += 8) {
        context.beginPath();
        for (let y = -10; y <= height + 10; y += 8) {
          const distance = Math.hypot(x - lightX, y - lightY) / Math.max(width, height);
          const influence = Math.max(0, 1 - distance * 1.98);
          const px = x + Math.cos(y * 0.023 + x * 0.012 + time * 6) * (1.35 + influence * 5.1);
          if (y === -10) context.moveTo(px, y);
          else context.lineTo(px, y);
        }
        context.strokeStyle = "rgba(255,255,255,0.4)";
        context.stroke();
      }

      if (linenVisible && !document.hidden && !reduceMotion) {
        linenFrame = window.requestAnimationFrame(drawHomeLinen);
      }
    };

    const resizeHomeLinen = () => {
      const bounds = homeLinenCanvas.getBoundingClientRect();
      deviceScale = Math.min(window.devicePixelRatio || 1, 1.5);
      width = Math.max(1, Math.round(bounds.width));
      height = Math.max(1, Math.round(bounds.height));
      homeLinenCanvas.width = Math.round(width * deviceScale);
      homeLinenCanvas.height = Math.round(height * deviceScale);
      context.setTransform(deviceScale, 0, 0, deviceScale, 0, 0);
      if (!linenFrame) drawHomeLinen(performance.now());
    };

    homeHero.addEventListener("pointermove", (event) => {
      const bounds = homeHero.getBoundingClientRect();
      target.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      target.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    }, { passive: true });

    if ("ResizeObserver" in window) new ResizeObserver(resizeHomeLinen).observe(homeLinenCanvas);
    else window.addEventListener("resize", resizeHomeLinen, { passive: true });

    const syncHeroRuntime = () => {
      const shouldRun = linenVisible && !document.hidden && !reduceMotion;
      homeHero.classList.toggle("is-runtime-paused", !shouldRun);

      if (shouldRun && !linenFrame) {
        linenFrame = window.requestAnimationFrame(drawHomeLinen);
      } else if (!shouldRun && linenFrame) {
        window.cancelAnimationFrame(linenFrame);
        linenFrame = 0;
      }
    };

    let heroObserver = null;

    if ("IntersectionObserver" in window) {
      heroObserver = new IntersectionObserver(([entry]) => {
        linenVisible = entry.isIntersecting;
        syncHeroRuntime();
      });
      heroObserver.observe(homeHero);
    }

    document.addEventListener("visibilitychange", syncHeroRuntime);
    window.addEventListener("pagehide", () => {
      if (heroObserver) heroObserver.disconnect();
      if (linenFrame) window.cancelAnimationFrame(linenFrame);
      linenFrame = 0;
    }, { once: true });

    resizeHomeLinen();
    syncHeroRuntime();
  }
}

const homeTowel = document.querySelector("[data-home-towel]");

if (homeTowel && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  const moveTowelCorner = (event) => {
    const bounds = homeTowel.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    const proximity = Math.max(0, 1 - Math.hypot(1 - x, y) * 1.4);

    homeTowel.style.setProperty("--towel-lift-x", `${(0.5 - y) * -3.6}deg`);
    homeTowel.style.setProperty("--towel-lift-y", `${(x - 0.5) * 4.6}deg`);
    homeTowel.style.setProperty("--towel-corner-lift", `${proximity * -13}px`);
  };

  const resetTowelCorner = () => {
    homeTowel.style.setProperty("--towel-lift-x", "0deg");
    homeTowel.style.setProperty("--towel-lift-y", "0deg");
    homeTowel.style.setProperty("--towel-corner-lift", "0px");
  };

  homeTowel.addEventListener("pointermove", moveTowelCorner, { passive: true });
  homeTowel.addEventListener("pointerleave", resetTowelCorner, { passive: true });
}
