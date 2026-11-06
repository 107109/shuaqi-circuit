# ⚡ 耍起学习电路分析

一个**纯静态、零依赖**的电路入门学习网站，专为「没有电路基础」的同学打造。
由组长做给组员和普高上来的同学：认元器件、学焊接、会用万用表，边看边练还会打分。

## ✨ 功能

- 📚 **13 个学习模块**：电阻、电容、二极管、三极管、集成电路、开关、计数器、计时器、指针万用表、数字万用表、焊接实操、测量通电、安全须知
- 🖼️ **图文 + 手绘 SVG 电路符号**：不依赖任何外部图片，加载飞快、文件极小
- 🎬 **B站视频讲解**：每节配 B站免费教学视频（内嵌或一键搜索，**不占本地空间**）
- ✏️ **课后练习 + 打分**：选择题当场判分、给解析，答错的自动记进「薄弱点」
- ⏱️ **学习时长记录**：进入课程自动计时，切后台暂停，时长存本机
- 👤 **账号系统**：注册登录后，个人中心能看到自己的时长、分数、各模块进度
- 📱 **移动端友好**：手机、平板、电脑都能用

> 所有数据保存在浏览器 `localStorage`，**无需后端服务器**，丢到 GitHub Pages 就能让全班访问。

## 🚀 本地预览

直接用浏览器打开 `index.html` 即可；或起一个本地服务器（推荐，避免个别浏览器限制）：

```bash
# 进入项目目录
cd shuaqi-circuit

# 方式一：Python
python -m http.server 8000
# 浏览器打开 http://localhost:8000

# 方式二：Node
npx serve .
```

## 🌐 部署到 GitHub Pages（让全班访问）

1. 在 GitHub 上新建一个仓库，例如 `circuit-learning`（仓库名用小写英文）。
2. 在本项目目录打开终端，执行：
   ```bash
   git init
   git add .
   git commit -m "feat: 耍起学习电路分析 初版"
   git branch -M main
   git remote add origin https://github.com/你的用户名/circuit-learning.git
   git push -u origin main
   ```
3. 打开仓库 **Settings → Pages**，Source 选 **main** 分支、目录选 **/ (root)**，点 Save。
4. 等 1~2 分钟，访问 `https://你的用户名.github.io/circuit-learning/` 即可分享给同学。

> 之后每次更新内容，改完 `git add . && git commit -m "更新" && git push` 就行。

## 🎬 如何把 B站视频直接内嵌（可选）

默认每节是「去 B站搜索」按钮。如果你想让视频**直接播放在页面里**：

1. 打开 B站视频，地址栏里复制 `BVxxxxxx` 那段编号。
2. 编辑 `js/data.js`，找到对应模块的 `video` 字段，把 `bvid` 填上：
   ```js
   video: { bvid: "BV1GJ411x7h7", search: "电阻 色环 识别 教学 入门" }
   ```
3. 保存刷新页面，视频就会内嵌播放（依然不占本地空间，加载很快）。

## ➕ 如何新增一个学习模块

打开 `js/data.js`，往 `COURSE_DATA` 数组里加一个对象即可，照着现有格式填：

```js
{
  id: "newmod",                 // 英文唯一 id
  title: "新模块名",
  emoji: "🔧",
  tagline: "一句话简介",
  video: { bvid: "", search: "B站搜索关键词" },
  sections: [
    { heading: "小标题", body: "正文讲解……", svg: "<svg>…</svg>" }, // svg 可省略
  ],
  quiz: [
    { q: "题目？", options: ["A","B","C","D"], answer: 0, explain: "解析" },
  ],
}
```

## 📁 文件结构

```
shuaqi-circuit/
├── index.html        # 页面入口
├── css/style.css     # 样式
└── js/
    ├── data.js       # 课程内容（改这里加模块/换视频）
    └── app.js        # 账号/路由/计时/练习/进度逻辑
```

---

做给组员的小站，欢迎提建议一起迭代 💪
