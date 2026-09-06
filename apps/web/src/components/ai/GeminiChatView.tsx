'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Square,
  RotateCcw,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Bot,
  User as UserIcon,
  ChevronDown,
  X,
  Volume2,
} from 'lucide-react';
import { AIPersonaConfig, AIMessagePayload } from '@/lib/ai-gateway/types';
import GeminiLiveVoiceModal from './GeminiLiveVoiceModal';

interface GeminiChatViewProps {
  initialPersona?: AIPersonaConfig;
  onOpenLiveVoice?: () => void;
}

export default function GeminiChatView({ initialPersona, onOpenLiveVoice }: GeminiChatViewProps) {
  const [messages, setMessages] = useState<AIMessagePayload[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your Tolee AI assistant. How can I help you today? You can ask questions, write code, brainstorm ideas, analyze images, or talk in real-time voice.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [personas, setPersonas] = useState<AIPersonaConfig[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<AIPersonaConfig | null>(initialPersona || null);
  const [isPersonaOpen, setIsPersonaOpen] = useState(false);
  const [attachment, setAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [isLiveVoiceOpen, setIsLiveVoiceOpen] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch('/api/ai/personas')
      .then((res) => res.json())
      .then((data) => {
        if (data.personas?.length) {
          setPersonas(data.personas);
          if (!selectedPersona) {
            const def = data.personas.find((p: any) => p.id === data.selectedPersonaId) || data.personas[0];
            setSelectedPersona(def);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  const handlePersonaSelect = async (persona: AIPersonaConfig) => {
    setSelectedPersona(persona);
    setIsPersonaOpen(false);
    if (persona.id) {
      await fetch('/api/ai/personas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'select', personaId: persona.id }),
      }).catch(() => {});
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setAttachment({
        url: reader.result as string,
        type: file.type,
        name: file.name,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || input).trim();
    if ((!textToSend && !attachment) || isStreaming) return;

    const userMessage: AIMessagePayload = {
      role: 'user',
      content: textToSend,
      mediaUrl: attachment?.url,
      mediaType: attachment?.type,
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setAttachment(null);
    setIsStreaming(true);

    const assistantPlaceholderIndex = updatedMessages.length;
    setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const res = await fetch('/api/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          persona: selectedPersona,
          model: selectedPersona?.preferredModel || 'gemini-2.0-flash',
        }),
        signal: abortController.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error('Failed to start stream');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;
          if (trimmed === 'data: [DONE]') break;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              if (data.text) {
                accumulated += data.text;
                setMessages((prev) => {
                  const copy = [...prev];
                  copy[assistantPlaceholderIndex] = {
                    role: 'assistant',
                    content: accumulated,
                  };
                  return copy;
                });
              }
            } catch {
              // Ignore malformed chunk
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setMessages((prev) => {
          const copy = [...prev];
          copy[assistantPlaceholderIndex] = {
            role: 'assistant',
            content: `⚠️ Failed to generate response: ${err.message || 'Please check your connection and try again.'}`,
          };
          return copy;
        });
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleRegenerate = () => {
    if (messages.length < 2 || isStreaming) return;
    const lastUserMsgIndex = [...messages].reverse().findIndex((m) => m.role === 'user');
    if (lastUserMsgIndex === -1) return;

    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const trimmed = messages.slice(0, actualIndex);
    const lastUserMsg = messages[actualIndex];
    setMessages(trimmed);
    setInput(lastUserMsg.content);
    if (lastUserMsg.mediaUrl) {
      setAttachment({
        url: lastUserMsg.mediaUrl,
        type: lastUserMsg.mediaType || 'image/jpeg',
        name: 'Attachment',
      });
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRate = (index: number, score: number) => {
    setRatings((prev) => ({
      ...prev,
      [index]: prev[index] === score ? 0 : score,
    }));
  };

  // Minimal standard markdown renderer
  const renderMarkdown = (content: string) => {
    // Split by code blocks ```lang ... ```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push(renderFormattedText(content.slice(lastIndex, match.index), `text-${lastIndex}`));
      }

      const lang = match[1] || 'code';
      const code = match[2];
      const blockId = `code-${match.index}`;

      parts.push(
        <div key={blockId} className="my-3 rounded-lg overflow-hidden border border-gray-700 bg-gray-900/90 text-sm">
          <div className="flex items-center justify-between px-3 py-1.5 bg-gray-800/80 border-b border-gray-700 text-xs text-gray-400 font-mono">
            <span>{lang}</span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(code);
              }}
              className="flex items-center gap-1 hover:text-white transition-colors text-xs"
              title="Copy code"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>
          <pre className="p-3 overflow-x-auto text-gray-100 font-mono text-xs leading-relaxed">
            <code>{code}</code>
          </pre>
        </div>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      parts.push(renderFormattedText(content.slice(lastIndex), `text-${lastIndex}`));
    }

    return parts;
  };

  const renderFormattedText = (text: string, keyPrefix: string) => {
    const lines = text.split('\n');
    return (
      <div key={keyPrefix} className="space-y-1.5">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-2" />;

          // Headers
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-teal-400 mt-2">
                {line.slice(4)}
              </h3>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-bold text-teal-300 mt-3">
                {line.slice(3)}
              </h2>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-bold text-teal-200 mt-4">
                {line.slice(2)}
              </h1>
            );
          }

          // Bullet points
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-teal-400 mt-1">•</span>
                <span>{renderInlineStyles(line.slice(2))}</span>
              </div>
            );
          }

          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (str: string) => {
    // Bold **text**
    const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="px-1.5 py-0.5 rounded bg-gray-800 text-teal-300 font-mono text-xs">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full bg-[#0d151c] text-gray-100 relative">
      {/* Top Bar: Persona Badge & Voice Trigger */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-[#111c26]/70 backdrop-blur-md sticky top-0 z-20">
        <div className="relative">
          <button
            onClick={() => setIsPersonaOpen(!isPersonaOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-950/60 border border-teal-800/50 hover:border-teal-600 transition-all text-sm text-teal-200"
          >
            <span className="text-base">{selectedPersona?.avatar || '✨'}</span>
            <span className="font-medium">{selectedPersona?.name || 'Tolee AI'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-teal-400" />
          </button>

          {isPersonaOpen && (
            <div className="absolute left-0 mt-2 w-64 rounded-xl bg-gray-900 border border-gray-700 shadow-2xl p-1.5 z-30 space-y-1">
              <div className="px-2 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Select AI Persona
              </div>
              {personas.map((p) => (
                <button
                  key={p.id || p.name}
                  onClick={() => handlePersonaSelect(p)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedPersona?.name === p.name ? 'bg-teal-900/50 text-teal-200 font-medium' : 'hover:bg-gray-800 text-gray-300'
                  }`}
                >
                  <span className="text-lg">{p.avatar || '✨'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{p.name}</div>
                    <div className="text-xs text-gray-400 truncate">{p.tone} · {p.language}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => (onOpenLiveVoice ? onOpenLiveVoice() : setIsLiveVoiceOpen(true))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-400 hover:to-cyan-500 text-white text-xs font-medium shadow-md shadow-teal-900/30 transition-all transform hover:scale-105"
          >
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span>Gemini Live</span>
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm ${
                  isUser
                    ? 'bg-teal-600 text-white'
                    : 'bg-gradient-to-br from-teal-500 to-blue-600 text-white shadow-md'
                }`}
              >
                {isUser ? <UserIcon className="w-4 h-4" /> : <span>{selectedPersona?.avatar || '✨'}</span>}
              </div>

              <div
                className={`flex-1 rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-[#0a7c85] text-white rounded-tr-none'
                    : 'bg-[#152330] text-gray-200 border border-gray-800 rounded-tl-none'
                }`}
              >
                {msg.mediaUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden max-w-sm border border-black/20">
                    <img src={msg.mediaUrl} alt="Attached" className="w-full h-auto max-h-60 object-cover" />
                  </div>
                )}

                <div>{isUser ? <p className="whitespace-pre-wrap">{msg.content}</p> : renderMarkdown(msg.content)}</div>

                {!isUser && msg.content && (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-800/60 text-xs text-gray-400">
                    <button
                      onClick={() => handleCopy(msg.content, idx)}
                      className="p-1 hover:text-white transition-colors"
                      title="Copy response"
                    >
                      {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleRate(idx, 1)}
                      className={`p-1 hover:text-white transition-colors ${ratings[idx] === 1 ? 'text-teal-400 font-bold' : ''}`}
                      title="Thumbs up"
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleRate(idx, -1)}
                      className={`p-1 hover:text-white transition-colors ${ratings[idx] === -1 ? 'text-rose-400 font-bold' : ''}`}
                      title="Thumbs down"
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    {idx === messages.length - 1 && !isStreaming && (
                      <button
                        onClick={handleRegenerate}
                        className="flex items-center gap-1 ml-auto p-1 hover:text-white transition-colors"
                        title="Regenerate response"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Attachment Preview */}
      {attachment && (
        <div className="px-4 py-2 bg-gray-900 border-t border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-300 truncate">
            <ImageIcon className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="truncate">{attachment.name}</span>
          </div>
          <button onClick={() => setAttachment(null)} className="p-1 hover:text-white">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800 bg-[#111c26]/90 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-end gap-2 bg-[#172533] border border-gray-700/70 rounded-2xl p-2 focus-within:border-teal-500 transition-colors shadow-inner">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,application/pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-teal-400 transition-colors rounded-lg hover:bg-gray-800"
            title="Attach image or file"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={`Message ${selectedPersona?.name || 'Tolee AI'}...`}
            rows={1}
            className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-400 focus:outline-none resize-none max-h-32 py-1 px-1"
          />

          {isStreaming ? (
            <button
              onClick={handleStop}
              className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-md"
              title="Stop generation"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() && !attachment}
              className="p-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 disabled:hover:bg-teal-600 text-white rounded-xl transition-all shadow-md"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="text-center text-[10px] text-gray-500 mt-2">
          Tolee AI may display inaccurate information. Verify critical details.
        </div>
      </div>

      {/* Gemini Live Voice Modal */}
      {isLiveVoiceOpen && (
        <GeminiLiveVoiceModal
          persona={selectedPersona}
          onClose={() => setIsLiveVoiceOpen(false)}
        />
      )}
    </div>
  );
}
