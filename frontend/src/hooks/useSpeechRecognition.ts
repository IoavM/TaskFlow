import { useState, useRef, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
      setIsListening(false);
    }
  }, []);

  const startListening = useCallback(
    (onResultCallback?: (text: string) => void) => {
      if (!isSupported) {
        setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.');
        return;
      }

      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const SpeechRecognitionClass =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognitionClass();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = options.lang || 'es-419';

        recognition.onstart = () => {
          setIsListening(true);
          setError(null);
        };

        recognition.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }

          if (onResultCallback) {
            onResultCallback(currentTranscript);
          } else if (options.onResult) {
            options.onResult(currentTranscript, event.results[event.results.length - 1].isFinal);
          }
        };

        recognition.onerror = (event: any) => {
          console.warn('[useSpeechRecognition] Error:', event.error);
          if (event.error === 'not-allowed') {
            setError('Permiso de micrófono denegado. Permite el micrófono en tu navegador.');
          } else if (event.error !== 'no-speech') {
            setError(`Error de micrófono: ${event.error}`);
          }
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        recognition.start();
      } catch (err: any) {
        console.error('[useSpeechRecognition] start error:', err);
        setError('No se pudo iniciar el micrófono');
        setIsListening(false);
      }
    },
    [isSupported, options]
  );

  const toggleListening = useCallback(
    (onResultCallback?: (text: string) => void) => {
      if (isListening) {
        stopListening();
      } else {
        startListening(onResultCallback);
      }
    },
    [isListening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    error,
    startListening,
    stopListening,
    toggleListening,
  };
};
