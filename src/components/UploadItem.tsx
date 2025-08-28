import React from "react";
import { useSelector } from "@xstate/react";

interface UploadItemProps {
  id: string;
  actor: any;
  onRetryStep: (id: string) => void;
  onRetryAll: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
}

const UploadItem: React.FC<UploadItemProps> = ({
  id,
  actor,
  onRetryStep,
  onRetryAll,
  onCancel,
  onRemove,
}) => {
  console.log("🔥 UPLOADITEM COMPONENT STARTING 🔥", id);

  const state = useSelector(actor, (state) => state);
  const progress = useSelector(actor, (state) => state.context.progress);
  const { file, error } = state.context;

  console.log("🔥 UPLOADITEM STATE EXTRACTED 🔥", {
    id,
    stateValue: state.value,
    progress,
  });

  // Debug logging
  console.log(`UploadItem ${id}:`, {
    state: state.value,
    progress,
    hasProgress: !!progress,
    progressPercentage: progress?.percentage,
  });

  console.log("🔥 CHECKING FILE 🔥", {
    id,
    file: !!file,
    fileName: file?.name,
  });
  if (!file) {
    console.log("🔥 RETURNING NULL - NO FILE 🔥", id);
    return null;
  }

  const isActive =
    state.matches("uploading") ||
    state.matches("gettingUrl") ||
    state.matches("notifying");

  // Helper functions
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusBadge = (state: any) => {
    const statusConfig = {
      idle: { label: "Ready", className: "status-ready" },
      gettingUrl: { label: "Getting URL", className: "status-uploading" },
      uploading: { label: "Uploading", className: "status-uploading" },
      notifying: { label: "Processing", className: "status-uploading" },
      success: { label: "Success", className: "status-success" },
      failure: { label: "Failed", className: "status-error" },
      cancelled: { label: "Cancelled", className: "status-cancelled" },
    };

    const config =
      statusConfig[state.value as keyof typeof statusConfig] ||
      statusConfig.idle;

    return (
      <span className={`status-badge ${config.className}`}>{config.label}</span>
    );
  };

  console.log("progress *******: ", progress);

  console.log("__UPLOADITEM_MOUNT__", id, Date.now());
  console.log("ACTOR SNAPSHOT", id, actor.getSnapshot?.()?.value);
  console.log("🔥 THIS IS THE UPLOADITEM FILE BEING USED 🔥");

  console.log("🔥 ABOUT TO RENDER JSX 🔥", id);

  return (
    <div
      className="upload-item"
      data-test="UPLOADITEM-MARKER"
      style={{ outline: "3px dashed hotpink", padding: 4 }}
    >
      <div
        style={{
          background: "hotpink",
          color: "black",
          fontWeight: 700,
          fontSize: "20px",
          padding: "10px",
        }}
      >
        🔥 THIS IS THE UPLOADITEM FILE BEING USED 🔥
      </div>
      <div className="upload-info">
        <div className="upload-header">
          <span className="upload-filename">{file.name}</span>
          <span className="upload-size">{formatFileSize(file.size)}</span>
        </div>

        <div className="upload-status">
          {getStatusBadge(state)}
          {error && <span className="upload-error">{error}</span>}
        </div>

        {/* Progress percentage display */}
        <div
          style={{
            background: "yellow",
            color: "black",
            padding: "8px",
            margin: "8px 0",
            fontSize: "16px",
            fontWeight: "bold",
          }}
        >
          PROGRESS TEST: {progress?.percentage ?? "NO PROGRESS"}%
        </div>

        {(() => {
          const pct = progress?.percentage ?? 0;
          console.log(
            "__PROGRESS_PRESENT__",
            !!progress,
            "state:",
            state.value,
            "pct:",
            pct
          );

          return (
            (progress ||
              state.value === "uploading" ||
              state.value === "success") && (
              <div
                data-test="progress-block"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginTop: 12,
                  padding: 8,
                  background: "rgba(255,0,0,0.05)",
                  border: "2px dashed red",
                  position: "relative",
                  zIndex: 9999,
                }}
              >
                <div
                  style={{
                    background: "lime",
                    color: "black",
                    padding: "4px",
                    fontSize: "12px",
                  }}
                >
                  PROGRESS BLOCK RENDERED
                </div>
                <div
                  style={{
                    width: 320,
                    height: 24,
                    background: "#eee",
                    borderRadius: 4,
                    overflow: "hidden",
                    border: "1px solid #ddd",
                  }}
                >
                  <div
                    data-test="progress-fill"
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "red",
                      transition: "width 80ms linear",
                    }}
                  />
                </div>
                {!progress && (
                  <div style={{ color: "orange", fontSize: "12px" }}>
                    Progress data missing, but state is: {state.value}
                  </div>
                )}
                <div
                  data-test="progress-text"
                  style={{ fontFamily: "monospace" }}
                >
                  {pct}% ({progress?.loaded}/{progress?.total})
                </div>
              </div>
            )
          );
        })()}
      </div>

      <div className="upload-actions">
        {state.matches("failure") && (
          <>
            <button
              onClick={() => onRetryStep(id)}
              className="btn btn-sm btn-secondary"
            >
              Retry Step
            </button>
            <button
              onClick={() => onRetryAll(id)}
              className="btn btn-sm btn-primary"
            >
              Retry All
            </button>
          </>
        )}

        {isActive && (
          <button
            onClick={() => onCancel(id)}
            className="btn btn-sm btn-warning"
          >
            Cancel
          </button>
        )}

        <button onClick={() => onRemove(id)} className="btn btn-sm btn-danger">
          Remove
        </button>
      </div>
    </div>
  );
};

export default UploadItem;
