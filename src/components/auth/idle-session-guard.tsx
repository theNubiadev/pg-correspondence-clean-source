"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  SESSION_IDLE_TIMEOUT_SECONDS,
  SESSION_IDLE_WARNING_SECONDS,
  SESSION_TOUCH_INTERVAL_SECONDS,
} from "@/lib/auth/session-policy";

const ACTIVITY_STORAGE_KEY = "pgcms:last-activity";
const IDLE_TIMEOUT_MS = SESSION_IDLE_TIMEOUT_SECONDS * 1000;
const WARNING_MS = SESSION_IDLE_WARNING_SECONDS * 1000;
const TOUCH_INTERVAL_MS = SESSION_TOUCH_INTERVAL_SECONDS * 1000;

export function IdleSessionGuard() {
  const [warningOpen, setWarningOpen] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(
    SESSION_IDLE_WARNING_SECONDS,
  );
  const lastActivity = useRef(Date.now());
  const lastServerTouch = useRef(0);
  const signingOut = useRef(false);

  const signOut = useCallback((reason = "idle") => {
    if (signingOut.current) return;
    signingOut.current = true;
    window.location.assign(`/logout?reason=${encodeURIComponent(reason)}`);
  }, []);

  const touchServer = useCallback(
    async (force = false) => {
      const now = Date.now();
      if (!force && now - lastServerTouch.current < TOUCH_INTERVAL_MS) return;
      lastServerTouch.current = now;

      try {
        const response = await fetch("/api/session/activity", {
          method: "POST",
          cache: "no-store",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
        });
        if (response.status === 401) {
          const payload = (await response.json().catch(() => null)) as {
            reason?: string;
          } | null;
          signingOut.current = true;
          window.location.assign(
            payload?.reason === "idle" ? "/login?reason=idle" : "/login",
          );
        }
      } catch {
        // A temporary network failure must not destroy a valid local session.
        // The next activity will retry, while the local idle timer continues.
      }
    },
    [signOut],
  );

  const recordActivity = useCallback(
    (broadcast = true, forceTouch = false) => {
      const now = Date.now();
      if (now - lastActivity.current >= IDLE_TIMEOUT_MS) {
        signOut();
        return;
      }
      lastActivity.current = now;
      setWarningOpen(false);
      setSecondsRemaining(SESSION_IDLE_WARNING_SECONDS);

      if (broadcast) {
        try {
          localStorage.setItem(ACTIVITY_STORAGE_KEY, String(now));
        } catch {
          // Storage can be unavailable in locked-down browsers.
        }
      }
      void touchServer(forceTouch);
    },
    [signOut, touchServer],
  );

  useEffect(() => {
    recordActivity(false, true);

    const onActivity = () => recordActivity();
    const onStorage = (event: StorageEvent) => {
      if (event.key !== ACTIVITY_STORAGE_KEY || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (!Number.isFinite(timestamp) || timestamp <= lastActivity.current) return;
      lastActivity.current = timestamp;
      setWarningOpen(false);
      setSecondsRemaining(SESSION_IDLE_WARNING_SECONDS);
      void touchServer();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") recordActivity();
    };

    const activityEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "scroll",
      "touchstart",
    ];
    activityEvents.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );
    window.addEventListener("focus", onActivity);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisibility);

    const timer = window.setInterval(() => {
      const remaining = IDLE_TIMEOUT_MS - (Date.now() - lastActivity.current);
      if (remaining <= 0) {
        signOut();
        return;
      }
      if (remaining <= WARNING_MS) {
        setSecondsRemaining(Math.max(1, Math.ceil(remaining / 1000)));
        setWarningOpen(true);
      }
    }, 1000);

    return () => {
      window.clearInterval(timer);
      activityEvents.forEach((event) =>
        window.removeEventListener(event, onActivity),
      );
      window.removeEventListener("focus", onActivity);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [recordActivity, signOut, touchServer]);

  return (
    <Dialog open={warningOpen} onOpenChange={() => undefined}>
      <DialogContent showCloseButton={false} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Your session is about to end</DialogTitle>
          <DialogDescription>
            You will be signed out after one minute of inactivity to protect
            correspondence records.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium tabular-nums" aria-live="polite">
          Signing out in {secondsRemaining} second
          {secondsRemaining === 1 ? "" : "s"}.
        </p>
        <DialogFooter>
          <Button type="button" onClick={() => recordActivity(true, true)}>
            Stay signed in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
