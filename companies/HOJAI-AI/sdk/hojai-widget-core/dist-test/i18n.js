/**
 * i18n strings for the HOJAI Widget.
 *
 * Each language has a complete UI string bundle. Languages not in the
 * bundle fall back to English.
 *
 * Add a new language by adding a key to LANGUAGES below.
 */
const EN = {
    inputPlaceholder: 'Type your message...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Open chat',
    typing: 'Typing...',
    errorGeneric: "Sorry, I'm having trouble right now. Please try again.",
    errorNetwork: 'Network error — please check your connection.',
    voiceNotSupported: 'Voice input not supported in this browser',
    voiceListening: 'Listening...',
    voiceStop: 'Stop',
    voiceError: 'Voice recognition error. Please try again.',
    greetingPrefix: "Hi! I'm"
};
const ES = {
    inputPlaceholder: 'Escribe tu mensaje...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Abrir chat',
    typing: 'Escribiendo...',
    errorGeneric: 'Lo siento, tengo problemas ahora. Por favor intenta de nuevo.',
    errorNetwork: 'Error de red — por favor verifica tu conexión.',
    voiceNotSupported: 'Entrada de voz no soportada en este navegador',
    voiceListening: 'Escuchando...',
    voiceStop: 'Detener',
    voiceError: 'Error de reconocimiento de voz. Por favor intenta de nuevo.',
    greetingPrefix: '¡Hola! Soy'
};
const FR = {
    inputPlaceholder: 'Tapez votre message...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Ouvrir le chat',
    typing: 'En train d\'écrire...',
    errorGeneric: "Désolé, j'ai un problème. Veuillez réessayer.",
    errorNetwork: 'Erreur réseau — veuillez vérifier votre connexion.',
    voiceNotSupported: 'Saisie vocale non prise en charge dans ce navigateur',
    voiceListening: 'À l\'écoute...',
    voiceStop: 'Arrêter',
    voiceError: 'Erreur de reconnaissance vocale. Veuillez réessayer.',
    greetingPrefix: 'Salut! Je suis'
};
const DE = {
    inputPlaceholder: 'Nachricht eingeben...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Chat öffnen',
    typing: 'Tippt...',
    errorGeneric: 'Entschuldigung, ich habe ein Problem. Bitte versuche es erneut.',
    errorNetwork: 'Netzwerkfehler — bitte überprüfe deine Verbindung.',
    voiceNotSupported: 'Spracheingabe wird in diesem Browser nicht unterstützt',
    voiceListening: 'Höre zu...',
    voiceStop: 'Stoppen',
    voiceError: 'Spracherkennungsfehler. Bitte versuche es erneut.',
    greetingPrefix: 'Hallo! Ich bin'
};
const IT = {
    inputPlaceholder: 'Scrivi il tuo messaggio...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Apri chat',
    typing: 'Sta scrivendo...',
    errorGeneric: 'Spiacente, ho un problema. Per favore riprova.',
    errorNetwork: 'Errore di rete — controlla la tua connessione.',
    voiceNotSupported: 'Input vocale non supportato in questo browser',
    voiceListening: 'In ascolto...',
    voiceStop: 'Ferma',
    voiceError: 'Errore riconoscimento vocale. Per favore riprova.',
    greetingPrefix: 'Ciao! Sono'
};
const PT = {
    inputPlaceholder: 'Digite sua mensagem...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Abrir chat',
    typing: 'Digitando...',
    errorGeneric: 'Desculpe, estou com problemas. Por favor tente novamente.',
    errorNetwork: 'Erro de rede — verifique sua conexão.',
    voiceNotSupported: 'Entrada de voz não suportada neste navegador',
    voiceListening: 'Ouvindo...',
    voiceStop: 'Parar',
    voiceError: 'Erro de reconhecimento de voz. Por favor tente novamente.',
    greetingPrefix: 'Olá! Eu sou'
};
const RU = {
    inputPlaceholder: 'Введите сообщение...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Открыть чат',
    typing: 'Печатает...',
    errorGeneric: 'Извините, у меня проблема. Пожалуйста, попробуйте снова.',
    errorNetwork: 'Ошибка сети — пожалуйста, проверьте подключение.',
    voiceNotSupported: 'Голосовой ввод не поддерживается в этом браузере',
    voiceListening: 'Слушает...',
    voiceStop: 'Остановить',
    voiceError: 'Ошибка распознавания речи. Пожалуйста, попробуйте снова.',
    greetingPrefix: 'Привет! Я'
};
const ZH = {
    inputPlaceholder: '输入消息...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: '打开聊天',
    typing: '正在输入...',
    errorGeneric: '抱歉,我遇到了问题。请重试。',
    errorNetwork: '网络错误 — 请检查您的连接。',
    voiceNotSupported: '此浏览器不支持语音输入',
    voiceListening: '正在听...',
    voiceStop: '停止',
    voiceError: '语音识别错误。请重试。',
    greetingPrefix: '你好!我是'
};
const ZH_TW = {
    inputPlaceholder: '輸入訊息...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: '開啟聊天',
    typing: '正在輸入...',
    errorGeneric: '抱歉,我遇到了問題。請重試。',
    errorNetwork: '網路錯誤 — 請檢查您的連線。',
    voiceNotSupported: '此瀏覽器不支援語音輸入',
    voiceListening: '正在聽...',
    voiceStop: '停止',
    voiceError: '語音辨識錯誤。請重試。',
    greetingPrefix: '你好!我是'
};
const JA = {
    inputPlaceholder: 'メッセージを入力...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'チャットを開く',
    typing: '入力中...',
    errorGeneric: '申し訳ありません、問題が発生しました。もう一度お試しください。',
    errorNetwork: 'ネットワークエラー — 接続を確認してください。',
    voiceNotSupported: 'このブラウザは音声入力をサポートしていません',
    voiceListening: '聞いています...',
    voiceStop: '停止',
    voiceError: '音声認識エラー。もう一度お試しください。',
    greetingPrefix: 'こんにちは!'
};
const KO = {
    inputPlaceholder: '메시지를 입력하세요...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: '채팅 열기',
    typing: '입력 중...',
    errorGeneric: '죄송합니다, 문제가 발생했습니다. 다시 시도해 주세요.',
    errorNetwork: '네트워크 오류 — 연결을 확인해 주세요.',
    voiceNotSupported: '이 브라우저에서는 음성 입력이 지원되지 않습니다',
    voiceListening: '듣는 중...',
    voiceStop: '중지',
    voiceError: '음성 인식 오류. 다시 시도해 주세요.',
    greetingPrefix: '안녕하세요!'
};
const HI = {
    inputPlaceholder: 'अपना संदेश लिखें...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'चैट खोलें',
    typing: 'टाइप कर रहा है...',
    errorGeneric: 'क्षमा करें, मुझे परेशानी हो रही है. कृपया पुनः प्रयास करें।',
    errorNetwork: 'नेटवर्क त्रुटि — कृपया अपना कनेक्शन जांचें।',
    voiceNotSupported: 'इस ब्राउज़र में वॉइस इनपुट समर्थित नहीं है',
    voiceListening: 'सुन रहा है...',
    voiceStop: 'रोकें',
    voiceError: 'वॉइस पहचान त्रुटि. कृपया पुनः प्रयास करें।',
    greetingPrefix: 'नमस्ते! मैं'
};
const AR = {
    inputPlaceholder: 'اكتب رسالتك...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'فتح الدردشة',
    typing: 'يكتب...',
    errorGeneric: 'آسف، أواجه مشكلة. حاول مرة أخرى.',
    errorNetwork: 'خطأ في الشبكة — يرجى التحقق من الاتصال.',
    voiceNotSupported: 'الإدخال الصوتي غير مدعوم في هذا المتصفح',
    voiceListening: 'استماع...',
    voiceStop: 'إيقاف',
    voiceError: 'خطأ في التعرف على الصوت. حاول مرة أخرى.',
    greetingPrefix: 'مرحبا! أنا'
};
const TR = {
    inputPlaceholder: 'Mesajınızı yazın...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Sohbeti aç',
    typing: 'Yazıyor...',
    errorGeneric: 'Üzgünüm, bir sorun var. Lütfen tekrar deneyin.',
    errorNetwork: 'Ağ hatası — lütfen bağlantınızı kontrol edin.',
    voiceNotSupported: 'Ses girişi bu tarayıcıda desteklenmiyor',
    voiceListening: 'Dinliyor...',
    voiceStop: 'Durdur',
    voiceError: 'Ses tanıma hatası. Lütfen tekrar deneyin.',
    greetingPrefix: 'Merhaba! Ben'
};
const TH = {
    inputPlaceholder: 'พิมพ์ข้อความของคุณ...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'เปิดแชท',
    typing: 'กำลังพิมพ์...',
    errorGeneric: 'ขออภัย มีปัญหาบางอย่าง กรุณาลองอีกครั้ง',
    errorNetwork: 'ข้อผิดพลาดเครือข่าย — กรุณาตรวจสอบการเชื่อมต่อ',
    voiceNotSupported: 'เบราว์เซอร์นี้ไม่รองรับการป้อนเสียง',
    voiceListening: 'กำลังฟัง...',
    voiceStop: 'หยุด',
    voiceError: 'ข้อผิดพลาดในการรู้จำเสียง กรุณาลองอีกครั้ง',
    greetingPrefix: 'สวัสดี! ฉัน'
};
const VI = {
    inputPlaceholder: 'Nhập tin nhắn của bạn...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Mở chat',
    typing: 'Đang nhập...',
    errorGeneric: 'Xin lỗi, tôi đang gặp sự cố. Vui lòng thử lại.',
    errorNetwork: 'Lỗi mạng — vui lòng kiểm tra kết nối.',
    voiceNotSupported: 'Trình duyệt này không hỗ trợ nhập giọng nói',
    voiceListening: 'Đang nghe...',
    voiceStop: 'Dừng',
    voiceError: 'Lỗi nhận dạng giọng nói. Vui lòng thử lại.',
    greetingPrefix: 'Xin chào! Tôi là'
};
const ID = {
    inputPlaceholder: 'Ketik pesan Anda...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Buka chat',
    typing: 'Mengetik...',
    errorGeneric: 'Maaf, saya mengalami masalah. Silakan coba lagi.',
    errorNetwork: 'Kesalahan jaringan — silakan periksa koneksi Anda.',
    voiceNotSupported: 'Input suara tidak didukung di browser ini',
    voiceListening: 'Mendengarkan...',
    voiceStop: 'Berhenti',
    voiceError: 'Kesalahan pengenalan suara. Silakan coba lagi.',
    greetingPrefix: 'Halo! Saya'
};
const MS = {
    inputPlaceholder: 'Taip mesej anda...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Buka chat',
    typing: ' Menaip...',
    errorGeneric: 'Maaf, saya menghadapi masalah. Sila cuba lagi.',
    errorNetwork: 'Ralat rangkaian — sila periksa sambungan anda.',
    voiceNotSupported: 'Input suara tidak disokong dalam pelayar ini',
    voiceListening: 'Mendengar...',
    voiceStop: 'Berhenti',
    voiceError: 'Ralat pengecaman suara. Sila cuba lagi.',
    greetingPrefix: 'Helo! Saya'
};
const TL = {
    inputPlaceholder: 'I-type ang iyong mensahe...',
    sendButton: '→',
    closeButton: '×',
    openAriaLabel: 'Buksan ang chat',
    typing: 'Nagtatype...',
    errorGeneric: 'Paumanhin, may problema ako. Subukan muli.',
    errorNetwork: 'Network error — suriin ang iyong koneksyon.',
    voiceNotSupported: 'Hindi suportado ang voice input sa browser na ito',
    voiceListening: 'Nakikinig...',
    voiceStop: 'Ihinto',
    voiceError: 'Error sa voice recognition. Subukan muli.',
    greetingPrefix: 'Kumusta! Ako'
};
export const LANGUAGES = {
    en: EN, es: ES, fr: FR, de: DE, it: IT, pt: PT, ru: RU,
    zh: ZH, 'zh-TW': ZH_TW, ja: JA, ko: KO,
    hi: HI, ar: AR, tr: TR, th: TH, vi: VI, id: ID, ms: MS, tl: TL
};
/**
 * Get UI strings for a language, falling back to English.
 */
export function getStrings(langCode) {
    const lang = langCode;
    return LANGUAGES[lang] || LANGUAGES.en;
}
/**
 * Apply i18n to a widget panel — sets placeholders, aria-labels, etc.
 */
export function applyI18n(rootEl, strings) {
    const input = rootEl.querySelector('.hojai-input');
    if (input)
        input.placeholder = strings.inputPlaceholder;
    const bubble = rootEl.querySelector('.hojai-bubble');
    if (bubble)
        bubble.setAttribute('aria-label', strings.openAriaLabel);
    const close = rootEl.querySelector('.hojai-close');
    if (close)
        close.setAttribute('aria-label', strings.closeButton);
}
