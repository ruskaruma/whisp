// offscreen.js — Runs Whisper transcription in offscreen document
import { pipeline } from '../lib/transformers.min.js';

let transcriber = null;
let isLoading = false;

async function getTranscriber() {
  if (transcriber) return transcriber;
  if (isLoading) {
    // Wait for existing load to finish
    while (isLoading) {
      await new Promise(r => setTimeout(r, 200));
    }
    return transcriber;
  }

  isLoading = true;
  console.log('[Whisper] Loading model... (first time takes ~30s, cached after)');

  try {
    transcriber = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny',  // ~40MB, good enough for voice notes
      {
        dtype: 'q8',       // Quantized for speed
        device: 'wasm',    // Run via WebAssembly
      }
    );
    console.log('[Whisper] Model loaded successfully!');
  } catch (err) {
    console.error('[Whisper] Failed to load model:', err);
    throw err;
  } finally {
    isLoading = false;
  }

  return transcriber;
}

// Convert audio data to the format Whisper expects (Float32Array, 16kHz mono)
async function prepareAudio(audioData, mimeType) {
  // Create audio context at 16kHz (what Whisper expects)
  const audioContext = new OfflineAudioContext(1, 16000 * 300, 16000); // max 5 min

  // Decode the audio data
  const arrayBuffer = base64ToArrayBuffer(audioData);
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Render to get 16kHz mono
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start();

  const rendered = await audioContext.startRendering();
  return rendered.getChannelData(0); // Float32Array
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// Listen for transcription requests from background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'OFFSCREEN_TRANSCRIBE') {
    handleTranscribe(message).then(sendResponse);
    return true;
  }
});

async function handleTranscribe(message) {
  try {
    const model = await getTranscriber();
    const audioFloat32 = await prepareAudio(message.audioData, message.mimeType);

    console.log(`[Whisper] Transcribing ${(audioFloat32.length / 16000).toFixed(1)}s of audio...`);

    const result = await model(audioFloat32, {
      language: 'en',        // Change or remove for auto-detect
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    console.log('[Whisper] Transcription complete:', result.text);
    return { text: result.text.trim() };
  } catch (err) {
    console.error('[Whisper] Transcription failed:', err);
    return { error: err.message };
  }
}
