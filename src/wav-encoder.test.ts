import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertOggToWav } from "./wav-encoder";

describe("WAV Encoder Resilience", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    // Reset global window mock before each test
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.window = originalWindow;
  });

  it("should throw error if AudioContext is not supported/defined on window", async () => {
    // Set up window without AudioContext
    globalThis.window = {} as any;

    const dummyBuffer = new ArrayBuffer(10);
    await expect(convertOggToWav(dummyBuffer)).rejects.toThrow(
      "Web Audio API is not supported in this browser."
    );
  });

  it("should attempt decoding and call progress callbacks when AudioContext is mocked", async () => {
    const mockDecodeAudioData = vi.fn().mockRejectedValue(new Error("Mock decode error"));
    const mockClose = vi.fn().mockResolvedValue(undefined);

    class MockAudioContext {
      decodeAudioData = mockDecodeAudioData;
      close = mockClose;
    }

    globalThis.window = {
      AudioContext: MockAudioContext,
    } as any;

    const dummyBuffer = new ArrayBuffer(10);
    const progressMessages: string[] = [];
    const onProgress = (msg: string) => progressMessages.push(msg);

    // Should reject because decodeAudioData throws a "Mock decode error"
    await expect(convertOggToWav(dummyBuffer, onProgress)).rejects.toThrow(
      "Failed to decode audio: Mock decode error"
    );

    // Verify progress reporting was triggered
    expect(progressMessages).toContain("Initializing Web Audio Context...");
    expect(progressMessages).toContain(
      "Decoding OGG audio data in browser (this may take a few seconds)..."
    );

    // Verify that the context was closed gracefully in the finally block
    expect(mockClose).toHaveBeenCalledTimes(1);
  });
});
