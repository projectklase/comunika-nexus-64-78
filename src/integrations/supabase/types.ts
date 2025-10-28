export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          at: string | null
          class_name: string | null
          diff_json: Json | null
          entity: string
          entity_id: string | null
          entity_label: string | null
          id: string
          meta: Json | null
          scope: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          at?: string | null
          class_name?: string | null
          diff_json?: Json | null
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          meta?: Json | null
          scope?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          at?: string | null
          class_name?: string | null
          diff_json?: Json | null
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          id?: string
          meta?: Json | null
          scope?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          class_id: string
          student_id: string
        }
        Insert: {
          class_id: string
          student_id: string
        }
        Update: {
          class_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      class_subjects: {
        Row: {
          class_id: string
          subject_id: string
        }
        Insert: {
          class_id: string
          subject_id: string
        }
        Update: {
          class_id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_subjects_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          code: string | null
          created_at: string | null
          end_time: string | null
          id: string
          level_id: string | null
          main_teacher_id: string | null
          modality_id: string | null
          name: string
          series: string | null
          start_time: string | null
          status: string
          updated_at: string | null
          week_days: string[] | null
          year: number
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          level_id?: string | null
          main_teacher_id?: string | null
          modality_id?: string | null
          name: string
          series?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string | null
          week_days?: string[] | null
          year: number
        }
        Update: {
          code?: string | null
          created_at?: string | null
          end_time?: string | null
          id?: string
          level_id?: string | null
          main_teacher_id?: string | null
          modality_id?: string | null
          name?: string
          series?: string | null
          start_time?: string | null
          status?: string
          updated_at?: string | null
          week_days?: string[] | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "classes_level_id_fkey"
            columns: ["level_id"]
            isOneToOne: false
            referencedRelation: "levels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_main_teacher_id_fkey"
            columns: ["main_teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_modality_id_fkey"
            columns: ["modality_id"]
            isOneToOne: false
            referencedRelation: "modalities"
            referencedColumns: ["id"]
          },
        ]
      }
      deliveries: {
        Row: {
          class_id: string
          created_at: string
          id: string
          is_late: boolean | null
          notes: string | null
          post_id: string
          review_note: string | null
          review_status: string
          reviewed_at: string | null
          reviewed_by: string | null
          student_id: string
          student_name: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          post_id: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_id: string
          student_name: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          is_late?: boolean | null
          notes?: string | null
          post_id?: string
          review_note?: string | null
          review_status?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          student_id?: string
          student_name?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      delivery_attachments: {
        Row: {
          created_at: string
          delivery_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
        }
        Insert: {
          created_at?: string
          delivery_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          delivery_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attachments_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
        ]
      }
      event_attendance: {
        Row: {
          attended: boolean
          checked_at: string | null
          checked_by: string | null
          created_at: string | null
          event_id: string
          guest_invitation_id: string | null
          id: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          attended?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          event_id: string
          guest_invitation_id?: string | null
          id?: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          attended?: boolean
          checked_at?: string | null
          checked_by?: string | null
          created_at?: string | null
          event_id?: string
          guest_invitation_id?: string | null
          id?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_attendance_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_guest_invitation_id_fkey"
            columns: ["guest_invitation_id"]
            isOneToOne: false
            referencedRelation: "event_invitations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_confirmations: {
        Row: {
          confirmed_at: string
          event_id: string
          id: string
          student_id: string
        }
        Insert: {
          confirmed_at?: string
          event_id: string
          id?: string
          student_id: string
        }
        Update: {
          confirmed_at?: string
          event_id?: string
          id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_confirmations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_invitations: {
        Row: {
          created_at: string
          event_id: string
          friend_contact: string | null
          friend_dob: string
          friend_name: string
          id: string
          inviting_student_id: string
          parent_contact: string | null
          parent_name: string | null
        }
        Insert: {
          created_at?: string
          event_id: string
          friend_contact?: string | null
          friend_dob: string
          friend_name: string
          id?: string
          inviting_student_id: string
          parent_contact?: string | null
          parent_name?: string | null
        }
        Update: {
          created_at?: string
          event_id?: string
          friend_contact?: string | null
          friend_dob?: string
          friend_name?: string
          id?: string
          inviting_student_id?: string
          parent_contact?: string | null
          parent_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_invitations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          config: Json | null
          description: string | null
          enabled: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          config?: Json | null
          description?: string | null
          enabled?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          config?: Json | null
          description?: string | null
          enabled?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      guardians: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string | null
          relation: string
          student_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone?: string | null
          relation: string
          student_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string | null
          relation?: string
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string | null
          error_log: Json | null
          file_name: string | null
          id: string
          import_type: string
          imported_by: string | null
          rows_failed: number | null
          rows_processed: number | null
          rows_succeeded: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          id?: string
          import_type: string
          imported_by?: string | null
          rows_failed?: number | null
          rows_processed?: number | null
          rows_succeeded?: number | null
          status: string
        }
        Update: {
          created_at?: string | null
          error_log?: Json | null
          file_name?: string | null
          id?: string
          import_type?: string
          imported_by?: string | null
          rows_failed?: number | null
          rows_processed?: number | null
          rows_succeeded?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "import_history_imported_by_fkey"
            columns: ["imported_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      koin_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          balance_before: number | null
          created_at: string | null
          description: string | null
          id: string
          processed_by: string | null
          related_entity_id: string | null
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          processed_by?: string | null
          related_entity_id?: string | null
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          balance_before?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          processed_by?: string | null
          related_entity_id?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "koin_transactions_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "koin_transactions_related_entity_id_fkey"
            columns: ["related_entity_id"]
            isOneToOne: false
            referencedRelation: "redemption_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "koin_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      levels: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      modalities: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          meta: Json | null
          role_target: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          meta?: Json | null
          role_target?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          meta?: Json | null
          role_target?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          activity_meta: Json | null
          allow_invitations: boolean | null
          attachments: Json | null
          audience: string
          author_id: string | null
          author_name: string
          author_role: string | null
          body: string | null
          class_id: string | null
          class_ids: string[] | null
          created_at: string
          due_at: string | null
          event_end_at: string | null
          event_location: string | null
          event_start_at: string | null
          id: string
          meta: Json | null
          publish_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          activity_meta?: Json | null
          allow_invitations?: boolean | null
          attachments?: Json | null
          audience: string
          author_id?: string | null
          author_name: string
          author_role?: string | null
          body?: string | null
          class_id?: string | null
          class_ids?: string[] | null
          created_at?: string
          due_at?: string | null
          event_end_at?: string | null
          event_location?: string | null
          event_start_at?: string | null
          id?: string
          meta?: Json | null
          publish_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          activity_meta?: Json | null
          allow_invitations?: boolean | null
          attachments?: Json | null
          audience?: string
          author_id?: string | null
          author_name?: string
          author_role?: string | null
          body?: string | null
          class_id?: string | null
          class_ids?: string[] | null
          created_at?: string
          due_at?: string | null
          event_end_at?: string | null
          event_location?: string | null
          event_start_at?: string | null
          id?: string
          meta?: Json | null
          publish_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          class_id: string | null
          created_at: string | null
          default_school_slug: string | null
          dob: string | null
          email: string
          enrollment_number: string | null
          id: string
          is_active: boolean | null
          koins: number
          must_change_password: boolean | null
          name: string
          phone: string | null
          preferences: Json | null
          student_notes: string | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          class_id?: string | null
          created_at?: string | null
          default_school_slug?: string | null
          dob?: string | null
          email: string
          enrollment_number?: string | null
          id: string
          is_active?: boolean | null
          koins?: number
          must_change_password?: boolean | null
          name: string
          phone?: string | null
          preferences?: Json | null
          student_notes?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          class_id?: string | null
          created_at?: string | null
          default_school_slug?: string | null
          dob?: string | null
          email?: string
          enrollment_number?: string | null
          id?: string
          is_active?: boolean | null
          koins?: number
          must_change_password?: boolean | null
          name?: string
          phone?: string | null
          preferences?: Json | null
          student_notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      programs: {
        Row: {
          code: string | null
          created_at: string
          curriculum_mode: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          curriculum_mode?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          curriculum_mode?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      redemption_requests: {
        Row: {
          debit_transaction_id: string | null
          id: string
          item_id: string
          processed_at: string | null
          processed_by: string | null
          rejection_reason: string | null
          requested_at: string | null
          status: string
          student_id: string
        }
        Insert: {
          debit_transaction_id?: string | null
          id?: string
          item_id: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string
          student_id: string
        }
        Update: {
          debit_transaction_id?: string | null
          id?: string
          item_id?: string
          processed_at?: string | null
          processed_by?: string | null
          rejection_reason?: string | null
          requested_at?: string | null
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_requests_debit_transaction_id_fkey"
            columns: ["debit_transaction_id"]
            isOneToOne: false
            referencedRelation: "koin_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_requests_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "reward_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_requests_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "redemption_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_items: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_koins: number
          stock: number
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_koins: number
          stock?: number
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_koins?: number
          stock?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      school_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          id: string
          ip_address: string | null
          level: string
          message: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level: string
          message: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: string | null
          level?: string
          message?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_koins_to_user: {
        Args: { amount_in: number; user_id_in: string }
        Returns: {
          avatar: string | null
          class_id: string | null
          created_at: string | null
          default_school_slug: string | null
          dob: string | null
          email: string
          enrollment_number: string | null
          id: string
          is_active: boolean | null
          koins: number
          must_change_password: boolean | null
          name: string
          phone: string | null
          preferences: Json | null
          student_notes: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      approve_redemption: {
        Args: { p_admin_id: string; p_redemption_id: string }
        Returns: undefined
      }
      can_create_notifications: { Args: { _user_id: string }; Returns: boolean }
      cleanup_old_system_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      get_user_role: { Args: { _user_id: string }; Returns: string }
      grant_koin_bonus: {
        Args: {
          p_event_description: string
          p_event_name: string
          p_granted_by: string
          p_koin_amount: number
          p_student_ids: string[]
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reject_redemption: {
        Args: { p_admin_id: string; p_reason: string; p_redemption_id: string }
        Returns: undefined
      }
      request_redemption: {
        Args: { p_item_id: string; p_student_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "secretaria" | "professor" | "aluno"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["secretaria", "professor", "aluno"],
    },
  },
} as const
