// Thin wrapper around the browser Web Speech API. Returns null on browsers
// without support so the UI can hide the mic button gracefully.

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>; resultIndex: number }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

interface WindowWithSpeech extends Window {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
}

export function isVoiceSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as WindowWithSpeech;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export interface VoiceController {
  start: () => void;
  stop: () => void;
}

export function startVoice(opts: {
  lang?: string;
  onTranscript: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  onEnd?: () => void;
}): VoiceController | null {
  if (!isVoiceSupported()) return null;
  const w = window as WindowWithSpeech;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition)!;
  const rec = new Ctor();
  rec.lang = opts.lang ?? (localStorage.getItem('medimem.lang') || 'en-IN');
  rec.interimResults = true;
  rec.continuous = false;
  rec.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i][0];
      if (e.results[i] && (e.results[i] as unknown as { isFinal: boolean }).isFinal) {
        final += r.transcript;
      } else {
        interim += r.transcript;
      }
    }
    if (final) opts.onTranscript(final, true);
    else if (interim) opts.onTranscript(interim, false);
  };
  rec.onerror = (e) => opts.onError?.(e.error || 'unknown');
  rec.onend = () => opts.onEnd?.();
  rec.start();
  return {
    start: () => { try { rec.start(); } catch { /* ignore restart */ } },
    stop: () => { try { rec.stop(); } catch { /* ignore */ } },
  };
}
