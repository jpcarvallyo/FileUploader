import { useCallback, useEffect, useRef, useState } from "react";
import { useUploader } from "../hooks/useUploader";
import UploadItem from "./UploadItem";
import { UploadState } from "../machines/uploadMachine";
import "./Uploader.css";

const Uploader: React.FC = () => {
  const {
    summary,
    addFiles,
    retryAll,
    cancelAll,
    retryStep,
    cancelUpload,
    removeUpload,
    clearAll,
    uploadActors,
    fileInfoMap,
  } = useUploader();

  // Check all actors for failure and active states with state subscription
  const [hasFailedUploads, setHasFailedUploads] = useState(false);
  const [hasActiveUploads, setHasActiveUploads] = useState(false);

  useEffect(() => {
    const checkUploadStates = () => {
      let hasFailed = false;
      let hasActive = false;

      uploadActors.forEach((actor) => {
        const state = actor.getSnapshot();
        if (state.matches(UploadState.FAILURE)) {
          hasFailed = true;
        }
        if (
          state.matches(UploadState.UPLOADING) ||
          state.matches(UploadState.GETTING_URL) ||
          state.matches(UploadState.NOTIFYING)
        ) {
          hasActive = true;
        }
      });

      setHasFailedUploads(hasFailed);
      setHasActiveUploads(hasActive);
    };

    // Initial check
    checkUploadStates();

    // Only set up subscriptions if there are actors
    if (uploadActors.size === 0) {
      return;
    }

    // Subscribe to all actor state changes
    const subscriptions = Array.from(uploadActors.values()).map((actor) =>
      actor.subscribe(() => {
        checkUploadStates();
      })
    );

    // Cleanup subscriptions
    return () => {
      subscriptions.forEach((subscription) => {
        if (subscription && typeof subscription.unsubscribe === "function") {
          subscription.unsubscribe();
        }
      });
    };
  }, [uploadActors]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // File input handlers
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        addFiles(files);
        // Clear the file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [addFiles]
  );

  const handleFileInputClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const files = event.dataTransfer.files;
      if (files && files.length > 0) {
        addFiles(files);
        // Clear the file input so the same file can be selected again
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    },
    [addFiles]
  );

  return (
    <div className="uploader">
      {/* Header */}
      <div className="uploader-header">
        <h2>File Uploader</h2>
        <div className="uploader-summary">
          <span>Total: {summary.total}</span>
          <span>Uploading: {summary.uploading}</span>
          <span>Success: {summary.success}</span>
          <span>Failed: {summary.failure}</span>
        </div>
      </div>

      {/* File Input Area */}
      <div
        className={`file-input-area ${isDragOver ? "drag-over" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleFileInputClick}
        data-testid="drop-zone"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
          data-testid="file-input"
        />
        <div className="file-input-content">
          <div className="upload-icon">📁</div>
          <p>Click to select files or drag and drop</p>
          <p className="file-input-hint">Supports multiple files</p>
        </div>
      </div>

      {/* Toolbar */}
      {uploadActors && uploadActors.size > 0 && (
        <div className="uploader-toolbar">
          <div className="toolbar-left">
            <button
              onClick={retryAll}
              disabled={!hasFailedUploads}
              className="btn btn-secondary"
            >
              Retry All
            </button>
            <button
              onClick={cancelAll}
              disabled={!hasActiveUploads}
              className="btn btn-warning"
            >
              Cancel All
            </button>
          </div>
          <div className="toolbar-right">
            <button onClick={clearAll} className="btn btn-danger">
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Upload List */}
      {uploadActors && uploadActors.size > 0 && (
        <div className="upload-list">
          {Array.from(uploadActors.entries()).map(([id, actor]) => {
            return (
              <UploadItem
                key={id}
                id={id}
                actor={actor}
                fileInfoMap={fileInfoMap}
                retryStep={retryStep}
                cancelUpload={cancelUpload}
                removeUpload={removeUpload}
              />
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {(!uploadActors || uploadActors.size === 0) && (
        <div className="uploader-empty">
          <p>No files selected. Click the upload area above to get started.</p>
        </div>
      )}
    </div>
  );
};

export default Uploader;
