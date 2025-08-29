// Mock API functions for file upload operations

// Track retry attempts for each file
const retryAttempts = new Map<string, number>();

export interface UploadUrlResponse {
  id: string;
  uploadUrl: string;
  expiresAt: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  id: string;
  filename: string;
  size: number;
  url: string;
  uploadedAt: string;
}

export interface NotificationResult {
  success: boolean;
  message: string;
}

// Get upload URL for a file
export const getUploadUrl = async (
  filename: string,
  size: number
): Promise<UploadUrlResponse> => {
  // Simulate network delay
  await new Promise((resolve) =>
    setTimeout(resolve, 300 + Math.random() * 500)
  );

  // Track retry attempts for this file
  const currentAttempts = retryAttempts.get(filename) || 0;
  retryAttempts.set(filename, currentAttempts + 1);

  console.log(`getUploadUrl attempt ${currentAttempts + 1} for ${filename}`);

  // Fail on first attempt, succeed on all retry attempts
  if (currentAttempts === 0) {
    console.log(`getUploadUrl failing on first attempt for ${filename}`);
    throw new Error("Failed to get upload URL - network error");
  }

  console.log(
    `getUploadUrl succeeding on attempt ${currentAttempts + 1} for ${filename}`
  );
  return {
    id: `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    uploadUrl: `https://api.example.com/upload/${Date.now()}?size=${size}`,
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
  };
};

// Upload file with progress tracking
export const uploadFile = async (
  uploadUrl: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // Simulate upload with progress
  const total = file.size;
  let loaded = 0;

  // Track retry attempts for this file
  const currentAttempts = retryAttempts.get(file.name) || 0;
  console.log(`uploadFile attempt ${currentAttempts + 1} for ${file.name}`);

  // Fail on first attempt, succeed on all retry attempts
  if (currentAttempts === 0) {
    console.log(`uploadFile failing on first attempt for ${file.name}`);
    throw new Error("Upload failed - network error");
  }

  console.log(
    `uploadFile succeeding on attempt ${currentAttempts + 1} for ${file.name}`
  );

  // Simulate progress updates
  const progressInterval = setInterval(() => {
    loaded += Math.random() * (total / 20); // Random progress increment
    if (loaded >= total) {
      loaded = total;
      clearInterval(progressInterval);
    }

    onProgress?.({
      loaded: Math.floor(loaded),
      total,
      percentage: Math.floor((loaded / total) * 100),
    });
  }, 100 + Math.random() * 200);

  // Wait for upload to complete
  await new Promise((resolve) => {
    const checkComplete = () => {
      if (loaded >= total) {
        resolve(undefined);
      } else {
        setTimeout(checkComplete, 50);
      }
    };
    checkComplete();
  });

  clearInterval(progressInterval);

  return {
    id: uploadUrl.split("/").pop() || `upload_${Date.now()}`,
    filename: file.name,
    size: file.size,
    url: `https://example.com/uploads/${file.name}`,
    uploadedAt: new Date().toISOString(),
  };
};

// Notify completion
export const notifyCompletion = async (
  uploadId: string,
  filename: string
): Promise<NotificationResult> => {
  // Simulate network delay
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 300)
  );

  // Track retry attempts for this file
  const currentAttempts = retryAttempts.get(filename) || 0;
  console.log(
    `notifyCompletion attempt ${currentAttempts + 1} for ${filename}`
  );

  // Fail on first attempt, succeed on all retry attempts
  if (currentAttempts === 0) {
    console.log(`notifyCompletion failing on first attempt for ${filename}`);
    throw new Error("Failed to notify completion - network error");
  }

  console.log(
    `notifyCompletion succeeding on attempt ${
      currentAttempts + 1
    } for ${filename}`
  );

  return {
    success: true,
    message: `Successfully processed ${filename}`,
  };
};
