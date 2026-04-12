# VibeStudy — Архитектура проекта

Веб-платформа для автоматического выполнения лабораторных работ. Пользователь загружает PDF методички, система анализирует её, выполняет лабу через OpenCode (с мульти-агентной системой из `lab_template`), и предоставляет полную среду для просмотра/редактирования результатов.

## Общая архитектура

```
                    ┌──────────────┐
                    │   Landing    │  (отдельный сайт)
                    │   vibestudy  │
                    └──────┬───────┘
                           │
              ┌────────────┴────────────┐
              │     App (SPA)            │
              │  app.vibestudy.com       │
              │  TanStack + Shadcn       │
              │  Минимализм, RU, dark/   │
              │  light theme             │
              └────┬───────────┬─────────┘
                   │           │
          [Cloud]  │           │  [Local]
                   │           │
          ┌────────▼──┐   ┌────▼──────────────┐
          │ Ktor API  │   │ localhost:4096     │
          │ + Koog    │   │ opencode serve     │
          │ + Docker  │   │ (на ПК юзера)     │
          │ + PgSQL   │   └───────────────────┘
          └───────────┘
```

## Два режима работы

### Локальный режим (Local)

```
Browser (vibestudy.com) --CORS--> localhost:4096 (opencode serve)
```

- Пользователь запускает `opencode serve --port 4096 --cors https://vibestudy.com` на своей машине
- Frontend подключается напрямую через `@opencode-ai/sdk` (`createOpencodeClient({ baseUrl: "http://localhost:4096" })`)
- Бесплатно, пользователь платит только за свой API-ключ LLM провайдера
- OpenCode API уже предоставляет: `/file` (file tree), `/file/content` (чтение файлов), `/session` (сессии), SSE events (реалтайм)

### Облачный режим (Cloud)

```
Browser --> vibestudy.com/api --> Ktor Backend --> Docker container (opencode serve)
```

- Backend (Ktor) поднимает изолированный Docker-контейнер с OpenCode + `lab_template`
- Каждый пользователь/задача = свой контейнер
- Backend проксирует OpenCode API к фронтенду
- Позже будет по подписке (Telegram Stars)

## Целевая аудитория

Любые студенты любых вузов. Универсальный сервис.

## Технологический стек

| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| Landing | Astro или отдельный TanStack SPA | Маркетинговый сайт |
| App Frontend | TanStack Router + Query, Shadcn UI, Tailwind | SPA, routing, data fetching, UI |
| Code Editor | Monaco Editor | Редактирование кода в file tree |
| Typst Editor | CodeMirror 6 + typst language support | Редактирование отчетов |
| Typst Preview | `@myriaddreamin/typst.ts` (WASM) | Компиляция Typst в браузере, мгновенный превью |
| PDF Viewer | `react-pdf` или `pdfjs-dist` | Просмотр загруженной методички |
| Backend | Ktor (Kotlin) | REST API, auth, прокси, оркестрация |
| AI Pre-processing | Koog (Kotlin AI framework) | Анализ PDF перед отправкой в OpenCode |
| DB | PostgreSQL + Exposed (Kotlin ORM) | Пользователи, лабы, подписки, версии |
| Isolation (Cloud) | Docker containers | Изолированные контейнеры с OpenCode |
| OpenCode Integration | `@opencode-ai/sdk` (JS) | Связь frontend <-> OpenCode API |
| Auth | Telegram Login Widget | Авторизация пользователей |
| Export | GitHub API (via Ktor) | Push результатов в репозиторий |

## Навигация приложения

```
/ (default)
├── /new              # Создание новой лабы (default view)
│   ├── загрузка PDF
│   ├── импорт GitHub
│   ├── загрузка папки/ZIP
│   └── с нуля (шаблон)
├── /labs             # Список лаб (в процессе / выполненные)
├── /workspace/:id    # Рабочее пространство лабы
└── /settings         # Подключение, API-ключи, тема
```

По умолчанию приложение открывается на `/new` — создание новой лабы. Можно перейти к уже выполненным или в процессе.

## Импорт проекта

Пользователь может начать работу четырьмя способами:

```
┌─────────────────────────────────────┐
│   Новая лабораторная работа          │
│                                     │
│   ┌─────────┐  ┌─────────┐         │
│   │  PDF    │  │ Папка   │         │
│   │ методич.│  │ / ZIP    │         │
│   └─────────┘  └─────────┘         │
│   ┌─────────┐  ┌─────────┐         │
│   │  GitHub │  │ С нуля  │         │
│   │ импорт  │  │ (шаблон) │         │
│   └─────────┘  └─────────┘         │
└─────────────────────────────────────┘
```

