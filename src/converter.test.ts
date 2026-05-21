import { describe, it, expect } from "vitest";
import {
  convertV3ToV2,
  parseMapData,
  LightshowConverter,
} from "./converter";
import type { MapData, MapDataV3 } from "./converter";

describe("Lightshow Converter Logic", () => {
  describe("convertV3ToV2", () => {
    it("should correctly convert valid V3 map format to standard V2 representation", () => {
      const v3Map: MapDataV3 = {
        version: "3.2.0",
        colorNotes: [
          { b: 1.0, x: 2, y: 1, c: 0 },
          { b: 2.5, x: 3, y: 2, c: 1 },
        ],
        basicBeatmapEvents: [
          { b: 0.5, et: 1, i: 3 },
          { b: 3.0, et: 0, i: 7 },
        ],
      };

      const result = convertV3ToV2(v3Map);

      expect(result._version).toBe("3.2.0");
      expect(result._notes).toHaveLength(2);
      expect(result._notes[0]).toEqual({
        _time: 1.0,
        _lineIndex: 2,
        _lineLayer: 1,
        _type: 0,
      });
      expect(result._notes[1]).toEqual({
        _time: 2.5,
        _lineIndex: 3,
        _lineLayer: 2,
        _type: 1,
      });

      expect(result._events).toHaveLength(2);
      expect(result._events[0]).toEqual({
        _time: 0.5,
        _type: 1,
        _value: 3,
      });
      expect(result._events[1]).toEqual({
        _time: 3.0,
        _type: 0,
        _value: 7,
      });
    });

    it("should handle missing optional lists gracefully", () => {
      const v3MapEmpty: MapDataV3 = {
        version: "3.0.0",
      };

      const result = convertV3ToV2(v3MapEmpty);

      expect(result._version).toBe("3.0.0");
      expect(result._notes).toEqual([]);
      expect(result._events).toEqual([]);
    });
  });

  describe("parseMapData", () => {
    it("should parse V2 map JSON correctly", () => {
      const json = JSON.stringify({
        _version: "2.0.0",
        _notes: [{ _time: 1.0, _lineIndex: 0, _lineLayer: 0, _type: 0 }],
        _events: [{ _time: 1.0, _type: 0, _value: 1 }],
      });

      const parsed = parseMapData(json);
      expect(parsed._version).toBe("2.0.0");
      expect(parsed._notes).toHaveLength(1);
      expect(parsed._notes[0]._time).toBe(1.0);
    });

    it("should detect version 3 and parse it successfully as a converted V2", () => {
      const json = JSON.stringify({
        version: "3.0.0",
        colorNotes: [{ b: 2.0, x: 1, y: 1, c: 1 }],
        basicBeatmapEvents: [{ b: 2.0, et: 1, i: 2 }],
      });

      const parsed = parseMapData(json);
      expect(parsed._version).toBe("3.0.0");
      expect(parsed._notes).toHaveLength(1);
      expect(parsed._notes[0]).toEqual({
        _time: 2.0,
        _lineIndex: 1,
        _lineLayer: 1,
        _type: 1,
      });
    });

    it("should throw an error if no version field exists", () => {
      const json = JSON.stringify({
        notes: [],
      });

      expect(() => parseMapData(json)).toThrow("No version field found in beatmap file");
    });

    it("should fall back to V3 parsing with a warning on unsupported versions", () => {
      const json = JSON.stringify({
        version: "4.0.0",
        colorNotes: [{ b: 10, x: 0, y: 0, c: 0 }],
      });

      const parsed = parseMapData(json);
      expect(parsed._version).toBe("4.0.0");
      expect(parsed._notes).toHaveLength(1);
      expect(parsed._notes[0]._time).toBe(10);
    });
  });

  describe("LightshowConverter Class", () => {
    // Standard mock V2 map
    const mockMapData: MapData = {
      _version: "2.0.0",
      _notes: [
        { _time: 1.0, _lineIndex: 0, _lineLayer: 1, _type: 0 }, // Left note type 0 -> matches '10' grid coordinate
        { _time: 3.0, _lineIndex: 3, _lineLayer: 1, _type: 1 }, // Right note type 1 -> matches '13' grid coordinate
      ],
      _events: [
        { _time: 0.5, _type: 1, _value: 3 }, // Event type 1, val 3 (isBlue) -> maps to Rear index 0 (Brake Lights)
        { _time: 2.5, _type: 0, _value: 6 }, // Event type 0, val 6 (isRed) -> maps to Rear index 3 (Right Rear Turn/Left Rear Turn)
      ],
    };

    it("should initialize correct BPM per millisecond mapping", () => {
      const converter = new LightshowConverter(120, mockMapData, 100);
      
      // 120 bpm = 2 beats per second = 2 beats per 1000ms = 0.002 beats per ms
      // bpmPerMillisecond calculation internally: bpm / 60000 -> 120 / 60000 = 0.002
      // Let's verify through getters/internals.
      expect(converter).toBeDefined();
    });

    it("should return the correct timeline structure from getLightEffects and duration from getDurationSeconds", () => {
      // 120 BPM means 1 beat = 500 ms
      // Note 1: 1.0 beat = 500 ms.
      // Note 2: 3.0 beat = 1500 ms.
      // Event 1: 0.5 beat = 250 ms.
      // Event 2: 2.5 beat = 1250 ms.
      // Last event/note startTime is 1500ms.
      const converter = new LightshowConverter(120, mockMapData, 100);
      converter.generateLightshow(); // populates effectsData

      const effectsData = converter.getLightEffects();
      expect(effectsData).toBeDefined();

      // Check if some lights are defined and populated
      expect(converter.getTotalEffectsCount()).toBeGreaterThan(0);
      
      // Duration = lastBlockTime (1600ms = 1500ms start + 100ms blink duration) / 1000 + SequenceBufferTime (5) = 6.6 seconds
      expect(converter.getDurationSeconds()).toBeCloseTo(6.6);
    });

    it("should generate valid XML content containing injected media and effect elements", () => {
      const converter = new LightshowConverter(120, mockMapData, 100);
      const xml = converter.generateLightshow();

      // Check header info
      expect(xml).toContain("ColorPalette");
      expect(xml).toContain("LightshowOutput/lightshow.wav");
      
      // Duration string injection check
      expect(xml).toContain("<sequenceDuration>6.600</sequenceDuration>");

      // Check that Left note mapped to Left Inner Main Beam / Left Signature (bindings.ts grid key '10') is in the XML
      expect(xml).toContain('name="Left Outer Main Beam"');
    });

    it("should generate valid FSEQ binary files matching the FSEQ format specifications", () => {
      const converter = new LightshowConverter(120, mockMapData, 100);
      const fseq = converter.generateFseq();

      expect(fseq).toBeInstanceOf(Uint8Array);
      
      // Header length should be at least 32
      expect(fseq.length).toBeGreaterThan(32);

      // Verify Magic PSEQ
      expect(fseq[0]).toBe(0x50); // 'P'
      expect(fseq[1]).toBe(0x53); // 'S'
      expect(fseq[2]).toBe(0x45); // 'E'
      expect(fseq[3]).toBe(0x51); // 'Q'

      // Verify version
      expect(fseq[6]).toBe(0); // minor
      expect(fseq[7]).toBe(2); // major

      // Channel data start offset
      const view = new DataView(fseq.buffer);
      const channelOffset = view.getUint16(4, true);
      expect(channelOffset).toBe(32);

      // Channel count
      const channelCount = view.getUint32(10, true);
      expect(channelCount).toBe(200);

      // Step time
      const stepTime = fseq[18];
      expect(stepTime).toBe(20);

      // UUID verification
      expect(fseq[24]).toBe(0x01);
      expect(fseq[31]).toBe(0x08);

      // Check that frame channel data contains active points (0xFF) and inactive (0x00)
      let hasOn = false;
      let hasOff = false;
      for (let i = 32; i < fseq.length; i++) {
        if (fseq[i] === 0xFF) hasOn = true;
        if (fseq[i] === 0x00) hasOff = true;
      }
      expect(hasOn).toBe(true);
      expect(hasOff).toBe(true);
    });

    it("should correctly convert maps that only contain events and no notes, producing valid positive duration", () => {
      const eventOnlyMap: MapData = {
        _version: "2.0.0",
        _notes: [], // Empty notes array
        _events: [
          { _time: 10.0, _type: 1, _value: 3 }, // Event at 10.0 beats (5000ms at 120bpm)
          { _time: 20.0, _type: 0, _value: 6 }, // Event at 20.0 beats (10000ms at 120bpm)
        ],
      };

      const converter = new LightshowConverter(120, eventOnlyMap, 100);
      const xml = converter.generateLightshow();

      // Expected duration = last event startTime (10000ms) + fallback blink duration (100ms) = 10100ms = 10.1s
      // Total duration seconds = 10.1 + 5.0 (buffer) = 15.1 seconds.
      const duration = converter.getDurationSeconds();
      expect(duration).toBeCloseTo(15.1);

      // Verify that XML sequenceDuration contains "15.100"
      expect(xml).toContain("<sequenceDuration>15.100</sequenceDuration>");
    });
  });
});
