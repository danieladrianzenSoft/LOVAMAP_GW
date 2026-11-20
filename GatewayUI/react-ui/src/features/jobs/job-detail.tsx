import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaArrowLeft, FaDownload, FaExpand, FaSpinner, FaStop } from "react-icons/fa";
import { JobDetailed, PreviewInfo } from "../../app/models/job";
import { useStore } from "../../app/stores/store";
import { downloadScaffoldGroupAsExcel, triggerDownload } from "../../app/common/excel-generator/excel-generator";
import JobMeshViewer from "./job-mesh-viewer";
import ElapsedTime from "./elapsed-time";
import LovamapScaffoldForm from "./lovamap-scaffold-form";
import SegmentationComparisonView from "./segmentation-comparison-view";
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

const CLUSTER_EXTERIOR_PORES_HELP =
  'Merges boundary pores connected through surface pathways into a single pore. ' +
  'Can give a more realistic picture near the domain boundary, but produces a few ' +
  'very large merged pores that can skew size statistics.';

const JobDetail: React.FC<Props> = ({ job, onBack, onJobSubmitted, formatDate, onDownloadResults }) => {
  const { jobStore, scaffoldGroupStore, userStore } = useStore();
  const [savedScaffoldGroupId, setSavedScaffoldGroupId] = useState<number | null>(null);
  const canDownload =
    (job.status ?? "").toLowerCase() === "completed" && job.hasResults === true;

  const isSegmentation = job.jobType === "ParticleSegmentation";
  const isLovamap = job.jobType === "Lovamap";
  const isMeshProcessing = job.jobType === "MeshProcessing";
  const showMeshSection = canDownload && (isSegmentation || isLovamap || isMeshProcessing);
  const canRunLovamap = canDownload && isSegmentation;

  const isAdmin = userStore.user?.roles?.includes('administrator') ?? false;

  const [showLovamapForm, setShowLovamapForm] = useState(false);
  const [lovamapSubmitting, setLovamapSubmitting] = useState(false);
  const [lovamapGenerateMesh, setLovamapGenerateMesh] = useState(true);
  const [lovamapClusterExteriorPores, setLovamapClusterExteriorPores] = useState(false);
  const [lovamapError, setLovamapError] = useState<string | null>(null);

  // Admin job transfer state
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferQuery, setTransferQuery] = useState('');
  const [transferResults, setTransferResults] = useState<{ id: string; email: string }[]>([]);
  const [transferTarget, setTransferTarget] = useState<{ id: string; email: string } | null>(null);
  const [transferring, setTransferring] = useState(false);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);
  const transferDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [cancelling, setCancelling] = useState(false);
  const [inputDownloading, setInputDownloading] = useState(false);

  const [particleMeshBlobUrl, setParticleMeshBlobUrl] = useState<string | null>(null);
  const [particleMeshLoading, setParticleMeshLoading] = useState(false);
  const [particleMeshError, setParticleMeshError] = useState<string | null>(null);
  const [showParticleMesh, setShowParticleMesh] = useState(false);

  // Segmentation preview state — URLs keyed by filename for reliable matching
  const [previewUrlMap, setPreviewUrlMap] = useState<Record<string, string>>({});
  const [previewInfo, setPreviewInfo] = useState<PreviewInfo | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const previewFetchedForRef = useRef<string | null>(null);

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
    if (!showMeshSection) return;

    // MeshProcessing jobs ARE the mesh job — no children to poll
    if (isMeshProcessing) {
      setPoreMeshState('not-available');
      setParticleMeshState('ready');
      return;
    }

    let cancelled = false;
    let poreResolved = isSegmentation; // segmentation has no pore mesh
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
  }, [showMeshSection, isSegmentation, job.id, jobStore]);

  // Cleanup blob URLs on unmount
  // Track blob URLs in refs so cleanup only happens on unmount
  const meshBlobUrlRef = useRef(meshBlobUrl);
  meshBlobUrlRef.current = meshBlobUrl;
  const particleMeshBlobUrlRef = useRef(particleMeshBlobUrl);
  particleMeshBlobUrlRef.current = particleMeshBlobUrl;
  const previewUrlMapRef = useRef(previewUrlMap);
  previewUrlMapRef.current = previewUrlMap;

  useEffect(() => {
    return () => {
      if (meshBlobUrlRef.current) URL.revokeObjectURL(meshBlobUrlRef.current);
      if (particleMeshBlobUrlRef.current) URL.revokeObjectURL(particleMeshBlobUrlRef.current);
      Object.values(previewUrlMapRef.current).forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  // Fetch segmentation preview images once job is Running/Completed/Failed
  // previewFetchedRef ensures single execution; no cancelled flag needed.
  // Fetch segmentation preview images:
  // - First fetch when job enters Running (input slices only)
  // - Re-fetch when job enters Completed (to get segmented slices + updated info)
  useEffect(() => {
    if (!isSegmentation) return;
    const status = job.status ?? '';
    if (!['Running', 'Completed', 'Failed'].includes(status)) return;
    if (previewFetchedForRef.current === status) return;
    if (previewFetchedForRef.current === 'Completed') return;
    previewFetchedForRef.current = status;

    const fetchPreviews = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const list = await jobStore.getPreviewList(job.id);
        if (!list?.files?.length) {
          setPreviewLoading(false);
          return;
        }

        const results = await Promise.allSettled(
          list.files.map(async (file) => {
            const blob = await jobStore.getPreviewFile(job.id, file);
            return { file, blob };
          })
        );

        const newUrlMap: Record<string, string> = {};
        let info: PreviewInfo | null = null;

        for (const result of results) {
          if (result.status !== 'fulfilled' || !result.value.blob) continue;
          const { file, blob } = result.value;
          if (file.endsWith('.json')) {
            try {
              info = JSON.parse(await blob.text()) as PreviewInfo;
            } catch { /* ignore parse errors */ }
          } else {
            newUrlMap[file] = URL.createObjectURL(blob);
          }
        }

        // Merge with existing URLs (keep input slices from first fetch, add segmented)
        setPreviewUrlMap((prev) => {
          for (const [name, url] of Object.entries(prev)) {
            if (newUrlMap[name]) URL.revokeObjectURL(url);
          }
          return { ...prev, ...newUrlMap };
        });
        if (info) setPreviewInfo(info);
      } catch {
        setPreviewError("Could not load preview images.");
      } finally {
        setPreviewLoading(false);
      }
    };

    fetchPreviews();
  }, [isSegmentation, job.status, job.id, jobStore]);

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
        generateMesh: lovamapGenerateMesh,
        clusterExteriorPores: lovamapClusterExteriorPores || undefined,
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
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  className="button-outline text-sm px-3 py-1"
                  onClick={() => setShowTransfer((v) => !v)}
                >
                  Transfer Job
                </button>
              )}
              {isLovamap && canDownload && (
                <button
                  className="button-primary text-sm px-3 py-1 flex items-center gap-1"
                  onClick={handleInteract}
                  disabled={interactLoading}
                >
                  {interactLoading && <FaSpinner className="animate-spin" />}
                  Interact
                </button>
              )}
            </div>
          </div>
          {showTransfer && (
            <div className="mt-3 p-3 rounded-lg border border-gray-200 bg-gray-50 space-y-2">
              <div className="text-sm text-gray-600 font-medium">Transfer to another user</div>
              <input
                type="text"
                placeholder="Search by email..."
                value={transferQuery}
                onChange={(e) => {
                  const q = e.target.value;
                  setTransferQuery(q);
                  setTransferTarget(null);
                  setTransferSuccess(null);
                  if (transferDebounceRef.current) clearTimeout(transferDebounceRef.current);
                  if (q.length >= 2) {
                    transferDebounceRef.current = setTimeout(async () => {
                      const results = await jobStore.searchUsers(q);
                      setTransferResults(results);
                    }, 400);
                  } else {
                    setTransferResults([]);
                  }
                }}
                className="border border-gray-300 rounded px-2 py-1 text-sm w-full"
              />
              {transferResults.length > 0 && !transferTarget && (
                <div className="border border-gray-200 rounded bg-white max-h-40 overflow-auto">
                  {transferResults.map((u) => (
                    <button
                      key={u.id}
                      className="block w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50"
                      onClick={() => {
                        setTransferTarget(u);
                        setTransferQuery(u.email);
                        setTransferResults([]);
                      }}
                    >
                      {u.email}
                    </button>
                  ))}
                </div>
              )}
              {transferTarget && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">Transfer to: <strong>{transferTarget.email}</strong></span>
                  <button
                    className="button-primary text-sm px-3 py-1 flex items-center gap-1"
                    disabled={transferring}
                    onClick={async () => {
                      setTransferring(true);
                      const ok = await jobStore.transferJob(job.id, transferTarget.id);
                      setTransferring(false);
                      if (ok) {
                        setTransferSuccess(`Job transferred to ${transferTarget.email}`);
                        setShowTransfer(false);
                        setTransferQuery('');
                        setTransferTarget(null);
                      }
                    }}
                  >
                    {transferring && <FaSpinner className="animate-spin" />}
                    Confirm Transfer
                  </button>
                </div>
              )}
              {transferSuccess && (
                <p className="text-sm text-green-600">{transferSuccess}</p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4">
          <Row label="Type" value={job.jobType ?? undefined} />
          {isAdmin && job.creatorEmail && (
            <Row label="Owner" value={job.creatorEmail} />
          )}
          <Row
            label="Status"
            value={
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-2">
                    {job.status === 'Failed' ? (
                      <span className="text-red-600 font-medium">{job.status}</span>
                    ) : (
                      <span>{job.status}</span>
                    )}
                    {(job.status === 'Pending' || job.status === 'Running') && (
                      <span className="text-gray-400">
                        <ElapsedTime since={job.submittedAt} />
                      </span>
                    )}
                  </span>
                  {(job.status === 'Pending' || job.status === 'Running') && (
                    <button
                      className="button-outline text-sm px-3 py-1 flex items-center gap-1 text-red-600 border-red-300 hover:bg-red-50"
                      disabled={cancelling}
                      onClick={async () => {
                        if (!window.confirm('Are you sure you want to cancel this job?')) return;
                        setCancelling(true);
                        const success = await jobStore.cancelJob(job.id);
                        setCancelling(false);
                        if (success) onBack();
                      }}
                    >
                      {cancelling ? <FaSpinner className="animate-spin" /> : <FaStop className="w-3 h-3" />}
                      Cancel
                    </button>
                  )}
                  {(job.status === 'Completed' || job.status === 'Failed') && (
                    <button
                      className="button-outline text-sm px-3 py-1 flex items-center gap-1"
                      onClick={async () => {
                        const blob = await jobStore.getJobLogs(job.id);
                        if (!blob) return;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `job_${job.id}_logs.txt`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <FaDownload className="w-3 h-3" /> Logs
                    </button>
                  )}
                </div>
                {job.submittedAt && (
                  <div className="text-sm py-0.5">
                    <span className="text-gray-500">Submitted </span>
                    <span className="text-gray-800">{formatDate(job.submittedAt)}</span>
                  </div>
                )}
                {job.completedAt && (
                  <div className="text-sm py-0.5">
                    <span className="text-gray-500">Completed </span>
                    <span className="text-gray-800">{formatDate(job.completedAt)}</span>
                  </div>
                )}
                {job.status === 'Failed' && job.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">{job.errorMessage}</p>
                    {job.errorMessage.includes('[INPUT]') && job.errorMessage.includes('Missing required parameters') && (
                      <p className="text-sm text-red-600 mt-2">
                        This is an input error — the job will not retry. Please resubmit with the missing parameters filled in. You can find voxel dimension values (dx, dy, dz) in your microscope acquisition settings.
                      </p>
                    )}
                  </div>
                )}
              </div>
            }
          />
          {isSegmentation && (job.segmentationParams || previewInfo) && (
            <Row
              label="Inputs"
              value={(() => {
                const params = job.segmentationParams;
                const fmt = (v: string | undefined) => v != null ? Number(Number(v).toFixed(4)) : '?';
                return (
                  <div className="text-sm text-gray-800 space-y-1">
                    {params && (
                      <>
                        <p>
                          <span className="text-gray-500">Voxel size (µm):</span>{' '}
                          dx = {fmt(params.dx)}, dy = {fmt(params.dy)}, dz = {fmt(params.dz)}
                        </p>
                        <p>
                          <span className="text-gray-500">Fluorescent label:</span> {params.fluorescentLabel ?? '?'}
                          {' | '}
                          <span className="text-gray-500">Radius (µm):</span> {params.radiusUm ?? '?'}
                        </p>
                        {params.resolution && (
                          <p>
                            <span className="text-gray-500">Resolution:</span>{' '}
                            {params.resolution === 'high' ? 'High (~200M voxels)' : 'Normal (~50M voxels)'}
                          </p>
                        )}
                      </>
                    )}
                    {!params && previewInfo && (
                      <p>
                        <span className="text-gray-500">Voxel size (µm):</span>{' '}
                        dx = {previewInfo.voxel_size.dx != null ? Number(previewInfo.voxel_size.dx.toFixed(4)) : '?'},{' '}
                        dy = {previewInfo.voxel_size.dy != null ? Number(previewInfo.voxel_size.dy.toFixed(4)) : '?'},{' '}
                        dz = {previewInfo.voxel_size.dz != null ? Number(previewInfo.voxel_size.dz.toFixed(4)) : '?'}
                      </p>
                    )}
                    {previewInfo && (
                      <>
                        <p>
                          <span className="text-gray-500">Input dimensions:</span>{' '}
                          {previewInfo.dimensions.x} × {previewInfo.dimensions.y} × {previewInfo.dimensions.z} voxels
                          {' '}({(previewInfo.dimensions.x * previewInfo.dimensions.y * previewInfo.dimensions.z).toExponential(2)})
                        </p>
                        {previewInfo.estimated_domain_voxels != null && (
                          <p>
                            <span className="text-gray-500">Domain voxels (resized):</span>{' '}
                            {previewInfo.estimated_domain_voxels.toExponential(2)}
                            {previewInfo.resized_voxel_size != null && (
                              <span className="text-gray-400"> — voxel size {previewInfo.resized_voxel_size} µm</span>
                            )}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                );
              })()}
            />
          )}

          {job.sourceJobId && (
            <Row label="Derived From" value={job.sourceJobId} />
          )}
          <Row
            label="Results"
            value={
              canDownload ? (
                <button
                  className="button-outline text-sm px-3 py-1 flex items-center gap-1"
                  onClick={handleDownload}
                  disabled={resultsLoading}
                >
                  {resultsLoading && <FaSpinner className="animate-spin" />}
                  <FaDownload className="w-3 h-3" /> Download
                </button>
              ) : job.hasResults === false ? (
                <span className="text-sm text-gray-400">Not available</span>
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
                        <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={downloadMesh}>
                          <FaDownload className="w-3 h-3" /> Download
                        </button>
                        <button className="button-primary text-sm px-3 py-1 flex items-center gap-1" onClick={fetchMesh} disabled={meshLoading}>
                          {meshLoading && <FaSpinner className="animate-spin" />}
                          {showMesh ? 'Hide' : 'Preview'}
                        </button>
                        <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={() => History.push(`/jobs/${job.id}/visualize?type=${job.jobType}`)}>
                          <FaExpand className="w-3 h-3" />
                        </button>
                      </div>
                      {meshError && <p className="text-sm text-red-500">{meshError}</p>}
                      {showMesh && meshBlobUrl && (
                        <div className="mt-2"><JobMeshViewer blobUrl={meshBlobUrl} /></div>
                      )}
                    </div>
                  ) : poreMeshState === 'generating' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <FaSpinner className="animate-spin" /> Generating pore mesh...
                    </span>
                  ) : poreMeshState === 'failed' || poreMeshState === 'stopped' ? (
                    <span className="text-sm text-red-500">Pore mesh generation {poreMeshState}</span>
                  ) : poreMeshState === 'unavailable' ? (
                    <span className="text-sm text-gray-400">Processing server unavailable</span>
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
                        <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={downloadParticleMesh}>
                          <FaDownload className="w-3 h-3" /> Download
                        </button>
                        <button className="button-primary text-sm px-3 py-1 flex items-center gap-1" onClick={fetchParticleMesh} disabled={particleMeshLoading}>
                          {particleMeshLoading && <FaSpinner className="animate-spin" />}
                          {showParticleMesh ? 'Hide' : 'Preview'}
                        </button>
                        <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={() => History.push(`/jobs/${job.id}/visualize?type=${job.jobType}`)}>
                          <FaExpand className="w-3 h-3" />
                        </button>
                      </div>
                      {particleMeshError && <p className="text-sm text-red-500">{particleMeshError}</p>}
                      {showParticleMesh && particleMeshBlobUrl && (
                        <div className="mt-2"><JobMeshViewer blobUrl={particleMeshBlobUrl} /></div>
                      )}
                    </div>
                  ) : particleMeshState === 'generating' ? (
                    <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                      <FaSpinner className="animate-spin" /> Generating particle mesh...
                    </span>
                  ) : particleMeshState === 'failed' || particleMeshState === 'stopped' ? (
                    <span className="text-sm text-red-500">Particle mesh generation {particleMeshState}</span>
                  ) : particleMeshState === 'unavailable' ? (
                    <span className="text-sm text-gray-400">Processing server unavailable</span>
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
                particleMeshState === 'checking' ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-400">
                    <FaSpinner className="animate-spin" /> Checking...
                  </span>
                ) : particleMeshState === 'generating' ? (
                  <span className="inline-flex items-center gap-2 text-sm text-gray-500">
                    <FaSpinner className="animate-spin" /> Generating mesh...
                  </span>
                ) : particleMeshState === 'ready' ? (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={downloadMesh}>
                        <FaDownload className="w-3 h-3" /> Download
                      </button>
                      <button className="button-primary text-sm px-3 py-1 flex items-center gap-1" onClick={fetchMesh} disabled={meshLoading}>
                        {meshLoading && <FaSpinner className="animate-spin" />}
                        {showMesh ? 'Hide' : 'Preview'}
                      </button>
                      <button className="button-outline text-sm px-3 py-1 flex items-center gap-1" onClick={() => History.push(`/jobs/${job.id}/visualize?type=${job.jobType}`)}>
                        <FaExpand className="w-3 h-3" />
                      </button>
                    </div>
                    {meshError && <p className="text-sm text-red-500">{meshError}</p>}
                    {showMesh && meshBlobUrl && (
                      <div className="mt-2"><JobMeshViewer blobUrl={meshBlobUrl} /></div>
                    )}
                  </div>
                ) : particleMeshState === 'failed' || particleMeshState === 'stopped' ? (
                  <span className="text-sm text-red-500">Mesh generation {particleMeshState}</span>
                ) : particleMeshState === 'unavailable' ? (
                  <span className="text-sm text-gray-400">Processing server unavailable</span>
                ) : (
                  <span className="text-sm text-gray-400">Not available</span>
                )
              }
            />
          )}

          {/* Input slices preview — always show when we have input slices */}
          {isSegmentation && previewInfo && previewInfo.slices.length > 0 && (
            <Row
              label={previewInfo.segmented_slices?.length ? "Validation" : "Input Preview"}
              value={
                <div>
                  <SegmentationComparisonView
                    previewUrlMap={previewUrlMap}
                    previewInfo={previewInfo}
                  />
                  <button
                    className="button-outline text-sm px-3 py-1 flex items-center gap-1 mt-3"
                    disabled={inputDownloading}
                    onClick={async () => {
                      setInputDownloading(true);
                      try {
                        const blob = await jobStore.getInputFile(job.id);
                        if (!blob) return;
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = previewInfo.filename || `job_${job.id}_input.tif`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        URL.revokeObjectURL(url);
                      } finally {
                        setInputDownloading(false);
                      }
                    }}
                  >
                    {inputDownloading ? <FaSpinner className="animate-spin w-3 h-3" /> : <FaDownload className="w-3 h-3" />}
                    {inputDownloading ? 'Downloading...' : 'Download Input File'}
                  </button>
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
                      className="button-primary text-sm px-3 py-1 flex items-center gap-1"
                      onClick={() => { setShowLovamapForm(true); fetchMesh(); }}
                    >
                      Run LOVAMAP Analysis
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Generate mesh</span>
                        <label className="inline-flex items-center relative w-11 h-6 cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={lovamapGenerateMesh}
                            onChange={(e) => setLovamapGenerateMesh(e.target.checked)}
                          />
                          <div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
                          <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
                        </label>
                      </div>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Cluster exterior pores</span>
                          <label className="inline-flex items-center relative w-11 h-6 cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={lovamapClusterExteriorPores}
                              onChange={(e) => setLovamapClusterExteriorPores(e.target.checked)}
                            />
                            <div className="w-full h-full bg-gray-200 rounded-full peer-checked:bg-link-100 transition-colors" />
                            <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform transform peer-checked:translate-x-5" />
                          </label>
                        </div>
                        <p className="text-xs text-gray-400">
                          {CLUSTER_EXTERIOR_PORES_HELP}
                        </p>
                      </div>
                      {lovamapError && (
                        <p className="text-sm text-red-500">{lovamapError}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          className="button-primary text-sm px-3 py-1 flex items-center gap-1"
                          onClick={handleLovamapSubmit}
                          disabled={lovamapSubmitting}
                        >
                          {lovamapSubmitting && <FaSpinner className="animate-spin" />}
                          Submit
                        </button>
                        <button
                          className="button-outline text-sm px-3 py-1 flex items-center gap-1"
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
