import { redirect } from 'next/navigation';

import { getCurrentOperatorUser } from '@/lib/operatorAuth';

export default async function Page() {
  const operatorUser = await getCurrentOperatorUser();

  redirect(operatorUser ? '/dashboard' : '/login');
}
