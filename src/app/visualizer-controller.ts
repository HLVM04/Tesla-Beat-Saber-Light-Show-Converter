import type { LightEffect } from "../converter";
import { LightshowConverter } from "../converter";
import { trimWavBlob } from "../wav-encoder";
import { LightshowVisualizer } from "../visualizer";
import type { AppElements } from "./dom";
import type { LogType } from "./logger";

interface VisualizerCallbacks {
  onTrimmedOutputs: (outputs: {
    generatedXsq: string;
    generatedFseq: Uint8Array;
    durationSeconds: number;
    totalEffects: number;
    hasAudio: boolean;
  }) => void;
  onValidation: (metrics: {
    durationSeconds: number;
    totalEffects: number;
    hasAudio: boolean;
  }) => void;
  onAudioUpdated: (audioBlob: Blob) => void;
}

type Logger = (msg: string, type?: LogType) => void;

export class VisualizerController {
  private readonly elements: AppElements;
  private readonly log: Logger;
  private readonly callbacks: VisualizerCallbacks;
  private visualizer: LightshowVisualizer | null = null;
  private audioUrl: string | null = null;
  private audio: HTMLAudioElement | null = null;
  private playbackLoopId: number | null = null;
  private playbackDurationMs = 0;
  private currentTimeMs = 0;
  private isPlaying = false;
  private lastTickTime = 0;
  private isDraggingStart = false;
  private isDraggingEnd = false;
  private isSeekingTimeline = false;
  private wasPlayingBeforeDrag = false;
  private activeConverter: LightshowConverter | null = null;
  private activeEffects: Record<string, LightEffect[]> = {};
  private trimStartMs = 0;
  private trimEndMs = 0;
  private pendingTrimAudioVersion = 0;
  private generatedWavTrimKey = "";
  private trimAudioTimer: number | null = null;
  private originalWav: Blob | null = null;
  private generatedWav: Blob | null = null;
  private volume = 0.5;

  constructor(
    elements: AppElements,
    log: Logger,
    callbacks: VisualizerCallbacks,
  ) {
    this.elements = elements;
    this.log = log;
    this.callbacks = callbacks;
  }

  setupControls() {
    this.elements.btnPlayPause.addEventListener("click", () =>
      this.togglePlayPause(),
    );
    this.elements.btnMute.addEventListener("click", () => this.toggleMute());
    
    // Initialize volume slider state
    this.elements.sliderVolume.value = String(Math.round(this.volume * 100));
    this.elements.sliderVolume.addEventListener("input", (event) => {
      const slider = event.target as HTMLInputElement;
      const vol = parseFloat(slider.value) / 100;
      this.volume = vol;
      if (this.audio) {
        this.audio.volume = vol;
        if (vol > 0 && this.audio.muted) {
          this.audio.muted = false;
          this.updateMuteUI();
        } else if (vol === 0 && !this.audio.muted) {
          this.audio.muted = true;
          this.updateMuteUI();
        }
      }
    });

    this.setupTimelineDragging();

    this.elements.btnResetTrim.addEventListener("click", () => {
      if (!this.activeConverter) return;
      this.trimStartMs = 0;
      this.trimEndMs = this.activeConverter.getDurationSeconds() * 1000;
      this.updateTrimmedOutputs();
    });

    this.elements.btnResetCamera.addEventListener("click", () => {
      this.visualizer?.resetCameraView();
    });

    window.addEventListener("resize", () => {
      this.redrawDensity();
      this.updateTimelineUI();
    });

    this.setupCarModelTabs();
  }

