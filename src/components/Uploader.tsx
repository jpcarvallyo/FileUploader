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
    retryUpload,
    retryStep,
    cancelUpload,
    removeUpload,
    clearAll,
    uploadActors,
  } = useUploader();

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
              disabled={!hasActiveUploads}
              className="btn btn-secondary"
            >
              Retry Failed
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
          {(() => {
            console.log("UPLOAD ACTORS SIZE:", uploadActors.size);
            console.log(
              "UPLOAD ACTORS ENTRIES:",
              Array.from(uploadActors.entries())
            );
            return null;
          })()}
          {Array.from(uploadActors.entries()).map(([id, actor]) => {
            console.log("RENDER ROW", id, actor.getSnapshot?.()?.value);

            // Create a component that subscribes to the actor's state
            const ProgressUploadItem = () => {
              const actorState = useSelector(actor, (state) => state);
              const progress = actorState.context.progress?.percentage ?? 0;
              const { file } = actorState.context;

              console.log("ProgressUploadItem render:", {
                id,
                progress,
                state: actorState.value,
                progressData: actorState.context.progress,
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
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: "bold", fontSize: "14px" }}>
                        {file?.name || "Unknown file"}
                      </div>
                      <div style={{ fontSize: "12px", color: "#666" }}>
                        {file ? `${(file.size / 1024).toFixed(1)} KB` : ""}
                      </div>
                    </div>
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
                  </div>

                  {/* Progress Bar */}
                  <div style={{ marginBottom: "12px" }}>
                    <div
                      style={{
                        width: "100%",
                        height: "8px",
                        background: "#e9ecef",
                        borderRadius: "4px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background: "#007bff",
                          transition: "width 0.3s ease",
                          borderRadius: "4px",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#666",
                        marginTop: "4px",
                        textAlign: "center",
                      }}
                    >
                      {progress}% ({actorState.context.progress?.loaded || 0} /{" "}
                      {actorState.context.progress?.total || 0} bytes)
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: "8px" }}>
                    {actorState.value === "failure" && (
                      <>
                        <button
                          onClick={() => retryStep(id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            background: "#6c757d",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Retry Step
                        </button>
                        <button
                          onClick={() => retryUpload(id)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "12px",
                            background: "#007bff",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                          }}
                        >
                          Retry All
                        </button>
                      </>
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
                          padding: "6px 12px",
                          fontSize: "12px",
                          background: "#dc3545",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
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
                          padding: "6px 12px",
                          fontSize: "12px",
                          background: "#6c757d",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Remove
                      </button>
                    )}
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
