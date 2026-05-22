import type { InfoData } from "../converter";
import { getAppElements, type AppElements } from "./dom";
import { logConsole } from "./logger";
import { MapConfigurator } from "./map-configurator";
import { setUIState, setupTheme, updateProgress } from "./ui";
import type { LoadedFiles, MapFile } from "./types";
import { runSimplifiedValidation } from "./validation";
import type { VisualizerController } from "./visualizer-controller";

export class AppController {
  private readonly elements: AppElements = getAppElements();
  private readonly mapConfigurator = new MapConfigurator(
    this.elements,
    (message) => logConsole(message),
  );

  private loadedFiles: LoadedFiles = {};
  private parsedInfo: InfoData | null = null;
  private generatedXsq: string | null = null;
  private generatedFseq: Uint8Array | null = null;
  private generatedWav: Blob | null = null;
  private generatedZip: Blob | null = null;
  private visualizerController: VisualizerController | null = null;

  init() {
    setupTheme(this.elements, () => this.visualizerController?.redrawDensity());
    this.setupDragAndDrop();
    this.setupFileSelects();
    this.setupConversion();
    this.setupDownloadUrls();

    this.elements.btnUploadDifferent.addEventListener("click", () =>
      this.resetUI(),
    );
    this.elements.btnResetApp.addEventListener("click", () => this.resetUI());
    this.elements.btnBackToConfig.addEventListener("click", () =>
      this.goBackToConfig(),
    );

    setUIState(this.elements, "upload");
  }

