"use client";
import { Card, CardBody } from "@nextui-org/card";

export default function SummaryStats({ stats }) {
  if (!stats) {
    return (
      <div className="flex flex-col gap-3 mb-6">
        <Card className="bg-slate-800">
          <CardBody className="p-3">
            <div className="text-gray-400 text-center">
              No summary statistics available.
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  const aiPercentage = stats?.speech_clips?.ai_clips?.percentage || 0;
  const humanPercentage = stats?.speech_clips?.human_clips?.percentage || 0;
  const totalClips = stats?.total_clips || 0;
  const overallConfidence =
    stats?.aggregate_confidence !== undefined
      ? (stats.aggregate_confidence * 100).toFixed(2)
      : "N/A";
  const overallPrediction = stats?.overall_prediction;

  const uncertainPercentage = 100 - aiPercentage - humanPercentage;

  let circleLabel;
  let classificationClassName = "font-semibold rounded-md px-1 py-0.5 ";
  let overallAssessment = "";
  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  switch (overallPrediction) {
    case "AI":
      circleLabel = "AI";
      classificationClassName += "bg-red-700/20 text-red-700";
      overallAssessment =
        overallConfidence >= 70
          ? "We are highly confident that this audio is AI-generated."
          : "This audio is likely AI-generated.";
      break;
    case "Human":
      circleLabel = "Human";
      classificationClassName += "bg-green-400/20 text-green-400";
      overallAssessment =
        overallConfidence >= 70
          ? "We are highly confident that this audio is human-generated."
          : "This audio is likely human-generated.";
      break;
    case "Mixed":
      circleLabel = "Mixed";
      classificationClassName += "bg-purple-700/20 text-purple-700";
      overallAssessment =
        overallConfidence >= 70
          ? "We are highly confident that this audio contains both AI-generated and human-generated content."
          : "This audio likely contains both AI-generated and human-generated content.";
      break;
    case "Uncertain":
      circleLabel = "Uncertain";
      classificationClassName += "bg-yellow-300/20 text-yellow-300";
      overallAssessment =
        "We are uncertain about the origin of this audio file.";
      break;
    default:
      circleLabel = "?";
      classificationClassName += "bg-gray-500/20 text-gray-500";
      overallAssessment = "Unable to determine the origin of this audio.";
  }

  return (
    <div className="flex flex-col gap-3 mb-6">
      <Card className="bg-slate-800">
        <CardBody className="p-3">
          <div className="flex items-center gap-4">
            <div className="relative w-[200px] h-[200px]">
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                {}
                {overallPrediction === "Mixed" ? (
                  <>
                    {}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${circumference / 2} ${circumference / 2}`}
                      strokeDashoffset={0}
                      stroke="#a855f7"
                      strokeLinecap="round"
                    />
                    {}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${circumference / 2} ${circumference / 2}`}
                      strokeDashoffset={-circumference / 2}
                      stroke="rgb(100 116 139)"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <>
                    {}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${(aiPercentage / 100) * circumference} ${circumference - (aiPercentage / 100) * circumference}`}
                      strokeDashoffset={-circumference / 4}
                      stroke="#7f1d1d"
                      strokeLinecap="round"
                    />

                    {}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${(uncertainPercentage / 100) * circumference} ${circumference - (uncertainPercentage / 100) * circumference}`}
                      strokeDashoffset={
                        -(
                          circumference / 4 +
                          (aiPercentage / 100) * circumference
                        )
                      }
                      stroke="#facc15"
                      strokeLinecap="round"
                    />

                    {}
                    <circle
                      cx="50"
                      cy="50"
                      r={radius}
                      fill="none"
                      strokeWidth="10"
                      strokeDasharray={`${(humanPercentage / 100) * circumference} ${circumference - (humanPercentage / 100) * circumference}`}
                      strokeDashoffset={
                        -(
                          circumference / 4 +
                          (aiPercentage / 100) * circumference +
                          (uncertainPercentage / 100) * circumference
                        )
                      }
                      stroke="#22c55e"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>

              {}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <span className="text-4xl font-semibold text-slate-200">
                  {circleLabel}
                </span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-base md:text-lg text-white">
                {overallAssessment}{" "}
                <span className={classificationClassName}>
                  {overallPrediction}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                Overall Confidence: {overallConfidence}%
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
