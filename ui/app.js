// State Management
let selectedFile = null;
let currentTranscription = '';
let history = [];

// DOM Elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const fileName = document.getElementById('fileName');
const transcribeBtn = document.getElementById('transcribeBtn');
const loading = document.getElementById('loading');
const statusText = document.getElementById('statusText');
const errorDiv = document.getElementById('error');
const resultSection = document.getElementById('resultSection');
const transcription = document.getElementById('transcription');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  loadHistoryFromServer();
  setupEventListeners();
});

// Event Listeners Setup
function setupEventListeners() {
  // Tab Switching
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      
      tab.classList.add('active');
      const panelId = tab.dataset.panel;
      document.getElementById(panelId).classList.add('active');
    });
  });

  // Drag and Drop
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  // File Input Change
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });
  }

  // Enter key in AI Chat prompt
  const aiPrompt = document.getElementById('aiPrompt');
  if (aiPrompt) {
    aiPrompt.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendAIRequest();
      }
    });
  }

  // Transcribe Button Click
  if (transcribeBtn) {
    transcribeBtn.addEventListener('click', startTranscription);
  }
}

// Load history from Flask backend
async function loadHistoryFromServer() {
  try {
    const response = await fetch('/history');
    if (response.ok) {
      history = await response.json();
      renderHistory();
    }
  } catch (err) {
    console.error('Failed to load history:', err);
    showToast('⚠️ שגיאה בטעינת היסטוריה מהשרת');
  }
}

// Local File Handler
function handleFile(file) {
  selectedFile = file;
  if (fileName) fileName.textContent = file.name;
  if (fileInfo) fileInfo.classList.add('visible');
  if (transcribeBtn) transcribeBtn.disabled = false;
  if (errorDiv) errorDiv.classList.remove('visible');
  if (resultSection) resultSection.classList.remove('visible');

  // Populate default transcription name if empty
  const nameInput = document.getElementById('transcriptionName');
  if (nameInput && !nameInput.value) {
    nameInput.value = file.name.replace(/\.[^/.]+$/, '');
  }
}

// YouTube / Spotify URL Handler
async function handleUrlInput() {
  const urlInput = document.getElementById('urlInput');
  const urlError = document.getElementById('urlError');
  const urlBtn = document.getElementById('urlBtn');
  
  const url = urlInput.value.trim();

  if (!url) {
    urlError.textContent = 'אנא הזינו כתובת URL חוקית';
    urlError.classList.add('visible');
    return;
  }

  urlError.classList.remove('visible');
  urlBtn.disabled = true;
  const originalText = urlBtn.textContent;
  urlBtn.textContent = 'מחלץ אודיו...';

  try {
    // Validate domain
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be') && !hostname.includes('spotify.com')) {
      throw new Error('רק YouTube ו-Spotify נתמכים כרגע');
    }

    // Call extractor
    const response = await fetch('/extract-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `שגיאת שרת: ${response.status}`);
    }

    const data = await response.json(); // { url: "/audio/xxx.mp3", title: "...", size_mb: 12.3 }
    
    showToast('⬇️ מוריד קובץ אודיו לדפדפן...');

    // Fetch the audio file as binary Blob
    const audioRes = await fetch(data.url);
    if (!audioRes.ok) throw new Error('נכשל בהורדת קובץ האודיו מהשרת');
    
    const audioBlob = await audioRes.blob();
    const audioFile = new File([audioBlob], `${data.title}.mp3`, { type: 'audio/mp3' });

    // Clean up file on server immediately as we now have it in client memory
    fetch(data.url, { method: 'DELETE' }).catch(err => console.error('Failed to cleanup temp audio:', err));

    handleFile(audioFile);
    
    const nameInput = document.getElementById('transcriptionName');
    if (nameInput) nameInput.value = data.title || 'תמלול מ-URL';
    urlInput.value = '';
    
    showToast('✨ האודיו נטען בהצלחה!');
  } catch (err) {
    urlError.textContent = `❌ שגיאה: ${err.message}`;
    urlError.classList.add('visible');
  } finally {
    urlBtn.disabled = false;
    urlBtn.textContent = originalText;
  }
}

