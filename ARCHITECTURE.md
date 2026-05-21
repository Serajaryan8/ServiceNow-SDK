# SN Copilot — Architecture & Flow Reference

## What This System Is

An AI-driven conversational interface that lets a developer describe what they want to build in ServiceNow (Flows, Business Rules, Actions, etc.) and have the AI prepare and deploy it to a connected ServiceNow instance.

---

## Folder Structure

```
ServicewNow SDK/
├── backend/                    ← Python FastAPI (AI brain + SN REST proxy)
│   ├── main.py                 ← FastAPI app entry point
│   ├── requirements.txt        ← Python dependencies
│   ├── .venv/                  ← Python virtual environment
│   └── routers/
│       └── auth.py             ← POST /auth/validate endpoint
│
├── ui/                         ← React + TypeScript frontend (Vite)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── src/
│       ├── main.tsx            ← ReactDOM entry point
│       ├── App.tsx             ← Root component (routing logic)
│       ├── vite-env.d.ts       ← Vite type declarations
│       ├── styles/
│       │   ├── tokens.css      ← Spacing, font, radius variables
│       │   └── global.css      ← Dark/light theme + shared button/field styles
│       ├── lib/
│       │   └── api.ts          ← All fetch calls to the backend (typed)
│       ├── context/
│       │   └── InstanceContext.tsx  ← Multi-instance state (React context + localStorage)
│       ├── hooks/
│       │   ├── useTheme.ts          ← Dark/light toggle
│       │   └── useInstanceForm.ts   ← Shared form state + validation logic
│       └── components/
│           ├── InstanceSetup.tsx    ← First-time "Connect Instance" full-page form
│           ├── AddInstanceModal.tsx ← Modal to add more instances
│           └── layout/
│           │   ├── AppShell.tsx     ← Main 3-panel layout wrapper
│           │   ├── TopBar.tsx       ← Brand + instance switcher + theme toggle
│           │   └── Sidebar.tsx      ← Conversation list (shell)
│           └── chat/
│               ├── ChatWindow.tsx   ← Chat area + context cards
│               └── ChatInput.tsx    ← Textarea + file attach + send button
│
└── ARCHITECTURE.md             ← This file
```

---

## How to Start the System

Two terminals are needed — backend and frontend run independently.

### Terminal 1 — Backend (FastAPI)

```bash
cd "d:\Study\servicenow-ai-agent\ServicewNow SDK\backend"
.venv\Scripts\uvicorn main:app --reload --port 8000
```

- Runs on: `http://localhost:8000`
- Auto-reloads on file changes (`--reload`)
- Swagger UI available at: `http://localhost:8000/docs`

### Terminal 2 — Frontend (React + Vite)

```bash
cd "d:\Study\servicenow-ai-agent\ServicewNow SDK\ui"
npm run dev
```

- Runs on: `http://localhost:5173`
- Auto-reloads on file changes (HMR)

> Both must be running for login/validation to work.

---

## System Ports & Communication

```
Browser (localhost:5173)
        │
        │  HTTP fetch (JSON)
        ▼
FastAPI Backend (localhost:8000)
        │
        │  HTTPS + Basic Auth
        ▼
ServiceNow Instance (https://dev12345.service-now.com)
```

CORS is configured in `backend/main.py` to allow requests from `http://localhost:5173` only.

---

## Component Tree (React)

```
main.tsx
└── App
    └── InstanceProvider  ← holds all instance data, persists to localStorage
        ├── InstanceSetup        (shown when no instances are saved)
        └── AppShell             (shown when at least one instance exists)
            ├── TopBar
            │   ├── [instance switcher dropdown]
            │   └── AddInstanceModal  (shown when user clicks "Add instance")
            ├── Sidebar
            └── ChatWindow
                ├── [context cards: Instance / Application / Update Set]
                └── ChatInput
                    ├── [file attachment chips]
                    ├── [auto-resize textarea]
                    └── [send button]
```

---

## State Management

### InstanceContext (`context/InstanceContext.tsx`)

The single source of truth for all connected ServiceNow instances.

```ts
interface SNInstance {
    id:          string   // random UUID, generated locally
    label:       string   // user-given name e.g. "Development"
    url:         string   // https://dev12345.service-now.com
    username:    string
    password:    string
    displayName: string   // from SN — e.g. "System Administrator"
    email:       string   // from SN
    application: { sys_id, name, scope } | null  // current app scope from SN
    updateSet:   { sys_id, name, state } | null  // current update set from SN
}
```

**Persisted to:** `localStorage` under keys `sn-instances` and `sn-active`.

**On page load:** instances are read from localStorage immediately — no login screen if already connected.

### Theme (`hooks/useTheme.ts`)

- Persisted to `localStorage` under key `sn-theme`
- Applied to `document.documentElement` as `data-theme="dark"` or `data-theme="light"`
- Applied in `main.tsx` before React renders (prevents flash)
- Toggled via the sun/moon button in TopBar

---

## Flow 1 — First Visit (No Instances)

