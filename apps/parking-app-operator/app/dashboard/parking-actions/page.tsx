'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, Camera, CircleOff, Loader2, QrCode, ScanLine } from 'lucide-react';

import { buildOperatorEntryPass } from '@/components/dashboard/parking-action-controls';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { recordOperatorActionFailure, recordOperatorActionSuccess } from '@/lib/operatorDataStore';
import { hasOperatorCapability } from '@/lib/operatorPermissions';
import type { Reservation } from '@/lib/types';
import { useOperatorData } from '@/lib/useOperatorData';

type FeedbackTone = 'success' | 'warning' | 'error';

type ActionFeedback = {
  tone: FeedbackTone;
  title: string;
  message: string;
};

type BarcodeResult = {
  rawValue?: string;
};

type BarcodeDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<BarcodeResult[]>;
};

type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

function formatTimestamp(value: unknown) {
  if (typeof value !== 'string') {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function normalizeEntryPass(value: string) {
  return value.trim();
}

function feedbackClasses(tone: FeedbackTone) {
  switch (tone) {
    case 'success':
      return 'border-green-500/30 bg-green-500/10 text-green-300';
    case 'warning':
      return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    default:
      return 'border-destructive/30 bg-destructive/10 text-destructive';
  }
}

function isBarcodeDetectorSupported() {
  if (typeof window === 'undefined') {
    return false;
  }

  return Boolean((window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector);
}

export default function ParkingActionsPage() {
  const searchParams = useSearchParams();
  const { user, activeLocation } = useAuth();
  const { data, loading, refresh } = useOperatorData();
  const [entryPass, setEntryPass] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionFeedback | null>(null);
  const [scanSupported, setScanSupported] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const scanLockRef = useRef(false);

  const canOperateParkingActions = hasOperatorCapability(user?.role, 'edit-slot-status');
  const activeReservations = useMemo(
    () => (data?.reservations ?? []).filter((reservation) => reservation.status === 'active').slice(0, 8),
    [data?.reservations],
  );

  useEffect(() => {
    setScanSupported(isBarcodeDetectorSupported());
  }, []);

  useEffect(() => {
    const seededEntryPass = searchParams.get('entryPass');
    if (!seededEntryPass) {
      return;
    }

    setEntryPass((current) => current || seededEntryPass);
  }, [searchParams]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  function stopCamera() {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    scanLockRef.current = false;
    setCameraActive(false);
    setCameraLoading(false);
  }

  async function submitEntryPass(value: string) {
    const normalized = normalizeEntryPass(value);
    if (!normalized) {
      setFeedback({
        tone: 'error',
        title: 'Missing QR payload',
        message: 'Paste or scan a reservation or walk-in entry QR payload before verifying.',
      });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    try {
      const response = await fetch('/api/operator/gate-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ entryPass: normalized }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to verify entry QR.');
      }

      const confirmation = payload?.confirmation ?? null;
      const idempotentReplay = Boolean(confirmation?.idempotent_replay);
      const graceEndsAt = formatTimestamp(confirmation?.parking_grace_ends_at);
      const sessionId = typeof confirmation?.id === 'string' ? confirmation.id : null;

      setFeedback({
        tone: idempotentReplay ? 'warning' : 'success',
        title: idempotentReplay ? 'Entry already confirmed' : 'Entry confirmed',
        message: idempotentReplay
          ? `The QR was already used for an active session${sessionId ? ` (${sessionId})` : ''}. Replay was handled safely.`
          : `The reservation is now backed by an active session${graceEndsAt ? ` with parking grace until ${graceEndsAt}` : ''}.`,
      });
      recordOperatorActionSuccess();
      await refresh({ silent: true, force: true });
    } catch (error) {
      recordOperatorActionFailure();
      setFeedback({
        tone: 'error',
        title: 'Entry verification failed',
        message: error instanceof Error ? error.message : 'Unable to verify entry QR.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function startCameraScan() {
    if (!isBarcodeDetectorSupported()) {
      setScanMessage('Camera QR scanning is not available in this browser yet. Use manual entry instead.');
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setScanMessage('Camera access is unavailable in this environment. Use manual entry instead.');
      return;
    }

    setScanMessage(null);
    setCameraLoading(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: 'environment',
        },
      });

      streamRef.current = stream;
      setCameraActive(true);

      const video = videoRef.current;
      if (!video) {
        throw new Error('Scanner preview could not start.');
      }

      video.srcObject = stream;
      await video.play();

      const Detector = (window as Window & { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        throw new Error('Camera QR scanning is not available in this browser yet.');
      }

      const detector = new Detector({ formats: ['qr_code'] });
      setCameraLoading(false);

      const scanFrame = async () => {
        if (!videoRef.current || scanLockRef.current) {
          animationFrameRef.current = window.requestAnimationFrame(() => {
            void scanFrame();
          });
          return;
        }

        try {
          const results = await detector.detect(videoRef.current);
          const match = results.find((item) => typeof item.rawValue === 'string' && item.rawValue.trim().length > 0);

          if (match?.rawValue) {
            scanLockRef.current = true;
            const nextEntryPass = normalizeEntryPass(match.rawValue);
            setEntryPass(nextEntryPass);
            setScanMessage('QR captured from camera. Verifying entry now.');
            stopCamera();
            await submitEntryPass(nextEntryPass);
            return;
          }
        } catch {
          setScanMessage('Camera scan is active, but the browser did not return a readable QR yet.');
        }

        animationFrameRef.current = window.requestAnimationFrame(() => {
          void scanFrame();
        });
      };

      animationFrameRef.current = window.requestAnimationFrame(() => {
        void scanFrame();
      });
    } catch (error) {
      stopCamera();
      setScanMessage(error instanceof Error ? error.message : 'Unable to start camera QR scanning.');
    } finally {
      setCameraLoading(false);
    }
  }

  if (!canOperateParkingActions) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Parking Actions</h1>
            <p className="mt-2 text-muted-foreground">
              Entry and exit QR handling is available only to location-operating roles.
            </p>
          </div>
          <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Access restricted</AlertTitle>
            <AlertDescription>
              Your current role does not include the slot-status capability required to verify parking entry or exit QR flows.
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Parking Actions</h1>
          <p className="text-muted-foreground">
            Operator entry verification is now connected to the reviewed gate-entry API. Exit verification stays blocked until the backend exit authorization contract exists.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <Card className="border-border bg-card">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg text-foreground">Entry Scan</CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Scan or paste a reservation or walk-in entry QR to confirm lot entry for the active location.
                  </div>
                </div>
                <Badge variant="outline" className="border-border text-xs">
                  {activeLocation?.name ?? 'No active location'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void startCameraScan()} disabled={cameraLoading || cameraActive}>
                  {cameraLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                  Scan QR
                </Button>
                <Button type="button" variant="outline" onClick={() => stopCamera()} disabled={!cameraActive && !cameraLoading}>
                  Stop Scan
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEntryPass('');
                    setFeedback(null);
                    setScanMessage(null);
                  }}
                >
                  Clear
                </Button>
              </div>

              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <ScanLine className="h-4 w-4" />
                  Camera scan
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  {scanSupported
                    ? 'Use the device camera to read the customer entry QR, then the operator flow will verify it automatically.'
                    : 'This browser does not expose in-app QR detection, so operators should use the manual QR payload field below.'}
                </div>
                <div className="mt-4 overflow-hidden rounded-lg border border-border bg-black/60">
                  {cameraActive ? (
                    <video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline />
                  ) : (
                    <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-muted-foreground">
                      {cameraLoading
                        ? 'Starting camera preview...'
                        : 'Camera preview will appear here when Scan QR is started.'}
                    </div>
                  )}
                </div>
                {scanMessage ? (
                  <div className="mt-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground">
                    {scanMessage}
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <label htmlFor="entry-pass-payload" className="text-sm font-medium text-foreground">
                  Manual entry QR payload
                </label>
                <Textarea
                  id="entry-pass-payload"
                  value={entryPass}
                  onChange={(event) => setEntryPass(event.target.value)}
                  placeholder="Paste the scanned QR payload here, such as reservation-entry|... or walkin-entry-pass|..."
                  className="min-h-24"
                />
                <div className="text-xs text-muted-foreground">
                  Treat QR payloads as untrusted input. This page only sends them to the authenticated operator route and never exposes service credentials to the browser.
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void submitEntryPass(entryPass)} disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                  Verify Entry QR
                </Button>
              </div>

              {feedback ? (
                <Alert className={feedbackClasses(feedback.tone)}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>{feedback.title}</AlertTitle>
                  <AlertDescription>{feedback.message}</AlertDescription>
                </Alert>
              ) : null}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Exit Scan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CircleOff className="h-4 w-4 text-amber-300" />
                  Backend contract still required
                </div>
                <div className="text-sm text-muted-foreground">
                  The operator UI now exposes the future exit surface, but it does not complete exit QR confirmation yet. Paid-exit authorization, leave-the-slot grace, and penalty-safe terminal handling are still backend follow-up work.
                </div>
                <Button type="button" disabled className="w-full">
                  Verify Exit QR
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Quick Fill</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-muted-foreground">
                  Use one of the current active reservations when the operator needs a manual fallback instead of a live camera scan.
                </div>
                {loading && !data ? (
                  <div className="text-sm text-muted-foreground">Loading active reservations...</div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {activeReservations.map((reservation: Reservation) => (
                    <Button
                      key={reservation.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="max-w-full justify-start border-border"
                      onClick={() => setEntryPass(buildOperatorEntryPass(reservation))}
                    >
                      <span className="truncate">
                        {reservation.reservationId} · {reservation.slotNumber}
                      </span>
                    </Button>
                  ))}
                </div>
                {activeReservations.length === 0 && !loading ? (
                  <div className="text-sm text-muted-foreground">
                    No active reservations are currently loaded for quick-fill support.
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
