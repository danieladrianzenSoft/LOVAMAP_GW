import React, { useState } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../app/stores/store";
import ScreenshotViewer from "../visualization/screenshot-viewer";
import { DomainUploadStatus } from "./bulk-upload-types";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const BulkUploadScreenshotQueue: React.FC = () => {
  const { bulkUploadStore } = useStore();
  const { screenshotQueue, screenshotProgress, successfulScreenshots, createdGroups } = bulkUploadStore;
  const navigate = useNavigate();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isUndoing, setIsUndoing] = useState(false);
  const [undone, setUndone] = useState(false);

  const currentItem = isRunning ? screenshotQueue[currentIndex] ?? null : null;

  const handleStart = () => {
    if (screenshotQueue.length === 0) return;
    setIsRunning(true);
    setCurrentIndex(0);
  };

  const handleSkip = () => {
    setIsComplete(true);
    setIsRunning(false);
  };

  const handleScreenshotReady = async (blob: Blob) => {
    await bulkUploadStore.handleScreenshotReady(blob, currentIndex);

    const nextIndex = currentIndex + 1;
    if (nextIndex < screenshotQueue.length) {
      setCurrentIndex(nextIndex);
    } else {
      setIsRunning(false);
      setIsComplete(true);
    }
  };

  const handleDone = () => {
    bulkUploadStore.reset();
    navigate("/uploads");
  };

  const handleUndo = async () => {
    const totalScaffolds = createdGroups.reduce((sum, g) => sum + g.scaffoldIds.length, 0);
    if (!window.confirm(
      `This will permanently delete ${createdGroups.length} scaffold group(s), ${totalScaffolds} scaffold(s), ${bulkUploadStore.successfulDomainUploads} domain(s), and ${bulkUploadStore.successfulScreenshots} screenshot(s). Are you sure?`
    )) return;

    setIsUndoing(true);
    try {
      const { deleted, failed } = await bulkUploadStore.undoUpload();
      if (failed === 0) {
        toast.success(`Deleted ${deleted} scaffold group(s). Everything has been rolled back.`);
      } else {
        toast.error(`Deleted ${deleted}, failed to delete ${failed}. Check the console.`);
      }
      setUndone(true);
    } catch (error) {
      console.error("Undo failed:", error);
      toast.error("Undo failed. Check the console for details.");
    } finally {
      setIsUndoing(false);
    }
  };

  const showRegrets = !isRunning && !undone && createdGroups.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold mb-4">Step 5: Generate Screenshots</h2>

      {screenshotQueue.length === 0 ? (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            No domains available for screenshot generation (no successful particle domain uploads).
          </p>
          <button onClick={handleDone} className="button-primary">
            Done
          </button>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 mb-4">
            {screenshotQueue.length} screenshot{screenshotQueue.length !== 1 ? "s" : ""} to
            generate. Each domain (particles and pores) will be rendered and uploaded as a thumbnail.
          </p>

          {/* Progress */}
          {(isRunning || isComplete) && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>
                  {isComplete ? "Complete" : `Processing ${currentIndex + 1} / ${screenshotQueue.length}`}
                </span>
                <span>{screenshotProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${screenshotProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Queue list */}
          <div className="max-h-40 overflow-y-auto border rounded mb-4">
            {screenshotQueue.map((item, i) => (
              <div
                key={`${item.scaffoldId}-${item.category}`}
                className={`flex items-center justify-between px-3 py-1.5 text-sm border-b last:border-0 ${
                  i === currentIndex && isRunning ? "bg-blue-50" : ""
                }`}
              >
                <span>
                  Scaffold {item.scaffoldId} — {item.category === 0 ? "Particles" : "Pores"}
                </span>
                <span className="text-xs">
                  {item.status === DomainUploadStatus.Success && (
                    <span className="text-green-600">&#10003;</span>
                  )}
                  {item.status === DomainUploadStatus.Failed && (
                    <span className="text-red-600">&#10005;</span>
                  )}
                  {item.status === DomainUploadStatus.Pending && (
                    <span className="text-gray-400">Pending</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Hidden ScreenshotViewer */}
          {isRunning && currentItem && (
            <div
              style={{
                opacity: 0,
                position: "absolute",
                width: 512,
                height: 512,
                pointerEvents: "none",
              }}
            >
              <ScreenshotViewer
                key={`ss-${currentItem.scaffoldId}-${currentItem.category}`}
                scaffoldId={currentItem.scaffoldId}
                category={currentItem.category}
                onScreenshotReady={handleScreenshotReady}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 items-stretch">
            {!isRunning && !isComplete && (
              <>
                <button onClick={handleStart} className="button-primary !w-auto">
                  Start Screenshots
                </button>
                <button onClick={handleSkip} className="button-outline !py-2.5 !mb-3">
                  Skip
                </button>
              </>
            )}
            {isComplete && !undone && (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  {successfulScreenshots} / {screenshotQueue.length} screenshots generated.
                </p>
                <button onClick={handleDone} className="button-primary">
                  Done
                </button>
              </div>
            )}
            {undone && (
              <div>
                <p className="text-sm text-green-600 mb-3">
                  Upload has been rolled back.
                </p>
                <button onClick={handleDone} className="button-primary">
                  Done
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Regrets? */}
      {showRegrets && (
        <div className="mt-10 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Regrets?</h3>
          <p className="text-xs text-gray-400 mb-1">This will permanently delete:</p>
          <ul className="text-xs text-gray-400 mb-3 list-disc list-inside">
            <li>{createdGroups.length} scaffold group{createdGroups.length !== 1 ? "s" : ""}</li>
            <li>{createdGroups.reduce((sum, g) => sum + g.scaffoldIds.length, 0)} scaffold{createdGroups.reduce((sum, g) => sum + g.scaffoldIds.length, 0) !== 1 ? "s" : ""}</li>
            <li>{bulkUploadStore.successfulDomainUploads} domain{bulkUploadStore.successfulDomainUploads !== 1 ? "s" : ""} (mesh files)</li>
            <li>{bulkUploadStore.successfulScreenshots} screenshot{bulkUploadStore.successfulScreenshots !== 1 ? "s" : ""}</li>
          </ul>
          <button
            onClick={handleUndo}
            disabled={isUndoing}
            className="text-sm text-red-500 hover:text-red-700 border border-red-300 rounded px-4 py-2 hover:bg-red-50 transition-colors"
          >
            {isUndoing ? "Undoing..." : "Undo Entire Upload"}
          </button>
        </div>
      )}
    </div>
  );
};

export default observer(BulkUploadScreenshotQueue);
