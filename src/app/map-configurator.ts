import type { InfoData } from "../converter";
import type { AppElements } from "./dom";
import type { BeatmapSet, InfoDataWithMetadata, LoadedFiles } from "./types";

type Logger = (msg: string) => void;

export class MapConfigurator {
  private selectedType = "Standard";
  private selectedDifficultyFile: string | null = null;
  private readonly elements: AppElements;
  private readonly log: Logger;

  constructor(elements: AppElements, log: Logger) {
    this.elements = elements;
    this.log = log;
  }

  getSelectedDifficultyFile(): string | null {
    return this.selectedDifficultyFile;
  }

  reset() {
    this.selectedDifficultyFile = null;
  }

  renderLoadedMap(parsedInfo: InfoData, loadedFiles: LoadedFiles) {
    this.renderCoverPreview(parsedInfo, loadedFiles);

    const raw = parsedInfo as InfoDataWithMetadata;
    const realTitle = raw._songName || parsedInfo._songFilename || "Unknown Title";
    const realSub = raw._songSubName || "";
    const realArtist = raw._songAuthorName || "Unknown Artist";

    this.elements.songTitle.innerText = realTitle;
    this.elements.songSub.innerText = realSub;
    this.elements.songSub.classList.toggle("hidden", !realSub);
    this.elements.songArtist.innerText = realArtist;
    this.elements.mapBpm.innerText = `BPM: ${parsedInfo._beatsPerMinute}`;
    this.elements.mapVersionBadge.innerText = `Format: ${
      parsedInfo._version || "v2"
    }`;

    this.populateDifficulties(parsedInfo);
  }

  private renderCoverPreview(parsedInfo: InfoData, loadedFiles: LoadedFiles) {
    const raw = parsedInfo as InfoDataWithMetadata;
    const coverFilename = raw._coverImageFilename || "cover.jpg";
    const coverKey = coverFilename.toLowerCase();

    let fileEntry = loadedFiles[coverKey];

    if (!fileEntry) {
      const fallbacks = [
        "cover.jpg",
        "cover.png",
        "cover.jpeg",
        "info.jpg",
        "info.png",
      ];
      for (const fallback of fallbacks) {
        if (loadedFiles[fallback]) {
          fileEntry = loadedFiles[fallback];
          break;
        }
      }
    }

    if (fileEntry) {
      const mime = fileEntry.name.endsWith(".png") ? "image/png" : "image/jpeg";
      const blob = new Blob([fileEntry.data], { type: mime });
      const url = URL.createObjectURL(blob);
      this.elements.coverPreview.src = url;
      this.elements.coverPreview.classList.remove("hidden");
      this.elements.coverPlaceholder.classList.add("hidden");
    } else {
      this.elements.coverPreview.classList.add("hidden");
      this.elements.coverPlaceholder.classList.remove("hidden");
    }
  }

  private populateDifficulties(parsedInfo: InfoData) {
    this.elements.difficultyTabs.innerHTML = "";
    this.selectedDifficultyFile = null;

    if (
      !parsedInfo._difficultyBeatmapSets ||
      parsedInfo._difficultyBeatmapSets.length === 0
    ) {
      this.elements.typeTabsContainer.classList.add("hidden");
      return;
    }

    const sets = parsedInfo._difficultyBeatmapSets;
    const types = Array.from(
      new Set(sets.map((set) => getCharacteristicName(set))),
    );

    if (!types.includes(this.selectedType)) {
      this.selectedType = types.includes("Standard") ? "Standard" : types[0];
    }

    if (types.length > 1) {
      this.renderTypeTabs(types, parsedInfo);
    } else {
      this.elements.typeTabsContainer.classList.add("hidden");
    }

    const activeSet =
      sets.find((set) => getCharacteristicName(set) === this.selectedType) ||
      sets[0];

    if (!activeSet?._difficultyBeatmaps?.length) return;
    this.renderDifficultyTabs(activeSet);
  }

  private renderTypeTabs(types: string[], parsedInfo: InfoData) {
    this.elements.typeTabsContainer.classList.remove("hidden");
    this.elements.typeTabs.innerHTML = "";

    types.forEach((type) => {
      const typeButton = document.createElement("button");
      typeButton.className =
        "type-tab transition-all-300 btn btn-sm h-8 min-h-0 bg-base-200/70 hover:bg-base-300 text-base-content border-0 text-[11px] font-bold px-4 py-1.5 rounded-full select-none";
      typeButton.innerText = type;

      if (type === this.selectedType) {
        typeButton.classList.remove("bg-base-200/70", "text-base-content");
        typeButton.classList.add("bg-primary", "text-primary-content", "active");
      }

      typeButton.addEventListener("click", () => {
        if (typeButton.classList.contains("active")) return;
        this.selectedType = type;
        this.log(`Selected map type: ${type}`);
        this.populateDifficulties(parsedInfo);
      });

      this.elements.typeTabs.appendChild(typeButton);
    });
  }

  private renderDifficultyTabs(activeSet: BeatmapSet) {
    let highestRank = -1;
    let highestFilename = "";

    activeSet._difficultyBeatmaps.forEach((diffMap) => {
      const rank =
        typeof diffMap._difficultyRank === "number" ? diffMap._difficultyRank : 0;
      if (rank > highestRank) {
        highestRank = rank;
        highestFilename = diffMap._beatmapFilename;
      }
    });

    activeSet._difficultyBeatmaps.forEach((diffMap) => {
      const filename = diffMap._beatmapFilename;
      const difficultyName = diffMap._difficulty;
      const tabButton = document.createElement("button");
      tabButton.className =
        "diff-tab transition-all-300 btn btn-sm h-8 min-h-0 bg-base-200/70 hover:bg-base-300 text-base-content border-0 text-[11px] font-bold px-4 py-1.5 rounded-full select-none";
      tabButton.innerText = difficultyName;

      if (filename === highestFilename) {
        tabButton.classList.remove("bg-base-200/70", "text-base-content");
        tabButton.classList.add("bg-primary", "text-primary-content", "active");
        this.selectedDifficultyFile = filename;
      }

      tabButton.addEventListener("click", () => {
        if (tabButton.classList.contains("active")) return;
        this.elements.difficultyTabs.querySelectorAll(".diff-tab").forEach((btn) => {
          btn.classList.remove("bg-primary", "text-primary-content", "active");
          btn.classList.add("bg-base-200/70", "text-base-content");
        });

        tabButton.classList.remove("bg-base-200/70", "text-base-content");
        tabButton.classList.add("bg-primary", "text-primary-content", "active");
        this.selectedDifficultyFile = filename;
        this.log(`Selected difficulty: ${difficultyName}`);
      });

      this.elements.difficultyTabs.appendChild(tabButton);
    });

    if (!this.selectedDifficultyFile && this.elements.difficultyTabs.children.length > 0) {
      const firstTab = this.elements.difficultyTabs.children[0] as HTMLButtonElement;
      firstTab.click();
    }
  }
}

function getCharacteristicName(set: BeatmapSet): string {
  const name =
    set._beatmapCharacteristicName ||
    set.beatmapCharacteristicName ||
    set._difficultyBeatmapSet ||
    "Standard";
  return typeof name === "string" ? name.trim() : "Standard";
}
