const editor = document.getElementById('editor');
const previewContent = document.getElementById('previewContent');
const copyContent = document.getElementById('copyContent');
const successMessage = document.getElementById('successMessage');
const toggleBtn = document.getElementById('toggleBtn');
const modeIndicator = document.getElementById('modeIndicator');
const quickInsert = document.getElementById('quickInsert');
const themeSelect = document.getElementById('themeSelect');

let isPreviewMode = false;
let currentTheme = 'default';
const THEME_ACCENTS = {
  default: '#0a84ff',
  apple: '#0a84ff',
  tech: '#2563eb',
  elegant: '#b8860b',
  fresh: '#10b981',
  warm: '#ea580c',
  lemon: '#ca8a04',
  minimalist: '#111111',
};

// 历史与光标位置
let history = [];
let redoStack = [];
let restoring = false;
let lastSaveTime = 0;
const HISTORY_LIMIT = 100;
let savedCursorPos = 0;
let savedScrollPos = 0;

// 计算字数（排除标点和空白）：仅统计字母与数字（含汉字）
function countTextChars(text) {
  try {
    const matches = text.match(/[\p{L}\p{N}]/gu);
    return matches ? matches.length : 0;
  } catch (e) {
    // 若不支持 Unicode 属性，使用降级方案：移除空白与常见中英文标点符号
    const stripped = (text || '').replace(/[\s\u2000-\u206F\u2E00-\u2E7F\u3000-\u303F\uFF00-\uFF65\uFE10-\uFE1F\uFE30-\uFE4F\uFE50-\uFE6F\u2010-\u201F\u2026\u2E3A\u2E3B!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, '');
    return stripped.length;
  }
}

// 配置 marked 选项
if (typeof marked !== 'undefined') {
  marked.setOptions({ breaks: true, gfm: true });
}

// 预览渲染
function renderPreview() {
  if (typeof marked === 'undefined') {
    previewContent.innerHTML = '<p>正在加载 Markdown 解析器...</p>';
    return;
  }
  const markdownText = editor.value;
  const htmlContent = marked.parse(markdownText);
  previewContent.innerHTML = htmlContent;
  previewContent.className = `preview-content theme-${currentTheme} ${isPreviewMode ? 'show' : ''}`;
}

// 切换编辑/预览
function toggleMode(options = {}) {
  const suppressFocus = !!options.suppressFocus;
  const pageX = window.scrollX;
  const pageY = window.scrollY || window.pageYOffset;
  const prevEditorScroll = editor.scrollTop;
  const prevPreviewScroll = previewContent.scrollTop;

  isPreviewMode = !isPreviewMode;
  if (isPreviewMode) {
    savedCursorPos = editor.selectionStart;
    savedScrollPos = editor.scrollTop;
    editor.classList.add('hidden');
    quickInsert.style.display = 'none';
    modeIndicator.classList.add('show');
    // 更新模式提示与字数
    try { modeIndicator.textContent = `预览模式 · 字数：${countTextChars(editor.value)}`; } catch(e) { modeIndicator.textContent = '预览模式'; }
    toggleBtn.textContent = '✏️ 返回编辑';
    renderPreview();
  } else {
    editor.classList.remove('hidden');
    previewContent.classList.remove('show');
    quickInsert.style.display = 'flex';
    modeIndicator.classList.remove('show');
    // 恢复文案
    try { modeIndicator.textContent = '预览模式'; } catch(e) {}
    toggleBtn.textContent = '👀 预览效果';
    setTimeout(() => {
      if (!suppressFocus) {
        try { editor.focus(); } catch(e) {}
      }
      try { editor.setSelectionRange(savedCursorPos, savedCursorPos); } catch(e) {}
      editor.scrollTop = savedScrollPos;
      // 恢复先前页面与容器滚动位置
      previewContent.scrollTop = prevPreviewScroll;
      try { window.scrollTo(pageX, pageY); } catch(e) {}
    }, 10);
  }
}

// 切换主题
function changeTheme(theme) {
  currentTheme = theme;
  previewContent.className = `preview-content theme-${theme} ${isPreviewMode ? 'show' : ''}`;
  try {
    const color = THEME_ACCENTS[theme] || '#0a84ff';
    document.documentElement.style.setProperty('--accent', color);
  } catch (e) {}
  if (isPreviewMode) renderPreview();
}

// 统一的滚动位置保护
function withPreservedScroll(fn) {
  const pageX = window.scrollX;
  const pageY = window.scrollY || window.pageYOffset;
  const edScroll = editor.scrollTop;
  const pvScroll = previewContent.scrollTop;
  const result = fn();
  // 恢复滚动
  editor.scrollTop = edScroll;
  previewContent.scrollTop = pvScroll;
  try { window.scrollTo(pageX, pageY); } catch(e) {}
  return result;
}

// 插入文本（原始）
function insertText(text) {
  return withPreservedScroll(() => {
    if (isPreviewMode) toggleMode({ suppressFocus: true });
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const value = editor.value;
    const before = value.substring(0, start);
    const after = value.substring(end);
    editor.value = before + text + after;
    const newCursorPos = start + text.length;
    try { editor.setSelectionRange(newCursorPos, newCursorPos); } catch(e) {}
    saveHistory();
  });
}

// 行前缀：对选中文本的每一行添加前缀；若未选中则对当前行添加
function prefixSelection(prefix) {
  return withPreservedScroll(() => {
    if (isPreviewMode) toggleMode({ suppressFocus: true });
    const value = editor.value;
    let selStart = editor.selectionStart;
    let selEnd = editor.selectionEnd;

    // 扩展到整行
    const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selEnd);
    if (lineEnd === -1) lineEnd = value.length;

    const before = value.slice(0, lineStart);
    const target = value.slice(lineStart, lineEnd);
    const after = value.slice(lineEnd);

    const lines = target.split('\n');
    const prefixed = lines.map(l => prefix + l).join('\n');

    const newValue = before + prefixed + after;
    editor.value = newValue;

    // 调整选择范围，尽量覆盖原有区域（含新增前缀）
    const addedPerLine = prefix.length;
    const lineCount = lines.length;
    const newSelStart = selStart + addedPerLine;
    const newSelEnd = selEnd + (addedPerLine * lineCount);
    try { editor.setSelectionRange(newSelStart, newSelEnd); } catch(e) {}
    saveHistory();
  });
}

