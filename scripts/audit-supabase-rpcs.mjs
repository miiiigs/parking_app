import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = 'C:/dev/parking_app';
const operatorEnvPath = path.join(workspaceRoot, 'apps/parking-app-operator/.env.local');

const expectedContracts = [
  {
    name: 'issue_walk_in_entry_pass',
    required: ['p_plate_number'],
    optional: ['p_hold_minutes'],
    forbidden: ['p_slot_id'],
  },
  {
    name: 'confirm_parking_entry',
    required: ['p_reservation_id', 'p_location_id'],
    optional: ['p_entry_token'],
  },
  {
    name: 'reserve_parking_slot',
    required: ['p_slot_id', 'p_plate_number', 'p_arrival_window_minutes'],
    optional: ['p_parking_rate'],
  },
  {
    name: 'start_parking_session',
    required: ['p_reservation_id'],
    optional: ['p_slot_qr_token'],
  },
  {
    name: 'start_walk_in_session',
    required: ['p_reservation_id'],
    optional: ['p_slot_qr_token'],
  },
  {
    name: 'cancel_parking_reservation',
    required: ['p_reservation_id'],
    optional: [],
  },
  {
    name: 'end_parking_session',
    required: ['p_reservation_id'],
    optional: ['p_billed_minutes', 'p_billed_amount', 'p_payment_reference', 'p_payment_provider', 'p_payment_status'],
  },
  {
    name: 'mobile_dashboard_snapshot',
    required: ['p_user_id'],
    optional: [],
  },
  {
    name: 'expire_stale_walk_in_entry_passes',
    required: [],
    optional: [],
  },
];

const expectedColumnChecks = [
  {
    name: 'parking_slots.slot_kind',
    path: '/parking_slots?select=id,slot_kind&limit=1',
  },
  {
    name: 'parking_sessions.entry_grace_columns',
    path: '/parking_sessions?select=id,entry_confirmed_at,parking_grace_ends_at,metered_started_at&limit=1',
  },
  {
    name: 'reservations.source',
    path: '/reservations?select=id,source,slot_id&limit=1',
  },
  {
    name: 'walk_in_entry_pass_tokens',
    path: '/walk_in_entry_pass_tokens?select=reservation_id,token_hash,expires_at&limit=1',
  },
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      }),
  );
}

function resolveConfig() {
  const fileEnv = parseEnvFile(operatorEnvPath);
  const supabaseUrl = process.env.SUPABASE_URL
    ?? process.env.NEXT_PUBLIC_SUPABASE_URL
    ?? fileEnv.SUPABASE_URL
    ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL
    ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? fileEnv.SUPABASE_SERVICE_ROLE_KEY
    ?? '';

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase audit configuration. Provide NEXT_PUBLIC_SUPABASE_URL/SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return {
    supabaseUrl: supabaseUrl.replace(/\/$/, ''),
    serviceRoleKey,
  };
}

function getRpcContract(spec, rpcName) {
  const rpcPath = spec.paths?.[`/rpc/${rpcName}`];
  const schema = rpcPath?.post?.parameters?.[0]?.schema ?? null;
  const properties = Object.keys(schema?.properties ?? {}).sort();
  const required = [...(schema?.required ?? [])].sort();

  return {
    exists: Boolean(rpcPath?.post),
    properties,
    required,
  };
}

function compareContract(expected, actual) {
  if (!actual.exists) {
    return [`RPC is missing from the deployed public schema.`];
  }

  const issues = [];
  const propertySet = new Set(actual.properties);
  const requiredSet = new Set(actual.required);

  for (const param of expected.required) {
    if (!propertySet.has(param)) {
      issues.push(`Missing parameter \`${param}\`.`);
    }
    if (!requiredSet.has(param)) {
      issues.push(`Expected required parameter \`${param}\` is not marked required.`);
    }
  }

  for (const param of expected.optional) {
    if (!propertySet.has(param)) {
      issues.push(`Missing optional parameter \`${param}\` expected by the repo contract.`);
    }
  }

  for (const param of expected.forbidden ?? []) {
    if (propertySet.has(param)) {
      issues.push(`Unexpected legacy parameter \`${param}\` is still deployed.`);
    }
  }

  for (const param of actual.required) {
    if (!expected.required.includes(param)) {
      issues.push(`Unexpected required parameter \`${param}\` is deployed.`);
    }
  }

  return issues;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = resolveConfig();
  const baseHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  };
  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      ...baseHeaders,
      Accept: 'application/openapi+json',
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase schema audit failed with HTTP ${response.status}.`);
  }

  const spec = await response.json();
  const failures = [];

  console.log(`Supabase flow audit against ${supabaseUrl}`);

  for (const expected of expectedContracts) {
    const actual = getRpcContract(spec, expected.name);
    const issues = compareContract(expected, actual);

    if (issues.length === 0) {
      console.log(`PASS ${expected.name}`);
      continue;
    }

    failures.push({ name: expected.name, issues, actual });
    console.log(`FAIL ${expected.name}`);
    console.log(`  deployed required: ${actual.required.join(', ') || '(none)'}`);
    console.log(`  deployed params: ${actual.properties.join(', ') || '(none)'}`);
    for (const issue of issues) {
      console.log(`  - ${issue}`);
    }
  }

  for (const check of expectedColumnChecks) {
    const checkResponse = await fetch(`${supabaseUrl}/rest/v1${check.path}`, {
      headers: baseHeaders,
    });

    if (checkResponse.ok) {
      console.log(`PASS ${check.name}`);
      continue;
    }

    const body = await checkResponse.text();
    failures.push({ name: check.name, issues: [body] });
    console.log(`FAIL ${check.name}`);
    console.log(`  status: ${checkResponse.status}`);
    console.log(`  body: ${body}`);
  }

  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
