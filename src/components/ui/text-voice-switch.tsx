// src/components/ui/enhanced-text-voice-switch.tsx
import { useState } from 'react';
import { SidebarMenu, SidebarMenuItem } from "@/components/ui/sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Mic } from "lucide-react";
import { cn } from "@/utils/classNames";

interface TextVoiceSwitchProps {
  isVoiceMode: boolean;
  onModeChange: (isVoice: boolean) => void;
}

export const TextVoiceSwitch = ({ isVoiceMode, onModeChange }: TextVoiceSwitchProps) => {
  const [hovered, setHovered] = useState(false);
  
  return (
    <SidebarMenu>
      <SidebarMenuItem className="px-2">
        <div className="w-full border border-muted rounded-lg p-3 relative overflow-hidden">
          {/* Main Toggle Switch */}
          <div 
            className={cn(
              "flex items-center justify-between h-12 px-1 rounded-md relative cursor-pointer transition-all duration-300",
              isVoiceMode 
                ? "bg-gradient-to-r from-purple-600 to-indigo-600 shadow-lg shadow-purple-500/20" 
                : "bg-gradient-to-r from-slate-600 to-slate-700 shadow-md shadow-slate-500/10",
              hovered && "shadow-xl"
            )}
            onClick={() => onModeChange(!isVoiceMode)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            role="switch"
            aria-checked={isVoiceMode}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onModeChange(!isVoiceMode);
                e.preventDefault();
              }
            }}
          >
            {/* Text Side Indicator */}
            <div className={cn(
              "h-9 transition-all duration-300 flex items-center justify-center px-3 rounded",
              !isVoiceMode 
                ? "bg-white text-slate-800 shadow-md" 
                : "text-slate-200 bg-transparent"
            )}>
              <MessageSquare className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Text</span>
            </div>
            
            {/* Voice Side Indicator */}
            <div className={cn(
              "h-9 transition-all duration-300 flex items-center justify-center px-3 rounded relative",
              isVoiceMode 
                ? "bg-white text-purple-700 shadow-md" 
                : "text-slate-200 bg-transparent"
            )}>
              <Mic className="h-4 w-4 mr-2" />
              <span className="text-sm font-medium">Voice</span>
              
              {/* Voice wave animation */}
              <AnimatePresence>
                {isVoiceMode && (
                  <div className="absolute left-0 top-0 w-full h-full flex items-center justify-center">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute rounded-full border border-purple-400"
                        initial={{ width: '30%', height: '30%', opacity: 0.8 }}
                        animate={{ width: '100%', height: '100%', opacity: 0 }}
                        transition={{ 
                          duration: 2, 
                          repeat: Infinity, 
                          delay: i * 0.4,
                          ease: "easeOut" 
                        }}
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default TextVoiceSwitch;