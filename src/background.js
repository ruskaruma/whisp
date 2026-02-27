// background.js — Service Worker
// Relays audio data between content script and offscreen document for transcription

let offscreenCreated = false;

async function ensureOffscreen() {
  if (offscreenCreated) return;
  
  const existingContexts = await chrome.runtime.getContexts({
    contextType: 'OFFSCREEN_DOCUMENT'
  });
  
  if (existingContexts.length > 0) {
    offscreenCreated = true;
    return;
  }

  await chrome.offscreen.createDocument({
    url: 'src/offscreen.html',
    reasons: ['WORKERS'],
    justification: 'Run Whisper model for voice note transcription'
  });
  offscreenCreated = true;
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  if (message.type === 'TRANSCRIBE_AUDIO') {
    handleTranscription(message, sender.tab?.id).then(sendResponse);
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_NOTES') {
    chrome.storage.local.get(['notes'], (result) => {
      sendResponse({ notes: result.notes || [] });
    });
    return true;
  }

  if (message.type === 'CLEAR_NOTES') {
    chrome.storage.local.set({ notes: [] }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === 'DELETE_NOTE') {
    chrome.storage.local.get(['notes'], (result) => {
      const notes = result.notes || [];
      notes.splice(message.index, 1);
      chrome.storage.local.set({ notes }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

async function handleTranscription(message, tabId) {
  try {
    await ensureOffscreen();

    // Send audio to offscreen document and wait for result
    const result = await chrome.runtime.sendMessage({
      type: 'OFFSCREEN_TRANSCRIBE',
      audioData: message.audioData,
      mimeType: message.mimeType
    });

    if (result.error) {
      return { error: result.error };
    }

    // Save the note
    const note = {
      text: result.text,
      timestamp: new Date().toISOString(),
      contact: message.contact || 'Unknown',
      duration: message.duration || ''
    };

    const stored = await chrome.storage.local.get(['notes']);
    const notes = stored.notes || [];
    notes.unshift(note); // newest first
    
    // Keep max 500 notes
    if (notes.length > 500) notes.length = 500;
    await chrome.storage.local.set({ notes });

    return { text: result.text, success: true };
  } catch (err) {
    console.error('Transcription error:', err);
    return { error: err.message };
  }
}