  init(converter: LightshowConverter, audioBlob: Blob | null) {
    this.cleanup();
    this.activeConverter = converter;
    this.activeEffects = converter.getLightEffects();
    this.originalWav = audioBlob;
    this.generatedWav = audioBlob;
    this.trimStartMs = 0;
    this.trimEndMs = converter.getDurationSeconds() * 1000;
    this.pendingTrimAudioVersion++;
    this.generatedWavTrimKey = audioBlob ? this.getCurrentTrimKey() : "";

    this.visualizer = new LightshowVisualizer(
      this.elements.visualizerCanvas,
      (isLoading) => {
        const overlay = document.getElementById("visualizer-overlay");
        overlay?.classList.toggle("hidden", !isLoading);
      },
    );

    const selectedModel = this.getSelectedCarModel();
    this.visualizer.loadCarModel(selectedModel).then(() => {
      if (!this.visualizer) return;
      this.visualizer.setLightEffects(this.activeEffects);
      this.visualizer.updatePlaybackTime(this.currentTimeMs);
    });

    this.playbackDurationMs = converter.getDurationSeconds() * 1000;
    this.elements.timeDuration.innerText = formatTime(this.playbackDurationMs);
    this.elements.timeCurrent.innerText = "0:00";
    this.currentTimeMs = 0;
    this.isPlaying = false;

    this.redrawDensity();
    this.updateTimelineUI();
    this.updatePlayPauseUI();

    if (audioBlob) {
      this.audioUrl = URL.createObjectURL(audioBlob);
      this.audio = new Audio(this.audioUrl);
      this.audio.volume = this.volume;
      this.elements.btnMute.removeAttribute("disabled");
      this.audio.addEventListener("ended", () => {
        this.pausePlayback();
        this.seekTo(0);
      });
      this.updateMuteUI();
    } else {
      this.elements.btnMute.setAttribute("disabled", "true");
      this.elements.iconVolumeOn.classList.remove("hidden");
      this.elements.iconVolumeOff.classList.add("hidden");
    }
  }

