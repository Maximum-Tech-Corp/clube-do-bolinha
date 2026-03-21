export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ============================================================
// Enums
// ============================================================

export type SubscriptionStatus = "active" | "inactive" | "trialing";
export type GameStatus = "open" | "cancelled" | "finished";
export type ConfirmationStatus = "confirmed" | "waitlist" | "removed";
export type TournamentPhase = "group" | "semi" | "final";
export type StaminaLevel = "1" | "2" | "3" | "4plus";

// ============================================================
// Database schema — formato compatível com @supabase/supabase-js 2.x
// ============================================================

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          phone: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          subscription_status: SubscriptionStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          phone: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: SubscriptionStatus;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          phone?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          subscription_status?: SubscriptionStatus;
          created_at?: string;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          admin_id: string;
          name: string;
          access_code: string;
          access_code_prefix: string;
          match_duration_minutes: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          name: string;
          access_code: string;
          access_code_prefix: string;
          match_duration_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          name?: string;
          access_code?: string;
          access_code_prefix?: string;
          match_duration_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          phone: string;
          weight_kg: number;
          stamina: StaminaLevel;
          is_star: boolean;
          is_banned: boolean;
          suspended_until: string | null;
          suspension_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          phone: string;
          weight_kg: number;
          stamina: StaminaLevel;
          is_star?: boolean;
          is_banned?: boolean;
          suspended_until?: string | null;
          suspension_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          team_id?: string;
          name?: string;
          phone?: string;
          weight_kg?: number;
          stamina?: StaminaLevel;
          is_star?: boolean;
          is_banned?: boolean;
          suspended_until?: string | null;
          suspension_reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      player_stat_adjustments: {
        Row: {
          id: string;
          player_id: string;
          goals: number;
          assists: number;
          year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          goals?: number;
          assists?: number;
          year: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          goals?: number;
          assists?: number;
          year?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          team_id: string;
          location: string | null;
          scheduled_at: string;
          status: GameStatus;
          is_tournament: boolean;
          draw_done: boolean;
          created_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          team_id: string;
          location?: string | null;
          scheduled_at: string;
          status?: GameStatus;
          is_tournament?: boolean;
          draw_done?: boolean;
          created_at?: string;
          finished_at?: string | null;
        };
        Update: {
          id?: string;
          team_id?: string;
          location?: string | null;
          scheduled_at?: string;
          status?: GameStatus;
          is_tournament?: boolean;
          draw_done?: boolean;
          created_at?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      game_confirmations: {
        Row: {
          id: string;
          game_id: string;
          player_id: string;
          status: ConfirmationStatus;
          waitlist_position: number | null;
          confirmed_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          player_id: string;
          status?: ConfirmationStatus;
          waitlist_position?: number | null;
          confirmed_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          player_id?: string;
          status?: ConfirmationStatus;
          waitlist_position?: number | null;
          confirmed_at?: string;
        };
        Relationships: [];
      };
      game_teams: {
        Row: {
          id: string;
          game_id: string;
          team_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          team_number: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          game_id?: string;
          team_number?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      game_team_players: {
        Row: {
          id: string;
          game_team_id: string;
          player_id: string;
          goals: number;
          assists: number;
        };
        Insert: {
          id?: string;
          game_team_id: string;
          player_id: string;
          goals?: number;
          assists?: number;
        };
        Update: {
          id?: string;
          game_team_id?: string;
          player_id?: string;
          goals?: number;
          assists?: number;
        };
        Relationships: [];
      };
      tournament_matches: {
        Row: {
          id: string;
          game_id: string;
          phase: TournamentPhase;
          home_team_id: string;
          away_team_id: string;
          home_score: number | null;
          away_score: number | null;
          match_order: number;
          completed: boolean;
        };
        Insert: {
          id?: string;
          game_id: string;
          phase: TournamentPhase;
          home_team_id: string;
          away_team_id: string;
          home_score?: number | null;
          away_score?: number | null;
          match_order: number;
          completed?: boolean;
        };
        Update: {
          id?: string;
          game_id?: string;
          phase?: TournamentPhase;
          home_team_id?: string;
          away_team_id?: string;
          home_score?: number | null;
          away_score?: number | null;
          match_order?: number;
          completed?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_status: SubscriptionStatus;
      game_status: GameStatus;
      confirmation_status: ConfirmationStatus;
      tournament_phase: TournamentPhase;
      stamina_level: StaminaLevel;
    };
    CompositeTypes: Record<string, never>;
  };
};
