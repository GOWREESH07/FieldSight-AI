"use client";
import { useState, useRef, useEffect, useCallback } from 'react';
import { Event } from '../lib/utils';
import { sendChatMessage } from '../lib/api';
import { Send, Loader2, Bot, User, Sparkles, RotateCcw } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

function cleanStars(str: string): string {
  if (!str) return '';
  return str.replace(/\*\*/g, '').replace(/\*/g, '');
}

export function ChatPanel({ 
  jobId, 
  events,
  externalPrompt,
  onPromptHandled,
  className = ""
}: { 
  jobId: string; 
  events: Event[];
  externalPrompt?: string | null;
  onPromptHandled?: () => void;
  className?: string;
}) {
  const getInitialGreeting = useCallback(() => {
    if (!events || events.length === 0) {
      return "Hello, I am your FieldSight AI Supervisor. No critical risk events have been flagged yet. Ask me any questions about the footage or warehouse safety guidelines.";
    }
    const criticalCount = events.filter(e => e.risk_level === 'critical').length;
    const highCount = events.filter(e => e.risk_level === 'high').length;
    return `Hello, I am your FieldSight AI Supervisor. I've analyzed this footage and registered ${events.length} handling events (${criticalCount} critical, ${highCount} high risk). What would you like to inspect or verify?`;
  }, [events]);

  const [messages, setMessages] = useState<Message[]>([
    { 
      role: 'assistant', 
      content: getInitialGreeting(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = useCallback(async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text || isLoading) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text, timestamp: timeStr }]);
    setIsLoading(true);

    try {
      const res = await sendChatMessage(jobId, text);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: cleanStars(res.response || "No response received from the supervisor model."),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (error: any) {
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `Unable to connect to AI supervisor service: ${error?.message || 'Server error'}. Please verify the backend is running.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, jobId]);

  // Handle external prompts triggered from other components
  useEffect(() => {
    if (externalPrompt) {
      handleSend(externalPrompt);
      onPromptHandled?.();
    }
  }, [externalPrompt, handleSend, onPromptHandled]);

  const resetChat = () => {
    setMessages([
      { 
        role: 'assistant', 
        content: getInitialGreeting(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const suggestions = [
    'Show me all critical risk events',
    'Summarize this footage in 3 key points',
    'Why was the throwing/dropping flagged?',
    'What corrective actions are recommended?'
  ];

  return (
    <div className={`flex flex-col bg-surface border border-border rounded shadow-sm overflow-hidden ${className || 'h-[580px]'}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-border bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-accent/10 flex items-center justify-center text-accent">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-text-primary font-semibold text-sm">AI Supervisor Assistant</h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Grounded
              </span>
            </div>
            <div className="text-[11px] text-text-muted font-mono">Gemini 2.5 Flash · Warehouse Intelligence</div>
          </div>
        </div>
        <button 
          onClick={resetChat} 
          title="Reset conversation"
          className="text-text-muted hover:text-text-primary p-1.5 rounded hover:bg-gray-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      
      {/* Grounding banner */}
      <div className="px-3 py-1.5 bg-amber-50/80 border-b border-amber-200/50 text-[11px] text-amber-800 text-center flex items-center justify-center gap-1.5 font-mono">
        <Sparkles className="w-3 h-3 text-amber-600 shrink-0" />
        <span>Grounded strictly in computer vision detections. No hallucinations.</span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin bg-background/30">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-accent shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div className="flex flex-col max-w-[85%]">
              <div 
                className={`rounded px-3.5 py-2.5 text-sm leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none shadow-sm' 
                    : 'bg-surface text-text-primary border border-border rounded-bl-none shadow-sm'
                }`}
              >
                <div className="whitespace-pre-wrap">{cleanStars(m.content)}</div>
              </div>
              <span className={`text-[10px] font-mono text-text-muted mt-1 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                {m.timestamp}
              </span>
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded bg-gray-200 border border-border flex items-center justify-center text-text-secondary shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-6 h-6 rounded bg-blue-50 border border-blue-200 flex items-center justify-center text-accent shrink-0 mt-0.5">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div className="bg-surface text-text-secondary border border-border rounded rounded-bl-none px-3.5 py-2.5 text-sm flex items-center gap-2 shadow-sm font-mono text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
              <span>Supervisor analyzing events…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input & suggestions footer */}
      <div className="p-3 border-t border-border bg-surface">
        {/* Quick prompt suggestions */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => handleSend(s)}
              disabled={isLoading}
              className="text-[11px] bg-gray-100 border border-border hover:border-accent/40 rounded px-2.5 py-1 text-text-secondary hover:text-text-primary hover:bg-gray-200 transition-colors text-left disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input box */}
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask about detected behaviours, risks, or timestamps..."
            disabled={isLoading}
            className="w-full bg-white border border-border rounded pl-3 pr-10 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all disabled:opacity-50"
          />
          <button 
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 p-1.5 rounded bg-accent text-white hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-accent transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
