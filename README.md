# AI 前沿周报

一个跟着我一起成长的 AI 前沿追踪页：

- **每周一自动出一期**：agent 检索过去一周的 AI 进展，挑 8–12 条，分三个方向：前沿模型和 agent、AI for 地球系统和水文、AI 科研工作流。每条都附原始链接，并标明 agent 读了原文还是只看了二手报道。
- **打勾**：每条可以标 ✓ 感兴趣、✗ 不感兴趣、⭐ 想深入。下一期的推荐会参考这些反馈；标了 ⭐ 的条目，下一期会展开写一条。
- **学习记录**：记下学了什么、花了多久、是想学、在学还是学完。
- **知识库**：标成"学完"的记录，每周一会被整理成按主题归类的知识卡片。
- **成长**：每周的反馈、学习时长、知识卡片的累计数和主题分布。
- **中英文切换**：右上角一键切换。周报和知识卡片由 agent 同时写中英两版；你自己写的学习记录保持原样。

网页：<https://ceyxleo.github.io/ai-frontier-watch/>

## 怎么运作

```
GitHub Actions（每周一 13:47 UTC）
  └─ scout/run_weekly.py
       1. 整理知识：state.json 里新学完的记录 → knowledge/cards.json
       2. 检索：Claude + web search / web fetch → 研究笔记
       3. 成稿：研究笔记 → weeks/YYYY-MM-DD.json（结构化输出）
       4. 记录花费：usage.json；超过月度上限就跳过
  └─ commit 到 docs/data/ → GitHub Pages 更新网页

网页（docs/，纯静态）
  └─ 打勾和学习记录 → 用你自己的 fine-grained token 写进 docs/data/state.json
```

每个数据文件只有一方写：网页只写 `state.json`，Action 只写其他文件，所以两边不会冲突。

## 目录

| 路径 | 内容 |
|---|---|
| `profile/interests.md` | 研究兴趣画像，改它就能调整推荐方向 |
| `profile/sources.md` | 优先看的信息源 |
| `scout/run_weekly.py` | 每周运行的脚本 |
| `scout/prompts/` | 检索、成稿、整理知识三步的 prompt |
| `scout/config.json` | 模型、搜索次数上限、每期条数、月度预算 |
| `docs/` | 网页（`index.html`、`*.js`、`style.css`）和数据（`docs/data/`） |
| `.github/workflows/weekly.yml` | 定时任务；也可以在 Actions 页面手动运行 |

## 手动运行

在仓库的 Actions → weekly → Run workflow，可以填：

- `mode`：`weekly`（整理知识加出周报）或 `distill`（只整理知识）；
- `window_days`：检索过去几天；
- `must_read`：必须收录的 URL。

本地试跑不调 API，只走一遍校验和写文件的流程：

```bash
cp -R docs /tmp/afw-site
python3 scout/run_weekly.py --fixture --data-dir /tmp/afw-site/data
```

## 需要的 secret

- `ANTHROPIC_API_KEY`：必需。
- `PRIVACY_DENYLIST`：可选。不想在公开页面上出现的词，用逗号或换行分隔；生成的内容里出现这些词会被替换掉。

## 安全

- 网页把所有生成内容当纯文本渲染，链接只允许 https，CSP 只放行本站脚本和 api.github.com。
- 网页用的 token 只存在你自己浏览器的 localStorage 里。建议只给这个仓库开 Contents 读写权限。
- 检索到的网页内容只当资料，不当指令。
