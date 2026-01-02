/**
 * LEO Webchat Plugin - Memory L3 (Semantic Memory)
 *
 * Plugin for visualizing semantic memory (L3) which stores
 * user facts, preferences, and context extracted from conversations.
 */

import React, { useState, useMemo } from 'react';
import type {
  Plugin,
  PluginPanelProps,
  PluginMessageProps,
  PluginIconProps,
} from '../core/types';

/**
 * Memory fact structure
 */
export interface MemoryFact {
  /** Unique fact ID */
  id: string;
  /** Fact content */
  content: string;
  /** Fact category */
  category: MemoryCategory;
  /** Confidence score (0-1) */
  confidence: number;
  /** Source message or conversation */
  source?: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last accessed timestamp */
  lastAccessed?: Date;
  /** Access count */
  accessCount: number;
  /** Related facts IDs */
  relatedFacts?: string[];
  /** Embedding vector (for similarity) */
  embedding?: number[];
}

/**
 * Memory categories
 */
export type MemoryCategory =
  | 'preference'
  | 'fact'
  | 'context'
  | 'relationship'
  | 'event'
  | 'skill'
  | 'goal';

/**
 * Memory search result
 */
export interface MemorySearchResult {
  fact: MemoryFact;
  score: number;
}

/**
 * Memory L3 data for message rendering
 */
export interface MemoryL3MessageData {
  /** Referenced facts in this message */
  referencedFacts?: MemoryFact[];
  /** New facts extracted */
  extractedFacts?: MemoryFact[];
  /** Memory search query */
  searchQuery?: string;
  /** Search results */
  searchResults?: MemorySearchResult[];
}

/**
 * Category colors and labels
 */
const CATEGORY_CONFIG: Record<MemoryCategory, { color: string; bgColor: string; label: string }> = {
  preference: {
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-100 dark:bg-pink-900/30',
    label: 'Preferenza',
  },
  fact: {
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Fatto',
  },
  context: {
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    label: 'Contesto',
  },
  relationship: {
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    label: 'Relazione',
  },
  event: {
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    label: 'Evento',
  },
  skill: {
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
    label: 'Competenza',
  },
  goal: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    label: 'Obiettivo',
  },
};

/**
 * Memory L3 icon component
 */
function MemoryIcon({ size = 20, className = '' }: PluginIconProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M12 14a8 8 0 0 1 8 8H4a8 8 0 0 1 8-8z" />
      <circle cx="12" cy="10" r="2" fill="currentColor" />
      <path d="M7 6.5c-1.5 1-2 3-2 5" />
      <path d="M17 6.5c1.5 1 2 3 2 5" />
    </svg>
  );
}

/**
 * Confidence indicator component
 */
function ConfidenceBar({ value }: { value: number }): JSX.Element {
  const percentage = Math.round(value * 100);
  const colorClass =
    value >= 0.8
      ? 'bg-green-500'
      : value >= 0.5
      ? 'bg-yellow-500'
      : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{percentage}%</span>
    </div>
  );
}

/**
 * Category badge component
 */
function CategoryBadge({ category }: { category: MemoryCategory }): JSX.Element {
  const config = CATEGORY_CONFIG[category];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}
    >
      {config.label}
    </span>
  );
}

/**
 * Single fact card component
 */
function FactCard({
  fact,
  compact = false,
  onSelect,
}: {
  fact: MemoryFact;
  compact?: boolean;
  onSelect?: (fact: MemoryFact) => void;
}): JSX.Element {
  return (
    <div
      className={`p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 ${
        onSelect ? 'cursor-pointer hover:border-blue-500 transition-colors' : ''
      }`}
      onClick={() => onSelect?.(fact)}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <CategoryBadge category={fact.category} />
        {!compact && (
          <span className="text-xs text-gray-400">
            {new Date(fact.createdAt).toLocaleDateString('it-IT')}
          </span>
        )}
      </div>
      <p className={`text-sm text-gray-700 dark:text-gray-300 ${compact ? 'line-clamp-2' : ''}`}>
        {fact.content}
      </p>
      {!compact && (
        <div className="mt-2">
          <ConfidenceBar value={fact.confidence} />
        </div>
      )}
      {!compact && fact.accessCount > 0 && (
        <p className="mt-2 text-xs text-gray-400">
          Acceduto {fact.accessCount} volt{fact.accessCount === 1 ? 'a' : 'e'}
        </p>
      )}
    </div>
  );
}

