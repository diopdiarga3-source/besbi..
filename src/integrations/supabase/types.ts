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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      availability: {
        Row: {
          end_time: string
          id: string
          provider_id: string
          start_time: string
          weekday: number
        }
        Insert: {
          end_time: string
          id?: string
          provider_id: string
          start_time: string
          weekday: number
        }
        Update: {
          end_time?: string
          id?: string
          provider_id?: string
          start_time?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "availability_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_dates: {
        Row: {
          date: string
          id: string
          provider_id: string
          reason: string | null
        }
        Insert: {
          date: string
          id?: string
          provider_id: string
          reason?: string | null
        }
        Update: {
          date?: string
          id?: string
          provider_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          client_city: string | null
          client_id: string
          commission: number
          created_at: string
          date: string
          event_type: string | null
          extras_total: number
          guests: number
          id: string
          location: string
          location_lat: number | null
          location_lng: number | null
          measurements: Json | null
          needed_by: string | null
          notes: string
          payment_method: string | null
          payment_reference: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          payout_done_at: string | null
          payout_status: string
          platform_fee: number
          provider_amount: number
          provider_id: string
          quantity: number
          requirements: Json | null
          selected_options: Json
          service_id: string
          start_time: string
          status: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          total: number
          travel_fee: number
        }
        Insert: {
          client_city?: string | null
          client_id: string
          commission?: number
          created_at?: string
          date: string
          event_type?: string | null
          extras_total?: number
          guests?: number
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          measurements?: Json | null
          needed_by?: string | null
          notes?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payout_done_at?: string | null
          payout_status?: string
          platform_fee?: number
          provider_amount?: number
          provider_id: string
          quantity?: number
          requirements?: Json | null
          selected_options?: Json
          service_id: string
          start_time: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          total?: number
          travel_fee?: number
        }
        Update: {
          client_city?: string | null
          client_id?: string
          commission?: number
          created_at?: string
          date?: string
          event_type?: string | null
          extras_total?: number
          guests?: number
          id?: string
          location?: string
          location_lat?: number | null
          location_lng?: number | null
          measurements?: Json | null
          needed_by?: string | null
          notes?: string
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          payout_done_at?: string | null
          payout_status?: string
          platform_fee?: number
          provider_amount?: number
          provider_id?: string
          quantity?: number
          requirements?: Json | null
          selected_options?: Json
          service_id?: string
          start_time?: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          total?: number
          travel_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          emoji: string
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          emoji?: string
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          emoji?: string
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          parts: Json
          role: string
          thread_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parts?: Json
          role: string
          thread_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_threads: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      favorites: {
        Row: {
          created_at: string
          provider_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          provider_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          provider_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          audio_duration: number | null
          audio_path: string | null
          booking_id: string
          content: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          audio_duration?: number | null
          audio_path?: string | null
          booking_id: string
          content: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          audio_duration?: number | null
          audio_path?: string | null
          booking_id?: string
          content?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string | null
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
        }
        Relationships: []
      }
      providers: {
        Row: {
          avatar_url: string | null
          business_name: string
          category_id: string | null
          city: string
          completed_count: number
          cover_url: string | null
          created_at: string
          delivery_available: boolean
          description: string
          id: string
          payout_method: string
          payout_name: string | null
          payout_phone: string | null
          portfolio: string[]
          rating_avg: number
          reviews_count: number
          travel_fee: number
          travel_possible: boolean
          travel_zones: Json
          verified: boolean
          zone: string
        }
        Insert: {
          avatar_url?: string | null
          business_name: string
          category_id?: string | null
          city?: string
          completed_count?: number
          cover_url?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string
          id: string
          payout_method?: string
          payout_name?: string | null
          payout_phone?: string | null
          portfolio?: string[]
          rating_avg?: number
          reviews_count?: number
          travel_fee?: number
          travel_possible?: boolean
          travel_zones?: Json
          verified?: boolean
          zone?: string
        }
        Update: {
          avatar_url?: string | null
          business_name?: string
          category_id?: string | null
          city?: string
          completed_count?: number
          cover_url?: string | null
          created_at?: string
          delivery_available?: boolean
          description?: string
          id?: string
          payout_method?: string
          payout_name?: string | null
          payout_phone?: string | null
          portfolio?: string[]
          rating_avg?: number
          reviews_count?: number
          travel_fee?: number
          travel_possible?: boolean
          travel_zones?: Json
          verified?: boolean
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          booking_id: string
          client_id: string
          comment: string
          created_at: string
          id: string
          provider_id: string
          rating: number
          reported: boolean
        }
        Insert: {
          booking_id: string
          client_id: string
          comment?: string
          created_at?: string
          id?: string
          provider_id: string
          rating: number
          reported?: boolean
        }
        Update: {
          booking_id?: string
          client_id?: string
          comment?: string
          created_at?: string
          id?: string
          provider_id?: string
          rating?: number
          reported?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      service_catalog: {
        Row: {
          category_id: string
          description: string
          duration_minutes: number
          id: string
          name: string
          price: number
          sort: number
          unit: string
        }
        Insert: {
          category_id: string
          description?: string
          duration_minutes?: number
          id?: string
          name: string
          price?: number
          sort?: number
          unit?: string
        }
        Update: {
          category_id?: string
          description?: string
          duration_minutes?: number
          id?: string
          name?: string
          price?: number
          sort?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_catalog_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          active: boolean
          created_at: string
          description: string
          duration_minutes: number
          event_prices: Json
          guest_price: number
          guests_included: number
          id: string
          name: string
          options: Json
          price: number
          provider_id: string
          unit: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          duration_minutes?: number
          event_prices?: Json
          guest_price?: number
          guests_included?: number
          id?: string
          name: string
          options?: Json
          price: number
          provider_id: string
          unit?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          duration_minutes?: number
          event_prices?: Json
          guest_price?: number
          guests_included?: number
          id?: string
          name?: string
          options?: Json
          price?: number
          provider_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          key: string
          value: number
        }
        Insert: {
          key: string
          value: number
        }
        Update: {
          key?: string
          value?: number
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          id: string
          method: string
          provider_id: string | null
          reference: string
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          id?: string
          method: string
          provider_id?: string | null
          reference?: string
          status?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          id?: string
          method?: string
          provider_id?: string | null
          reference?: string
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      become_provider: { Args: never; Returns: undefined }
      declare_direct_payment: {
        Args: {
          _booking: string
          _deposit: boolean
          _method: string
          _reference: string
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
      is_booking_party: { Args: { _booking: string }; Returns: boolean }
      mark_payout_done: {
        Args: { _booking: string; _done: boolean }
        Returns: undefined
      }
      notify: {
        Args: { _body: string; _link: string; _title: string; _user: string }
        Returns: undefined
      }
      pay_booking: {
        Args: { _booking: string; _deposit?: boolean; _method: string }
        Returns: undefined
      }
      release_pending_payouts: { Args: never; Returns: number }
      report_review: { Args: { _review: string }; Returns: undefined }
      set_booking_measurements: {
        Args: { _booking: string; _m: Json }
        Returns: undefined
      }
      set_booking_status: {
        Args: {
          _booking: string
          _status: Database["public"]["Enums"]["booking_status"]
        }
        Returns: undefined
      }
      share_booking_location: {
        Args: { _booking: string; _lat: number; _lng: number }
        Returns: undefined
      }
      taken_slots: {
        Args: { _date: string; _provider: string }
        Returns: {
          start_time: string
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "provider" | "client"
      booking_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "completed"
        | "cancelled"
      payment_status: "unpaid" | "deposit" | "paid" | "refunded"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "provider", "client"],
      booking_status: [
        "pending",
        "accepted",
        "rejected",
        "completed",
        "cancelled",
      ],
      payment_status: ["unpaid", "deposit", "paid", "refunded"],
    },
  },
} as const
