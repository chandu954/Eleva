'use server'

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { MODEL_DESIGNATIONS } from '@/lib/ai-models';

interface SecurityResult {
  success: boolean;
  error?: string;
}

export async function updateEmail(formData: FormData): Promise<SecurityResult> {
  const supabase = await createClient();
  const newEmail = formData.get('email') as string;
  const currentPassword = formData.get('currentPassword') as string;

  // First verify the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user?.email) {
    return { success: false, error: 'Unable to verify current user' };
  }

  // Don't update if it's the same email
  if (user.email === newEmail) {
    return { success: false, error: 'New email must be different from current email' };
  }

  // Verify current password first
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Then update the email
  const { error } = await supabase.auth.updateUser({ email: newEmail });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings');
  return { success: true };
}

export async function updatePassword(formData: FormData): Promise<SecurityResult> {
  const supabase = await createClient();
  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  // Get the current user's email
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user?.email) {
    return { success: false, error: 'Unable to verify current user' };
  }

  // First verify the current password
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) {
    return { success: false, error: 'Current password is incorrect' };
  }

  // Then update to the new password
  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/settings');
  return { success: true };
} 



interface ApiTestResult {
    success: boolean;
    message?: string;
    error?: string;
  }
  
  export async function testApiKey(): Promise<ApiTestResult> {
    try {
      const supabase = await createClient()
      
      // Get the API key from vault
      const { data: apiKey, error: keyError } = await supabase
        .rpc('get_api_key', {
          p_service_name: 'openrouter'
        })
  
      if (keyError || !apiKey) {
        // Fallback to server env key
        const serverKey = process.env.OPENROUTER_API_KEY
        if (!serverKey) {
          return { 
            success: false, 
            error: 'No OpenRouter API key found' 
          }
        }
  
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${serverKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://eleva.app',
            'X-Title': 'Eleva',
          },
          body: JSON.stringify({
            model: MODEL_DESIGNATIONS.FAST_CHEAP_FREE,
            messages: [{ role: 'user', content: 'Say this is a test!' }],
            max_tokens: 100,
          }),
        })
  
        const data = await response.json()
        if (!response.ok) {
          return { success: false, error: data.error?.message || 'API test failed' }
        }
  
        return {
          success: true,
          message: data.choices?.[0]?.message?.content || 'API connection successful'
        }
      }
  
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL || 'https://eleva.app',
          'X-Title': 'Eleva',
        },
        body: JSON.stringify({
          model: MODEL_DESIGNATIONS.FAST_CHEAP_FREE,
          messages: [{ role: 'user', content: 'Say this is a test!' }],
          max_tokens: 100,
        }),
      })
  
      const data = await response.json()
      if (!response.ok) {
        return { success: false, error: data.error?.message || 'API test failed' }
      }
  
      return {
        success: true,
        message: data.choices?.[0]?.message?.content || 'API connection successful'
      }
  
    } catch (error) {
      console.error('Error testing API key:', error)
      return { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test API key'
      }
    }
  }
  
  