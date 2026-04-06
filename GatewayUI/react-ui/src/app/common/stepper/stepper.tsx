import React from "react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((label, i) => {
        const isCompleted = i < currentStep;
        const isCurrent = i === currentStep;
        const isUpcoming = i > currentStep;

        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <div className="flex-1 h-0.5 rounded-full bg-gray-300 overflow-hidden font-medium">
                <div
                  className={`h-full rounded-full bg-link-100 transition-all duration-500 ease-in-out ${
                    i <= currentStep ? "w-full" : "w-0"
                  }`}
                />
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors duration-500 font-medium ${
                isCurrent || isCompleted ? "text-link-100" : "text-gray-400"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-all duration-500 ${
                  isCompleted
                    ? "bg-link-100 text-white scale-100"
                    : isCurrent
                    ? "border-2 border-link-100 text-link-100 scale-110"
                    : "bg-gray-200 text-gray-500 scale-100"
                }`}
              >
                {isCompleted ? "\u2713" : i + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default Stepper;
