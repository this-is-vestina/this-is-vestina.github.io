/* tsparticles 配置 — 莱茵生命风格粒子尾迹
 * 鼠标悬停 → 粒子吸附成网
 * 鼠标点击 → 爆发新增 6 颗粒子
 * 文档: https://particles.js.org/
 */
(function () {
  // 只在首页（存在 #tsparticles 容器时）初始化
  if (!document.getElementById("tsparticles")) return;

  if (typeof tsParticles === "undefined") {
    console.warn("[Rhine Lab] tsParticles CDN not loaded yet — particles disabled.");
    return;
  }

  // 根据当前主题挑选配色（light 暗橙 / dark 亮橙 + 青色连线）
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const isDark = theme === "dark";
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
          grab: {
            distance: 160,
            links: { opacity: 0.6 },
          },
          repulse: { distance: 80, duration: 0.3 },
        },
      },
    },
  });

  // 切换主题时刷新粒子配色（监听 blowfish 的 appearance change 事件）
  document.addEventListener("appearancechange", (e) => {
    const newIsDark = (e.detail || e.target || document.documentElement).getAttribute?.("data-theme") === "dark"
      || (e.detail === "dark");
    // 简单方案：reload particles
    const newColors = newIsDark
      ? { particle: "#FF6B1A", link: "#5BC0EB" }
      : { particle: "#FF6B1A", link: "#0F1E2E" };
    tsParticles.domItem(0)?.refresh?.();
  });
})();