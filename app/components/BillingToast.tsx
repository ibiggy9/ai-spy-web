"use client";

import { useEffect } from "react";
import { RiCheckLine, RiCloseLine } from "react-icons/ri";

interface BillingToastProps {
  message: string;
  type: "success" | "error";
  onClose: () => void;
  duration?: number;
}

export default function BillingToast({
  message,
  type,
  onClose,
  duration = 5000,
}: BillingToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right duration-300">
      <div
        className={`flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg ${
          type === "success"
            ? "bg-green-600 text-white"
            : "bg-red-600 text-white"
        }`}
      >
        {type === "success" ? (
          <RiCheckLine className="w-5 h-5" />
        ) : (
          <RiCloseLine className="w-5 h-5" />
        )}
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 hover:bg-black/20 rounded p-1 transition-colors"
        >
          <RiCloseLine className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
