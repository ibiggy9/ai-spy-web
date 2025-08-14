"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";

export default function Toast({
  isVisible,
  onClose,
  onExpire,
  title = "Success!",
  message = "Operation completed successfully",
  type = "success",
  duration = 6000,
  showProgressBar = true,
}) {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const remainingTimeRef = useRef(duration);

  const typeConfig = {
    success: {
      icon: RiCheckLine,
      bgColor: "bg-green-500/10",
      borderColor: "border-green-500/50",
      textColor: "text-green-400",
      progressColor: "bg-green-500",
    },
    error: {
      icon: RiCloseLine,
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/50",
      textColor: "text-red-400",
      progressColor: "bg-red-500",
    },
  };

  const config = typeConfig[type] || typeConfig.success;
  const IconComponent = config.icon;

  useEffect(() => {
    if (!isVisible) {
      setProgress(100);
      remainingTimeRef.current = duration;
      return;
    }

    startTimeRef.current = Date.now();

    const updateProgress = () => {
      if (isPaused) return;

      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, remainingTimeRef.current - elapsed);
      const newProgress = (remaining / duration) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        onExpire?.();
        onClose?.();
      }
    };

    intervalRef.current = setInterval(updateProgress, 50);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isVisible, isPaused, duration, onClose]);

  const handleMouseEnter = () => {
    if (!isVisible) return;
    setIsPaused(true);

    const elapsed = Date.now() - startTimeRef.current;
    remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
  };

  const handleMouseLeave = () => {
    if (!isVisible) return;
    setIsPaused(false);

    startTimeRef.current = Date.now();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.95 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed top-4 right-4 z-[9999] max-w-sm w-full mx-4"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <div
            className={`${config.bgColor} ${config.borderColor} border backdrop-blur-sm rounded-lg p-4 shadow-2xl relative overflow-hidden`}
          >
            {}
            {showProgressBar && (
              <div className="absolute bottom-0 left-0 h-1 bg-slate-700/50 w-full">
                <motion.div
                  className={`h-full ${config.progressColor} transition-all duration-75`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            {}
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <IconComponent className={`w-5 h-5 ${config.textColor}`} />
              </div>
              <div className="ml-3 flex-1">
                <h3 className={`text-sm font-medium ${config.textColor}`}>
                  {title}
                </h3>
                <p className="text-xs mt-1 text-slate-300">{message}</p>
              </div>
              <button
                onClick={onClose}
                className={`flex-shrink-0 ml-2 ${config.textColor} hover:text-white transition-colors`}
              >
                <RiCloseLine className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
