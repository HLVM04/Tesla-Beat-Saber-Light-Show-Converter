import "./style.css";
import JSZip from "jszip";
import { parseMapData, LightshowConverter } from "./converter";
import type { InfoData } from "./converter";
import { convertOggToWav } from "./wav-encoder";

// --- State Variables ---
interface MapFile {
  name: string;
  data: ArrayBuffer;
}

let loadedFiles: Record<string, MapFile> = {};
let parsedInfo: InfoData | null = null;
let generatedXsq: string | null = null;
let generatedWav: Blob | null = null;
let generatedZip: Blob | null = null;

// --- DOM Elements ---
const dropZone = document.getElementById("drop-zone")!;
const zipInput = document.getElementById("zip-input")! as HTMLInputElement;
const folderInput = document.getElementById("folder-input")! as HTMLInputElement;
const btnBrowseZip = document.getElementById("btn-browse-zip")!;
const btnBrowseFolder = document.getElementById("btn-browse-folder")!;

const mapInfoCard = document.getElementById("map-info-card")!;
const coverPreview = document.getElementById("cover-preview")! as HTMLImageElement;
const coverPlaceholder = document.getElementById("cover-placeholder")!;
const songTitle = document.getElementById("song-title")!;
const songSub = document.getElementById("song-sub")!;
const songArtist = document.getElementById("song-artist")!;
const mapBpm = document.getElementById("map-bpm")!;
const mapVersionBadge = document.getElementById("map-version-badge")!;

const configZone = document.getElementById("config-zone")!;
const difficultySelect = document.getElementById("difficulty-select")! as HTMLSelectElement;
const btnConvert = document.getElementById("btn-convert")! as HTMLButtonElement;

const logZone = document.getElementById("log-zone")!;
const processLoader = document.getElementById("process-loader")!;
const consoleOutput = document.getElementById("console-output")!;

const downloadZone = document.getElementById("download-zone")!;
const btnDownloadBundle = document.getElementById("btn-download-bundle")! as HTMLButtonElement;
const btnDownloadXsq = document.getElementById("btn-download-xsq")! as HTMLButtonElement;
const btnDownloadWav = document.getElementById("btn-download-wav")! as HTMLButtonElement;
const themeToggle = document.getElementById("theme-toggle")! as HTMLInputElement;

// --- Initialize Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  setupDragAndDrop();
  setupFileSelects();
  setupConversion();
  setupDownloads();
});

// --- Theme Setup ---
function setupTheme() {
  // Check local storage or system preference
  const savedTheme = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  
  if (savedTheme === "shadcn-dark" || (!savedTheme && prefersDark)) {
    document.documentElement.setAttribute("data-theme", "shadcn-dark");
    themeToggle.checked = true;
  } else {
    document.documentElement.setAttribute("data-theme", "shadcn");
    themeToggle.checked = false;
  }

  themeToggle.addEventListener("change", (e) => {
    const isDark = (e.target as HTMLInputElement).checked;
    const theme = isDark ? "shadcn-dark" : "shadcn";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  });
}

// --- Drag & Drop ---
function setupDragAndDrop() {
  dropZone.addEventListener("click", () => {
    // Default browse to ZIP
    zipInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-accent", "bg-base-200");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-accent", "bg-base-200");
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-accent", "bg-base-200");
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (files.length === 1 && files[0].name.endsWith(".zip")) {
      await processZipFile(files[0]);
    } else {
      // Process list of files (as if a folder was dropped)
      await processFileList(files);
    }
  });
}

