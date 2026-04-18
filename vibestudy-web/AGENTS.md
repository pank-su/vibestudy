# VibeStudy Web — Agent Guide

## Overview

VibeStudy is a local-first study/lab workspace powered by [OpenCode](https://opencode.ai). The web frontend (`vibestudy-web`) is a React SPA that connects to a local OpenCode server, manages lab sessions, and provides a code editor + chat interface. The UI is in Russian.

## Tech Stack

- **React 19** + **TypeScript 5.9** (strict mode)
- **Vite 8** — build/dev server
- **TanStack Router** — file-based routing (defined in `src/lib/router.tsx`)
- **TanStack Query v5** — server state (sessions, messages, files, providers, agents)
- **Zustand 5** — client state (connection, labs, workspace, profile, settings)
- **Tailwind CSS v4** — via `@tailwindcss/vite` plugin, CSS-first config in `src/index.css`
- **shadcn/ui (radix-luma style)** — component library, config in `components.json`
- **Radix UI** — headless primitives (`radix-ui` package)
- **Monaco Editor** — code editing (`@monaco-editor/react`)
- **HugeIcons** — icon library via `<Hi icon={...} />` wrapper
- **react-markdown** + **remark-gfm** — chat message rendering
- **vaul** — drawer component
- **class-variance-authority (CVA)** — component variants

## Path Aliases

- `@/` maps to `src/` — configured in both `vite.config.ts` and `tsconfig.json`
- Import UI components as `@/components/ui/button`, utilities as `@/lib/utils`, stores as `@/stores/connection`, etc.

## Key Conventions

### State Management

- **Server state** → TanStack Query hooks in `src/lib/opencode-client.ts` (use `useQuery` / `useMutation`)
- **Client state** → Zustand stores in `src/stores/`
  - Persisted stores use `persist` middleware with localStorage keys prefixed `vibestudy-`
  - Non-persisted stores (e.g., `workspace.ts`) are ephemeral per page
- **Zustand selectors**: always use selectors: `useStore(s => s.field)` to avoid unnecessary re-renders

### Routing

- Routes defined in `src/lib/router.tsx` using TanStack Router's `createRoute`
- Route tree is generated — edit `router.tsx`, not `routeTree.gen.ts`
- Routes:
  - `/` — redirects to `/new` (or `/onboarding` if not onboarded)
  - `/onboarding` — first-run profile setup (no sidebar)
  - `/new` — create/open a lab
  - `/workspace/$labId` — lab workspace with editor + chat
  - `/settings?tab=...` — settings page

### Components

- **UI primitives** in `src/components/ui/` are shadcn/ui components — do not manually edit; regenerate with `npx shadcn@latest add <component>` if needed
- **Page components** in `src/components/layout/` wrap content with `<AppLayout>`
- **Icon usage**: always use `<Hi icon={IconFromHugeicons} />` from `@/components/ui/hi`
- **Styling**: Tailwind CSS v4 with CSS variables — theme colors defined in `src/index.css` under `:root` and `.dark`
- **cn()**: merge class names with `cn()` from `@/lib/utils` (wraps `clsx` + `tailwind-merge`)

### API Client

- All OpenCode API calls go through `src/lib/opencode-client.ts`
- Uses raw `fetch` via `apiFetch<T>()` — not the SDK class methods
- SSE events via `subscribeEvents()` using native `EventSource`
- Connection state is managed in `src/stores/connection.ts`
- Base URL defaults to `http://localhost:4096`

## Architecture Notes

- The app has an onboarding gate: unauthenticated or un-onboarded users are redirected to `/onboarding`
- Labs (study sessions) can be imported from PDF, folder, GitHub, or template
- Each lab creates an OpenCode session; the workspace page manages file browsing, code editing, and chat
- Chat messages are rendered as markdown with GFM support
- The sidebar shows lab list grouped by status ("В процессе" / "Выполненные")
- Settings page has tabs managed via search params (`?tab=profile|connection|models|general`)
- Dark/light theme toggle persists to localStorage via `useTheme` hook
- The UI language is Russian — all user-facing strings are in Russian
