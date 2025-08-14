"use client";
import { Card, CardBody } from "@nextui-org/card";

export default function ContentAnalysis({ transcriptionData }) {
  const getSentimentColor = (score) => {
    if (score > 0.2) return "text-green-400";
    if (score < -0.2) return "text-red-400";
    return "text-yellow-400";
  };

  const getSentimentEmoji = (score) => {
    if (score > 0.2) return "😊";
    if (score < -0.2) return "😟";
    return "😐";
  };

  const getSentimentGradient = (sentiment) => {
    if (sentiment === "positive")
      return "from-green-900/30 to-green-800/20 border-green-700/40";
    if (sentiment === "negative")
      return "from-red-900/30 to-red-800/20 border-red-700/40";
    return "from-yellow-900/30 to-yellow-800/20 border-yellow-700/40";
  };

  return (
    <div className="bg-slate-800 border border-zinc-700 rounded-lg p-3 md:p-6 mt-6">
      <h2 className="text-base md:text-lg text-white mb-6 font-semibold">
        Content Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {}
        <Card
          className={`bg-gradient-to-br ${getSentimentGradient(transcriptionData.average_sentiment.sentiment)} bg-slate-800/90 backdrop-blur-sm`}
        >
          <CardBody className="p-6 flex flex-col items-center justify-center">
            <h3 className="text-lg text-white mb-4 text-center font-medium">
              Overall Tone
            </h3>
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-slate-700/80 flex items-center justify-center backdrop-blur-sm border border-slate-600/50">
                <span
                  className={`text-3xl ${getSentimentColor(transcriptionData.average_sentiment.sentiment_score)}`}
                >
                  {getSentimentEmoji(
                    transcriptionData.average_sentiment.sentiment_score,
                  )}
                </span>
              </div>
              <div className="text-center">
                <p
                  className={`font-bold text-lg ${getSentimentColor(transcriptionData.average_sentiment.sentiment_score)}`}
                >
                  {transcriptionData.average_sentiment.sentiment
                    .charAt(0)
                    .toUpperCase() +
                    transcriptionData.average_sentiment.sentiment.slice(1)}
                </p>
                <p className="text-xs text-gray-400 mt-1">Detected sentiment</p>
              </div>
            </div>
          </CardBody>
        </Card>

        {}
        <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-600/50 backdrop-blur-sm">
          <CardBody className="p-6">
            <h3 className="text-lg text-white mb-4 font-medium">
              Content Summary
            </h3>
            <div className="relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-purple-500 rounded-full"></div>
              <p className="text-sm text-gray-300 leading-relaxed pl-4">
                {transcriptionData.summary ===
                "The v2 summarization feature is currently only available in English. Please check out our API documentation for more details."
                  ? "Summaries are currently only available for files in English."
                  : transcriptionData.summary}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
