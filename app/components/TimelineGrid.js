'use client'
import React, { useEffect, useState } from 'react';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAuth } from "@clerk/nextjs";

export default function TimelineGrid({ chartData, transcriptionData }) {
    const { hasSubscription } = useSubscription();
    const { isSignedIn } = useAuth();
    
    // Define formatXAxis function locally since it's not passed as prop anymore
    const formatXAxis = (value) => {
        const minutes = Math.floor(value / 60);
        const seconds = Math.floor(value % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };



    const getTranscriptionForTimestamp = (timestamp) => {
        // First check if transcriptionData exists
        if (!transcriptionData) {
            return "No transcription available";
        }
        
        // Check for words array (expected format)
        if (transcriptionData.words && Array.isArray(transcriptionData.words)) {
            const startTime = timestamp;
            const endTime = timestamp + 3;

            const wordsInWindow = transcriptionData.words.filter(word =>
                word.start >= startTime && word.start < endTime
            );

            const transcriptSegment = wordsInWindow.map(word => word.word).join(" ");
            return transcriptSegment || "No speech detected";
        }
        
        // Check for text property (fallback)
        if (transcriptionData.text) {
            // If there's just a full text without timestamps, show part of it
            // Show first 50 chars for free users, all for pro
            const fullText = transcriptionData.text;
            return hasSubscription ? fullText : `${fullText.slice(0, 50)}... (Upgrade for full text)`;
        }
        
        // If there's a segments array with timestamps
        if (transcriptionData.segments && Array.isArray(transcriptionData.segments)) {
            const segmentsInRange = transcriptionData.segments.filter(segment => 
                (segment.start <= timestamp && segment.end >= timestamp) ||
                (segment.start >= timestamp && segment.start < timestamp + 3)
            );
            
            if (segmentsInRange.length > 0) {
                return segmentsInRange.map(segment => segment.text).join(" ");
            }
        }
        
        // If none of the formats match
        return "No transcription available";
    };

    const formatTimestampRange = (timestamp) => {
        const startFormatted = formatXAxis(timestamp);
        const endFormatted = formatXAxis(timestamp + 3);
        return `${startFormatted} - ${endFormatted}`;
    };

    if (!chartData || chartData.length === 0) {
        return <div className="text-gray-400 text-center py-4">No timeline data available.</div>;
    }

    // The API already limits the data for free users, so we don't need to slice it here
    // We just need to ensure we're displaying exactly what the API returns

    return (
        <div className="mt-4 max-h-[400px] overflow-y-auto">
            {/* Grid container */}
            <div className="grid grid-cols-4 gap-2"> {/* 4 equal columns, adjust gap as needed */}
                {/* Column Headers (Optional, but good for clarity) */}
                <div className="font-bold text-white text-xs">Timestamp</div>
                <div className="font-bold text-white text-xs text-center">Prediction</div>
                <div className="font-bold text-white text-xs col-span-2">Transcription</div>

                {chartData.map((point, index) => {
                    let riskLevel = "Low Risk";
                    let bgColor = "bg-green-400/10";
                    let textColor = "text-green-400";

                    // Use prediction, not probability_ai
                    if (point.prediction === "AI") {
                        riskLevel = "High Risk";
                        bgColor = "bg-red-400/10";
                        textColor = "text-red-400";
                    } else if (point.prediction === "Human") { //Keep your old medium color by checking prediction
                        riskLevel = "Low Risk";  //Could add medium risk
                        bgColor = "bg-green-400/10";
                        textColor = "text-green-400";
                    }
                    // Add an else if here for "Uncertain" if you want to show that visually

                    const transcriptionSegment = getTranscriptionForTimestamp(point.timestamp);

                    return (
                        // Each data point is now a set of elements *within* the grid
                        // No extra wrapping div needed!
                        <React.Fragment key={index}>
                            <div className={`${bgColor} p-2 rounded-lg text-white text-xs text-left`}>{formatTimestampRange(point.timestamp)}</div>
                            <div className={`${bgColor} p-2 rounded-lg flex items-center justify-center gap-2`}>
                                <span className={`${textColor} text-xs`}>{riskLevel}</span>
                            </div>
                            <div className={`${bgColor} p-2 rounded-lg col-span-2 text-white text-xs text-left break-words`}>{transcriptionSegment}</div>
                        </React.Fragment>
                    );
                })}
            </div>
            
            {/* Show a message if this is a free user */}
            {!hasSubscription && chartData.length > 0 && (
                <div className="mt-3 bg-zinc-700/50 p-2 rounded text-sm text-center text-gray-300">
                    Showing first 3 timestamps only. <a href={isSignedIn ? "/subscribe" : "https://accounts.ai-spy.xyz/sign-in"} className="text-blue-400 hover:underline">Upgrade to Pro</a> for full timeline.
                </div>
            )}
        </div>
    );
}