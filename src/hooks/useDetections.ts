import { useEffect, useRef, useState } from "react";

import { fetchLatestDetections, parsePollInterval, type Detection } from "../services/detections";

export const detectionLimit = 50;
export const pollIntervalMs = parsePollInterval(import.meta.env.VITE_DETECTIONS_POLL_INTERVAL_MS);
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";
const requestTimeoutMs = 12000;

export function useDetections() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [newDetectionIds, setNewDetectionIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let nextPoll: number | undefined;
    let activeRequest: AbortController | null = null;
    let refreshWhenSettled = false;
    const fadeTimeouts = new Set<number>();

    const clearNextPoll = () => {
      window.clearTimeout(nextPoll);
      nextPoll = undefined;
    };

    const schedulePoll = () => {
      clearNextPoll();
      if (!cancelled && document.visibilityState === "visible") {
        nextPoll = window.setTimeout(() => { nextPoll = undefined; void poll(); }, pollIntervalMs);
      }
    };

    const poll = async () => {
      if (cancelled || activeRequest || document.visibilityState === "hidden") return;
      const controller = new AbortController();
      activeRequest = controller;
      let timedOut = false;
      const requestTimeout = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, requestTimeoutMs);

      try {
        const latest = await fetchLatestDetections(apiBaseUrl, detectionLimit, controller.signal);
        if (cancelled || controller.signal.aborted) return;

        const previousIds = knownIdsRef.current;
        const arrivals = previousIds ? latest.filter((item) => !previousIds.has(item.eventId)).map((item) => item.eventId) : [];
        knownIdsRef.current = new Set(latest.map((item) => item.eventId));
        setDetections(latest);
        setError(null);
        setLastUpdatedAt(Date.now());
        setIsLoading(false);

        if (arrivals.length) {
          setNewDetectionIds((current) => [...new Set([...current, ...arrivals])]);
          const fadeTimeout = window.setTimeout(() => {
            setNewDetectionIds((current) => current.filter((id) => !arrivals.includes(id)));
            fadeTimeouts.delete(fadeTimeout);
          }, 2800);
          fadeTimeouts.add(fadeTimeout);
        }
      } catch (fetchError) {
        if (!cancelled && (!controller.signal.aborted || timedOut)) {
          setError(timedOut ? "A API demorou para responder. Uma nova tentativa será feita." : fetchError instanceof Error ? fetchError.message : "Não foi possível consultar a API.");
          setIsLoading(false);
        }
      } finally {
        window.clearTimeout(requestTimeout);
        if (activeRequest === controller) activeRequest = null;
        if (!cancelled && document.visibilityState === "visible") {
          if (refreshWhenSettled) {
            refreshWhenSettled = false;
            void poll();
          } else {
            schedulePoll();
          }
        }
      }
    };

    const handleVisibilityChange = () => {
      clearNextPoll();
      if (document.visibilityState === "hidden") {
        refreshWhenSettled = false;
        activeRequest?.abort();
      } else if (activeRequest) {
        refreshWhenSettled = true;
      } else {
        void poll();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    void poll();
    return () => {
      cancelled = true;
      activeRequest?.abort();
      clearNextPoll();
      fadeTimeouts.forEach((id) => window.clearTimeout(id));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return { detections, newDetectionIds, error, isLoading, lastUpdatedAt };
}
