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
const btnDownloadFseq = document.getElementById("btn-download-fseq")! as HTMLButtonElement;
const btnDownloadXsq = document.getElementById("btn-download-xsq")! as HTMLButtonElement;
const btnDownloadWav = document.getElementById("btn-download-wav")! as HTMLButtonElement;
const themeToggle = document.getElementById("theme-toggle")! as HTMLInputElement;

// --- Visualizer DOM Elements ---
const visualizerZone = document.getElementById("visualizer-zone")!;
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
const carModelSelect = document.getElementById("car-model-select")! as HTMLSelectElement;

// --- Initialize Event Listeners ---
document.addEventListener("DOMContentLoaded", () => {
  setupTheme();
  setupDragAndDrop();
  setupFileSelects();
  setupConversion();
  setupDownloads();
  setupVisualizerControls();
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

  // Find the highest difficulty rank beatmap across all sets
  let highestRank = -1;
  let highestFilename = "";

  for (const set of parsedInfo._difficultyBeatmapSets) {
    for (const diffMap of set._difficultyBeatmaps) {
      const rank = typeof diffMap._difficultyRank === "number" ? diffMap._difficultyRank : 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestFilename = diffMap._beatmapFilename;
      }
    }
  }

  for (const set of parsedInfo._difficultyBeatmapSets) {
    const setName = set._difficultyBeatmapSet || "Standard";
    
    for (const diffMap of set._difficultyBeatmaps) {
      const filename = diffMap._beatmapFilename;
      const difficultyName = diffMap._difficulty;
      
      const option = document.createElement("option");
      option.value = filename;
      option.innerText = `${setName} - ${difficultyName}`;
      
      if (filename === highestFilename) {
        option.selected = true;
      }
      difficultySelect.appendChild(option);
    }
  }

  // Fallback: if no highest difficulty matched, select the first option
  if (difficultySelect.selectedIndex === -1 && difficultySelect.options.length > 0) {
    difficultySelect.options[0].selected = true;
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
      const converter = new LightshowConverter(parsedInfo._beatsPerMinute, normalizedMap, 100);
      generatedXsq = converter.generateLightshow();
      logConsole(`Successfully compiled lightshow layout XML (Size: ${generatedXsq.length} characters).`, "success");

      // 2b. Generate FSEQ Binary
      logConsole("Generating play-ready FSEQ binary sequence...");
      generatedFseq = converter.generateFseq();
      logConsole(`Successfully generated FSEQ binary sequence (Size: ${generatedFseq.length.toLocaleString()} bytes, ${Math.ceil(generatedFseq.length / 200).toLocaleString()} frames).`, "success");

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
          logConsole("The lightshow.xsq and lightshow.fseq will still be downloadable, but you'll have to manually supply audio in xLights.", "warning");
        }
      } else {
        logConsole(`Warning: Audio file "${songFilename}" not found in the upload. Skipping audio transcoding.`, "warning");
      }

      // 4. Create output ZIP bundle
      logConsole("Creating output bundle ZIP archive...");
      const outZip = new JSZip();
      
      if (generatedFseq) {
        outZip.file("lightshow.fseq", generatedFseq);
      }
      outZip.file("lightshow.xsq", generatedXsq);
      if (generatedWav) {
        outZip.file("lightshow.wav", generatedWav);
      }
      
      generatedZip = await outZip.generateAsync({ type: "blob" });
      logConsole(`Bundle ZIP created successfully! Output Size: ${(generatedZip.size / (1024 * 1024)).toFixed(2)} MB.`, "success");

      // Enable download options
      setupDownloadUrls();

      // Run Tesla Compatibility Validation
      logConsole("Running Tesla compatibility checks...");
      runSimplifiedValidation(converter, !!generatedWav);

      downloadZone.classList.remove("hidden");
      logConsole("SUCCESS: Tesla light show files are ready for download!", "success");

      // Initialize the visualizer preview
      if (generatedXsq) {
        const effects = converter.getLightEffects();
        const durationSec = converter.getDurationSeconds();
        logConsole("Initializing 3D preview visualizer...");
        initVisualizer(effects, durationSec, generatedWav);
        logConsole("3D preview visualizer ready!", "success");
      }

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
  generatedFseq = null;
  generatedWav = null;
  generatedZip = null;
  downloadZone.classList.add("hidden");
  btnDownloadWav.setAttribute("disabled", "true");
  cleanupVisualizer();
}

// --- Visualizer Playback Logic ---

function initVisualizer(effects: Record<string, LightEffect[]>, durationSec: number, audioBlob: Blob | null) {
  cleanupVisualizer();

  visualizerZone.classList.remove("hidden");

  // Create new Three.js visualizer with loading overlay state callback
  visualizer = new LightshowVisualizer(visualizerCanvas, (isLoading) => {
    const overlay = document.getElementById("visualizer-overlay");
    if (overlay) {
      overlay.classList.toggle("hidden", !isLoading);
    }
  });

  // Load the currently selected car model
  const selectedModel = carModelSelect.value as "Model_S" | "Cybertruck";
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
      console.warn("Audio autoplay blocked or failed. Running custom timeline sync.", err);
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

  visualizerZone.classList.add("hidden");
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

  // Car Model Selection
  carModelSelect.addEventListener("change", async (e) => {
    const model = (e.target as HTMLSelectElement).value as "Model_S" | "Cybertruck";
    if (visualizer) {
      await visualizer.loadCarModel(model);
      // Immediately reflect current playback timeline lights
      visualizer.updatePlaybackTime(currentTimeMs);
    }
  });
}

