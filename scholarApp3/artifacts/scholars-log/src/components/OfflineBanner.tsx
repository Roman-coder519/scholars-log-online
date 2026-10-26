import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBack(true);
      setTimeout(() => setShowBack(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBack(false);
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const visible = !isOnline || showBack;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ duration: 0.25 }}
          className={`fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 py-2 text-sm font-medium text-white ${
            isOnline ? "bg-emerald-600" : "bg-amber-600"
          }`}
        >
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4" />
              Back online
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4" />
              You're offline — the app still works, but data won't sync
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
