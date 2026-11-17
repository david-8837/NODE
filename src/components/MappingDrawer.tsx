import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ActionCreatorDrawer, type ActionCreatorDrawerProps } from './ActionCreatorDrawer';
import { ActionLibrarySidebar, type ActionLibrarySidebarProps } from './ActionLibrarySidebar';
import type { MappingTabId } from '../presetLibrary';

export interface MappingDrawerProps {
  creatorModalTab: Exclude<MappingTabId, 'Basic'> | null;
  creatorProps: Omit<ActionCreatorDrawerProps, 'creatorModalTab'>;
  libraryProps: ActionLibrarySidebarProps;
}

export function MappingDrawer({
  creatorModalTab,
  creatorProps,
  libraryProps,
}: MappingDrawerProps) {
  return (
    <motion.aside
      key="key-mapping-drawer"
      initial={{ x: '100%', opacity: 0.6 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
      className="absolute top-0 bottom-0 right-0 w-[332px] bg-[#efefef] rounded-l-[20px] rounded-r-none shadow-[-8px_0_24px_rgba(0,0,0,0.08)] border-l border-black/[0.04] flex flex-col z-30 overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {creatorModalTab ? (
          <ActionCreatorDrawer
            creatorModalTab={creatorModalTab}
            {...creatorProps}
          />
        ) : (
          <ActionLibrarySidebar
            {...libraryProps}
          />
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

export default MappingDrawer;
