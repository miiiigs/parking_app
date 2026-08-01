const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

function htmlResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

Deno.serve((request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'GET') {
    return htmlResponse('<h1>Method not allowed</h1>', 405);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('paymongo_status')?.trim() || 'return';
  const paymentIntentId = url.searchParams.get('payment_intent_id')?.trim() || '';
  const appUrl = new URL('parkeasymobile://payment');
  appUrl.searchParams.set('paymongo_status', status);

  if (paymentIntentId) {
    appUrl.searchParams.set('payment_intent_id', paymentIntentId);
  }

  const deepLinkUrl = appUrl.toString();
  const escapedDeepLink = escapeHtml(deepLinkUrl);

  return htmlResponse(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Returning to ParkEasy</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Arial, sans-serif;
        background: #f8fafc;
        color: #0f172a;
      }
      main {
        width: min(92vw, 420px);
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        padding: 24px;
        box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08);
        text-align: center;
      }
      h1 {
        margin: 0 0 12px;
        font-size: 22px;
      }
      p {
        margin: 0 0 16px;
        line-height: 1.5;
        color: #475569;
      }
      a {
        display: inline-block;
        margin-top: 8px;
        padding: 12px 16px;
        border-radius: 12px;
        background: #0f766e;
        color: white;
        text-decoration: none;
        font-weight: 600;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Returning to ParkEasy</h1>
      <p>If the app does not open automatically, tap the button below.</p>
      <a href="${escapedDeepLink}">Open ParkEasy</a>
    </main>
    <script>
      window.location.replace(${JSON.stringify(deepLinkUrl)});
      setTimeout(function () {
        window.location.href = ${JSON.stringify(deepLinkUrl)};
      }, 900);
    </script>
  </body>
</html>`);
});
