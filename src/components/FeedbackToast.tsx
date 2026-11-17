import React from 'react';
import { motion } from 'framer-motion';

export interface FeedbackToastProps {
  message: string;
}

export function FeedbackToast({ message }: FeedbackToastProps) {
  return (
    <motion.div
      key="feedback-toast"
      initial={{ opacity: 0, y: 12, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.94 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-black text-white text-[11px] font-medium px-4 py-1.5 rounded-full shadow-lg z-50"
    >
      {message}
    </motion.div>
  );
}

export default FeedbackToast;
