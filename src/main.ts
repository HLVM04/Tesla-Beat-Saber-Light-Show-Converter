import "./style.css";
import JSZip from "jszip";
import { parseMapData, LightshowConverter } from "./converter";
import type { InfoData, LightEffect } from "./converter";
import { convertOggToWav } from "./wav-encoder";
import { LightshowVisualizer } from "./visualizer";

// --- State Variables ---
interface MapFile {
  name: string;
  data: ArrayBuffer;
}

let loadedFiles: Record<string, MapFile> = {};
let parsedInfo: InfoData | null = null;
let selectedDifficultyFile: string | null = null;

let generatedXsq: string | null = null;
let generatedFseq: Uint8Array | null = null;
let generatedWav: Blob | null = null;
let generatedZip: Blob | null = null;

// --- Visualizer State ---
let visualizer: LightshowVisualizer | null = null;
let audioUrl: string | null = null;
let audio: HTMLAudioElement | null = null;
let playbackLoopId: number | null = null;
let playbackDurationMs = 0;
let currentTimeMs = 0;
let isPlaying = false;
let lastTickTime = 0;

// --- DOM Elements ---
const dropZone = document.getElementById("drop-zone")!;
const zipInput = document.getElementById("zip-input")! as HTMLInputElement;
const folderInput = document.getElementById("folder-input")! as HTMLInputElement;
const btnBrowseZip = document.getElementById("btn-browse-zip")!;
const btnBrowseFolder = document.getElementById("btn-browse-folder")!;

const coverPreview = document.getElementById("cover-preview")! as HTMLImageElement;
const coverPlaceholder = document.getElementById("cover-placeholder")!;
const songTitle = document.getElementById("song-title")!;
const songSub = document.getElementById("song-sub")!;
const songArtist = document.getElementById("song-artist")!;
const mapBpm = document.getElementById("map-bpm")!;
const mapVersionBadge = document.getElementById("map-version-badge")!;

const difficultyTabs = document.getElementById("difficulty-tabs")!;
const btnConvert = document.getElementById("btn-convert")! as HTMLButtonElement;

const btnDownloadBundle = document.getElementById("btn-download-bundle")! as HTMLButtonElement;
const btnDownloadFseq = document.getElementById("btn-download-fseq")! as HTMLButtonElement;
const btnDownloadXsq = document.getElementById("btn-download-xsq")! as HTMLButtonElement;
const btnDownloadWav = document.getElementById("btn-download-wav")! as HTMLButtonElement;
const themeToggle = document.getElementById("theme-toggle")! as HTMLInputElement;

// --- State Machine Containers ---
const uploadCard = document.getElementById("upload-card")!;
const configCard = document.getElementById("config-card")!;
const progressCard = document.getElementById("progress-card")!;
const resultsContainer = document.getElementById("results-and-visualizer-container")!;
const btnUploadDifferent = document.getElementById("btn-upload-different")!;
const btnResetApp = document.getElementById("btn-reset-app")!;

// --- Visualizer DOM Elements ---
const visualizerCanvas = document.getElementById("visualizer-canvas")! as HTMLCanvasElement;
const btnPlayPause = document.getElementById("btn-play-pause")! as HTMLButtonElement;
const iconPlay = document.getElementById("icon-play")!;
const iconPause = document.getElementById("icon-pause")!;
const btnMute = document.getElementById("btn-mute")! as HTMLButtonElement;
const iconVolumeOn = document.getElementById("icon-volume-on")!;
const iconVolumeOff = document.getElementById("icon-volume-off")!;
const timelineSlider = document.getElementById("timeline-slider")! as HTMLInputElement;
const timeCurrent = document.getElementById("time-current")!;
const timeDuration = document.getElementById("time-duration")!;
const btnResetCamera = document.getElementById("btn-reset-camera")! as HTMLButtonElement;
const typeTabsContainer = document.getElementById("type-tabs-container")!;
const typeTabs = document.getElementById("type-tabs")!;
const carModelTabs = document.getElementById("car-model-tabs")!;

