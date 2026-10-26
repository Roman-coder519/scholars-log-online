import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  onAllow: () => void;
  onDismiss: () => void;
}

export default function NotificationPrompt({ onAllow, onDismiss }: Props) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 z-[90] bg-card border border-border rounded-2xl shadow-xl p-4"
    >
      <button
        onClick={onDismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">Enable Notifications</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Get notified at prayer times and when tasks are due — even offline.
          </p>
          <div className="flex gap-2 mt-3">
            <Button size="sm" className="flex-1 text-xs h-8" onClick={onAllow}>
              Allow
            </Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={onDismiss}>
              Not now
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
