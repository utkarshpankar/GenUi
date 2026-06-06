# GenUI — AI React Component Generator

Full-stack developer tool to generate React components with **OpenRouter**, preview them live, and save them to history (via **localStorage**).

## Tech stack

- **Frontend**: React (Vite) + Tailwind CSS (v4 via `@tailwindcss/vite`)
- **State**: Redux Toolkit (4 required slices)
- **Backend**: Node.js + Express
- **AI**: OpenRouter API
- **Storage**: `localStorage` (no database)

## Project structure

```txt
Genui/
  frontend/
    src/
      components/
      pages/
      redux/
  backend/
    controllers/
    routes/
```

## Setup (local)

### 1) Configure backend env

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and set:

- `OPENROUTER_API_KEY=...`
- (optional) `OPENROUTER_MODEL=openrouter/auto`
- (optional) `OPENROUTER_MODEL_FALLBACKS=deepseek/deepseek-chat-v3-0324:free,meta-llama/llama-3.1-8b-instruct:free`
- (optional) `OPENROUTER_SITE_URL=http://localhost:5173`
- (optional) `OPENROUTER_APP_NAME=GenUI`
- (optional) `PORT=5000`

### 2) Run everything (recommended)

From the **project root** (`Genui/`):

```bash
npm install
npm run install:all
npm run dev
```

This starts **backend** (`:5000`) and **frontend** (`:5173`) together.

Health check: `GET http://localhost:5000/health`

### Run separately (optional)

```bash
npm run dev:backend   # backend only
npm run dev:frontend  # frontend only
```

The frontend proxies `/api/*` and `/health` to `http://127.0.0.1:5000` via `frontend/vite.config.js`.

## API

### `POST /api/generate`

Request:

```json
{ "prompt": "Create a responsive pricing card with 3 plans", "action": "generate", "code": "" }
```

- **action**: `generate | regenerate | improve | explain | convert_ts`
- **code**: pass previous code for `improve | explain | convert_ts`

Response:

- For code actions: `{ "prompt": "...", "code": "..." }`
- For explain: `{ "prompt": "...", "explanation": "..." }`

## Deploy (bonus)

### Frontend (Vercel)

- Import `frontend/` as the project root in Vercel
- Ensure it builds with `npm run build`

### Backend (Render)

- Create a **Web Service** from `backend/`
- Build command: `npm install`
- Start command: `npm start`
- Add environment variable `OPENROUTER_API_KEY`

Then update the frontend proxy/production API base if you deploy to separate domains (simple approach: swap `fetch('/api/...')` to your backend URL for production).

