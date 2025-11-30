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
      admin_subscriptions: {
        Row: {
          addon_schools_count: number
          admin_id: string
          created_at: string
          expires_at: string | null
          id: string
          plan_id: string
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          addon_schools_count?: number
          admin_id: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          addon_schools_count?: number
          admin_id?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          plan_id?: string
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
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
          {
            foreignKeyName: "audit_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      battle_queue: {
        Row: {
          battle_id: string | null
          created_at: string | null
          deck_id: string
          id: string
          matched_with: string | null
          school_id: string
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          battle_id?: string | null
          created_at?: string | null
          deck_id: string
          id?: string
          matched_with?: string | null
          school_id: string
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          battle_id?: string | null
          created_at?: string | null
          deck_id?: string
          id?: string
          matched_with?: string | null
          school_id?: string
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "battle_queue_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "battles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_queue_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_queue_matched_with_fkey"
            columns: ["matched_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battle_queue_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      battles: {
        Row: {
          created_at: string | null
          current_round: number | null
          current_turn: string | null
          finished_at: string | null
          id: string
          last_action_at: string | null
          player1_deck_id: string
          player1_id: string
          player1_rounds_won: number | null
          player2_deck_id: string
          player2_id: string
          player2_rounds_won: number | null
          rounds_data: Json | null
          started_at: string | null
          status: string
          updated_at: string | null
          winner_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_round?: number | null
          current_turn?: string | null
          finished_at?: string | null
          id?: string
          last_action_at?: string | null
          player1_deck_id: string
          player1_id: string
          player1_rounds_won?: number | null
          player2_deck_id: string
          player2_id: string
          player2_rounds_won?: number | null
          rounds_data?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_round?: number | null
          current_turn?: string | null
          finished_at?: string | null
          id?: string
          last_action_at?: string | null
          player1_deck_id?: string
          player1_id?: string
          player1_rounds_won?: number | null
          player2_deck_id?: string
          player2_id?: string
          player2_rounds_won?: number | null
          rounds_data?: Json | null
          started_at?: string | null
          status?: string
          updated_at?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "battles_player1_deck_id_fkey"
            columns: ["player1_deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_player1_id_fkey"
            columns: ["player1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_player2_deck_id_fkey"
            columns: ["player2_deck_id"]
            isOneToOne: false
            referencedRelation: "decks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_player2_id_fkey"
            columns: ["player2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "battles_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      card_packs: {
        Row: {
          cards_received: string[]
          id: string
          opened_at: string | null
          pack_type: string
          user_id: string
          xp_cost: number | null
        }
        Insert: {
          cards_received: string[]
          id?: string
          opened_at?: string | null
          pack_type: string
          user_id: string
          xp_cost?: number | null
        }
        Update: {
          cards_received?: string[]
          id?: string
          opened_at?: string | null
          pack_type?: string
          user_id?: string
          xp_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "card_packs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cards: {
        Row: {
          atk: number
          category: string
          created_at: string | null
          def: number
          description: string | null
          effects: Json | null
          id: string
          image_prompt: string | null
          image_url: string | null
          is_active: boolean | null
          name: string
          rarity: string
          required_level: number | null
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          atk?: number
          category: string
          created_at?: string | null
          def?: number
          description?: string | null
          effects?: Json | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name: string
          rarity: string
          required_level?: number | null
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          atk?: number
          category?: string
          created_at?: string | null
          def?: number
          description?: string | null
          effects?: Json | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          rarity?: string
          required_level?: number | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cards_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          action_count: number
          action_target: string
          created_at: string
          description: string
          icon_name: string | null
          id: string
          is_active: boolean
          koin_reward: number
          school_id: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          action_count?: number
          action_target: string
          created_at?: string
          description: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          koin_reward: number
          school_id?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          action_count?: number
          action_target?: string
          created_at?: string
          description?: string
          icon_name?: string | null
          id?: string
          is_active?: boolean
          koin_reward?: number
          school_id?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenges_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
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
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      decks: {
        Row: {
          card_ids: string[]
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          card_ids?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          card_ids?: string[]
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "decks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
          student_id?: string
          student_name?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
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
            foreignKeyName: "koin_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
          program_id: string | null
          school_id: string | null
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
          program_id?: string | null
          school_id?: string | null
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
          program_id?: string | null
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "levels_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "levels_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      login_history: {
        Row: {
          created_at: string | null
          id: string
          ip_address: string | null
          logged_at: string
          profile_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          logged_at?: string
          profile_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
          user_role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string | null
          id?: string
          ip_address?: string | null
          logged_at?: string
          profile_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
          user_role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "login_history_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modalities: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modalities_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
      post_reads: {
        Row: {
          created_at: string
          id: string
          post_id: string
          read_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          read_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_reads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_reads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          activity_meta: Json | null
          allow_attachments: boolean
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
          event_capacity_enabled: boolean | null
          event_capacity_type: string | null
          event_end_at: string | null
          event_location: string | null
          event_max_guests_per_student: number | null
          event_max_participants: number | null
          event_start_at: string | null
          id: string
          meta: Json | null
          publish_at: string | null
          school_id: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          activity_meta?: Json | null
          allow_attachments?: boolean
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
          event_capacity_enabled?: boolean | null
          event_capacity_type?: string | null
          event_end_at?: string | null
          event_location?: string | null
          event_max_guests_per_student?: number | null
          event_max_participants?: number | null
          event_start_at?: string | null
          id?: string
          meta?: Json | null
          publish_at?: string | null
          school_id: string
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          activity_meta?: Json | null
          allow_attachments?: boolean
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
          event_capacity_enabled?: boolean | null
          event_capacity_type?: string | null
          event_end_at?: string | null
          event_location?: string | null
          event_max_guests_per_student?: number | null
          event_max_participants?: number | null
          event_start_at?: string | null
          id?: string
          meta?: Json | null
          publish_at?: string | null
          school_id?: string
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
          {
            foreignKeyName: "posts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          best_streak_days: number | null
          class_id: string | null
          created_at: string | null
          current_school_id: string | null
          current_streak_days: number | null
          default_school_slug: string | null
          dob: string | null
          email: string
          enrollment_number: string | null
          has_received_starter_pack: boolean | null
          id: string
          is_active: boolean | null
          koins: number
          last_activity_date: string | null
          must_change_password: boolean | null
          name: string
          phone: string | null
          preferences: Json | null
          student_notes: string | null
          total_xp: number | null
          updated_at: string | null
        }
        Insert: {
          avatar?: string | null
          best_streak_days?: number | null
          class_id?: string | null
          created_at?: string | null
          current_school_id?: string | null
          current_streak_days?: number | null
          default_school_slug?: string | null
          dob?: string | null
          email: string
          enrollment_number?: string | null
          has_received_starter_pack?: boolean | null
          id: string
          is_active?: boolean | null
          koins?: number
          last_activity_date?: string | null
          must_change_password?: boolean | null
          name: string
          phone?: string | null
          preferences?: Json | null
          student_notes?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Update: {
          avatar?: string | null
          best_streak_days?: number | null
          class_id?: string | null
          created_at?: string | null
          current_school_id?: string | null
          current_streak_days?: number | null
          default_school_slug?: string | null
          dob?: string | null
          email?: string
          enrollment_number?: string | null
          has_received_starter_pack?: boolean | null
          id?: string
          is_active?: boolean | null
          koins?: number
          last_activity_date?: string | null
          must_change_password?: boolean | null
          name?: string
          phone?: string | null
          preferences?: Json | null
          student_notes?: string | null
          total_xp?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_current_school_id_fkey"
            columns: ["current_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
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
            foreignKeyName: "redemption_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
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
          school_id: string | null
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
          school_id?: string | null
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
          school_id?: string | null
          stock?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_items_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_memberships: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          role: string
          school_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role: string
          school_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          role?: string
          school_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_memberships_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          description: string | null
          key: string
          school_id: string
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          description?: string | null
          key: string
          school_id: string
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          description?: string | null
          key?: string
          school_id?: string
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          primary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          primary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          primary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      secretaria_permissions: {
        Row: {
          granted_at: string | null
          granted_by: string | null
          id: string
          permission_key: string
          permission_value: Json | null
          school_id: string | null
          secretaria_id: string
        }
        Insert: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_key: string
          permission_value?: Json | null
          school_id?: string | null
          secretaria_id: string
        }
        Update: {
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          permission_key?: string
          permission_value?: Json | null
          school_id?: string | null
          secretaria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "secretaria_permissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_challenges: {
        Row: {
          challenge_id: string
          completed_at: string | null
          created_at: string
          current_progress: number
          expires_at: string | null
          id: string
          started_at: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          created_at?: string
          current_progress?: number
          expires_at?: string | null
          id?: string
          started_at?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_challenges_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_challenges_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          addon_school_price_cents: number
          created_at: string
          features: Json | null
          id: string
          included_schools: number
          is_active: boolean
          max_students: number
          name: string
          price_cents: number
          slug: string
          updated_at: string
        }
        Insert: {
          addon_school_price_cents?: number
          created_at?: string
          features?: Json | null
          id?: string
          included_schools?: number
          is_active?: boolean
          max_students: number
          name: string
          price_cents: number
          slug: string
          updated_at?: string
        }
        Update: {
          addon_school_price_cents?: number
          created_at?: string
          features?: Json | null
          id?: string
          included_schools?: number
          is_active?: boolean
          max_students?: number
          name?: string
          price_cents?: number
          slug?: string
          updated_at?: string
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
      unlockables: {
        Row: {
          created_at: string | null
          description: string
          id: string
          identifier: string
          is_active: boolean | null
          name: string
          preview_data: Json | null
          rarity: string
          required_challenges_completed: number | null
          required_koins_earned: number | null
          required_streak_days: number | null
          required_xp: number | null
          type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          identifier: string
          is_active?: boolean | null
          name: string
          preview_data?: Json | null
          rarity?: string
          required_challenges_completed?: number | null
          required_koins_earned?: number | null
          required_streak_days?: number | null
          required_xp?: number | null
          type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          identifier?: string
          is_active?: boolean | null
          name?: string
          preview_data?: Json | null
          rarity?: string
          required_challenges_completed?: number | null
          required_koins_earned?: number | null
          required_streak_days?: number | null
          required_xp?: number | null
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_cards: {
        Row: {
          card_id: string
          id: string
          quantity: number
          unlock_source: string | null
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          card_id: string
          id?: string
          quantity?: number
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          card_id?: string
          id?: string
          quantity?: number
          unlock_source?: string | null
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_cards_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      user_unlocks: {
        Row: {
          id: string
          is_equipped: boolean | null
          unlock_context: Json | null
          unlockable_id: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          is_equipped?: boolean | null
          unlock_context?: Json | null
          unlockable_id: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          is_equipped?: boolean | null
          unlock_context?: Json | null
          unlockable_id?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unlocks_unlockable_id_fkey"
            columns: ["unlockable_id"]
            isOneToOne: false
            referencedRelation: "unlockables"
            referencedColumns: ["id"]
          },
        ]
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
          best_streak_days: number | null
          class_id: string | null
          created_at: string | null
          current_school_id: string | null
          current_streak_days: number | null
          default_school_slug: string | null
          dob: string | null
          email: string
          enrollment_number: string | null
          has_received_starter_pack: boolean | null
          id: string
          is_active: boolean | null
          koins: number
          last_activity_date: string | null
          must_change_password: boolean | null
          name: string
          phone: string | null
          preferences: Json | null
          student_notes: string | null
          total_xp: number | null
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
      assign_challenge_to_students: {
        Args: { p_challenge_id: string }
        Returns: number
      }
      can_create_notifications: { Args: { _user_id: string }; Returns: boolean }
      check_and_unlock_achievements: {
        Args: { p_user_id: string }
        Returns: Json
      }
      check_subscription_limits: { Args: { p_admin_id: string }; Returns: Json }
      claim_free_starter_pack: { Args: { p_user_id: string }; Returns: Json }
      cleanup_old_system_logs: {
        Args: { days_to_keep?: number }
        Returns: number
      }
      complete_challenge_and_reward: {
        Args: {
          p_challenge_title: string
          p_koin_reward: number
          p_student_challenge_id: string
          p_student_id: string
        }
        Returns: undefined
      }
      finish_battle_round: { Args: { p_battle_id: string }; Returns: Json }
      get_class_performance_analytics: {
        Args: { days_filter?: number; p_class_id: string }
        Returns: Json
      }
      get_evasion_risk_analytics: {
        Args: { days_filter?: number; school_id_param?: string }
        Returns: Json
      }
      get_family_metrics: { Args: { school_id_param?: string }; Returns: Json }
      get_post_read_analytics: {
        Args: { days_filter?: number; school_id_param?: string }
        Returns: Json
      }
      get_public_student_profile: {
        Args: { student_id_param: string }
        Returns: {
          best_streak_days: number
          current_streak_days: number
          equipped_avatar_emoji: string
          equipped_avatar_image_url: string
          equipped_avatar_rarity: string
          id: string
          koins: number
          name: string
          total_xp: number
        }[]
      }
      get_queue_position: { Args: { p_user_id: string }; Returns: number }
      get_school_rankings: {
        Args: {
          limit_param?: number
          ranking_type?: string
          school_id_param: string
        }
        Returns: {
          avatar: string
          current_streak_days: number
          equipped_avatar_emoji: string
          equipped_avatar_image_url: string
          equipped_avatar_rarity: string
          koins: number
          rank_position: number
          student_id: string
          student_name: string
          total_xp: number
        }[]
      }
      get_student_challenges_with_progress: {
        Args: { p_student_id: string }
        Returns: {
          action_count: number
          action_target: string
          challenge_id: string
          challenge_type: string
          current_progress: number
          description: string
          expires_at: string
          icon_name: string
          is_current_cycle: boolean
          koin_reward: number
          started_at: string
          status: string
          student_challenge_id: string
          title: string
        }[]
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
      join_battle_queue: {
        Args: { p_deck_id: string; p_school_id: string; p_user_id: string }
        Returns: Json
      }
      leave_battle_queue: { Args: { p_user_id: string }; Returns: undefined }
      open_card_pack:
        | {
            Args: {
              p_is_free?: boolean
              p_pack_type: string
              p_user_id: string
            }
            Returns: Json
          }
        | { Args: { p_pack_type: string; p_user_id: string }; Returns: Json }
      play_battle_turn: {
        Args: {
          p_battle_id: string
          p_card_id: string
          p_line: number
          p_player_id: string
        }
        Returns: Json
      }
      reject_redemption: {
        Args: { p_admin_id: string; p_reason: string; p_redemption_id: string }
        Returns: undefined
      }
      request_redemption: {
        Args: { p_item_id: string; p_student_id: string }
        Returns: undefined
      }
      user_has_school_access: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      validate_student_creation: {
        Args: { p_school_id: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "secretaria" | "professor" | "aluno" | "administrador"
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
      app_role: ["secretaria", "professor", "aluno", "administrador"],
    },
  },
} as const