/**
 * Memory L3 panel component
 */
function MemoryL3Panel({ plugin, onClose }: PluginPanelProps): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory | 'all'>('all');
  const [selectedFact, setSelectedFact] = useState<MemoryFact | null>(null);

  // Mock data for demonstration
  const [facts] = useState<MemoryFact[]>([
    {
      id: '1',
      content: 'Preferisce comunicazioni brevi e dirette',
      category: 'preference',
      confidence: 0.92,
      createdAt: new Date(Date.now() - 86400000 * 5),
      accessCount: 12,
    },
    {
      id: '2',
      content: 'Lavora nel settore IT come developer',
      category: 'fact',
      confidence: 0.88,
      createdAt: new Date(Date.now() - 86400000 * 10),
      accessCount: 8,
    },
    {
      id: '3',
      content: 'Interessato a soluzioni di automazione',
      category: 'goal',
      confidence: 0.75,
      createdAt: new Date(Date.now() - 86400000 * 3),
      accessCount: 5,
    },
    {
      id: '4',
      content: 'Ha esperienza con Python e React',
      category: 'skill',
      confidence: 0.95,
      createdAt: new Date(Date.now() - 86400000 * 7),
      accessCount: 15,
    },
    {
      id: '5',
      content: 'Riunione settimanale il martedi alle 10:00',
      category: 'event',
      confidence: 0.82,
      createdAt: new Date(Date.now() - 86400000 * 2),
      accessCount: 3,
    },
    {
      id: '6',
      content: 'Collabora frequentemente con il team marketing',
      category: 'relationship',
      confidence: 0.68,
      createdAt: new Date(Date.now() - 86400000 * 8),
      accessCount: 6,
    },
  ]);

  // Filter facts based on search and category
  const filteredFacts = useMemo(() => {
    return facts.filter((fact) => {
      const matchesSearch =
        !searchQuery || fact.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || fact.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [facts, searchQuery, selectedCategory]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: facts.length };
    facts.forEach((fact) => {
      counts[fact.category] = (counts[fact.category] || 0) + 1;
    });
    return counts;
  }, [facts]);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <MemoryIcon size={18} />
          <span className="font-medium text-gray-900 dark:text-white">{plugin.name}</span>
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded">
            L3
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca nella memoria..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Category Filter */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
            }`}
          >
            Tutti ({categoryCounts.all})
          </button>
          {(Object.keys(CATEGORY_CONFIG) as MemoryCategory[]).map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? `${CATEGORY_CONFIG[category].bgColor} ${CATEGORY_CONFIG[category].color}`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
              }`}
            >
              {CATEGORY_CONFIG[category].label} ({categoryCounts[category] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Facts List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredFacts.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <MemoryIcon size={48} className="mx-auto mb-4 opacity-50" />
            <p>Nessun fatto trovato</p>
            <p className="text-sm mt-1">
              {searchQuery
                ? 'Prova a modificare la ricerca'
                : 'I fatti verranno estratti dalle conversazioni'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFacts.map((fact) => (
              <FactCard key={fact.id} fact={fact} onSelect={setSelectedFact} />
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{facts.length} fatti memorizzati</span>
          <span>
            Confidenza media:{' '}
            {Math.round((facts.reduce((sum, f) => sum + f.confidence, 0) / facts.length) * 100)}%
          </span>
        </div>
      </div>

      {/* Fact Detail Modal */}
      {selectedFact && (
        <div
          className="absolute inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedFact(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <CategoryBadge category={selectedFact.category} />
              <button
                onClick={() => setSelectedFact(null)}
                className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-900 dark:text-white mb-4">{selectedFact.content}</p>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-1">Confidenza</p>
                <ConfidenceBar value={selectedFact.confidence} />
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-gray-500">Creato</p>
                  <p className="text-gray-700 dark:text-gray-300">
                    {new Date(selectedFact.createdAt).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Accessi</p>
                  <p className="text-gray-700 dark:text-gray-300">{selectedFact.accessCount}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memory L3 in-message component
 */
function MemoryL3InMessage({ data, isStreaming }: PluginMessageProps): JSX.Element | null {
  const memoryData = data as MemoryL3MessageData;

  if (!memoryData) return null;

  const hasReferencedFacts = memoryData.referencedFacts && memoryData.referencedFacts.length > 0;
  const hasExtractedFacts = memoryData.extractedFacts && memoryData.extractedFacts.length > 0;
  const hasSearchResults = memoryData.searchResults && memoryData.searchResults.length > 0;

  if (!hasReferencedFacts && !hasExtractedFacts && !hasSearchResults) return null;

  return (
    <div className="my-2 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-2 text-sm font-medium text-purple-700 dark:text-purple-300">
        <MemoryIcon size={16} />
        <span>Memory L3</span>
        {isStreaming && <span className="animate-pulse text-purple-500">processing...</span>}
      </div>

      {/* Referenced Facts */}
      {hasReferencedFacts && (
        <div className="mb-3">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
            Fatti utilizzati:
          </p>
          <div className="space-y-1">
            {memoryData.referencedFacts!.slice(0, 3).map((fact) => (
              <div
                key={fact.id}
                className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded text-sm"
              >
                <CategoryBadge category={fact.category} />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                  {fact.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Extracted Facts */}
      {hasExtractedFacts && (
        <div className="mb-3">
          <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
            Nuovi fatti estratti:
          </p>
          <div className="space-y-1">
            {memoryData.extractedFacts!.map((fact) => (
              <div
                key={fact.id}
                className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded text-sm border border-green-200 dark:border-green-800"
              >
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <CategoryBadge category={fact.category} />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                  {fact.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {hasSearchResults && (
        <div>
          {memoryData.searchQuery && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
              Ricerca: "{memoryData.searchQuery}"
            </p>
          )}
          <div className="space-y-1">
            {memoryData.searchResults!.slice(0, 5).map((result) => (
              <div
                key={result.fact.id}
                className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded text-sm"
              >
                <span className="text-xs text-gray-400 w-8">
                  {Math.round(result.score * 100)}%
                </span>
                <CategoryBadge category={result.fact.category} />
                <span className="text-gray-700 dark:text-gray-300 truncate flex-1">
                  {result.fact.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Memory L3 Plugin Definition
 */
export const MemoryL3Plugin: Plugin = {
  id: 'leo.memory.l3',
  type: 'memory',
  name: 'Semantic Memory',
  version: '1.0.0',
  description: 'Visualize and manage semantic memory (L3) - user facts, preferences, and contextual knowledge extracted from conversations.',

  meta: {
    author: 'LEO Platform',
    keywords: ['memory', 'semantic', 'facts', 'context', 'L3'],
  },

  capabilities: {
    hasPanel: true,
    hasMessageRenderer: true,
    hasConfig: false,
    requiresAuth: false,
  },

  renderIcon: (props) => <MemoryIcon {...props} />,

  renderPanel: (props) => <MemoryL3Panel {...props} />,

  renderInMessage: (props) => <MemoryL3InMessage {...props} />,

  onActivate: () => {
    console.log('[MemoryL3Plugin] Activated');
  },

  onDeactivate: () => {
    console.log('[MemoryL3Plugin] Deactivated');
  },
};

export default MemoryL3Plugin;
