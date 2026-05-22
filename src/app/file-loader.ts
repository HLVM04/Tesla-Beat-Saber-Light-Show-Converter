import JSZip from "jszip";
import type { LoadedFiles } from "./types";

export async function loadZipFiles(file: File): Promise<LoadedFiles> {
  const loadedFiles: LoadedFiles = {};
  const zip = await JSZip.loadAsync(file);
  const promises: Promise<void>[] = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;

    const promise = entry.async("arraybuffer").then((buffer) => {
      const name = relativePath.split("/").pop() || relativePath;
      loadedFiles[name.toLowerCase()] = {
        name,
        data: buffer,
      };
    });
    promises.push(promise);
  });

  await Promise.all(promises);
  return loadedFiles;
}

export async function loadSelectedFiles(files: FileList): Promise<LoadedFiles> {
  const loadedFiles: LoadedFiles = {};
  const promises: Promise<void>[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const relativePath = file.webkitRelativePath || file.name;
    const name = relativePath.split("/").pop() || relativePath;

    const promise = file.arrayBuffer().then((buffer) => {
      loadedFiles[name.toLowerCase()] = {
        name,
        data: buffer,
      };
    });
    promises.push(promise);
  }

  await Promise.all(promises);
  return loadedFiles;
}
