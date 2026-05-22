import JSZip from "jszip";

export interface OutputBundleInput {
  generatedXsq: string | null;
  generatedFseq: Uint8Array | null;
  generatedWav: Blob | null;
}

export async function createOutputZip({
  generatedXsq,
  generatedFseq,
  generatedWav,
}: OutputBundleInput): Promise<Blob | null> {
  if (!generatedXsq) return null;

  const outZip = new JSZip();
  if (generatedFseq) {
    outZip.file("lightshow.fseq", generatedFseq);
  }
  outZip.file("lightshow.xsq", generatedXsq);
  if (generatedWav) {
    outZip.file("lightshow.wav", generatedWav);
  }

  return outZip.generateAsync({ type: "blob" });
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}
