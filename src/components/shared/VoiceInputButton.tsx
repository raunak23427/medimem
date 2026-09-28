import { useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { isVoiceSupported, startVoice, type VoiceController } from '../../lib/voice';

interface Props {
  onTranscript: (text: string) => void;
  className?: string;
  title?: string;
}

export default function VoiceInputButton({ onTranscript, className = '', title }: Props) {
  const [listening, setListening] = useState(false);
  const [controller, setController] = useState<VoiceController | null>(null);

  if (!isVoiceSupported()) return null;

  const toggle = () => {
    if (listening && controller) {
      controller.stop();
      setListening(false);
      return;
    }
    const ctrl = startVoice({
      onTranscript: (text, isFinal) => {
        if (isFinal) {
          onTranscript(text);
          setListening(false);
        }
      },
      onError: () => setListening(false),
      onEnd: () => setListening(false),
    });
    if (ctrl) {
      setController(ctrl);
      setListening(true);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      title={title || (listening ? 'Stop voice input' : 'Voice input')}
      className={`p-2 rounded-lg transition-colors ${
        listening
          ? 'bg-red-100 text-red-600 animate-pulse'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      } ${className}`}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} />}
    </button>
  );
}
