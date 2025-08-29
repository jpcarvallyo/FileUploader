import "@testing-library/jest-dom";

import { beforeEach, afterEach, vi } from "vitest";

// Mock console.log to reduce noise in tests
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});
