import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import {
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  FolderOpen,
  Loader2,
} from "lucide-react";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWorkspaceStore } from "@/stores/workspace";
import {
  useFileList,
  subscribeEvents,
  qk,
  fetchFileList,
  type SDKFileEntry,
} from "@/lib/opencode-client";
import { useConnectionStore } from "@/stores/connection";

interface FileTreeProps {
  directory?: string;
  sessionId?: string;
}

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children: TreeNode[];
}

const MOCK_FILES: SDKFileEntry[] = [
  { name: "src",           path: "src",            absolute: "", type: "directory", ignored: false },
  { name: "main.cpp",      path: "src/main.cpp",   absolute: "", type: "file",      ignored: false },
  { name: "utils.hpp",     path: "src/utils.hpp",  absolute: "", type: "file",      ignored: false },
  { name: "docs",          path: "docs",           absolute: "", type: "directory", ignored: false },
  { name: "index.typ",     path: "docs/index.typ", absolute: "", type: "file",      ignored: false },
  { name: "TASK.md",       path: "TASK.md",        absolute: "", type: "file",      ignored: false },
  { name: "Makefile",      path: "Makefile",       absolute: "", type: "file",      ignored: false },
  { name: "opencode.json", path: "opencode.json",  absolute: "", type: "file",      ignored: false },
];

function normalizeSeparators(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "");
}

function isDotfilePath(path: string): boolean {
  return normalizeSeparators(path)
    .split("/")
    .filter(Boolean)
    .some((seg) => seg.startsWith("."));
}

function normalizeListingPaths(listPath: string, entries: SDKFileEntry[]): SDKFileEntry[] {
  const lp = listPath === "." ? "" : normalizeSeparators(listPath);
  return entries.map((e) => {
    const ep = normalizeSeparators(e.path);
    if (!lp) return { ...e, path: ep };
    if (ep === lp || ep.startsWith(`${lp}/`)) return { ...e, path: ep };
    if (!ep.includes("/")) return { ...e, path: `${lp}/${ep}` };
    return { ...e, path: ep };
  });
}

function sortSiblings(a: TreeNode, b: TreeNode): number {
  if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
  return a.name.localeCompare(b.name);
}

function sortTreeRecursive(nodes: TreeNode[]): void {
  nodes.sort(sortSiblings);
  for (const n of nodes) sortTreeRecursive(n.children);
}

