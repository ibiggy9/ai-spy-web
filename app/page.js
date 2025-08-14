"use client";
import Submission_box from "./components/Submission_box";
import Results from "./components/Results";
import Menu from "./components/Menu";
import Toast from "./components/Toast";
import { motion } from "framer-motion";
import { Accordion, AccordionItem } from "@nextui-org/react";
import { Skeleton } from "@nextui-org/react";
import { useState, useEffect, useRef } from "react";
import { API_BASE_URL } from "./utils/api";
import { useSubscription } from "./contexts/SubscriptionContext";

import {
  getUploadUrl,
  createReport,
  getReportStatus,
  transcribeAudio,
  sendChatMessage,
} from "./utils/api";

export default function Submission() {
  const { hasSubscription, refreshSubscription } = useSubscription();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(true);
  const [chatHistory, setChatHistory] = useState([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollIntervalRef = useRef(null);
  const fileRef = useRef(null);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);
  const [subscriptionConfirmed, setSubscriptionConfirmed] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState(null);
  const [conversationContext, setConversationContext] = useState(null);

  const handleToastExpire = async () => {
    try {
      const finalResponse = await refreshSubscription(true);

      if (finalResponse.hasSubscription && !subscriptionConfirmed) {
        setSubscriptionConfirmed(true);

        setTimeout(() => {
          setSubscriptionSuccess(true);
          setTimeout(() => {
            setSubscriptionSuccess(false);
          }, 2000);
        }, 100);
      }
    } catch (error) {}
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("subscription") === "success") {
      setSubscriptionSuccess(true);

      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      setSubscriptionSuccess(true);
      setTimeout(() => {
        setSubscriptionSuccess(false);
      }, 3000);
    }
  }, [refreshSubscription]);

  const startPolling = (taskId) => {
    setIsPolling(true);

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(async () => {
      try {
        const status = await getReportStatus(taskId, hasSubscription);

        if (status.status === "completed") {
          setAnalysisResult(status);

          if (status.transcription_data) {
            setTranscriptionData(status.transcription_data);
          }

          setIsAnalyzing(false);
          setIsPolling(false);
          clearInterval(pollIntervalRef.current);
        } else if (status.status === "error") {
          setError(status.error || "Failed to process audio file");
          setIsAnalyzing(false);
          setIsPolling(false);
          clearInterval(pollIntervalRef.current);
        }
      } catch (error) {
        setError(error.message || "Failed to get analysis results");
        setIsAnalyzing(false);
        setIsPolling(false);
        clearInterval(pollIntervalRef.current);
      }
    }, 2000);
  };

  const handleSubmit = async (file) => {
    setIsAnalyzing(true);
    setError(null);
    fileRef.current = file;

    try {
      const { signed_url, file_name, bucket } = await getUploadUrl(
        file.name,
        file.type,
      );

      const uploadResponse = await fetch(signed_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const [reportResult, transcription_data] = await Promise.all([
        createReport(bucket, file_name),
        transcribeAudio(file, hasSubscription),
      ]);

      setTranscriptionData(transcription_data);

      setCurrentTaskId(reportResult.task_id);
      startPolling(reportResult.task_id);
    } catch (error) {
      setError(error.message || "Failed to submit file");
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async (message) => {
    setIsChatLoading(true);
    setChatHistory((prev) => [...prev, { role: "user", content: message }]);

    try {
      let contextToSend;

      if (chatHistory.length === 0) {
        contextToSend = JSON.stringify({
          analysis: {
            overall_prediction: analysisResult?.overall_prediction,
            confidence_score: analysisResult?.confidence_score,
            summary: analysisResult?.result?.[0]?.summary_statistics || {},
            timeline: analysisResult?.result?.slice(1) || [],
          },
          transcription: transcriptionData || "No transcription available",
        });
      } else {
        if (conversationContext) {
          contextToSend = conversationContext;
        } else {
          const INITIAL_CHAT_CONTEXT =
            "You are Ai-SPY, an AI assistant focused on helping users understand AI-generated content and audio.\n\nYou are knowledgeable about AI detection, audio analysis, and content generation.\n\nYou should be helpful, friendly, and direct in your responses.\n\nWhen discussing AI detection, focus on education rather than evasion.\n\nYou will be given the results of an audio analysis and you will need to discuss them with the user.";
          const conversationHistory = chatHistory
            .map(
              (msg) =>
                `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
            )
            .join("\n");
          contextToSend = `${INITIAL_CHAT_CONTEXT}\n\n${conversationHistory}`;
        }
      }

      const data = await sendChatMessage(
        message,
        contextToSend,
        hasSubscription,
        currentTaskId,
      );

      if (data.context) {
        setConversationContext(data.context);
      }

      setChatHistory((prevChat) => [
        ...prevChat,
        { role: "assistant", content: data.response },
      ]);
    } catch (error) {
      setError("Failed to get a response. Please try again.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleReset = () => {
    setAnalysisResult(null);
    setTranscriptionData(null);
    setIsAnalyzing(false);
    setError(null);
    setChatHistory([]);
    setCurrentTaskId(null);
    setConversationContext(null);
  };

  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      setIsAnalyzing(false);
      setIsPolling(false);
    };
  }, []);

  useEffect(() => {
    async function checkApiHealth() {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
        });

        if (!response.ok) {
          setError("API connection failed");
        }
      } catch (error) {
        setError("API connection failed");
      }
    }

    checkApiHealth();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-900 fixed inset-0 flex">
      <div
        className={`${isMobile ? "fixed bottom-0 w-full h-16" : "fixed left-0 h-screen"} z-50`}
      >
        <Menu
          onCollapse={(collapsed) => setIsMenuCollapsed(collapsed)}
          onReset={handleReset}
          isAnalyzing={isAnalyzing}
          hasAnalysisResult={!!analysisResult}
        />
      </div>
      <motion.div
        className="flex-grow flex flex-col overflow-y-auto"
        initial={false}
        animate={{
          marginLeft: isMobile ? "0" : isMenuCollapsed ? "75px" : "300px",
          marginBottom: isMobile ? "64px" : "0",
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="fixed top-0 left-0 w-full h-24 bg-zinc-900 z-20" />
        <div className="flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ type: "spring", duration: 1 }}
            style={{
              position: "fixed",
              top: "20px",
              left: isMenuCollapsed ? "95px" : "320px",
              width: "250px",
              transition: "left 0.3s ease",
            }}
            className={`z-30 ${isMobile ? "hidden" : "block"}`}
          >
            <Accordion>
              <AccordionItem
                key="1"
                className="text-slate-300 text-xs hover:bg-zinc-800 hover:rounded-2xl px-4 transition-colors duration-200"
                aria-label="Stac-2.2"
                title={
                  <span>
                    AI-SPY{" "}
                    <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text">
                      STAC-2.2
                    </span>
                  </span>
                }
                subtitle={
                  <span className="text-slate-300">
                    Spacio-Temporal Audio Classifier
                  </span>
                }
              >
                STAC-2.2 delivers efficient and precise AI detection through
                advanced spatio-temporal audio analysis, optimized for
                real-world performance.
              </AccordionItem>
            </Accordion>
          </motion.div>

          <div className="flex-grow flex flex-col items-center mt-32 pb-8 z-10">
            {error && (
              <div className="mb-4 p-4 bg-red-500/10 border border-red-500 rounded-lg text-red-500">
                {error}
              </div>
            )}
            {isAnalyzing ? (
              isMobile ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full max-w-[600px] bg-zinc-800 p-8 rounded-2xl mx-4 flex flex-col items-center"
                >
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <div className="text-slate-200 text-lg text-center">
                    Processing File...
                  </div>
                  <div className="text-slate-500 text-sm text-center mt-2">
                    Please wait while we analyze your file
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full max-w-[600px] bg-zinc-800 p-4 md:p-6 rounded-2xl mx-4"
                >
                  <div className="flex flex-col gap-3">
                    <Skeleton className="rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                      <div className="h-4 md:h-6 rounded-lg bg-zinc-700"></div>
                    </Skeleton>
                    <div className="grid grid-cols-3 gap-2 md:gap-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton
                          key={i}
                          className="rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
                        >
                          <div className="h-16 md:h-24 rounded-lg bg-zinc-700"></div>
                        </Skeleton>
                      ))}
                    </div>
                    <Skeleton className="rounded-lg bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
                      <div className="h-32 md:h-64 rounded-lg bg-zinc-700"></div>
                    </Skeleton>
                    <div className="text-slate-200 text-lg md:text-xl text-center">
                      Processing File...
                    </div>
                    <div className="text-slate-500 text-xs md:text-sm text-center">
                      Please wait while we analyze your file
                    </div>
                  </div>
                </motion.div>
              )
            ) : analysisResult ? (
              <Results
                result={analysisResult}
                onReset={handleReset}
                chatHistory={chatHistory}
                onChatSubmit={handleChatSubmit}
                isChatLoading={isChatLoading}
                transcriptionData={transcriptionData}
              />
            ) : (
              <Submission_box onSubmit={handleSubmit} />
            )}
          </div>
        </div>
      </motion.div>

      {}
      <Toast
        isVisible={subscriptionSuccess}
        onClose={() => setSubscriptionSuccess(false)}
        onExpire={!subscriptionConfirmed ? handleToastExpire : undefined}
        title={
          subscriptionConfirmed
            ? "Welcome to AI-SPY Pro!"
            : "Payment Successful!"
        }
        message={
          subscriptionConfirmed
            ? "Your Pro subscription is now active! Enjoy unlimited AI detection."
            : "Activating your Pro subscription... This may take up to 2 minutes while we process your payment."
        }
        type="success"
        duration={subscriptionConfirmed ? 3000 : 8000}
      />
    </div>
  );
}
