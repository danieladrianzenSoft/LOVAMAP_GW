import React, { useState } from "react";
// import { Formik, Form, Field, ErrorMessage } from "formik";
// import * as Yup from "yup";
import UploadFile from '../../app/common/upload-file/upload-file';
import { Preview3D } from "./preview3d";
// import { Job } from "../../app/models/job";

type Props = {
  onUploadSubmit: (file: File) => Promise<any> | any;  // parent will submit job
  onUploadError: (err: any) => void;
  onBack: () => void;
  dx?: number; // optional display-only; parent can pass the dx captured in step 1
};

export const JobForm: React.FC<Props> = ({ onUploadSubmit, onUploadError, onBack, dx }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleUploadSelect = async (files: File[]) => {
    try {
      // Just keep the files; don't submit to backend yet
      const file = files[0] ?? null;
      if (!file) return;
      setSelectedFile(file);
      console.log("selected file:", selectedFile);
    } catch (e) {
      onUploadError(e);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };
  
  const handleJobSubmit = async () => {
    if (!selectedFile) {
      onUploadError("No file selected");
      return;
    }

    try {
      setIsSubmitting(true);
      await onUploadSubmit(selectedFile);  // 👈 call parent (RunJob.handleSubmitJob)
    } catch (e) {
      onUploadError(e);
    } finally {
      setIsSubmitting(false);
    }
  };


  const submitDisabled = isSubmitting || !selectedFile;

  return (
    <div className="p-4 bg-white rounded">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center">
        <h3 className="text-lg mb-2 md:mb-4 w-full font-semibold">
          3. Upload your 3D geometry as a .csv, .dat or .json file and verify that it looks as expected
        </h3>
        <div className="flex justify-end space-x-1 w-full md:w-auto">
          <button type="button" className="button-outline" onClick={onBack}>Back</button>
          <button
            type="button"
            className="button-outline disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleJobSubmit}
            disabled={submitDisabled}
          >
            {isSubmitting ? "Queueing job..." : "Submit"}
          </button>
        </div>
      </div>

      {/* === STATE 1: Upload UI === */}
      {!selectedFile && (
        <div className="mt-2">
          <UploadFile
            acceptedFileTypes={{
              "application/json": [".json"],
              "text/csv": [".csv"],
              "application/octet-stream": [".dat"],
            }}
            onUploadSubmit={handleUploadSelect}
            onUploadError={onUploadError}
            isUploadDisabled={isSubmitting}
            uploadButtonLabel={isSubmitting ? "Uploading file..." : "Select file"}
          />
          <p className="text-sm text-gray-500 mt-2">
            After choosing a file, a 3D preview will appear here.
          </p>
        </div>
      )}

      {/* === STATE 2: Preview UI === */}
      {selectedFile && (
        <>
          <div className="flex justify-end mb-0 mt-4">
            <button
              type="button"
              className="text-md text-blue-600 hover:underline"
              onClick={handleClearFile}
              disabled={isSubmitting}
            >
              Select another file
            </button>
          </div>

          <Preview3D file={selectedFile} />
        </>
      )}
    </div>
  );
};

export default JobForm;