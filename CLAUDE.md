# AI 前沿周报：规则和地图

这个仓库是**公开的**。写进仓库的任何文件都要按公开标准写：不写姓名、邮箱、单位细节、合作者、未发表的结果、账号、本地路径、token。

新会话阅读顺序：本文件 → `STATUS.md`（本地，不进仓库）→ `README.md` → 需要历史时看 `LOG.md`（本地，只追加）。

## 地图
- `scout/run_weekly.py`：每周运行的脚本。三步：整理知识、检索、成稿。用 `--fixture --data-dir <临时目录>` 可以不调 API 试跑。
- `scout/prompts/{research,compose,distill}.md`：三步的 prompt，占位符写成 `{{NAME}}`。
- `scout/config.json`：模型、effort、搜索和抓取上限、每期条数、月度上限、标价。
- `profile/interests.md`、`profile/sources.md`：兴趣画像和信息源。
- `docs/`：GitHub Pages 网页，纯静态，没有构建步骤。脚本加载顺序：`i18n.js` → `core.js` → `charts.js` → `views-week.js` → `views-more.js` → `app.js`。
- 双语：界面文字都在 `docs/i18n.js` 的 zh / en 词典里，新增文字两边都要加。生成内容在数据里自带 `en` 对象（条目、周报顶层、知识卡片），网页用 `I18N.pick()` 选；英文缺失时回退到中文。学习记录不翻译。
- `docs/data/`：数据。**每个文件只有一方写**：
  - 网页写：`state.json`（✓/✗/⭐ 和学习记录）；
  - Action 写：`weeks/*.json`、`index.json`、`knowledge/cards.json`、`usage.json`。
  - 脚本只读 `state.json`，不写它。
- `.github/workflows/weekly.yml`：每周一 13:47 UTC 定时运行，也可以手动运行。

## 规矩
- 网页里有能写仓库的 token：生成内容一律用 `textContent` 渲染，不用 `innerHTML`；链接只放行 https；CSP 不要放宽到第三方脚本。
- Actions 日志是公开的：脚本只打印数量和花费，不打印内容。
- 每期花费以 `usage.json` 为准（按标价估算，不是账单）。月度上限在 `scout/config.json`。
- 改数据结构时，网页（`docs/*.js`）和脚本要一起改，用 fixture 跑一遍，再在浏览器里看。
- push、改 Actions secret、改仓库可见性和 Pages 设置，都先问用户。
