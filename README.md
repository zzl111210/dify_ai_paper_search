# ArXiv 论文查询助手（HTTP 直连版）

基于 Dify Workflow 的 ArXiv 论文查询前端，支持 3 轮迭代优化关键词，HTTP 直连 ArXiv API 检索。

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/zzl111210/dify_ai_paper_search.git
cd dify_ai_paper_search

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

浏览器打开 `http://localhost:5173`

## 配置 Dify API Key

1. 在 Dify 平台发布你的工作流应用
2. 进入应用 → **API 访问** → 复制 API Key
3. 在页面右上角点击 **⚙️ 设置** → 粘贴 API Key → 保存

## 使用

1. 输入论文检索需求（支持中文）
2. 选择返回论文数量（3-15 篇）
3. 点击 **开始查询**
4. 等待 3 轮迭代优化后获取格式化结果

## 工作流原理

```
用户输入 → 关键词优化(1) → HTTP直连ArXiv → 质量判断 → 满意？
                                                        ├─ ✓ → 变量聚合
                                                        └─ ✗ → 关键词优化(2) → HTTP直连ArXiv → 质量判断 → 满意？
                                                                                                      ├─ ✓ → 变量聚合
                                                                                                      └─ ✗ → 关键词优化(3) → HTTP直连ArXiv → 变量聚合
                                                                                                                                          ↓
                                                                                                                                     结果整理输出
```

- 最多 3 轮自动优化搜索关键词
- HTTP 直连 ArXiv API，比插件更稳定
- 结果以中文 Markdown 格式呈现

## 技术栈

- React 19 + TypeScript
- Vite 8
- Tailwind CSS 4
- react-markdown + remark-gfm
