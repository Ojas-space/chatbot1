# Ollama Web Chat

A small React chat UI that talks directly to your local Ollama server — no backend needed. Built for `qwen2.5-coder:7b`, but you can point it at any model you've pulled.

## 1. Allow the browser to reach Ollama (CORS)

By default Ollama only accepts requests from its own CLI, not from a browser tab. You need to set `OLLAMA_ORIGINS` so it'll accept requests from your Vite dev server (default `http://localhost:5173`).

**Windows:**
1. Press `Win`, search "Environment Variables", open "Edit environment variables for your account".
2. Add a new variable: Name = `OLLAMA_ORIGINS`, Value = `http://localhost:5173` (or `*` to allow any origin while you're testing).
3. Restart Ollama completely (quit it from the system tray if it's running as a background app, then relaunch, or stop/restart the `ollama serve` process).

You can confirm it's set by opening a new terminal and running `echo %OLLAMA_ORIGINS%`.

## 2. Create the React app

```bash
npm create vite@latest ollama-chat -- --template react
cd ollama-chat
npm install
```

## 3. Drop in these files

Replace `src/App.jsx` and `src/App.css` with the two files provided alongside this README.

## 4. Run it

```bash
npm run dev
```

Open the URL it prints (usually `http://localhost:5173`). Make sure Ollama is actually serving in the background — `ollama list` in a terminal will confirm it's installed, and the app will show an error banner if it can't reach `localhost:11434`.

## Notes

- Click the model name in the header to change which model it talks to (e.g. swap to `qwen3:14b` once your CUDA issue is sorted).
- The small bars next to the model name pulse while a response is streaming in.
- Code blocks (text wrapped in triple backticks) render in a separate monospace block.
- Conversation history is kept in memory only — refreshing the page clears it. Say if you want it persisted (e.g. to localStorage or a small SQLite file via a backend) and I can add that.
