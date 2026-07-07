import { WorkspaceShell } from '../_components/workspace-shell';
import { getUser } from '../_lib/data';
import { redirect } from 'next/navigation';
import { getPrompts, getPromptCategories, getPromptTags } from './_lib/data';
import { PromptStudioClient } from './prompt-studio-client';

export const dynamic = 'force-dynamic';

export default async function PromptStudioPage() {
  const user = await getUser();
  if (!user) redirect('/eleva/auth/login?next=/eleva/prompt-studio');
  const [prompts, categories, tags] = await Promise.all([
    getPrompts(),
    getPromptCategories(),
    getPromptTags(),
  ]);
  return (
    <WorkspaceShell>
      <PromptStudioClient
        initialPrompts={prompts}
        categories={categories}
        tags={tags}
      />
    </WorkspaceShell>
  );
}
