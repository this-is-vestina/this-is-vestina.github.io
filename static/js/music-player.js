(() => {
  const manifestUrl = (document.currentScript?.dataset.manifest)
    ?? (window.RHINE_MUSIC_MANIFEST)
    ?? "/music/manifest.json";

  const DEFAULT_VOLUME = 0.4;
  const FADE_SECONDS = 2;
  const POSITION = { left: "1rem", bottom: "1rem" };
  const ICONS = {
    on: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>',
    off: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/><line x1="3" y1="3" x2="21" y2="21"/></svg>',
  };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const persist = (key, value) => {
    try { localStorage.setItem(key, value); } catch { /* quota or disabled */ }
  };
  const readPersist = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch { return fallback; }
  };

  const targetVolume = () => (reduceMotion.matches ? Math.min(DEFAULT_VOLUME, 0.2) : DEFAULT_VOLUME);

  const button = document.createElement("button");
  button.type = "button";
  button.className = "rhine-music-button";
  button.setAttribute("aria-label", "切换音乐播放");
  button.style.position = "fixed";
  for (const [key, value] of Object.entries(POSITION)) button.style[key] = value;

  const audios = [new Audio(), new Audio()];
  for (const audio of audios) {
    audio.preload = "auto";
    audio.crossOrigin = "anonymous";
    audio.loop = false;
    audio.style.display = "none";
    audio.setAttribute("aria-hidden", "true");
    document.body.appendChild(audio);
  }

  const state = {
    enabled: readPersist("music.enabled", "1") !== "0",
    volume: Math.max(0, Math.min(1, Number(readPersist("music.volume", DEFAULT_VOLUME)) || DEFAULT_VOLUME)),
    tracks: [],
    index: 0,
    active: 0,
    loaded: false,
  };

  const ctxCtor = window.AudioContext || window.webkitAudioContext;
  const ctx = ctxCtor ? new ctxCtor() : null;
  const gain = ctx?.createGain();
  if (gain) {
    gain.gain.value = 0;
    for (const audio of audios) {
      const source = ctx.createMediaElementSource(audio);
      source.connect(gain).connect(ctx.destination);
    }
  }

  let fadeTimer;

  const fadeTo = (value, seconds = FADE_SECONDS) => {
    if (!gain || !ctx) return;
    ctx.resume?.();
    const now = ctx.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(value, now + Math.max(0, seconds));
  };

  const renderButton = () => {
    button.innerHTML = state.enabled ? ICONS.on : ICONS.off;
    button.classList.toggle("is-on", state.enabled);
    button.setAttribute("aria-pressed", state.enabled ? "true" : "false");
  };

  const playTrack = (index, fromStart = false) => {
    if (!state.loaded) return;
    const track = state.tracks[index];
    if (!track) return;
    state.index = index;
    const audio = audios[state.active];
    audio.src = `/music/${encodeURIComponent(track.name)}`;
    if (fromStart) audio.currentTime = 0;
    audio.play().catch((error) => {
      console.warn("[Rhine Lab] Music playback rejected:", error);
    });
  };

  const crossfade = () => {
    if (!state.enabled || !state.tracks.length) return;
    const nextIndex = (state.index + 1) % state.tracks.length;
    const outgoing = audios[state.active];
    const incoming = audios[1 - state.active];
    incoming.src = `/music/${encodeURIComponent(state.tracks[nextIndex].name)}`;
    incoming.currentTime = 0;
    incoming.play().then(() => {
      state.active = 1 - state.active;
      state.index = nextIndex;
      fadeTo(state.volume);
      fadeTimer = window.setTimeout(() => {
        outgoing.pause();
        outgoing.currentTime = 0;
      }, FADE_SECONDS * 1000);
    }).catch((error) => {
      console.warn("[Rhine Lab] Music crossfade failed:", error);
      outgoing.currentTime = Math.max(0, outgoing.duration - 0.1);
    });
  };

  audios[0].addEventListener("ended", () => {
    if (!state.enabled || state.tracks.length < 2) {
      audios[state.active].currentTime = 0;
      audios[state.active].play().catch(() => {});
      return;
    }
    crossfade();
  });

  for (const audio of audios) {
    audio.addEventListener("error", () => {
      console.warn("[Rhine Lab] Music decode failure:", audio.error);
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (!state.loaded) return;
    if (document.hidden) {
      fadeTo(0, 0.4);
    } else if (state.enabled) {
      fadeTo(state.volume, 0.6);
    }
  });

  const start = () => {
    if (!state.tracks.length) return;
    const audio = audios[state.active];
    audio.src = `/music/${encodeURIComponent(state.tracks[state.index].name)}`;
    audio.currentTime = 0;
    audio.play().then(() => fadeTo(state.volume)).catch((error) => {
      console.warn("[Rhine Lab] Music autoplay rejected; click the toggle to start.", error);
    });
  };

  const stop = () => {
    fadeTo(0, 0.4);
    window.setTimeout(() => {
      for (const audio of audios) { audio.pause(); audio.currentTime = 0; }
    }, 400);
  };

  button.addEventListener("click", () => {
    state.enabled = !state.enabled;
    persist("music.enabled", state.enabled ? "1" : "0");
    persist("music.volume", String(state.volume));
    renderButton();
    if (state.enabled) {
      if (ctx?.state === "suspended") ctx.resume();
      start();
    } else {
      stop();
    }
  });

  reduceMotion.addEventListener?.("change", () => {
    if (state.enabled) fadeTo(state.volume);
  });

  document.body.appendChild(button);
  renderButton();

  // First-play hint: if the page loaded without an existing user gesture,
  // browsers will block the autoplay attempt. A single click anywhere on the
  // body unlocks playback without forcing the user to find the toggle.
  let unlocked = false;
  const unlock = () => {
    if (unlocked || !state.enabled) return;
    unlocked = true;
    if (ctx?.state === "suspended") ctx.resume();
    if (state.loaded) start();
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    document.removeEventListener("touchstart", unlock, true);
  };
  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  document.addEventListener("touchstart", unlock, true);

  fetch(manifestUrl, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((manifest) => {
      if (!manifest || !Array.isArray(manifest.tracks)) throw new Error("invalid manifest");
      state.tracks = manifest.tracks;
      state.loaded = true;
      if (state.enabled) start();
    })
    .catch((error) => {
      console.warn("[Rhine Lab] Music manifest unavailable:", error);
      button.disabled = true;
      button.classList.add("is-empty");
      button.setAttribute("aria-label", "音乐未配置");
    });
})();