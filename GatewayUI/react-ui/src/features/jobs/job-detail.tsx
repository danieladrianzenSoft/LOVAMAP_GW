import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaSpinner } from "react-icons/fa";
import { JobDetailed } from "../../app/models/job";
import { useStore } from "../../app/stores/store";
import { downloadScaffoldGroupAsExcel, triggerDownload } from "../../app/common/excel-generator/excel-generator";
import JobMeshViewer from "./job-mesh-viewer";
import ElapsedTime from "./elapsed-time";
import LovamapScaffoldForm from "./lovamap-scaffold-form";
import History from "../../app/helpers/History";

type Props = {
  job: JobDetailed;
  onBack: () => void;
  onJobSubmitted?: () => void;
  formatDate: (d: any) => string;
  onDownloadResults: (jobId: string, suggestedFileName?: string) => Promise<void>;
};

const Row: React.FC<{ label: React.ReactNode; value?: React.ReactNode }> = ({
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
  const { jobStore, scaffoldGroupStore } = useStore();
  const [savedScaffoldGroupId, setSavedScaffoldGroupId] = useState<number | null>(null);
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

  const [lovamapResults, setLovamapResults] = useState<any | null>(null);
  const [showScaffoldForm, setShowScaffoldForm] = useState(false);
  const [scaffoldFormIntent, setScaffoldFormIntent] = useState<'download' | 'interact'>('download');
  const [resultsLoading, setResultsLoading] = useState(false);
  const [interactLoading, setInteractLoading] = useState(false);
  const [savedScaffoldId, setSavedScaffoldId] = useState<number | null>(null);

  const [meshBlobUrl, setMeshBlobUrl] = useState<string | null>(null);
  const [meshLoading, setMeshLoading] = useState(false);
  const [meshError, setMeshError] = useState<string | null>(null);
  const [showMesh, setShowMesh] = useState(false);

  const [particleMeshBlobUrl, setParticleMeshBlobUrl] = useState<string | null>(null);
  const [particleMeshLoading, setParticleMeshLoading] = useState(false);
  const [particleMeshError, setParticleMeshError] = useState<string | null>(null);
  const [showParticleMesh, setShowParticleMesh] = useState(false);

  // Mesh readiness per mesh: checking → ready/generating/failed/stopped/unavailable/not-available
  type MeshReadiness = 'checking' | 'ready' | 'generating' | 'failed' | 'stopped' | 'unavailable' | 'not-available';
  const [poreMeshState, setPoreMeshState] = useState<MeshReadiness>('checking');
  const [particleMeshState, setParticleMeshState] = useState<MeshReadiness>('checking');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollCountRef = useRef(0);
  const unavailableCountRef = useRef(0);
  const MAX_POLLS = 360; // 5s × 360 = 30 min
  const MAX_UNAVAILABLE_RETRIES = 6; // 30s of Core unavailability before giving up

  const statusToMeshState = (s: string | null): MeshReadiness => {
    if (s === null) return 'not-available';
    if (s === 'Completed') return 'ready';
    if (s === 'Failed') return 'failed';
    if (s === 'Stopped') return 'stopped';
    if (s === 'Unavailable') return 'generating'; // keep showing generating while retrying
    return 'generating'; // Pending, Running
  };

  const isMeshTerminal = (s: MeshReadiness) =>
    s === 'ready' || s === 'failed' || s === 'stopped' || s === 'not-available' || s === 'unavailable';

  // Poll mesh child job statuses via the lightweight mesh-status endpoint
  useEffect(() => {
    if (!showMeshSection || !isLovamap) return;
    let cancelled = false;
    let poreResolved = false;
    let particleResolved = false;

    const pollStatus = async () => {
      if (cancelled) return;

      const status = await jobStore.getMeshStatus(job.id);
      if (cancelled) return;

      if (!status) {
        unavailableCountRef.current++;
        if (unavailableCountRef.current >= MAX_UNAVAILABLE_RETRIES) {
          if (!poreResolved) setPoreMeshState('unavailable');
          if (!particleResolved) setParticleMeshState('unavailable');
          stopPolling();
        }
        return;
      }

      unavailableCountRef.current = 0;

      if (!poreResolved) {
        const s = statusToMeshState(status.poreMeshStatus);
        setPoreMeshState(s);
        if (isMeshTerminal(s)) poreResolved = true;

        // Track unavailable for pore specifically
        if (status.poreMeshStatus === 'Unavailable') {
          unavailableCountRef.current++;
        }
      }

      if (!particleResolved) {
        const s = statusToMeshState(status.particleMeshStatus);
        setParticleMeshState(s);
        if (isMeshTerminal(s)) particleResolved = true;
      }

      if (unavailableCountRef.current >= MAX_UNAVAILABLE_RETRIES) {
        if (!poreResolved) setPoreMeshState('unavailable');
        if (!particleResolved) setParticleMeshState('unavailable');
        stopPolling();
        return;
      }

      pollCountRef.current++;
      if ((poreResolved && particleResolved) || pollCountRef.current >= MAX_POLLS) {
        stopPolling();
      }
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    pollStatus();
    pollTimerRef.current = setInterval(pollStatus, 5000);

    return () => {
      cancelled = true;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [showMeshSection, isLovamap, job.id, jobStore]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (meshBlobUrl) URL.revokeObjectURL(meshBlobUrl);
      if (particleMeshBlobUrl) URL.revokeObjectURL(particleMeshBlobUrl);
    };
  }, [meshBlobUrl, particleMeshBlobUrl]);

  const fetchMesh = useCallback(async () => {
    if (meshBlobUrl) {
      setShowMesh((v) => !v);
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
    a.download = isLovamap ? `job_${job.id}_pore_mesh.glb` : `job_${job.id}_mesh.glb`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (needsRevoke) URL.revokeObjectURL(url);
  }, [job.id, jobStore, meshBlobUrl, isLovamap]);

  const fetchParticleMesh = useCallback(async () => {
    if (particleMeshBlobUrl) {
      setShowParticleMesh((v) => !v);
      return;
    }
    setParticleMeshLoading(true);
    setParticleMeshError(null);
    try {
      const blob = await jobStore.getJobParticleMesh(job.id);
      if (!blob) {
        setParticleMeshError("Particle mesh not available for this job.");
        return;
      }
      const url = URL.createObjectURL(blob);
      setParticleMeshBlobUrl(url);
      setShowParticleMesh(true);
    } catch {
      setParticleMeshError("Failed to load particle mesh.");
    } finally {
      setParticleMeshLoading(false);
    }
  }, [job.id, jobStore, particleMeshBlobUrl]);

  const downloadParticleMesh = useCallback(async () => {
    let url = particleMeshBlobUrl;
    let needsRevoke = false;

    if (!url) {
      const blob = await jobStore.getJobParticleMesh(job.id);
      if (!blob) return;
      url = URL.createObjectURL(blob);
      needsRevoke = true;
    }

    const a = document.createElement("a");
    a.href = url;
    a.download = `job_${job.id}_particle_mesh.glb`;
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (needsRevoke) URL.revokeObjectURL(url);
  }, [job.id, jobStore, particleMeshBlobUrl]);

  const downloadScaffoldExcel = async (scaffoldGroupId: number) => {
    setResultsLoading(true);
    try {
      const scaffoldGroup = await scaffoldGroupStore.getDetailedScaffoldGroupById({ scaffoldGroupId });
      if (scaffoldGroup) {
        const data = downloadScaffoldGroupAsExcel(scaffoldGroup);
        triggerDownload(data.file, data.filename);
      }
    } catch (err) {
      console.error("Failed to download scaffold Excel:", err);
    } finally {
      setResultsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!job.id) return;

    if (isLovamap) {
      // If scaffold already saved (in-session or persisted), skip the form
      const existingId = savedScaffoldGroupId ?? job.scaffoldGroupId;
      if (existingId) {
        await downloadScaffoldExcel(existingId);
        return;
      }

      setResultsLoading(true);
      try {
        const json = await jobStore.getJobResultAsJson(job.id);
        if (json) {
          setLovamapResults(json);
          setScaffoldFormIntent('download');
          setShowScaffoldForm(true);
        }
      } catch {
        // fall back to normal download on parse error
        const fileName = job.fileName ? `${job.fileName}.json` : `${job.id}_results.json`;
        await onDownloadResults(job.id, fileName);
      } finally {
        setResultsLoading(false);
      }
      return;
    }

    const fileName = job.fileName ? `${job.fileName}.json` : `${job.id}_results.json`;
    await onDownloadResults(job.id, fileName);
  };

  const handleInteract = async () => {
    if (!job.id) return;

    // If scaffold already exists, navigate directly
    const existingScaffoldId = savedScaffoldId ?? job.scaffoldId;
    if (existingScaffoldId) {
      await scaffoldGroupStore.navigateToVisualization(null, existingScaffoldId);
      History.push(`/visualize/${existingScaffoldId}`);
      return;
    }

    // Otherwise, trigger scaffold creation flow then navigate
    setInteractLoading(true);
    try {
      const json = await jobStore.getJobResultAsJson(job.id);
      if (json) {
        setLovamapResults(json);
        setScaffoldFormIntent('interact');
        setShowScaffoldForm(true);
      }
    } catch {
      console.error("Failed to load results for interact.");
    } finally {
      setInteractLoading(false);
    }
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
          <div className="flex items-center justify-between mt-1">
            <div className="text-sm text-gray-500">
              Id: <span className="text-gray-700">{job.id}</span>
            </div>
            {isLovamap && canDownload && (
              <button
                className="button-primary text-sm px-4 py-1.5 flex items-center gap-1"
                onClick={handleInteract}
                disabled={interactLoading}
              >
                {interactLoading && <FaSpinner className="animate-spin" />}
                Interact
              </button>
            )}
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
                        className="button-primary items-center content-center w-32 flex gap-1 justify-center"
                        onClick={handleDownload}
                        disabled={resultsLoading}
                      >
                        {resultsLoading && <FaSpinner className="animate-spin" />}
                        {isLovamap ? "Download" : "Download JSON"}
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

          {showMeshSection && isLovamap && (
            <>
              <Row
                label="Pore Mesh"
                value={
                  poreMeshState === 'checking' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <FaSpinner className="animate-spin" /> Checking...
                    </span>
                  ) : poreMeshState === 'ready' ? (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <button
                          className="button-primary items-center content-center flex gap-1"
                          onClick={fetchMesh}
                          disabled={meshLoading}
                        >
                          {meshLoading && <FaSpinner className="animate-spin" />}
                          {showMesh ? 'Hide' : 'View Pore Mesh'}
                        </button>
                        <button
                          className="button-outline items-center content-center"
                          onClick={downloadMesh}
                        >
                          Download Pore Mesh
                        </button>
                      </div>
                      {meshError && <p className="text-sm text-red-500">{meshError}</p>}
                      {showMesh && meshBlobUrl && (
                        <div className="mt-2">
                          <JobMeshViewer blobUrl={meshBlobUrl} />
                        </div>
                      )}
                    </div>
                  ) : poreMeshState === 'generating' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <FaSpinner className="animate-spin" /> Generating pore mesh...
                    </span>
                  ) : poreMeshState === 'failed' || poreMeshState === 'stopped' ? (
                    <span className="text-sm text-red-500">
                      Pore mesh generation {poreMeshState}
                    </span>
                  ) : poreMeshState === 'unavailable' ? (
                    <span className="text-sm text-gray-400">
                      Processing server unavailable
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Not available</span>
                  )
                }
              />
              <Row
                label="Particle Mesh"
                value={
                  particleMeshState === 'checking' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                      <FaSpinner className="animate-spin" /> Checking...
                    </span>
                  ) : particleMeshState === 'ready' ? (
                    <div>
                      <div className="flex gap-2 mb-2">
                        <button
                          className="button-primary items-center content-center flex gap-1"
                          onClick={fetchParticleMesh}
                          disabled={particleMeshLoading}
                        >
                          {particleMeshLoading && <FaSpinner className="animate-spin" />}
                          {showParticleMesh ? 'Hide' : 'View Particle Mesh'}
                        </button>
                        <button
                          className="button-outline items-center content-center"
                          onClick={downloadParticleMesh}
                        >
                          Download Particle Mesh
                        </button>
                      </div>
                      {particleMeshError && <p className="text-sm text-red-500">{particleMeshError}</p>}
                      {showParticleMesh && particleMeshBlobUrl && (
                        <div className="mt-2">
                          <JobMeshViewer blobUrl={particleMeshBlobUrl} />
                        </div>
                      )}
                    </div>
                  ) : particleMeshState === 'generating' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <FaSpinner className="animate-spin" /> Generating particle mesh...
                    </span>
                  ) : particleMeshState === 'failed' || particleMeshState === 'stopped' ? (
                    <span className="text-sm text-red-500">
                      Particle mesh generation {particleMeshState}
                    </span>
                  ) : particleMeshState === 'unavailable' ? (
                    <span className="text-sm text-gray-400">
                      Processing server unavailable
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">Not available</span>
                  )
                }
              />
            </>
          )}

          {showMeshSection && !isLovamap && (
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
              label={<>LOVAMAP Analysis<span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-amber-100 text-amber-700 leading-none align-middle">Beta</span></>}
              value={
                <div>
                  {!showLovamapForm ? (
                    <button
                      className="button-primary items-center content-center"
                      onClick={() => { setShowLovamapForm(true); fetchMesh(); }}
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

      {showScaffoldForm && lovamapResults && (
        <LovamapScaffoldForm
          jobId={job.id}
          results={lovamapResults}
          onClose={() => setShowScaffoldForm(false)}
          onSaved={async (scaffoldGroupId, scaffoldId) => {
            setSavedScaffoldGroupId(scaffoldGroupId);
            if (scaffoldId) setSavedScaffoldId(scaffoldId);
            setShowScaffoldForm(false);
            if (scaffoldFormIntent === 'interact' && scaffoldId) {
              await scaffoldGroupStore.navigateToVisualization(null, scaffoldId);
              History.push(`/visualize/${scaffoldId}`);
            } else {
              downloadScaffoldExcel(scaffoldGroupId);
            }
          }}
        />
      )}
    </div>
  );
};

export default JobDetail;
