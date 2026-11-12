import React, { useState, useEffect } from 'react';
import { Language, t } from '../game/i18n';
import { X, Send, UserPlus, Users, MessageSquare, Bell, Check, Shield } from 'lucide-react';

interface SocialModalProps {
  onClose: () => void;
  userToken: string;
  username: string;
  language: Language;
}

interface ChatMsg {
  id: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface Friend {
  id: string;
  username: string;
  online: boolean;
}

export const SocialModal: React.FC<SocialModalProps> = ({
  onClose,
  userToken,
  username,
  language
}) => {
  const [tab, setTab] = useState<'chat' | 'friends' | 'alerts'>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [feedback, setFeedback] = useState('');

  // Fetch messages and friends
  useEffect(() => {
    fetch('/api/social/messages')
      .then(res => res.json())
      .then(data => setMessages(data.messages || []));

    fetch('/api/social/friends', {
      headers: { Authorization: `Bearer ${userToken}` }
    })
      .then(res => res.json())
      .then(data => setFriends(data.friends || []));
  }, [userToken]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;

    fetch('/api/social/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ text: inputMsg })
    })
      .then(res => res.json())
      .then(data => {
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          setInputMsg('');
        }
      });
  };

  const handleSendFriendRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUsername.trim()) return;

    fetch('/api/social/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ targetUsername })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeedback(data.message);
          setTargetUsername('');
        } else {
          setFeedback(data.error || 'Failed to send request');
        }
      });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-2xl bg-[#0a0718] border border-cyan-500/50 rounded-lg shadow-[0_0_35px_rgba(0,240,255,0.25)] p-5 flex flex-col h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              OPERATIVE FREQUENCY & SOCIAL MATRIX
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 my-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'chat' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            GLOBAL COMMS CHANNEL
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'friends' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            ALLIED ROSTER ({friends.length})
          </button>
          <button
            onClick={() => setTab('alerts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'alerts' ? 'bg-cyan-500 text-black' : 'text-slate-400 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            SECURITY NOTIFICATIONS
          </button>
        </div>

        {/* Tab 1: Global Chat */}
        {tab === 'chat' && (
          <div className="flex flex-col flex-1 justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-2 text-xs">
              {messages.map(msg => (
                <div key={msg.id} className="p-2 rounded bg-[#0d0920] border border-cyan-500/15">
                  <div className="flex items-center justify-between text-[10px] text-cyan-400 mb-1">
                    <span className="font-bold">{msg.senderName}</span>
                    <span className="text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200">{msg.text}</div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                placeholder="Broadcast encrypted telemetry message..."
                className="flex-1 px-3 py-2 rounded bg-slate-900 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                SEND
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Friends Roster */}
        {tab === 'friends' && (
          <div className="flex flex-col flex-1 justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-2">
              {friends.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No allied operatives linked yet.</div>
              ) : (
                friends.map(f => (
                  <div
                    key={f.id}
                    className="flex items-center justify-between p-3 rounded bg-[#0d0920] border border-cyan-500/20"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${f.online ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className="font-bold text-white text-xs">{f.username}</span>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400">
                      {f.online ? 'ONLINE GRID' : 'DISCONNECTED'}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Friend Request Form */}
            <form onSubmit={handleSendFriendRequest} className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-400 mb-1.5 font-bold">TRANSMIT ALLIANCE REQUEST</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUsername}
                  onChange={e => setTargetUsername(e.target.value)}
                  placeholder="Operative username handle..."
                  className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase flex items-center gap-1 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  REQUEST
                </button>
              </div>
              {feedback && <div className="text-[11px] text-cyan-400 mt-2">{feedback}</div>}
            </form>
          </div>
        )}

        {/* Tab 3: Security & Alerts */}
        {tab === 'alerts' && (
          <div className="flex-1 overflow-y-auto space-y-2 text-xs">
            <div className="p-3 rounded bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-emerald-400 mt-0.5" />
              <div>
                <div className="font-bold text-emerald-300">End-to-End Cryptographic Sync Enabled</div>
                <div className="text-slate-300 text-[11px] mt-0.5">
                  Your character matrix and progress are encrypted with client SHA-256 signatures before transmission.
                </div>
              </div>
            </div>

            <div className="p-3 rounded bg-purple-950/30 border border-purple-500/30 flex items-start gap-2.5">
              <Bell className="w-4 h-4 text-purple-400 mt-0.5" />
              <div>
                <div className="font-bold text-purple-300">Automated Security Dispatcher Active</div>
                <div className="text-slate-300 text-[11px] mt-0.5">
                  Critical system events and abnormal login patterns automatically trigger alert dispatches to registered administrative channels.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
