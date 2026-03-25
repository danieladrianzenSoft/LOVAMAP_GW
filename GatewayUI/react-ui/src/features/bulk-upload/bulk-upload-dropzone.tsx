import React, { useCallback, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import { BulkUploadStep } from "./bulk-upload-types";

const ACCEPTED_EXTENSIONS = [".glb", ".json", ".xlsx", ".xls"];

const BulkUploadDropzone: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const [files, setFiles] = useState<File[]>([]);
  const [isClassifying, setIsClassifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const valid = acceptedFiles.filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    if (valid.length !== acceptedFiles.length) {
      alert("Some files had unsupported extensions and were excluded.");
    }
    setFiles((prev) => [...prev, ...valid]);
  }, []);

  const handleClassify = async () => {
    if (files.length === 0) return;
    setIsClassifying(true);
    try {
      await bulkUploadStore.classifyFiles(files);
      bulkUploadStore.setStep(BulkUploadStep.Review);
    } catch (error) {
      console.error("Classification failed:", error);
      alert("Failed to classify files. Check the console for details.");
    } finally {
      setIsClassifying(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  });

  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 1: Drop Files</h2>
      <p className="text-sm text-gray-600 mb-4">
        Drop all your files at once: descriptor (.json / .xlsx), domain meshes (.glb),
        and metadata (.json with _metadata suffix).
      </p>
      <div className="mb-4 rounded border bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Descriptor rule: use one descriptor file if that file contains multiple scaffolds.
        Use multiple descriptor files only when each descriptor file contains exactly one scaffold.
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="block">
          <input
            type="file"
            multiple
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => {
              const selected = Array.from(e.target.files || []);
              onDrop(selected);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className="default-upload-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </button>
        </label>
        <span className="text-sm text-gray-500">
          {files.length > 0
            ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
            : "No files chosen"}
        </span>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 mb-4 cursor-pointer flex justify-center items-center transition-colors ${
          isDragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-gray-500">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop files here, or click to select"}
        </p>
      </div>

      {files.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-medium mb-2">Selected Files ({files.length})</h3>
          <div className="max-h-60 overflow-y-auto border rounded p-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between py-1 px-2 text-sm hover:bg-gray-50"
              >
                <span className="truncate mr-2" title={file.name}>{file.name}</span>
                <button
                  onClick={() => removeFile(i)}
                  className="text-red-500 hover:text-red-700 text-xs flex-shrink-0"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleClassify}
        disabled={files.length === 0 || isClassifying}
        className="button-primary"
      >
        {isClassifying ? "Classifying..." : "Continue to Review"}
      </button>
    </div>
  );
};

export default observer(BulkUploadDropzone);
