# Game UI Smith

Game UI Smith 是一个纯前端的游戏 UI / 2D 素材工作台原型，使用 React、TypeScript 和 Vite 构建。它把常见的 AI 素材生成入口、提示词配方、画布处理和结果下载整理到同一个界面中，适合快速试做游戏图标、道具、按钮、精灵图和小型动效素材。

## 功能亮点

- OpenAI 兼容接口配置：Base URL、API Key、图片模型、视频模型、Responses 模型。
- 文生图、图文生图、文生视频、图文生视频工作流入口。
- 提示词配方生成，可导出为 JSON。
- Canvas 本地工具：Sprite Sheet 合成、切片预览、图片序列 / 视频抽帧 GIF 生成。
- 结果货架：预览、下载和管理生成素材。

## 项目结构

```text
.
├─ public/                 # 静态图标与 favicon
├─ src/
│  ├─ components/          # 通用布局、配置面板、上传与结果组件
│  ├─ features/            # 各类素材工作流面板
│  ├─ services/            # OpenAI 兼容接口与 Canvas 处理
│  ├─ types/               # 工作流类型定义
│  └─ utils/               # 文件、GIF 等工具函数
├─ package.json
└─ vite.config.ts
```

## 本地运行

要求 Node.js 20.19+ 或 22.12+。

```bash
npm install
npm run dev
```

浏览器打开终端提示的本地地址即可。

## 构建部署

```bash
npm run build
npm run preview
```

构建产物位于 `dist/`，可以部署到 GitHub Pages、Vercel、Netlify、Nginx 静态站点，也可以配合本账号里的 `DistDesktopLauncher` 打包成 Windows 桌面启动器。

## 注意事项

- 本项目不会内置任何 API Key，请在本地界面中自行配置。
- `node_modules/`、`dist/`、测试生成图片与缓存都不会提交到仓库。
- 不同兼容服务的视频生成接口可能存在差异，当前实现预留了扩展入口。

## 感谢与支持

谢谢你愿意点进来看这个小项目。它来自“让游戏素材试错更快一点”的朴素想法，如果你觉得它有意思，欢迎 Star、Fork、提 Issue 或给我一些建议。你的支持会让我更有动力继续把工具做得好用、漂亮，也更适合真实创作流程。
