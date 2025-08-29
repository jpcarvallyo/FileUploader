import React from "react";
import { useSelector } from "@xstate/react";

interface ProgressUploadItemProps {
  id: string;
  actor: any;
  fileInfoMap: Map<string, { name: string; size: number }>;
  onRetryStep: (id: string) => void;
  onCancelUpload: (id: string) => void;
  onRemoveUpload: (id: string) => void;
}

const ProgressUploadItem: React.FC<ProgressUploadItemProps> = ({
  id,
  actor,
  fileInfoMap,
  onRetryStep,
  onCancelUpload,
  onRemoveUpload,
}) => {
  const actorState = useSelector(actor, (state) => state);
  const progress = actorState.context.progress?.percentage ?? 0;
  const { file } = actorState.context;

  // Get file info from the fileInfoMap
  const fileInfo = fileInfoMap.get(id);
  const fileName = fileInfo?.name || file?.name || "Unknown file";
  const fileSize = fileInfo?.size || file?.size || 0;

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <div>
          <div style={{ fontWeight: "bold", fontSize: "14px" }}>{fileName}</div>
          <div style={{ fontSize: "12px", color: "#666" }}>
            {fileSize > 0 ? `${(fileSize / 1024).toFixed(1)} KB` : ""}
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
            {actorState.context.progress?.loaded || 0} /{" "}
            {actorState.context.progress?.total || 0} bytes
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        {actorState.value === "failure" && (
          <button
            onClick={() => onRetryStep(id)}
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
        )}

        {(actorState.value === "uploading" ||
          actorState.value === "gettingUrl") && (
          <button
            onClick={() => {
              onCancelUpload(id);
              // Remove the upload after a short delay to allow cancellation to complete
              setTimeout(() => onRemoveUpload(id), 100);
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
            onClick={() => onRemoveUpload(id)}
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

export default ProgressUploadItem;
