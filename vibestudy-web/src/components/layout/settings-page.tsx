import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Wifi,
  Cloud,
  Sun,
  Moon,
  Check,
  Folder,
  User,
  Monitor,
  Cpu,
  Search,
  X,
  Zap,
  Brain,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConnectionStore } from "@/stores/connection";
import { useProfileStore } from "@/stores/profile";
import {
  useLocalSettingsStore,
  TEMPLATE_AGENTS,
  LIGHT_AGENTS,
  HEAVY_AGENTS,
  type ModelMode,
} from "@/stores/local-settings";
import { useProviders } from "@/lib/opencode-client";
import { useTheme } from "@/hooks/use-theme";

// ── types ──────────────────────────────────────────────────────────────────

interface ModelOption {
  value: string;       // "providerID/modelID"
  label: string;       // "Claude 3.5 Sonnet"
  provider: string;    // "Anthropic"
  providerId: string;
}

// ── ModelPicker ────────────────────────────────────────────────────────────
// Dropdown with search, grouped by provider

function ModelPicker({
  value,
  onChange,
  options,
  placeholder = "По умолчанию",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ModelOption[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = query.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.provider.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase())
      )
    : options;

  // Group by provider
  const grouped: Record<string, ModelOption[]> = {};
  for (const o of filtered) {
    if (!grouped[o.provider]) grouped[o.provider] = [];
    grouped[o.provider].push(o);
  }

  const current = options.find((o) => o.value === value);
  const displayLabel = current ? `${current.provider} / ${current.label}` : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); setQuery(""); }}
        className={`flex w-full items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm transition-colors hover:bg-accent/50 ${
          open ? "ring-2 ring-ring" : ""
        }`}
      >
        <span className={`truncate ${!current ? "text-muted-foreground" : ""}`}>
          {displayLabel}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover shadow-lg">
          {/* Search */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Поиск модели..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto py-1">
            {/* Default option */}
            <button
              type="button"
              onClick={() => { onChange(""); setOpen(false); setQuery(""); }}
              className={`flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                !value ? "text-primary font-medium" : "text-muted-foreground"
              }`}
            >
              {placeholder}
            </button>

            {Object.keys(grouped).length === 0 && (
              <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                Ничего не найдено
              </p>
            )}

            {Object.entries(grouped).map(([provider, models]) => (
              <div key={provider}>
                <p className="px-3 pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {provider}
                </p>
                {models.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { onChange(m.value); setOpen(false); setQuery(""); }}
                    className={`flex w-full items-center px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                      value === m.value ? "text-primary font-medium" : ""
                    }`}
                  >
                    {m.label}
                    {value === m.value && <Check className="ml-auto h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] items-start gap-4">
      <div className="pt-2">
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

function useModelOptions() {
  const { data: providersData } = useProviders();
  const connected = useConnectionStore((s) => s.connection.connected);

  if (!connected || !providersData) return [];

  const options: ModelOption[] = [];
  for (const p of providersData.all) {
    if (!(providersData.connected ?? []).includes(p.id)) continue;
    for (const [, m] of Object.entries(p.models)) {
      options.push({
        value: `${p.id}/${m.id}`,
        label: (m as { name?: string; id: string }).name || m.id,
        provider: p.name,
        providerId: p.id,
      });
    }
  }
  return options;
}

// ── sections ───────────────────────────────────────────────────────────────

function SectionProfile() {
  const { profile, setProfile, resetOnboarding } = useProfileStore();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    university:   profile?.university   ?? "",
    faculty:      profile?.faculty      ?? "",
    fullName:     profile?.fullName     ?? "",
    group:        profile?.group        ?? "",
    variantGroup: profile?.variantGroup ?? "",
    extraInfo:    profile?.extraInfo    ?? "",
  });
  const [saved, setSaved] = useState(false);

  function update(key: keyof typeof form, value: string) {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  }

  function save() {
    setProfile(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const dirty =
    form.university   !== (profile?.university   ?? "") ||
    form.faculty      !== (profile?.faculty      ?? "") ||
    form.fullName     !== (profile?.fullName     ?? "") ||
    form.group        !== (profile?.group        ?? "") ||
    form.variantGroup !== (profile?.variantGroup ?? "") ||
    form.extraInfo    !== (profile?.extraInfo    ?? "");

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Профиль</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Используется в отчётах и при выполнении лаб
        </p>
      </div>

      <div className="space-y-4">
        <FieldRow label="ФИО">
          <Input placeholder="Иванов Иван Иванович" value={form.fullName}
            onChange={(e) => update("fullName", e.target.value)} />
        </FieldRow>
        <FieldRow label="Учебное заведение">
          <Input placeholder="МГТУ им. Баумана" value={form.university}
            onChange={(e) => update("university", e.target.value)} />
        </FieldRow>
        <FieldRow label="Факультет / Институт">
          <Input placeholder="ИУ" value={form.faculty}
            onChange={(e) => update("faculty", e.target.value)} />
        </FieldRow>
        <FieldRow label="Группа">
          <Input placeholder="ИУ5-41" value={form.group}
            onChange={(e) => update("group", e.target.value)} />
        </FieldRow>
        <FieldRow label="Вариант" hint="Номер варианта для всех работ">
          <Input placeholder="5" value={form.variantGroup}
            onChange={(e) => update("variantGroup", e.target.value)}
            className="max-w-[120px]" />
        </FieldRow>
        <FieldRow label="Доп. информация" hint="AI учитывает при выполнении">
          <Textarea placeholder="Например: код на C++17, комментарии на русском..."
            value={form.extraInfo}
            onChange={(e) => update("extraInfo", e.target.value)}
            className="min-h-[80px] resize-none text-sm" rows={3} />
        </FieldRow>
      </div>

      <div className="flex items-center gap-3">
        <Button size="sm" onClick={save} disabled={!dirty && !saved} className="gap-2">
          {saved ? <><Check className="h-3.5 w-3.5" />Сохранено</> : "Сохранить"}
        </Button>
        <Button variant="ghost" size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => { resetOnboarding(); navigate({ to: "/onboarding" }); }}>
          Пройти настройку заново
        </Button>
      </div>
    </div>
  );
}

function SectionLocal() {
  const { connection, connect, disconnect } = useConnectionStore();
  const {
    labsDirectory, setLabsDirectory,
    modelMode, setModelMode,
    lightModel, setLightModel,
    heavyModel, setHeavyModel,
    agentModels, setAgentModel, clearAgentModel,
  } = useLocalSettingsStore();

  const [baseUrl, setBaseUrl] = useState(connection.baseUrl);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dirInput, setDirInput] = useState(labsDirectory);
  const [dirSaved, setDirSaved] = useState(false);

  const modelOptions = useModelOptions();

  async function handleConnect() {
    setIsConnecting(true);
    await connect(baseUrl);
    setIsConnecting(false);
  }

  function saveDir() {
    setLabsDirectory(dirInput.trim() || "~/vibestudy");
    setDirSaved(true);
    setTimeout(() => setDirSaved(false), 2000);
  }

  const dirDirty = dirInput.trim() !== labsDirectory;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold">Локальный режим</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          OpenCode запускается на вашем компьютере
        </p>
      </div>

      {/* Connection */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Подключение</p>
        <div className="flex gap-2">
          <Input
            placeholder="http://localhost:4096"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            className="flex-1 font-mono text-sm"
          />
          {connection.connected ? (
            <Button variant="outline" onClick={disconnect} className="gap-2 shrink-0">
              <Wifi className="h-4 w-4 text-green-500" />
              Отключить
            </Button>
          ) : (
            <Button onClick={handleConnect} disabled={isConnecting} className="shrink-0">
              {isConnecting ? "Подключение…" : "Подключить"}
            </Button>
          )}
        </div>
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1.5">Как запустить:</p>
          <code className="block rounded bg-background border px-3 py-2 text-xs font-mono select-all">
            opencode serve --port 4096 --cors http://localhost:5173
          </code>
        </div>
        {connection.connected && (
          <p className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
            <Wifi className="h-3 w-3" />
            Подключено к {connection.baseUrl}
          </p>
        )}
      </div>

      <Separator />

      {/* Labs directory */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Папка для лаб</p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Folder className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="~/vibestudy"
              value={dirInput}
              onChange={(e) => { setDirInput(e.target.value); setDirSaved(false); }}
              className="pl-8 font-mono text-sm"
            />
          </div>
          <Button size="sm" variant={dirSaved ? "outline" : "default"}
            onClick={saveDir} disabled={!dirDirty && !dirSaved}
            className="shrink-0 gap-1.5">
            {dirSaved ? <><Check className="h-3.5 w-3.5" />Сохранено</> : "Сохранить"}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Model settings */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Модели агентов</p>
          {/* Mode toggle */}
          <div className="flex rounded-md border p-0.5 gap-0.5">
            {(["simple", "advanced"] as ModelMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModelMode(m)}
                className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                  modelMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "simple" ? "Простой" : "Сложный"}
              </button>
            ))}
          </div>
        </div>

        {!connection.connected ? (
          <p className="text-sm text-muted-foreground">
            Подключитесь к OpenCode, чтобы выбрать модели
          </p>
        ) : modelOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Нет подключённых провайдеров с моделями
          </p>
        ) : modelMode === "simple" ? (
          /* ── Simple mode ── */
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Лёгкая модель используется для verificator, writer, qa, study-material.
              Тяжёлая — для report, coder, math.
            </p>
            <div className="space-y-3">
              <FieldRow label="Лёгкая модель"
                hint={LIGHT_AGENTS.join(", ")}>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 shrink-0 text-amber-500" />
                  <div className="flex-1">
                    <ModelPicker
                      value={lightModel}
                      onChange={setLightModel}
                      options={modelOptions}
                      placeholder="По умолчанию из opencode.json"
                    />
                  </div>
                </div>
              </FieldRow>
              <FieldRow label="Тяжёлая модель"
                hint={HEAVY_AGENTS.join(", ")}>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 shrink-0 text-purple-500" />
                  <div className="flex-1">
                    <ModelPicker
                      value={heavyModel}
                      onChange={setHeavyModel}
                      options={modelOptions}
                      placeholder="По умолчанию из opencode.json"
                    />
                  </div>
                </div>
              </FieldRow>
            </div>
          </div>
        ) : (
          /* ── Advanced mode ── */
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Выберите модель для каждого агента. «По умолчанию» — модель из opencode.json шаблона.
            </p>
            {TEMPLATE_AGENTS.map((agent) => (
              <div key={agent.name} className="grid grid-cols-[160px_1fr] items-center gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    {agent.weight === "heavy"
                      ? <Brain className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                      : <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    <p className="text-sm font-medium">{agent.label}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate pl-5">
                    {agent.desc}
                  </p>
                </div>
                <ModelPicker
                  value={agentModels[agent.name] ?? ""}
                  onChange={(v) =>
                    v ? setAgentModel(agent.name, v) : clearAgentModel(agent.name)
                  }
                  options={modelOptions}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionAppearance() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Внешний вид</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Тема интерфейса</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Тема</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {theme === "dark" ? "Тёмная тема активна" : "Светлая тема активна"}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={toggleTheme} className="gap-2">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          Переключить
        </Button>
      </div>
    </div>
  );
}

function SectionCloud() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Облачный режим</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Запуск лаб на серверах без установки OpenCode
        </p>
      </div>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <p className="text-sm font-medium">Подписка через Telegram Stars</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Выполнение лаб в облаке — в разработке
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled className="gap-2">
          <Cloud className="h-4 w-4" />
          Скоро
        </Button>
      </div>
    </div>
  );
}

// ── Nav ────────────────────────────────────────────────────────────────────

type Tab = "profile" | "local" | "appearance" | "cloud";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "profile",    label: "Профиль",    icon: User    },
  { id: "local",      label: "Локальный",  icon: Cpu     },
  { id: "appearance", label: "Внешний вид",icon: Monitor },
  { id: "cloud",      label: "Облако",     icon: Cloud   },
];

// ── Page ───────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="flex h-full">
      {/* Sidebar nav */}
      <nav className="flex w-44 shrink-0 flex-col gap-0.5 border-r p-3 pt-4">
        <div className="mb-2 flex items-center gap-2 px-2">
          <Button variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => navigate({ to: "/new" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold">Настройки</span>
        </div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
              tab === id
                ? "bg-accent text-accent-foreground font-medium"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}>
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-8 py-8 max-w-xl">
          {tab === "profile"    && <SectionProfile />}
          {tab === "local"      && <SectionLocal />}
          {tab === "appearance" && <SectionAppearance />}
          {tab === "cloud"      && <SectionCloud />}
        </div>
      </div>
    </div>
  );
}
