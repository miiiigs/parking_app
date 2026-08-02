import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useParkingFlowStore } from '../src/features/parking/store/useParkingFlowStore';

export default function ValidateRedirect() {
  const router = useRouter();
  const booking = useParkingFlowStore((state) => state.booking);
  const session = useParkingFlowStore((state) => state.session);

  useEffect(() => {
    if (session) {
      router.replace('/session');
      return;
    }
    if (booking?.source === 'walk_in') {
      router.replace('/walkin-qr');
      return;
    }

    if (booking) {
      router.replace('/arrival');
      return;
    }

    router.replace('/home');
  }, [booking, router, session]);

  return null;
}
