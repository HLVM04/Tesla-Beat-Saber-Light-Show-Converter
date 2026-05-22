import type { InfoData } from "../converter";

export interface MapFile {
  name: string;
  data: ArrayBuffer;
}

export type LoadedFiles = Record<string, MapFile>;

export type UIState = "upload" | "config" | "progress" | "done";

export type BeatmapSet = InfoData["_difficultyBeatmapSets"][number];

export interface InfoDataWithMetadata extends InfoData {
  _songName?: string;
  _songSubName?: string;
  _songAuthorName?: string;
  _coverImageFilename?: string;
}
