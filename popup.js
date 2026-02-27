// popup.js — Manages the notes popup UI

const notesList = document.getElementById('notesList');
const searchInput = document.getElementById('searchInput');
const statsEl = document.getElementById('stats');
const exportBtn = document.getElementById('exportBtn');
const clearBtn = document.getElementById('clearBtn');

let allNotes = [];

// Load notes on popup open
loadNotes();

searchInput.addEventListener('input', () => {
  renderNotes(searchInput.value.trim().toLowerCase());
});

clearBtn.addEventListener('click', async () => {
  if (confirm('Delete all transcription notes? This cannot be undone.')) {
    await chrome.runtime.sendMessage({ type: 'CLEAR_NOTES' });
    allNotes = [];
    renderNotes('');
  }
});

exportBtn.addEventListener('click', () => {
  if (allNotes.length === 0) return;

  const text = allNotes.map(n => {
    const date = new Date(n.timestamp).toLocaleString();
    return `[${date}] ${n.contact}${n.duration ? ` (${n.duration})` : ''}\n${n.text}\n`;
  }).join('\n---\n\n');

  const blob = new Blob([text], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `voice-notes-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
});

async function loadNotes() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_NOTES' });
  allNotes = response.notes || [];
  renderNotes('');
}

function renderNotes(filter) {
  const filtered = filter
    ? allNotes.filter(n =>
        n.text.toLowerCase().includes(filter) ||
        n.contact.toLowerCase().includes(filter)
      )
    : allNotes;

  if (filtered.length === 0) {
    notesList.innerHTML = `
      <div class="empty-state">
        <div class="emoji">🎙️</div>
        <p>${filter
          ? 'No notes match your search.'
          : 'No transcriptions yet.<br>Open WhatsApp Web and click<br>"📝 Transcribe" on any voice note!'
        }</p>
      </div>`;
    statsEl.textContent = '';
    return;
  }

  notesList.innerHTML = filtered.map((note, i) => {
    const date = new Date(note.timestamp);
    const timeStr = formatTime(date);

    return `
      <div class="note-item" data-index="${i}">
        <div class="note-meta">
          <span class="note-contact">${escapeHtml(note.contact)}${note.duration ? ` · ${note.duration}` : ''}</span>
          <span class="note-time">${timeStr}</span>
        </div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        <div class="note-actions">
          <button class="note-action-btn copy-btn" data-text="${escapeAttr(note.text)}">📋 Copy</button>
          <button class="note-action-btn delete" data-index="${i}">🗑️ Delete</button>
        </div>
      </div>`;
  }).join('');

  // Attach event listeners
  notesList.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.text);
      btn.textContent = '✅ Copied!';
      setTimeout(() => btn.textContent = '📋 Copy', 1500);
    });
  });

  notesList.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      const idx = parseInt(btn.dataset.index);
      await chrome.runtime.sendMessage({ type: 'DELETE_NOTE', index: idx });
      allNotes.splice(idx, 1);
      renderNotes(searchInput.value.trim().toLowerCase());
    });
  });

  statsEl.textContent = `${allNotes.length} note${allNotes.length !== 1 ? 's' : ''} saved`;
}

function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
