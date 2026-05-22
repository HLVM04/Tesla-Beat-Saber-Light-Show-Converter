export interface AppElements {
  dropZone: HTMLElement;
  zipInput: HTMLInputElement;
  folderInput: HTMLInputElement;
  btnBrowseZip: HTMLElement;
  btnBrowseFolder: HTMLElement;
  coverPreview: HTMLImageElement;
  coverPlaceholder: HTMLElement;
  songTitle: HTMLElement;
  songSub: HTMLElement;
  songArtist: HTMLElement;
  mapBpm: HTMLElement;
  mapVersionBadge: HTMLElement;
  difficultyTabs: HTMLElement;
  btnConvert: HTMLButtonElement;
  btnDownloadBundle: HTMLButtonElement;
  btnDownloadFseq: HTMLButtonElement;
  btnDownloadXsq: HTMLButtonElement;
  btnDownloadWav: HTMLButtonElement;
  themeToggle: HTMLInputElement;
  uploadCard: HTMLElement;
  configCard: HTMLElement;
  progressCard: HTMLElement;
  resultsContainer: HTMLElement;
  btnBackToConfig: HTMLButtonElement;
  tutorialSection: HTMLElement;
  btnUploadDifferent: HTMLElement;
  btnResetApp: HTMLElement;
  visualizerCanvas: HTMLCanvasElement;
  btnPlayPause: HTMLButtonElement;
  iconPlay: HTMLElement;
  iconPause: HTMLElement;
  btnMute: HTMLButtonElement;
  iconVolumeOn: HTMLElement;
  iconVolumeOff: HTMLElement;
  sliderVolume: HTMLInputElement;
  integratedTimelineContainer: HTMLDivElement;
  timelineDensityCanvas: HTMLCanvasElement;
  timelineLeftOverlay: HTMLDivElement;
  timelineRightOverlay: HTMLDivElement;
  timelineActiveRegion: HTMLDivElement;
  timelinePlayhead: HTMLDivElement;
  trimHandleStart: HTMLDivElement;
  trimHandleEnd: HTMLDivElement;
  timeCurrent: HTMLElement;
  timeDuration: HTMLElement;
  trimRangeLabel: HTMLElement;
  btnResetTrim: HTMLButtonElement;
  btnResetCamera: HTMLButtonElement;
  typeTabsContainer: HTMLElement;
  typeTabs: HTMLElement;
  carModelTabs: HTMLElement;
}

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element #${id}`);
  }
  return element as T;
}

export function getAppElements(): AppElements {
  return {
    dropZone: requiredElement("drop-zone"),
    zipInput: requiredElement<HTMLInputElement>("zip-input"),
    folderInput: requiredElement<HTMLInputElement>("folder-input"),
    btnBrowseZip: requiredElement("btn-browse-zip"),
    btnBrowseFolder: requiredElement("btn-browse-folder"),
    coverPreview: requiredElement<HTMLImageElement>("cover-preview"),
    coverPlaceholder: requiredElement("cover-placeholder"),
    songTitle: requiredElement("song-title"),
    songSub: requiredElement("song-sub"),
    songArtist: requiredElement("song-artist"),
    mapBpm: requiredElement("map-bpm"),
    mapVersionBadge: requiredElement("map-version-badge"),
    difficultyTabs: requiredElement("difficulty-tabs"),
    btnConvert: requiredElement<HTMLButtonElement>("btn-convert"),
    btnDownloadBundle: requiredElement<HTMLButtonElement>("btn-download-bundle"),
    btnDownloadFseq: requiredElement<HTMLButtonElement>("btn-download-fseq"),
    btnDownloadXsq: requiredElement<HTMLButtonElement>("btn-download-xsq"),
    btnDownloadWav: requiredElement<HTMLButtonElement>("btn-download-wav"),
    themeToggle: requiredElement<HTMLInputElement>("theme-toggle"),
    uploadCard: requiredElement("upload-card"),
    configCard: requiredElement("config-card"),
    progressCard: requiredElement("progress-card"),
    resultsContainer: requiredElement("results-and-visualizer-container"),
    btnBackToConfig: requiredElement<HTMLButtonElement>("btn-back-to-config"),
    tutorialSection: requiredElement("tutorial-section"),
    btnUploadDifferent: requiredElement("btn-upload-different"),
    btnResetApp: requiredElement("btn-reset-app"),
    visualizerCanvas: requiredElement<HTMLCanvasElement>("visualizer-canvas"),
    btnPlayPause: requiredElement<HTMLButtonElement>("btn-play-pause"),
    iconPlay: requiredElement("icon-play"),
    iconPause: requiredElement("icon-pause"),
    btnMute: requiredElement<HTMLButtonElement>("btn-mute"),
    iconVolumeOn: requiredElement("icon-volume-on"),
    iconVolumeOff: requiredElement("icon-volume-off"),
    sliderVolume: requiredElement<HTMLInputElement>("slider-volume"),
    integratedTimelineContainer: requiredElement<HTMLDivElement>(
      "integrated-timeline-container",
    ),
    timelineDensityCanvas: requiredElement<HTMLCanvasElement>(
      "timeline-density-canvas",
    ),
    timelineLeftOverlay: requiredElement<HTMLDivElement>("timeline-left-overlay"),
    timelineRightOverlay: requiredElement<HTMLDivElement>(
      "timeline-right-overlay",
    ),
    timelineActiveRegion: requiredElement<HTMLDivElement>(
      "timeline-active-region",
    ),
    timelinePlayhead: requiredElement<HTMLDivElement>("timeline-playhead"),
    trimHandleStart: requiredElement<HTMLDivElement>("trim-handle-start"),
    trimHandleEnd: requiredElement<HTMLDivElement>("trim-handle-end"),
    timeCurrent: requiredElement("time-current"),
    timeDuration: requiredElement("time-duration"),
    trimRangeLabel: requiredElement("trim-range-label"),
    btnResetTrim: requiredElement<HTMLButtonElement>("btn-reset-trim"),
    btnResetCamera: requiredElement<HTMLButtonElement>("btn-reset-camera"),
    typeTabsContainer: requiredElement("type-tabs-container"),
    typeTabs: requiredElement("type-tabs"),
    carModelTabs: requiredElement("car-model-tabs"),
  };
}