function buildTree(nodes: SDKFileEntry[]): TreeNode[] {
  const visible = nodes.filter((f) => !f.ignored && !isDotfilePath(f.path)).map((n) => ({
    ...n,
    path: normalizeSeparators(n.path),
  }));
  const byPath = new Map<string, SDKFileEntry>();

  for (const n of visible) {
    byPath.set(n.path, n);
  }

  for (const n of visible) {
    const parts = n.path.split("/").filter(Boolean);
    for (let depth = 1; depth < parts.length; depth++) {
      const prefix = parts.slice(0, depth).join("/");
      if (!byPath.has(prefix)) {
        byPath.set(prefix, {
          name: parts[depth - 1]!,
          path: prefix,
          absolute: "",
          type: "directory",
          ignored: false,
        });
      }
    }
  }

  const enriched = [...byPath.values()];
  enriched.sort((a, b) => {
    const da = a.path.split("/").filter(Boolean).length;
    const db = b.path.split("/").filter(Boolean).length;
    if (da !== db) return da - db;
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const node of enriched) {
    const treeNode: TreeNode = { name: node.name, path: node.path, type: node.type, children: [] };
    map.set(node.path, treeNode);

    const parts = node.path.split("/").filter(Boolean);
    if (parts.length === 1) {
      root.push(treeNode);
    } else {
      const parentPath = parts.slice(0, -1).join("/");
      const parent = map.get(parentPath);
      if (parent) parent.children.push(treeNode);
      else root.push(treeNode);
    }
  }

  sortTreeRecursive(root);
  return root;
}

const RegisterFolderContext = createContext<(path: string) => void>(() => {});

function TreeNodeItem({
  node, depth, activeFile, onSelectFile,
}: {
  node: TreeNode;
  depth: number;
  activeFile: string | null;
  onSelectFile: (path: string) => void;
}) {
  const registerExpanded = useContext(RegisterFolderContext);
  const [open, setOpen] = useState(depth < 2);
  const isDir    = node.type === "directory";
  const isActive = activeFile === node.path;

  useEffect(() => {
    if (!isDir || !open) return;
    registerExpanded(node.path);
  }, [isDir, open, node.path, registerExpanded]);

  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center gap-1.5 rounded-sm py-[3px] text-sm transition-colors hover:bg-accent ${
          isActive ? "bg-accent text-accent-foreground" : "text-foreground"
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => (isDir ? setOpen((v) => !v) : onSelectFile(node.path))}
      >
        {isDir ? (
          <>
            {open
              ? <ChevronDown  className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            {open
              ? <FolderOpen className="h-4 w-4 shrink-0 text-primary/70" />
              : <Folder     className="h-4 w-4 shrink-0 text-primary/70" />}
          </>
        ) : (
          <>
            <span className="w-3.5 shrink-0" />
            <File className="h-4 w-4 shrink-0 text-muted-foreground" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>

      {isDir && open && node.children.map((child) => (
        <TreeNodeItem
          key={child.path} node={child} depth={depth + 1}
          activeFile={activeFile} onSelectFile={onSelectFile}
        />
      ))}
    </div>
  );
}

export function FileTree({ directory, sessionId }: FileTreeProps) {
  const connected = useConnectionStore((s) => s.connection.connected);
  const { activeFile, openEditorFile } = useWorkspaceStore();
  const qc = useQueryClient();

  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set());
  const autoExpandedForDir = useRef<string | null>(null);

  const { data: rootFiles, isLoading: rootLoading } = useFileList(directory ?? "", ".");

  useEffect(() => {
    setExpandedPaths(new Set());
    autoExpandedForDir.current = null;
  }, [directory]);

  useEffect(() => {
    if (!directory || !rootFiles || !connected) return;
    if (autoExpandedForDir.current === directory) return;
    autoExpandedForDir.current = directory;
    const top = new Set<string>();
    for (const n of rootFiles) {
      if (n.ignored || n.type !== "directory") continue;
      const p = normalizeSeparators(n.path);
      if (p.split("/").filter(Boolean).length === 1) top.add(p);
    }
    setExpandedPaths(top);
  }, [directory, rootFiles, connected]);

  const registerExpanded = useCallback((path: string) => {
    const p = normalizeSeparators(path);
    setExpandedPaths((prev) => {
      if (prev.has(p)) return prev;
      const next = new Set(prev);
      next.add(p);
      return next;
    });
  }, []);

  const subPaths = useMemo(() => [...expandedPaths], [expandedPaths]);

  const subLists = useQueries({
    queries: subPaths.map((path) => ({
      queryKey: qk.files(directory ?? "", path),
      queryFn: async () => {
        const raw = await fetchFileList(directory!, path);
        return normalizeListingPaths(path, raw);
      },
      enabled: connected && !!directory && subPaths.length > 0,
      staleTime: 5_000,
    })),
  });

  const subFetching = subLists.some((q) => q.isFetching);

  const allFlat = useMemo(() => {
    const map = new Map<string, SDKFileEntry>();
    const put = (arr: SDKFileEntry[] | undefined) => {
      for (const x of arr ?? []) {
        if (x.ignored || isDotfilePath(x.path)) continue;
        const path = normalizeSeparators(x.path);
        map.set(path, { ...x, path });
      }
    };
    put(rootFiles?.map((n) => ({ ...n, path: normalizeSeparators(n.path) })));
    for (const q of subLists) put(q.data);
    return [...map.values()];
  }, [rootFiles, subLists]);

  useEffect(() => {
    if (!directory || !connected) return;
    const cleanup = subscribeEvents(
      null,
      (ev) => {
        const event = ev as Record<string, unknown>;
        if (event.type === "file.edited") {
          qc.invalidateQueries({ queryKey: ["files", directory] });
          if (activeFile) {
            qc.invalidateQueries({ queryKey: qk.fileContent(directory, activeFile) });
          }
        }
      }
    );
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directory, sessionId, connected]);

  const files = connected && directory && rootFiles
    ? buildTree(allFlat)
    : buildTree(MOCK_FILES);

  return (
    <RegisterFolderContext.Provider value={registerExpanded}>
      <div className="flex h-full flex-col">
        <div className="flex h-9 shrink-0 items-center justify-between border-b px-3">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Файлы
          </span>
          {connected && (rootLoading || subFetching) && (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          )}
        </div>
        <ScrollArea className="flex-1">
          <div className="p-1">
            {!connected && (
              <p className="px-2 py-1 text-[11px] text-muted-foreground/60">
                Нет подключения — mock данные
              </p>
            )}
            {files.map((node) => (
              <TreeNodeItem
                key={node.path} node={node} depth={0}
                activeFile={activeFile} onSelectFile={openEditorFile}
              />
            ))}
          </div>
        </ScrollArea>
      </div>
    </RegisterFolderContext.Provider>
  );
}