  private setupDragAndDrop() {
    const { dropZone, zipInput } = this.elements;

    dropZone.addEventListener("click", () => {
      zipInput.click();
    });

    dropZone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropZone.classList.add("border-base-content", "bg-base-200/80");
    });

    dropZone.addEventListener("dragleave", () => {
      dropZone.classList.remove("border-base-content", "bg-base-200/80");
    });

    dropZone.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropZone.classList.remove("border-base-content", "bg-base-200/80");

      const files = event.dataTransfer?.files;
      if (!files || files.length === 0) return;

      if (files.length === 1 && files[0].name.endsWith(".zip")) {
        await this.processZipFile(files[0]);
      } else {
        await this.processFileList(files);
      }
    });
  }

  private setupFileSelects() {
    const { btnBrowseZip, btnBrowseFolder, zipInput, folderInput } =
      this.elements;

    btnBrowseZip.addEventListener("click", (event) => {
      event.stopPropagation();
      zipInput.click();
    });

    btnBrowseFolder.addEventListener("click", (event) => {
      event.stopPropagation();
      folderInput.click();
    });

    zipInput.addEventListener("change", async () => {
      if (zipInput.files?.[0]) {
        await this.processZipFile(zipInput.files[0]);
      }
    });

    folderInput.addEventListener("change", async () => {
      if (folderInput.files && folderInput.files.length > 0) {
        await this.processFileList(folderInput.files);
      }
    });
  }

  private async processZipFile(file: File) {
    this.resetUI();
    logConsole(`Extracting ZIP archive: ${file.name}...`);

    try {
      const { loadZipFiles } = await import("./file-loader");
      this.loadedFiles = await loadZipFiles(file);
      logConsole(
        `Successfully extracted ${
          Object.keys(this.loadedFiles).length
        } files from archive.`,
      );
      this.processLoadedFiles();
    } catch (err) {
      logConsole(
        `ZIP extraction failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "error",
      );
      alert("ZIP extraction failed. Please make sure this is a valid archive.");
    }
  }

  private async processFileList(files: FileList) {
    this.resetUI();
    logConsole(`Reading ${files.length} selected files...`);

    try {
      const { loadSelectedFiles } = await import("./file-loader");
      this.loadedFiles = await loadSelectedFiles(files);
      logConsole(`Successfully loaded ${Object.keys(this.loadedFiles).length} files.`);
      this.processLoadedFiles();
    } catch (err) {
      logConsole(
        `File load failed: ${err instanceof Error ? err.message : String(err)}`,
        "error",
      );
      alert("Loading directory files failed. Please try again.");
    }
  }

  private processLoadedFiles() {
    const infoKey = "info.dat";
    if (!this.loadedFiles[infoKey]) {
      logConsole(
        "Error: Could not find Info.dat in the uploaded files. Is this a valid Beat Saber map folder?",
        "error",
      );
      alert(
        "Error: Could not find Info.dat. Make sure you dropped a valid Beat Saber song directory or archive!",
      );
      return;
    }

    try {
      const decoder = new TextDecoder("utf-8");
      const infoJson = decoder.decode(this.loadedFiles[infoKey].data);
      this.parsedInfo = JSON.parse(infoJson) as InfoData;

      logConsole(
        `Parsed Info.dat. Song Title: "${this.parsedInfo._songFilename}" (BPM: ${this.parsedInfo._beatsPerMinute})`,
      );

      this.mapConfigurator.renderLoadedMap(this.parsedInfo, this.loadedFiles);
      setUIState(this.elements, "config");
      logConsole("Beatmap successfully loaded and parsed.", "success");
    } catch (err) {
      logConsole(
        `Failed to parse map metadata: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "error",
      );
      alert(
        "Parsing beatmap details failed. Please ensure the files are structured correctly.",
      );
    }
  }

  private setupConversion() {
    this.elements.btnConvert.addEventListener("click", async () => {
      const selectedDifficultyFile =
        this.mapConfigurator.getSelectedDifficultyFile();
      if (!this.parsedInfo || !selectedDifficultyFile) return;

      const selectedFilename = selectedDifficultyFile;
      const fileKey = selectedFilename.toLowerCase();

      this.resetOutputs();
      setUIState(this.elements, "progress");

      await updateProgress(15, "Parsing beatmap file...");
      logConsole("Starting Tesla Light Show conversion...");
      logConsole(`Target difficulty map: ${selectedFilename}`);

      const mapFile = this.loadedFiles[fileKey];
      if (!mapFile) {
        logConsole(
          `Error: Beatmap file "${selectedFilename}" not found in loaded files.`,
          "error",
        );
        alert(
          `Could not find the beatmap file named: "${selectedFilename}". Resetting.`,
        );
        this.resetUI();
        return;
      }

      try {
        await this.runConversion(mapFile);
      } catch (err) {
        logConsole(
          `Conversion failed: ${err instanceof Error ? err.message : String(err)}`,
          "error",
        );
        alert(
          `An error occurred during light show compilation: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        this.resetUI();
      }
    });
  }

  private async runConversion(mapFile: MapFile) {
    if (!this.parsedInfo) return;

    const { LightshowConverter, parseMapData } = await import("../converter");
    const decoder = new TextDecoder("utf-8");
    const mapJson = decoder.decode(mapFile.data);
    const normalizedMap = parseMapData(mapJson);

    logConsole(
      `Loaded ${normalizedMap._notes?.length || 0} notes and ${
        normalizedMap._events?.length || 0
      } events.`,
    );

    await updateProgress(40, "Translating light events...");
    const converter = new LightshowConverter(
      this.parsedInfo._beatsPerMinute,
      normalizedMap,
      100,
    );
    this.generatedXsq = converter.generateLightshow();
    logConsole("Successfully compiled lightshow layout XML.", "success");

    await updateProgress(60, "Generating ready FSEQ commands...");
    this.generatedFseq = converter.generateFseq();
    logConsole(
      `Successfully generated FSEQ binary sequence (${this.generatedFseq.length} bytes).`,
      "success",
    );

    const audioFile = this.findAudioFile();
    if (audioFile) {
      await updateProgress(75, "Transcoding OGG audio to WAV...");
      await this.transcodeAudio(audioFile);
    } else {
      logConsole(
        `Warning: Audio file "${
          this.parsedInfo._songFilename || "song.egg"
        }" not found in the upload. Skipping transcoding.`,
        "warning",
      );
    }

    await updateProgress(90, "Packaging outputs bundle ZIP...");
    this.generatedZip = await this.createCurrentOutputZip();
    logConsole("Bundle ZIP created successfully!", "success");

    this.setupDownloadUrls();

    logConsole("Running Tesla compatibility checks...");
    runSimplifiedValidation(
      converter.getDurationSeconds(),
      converter.getTotalEffectsCount(),
      !!this.generatedWav,
    );

    await updateProgress(100, "Done! Initializing visualizer...");
    setUIState(this.elements, "done");
    logConsole(
      "SUCCESS: Tesla light show files are ready for download!",
      "success",
    );

    if (this.generatedXsq) {
      const visualizerController = await this.getVisualizerController();
      visualizerController.init(converter, this.generatedWav);
    }
  }

  private async getVisualizerController(): Promise<VisualizerController> {
    if (this.visualizerController) {
      return this.visualizerController;
    }

    const { VisualizerController } = await import("./visualizer-controller");
    this.visualizerController = new VisualizerController(this.elements, logConsole, {
      onTrimmedOutputs: ({
        generatedXsq,
        generatedFseq,
        durationSeconds,
        totalEffects,
        hasAudio,
      }) => {
        this.generatedXsq = generatedXsq;
        this.generatedFseq = generatedFseq;
        this.generatedZip = null;
        runSimplifiedValidation(durationSeconds, totalEffects, hasAudio);
      },
      onValidation: ({ durationSeconds, totalEffects, hasAudio }) => {
        runSimplifiedValidation(durationSeconds, totalEffects, hasAudio);
      },
      onAudioUpdated: (audioBlob) => {
        this.generatedWav = audioBlob;
        this.generatedZip = null;
        this.setupDownloadUrls();
      },
    });
    this.visualizerController.setupControls();
    return this.visualizerController;
  }

  private findAudioFile(): MapFile | null {
    if (!this.parsedInfo) return null;

    const songFilename = this.parsedInfo._songFilename || "song.egg";
    const audioKey = songFilename.toLowerCase();
    const declaredAudioFile = this.loadedFiles[audioKey];
    if (declaredAudioFile) return declaredAudioFile;

    for (const [key, file] of Object.entries(this.loadedFiles)) {
      if (key.endsWith(".egg") || key.endsWith(".ogg")) {
        logConsole(`Using audio file fallback: ${file.name}`);
        return file;
      }
    }

    return null;
  }

  private async transcodeAudio(audioFile: MapFile) {
    try {
      const { convertOggToWav } = await import("../wav-encoder");
      this.generatedWav = await convertOggToWav(audioFile.data, (progressMsg) => {
        logConsole(`Transcoder: ${progressMsg}`);
      });
      logConsole("Audio transcoding completed successfully!", "success");
    } catch (audioErr) {
      logConsole(
        `Warning: Audio transcoding failed: ${
          audioErr instanceof Error ? audioErr.message : String(audioErr)
        }`,
        "warning",
      );
    }
  }

  private setupDownloadUrls() {
    const {
      btnDownloadBundle,
      btnDownloadFseq,
      btnDownloadXsq,
      btnDownloadWav,
    } = this.elements;

    btnDownloadBundle.onclick = null;
    btnDownloadFseq.onclick = null;
    btnDownloadXsq.onclick = null;
    btnDownloadWav.onclick = null;

    btnDownloadBundle.onclick = async () => {
      await this.visualizerController?.ensureTrimmedAudio();
      if (!this.generatedZip) {
        this.generatedZip = await this.createCurrentOutputZip();
      }
      if (this.generatedZip) {
        await this.triggerFileDownload(this.generatedZip, "lightshow.zip");
      }
    };

    btnDownloadFseq.onclick = async () => {
      if (!this.generatedFseq) return;
      const fseqBlob = new Blob([this.generatedFseq as BlobPart], {
        type: "application/octet-stream",
      });
      await this.triggerFileDownload(fseqBlob, "lightshow.fseq");
    };

    btnDownloadXsq.onclick = async () => {
      if (!this.generatedXsq) return;
      const xsqBlob = new Blob([this.generatedXsq], { type: "text/xml" });
      await this.triggerFileDownload(xsqBlob, "lightshow.xsq");
    };

    if (this.generatedWav) {
      btnDownloadWav.removeAttribute("disabled");
      btnDownloadWav.classList.remove("btn-disabled");
      btnDownloadWav.onclick = async () => {
        await this.visualizerController?.ensureTrimmedAudio();
        if (this.generatedWav) {
          await this.triggerFileDownload(this.generatedWav, "lightshow.wav");
        }
      };
    } else {
      btnDownloadWav.setAttribute("disabled", "true");
      btnDownloadWav.classList.add("btn-disabled");
    }
  }

  private createCurrentOutputZip(): Promise<Blob | null> {
    return import("./downloads").then(({ createOutputZip }) => createOutputZip({
      generatedXsq: this.generatedXsq,
      generatedFseq: this.generatedFseq,
      generatedWav: this.generatedWav,
    }));
  }

  private async triggerFileDownload(blob: Blob, filename: string) {
    const { triggerDownload } = await import("./downloads");
    triggerDownload(blob, filename);
  }

  private goBackToConfig() {
    this.visualizerController?.cleanup();
    setUIState(this.elements, "config");
  }

  private resetUI() {
    this.parsedInfo = null;
    this.loadedFiles = {};
    this.mapConfigurator.reset();
    this.elements.zipInput.value = "";
    this.elements.folderInput.value = "";
    setUIState(this.elements, "upload");
    this.resetOutputs();
  }

  private resetOutputs() {
    this.generatedXsq = null;
    this.generatedFseq = null;
    this.generatedWav = null;
    this.generatedZip = null;
    this.elements.btnDownloadWav.setAttribute("disabled", "true");
    this.elements.btnDownloadWav.classList.add("btn-disabled");
    this.visualizerController?.cleanup();
  }
}
