import React, { useEffect, useRef, useState } from 'react';
import { Market, ChatMessage } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  market: Market | null;
  account: string | null;
}

const MOCK_SENDERS = ['0xValora', 'CryptoWhale', 'CeloDegen', 'PredictionPro', 'WAGMI_User'];
const MOCK_MESSAGES = [
  "I'm going all in on this one!",
  "Odds look too good to pass up.",
  "Does anyone have alpha on this?",
  "This is definitely happening.",
  "Just placed my bet 🚀",
  "No way, the other outcome is guaranteed."
];

export const ChatDrawer: React.FC<Props> = ({ isOpen, onClose, market, account }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Load messages from local storage + Mock simulation
  useEffect(() => {
    if (!market) return;
    
    const storageKey = `chat_messages_${market.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      setMessages(JSON.parse(saved));
    } else {
      setMessages([
        { id: 'sys', sender: 'System', text: `Welcome to the trading room for "${market.title}"`, timestamp: Date.now(), isMe: false }
      ]);
    }

    // Simulate live activity
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        const randomSender = MOCK_SENDERS[Math.floor(Math.random() * MOCK_SENDERS.length)];
        const randomMsg = MOCK_MESSAGES[Math.floor(Math.random() * MOCK_MESSAGES.length)];
        const newMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          sender: randomSender,
          text: randomMsg,
          timestamp: Date.now(),
          isMe: false
        };
        
        setMessages(prev => {
            const updated = [...prev, newMsg].slice(-50); // Keep last 50
            localStorage.setItem(storageKey, JSON.stringify(updated));
            return updated;
        });
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [market]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !market) return;

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: account || 'Guest',
      text: input,
      timestamp: Date.now(),
      isMe: true
    };

    const updated = [...messages, newMsg];
    setMessages(updated);
    localStorage.setItem(`chat_messages_${market.id}`, JSON.stringify(updated));
    setInput('');
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]" onClick={onClose}></div>
      )}
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-[70] flex flex-col border-l border-gray-200 dark:border-gray-800 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Live Chat</h3>
            <p className="text-xs text-gray-500 truncate max-w-[200px]">{market?.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition">
            <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-100 dark:bg-gray-950">
           {messages.map((msg) => (
             <div key={msg.id} className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'}`}>
               <div className={`flex items-baseline gap-2 mb-1 ${msg.isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <span className="text-xs font-bold text-gray-600 dark:text-gray-400">
                    {msg.isMe ? 'You' : (msg.sender.length > 10 ? msg.sender.slice(0,6)+'...' : msg.sender)}
                  </span>
                  <span className="text-[10px] text-gray-400">{formatTime(msg.timestamp)}</span>
               </div>
               <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                 msg.isMe 
                   ? 'bg-celo-green text-white rounded-tr-none' 
                   : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-none border border-gray-200 dark:border-gray-700'
               }`}>
                 {msg.text}
               </div>
             </div>
           ))}
           <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <form onSubmit={handleSend} className="p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={account ? "Type your prediction..." : "Connect wallet to chat"}
              disabled={!account}
              className="flex-1 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-celo-green text-sm"
            />
            <button 
              type="submit" 
              disabled={!account || !input.trim()}
              className="bg-celo-green text-white p-2 rounded-full hover:bg-green-600 disabled:opacity-50 transition shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
            </button>
          </div>
        </form>
      </div>
    </>
  );
};