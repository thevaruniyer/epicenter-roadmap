export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: 'admin' | 'student'
          full_name: string
          username: string
          weekly_load_cap: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          role: 'admin' | 'student'
          full_name: string
          username: string
          weekly_load_cap?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          role?: 'admin' | 'student'
          full_name?: string
          username?: string
          weekly_load_cap?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          student_id: string | null
          assigned_by: string | null
          title: string
          description: string | null
          view_level: 'monthly' | 'weekly' | 'daily'
          month: number | null
          year: number | null
          week_start: string | null
          day_date: string | null
          status: 'not_started' | 'in_progress' | 'done' | 'blocked'
          category: 'EC' | 'SAT Prep' | 'Essays' | 'Academic' | 'Admin' | 'Personal'
          estimated_minutes: number
          actual_minutes: number | null
          scheduled_time: string | null
          is_admin_assigned: boolean
          is_locked: boolean
          is_carried_over: boolean
          is_admin_approved: boolean | null
          original_task_id: string | null
          parent_monthly_task_id: string | null
          carry_forward_count: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id?: string | null
          assigned_by?: string | null
          title: string
          description?: string | null
          view_level: 'monthly' | 'weekly' | 'daily'
          month?: number | null
          year?: number | null
          week_start?: string | null
          day_date?: string | null
          status?: 'not_started' | 'in_progress' | 'done' | 'blocked'
          category: 'EC' | 'SAT Prep' | 'Essays' | 'Academic' | 'Admin' | 'Personal'
          estimated_minutes?: number
          actual_minutes?: number | null
          scheduled_time?: string | null
          is_admin_assigned?: boolean
          is_locked?: boolean
          is_carried_over?: boolean
          is_admin_approved?: boolean | null
          original_task_id?: string | null
          parent_monthly_task_id?: string | null
          carry_forward_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string | null
          assigned_by?: string | null
          title?: string
          description?: string | null
          view_level?: 'monthly' | 'weekly' | 'daily'
          month?: number | null
          year?: number | null
          week_start?: string | null
          day_date?: string | null
          status?: 'not_started' | 'in_progress' | 'done' | 'blocked'
          category?: 'EC' | 'SAT Prep' | 'Essays' | 'Academic' | 'Admin' | 'Personal'
          estimated_minutes?: number
          actual_minutes?: number | null
          scheduled_time?: string | null
          is_admin_assigned?: boolean
          is_locked?: boolean
          is_carried_over?: boolean
          is_admin_approved?: boolean | null
          original_task_id?: string | null
          parent_monthly_task_id?: string | null
          carry_forward_count?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'tasks_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_assigned_by_fkey'
            columns: ['assigned_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_original_task_id_fkey'
            columns: ['original_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'tasks_parent_monthly_task_id_fkey'
            columns: ['parent_monthly_task_id']
            isOneToOne: false
            referencedRelation: 'tasks'
            referencedColumns: ['id']
          }
        ]
      }
      weekly_reflections: {
        Row: {
          id: string
          student_id: string
          week_start: string
          content: string | null
          mood: 'great' | 'good' | 'okay' | 'tough' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          week_start: string
          content?: string | null
          mood?: 'great' | 'good' | 'okay' | 'tough' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          week_start?: string
          content?: string | null
          mood?: 'great' | 'good' | 'okay' | 'tough' | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'weekly_reflections_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
      activity_log: {
        Row: {
          id: string
          student_id: string
          action_type: string
          task_id: string | null
          task_title: string | null
          old_value: string | null
          new_value: string | null
          created_at: string
        }
        Insert: {
          id?: string
          student_id: string
          action_type: string
          task_id?: string | null
          task_title?: string | null
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          action_type?: string
          task_id?: string | null
          task_title?: string | null
          old_value?: string | null
          new_value?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'activity_log_student_id_fkey'
            columns: ['student_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      student_progress_summary: {
        Row: {
          student_id: string
          full_name: string
          username: string
          weekly_load_cap: number
          total_admin_tasks_month: number | null
          completed_admin_tasks_month: number | null
          blocked_tasks: number | null
          tasks_this_week: number | null
          last_task_updated: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      perform_carry_forward: {
        Args: { p_student_id: string; p_week_start: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