- **PDF** — загрузка методички, создается workspace из `lab_template`
- **Папка/ZIP** — drag-and-drop или file picker, распаковывается в workspace
- **GitHub** — ввод URL репо, backend клонирует в workspace
- **С нуля** — пустой workspace из `lab_template` шаблона

Все варианты можно комбинировать (например, импорт GitHub репо + загрузка PDF методички).

## Workspace (рабочее пространство)

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│ Lab: Численные методы #3  │ v4 (user) ◀ ▶ │ Cloud │ Export  │
├────────┬──────────────────────────────┬──────────────────────┤
│ Files  │ ┌─tab──┐ ┌─tab──┐ ┌─tab──┐  │ Chat                 │
│ src/   │ │main. │ │index.│ │      │  │                      │
│  main  │ │cpp   │ │typ   │ │      │  │ Анализирую PDF...    │
│  util  │ └──────┘ └──────┘ └──────┘  │ Код написан          │
│ docs/  │ ┌────────────────────────┐  │ Тестирование...      │
│ build/ │ │                        │  │                      │
│        │ │   Monaco Editor /      │  │                      │
│ ────── │ │   Typst Editor         │  │                      │
│ ВЕРСИИ │ │                        │  │──────────────────────│
│ v4 usr │ └────────────────────────┘  │ > Исправь функцию... │
│ v3 ai  │ ┌────────────────────────┐  │                      │
│ v2 usr │ │  Typst Preview / PDF   │  │   [Send]             │
│ v1 ai  │ └────────────────────────┘  │                      │
└────────┴──────────────────────────────┴──────────────────────┘
```

### Компоненты workspace

- **File Tree** (левая панель) — дерево файлов проекта через OpenCode `/file` API + список версий внизу
- **Editor** (центр, вверху) — Monaco Editor для кода, CodeMirror для Typst, с табами
- **Preview** (центр, внизу) — Typst WASM превью или PDF viewer
- **Chat** (правая панель) — чат с OpenCode через SSE events, прогресс агентов, ввод сообщений

## Система версий

Каждое значимое изменение сохраняется как версия (snapshot):

```
Version chain:
  v1 [AI: verificator]  — TASK.md создан
  v2 [AI: coder]        — код написан (src/main.cpp, src/utils.hpp)
  v3 [User: edit]       — пользователь поправил main.cpp
  v4 [AI: qa]           — тесты добавлены
  v5 [User: edit]       — пользователь поправил отчет
  v6 [AI: writer]       — отчет сгенерирован
```

### Хранение версий

- **Cloud**: PostgreSQL + файловое хранилище (S3/local), каждая версия = snapshot измененных файлов
- **Local**: OpenCode revert/unrevert API + локальные git commits для user edits

### Возможности

- Откат к любой предыдущей версии (AI или пользовательской)
- Просмотр diff между версиями
- Навигация по истории (кнопки ◀ ▶ в header)

## Флоу выполнения лабораторной

```
1. Пользователь загружает PDF методички
                    │
2. Koog (backend) анализирует PDF
   → извлекает: предмет, тему, задания, вариант (если есть)
   → формирует структурированный запрос
                    │
3. Создается workspace: клонируется lab_template
                    │
4. Отправляется prompt в OpenCode:
   "@report <path/to/methodology.pdf>"
   (через session.prompt() SDK)
                    │
5. OpenCode multi-agent pipeline работает:
   verificator → coder → math → qa → writer
   (прогресс стримится через SSE events в чат)
                    │
6. Пользователь видит результат:
   - File tree с кодом
   - Typst отчет в редакторе с превью
   - PDF в просмотрщике
                    │
7. Может редактировать и допрашивать в чате
                    │
