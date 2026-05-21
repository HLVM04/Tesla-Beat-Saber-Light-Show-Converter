import {
  LightBindingsLeft,
  LightBindingsRight,
  LightBindingsRear,
} from "./bindings";
import { TEMPLATE_XSQ } from "./template";

export const LightBlinkDuration = 100;
export const SequenceBufferTime = 5.0; // seconds
export const MillisecondsPerMinute = 60000.0;

export interface LightEffect {
  startTime: number; // in milliseconds
  endTime: number;   // in milliseconds
}

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
  private effectsData: Record<string, LightEffect[]> = {};
  private lastBlockTime: number = 0;
  private blinkDuration: number;

  constructor(bpm: number, mapData: MapData, blinkDuration: number = 100) {
    this.bpmPerMillisecond = bpm / MillisecondsPerMinute;
    this.mapData = mapData;
    this.blinkDuration = blinkDuration;
  }

  public generateLightshow(): string {
    this.effects = {};
    this.effectsData = {};
    this.lastBlockTime = 0;

    this.processNotes();
    this.processEvents();

    return this.buildXMLContent();
  }

  public generateFseq(): Uint8Array {
    // If effectsData hasn't been built yet, build it
    if (!this.effectsData || Object.keys(this.effectsData).length === 0) {
      this.effects = {};
      this.effectsData = {};
      this.lastBlockTime = 0;
      this.processNotes();
      this.processEvents();
    }

    const durationMs = this.lastBlockTime + SequenceBufferTime * 1000;
    const stepTimeMs = 20;
    const channelCount = 200;
    const frameCount = Math.ceil(durationMs / stepTimeMs);
    const headerSize = 32;
    const bufferSize = headerSize + channelCount * frameCount;
    const buffer = new Uint8Array(bufferSize);
    const view = new DataView(buffer.buffer);

    // 0-3: Magic 'PSEQ'
    buffer[0] = 0x50; // 'P'
    buffer[1] = 0x53; // 'S'
    buffer[2] = 0x45; // 'E'
    buffer[3] = 0x51; // 'Q'

    // 4-5: Channel data start offset (32)
    view.setUint16(4, headerSize, true);

    // 6: Minor version (0)
    buffer[6] = 0;
    // 7: Major version (2)
    buffer[7] = 2;

    // 8-9: Header size (32)
    view.setUint16(8, headerSize, true);

    // 10-13: Channel count (200)
    view.setUint32(10, channelCount, true);

    // 14-17: Frame count
    view.setUint32(14, frameCount, true);

    // 18: Step time in ms (20)
    buffer[18] = stepTimeMs;

    // 19: Flags (0)
    buffer[19] = 0;

    // 20: Compression type (0 - uncompressed)
    buffer[20] = 0;

    // 21: Compression blocks (0)
    buffer[21] = 0;

    // 22: Sparse ranges (0)
    buffer[22] = 0;

    // 23: Reserved (0)
    buffer[23] = 0;

    // 24-31: Unique identifier UUID (8 bytes)
    const uuid = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
    for (let i = 0; i < 8; i++) {
      buffer[24 + i] = uuid[i];
    }

    // Map light names to 1-based FSEQ channel numbers
    const nameToChannel: Record<string, number> = {
      "Left Outer Main Beam": 1,
      "Right Outer Main Beam": 2,
      "Left Inner Main Beam": 3,
      "Right Inner Main Beam": 4,
      "Left Signature": 5,
      "Right Signature": 6,
      "Left Channel 4": 7,
      "Right Channel 4": 8,
      "Left Channel 5": 9,
      "Right Channel 5": 10,
      "Left Channel 6": 11,
      "Right Channel 6": 12,
      "Left Front Turn": 13,
      "Right Front Turn": 14,
      "Left Front Fog": 15,
      "Right Front Fog": 16,
      "Left Aux Park": 17,
      "Right Aux Park": 18,
      "Left Side Marker": 19,
      "Right Side Marker": 20,
      "Left Side Repeater": 21,
      "Right Side Repeater": 22,
      "Left Rear Turn": 23,
      "Right Rear Turn": 24,
      "Brake Lights": 25,
      "Left Tail": 26,
      "Right Tail": 27,
      "Reverse Lights": 28,
      "Rear Fog Lights": 29,
      "License Plate": 30,
      "Left Falcon Door": 31,
      "Right Falcon Door": 32,
      "Left Front Door": 33,
      "Right Front Door": 34,
      "Left Mirror": 35,
      "Right Mirror": 36,
      "Left Front Window": 37,
      "Left Rear Window": 38,
      "Right Front Window": 39,
      "Right Rear Window": 40,
      "Liftgate": 41,
      "Left Front Door Handle": 42,
      "Left Rear Door Handle": 43,
      "Right Front Door Handle": 44,
      "Right Rear Door Handle": 45,
      "Charge Port": 46,
      "Front Light Bar": 47,
    };

    // Populate frame channel data (starts at offset 32)
    for (let f = 0; f < frameCount; f++) {
      const t = f * stepTimeMs;
      const frameStartOffset = headerSize + f * channelCount;

      for (const [lightName, effects] of Object.entries(this.effectsData)) {
        const channelIndex = nameToChannel[lightName];
        if (channelIndex === undefined) continue;

        // Check if any effect overlaps timestamp t
        const isActive = effects.some(
          (effect) => effect.startTime <= t && t < effect.endTime
        );

        if (isActive) {
          buffer[frameStartOffset + (channelIndex - 1)] = 0xFF;
        }
      }
    }

    return buffer;
  }


  public getLightEffects(): Record<string, LightEffect[]> {
    return this.effectsData;
  }

  public getTotalEffectsCount(): number {
    let count = 0;
    for (const effects of Object.values(this.effectsData)) {
      count += effects.length;
    }
    return count;
  }

  public getDurationSeconds(): number {
    return this.lastBlockTime / 1000 + SequenceBufferTime;
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
        const endTime = startTime + this.blinkDuration;
        const effect = `        <Effect ref="0" name="On" startTime="${startTime}" endTime="${endTime}" palette="0"/>`;
        if (!this.effects[binding]) {
          this.effects[binding] = [];
        }
        this.effects[binding].push(effect);

        if (!this.effectsData[binding]) {
          this.effectsData[binding] = [];
        }
        this.effectsData[binding].push({ startTime, endTime });
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

        if (!this.effectsData[binding]) {
          this.effectsData[binding] = [];
        }
        this.effectsData[binding].push({ startTime, endTime });
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
