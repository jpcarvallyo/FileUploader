# File Upload Application

A modern React file upload application built with TypeScript, featuring concurrent upload management, retry logic, and real-time progress tracking.

## 🚀 Features

- **Concurrent File Uploads**: Upload multiple files simultaneously with individual progress tracking
- **Drag & Drop Interface**: Intuitive file selection with visual feedback
- **Real-time Progress**: Live progress bars with percentage and byte count display
- **Retry Logic**: Automatic retry on failure with configurable retry attempts
- **Upload Management**: Cancel, retry, and remove individual uploads or all at once
- **Real-time State Management**: Reactive state updates with comprehensive upload tracking
- **Responsive Design**: Modern UI with human-readable file sizes and truncated filenames
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 🛠️ Tech Stack

- **Frontend**: React 19 + TypeScript
- **State Management**: Jotai (atomic state management)
- **State Machines**: XState (actor-based concurrency)
- **Build Tool**: Vite
- **Testing**: Vitest + React Testing Library
- **Styling**: CSS with custom properties

## 📁 Project Structure

```
src/
├── components/
│   ├── Uploader.tsx          # Main upload interface
│   └── UploadItem.tsx        # Individual upload item component
├── hooks/
│   └── useUploader.ts        # Main upload logic and state management
├── machines/
│   └── uploadMachine.ts      # XState state machine for upload lifecycle
├── state/
│   └── uploads.atoms.ts      # Jotai atoms for state management
├── api/
│   └── mocks.ts              # Mock API for upload operations
└── tests/
    ├── basic.test.ts         # Basic functionality tests
    └── upload-scenarios.test.ts # Upload scenario tests
```

## 🏗️ Architecture

### State Management (Jotai)

The application uses Jotai for atomic state management with the following key atoms:

- **`uploadActorsAtom`**: Stores XState actor references for each upload
- **`storedUploadsAtom`**: Reserved for future persistence implementation
- **`uploadSummaryAtom`**: Derived state for upload statistics
- **`hasActiveUploadsAtom`**: Reactive atom for active upload detection
- **`hasFailedUploadsAtom`**: Reactive atom for failed upload detection

### State Machines (XState)

Each upload is managed by an XState actor with the following states:

- **`idle`**: Initial state, waiting to start
- **`gettingUrl`**: Requesting upload URL from server
- **`uploading`**: File upload in progress
- **`notifying`**: Notifying server of completion
- **`success`**: Upload completed successfully
- **`failure`**: Upload failed (retryable)
- **`cancelled`**: Upload was cancelled

### Upload Lifecycle

1. **File Selection**: User selects files via drag & drop or file picker
2. **Actor Creation**: XState actor created for each file with unique ID
3. **URL Request**: Actor requests upload URL from server
4. **File Upload**: File uploaded with progress tracking
5. **Completion Notification**: Server notified of successful upload
6. **State Update**: UI updated with final status

## 🎯 Key Features

### Concurrent Upload Management

- Multiple files can be uploaded simultaneously
- Each upload has its own XState actor for independent state management
- Progress tracking for each upload individually
- Independent retry/cancel operations

### Retry Logic

- **Mock API**: Simulates network failures on first attempt
- **Automatic Retry**: Failed uploads can be retried automatically
- **Retry All**: Bulk retry for all failed uploads
- **Step Retry**: Retry specific upload steps

### Upload Controls

- **Cancel All**: Stop all active uploads
- **Retry All**: Retry all failed uploads
- **Clear All**: Remove all uploads from state and memory
- **Individual Controls**: Cancel, retry, or remove specific uploads

### UI Features

- **Progress Bars**: Fixed-width progress bars with percentage and byte display
- **File Information**: Human-readable file sizes (KB, MB, GB)
- **Filename Truncation**: Long filenames truncated with ellipsis
- **Status Indicators**: Visual status badges for each upload state
- **Summary Statistics**: Real-time counts for total, uploading, success, failed, and cancelled uploads

## 🧪 Testing

The application includes comprehensive unit tests covering:

- **Basic Functionality**: File selection, upload state management
- **Upload Scenarios**: Happy path, failure + retry, cancel mid-upload
- **State Management**: Jotai atom interactions
- **Component Behavior**: React component rendering and interactions

Run tests with:

```bash
npm test
```

## 🚀 Development

### Prerequisites

- Node.js (version specified in `.nvmrc`)
- npm or yarn

### Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Open `http://localhost:5173`

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run lint` - Run ESLint

## 🔧 Configuration

### Mock API Behavior

The mock API is configured to simulate realistic upload scenarios:

- **Network Delays**: Random delays to simulate real network conditions
- **Failure Simulation**: First attempt fails, subsequent attempts succeed
- **Progress Simulation**: Realistic progress updates with random increments
- **Cancellation Support**: Proper cleanup when uploads are cancelled

### State Management

The application uses in-memory state management with Jotai atoms:

- **Actor References**: XState actors stored in `uploadActorsAtom`
- **Summary State**: Real-time upload statistics
- **Reactive Updates**: State changes trigger automatic UI updates
- **Cleanup**: Clear All removes all upload data from memory

## 📝 API Reference

### useUploader Hook

```typescript
const {
  // State
  uploadActors,
  summary,
  hasActiveUploads,
  hasFailedUploads,
  fileInfoMap,

  // Actions
  addFiles,
  retryAll,
  cancelAll,
  retryStep,
  cancelUpload,
  removeUpload,
  clearAll,

  // Getters
  getUploadDetails,
  getAllUploadDetails,
} = useUploader();
```

### Upload States

- **`idle`**: Upload not started
- **`gettingUrl`**: Requesting upload URL
- **`uploading`**: File upload in progress
- **`notifying`**: Notifying completion
- **`success`**: Upload completed
- **`failure`**: Upload failed
- **`cancelled`**: Upload cancelled

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
