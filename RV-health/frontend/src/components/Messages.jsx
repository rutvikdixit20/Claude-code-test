import { useState, useEffect, useRef } from 'react';
import { useApp } from '../App.jsx';
import { api } from '../lib/api.js';

function formatTime(iso) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ContactItem({ contact, selected, onClick }) {
  const isDoctor = contact.role === 'doctor';
  return (
    <button
      className={`contact-item ${selected ? 'contact-item-active' : ''}`}
      onClick={onClick}
    >
      <div className={`avatar avatar-md avatar-${isDoctor ? 'blue' : 'teal'}`}>
        {contact.initials}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          {contact.name}
          {contact.unread > 0 && <span className="notif-dot">{contact.unread}</span>}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 1 }}>
          {isDoctor ? contact.specialty : 'Patient'}
        </div>
        {contact.last_message && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.last_message}
          </div>
        )}
      </div>
    </button>
  );
}

export default function Messages() {
  const { currentUser } = useApp();
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  // Load contacts
  useEffect(() => {
    api.getContacts(currentUser.id)
      .then(c => { setContacts(c); if (c.length > 0) setSelected(c[0]); })
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  // Load messages when contact selected
  useEffect(() => {
    if (!selected) return;
    api.getMessages(currentUser.id, selected.id).then(setMessages);
  }, [selected, currentUser.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages
  useEffect(() => {
    if (!selected) return;
    const interval = setInterval(() => {
      api.getMessages(currentUser.id, selected.id).then(setMessages);
    }, 5000);
    return () => clearInterval(interval);
  }, [selected, currentUser.id]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected || sending) return;
    const content = text.trim();
    setText('');
    setSending(true);
    try {
      const msg = await api.sendMessage({ sender_id: currentUser.id, receiver_id: selected.id, content });
      setMessages(prev => [...prev, msg]);
    } finally {
      setSending(false);
    }
  };

  const isDoctor = currentUser.role === 'doctor';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💬 Secure Messages</h1>
          <p className="page-subtitle">End-to-end encrypted • HIPAA compliant</p>
        </div>
      </div>

      <div className="card" style={{ display: 'flex', height: 580, padding: 0, overflow: 'hidden' }}>
        {/* Contact List */}
        <div style={{
          width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
          background: 'var(--surface-2)', flexShrink: 0
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Conversations
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading ? (
              <div className="loading" style={{ padding: 24 }}><div className="spinner" /></div>
            ) : contacts.length === 0 ? (
              <div style={{ padding: '24px 16px', fontSize: '0.875rem', color: 'var(--text-3)', textAlign: 'center' }}>
                No conversations yet
              </div>
            ) : (
              contacts.map(c => (
                <ContactItem
                  key={c.id}
                  contact={c}
                  selected={selected?.id === c.id}
                  onClick={() => setSelected(c)}
                />
              ))
            )}
          </div>
        </div>

        {/* Message Thread */}
        {selected ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Thread Header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)'
            }}>
              <div className={`avatar avatar-md avatar-${selected.role === 'doctor' ? 'blue' : 'teal'}`}>
                {selected.initials}
              </div>
              <div>
                <div style={{ fontWeight: 700 }}>{selected.name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
                  {selected.role === 'doctor' ? selected.specialty : 'Patient'}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />
                  Secure
                </span>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.875rem', marginTop: 40 }}>
                  No messages yet. Start the conversation.
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === currentUser.id;
                  const showDate = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(msg.created_at).toDateString();
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-3)', margin: '8px 0', fontWeight: 500 }}>
                          {new Date(msg.created_at).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', gap: 8, alignItems: 'flex-end' }}>
                        {!isMine && (
                          <div className={`avatar avatar-sm avatar-${msg.sender_role === 'doctor' ? 'blue' : 'teal'}`} style={{ marginBottom: 2 }}>
                            {msg.sender_initials}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%' }}>
                          <div style={{
                            padding: '10px 14px',
                            borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                            background: isMine ? 'var(--primary)' : 'var(--surface-2)',
                            color: isMine ? '#fff' : 'var(--text)',
                            fontSize: '0.875rem',
                            lineHeight: 1.6,
                            border: isMine ? 'none' : '1px solid var(--border)',
                            boxShadow: 'var(--shadow-sm)',
                          }}>
                            {msg.content}
                          </div>
                          <div style={{
                            fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 3,
                            textAlign: isMine ? 'right' : 'left'
                          }}>
                            {formatTime(msg.created_at)}
                            {isMine && <span style={{ marginLeft: 6 }}>{msg.read ? '✓✓' : '✓'}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={send} style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', gap: 10, background: 'var(--surface)', alignItems: 'flex-end'
            }}>
              <textarea
                className="form-textarea"
                placeholder={`Message ${selected.name}…`}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }}
                style={{ minHeight: 40, maxHeight: 120, resize: 'none', flex: 1, fontSize: '0.875rem' }}
                rows={1}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!text.trim() || sending}
                style={{ flexShrink: 0 }}
              >
                {sending ? '⏳' : '➤ Send'}
              </button>
            </form>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-3)' }}>
            <span style={{ fontSize: '2.5rem', opacity: 0.3 }}>💬</span>
            <div style={{ fontWeight: 600, color: 'var(--text-2)' }}>Select a conversation</div>
            <div style={{ fontSize: '0.875rem' }}>Choose a contact from the left to start messaging.</div>
          </div>
        )}
      </div>

      <style>{`
        .contact-item {
          display: flex; align-items: center; gap: 12px;
          width: 100%; padding: 12px 16px;
          background: transparent; border: none; border-bottom: 1px solid var(--border);
          cursor: pointer; text-align: left; transition: var(--transition);
        }
        .contact-item:hover { background: var(--bg); }
        .contact-item-active { background: var(--primary-light) !important; }
      `}</style>
    </div>
  );
}