  cleanup() {
    this.pausePlayback();
    this.stopPlaybackLoop();

    if (this.trimAudioTimer !== null) {
      window.clearTimeout(this.trimAudioTimer);
      this.trimAudioTimer = null;
    }

    if (this.visualizer) {
      this.visualizer.dispose();
      this.visualizer = null;
    }

    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }

    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
      this.audioUrl = null;
    }

    this.activeConverter = null;
    this.activeEffects = {};
    this.trimStartMs = 0;
    this.trimEndMs = 0;
    this.generatedWav = null;
    this.originalWav = null;
    this.generatedWavTrimKey = "";
  }

  redrawDensity() {
    if (!this.activeConverter) return;
    this.drawCommandDensity(
      this.activeConverter.getLightEffects(),
      this.activeConverter.getDurationSeconds() * 1000,
    );
  }

  async ensureTrimmedAudio(
    version = this.pendingTrimAudioVersion,
  ): Promise<Blob | null> {
    if (!this.originalWav) return null;

    const trimKey = this.getCurrentTrimKey();
    if (this.generatedWav && this.generatedWavTrimKey === trimKey) {
      return this.generatedWav;
    }

    try {
      const trimmedWav = await trimWavBlob(
        this.originalWav,
        this.trimStartMs,
        this.trimEndMs,
      );
      if (
        version < this.pendingTrimAudioVersion &&
        trimKey !== this.getCurrentTrimKey()
      ) {
        return null;
      }

      this.generatedWav = trimmedWav;
      this.generatedWavTrimKey = trimKey;
      this.replacePreviewAudio(trimmedWav);
      this.callbacks.onAudioUpdated(trimmedWav);
      return trimmedWav;
    } catch (err) {
      this.log(
        `Warning: Audio trim failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
        "warning",
      );
      return null;
    }
  }

  private startPlayback() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.updatePlayPauseUI();

    if (this.audio) {
      this.audio.currentTime = this.currentTimeMs / 1000;
      this.audio.play().catch((err) => {
        console.warn(
          "Audio autoplay blocked or failed. Syncing timeline manually.",
          err,
        );
      });
    }
    this.startPlaybackLoop();
  }

  private pausePlayback() {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.updatePlayPauseUI();

    this.audio?.pause();
    this.stopPlaybackLoop();
  }

  private startPlaybackLoop() {
    this.stopPlaybackLoop();
    this.lastTickTime = performance.now();

    const tick = () => {
      if (!this.isPlaying) return;

      if (this.audio) {
        this.currentTimeMs = this.audio.currentTime * 1000;
      } else {
        const now = performance.now();
        const elapsed = now - this.lastTickTime;
        this.lastTickTime = now;
        this.currentTimeMs += elapsed;
      }

      if (this.currentTimeMs >= this.playbackDurationMs) {
        this.currentTimeMs = this.playbackDurationMs;
        this.pausePlayback();
        this.seekTo(0);
        return;
      }

      this.updatePlaybackUI();
      this.playbackLoopId = requestAnimationFrame(tick);
    };

    this.playbackLoopId = requestAnimationFrame(tick);
  }

  private stopPlaybackLoop() {
    if (this.playbackLoopId !== null) {
      cancelAnimationFrame(this.playbackLoopId);
      this.playbackLoopId = null;
    }
  }

  private seekTo(timeMs: number) {
    this.currentTimeMs = Math.max(0, Math.min(timeMs, this.playbackDurationMs));
    this.elements.timeCurrent.innerText = formatTime(this.currentTimeMs);

    if (this.audio) {
      this.audio.currentTime = this.currentTimeMs / 1000;
    }

    this.visualizer?.updatePlaybackTime(this.currentTimeMs);
    this.updateTimelineUI();
  }

  private togglePlayPause() {
    if (this.isPlaying) {
      this.pausePlayback();
    } else {
      this.startPlayback();
    }
  }

  private toggleMute() {
    if (!this.audio) return;
    this.audio.muted = !this.audio.muted;
    this.updateMuteUI();
  }

  private updateMuteUI() {
    const isMuted = this.audio ? this.audio.muted : false;
    this.elements.iconVolumeOn.classList.toggle("hidden", isMuted);
    this.elements.iconVolumeOff.classList.toggle("hidden", !isMuted);

    this.elements.iconVolumeOn.style.display = isMuted ? "none" : "";
    this.elements.iconVolumeOff.style.display = isMuted ? "" : "none";
  }

  private updatePlayPauseUI() {
    if (this.isPlaying) {
      this.elements.iconPlay.classList.add("hidden");
      this.elements.iconPause.classList.remove("hidden");
      this.elements.iconPlay.style.display = "none";
      this.elements.iconPause.style.display = "";
    } else {
      this.elements.iconPlay.classList.remove("hidden");
      this.elements.iconPause.classList.add("hidden");
      this.elements.iconPlay.style.display = "";
      this.elements.iconPause.style.display = "none";
    }
  }

  private updatePlaybackUI() {
    this.elements.timeCurrent.innerText = formatTime(this.currentTimeMs);
    this.visualizer?.updatePlaybackTime(this.currentTimeMs);
    this.updateTimelineUI();
  }

  private setupTimelineDragging() {
    const {
      trimHandleStart,
      trimHandleEnd,
      integratedTimelineContainer,
    } = this.elements;

    trimHandleStart.addEventListener("pointerdown", (event) => {
      if (!this.activeConverter) return;
      event.stopPropagation();
      trimHandleStart.setPointerCapture(event.pointerId);
      this.isDraggingStart = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.pausePlayback();
    });

    trimHandleStart.addEventListener("pointermove", (event) => {
      if (!this.isDraggingStart || !this.activeConverter) return;
      const targetMs = this.getMsFromPointer(event);
      const minTrimLengthMs = 1000;

      this.trimStartMs = Math.max(
        0,
        Math.min(targetMs, this.trimEndMs - minTrimLengthMs),
      );
      this.updateTimelineUI();
      this.updatePredictedTrimValidation();
    });

    trimHandleStart.addEventListener("pointerup", (event) => {
      if (!this.isDraggingStart) return;
      trimHandleStart.releasePointerCapture(event.pointerId);
      this.isDraggingStart = false;

      if (this.currentTimeMs < this.playbackDurationMs * 0.1) {
        this.currentTimeMs = 0;
      }

      this.updateTrimmedOutputs();
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });

    trimHandleStart.addEventListener("pointercancel", (event) => {
      if (!this.isDraggingStart) return;
      trimHandleStart.releasePointerCapture(event.pointerId);
      this.isDraggingStart = false;
      this.updateTrimmedOutputs();
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });

    trimHandleEnd.addEventListener("pointerdown", (event) => {
      if (!this.activeConverter) return;
      event.stopPropagation();
      trimHandleEnd.setPointerCapture(event.pointerId);
      this.isDraggingEnd = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.pausePlayback();
    });

    trimHandleEnd.addEventListener("pointermove", (event) => {
      if (!this.isDraggingEnd || !this.activeConverter) return;
      const maxDuration = this.activeConverter.getDurationSeconds() * 1000;
      const targetMs = this.getMsFromPointer(event);
      const minTrimLengthMs = 1000;

      this.trimEndMs = Math.max(
        this.trimStartMs + minTrimLengthMs,
        Math.min(targetMs, maxDuration),
      );
      this.updateTimelineUI();
      this.updatePredictedTrimValidation();
    });

    trimHandleEnd.addEventListener("pointerup", (event) => {
      if (!this.isDraggingEnd) return;
      trimHandleEnd.releasePointerCapture(event.pointerId);
      this.isDraggingEnd = false;
      this.updateTrimmedOutputs();
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });

    trimHandleEnd.addEventListener("pointercancel", (event) => {
      if (!this.isDraggingEnd) return;
      trimHandleEnd.releasePointerCapture(event.pointerId);
      this.isDraggingEnd = false;
      this.updateTrimmedOutputs();
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });

    integratedTimelineContainer.addEventListener("pointerdown", (event) => {
      if (!this.activeConverter) return;
      integratedTimelineContainer.setPointerCapture(event.pointerId);
      this.isSeekingTimeline = true;
      this.wasPlayingBeforeDrag = this.isPlaying;
      this.pausePlayback();
      this.handleTimelineSeek(event);
    });

    integratedTimelineContainer.addEventListener("pointermove", (event) => {
      if (!this.isSeekingTimeline || !this.activeConverter) return;
      this.handleTimelineSeek(event);
    });

    integratedTimelineContainer.addEventListener("pointerup", (event) => {
      if (!this.isSeekingTimeline) return;
      integratedTimelineContainer.releasePointerCapture(event.pointerId);
      this.isSeekingTimeline = false;
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });

    integratedTimelineContainer.addEventListener("pointercancel", (event) => {
      if (!this.isSeekingTimeline) return;
      integratedTimelineContainer.releasePointerCapture(event.pointerId);
      this.isSeekingTimeline = false;
      if (this.wasPlayingBeforeDrag) {
        this.startPlayback();
      }
    });
  }

  private getMsFromPointer(event: PointerEvent): number {
    if (!this.activeConverter) return 0;
    const rect = this.elements.integratedTimelineContainer.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    const maxDuration = this.activeConverter.getDurationSeconds() * 1000;
    return pct * maxDuration;
  }

  private handleTimelineSeek(event: PointerEvent) {
    if (!this.activeConverter) return;
    const targetMs = this.getMsFromPointer(event);
    const relativeSeekMs = Math.max(
      0,
      Math.min(targetMs - this.trimStartMs, this.playbackDurationMs),
    );
    this.seekTo(relativeSeekMs);
  }

  private drawCommandDensity(
    effects: Record<string, LightEffect[]>,
    durationMs: number,
  ) {
    const { timelineDensityCanvas } = this.elements;
    const width = timelineDensityCanvas.clientWidth;
    const height = timelineDensityCanvas.clientHeight;
    if (width === 0 || height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    timelineDensityCanvas.width = width * dpr;
    timelineDensityCanvas.height = height * dpr;

    const ctx = timelineDensityCanvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, timelineDensityCanvas.width, timelineDensityCanvas.height);
    ctx.scale(dpr, dpr);

    const times: number[] = [];
    for (const track in effects) {
      if (Array.isArray(effects[track])) {
        for (const effect of effects[track]) {
          times.push(effect.startTime);
        }
      }
    }

    if (times.length === 0 || durationMs <= 0) return;

    const numBins = Math.max(1, Math.floor(width / 4.5));
    const bins = new Array(numBins).fill(0);

    for (const time of times) {
      const binIdx = Math.floor((time / durationMs) * numBins);
      if (binIdx >= 0 && binIdx < numBins) {
        bins[binIdx]++;
      }
    }

    const maxVal = Math.max(...bins, 1);
    const isDark =
      document.documentElement.getAttribute("data-theme") === "shadcn-dark";
    const barColor = isDark
      ? "rgba(255, 255, 255, 0.25)"
      : "rgba(0, 0, 0, 0.2)";
    ctx.fillStyle = barColor;

    for (let index = 0; index < numBins; index++) {
      const count = bins[index];
      if (count === 0) continue;

      const x = index * 4.5 + 1.5;
      const maxBarHeight = height - 12;
      const barHeight = Math.max(2, (count / maxVal) * maxBarHeight);
      const y = (height - barHeight) / 2;

      ctx.beginPath();
      if (typeof ctx.roundRect === "function") {
        ctx.roundRect(x, y, 3, barHeight, 1.5);
      } else {
        ctx.rect(x, y, 3, barHeight);
      }
      ctx.fill();
    }
  }

  private updateTimelineUI() {
    if (!this.activeConverter) return;
    const maxDuration = this.activeConverter.getDurationSeconds() * 1000;
    if (maxDuration <= 0) return;

    const startPct = (this.trimStartMs / maxDuration) * 100;
    const endPct = (this.trimEndMs / maxDuration) * 100;
    const absolutePlayheadMs = Math.min(
      this.trimEndMs,
      Math.max(this.trimStartMs, this.trimStartMs + this.currentTimeMs),
    );
    const playheadPct = (absolutePlayheadMs / maxDuration) * 100;

    this.elements.timelineLeftOverlay.style.width = `${startPct}%`;
    this.elements.timelineRightOverlay.style.width = `${100 - endPct}%`;
    this.elements.timelineActiveRegion.style.left = `${startPct}%`;
    this.elements.timelineActiveRegion.style.width = `${endPct - startPct}%`;
    this.elements.timelinePlayhead.style.left = `${playheadPct}%`;
    this.elements.trimHandleStart.style.left = `${startPct}%`;
    this.elements.trimHandleEnd.style.left = `${endPct}%`;
    this.elements.trimRangeLabel.textContent = `${formatTime(
      this.trimStartMs,
    )} - ${formatTime(this.trimEndMs)} (${formatTime(
      this.trimEndMs - this.trimStartMs,
    )})`;
  }

  private updateTrimmedOutputs() {
    if (!this.activeConverter) return;

    const trimRange = { startMs: this.trimStartMs, endMs: this.trimEndMs };
    this.activeEffects = this.activeConverter.getTrimmedLightEffects(trimRange);
    const generatedXsq =
      this.activeConverter.generateTrimmedLightshow(trimRange);
    const generatedFseq = this.activeConverter.generateTrimmedFseq(trimRange);
    const trimmedDurationMs =
      this.activeConverter.getTrimmedDurationSeconds(trimRange) * 1000;

    this.playbackDurationMs = trimmedDurationMs;
    this.elements.timeDuration.innerText = formatTime(trimmedDurationMs);

    if (this.currentTimeMs > trimmedDurationMs) {
      this.seekTo(trimmedDurationMs);
    } else {
      this.visualizer?.updatePlaybackTime(this.currentTimeMs);
      this.updateTimelineUI();
      this.elements.timeCurrent.innerText = formatTime(this.currentTimeMs);
    }

    if (this.visualizer) {
      this.visualizer.setLightEffects(this.activeEffects);
      this.visualizer.updatePlaybackTime(this.currentTimeMs);
    }

    this.updateTimelineUI();
    this.callbacks.onTrimmedOutputs({
      generatedXsq,
      generatedFseq,
      durationSeconds: trimmedDurationMs / 1000,
      totalEffects: LightshowConverter.countLightEffects(this.activeEffects),
      hasAudio: !!this.originalWav,
    });
    this.scheduleTrimmedAudioRefresh();
  }

  private updatePredictedTrimValidation() {
    if (!this.activeConverter) return;

    const trimRange = { startMs: this.trimStartMs, endMs: this.trimEndMs };
    this.callbacks.onValidation({
      durationSeconds: this.activeConverter.getTrimmedDurationSeconds(trimRange),
      totalEffects: this.activeConverter.getTrimmedTotalEffectsCount(trimRange),
      hasAudio: !!this.originalWav,
    });
  }

  private getCurrentTrimKey(): string {
    return `${Math.round(this.trimStartMs)}:${Math.round(this.trimEndMs)}`;
  }

  private scheduleTrimmedAudioRefresh() {
    if (!this.originalWav) return;
    this.pendingTrimAudioVersion++;
    const version = this.pendingTrimAudioVersion;

    if (this.trimAudioTimer !== null) {
      window.clearTimeout(this.trimAudioTimer);
    }

    this.trimAudioTimer = window.setTimeout(() => {
      void this.ensureTrimmedAudio(version);
    }, 180);
  }

  private replacePreviewAudio(audioBlob: Blob) {
    const wasPlaying = this.isPlaying;
    const wasMuted = this.audio ? this.audio.muted : false;

    if (this.audio) {
      this.audio.pause();
      this.audio.src = "";
      this.audio.load();
      this.audio = null;
    }

    if (this.audioUrl) {
      URL.revokeObjectURL(this.audioUrl);
    }

    this.audioUrl = URL.createObjectURL(audioBlob);
    this.audio = new Audio(this.audioUrl);
    this.audio.volume = this.volume;
    this.audio.muted = wasMuted;
    this.audio.currentTime = Math.min(this.currentTimeMs, this.playbackDurationMs) / 1000;
    this.audio.addEventListener("ended", () => {
      this.pausePlayback();
      this.seekTo(0);
    });

    this.elements.btnMute.removeAttribute("disabled");
    this.updateMuteUI();

    if (wasPlaying) {
      this.audio.play().catch((err) => {
        console.warn("Audio autoplay blocked or failed after trim.", err);
      });
    }
  }

  private setupCarModelTabs() {
    const carTabs = this.elements.carModelTabs.querySelectorAll(".car-tab");
    carTabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        const clickedTab = event.currentTarget as HTMLButtonElement;
        if (clickedTab.classList.contains("active")) {
          return;
        }

        const carModel = clickedTab.getAttribute("data-car") as
          | "Model_S"
          | "Cybertruck";

        carTabs.forEach((carTab) => carTab.classList.remove("active"));
        clickedTab.classList.add("active");

        this.log(`Switching car model to: ${carModel}`);

        setTimeout(async () => {
          if (this.visualizer) {
            await this.visualizer.loadCarModel(carModel);
            this.visualizer.updatePlaybackTime(this.currentTimeMs);
          }
        }, 50);
      });
    });
  }

  private getSelectedCarModel(): "Model_S" | "Cybertruck" {
    const activeCarTab = this.elements.carModelTabs.querySelector(".car-tab.active");
    return (
      (activeCarTab?.getAttribute("data-car") as "Model_S" | "Cybertruck") ||
      "Model_S"
    );
  }
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
