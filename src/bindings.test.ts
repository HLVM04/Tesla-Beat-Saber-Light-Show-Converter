import { describe, it, expect } from "vitest";
import {
  RightLights,
  LeftLights,
  RearLights,
  LightBindingsLeft,
  LightBindingsRight,
  LightBindingsRear,
} from "./bindings";

describe("Light Bindings Definitions", () => {
  it("should have correct and unique light names in RightLights", () => {
    expect(RightLights).toBeDefined();
    const names = Object.values(RightLights);
    expect(names.length).toBeGreaterThan(0);
    
    // Check for some known signature lights
    expect(names).toContain("Right Outer Main Beam");
    expect(names).toContain("Right Signature");
    expect(names).toContain("Right Front Turn");
    
    // Ensure all values are non-empty strings
    names.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it("should have correct and unique light names in LeftLights", () => {
    expect(LeftLights).toBeDefined();
    const names = Object.values(LeftLights);
    expect(names.length).toBeGreaterThan(0);
    
    // Check for some known signature lights
    expect(names).toContain("Left Outer Main Beam");
    expect(names).toContain("Left Signature");
    expect(names).toContain("Left Front Turn");
    
    names.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it("should have correct and unique light names in RearLights", () => {
    expect(RearLights).toBeDefined();
    const names = Object.values(RearLights);
    expect(names.length).toBeGreaterThan(0);
    
    expect(names).toContain("Brake Lights");
    expect(names).toContain("License Plate");
    expect(names).toContain("Left Tail");
    expect(names).toContain("Right Tail");
    
    names.forEach((name) => {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });
  });

  it("should map Left bindings only to valid LeftLights", () => {
    const leftLightValues = new Set(Object.values(LeftLights));
    
    expect(LightBindingsLeft).toBeDefined();
    for (const [key, lights] of Object.entries(LightBindingsLeft)) {
      expect(key).toMatch(/^[0-2][0-3]$/); // grid coords in format e.g. "01", "12", etc.
      expect(Array.isArray(lights)).toBe(true);
      expect(lights.length).toBeGreaterThan(0);
      
      lights.forEach((light) => {
        expect(leftLightValues.has(light)).toBe(true);
      });
    }
  });

  it("should map Right bindings only to valid RightLights", () => {
    const rightLightValues = new Set(Object.values(RightLights));
    
    expect(LightBindingsRight).toBeDefined();
    for (const [key, lights] of Object.entries(LightBindingsRight)) {
      expect(key).toMatch(/^[0-2][0-3]$/);
      expect(Array.isArray(lights)).toBe(true);
      expect(lights.length).toBeGreaterThan(0);
      
      lights.forEach((light) => {
        expect(rightLightValues.has(light)).toBe(true);
      });
    }
  });

  it("should map Rear bindings only to valid RearLights", () => {
    const rearLightValues = new Set(Object.values(RearLights));
    
    expect(LightBindingsRear).toBeDefined();
    for (const [key, lights] of Object.entries(LightBindingsRear)) {
      const numericKey = Number(key);
      expect(numericKey).toBeGreaterThanOrEqual(0);
      expect(numericKey).toBeLessThanOrEqual(4);
      expect(Array.isArray(lights)).toBe(true);
      expect(lights.length).toBeGreaterThan(0);
      
      lights.forEach((light) => {
        expect(rearLightValues.has(light)).toBe(true);
      });
    }
  });
});
