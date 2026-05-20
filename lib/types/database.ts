export type JobStatus = "pending" | "processing" | "completed" | "failed";
export type JobComplexity = "low" | "medium" | "high";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string;
          title: string;
          status: JobStatus;
          complexity: JobComplexity;
          input: Json;
          result: Json | null;
          error: string | null;
          progress: number;
          worker_id: string | null;
          claimed_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          status?: JobStatus;
          complexity?: JobComplexity;
          input?: Json;
          result?: Json | null;
          error?: string | null;
          progress?: number;
          worker_id?: string | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          status?: JobStatus;
          complexity?: JobComplexity;
          input?: Json;
          result?: Json | null;
          error?: string | null;
          progress?: number;
          worker_id?: string | null;
          claimed_at?: string | null;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      job_events: {
        Row: {
          id: number;
          job_id: string;
          step: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: never;
          job_id: string;
          step: string;
          message: string;
          created_at?: string;
        };
        Update: {
          step?: string;
          message?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_events_job_id_fkey";
            columns: ["job_id"];
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          }
        ];
      };
      worker_heartbeats: {
        Row: {
          worker_id: string;
          status: "idle" | "processing" | "stopping" | "offline";
          jobs_processed: number;
          metadata: Json;
          last_seen_at: string;
        };
        Insert: {
          worker_id: string;
          status?: "idle" | "processing" | "stopping" | "offline";
          jobs_processed?: number;
          metadata?: Json;
          last_seen_at?: string;
        };
        Update: {
          status?: "idle" | "processing" | "stopping" | "offline";
          jobs_processed?: number;
          metadata?: Json;
          last_seen_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      claim_next_job: {
        Args: { worker_name: string };
        Returns: Database["public"]["Tables"]["jobs"]["Row"][];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Job = Database["public"]["Tables"]["jobs"]["Row"];
export type JobEvent = Database["public"]["Tables"]["job_events"]["Row"];
export type WorkerHeartbeat =
  Database["public"]["Tables"]["worker_heartbeats"]["Row"];
