import { NextResponse } from 'next/server';

type LogLevel = 'info' | 'warn' | 'error';

export type OperatorRouteRequestContext = {
  route: string;
  method: string;
  requestId: string;
  idempotencyKey: string | null;
  startedAt: number;
};

function readRequestHeader(request: Request, key: string) {
  return request.headers.get(key) ?? request.headers.get(key.toLowerCase()) ?? request.headers.get(key.toUpperCase());
}

export function createOperatorRouteContext(request: Request, route: string): OperatorRouteRequestContext {
  const requestId =
    readRequestHeader(request, 'x-correlation-id') ??
    readRequestHeader(request, 'x-request-id') ??
    crypto.randomUUID();

  const idempotencyKey =
    readRequestHeader(request, 'idempotency-key') ??
    readRequestHeader(request, 'x-idempotency-key') ??
    null;

  return {
    route,
    method: request.method,
    requestId,
    idempotencyKey,
    startedAt: Date.now(),
  };
}

export function logOperatorRoute(
  level: LogLevel,
  context: OperatorRouteRequestContext,
  message: string,
  fields: Record<string, unknown> = {},
) {
  const entry = {
    level,
    message,
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    idempotencyKey: context.idempotencyKey,
    ...fields,
  };

  const writer = level === 'error' ? console.error : level === 'warn' ? console.warn : console.info;
  writer(JSON.stringify(entry));
}

export function logOperatorRouteSuccess(
  context: OperatorRouteRequestContext,
  message: string,
  fields: Record<string, unknown> = {},
) {
  logOperatorRoute('info', context, message, {
    durationMs: Date.now() - context.startedAt,
    ...fields,
  });
}

export function logOperatorRouteError(
  context: OperatorRouteRequestContext,
  message: string,
  error: unknown,
  fields: Record<string, unknown> = {},
) {
  logOperatorRoute('error', context, message, {
    durationMs: Date.now() - context.startedAt,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    ...fields,
  });
}

export function jsonWithRequestContext(
  context: OperatorRouteRequestContext,
  body: unknown,
  init?: ResponseInit,
) {
  const response = NextResponse.json(body, init);
  response.headers.set('x-correlation-id', context.requestId);
  if (context.idempotencyKey) {
    response.headers.set('idempotency-key', context.idempotencyKey);
  }
  return response;
}
