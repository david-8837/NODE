import React from 'react';
import { motion } from 'motion/react';

export interface SettingsSwitchProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  title?: string;
}

export function SettingsSwitch({
  checked,
  onChange,
  disabled = false,
  title,
}: SettingsSwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled}
      disabled={disabled}
      title={title}
      onClick={onChange}
      className={`w-[29px] h-[16px] shrink-0 rounded-full p-[2px] flex items-center transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        checked ? 'bg-[#000000] justify-end' : 'bg-[#b3b3b3] justify-start'
      }`}
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 520, damping: 32 }}
        className="w-[12px] h-[12px] shrink-0 rounded-full bg-white shadow-xs"
      />
    </button>
  );
}

export default SettingsSwitch;
