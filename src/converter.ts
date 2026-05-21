import {
  LightBindingsLeft,
  LightBindingsRight,
  LightBindingsRear,
} from "./bindings";
import { TEMPLATE_XSQ } from "./template";

export const LightBlinkDuration = 100;
export const SequenceBufferTime = 5.0; // seconds
export const MillisecondsPerMinute = 60000.0;

// Beat Saber V2 Formats
export interface Note {
  _time: number;
  _lineIndex: number;
  _lineLayer: number;
  _type: number;
}

export interface Event {
  _time: number;
  _type: number;
  _value: number;
}

export interface MapData {
  _version: string;
  _notes: Note[];
  _events: Event[];
}

// Beat Saber V3 Formats
export interface NoteV3 {
  b: number; // time
  x: number; // lineIndex
  y: number; // lineLayer
  c: number; // type
}

export interface EventV3 {
  b: number; // time
  et: number; // event type
  i: number; // value
}

export interface MapDataV3 {
  version: string;
  colorNotes?: NoteV3[];
  basicBeatmapEvents?: EventV3[];
}

// Info.dat Format
export interface InfoData {
  _version: string;
  _beatsPerMinute: number;
  _songFilename: string;
  _difficultyBeatmapSets: Array<{
    _difficultyBeatmapSet?: string;
    _difficultyBeatmaps: Array<{
      _difficulty: string;
      _difficultyRank: number;
      _beatmapFilename: string;
      _customData?: {
        _requirements?: string[];
      };
    }>;
  }>;
}

/**
 * Normalizes V3 map formats to the standard V2 representation used in translation.
 */
export function convertV3ToV2(mapV3: MapDataV3): MapData {
  const notes: Note[] = (mapV3.colorNotes || []).map((nv3) => ({
    _time: nv3.b,
    _lineIndex: nv3.x,
    _lineLayer: nv3.y,
    _type: nv3.c,
  }));

  const events: Event[] = (mapV3.basicBeatmapEvents || []).map((ev3) => ({
    _time: ev3.b,
    _type: ev3.et,
    _value: ev3.i,
  }));

  return {
    _version: mapV3.version,
    _notes: notes,
    _events: events,
  };
}

/**
 * Detects version and parses Map JSON correctly.
 */
export function parseMapData(jsonContent: string): MapData {
  const rawMap = JSON.parse(jsonContent);

  // Check version field
  const version = rawMap.version || rawMap._version;
  if (!version || typeof version !== "string") {
    throw new Error("No version field found in beatmap file");
  }

  const majorVersion = version.split(".")[0];

  if (majorVersion === "3") {
    console.log(`Detected Beat Saber map version ${version}`);
    const mapV3: MapDataV3 = rawMap;
    return convertV3ToV2(mapV3);
  } else if (majorVersion === "2") {
    console.log(`Detected Beat Saber map version ${version}`);
    return rawMap as MapData;
  } else {
    console.warn(
      `WARNING: Unsupported Beat Saber map version ${version} detected. Attempting V3 parsing...`
    );
    const mapV3: MapDataV3 = rawMap;
    return convertV3ToV2(mapV3);
  }
}

/**
 * Translates a complete beatmap to Tesla xsq XML content.
 */
export class LightshowConverter {
  private bpmPerMillisecond: number;
  private mapData: MapData;
  private effects: Record<string, string[]> = {};
  private lastBlockTime: number = 0;

  constructor(bpm: number, mapData: MapData) {
    this.bpmPerMillisecond = bpm / MillisecondsPerMinute;
    this.mapData = mapData;
  }

  public generateLightshow(): string {
    this.effects = {};
    this.lastBlockTime = 0;

    this.processNotes();
    this.processEvents();

    return this.buildXMLContent();
  }

  private processNotes(): void {
    const notes = this.mapData._notes || [];
    for (const note of notes) {
      const startTime = Math.floor(note._time / this.bpmPerMillisecond);
      if (startTime > this.lastBlockTime) {
        this.lastBlockTime = startTime;
      }

      const positionKey = `${note._lineLayer}${note._lineIndex}`;
      const bindings = this.getBindingsForNote(note._type, positionKey);

      if (!bindings) continue;

      for (const binding of bindings) {
        const effect = `        <Effect ref="0" name="On" startTime="${startTime}" endTime="${
          startTime + LightBlinkDuration
        }" palette="0"/>`;
        if (!this.effects[binding]) {
          this.effects[binding] = [];
        }
        this.effects[binding].push(effect);
      }
    }
  }

  private getBindingsForNote(noteType: number, positionKey: string): string[] | null {
    if (noteType === 0) {
      // Left (red) note
      return LightBindingsLeft[positionKey] || null;
    } else if (noteType === 1) {
      // Right (blue) note
      return LightBindingsRight[positionKey] || null;
    }
    return null;
  }

  private processEvents(): void {
    const events = this.mapData._events || [];
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      const startTime = Math.floor(event._time / this.bpmPerMillisecond);
      const endTime = this.calculateEventEndTime(index, event._type);

      const bindings = this.getBindingsForEvent(event);
      if (!bindings) continue;

      for (const binding of bindings) {
        const effect = `        <Effect ref="0" name="On" startTime="${startTime}" endTime="${endTime}" palette="0"/>`;
        if (!this.effects[binding]) {
          this.effects[binding] = [];
        }
        this.effects[binding].push(effect);
      }
    }
  }

  private calculateEventEndTime(currentIndex: number, eventType: number): number {
    const events = this.mapData._events || [];
    for (let i = currentIndex + 1; i < events.length; i++) {
      if (events[i]._type === eventType) {
        return Math.floor(events[i]._time / this.bpmPerMillisecond);
      }
    }
    return this.lastBlockTime;
  }

  private getBindingsForEvent(event: Event): string[] | null {
    const val = event._value;
    const isBlue = val > 0 && val < 4;
    const isRed = val > 4 && val < 8;

    let bindingIndex: number;
    if (event._type === 1 && isBlue) {
      bindingIndex = 0;
    } else if (event._type === 1 && isRed) {
      bindingIndex = 1;
    } else if (event._type === 0 && isBlue) {
      bindingIndex = 2;
    } else if (event._type === 0 && isRed) {
      bindingIndex = 3;
    } else {
      return null;
    }

    return LightBindingsRear[bindingIndex] || null;
  }

  private buildXMLContent(): string {
    let xmlContent = TEMPLATE_XSQ;

    // Apply template replacements
    const mediaPath = "LightshowOutput/lightshow.wav";
    const durationSec = (this.lastBlockTime / 1000 + SequenceBufferTime).toFixed(3);

    xmlContent = xmlContent.replace("MEDIA_FILE_PATH", mediaPath);
    xmlContent = xmlContent.replace("SEQUENCE_DURATION", durationSec);

    // Add effects to their respective elements
    for (const [lightName, effects] of Object.entries(this.effects)) {
      if (effects.length > 0) {
        // Find the element in the XML and replace its empty EffectLayer
        const elementPattern = `<Element type="model" name="${lightName}">
      <EffectLayer/>
    </Element>`;

        const effectsContent = effects.join("\n");
        const replacement = `<Element type="model" name="${lightName}">
      <EffectLayer>
${effectsContent}
      </EffectLayer>
    </Element>`;

        xmlContent = xmlContent.replace(elementPattern, replacement);
      }
    }

    return xmlContent;
  }
}