// Start Transcription Process
async function startTranscription() {
  if (!selectedFile) return;

  const language = document.getElementById('language').value;

  loading.classList.add('visible');
  transcribeBtn.disabled = true;
  errorDiv.classList.remove('visible');
  resultSection.classList.remove('visible');
  statusText.textContent = 'מעלה קובץ לשרת התמלול...';

  try {
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('language', language === 'auto' ? '' : language);
    formData.append('response_format', 'text');

    statusText.textContent = 'מתמלל... פעולה זו עשויה לקחת מספר דקות בהתאם לאורך הקובץ';

    const response = await fetch('/inference', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`שגיאת שרת תמלול: ${response.status}`);
    }

    const result = await response.text();
    currentTranscription = result.trim();
    
    if (!currentTranscription) {
      throw new Error('התמלול שהתקבל ריק. ייתכן שהקובץ אינו מכיל דיבור ברור.');
    }

    transcription.textContent = currentTranscription;
    resultSection.classList.add('visible');
    updateAIContext(currentTranscription);
    
    showToast('🎉 התמלול הושלם בהצלחה!');
    
    // Auto Scroll to Results
    resultSection.scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    errorDiv.textContent = `⚠️ שגיאה: ${err.message}`;
    errorDiv.classList.add('visible');
    showToast('❌ התמלול נכשל');
  } finally {
    loading.classList.remove('visible');
    transcribeBtn.disabled = false;
  }
}

// Copy Transcription to Clipboard
function copyResult() {
  if (!transcription.textContent) return;
  navigator.clipboard.writeText(transcription.textContent).then(() => {
    showToast('📋 הטקסט הועתק ללוח!');
  }).catch(err => {
    console.error('Clipboard error:', err);
    showToast('❌ שגיאה בהעתקה');
  });
}

// Fix Transcription using AI
async function fixTranscription() {
  if (!currentTranscription) {
    alert('אין תמלול זמין לתיקון');
    return;
  }

  let model = '';
  let url = '';

  model = document.getElementById('ollamaModel').value.trim() || 'sam860/jamba-reasoning:3b';
  url = '/ollama/chat/completions';

  loading.classList.add('visible');
  transcribeBtn.disabled = true;
  statusText.textContent = 'מריץ תיקון AI על התמלול...';

  try {
    const prompt = `תקן שגיאות כתיב, שגיאות הקלדה, מילים לא הגיוניות או סימני פיסוק חסרים בתמלול הבא בעברית.
שמור על המשמעות המקורית וסגנון הדיבור.
אל תוסיף הסברים, הקדמות או הערות - החזר אך ורק את הטקסט המתוקן בעברית.

הטקסט לתיקון:
${currentTranscription}`;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: 'אתה עורך לשוני ומתקן תמלולים בעברית מקצועי. החזר רק את הטקסט המתוקן ללא פטפוטים והערות.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 4000,
      temperature: 0.3
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`שגיאת תיקון AI: ${response.status}`);
    }

    const data = await response.json();
    const fixedText = data.choices[0].message.content.trim();
    
    currentTranscription = fixedText;
    transcription.textContent = fixedText;
    updateAIContext(fixedText);
    showToast('✨ התמלול תוקן ועודכן בהצלחה!');

  } catch (err) {
    console.error('Fix error:', err);
    showToast(`❌ שגיאה בתיקון: ${err.message}`);
  } finally {
    loading.classList.remove('visible');
    transcribeBtn.disabled = false;
  }
}

// Save Transcription to Server History
async function saveToHistory() {
  if (!currentTranscription) return;
  const name = document.getElementById('transcriptionName').value.trim() || 'תמלול ללא שם';
  
  try {
    const response = await fetch('/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, text: currentTranscription })
    });

    if (response.ok) {
      const savedItem = await response.json();
      history.unshift(savedItem);
      renderHistory();
      showToast('💾 נשמר בהיסטוריה!');
    } else {
      throw new Error('שגיאה בתגובת השרת');
    }
  } catch (err) {
    console.error('Save error:', err);
    showToast('❌ נכשל בשמירה להיסטוריה');
  }
}

