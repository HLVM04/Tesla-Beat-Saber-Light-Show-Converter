/**
 * Decodes an OGG (or other browser-supported audio format) ArrayBuffer
 * and encodes it into a standard 16-bit PCM stereo WAV Blob.
 */
export async function convertOggToWav(
  oggArrayBuffer: ArrayBuffer,
  onProgress?: (msg: string) => void
): Promise<Blob> {
  if (onProgress) onProgress("Initializing Web Audio Context...");
  
  // Create AudioContext (resilient to different browsers)
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API is not supported in this browser.");
  }
  
  const audioCtx = new AudioContextClass();
  
  try {
    if (onProgress) onProgress("Decoding OGG audio data in browser (this may take a few seconds)...");
    
    // decodeAudioData consumes the buffer, so we slice it to be safe
    const decodedBuffer = await audioCtx.decodeAudioData(oggArrayBuffer.slice(0));
    
    if (onProgress) onProgress("OGG audio successfully decoded. Encoding to WAV format...");
    
    const wavBlob = audioBufferToWav(decodedBuffer);
    
    if (onProgress) onProgress("WAV audio successfully encoded!");
    return wavBlob;
  } catch (err) {
    console.error("Audio decoding failed:", err);
    throw new Error(`Failed to decode audio: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    await audioCtx.close();
  }
}

/**
 * Encodes an AudioBuffer into a WAV Blob.
 */
export async function trimWavBlob(wavBlob: Blob, startMs: number, endMs: number): Promise<Blob> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio API is not supported in this browser.");
  }

  const audioCtx = new AudioContextClass();

  try {
    const decodedBuffer = await audioCtx.decodeAudioData(await wavBlob.arrayBuffer());
    const sampleRate = decodedBuffer.sampleRate;
    const startSample = Math.max(0, Math.floor((startMs / 1000) * sampleRate));
    const endSample = Math.min(decodedBuffer.length, Math.ceil((endMs / 1000) * sampleRate));
    const frameCount = Math.max(1, endSample - startSample);
    const trimmedBuffer = audioCtx.createBuffer(decodedBuffer.numberOfChannels, frameCount, sampleRate);

    for (let channel = 0; channel < decodedBuffer.numberOfChannels; channel++) {
      const source = decodedBuffer.getChannelData(channel);
      const target = trimmedBuffer.getChannelData(channel);
      target.set(source.subarray(startSample, endSample));
    }

    return audioBufferToWav(trimmedBuffer);
  } finally {
    await audioCtx.close();
  }
}

export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // Raw PCM
  const bitDepth = 16;
  
  let result: Float32Array;
  if (numOfChan === 2) {
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else if (numOfChan > 2) {
    // If multi-channel, merge or take first 2
    result = interleave(buffer.getChannelData(0), buffer.getChannelData(1));
  } else {
    // Mono
    result = buffer.getChannelData(0);
  }
  
  const bufferLength = result.length * 2; // 16-bit PCM = 2 bytes per sample
  const wavBuffer = new ArrayBuffer(44 + bufferLength);
  const view = new DataView(wavBuffer);
  
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + bufferLength, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM = 1) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, Math.min(numOfChan, 2), true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * Math.min(numOfChan, 2) * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, Math.min(numOfChan, 2) * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, bufferLength, true);
  
  // Write float samples as 16-bit signed integers
  floatTo16BitPCM(view, 44, result);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function interleave(inputL: Float32Array, inputR: Float32Array): Float32Array {
  const length = inputL.length + inputR.length;
  const result = new Float32Array(length);
  let index = 0;
  let inputIndex = 0;
  
  while (index < length) {
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
