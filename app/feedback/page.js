"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardBody } from "@nextui-org/card";
import Menu from "../components/Menu";

export default function Feedback() {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isMenuCollapsed, setIsMenuCollapsed] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_FASTAPI_URL + "/feedback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ feedback }),
        },
      );

      if (response.ok) {
        setSubmitted(true);
        setFeedback("");
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    }
  };

  return (
    <div className="flex bg-zinc-900">
      <Menu
        onCollapse={setIsMenuCollapsed}
        onReset={() => {}}
        isAnalyzing={false}
        hasAnalysisResult={false}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto px-4 py-8 max-w-2xl"
      >
        <Card className="bg-zinc-800">
          <CardBody className="p-8">
            <h1 className="text-2xl text-white mb-6">Feedback</h1>

            {submitted ? (
              <div className="text-green-400 text-center p-4">
                Thank you for your feedback!
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  className="w-full h-40 p-4 rounded-lg bg-slate-700 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                  required
                />
                <button
                  type="submit"
                  className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Submit Feedback
                </button>
              </form>
            )}
          </CardBody>
        </Card>
      </motion.div>
    </div>
  );
}
