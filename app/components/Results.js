"use client";
import { motion } from "framer-motion";
import Chat from "./Chat";
import Transcription from "./Transcription";
import ContentAnalysis from "./ContentAnalysis";
import SummaryStats from "./SummaryStats";

import TimelineGrid from "./TimelineGrid";
import { useEffect, useState } from "react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { useAuth } from "@clerk/nextjs";

export default function Results({
  result,
  onReset,
  chatHistory,
  onChatSubmit,
  isChatLoading,
  transcriptionData,
}) {
  const { hasSubscription, isLoading } = useSubscription();
  const { isSignedIn } = useAuth();

  const aggregateConfidence = result?.aggregate_confidence;
  const overallPrediction = result?.overall_prediction;
  const fileName = result?.file_name || "Analysis Result";

  const summaryStats = result?.result?.[0]?.summary_statistics;
  const isLimitedData = result?.is_limited || transcriptionData?.is_limited;

  const combinedStats = summaryStats
    ? {
        ...summaryStats,
        aggregate_confidence: aggregateConfidence,
        overall_prediction: overallPrediction,
      }
    : null;

  const combinedTranscriptionData =
    transcriptionData || result?.transcription_data;

  const clips = Array.isArray(result?.result)
    ? result.result
        .filter((item) => item.timestamp !== undefined)
        .map((item) => ({
          timestamp: item.timestamp,
          prediction: item.prediction,
          confidence: item.confidence,
        }))
    : [];

  const prepareChartData = (clips) => {
    return clips
      .map((clip) => ({
        timestamp: parseFloat(clip.timestamp),
        confidence: parseFloat(clip.confidence) * 100,
        prediction: clip.prediction,
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  };

  const formatXAxis = (value) => {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const chartData = prepareChartData(clips);

  let shadowStyle = {};
  if (overallPrediction === "AI") {
    shadowStyle = { boxShadow: "0 0 15px 5px rgba(255, 0, 0, 0.7)" };
  } else if (overallPrediction === "Human") {
    shadowStyle = { boxShadow: "0 0 15px 5px rgba(0, 255, 0, 0.7)" };
  } else if (overallPrediction === "Uncertain") {
    shadowStyle = { boxShadow: "0 0 15px 5px rgba(255, 255, 0, 0.7)" };
  } else if (overallPrediction === "Mixed") {
    shadowStyle = { boxShadow: "0 0 15px 5px rgba(168, 85, 247, 0.7)" };
  }

  const renderSubscriptionLoading = () => {
    return (
      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-center">
          <div className="w-6 h-6 mr-3 border-2 border-slate-400 border-t-blue-400 rounded-full animate-spin"></div>
          <span className="text-slate-300 text-sm">
            Checking subscription status...
          </span>
        </div>
      </div>
    );
  };

  const renderUpgradePrompt = () => {
    if (hasSubscription) return null;

    return (
      <div className="bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-purple-500 rounded-lg p-4 mb-6">
        <h3 className="text-base text-white font-medium mb-2">
          Limited Results
        </h3>
        <p className="text-sm text-gray-300 mb-3">
          You're viewing limited results with our free plan. Upgrade to Pro for:
        </p>
        <ul className="text-sm text-gray-300 list-disc pl-5 mb-3">
          <li>Full timeline analysis</li>
          <li>Complete transcription</li>
          <li>Content summary & sentiment analysis</li>
          <li>AI chat assistance</li>
        </ul>
        <a
          href={
            isSignedIn ? "/subscribe" : "https://accounts.ai-spy.xyz/sign-in"
          }
          className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Upgrade to Pro
        </a>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0.3 }}
      animate={{ scale: 1, opacity: 1 }}
      className="w-[95%] max-w-[700px] bg-zinc-800 p-3 md:p-6 rounded-2xl mx-auto"
      style={shadowStyle} // Apply the shadow style here
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg md:text-xl text-white">
          Analysis Result{result?.file_name && ` - ${result.file_name}`}
        </h2>
        <button
          onClick={onReset}
          className="text-sm md:text-base text-slate-400 hover:text-white transition-colors"
        >
          Scan New File
        </button>
      </div>

      {/* Show loading state while checking subscription */}
      {isLoading && renderSubscriptionLoading()}

      {/* Show upgrade prompt for free users */}
      {!isLoading && !hasSubscription && renderUpgradePrompt()}

      {/* Pass combined stats object to SummaryStats */}
      <SummaryStats stats={combinedStats} />

      {/* Add Transcription component here */}
      {combinedTranscriptionData && (
        <Transcription
          transcriptionData={combinedTranscriptionData}
          aiDetectionResults={chartData}
          hasSubscription={hasSubscription}
          isLoadingSubscription={isLoading}
        />
      )}

      <div className="bg-slate-800 border border-zinc-700 rounded-lg p-3 md:p-3">
        {/* Pass chartData with prediction and confidence */}
        <TimelineGrid
          chartData={chartData}
          formatXAxis={formatXAxis}
          transcriptionData={combinedTranscriptionData}
        />

        <div className="mt-3 text-[10px] md:text-xs text-gray-400">
          <p className="font-medium">Risk Levels:</p>
          <ul className="space-y-1 mt-1">
            <li className="text-green-400 flex items-center">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1"></span>
              Low Risk: Likely human speech
            </li>
            <li className="text-yellow-400 flex items-center">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-1"></span>
              Medium Risk: Potential AI-generated content
            </li>
            <li className="text-red-400 flex items-center">
              <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-1"></span>
              High Risk: Likely AI-generated speech
            </li>
          </ul>
        </div>
      </div>

      {/* Only show content analysis for pro users */}
      {!isLoading && hasSubscription && combinedTranscriptionData && (
        <ContentAnalysis transcriptionData={combinedTranscriptionData} />
      )}

      {/* For free users, show upgrade prompt instead of chat */}
      {!isLoading && !hasSubscription ? (
        <div className="bg-slate-800 border border-zinc-700 rounded-lg p-4 mt-6">
          <h3 className="text-base text-white font-medium mb-2">
            AI Chat Assistant
          </h3>
          <p className="text-sm text-gray-300 mb-3">
            Chat with our AI to analyze your results, get insights, and
            understand potential issues.
          </p>
          <a
            href={
              isSignedIn ? "/subscribe" : "https://accounts.ai-spy.xyz/sign-in"
            }
            className="inline-block bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white px-4 py-2 rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Upgrade to Pro to Access Chat
          </a>
        </div>
      ) : !isLoading ? (
        <Chat
          chatHistory={chatHistory}
          onChatSubmit={onChatSubmit}
          isChatLoading={isChatLoading}
          analysisResult={result}
          transcriptionData={combinedTranscriptionData}
        />
      ) : null}
    </motion.div>
  );
}
