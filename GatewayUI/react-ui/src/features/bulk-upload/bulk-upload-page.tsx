import React from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep } from "./bulk-upload-types";
import BulkUploadDropzone from "./bulk-upload-dropzone";
import BulkUploadReview from "./bulk-upload-review";
import BulkUploadTargetSelector from "./bulk-upload-target-selector";
import BulkUploadPipeline from "./bulk-upload-pipeline";
import BulkUploadScreenshotQueue from "./bulk-upload-screenshot-queue";
import Stepper from "../../app/common/stepper/stepper";

const STEP_LABELS = ["Drop Files", "Review", "Target", "Upload", "Screenshots"];

const BulkUploadPage: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const { step } = bulkUploadStore;

  return (
    <div className="container mx-auto mt-10 px-4 lg:px-8 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Bulk Upload</h1>
        {step !== BulkUploadStep.Drop && (
          <button
            onClick={() => bulkUploadStore.reset()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Start Over
          </button>
        )}
      </div>

      <Stepper steps={STEP_LABELS} currentStep={step} />

      {/* Step content */}
      {step === BulkUploadStep.Drop && <BulkUploadDropzone />}
      {step === BulkUploadStep.Review && <BulkUploadReview />}
      {step === BulkUploadStep.Target && <BulkUploadTargetSelector />}
      {step === BulkUploadStep.Upload && <BulkUploadPipeline />}
      {step === BulkUploadStep.Screenshots && <BulkUploadScreenshotQueue />}
    </div>
  );
};

export default observer(BulkUploadPage);
