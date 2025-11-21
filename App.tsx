import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, decodeBase64, encodeBase64, float32ToPCM16 } from './utils/audioUtils';
import { ConnectionStatus, Message, Language } from './types';
import { getSystemInstruction, UI_TEXT } from './constants';
import AudioVisualizer from './components/AudioVisualizer';
import KnowledgePanel from './components/KnowledgePanel';

// Constants for Audio
const OUTPUT_SAMPLE_RATE = 24000;

function App() {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [volume, setVolume] = useState(0); // Mock volume for visualizer
  const [language, setLanguage] = useState<Language>('en');

  // Refs for cleanup and audio handling
  const sessionRef = useRef<Promise<any> | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const cleanup = useCallback(() => {
    if (sessionRef.current) {
       sessionRef.current.then(s => {
           try { s.close(); } catch(e) { console.warn("Session close error", e); }
       });
       sessionRef.current = null;
    }
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    nextStartTimeRef.current = 0;
    setVolume(0);
  }, []);

  const connect = async () => {
    setStatus(ConnectionStatus.CONNECTING);
    
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) {
        throw new Error("API Key not found");
      }
      
      const ai = new GoogleGenAI({ apiKey });

      // 1. Setup Audio Contexts
      // Note: We don't enforce sampleRate here as browser might not support it. We read it later.
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: OUTPUT_SAMPLE_RATE });
      
      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Connect to Gemini Live
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          // Fix: Pass systemInstruction as a string for robust compatibility
          systemInstruction: getSystemInstruction(language),
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          // Fix: Remove invalid 'model' argument from transcription configs
          inputAudioTranscription: { }, 
          outputAudioTranscription: { },
        },
        callbacks: {
          onopen: () => {
            setStatus(ConnectionStatus.CONNECTED);
            
            // Setup Audio Input Pipeline
            if (!inputAudioContextRef.current || !streamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
            sourceRef.current = source;
            
            // Using ScriptProcessor for raw PCM access
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;

            // Capture the sample rate to send to the API
            const inputSampleRate = inputAudioContextRef.current.sampleRate;

            processor.onaudioprocess = (e) => {
              if (isMicMuted) return; 

              const inputData = e.inputBuffer.getChannelData(0);
              
              // Visualizer "volume" calculation
              let sum = 0;
              for(let i=0; i<inputData.length; i+=10) sum += Math.abs(inputData[i]);
              const avg = sum / (inputData.length / 10);
              setVolume(prev => Math.max(prev * 0.9, avg * 5)); 

              // Convert Float32 to Int16 PCM
              const pcm16 = float32ToPCM16(inputData);
              // Encode to Base64
              const uint8 = new Uint8Array(pcm16.buffer);
              const base64 = encodeBase64(uint8);

              // Send to Gemini
              sessionPromise.then(session => {
                  session.sendRealtimeInput({
                      media: {
                          // Fix: Use the actual sample rate of the AudioContext
                          mimeType: `audio/pcm;rate=${inputSampleRate}`,
                          data: base64
                      }
                  });
              }).catch(err => {
                 // Ignore send errors if session closed
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const { serverContent } = msg;
            
            // Handle Audio Output
            if (serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                const base64 = serverContent.modelTurn.parts[0].inlineData.data;
                
                if (base64 && outputAudioContextRef.current) {
                    const ctx = outputAudioContextRef.current;
                    const audioData = decodeBase64(base64);
                    const audioBuffer = await decodeAudioData(audioData, ctx, OUTPUT_SAMPLE_RATE, 1);
                    
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    
                    // Scheduling
                    const now = ctx.currentTime;
                    const startTime = Math.max(now, nextStartTimeRef.current);
                    source.start(startTime);
                    nextStartTimeRef.current = startTime + audioBuffer.duration;

                    // Visualizer "volume" for AI speaking
                     setVolume(0.8); 
                     source.onended = () => setVolume(0);
                }
            }

            // Handle Transcriptions
            if (serverContent?.turnComplete) {
                 setVolume(0);
            }
            
             if (serverContent?.outputTranscription?.text) {
                 setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: last.text + serverContent.outputTranscription.text }];
                    }
                    return [...prev, { id: Date.now().toString(), role: 'model', text: serverContent.outputTranscription.text, timestamp: new Date(), isFinal: false }];
                 });
             }
             
             if (serverContent?.inputTranscription?.text) {
                 setMessages(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'user' && !last.isFinal) {
                        return [...prev.slice(0, -1), { ...last, text: last.text + serverContent.inputTranscription.text }];
                    }
                    return [...prev, { id: Date.now().toString(), role: 'user', text: serverContent.inputTranscription.text, timestamp: new Date(), isFinal: false }];
                 });
             }

             if (serverContent?.turnComplete) {
                 setMessages(prev => {
                     const last = prev[prev.length - 1];
                     if (last) return [...prev.slice(0, -1), {...last, isFinal: true}];
                     return prev;
                 });
             }

          },
          onclose: () => {
              console.log("Session closed");
              setStatus(ConnectionStatus.DISCONNECTED);
          },
          onerror: (err) => {
              console.error("Session error", err);
              setStatus(ConnectionStatus.ERROR);
              cleanup();
          }
        }
      });

      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Connection failed", error);
      setStatus(ConnectionStatus.ERROR);
      cleanup();
    }
  };

  const toggleMic = () => {
    setIsMicMuted(prev => !prev);
  };

  const ui = UI_TEXT[language];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-purple-200">
      
      {/* Header */}
      <header className="h-16 border-b border-gray-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight text-gray-900">{ui.title}</h1>
            <div className="flex items-center gap-2">
               <span className={`block w-2 h-2 rounded-full ${status === ConnectionStatus.CONNECTED ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
               <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
                  {status === ConnectionStatus.CONNECTED ? ui.status.connected : 
                   status === ConnectionStatus.CONNECTING ? ui.status.connecting :
                   status === ConnectionStatus.ERROR ? ui.status.error :
                   ui.status.disconnected}
               </span>
            </div>
          </div>
        </div>
        
        {/* Language Switcher */}
        <div className="flex bg-gray-100 rounded-lg p-1 border border-gray-200">
            <button 
                onClick={() => setLanguage('en')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${language === 'en' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
                English
            </button>
             <button 
                onClick={() => setLanguage('vi')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${language === 'vi' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Tiếng Việt
            </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-4rem)]">
        
        {/* Left Panel: Chat & Visualizer */}
        <div className="lg:col-span-2 flex flex-col gap-4 h-full">
          
          {/* Chat Display */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col relative">
             
             {/* Messages Area */}
             <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && status !== ConnectionStatus.CONNECTED && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-50 mb-4 flex items-center justify-center">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        </div>
                        <p className="text-lg font-medium text-gray-500">{ui.welcome}</p>
                    </div>
                )}
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                         <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                             msg.role === 'user' 
                             ? 'bg-purple-600 text-white rounded-tr-none' 
                             : 'bg-gray-100 text-gray-800 rounded-tl-none'
                         }`}>
                             {msg.text}
                         </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             {/* Controls Bar */}
             <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
                {status === ConnectionStatus.CONNECTED ? (
                    <>
                        <button 
                            onClick={toggleMic}
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                                isMicMuted 
                                ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600 shadow-sm'
                            }`}
                        >
                            {isMicMuted ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM16 13a1 1 0 10-2 0V7a1 1 0 102 0v6z" clipRule="evenodd" />
                                  <path fillRule="evenodd" d="M4 13a1 1 0 102 0V7a1 1 0 10-2 0v6z" clipRule="evenodd" />
                                  <path d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14z" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                        
                        <div className="flex-1 h-10">
                             <AudioVisualizer isConnected={true} isSpeaking={volume > 0.01} />
                        </div>

                        <button 
                            onClick={cleanup}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-semibold transition-colors"
                        >
                            {ui.disconnect}
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={connect}
                        disabled={status === ConnectionStatus.CONNECTING}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        {status === ConnectionStatus.CONNECTING ? (
                           <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                           </svg>
                        )}
                        {status === ConnectionStatus.CONNECTING ? ui.status.connecting : ui.connect}
                    </button>
                )}
             </div>
          </div>

        </div>

        {/* Right Panel: Knowledge & Settings */}
        <div className="h-full hidden lg:block">
           <KnowledgePanel language={language} />
        </div>

      </main>
    </div>
  );
}

export default App;