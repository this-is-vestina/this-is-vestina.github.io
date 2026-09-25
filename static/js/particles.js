/* Rhine Lab — 首页动效集合
 * 1. tsparticles 粒子（鼠标交互：悬停吸附 + 点击爆发）
 * 2. 自定义光标荧光团 + 圆环（跟随鼠标移动）
 * 文档: https://particles.js.org/
 */
(function () {
  // === 光标荧光团（先加载，不依赖 tsparticles）===
  function initCursorGlow() {
    // 仅在非触摸设备
    if (window.matchMedia("(hover: none)").matches) return;

    // 创建 DOM
    const ring = document.createElement("div");
    ring.id = "rhine-cursor-ring";
    document.body.appendChild(ring);

    const glow = document.createElement("div");
    glow.id = "rhine-cursor-glow";
    document.body.appendChild(glow);

    // 用 rAF 节流
    let rafId = null;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX, ringY = targetY;
    let glowX = targetX, glowY = targetY;

    function tick() {
      // 圆环更跟手（直接相乘）
      ringX += (targetX - ringX) * 0.35;
      ringY += (targetY - ringY) * 0.35;
      // 荧光团滞后更明显
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;

      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";

      rafId = requestAnimationFrame(tick);
    }

    document.addEventListener("mousemove", (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      ring.classList.add("is-active");
      glow.classList.add("is-active");
    });

    document.addEventListener("mouseleave", () => {
      ring.classList.remove("is-active");
      glow.classList.remove("is-active");
    });

    // 鼠标按下：荧光团放大
    document.addEventListener("mousedown", () => {
      glow.style.width = "60px";
      glow.style.height = "60px";
    });
    document.addEventListener("mouseup", () => {
      glow.style.width = "40px";
      glow.style.height = "40px";
    });

    // hover 在链接上：圆环变橙 + 放大
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest("a, button, .rhine-card")) {
        ring.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("a, button, .rhine-card")) {
        ring.classList.remove("is-hover");
      }
    });

    tick();
  }

  initCursorGlow();

  // === tsparticles 粒子（仅首页，有 #tsparticles 容器时）===
  if (!document.getElementById("tsparticles")) return;

  if (typeof tsParticles === "undefined") {
    console.warn("[Rhine Lab] tsParticles CDN not loaded — particles disabled.");
    return;
  }

  // 根据当前主题挑选配色
  const isDark = (document.documentElement.getAttribute("data-theme") || "light") === "dark";
  const colors = isDark
    ? { particle: "#FF6B1A", link: "#5BC0EB" }
    : { particle: "#FF6B1A", link: "#0F1E2E" };

  tsParticles.load({
    id: "tsparticles",
    options: {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      background: { color: { value: "transparent" } },
      particles: {
        number: {
          value: 50,
          density: { enable: true, area: 900 },
        },
        color: { value: colors.particle },
        shape: { type: "circle" },
        opacity: {
          value: 0.55,
          random: true,
          animation: { enable: true, speed: 0.6, sync: false },
        },
        size: {
          value: 2.5,
          random: true,
          animation: { enable: true, speed: 1.5, sync: false },
        },
        move: {
          enable: true,
          speed: 0.7,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "out" },
        },
        links: {
          enable: true,
          distance: 130,
          color: colors.link,
          opacity: 0.25,
          width: 1,
        },
      },
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: true, mode: "grab" },
          resize: true,
        },
        modes: {
          push: { quantity: 6 },
          grab: { distance: 160, links: { opacity: 0.6 } },
          repulse: { distance: 80, duration: 0.3 },
        },
      },
    },
  });
})();