export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_emoji: string | null;
  avatar_url: string | null;
  downloads_remaining: number | null;
  subscription_status: 'active' | 'cancelled';
  subscription_plan: 'Basic' | 'Premium' | 'Up Fast';
  subscription_start_date: string | null;
  stripe_subscription_id: string | null;
  subscription_end_date: string | null;
  cancelled_date: string | null;
  created_at?: string;
  updated_at?: string;
}