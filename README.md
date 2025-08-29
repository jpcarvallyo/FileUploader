# File Upload Application

A modern React file upload application built with TypeScript, featuring concurrent upload management, retry logic, and real-time progress tracking.

## 🎥 Demo

Watch the application in action: [Demo Recording](https://www.loom.com/share/a522cd0fdecb405aac0aafe7cacc10a4?sid=ca129a55-1942-4ee7-845a-54efa69a47ff)

[![Demo Video](https://cdn.loom.com/sessions/thumbnails/a522cd0fdecb405aac0aafe7cacc10a4-with-play.gif)](https://www.loom.com/share/a522cd0fdecb405aac0aafe7cacc10a4?sid=ca129a55-1942-4ee7-845a-54efa69a47ff)

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

### Custom Hook Pattern

The application follows the **custom hook pattern** to encapsulate complex business logic and state management. The `useUploader` hook serves as the main interface between the UI components and the underlying state management system.

**Benefits of this pattern:**

- **Separation of Concerns**: UI components focus on rendering, hooks handle business logic
- **Reusability**: The upload logic can be easily reused across different components
- **Testability**: Business logic can be tested independently of UI components
- **Maintainability**: Complex state management is centralized in one place
- **Type Safety**: Full TypeScript support with proper type inference

### State Management (Jotai)

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

- **Node.js**: Version 20.19+ or 22.12+ (recommended: Node.js 22 as specified in `.nvmrc`)
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

## 🎯 Approach & Trade-offs

### Design Philosophy

I approached this challenge by modeling each file upload as its own XState state machine, giving each upload a clear lifecycle (`getUploadUrl` → `uploadFile` → `notifyCompletion`) with explicit states for success, failure, and cancellation. This made retry logic and error handling straightforward, since each machine "remembers" where it failed and can retry that step or restart entirely.

To coordinate multiple uploads, I used Jotai as a lightweight state layer to hold actor references, making it easy for the React UI to subscribe to and render progress across many concurrent uploads. The UI itself stays focused on rendering, while the logic lives inside the machines and hooks.

### Trade-offs Made

**Persistence**: I didn't fully implement persistence across refreshes, since File objects cannot be serialized. Instead, I scoped persistence to metadata only (possible future enhancement).

**Queue Management**: I chose to allow all files to upload concurrently instead of enforcing a strict queue. This kept the implementation simpler and closer to real-world needs for uploading multiple photos.

**State Management**: Used `useRef` for non-reactive data (file metadata, cancellation functions) to avoid unnecessary re-renders, while using Jotai atoms for reactive state that should trigger UI updates.

**Reactivity**: Implemented local state with XState actor subscriptions for button states (`hasFailedUploads`, `hasActiveUploads`) instead of pure Jotai atoms, as the atoms weren't reactive enough to individual actor state changes.

**Type Safety**: Used const objects instead of enums for state and event types to ensure build compatibility, while maintaining type safety through TypeScript's `as const` assertions.

**Styling**: Kept UI styling minimal and semantic, prioritizing clarity and state feedback over design polish.

## 🛠️ Development Notes

### Tooling

- **Editor/IDE**: Used Cursor for development
- **LLMs/Codegen**: Leveraged Claude to help refine the challenge requirements and ChatGPT to cross-check reasoning and fill conceptual gaps. Cursor's inline assistance was also used to scaffold boilerplate and speed up iteration
- **Testing/Verification**: Relied on console-driven debugging and XState's actor inspection to validate machine behavior

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run the test suite
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
