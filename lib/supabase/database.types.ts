/**
 * Hand-written starter types for the FutureProof schema (spec section 5).
 *
 * These mirror `supabase/migrations`. When the Supabase project exists (Phase 1),
 * regenerate with:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 * and delete this comment.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/** pgvector columns are returned as strings like "[0.1,0.2,...]" by PostgREST. */
export type Vector = string;

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          locale: string;
          consent_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          locale?: string;
          consent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          name_bn: string | null;
          category: string | null;
          source_id: string | null;
          embedding: Vector | null;
        };
        Insert: {
          id?: string;
          name: string;
          name_bn?: string | null;
          category?: string | null;
          source_id?: string | null;
          embedding?: Vector | null;
        };
        Update: Partial<Database['public']['Tables']['skills']['Insert']>;
        Relationships: [];
      };
      occupations: {
        Row: {
          id: string;
          title: string;
          title_bn: string | null;
          onet_code: string | null;
          description: string | null;
          embedding: Vector | null;
        };
        Insert: {
          id?: string;
          title: string;
          title_bn?: string | null;
          onet_code?: string | null;
          description?: string | null;
          embedding?: Vector | null;
        };
        Update: Partial<Database['public']['Tables']['occupations']['Insert']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          occupation_id: string;
          description: string;
          importance: number | null;
          ai_exposure: number;
          exposure_source: string | null;
          exposure_method: 'published_dataset' | 'llm_estimated';
          exposure_confidence: number | null;
        };
        Insert: {
          id?: string;
          occupation_id: string;
          description: string;
          importance?: number | null;
          ai_exposure: number;
          exposure_source?: string | null;
          exposure_method: 'published_dataset' | 'llm_estimated';
          exposure_confidence?: number | null;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Insert']>;
        Relationships: [];
      };
      occupation_skills: {
        Row: { occupation_id: string; skill_id: string; importance: number };
        Insert: { occupation_id: string; skill_id: string; importance: number };
        Update: Partial<Database['public']['Tables']['occupation_skills']['Insert']>;
        Relationships: [];
      };
      task_skills: {
        Row: { task_id: string; skill_id: string };
        Insert: { task_id: string; skill_id: string };
        Update: Partial<Database['public']['Tables']['task_skills']['Insert']>;
        Relationships: [];
      };
      job_postings: {
        Row: {
          id: string;
          title: string;
          company: string | null;
          source: string;
          source_url: string | null;
          posted_at: string | null;
          location: string | null;
          raw_text: string | null;
          occupation_id: string | null;
          is_synthetic: boolean;
          embedding: Vector | null;
        };
        Insert: {
          id?: string;
          title: string;
          company?: string | null;
          source: string;
          source_url?: string | null;
          posted_at?: string | null;
          location?: string | null;
          raw_text?: string | null;
          occupation_id?: string | null;
          is_synthetic?: boolean;
          embedding?: Vector | null;
        };
        Update: Partial<Database['public']['Tables']['job_postings']['Insert']>;
        Relationships: [];
      };
      posting_skills: {
        Row: { posting_id: string; skill_id: string };
        Insert: { posting_id: string; skill_id: string };
        Update: Partial<Database['public']['Tables']['posting_skills']['Insert']>;
        Relationships: [];
      };
      skill_demand: {
        Row: {
          skill_id: string;
          count_30d: number;
          count_prev_30d: number;
          updated_at: string;
        };
        Insert: {
          skill_id: string;
          count_30d?: number;
          count_prev_30d?: number;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['skill_demand']['Insert']>;
        Relationships: [];
      };
      courses: {
        Row: {
          id: string;
          title: string;
          provider: string | null;
          url: string | null;
          language: string | null;
          cost_usd: number | null;
          duration_hours: number | null;
          level: string | null;
          skill_ids: string[] | null;
          verified: boolean;
        };
        Insert: {
          id?: string;
          title: string;
          provider?: string | null;
          url?: string | null;
          language?: string | null;
          cost_usd?: number | null;
          duration_hours?: number | null;
          level?: string | null;
          skill_ids?: string[] | null;
          verified?: boolean;
        };
        Update: Partial<Database['public']['Tables']['courses']['Insert']>;
        Relationships: [];
      };
      cv_uploads: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string | null;
          scrubbed_text: string | null;
          parsed_json: Json | null;
          consent_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path?: string | null;
          scrubbed_text?: string | null;
          parsed_json?: Json | null;
          consent_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['cv_uploads']['Insert']>;
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          user_id: string;
          cv_id: string | null;
          target_occupation_id: string | null;
          score: number | null;
          result_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          cv_id?: string | null;
          target_occupation_id?: string | null;
          score?: number | null;
          result_json?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['analyses']['Insert']>;
        Relationships: [];
      };
      llm_audit_log: {
        Row: {
          id: string;
          user_id: string | null;
          purpose: string;
          model: string;
          prompt_hash: string | null;
          tokens_in: number | null;
          tokens_out: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          purpose: string;
          model: string;
          prompt_hash?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['llm_audit_log']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_skills: {
        Args: {
          query_embedding: Vector;
          match_threshold: number;
          match_count: number;
        };
        Returns: { id: string; name: string; name_bn: string | null; similarity: number }[];
      };
      match_occupations: {
        Args: {
          query_embedding: Vector;
          match_threshold: number;
          match_count: number;
        };
        Returns: { id: string; title: string; title_bn: string | null; similarity: number }[];
      };
    };
    Enums: {
      exposure_method: 'published_dataset' | 'llm_estimated';
    };
    CompositeTypes: Record<string, never>;
  };
}
