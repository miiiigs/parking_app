import { signInAdmin } from '../actions';

type Props = {
  searchParams?: Promise<{ error?: string } | undefined>;
};

export default async function LoginPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const errorMessage = resolvedSearchParams?.error ? decodeURIComponent(resolvedSearchParams.error) : null;

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background:
          'radial-gradient(circle at top, rgba(61,214,165,0.18), transparent 28%), linear-gradient(180deg, #07111d 0%, #0b1726 100%)',
      }}
    >
      <section
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#0f1b2c',
          border: '1px solid #18283f',
          borderRadius: 24,
          padding: 28,
          display: 'grid',
          gap: 18,
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
        }}
      >
        <div style={{ display: 'grid', gap: 8 }}>
          <p style={{ color: '#7bd3ff', textTransform: 'uppercase', letterSpacing: 1.4, fontSize: 12, fontWeight: 700, margin: 0 }}>
            Admin Access
          </p>
          <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>Sign in to the parking dashboard.</h1>
          <p style={{ margin: 0, color: '#a9bdd6', lineHeight: 1.6 }}>
            Use a Supabase Auth admin account to access live reservations, sessions, and operator controls.
          </p>
        </div>

        {errorMessage ? (
          <div
            style={{
              background: '#2a1114',
              border: '1px solid #8f3c46',
              color: '#f2c9cd',
              borderRadius: 16,
              padding: 14,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {errorMessage}
          </div>
        ) : null}

        <form action={signInAdmin} style={{ display: 'grid', gap: 14 }}>
          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: '#f4f7fb', fontWeight: 700, fontSize: 14 }}>Email</span>
            <input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="admin@yourcompany.com"
              style={{
                borderRadius: 14,
                border: '1px solid #26405f',
                background: '#08111d',
                color: '#f4f7fb',
                padding: '14px 16px',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </label>

          <label style={{ display: 'grid', gap: 8 }}>
            <span style={{ color: '#f4f7fb', fontWeight: 700, fontSize: 14 }}>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Your password"
              style={{
                borderRadius: 14,
                border: '1px solid #26405f',
                background: '#08111d',
                color: '#f4f7fb',
                padding: '14px 16px',
                fontSize: 15,
                outline: 'none',
              }}
            />
          </label>

          <button
            type="submit"
            style={{
              marginTop: 6,
              border: 'none',
              borderRadius: 14,
              padding: '14px 16px',
              background: '#3dd6a5',
              color: '#071018',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: 15,
            }}
          >
            Sign In
          </button>
        </form>

        <p style={{ margin: 0, color: '#7f94ad', fontSize: 13, lineHeight: 1.6 }}>
          Create the admin account in Supabase Auth first, then use it here. The dashboard is protected by middleware once you sign in.
        </p>
      </section>
    </main>
  );
}