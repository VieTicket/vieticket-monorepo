import React from "react";
import { useTranslations } from "next-intl";

export function StepProgressBar({ step }: { step: number }) {
  const t = useTranslations("organizer-dashboard.CreateEvent");

  // Define the steps for the progress bar (labels pulled from i18n)
  const steps = [
    { label: t("steps.edit"), id: 1 },
    { label: t("steps.banner"), id: 2 },
    { label: t("steps.preview"), id: 3 },
    { label: t("steps.ticketing"), id: 4 },
  ];

  const progressPercentage = Math.min(
    100, // Cap at 100%
    Math.max(0, // Minimum at 0%
      ((step - 1) / (steps.length - 1)) * 100
    )
  );

  return (
    <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[400px] lg:max-w-4xl xl:max-w-6xl mx-auto mb-4 sm:mb-6 lg:mb-8 h-[50px] sm:h-[60px] lg:h-[67px] flex justify-between items-center px-3 sm:px-4 font-inter">
      {/* Background line for the progress bar */}
      <div
        className="absolute left-0 right-0 h-0.5 sm:h-1 bg-gray-200 rounded-full mx-auto"
        style={{
          width: `calc(100% - 0.75rem)`,
          top: "17px",
        }}
      ></div>

      {/* Active progress line, dynamically sized and animated */}
      <div
        className="absolute left-0 right-0 h-0.5 sm:h-1 rounded-full bg-gradient-to-r from-purple-400 to-purple-700 transition-all duration-700 ease-out mx-auto"
        style={{
          width: `calc(${progressPercentage}% )`, // Adjust width based on progress, accounting for padding
          marginLeft: "0rem",
          top: "17px",
        }}
      ></div>

      {/* Render each step marker (circle and label) */}
      {steps.map((item, index) => {
        // Calculate the position for each step marker
        const leftPosition = (index / (steps.length - 1)) * 100;
        const isCompleted = step > item.id;
        const isActive = step === item.id;
        const isPending = step < item.id;

        return (
          <div
            key={item.id}
            className="absolute flex flex-col items-center"
            style={{ left: `${leftPosition}%`, transform: "translateX(-50%)" }} // Center the circle on its position
          >
            {/* Circle for the step */}
            <div
              className={`
            relative w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out
        ${isCompleted ? "" : ""}
    ${isActive ? "shadow-lg animate-pulse-slight" : ""}
     ${isPending ? "" : ""}
  `}
              style={{
                backgroundColor:
                  isCompleted || isActive ? "rgb(42, 39, 63)" : "#f3f4f6", // bg-gray-100 fallback
                border: `${isActive ? "3px sm:4px" : "2px sm:3px"} solid ${isActive ? "rgb(42, 39, 63)" : "#d1d5db"}`, // gray-400 fallback
                borderWidth: isActive ? "3px" : "2px",
              }}
            >
              {isCompleted && (
                // Checkmark icon for completed steps
                <svg
                  className="w-2.5 h-2.5 sm:w-4 sm:h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              )}
              {isActive && (
                <div
                  className="w-2 h-2 sm:w-3 sm:h-3 rounded-full"
                  style={{ backgroundColor: "rgb(52, 48, 73)" }}
                ></div>
              )}
            </div>

            <span
              className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-center font-medium sm:font-semibold whitespace-nowrap transition-colors duration-300"
              style={{
                color:
                  isCompleted || isActive
                    ? "rgb(42, 39, 63)"
                    : "rgb(107, 114, 128)", // gray-600
              }}
            >
              {item.label}
            </span>
          </div>
        );
      })}

      {/* Add a keyframe for the subtle pulse animation */}
      <style jsx>{`
        @keyframes pulse-slight {
          0%,
          100% {
            transform: scale(1);
            box-shadow:
              0 4px 6px -1px rgba(42, 39, 63, 0.5),
              0 2px 4px -1px rgba(42, 39, 63, 0.5);
          }
          50% {
            transform: scale(1.05);
            box-shadow:
              0 10px 15px -3px rgba(42, 39, 63, 0.7),
              0 4px 6px -2px rgba(42, 39, 63, 0.7);
          }
        }
        .animate-pulse-slight {
          animation: pulse-slight 2s infinite ease-in-out;
        }
      `}</style>
    </div>
  );
}
