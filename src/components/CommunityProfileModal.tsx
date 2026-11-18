import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Check, ArrowDownToLine, Share2 } from 'lucide-react';
import { COMMUNITY_PROFILES, type CommunityProfile } from '../communityProfiles';
import type { ProfileData } from '../presetLibrary';

export interface CommunityProfileModalProps {
  open: boolean;
  onClose: () => void;
  onInstallProfile: (profile: CommunityProfile) => void;
  onExportCurrentProfile: () => void;
  currentProfileName: string;
}

const CATEGORIES = ['All', 'Development', 'Creative', 'Streaming', 'Productivity'] as const;

export function CommunityProfileModal({
  open,
  onClose,
  onInstallProfile,
  onExportCurrentProfile,
  currentProfileName,
}: CommunityProfileModalProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [installedId, setInstalledId] = useState<string | null>(null);

  const filteredProfiles = useMemo(() => {
    return COMMUNITY_PROFILES.filter((cp) => {
      const matchesCategory =
        selectedCategory === 'All' || cp.category === selectedCategory;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        cp.name.toLowerCase().includes(q) ||
        cp.author.toLowerCase().includes(q) ||
        cp.description.toLowerCase().includes(q) ||
        cp.tags.some((t) => t.toLowerCase().includes(q));
      return matchesCategory && matchesSearch;
    });
  }, [search, selectedCategory]);

  const handleInstall = (cp: CommunityProfile) => {
    setInstalledId(cp.id);
    onInstallProfile(cp);
    setTimeout(() => {
      setInstalledId(null);
    }, 2000);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[6px]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="relative w-full max-w-[680px] max-h-[85vh] bg-[#f2f2f2] rounded-[24px] shadow-2xl border border-black/[0.06] flex flex-col overflow-hidden text-[#1e1e1e]"
        >
          {/* Header */}
          <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] flex items-center justify-between">
            <div>
              <h2 className="text-[17px] font-semibold text-[#1a1a1a]">
                Community Profile Hub
              </h2>
              <p className="text-[11.5px] text-[#71717a] mt-0.5">
                Browse pre-built 4-layer workflows, macros, and rotary bindings
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onExportCurrentProfile}
                title={`Export "${currentProfileName}" to share`}
                className="h-[28px] px-3 rounded-full bg-white hover:bg-neutral-50 border border-black/[0.08] text-[11px] font-medium text-[#333] flex items-center gap-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
              >
                <Share2 className="w-3 h-3 stroke-[2]" />
                <span>Share Current</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white hover:bg-neutral-100 flex items-center justify-center text-[#555] transition-colors cursor-pointer border border-black/[0.06]"
                aria-label="Close"
              >
                <X className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {/* Search & Category Pills */}
          <div className="px-6 pt-4 pb-3 flex flex-col gap-3">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3.5 text-[#888] pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search profiles by tool, workflow, author, or keyword…"
                className="w-full h-8 pl-9 pr-3 rounded-full bg-white border border-black/[0.08] text-[11.5px] focus:outline-none focus:border-[#0051ff] transition-all"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`h-6 px-3 rounded-full text-[10.5px] font-medium transition-all cursor-pointer shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-[#0051ff] text-white shadow-sm'
                      : 'bg-white hover:bg-neutral-100 text-[#555] border border-black/[0.06]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Profiles Grid / List */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-1 space-y-3">
            {filteredProfiles.length === 0 ? (
              <div className="py-12 text-center text-[#888] text-[12px]">
                No community profiles match your search criteria.
              </div>
            ) : (
              filteredProfiles.map((cp) => {
                const isJustInstalled = installedId === cp.id;
                return (
                  <div
                    key={cp.id}
                    className="p-4 rounded-[16px] bg-white border border-black/[0.06] shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:border-[#0051ff]/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3.5"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cp.color }}
                        />
                        <h3 className="text-[13px] font-semibold text-[#1a1a1a]">
                          {cp.name}
                        </h3>
                        <span className="text-[10px] text-[#888]">
                          by @{cp.author}
                        </span>
                        <span className="text-[9.5px] px-2 py-0.5 rounded-full bg-neutral-100 text-[#555] font-medium">
                          {cp.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-[#666] leading-relaxed">
                        {cp.description}
                      </p>

                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {cp.tags.map((tag) => (
                          <span
                            key={tag}
                            className="text-[9.5px] px-1.5 py-0.5 rounded bg-neutral-50 text-[#666] border border-black/[0.04]"
                          >
                            {tag}
                          </span>
                        ))}
                        <span className="text-[9.5px] text-[#888] ml-auto tabular-nums">
                          {cp.downloads.toLocaleString()} installs
                        </span>
                      </div>
                    </div>

                    <div className="sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleInstall(cp)}
                        disabled={isJustInstalled}
                        className={`h-[30px] px-3.5 rounded-full text-[11px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                          isJustInstalled
                            ? 'bg-[#10b981] text-white'
                            : 'bg-[#0051ff] hover:bg-[#0043d4] text-white shadow-[0_1px_3px_rgba(0,81,255,0.3)]'
                        }`}
                      >
                        {isJustInstalled ? (
                          <>
                            <Check className="w-3 h-3 stroke-[2.5]" />
                            <span>Installed!</span>
                          </>
                        ) : (
                          <>
                            <ArrowDownToLine className="w-3 h-3 stroke-[2]" />
                            <span>Install Profile</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

export default CommunityProfileModal;