// --- Initialize Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  setupDragAndDrop();
  setupFileSelects();
  setupConversion();
  setupDownloads();
  setupVisualizerControls();
  
  // Navigation reset buttons
  if (btnUploadDifferent) {
    btnUploadDifferent.addEventListener("click", () => resetUI());
  }
  if (btnResetApp) {
    btnResetApp.addEventListener("click", () => resetUI());
  }
  
  // Set starting state
  setUIState("upload");
});

// --- State Machine Visibility Handler ---
type UIState = "upload" | "config" | "progress" | "done";

function setUIState(state: UIState) {
  uploadCard.classList.toggle("hidden", state !== "upload");
  configCard.classList.toggle("hidden", state !== "config");
  progressCard.classList.toggle("hidden", state !== "progress");
  resultsContainer.classList.toggle("hidden", state !== "done");
}

// --- Theme Setup ---
function setupTheme() {
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
    zipInput.click();
  });

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-base-content", "bg-base-200/80");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-base-content", "bg-base-200/80");
  });

  dropZone.addEventListener("drop", async (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-base-content", "bg-base-200/80");
    
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    if (files.length === 1 && files[0].name.endsWith(".zip")) {
      await processZipFile(files[0]);
    } else {
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

// --- Console Logger (Redirected to Developer Console) ---
function logConsole(msg: string, type: "info" | "success" | "warning" | "error" = "info") {
  const prefix = `[TeslaConverter] [${type.toUpperCase()}]`;
  if (type === "error") {
    console.error(`${prefix} ${msg}`);
  } else if (type === "warning") {
    console.warn(`${prefix} ${msg}`);
  } else {
    console.log(`${prefix} ${msg}`);
  }
}

// --- ZIP processing ---
async function processZipFile(file: File) {
  resetUI();
  logConsole(`Extracting ZIP archive: ${file.name}...`);

  loadedFiles = {};
  
  try {
    const zip = await JSZip.loadAsync(file);
    const promises: Promise<void>[] = [];
    
    zip.forEach((relativePath, entry) => {
      if (entry.dir) return;
      
      const p = entry.async("arraybuffer").then((buffer) => {
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
    alert("ZIP extraction failed. Please make sure this is a valid archive.");
  }
}

// --- Directory/FileList processing ---
async function processFileList(files: FileList) {
  resetUI();
  logConsole(`Reading ${files.length} selected files...`);

  loadedFiles = {};

  try {
    const promises: Promise<void>[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
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
    alert("Loading directory files failed. Please try again.");
  }
}

// --- Process Loaded Files & Read Info.dat ---
function processLoadedFiles() {
  const infoKey = "info.dat";
  if (!loadedFiles[infoKey]) {
    logConsole("Error: Could not find Info.dat in the uploaded files. Is this a valid Beat Saber map folder?", "error");
    alert("Error: Could not find Info.dat. Make sure you dropped a valid Beat Saber song directory or archive!");
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
    const raw: any = parsedInfo;
    const realTitle = raw._songName || parsedInfo._songFilename || "Unknown Title";
    const realSub = raw._songSubName || "";
    const realArtist = raw._songAuthorName || "Unknown Artist";

    songTitle.innerText = realTitle;
    songSub.innerText = realSub;
    songSub.classList.toggle("hidden", !realSub);
    songArtist.innerText = realArtist;
    mapBpm.innerText = `BPM: ${parsedInfo._beatsPerMinute}`;
    mapVersionBadge.innerText = `Format: ${parsedInfo._version || "v2"}`;

    // Populate Difficulties (Tap Bar)
    populateDifficulties();

    // Transition to morphed Configuration screen
    setUIState("config");
    logConsole("Beatmap successfully loaded and parsed.", "success");
  } catch (err) {
    logConsole(`Failed to parse map metadata: ${err instanceof Error ? err.message : String(err)}`, "error");
    alert("Parsing beatmap details failed. Please ensure the files are structured correctly.");
  }
}

// --- Render Cover Image ---
function renderCoverPreview() {
  const raw: any = parsedInfo;
  const coverFilename = raw._coverImageFilename || "cover.jpg";
  const coverKey = coverFilename.toLowerCase();

  let fileEntry = loadedFiles[coverKey];
  
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

let selectedType: string = "Standard";

// --- Helper to extract normalized difficulty set characteristic ---
function getCharacteristicName(set: any): string {
  const name = set._beatmapCharacteristicName || set.beatmapCharacteristicName || set._difficultyBeatmapSet || "Standard";
  return typeof name === "string" ? name.trim() : "Standard";
}

// --- Populate Dynamic Beatmap Types and Difficulties ---
function populateDifficulties() {
  difficultyTabs.innerHTML = "";
  selectedDifficultyFile = null;
  
  if (!parsedInfo || !parsedInfo._difficultyBeatmapSets || parsedInfo._difficultyBeatmapSets.length === 0) {
    typeTabsContainer.classList.add("hidden");
    return;
  }

  const sets = parsedInfo._difficultyBeatmapSets;
  
  // 1. Determine all unique types/sets using the robust characteristic name getter
  const types = Array.from(new Set(sets.map(s => getCharacteristicName(s))));
  
  // 2. Set default active type if not already valid or set
  if (!types.includes(selectedType)) {
    // Try to default to "Standard", otherwise use the first available type
    selectedType = types.includes("Standard") ? "Standard" : types[0];
  }

  // 3. Render or Hide the Type Selector
  if (types.length > 1) {
    typeTabsContainer.classList.remove("hidden");
    typeTabs.innerHTML = "";
    
    types.forEach((type) => {
      const typeBtn = document.createElement("button");
      typeBtn.className = "type-tab transition-all-300 btn btn-sm h-8 min-h-0 bg-base-200/70 hover:bg-base-300 text-base-content border-0 text-[11px] font-bold px-4 py-1.5 rounded-full select-none";
      typeBtn.innerText = type;
      
      if (type === selectedType) {
        typeBtn.classList.remove("bg-base-200/70", "text-base-content");
        typeBtn.classList.add("bg-primary", "text-primary-content", "active");
      }
      
      typeBtn.addEventListener("click", () => {
        if (typeBtn.classList.contains("active")) return;
        selectedType = type;
        logConsole(`Selected map type: ${type}`);
        populateDifficulties(); // Re-render difficulties for the newly selected type
      });
      
      typeTabs.appendChild(typeBtn);
    });
  } else {
    typeTabsContainer.classList.add("hidden");
  }

  // 4. Find the active set based on selectedType using the robust characteristic getter
  const activeSet = sets.find(s => getCharacteristicName(s) === selectedType) || sets[0];
  if (!activeSet || !activeSet._difficultyBeatmaps || activeSet._difficultyBeatmaps.length === 0) return;

  // 5. Render Difficulties for the active set
  // Find highest rank difficulty in the active set to auto-select
  let highestRank = -1;
  let highestFilename = "";
  
  activeSet._difficultyBeatmaps.forEach((diffMap) => {
    const rank = typeof diffMap._difficultyRank === "number" ? diffMap._difficultyRank : 0;
    if (rank > highestRank) {
      highestRank = rank;
      highestFilename = diffMap._beatmapFilename;
    }
  });

  activeSet._difficultyBeatmaps.forEach((diffMap) => {
    const filename = diffMap._beatmapFilename;
    const difficultyName = diffMap._difficulty; // e.g. "Easy", "ExpertPlus"
    
    const tabButton = document.createElement("button");
    tabButton.className = "diff-tab transition-all-300 btn btn-sm h-8 min-h-0 bg-base-200/70 hover:bg-base-300 text-base-content border-0 text-[11px] font-bold px-4 py-1.5 rounded-full select-none";
    tabButton.innerText = difficultyName; // Only show difficulty level, type is selected separately!
    
    // Auto-select highest difficulty
    if (filename === highestFilename) {
      tabButton.classList.remove("bg-base-200/70", "text-base-content");
      tabButton.classList.add("bg-primary", "text-primary-content", "active");
      selectedDifficultyFile = filename;
    }
    
    tabButton.addEventListener("click", () => {
      if (tabButton.classList.contains("active")) return;
      difficultyTabs.querySelectorAll(".diff-tab").forEach((btn) => {
        btn.classList.remove("bg-primary", "text-primary-content", "active");
        btn.classList.add("bg-base-200/70", "text-base-content");
      });
      
      tabButton.classList.remove("bg-base-200/70", "text-base-content");
      tabButton.classList.add("bg-primary", "text-primary-content", "active");
      selectedDifficultyFile = filename;
      logConsole(`Selected difficulty: ${difficultyName}`);
    });

    difficultyTabs.appendChild(tabButton);
  });

  // Fallback auto-select if nothing is selected
  if (!selectedDifficultyFile && difficultyTabs.children.length > 0) {
    const firstTab = difficultyTabs.children[0] as HTMLButtonElement;
    firstTab.click();
  }
}

// --- Smooth Progress Bar sweeps ---
function updateProgress(percent: number, status: string): Promise<void> {
  const progressBarSweep = document.getElementById("progress-bar-sweep")!;
  const progressStatus = document.getElementById("progress-status")!;
  
  if (progressStatus) progressStatus.innerText = status;
  if (progressBarSweep) {
    progressBarSweep.style.width = `${percent}%`;
  }
  
  // Yield execution thread slightly to trigger smooth CSS animations
  return new Promise((resolve) => setTimeout(resolve, 350));
}

// --- Translation Trigger ---
function setupConversion() {
  btnConvert.addEventListener("click", async () => {
    if (!parsedInfo || !selectedDifficultyFile) return;
    
    const selectedFilename = selectedDifficultyFile;
    const fileKey = selectedFilename.toLowerCase();
    
    resetOutputs();
    setUIState("progress");
    
    await updateProgress(15, "Parsing beatmap file...");
    logConsole(`Starting Tesla Light Show conversion...`);
    logConsole(`Target difficulty map: ${selectedFilename}`);

    const mapFile = loadedFiles[fileKey];
    if (!mapFile) {
      logConsole(`Error: Beatmap file "${selectedFilename}" not found in loaded files.`, "error");
      alert(`Could not find the beatmap file named: "${selectedFilename}". Resetting.`);
      resetUI();
      return;
    }

    try {
      // 1. Parse Beatmap
      const decoder = new TextDecoder("utf-8");
      const mapJson = decoder.decode(mapFile.data);
      const normalizedMap = parseMapData(mapJson);
      
      logConsole(`Loaded ${normalizedMap._notes?.length || 0} notes and ${normalizedMap._events?.length || 0} events.`);

      // 2. Generate Lightshow XML
      await updateProgress(40, "Translating light events...");
      const converter = new LightshowConverter(parsedInfo._beatsPerMinute, normalizedMap, 100);
      generatedXsq = converter.generateLightshow();
      logConsole(`Successfully compiled lightshow layout XML.`, "success");

      // 2b. Generate FSEQ Binary
      await updateProgress(60, "Generating ready FSEQ commands...");
      generatedFseq = converter.generateFseq();
      logConsole(`Successfully generated FSEQ binary sequence (${generatedFseq.length} bytes).`, "success");

      // 3. Audio Transcoding
      const songFilename = parsedInfo._songFilename || "song.egg";
      const audioKey = songFilename.toLowerCase();
      let audioFile = loadedFiles[audioKey];

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
        await updateProgress(75, "Transcoding OGG audio to WAV...");
        try {
          generatedWav = await convertOggToWav(audioFile.data, (progressMsg) => {
            logConsole(`Transcoder: ${progressMsg}`);
          });
          logConsole(`Audio transcoding completed successfully!`, "success");
        } catch (audioErr) {
          logConsole(`Warning: Audio transcoding failed: ${audioErr instanceof Error ? audioErr.message : String(audioErr)}`, "warning");
        }
      } else {
        logConsole(`Warning: Audio file "${songFilename}" not found in the upload. Skipping transcoding.`, "warning");
      }

      // 4. Create output ZIP bundle
      await updateProgress(90, "Packaging outputs bundle ZIP...");
      const outZip = new JSZip();
      
      if (generatedFseq) {
        outZip.file("lightshow.fseq", generatedFseq);
      }
      outZip.file("lightshow.xsq", generatedXsq);
      if (generatedWav) {
        outZip.file("lightshow.wav", generatedWav);
      }
      
      generatedZip = await outZip.generateAsync({ type: "blob" });
      logConsole(`Bundle ZIP created successfully!`, "success");

      // Enable download options
      setupDownloadUrls();

      // Run Tesla Compatibility Validation
      logConsole("Running Tesla compatibility checks...");
      runSimplifiedValidation(converter, !!generatedWav);

      await updateProgress(100, "Done! Initializing visualizer...");
      
      // Reveal the beautiful preview visualizer and download cards
      setUIState("done");
      logConsole("SUCCESS: Tesla light show files are ready for download!", "success");

      // Initialize the visualizer preview
      if (generatedXsq) {
        const effects = converter.getLightEffects();
        const durationSec = converter.getDurationSeconds();
        initVisualizer(effects, durationSec, generatedWav);
      }

    } catch (err) {
      logConsole(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`, "error");
      alert(`An error occurred during light show compilation: ${err instanceof Error ? err.message : String(err)}`);
      resetUI();
    }
  });
}

// --- Configure Downloads URLs & Actions ---
function setupDownloadUrls() {
  btnDownloadBundle.onclick = null;
  btnDownloadFseq.onclick = null;
  btnDownloadXsq.onclick = null;
  btnDownloadWav.onclick = null;

  if (generatedZip) {
    btnDownloadBundle.onclick = () => {
      triggerDownload(generatedZip!, "lightshow.zip");
    };
  }

  if (generatedFseq) {
    const fseqBlob = new Blob([generatedFseq as any], { type: "application/octet-stream" });
    btnDownloadFseq.onclick = () => {
      triggerDownload(fseqBlob, "lightshow.fseq");
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
    btnDownloadWav.classList.remove("btn-disabled");
    btnDownloadWav.onclick = () => {
      triggerDownload(generatedWav!, "lightshow.wav");
    };
  } else {
    btnDownloadWav.setAttribute("disabled", "true");
    btnDownloadWav.classList.add("btn-disabled");
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
  selectedDifficultyFile = null;
  loadedFiles = {};
  
  // Clear inputs
  zipInput.value = "";
  folderInput.value = "";
  
  // Dynamic layout changes
  setUIState("upload");
  resetOutputs();
}

function resetOutputs() {
  generatedXsq = null;
  generatedFseq = null;
  generatedWav = null;
  generatedZip = null;
  btnDownloadWav.setAttribute("disabled", "true");
  btnDownloadWav.classList.add("btn-disabled");
  cleanupVisualizer();
}

// --- Visualizer Playback Logic ---
function initVisualizer(effects: Record<string, LightEffect[]>, durationSec: number, audioBlob: Blob | null) {
  cleanupVisualizer();

  visualizer = new LightshowVisualizer(visualizerCanvas, (isLoading) => {
    const overlay = document.getElementById("visualizer-overlay");
    if (overlay) {
      overlay.classList.toggle("hidden", !isLoading);
    }
  });

  let selectedModel: "Model_S" | "Cybertruck" = "Model_S";
  if (carModelTabs) {
    const activeCarTab = carModelTabs.querySelector(".car-tab.active");
    if (activeCarTab) {
      selectedModel = activeCarTab.getAttribute("data-car") as "Model_S" | "Cybertruck" || "Model_S";
    }
  }

  visualizer.loadCarModel(selectedModel).then(() => {
    if (visualizer) {
      visualizer.setLightEffects(effects);
      visualizer.updatePlaybackTime(currentTimeMs);
    }
  });

  playbackDurationMs = durationSec * 1000;
  timelineSlider.max = playbackDurationMs.toString();
  timelineSlider.value = "0";
  timeDuration.innerText = formatTime(playbackDurationMs);
  timeCurrent.innerText = "0:00";
  currentTimeMs = 0;
  isPlaying = false;
  
  updatePlayPauseUI();

  if (audioBlob) {
    audioUrl = URL.createObjectURL(audioBlob);
    audio = new Audio(audioUrl);
    audio.volume = 1.0;
    btnMute.removeAttribute("disabled");

    audio.addEventListener("ended", () => {
      pausePlayback();
      seekTo(0);
    });

    updateMuteUI();
  } else {
    btnMute.setAttribute("disabled", "true");
    iconVolumeOn.classList.remove("hidden");
    iconVolumeOff.classList.add("hidden");
  }
}

function startPlayback() {
  if (isPlaying) return;
  isPlaying = true;
  updatePlayPauseUI();

  if (audio) {
    audio.currentTime = currentTimeMs / 1000;
    audio.play().catch((err) => {
      console.warn("Audio autoplay blocked or failed. Syncing timeline manually.", err);
    });
  }
  startPlaybackLoop();
}

function pausePlayback() {
  if (!isPlaying) return;
  isPlaying = false;
  updatePlayPauseUI();

  if (audio) {
    audio.pause();
  }
  stopPlaybackLoop();
}

function startPlaybackLoop() {
  stopPlaybackLoop();
  lastTickTime = performance.now();

  const tick = () => {
    if (!isPlaying) return;

    if (audio) {
      currentTimeMs = audio.currentTime * 1000;
    } else {
      const now = performance.now();
      const elapsed = now - lastTickTime;
      lastTickTime = now;
      currentTimeMs += elapsed;
    }

    if (currentTimeMs >= playbackDurationMs) {
      currentTimeMs = playbackDurationMs;
      pausePlayback();
      seekTo(0);
      return;
    }

    updatePlaybackUI();
    playbackLoopId = requestAnimationFrame(tick);
  };

  playbackLoopId = requestAnimationFrame(tick);
}

// --- Pause, Seek, and Volume Helpers ---
function stopPlaybackLoop() {
  if (playbackLoopId !== null) {
    cancelAnimationFrame(playbackLoopId);
    playbackLoopId = null;
  }
}

function seekTo(timeMs: number) {
  currentTimeMs = Math.max(0, Math.min(timeMs, playbackDurationMs));
  timelineSlider.value = currentTimeMs.toString();
  timeCurrent.innerText = formatTime(currentTimeMs);

  if (audio) {
    audio.currentTime = currentTimeMs / 1000;
  }

  if (visualizer) {
    visualizer.updatePlaybackTime(currentTimeMs);
  }
}

function togglePlayPause() {
  if (isPlaying) {
    pausePlayback();
  } else {
    startPlayback();
  }
}

function toggleMute() {
  if (!audio) return;
  audio.muted = !audio.muted;
  updateMuteUI();
}

function updateMuteUI() {
  const isMuted = audio ? audio.muted : false;
  iconVolumeOn.classList.toggle("hidden", isMuted);
  iconVolumeOff.classList.toggle("hidden", !isMuted);
}

// --- Player DOM UI controls ---
function updatePlayPauseUI() {
  if (isPlaying) {
    iconPlay.classList.add("hidden");
    iconPause.classList.remove("hidden");
  } else {
    iconPlay.classList.remove("hidden");
    iconPause.classList.add("hidden");
  }
}

function updatePlaybackUI() {
  timelineSlider.value = currentTimeMs.toString();
  timeCurrent.innerText = formatTime(currentTimeMs);

  if (visualizer) {
    visualizer.updatePlaybackTime(currentTimeMs);
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function cleanupVisualizer() {
  pausePlayback();
  stopPlaybackLoop();

  if (visualizer) {
    visualizer.dispose();
    visualizer = null;
  }

  if (audio) {
    audio.pause();
    audio.src = "";
    audio.load();
    audio = null;
  }

  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
}

function setupVisualizerControls() {
  btnPlayPause.addEventListener("click", togglePlayPause);
  btnMute.addEventListener("click", toggleMute);

  // Timeline Scrubbing
  timelineSlider.addEventListener("input", (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    seekTo(val);
  });

  // Reset Camera View
  btnResetCamera.addEventListener("click", () => {
    if (visualizer) {
      visualizer.resetCameraView();
    }
  });

  // Car Model Selection using sleek horizontal tab toggles
  if (carModelTabs) {
    const carTabs = carModelTabs.querySelectorAll(".car-tab");
    carTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const clickedTab = e.currentTarget as HTMLButtonElement;
        if (clickedTab.classList.contains("active")) {
          return;
        }
        
        const carModel = clickedTab.getAttribute("data-car") as "Model_S" | "Cybertruck";
        
        // Instant visual update of tabs
        carTabs.forEach((t) => t.classList.remove("active"));
        clickedTab.classList.add("active");
        
        logConsole(`Switching car model to: ${carModel}`);
        
        // Yield execution to the browser so the visual tab activation paints instantly
        setTimeout(async () => {
          if (visualizer) {
            await visualizer.loadCarModel(carModel);
            visualizer.updatePlaybackTime(currentTimeMs);
          }
        }, 50);
      });
    });
  }
}

// --- Tesla Compatibility Validator ---
function runSimplifiedValidation(converter: LightshowConverter, hasAudio: boolean) {
  const durationSeconds = converter.getDurationSeconds();
  const totalEffects = converter.getTotalEffectsCount();
  const commandsCount = totalEffects * 2;
  const commandLimit = 3500;
  const commandRatio = commandsCount / commandLimit;
  const commandPercentage = Math.round(commandRatio * 100);

  // Get DOM elements
  const statusBadge = document.getElementById("validator-status-badge")!;
  const commandRatioEl = document.getElementById("validator-command-ratio")!;
  const commandProgressEl = document.getElementById("validator-command-progress")!;
  
  const metricDuration = document.getElementById("validator-metric-duration")!;
  const metricAudio = document.getElementById("validator-metric-audio")!;
  const warningsContainer = document.getElementById("validator-warnings")!;

  const checkMemoryIcon = document.getElementById("validator-check-memory-icon")!;
  const checkDurationIcon = document.getElementById("validator-check-duration-icon")!;
  const checkAudioIcon = document.getElementById("validator-check-audio-icon")!;
  const headerIconContainer = document.getElementById("validator-header-icon-container")!;

  // Clear lists & statuses
  const warnings: string[] = [];
  let isFailed = false;

  // 1. Command Count Limit Check
  commandRatioEl.textContent = `${commandsCount.toLocaleString()} / ${commandLimit.toLocaleString()}`;
  commandProgressEl.style.width = `${Math.min(commandPercentage, 100)}%`;
  commandProgressEl.className = "h-full rounded-full transition-all duration-500";
  
  if (commandsCount > commandLimit) {
    // Failed: Memory budget exceeded
    commandProgressEl.classList.add("bg-red-400", "dark:bg-red-500/60");
    commandRatioEl.className = "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    checkMemoryIcon.textContent = "✗";
    checkMemoryIcon.className = "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    isFailed = true;
    warnings.push(`<strong>Memory limit exceeded:</strong> Sequence contains <strong>${commandsCount.toLocaleString()}</strong> commands, which exceeds the Tesla hardware memory limit of 3,500. The show will fail to load or crash on the vehicle.`);
  } else {
    // Passed memory check
    commandProgressEl.classList.add("bg-neutral-400", "dark:bg-neutral-600");
    commandRatioEl.className = "font-mono text-[10px] text-muted-foreground font-semibold";
    checkMemoryIcon.textContent = "✓";
    checkMemoryIcon.className = "text-muted-foreground text-xs font-mono font-black";
  }

  // 2. Show Duration Check
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  metricDuration.textContent = formattedDuration;

  if (durationSeconds > 14400) {
    // Failed: Too long (> 4 hours)
    checkDurationIcon.textContent = "✗";
    checkDurationIcon.className = "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    metricDuration.className = "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    isFailed = true;
    warnings.push(`<strong>Show too long:</strong> Show duration (<strong>${formattedDuration}</strong>) exceeds the 4-hour playback limit supported by Tesla vehicles.`);
  } else {
    // Passed duration check
    checkDurationIcon.textContent = "✓";
    checkDurationIcon.className = "text-muted-foreground text-xs font-mono font-black";
    metricDuration.className = "font-mono text-[10px] text-base-content font-medium";
  }

  // 3. Audio WAV Track Check
  if (hasAudio) {
    metricAudio.textContent = "WAV OK";
    checkAudioIcon.textContent = "✓";
    checkAudioIcon.className = "text-muted-foreground text-xs font-mono font-black";
    metricAudio.className = "font-mono text-[10px] text-base-content font-medium";
  } else {
    metricAudio.textContent = "Missing";
    checkAudioIcon.textContent = "✗";
    checkAudioIcon.className = "text-red-500/90 dark:text-red-400/90 text-xs font-mono font-black";
    metricAudio.className = "font-mono text-[10px] text-red-500/90 dark:text-red-400/90 font-semibold";
    isFailed = true;
    warnings.push(`<strong>Audio track missing:</strong> No WAV audio was generated. Make sure your Beat Saber map contains an .ogg or .egg audio track so it can be transcoded.`);
  }

  // Set overall status badge & top-left header icon
  if (isFailed) {
    statusBadge.textContent = "Failed";
    statusBadge.className = "badge badge-sm font-bold gap-1 text-[9px] px-2.5 py-0.5 uppercase rounded-full tracking-wider border select-none bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/5 dark:text-red-400/90 dark:border-red-500/10 transition-all-300";
    
    headerIconContainer.className = "flex items-center justify-center text-red-500/90 dark:text-red-400/90 shrink-0 transition-all-300";
    headerIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m15 9-6 6M9 9l6 6"/></svg>`;
  } else {
    statusBadge.textContent = "Passed";
    statusBadge.className = "badge badge-sm font-bold gap-1 text-[9px] px-2.5 py-0.5 uppercase rounded-full tracking-wider border-0 select-none bg-neutral-200/60 text-neutral-700 dark:bg-neutral-800/60 dark:text-neutral-300 transition-all-300";
    
    headerIconContainer.className = "flex items-center justify-center text-success shrink-0 transition-all-300";
    headerIconContainer.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>`;
  }

  // Populate warnings
  if (warnings.length > 0) {
    warningsContainer.classList.remove("hidden");
    warningsContainer.className = "text-xs space-y-1.5 p-3 rounded-2xl bg-warning/5 border border-warning/15 text-warning font-medium";
    
    warningsContainer.innerHTML = warnings
      .map(
        (w) => `
        <div class="flex items-start gap-1.5 shrink-0 leading-relaxed font-medium">
          <span class="text-xs mt-0.5 select-none">⚠️</span>
          <span>${w}</span>
        </div>`
      )
      .join("");
  } else {
    warningsContainer.classList.add("hidden");
    warningsContainer.innerHTML = "";
  }
}
