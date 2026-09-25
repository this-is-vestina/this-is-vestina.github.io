/* vestina — 站点交互脚本（全站加载）
 * 1. 萤火虫：鼠标移动时生成白色/青色小光点，渐隐飘走
 * 2. 光标圆环 + 荧光团（跟随鼠标，悬停链接放大）
 * 3. hero 引言每 15 秒循环播放
 * 4. header 自动隐藏（鼠标划到顶部才浮现）
 * 5. 卡片 3D 倾斜（跟随鼠标）
 * 6. 首页 hero 上方 header 透明化
 * 7. tsparticles 粒子（仅首页；连线已关闭）
 * 文档: https://particles.js.org/
 */
(function () {
  /* 每个动效各自 try/catch。
   * 有过一次教训：initFirefly 里一个暂时性死区 ReferenceError 抛出来之后，
   * 后面 6 个动效（光标、引言轮播、header 自动隐藏、卡片倾斜、粒子）全部没执行，
   * 而控制台只有一行报错，很难看出是「一个坏了连累全部」。
   * 包起来之后，坏掉的那个会在控制台单独报错，其余照常工作。 */
  function safe(name, fn) {
    try {
      fn();
    } catch (e) {
      console.error(`[vestina] ${name} 初始化失败:`, e);
    }
  }

  /* === 1. 萤火虫（canvas 粒子发射器，全站启用） ===
   *
   * 演进过程与踩过的坑：
   *
   *   v1 全向随机角度 + 随机距离 + 定时器发射
   *      → 有烟花感，但间距随手速变化，慢速移动时在光标处堆成一坨
   *   v2 沿运动轴窄锥喷射 + 按路程发射
   *      → 方向感强，但像喷气口，烟花感丢失，拖尾极长
   *   v3 全向 + 速度体现方向感 + 缩短生命
   *      → 拖尾短了，但把速度拉到 130px/s 后变成「火箭发射」，又急又乱
   *   v4（当前）换成极坐标光环模型
   *
   * 为什么不再用世界坐标：仿真显示「慢速粒子」与「短拖尾」在数学上不可兼得 ——
   * 粒子飞得慢就会长时间留在出生点，而光标继续前进，拖尾必然等于
   * 生命 × 光标速度。要同时做到慢、又要围着鼠标，粒子就必须锚定在
   * 光标自己的坐标系里。
   *
   * 现在每颗粒子存的是相对光标的极坐标 (r, θ)，而不是绝对位置：
   *   · r 缓慢向外漂移并减速 → 从鼠标中心「慢慢飞出来」
   *   · θ 缓慢绕转           → 「环绕着鼠标」
   *   · 整个光环跟随光标时带一点滞后 → 快速移动时留一条短尾，不至于像贴纸
   * 这样既慢又始终围着鼠标，而且根本没有长拖尾。
   */
  function initFirefly() {
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const cv = document.createElement("canvas");
    cv.id = "rhine-firefly-canvas";
    cv.setAttribute("aria-hidden", "true");
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");

    // 暗色晕的离屏层。必须在这里就创建 —— 下面的 resize() 会用到它。
    // 为什么需要离屏：直接在主画布上逐颗 source-over 绘制，alpha 会乘法累积
    // 1-(1-a)^N，8 颗重叠就是 0.91，近乎不透明的黑块，粒子一集中就糊成一团。
    // 放到离屏层上自由叠加（叠加到饱和也无所谓），最后以固定 alpha 一次性
    // 合成回主画布，重叠再多也不会超过这个上限。
    const shCv = document.createElement("canvas");
    const sctx = shCv.getContext("2d");

    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    function resize() {
      W = cv.width = Math.floor(window.innerWidth * DPR);
      H = cv.height = Math.floor(window.innerHeight * DPR);
      shCv.width = W;
      shCv.height = H;
      cv.style.width = window.innerWidth + "px";
      cv.style.height = window.innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);

    // 预渲染发光精灵：比每帧 createRadialGradient 快得多，柔光也更自然
    function makeSprite(rgb, maxAlpha) {
      const S = 64;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const g = c.getContext("2d");
      const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grad.addColorStop(0, `rgba(${rgb},${maxAlpha})`);
      grad.addColorStop(0.22, `rgba(${rgb},${maxAlpha * 0.55})`);
      grad.addColorStop(0.5, `rgba(${rgb},${maxAlpha * 0.16})`);
      grad.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = grad;
      g.fillRect(0, 0, S, S);
      return c;
    }
    const SPR_BRIGHT = [makeSprite("255,255,255", 1), makeSprite("91,192,235", 1)];
    // 暗色晕精灵，两种颜色共用：纯白点子在米白背景上没有它就会消失
    const SPR_DARK = makeSprite("15,30,46", 1);

    const CYAN_RATIO = 0.3;

    const TAU = Math.PI * 2;
    const SPAWN_MS = 46;     // 移动中每 ~46ms 生一颗（≈22/秒）—— 观感「稀疏」的关键
    const IDLE_GAP = 900;    // 静止时多久补一次
    const IDLE_COUNT = 5;
    // 光环中心的跟随阻尼。拖尾现在交给每颗粒子自己的 follow，
    // 所以这里可以跟得紧一些，光环整体不会因为滞后而偏移太远。
    const FOLLOW = 18;

    const pool = [];
    let px = 0, py = 0;      // 光标真实位置（设备像素）
    let hx = 0, hy = 0;      // 光环中心（带阻尼，略滞后于光标）
    let started = false;
    let lastMove = -1;
    let nextSpawn = 0;
    let nextIdle = 0;

    window.addEventListener(
      "pointermove",
      (e) => {
        px = e.clientX * DPR;
        py = e.clientY * DPR;
        if (!started) {
          started = true;
          hx = px; hy = py;
        }
        lastMove = performance.now();
      },
      { passive: true }
    );

    function spawn() {
      pool.push({
        // 锚点：以自己的速度追光环中心。跟随弱 → 被甩在后面形成拖尾，
        // 跟随强 → 紧贴光标组成光环。静止时所有锚点都会收敛回中心。
        cx: hx, cy: hy,
        // 跟随强度：慢 3 / 快 31，跨度大才有「一簇散开成尾」的层次
        follow: 3 + Math.random() * 28,

        // 轨道偏移：相对锚点的极坐标，刚性演化，不受 follow 影响
        r: (3 + Math.random() * 9) * DPR,
        theta: Math.random() * TAU,
        dr: (13 + Math.random() * 24) * DPR,      // 向外漂移 → 「慢慢飞出来」
        dtheta: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 1.3),

        x: hx, y: hy,
        life: 0,
        max: 1.1 + Math.random() * 1.3,
        size: (0.8 + Math.random() * 1.4) * DPR,
        spr: SPR_BRIGHT[Math.random() < CYAN_RATIO ? 1 : 0],
      });
    }

    const damp = (a, b, lambda, dt) => b + (a - b) * Math.exp(-lambda * dt);

    let prev = performance.now();
    function frame(now) {
      const dt = Math.min((now - prev) / 1000, 0.05);   // 卡顿时钳制，避免爆炸
      prev = now;

      if (started) {
        // 光环中心带阻尼地跟随光标 —— 快速移动时留下一点滞后，不至于像贴上去的
        hx = damp(hx, px, FOLLOW, dt);
        hy = damp(hy, py, FOLLOW, dt);

        const moving = now - lastMove <= 140;
        if (moving && now >= nextSpawn) {
          nextSpawn = now + SPAWN_MS;
          spawn();
        } else if (!moving && now >= nextIdle) {
          nextIdle = now + IDLE_GAP;
          for (let i = 0; i < IDLE_COUNT; i++) spawn();
        }
      }

      // --- 先推进物理：位置只算一次，绘制两遍都读它
      // （旧版暗色晕那一遍读的是上一帧的位置，会差一帧）
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.life += dt;
        if (p.life >= p.max) {
          pool.splice(i, 1);
          continue;
        }

        // ① 锚点追光环中心 —— 唯一的滞后来源
        const ka = 1 - Math.exp(-p.follow * dt);   // 指数趋近，恒稳定不过冲
        p.cx += (hx - p.cx) * ka;
        p.cy += (hy - p.cy) * ka;

        // ② 轨道偏移刚性演化 —— 不受 follow 影响，光环形状得以保持
        p.r += p.dr * dt;
        p.dr *= Math.pow(0.72, dt);          // 外扩逐渐减速，最终停在一个半径上
        p.theta += p.dtheta * dt;
        p.dtheta *= Math.pow(0.6, dt);       // 绕转也慢慢停

        p.x = p.cx + Math.cos(p.theta) * p.r;
        p.y = p.cy + Math.sin(p.theta) * p.r;
      }

      // >>> 清空主画布 <<<
      // 这一行绝不能少：少了它，每帧的绘制会全部累积在画布上，
      // 拖尾永远不消失，并且越拖越粗，最后糊成一大片白光。
      ctx.clearRect(0, 0, W, H);

      // 生命进度 → 透明度与尺寸。前 14% 淡入、后 70% 淡出；
      // 尺寸先快速涨开再保持，这就是「盛开」的感觉
      function alphaOf(u) {
        return Math.min(u / 0.14, 1) * (1 - Math.min(Math.max((u - 0.3) / 0.7, 0), 1));
      }
      function diaOf(p, u) {
        return p.size * 7.5 * (0.5 + 0.8 * Math.min(u / 0.3, 1));
      }

      // --- 第一遍：暗色晕（离屏合成，见上方说明）
      if (pool.length) {
        // 只处理粒子覆盖到的区域，避免每帧全屏合成
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (let i = 0; i < pool.length; i++) {
          const p = pool[i];
          const d = diaOf(p, p.life / p.max);
          if (p.x - d < x0) x0 = p.x - d;
          if (p.y - d < y0) y0 = p.y - d;
          if (p.x + d > x1) x1 = p.x + d;
          if (p.y + d > y1) y1 = p.y + d;
        }
        x0 = Math.max(0, Math.floor(x0));
        y0 = Math.max(0, Math.floor(y0));
        x1 = Math.min(W, Math.ceil(x1));
        y1 = Math.min(H, Math.ceil(y1));
        const bw = x1 - x0, bh = y1 - y0;

        if (bw > 0 && bh > 0) {
          sctx.clearRect(x0, y0, bw, bh);
          sctx.globalCompositeOperation = "source-over";
          for (let i = 0; i < pool.length; i++) {
            const p = pool[i];
            const a = alphaOf(p.life / p.max);
            const d = diaOf(p, p.life / p.max) * 1.03;
            sctx.globalAlpha = a;                 // 层内画满，由合成时的 alpha 统一压
            sctx.drawImage(SPR_DARK, p.x - d / 2, p.y - d / 2, d, d);
          }
          ctx.globalCompositeOperation = "source-over";
          // 0.26 = 修复前「单颗粒子」的暗度，即原本想要的观感；
          // 现在它是上限，不再随重叠数增长
          ctx.globalAlpha = 0.26;
          ctx.drawImage(shCv, x0, y0, bw, bh, x0, y0, bw, bh);
        }
      }

      // --- 第二遍：亮色叠加发光（lighter）
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < pool.length; i++) {
        const p = pool[i];
        const u = p.life / p.max;
        const d = diaOf(p, u);
        ctx.globalAlpha = alphaOf(u) * 0.9;
        ctx.drawImage(p.spr, p.x - d / 2, p.y - d / 2, d, d);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  safe("萤火虫", initFirefly);

  /* === 2. 光标圆环 + 荧光团（跟随鼠标，悬停链接时放大） ===
   * 用 rAF 做 tweening：圆环跟手（系数大），荧光团滞后（系数小），
   * 产生「拖尾」的层次感。两层的位移都直接写 style.left/top。
   */
  function initCursorGlow() {
    if (window.matchMedia("(hover: none)").matches) return;

    const ring = document.createElement("div");
    ring.id = "rhine-cursor-ring";
    document.body.appendChild(ring);

    const glow = document.createElement("div");
    glow.id = "rhine-cursor-glow";
    document.body.appendChild(glow);

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let ringX = targetX, ringY = targetY;
    let glowX = targetX, glowY = targetY;

    function tick() {
      ringX += (targetX - ringX) * 0.35;
      ringY += (targetY - ringY) * 0.35;
      glowX += (targetX - glowX) * 0.12;
      glowY += (targetY - glowY) * 0.12;

      ring.style.left = ringX + "px";
      ring.style.top = ringY + "px";
      glow.style.left = glowX + "px";
      glow.style.top = glowY + "px";

      requestAnimationFrame(tick);
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

    // 按下时荧光团放大
    document.addEventListener("mousedown", () => {
      glow.classList.add("is-press");
    });
    document.addEventListener("mouseup", () => {
      glow.classList.remove("is-press");
    });

    // 悬停在可交互元素上：圆环放大 + 转橙
    document.addEventListener("mouseover", (e) => {
      if (e.target.closest("a, button, .rhine-below-card, .rhine-hero-nav-item")) {
        ring.classList.add("is-hover");
      }
    });
    document.addEventListener("mouseout", (e) => {
      if (e.target.closest("a, button, .rhine-below-card, .rhine-hero-nav-item")) {
        ring.classList.remove("is-hover");
      }
    });

    tick();
  }
  safe("光标圆环", initCursorGlow);

  /* === 3. Hero 引言循环（每 15 秒切换一次） === */
  function initQuoteRotation() {
    const el = document.getElementById("rhine-hero-quote");
    if (!el) return;
    let quotes;
    try {
      quotes = JSON.parse(el.getAttribute("data-quotes") || "[]");
    } catch (e) {
      console.warn("[Rhine Lab] Failed to parse quotes:", e);
      return;
    }
    if (!quotes.length) return;

    let idx = 0;
    function rotate() {
      idx = (idx + 1) % quotes.length;
      el.style.opacity = "0";
      setTimeout(() => {
        el.textContent = quotes[idx];
        el.style.opacity = "";
      }, 600);
    }
    setInterval(rotate, 15000);
  }
  safe("引言轮播", initQuoteRotation);

  /* === 4. 自动隐藏 header ===
   * 鼠标不在顶部时 header 淡出并让出指针事件，划到顶部才浮现
   * （参考 daily.yybb.us）。触屏设备不做隐藏，否则手机没法点导航。
   */
  function initAutoHideHeader() {
    if (window.matchMedia("(hover: none)").matches) return;

    const root = document.documentElement;
    const TRIGGER = 90; // px —— 鼠标进入顶部 90px 就显示

    function setVisible(visible) {
      root.classList.toggle("rhine-header-visible", visible);
    }

    setVisible(false); // 初始隐藏

    document.addEventListener("mousemove", (e) => setVisible(e.clientY <= TRIGGER));
    document.addEventListener("mouseleave", () => setVisible(false));

    // 键盘 Tab 进入 header 时也要显示，否则无法用键盘导航
    document.addEventListener("focusin", (e) => {
      if (e.target.closest("header")) setVisible(true);
    });
    document.addEventListener("focusout", (e) => {
      if (e.target.closest("header")) setVisible(false);
    });
  }
  safe("header 自动隐藏", initAutoHideHeader);

  /* === 5. 卡片 3D 倾斜（跟随鼠标） ===
   * 把指针在卡片内的相对位置映射成 rotateX / rotateY，并轻微抬起。
   * 只写 CSS 变量，transform 的组装交给 custom.css —— JS 不碰样式细节。
   *
   * 逐卡片绑定而不是事件委托：mousemove 只在指针真的位于卡片上时触发，
   * 不用每次移动都做 closest() 判断；rect 也在进入时缓存一次，
   * 避免每个 mousemove 都读 getBoundingClientRect（会打乱渲染管线）。
   */
  function initCardTilt() {
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const MAX_TILT = 7;   // 最大旋转角度（deg）—— 再大就晕了
    const LIFT = -6;      // 悬停时抬升的像素

    function bind(card) {
      let rect = null;
      let raf = null;
      let last = null;

      function apply() {
        raf = null;
        if (!last || !rect) return;

        // 归一化到 -0.5 ~ 0.5
        const px = (last.x - rect.left) / rect.width - 0.5;
        const py = (last.y - rect.top) / rect.height - 0.5;

        card.style.setProperty("--rhine-tilt-y", (px * MAX_TILT * 2).toFixed(2) + "deg");
        // 鼠标在上方 → 卡片上部后仰，rotateX 取负
        card.style.setProperty("--rhine-tilt-x", (-py * MAX_TILT * 2).toFixed(2) + "deg");
      }

      card.addEventListener("mouseenter", () => {
        rect = card.getBoundingClientRect();
        card.style.setProperty("--rhine-tilt-lift", LIFT + "px");
        card.classList.add("is-tilting");
      });

      card.addEventListener("mousemove", (e) => {
        last = { x: e.clientX, y: e.clientY };
        if (!raf) raf = requestAnimationFrame(apply); // 每帧最多算一次
      });

      card.addEventListener("mouseleave", (e) => {
        // 卡片倾斜后边缘会位移，光标贴着边走时会反复触发 enter/leave
        // 造成抖动。用缓存的原始 rect（外扩 24px）复核一次，确认真的离开了。
        const PAD = 24;
        const near =
          rect &&
          e.clientX >= rect.left - PAD && e.clientX <= rect.right + PAD &&
          e.clientY >= rect.top - PAD && e.clientY <= rect.bottom + PAD;
        if (near) return;

        if (raf) cancelAnimationFrame(raf);
        raf = null;
        rect = null;
        card.style.setProperty("--rhine-tilt-x", "0deg");
        card.style.setProperty("--rhine-tilt-y", "0deg");
        card.style.setProperty("--rhine-tilt-lift", "0px");
        card.classList.remove("is-tilting");
      });
    }

    document.querySelectorAll(".article-link--card, .rhine-col, .rhine-below-card")
      .forEach(bind);
  }
  safe("卡片 3D 倾斜", initCardTilt);

  /* === 6. 首页顶部：header 透明化 + 白字 ===
   * 当页面停在 hero 上方时给 <html> 加 .rhine-over-hero，
   * CSS 据此把毛玻璃底去掉、文字转白；滚过 hero 就恢复米白底深灰字。
   * 只有首页存在 .rhine-hero，其他页面这个类永远不会加。
   */
  function initAdaptiveHeader() {
    const hero = document.querySelector(".rhine-hero");
    if (!hero) return;

    const root = document.documentElement;
    let ticking = false;

    function update() {
      const heroHeight = hero.getBoundingClientRect().height;
      // 留 80px 余量：滚到 hero 快结束时提前恢复米白底
      const overHero = window.scrollY < heroHeight - 80;
      root.classList.toggle("rhine-over-hero", overHero);
      ticking = false;
    }

    window.addEventListener(
      "scroll",
      () => {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(update);
        }
      },
      { passive: true }
    );
    window.addEventListener("resize", update);
    update();
  }
  safe("header 透明化", initAdaptiveHeader);

  /* === 7. tsparticles 粒子（仅 hero 页面，有 #tsparticles 容器时） === */
  if (!document.getElementById("tsparticles")) return;

  if (typeof tsParticles === "undefined") {
    console.warn("[Rhine Lab] tsParticles CDN not loaded — particles disabled.");
    return;
  }

  // 注意：shape.type = "circle" 的粒子不需要每帧计算连线，
  // 关掉 links 后 tsparticles 的开销主要在粒子的移动与绘制上，很轻。
  const particleColor = "#FF6B1A";

  tsParticles.load({
    id: "tsparticles",
    options: {
      fullScreen: { enable: false },
      detectRetina: true,
      fpsLimit: 60,
      background: { color: { value: "transparent" } },
      particles: {
        number: { value: 35, density: { enable: true, area: 900 } },
        color: { value: particleColor },
        shape: { type: "circle" },
        opacity: {
          value: 0.4,
          random: true,
          animation: { enable: true, speed: 0.6, sync: false },
        },
        size: {
          value: 2.2,
          random: true,
          animation: { enable: true, speed: 1.5, sync: false },
        },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none",
          random: true,
          straight: false,
          outModes: { default: "out" },
        },
        // 关闭连线 —— 就是那个「暗色线条连成三角网格」的动效
        links: { enable: false },
      },
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: true, mode: "grab" },
          resize: true,
        },
        modes: {
          push: { quantity: 4 },
          // grab 的 links 也要关，否则鼠标划过时又会拉起一片连线
          grab: { distance: 140, links: { opacity: 0 } },
          repulse: { distance: 70, duration: 0.3 },
        },
      },
    },
  });
})();