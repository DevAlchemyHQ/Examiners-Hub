export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_emoji: string | null;
  avatar_url: string | null;
  subscription_status: 'basic' | 'premium';
  downloads_remaining: number | null;
  created_at?: string;
  updated_at?: string;
}