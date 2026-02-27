// content.js — Injected into WhatsApp Web
// Detects voice notes and adds a "Transcribe" button to each one

(function () {
  'use strict';

  const PROCESSED_ATTR = 'data-vnt-processed';
  const BUTTON_CLASS = 'vnt-transcribe-btn';
  const RESULT_CLASS = 'vnt-result';

  // ── Detect voice note message bubbles ──
  // WhatsApp Web renders voice notes with specific data attributes and audio elements.
  // We look for message rows containing audio playback UI.
  function findVoiceNotes() {
    // WhatsApp uses <span data-icon="audio-play"] or similar for voice notes
    // Voice messages typically have a waveform + play button + duration
    const candidates = document.querySelectorAll(
      `[data-testid="audio-play"]:not([${PROCESSED_ATTR}]),` +
      `[data-icon="audio-play"]:not([${PROCESSED_ATTR}]),` +
      `[data-icon="ptt-play"]:not([${PROCESSED_ATTR}]),` +
      `[data-testid="ptt-play"]:not([${PROCESSED_ATTR}])`
    );
    return candidates;
  }

  // ── Walk up DOM to find the message bubble container ──
  function getMessageBubble(el) {
    let node = el;
    for (let i = 0; i < 15; i++) {
      if (!node.parentElement) return null;
      node = node.parentElement;
      // WhatsApp message bubbles typically have role="row" or specific classes
      if (node.getAttribute('data-id') || node.classList.contains('message-in') || node.classList.contains('message-out')) {
        return node;
      }
      if (node.getAttribute('role') === 'row') {
        return node;
      }
    }
    // Fallback: return a reasonable parent
    return el.closest('[role="row"]') || el.parentElement?.parentElement?.parentElement;
  }

  // ── Extract contact name from the chat header ──
  function getCurrentContact() {
    const header = document.querySelector('header [data-testid="conversation-info-header-chat-title"]') 
      || document.querySelector('header span[title]');
    return header?.textContent?.trim() || header?.getAttribute('title') || 'Unknown';
  }

  // ── Extract audio blob from a voice note ──
  async function extractAudio(bubble) {
    // Method 1: Find the audio element directly
    const audioEl = bubble.querySelector('audio');
    if (audioEl && audioEl.src) {
      return await fetchBlobAsBase64(audioEl.src);
    }

    // Method 2: Look for the audio source in nested elements
    const sources = bubble.querySelectorAll('source');
    for (const src of sources) {
      if (src.src) {
        return await fetchBlobAsBase64(src.src);
      }
    }

    // Method 3: Click play first to force audio load, then extract
    // WhatsApp sometimes lazy-loads audio
    const playBtn = bubble.querySelector('[data-testid="audio-play"], [data-icon="audio-play"], [data-testid="ptt-play"], [data-icon="ptt-play"]');
    if (playBtn) {
      playBtn.click();
      await new Promise(r => setTimeout(r, 500));
      // Immediately pause
      const pauseBtn = bubble.querySelector('[data-testid="audio-pause"], [data-icon="audio-pause"], [data-testid="ptt-pause"], [data-icon="ptt-pause"]');
      if (pauseBtn) pauseBtn.click();

      const audioEl2 = bubble.querySelector('audio');
      if (audioEl2 && audioEl2.src) {
        return await fetchBlobAsBase64(audioEl2.src);
      }
    }

    return null;
  }

  async function fetchBlobAsBase64(url) {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return {
        base64: await blobToBase64(blob),
        mimeType: blob.type || 'audio/ogg'
      };
    } catch (err) {
      console.error('[VNT] Failed to fetch audio blob:', err);
      return null;
    }
  }

  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // ── Get voice note duration text ──
  function getDuration(bubble) {
    // WhatsApp shows duration like "0:23" near the voice note
    const timeEls = bubble.querySelectorAll('span');
    for (const el of timeEls) {
      const text = el.textContent.trim();
      if (/^\d{1,2}:\d{2}$/.test(text)) {
        return text;
      }
    }
    return '';
  }

  // ── Create and inject the Transcribe button ──
  function addTranscribeButton(playButton) {
    playButton.setAttribute(PROCESSED_ATTR, 'true');

    const bubble = getMessageBubble(playButton);
    if (!bubble) return;

    // Don't add duplicate buttons
    if (bubble.querySelector(`.${BUTTON_CLASS}`)) return;

    const btn = document.createElement('button');
    btn.className = BUTTON_CLASS;
    btn.textContent = '📝 Transcribe';
    btn.title = 'Transcribe this voice note';

    const resultDiv = document.createElement('div');
    resultDiv.className = RESULT_CLASS;
    resultDiv.style.display = 'none';

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      btn.disabled = true;
      btn.textContent = '⏳ Loading model...';

      try {
        const audioData = await extractAudio(bubble);
        if (!audioData) {
          btn.textContent = '❌ No audio found';
          setTimeout(() => {
            btn.textContent = '📝 Transcribe';
            btn.disabled = false;
          }, 2000);
          return;
        }

        btn.textContent = '🔄 Transcribing...';

        const response = await chrome.runtime.sendMessage({
          type: 'TRANSCRIBE_AUDIO',
          audioData: audioData.base64,
          mimeType: audioData.mimeType,
          contact: getCurrentContact(),
          duration: getDuration(bubble)
        });

        if (response.error) {
          btn.textContent = '❌ Error';
          resultDiv.textContent = `Error: ${response.error}`;
          resultDiv.style.display = 'block';
          setTimeout(() => {
            btn.textContent = '📝 Retry';
            btn.disabled = false;
          }, 2000);
        } else {
          btn.textContent = '✅ Done';
          resultDiv.textContent = response.text;
          resultDiv.style.display = 'block';

          // Add copy button
          const copyBtn = document.createElement('button');
          copyBtn.className = 'vnt-copy-btn';
          copyBtn.textContent = '📋 Copy';
          copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            navigator.clipboard.writeText(response.text);
            copyBtn.textContent = '✅ Copied!';
            setTimeout(() => copyBtn.textContent = '📋 Copy', 1500);
          });
          resultDiv.appendChild(copyBtn);

          setTimeout(() => {
            btn.textContent = '📝 Transcribe';
            btn.disabled = false;
          }, 2000);
        }
      } catch (err) {
        console.error('[VNT] Error:', err);
        btn.textContent = '❌ Failed';
        btn.disabled = false;
      }
    });

    // Insert the button and result area after the voice note
    const container = document.createElement('div');
    container.className = 'vnt-container';
    container.appendChild(btn);
    container.appendChild(resultDiv);

    // Find best place to insert — after the audio waveform area
    const insertTarget = bubble.querySelector('[data-testid="audio-waveform"]')?.parentElement
      || playButton.closest('[role="button"]')?.parentElement
      || playButton.parentElement;

    if (insertTarget) {
      insertTarget.parentElement.insertBefore(container, insertTarget.nextSibling);
    } else {
      bubble.appendChild(container);
    }
  }

  // ── Watch for new voice notes (MutationObserver) ──
  function scanAndAttach() {
    const voiceNotes = findVoiceNotes();
    voiceNotes.forEach(addTranscribeButton);
  }

  // Initial scan
  setTimeout(scanAndAttach, 2000);

  // Observe DOM mutations for new messages
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) {
      // Debounce
      clearTimeout(observer._timeout);
      observer._timeout = setTimeout(scanAndAttach, 300);
    }
  });

  // Start observing once the WhatsApp app element exists
  function startObserver() {
    const app = document.querySelector('#app') || document.body;
    observer.observe(app, { childList: true, subtree: true });
    console.log('[VNT] WhatsApp Voice Note Transcriber active ✅');
  }

  // Wait for WhatsApp to fully load
  if (document.querySelector('#app')) {
    startObserver();
  } else {
    const waitObserver = new MutationObserver(() => {
      if (document.querySelector('#app')) {
        waitObserver.disconnect();
        startObserver();
      }
    });
    waitObserver.observe(document.body, { childList: true, subtree: true });
  }
})();
