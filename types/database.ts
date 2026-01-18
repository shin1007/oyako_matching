// Database types
export type UserRole = 'parent' | 'child';
export type MatchStatus = 'pending' | 'accepted' | 'rejected' | 'blocked';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'incomplete';
export type VerificationStatus = 'pending' | 'verified' | 'failed';
export type SearchingChildGender = 'male' | 'female' | 'other';
export type Gender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type ReportReason = 'spam' | 'harassment' | 'personal_info' | 'inappropriate' | 'other';
export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportContentType = 'post' | 'comment';

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
          email_verified_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          role: UserRole;
          verification_status?: VerificationStatus;
          mynumber_verified?: boolean;
          email_verified_at?: string | null;
        };
        Update: {
          email?: string;
          role?: UserRole;
          verification_status?: VerificationStatus;
          mynumber_verified?: boolean;
          email_verified_at?: string | null;
        };
      };
      profiles: {
        Row: {
          id: string;
          user_id: string;
          last_name_kanji: string | null;
          last_name_hiragana: string | null;
          first_name_kanji: string | null;
          first_name_hiragana: string | null;
          birth_date: string;
          birthplace_prefecture: string | null;
          birthplace_municipality: string | null;
          profile_image_url: string | null;
          bio: string | null;
          gender: Gender | null;
          forum_display_name: string | null;
          searching_child_birth_date: string | null;
          searching_child_name_hiragana: string | null;
          searching_child_name_kanji: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          last_name_kanji?: string | null;
          last_name_hiragana?: string | null;
          first_name_kanji?: string | null;
          first_name_hiragana?: string | null;
          birth_date: string;
          birthplace_prefecture?: string | null;
          birthplace_municipality?: string | null;
          profile_image_url?: string | null;
          bio?: string | null;
          gender?: Gender | null;
          forum_display_name?: string | null;
          searching_child_birth_date?: string | null;
          searching_child_name_hiragana?: string | null;
          searching_child_name_kanji?: string | null;
        };
        Update: {
          last_name_kanji?: string | null;
          last_name_hiragana?: string | null;
          first_name_kanji?: string | null;
          first_name_hiragana?: string | null;
          birth_date?: string;
          birthplace_prefecture?: string | null;
          birthplace_municipality?: string | null;
          profile_image_url?: string | null;
          bio?: string | null;
          gender?: Gender | null;
          forum_display_name?: string | null;
          searching_child_birth_date?: string | null;
          searching_child_name_hiragana?: string | null;
          searching_child_name_kanji?: string | null;
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
          last_name_kanji: string | null;
          last_name_hiragana: string | null;
          first_name_kanji: string | null;
          first_name_hiragana: string | null;
          birthplace_prefecture: string | null;
          birthplace_municipality: string | null;
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
          last_name_kanji?: string | null;
          last_name_hiragana?: string | null;
          first_name_kanji?: string | null;
          first_name_hiragana?: string | null;
          birthplace_prefecture?: string | null;
          birthplace_municipality?: string | null;
          gender?: SearchingChildGender | null;
          display_order?: number;
        };
        Update: {
          birth_date?: string | null;
          name_hiragana?: string | null;
          name_kanji?: string | null;
          last_name_kanji?: string | null;
          last_name_hiragana?: string | null;
          first_name_kanji?: string | null;
          first_name_hiragana?: string | null;
          birthplace_prefecture?: string | null;
          birthplace_municipality?: string | null;
          gender?: SearchingChildGender | null;
          display_order?: number;
        };
      };
      forum_reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_content_type: ReportContentType;
          reported_content_id: string;
          report_reason: ReportReason;
          report_details: string | null;
          status: ReportStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          reporter_id: string;
          reported_content_type: ReportContentType;
          reported_content_id: string;
          report_reason: ReportReason;
          report_details?: string | null;
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
        };
        Update: {
          status?: ReportStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
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
  gender?: Gender;
  searchingChildBirthDate?: string;
  searchingChildNameHiragana?: string;
  searchingChildNameKanji?: string;
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

export interface ForumReport {
  id: string;
  reporterId: string;
  reportedContentType: ReportContentType;
  reportedContentId: string;
  reportReason: ReportReason;
  reportDetails?: string;
  status: ReportStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}