// 内联包裹：对选中文本用 before/after 包裹；若未选中则插入占位
function applyInline(beforeMark, afterMark, placeholder = '') {
  return withPreservedScroll(() => {
    if (isPreviewMode) toggleMode({ suppressFocus: true });
    const value = editor.value;
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const hasSelection = start !== end;
    const before = value.slice(0, start);
    const selected = value.slice(start, end);
    const after = value.slice(end);

    if (hasSelection) {
      const wrapped = beforeMark + selected + afterMark;
      editor.value = before + wrapped + after;
      // 选中被包裹内容（不含标记）
      const newStart = start + beforeMark.length;
      const newEnd = newStart + selected.length;
      try { editor.setSelectionRange(newStart, newEnd); } catch(e) {}
    } else {
      const content = beforeMark + (placeholder || '') + afterMark;
      editor.value = before + content + after;
      // 光标置于两标记之间
      const caretPos = start + beforeMark.length;
      const caretEnd = caretPos + (placeholder || '').length;
      try { editor.setSelectionRange(caretPos, caretEnd); } catch(e) {}
    }
    saveHistory();
  });
}

// 标题应用：对选中每行添加 # 前缀
function applyHeading(level) {
  const hashes = '#'.repeat(Math.max(1, Math.min(6, level))) + ' ';
  return prefixSelection(hashes);
}

// 复制为带样式 HTML
function copyToClipboard() {
  if (typeof marked === 'undefined') {
    alert('Markdown 解析器未加载完成，请稍候再试');
    return;
  }
  const markdownText = editor.value;
  const htmlContent = marked.parse(markdownText);
  const styledHtml = `<div class="theme-${currentTheme}" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei UI', 'Microsoft YaHei', Arial, sans-serif; line-height: 1.8; color: #1d1d1f; background:#ffffff;">${htmlContent}</div>`;
  copyContent.innerHTML = styledHtml;
  const range = document.createRange();
  range.selectNode(copyContent);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    document.execCommand('copy');
    showSuccessMessage();
  } catch (err) {
    alert('复制失败，请手动复制内容');
  }
  selection.removeAllRanges();
}

