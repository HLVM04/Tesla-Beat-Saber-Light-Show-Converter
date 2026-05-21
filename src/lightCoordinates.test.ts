import { describe, it, expect } from "vitest";
import {
  LIGHT_METADATA,
  MODEL_S_COORDINATES,
  CYBERTRUCK_COORDINATES,
} from "./lightCoordinates";

describe("Light Coordinates definitions", () => {
  it("should have correct metadata schemas in LIGHT_METADATA", () => {
    expect(LIGHT_METADATA).toBeDefined();
    
    for (const [lightName, meta] of Object.entries(LIGHT_METADATA)) {
      expect(typeof lightName).toBe("string");
      expect(meta).toBeDefined();
      
      // Check glowColorType is one of the valid strings
      expect([
        "white",
        "ice-blue",
        "blue-signature",
        "amber",
        "red",
        "underglow-left",
        "underglow-right",
      ]).toContain(meta.glowColorType);
      
      // Check shape is sphere or box
      expect(["sphere", "box"]).toContain(meta.shape);
      
      if (meta.shape === "sphere") {
        expect(meta.radius).toBeDefined();
        expect(typeof meta.radius).toBe("number");
        expect(meta.radius).toBeGreaterThan(0);
      } else if (meta.shape === "box") {
        expect(meta.width).toBeDefined();
        expect(meta.height).toBeDefined();
        expect(meta.depth).toBeDefined();
        expect(typeof meta.width).toBe("number");
        expect(typeof meta.height).toBe("number");
        expect(typeof meta.depth).toBe("number");
      }
    }
  });

  it("should map valid 3D coordinates for Model S lights", () => {
    expect(MODEL_S_COORDINATES).toBeDefined();
    
    // Check that we have defined coordinate entries for the main lights
    const essentialLights = [
      "Left Outer Main Beam",
      "Right Outer Main Beam",
      "Left Front Turn",
      "Right Front Turn",
      "Brake Lights",
      "Left Tail",
      "Right Tail",
    ];

    essentialLights.forEach((light) => {
      expect(MODEL_S_COORDINATES[light]).toBeDefined();
      const coords = MODEL_S_COORDINATES[light];
      expect(Array.isArray(coords)).toBe(true);
      expect(coords.length).toBeGreaterThan(0);
      
      coords.forEach((coord) => {
        expect(typeof coord.x).toBe("number");
        expect(typeof coord.y).toBe("number");
        expect(typeof coord.z).toBe("number");
      });
    });
  });

  it("should map valid 3D coordinates for Cybertruck lights", () => {
    expect(CYBERTRUCK_COORDINATES).toBeDefined();
    
    const essentialLights = [
      "Left Outer Main Beam",
      "Right Outer Main Beam",
      "Left Front Turn",
      "Right Front Turn",
      "Brake Lights",
      "Left Tail",
      "Right Tail",
    ];

    essentialLights.forEach((light) => {
      expect(CYBERTRUCK_COORDINATES[light]).toBeDefined();
      const coords = CYBERTRUCK_COORDINATES[light];
      expect(Array.isArray(coords)).toBe(true);
      
      // Some cybertruck lights can have empty coordinate arrays if not modeled/configured
      // but they must at least be defined as an array
      coords.forEach((coord) => {
        expect(typeof coord.x).toBe("number");
        expect(typeof coord.y).toBe("number");
        expect(typeof coord.z).toBe("number");
      });
    });
  });
});
