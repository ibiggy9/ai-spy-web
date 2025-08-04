'use client'
import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from "@clerk/nextjs";

export default function Transcription({ transcriptionData, aiDetectionResults, hasSubscription = false, isLoadingSubscription = false }) {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [errorOccurred, setErrorOccurred] = useState(false);



  const getColorForTimestamp = (timestamp) => {
    // Safety check for aiDetectionResults
    if (!aiDetectionResults || !Array.isArray(aiDetectionResults) || aiDetectionResults.length === 0) {
      return "text-white";
    }
    
    // Find the AI detection result for this timestamp
    const result = aiDetectionResults.find(r => 
      timestamp >= r.timestamp && timestamp < (r.timestamp + 3)  // Using 3-second intervals
    );

    if (!result) {
      return "text-white";
    }

    // Calculate AI probability based on prediction and confidence
    const isPredictionAI = result.prediction === "AI";
    const aiProbability = isPredictionAI ? result.confidence : 1 - result.confidence;
    
    if (aiProbability >= 0.7) {
      return "text-red-400"; // High risk
    } else if (aiProbability >= 0.3) {
      return "text-yellow-400"; // Medium risk
    }
    return "text-green-400"; // Low risk
  };

  const [isExpanded, setIsExpanded] = useState(false);
  
  const colorizedWords = useMemo(() => {
    if (!transcriptionData?.words || !Array.isArray(transcriptionData.words)) {
      return [];
    }
    
    // Ensure all word objects have the required properties
    const validWords = transcriptionData.words.filter(word => 
      word && typeof word === 'object' && 'word' in word && 'start' in word
    );
    
    return validWords.map(word => ({
      ...word,
      colorClass: getColorForTimestamp(word.start)
    }));
  }, [transcriptionData, aiDetectionResults]);

  // For free users, we'll only see the first 50 words max (or whatever the backend returns)
  const shouldTruncate = hasSubscription ? transcriptionData?.text?.length > 300 : false;
  const displayWords = hasSubscription && isExpanded ? colorizedWords : colorizedWords.slice(0, 50);

  // Handle subscription upgrade click
  const handleUpgradeClick = (e) => {
    e.preventDefault();
    if (isSignedIn) {
      router.push('/subscribe');
    } else {
      window.location.href = 'https://accounts.ai-spy.xyz/sign-in';
    }
  };

  // Check if we even have words to display
  if (!displayWords || displayWords.length === 0) {
    return (
      <div className="bg-slate-800 border border-zinc-700 rounded-lg p-3 md:p-6 mt-6">
        <h2 className="text-base md:text-lg text-white mb-3">Transcription</h2>
        <div className="text-gray-400">
          {transcriptionData?.text ? 
            (transcriptionData.text.slice(0, 500) + (transcriptionData.text.length > 500 ? "..." : "")) : 
            "No transcription available for this audio file."}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-zinc-700 rounded-lg p-3 md:p-6 mt-6">
      <h2 className="text-base md:text-lg text-white mb-3">Transcription</h2>
      <div className="leading-relaxed text-left">
        {displayWords.map((word, index) => (
          <span 
            key={index} 
            className={`${word.colorClass} ${index === 0 ? 'first-letter:uppercase' : ''}`}
          >
            {word.word}{' '}
          </span>
        ))}
        {shouldTruncate && !isExpanded && (
          <span className="text-gray-400">...</span>
        )}
        {/* Show loading state or upgrade prompt for non-pro users */}
        {isLoadingSubscription && (
          <span className="text-gray-400">... <span className="inline-flex items-center"><div className="w-3 h-3 mr-1 border border-slate-400 border-t-blue-400 rounded-full animate-spin"></div>Checking subscription...</span></span>
        )}
        {!isLoadingSubscription && !hasSubscription && (
          <span className="text-gray-400">... <a href="#" onClick={handleUpgradeClick} className="text-blue-400 hover:underline">Upgrade to Pro for full transcription</a></span>
        )}
      </div>
      {/* Only show expand button for pro users */}
      {!isLoadingSubscription && hasSubscription && shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-blue-400 hover:text-blue-300 text-sm"
        >
          {isExpanded ? 'Show Less' : 'Read More'}
        </button>
      )}
      <div className="mt-4 text-[10px] md:text-xs text-gray-400">
        <p className="font-medium">Color Legend:</p>
        <ul className="space-y-1 mt-1">
          <li className="text-green-400">Green: Low Risk (0-30% AI probability)</li>
          <li className="text-yellow-400">Yellow: Medium Risk (30-70% AI probability)</li>
          <li className="text-red-400">Red: High Risk (&gt;70% AI probability)</li>
        </ul>
      </div>
    </div>
  );
}
