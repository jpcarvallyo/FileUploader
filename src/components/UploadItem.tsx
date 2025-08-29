import React from "react";
import { useSelector } from "@xstate/react";
import { UploadState } from "../machines/uploadMachine";

interface UploadItemProps {
  id: string;
  actor: any;
  fileInfoMap: Map<string, { name: string; size: number }>;
  retryStep: (id: string) => void;
  cancelUpload: (id: string) => void;
  removeUpload: (id: string) => void;
}

const UploadItem: React.FC<UploadItemProps> = ({
  id,
  actor,
  fileInfoMap,
  retryStep,
  cancelUpload,
  removeUpload,
}) => {
  const actorState = useSelector(actor, (state: any) => state);
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
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  // Removed console log to reduce noise

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
          {fileName.length > 25 ? `${fileName.substring(0, 25)}...` : fileName}
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
              actorState.value === UploadState.SUCCESS
                ? "#d4edda"
                : actorState.value === UploadState.FAILURE
                ? "#f8d7da"
                : actorState.value === UploadState.CANCELLED
                ? "#f8d7da"
                : "#fff3cd",
            color:
              actorState.value === UploadState.SUCCESS
                ? "#155724"
                : actorState.value === UploadState.FAILURE
                ? "#721c24"
                : actorState.value === UploadState.CANCELLED
                ? "#721c24"
                : "#856404",
            width: "80px",
            textAlign: "center",
            flexShrink: 0,
          }}
        >
          {actorState.value === UploadState.SUCCESS
            ? "Success"
            : actorState.value === UploadState.FAILURE
            ? "Failed"
            : actorState.value === UploadState.CANCELLED
            ? "Cancelled"
            : actorState.value === UploadState.UPLOADING
            ? "Uploading"
            : actorState.value === UploadState.GETTING_URL
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
              {formatBytes(actorState.context.progress?.loaded || 0)} /{" "}
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
          {actorState.value === UploadState.FAILURE && (
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

          {(actorState.value === UploadState.UPLOADING ||
            actorState.value === UploadState.GETTING_URL) && (
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

          {(actorState.value === UploadState.SUCCESS ||
            actorState.value === UploadState.FAILURE ||
            actorState.value === UploadState.CANCELLED) && (
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

export default UploadItem;
