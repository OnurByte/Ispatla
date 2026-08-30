"use client";

import { useRef, useState } from "react";

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function useAbortableRequest() {
  const controller = useRef<AbortController | null>(null);
  const [pending, setPending] = useState(false);

  async function run<T>(request: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setPending(true);
    try {
      return await request(current.signal);
    } catch (error) {
      if (isAbortError(error)) return undefined;
      throw error;
    } finally {
      if (controller.current === current) {
        controller.current = null;
        setPending(false);
      }
    }
  }

  function abort() { controller.current?.abort(); }

  return { pending, run, abort };
}
