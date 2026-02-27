# 📝 WhatsApp Voice Note Transcriber

A lightweight Chrome extension that transcribes WhatsApp Web voice notes **100% offline and free** using Whisper AI running directly in your browser.

No API keys. No subscriptions. No data leaves your machine.

---

## ✨ Features

- **📝 One-click transcribe** — "Transcribe" button appears next to every voice note
- **🔒 Fully private** — All processing happens locally in your browser
- **💰 100% free** — No API keys, no usage limits, no subscriptions
- **📴 Works offline** — After first model download (~40MB, cached permanently)
- **📋 Copy & export** — Copy individual notes or export all as a text file
- **🔍 Search notes** — Search through all your transcriptions from the popup
- **🌙 Dark mode** — Matches WhatsApp's dark theme automatically

---

## 🚀 Setup (5 minutes)

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- Google Chrome browser

### Step 1: Install dependencies
```bash
cd whatsapp-voice-notes
npm install
```

### Step 2: Build the extension
```bash
npm run build
```
This copies the Transformers.js library into the `lib/` folder.

### Step 3: Load in Chrome
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `whatsapp-voice-notes` folder
5. Done! The extension icon appears in your toolbar

### Step 4: Use it
1. Go to [web.whatsapp.com](https://web.whatsapp.com)
2. Open any chat with voice notes
3. Click the green **"📝 Transcribe"** button next to any voice note
4. First use downloads the Whisper model (~40MB, cached after that)
5. Transcription appears below the voice note!

---

## 📦 Publishing to Chrome Web Store

### One-time setup (costs $5)

1. **Register as a developer** at [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay the **one-time $5 registration fee**
3. Verify your identity

### Prepare your extension

1. Create a ZIP of the extension:
   ```bash
   # Make sure you've run npm install && npm run build first
   zip -r whatsapp-voice-notes.zip . \
     -x "node_modules/*" \
     -x ".git/*" \
     -x "setup.js" \
     -x "package.json" \
     -x "package-lock.json" \
     -x "generate_icons.py" \
     -x "*.md"
   ```

2. You'll need these assets for the listing:
   - **Screenshots** (1280x800 or 640x400) — take screenshots of the extension working on WhatsApp Web
   - **Promo images** — small tile (440x280)
   - **Description** — use the feature list from this README

### Submit for review

1. Go to the [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"**
3. Upload your `.zip` file
4. Fill in:
   - **Name**: WhatsApp Voice Note Transcriber
   - **Category**: Productivity
   - **Language**: English
   - **Description**: (copy from above)
   - **Screenshots**: (from step 2)
5. Under **Privacy**:
   - Single purpose: "Transcribes WhatsApp voice notes to text"
   - Permissions justification: explain why each permission is needed
   - Data use: "All processing happens locally. No data is collected or transmitted."
6. Click **"Submit for review"**

### Review timeline
- Usually **1-3 business days**
- Sometimes up to a week for first submissions
- You'll get an email when approved

---

## 🗂️ Project Structure

```
whatsapp-voice-notes/
├── manifest.json       # Extension config (MV3)
├── background.js       # Service worker — message relay
├── content.js          # Injected into WhatsApp Web — UI injection
├── styles.css          # Styles for transcribe button & results
├── offscreen.html      # Offscreen document host
├── offscreen.js        # Runs Whisper model via Transformers.js
├── popup.html          # Extension popup — view/search/export notes
├── popup.js            # Popup logic
├── lib/                # (generated) Transformers.js bundle
├── icons/              # Extension icons
├── package.json        # Dependencies
├── setup.js            # Build script
└── README.md           # This file
```

---

## ⚙️ Configuration

### Change language
In `offscreen.js`, edit the language parameter:
```js
const result = await model(audioFloat32, {
  language: 'en',       // Change to 'es', 'fr', 'de', 'hi', 'pt', etc.
  task: 'transcribe',   // Use 'translate' to translate to English
});
```

### Use a larger model (more accurate, slower)
In `offscreen.js`, change the model name:
```js
// Options (bigger = more accurate but slower first load):
'onnx-community/whisper-tiny'    // ~40MB  — fast, good enough
'onnx-community/whisper-base'    // ~75MB  — better accuracy
'onnx-community/whisper-small'   // ~250MB — best accuracy for in-browser
```

---

## 🐛 Troubleshooting

| Issue | Fix |
|-------|-----|
| No "Transcribe" button appears | Refresh WhatsApp Web. WhatsApp may have changed their DOM structure. |
| "No audio found" error | Click play on the voice note first, then click Transcribe. |
| Model download stuck | Check your internet for the first download. It's cached after that. |
| Extension not working after Chrome update | Go to `chrome://extensions` → click the refresh icon on the extension. |

---

## 📄 License

MIT — free to use, modify, and distribute.
