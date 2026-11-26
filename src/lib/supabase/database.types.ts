// Generated from the Supabase project schema (trimmed to what the app uses).
// Regenerate with: npx supabase gen types typescript --project-id dxhxheyjqgtcikrdbwpx > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel = { foreignKeyName: string; columns: string[]; isOneToOne: boolean; referencedRelation: string; referencedColumns: string[] };

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" };
  public: {
    Tables: {
      certifications: {
        Row: { certified_at: string; item_id: string; user_id: string; via_retake: boolean };
        Insert: { certified_at?: string; item_id: string; user_id: string; via_retake?: boolean };
        Update: { certified_at?: string; item_id?: string; user_id?: string; via_retake?: boolean };
        Relationships: Rel[];
      };
      follows: {
        Row: { created_at: string; followee_id: string; follower_id: string };
        Insert: { created_at?: string; followee_id: string; follower_id: string };
        Update: { created_at?: string; followee_id?: string; follower_id?: string };
        Relationships: Rel[];
      };
      items: {
        Row: { category: string; created_at: string; id: string; image_url: string | null; name: string; slug: string; source: string; source_id: string | null };
        Insert: { category: string; created_at?: string; id?: string; image_url?: string | null; name: string; slug: string; source?: string; source_id?: string | null };
        Update: { category?: string; created_at?: string; id?: string; image_url?: string | null; name?: string; slug?: string; source?: string; source_id?: string | null };
        Relationships: [];
      };
      larp_attempts: {
        Row: { finished_at: string | null; id: string; item_id: string; passed: boolean | null; question_ids: string[]; score: number | null; started_at: string; user_id: string };
        Insert: { finished_at?: string | null; id?: string; item_id: string; passed?: boolean | null; question_ids: string[]; score?: number | null; started_at?: string; user_id: string };
        Update: { finished_at?: string | null; id?: string; item_id?: string; passed?: boolean | null; question_ids?: string[]; score?: number | null; started_at?: string; user_id?: string };
        Relationships: Rel[];
      };
      lists: {
        Row: { created_at: string; id: string; template_id: string; updated_at: string; user_id: string; visibility: string };
        Insert: { created_at?: string; id?: string; template_id: string; updated_at?: string; user_id: string; visibility?: string };
        Update: { created_at?: string; id?: string; template_id?: string; updated_at?: string; user_id?: string; visibility?: string };
        Relationships: Rel[];
      };
      placements: {
        Row: { item_id: string; list_id: string; position: number; tier_index: number };
        Insert: { item_id: string; list_id: string; position?: number; tier_index: number };
        Update: { item_id?: string; list_id?: string; position?: number; tier_index?: number };
        Relationships: Rel[];
      };
      profiles: {
        Row: { avatar_url: string | null; created_at: string; display_name: string | null; handle: string; id: string };
        Insert: { avatar_url?: string | null; created_at?: string; display_name?: string | null; handle: string; id: string };
        Update: { avatar_url?: string | null; created_at?: string; display_name?: string | null; handle?: string; id?: string };
        Relationships: [];
      };
      quiz_questions: {
        Row: { created_at: string; id: string; item_id: string; options: string[]; prompt: string };
        Insert: { created_at?: string; id?: string; item_id: string; options: string[]; prompt: string };
        Update: { created_at?: string; id?: string; item_id?: string; options?: string[]; prompt?: string };
        Relationships: Rel[];
      };
      template_items: {
        Row: { item_id: string; sort_order: number; template_id: string };
        Insert: { item_id: string; sort_order?: number; template_id: string };
        Update: { item_id?: string; sort_order?: number; template_id?: string };
        Relationships: [
          { foreignKeyName: "template_items_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["id"] },
          { foreignKeyName: "template_items_template_id_fkey"; columns: ["template_id"]; isOneToOne: false; referencedRelation: "templates"; referencedColumns: ["id"] },
        ];
      };
      templates: {
        Row: { category: string; created_at: string; creator_id: string | null; id: string; is_official: boolean; slug: string; source: string; title: string };
        Insert: { category: string; created_at?: string; creator_id?: string | null; id?: string; is_official?: boolean; slug: string; source?: string; title: string };
        Update: { category?: string; created_at?: string; creator_id?: string | null; id?: string; is_official?: boolean; slug?: string; source?: string; title?: string };
        Relationships: Rel[];
      };
    };
    Views: {
      template_community: {
        Row: { certified_takes: number | null; item_id: string | null; spread: number | null; takes: number | null; template_id: string | null; weighted_tier: number | null };
        Relationships: Rel[];
      };
    };
    Functions: {
      start_larp_check: {
        Args: { p_item_slug: string };
        Returns: { attempt_id: string; options: string[]; prompt: string; question_id: string; seconds_per_question: number }[];
      };
      submit_larp_check: {
        Args: { p_answers: number[]; p_attempt_id: string };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
