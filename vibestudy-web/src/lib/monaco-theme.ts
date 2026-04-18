import type { Monaco } from "@monaco-editor/react";

function hslTripletToCssColor(triplet: string): string {
  const t = triplet.trim();
  if (!t) return "";
  return t.includes("(") ? t : `hsl(${t})`;
}

function cssColorToHex(cssColor: string, fallbackHex: string): string {
  if (typeof document === "undefined") return fallbackHex;
  if (
    /^#[0-9a-fA-F]{6}$/.test(cssColor) ||
    /^#[0-9a-fA-F]{3}$/.test(cssColor)
  ) {
    return cssColor.length === 4
      ? `#${cssColor[1]}${cssColor[1]}${cssColor[2]}${cssColor[2]}${cssColor[3]}${cssColor[3]}`
      : cssColor;
  }
  const probe = document.createElement("div");
  probe.style.color = "";
  probe.style.color = cssColor;
  if (!probe.style.color) return fallbackHex;
  document.documentElement.appendChild(probe);
  const rgb = getComputedStyle(probe).color;
  probe.remove();
  const m = rgb.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (!m) return fallbackHex;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

function hexVar(name: string, fallbackHex: string): string {
  if (typeof document === "undefined") return fallbackHex;
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  if (!raw) return fallbackHex;
  const css = hslTripletToCssColor(raw);
  return cssColorToHex(css, fallbackHex);
}

export function defineVibestudyMonacoThemes(monaco: Monaco) {
  const bg = hexVar("--background", "#ffffff");
  const fg = hexVar("--foreground", "#18181b");
  const muted = hexVar("--muted", "#f4f4f5");
  const border = hexVar("--border", "#e4e4e7");
  const line = hexVar("--muted-foreground", "#71717a");

  monaco.editor.defineTheme("vibestudy-light", {
    base: "vs",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": bg,
      "editor.foreground": fg,
      "editorLineNumber.foreground": line,
      "editorLineNumber.activeForeground": fg,
      "editorCursor.foreground": fg,
      "editor.selectionBackground": muted,
      "editor.inactiveSelectionBackground": muted,
      "editor.lineHighlightBackground": muted,
      "editorWhitespace.foreground": border,
      "scrollbarSlider.background": border,
      "scrollbarSlider.hoverBackground": line,
    },
  });

  const dbg = hexVar("--background", "#18181b");
  const dfg = hexVar("--foreground", "#fafafa");
  const dmuted = hexVar("--muted", "#27272a");
  const dborder = hexVar("--border", "#27272a");
  const dline = hexVar("--muted-foreground", "#a1a1aa");

  monaco.editor.defineTheme("vibestudy-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [],
    colors: {
      "editor.background": dbg,
      "editor.foreground": dfg,
      "editorLineNumber.foreground": dline,
      "editorLineNumber.activeForeground": dfg,
      "editorCursor.foreground": dfg,
      "editor.selectionBackground": dmuted,
      "editor.inactiveSelectionBackground": dmuted,
      "editor.lineHighlightBackground": dmuted,
      "editorWhitespace.foreground": dborder,
      "scrollbarSlider.background": dborder,
      "scrollbarSlider.hoverBackground": dline,
    },
  });
}

export function monacoThemeId(
  appTheme: "light" | "dark",
): "vibestudy-light" | "vibestudy-dark" {
  return appTheme === "dark" ? "vibestudy-dark" : "vibestudy-light";
}
