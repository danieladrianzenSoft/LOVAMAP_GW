import React, { useCallback, useEffect, useState } from "react";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";
import { JobDetailed } from "../../app/models/job";
import { useStore } from "../../app/stores/store";
import JobMeshViewer from "./job-mesh-viewer";
import ElapsedTime from "./elapsed-time";

type Props = {
  job: JobDetailed;
  onBack: () => void;
  onJobSubmitted?: () => void;
  formatDate: (d: any) => string;
  onDownloadResults: (jobId: string, suggestedFileName?: string) => Promise<void>;
};

const Row: React.FC<{ label: string; value?: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className="grid grid-cols-12 gap-3 py-2 border-b border-gray-100">
    <div className="col-span-4 md:col-span-3 text-sm text-gray-500">{label}</div>
    <div className="col-span-8 md:col-span-9 text-sm text-gray-800 break-words">
      {value ?? <span className="text-gray-400">—</span>}
    </div>
  </div>
);

const JobDetail: React.FC<Props> = ({ job, onBack, onJobSubmitted, formatDate, onDownloadResults }) => {
  const { jobStore } = useStore();
  const canDownload =
    (job.status ?? "").toLowerCase() === "completed" && job.hasResults === true;

  const isSegmentation = job.jobType === "ParticleSegmentation";
  const isLovamap = job.jobType === "Lovamap";
  const showMeshSection = canDownload && (isSegmentation || isLovamap);
  const canRunLovamap = canDownload && isSegmentation;

  const [showLovamapForm, setShowLovamapForm] = useState(false);
  const [lovamapSubmitting, setLovamapSubmitting] = useState(false);
  const [lovamapDx, setLovamapDx] = useState<number>(1.0);
  const [lovamapGenerateMesh, setLovamapGenerateMesh] = useState(true);
  const [lovamapError, setLovamapError] = useState<string | null>(null);

  const [meshBlobUrl, setMeshBlobUrl] = useState<string | null>(null);
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshError, setMeshError] = useState<string | null>(null);
  const [showMesh, setShowMesh] = useState(false);

  // Cleanup blob URL on unmount
  useEffect(() => {
    return () => {
      if (meshBlobUrl) URL.revokeObjectURL(meshBlobUrl);
    };
  }, [meshBlobUrl]);

  const fetchMesh = useCallback(async () => {
    if (meshBlobUrl) {
      setShowMesh(true);
      return;
    }
    setMeshLoading(true);
    setMeshError(null);
    try {
      const blob = await jobStore.getJobMesh(job.id);
      if (!blob) {
        setMeshError("Mesh not available for this job.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setMeshBlobUrl(url);
      setShowMesh(true);
    } catch {
      setMeshError("Failed to load mesh.");
    } finally {
      setMeshLoading(false);
    }
  }, [job.id, jobStore, meshBlobUrl]);

  const downloadMesh = useCallback(async () => {
    let url = meshBlobUrl;
    let needsRevoke = false;

    if (!url) {
      const blob = await jobStore.getJobMesh(job.id);
      if (!blob) return;
      url = URL.createObjectURL(blob);
      needsRevoke = true;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = `job_${job.id}_mesh.glb`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (needsRevoke) URL.revokeObjectURL(url);
  }, [job.id, jobStore, meshBlobUrl]);

  const handleDownload = async () => {
    if (!job.id) return;
    const fileName = job.fileName ? `${job.fileName}.json` : `${job.id}_results.json`;
    await onDownloadResults(job.id, fileName);
  };

  const handleLovamapSubmit = async () => {
    setLovamapSubmitting(true);
    setLovamapError(null);
    try {
      const result = await jobStore.submitLovamapFromSource({
        sourceJobId: job.id,
        dx: lovamapDx.toString(),
        generateMesh: lovamapGenerateMesh,
      });
      if (result) {
        if (onJobSubmitted) onJobSubmitted();
        else onBack();
      } else {
        setLovamapError("Failed to submit LOVAMAP analysis.");
      }
    } catch {
      setLovamapError("Failed to submit LOVAMAP analysis.");
    } finally {
      setLovamapSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <h1 className="text-3xl text-gray-700 font-bold mb-8 flex items-center gap-3">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Go back"
        >
          <FaArrowLeft className="w-5 h-5" />
        </button>
        Job Details
      </h1>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-sm text-gray-500 mt-1">
            Id: <span className="text-gray-700">{job.id}</span>
          </div>
        </div>

        <div className="px-5 py-4">
          <Row label="Type" value={job.jobType ?? undefined} />
          <Row
            label="Status"
            value={
              <span className="inline-flex items-center gap-2">
                {job.status}
                {(job.status === 'Pending' || job.status === 'Running') && (
                  <span className="text-gray-400">
                    <ElapsedTime since={job.submittedAt} />
                  </span>
                )}
              </span>
            }
          />
          <Row label="Submitted At" value={job.submittedAt ? formatDate(job.submittedAt) : undefined} />
          <Row label="Completed At" value={job.completedAt ? formatDate(job.completedAt) : undefined} />
          {job.sourceJobId && (
            <Row label="Derived From" value={job.sourceJobId} />
          )}

          <Row
            label="Results"
            value={
              job.hasResults === true ? (
                <>
                  <span className="inline-flex px-2 py-0.5 rounded-full bg-green-50 text-link-200 text-xs font-medium mb-2">
                    Available
                  </span>
                  {canDownload && (
                    <div className="flex gap-2 mt-1">
                      <button
                        className="button-primary items-center content-center w-32"
                        onClick={handleDownload}
                      >
                        Download JSON
                      </button>
                    </div>
                  )}
                </>

              ) : job.hasResults === false ? (
                <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                  No
                </span>
              ) : undefined
            }
          />

          {showMeshSection && (
            <Row
              label="Mesh"
              value={
                <div>
                  <div className="flex gap-2 mb-2">
                    <button
                      className="button-primary items-center content-center flex gap-1"
                      onClick={fetchMesh}
                      disabled={meshLoading}
                    >
                      {meshLoading && <FaSpinner className="animate-spin" />}
                      {showMesh ? 'Viewing' : 'View Mesh'}
                    </button>
                    <button
                      className="button-outline items-center content-center"
                      onClick={downloadMesh}
                    >
                      Download Mesh
                    </button>
                  </div>
                  {meshError && (
                    <p className="text-sm text-red-500">{meshError}</p>
                  )}
                  {showMesh && meshBlobUrl && (
                    <div className="mt-2">
                      <JobMeshViewer blobUrl={meshBlobUrl} />
                    </div>
                  )}
                </div>
              }
            />
          )}

          {canRunLovamap && (
            <Row
              label="LOVAMAP Analysis"
              value={
                <div>
                  {!showLovamapForm ? (
                    <button
                      className="button-primary items-center content-center"
                      onClick={() => setShowLovamapForm(true)}
                    >
                      Run LOVAMAP Analysis
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-24">dx (voxel size)</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0.01"
                          value={lovamapDx}
                          onChange={(e) => setLovamapDx(parseFloat(e.target.value) || 1)}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-24"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-600 w-24">Generate mesh</label>
                        <input
                          type="checkbox"
                          checked={lovamapGenerateMesh}
                          onChange={(e) => setLovamapGenerateMesh(e.target.checked)}
                          className="h-4 w-4"
                        />
                      </div>
                      {lovamapError && (
                        <p className="text-sm text-red-500">{lovamapError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          className="button-primary items-center content-center flex gap-1"
                          onClick={handleLovamapSubmit}
                          disabled={lovamapSubmitting}
                        >
                          {lovamapSubmitting && <FaSpinner className="animate-spin" />}
                          Submit
                        </button>
                        <button
                          className="button-outline items-center content-center"
                          onClick={() => {
                            setShowLovamapForm(false);
                            setLovamapError(null);
                          }}
                          disabled={lovamapSubmitting}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default JobDetail;
