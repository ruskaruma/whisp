# Whisp

A Chrome extension that transcribes WhatsApp Web voice notes locally in your browser using Whisper AI. No API keys, no servers, no data leaving your machine. The Whisper model runs entirely in-browser via WebAssembly.

After the first run downloads the model (~40MB), everything works offline.

## What it does

- Adds a "Transcribe" button next to every voice note on WhatsApp Web
- Runs OpenAI's Whisper (tiny, quantized) directly in the browser through Transformers.js
- Saves transcriptions locally and lets you search, copy, and export them from the extension popup
- Respects WhatsApp's dark theme automatically

## Setup

You need Node.js (v18+) and Chrome.

```
npm install
npm run build
```

The build step copies Transformers.js and its WASM files into `lib/` so the extension can load them.

Then load it in Chrome:

1. Go to `chrome://extensions`
2. Turn on Developer mode (top right)
3. Click "Load unpacked" and select this project folder
4. Open WhatsApp Web and click the Transcribe button on any voice note

The first transcription takes about 30 seconds while the model downloads. After that it's cached and works instantly.

## Project structure

```
whisp/
  manifest.json          Chrome extension manifest (MV3)
  package.json           Dependencies and build scripts
  src/
    background.js        Service worker, relays messages between content script and offscreen document
    content.js           Injected into WhatsApp Web, finds voice notes and adds the transcribe UI
    content.css          Styles for the transcribe button and result text
    offscreen.html       Host page for the offscreen document
    offscreen.js         Loads the Whisper model via Transformers.js and runs transcription
    popup.html           Extension popup, shows saved transcriptions
    popup.js             Popup logic: search, copy, export, delete
  assets/
    icons/               Extension icons (16, 48, 128px)
  scripts/
    setup.js             Build script that copies Transformers.js into lib/
  lib/                   (generated) Transformers.js bundle and WASM files
```

## How it works

Chrome extensions can't run heavy computation in service workers, so the architecture uses three layers:

1. **Content script** (`content.js`) runs on WhatsApp Web. It watches the DOM for voice note elements, injects a Transcribe button, and extracts the audio as base64 when clicked.

2. **Background service worker** (`background.js`) receives the audio from the content script and forwards it to an offscreen document. It also manages storing transcriptions in `chrome.storage.local`.

3. **Offscreen document** (`offscreen.js`) is where the actual work happens. It loads the Whisper model through Transformers.js, resamples the audio to 16kHz mono using the Web Audio API, and runs the transcription.

## Configuration

To change the transcription language, edit `src/offscreen.js`:

```js
const result = await model(audioFloat32, {
  language: 'en',       // change to 'es', 'fr', 'de', 'hi', 'pt', etc.
  task: 'transcribe',   // use 'translate' to translate everything to English
});
```

To use a more accurate (but larger) model, change the model name in the same file:

```
onnx-community/whisper-tiny     ~40MB, fast, good enough for most voice notes
onnx-community/whisper-base     ~75MB, better accuracy
onnx-community/whisper-small    ~250MB, best you can reasonably run in a browser
```

## Troubleshooting

**No Transcribe button appears** -- Refresh WhatsApp Web. WhatsApp occasionally changes their DOM structure, which may break the selectors in `content.js`.

**"No audio found" error** -- Click play on the voice note first, then click Transcribe. WhatsApp lazy-loads the audio element.

**Model download hangs** -- Needs an internet connection for the first download only. After that it's cached in the browser.

**Extension stops working after a Chrome update** -- Go to `chrome://extensions` and click the refresh icon on the extension.

## License

MIT