function showSuccessMessage() {
  successMessage.classList.add('show');
  setTimeout(() => successMessage.classList.remove('show'), 2500);
}

// 清空
function clearEditor() {
  if (confirm('确定要清空所有内容吗？')) {
    editor.value = '';
    editor.focus();
    if (isPreviewMode) renderPreview();
    saveHistory();
  }
}

// 输入监听：历史记录 + 实时预览
editor.addEventListener('input', () => {
  saveHistory();
  if (isPreviewMode) {
    // 实时更新预览与字数
    try { modeIndicator.textContent = `预览模式 · 字数：${countTextChars(editor.value)}`; } catch(e) {}
    renderPreview();
  }
});

// 快捷键：B/ I / Enter 预览
editor.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
    e.preventDefault();
    applyInline('**','**','粗体');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
    e.preventDefault();
    applyInline('*','*','斜体');
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    toggleMode();
  }
});

// 初始化渲染与历史首帧
if (typeof marked !== 'undefined') renderPreview();
setTimeout(() => {
  saveHistory();
  // 初始化强调色
  try { document.documentElement.style.setProperty('--accent', THEME_ACCENTS[currentTheme] || '#0a84ff'); } catch(e) {}
}, 0);

// 回到顶部
const backToTopBtn = document.getElementById('backToTop');
editor.addEventListener('scroll', () => {
  if (editor.scrollTop > 200) {
    backToTopBtn.classList.add('show');
    backToTopBtn.style.pointerEvents = 'auto';
  } else {
    backToTopBtn.classList.remove('show');
    backToTopBtn.style.pointerEvents = 'none';
  }
});
window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopBtn.classList.add('show');
    backToTopBtn.style.pointerEvents = 'auto';
  } else if (editor.scrollTop <= 200 && window.pageYOffset <= 300) {
    backToTopBtn.classList.remove('show');
    backToTopBtn.style.pointerEvents = 'none';
  }
});
previewContent.addEventListener('scroll', () => {
  if (previewContent.scrollTop > 200) {
    backToTopBtn.classList.add('show');
    backToTopBtn.style.pointerEvents = 'auto';
  } else {
    backToTopBtn.classList.remove('show');
    backToTopBtn.style.pointerEvents = 'none';
  }
});
function scrollToTop() {
  if (isPreviewMode) {
    previewContent.scrollTo({ top: 0, behavior: 'smooth' });
  } else {
    editor.scrollTo({ top: 0, behavior: 'smooth' });
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// 触摸设备支持（轻量）
let touchStartY = 0;
let touchEndY = 0;
document.addEventListener('touchstart', (e) => {
  touchStartY = e.changedTouches[0].screenY;
});
document.addEventListener('touchend', (e) => {
  touchEndY = e.changedTouches[0].screenY;
  if (touchEndY < touchStartY - 50 && (window.pageYOffset > 300 || editor.scrollTop > 200)) {
    backToTopBtn.classList.add('show');
  }
});

// 撤销
function saveHistory() {
  if (restoring) return;
  const now = Date.now();
  if (history.length === 0 || now - lastSaveTime > 350) {
    history.push({
      value: editor.value,
      selStart: editor.selectionStart,
      selEnd: editor.selectionEnd,
      scroll: editor.scrollTop
    });
    if (history.length > HISTORY_LIMIT) history.shift();
    lastSaveTime = now;
    redoStack.length = 0;
  }
}
function applyState(state) {
  restoring = true;
  editor.value = state.value;
  editor.focus();
  try { editor.setSelectionRange(state.selStart ?? editor.value.length, state.selEnd ?? editor.value.length); } catch(e) {}
  editor.scrollTop = state.scroll ?? 0;
  restoring = false;
}
function undoEdit() {
  if (history.length <= 1) return;
  redoStack.push({ value: editor.value, selStart: editor.selectionStart, selEnd: editor.selectionEnd, scroll: editor.scrollTop });
  history.pop();
  const prev = history[history.length - 1];
  if (prev) {
    applyState(prev);
    if (isPreviewMode) renderPreview();
  }
}

