import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function Home() {
  const store = await cookies();
  const lastGroup = store.get('last_group')?.value;
  if (lastGroup) redirect(`/groups/${lastGroup}/add`);
  else redirect('/groups');
}
