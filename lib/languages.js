export const LANGUAGES = [
  { code: 'es', nombre: 'Español', flag: '🇪🇸' },
  { code: 'en', nombre: 'English', flag: '🇺🇸' },
  { code: 'pt', nombre: 'Português', flag: '🇧🇷' },
  { code: 'fr', nombre: 'Français', flag: '🇫🇷' },
  { code: 'de', nombre: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', nombre: 'Italiano', flag: '🇮🇹' },
  { code: 'zh', nombre: '中文', flag: '🇨🇳' },
  { code: 'ja', nombre: '日本語', flag: '🇯🇵' },
  { code: 'ar', nombre: 'العربية', flag: '🇸🇦' },
]

export function getLanguageName(code) {
  return LANGUAGES.find(l => l.code === code)?.nombre || 'Español'
}

export function getLanguageInstruction(code, autoDetect) {
  const lang = LANGUAGES.find(l => l.code === code)
  const langName = lang?.nombre || 'Español'

  if (autoDetect) {
    return `IDIOMA: Detecta el idioma del usuario y responde SIEMPRE en ese mismo idioma. Si no puedes detectarlo, usa ${langName} por defecto.`
  }
  return `IDIOMA: Responde SIEMPRE en ${langName}, independientemente del idioma en que escriba el usuario.`
}

export const WIDGET_PLACEHOLDERS = {
  es: 'Escribe tu mensaje...',
  en: 'Type your message...',
  pt: 'Digite sua mensagem...',
  fr: 'Écrivez votre message...',
  de: 'Schreiben Sie Ihre Nachricht...',
  it: 'Scrivi il tuo messaggio...',
  zh: '输入您的消息...',
  ja: 'メッセージを入力...',
  ar: 'اكتب رسالتك...',
}
