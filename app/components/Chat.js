"use client";
import { useState, useEffect, useRef } from "react";
import { Tooltip } from "@nextui-org/tooltip";
import { IoSend } from "react-icons/io5";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { motion, AnimatePresence } from "framer-motion";
import { sendChatMessage } from "../utils/api";

export default function Chat({
  chatHistory,
  onChatSubmit,
  isChatLoading,
  analysisResult,
  transcriptionData,
}) {
  const [message, setMessage] = useState("");
  const chatContainerRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isChatLoading) return;

    const userMessage = message;
    setMessage("");

    try {
      await onChatSubmit(userMessage);
    } catch (error) {}
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const handlePresetClick = (presetMessage) => {
    onChatSubmit(presetMessage);
  };

  return (
    <div className="mt-8 border-t border-zinc-700/50 pt-8">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
          <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
          Chat with Ai-SPY
        </h2>
        <p className="text-sm text-gray-400">
          Ask questions about your analysis results
        </p>
      </div>

      <div
        className="h-[400px] overflow-y-auto overflow-x-hidden mb-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent"
        ref={chatContainerRef}
      >
        <div className="min-h-full flex flex-col justify-end">
          <AnimatePresence mode="wait">
            {chatHistory.length === 0 && !isChatLoading && (
              <motion.div
                key="presets"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center justify-center h-full"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 w-full mb-6">
                  <div
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 text-slate-200 text-sm cursor-pointer hover:from-slate-600/80 hover:to-slate-700/80 transition-all duration-200 backdrop-blur-sm group"
                    onClick={() =>
                      handlePresetClick("Explain the results to me.")
                    }
                  >
                    <div className="text-blue-400 text-xs font-medium mb-1 group-hover:text-blue-300">
                      Quick start
                    </div>
                    Explain the results to me.
                  </div>
                  <div
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 text-slate-200 text-sm cursor-pointer hover:from-slate-600/80 hover:to-slate-700/80 transition-all duration-200 backdrop-blur-sm group"
                    onClick={() =>
                      handlePresetClick(
                        "How did the model get to these results?",
                      )
                    }
                  >
                    <div className="text-purple-400 text-xs font-medium mb-1 group-hover:text-purple-300">
                      Deep dive
                    </div>
                    How did the model get to these results?
                  </div>
                  <div
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 text-slate-200 text-sm cursor-pointer hover:from-slate-600/80 hover:to-slate-700/80 transition-all duration-200 backdrop-blur-sm group"
                    onClick={() =>
                      handlePresetClick("What should I know about this file?")
                    }
                  >
                    <div className="text-green-400 text-xs font-medium mb-1 group-hover:text-green-300">
                      Key insights
                    </div>
                    What should I know about this file?
                  </div>
                </div>
                <div className="text-gray-400 text-center text-sm">
                  Click a suggestion above to get started, or type your own
                  question below
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <AnimatePresence>
              {chatHistory.map((msg, index) => (
                <motion.div
                  key={`msg-${index}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} w-full`}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  layout
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl break-words ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white text-sm border border-blue-500/30"
                        : "bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 text-slate-200 text-sm backdrop-blur-sm"
                    }`}
                  >
                    {}
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      className="prose prose-sm prose-invert max-w-none"
                    >
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <AnimatePresence>
              {isChatLoading && (
                <motion.div
                  key="loading"
                  className="flex justify-start w-full"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.95 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  layout
                >
                  <div className="max-w-[80%] p-4 rounded-2xl py-6 bg-gradient-to-br from-slate-700/80 to-slate-800/80 border border-slate-600/50 backdrop-blur-sm">
                    <div className="flex space-x-2 items-center">
                      <div
                        className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                      ></div>
                      <div
                        className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                      ></div>
                      <span className="text-slate-300 text-sm ml-2">
                        Ai-SPY is thinking...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="flex items-center bg-gradient-to-r from-zinc-800/90 to-slate-800/90 rounded-2xl border border-zinc-600/50 backdrop-blur-sm overflow-hidden shadow-lg">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask Ai-SPY anything about your results..."
              className="flex-grow py-4 px-6 bg-transparent text-white placeholder-gray-400 focus:outline-none text-sm"
              disabled={isChatLoading}
            />
            <Tooltip content="Send message">
              <button
                type="submit"
                disabled={isChatLoading || !message.trim()}
                className="p-4 text-white hover:bg-zinc-700/50 disabled:opacity-30 transition-all duration-200 rounded-r-2xl group"
              >
                <IoSend
                  size={20}
                  className="group-hover:scale-110 transition-transform duration-200"
                />
              </button>
            </Tooltip>
          </div>
          {message.trim() && (
            <div className="absolute -bottom-6 right-0 text-xs text-gray-500">
              Press Enter to send
            </div>
          )}
        </div>
      </form>
    </div>
  );
}
