import { AuthForm } from '@/app/eleva/_components/auth-form';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';

export default async function ElevaLoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect('/eleva/dashboard');
  return <AuthForm mode="login" />;
}
