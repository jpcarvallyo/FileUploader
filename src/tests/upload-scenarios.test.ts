import { describe, it, expect } from "vitest";

// Mock upload states
type UploadState = "idle" | "uploading" | "success" | "failure" | "cancelled";

interface UploadItem {
  id: string;
  file: File;
  state: UploadState;
  progress: number;
  error?: string;
}

class MockUploadManager {
  private uploads = new Map<string, UploadItem>();

  addFile(file: File): string {
    const id = `upload_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    this.uploads.set(id, {
      id,
      file,
      state: "idle",
      progress: 0,
    });
    return id;
  }

  startUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.state = "uploading";
      upload.progress = 0;
    }
  }

  updateProgress(id: string, progress: number): void {
    const upload = this.uploads.get(id);
    if (upload && upload.state === "uploading") {
      upload.progress = progress;
    }
  }

  completeUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.state = "success";
      upload.progress = 100;
    }
  }

  failUpload(id: string, error: string): void {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.state = "failure";
      upload.error = error;
    }
  }

  cancelUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (upload) {
      upload.state = "cancelled";
    }
  }

  retryUpload(id: string): void {
    const upload = this.uploads.get(id);
    if (upload && upload.state === "failure") {
      upload.state = "uploading";
      upload.progress = 0;
      upload.error = undefined;
    }
  }

  getUpload(id: string): UploadItem | undefined {
    return this.uploads.get(id);
  }

  getAllUploads(): UploadItem[] {
    return Array.from(this.uploads.values());
  }

  getSummary() {
    const uploads = this.getAllUploads();
    return {
      total: uploads.length,
      uploading: uploads.filter((u) => u.state === "uploading").length,
      success: uploads.filter((u) => u.state === "success").length,
      failure: uploads.filter((u) => u.state === "failure").length,
      cancelled: uploads.filter((u) => u.state === "cancelled").length,
    };
  }
}

describe("Upload Scenarios", () => {
  let uploadManager: MockUploadManager;

  beforeEach(() => {
    uploadManager = new MockUploadManager();
  });

  describe("Happy Path", () => {
    it("should successfully upload a file", () => {
      // Create a file
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      // Add file to upload manager
      const uploadId = uploadManager.addFile(file);
      expect(uploadId).toBeDefined();

      // Start upload
      uploadManager.startUpload(uploadId);
      let upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("uploading");
      expect(upload?.progress).toBe(0);

      // Simulate progress
      uploadManager.updateProgress(uploadId, 50);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.progress).toBe(50);

      // Complete upload
      uploadManager.updateProgress(uploadId, 100);
      uploadManager.completeUpload(uploadId);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("success");
      expect(upload?.progress).toBe(100);

      // Check summary
      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(1);
      expect(summary.success).toBe(1);
      expect(summary.uploading).toBe(0);
      expect(summary.failure).toBe(0);
      expect(summary.cancelled).toBe(0);
    });

    it("should handle multiple successful uploads", () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

      const id1 = uploadManager.addFile(file1);
      const id2 = uploadManager.addFile(file2);

      // Start both uploads
      uploadManager.startUpload(id1);
      uploadManager.startUpload(id2);

      // Complete both uploads
      uploadManager.completeUpload(id1);
      uploadManager.completeUpload(id2);

      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(2);
      expect(summary.success).toBe(2);
      expect(summary.uploading).toBe(0);
    });
  });

  describe("Failure + Retry", () => {
    it("should handle upload failure and allow retry", () => {
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      const uploadId = uploadManager.addFile(file);
      uploadManager.startUpload(uploadId);

      // Simulate failure
      uploadManager.failUpload(uploadId, "Network error");
      let upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("failure");
      expect(upload?.error).toBe("Network error");

      // Retry the upload
      uploadManager.retryUpload(uploadId);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("uploading");
      expect(upload?.error).toBeUndefined();

      // Complete the retry
      uploadManager.completeUpload(uploadId);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("success");

      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(1);
      expect(summary.success).toBe(1);
      expect(summary.failure).toBe(0);
    });

    it("should handle multiple failed uploads with retry", () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });

      const id1 = uploadManager.addFile(file1);
      const id2 = uploadManager.addFile(file2);

      // Start both uploads
      uploadManager.startUpload(id1);
      uploadManager.startUpload(id2);

      // Both fail
      uploadManager.failUpload(id1, "Network error");
      uploadManager.failUpload(id2, "Server error");

      let summary = uploadManager.getSummary();
      expect(summary.failure).toBe(2);

      // Retry both
      uploadManager.retryUpload(id1);
      uploadManager.retryUpload(id2);

      // Complete both
      uploadManager.completeUpload(id1);
      uploadManager.completeUpload(id2);

      summary = uploadManager.getSummary();
      expect(summary.success).toBe(2);
      expect(summary.failure).toBe(0);
    });
  });

  describe("Cancel Mid-Upload", () => {
    it("should cancel an upload in progress", () => {
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      const uploadId = uploadManager.addFile(file);
      uploadManager.startUpload(uploadId);

      // Simulate some progress
      uploadManager.updateProgress(uploadId, 30);
      let upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("uploading");
      expect(upload?.progress).toBe(30);

      // Cancel the upload
      uploadManager.cancelUpload(uploadId);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("cancelled");

      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(1);
      expect(summary.cancelled).toBe(1);
      expect(summary.uploading).toBe(0);
    });

    it("should handle cancelling multiple uploads", () => {
      const file1 = new File(["content1"], "file1.txt", { type: "text/plain" });
      const file2 = new File(["content2"], "file2.txt", { type: "text/plain" });
      const file3 = new File(["content3"], "file3.txt", { type: "text/plain" });

      const id1 = uploadManager.addFile(file1);
      const id2 = uploadManager.addFile(file2);
      const id3 = uploadManager.addFile(file3);

      // Start all uploads
      uploadManager.startUpload(id1);
      uploadManager.startUpload(id2);
      uploadManager.startUpload(id3);

      // Cancel two of them
      uploadManager.cancelUpload(id1);
      uploadManager.cancelUpload(id2);

      // Complete the third one
      uploadManager.completeUpload(id3);

      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(3);
      expect(summary.cancelled).toBe(2);
      expect(summary.success).toBe(1);
      expect(summary.uploading).toBe(0);
    });

    it("should not allow retry of cancelled uploads", () => {
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      const uploadId = uploadManager.addFile(file);
      uploadManager.startUpload(uploadId);
      uploadManager.cancelUpload(uploadId);

      // Try to retry (should not work)
      uploadManager.retryUpload(uploadId);
      const upload = uploadManager.getUpload(uploadId);
      expect(upload?.state).toBe("cancelled"); // Should still be cancelled
    });
  });

  describe("Mixed Scenarios", () => {
    it("should handle a mix of successful, failed, and cancelled uploads", () => {
      const files = [
        new File(["content1"], "file1.txt", { type: "text/plain" }),
        new File(["content2"], "file2.txt", { type: "text/plain" }),
        new File(["content3"], "file3.txt", { type: "text/plain" }),
        new File(["content4"], "file4.txt", { type: "text/plain" }),
      ];

      const ids = files.map((file) => uploadManager.addFile(file));

      // Start all uploads
      ids.forEach((id) => uploadManager.startUpload(id));

      // Simulate different outcomes
      uploadManager.completeUpload(ids[0]); // Success
      uploadManager.failUpload(ids[1], "Network error"); // Failure
      uploadManager.cancelUpload(ids[2]); // Cancelled
      uploadManager.completeUpload(ids[3]); // Success

      // Retry the failed one
      uploadManager.retryUpload(ids[1]);
      uploadManager.completeUpload(ids[1]);

      const summary = uploadManager.getSummary();
      expect(summary.total).toBe(4);
      expect(summary.success).toBe(3);
      expect(summary.failure).toBe(0);
      expect(summary.cancelled).toBe(1);
      expect(summary.uploading).toBe(0);
    });

    it("should track progress correctly across different states", () => {
      const file = new File(["test content"], "test-file.txt", {
        type: "text/plain",
      });

      const uploadId = uploadManager.addFile(file);
      uploadManager.startUpload(uploadId);

      // Progress through different stages
      uploadManager.updateProgress(uploadId, 25);
      let upload = uploadManager.getUpload(uploadId);
      expect(upload?.progress).toBe(25);

      uploadManager.updateProgress(uploadId, 50);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.progress).toBe(50);

      uploadManager.updateProgress(uploadId, 75);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.progress).toBe(75);

      uploadManager.completeUpload(uploadId);
      upload = uploadManager.getUpload(uploadId);
      expect(upload?.progress).toBe(100);
      expect(upload?.state).toBe("success");
    });
  });
});
