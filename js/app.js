/* ===========================================================
   耍起学习电路分析 —— 应用逻辑
   功能：账号(localStorage) / hash路由 / 学习时长计时 /
        课后练习打分 / 进度与错题记录 / 个人中心
   说明：纯前端、零后端、零依赖，直接丢 GitHub Pages 即可运行
   =========================================================== */

(function () {
  "use strict";

  /* ---------------- 存储键 ---------------- */
  const KEY_USERS = "sq_users";        // { username: { pw: hash, createdAt } }
  const KEY_SESSION = "sq_session";    // 当前登录用户名
  const KEY_PROGRESS = "sq_progress";  // { username: { moduleId: {...} } }

  /* ---------------- 状态 ---------------- */
  const state = {
    user: null,            // 当前用户名
    activeModule: null,    // 正在计时的模块 id
    timerId: null,         // setInterval id
    secs: 0,               // 当前模块本次累计秒（内存）
    flushId: null,
  };

  /* ---------------- 工具函数 ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function load(key, def) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def; }
    catch (e) { return def; }
  }
  function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

  // 简单字符串哈希（仅用于本地演示，非安全加密）
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function formatDuration(sec) {
    sec = Math.floor(sec || 0);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}小时${m}分${s}秒`;
    if (m > 0) return `${m}分${s}秒`;
    return `${s}秒`;
  }

  function getUsers() { return load(KEY_USERS, {}); }
  function getProgressAll() { return load(KEY_PROGRESS, {}); }
  function getMyProgress() {
    const all = getProgressAll();
    return all[state.user] || {};
  }
  function saveMyProgress(mod) {
    const all = getProgressAll();
    all[state.user] = all[state.user] || {};
    all[state.user] = Object.assign(all[state.user], mod);
    save(KEY_PROGRESS, all);
  }
  function moduleProgress(id) {
    const m = getMyProgress();
    return m[id] || { timeSpent: 0, bestScore: 0, attempts: 0, completed: false, wrong: [] };
  }

  /* ---------------- 计时器 ---------------- */
  function startTimer(moduleId) {
    stopTimer(); // 先停掉旧的
    state.activeModule = moduleId;
    state.secs = 0;
    state.timerId = setInterval(function () {
      state.secs += 1;
      const pill = $("#timer-secs");
      if (pill) pill.textContent = formatDuration(state.secs);
    }, 1000);
    // 每 8 秒把时长写进存储
    state.flushId = setInterval(function () { flushTime(); }, 8000);
  }

  function flushTime() {
    if (!state.activeModule || !state.user) return;
    const id = state.activeModule;
    const p = moduleProgress(id);
    p.timeSpent = (p.timeSpent || 0) + state.secs;
    state.secs = 0;
    saveMyProgress({ [id]: p });
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    if (state.flushId) clearInterval(state.flushId);
    state.timerId = null; state.flushId = null;
    flushTime();
    state.activeModule = null;
  }

  // 页面切到后台时暂停计时，回到前台恢复（避免虚高时长）
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      if (state.timerId) { clearInterval(state.timerId); state.timerId = null; flushTime(); }
    } else if (state.activeModule && !state.timerId) {
      state.timerId = setInterval(function () {
        state.secs += 1;
        const pill = $("#timer-secs");
        if (pill) pill.textContent = formatDuration(state.secs);
      }, 1000);
    }
  });
  window.addEventListener("beforeunload", function () { stopTimer(); });

  /* ---------------- 顶部导航 ---------------- */
  function renderTopbar() {
    const nav = $("#nav-links");
    let html = `
      <button data-route="#/home">🏠 首页</button>
      <button data-route="#/study">📚 学习</button>`;
    if (state.user) {
      html += `<button data-route="#/profile">👤 ${escapeHtml(state.user)}</button>
               <button id="btn-logout">退出</button>`;
    } else {
      html += `<button data-route="#/auth">🔑 登录/注册</button>`;
    }
    nav.innerHTML = html;
    nav.querySelectorAll("button[data-route]").forEach(function (b) {
      b.addEventListener("click", function () { location.hash = b.getAttribute("data-route"); });
    });
    const lo = $("#btn-logout");
    if (lo) lo.addEventListener("click", logout);
    // 高亮当前
    const cur = location.hash || "#/home";
    nav.querySelectorAll("button[data-route]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-route") === cur);
    });
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- 视图：首页 ---------------- */
  function renderHome() {
    const app = $("#app");
    const totalMods = window.COURSE_DATA.length;
    const myProg = getMyProgress();
    let doneCount = 0;
    Object.keys(myProg).forEach(function (k) { if (myProg[k].completed) doneCount++; });
    let totalTime = 0;
    Object.keys(myProg).forEach(function (k) { totalTime += myProg[k].timeSpent || 0; });

    app.innerHTML = `
      <div class="hero">
        <h1>⚡ 耍起学习电路分析</h1>
        <p>专为“没摸过电路板”的同学打造：认元器件、学焊接、会用万用表，边看边练还会打分。</p>
        <div class="tags">
          <span>电阻 / 电容</span><span>二极管 / 三极管</span><span>集成电路</span>
          <span>开关 / 计数器 / 计时器</span><span>万用表</span><span>焊接实操</span><span>测量通电</span>
        </div>
        <button class="btn" data-route="#/study">🚀 开始学习</button>
        <button class="btn btn-ghost" data-route="#/auth">${state.user ? "已登录：" + escapeHtml(state.user) : "注册/登录 记录进度"}</button>
      </div>

      <div class="card">
        <h2>📊 你的学习概览</h2>
        <div class="stats">
          <div class="stat"><div class="num">${doneCount}/${totalMods}</div><div class="label">已完成模块</div></div>
          <div class="stat"><div class="num">${formatDuration(totalTime)}</div><div class="label">累计学习时长</div></div>
          <div class="stat"><div class="num">${state.user ? "已登录" : "未登录"}</div><div class="label">账号状态</div></div>
        </div>
        <p class="hint" style="margin-top:12px">提示：注册登录后，你的学习时长、练习题分数和进度会自动保存在本机浏览器里，下次打开还在。</p>
      </div>

      <div class="card">
        <h2>💡 这个网站怎么用</h2>
        <h3>1. 认元器件</h3>
        <p>每个元件都有图解（手绘电路符号）+ 文字讲解，先看“它长啥样、干啥用”。</p>
        <h3>2. 看视频</h3>
        <p>每节配了 B站免费教学视频关键词，点一下直接去 B站看老师讲解，不占本地空间、加载飞快。</p>
        <h3>3. 做练习</h3>
        <p>学完做几道选择题，当场打分、给解析，答错的会记进“薄弱点”，方便复习。</p>
        <h3>4. 看进度</h3>
        <p>个人中心能看到每模块花了多久、最好考多少分，学习更有成就感。</p>
      </div>
    `;
    app.querySelectorAll("button[data-route]").forEach(function (b) {
      b.addEventListener("click", function () { location.hash = b.getAttribute("data-route"); });
    });
  }

  /* ---------------- 视图：学习（模块网格） ---------------- */
  function renderStudy() {
    const app = $("#app");
    const myProg = getMyProgress();
    let cards = "";
    window.COURSE_DATA.forEach(function (m) {
      const p = myProg[m.id] || {};
      const pct = p.completed ? 100 : Math.min(100, (p.attempts || 0) > 0 ? 40 : 0);
      const done = p.completed ? `<span class="done-badge">已通关</span>` : "";
      cards += `
        <div class="module" data-id="${m.id}">
          ${done}
          <div class="emoji">${m.emoji}</div>
          <div class="title">${escapeHtml(m.title)}</div>
          <div class="tagline">${escapeHtml(m.tagline)}</div>
          <div class="progress-mini"><i style="width:${pct}%"></i></div>
          <div class="progress-text">${p.completed ? "最佳 " + (p.bestScore || 0) + " 分" : (p.attempts ? "已练 " + p.attempts + " 次" : "还没开始")}</div>
        </div>`;
    });
    app.innerHTML = `
      <div class="card">
        <h2>📚 选择要学的模块</h2>
        <p class="hint">点击任意卡片进入学习。建议顺序：从“电阻”开始，一路到“安全须知”。</p>
      </div>
      <div class="grid">${cards}</div>
    `;
    app.querySelectorAll(".module").forEach(function (c) {
      c.addEventListener("click", function () { location.hash = "#/lesson/" + c.getAttribute("data-id"); });
    });
  }

  /* ---------------- 视图：课程详情（图文+视频） ---------------- */
  function renderLesson(id) {
    const m = window.COURSE_DATA.find(function (x) { return x.id === id; });
    if (!m) { location.hash = "#/study"; return; }
    const app = $("#app");

    let sections = "";
    m.sections.forEach(function (s) {
      sections += `<div class="section"><h3>${escapeHtml(s.heading)}</h3><p>${escapeHtml(s.body)}</p>${s.svg ? s.svg : ""}</div>`;
    });

    // 视频区：有 bvid 内嵌，否则给搜索按钮
    let videoHtml;
    if (m.video && m.video.bvid) {
      videoHtml = `<div class="video-box"><iframe src="https://player.bilibili.com/player.html?bvid=${m.video.bvid}&page=1&high_quality=1&danmaku=0" allowfullscreen></iframe></div>`;
    } else {
      const kw = (m.video && m.video.search) || m.title + " 教学";
      videoHtml = `<div class="video-box"><div class="video-fallback">
          <div class="big">📺</div>
          <div>本节配套 B站免费教学视频</div>
          <button class="btn" onclick="window.open('https://search.bilibili.com/all?keyword=${encodeURIComponent(kw)}','_blank')">🔍 去 B站搜：“${escapeHtml(kw)}”</button>
          <div class="hint">想直接内嵌？把视频 BV 号填进 js/data.js 对应模块的 video.bvid 即可。</div>
        </div></div>`;
    }

    app.innerHTML = `
      <div class="banner">
        <span class="timer-pill"><span class="dot"></span>本次学习计时：<span id="timer-secs">0秒</span></span>
        &nbsp; 学完记得做下面的练习哦
      </div>
      <div class="lesson-head">
        <div class="emoji">${m.emoji}</div>
        <div><h1>${escapeHtml(m.title)}</h1><p class="hint">${escapeHtml(m.tagline)}</p></div>
      </div>
      <div class="card">${sections}</div>
      <div class="card">
        <h2>🎬 视频讲解</h2>
        ${videoHtml}
      </div>
      <div class="card" style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn" data-route="#/quiz/${m.id}">✏️ 做课后练习（打分）</button>
        <button class="btn btn-ghost" data-route="#/study">← 返回模块列表</button>
      </div>
    `;
    app.querySelectorAll("button[data-route]").forEach(function (b) {
      b.addEventListener("click", function () { location.hash = b.getAttribute("data-route"); });
    });
    startTimer(id); // 进入课程开始计时
  }

  /* ---------------- 视图：课后练习（打分） ---------------- */
  function renderQuiz(id) {
    const m = window.COURSE_DATA.find(function (x) { return x.id === id; });
    if (!m) { location.hash = "#/study"; return; }
    const app = $("#app");
    const total = m.quiz.length;
    let idx = 0, correct = 0, wrongSet = {};

    function showQuestion() {
      const q = m.quiz[idx];
      let opts = "";
      q.options.forEach(function (opt, i) {
        opts += `<button class="opt" data-i="${i}">${escapeHtml(opt)}</button>`;
      });
      app.innerHTML = `
        <div class="card">
          <div class="lesson-head"><div class="emoji">${m.emoji}</div><div><h1>${escapeHtml(m.title)} · 练习</h1><p class="hint">第 ${idx + 1} / ${total} 题</p></div></div>
          <div class="quiz">
            <div class="quiz-q">${idx + 1}. ${escapeHtml(q.q)}</div>
            <div id="opts">${opts}</div>
            <div id="feedback"></div>
          </div>
        </div>
        <div class="card"><button class="btn btn-ghost" data-route="#/lesson/${m.id}">← 回去看讲解</button></div>
      `;
      app.querySelectorAll("button[data-route]").forEach(function (b) {
        b.addEventListener("click", function () { location.hash = b.getAttribute("data-route"); });
      });
      const optEls = app.querySelectorAll(".opt");
      optEls.forEach(function (el) {
        el.addEventListener("click", function () { onAnswer(parseInt(el.getAttribute("data-i"), 10)); });
      });

      function onAnswer(choice) {
        optEls.forEach(function (e) { e.disabled = true; });
        const right = q.answer;
        optEls[right].classList.add("correct");
        if (choice === right) {
          correct++;
        } else {
          optEls[choice].classList.add("wrong");
          wrongSet[idx] = true;
        }
        const fb = $("#feedback");
        fb.innerHTML = `<div class="quiz-result" style="color:${choice === right ? "var(--accent-2)" : "var(--warn)"}">
            ${choice === right ? "✅ 答对了！" : "❌ 答错了"}
          </div>
          <div class="quiz-explain">📝 解析：${escapeHtml(q.explain)}</div>
          <button class="btn" id="next-btn" style="margin-top:12px">${idx + 1 < total ? "下一题 →" : "查看成绩 🎉"}</button>`;
        $("#next-btn").addEventListener("click", function () {
          if (idx + 1 < total) { idx++; showQuestion(); }
          else finish();
        });
      }
    }

    function finish() {
      const score = Math.round((correct / total) * 100);
      const passed = score >= 60;
      // 记录进度
      const p = moduleProgress(id);
      p.attempts = (p.attempts || 0) + 1;
      p.bestScore = Math.max(p.bestScore || 0, score);
      if (passed) p.completed = true;
      // 累计薄弱点（答错过题号）
      p.wrong = p.wrong || [];
      Object.keys(wrongSet).forEach(function (k) { if (p.wrong.indexOf(parseInt(k, 10)) < 0) p.wrong.push(parseInt(k, 10)); });
      saveMyProgress({ [id]: p });

      const wrongList = p.wrong.map(function (i) { return (i + 1) + ". " + m.quiz[i].q; }).join("<br>");

      app.innerHTML = `
        <div class="card" style="text-align:center">
          <div style="font-size:54px">${passed ? "🎉" : "💪"}</div>
          <h1>本次得分：${score} 分</h1>
          <p class="hint">答对 ${correct} / ${total} 题 ${passed ? "（已通关 ✅）" : "（60分及格，再练一次吧）"}</p>
          <div style="margin-top:14px;display:flex;gap:10px;justify-content:center;flex-wrap:wrap">
            <button class="btn" data-route="#/quiz/${m.id}">🔄 再练一次</button>
            <button class="btn btn-ghost" data-route="#/study">← 返回列表</button>
            <button class="btn btn-ghost" data-route="#/profile">👤 看我的进度</button>
          </div>
        </div>
        ${p.wrong.length ? `<div class="card"><h2>📌 你的薄弱点（建议复习）</h2><p class="quiz-explain">${wrongList}</p></div>` : ""}
      `;
      app.querySelectorAll("button[data-route]").forEach(function (b) {
        b.addEventListener("click", function () { location.hash = b.getAttribute("data-route"); });
      });
    }

    showQuestion();
  }

  /* ---------------- 视图：个人中心 ---------------- */
  function renderProfile() {
    const app = $("#app");
    if (!state.user) { location.hash = "#/auth"; return; }
    const myProg = getMyProgress();
    let totalTime = 0, doneCount = 0, totalWrong = 0, totalAttempts = 0;
    let rows = "";

    window.COURSE_DATA.forEach(function (m) {
      const p = myProg[m.id] || {};
      totalTime += p.timeSpent || 0;
      totalAttempts += p.attempts || 0;
      totalWrong += (p.wrong || []).length;
      if (p.completed) doneCount++;
      const pct = p.completed ? 100 : (p.attempts ? Math.min(100, 40 + (p.bestScore || 0) * 0.6) : 0);
      rows += `<div class="progress-row">
          <div class="name">${m.emoji} ${escapeHtml(m.title)}</div>
          <div class="bar"><i style="width:${pct}%"></i></div>
          <div class="pct">${p.completed ? "✅" + (p.bestScore || 0) : (p.attempts ? p.bestScore + "分" : "—")}</div>
        </div>`;
    });

    app.innerHTML = `
      <div class="card">
        <h2>👤 ${escapeHtml(state.user)} 的学习档案</h2>
        <div class="stats">
          <div class="stat"><div class="num">${formatDuration(totalTime)}</div><div class="label">累计学习时长</div></div>
          <div class="stat"><div class="num">${doneCount}/${window.COURSE_DATA.length}</div><div class="label">已通关模块</div></div>
          <div class="stat"><div class="num">${totalAttempts}</div><div class="label">练习总次数</div></div>
          <div class="stat"><div class="num">${totalWrong}</div><div class="label">累计薄弱点</div></div>
        </div>
      </div>
      <div class="card">
        <h2>📈 各模块进度</h2>
        <div class="progress-list">${rows}</div>
        <p class="hint" style="margin-top:10px">数据保存在本机浏览器（localStorage）。换设备/清缓存会丢失，重要进度记得截图留存。</p>
      </div>
    `;
  }

  /* ---------------- 视图：登录 / 注册 ---------------- */
  function renderAuth() {
    const app = $("#app");
    app.innerHTML = `
      <div class="auth-box card">
        <h2>🔑 登录 / 注册</h2>
        <p class="hint">输入一个用户名和密码即可。这是本机学习账号，用于保存你的时长和分数（非真实网络安全等级，请勿用重要密码）。</p>
        <div class="field"><label>用户名</label><input id="au-user" placeholder="例如：小明_电子1班" /></div>
        <div class="field"><label>密码</label><input id="au-pw" type="password" placeholder="设置或输入密码" /></div>
        <button class="btn" id="au-go" style="width:100%">进入</button>
        <p class="hint" id="au-msg" style="margin-top:10px"></p>
      </div>
    `;
    $("#au-go").addEventListener("click", function () {
      const u = $("#au-user").value.trim();
      const pw = $("#au-pw").value;
      const msg = $("#au-msg");
      if (!u || !pw) { msg.textContent = "用户名和密码都要填哦"; msg.style.color = "var(--warn)"; return; }
      const users = getUsers();
      if (users[u]) {
        // 登录
        if (users[u].pw !== hash(pw)) { msg.textContent = "密码不对，再试试"; msg.style.color = "var(--warn)"; return; }
      } else {
        // 注册
        users[u] = { pw: hash(pw), createdAt: Date.now() };
        save(KEY_USERS, users);
      }
      state.user = u;
      save(KEY_SESSION, u);
      renderTopbar();
      location.hash = "#/profile";
    });
  }

  function logout() {
    stopTimer();
    state.user = null;
    localStorage.removeItem(KEY_SESSION);
    renderTopbar();
    location.hash = "#/home";
  }

  /* ---------------- 路由 ---------------- */
  function router() {
    stopTimer(); // 离开页面前先结算时长
    const hash = location.hash || "#/home";
    renderTopbar();
    if (hash.indexOf("#/lesson/") === 0) { renderLesson(hash.split("/")[2]); return; }
    if (hash.indexOf("#/quiz/") === 0) { renderQuiz(hash.split("/")[2]); return; }
    switch (hash) {
      case "#/study": renderStudy(); break;
      case "#/profile": renderProfile(); break;
      case "#/auth": renderAuth(); break;
      case "#/home":
      default: renderHome(); break;
    }
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    state.user = load(KEY_SESSION, null);
    window.addEventListener("hashchange", router);
    router();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
