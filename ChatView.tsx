import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Send,
  RotateCcw,
  Info,
  Check,
  Copy,
  AlertCircle,
  X,
  Pencil,
  User,
  Brain,
  EyeOff,
  Sparkles,
  Coffee,
  MessageSquare,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import { Character, ChatMessage, UserProfile, CharacterMemoryItem, MemoryCategory } from '../types';
import {
  loadChatSession,
  saveChatMessages,
  clearChatSession,
  loadUserProfile,
  loadCharacterMemories,
  addCharacterMemory,
  isMemoryEnabledForCharacter,
  loadMemorySettings,
} from '../storage';
import { CharacterAvatar } from './CharacterAvatar';
import { CharacterMemoryModal } from './CharacterMemoryModal';

interface ChatViewProps {
  character: Character;
  onBack: () => void;
  onEditCharacter: (character: Character) => void;
  onOpenUserProfile?: () => void;
}

// Formats message text to highlight roleplay actions enclosed in asterisks
const FormattedChatText: React.FC<{ text: string }> = ({ text }) => {
  // Split on *action* patterns
  const parts = text.split(/(\*[^*]+\*)/g);

  return (
    <span className="leading-relaxed break-words whitespace-pre-wrap">
      {parts.map((part, index) => {
        if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
          return (
            <span key={index} className="italic text-[#c08497] font-serif font-normal">
              {part}
            </span>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
};

export const ChatView: React.FC<ChatViewProps> = ({
  character,
  onBack,
  onEditCharacter,
  onOpenUserProfile,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);
  const [characterMemories, setCharacterMemories] = useState<CharacterMemoryItem[]>(() => loadCharacterMemories(character.id));
  const [isMemoryActive, setIsMemoryActive] = useState<boolean>(() => isMemoryEnabledForCharacter(character.id));
  const [memoryToast, setMemoryToast] = useState<{ content: string; category?: MemoryCategory } | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());

  // Message edit and delete states
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ message: ChatMessage; index: number } | null>(null);
  const [retryContext, setRetryContext] = useState<{
    history: ChatMessage[];
    replaceIndex?: number;
    updatedUserMsg?: ChatMessage;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat session and memories on mount or character change
  useEffect(() => {
    const session = loadChatSession(character.id, character.greeting);
    setMessages(session.messages);
    setUserProfile(loadUserProfile());
    setCharacterMemories(loadCharacterMemories(character.id));
    setIsMemoryActive(isMemoryEnabledForCharacter(character.id));
    setError(null);
    setMemoryToast(null);
    setOpenMenuId(null);
    setEditingMessageId(null);
    setEditInput('');
    setRegeneratingIndex(null);
    setDeleteTarget(null);
    setRetryContext(null);
  }, [character.id, character.greeting]);

  // Consolidate important memories from recent dialogue in the background
  const consolidateMemoriesInBackground = async (currentMessages: ChatMessage[]) => {
    if (currentMessages.length < 2) return;
    // Privacy & optional control: do not extract if memory is disabled globally or for this character
    if (!isMemoryEnabledForCharacter(character.id)) return;
    const settings = loadMemorySettings();
    if (!settings.autoExtract) return;

    try {
      const recent = currentMessages.slice(-6);
      const existing = loadCharacterMemories(character.id);

      const res = await fetch('/api/memories/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: {
            name: character.name,
            personality: character.personality,
            background: character.background,
          },
          userProfile: loadUserProfile(),
          recentMessages: recent.map((m) => ({ role: m.role, content: m.content })),
          existingMemories: existing.map((m) => m.content),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.memories) && data.memories.length > 0) {
          let newlySaved = 0;
          let latestItem: { content: string; category?: MemoryCategory } | null = null;
          for (const item of data.memories) {
            if (item?.content && typeof item.content === 'string') {
              const category = (item.category as MemoryCategory) || 'preference';
              addCharacterMemory(character.id, item.content, category);
              newlySaved++;
              latestItem = { content: item.content, category };
            }
          }

          if (newlySaved > 0 && latestItem) {
            const reloaded = loadCharacterMemories(character.id);
            setCharacterMemories(reloaded);
            setMemoryToast(latestItem);
            setTimeout(() => {
              setMemoryToast(null);
            }, 7000);
          }
        }
      }
    } catch (e) {
      console.debug('Background memory consolidation skipped:', e);
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, streamingContent]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  // Copy message
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => {
      setCopiedMessageId(null);
      setOpenMenuId(null);
    }, 1500);
  };

  // Restart chat
  const handleRestartChat = () => {
    if (window.confirm(`Restart chat with ${character.name}? Previous messages will be cleared.`)) {
      const resetSession = clearChatSession(character.id, character.greeting);
      setMessages(resetSession.messages);
      setError(null);
      setStreamingContent('');
      setOpenMenuId(null);
      setEditingMessageId(null);
      setDeleteTarget(null);
    }
  };

  // Execute model generation with SSE streaming and client retry fallback
  const generateResponse = async (
    history: ChatMessage[],
    replaceAfterIndex?: number,
    updatedUserMsg?: ChatMessage
  ) => {
    setIsGenerating(true);
    setRegeneratingIndex(replaceAfterIndex !== undefined ? replaceAfterIndex : null);
    setStreamingContent('');
    setError(null);

    // Save context for retry if needed
    const currentRetryContext = {
      history,
      replaceIndex: replaceAfterIndex,
      updatedUserMsg,
    };
    setRetryContext(currentRetryContext);

    const hadFollowUpModel =
      replaceAfterIndex !== undefined &&
      messages[replaceAfterIndex + 1]?.role === 'model';

    const getSubsequentMessages = () => {
      if (replaceAfterIndex === undefined) return [];
      return hadFollowUpModel
        ? messages.slice(replaceAfterIndex + 2)
        : messages.slice(replaceAfterIndex + 1);
    };

    const executeStream = async (): Promise<void> => {
      const payloadMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const currentProfile = loadUserProfile();
      const isMemActive = isMemoryEnabledForCharacter(character.id);
      const currentMemories = isMemActive ? loadCharacterMemories(character.id) : [];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: {
            name: character.name,
            personality: character.personality,
            background: character.background,
            speakingStyle: character.speakingStyle,
          },
          userProfile: currentProfile,
          characterMemories: currentMemories,
          messages: payloadMessages,
          stream: true,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error('No response stream received');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            const jsonStr = trimmedLine.substring(6);
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingContent(accumulated);
              }
            } catch (err: any) {
              if (err.message && !err.message.includes('JSON')) {
                throw err;
              }
            }
          }
        }
      }

      if (accumulated.trim().length > 0) {
        const botMsg: ChatMessage = {
          id: `msg-model-${Date.now()}`,
          role: 'model',
          content: accumulated.trim(),
          timestamp: Date.now(),
        };
        const subsequent = getSubsequentMessages();
        const finalMessages = [...history, botMsg, ...subsequent];
        setMessages(finalMessages);
        saveChatMessages(character.id, finalMessages);
        setRetryContext(null);
        // Automatically analyze conversation in background for new character memories
        consolidateMemoriesInBackground(finalMessages);
      } else {
        throw new Error('Empty response received from character');
      }
    };

    const executeNonStream = async (): Promise<string> => {
      const payloadMessages = history.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const currentProfile = loadUserProfile();
      const isMemActive = isMemoryEnabledForCharacter(character.id);
      const currentMemories = isMemActive ? loadCharacterMemories(character.id) : [];
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character: {
            name: character.name,
            personality: character.personality,
            background: character.background,
            speakingStyle: character.speakingStyle,
          },
          userProfile: currentProfile,
          characterMemories: currentMemories,
          messages: payloadMessages,
          stream: false,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with status ${res.status}`);
      }

      const data = await res.json();
      if (!data.text || !data.text.trim()) {
        throw new Error('Received empty response from character');
      }
      return data.text.trim();
    };

    try {
      try {
        await executeStream();
      } catch (streamErr: any) {
        console.warn('Stream failed or was interrupted, falling back to direct JSON response:', streamErr?.message || streamErr);
        const text = await executeNonStream();
        const botMsg: ChatMessage = {
          id: `msg-model-${Date.now()}`,
          role: 'model',
          content: text,
          timestamp: Date.now(),
        };
        const subsequent = getSubsequentMessages();
        const finalMessages = [...history, botMsg, ...subsequent];
        setMessages(finalMessages);
        saveChatMessages(character.id, finalMessages);
        setRetryContext(null);
        consolidateMemoriesInBackground(finalMessages);
      }
    } catch (err: any) {
      console.error('Chat generation error after fallback:', err);
      if (replaceAfterIndex !== undefined) {
        // Preserve edited message and subsequent messages in state and storage
        const subsequent = getSubsequentMessages();
        const interimMessages = [...history, ...subsequent];
        setMessages(interimMessages);
        saveChatMessages(character.id, interimMessages);
      }
      if (err.message?.includes('high demand') || err.message?.includes('503')) {
        setError('The character is momentarily busy due to high demand. Please tap Retry in a moment.');
      } else if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        setError('Connection interrupted. Please tap Retry to generate the response.');
      } else {
        setError(err.message || 'Failed to generate response. Please tap Retry.');
      }
    } finally {
      setIsGenerating(false);
      setRegeneratingIndex(null);
      setStreamingContent('');
    }
  };

  // Start editing a message
  const handleStartEdit = (msg: ChatMessage) => {
    if (isGenerating) return;
    setEditingMessageId(msg.id);
    setEditInput(msg.content);
    setOpenMenuId(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditInput('');
  };

  // Save edited message
  const handleSaveEdit = async (msg: ChatMessage, index: number) => {
    const trimmed = editInput.trim();
    if (!trimmed || isGenerating) return;

    if (trimmed === msg.content) {
      // Content unchanged
      setEditingMessageId(null);
      setEditInput('');
      return;
    }

    if (msg.role === 'model') {
      // AI CHARACTER MESSAGE:
      // Update message text without altering character personality, background, or settings
      const updatedMessages = messages.map((m, i) =>
        i === index ? { ...m, content: trimmed } : m
      );
      setMessages(updatedMessages);
      saveChatMessages(character.id, updatedMessages);
      setEditingMessageId(null);
      setEditInput('');
    } else {
      // USER MESSAGE:
      // Update user message and regenerate character response based on the edited message and context
      setEditingMessageId(null);
      setEditInput('');

      const updatedUserMsg: ChatMessage = {
        ...msg,
        content: trimmed,
        timestamp: Date.now(),
      };

      const contextHistory = [...messages.slice(0, index), updatedUserMsg];
      await generateResponse(contextHistory, index, updatedUserMsg);
    }
  };

  // Open delete confirmation modal
  const handleDeleteClick = (msg: ChatMessage, index: number) => {
    if (isGenerating) return;
    setOpenMenuId(null);
    setDeleteTarget({ message: msg, index });
  };

  // Confirm delete message
  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { message, index } = deleteTarget;

    let updated: ChatMessage[];
    if (message.role === 'user') {
      const hasFollowUp = messages[index + 1]?.role === 'model';
      if (hasFollowUp) {
        // Remove both user message and its directly associated character response
        updated = messages.filter((_, i) => i !== index && i !== index + 1);
      } else {
        // Remove only this user message
        updated = messages.filter((_, i) => i !== index);
      }
    } else {
      // Remove only this character message
      updated = messages.filter((_, i) => i !== index);
    }

    setMessages(updated);
    saveChatMessages(character.id, updated);
    setDeleteTarget(null);
    if (editingMessageId === message.id) {
      setEditingMessageId(null);
      setEditInput('');
    }
  };

  // Send message
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    saveChatMessages(character.id, updatedMessages);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await generateResponse(updatedMessages);
  };

  const handleRetry = async () => {
    if (isGenerating) return;
    setError(null);
    if (retryContext) {
      await generateResponse(
        retryContext.history,
        retryContext.replaceIndex,
        retryContext.updatedUserMsg
      );
      return;
    }
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === 'user') {
      await generateResponse(messages);
    } else if (input.trim()) {
      await handleSend();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#070508] text-[#f1edf0] max-w-2xl mx-auto w-full border-x border-[#23141d]/70 relative">
      {/* Top Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-3.5 py-3 bg-[#0d0a0f]/95 backdrop-blur-md border-b border-[#23141d]/80">
        <div className="flex items-center gap-3 min-w-0">
          <button
            id="chat-back-btn"
            type="button"
            onClick={onBack}
            className="p-1.5 -ml-1 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] transition-colors"
            aria-label="Back to conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Character Avatar & Name */}
          <div
            className="flex items-center gap-2.5 min-w-0 cursor-pointer"
            onClick={() => setShowInfoModal(true)}
          >
            <CharacterAvatar
              name={character.name}
              avatarColor={character.avatarColor}
              avatarImage={character.avatarImage}
              shape="curved"
              size="sm"
            />

            <div className="min-w-0">
              <h2 className="font-['Cormorant_Garamond',serif] text-lg font-semibold text-[#fdfcfd] truncate leading-tight flex items-center gap-1.5">
                {character.name}
              </h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#881337] shadow-[0_0_8px_#881337] animate-pulse" />
                <span className="text-[11px] text-[#c08497]/90 font-serif italic">In character</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {/* Memory Bank Button */}
          <button
            id="chat-character-memory-btn"
            type="button"
            onClick={() => setShowMemoryModal(true)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              isMemoryActive
                ? 'bg-[#180f1d] hover:bg-[#221327] text-[#f2cbd7] border-[#3e192c] shadow-[0_0_12px_rgba(136,19,55,0.2)]'
                : 'bg-[#120a15] hover:bg-[#1a101f] text-[#806f7b] border-[#291424]'
            }`}
            title={
              isMemoryActive
                ? `Memory active (${characterMemories.length} saved) - Click to inspect or configure`
                : 'Memory is paused for this character - Click to enable'
            }
            aria-label="Manage Character Memories"
          >
            {isMemoryActive ? (
              <>
                <Brain className="w-3.5 h-3.5 text-[#c08497]" />
                <span className="hidden sm:inline font-serif text-[#f1edf0]">Memory</span>
                <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-[#881337]/60 text-rose-200 font-bold border border-[#881337]/60">
                  {characterMemories.length}
                </span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-[#806f7b]" />
                <span className="text-[10px] text-[#806f7b]">Memory Paused</span>
              </>
            )}
          </button>

          {onOpenUserProfile && (
            <button
              id="chat-user-profile-btn"
              type="button"
              onClick={onOpenUserProfile}
              className="p-2 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] transition-colors"
              title={`My Profile (${userProfile.name || 'User'})`}
              aria-label="Edit My Profile"
            >
              <User className="w-4 h-4" />
            </button>
          )}
          <button
            id="restart-chat-btn"
            type="button"
            onClick={handleRestartChat}
            className="p-2 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] transition-colors"
            title="Restart conversation"
            aria-label="Restart conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            id="character-info-btn"
            type="button"
            onClick={() => {
              setUserProfile(loadUserProfile());
              setShowInfoModal(true);
            }}
            className="p-2 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1a101f] transition-colors"
            title="Character details"
            aria-label="Character details"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, index) => {
          // If regenerating after a user message, temporarily hide the directly following model response that is being replaced
          if (
            isGenerating &&
            regeneratingIndex !== null &&
            index === regeneratingIndex + 1 &&
            msg.role === 'model'
          ) {
            return null;
          }

          const isModel = msg.role === 'model';
          const isEditing = editingMessageId === msg.id;
          const isMenuOpen = openMenuId === msg.id;

          return (
            <React.Fragment key={msg.id}>
              <div
                className={`flex flex-col group ${isModel ? 'items-start' : 'items-end'} relative`}
              >
                <div className="flex items-end gap-2 max-w-[92%] sm:max-w-[85%]">
                  {/* Character avatar badge for model messages */}
                  {isModel && (
                    <CharacterAvatar
                      name={character.name}
                      avatarColor={character.avatarColor}
                      avatarImage={character.avatarImage}
                      shape="curved"
                      size="xs"
                      className="mb-1 shrink-0"
                    />
                  )}

                  <div
                    className={`relative px-4 py-3 rounded-[22px] text-[14px] leading-relaxed transition-all w-full ${
                      isModel
                        ? 'bg-gradient-to-br from-[#160f1b] to-[#120b15] border border-[#321727]/75 text-[#f1edf0] rounded-bl-[4px] shadow-[0_4px_20px_rgba(0,0,0,0.5),0_0_12px_rgba(136,19,55,0.08)]'
                        : 'bg-gradient-to-r from-[#881337] via-[#75112e] to-[#550b1e] border border-[#c08497]/30 text-[#fdfcfd] rounded-br-[4px] shadow-[0_4px_18px_rgba(136,19,55,0.35)]'
                    }`}
                  >
                    {isEditing ? (
                      /* Inline Message Editing */
                      <div className="w-full min-w-[240px] sm:min-w-[320px] max-w-full space-y-2 py-0.5">
                        <div className="flex items-center justify-between text-[11px] pb-1 border-b border-[#35182b]/60">
                          <span className="font-serif italic text-rose-200/90 flex items-center gap-1.5">
                            <Pencil className="w-3 h-3 text-[#c08497]" />
                            {isModel ? `Edit ${character.name}'s Message` : 'Edit Your Message'}
                          </span>
                          {!isModel && (
                            <span className="text-[10px] text-[#c08497]/80 font-sans">
                              Regenerates reply
                            </span>
                          )}
                        </div>

                        <textarea
                          id={`edit-message-textarea-${msg.id}`}
                          value={editInput}
                          onChange={(e) => setEditInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSaveEdit(msg, index);
                            } else if (e.key === 'Escape') {
                              handleCancelEdit();
                            }
                          }}
                          rows={Math.min(Math.max(editInput.split('\n').length, 2), 7)}
                          className="w-full px-3 py-2 text-[14px] leading-relaxed text-[#f1edf0] bg-[#0b070d] border border-[#3e192c] focus:border-[#881337] focus:outline-none rounded-[14px] resize-none font-sans"
                          autoFocus
                        />

                        <div className="flex items-center justify-end gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs text-[#a895a0] hover:text-white bg-[#1a0f1d] hover:bg-[#251228] rounded-[10px] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            id={`save-edit-btn-${msg.id}`}
                            type="button"
                            disabled={!editInput.trim() || isGenerating}
                            onClick={() => handleSaveEdit(msg, index)}
                            className="px-3.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#600e23] hover:from-[#9f1239] disabled:opacity-50 disabled:cursor-not-allowed rounded-[10px] transition-all shadow-sm flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            <span>{isModel ? 'Save' : 'Save & Regenerate'}</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FormattedChatText text={msg.content} />

                        {/* Message Action Menu Trigger (Three-dot) */}
                        <div className="relative inline-block">
                          <button
                            id={`msg-menu-btn-${msg.id}`}
                            type="button"
                            disabled={isGenerating}
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(isMenuOpen ? null : msg.id);
                            }}
                            className={`absolute -top-2 ${
                              isModel ? '-right-2' : '-left-2'
                            } p-1 rounded-full bg-[#1c1020] border border-[#3e192c] text-[#a895a0] hover:text-[#fdfcfd] shadow-md transition-all z-20 disabled:opacity-40 ${
                              isMenuOpen
                                ? 'opacity-100 ring-1 ring-[#881337] border-[#881337]'
                                : 'opacity-70 hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                            }`}
                            title="Message options"
                            aria-label="Message options"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>

                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <>
                              <div
                                className="fixed inset-0 z-30"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(null);
                                }}
                              />
                              <div
                                className={`absolute z-40 top-4 ${
                                  isModel ? 'left-0 sm:-left-2' : 'right-0 sm:-right-2'
                                } min-w-[130px] p-1.5 bg-[#140c17] border border-[#3e192c] rounded-[16px] shadow-[0_12px_36px_rgba(0,0,0,0.95),0_0_16px_rgba(136,19,55,0.25)] flex flex-col gap-0.5`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  id={`edit-msg-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleStartEdit(msg)}
                                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#e2d9df] hover:text-white hover:bg-[#251228] rounded-[10px] transition-colors text-left w-full cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5 text-[#c08497]" />
                                  <span>Edit</span>
                                </button>

                                <button
                                  id={`copy-msg-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleCopy(msg.id, msg.content)}
                                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#e2d9df] hover:text-white hover:bg-[#251228] rounded-[10px] transition-colors text-left w-full cursor-pointer"
                                >
                                  {copiedMessageId === msg.id ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5 text-[#c08497]" />
                                  )}
                                  <span>{copiedMessageId === msg.id ? 'Copied' : 'Copy'}</span>
                                </button>

                                <div className="my-0.5 border-t border-[#291425]" />

                                <button
                                  id={`delete-msg-btn-${msg.id}`}
                                  type="button"
                                  onClick={() => handleDeleteClick(msg, index)}
                                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 rounded-[10px] transition-colors text-left w-full cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <span className="text-[10px] text-[#806f7b] mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* In-place Streaming bubble when regenerating after an edited user message */}
              {isGenerating && regeneratingIndex === index && (
                <div className="flex flex-col items-start mt-2">
                  <div className="flex items-end gap-2 max-w-[86%] sm:max-w-[80%]">
                    <CharacterAvatar
                      name={character.name}
                      avatarColor={character.avatarColor}
                      avatarImage={character.avatarImage}
                      shape="curved"
                      size="xs"
                      className="mb-1"
                    />

                    <div className="px-4 py-3 rounded-[22px] rounded-bl-[4px] bg-gradient-to-br from-[#160f1b] to-[#120b15] border border-[#321727]/75 text-[#f1edf0] text-[14px] leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      {streamingContent ? (
                        <div className="flex items-center gap-1">
                          <FormattedChatText text={streamingContent} />
                          <span className="inline-block w-1.5 h-4 bg-[#c08497] ml-0.5 animate-pulse" />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 py-1">
                          <span className="w-2 h-2 rounded-full bg-[#c08497]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 rounded-full bg-[#c08497]/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 rounded-full bg-[#c08497] animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Real-time Streaming response at end of conversation (for standard new message send) */}
        {isGenerating && regeneratingIndex === null && (
          <div className="flex flex-col items-start">
            <div className="flex items-end gap-2 max-w-[86%] sm:max-w-[80%]">
              <CharacterAvatar
                name={character.name}
                avatarColor={character.avatarColor}
                avatarImage={character.avatarImage}
                shape="curved"
                size="xs"
                className="mb-1"
              />

              <div className="px-4 py-3 rounded-[22px] rounded-bl-[4px] bg-gradient-to-br from-[#160f1b] to-[#120b15] border border-[#321727]/75 text-[#f1edf0] text-[14px] leading-relaxed shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                {streamingContent ? (
                  <div className="flex items-center gap-1">
                    <FormattedChatText text={streamingContent} />
                    <span className="inline-block w-1.5 h-4 bg-[#c08497] ml-0.5 animate-pulse" />
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="w-2 h-2 rounded-full bg-[#c08497]/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#c08497]/80 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#c08497] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-300 bg-[#250d18] border border-[#881337]/50 rounded-[18px]">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="flex-1">{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs font-semibold text-rose-200 underline hover:text-white cursor-pointer px-1 py-0.5"
            >
              Retry
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Area */}
      <div className="sticky bottom-0 p-3 bg-[#0d0a0f]/95 backdrop-blur-md border-t border-[#23141d]/80">
        {/* Subtle Memory Learned Notification */}
        {memoryToast && (
          <div className="mb-2.5 px-3 py-2 bg-[#170e1c] border border-[#881337]/70 rounded-[16px] flex items-center justify-between gap-2 text-xs text-[#f2cbd7] animate-in fade-in slide-in-from-bottom-2 shadow-[0_4px_20px_rgba(136,19,55,0.25)]">
            <div className="flex items-center gap-2 min-w-0">
              {memoryToast.category === 'preference' ? (
                <Coffee className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : memoryToast.category === 'milestone' ? (
                <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : memoryToast.category === 'topic' ? (
                <MessageSquare className="w-3.5 h-3.5 text-pink-400 shrink-0" />
              ) : (
                <Brain className="w-3.5 h-3.5 text-[#c08497] shrink-0" />
              )}
              <span className="truncate">
                <strong className="text-rose-100 font-semibold font-serif">{character.name} remembered:</strong>{' '}
                <span className="text-[#f2cbd7]/90 italic font-light">"{memoryToast.content}"</span>
              </span>
            </div>
            <button
              id="view-new-memory-btn"
              type="button"
              onClick={() => setShowMemoryModal(true)}
              className="px-2 py-0.5 text-[11px] font-semibold text-rose-200 hover:text-white bg-[#881337]/80 hover:bg-[#881337] border border-[#c08497]/40 rounded-md transition-colors shrink-0"
            >
              View
            </button>
          </div>
        )}

        <form
          onSubmit={handleSend}
          className="flex items-end gap-2 bg-[#150e19] border border-[#311729] focus-within:border-[#881337] focus-within:ring-1 focus-within:ring-[#881337]/50 rounded-[22px] p-1.5 transition-all shadow-inner"
        >
          <textarea
            id="chat-message-input"
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isGenerating}
            placeholder={`Message ${character.name}...`}
            className="flex-1 max-h-28 px-3 py-2 bg-transparent text-sm text-[#f1edf0] placeholder-[#806f7b] focus:outline-none resize-none disabled:opacity-60 leading-normal font-sans"
          />

          <button
            id="chat-send-btn"
            type="submit"
            disabled={!input.trim() || isGenerating}
            className="p-2.5 rounded-[16px] bg-gradient-to-r from-[#881337] to-[#550b1e] hover:from-[#9f1239] hover:to-[#680e25] text-white disabled:opacity-30 disabled:hover:from-[#881337] transition-all shrink-0 shadow-[0_2px_14px_rgba(136,19,55,0.4)] active:scale-95"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-rose-100" />
          </button>
        </form>
      </div>

      {/* Character Info Modal Sheet */}
      {showInfoModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full sm:max-w-md max-h-[85vh] flex flex-col bg-[#120b16] border border-[#3e192e] rounded-t-[30px] sm:rounded-[28px] shadow-[0_16px_48px_rgba(0,0,0,0.9),0_0_32px_rgba(136,19,55,0.2)] overflow-hidden animate-in fade-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-[#2d1627] bg-[#160d1b]">
              <div className="flex items-center gap-3">
                <CharacterAvatar
                  name={character.name}
                  avatarColor={character.avatarColor}
                  avatarImage={character.avatarImage}
                  shape="curved"
                  size="md"
                />
                <div>
                  <h3 className="font-['Cormorant_Garamond',serif] text-xl font-semibold text-[#fdfcfd] leading-tight">
                    {character.name}
                  </h3>
                  <span className="text-[11px] font-serif italic text-[#c08497]/90">Companion Persona</span>
                </div>
              </div>

              <button
                id="close-info-modal-btn"
                onClick={() => setShowInfoModal(false)}
                className="p-2 rounded-xl text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#201224] transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Persona Details */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {/* Character Memory Bank Section */}
              <div className="p-3 bg-[#180f1e] rounded-[18px] border border-[#35182b] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#881337]/30 text-rose-300 flex items-center justify-center font-bold text-xs">
                    <Brain className="w-4 h-4 text-[#c08497]" />
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a895a0] block font-medium">Character Memory</span>
                    <span className="text-xs font-semibold text-[#f1edf0]">
                      {characterMemories.length} {characterMemories.length === 1 ? 'saved memory' : 'saved memories'}
                    </span>
                  </div>
                </div>
                <button
                  id="info-modal-manage-memories-btn"
                  onClick={() => {
                    setShowInfoModal(false);
                    setShowMemoryModal(true);
                  }}
                  className="text-[11px] font-semibold text-rose-200 hover:text-white px-2.5 py-1 rounded-[12px] bg-[#881337]/40 hover:bg-[#881337]/70 border border-[#881337]/60 transition-colors"
                >
                  Manage Memory
                </button>
              </div>

              {/* User Persona Context Notice */}
              <div className="p-3 bg-[#180f1e] rounded-[18px] border border-[#35182b] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#881337]/30 text-rose-300 flex items-center justify-center font-bold text-xs">
                    {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#a895a0] block font-medium">Roleplaying As</span>
                    <span className="text-xs font-semibold text-[#f1edf0]">{userProfile.name || 'Traveler'}</span>
                  </div>
                </div>
                {onOpenUserProfile && (
                  <button
                    id="info-modal-edit-my-profile-btn"
                    onClick={() => {
                      setShowInfoModal(false);
                      onOpenUserProfile();
                    }}
                    className="text-[11px] font-semibold text-rose-200 hover:text-white px-2.5 py-1 rounded-[12px] bg-[#881337]/40 hover:bg-[#881337]/70 border border-[#881337]/60 transition-colors"
                  >
                    Edit Profile
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-[#c08497] uppercase tracking-wider text-[10px]">
                  Personality
                </h4>
                <p className="text-[#f1edf0] leading-relaxed bg-[#170e1c] p-3 rounded-[16px] border border-[#311729]">
                  {character.personality}
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-[#c08497] uppercase tracking-wider text-[10px]">
                  Background & Lore
                </h4>
                <p className="text-[#f1edf0] leading-relaxed bg-[#170e1c] p-3 rounded-[16px] border border-[#311729]">
                  {character.background}
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-[#c08497] uppercase tracking-wider text-[10px]">
                  Speaking Style
                </h4>
                <p className="text-[#f1edf0] leading-relaxed bg-[#170e1c] p-3 rounded-[16px] border border-[#311729]">
                  {character.speakingStyle}
                </p>
              </div>

              <div className="space-y-1">
                <h4 className="font-semibold text-[#c08497] uppercase tracking-wider text-[10px]">
                  Greeting Message
                </h4>
                <p className="text-[#f1edf0] italic leading-relaxed bg-[#170e1c] p-3 rounded-[16px] border border-[#311729] font-serif">
                  {character.greeting}
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 border-t border-[#2d1627] flex items-center justify-between gap-3 bg-[#110a14]">
              <button
                id="modal-edit-character-btn"
                onClick={() => {
                  setShowInfoModal(false);
                  onEditCharacter(character);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[16px] text-xs font-semibold bg-[#221326] hover:bg-[#2c1831] text-[#f1edf0] border border-[#3f1a30] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-[#c08497]" />
                Edit Companion
              </button>

              <button
                id="modal-clear-chat-btn"
                onClick={() => {
                  setShowInfoModal(false);
                  handleRestartChat();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-[16px] text-xs font-semibold bg-[#2e0e1d] hover:bg-[#3d1226] text-rose-200 border border-[#881337]/50 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
                Restart Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Character Memory Modal */}
      <CharacterMemoryModal
        character={character}
        isOpen={showMemoryModal}
        onClose={() => {
          setShowMemoryModal(false);
          setIsMemoryActive(isMemoryEnabledForCharacter(character.id));
          setCharacterMemories(loadCharacterMemories(character.id));
        }}
        onMemoriesUpdated={(updated) => setCharacterMemories(updated)}
      />

      {/* Message Deletion Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="w-full max-w-sm rounded-[24px] bg-gradient-to-b from-[#170e1b] to-[#0f0913] border border-[#3e192c] shadow-[0_16px_40px_rgba(0,0,0,0.9),0_0_24px_rgba(136,19,55,0.25)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-300">
                <Trash2 className="w-4 h-4 text-rose-400" />
                <h3 className="font-serif text-[16px] font-medium text-[#fdfcfd]">
                  {deleteTarget.message.role === 'user' ? 'Delete Message' : `Delete ${character.name}'s Message`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="p-1 rounded-full text-[#806f7b] hover:text-[#fdfcfd] hover:bg-[#251228] transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-[16px] bg-[#0c080e] border border-[#2d1425] text-xs text-[#d1c7ce] italic line-clamp-3 leading-relaxed">
              "{deleteTarget.message.content}"
            </div>

            <p className="text-xs text-[#a895a0] leading-relaxed">
              {deleteTarget.message.role === 'user'
                ? messages[deleteTarget.index + 1]?.role === 'model'
                  ? `This will remove your message and ${character.name}'s directly associated response. The rest of the conversation will be kept.`
                  : 'This will remove this message from your conversation.'
                : `This will permanently remove this response. ${character.name}'s personality and profile will remain unchanged.`}
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-xs text-[#cfc2cc] hover:text-white bg-[#1a0f1d] hover:bg-[#251228] rounded-[14px] transition-colors"
              >
                Cancel
              </button>
              <button
                id="confirm-delete-message-btn"
                type="button"
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#550b1e] hover:from-[#9f1239] hover:to-[#6b0f27] rounded-[14px] shadow-sm transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
