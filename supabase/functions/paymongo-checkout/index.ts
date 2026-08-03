import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const PAYMONGO_SECRET_KEY = Deno.env.get('PAYMONGO_SECRET_KEY');

type CreatePaymentIntentPayload = {
  action: 'create_payment_intent';
  reservationId: string;
  paymentMethodType: 'card' | 'gcash' | 'paymaya' | 'qrph';
};

type SyncPaymentIntentPayload = {
  action: 'sync_payment_intent';
  reservationId: string;
  paymentIntentId: string;
};

type RequestPayload = CreatePaymentIntentPayload | SyncPaymentIntentPayload;

type PaymentRecord = {
  id: string;
  status: string;
  reference: string | null;
  amount: number | string;
};

type ReservationContext = Awaited<ReturnType<typeof loadReservationContext>>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PAYMONGO_SECRET_KEY) {
    throw new Error('Missing Supabase or PayMongo server configuration.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`Missing ${fieldName}.`);
  }

  return value.trim();
}

function toAmountInCentavos(amount: number | string) {
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid payment amount.');
  }

  return Math.round(numericAmount * 100);
}

async function payMongoRequest(path: string, init: RequestInit) {
  const authToken = btoa(`${PAYMONGO_SECRET_KEY}:`);
  const response = await fetch(`https://api.paymongo.com${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${authToken}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMessage =
      isRecord(payload)
      && Array.isArray(payload.errors)
      && isRecord(payload.errors[0])
      && typeof payload.errors[0].detail === 'string'
        ? payload.errors[0].detail
        : 'PayMongo request failed.';
    throw new Error(errorMessage);
  }

  return payload;
}

async function getAuthenticatedUserId(adminClient: ReturnType<typeof createClient>, request: Request) {
  const authorizationHeader = request.headers.get('Authorization');
  const accessToken = authorizationHeader?.replace(/^Bearer\s+/i, '').trim();

  if (!accessToken) {
    throw new Error('Authentication is required.');
  }

  const { data, error } = await adminClient.auth.getUser(accessToken);

  if (error || !data.user) {
    throw new Error('Unable to verify the current customer session.');
  }

  return data.user.id;
}

async function loadReservationContext(adminClient: ReturnType<typeof createClient>, userId: string, reservationId: string) {
  const { data: reservation, error: reservationError } = await adminClient
    .from('reservations')
    .select('id,user_id,slot_id,plate_number,reservation_fee,status')
    .eq('id', reservationId)
    .eq('user_id', userId)
    .maybeSingle();

  if (reservationError) {
    throw new Error(reservationError.message);
  }

  if (!reservation) {
    throw new Error('Reservation not found for this customer.');
  }

  const { data: session, error: sessionError } = await adminClient
    .from('parking_sessions')
    .select('id,status,billed_amount,billed_minutes')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    throw new Error('Parking session not found.');
  }

  const { data: latestPaymentRows, error: paymentError } = await adminClient
    .from('payments')
    .select('id,status,reference,amount')
    .eq('reservation_id', reservationId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (paymentError) {
    throw new Error(paymentError.message);
  }

  const { data: slotRow, error: slotError } = await adminClient
    .from('parking_slots')
    .select('slot_label,locations(name,address)')
    .eq('id', reservation.slot_id)
    .maybeSingle();

  if (slotError) {
    throw new Error(slotError.message);
  }

  const locationPayload = Array.isArray(slotRow?.locations) ? slotRow.locations[0] : slotRow?.locations;
  const location = isRecord(locationPayload) ? locationPayload : null;

  let latestPayment = Array.isArray(latestPaymentRows) ? (latestPaymentRows[0] as PaymentRecord | undefined) ?? null : null;

  if (!latestPayment && session.status === 'completed') {
    const rebuiltAmount = roundToCurrency((Number(session.billed_amount ?? 0) + Number(reservation.reservation_fee ?? 0)));
    const fallbackAmount = rebuiltAmount > 0 ? rebuiltAmount : 1;

    const { error: insertedPaymentError } = await adminClient
      .from('payments')
      .insert({
        session_id: session.id,
        reservation_id: reservationId,
        provider: 'paymongo',
        status: 'pending',
        reference: 'backfilled_pending_payment',
        amount: fallbackAmount,
      });

    if (insertedPaymentError) {
      throw new Error(insertedPaymentError.message);
    }

    const { data: reloadedPaymentRows, error: reloadedPaymentError } = await adminClient
      .from('payments')
      .select('id,status,reference,amount')
      .eq('reservation_id', reservationId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (reloadedPaymentError) {
      throw new Error(reloadedPaymentError.message);
    }

    latestPayment = Array.isArray(reloadedPaymentRows) ? (reloadedPaymentRows[0] as PaymentRecord | undefined) ?? null : null;
  }

  if (!latestPayment) {
    if (session.status !== 'completed') {
      throw new Error('The backend parking session is still active. Go back to the session screen and tap End Session again before paying.');
    }

    throw new Error('Payment record not found. Reload the app and try the payment again so we can recreate the pending payment row.');
  }

  return {
    reservation,
    session,
    latestPayment,
    slotLabel: typeof slotRow?.slot_label === 'string' ? slotRow.slot_label : 'Assigned slot',
    locationName: typeof location?.name === 'string' ? location.name : 'ParkingPH',
    locationAddress: typeof location?.address === 'string' ? location.address : '',
  };
}

function roundToCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function normalizeIntentOutcome(paymentIntent: Record<string, unknown>) {
  const attributes = isRecord(paymentIntent.attributes) ? paymentIntent.attributes : {};
  const status = typeof attributes.status === 'string' ? attributes.status : 'unknown';
  const nextAction = isRecord(attributes.next_action) ? attributes.next_action : null;
  const redirect = nextAction && isRecord(nextAction.redirect) ? nextAction.redirect : null;
  const code = nextAction && isRecord(nextAction.code) ? nextAction.code : null;
  const lastPaymentError = isRecord(attributes.last_payment_error) ? attributes.last_payment_error : null;

  const imageUrl = typeof code?.image_url === 'string' ? code.image_url : null;
  const redirectUrl = typeof redirect?.url === 'string' ? redirect.url : null;
  const errorMessage =
    typeof lastPaymentError?.failed_message === 'string'
      ? lastPaymentError.failed_message
      : typeof lastPaymentError?.message === 'string'
        ? lastPaymentError.message
        : null;

  let paymentStatus: 'pending' | 'paid' | 'failed' = 'pending';
  if (status === 'succeeded') {
    paymentStatus = 'paid';
  } else if (status === 'awaiting_payment_method' && errorMessage) {
    paymentStatus = 'failed';
  }

  return {
    status,
    paymentStatus,
    imageUrl,
    redirectUrl,
    errorMessage,
  };
}

async function upsertPaymentStatus(adminClient: ReturnType<typeof createClient>, paymentRowId: string, paymentIntentId: string, outcome: ReturnType<typeof normalizeIntentOutcome>) {
  const nextValues: Record<string, unknown> = {
    provider: 'paymongo',
    reference: paymentIntentId,
    updated_at: new Date().toISOString(),
  };

  if (outcome.paymentStatus === 'paid') {
    nextValues.status = 'paid';
    nextValues.paid_at = new Date().toISOString();
  } else if (outcome.paymentStatus === 'failed') {
    nextValues.status = 'failed';
  } else {
    nextValues.status = 'pending';
  }

  const { error } = await adminClient
    .from('payments')
    .update(nextValues)
    .eq('id', paymentRowId);

  if (error) {
    throw new Error(error.message);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    ensureConfigured();

    const adminClient = createClient(SUPABASE_URL as string, SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const userId = await getAuthenticatedUserId(adminClient, request);
    const rawBody = await request.json();

    if (!isRecord(rawBody) || typeof rawBody.action !== 'string') {
      return jsonResponse({ error: 'Invalid request body.' }, 400);
    }

    const payload = rawBody as RequestPayload;

    if (payload.action === 'create_payment_intent') {
      const reservationId = requireString(payload.reservationId, 'reservationId');
      const paymentMethodType = requireString(payload.paymentMethodType, 'paymentMethodType');

      if (!['card', 'gcash', 'paymaya', 'qrph'].includes(paymentMethodType)) {
        return jsonResponse({ error: 'Unsupported PayMongo payment method.' }, 400);
      }

      const context = await loadReservationContext(adminClient, userId, reservationId);

      if (context.latestPayment.status === 'paid') {
        return jsonResponse({
          paymentStatus: 'paid',
          message: 'This parking session is already paid.',
        });
      }

      if (context.session.status !== 'completed') {
        throw new Error('End the parking session before starting PayMongo payment.');
      }

      const payMongoResponse = await payMongoRequest('/v1/payment_intents', {
        method: 'POST',
        body: JSON.stringify({
          data: {
            attributes: {
              amount: toAmountInCentavos(context.latestPayment.amount),
              currency: 'PHP',
              payment_method_allowed: [paymentMethodType],
              description: `Parking session at ${context.locationName}`,
              statement_descriptor: 'ParkEasy',
            },
          },
        }),
      });

      const paymentIntent = isRecord(payMongoResponse) && isRecord(payMongoResponse.data)
        ? payMongoResponse.data
        : null;
      const intentAttributes = paymentIntent && isRecord(paymentIntent.attributes) ? paymentIntent.attributes : null;
      const paymentIntentId = paymentIntent && typeof paymentIntent.id === 'string' ? paymentIntent.id : null;
      const clientKey = intentAttributes && typeof intentAttributes.client_key === 'string' ? intentAttributes.client_key : null;

      if (!paymentIntentId || !clientKey) {
        throw new Error('PayMongo did not return a usable Payment Intent.');
      }

      await upsertPaymentStatus(
        adminClient,
        context.latestPayment.id,
        paymentIntentId,
        {
          status: typeof intentAttributes?.status === 'string' ? intentAttributes.status : 'awaiting_payment_method',
          paymentStatus: 'pending',
          imageUrl: null,
          redirectUrl: null,
          errorMessage: null,
        },
      );

      return jsonResponse({
        paymentIntentId,
        clientKey,
        paymentIntentStatus: typeof intentAttributes?.status === 'string' ? intentAttributes.status : 'awaiting_payment_method',
        paymentStatus: 'pending',
      });
    }

    if (payload.action === 'sync_payment_intent') {
      const reservationId = requireString(payload.reservationId, 'reservationId');
      const paymentIntentId = requireString(payload.paymentIntentId, 'paymentIntentId');
      const context = await loadReservationContext(adminClient, userId, reservationId);

      const payMongoResponse = await payMongoRequest(`/v1/payment_intents/${paymentIntentId}`, {
        method: 'GET',
      });

      const paymentIntent = isRecord(payMongoResponse) && isRecord(payMongoResponse.data)
        ? payMongoResponse.data
        : null;

      if (!paymentIntent) {
        throw new Error('PayMongo Payment Intent not found.');
      }

      const outcome = normalizeIntentOutcome(paymentIntent);
      await upsertPaymentStatus(adminClient, context.latestPayment.id, paymentIntentId, outcome);

      return jsonResponse({
        paymentIntentStatus: outcome.status,
        paymentStatus: outcome.paymentStatus,
        nextActionRedirectUrl: outcome.redirectUrl,
        qrImageUrl: outcome.imageUrl,
        errorMessage: outcome.errorMessage,
      });
    }

    return jsonResponse({ error: 'Unsupported action.' }, 400);
  } catch (error) {
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unexpected PayMongo function error.',
      },
      400,
    );
  }
});
