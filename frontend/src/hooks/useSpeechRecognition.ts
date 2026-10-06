import { useState, useRef, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string, isFinal: boolean) => void;
  lang?: string;
}

export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const manualStopRef = useRef(false);
  const accumulatedTextRef = useRef('');
  const currentSessionTextRef = useRef('');
  const callbackRef = useRef<((text: string) => void) | undefined>(undefined);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const isSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    isListeningRef.current = false;
    setIsListening(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignored
      }
    }
  }, []);

  const createRecognitionInstance = useCallback(() => {
    if (!isSupported) return null;

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    // continuous = true ensures speech recognition keeps listening across pauses
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = optionsRef.current.lang || 'es-419';

    recognition.onstart = () => {
      setIsListening(true);
      isListeningRef.current = true;
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let sessionTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        sessionTranscript += event.results[i][0].transcript;
      }
      currentSessionTextRef.current = sessionTranscript;

      const base = accumulatedTextRef.current.trim();
      const full = base
        ? `${base} ${sessionTranscript.trim()}`.trim()
        : sessionTranscript.trim();

      const lastResult = event.results[event.results.length - 1];
      const isFinal = lastResult ? lastResult.isFinal : false;

      if (callbackRef.current) {
        callbackRef.current(full);
      } else if (optionsRef.current.onResult) {
        optionsRef.current.onResult(full, isFinal);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('[useSpeechRecognition] Error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permiso de micrófono denegado. Permite el micrófono en tu navegador.');
        manualStopRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        // Normal silence pauses or explicit abort: keep listening state active
      } else {
        setError(`Error de micrófono: ${event.error}`);
        manualStopRef.current = true;
        isListeningRef.current = false;
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If user did NOT manually stop and we are supposed to be listening,
      // save accumulated text and seamlessly restart so brief browser silence timeouts do not cut off the user.
      if (!manualStopRef.current && isListeningRef.current) {
        if (currentSessionTextRef.current.trim()) {
          const base = accumulatedTextRef.current.trim();
          accumulatedTextRef.current = base
            ? `${base} ${currentSessionTextRef.current.trim()}`.trim()
            : currentSessionTextRef.current.trim();
          currentSessionTextRef.current = '';
        }

        try {
          recognition.start();
          return;
        } catch {
          // If restart fails immediately, safely set listening to false
        }
      }

      setIsListening(false);
      isListeningRef.current = false;
    };

    return recognition;
  }, [isSupported]);

  const startListening = useCallback(
    (onResultCallback?: (text: string) => void) => {
      if (!isSupported) {
        setError('Tu navegador no soporta reconocimiento de voz. Usa Chrome, Edge o Safari.');
        return;
      }

      callbackRef.current = onResultCallback;
      manualStopRef.current = false;
      isListeningRef.current = true;
      accumulatedTextRef.current = '';
      currentSessionTextRef.current = '';

      try {
        if (recognitionRef.current) {
          recognitionRef.current.abort();
        }

        const recognition = createRecognitionInstance();
        if (recognition) {
          recognitionRef.current = recognition;
          recognition.start();
          setIsListening(true);
        }
      } catch (err: any) {
        console.error('[useSpeechRecognition] start error:', err);
        setError('No se pudo iniciar el micrófono');
        setIsListening(false);
        isListeningRef.current = false;
      }
    },
    [isSupported, createRecognitionInstance]
  );

  const toggleListening = useCallback(
    (onResultCallback?: (text: string) => void) => {
      if (isListeningRef.current || isListening) {
        stopListening();
      } else {
        startListening(onResultCallback);
      }
    },
    [isListening, startListening, stopListening]
  );

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      isListeningRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // Cleanup
        }
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
