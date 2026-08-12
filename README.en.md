# Game UI Smith

Game UI Smith is a frontend-only game UI and 2D asset workspace prototype built with React, TypeScript, and Vite. It combines AI asset generation, prompt recipes, canvas utilities, and downloadable results in one place.

## Highlights

- OpenAI-compatible configuration for Base URL, API Key, image models, video models, and Responses models.
- Text-to-image, image-to-image, text-to-video, and image-to-video workflow entries.
- Prompt recipe generation with JSON export.
- Local Canvas tools for sprite sheets, slice previews, image sequences, video frame extraction, and GIF output.
- Result gallery for previewing and downloading generated assets.

## Structure

```text
.
├─ public/
├─ src/
│  ├─ components/
│  ├─ features/
│  ├─ services/
│  ├─ types/
│  └─ utils/
├─ package.json
└─ vite.config.ts
```

## Run Locally

Requires Node.js 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

## Build And Deploy

```bash
npm run build
npm run preview
```

The production build is written to `dist/`. Deploy it to GitHub Pages, Vercel, Netlify, Nginx, or package it with `DistDesktopLauncher` for a Windows desktop-style launch experience.

## Notes

- No API key is bundled in this repository.
- `node_modules/`, `dist/`, generated test images, and caches are ignored.
- Video generation APIs vary by provider; the current implementation keeps an extension point for compatible services.

## Thanks

Thank you for checking out this project. If it helps you move faster when prototyping game assets, a Star, Fork, issue, or suggestion would mean a lot and will encourage me to keep improving it.
