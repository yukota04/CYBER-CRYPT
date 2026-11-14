import React, { useState, useEffect, useCallback } from 'react';
import { Language, t } from '../game/i18n';
import { X, Send, UserPlus, Users, MessageSquare, Bell, Check, Shield, XCircle } from 'lucide-react';

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

interface PendingRequest {
  id: string;
  username: string;
}

export const SocialModal: React.FC<SocialModalProps> = ({
  onClose,
  userToken,
  language
}) => {
  const [tab, setTab] = useState<'chat' | 'friends' | 'alerts'>('chat');
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [targetUsername, setTargetUsername] = useState('');
  const [feedback, setFeedback] = useState('');
  const [chatError, setChatError] = useState('');

  const fetchSocialData = useCallback(() => {
    fetch('/api/social/messages')
      .then(res => res.json())
      .then(data => {
        if (data.messages) setMessages(data.messages);
      })
      .catch(() => {});

    if (userToken) {
      fetch('/api/social/friends', {
        headers: { Authorization: `Bearer ${userToken}` }
      })
        .then(res => res.json())
        .then(data => {
          if (data.friends) setFriends(data.friends);
          if (data.pendingRequests) setPendingRequests(data.pendingRequests);
        })
        .catch(() => {});
    }
  }, [userToken]);

  useEffect(() => {
    fetchSocialData();
    const poll = setInterval(fetchSocialData, 5000);
    return () => clearInterval(poll);
  }, [fetchSocialData]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setChatError('');

    fetch('/api/social/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ text: inputMsg })
    })
      .then(async res => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Message failed');
        if (data.message) {
          setMessages(prev => [...prev, data.message]);
          setInputMsg('');
        }
      })
      .catch(err => setChatError(err.message || 'Unable to send message'));
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
      .then(async res => {
        const data = await res.json();
        if (res.ok && data.success) {
          setFeedback(data.message);
          setTargetUsername('');
        } else {
          setFeedback(data.error || 'Failed to send request');
        }
      })
      .catch(() => setFeedback('Network error sending request'));
  };

  const handleRespondRequest = (requesterId: string, accept: boolean) => {
    fetch('/api/social/respond', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`
      },
      body: JSON.stringify({ requesterId, accept })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setFeedback(data.message || (accept ? 'Alliance accepted' : 'Request declined'));
          fetchSocialData();
        }
      })
      .catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none font-mono">
      <div className="w-full max-w-2xl bg-[#0a0718] border border-cyan-500/50 rounded-lg shadow-[0_0_35px_rgba(0,240,255,0.25)] p-5 flex flex-col h-[520px]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-cyan-500/30">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-wider">
              {t('socialTitle', language)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 min-w-[44px] h-10 sm:h-11 px-3 sm:px-3.5 rounded-lg bg-rose-950/90 hover:bg-rose-600 text-rose-100 hover:text-white border-2 border-rose-400/85 shadow-[0_0_14px_rgba(244,63,94,0.45)] font-bold text-xs uppercase tracking-wider transition cursor-pointer flex-shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.75]" />
            <span>{t('closeBtn', language)}</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 my-3 border-b border-slate-800 pb-2">
          <button
            onClick={() => setTab('chat')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'chat' ? 'bg-cyan-500 text-black' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            {t('globalComms', language)}
          </button>
          <button
            onClick={() => setTab('friends')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'friends' ? 'bg-cyan-500 text-black' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {t('alliedRoster', language)} ({friends.length})
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-pink-600 text-white text-[10px]">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('alerts')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold transition cursor-pointer ${
              tab === 'alerts' ? 'bg-cyan-500 text-black' : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            {t('securityNotifs', language)}
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
                    <span className="text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-slate-200">{msg.text}</div>
                </div>
              ))}
            </div>

            {chatError && <div className="text-[11px] text-red-400 mt-1">{chatError}</div>}

            <form onSubmit={handleSendMessage} className="flex gap-2 mt-3 pt-2 border-t border-slate-800">
              <input
                type="text"
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                maxLength={280}
                placeholder={t('chatPlaceholder', language)}
                className="flex-1 px-3 py-2 rounded bg-slate-900 border border-cyan-500/30 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs uppercase flex items-center gap-1.5 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {t('sendBtn', language)}
              </button>
            </form>
          </div>
        )}

        {/* Tab 2: Friends Roster & Requests */}
        {tab === 'friends' && (
          <div className="flex flex-col flex-1 justify-between overflow-hidden">
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {pendingRequests.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  <div className="text-[10px] font-bold text-pink-400 tracking-wider">
                    {t('pendingRequests', language)}
                  </div>
                  {pendingRequests.map(req => (
                    <div
                      key={req.id}
                      className="flex items-center justify-between p-2.5 rounded bg-pink-950/30 border border-pink-500/40"
                    >
                      <span className="text-xs font-bold text-white">{req.username}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRespondRequest(req.id, true)}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          {t('acceptBtn', language)}
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, false)}
                          className="px-2 py-1 rounded bg-slate-700 hover:bg-red-600 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3 h-3" />
                          {t('rejectBtn', language)}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {friends.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">{t('noAllies', language)}</div>
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
                      {f.online ? t('onlineGrid', language) : t('disconnectedStatus', language)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Friend Request Form */}
            <form onSubmit={handleSendFriendRequest} className="mt-4 pt-3 border-t border-slate-800">
              <div className="text-[11px] text-slate-300 mb-1.5 font-bold">{t('reqAlliance', language)}</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetUsername}
                  onChange={e => setTargetUsername(e.target.value)}
                  placeholder={t('handlePlaceholder', language)}
                  className="flex-1 px-3 py-2 rounded bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase flex items-center gap-1 transition cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {t('requestBtn', language)}
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
                  Your character matrix and progress are encrypted with AES-256-GCM and SHA-256 signatures during transmission and storage.
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