8. Экспорт: скачать ZIP / push на GitHub
```

## Ключевые API OpenCode

| API | Для чего |
|-----|----------|
| `POST /session` | Создание сессии для лабы |
| `POST /session/:id/message` | Отправка промпта (запуск report агента) |
| `POST /session/:id/prompt_async` | Асинхронная отправка (без ожидания) |
| `GET /event` (SSE) | Стриминг прогресса в реалтайм |
| `GET /file?path=` | File tree навигация |
| `GET /file/content?path=` | Чтение файлов для редактора |
| `GET /session/:id/diff` | Diff изменений |
| `POST /session/:id/revert` | Откат изменений AI |
| `POST /session/:id/unrevert` | Восстановление откатанных |
| `GET /agent` | Список доступных агентов |
| `GET /global/health` | Проверка подключения |
| `POST /session/:id/shell` | Выполнение shell-команд |

## Структура Frontend

```
vibestudy-web/
├── src/
│   ├── routes/
│   │   ├── index.tsx              # Redirect на /new
│   │   ├── new.tsx                # Создание новой лабы
│   │   ├── labs.tsx               # Список лабораторных работ
│   │   ├── workspace.$labId.tsx   # Рабочее пространство
│   │   └── settings.tsx           # Настройки
│   ├── components/
│   │   ├── chat/                  # Чат с OpenCode (SSE events)
│   │   ├── file-tree/             # Дерево файлов (OpenCode /file API)
│   │   ├── editor/                # Monaco editor для кода
│   │   ├── typst-editor/          # CodeMirror + Typst WASM preview
│   │   ├── pdf-viewer/            # Просмотр загруженной методички
│   │   ├── version-list/          # Список версий с откатом
│   │   ├── connection/            # Панель подключения (local/cloud)
│   │   └── layout/                # Header, sidebar, panels
│   ├── lib/
│   │   ├── opencode-client.ts     # Обертка над @opencode-ai/sdk
│   │   ├── api.ts                 # Клиент для Ktor backend
│   │   └── typst-compiler.ts      # WASM Typst компилятор
│   └── stores/
│       ├── connection.ts          # Состояние подключения (local/cloud)
│       ├── workspace.ts           # Состояние рабочего пространства
│       └── versions.ts            # Версии и снепшоты
```

## Структура Backend (Ktor)

```
vibestudy-server/
├── src/main/kotlin/
│   ├── Application.kt
│   ├── routes/
│   │   ├── AuthRoutes.kt          # Telegram OAuth
│   │   ├── LabRoutes.kt           # CRUD лабораторных работ
│   │   ├── UploadRoutes.kt        # Загрузка PDF, ZIP, GitHub import
│   │   ├── ProxyRoutes.kt         # Прокси к OpenCode контейнерам
│   │   ├── VersionRoutes.kt       # Управление версиями
│   │   └── ExportRoutes.kt        # GitHub export, ZIP download
│   ├── services/
│   │   ├── ContainerService.kt    # Docker управление контейнерами
│   │   ├── KoogAnalyzer.kt        # Koog: PDF -> structured TASK
│   │   ├── VersionService.kt      # Управление версиями/снепшотами
│   │   └── GitHubService.kt       # GitHub API integration
│   ├── models/
│   │   ├── User.kt
│   │   ├── Lab.kt
│   │   ├── Version.kt
│   │   └── Subscription.kt        # (для будущей подписки)
│   └── plugins/
│       ├── Routing.kt
│       ├── Security.kt
│       └── Database.kt
```

## Дизайн

- **Стиль**: Минималистичный, как Notion/Linear
- **Тема**: Переключаемая dark/light, обе поддерживаются
- **Язык интерфейса**: Русский в MVP
- **Landing**: Отдельный маркетинговый сайт с описанием, фичами, прайсингом (позже)
- **Приложение**: По умолчанию открывается на создании новой лабы

## Порядок реализации (MVP)

1. **Frontend shell** — роутинг, layout, тема (dark/light), Shadcn компоненты
2. **Страница создания лабы** — загрузка PDF, GitHub import, ZIP upload
3. **Workspace** — file tree, Monaco editor, Typst editor + WASM preview
4. **OpenCode интеграция (local mode)** — подключение к localhost, сессии, чат, SSE стриминг
5. **Система версий** — snapshot/rollback в UI
6. **Backend (Ktor)** — API, auth, Koog PDF pre-processing
7. **Cloud mode** — Docker orchestration, прокси к OpenCode
8. **Export** — ZIP download, GitHub push
9. **Landing page** — маркетинговый сайт

## Будущие фичи (после MVP)

- Подписка через Telegram Stars
- Мультиязычность (i18n)
- Шаблоны для конкретных вузов и предметов
- Совместная работа (collaboration)
- Интеграция с другими платформами (GitLab, Bitbucket)
- Мобильная версия
- Терминал в workspace

## Ссылки

- **Lab Template**: https://github.com/pank-suai/lab_template
- **OpenCode Server API**: https://opencode.ai/docs/server/
- **OpenCode SDK**: https://opencode.ai/docs/sdk/
- **OpenCode Web**: https://opencode.ai/docs/web/
