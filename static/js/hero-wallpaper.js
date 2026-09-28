(() => {
  const hero = document.querySelector(".rhine-hero");
  const host = document.getElementById("rhine-hero-wallpaper");
  const video = hero?.querySelector(".rhine-hero-video");

  if (!hero || !host || !video) return;

  const bgChoice = new URLSearchParams(location.search).get("bg")
    ?? localStorage.getItem("rhine.hero.bg");
  if (bgChoice !== "webgl") {
    hero.classList.add("is-wallpaper-fallback");
    video.play().catch(() => {});
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let instance = null;
  let pending = null;
  let failed = false;
  let visible = true;
  let timer;
  const loading = new AbortController();

  const dispose = (renderer) => {
    try {
      renderer.destroy({ releasePkgCache: true });
    } catch (error) {
      console.warn("[Rhine Lab] Could not release wallpaper renderer", error);
    }
  };

  const stopPendingCanvas = () => {
    for (const canvas of host.querySelectorAll("canvas")) canvas.remove();
  };

  const fallback = (reason) => {
    if (failed) return;
    failed = true;
    hero.classList.remove("is-wallpaper-ready");
    hero.classList.add("is-wallpaper-fallback");
    host.classList.remove("is-ready", "is-loading");
    window.clearTimeout(timer);
    loading.abort();

    if (instance) dispose(instance);
    if (pending && pending !== instance) dispose(pending);
    instance = null;
    pending = null;
    stopPendingCanvas();

    if (reason) console.warn("[Rhine Lab] Wallpaper renderer fallback:", reason);
    if (reducedMotion.matches) hero.classList.add("is-reduced-motion");
    syncVideo();
  };

  const syncVideo = () => {
    if (reducedMotion.matches || document.hidden || !visible || video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
      if (video.error || video.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) {
        hero.classList.add("is-video-unavailable");
      }
      video.pause();
      return;
    }
    if (!video.paused) return;
    void video.play().then(() => {
      hero.classList.remove("is-video-unavailable");
    }).catch(() => {
      if (!reducedMotion.matches && !document.hidden && visible && !hero.classList.contains("is-wallpaper-ready")) {
        hero.classList.add("is-video-unavailable");
      }
    });
  };

  const syncPlayback = () => {
    if (!instance || failed) {
      if (!hero.classList.contains("is-wallpaper-ready")) syncVideo();
      return;
    }

    if (reducedMotion.matches || document.hidden || !visible) instance.pause();
    else instance.resume();
  };

  const start = async () => {
    if (reducedMotion.matches) {
      fallback();
      return;
    }

    const connection = navigator.connection;
    if (connection?.saveData || ["slow-2g", "2g", "3g"].includes(connection?.effectiveType)
      || (navigator.deviceMemory && navigator.deviceMemory < 4)) {
      fallback("limited bandwidth or device memory");
      return;
    }

    try {
      const probe = document.createElement("canvas");
      const gl = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: true });
      if (!gl) {
        fallback("WebGL2 unavailable");
        return;
      }
      gl.getExtension("WEBGL_lose_context")?.loseContext();

      host.classList.add("is-loading");
      timer = window.setTimeout(() => fallback("first frame timeout"), 15000);
      const { createScene, httpSource } = await import(host.dataset.rendererUrl);
      if (failed) return;
      const source = httpSource(host.dataset.sceneUrl);
      const cancellable = {
        ...source,
        project: async (signal) => {
          const project = await source.project(signal || loading.signal);
          if (!signal && loading.signal.aborted) return new Promise(() => {});
          return project;
        },
      };
      const options = {
        source: cancellable,
        audio: null,
        volume: 0,
        fps: 30,
        renderDpr: Math.min(window.devicePixelRatio || 1, 1.25),
        quality: {
          antiAliasing: "off",
          particles: "low",
          postProcessing: "low",
        },
        onError(error) {
          if (!failed) fallback(error);
        },
        onDiagnostic(message, level) {
          if (level === "error") {
            console.warn("[Rhine Lab] Wallpaper diagnostic:", message);
          }
        },
      };
      const loaded = createScene(host, options);
      pending = loaded;
      await loaded.__applyOptions(options);
      window.clearTimeout(timer);
      if (failed) return;

      pending = null;
      instance = loaded;
      host.classList.remove("is-loading");
      host.classList.add("is-ready");
      hero.classList.add("is-wallpaper-ready");
      video.pause();
      syncPlayback();
    } catch (error) {
      fallback(error instanceof Error ? error.message : String(error));
    }
  };

  document.addEventListener("visibilitychange", syncPlayback, { passive: true });

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        syncPlayback();
      }, { threshold: 0.01 })
    : null;
  observer?.observe(hero);

  host.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    fallback("WebGL context lost");
  }, true);

  video.addEventListener("error", () => {
    hero.classList.add("is-video-unavailable");
    video.pause();
  }, true);
  video.querySelectorAll("source").forEach((source) => {
    source.addEventListener("error", () => hero.classList.add("is-video-unavailable"));
  });
  video.addEventListener("playing", () => {
    hero.classList.remove("is-video-unavailable");
  });

  window.addEventListener("pagehide", () => {
    failed = true;
    window.clearTimeout(timer);
    loading.abort();
    observer?.disconnect();
    if (instance) dispose(instance);
    if (pending && pending !== instance) dispose(pending);
    stopPendingCanvas();
    instance = null;
    pending = null;
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) location.reload();
  });

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches) fallback();
    else syncPlayback();
  });

  void start();
})();
