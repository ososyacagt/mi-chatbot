(function() {
  'use strict';

  const scriptTag = document.currentScript;
  if (!scriptTag) {
    console.error('[ChatWidget] No se pudo obtener el script tag');
    return;
  }

  const scriptSrc = document.currentScript.src;
  const clientId = new URL(scriptSrc).searchParams.get('client');
  if (!clientId) {
    console.error('[ChatWidget] No se especificó el parámetro client');
    return;
  }

  // Detectar URL base automáticamente
  const APP_URL = scriptSrc.startsWith('http://localhost')
    ? 'http://localhost:3000'
    : new URL(scriptSrc).origin;
  let tenant = null;
  let messages = [];
  let sessionId = null;
  let isOpen = false;
  let isLoading = false;

  // Leer sessionId del sessionStorage
  function initSessionId() {
    const storageKey = `wchat_session_${clientId}`;
    sessionId = sessionStorage.getItem(storageKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(storageKey, sessionId);
    }
  }

  // Placeholders por idioma
  const WIDGET_PLACEHOLDERS = {
    es: 'Escribe tu mensaje...',
    en: 'Type your message...',
    pt: 'Digite sua mensagem...',
    fr: 'Écrivez votre message...',
    de: 'Schreiben Sie Ihre Nachricht...',
    it: 'Scrivi il tuo messaggio...',
    zh: '输入您的消息...',
    ja: 'メッセージを入力...',
    ar: 'اكتب رسالتك...',
  };

  // Cargar configuración del cliente
  async function loadTenant() {
    try {
      const res = await fetch(`${APP_URL}/api/tenants/${clientId}`);
      if (!res.ok) throw new Error('Cliente no encontrado');
      const data = await res.json();
      tenant = data.tenant;
      return true;
    } catch (err) {
      console.error('[ChatWidget] Error cargando cliente:', err);
      return false;
    }
  }

  // Obtener placeholder en el idioma correcto
  function getPlaceholder() {
    const lang = tenant?.defaultLanguage || 'es';
    return WIDGET_PLACEHOLDERS[lang] || WIDGET_PLACEHOLDERS.es;
  }

  // Aplicar tema visual del widget
  function applyTheme() {
    const theme = tenant?.theme || 'auto';
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let shouldBeDark = false;

    if (theme === 'dark') {
      shouldBeDark = true;
    } else if (theme === 'light') {
      shouldBeDark = false;
    } else if (theme === 'auto') {
      shouldBeDark = isDarkMode;
    }

    // Agregar o remover clase al body para aplicar estilos oscuros
    if (shouldBeDark) {
      document.documentElement.classList.add('wchat-dark');
    } else {
      document.documentElement.classList.remove('wchat-dark');
    }
  }

  // Inyectar CSS en el head
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .wchat-button {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        transition: transform 0.2s, box-shadow 0.2s;
        z-index: 10000;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        background-color: var(--wchat-color);
      }

      .wchat-button:hover {
        transform: scale(1.1);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
      }

      .wchat-button:active {
        transform: scale(0.95);
      }

      .wchat-button svg {
        width: 28px;
        height: 28px;
        fill: white;
      }

      .wchat-panel {
        position: fixed;
        bottom: 96px;
        right: 24px;
        width: 380px;
        height: 560px;
        border-radius: 16px;
        background: white;
        box-shadow: 0 5px 40px rgba(0, 0, 0, 0.16);
        display: none;
        flex-direction: column;
        z-index: 10001;
        font-family: system-ui, -apple-system, sans-serif;
        overflow: hidden;
      }

      .wchat-panel.open {
        display: flex;
      }

      .wchat-panel-header {
        background-color: var(--wchat-color);
        color: white;
        padding: 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-radius: 16px 16px 0 0;
        flex-shrink: 0;
      }

      .wchat-panel-header-info {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .wchat-panel-header-info h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
      }

      .wchat-panel-header-info .wchat-status {
        width: 8px;
        height: 8px;
        background: #22c55e;
        border-radius: 50%;
        animation: wchat-pulse 2s infinite;
      }

      @keyframes wchat-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }

      .wchat-panel-header-close {
        background: none;
        border: none;
        color: white;
        font-size: 20px;
        cursor: pointer;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wchat-panel-header-close:hover {
        opacity: 0.8;
      }

      .wchat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .wchat-message {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .wchat-message.user {
        justify-content: flex-end;
      }

      .wchat-message-content {
        max-width: 70%;
        padding: 10px 12px;
        border-radius: 12px;
        font-size: 14px;
        line-height: 1.4;
        word-wrap: break-word;
      }

      .wchat-message.user .wchat-message-content {
        background-color: var(--wchat-color);
        color: white;
        border-bottom-right-radius: 4px;
      }

      .wchat-message.assistant .wchat-message-content {
        background-color: #f3f4f6;
        color: #1f2937;
        border-bottom-left-radius: 4px;
      }

      /* Tema oscuro */
      .wchat-dark .wchat-panel {
        background-color: #1f2937;
        color: #f3f4f6;
      }

      .wchat-dark .wchat-panel-header {
        background-color: var(--wchat-color);
      }

      .wchat-dark .wchat-messages {
        background-color: #1f2937;
      }

      .wchat-dark .wchat-message.assistant .wchat-message-content {
        background-color: #374151;
        color: #f3f4f6;
      }

      .wchat-dark .wchat-typing {
        background-color: #374151;
      }

      .wchat-dark .wchat-input-area {
        background-color: #1f2937;
        border-top-color: #374151;
      }

      .wchat-dark .wchat-textarea {
        background-color: #374151;
        color: #f3f4f6;
        border-color: #4b5563;
      }

      .wchat-dark .wchat-textarea:focus {
        border-color: var(--wchat-color);
      }

      .wchat-dark .wchat-error {
        background-color: #7f1d1d;
        color: #fecaca;
      }

      .wchat-typing {
        display: flex;
        gap: 4px;
        padding: 10px 12px;
        background-color: #f3f4f6;
        border-radius: 12px;
        border-bottom-left-radius: 4px;
        width: fit-content;
      }

      .wchat-typing span {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background-color: #9ca3af;
        animation: wchat-bounce 1.4s infinite;
      }

      .wchat-typing span:nth-child(1) { animation-delay: 0s; }
      .wchat-typing span:nth-child(2) { animation-delay: 0.2s; }
      .wchat-typing span:nth-child(3) { animation-delay: 0.4s; }

      @keyframes wchat-bounce {
        0%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(-8px); }
      }

      .wchat-input-area {
        display: flex;
        gap: 8px;
        padding: 12px;
        border-top: 1px solid #e5e7eb;
        flex-shrink: 0;
      }

      .wchat-textarea {
        flex: 1;
        padding: 8px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        resize: none;
        max-height: 100px;
      }

      .wchat-textarea:focus {
        outline: none;
        border-color: var(--wchat-color);
      }

      .wchat-send-btn {
        background-color: var(--wchat-color);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        transition: opacity 0.2s;
        flex-shrink: 0;
      }

      .wchat-send-btn:hover:not(:disabled) {
        opacity: 0.9;
      }

      .wchat-send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .wchat-error {
        background-color: #fee2e2;
        color: #991b1b;
        padding: 10px 12px;
        border-radius: 8px;
        font-size: 13px;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .wchat-button {
          bottom: 16px;
          right: 16px;
        }

        .wchat-panel {
          bottom: 80px;
          right: 16px;
          width: calc(100vw - 32px);
          height: calc(100vh - 160px);
          max-height: 500px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Crear HTML del widget
  function createWidget() {
    // Botón flotante
    const button = document.createElement('button');
    button.className = 'wchat-button';
    button.setAttribute('aria-label', 'Chat');
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
      </svg>
    `;

    // Panel
    const panel = document.createElement('div');
    panel.className = 'wchat-panel';

    const header = document.createElement('div');
    header.className = 'wchat-panel-header';
    header.innerHTML = `
      <div class="wchat-panel-header-info">
        <h3>${tenant?.nombre || 'Chat'}</h3>
        <div class="wchat-status"></div>
      </div>
      <button class="wchat-panel-header-close" aria-label="Cerrar">×</button>
    `;

    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'wchat-messages';

    const inputArea = document.createElement('div');
    inputArea.className = 'wchat-input-area';
    const textarea = document.createElement('textarea');
    textarea.className = 'wchat-textarea';
    textarea.placeholder = getPlaceholder();
    textarea.rows = 1;

    const sendBtn = document.createElement('button');
    sendBtn.className = 'wchat-send-btn';
    sendBtn.innerHTML = '→';
    sendBtn.type = 'button';

    inputArea.appendChild(textarea);
    inputArea.appendChild(sendBtn);

    panel.appendChild(header);
    panel.appendChild(messagesContainer);
    panel.appendChild(inputArea);

    // Agregar al documento
    document.body.appendChild(button);
    document.body.appendChild(panel);

    // Event listeners
    button.addEventListener('click', togglePanel);
    header.querySelector('.wchat-panel-header-close').addEventListener('click', closePanel);
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    sendBtn.addEventListener('click', sendMessage);

    return { button, panel, messagesContainer, textarea, sendBtn };
  }

  // UI elements
  let ui = null;

  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  function openPanel() {
    if (!ui) return;
    isOpen = true;
    ui.panel.classList.add('open');
    ui.textarea.focus();

    // Agregar mensaje de bienvenida si es la primera vez
    if (messages.length === 0) {
      addMessage('assistant', tenant?.welcomeMessage || 'Hola, ¿cómo puedo ayudarte?');
    }

    // Scroll al último mensaje
    setTimeout(() => {
      ui.messagesContainer.scrollTop = ui.messagesContainer.scrollHeight;
    }, 0);
  }

  function closePanel() {
    if (!ui) return;
    isOpen = false;
    ui.panel.classList.remove('open');
  }

  function addMessage(role, content) {
    messages.push({ role, content });

    const messageEl = document.createElement('div');
    messageEl.className = `wchat-message ${role}`;

    const contentEl = document.createElement('div');
    contentEl.className = 'wchat-message-content';
    contentEl.textContent = content;

    messageEl.appendChild(contentEl);
    ui.messagesContainer.appendChild(messageEl);

    ui.messagesContainer.scrollTop = ui.messagesContainer.scrollHeight;
  }

  function showTyping() {
    const typingEl = document.createElement('div');
    typingEl.className = 'wchat-message assistant';
    typingEl.innerHTML = '<div class="wchat-typing"><span></span><span></span><span></span></div>';
    typingEl.id = 'wchat-typing';
    ui.messagesContainer.appendChild(typingEl);
    ui.messagesContainer.scrollTop = ui.messagesContainer.scrollHeight;
  }

  function removeTyping() {
    const typing = ui.messagesContainer.querySelector('#wchat-typing');
    if (typing) typing.remove();
  }

  function showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'wchat-error';
    errorEl.textContent = message;
    ui.messagesContainer.appendChild(errorEl);
    ui.messagesContainer.scrollTop = ui.messagesContainer.scrollHeight;
  }

  async function sendMessage() {
    const text = ui.textarea.value.trim();
    if (!text || isLoading) return;

    addMessage('user', text);
    ui.textarea.value = '';
    ui.textarea.style.height = 'auto';
    isLoading = true;
    ui.sendBtn.disabled = true;

    showTyping();

    try {
      const response = await fetch(`${APP_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.filter(m => m.role === 'user' || m.role === 'assistant').map(({ role, content }) => ({ role, content })),
          clientId,
          sessionId
        })
      });

      if (!response.ok) throw new Error('Error en la respuesta');
      const data = await response.json();

      removeTyping();
      addMessage('assistant', data.reply);
    } catch (err) {
      removeTyping();
      showError('Error al enviar mensaje. Intenta nuevamente.');
      console.error('[ChatWidget] Error:', err);
    } finally {
      isLoading = false;
      ui.sendBtn.disabled = false;
      ui.textarea.focus();
    }
  }

  // Inicializar
  async function init() {
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initSessionId();
    const loaded = await loadTenant();
    if (!loaded) return;

    injectStyles();
    ui = createWidget();

    // Establecer color CSS variable
    document.documentElement.style.setProperty('--wchat-color', tenant.colorPrimary);

    // Aplicar tema visual
    applyTheme();
  }

  init();
})();