// Render History Items
function renderHistory() {
  const list = document.getElementById('historyList');
  const emptyState = document.getElementById('emptyHistory');
  const clearBtn = document.getElementById('clearHistoryBtn');

  if (!list) return;

  if (history.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (clearBtn) clearBtn.style.display = 'none';
    list.innerHTML = '';
    if (emptyState) list.appendChild(emptyState);
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (clearBtn) clearBtn.style.display = 'inline-flex';

  list.innerHTML = history.map(item => {
    const formattedDate = new Date(item.date).toLocaleString('he-IL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="history-item">
        <div class="history-item-header">
          <span class="history-item-title">${escapeHtml(item.name)}</span>
          <span class="history-item-date">${formattedDate}</span>
        </div>
        <div class="history-item-text">${escapeHtml(item.text.substring(0, 220))}${item.text.length > 220 ? '...' : ''}</div>
        <div class="history-item-actions">
          <button class="btn btn-secondary btn-small" onclick="loadFromHistory(${item.id})">📖 פתח תמלול</button>
          <button class="btn btn-secondary btn-small" style="border-color: var(--secondary-accent); color: var(--secondary-accent);" onclick="sendHistoryToAI(${item.id})">🤖 ניתוח AI</button>
          <button class="btn btn-danger btn-small" onclick="deleteFromHistory(${item.id})">🗑️ מחק</button>
        </div>
      </div>
    `;
  }).join('');
}

// Open history item in main view
function loadFromHistory(id) {
  const item = history.find(h => h.id === id);
  if (item) {
    currentTranscription = item.text;
    transcription.textContent = item.text;
    resultSection.classList.add('visible');
    
    const nameInput = document.getElementById('transcriptionName');
    if (nameInput) nameInput.value = item.name;
    
    document.querySelector('[data-panel="transcribe"]').click();
    updateAIContext(item.text);
    showToast('📖 תמלול נטען מההיסטוריה');
  }
}

// Load history item into AI assistant directly
function sendHistoryToAI(id) {
  const item = history.find(h => h.id === id);
  if (item) {
    updateAIContext(item.text);
    document.querySelector('[data-panel="ai"]').click();
  }
}

// Delete single history item
async function deleteFromHistory(id) {
  if (!confirm('האם למחוק תמלול זה מההיסטוריה?')) return;

  try {
    const response = await fetch(`/history/${id}`, { method: 'DELETE' });
    if (response.ok) {
      history = history.filter(h => h.id !== id);
      renderHistory();
      showToast('🗑️ התמלול נמחק');
    } else {
      throw new Error('שגיאת שרת');
    }
  } catch (err) {
    console.error('Delete error:', err);
    showToast('❌ מחיקה נכשלה');
  }
}

// Clear all history
async function clearHistory() {
  if (!confirm('🚨 האם אתם בטוחים שברצונכם למחוק את כל ההיסטוריה? פעולה זו אינה הפיכה!')) return;

  try {
    const response = await fetch('/history', { method: 'DELETE' });
    if (response.ok) {
      history = [];
      renderHistory();
      showToast('🗑️ כל ההיסטוריה נמחקה');
    } else {
      throw new Error('שגיאת שרת');
    }
  } catch (err) {
    console.error('Clear history error:', err);
    showToast('❌ מחיקת ההיסטוריה נכשלה');
  }
}

// Export Text to local files
function exportAsTxt() {
  if (!currentTranscription) return;
  const name = document.getElementById('transcriptionName').value.trim() || 'transcription';
  const blob = new Blob([currentTranscription], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 קובץ TXT הורד!');
}

function exportAsJson() {
  if (!currentTranscription) return;
  const name = document.getElementById('transcriptionName').value.trim() || 'transcription';
  const exportData = {
    name: name,
    transcription: currentTranscription,
    date: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('💾 קובץ JSON הורד!');
}

// AI Panel Functions
function updateAIContext(text) {
  const contextElement = document.getElementById('aiContextText');
  if (contextElement) {
    contextElement.textContent = text || 'לא נבחר טקסט. תמללו קובץ או בחרו מההיסטוריה.';
  }
  const contextDiv = document.getElementById('aiContext');
  if (contextDiv) {
    contextDiv.dataset.fullText = text || '';
  }
}

function clearAIContext() {
  updateAIContext('');
  showToast('🧹 הקשר ה-AI נוקה');
}

function sendToAI() {
  updateAIContext(currentTranscription);
  document.querySelector('[data-panel="ai"]').click();
}

function setPreset(type) {
  const prompts = {
    summarize: 'סכם את הטקסט הבא בצורה תמציתית וברורה בעברית. חלק לפסקאות במידת הצורך:',
    bullets: 'חלץ את הנקודות העיקריות והנושאים המרכזיים מתוך הטקסט הבא כרשימה מסודרת של בולטים בעברית:',
    action: 'זהה וחלץ מתוך הטקסט הבא את כל משימות ההמשך, הפעולות הנדרשות ומי אחראי על כל משימה (אם מצוין):',
    translate: 'Translate the following Hebrew text into clear, natural English:',
    questions: 'ייצר 3 שאלות מפתח מתוך הטקסט הבא וספק את התשובות עליהן בהתבסס אך ורק על המידע המופיע בטקסט:'
  };
  const input = document.getElementById('aiPrompt');
  if (input) {
    input.value = prompts[type] || '';
    input.focus();
  }
}

function toggleProvider() {
  const ollamaFields = document.querySelectorAll('.ollama-field');
  ollamaFields.forEach(el => el.style.display = 'flex');
}
window.toggleProvider = toggleProvider;

async function sendAIRequest() {
  const promptInput = document.getElementById('aiPrompt');
  const prompt = promptInput.value.trim();
  const contextDiv = document.getElementById('aiContext');
  const contextText = contextDiv ? contextDiv.dataset.fullText : '';

  let model = '';
  let url = '';

  model = document.getElementById('ollamaModel').value.trim() || 'sam860/jamba-reasoning:3b';
  url = '/ollama/chat/completions';

  if (!prompt) {
    alert('אנא הזינו שאלה או בקשה ל-AI');
    return;
  }

  if (!contextText) {
    alert('לא זוהה הקשר (טקסט לתמלול). אנא תמללו קובץ או בחרו פריט מההיסטוריה תחילה.');
    return;
  }

  const aiLoading = document.getElementById('aiLoading');
  const aiResponse = document.getElementById('aiResponse');

  aiLoading.classList.add('visible');
  aiResponse.textContent = '';

  try {
    const fullPrompt = `${prompt}\n\n---\nטקסט מקור:\n${contextText}`;

    const requestBody = {
      model: model,
      messages: [
        { role: 'system', content: 'אתה עוזר AI מקצועי. ענה בעברית רהוטה, ברורה ומדויקת על פי ההקשר והטקסט שסופקו.' },
        { role: 'user', content: fullPrompt }
      ],
      max_tokens: 3000,
      temperature: 0.5
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 404) {
        throw new Error(`המודל "${model}" לא נמצא ב-Ollama. אנא הרץ: ollama run ${model}`);
      }
      throw new Error(`שגיאה ${response.status}: ${errorText.substring(0, 100) || 'שרת ה-AI לא זמין'}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('תגובה לא תקינה התקבלה משרת ה-AI');
    }

    const aiText = data.choices[0].message.content.trim();
    aiResponse.textContent = aiText;
    showToast('🤖 תגובת AI התקבלה!');

  } catch (err) {
    console.error('AI Request Error:', err);
    aiResponse.innerHTML = `<span style="color: var(--error);">❌ שגיאה: ${err.message}</span>`;
  } finally {
    aiLoading.classList.remove('visible');
  }
}

// Utility Functions
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Toast notification controller
function showToast(message) {
  let toast = document.getElementById('appToast');
  
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  // Clear previous timeouts if any
  if (toast.timeoutId) {
    clearTimeout(toast.timeoutId);
  }

  toast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}
