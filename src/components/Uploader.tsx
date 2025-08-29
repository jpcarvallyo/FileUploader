import React, { useCallback, useRef, useState } from "react";
import { useUploader } from "../hooks/useUploader";
import { useSelector } from "@xstate/react";
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
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          style={{ display: "none" }}
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

            // Create a component that subscribes to the actor's state
            const ProgressUploadItem = () => {
              const actorState = useSelector(actor, (state) => state);
              const progress = actorState.context.progress?.percentage ?? 0;
              const { file } = actorState.context;

              // Get file info from the fileInfoMap
              const fileInfo = fileInfoMap.get(id);
              const fileName = fileInfo?.name || file?.name || "Unknown file";
              const fileSize = fileInfo?.size || file?.size || 0;

              // Helper function to format bytes to human readable format
              const formatBytes = (bytes: number) => {
                if (bytes === 0) return "0 B";
                const k = 1024;
                const sizes = ["B", "KB", "MB", "GB"];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return (
                  parseFloat((bytes / Math.pow(k, i)).toFixed(1)) +
                  " " +
                  sizes[i]
                );
              };

              console.log("ProgressUploadItem render:", {
                id,
                progress,
                state: actorState.value,
                progressData: actorState.context.progress,
                file: file,
                fileName: fileName,
                contextKeys: Object.keys(actorState.context),
                fullContext: actorState.context,
                actorSnapshot: actor.getSnapshot(),
              });

              return (
                <div
                  className="upload-item"
                  style={{
                    border: "2px solid #ddd",
                    borderRadius: "8px",
                    padding: "16px",
                    margin: "8px 0",
                    background: "white",
                  }}
                >
                  {/* First Row: File Name */}
                  <div
                    style={{
                      marginBottom: "12px",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "bold",
                        fontSize: "14px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={fileName}
                    >
                      {fileName.length > 25
                        ? `${fileName.substring(0, 25)}...`
                        : fileName}
                    </div>
                    {/* Size */}
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        minWidth: "60px",
                      }}
                    >
                      {fileSize > 0 ? formatBytes(fileSize) : ""}
                    </div>
                  </div>

                  {/* Second Row: State, Progress, and Actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "40px",
                    }}
                  >
                    {/* State Badge */}
                    <div
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        background:
                          actorState.value === "success"
                            ? "#d4edda"
                            : actorState.value === "failure"
                            ? "#f8d7da"
                            : actorState.value === "cancelled"
                            ? "#f8d7da"
                            : "#fff3cd",
                        color:
                          actorState.value === "success"
                            ? "#155724"
                            : actorState.value === "failure"
                            ? "#721c24"
                            : actorState.value === "cancelled"
                            ? "#721c24"
                            : "#856404",
                        width: "80px",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {actorState.value === "success"
                        ? "Success"
                        : actorState.value === "failure"
                        ? "Failed"
                        : actorState.value === "cancelled"
                        ? "Cancelled"
                        : actorState.value === "uploading"
                        ? "Uploading"
                        : actorState.value === "gettingUrl"
                        ? "Preparing"
                        : "Ready"}
                    </div>

                    {/* Progress */}
                    <div style={{ width: "200px", flexShrink: 0 }}>
                      <div
                        style={{
                          width: "100%",
                          height: "8px",
                          background: "#e9ecef",
                          borderRadius: "4px",
                          overflow: "hidden",
                          marginBottom: "4px",
                          position: "relative",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: `${progress}%`,
                            height: "100%",
                            background: "#007bff",
                            transition: "width 0.3s ease",
                            borderRadius: "4px",
                            minWidth: "0%",
                            maxWidth: "100%",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "#666",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          width: "100%",
                        }}
                      >
                        <span style={{ minWidth: "40px" }}>{progress}%</span>
                        <span style={{ minWidth: "120px", textAlign: "right" }}>
                          {formatBytes(
                            actorState.context.progress?.loaded || 0
                          )}{" "}
                          /{" "}
                          {formatBytes(actorState.context.progress?.total || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div
                      style={{
                        display: "flex",
                        gap: "6px",
                        flexShrink: 0,
                        width: "70px",
                      }}
                    >
                      {actorState.value === "failure" && (
                        <button
                          onClick={() => retryStep(id)}
                          style={{
                            padding: "6px",
                            fontSize: "14px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                          }}
                          title="Retry"
                        >
                          <i className="fas fa-redo"></i>
                        </button>
                      )}

                      {(actorState.value === "uploading" ||
                        actorState.value === "gettingUrl") && (
                        <button
                          onClick={() => {
                            cancelUpload(id);
                            // Remove the upload after a short delay to allow cancellation to complete
                            setTimeout(() => removeUpload(id), 100);
                          }}
                          style={{
                            padding: "4px 8px",
                            fontSize: "11px",
                            background: "#dc3545",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      )}

                      {(actorState.value === "success" ||
                        actorState.value === "failure" ||
                        actorState.value === "cancelled") && (
                        <button
                          onClick={() => removeUpload(id)}
                          style={{
                            padding: "6px",
                            fontSize: "14px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "3px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                          }}
                          title="Remove"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            };

            return <ProgressUploadItem key={id} />;
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
