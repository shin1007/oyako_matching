// Database types
export type UserRole = 'parent' | 'child';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type SearchingChildGender = 'male' | 'female' | 'other';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          role: UserRole;
          created_at: string;
          updated_at: string;
          verification_status: VerificationStatus;
          mynumber_verified: boolean;
        };
        Insert: {
          id: string;
          email: string;
          role: UserRole;
          verification_status?: VerificationStatus;
          mynumber_verified?: boolean;
        };
        Update: {
          email?: string;
          role?: UserRole;
          verification_status?: VerificationStatus;
          mynumber_verified?: boolean;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          full_name: string;
          birth_date: string;
          profile_image_url: string | null;
          bio: string | null;
          searching_child_birth_date: string | null;
          searching_child_name_hiragana: string | null;
          searching_child_name_kanji: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          full_name: string;
          birth_date: string;
          profile_image_url?: string | null;
          bio?: string | null;
          searching_child_birth_date?: string | null;
          searching_child_name_hiragana?: string | null;
          searching_child_name_kanji?: string | null;
        };
        Update: {
          full_name?: string;
          birth_date?: string;
          profile_image_url?: string | null;
          bio?: string | null;
          searching_child_birth_date?: string | null;
          searching_child_name_hiragana?: string | null;
          searching_child_name_kanji?: string | null;
        };
      };
      episodes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
          moderation_status: 'pending' | 'approved' | 'rejected';
        };
        Insert: {
          user_id: string;
          title: string;
          content: string;
          embedding?: number[] | null;
          moderation_status?: 'pending' | 'approved' | 'rejected';
        };
        Update: {
          title?: string;
          content?: string;
          embedding?: number[] | null;
          moderation_status?: 'pending' | 'approved' | 'rejected';
        };
      };
      matches: {
        Row: {
          id: string;
          parent_id: string;
          child_id: string;
          similarity_score: number;
          status: MatchStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          parent_id: string;
          child_id: string;
          similarity_score: number;
          status?: MatchStatus;
        };
        Update: {
          status?: MatchStatus;
          similarity_score?: number;
        };
      };
      messages: {
        Row: {
          id: string;
          match_id: string;
          sender_id: string;
          content: string;
          created_at: string;
          read_at: string | null;
        };
        Insert: {
          match_id: string;
          sender_id: string;
          content: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      time_capsules: {
        Row: {
          id: string;
          parent_id: string;
          child_birth_date: string;
          message: string;
          unlock_date: string;
          created_at: string;
          opened_at: string | null;
        };
        Insert: {
          parent_id: string;
          child_birth_date: string;
          message: string;
          unlock_date: string;
        };
        Update: {
          opened_at?: string | null;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: SubscriptionStatus;
          current_period_start: string;
          current_period_end: string;
        };
        Update: {
          status?: SubscriptionStatus;
          current_period_start?: string;
          current_period_end?: string;
        };
      };
      searching_children: {
        Row: {
          id: string;
          user_id: string;
          birth_date: string | null;
          name_hiragana: string | null;
          name_kanji: string | null;
          gender: SearchingChildGender | null;
          display_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          birth_date?: string | null;
          name_hiragana?: string | null;
          name_kanji?: string | null;
          gender?: SearchingChildGender | null;
          display_order?: number;
        };
        Update: {
          birth_date?: string | null;
          name_hiragana?: string | null;
          name_kanji?: string | null;
          gender?: SearchingChildGender | null;
          display_order?: number;
        };
      };
    };
  };
}

// Application types
export interface User {
  id: string;
  email: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  mynumberVerified: boolean;
}

export interface Profile {
  id: string;
  userId: string;
  fullName: string;
  birthDate: string;
  profileImageUrl?: string;
  bio?: string;
  searchingChildBirthDate?: string;
  searchingChildNameHiragana?: string;
  searchingChildNameKanji?: string;
}

export interface Episode {
  id: string;
  userId: string;
  title: string;
  content: string;
  embedding?: number[];
  moderationStatus: 'pending' | 'approved' | 'rejected';
}

export interface Match {
  id: string;
  parentId: string;
  childId: string;
  similarityScore: number;
  status: MatchStatus;
  createdAt: string;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  createdAt: string;
  readAt?: string;
}

export interface TimeCapsule {
  id: string;
  parentId: string;
  childBirthDate: string;
  message: string;
  unlockDate: string;
  openedAt?: string;
}

export interface Subscription {
  id: string;
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
}

export interface SearchingChild {
  id: string;
  userId: string;
  birthDate?: string;
  nameHiragana?: string;
  nameKanji?: string;
   gender?: SearchingChildGender;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
