import React, { useCallback, useRef, useState } from "react";
import { useUploader } from "../hooks/useUploader";
import { useSelector } from "@xstate/react";
import ProgressUploadItem from "./ProgressUploadItem";
import "./Uploader.css";

const Uploader: React.FC = () => {
  const {
    summary,
    hasActiveUploads,
    addFiles,
    startAll,
    retryAll,
    cancelAll,
    retryStep,
    cancelUpload,
    removeUpload,
    clearAll,
    uploadActors,
    fileInfoMap,
  } = useUploader();

  // Subscribe to the first actor's state (like individual items do)
  const actorsArray = Array.from(uploadActors.values());
  const firstActor = actorsArray[0];
  const firstActorState = useSelector(
    firstActor,
    (state) => state?.value || null
  );

  // Check all actors for failure state
  const hasFailedUploads = React.useMemo(() => {
    let hasFailed = false;
    uploadActors.forEach((actor) => {
      const state = actor.getSnapshot();
      if (state.matches("failure")) {
        hasFailed = true;
      }
    });
    return hasFailed;
  }, [uploadActors, firstActorState]); // Recalculate when first actor state changes

  console.log(
    "First actor state:",
    firstActorState,
    "hasFailedUploads:",
    hasFailedUploads
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // File input handlers
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      console.log("Files selected:", files);
      if (files && files.length > 0) {
        console.log("Adding files to uploader...");
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
      console.log("Files dropped:", files);
      if (files && files.length > 0) {
        console.log("Adding dropped files to uploader...");
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
          {(() => {
            console.log("Toolbar Debug:", {
              hasActiveUploads,
              hasFailedUploads,
              summary,
              uploadCount: uploadActors.size,
            });
            return null;
          })()}
          <div className="toolbar-left">
            <button
              onClick={startAll}
              disabled={!hasActiveUploads}
              className="btn btn-primary"
            >
              Start All
            </button>
            <button
              onClick={retryAll}
              disabled={!hasFailedUploads}
              className="btn btn-secondary"
            >
              Retry All ({hasFailedUploads ? "Enabled" : "Disabled"})
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
            console.log("RENDER ROW", id, actor.getSnapshot?.()?.value);

            return (
              <ProgressUploadItem
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