```
1. Browser opens localhost:5173
2. main.tsx applies saved theme from localStorage (or 'dark' default)
3. ReactDOM renders <App>
4. App renders <InstanceProvider>
5. InstanceProvider reads localStorage → instances = []
6. App sees instances.length === 0 → renders <InstanceSetup>

User fills in: Label, URL, Username, Password
User clicks "Connect Instance"

7. useInstanceForm.submit() is called
8. Validates URL starts with https://
9. setLoading(true) → button shows "Validating…", form disabled

10. api.ts → fetch POST http://localhost:8000/auth/validate
    Body: { url, username, password }

11. FastAPI receives request in routers/auth.py
12. Pydantic validates + normalises URL (strips trailing slash)
13. asyncio.gather() fires TWO parallel calls to ServiceNow:
    a. GET /api/now/table/sys_user?user_name={username}&sysparm_limit=1
       → validates credentials, gets display name + email
    b. GET /api/now/ui/concoursepicker/current
       → gets current application scope + update set

14. If sys_user returns 401 → raise HTTP 401 "Invalid username or password"
15. If sys_user returns 403 → raise HTTP 403 "User lacks REST API access"
16. concoursepicker failures are ignored (best-effort) — login still succeeds

17. FastAPI returns:
    {
      valid: true,
      user: { username, display_name, email },
      application: { sys_id, name, scope } or null,
      update_set: { sys_id, name, state } or null
    }

18. api.ts returns ValidateResult to useInstanceForm
19. onSuccess() callback called with fields + result
20. InstanceContext.add() creates new SNInstance with UUID
21. Saved to localStorage
22. activeId set to new instance ID

23. App sees instances.length > 0 → renders <AppShell>
24. TopBar shows instance name
25. ChatWindow shows 3 context cards: Instance / Application / Update Set
```

---

## Flow 2 — Returning Visit (Instance Already Saved)

```
1. Browser opens localhost:5173
2. main.tsx applies saved theme
3. InstanceProvider reads localStorage → instances = [{ ... }]
4. App sees instances.length > 0 → renders <AppShell> directly
   (no login, no backend call)
5. TopBar shows saved instance name
6. ChatWindow shows context cards from stored data
```

> The backend is NOT called on returning visits. All data is from localStorage.

---

## Flow 3 — Adding Another Instance

```
1. User clicks instance name in TopBar
2. Dropdown opens showing all saved instances
3. User clicks "Add instance"
4. AddInstanceModal appears (backdrop blur, Esc to close)
5. Same validation flow as Flow 1 (steps 7–22)
6. New instance added to localStorage
7. New instance becomes active automatically
8. Modal closes, TopBar updates, ChatWindow refreshes
```

---

## Flow 4 — Switching Instances

```
1. User clicks instance name in TopBar
2. Dropdown opens
3. User clicks a different instance
4. InstanceContext.activate(id) called
5. localStorage 'sn-active' updated
6. TopBar and ChatWindow re-render with new instance data
   (no backend call — data already in localStorage)
```

---

## Backend API Reference (Current)

### `GET /health`
Health check. Returns `{ "status": "ok" }`.

### `POST /auth/validate`

Validates ServiceNow credentials and returns user context.

**Request body:**
```json
{
  "url": "https://dev12345.service-now.com",
  "username": "admin",
  "password": "yourpassword"
}
```

**Success response (200):**
```json
{
  "valid": true,
  "user": {
    "username": "admin",
    "display_name": "System Administrator",
    "email": "admin@example.com"
  },
  "application": {
    "sys_id": "global",
    "name": "Global",
    "scope": "global"
  },
  "update_set": {
    "sys_id": "abc123...",
    "name": "Default Update Set",
    "state": "in progress"
  }
}
```

**Error responses:**
| HTTP | Meaning |
|------|---------|
| 401 | Invalid username or password |
| 403 | Credentials valid but no REST API access |
| 502 | Cannot reach the SN instance |
| 504 | SN instance timed out |
| 422 | URL does not start with https:// |

---

## ServiceNow Endpoints Called (So Far)

| Purpose | Method | SN Endpoint |
|---------|--------|-------------|
| Validate credentials + get user info | GET | `/api/now/table/sys_user?sysparm_query=user_name={u}&sysparm_limit=1&sysparm_fields=sys_id,name,user_name,email` |
| Get current application + update set | GET | `/api/now/ui/concoursepicker/current` |

All calls use **Basic Auth** (`Authorization: Basic base64(username:password)`).  
Auth is **stateless** — credentials are sent from the UI to the backend with every request and forwarded to SN. Nothing is stored on the backend.

---

## What Is Built vs What Is Coming

### Built
- [x] Multi-instance connect + switch + remove
- [x] Basic auth credential validation against real SN instance
- [x] Current application + update set fetched at login
- [x] Dark / light theme toggle
- [x] Chat input bar (textarea + file attach + send) — UI only
- [x] Context cards in chat window (Instance, Application, Update Set)

### Coming Next
- [ ] Common SN Table REST API utility (tables, fields, choices)
- [ ] Chat message thread (send/receive messages)
- [ ] Conversation history in sidebar
- [ ] Claude API integration (AI brain)
- [ ] Skills / knowledge layer per component type
- [ ] Build service (TypeScript + SN SDK) for deploying artifacts

---

## Key Design Decisions

| Decision | Reason |
|----------|--------|
| Stateless auth | No session storage on backend — credentials travel with each request. Simpler, no expiry issues. |
| localStorage for instances | Survives page refresh. Credentials stored client-side — acceptable for a developer tool demo. |
| Parallel SN calls on validate | User lookup and context fetch run simultaneously — faster login. |
| concoursepicker is best-effort | Older SN instances or restricted users may not have access. Login should never fail because of it. |
| CSS variables for theming | Zero JavaScript needed for theme switch — just a `data-theme` attribute change on `<html>`. |
| useInstanceForm hook | Both InstanceSetup and AddInstanceModal share identical form logic — extract once, use twice. |
