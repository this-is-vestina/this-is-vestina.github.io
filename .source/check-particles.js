/* particles.js 的运行时冒烟测试。
 *
 * 为什么需要：`node --check` 只验证语法，抓不到运行时问题。实际踩过的两个坑：
 *   1. resize() 里引用了后面才用 const 声明的 shCv → 暂时性死区 ReferenceError，
 *      把整个脚本连同后面 6 个动效一起干掉，而语法检查是绿的。
 *   2. 绘制循环里漏掉了 ctx.clearRect → 主画布从不清空，每帧绘制全部累积，
 *      拖尾永远不消失。这个坑我的第一版桩测试**也没抓到**，因为桩里的
 *      clearRect / drawImage 都是空实现，只能数调用次数，验证不了渲染。
 *
 * 所以现在桩会真的维护画布状态：
 *   · 记录每帧是否调用过 clearRect
 *   · 若某帧有绘制却没清空，直接判定为「拖尾会残留」并报错
 *
 * 用法：  node .source/check-particles.js
 */
const fs = require("fs");
const path = require("path");

let now = 0;
const listeners = {};
let rafQueue = [];

/* ---- 画布桩：真的记录「清了没」和「画了几次」---- */
function makeCtx(el) {
  const g = { addColorStop() {} };
  const state = {
    clearedFrames: 0, drawnFrames: 0, missingClear: 0,
    drawCallsTotal: 0, frameDraws: 0, clearedThisFrame: false,
  };
  el._state = state;
  const ctx = {
    canvas: el,
    globalAlpha: 1, globalCompositeOperation: "source-over", fillStyle: "",
    createRadialGradient: () => g,
    fillRect() {},
    clearRect() { state.clearedThisFrame = true; state.clearedFrames++; },
    drawImage() {
      state.drawCallsTotal++; state.frameDraws++;
      if (el.id === "rhine-firefly-canvas" && !state.clearedThisFrame) state.missingClear++;
    },
    beginPath() {}, arc() {}, fill() {},
  };
  return ctx;
}
function makeEl(tag) {
  const el = {
    tagName: tag, id: "", className: "", style: {}, children: [],
    width: 300, height: 150,
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c,f){ f ? this._s.add(c) : this._s.delete(c); }, contains(c){return this._s.has(c);} },
    setAttribute(){}, getAttribute(){return null;},
    appendChild(c){ this.children.push(c); return c; }, remove(){},
    addEventListener(t,f){ (this._l=this._l||{}); (this._l[t]=this._l[t]||[]).push(f); },
    getBoundingClientRect:()=>({left:0,top:0,width:300,height:200}),
    getContext(){ return this._ctx || (this._ctx = makeCtx(this)); },
    querySelectorAll:()=>[], closest:()=>null,
  };
  return el;
}

const body = makeEl("body");
global.document = { body, documentElement: makeEl("html"), createElement: makeEl,
  getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[],
  addEventListener(t,f){ (listeners[t]=listeners[t]||[]).push(f); } };
global.window = { innerWidth:1600, innerHeight:900, devicePixelRatio:2,
  matchMedia:()=>({matches:false}),
  addEventListener(t,f){ (listeners[t]=listeners[t]||[]).push(f); } };
global.performance = { now:()=>now };
global.requestAnimationFrame = f => { rafQueue.push(f); return 1; };
global.cancelAnimationFrame = ()=>{};

/* ---- 执行 ---- */
try {
  new Function(fs.readFileSync(path.join(__dirname,"..","static/js/particles.js"),"utf8"))();
  console.log("✅ 脚本执行无异常");
} catch (e) {
  console.log("❌ 运行时错误:", e.constructor.name, "-", e.message);
  console.log(e.stack.split("\n").slice(1,4).join("\n"));
  process.exit(1);
}

const cv = body.children.find(c => c.id === "rhine-firefly-canvas");
if (!cv) { console.log("❌ 未创建 canvas —— initFirefly 可能没跑到"); process.exit(1); }
const st = cv._state;
console.log(`✅ canvas 已创建  背板 ${cv.width}×${cv.height}`);

function move(x,y){ for (const f of (listeners["pointermove"]||[])) f({clientX:x,clientY:y}); }

function step(n, moveFn) {
  const counts = [];
  for (let i=0;i<n;i++){
    const f = rafQueue.shift(); if(!f) break;
    now += 16.67;
    if (moveFn) moveFn();
    st.clearedThisFrame = false; st.frameDraws = 0;
    try { f(now); } catch (e) {
      console.log(`❌ 第 ${i} 帧异常:`, e.message); process.exit(1);
    }
    counts.push(Math.max(0, st.frameDraws - 1));  // 减去合成离屏层那一次
  }
  return counts;
}

console.log("\n阶段 1：静止 2 秒");
let x = 400;
const idle = step(120, null);
console.log(`  存活粒子 max ${Math.max(...idle)}`);

console.log("阶段 2：匀速移动 6 秒（84px/s）");
const moving = step(360, () => { x += 1.4; move(x, 450); });
console.log(`  存活粒子 min ${Math.min(...moving)} / max ${Math.max(...moving)}`);
if (Math.max(...moving) > 200) console.log("  ⚠️ 粒子数失控增长");

console.log("阶段 3：停下 5 秒，看是否消亡");
const after = step(300, null);
const tail = after.slice(150);
console.log(`  最后 2.5 秒存活 max ${Math.max(...tail)}  （idle 补点约 13 为正常）`);

/* ---- 判定 ---- */
console.log("\n" + "=".repeat(52));
let fail = 0;
if (st.missingClear > 0) {
  console.log(`❌ 有 ${st.missingClear} 次绘制发生在未清空的画布上`);
  console.log("   → 每帧绘制会累积，拖尾不会消失，且越拖越粗");
  fail = 1;
} else {
  console.log("✅ 每帧绘制前都清空了主画布（拖尾不会残留）");
}
if (Math.max(...tail) > 30) {
  console.log(`❌ 停下 2.5 秒后仍有 ${Math.max(...tail)} 颗粒子，疑似不消亡`);
  fail = 1;
} else {
  console.log("✅ 粒子正常消亡，无累积");
}
console.log(fail ? "\n检查未通过" : "\n全部通过");
process.exit(fail);
