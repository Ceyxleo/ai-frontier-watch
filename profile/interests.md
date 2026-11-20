# 研究兴趣画像

每周的 agent 读这份文件来判断"跟我有没有关系"。可以直接改：加方向、调权重、写排除项。
这个仓库是公开的，这里只写研究方向，不写项目进度、未发表的结果和合作者。

## 我是谁（给 agent 的背景）
- 做水文和地球系统模拟：河流汇流模型（E3SM 的 MOSART）、湖泊、河流水温和热量收支、地下水耦合、全球数据集。
- 日常大量用 AI agent 做科研：Claude Code、多 agent 协作、在 HPC（NERSC Perlmutter）上跑 agent、用 LLM 精读文献。
- 想扩大 AI 前沿的视野，同时找到能落到自己研究里的东西。

## 三个重点方向（权重：高）

### 1. 通用前沿：模型和 agent
- 新的前沿模型和能力变化（推理、长上下文、工具使用、computer use）。
- Agent 架构：multi-agent 协作、orchestrator–worker、agent 记忆、长任务、评测（例子：n8n 的 multi-agent systems 一文）。
- 工具链：MCP、Agent Skills、Claude Code / Codex 一类 coding agent、agent 框架（LangGraph、Academy 等）。
- 关心的问题：哪些是真正的能力跃迁，哪些只是包装；哪些模式能直接用到"科研 agent"上。

### 2. AI for 地球系统和水文
- 天气和气候的 AI 基础模型、AI 模拟器（emulator / surrogate），以及它们和物理模型的混合（hybrid AI–physics）。
- 水文：AI 径流和洪水预报、可微分水文模型（differentiable hydrology）、全球参数率定和参数区域化。
- 河流水温、湖泊（面积、温度、冰）的 ML 方法；地下水 emulator 与河流模型的耦合。
- 水库调度：LLM 或强化学习做调度策略。
- 数据：全球河床泥沙粒径等数据集的 ML 插值、数据论文；溶解有机碳（DOC）等全球估算的可解释 ML（SHAP 等）。
- 关心的问题：别人怎么把 AI 接进大尺度模型、怎么验证、哪些代码和数据是开源的。

### 3. AI 科研工作流
- 文献检索和精读、综述生成、引用核对。
- 写作和审稿辅助（数据论文、期刊论文），图表生成。
- 代码 agent 改科学模型代码（Fortran、大型模型代码库）、HPC 作业管理。
- "AI scientist" 类系统、自动化实验和分析流程。
- 关心的问题：哪些用法今天就能用、成本多少、坑在哪里。

## 次要方向（权重：低，只在有大进展时提一句）
- DOE / HPC 的 AI 基础设施：Genesis Mission、American Science Cloud、NERSC / ALCF 的 AI 服务。

## 排除项（不推荐）
- 纯营销稿、没有技术细节的融资新闻。
- 和科研无关的消费级应用。

## 根据反馈学到的偏好
（每周 agent 根据网页上的 ✓ / ✗ / ⭐ 自动总结，写在周报 JSON 里；你也可以把长期偏好手写在这里。）
