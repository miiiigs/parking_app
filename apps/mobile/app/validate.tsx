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
    if (booking?.source === 'walk_in' && booking.lotId && booking.slot?.id) {
      router.replace({
        pathname: '/walkin-qr',
        params: {
          lotId: booking.lotId,
          slotId: booking.slot.id,
        },
      });
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
