"use client";
import React, { useEffect, useState } from "react";
import { useSubscription } from "../contexts/SubscriptionContext";
import { useAuth } from "@clerk/nextjs";

export default function TimelineGrid({ chartData, transcriptionData }) {
  const { hasSubscription } = useSubscription();
  const { isSignedIn } = useAuth();

  const formatXAxis = (value) => {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getTranscriptionForTimestamp = (timestamp) => {
    if (!transcriptionData) {
      return "No transcription available";
    }

    if (transcriptionData.words && Array.isArray(transcriptionData.words)) {
      const startTime = timestamp;
      const endTime = timestamp + 3;

      const wordsInWindow = transcriptionData.words.filter(
        (word) => word.start >= startTime && word.start < endTime,
      );

      const transcriptSegment = wordsInWindow
        .map((word) => word.word)
        .join(" ");
      return transcriptSegment || "No speech detected";
    }

    if (transcriptionData.text) {
      const fullText = transcriptionData.text;
      return hasSubscription
        ? fullText
        : `${fullText.slice(0, 50)}... (Upgrade for full text)`;
    }

    if (
      transcriptionData.segments &&
      Array.isArray(transcriptionData.segments)
    ) {
      const segmentsInRange = transcriptionData.segments.filter(
        (segment) =>
          (segment.start <= timestamp && segment.end >= timestamp) ||
          (segment.start >= timestamp && segment.start < timestamp + 3),
      );

      if (segmentsInRange.length > 0) {
        return segmentsInRange.map((segment) => segment.text).join(" ");
      }
    }

    return "No transcription available";
  };

  const formatTimestampRange = (timestamp) => {
    const startFormatted = formatXAxis(timestamp);
    const endFormatted = formatXAxis(timestamp + 3);
    return `${startFormatted} - ${endFormatted}`;
  };

  if (!chartData || chartData.length === 0) {
    return (
      <div className="text-gray-400 text-center py-4">
        No timeline data available.
      </div>
    );
  }

  return (
    <div className="mt-4 max-h-[400px] overflow-y-auto">
      {}
      <div className="grid grid-cols-4 gap-2">
        {" "}
        {}
        {}
        <div className="font-bold text-white text-xs">Timestamp</div>
        <div className="font-bold text-white text-xs text-center">
          Prediction
        </div>
        <div className="font-bold text-white text-xs col-span-2">
          Transcription
        </div>
        {chartData.map((point, index) => {
          let riskLevel = "Low Risk";
          let bgColor = "bg-green-400/10";
          let textColor = "text-green-400";

          if (point.prediction === "AI") {
            riskLevel = "High Risk";
            bgColor = "bg-red-400/10";
            textColor = "text-red-400";
          } else if (point.prediction === "Human") {
            riskLevel = "Low Risk";
            bgColor = "bg-green-400/10";
            textColor = "text-green-400";
          }

          const transcriptionSegment = getTranscriptionForTimestamp(
            point.timestamp,
          );

          return (
            <React.Fragment key={index}>
              <div
                className={`${bgColor} p-2 rounded-lg text-white text-xs text-left`}
              >
                {formatTimestampRange(point.timestamp)}
              </div>
              <div
                className={`${bgColor} p-2 rounded-lg flex items-center justify-center gap-2`}
              >
                <span className={`${textColor} text-xs`}>{riskLevel}</span>
              </div>
              <div
                className={`${bgColor} p-2 rounded-lg col-span-2 text-white text-xs text-left break-words`}
              >
                {transcriptionSegment}
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {}
      {!hasSubscription && chartData.length > 0 && (
        <div className="mt-3 bg-zinc-700/50 p-2 rounded text-sm text-center text-gray-300">
          Showing first 3 timestamps only.{" "}
          <a
            href={
              isSignedIn ? "/subscribe" : "https://accounts.ai-spy.xyz/sign-in"
            }
            className="text-blue-400 hover:underline"
          >
            Upgrade to Pro
          </a>{" "}
          for full timeline.
        </div>
      )}
    </div>
  );
}