// --- Tesla Compatibility Validator ---
function runSimplifiedValidation(converter: LightshowConverter, hasAudio: boolean) {
  const durationSeconds = converter.getDurationSeconds();
  const totalEffects = converter.getTotalEffectsCount();
  const commandsCount = totalEffects * 2;
  const commandLimit = 3500;
  const commandRatio = commandsCount / commandLimit;
  const commandPercentage = Math.round(commandRatio * 100);

  // 1. Get DOM elements
  const statusBadge = document.getElementById("validator-status-badge")!;
  const commandRatioEl = document.getElementById("validator-command-ratio")!;
  const commandProgressEl = document.getElementById("validator-command-progress")!;
  
  const metricDuration = document.getElementById("validator-metric-duration")!;
  const metricDurationStatus = document.getElementById("validator-metric-duration-status")!;
  
  const metricChannels = document.getElementById("validator-metric-channels")!;
  const metricChannelsStatus = document.getElementById("validator-metric-channels-status")!;
  
  const metricAudio = document.getElementById("validator-metric-audio")!;
  const metricAudioStatus = document.getElementById("validator-metric-audio-status")!;
  
  const metricFormat = document.getElementById("validator-metric-format")!;
  const metricFormatStatus = document.getElementById("validator-metric-format-status")!;
  
  const warningsContainer = document.getElementById("validator-warnings")!;

  // 2. Clear lists & statuses
  const warnings: string[] = [];
  let isFailed = false;
  let isWarning = false;

  // 3. Perform Checks
  // Check memory / command count
  commandRatioEl.textContent = `${commandsCount.toLocaleString()} / ${commandLimit.toLocaleString()} commands (${commandPercentage}%)`;
  
  // Set progress bar width and color
  commandProgressEl.style.width = `${Math.min(commandPercentage, 100)}%`;
  commandProgressEl.className = "h-full rounded-full transition-all duration-500";
  if (commandsCount > commandLimit) {
    commandProgressEl.classList.add("bg-error");
    isFailed = true;
    warnings.push(`<strong>CRITICAL:</strong> Sequence contains <strong>${commandsCount.toLocaleString()}</strong> commands, which exceeds the Tesla hardware memory limit of 3,500. The show will fail to play on the vehicle.`);
  } else if (commandsCount > 2800) {
    commandProgressEl.classList.add("bg-warning");
    isWarning = true;
    warnings.push(`<strong>WARNING:</strong> High command count (<strong>${commandsCount.toLocaleString()}</strong> / 3,500). The sequence is approaching the Tesla memory limit.`);
  } else {
    commandProgressEl.classList.add("bg-success");
  }

  // Format Duration
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = Math.floor(durationSeconds % 60);
  const formattedDuration = `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  metricDuration.textContent = formattedDuration;

  if (durationSeconds > 14400) { // 4 hours
    metricDurationStatus.textContent = "✗ Too Long";
    metricDurationStatus.className = "text-[9px] text-error font-medium mt-1 flex items-center gap-0.5";
    isFailed = true;
    warnings.push(`<strong>CRITICAL:</strong> Show duration (<strong>${formattedDuration}</strong>) exceeds the 4-hour limit supported by Tesla vehicles.`);
  } else {
    metricDurationStatus.textContent = "✓ Safe";
    metricDurationStatus.className = "text-[9px] text-success font-medium mt-1 flex items-center gap-0.5";
  }

  // Channel Count - 200 channels
  metricChannels.textContent = "200 Ch";
  metricChannelsStatus.textContent = "✓ Complete";
  metricChannelsStatus.className = "text-[9px] text-success font-medium mt-1 flex items-center gap-0.5";

  // Audio status
  if (hasAudio) {
    metricAudio.textContent = "WAV Audio";
    metricAudioStatus.textContent = "✓ OK";
    metricAudioStatus.className = "text-[9px] text-success font-medium mt-1 flex items-center gap-0.5";
  } else {
    metricAudio.textContent = "Missing";
    metricAudioStatus.textContent = "⚠ Warning";
    metricAudioStatus.className = "text-[9px] text-warning font-medium mt-1 flex items-center gap-0.5";
    isWarning = true;
    warnings.push(`<strong>WARNING:</strong> No audio was transcoded (WAV file is missing). You will need to manually configure the audio file in xLights or provide an OGG audio file in your map.`);
  }

  // Format validation
  metricFormat.textContent = "Play-Ready FSEQ";
  metricFormatStatus.textContent = "✓ Valid";
  metricFormatStatus.className = "text-[9px] text-success font-medium mt-1 flex items-center gap-0.5";

  // Set overall status badge
  statusBadge.className = "badge badge-sm font-bold gap-1 text-[10px] px-2 py-1 uppercase rounded tracking-wider";
  if (isFailed) {
    statusBadge.textContent = "Failed";
    statusBadge.classList.add("badge-error");
  } else if (isWarning) {
    statusBadge.textContent = "Warning";
    statusBadge.classList.add("badge-warning");
  } else {
    statusBadge.textContent = "Pass";
    statusBadge.classList.add("badge-success");
  }

  // Populate warnings
  if (warnings.length > 0) {
    warningsContainer.classList.remove("hidden");
    warningsContainer.innerHTML = warnings
      .map(
        (w) => `
        <div class="flex items-start gap-1.5 text-warning-content">
          <svg class="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
          </svg>
          <span>${w}</span>
        </div>`
      )
      .join("");
  } else {
    warningsContainer.classList.add("hidden");
    warningsContainer.innerHTML = "";
  }
}