// --- File Selection ---
function setupFileSelects() {
  btnBrowseZip.addEventListener("click", (e) => {
    e.stopPropagation();
    zipInput.click();
  });

  btnBrowseFolder.addEventListener("click", (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  zipInput.addEventListener("change", async () => {
    if (zipInput.files && zipInput.files[0]) {
      await processZipFile(zipInput.files[0]);
    }
  });

  folderInput.addEventListener("change", async () => {
    if (folderInput.files && folderInput.files.length > 0) {
      await processFileList(folderInput.files);
    }
  });
}

// --- Console Logger Helper ---
function logConsole(msg: string, type: "info" | "success" | "warning" | "error" = "info") {
  const timestamp = new Date().toLocaleTimeString();
  const line = document.createElement("div");
  
  let colorClass = "text-base-content/80";
  if (type === "success") colorClass = "text-success font-semibold";
  if (type === "warning") colorClass = "text-warning font-semibold";
  if (type === "error") colorClass = "text-error font-semibold";

  line.className = `py-0.5 ${colorClass}`;
  
  // Format message nicely
  const prefix = `[${timestamp}] ${type.toUpperCase()}: `;
  line.innerText = prefix + msg;
  
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

function clearConsole() {
  consoleOutput.innerHTML = "";
}

// --- ZIP processing ---
async function processZipFile(file: File) {
  resetUI();
  logZone.classList.remove("hidden");
  processLoader.classList.remove("hidden");
  logConsole(`Extracting ZIP archive: ${file.name}...`);

  loadedFiles = {};
  
  try {
    const zip = await JSZip.loadAsync(file);
    const promises: Promise<void>[] = [];
    
    zip.forEach((relativePath, entry) => {
      if (entry.dir) return;
      
      const p = entry.async("arraybuffer").then((buffer) => {
        // Flatten directory structure by extracting base name
        const name = relativePath.split("/").pop() || relativePath;
        loadedFiles[name.toLowerCase()] = {
          name: name,
          data: buffer,
        };
      });
      promises.push(p);
    });

    await Promise.all(promises);
    logConsole(`Successfully extracted ${Object.keys(loadedFiles).length} files from archive.`);
    processLoadedFiles();
  } catch (err) {
    logConsole(`ZIP extraction failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    processLoader.classList.add("hidden");
  }
}

// --- Directory/FileList processing ---
async function processFileList(files: FileList) {
  resetUI();
  logZone.classList.remove("hidden");
  processLoader.classList.remove("hidden");
  logConsole(`Reading ${files.length} selected files...`);

  loadedFiles = {};

  try {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Get relative path or fallback to filename
      const relativePath = file.webkitRelativePath || file.name;
      const name = relativePath.split("/").pop() || relativePath;

      const p = file.arrayBuffer().then((buffer) => {
        loadedFiles[name.toLowerCase()] = {
          name: name,
          data: buffer,
        };
      });
      promises.push(p);
    }

    await Promise.all(promises);
    logConsole(`Successfully loaded ${Object.keys(loadedFiles).length} files.`);
    processLoadedFiles();
  } catch (err) {
    logConsole(`File load failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    processLoader.classList.add("hidden");
  }
}

// --- Process Loaded Files & Read Info.dat ---
function processLoadedFiles() {
  // Look for Info.dat or info.dat
  const infoKey = "info.dat";
  if (!loadedFiles[infoKey]) {
    logConsole("Error: Could not find Info.dat in the uploaded files. Is this a valid Beat Saber map folder?", "error");
    processLoader.classList.add("hidden");
    return;
  }

  try {
    const decoder = new TextDecoder("utf-8");
    const infoJson = decoder.decode(loadedFiles[infoKey].data);
    parsedInfo = JSON.parse(infoJson) as InfoData;

    logConsole(`Parsed Info.dat. Song Title: "${parsedInfo._songFilename}" (BPM: ${parsedInfo._beatsPerMinute})`);

    // Render Cover Preview
    renderCoverPreview();

    // Fill metadata text
    songTitle.innerText = parsedInfo._songFilename || "Unknown Title";
    // Check if other title fields exist in parsed JSON
    const raw: any = parsedInfo;
    const realTitle = raw._songName || parsedInfo._songFilename;
    const realSub = raw._songSubName || "";
    const realArtist = raw._songAuthorName || "Unknown Artist";

    songTitle.innerText = realTitle;
    songSub.innerText = realSub;
    songSub.classList.toggle("hidden", !realSub);
    songArtist.innerText = realArtist;
    mapBpm.innerText = `BPM: ${parsedInfo._beatsPerMinute}`;
    mapVersionBadge.innerText = `Format: ${parsedInfo._version || "v2"}`;

    // Populate Difficulties
    populateDifficulties();

    // Reveal UI segments
    mapInfoCard.classList.remove("hidden");
    configZone.classList.remove("hidden");
    
    logConsole("Beatmap successfully parsed. Please select a difficulty and click convert.", "success");
  } catch (err) {
    logConsole(`Failed to parse map metadata: ${err instanceof Error ? err.message : String(err)}`, "error");
  } finally {
    processLoader.classList.add("hidden");
  }
}

// --- Render Cover Image ---
function renderCoverPreview() {
  const raw: any = parsedInfo;
  const coverFilename = raw._coverImageFilename || "cover.jpg";
  const coverKey = coverFilename.toLowerCase();

  // Try finding it in loaded files
  let fileEntry = loadedFiles[coverKey];
  
  // Try fallback image names
  if (!fileEntry) {
    const fallbacks = ["cover.jpg", "cover.png", "cover.jpeg", "info.jpg", "info.png"];
    for (const f of fallbacks) {
      if (loadedFiles[f]) {
        fileEntry = loadedFiles[f];
        break;
      }
    }
  }

  if (fileEntry) {
    const mime = fileEntry.name.endsWith(".png") ? "image/png" : "image/jpeg";
    const blob = new Blob([fileEntry.data], { type: mime });
    const url = URL.createObjectURL(blob);
    coverPreview.src = url;
    coverPreview.classList.remove("hidden");
    coverPlaceholder.classList.add("hidden");
  } else {
    coverPreview.classList.add("hidden");
    coverPlaceholder.classList.remove("hidden");
  }
}

// --- Populate Difficulties Dropdown ---
function populateDifficulties() {
  difficultySelect.innerHTML = "";
  
  if (!parsedInfo || !parsedInfo._difficultyBeatmapSets) return;

  let firstOption = true;
  for (const set of parsedInfo._difficultyBeatmapSets) {
    const setName = set._difficultyBeatmapSet || "Standard";
    
    for (const diffMap of set._difficultyBeatmaps) {
      const filename = diffMap._beatmapFilename;
      const difficultyName = diffMap._difficulty;
      
      const option = document.createElement("option");
      option.value = filename;
      option.innerText = `${setName} - ${difficultyName}`;
      
      if (firstOption) {
        option.selected = true;
        firstOption = false;
      }
      difficultySelect.appendChild(option);
    }
  }
}

// --- Translation Trigger ---
function setupConversion() {
  btnConvert.addEventListener("click", async () => {
    if (!parsedInfo || !difficultySelect.value) return;
    
    const selectedFilename = difficultySelect.value;
    const fileKey = selectedFilename.toLowerCase();
    
    resetOutputs();
    logZone.classList.remove("hidden");
    processLoader.classList.remove("hidden");
    clearConsole();

    logConsole(`Starting Tesla Light Show conversion...`);
    logConsole(`Target difficulty map: ${selectedFilename}`);

    const mapFile = loadedFiles[fileKey];
    if (!mapFile) {
      logConsole(`Error: Beatmap file "${selectedFilename}" not found in loaded files.`, "error");
      processLoader.classList.add("hidden");
      return;
    }

    try {
      // 1. Parse Beatmap
      logConsole("Parsing map JSON and normalising versions...");
      const decoder = new TextDecoder("utf-8");
      const mapJson = decoder.decode(mapFile.data);
      const normalizedMap = parseMapData(mapJson);
      
      logConsole(`Loaded ${normalizedMap._notes?.length || 0} notes and ${normalizedMap._events?.length || 0} events.`);

      // 2. Generate Lightshow XML
      logConsole("Translating Beat Saber events to Tesla physical commands...");
      const converter = new LightshowConverter(parsedInfo._beatsPerMinute, normalizedMap);
      generatedXsq = converter.generateLightshow();
      logConsole(`Successfully compiled lightshow layout XML (Size: ${generatedXsq.length} characters).`, "success");

      // 3. Audio Transcoding
      const songFilename = parsedInfo._songFilename || "song.egg";
      const audioKey = songFilename.toLowerCase();
      let audioFile = loadedFiles[audioKey];

      // Fallback search if exact match doesn't work
      if (!audioFile) {
        for (const [k, f] of Object.entries(loadedFiles)) {
          if (k.endsWith(".egg") || k.endsWith(".ogg")) {
            audioFile = f;
            logConsole(`Using audio file fallback: ${f.name}`);
            break;
          }
        }
      }

      if (audioFile) {
        logConsole(`Found audio file: ${audioFile.name}. Starting browser-side OGG to WAV decoding...`);
        try {
          generatedWav = await convertOggToWav(audioFile.data, (progressMsg) => {
            logConsole(progressMsg);
          });
          logConsole(`Audio transcoding completed successfully! Output Size: ${(generatedWav.size / (1024 * 1024)).toFixed(2)} MB.`, "success");
        } catch (audioErr) {
          logConsole(`Warning: Audio transcoding failed: ${audioErr instanceof Error ? audioErr.message : String(audioErr)}`, "warning");
          logConsole("The lightshow.xsq will still be downloadable, but you'll have to manually supply audio in xLights.", "warning");
        }
      } else {
        logConsole(`Warning: Audio file "${songFilename}" not found in the upload. Skipping audio transcoding.`, "warning");
      }

      // 4. Create output ZIP bundle
      logConsole("Creating output bundle ZIP archive...");
      const outZip = new JSZip();
      
      outZip.file("lightshow.xsq", generatedXsq);
      if (generatedWav) {
        outZip.file("lightshow.wav", generatedWav);
      }
      
      generatedZip = await outZip.generateAsync({ type: "blob" });
      logConsole(`Bundle ZIP created successfully! Output Size: ${(generatedZip.size / (1024 * 1024)).toFixed(2)} MB.`, "success");

      // Enable download options
      setupDownloadUrls();
      downloadZone.classList.remove("hidden");
      logConsole("SUCCESS: Tesla light show files are ready for download!", "success");

    } catch (err) {
      logConsole(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`, "error");
    } finally {
      processLoader.classList.add("hidden");
    }
  });
}

// --- Configure Downloads URLs & Actions ---
function setupDownloadUrls() {
  // Clean old trigger buttons
  btnDownloadBundle.onclick = null;
  btnDownloadXsq.onclick = null;
  btnDownloadWav.onclick = null;

  if (generatedZip) {
    btnDownloadBundle.onclick = () => {
      triggerDownload(generatedZip!, "lightshow.zip");
    };
  }

  if (generatedXsq) {
    const xsqBlob = new Blob([generatedXsq], { type: "text/xml" });
    btnDownloadXsq.onclick = () => {
      triggerDownload(xsqBlob, "lightshow.xsq");
    };
  }

  if (generatedWav) {
    btnDownloadWav.removeAttribute("disabled");
    btnDownloadWav.onclick = () => {
      triggerDownload(generatedWav!, "lightshow.wav");
    };
  } else {
    btnDownloadWav.setAttribute("disabled", "true");
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up memory after trigger
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 100);
}

function setupDownloads() {
  // Handled dynamically in setupDownloadUrls
}

// --- UI Reset Helpers ---
function resetUI() {
  parsedInfo = null;
  mapInfoCard.classList.add("hidden");
  configZone.classList.add("hidden");
  downloadZone.classList.add("hidden");
  resetOutputs();
}

function resetOutputs() {
  generatedXsq = null;
  generatedWav = null;
  generatedZip = null;
  downloadZone.classList.add("hidden");
  btnDownloadWav.setAttribute("disabled", "true");
}
