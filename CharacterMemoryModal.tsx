import React, { useState, useEffect } from 'react';
import {
  Brain,
  Trash2,
  Plus,
  Sparkles,
  X,
  Bookmark,
  Heart,
  Shield,
  Lightbulb,
  Edit2,
  Coffee,
  MessageSquare,
  Lock,
  EyeOff,
  Eye,
  Info,
  Flame,
  Smile,
} from 'lucide-react';
import { Character, CharacterMemoryItem, MemoryCategory } from '../types';
import {
  loadCharacterMemories,
  addCharacterMemory,
  updateCharacterMemory,
  deleteCharacterMemory,
  clearCharacterMemories,
  isMemoryEnabledForCharacter,
  toggleCharacterMemory,
} from '../storage';
import { CharacterAvatar } from './CharacterAvatar';

interface CharacterMemoryModalProps {
  character: Character;
  isOpen: boolean;
  onClose: () => void;
  onMemoriesUpdated?: (memories: CharacterMemoryItem[]) => void;
}

export const CharacterMemoryModal: React.FC<CharacterMemoryModalProps> = ({
  character,
  isOpen,
  onClose,
  onMemoriesUpdated,
}) => {
  const [memories, setMemories] = useState<CharacterMemoryItem[]>([]);
  const [isMemoryActive, setIsMemoryActive] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('preference');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Inline editing states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<MemoryCategory>('preference');

  // Load memories and character toggle when opened
  useEffect(() => {
    if (isOpen) {
      const loaded = loadCharacterMemories(character.id);
      setMemories(loaded);
      setIsMemoryActive(isMemoryEnabledForCharacter(character.id));
      setIsAdding(false);
      setNewContent('');
      setEditingId(null);
      setConfirmClearAll(false);
      setDeleteConfirmId(null);
    }
  }, [isOpen, character.id]);

  if (!isOpen) return null;

  const handleToggleMemoryActive = () => {
    const nextState = !isMemoryActive;
    setIsMemoryActive(nextState);
    toggleCharacterMemory(character.id, nextState);
  };

  const handleAddMemory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const created = addCharacterMemory(character.id, newContent.trim(), newCategory);
    const updated = [created, ...memories.filter((m) => m.id !== created.id)];
    setMemories(updated);
    setNewContent('');
    setIsAdding(false);
    onMemoriesUpdated?.(updated);
  };

  const handleStartEdit = (item: CharacterMemoryItem) => {
    setEditingId(item.id);
    setEditContent(item.content);
    setEditCategory(item.category || 'preference');
    setDeleteConfirmId(null);
  };

  const handleSaveEdit = (id: string) => {
    if (!editContent.trim()) return;
    updateCharacterMemory(character.id, id, editContent.trim(), editCategory);
    const updated = memories.map((m) =>
      m.id === id ? { ...m, content: editContent.trim(), category: editCategory } : m
    );
    setMemories(updated);
    setEditingId(null);
    onMemoriesUpdated?.(updated);
  };

  const handleDeleteMemory = (id: string) => {
    deleteCharacterMemory(character.id, id);
    const updated = memories.filter((m) => m.id !== id);
    setMemories(updated);
    setDeleteConfirmId(null);
    onMemoriesUpdated?.(updated);
  };

  const handleClearAll = () => {
    clearCharacterMemories(character.id);
    setMemories([]);
    setConfirmClearAll(false);
    onMemoriesUpdated?.([]);
  };

  const getCategoryBadge = (category?: MemoryCategory) => {
    switch (category) {
      case 'preference':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#2a1723] text-[#e0cfd8] border border-[#481d36]">
            <Coffee className="w-2.5 h-2.5 text-[#c08497]" />
            Preference
          </span>
        );
      case 'milestone':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#320f1e] text-rose-200 border border-[#881337]/60 shadow-[0_0_8px_rgba(136,19,55,0.25)]">
            <Sparkles className="w-2.5 h-2.5 text-rose-300" />
            Milestone
          </span>
        );
      case 'topic':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#251020] text-[#c08497] border border-[#3e1832]">
            <MessageSquare className="w-2.5 h-2.5 text-[#c08497]" />
            Topic
          </span>
        );
      case 'relationship':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#3b1222] text-rose-200 border border-[#881337]/50">
            <Heart className="w-2.5 h-2.5 text-rose-300" />
            Bond
          </span>
        );
      case 'promise':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1a101f] text-[#d1d5db] border border-[#381a30]">
            <Lock className="w-2.5 h-2.5 text-[#c08497]" />
            Secret
          </span>
        );
      case 'conflict':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#2e101b] text-rose-300 border border-rose-900/60">
            <Flame className="w-2.5 h-2.5 text-rose-400" />
            Conflict
          </span>
        );
      case 'joke':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#261622] text-[#e0cfd8] border border-[#48223c]">
            <Smile className="w-2.5 h-2.5 text-[#c08497]" />
            Joke
          </span>
        );
      case 'fact':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#281329] text-rose-200 border border-[#4a1c41]">
            <Lightbulb className="w-2.5 h-2.5 text-[#c08497]" />
            Fact
          </span>
        );
      case 'event':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#180e1a] text-[#a895a0] border border-[#2b1527]">
            <Bookmark className="w-2.5 h-2.5 text-[#a895a0]" />
            Moment
          </span>
        );
    }
  };

  const preferenceCount = memories.filter((m) => m.category === 'preference').length;
  const milestoneCount = memories.filter((m) => m.category === 'milestone').length;
  const topicCount = memories.filter((m) => m.category === 'topic').length;
  const bondCount = memories.filter(
    (m) => m.category === 'relationship' || m.category === 'promise'
  ).length;

  const filteredMemories = memories.filter((m) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'preference') return m.category === 'preference';
    if (selectedFilter === 'milestone') return m.category === 'milestone';
    if (selectedFilter === 'topic') return m.category === 'topic';
    if (selectedFilter === 'bond')
      return m.category === 'relationship' || m.category === 'promise';
    return m.category === selectedFilter;
  });

  const sampleSuggestions = [
    { text: 'Prefers quiet candlelit rooms and hot black tea', category: 'preference' as MemoryCategory },
    { text: 'Shared a quiet secret during a midnight rainstorm', category: 'milestone' as MemoryCategory },
    { text: 'Fascinated by ancient poetry and celestial charts', category: 'topic' as MemoryCategory },
  ];

  return (
    <div
      id="character-memory-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="character-memory-modal-container"
        className="relative w-full max-w-xl max-h-[92vh] flex flex-col bg-[#0d0811] border border-[#35172d] rounded-[28px] shadow-[0_16px_50px_rgba(0,0,0,0.85)] overflow-hidden"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#291325] bg-gradient-to-r from-[#140d18] via-[#0f0913] to-[#160e1b]">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative">
              <CharacterAvatar
                name={character.name}
                avatarColor={character.avatarColor}
                avatarImage={character.avatarImage}
                shape="curved"
                size="md"
              />
              <div
                className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0d0811] ${
                  isMemoryActive ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-[#3a2533]'
                }`}
                title={isMemoryActive ? 'Memory system active' : 'Memory paused'}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-['Cormorant_Garamond',serif] text-lg font-semibold text-[#fdfcfd] tracking-wide truncate">
                  {character.name}
                </h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-[#240e1b] text-rose-300 border border-[#881337]/50 shrink-0">
                  <Brain className="w-2.5 h-2.5 text-[#c08497]" />
                  Memory Vault
                </span>
              </div>
              <p className="text-[11px] font-serif italic text-[#c08497]/80 truncate">
                {memories.length} {memories.length === 1 ? 'preserved memory' : 'preserved memories'} • {isMemoryActive ? 'Active in dialogue' : 'Memory paused'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Memory Active Toggle */}
            <button
              id="toggle-character-memory-btn"
              type="button"
              onClick={handleToggleMemoryActive}
              className={`px-3 py-1 rounded-[14px] text-xs font-medium border transition-all flex items-center gap-1.5 ${
                isMemoryActive
                  ? 'bg-[#250f1c] border-[#881337]/60 text-rose-200 hover:bg-[#321225]'
                  : 'bg-[#150d18] border-[#291325] text-[#806f7b] hover:text-[#fdfcfd]'
              }`}
              title={isMemoryActive ? 'Click to pause memories for this companion' : 'Click to enable memories for this companion'}
            >
              {isMemoryActive ? (
                <>
                  <Eye className="w-3 h-3 text-[#c08497]" />
                  <span className="text-[10px]">Active</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-[#806f7b]" />
                  <span className="text-[10px]">Paused</span>
                </>
              )}
            </button>

            <button
              id="close-memory-modal-btn"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[12px] text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1b0f1e] transition-colors shrink-0"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Privacy Transparency Banner */}
        <div className="px-4 py-2 bg-[#120a15] border-b border-[#251020] flex items-center justify-between gap-2 text-[11px] text-[#a895a0]">
          <div className="flex items-center gap-1.5 min-w-0">
            <Shield className="w-3.5 h-3.5 text-[#c08497] shrink-0" />
            <span className="truncate font-sans">
              <strong className="text-[#f1edf0] font-normal">Private Vault:</strong> Resides solely within your local device. Referenced naturally during intimate conversations.
            </span>
          </div>
          <span className="text-[10px] text-[#c08497] shrink-0 font-serif italic">
            Zero cloud storage
          </span>
        </div>

        {/* Categories Bar & Add Trigger */}
        <div className="px-4 py-2.5 border-b border-[#23101e] bg-[#0c070e] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-0.5 no-scrollbar">
            {[
              { id: 'all', label: `All (${memories.length})` },
              { id: 'preference', label: `Preferences (${preferenceCount})` },
              { id: 'milestone', label: `Milestones (${milestoneCount})` },
              { id: 'topic', label: `Topics (${topicCount})` },
              { id: 'bond', label: `Bonds (${bondCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilter(tab.id)}
                className={`px-3 py-1 rounded-[14px] text-xs font-medium transition-all whitespace-nowrap ${
                  selectedFilter === tab.id
                    ? 'bg-gradient-to-r from-[#881337] to-[#600e23] text-white border border-[#c08497]/40 shadow-[0_2px_10px_rgba(136,19,55,0.3)]'
                    : 'bg-[#150d18] text-[#a895a0] hover:text-[#fdfcfd] hover:bg-[#1d1020] border border-[#2b1527]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            id="add-memory-toggle-btn"
            type="button"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#881337] to-[#680e25] hover:from-[#9f1239] border border-[#c08497]/30 rounded-[14px] transition-all shadow-sm shrink-0 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAdding ? 'Cancel' : 'Add Memory'}</span>
          </button>
        </div>

        {/* Add Memory Form */}
        {isAdding && (
          <form
            onSubmit={handleAddMemory}
            className="p-4 bg-[#140d18] border-b border-[#2e1528] animate-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-semibold text-rose-200 flex items-center gap-1.5 font-serif">
                <Brain className="w-3.5 h-3.5 text-[#c08497]" />
                Record Memory for {character.name}
              </h4>
              <span className="text-[10px] text-[#806f7b] font-serif italic">From companion's lived perspective</span>
            </div>

            {/* Quick pre-fill suggestions */}
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <span className="text-[10px] text-[#806f7b] flex items-center gap-1 self-center">
                <Info className="w-2.5 h-2.5 text-[#c08497]" /> Quick examples:
              </span>
              {sampleSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewContent(s.text);
                    setNewCategory(s.category);
                  }}
                  className="px-2.5 py-1 rounded-[10px] text-[10px] bg-[#1a0f1d] hover:bg-[#251228] text-[#c08497] hover:text-white border border-[#34162a] transition-colors"
                >
                  +{s.category}: {s.text.substring(0, 32)}...
                </button>
              ))}
            </div>

            <textarea
              id="new-memory-input"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="e.g., User mentioned they prefer candlelit evenings and hot chamomile tea; felt comfortable opening up about their quiet past."
              rows={3}
              className="w-full px-3.5 py-2 text-xs text-[#f1edf0] bg-[#0c080f] border border-[#2e1528] rounded-[16px] focus:outline-none focus:border-[#881337] focus:ring-1 focus:ring-[#881337]/50 placeholder-[#806f7b] resize-none mb-2.5"
              autoFocus
            />

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-[#a895a0] font-medium">Category:</span>
                <select
                  id="new-memory-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
                  className="px-3 py-1.5 text-xs bg-[#0c080f] border border-[#2e1528] text-[#f1edf0] rounded-[12px] focus:outline-none focus:border-[#881337]"
                >
                  <option value="preference">User Preference (Likes, Habits)</option>
                  <option value="milestone">Relationship Milestone (Intimacy, Turning Point)</option>
                  <option value="relationship">Relationship Development / Dynamic</option>
                  <option value="event">Important Event / Shared Experience</option>
                  <option value="fact">Important Fact Revealed</option>
                  <option value="promise">Promise / Secret</option>
                  <option value="conflict">Conflict / Tension / Resolved Disagreement</option>
                  <option value="joke">Inside Joke / Shared Humor</option>
                  <option value="topic">Favorite Topic</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-3 py-1.5 text-xs text-[#a895a0] hover:text-white bg-[#1a0f1d] hover:bg-[#251228] rounded-[12px] transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="save-new-memory-btn"
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#600e23] hover:from-[#9f1239] disabled:opacity-50 disabled:cursor-not-allowed rounded-[14px] transition-all shadow-sm"
                >
                  Preserve Memory
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Memory Content List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
          {filteredMemories.length === 0 ? (
            <div className="py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-[18px] bg-[#170e1b] border border-[#32172a] flex items-center justify-center mx-auto mb-3 text-[#c08497]">
                <Brain className="w-6 h-6" />
              </div>
              <h4 className="font-['Cormorant_Garamond',serif] text-base font-semibold text-[#fdfcfd] mb-1">
                {memories.length === 0 ? 'No Memories Preserved Yet' : 'No Memories in this Filter'}
              </h4>
              <p className="text-xs text-[#806f7b] max-w-sm mx-auto mb-4 leading-relaxed font-serif italic">
                {memories.length === 0
                  ? `As you converse with ${character.name}, key preferences, intimate milestones, and shared topics are naturally preserved.`
                  : 'Try selecting "All" or a different category to view other records.'}
              </p>
              {memories.length === 0 && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-rose-200 hover:text-white bg-[#220e1a] hover:bg-[#321226] border border-[#881337]/50 rounded-[14px] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-[#c08497]" />
                  Preserve First Memory
                </button>
              )}
            </div>
          ) : (
            filteredMemories.map((item) => {
              const isEditing = editingId === item.id;
              const isConfirmingDelete = deleteConfirmId === item.id;
              const dateLabel = new Date(item.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              });

              if (isEditing) {
                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-[#170e1c] border border-[#881337]/60 rounded-[18px] space-y-2.5 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-rose-300 font-medium">Edit Memory</span>
                      <select
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value as MemoryCategory)}
                        className="px-2.5 py-1 text-xs bg-[#0c080f] border border-[#35172d] text-zinc-200 rounded-[10px] focus:outline-none"
                      >
                        <option value="preference">User Preference</option>
                        <option value="milestone">Milestone</option>
                        <option value="relationship">Relationship Development</option>
                        <option value="event">Important Event</option>
                        <option value="fact">Important Fact</option>
                        <option value="promise">Promise / Secret</option>
                        <option value="conflict">Conflict / Tension</option>
                        <option value="joke">Joke / Humor</option>
                        <option value="topic">Favorite Topic</option>
                      </select>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 text-xs text-[#f1edf0] bg-[#0c080f] border border-[#2b1527] rounded-[12px] focus:outline-none focus:border-[#881337] resize-none"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 text-xs text-[#a895a0] hover:text-white bg-[#1a0f1d] rounded-[10px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEdit(item.id)}
                        className="px-3.5 py-1 text-xs font-semibold text-white bg-gradient-to-r from-[#881337] to-[#600e23] hover:from-[#9f1239] rounded-[10px]"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={item.id}
                  id={`memory-card-${item.id}`}
                  className="p-3.5 bg-[#130b16] hover:bg-[#180e1b] border border-[#2a1426] hover:border-[#881337]/50 rounded-[18px] transition-all flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getCategoryBadge(item.category)}
                      <span className="text-[10px] text-[#806f7b] font-serif italic">{dateLabel}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(item)}
                        className="p-1.5 text-[#806f7b] hover:text-[#fdfcfd] hover:bg-[#251020] rounded-[10px] transition-colors"
                        title="Edit memory"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>

                      {/* Delete Actions */}
                      {isConfirmingDelete ? (
                        <div className="flex items-center gap-1.5 animate-in fade-in">
                          <span className="text-[10px] text-rose-300 font-medium">Delete?</span>
                          <button
                            id={`confirm-delete-memory-${item.id}`}
                            type="button"
                            onClick={() => handleDeleteMemory(item.id)}
                            className="px-2.5 py-0.5 text-[10px] font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-md transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2.5 py-0.5 text-[10px] text-[#a895a0] hover:text-white bg-[#1a0f1d] rounded-md transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`delete-memory-btn-${item.id}`}
                          type="button"
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-[#806f7b] hover:text-rose-400 hover:bg-[#251020] rounded-[10px] transition-colors"
                          title="Delete memory"
                          aria-label="Delete this memory"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-[#f1edf0] leading-relaxed break-words font-sans">
                    {item.content}
                  </p>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-[#291325] bg-[#110a14] flex flex-wrap items-center justify-between gap-2">
          {/* Clear all memories option */}
          {memories.length > 0 && (
            <div>
              {confirmClearAll ? (
                <div className="flex items-center gap-2 animate-in fade-in">
                  <span className="text-xs text-rose-300 font-medium">
                    Clear all memories for {character.name}?
                  </span>
                  <button
                    id="confirm-clear-all-memories-btn"
                    type="button"
                    onClick={handleClearAll}
                    className="px-3 py-1 text-xs font-bold text-white bg-rose-700 hover:bg-rose-600 rounded-md transition-colors"
                  >
                    Yes, Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="px-3 py-1 text-xs text-[#a895a0] hover:text-white bg-[#1a0f1d] rounded-md transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  id="clear-all-memories-btn"
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-[#806f7b] hover:text-rose-300 hover:bg-[#200e1b] rounded-[12px] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Memories</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              id="close-memory-modal-bottom-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#f1edf0] hover:text-white bg-gradient-to-r from-[#881337] to-[#600e23] hover:from-[#9f1239] border border-[#c08497]/30 rounded-[14px] transition-all shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
