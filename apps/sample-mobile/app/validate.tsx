import { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function ValidateRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/arrival');
  }, [router]);

  return null;
}
