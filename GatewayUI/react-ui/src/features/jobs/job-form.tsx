import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import UploadFile from '../../app/common/upload-file/upload-file';
import { Job } from "../../app/models/job";

type Props = {
  onUploadSubmit: (files: File[]) => Promise<any> | any;  // parent will submit job
  onUploadError: (err: any) => void;
  onBack: () => void;
  dx?: number; // optional display-only; parent can pass the dx captured in step 1
};

export const JobForm: React.FC<Props> = ({ onUploadSubmit, onUploadError, onBack, dx }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[] | null>(null);

  const handleUploadSelect = async (files: File[]) => {
    try {
      // Just keep the files; don't submit to backend yet
      setSelectedFiles(files);
    } catch (e) {
      onUploadError(e);
    }
  };

  const handleSubmitClick = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    try {
      setIsSubmitting(true);
      await onUploadSubmit(selectedFiles);
    } catch (e) {
      onUploadError(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitDisabled = isSubmitting || !selectedFiles || selectedFiles.length === 0;

  return (
    <div className="p-4 bg-white rounded">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <h3 className="text-lg mb-2 md:mb-4 w-full font-semibold">
          3. Upload your 3D geometry as a .csv, .dat or .json file
        </h3>
        <div className="flex justify-end space-x-1 w-full md:w-auto">
          <button type="button" className="button-outline" onClick={onBack}>Back</button>
          <button
            type="button"
            className="button-outline disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmitClick}
            disabled={submitDisabled}
          >
            {isSubmitting ? "Queueing job..." : "Submit"}
          </button>
        </div>
      </div>

      <UploadFile
        acceptedFileTypes={{
          "application/json": [".json"],
          "text/csv": [".csv"],
          "application/octet-stream": [".dat"]
        }}
        // Treat "submit" here as "select"; we store files locally
        onUploadSubmit={handleUploadSelect}
        onUploadError={onUploadError}
      />
    </div>
  );
};

export default JobForm;