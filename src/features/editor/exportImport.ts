import { toPng, toSvg } from "html-to-image";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { useEditor } from "./store";

function canvasElement(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>(".react-flow__viewport")
      ?.parentElement ?? null
  );
}

function slug(name: string) {
  return (name || "diagram")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function download(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  a.click();
}

interface ExportOpts {
  transparent?: boolean;
  scale?: number;
  selectedOnly?: boolean;
}

async function captureNode(
  opts: ExportOpts,
  kind: "png" | "svg",
): Promise<string> {
  const el = canvasElement();
  if (!el) throw new Error("Canvas not ready");
  const bg = opts.transparent
    ? undefined
    : getComputedStyle(document.body).backgroundColor;
  const filter = (node: Element) => {
    // exclude minimap, controls, panels
    if (!(node instanceof HTMLElement)) return true;
    if (node.classList?.contains("react-flow__minimap")) return false;
    if (node.classList?.contains("react-flow__controls")) return false;
    if (node.classList?.contains("react-flow__panel")) return false;
    return true;
  };
  const commonOpts = {
    backgroundColor: bg,
    pixelRatio: opts.scale ?? 2,
    filter,
    cacheBust: true,
  };
  return kind === "png"
    ? await toPng(el, commonOpts)
    : await toSvg(el, commonOpts);
}

export async function captureThumbnail(): Promise<string> {
  return await captureNode({ scale: 0.5 }, "png");
}

export async function exportPNG(opts: ExportOpts = {}) {
  try {
    const url = await captureNode(opts, "png");
    const s = useEditor.getState();
    download(url, `${slug(s.projectName)}.png`);
    toast.success("Exported PNG");
  } catch (e) {
    toast.error("PNG export failed");
    console.error(e);
  }
}

export async function exportSVG(opts: ExportOpts = {}) {
  try {
    const url = await captureNode(opts, "svg");
    const s = useEditor.getState();
    download(url, `${slug(s.projectName)}.svg`);
    toast.success("Exported SVG");
  } catch (e) {
    toast.error("SVG export failed");
    console.error(e);
  }
}

export async function exportPDF(opts: ExportOpts = {}) {
  try {
    const dataUrl = await captureNode({ ...opts, transparent: false }, "png");
    const img = new Image();
    img.src = dataUrl;
    await new Promise((r) => (img.onload = r));
    const orientation = img.width >= img.height ? "landscape" : "portrait";
    const pdf = new jsPDF({
      orientation,
      unit: "px",
      format: [img.width, img.height],
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, img.width, img.height);
    const s = useEditor.getState();
    pdf.save(`${slug(s.projectName)}.pdf`);
    toast.success("Exported PDF");
  } catch (e) {
    toast.error("PDF export failed");
    console.error(e);
  }
}

export function exportJSON() {
  const s = useEditor.getState();
  const doc = {
    version: 1,
    kind: "portexa-diagram",
    projectName: s.projectName,
    nodes: s.nodes,
    edges: s.edges,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(doc, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  download(url, `${slug(s.projectName)}.json`);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast.success("Exported JSON");
}

export async function copyPNGToClipboard() {
  try {
    const url = await captureNode({ transparent: true, scale: 2 }, "png");
    const blob = await (await fetch(url)).blob();
    if (!navigator.clipboard || !window.ClipboardItem)
      throw new Error("Clipboard unavailable");
    await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
    toast.success("Copied to clipboard");
  } catch (e) {
    toast.error("Copy to clipboard failed");
    console.error(e);
  }
}

export async function importJSONFile(file: File) {
  try {
    const text = await file.text();
    const doc = JSON.parse(text);
    if (!doc.nodes || !doc.edges) throw new Error("Invalid diagram file");
    useEditor.getState().loadSnapshot({
      nodes: doc.nodes,
      edges: doc.edges,
      projectName: doc.projectName ?? file.name.replace(/\.json$/, ""),
    });
    toast.success("Imported diagram");
  } catch (e) {
    toast.error("Import failed");
    console.error(e);
  }
}

export async function importImageFile(
  file: File,
  position: { x: number; y: number },
) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result as string;
    const img = new Image();
    img.onload = () => {
      const maxDim = 480;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.max(80, img.width * scale);
      const h = Math.max(80, img.height * scale);
      useEditor.getState().addImage(dataUrl, position, w, h);
      toast.success("Image added");
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

export function openFileDialog(accept: string, onFile: (f: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = accept;
  input.onchange = () => {
    const f = input.files?.[0];
    if (f) onFile(f);
  };
  input.click();
}
