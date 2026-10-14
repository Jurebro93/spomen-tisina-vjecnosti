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
    PostgrestVersion: "12.2.3"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string
          id: string
          name: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      billing_details: {
        Row: {
          address: string | null
          city: string | null
          company_name: string | null
          country: string
          created_at: string
          customer_type: string
          email: string
          full_name: string
          id: string
          memorial_id: string | null
          oib: string | null
          postal_code: string | null
          updated_at: string
          user_id: string
          vat_id: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string
          created_at?: string
          customer_type?: string
          email: string
          full_name: string
          id?: string
          memorial_id?: string | null
          oib?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
          vat_id?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string | null
          country?: string
          created_at?: string
          customer_type?: string
          email?: string
          full_name?: string
          id?: string
          memorial_id?: string | null
          oib?: string | null
          postal_code?: string | null
          updated_at?: string
          user_id?: string
          vat_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_details_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_events: {
        Row: {
          blog_slug: string
          created_at: string
          cta_id: string | null
          device: string | null
          event: string
          id: string
          visitor_id: string | null
        }
        Insert: {
          blog_slug: string
          created_at?: string
          cta_id?: string | null
          device?: string | null
          event: string
          id?: string
          visitor_id?: string | null
        }
        Update: {
          blog_slug?: string
          created_at?: string
          cta_id?: string | null
          device?: string | null
          event?: string
          id?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
      blogs: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          cta_enabled: boolean
          cta_text: string | null
          date: string | null
          excerpt: string | null
          featured: boolean | null
          id: string
          image_url: string | null
          interactive_items: string[]
          interactive_type: string
          meta_description: string | null
          meta_title: string | null
          sales_heading: string | null
          sales_text: string | null
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          cta_enabled?: boolean
          cta_text?: string | null
          date?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          interactive_items?: string[]
          interactive_type?: string
          meta_description?: string | null
          meta_title?: string | null
          sales_heading?: string | null
          sales_text?: string | null
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          cta_enabled?: boolean
          cta_text?: string | null
          date?: string | null
          excerpt?: string | null
          featured?: boolean | null
          id?: string
          image_url?: string | null
          interactive_items?: string[]
          interactive_type?: string
          meta_description?: string | null
          meta_title?: string | null
          sales_heading?: string | null
          sales_text?: string | null
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      business_settings: {
        Row: {
          address: string
          city: string | null
          country: string
          email: string
          founded_year: string | null
          id: number
          legal_name: string
          mbo: string | null
          oib: string
          phone: string | null
          postal_code: string | null
          register_info: string | null
          tax_note: string
          updated_at: string
          website: string
        }
        Insert: {
          address: string
          city?: string | null
          country?: string
          email: string
          founded_year?: string | null
          id?: number
          legal_name: string
          mbo?: string | null
          oib: string
          phone?: string | null
          postal_code?: string | null
          register_info?: string | null
          tax_note: string
          updated_at?: string
          website: string
        }
        Update: {
          address?: string
          city?: string | null
          country?: string
          email?: string
          founded_year?: string | null
          id?: number
          legal_name?: string
          mbo?: string | null
          oib?: string
          phone?: string | null
          postal_code?: string | null
          register_info?: string | null
          tax_note?: string
          updated_at?: string
          website?: string
        }
        Relationships: []
      }
      discount_signups: {
        Row: {
          created_at: string
          email: string
          email_error: string | null
          email_sent_at: string | null
          id: string
          newsletter_opt_in: boolean
          promo_code: string | null
          promo_code_id: string | null
          source: string
        }
        Insert: {
          created_at?: string
          email: string
          email_error?: string | null
          email_sent_at?: string | null
          id?: string
          newsletter_opt_in?: boolean
          promo_code?: string | null
          promo_code_id?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          email?: string
          email_error?: string | null
          email_sent_at?: string | null
          id?: string
          newsletter_opt_in?: boolean
          promo_code?: string | null
          promo_code_id?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_signups_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      famous_portrait_jobs: {
        Row: {
          created_at: string
          created_by: string
          error_message: string | null
          first_name: string
          found_count: number
          id: string
          last_name: string
          missing_count: number
          processed_count: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          error_message?: string | null
          first_name: string
          found_count?: number
          id?: string
          last_name: string
          missing_count?: number
          processed_count?: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          error_message?: string | null
          first_name?: string
          found_count?: number
          id?: string
          last_name?: string
          missing_count?: number
          processed_count?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "famous_portrait_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      famous_portrait_photos: {
        Row: {
          attribution_text: string | null
          author: string | null
          created_at: string
          edit_preservation_confidence: number | null
          edit_preservation_reason: string | null
          edit_preservation_verified: boolean
          edited_storage_path: string | null
          error_message: string | null
          id: string
          identity_confidence: number | null
          identity_reason: string | null
          identity_verified: boolean
          job_id: string
          license_name: string
          license_url: string | null
          memorial_id: string | null
          mime_type: string | null
          sort_order: number
          source_file_url: string
          source_height: number | null
          source_page_url: string
          source_storage_path: string | null
          source_title: string
          source_width: number | null
          status: string
          updated_at: string
        }
        Insert: {
          attribution_text?: string | null
          author?: string | null
          created_at?: string
          edit_preservation_confidence?: number | null
          edit_preservation_reason?: string | null
          edit_preservation_verified?: boolean
          edited_storage_path?: string | null
          error_message?: string | null
          id?: string
          identity_confidence?: number | null
          identity_reason?: string | null
          identity_verified?: boolean
          job_id: string
          license_name: string
          license_url?: string | null
          memorial_id?: string | null
          mime_type?: string | null
          sort_order?: number
          source_file_url: string
          source_height?: number | null
          source_page_url: string
          source_storage_path?: string | null
          source_title: string
          source_width?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          attribution_text?: string | null
          author?: string | null
          created_at?: string
          edit_preservation_confidence?: number | null
          edit_preservation_reason?: string | null
          edit_preservation_verified?: boolean
          edited_storage_path?: string | null
          error_message?: string | null
          id?: string
          identity_confidence?: number | null
          identity_reason?: string | null
          identity_verified?: boolean
          job_id?: string
          license_name?: string
          license_url?: string | null
          memorial_id?: string | null
          mime_type?: string | null
          sort_order?: number
          source_file_url?: string
          source_height?: number | null
          source_page_url?: string
          source_storage_path?: string | null
          source_title?: string
          source_width?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "famous_portrait_photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "famous_portrait_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "famous_portrait_photos_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_events: {
        Row: {
          campaign: string | null
          consented: boolean
          created_at: string
          device: string | null
          id: string
          medium: string | null
          memorial_id: string | null
          path: string | null
          source: string | null
          step: string
          user_id: string | null
          visitor_id: string | null
        }
        Insert: {
          campaign?: string | null
          consented?: boolean
          created_at?: string
          device?: string | null
          id?: string
          medium?: string | null
          memorial_id?: string | null
          path?: string | null
          source?: string | null
          step: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Update: {
          campaign?: string | null
          consented?: boolean
          created_at?: string
          device?: string | null
          id?: string
          medium?: string | null
          memorial_id?: string | null
          path?: string | null
          source?: string | null
          step?: string
          user_id?: string | null
          visitor_id?: string | null
        }
        Relationships: []
      }
      groblja: {
        Row: {
          created_at: string
          godina_osnivanja: string | null
          grad: string
          id: string
          meta_description: string | null
          meta_title: string | null
          naziv: string
          opis: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          godina_osnivanja?: string | null
          grad: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          naziv: string
          opis: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          godina_osnivanja?: string | null
          grad?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          naziv?: string
          opis?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      groblja_i_opisi: {
        Row: {
          Adresa: string | null
          "E-mail": string | null
          Grad: string | null
          "Kontakt broj": string | null
          "Naziv groblja": string | null
          Opis: string | null
          "Radno vrijeme": string | null
        }
        Insert: {
          Adresa?: string | null
          "E-mail"?: string | null
          Grad?: string | null
          "Kontakt broj"?: string | null
          "Naziv groblja"?: string | null
          Opis?: string | null
          "Radno vrijeme"?: string | null
        }
        Update: {
          Adresa?: string | null
          "E-mail"?: string | null
          Grad?: string | null
          "Kontakt broj"?: string | null
          "Naziv groblja"?: string | null
          Opis?: string | null
          "Radno vrijeme"?: string | null
        }
        Relationships: []
      }
      invoice_logs: {
        Row: {
          created_at: string
          event: string
          external_id: string | null
          id: string
          invoice_id: string | null
          message: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          event: string
          external_id?: string | null
          id?: string
          invoice_id?: string | null
          message?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          event?: string
          external_id?: string | null
          id?: string
          invoice_id?: string | null
          message?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_logs_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_settings: {
        Row: {
          auto_issue: boolean
          created_at: string
          default_currency: string
          default_customer_type: string
          default_item_code: string | null
          default_item_name: string
          default_payment_method: string
          default_vat_rate: number
          document_numbering: string | null
          id: string
          minimax_organisation_id: string | null
          send_email_to_customer: boolean
          test_mode: boolean
          updated_at: string
          vat_exempt: boolean
        }
        Insert: {
          auto_issue?: boolean
          created_at?: string
          default_currency?: string
          default_customer_type?: string
          default_item_code?: string | null
          default_item_name?: string
          default_payment_method?: string
          default_vat_rate?: number
          document_numbering?: string | null
          id?: string
          minimax_organisation_id?: string | null
          send_email_to_customer?: boolean
          test_mode?: boolean
          updated_at?: string
          vat_exempt?: boolean
        }
        Update: {
          auto_issue?: boolean
          created_at?: string
          default_currency?: string
          default_customer_type?: string
          default_item_code?: string | null
          default_item_name?: string
          default_payment_method?: string
          default_vat_rate?: number
          document_numbering?: string | null
          id?: string
          minimax_organisation_id?: string | null
          send_email_to_customer?: boolean
          test_mode?: boolean
          updated_at?: string
          vat_exempt?: boolean
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount_gross: number
          amount_net: number | null
          created_at: string
          currency: string
          customer_address: string | null
          customer_city: string | null
          customer_company: string | null
          customer_country: string | null
          customer_email: string
          customer_name: string
          customer_oib: string | null
          customer_postal_code: string | null
          customer_type: string
          customer_vat_id: string | null
          email_sent_at: string | null
          error_message: string | null
          fiscalization_status: string
          fiscalized_at: string | null
          id: string
          invoice_created_at: string | null
          invoice_status: string
          jir: string | null
          memorial_id: string | null
          minimax_document_id: string | null
          minimax_invoice_id: string | null
          minimax_invoice_number: string | null
          minimax_pdf_url: string | null
          next_retry_at: string | null
          order_id: string | null
          payment_method: string
          product_description: string | null
          product_name: string
          quantity: number
          retry_count: number
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_livemode: boolean
          stripe_paid_at: string | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          tax_amount: number | null
          tax_rate: number | null
          updated_at: string
          user_id: string | null
          zki: string | null
        }
        Insert: {
          amount_gross?: number
          amount_net?: number | null
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_company?: string | null
          customer_country?: string | null
          customer_email?: string
          customer_name?: string
          customer_oib?: string | null
          customer_postal_code?: string | null
          customer_type?: string
          customer_vat_id?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          fiscalization_status?: string
          fiscalized_at?: string | null
          id?: string
          invoice_created_at?: string | null
          invoice_status?: string
          jir?: string | null
          memorial_id?: string | null
          minimax_document_id?: string | null
          minimax_invoice_id?: string | null
          minimax_invoice_number?: string | null
          minimax_pdf_url?: string | null
          next_retry_at?: string | null
          order_id?: string | null
          payment_method?: string
          product_description?: string | null
          product_name?: string
          quantity?: number
          retry_count?: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_livemode?: boolean
          stripe_paid_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string | null
          zki?: string | null
        }
        Update: {
          amount_gross?: number
          amount_net?: number | null
          created_at?: string
          currency?: string
          customer_address?: string | null
          customer_city?: string | null
          customer_company?: string | null
          customer_country?: string | null
          customer_email?: string
          customer_name?: string
          customer_oib?: string | null
          customer_postal_code?: string | null
          customer_type?: string
          customer_vat_id?: string | null
          email_sent_at?: string | null
          error_message?: string | null
          fiscalization_status?: string
          fiscalized_at?: string | null
          id?: string
          invoice_created_at?: string | null
          invoice_status?: string
          jir?: string | null
          memorial_id?: string | null
          minimax_document_id?: string | null
          minimax_invoice_id?: string | null
          minimax_invoice_number?: string | null
          minimax_pdf_url?: string | null
          next_retry_at?: string | null
          order_id?: string | null
          payment_method?: string
          product_description?: string | null
          product_name?: string
          quantity?: number
          retry_count?: number
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_livemode?: boolean
          stripe_paid_at?: string | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          tax_amount?: number | null
          tax_rate?: number | null
          updated_at?: string
          user_id?: string | null
          zki?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_cases: {
        Row: {
          admin_note: string | null
          attachment_paths: string[]
          case_number: string
          case_type: string
          content_url: string | null
          contract_date: string | null
          deleted_at: string | null
          deletion_scheduled_at: string | null
          description: string | null
          email: string | null
          full_name: string | null
          good_faith: boolean
          hidden_at: string | null
          id: string
          identity_verified_at: string | null
          memorial_id: string | null
          order_id: string | null
          order_reference: string | null
          problem_type: string | null
          received_at: string
          refund_id: string | null
          refunded_at: string | null
          resolved_at: string | null
          response_due_at: string | null
          status: string
          updated_at: string
          user_id: string | null
          within_14_days: boolean | null
        }
        Insert: {
          admin_note?: string | null
          attachment_paths?: string[]
          case_number: string
          case_type: string
          content_url?: string | null
          contract_date?: string | null
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          good_faith?: boolean
          hidden_at?: string | null
          id?: string
          identity_verified_at?: string | null
          memorial_id?: string | null
          order_id?: string | null
          order_reference?: string | null
          problem_type?: string | null
          received_at?: string
          refund_id?: string | null
          refunded_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          within_14_days?: boolean | null
        }
        Update: {
          admin_note?: string | null
          attachment_paths?: string[]
          case_number?: string
          case_type?: string
          content_url?: string | null
          contract_date?: string | null
          deleted_at?: string | null
          deletion_scheduled_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          good_faith?: boolean
          hidden_at?: string | null
          id?: string
          identity_verified_at?: string | null
          memorial_id?: string | null
          order_id?: string | null
          order_reference?: string | null
          problem_type?: string | null
          received_at?: string
          refund_id?: string | null
          refunded_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
          within_14_days?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_cases_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_cases_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "memorial_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_documents: {
        Row: {
          content_hash: string | null
          created_at: string
          effective_date: string
          id: string
          slug: string
          version: string
        }
        Insert: {
          content_hash?: string | null
          created_at?: string
          effective_date: string
          id?: string
          slug: string
          version: string
        }
        Update: {
          content_hash?: string | null
          created_at?: string
          effective_date?: string
          id?: string
          slug?: string
          version?: string
        }
        Relationships: []
      }
      memorial_access_requests: {
        Row: {
          created_at: string
          id: string
          memorial_id: string
          message: string | null
          relationship: string | null
          requester_user_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          memorial_id: string
          message?: string | null
          relationship?: string | null
          requester_user_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          memorial_id?: string
          message?: string | null
          relationship?: string | null
          requester_user_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_access_requests_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          memorial_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          memorial_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          memorial_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_audit_log_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_candles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          memorial_id: string
          message: string | null
          status: string
          visitor_name: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          memorial_id: string
          message?: string | null
          status?: string
          visitor_name?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          memorial_id?: string
          message?: string | null
          status?: string
          visitor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_candles_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_content_reports: {
        Row: {
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          memorial_id: string
          reason: string
          reporter_email: string | null
          reporter_user_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          memorial_id: string
          reason: string
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          memorial_id?: string
          reason?: string
          reporter_email?: string | null
          reporter_user_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_content_reports_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          created_by: string | null
          email: string
          expires_at: string
          id: string
          memorial_id: string
          role: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email: string
          expires_at?: string
          id?: string
          memorial_id: string
          role?: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          created_by?: string | null
          email?: string
          expires_at?: string
          id?: string
          memorial_id?: string
          role?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_invites_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_life_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string | null
          event_year: number | null
          id: string
          media_id: string | null
          memorial_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_year?: number | null
          id?: string
          media_id?: string | null
          memorial_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string | null
          event_year?: number | null
          id?: string
          media_id?: string | null
          memorial_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_life_events_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "memorial_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_life_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_managers: {
        Row: {
          created_at: string
          id: string
          memorial_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memorial_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memorial_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_managers_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_media: {
        Row: {
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_cover: boolean
          media_date: string | null
          memorial_id: string
          sort_order: number
          storage_path: string | null
          title: string | null
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_cover?: boolean
          media_date?: string | null
          memorial_id: string
          sort_order?: number
          storage_path?: string | null
          title?: string | null
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_cover?: boolean
          media_date?: string | null
          memorial_id?: string
          sort_order?: number
          storage_path?: string | null
          title?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_media_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_orders: {
        Row: {
          amount_paid: number
          amount_refunded: number
          attempt_count: number
          backfilled: boolean
          blog_cta: string | null
          blog_slug: string | null
          blog_touched_at: string | null
          checkout_campaign: string | null
          checkout_expires_at: string | null
          checkout_medium: string | null
          checkout_source: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          device: string | null
          discount_amount: number
          disputed_at: string | null
          expired_at: string | null
          failed_attempt_count: number
          first_campaign: string | null
          first_medium: string | null
          first_source: string | null
          id: string
          immediate_start_requested: boolean | null
          is_free: boolean
          last_failure_code: string | null
          last_failure_message: string | null
          livemode: boolean
          memorial_id: string | null
          original_amount: number
          paid_at: string | null
          promo_code: string | null
          promo_code_id: string | null
          refunded_at: string | null
          returned_without_payment_at: string | null
          service_start_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_fee: number | null
          stripe_payment_intent_id: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount_paid?: number
          amount_refunded?: number
          attempt_count?: number
          backfilled?: boolean
          blog_cta?: string | null
          blog_slug?: string | null
          blog_touched_at?: string | null
          checkout_campaign?: string | null
          checkout_expires_at?: string | null
          checkout_medium?: string | null
          checkout_source?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          device?: string | null
          discount_amount?: number
          disputed_at?: string | null
          expired_at?: string | null
          failed_attempt_count?: number
          first_campaign?: string | null
          first_medium?: string | null
          first_source?: string | null
          id?: string
          immediate_start_requested?: boolean | null
          is_free?: boolean
          last_failure_code?: string | null
          last_failure_message?: string | null
          livemode?: boolean
          memorial_id?: string | null
          original_amount?: number
          paid_at?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          refunded_at?: string | null
          returned_without_payment_at?: string | null
          service_start_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount_paid?: number
          amount_refunded?: number
          attempt_count?: number
          backfilled?: boolean
          blog_cta?: string | null
          blog_slug?: string | null
          blog_touched_at?: string | null
          checkout_campaign?: string | null
          checkout_expires_at?: string | null
          checkout_medium?: string | null
          checkout_source?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          device?: string | null
          discount_amount?: number
          disputed_at?: string | null
          expired_at?: string | null
          failed_attempt_count?: number
          first_campaign?: string | null
          first_medium?: string | null
          first_source?: string | null
          id?: string
          immediate_start_requested?: boolean | null
          is_free?: boolean
          last_failure_code?: string | null
          last_failure_message?: string | null
          livemode?: boolean
          memorial_id?: string | null
          original_amount?: number
          paid_at?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          refunded_at?: string | null
          returned_without_payment_at?: string | null
          service_start_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_fee?: number | null
          stripe_payment_intent_id?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_orders_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_tributes: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          author_email: string
          author_name: string
          consent: boolean
          created_at: string
          id: string
          memorial_id: string
          message: string
          photo_path: string | null
          relationship: string | null
          status: string
          title: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          author_email: string
          author_name: string
          consent?: boolean
          created_at?: string
          id?: string
          memorial_id: string
          message: string
          photo_path?: string | null
          relationship?: string | null
          status?: string
          title?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          author_email?: string
          author_name?: string
          consent?: boolean
          created_at?: string
          id?: string
          memorial_id?: string
          message?: string
          photo_path?: string | null
          relationship?: string | null
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_tributes_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorials: {
        Row: {
          allow_candles: boolean
          allow_media_download: boolean
          allow_tributes: boolean
          archived_at: string | null
          created_at: string
          deceased_id: string
          id: string
          invoice_email: string | null
          invoice_number: string | null
          invoice_sent_at: string | null
          life_story: string | null
          owner_id: string
          paid: boolean
          paid_at: string | null
          payment_amount: number | null
          payment_method: string | null
          promo_code: string | null
          promo_code_id: string | null
          published_at: string | null
          quote: string | null
          relationship: string | null
          scheduled_publish_at: string | null
          slug: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          tributes_require_approval: boolean
          updated_at: string
          visibility: string
        }
        Insert: {
          allow_candles?: boolean
          allow_media_download?: boolean
          allow_tributes?: boolean
          archived_at?: string | null
          created_at?: string
          deceased_id: string
          id?: string
          invoice_email?: string | null
          invoice_number?: string | null
          invoice_sent_at?: string | null
          life_story?: string | null
          owner_id: string
          paid?: boolean
          paid_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          published_at?: string | null
          quote?: string | null
          relationship?: string | null
          scheduled_publish_at?: string | null
          slug: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tributes_require_approval?: boolean
          updated_at?: string
          visibility?: string
        }
        Update: {
          allow_candles?: boolean
          allow_media_download?: boolean
          allow_tributes?: boolean
          archived_at?: string | null
          created_at?: string
          deceased_id?: string
          id?: string
          invoice_email?: string | null
          invoice_number?: string | null
          invoice_sent_at?: string | null
          life_story?: string | null
          owner_id?: string
          paid?: boolean
          paid_at?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          promo_code?: string | null
          promo_code_id?: string | null
          published_at?: string | null
          quote?: string | null
          relationship?: string | null
          scheduled_publish_at?: string | null
          slug?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          tributes_require_approval?: boolean
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorials_deceased_id_fkey"
            columns: ["deceased_id"]
            isOneToOne: true
            referencedRelation: "obituaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorials_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      memorijalni_citati: {
        Row: {
          admin_komentar: string | null
          approved_at: string | null
          approved_by: string | null
          autor: string
          created_at: string
          email_autora: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          relacija: string | null
          status: string
          tekst: string
          updated_at: string
        }
        Insert: {
          admin_komentar?: string | null
          approved_at?: string | null
          approved_by?: string | null
          autor: string
          created_at?: string
          email_autora?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          relacija?: string | null
          status?: string
          tekst: string
          updated_at?: string
        }
        Update: {
          admin_komentar?: string | null
          approved_at?: string | null
          approved_by?: string | null
          autor?: string
          created_at?: string
          email_autora?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          relacija?: string | null
          status?: string
          tekst?: string
          updated_at?: string
        }
        Relationships: []
      }
      meta_capi_deliveries: {
        Row: {
          attempts: number
          claim_token: string | null
          client_ip: string | null
          client_user_agent: string | null
          created_at: string
          currency: string
          event_id: string
          event_name: string
          event_time: number
          id: string
          last_error: string | null
          locked_at: string | null
          memorial_id: string | null
          meta_body: Json | null
          meta_status: number | null
          next_attempt_at: string | null
          order_id: string | null
          sent_at: string | null
          status: string
          stripe_session_id: string
          updated_at: string
          user_id: string | null
          value: number
        }
        Insert: {
          attempts?: number
          claim_token?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          currency?: string
          event_id: string
          event_name?: string
          event_time: number
          id?: string
          last_error?: string | null
          locked_at?: string | null
          memorial_id?: string | null
          meta_body?: Json | null
          meta_status?: number | null
          next_attempt_at?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_session_id: string
          updated_at?: string
          user_id?: string | null
          value?: number
        }
        Update: {
          attempts?: number
          claim_token?: string | null
          client_ip?: string | null
          client_user_agent?: string | null
          created_at?: string
          currency?: string
          event_id?: string
          event_name?: string
          event_time?: number
          id?: string
          last_error?: string | null
          locked_at?: string | null
          memorial_id?: string | null
          meta_body?: Json | null
          meta_status?: number | null
          next_attempt_at?: string | null
          order_id?: string | null
          sent_at?: string | null
          status?: string
          stripe_session_id?: string
          updated_at?: string
          user_id?: string | null
          value?: number
        }
        Relationships: []
      }
      newsletter_users: {
        Row: {
          active: boolean
          email: string
          id: string
          subscribed_at: string
        }
        Insert: {
          active?: boolean
          email: string
          id?: string
          subscribed_at?: string
        }
        Update: {
          active?: boolean
          email?: string
          id?: string
          subscribed_at?: string
        }
        Relationships: []
      }
      obituaries: {
        Row: {
          active: boolean | null
          biografija: string | null
          created_at: string | null
          datum_rodenja: string | null
          datum_smrti: string | null
          datum_ukopa: string | null
          fotografija_url: string | null
          groblje: string | null
          id: string
          ime: string
          kontakt_osoba_email: string | null
          kontakt_osoba_ime: string | null
          kontakt_osoba_telefon: string | null
          kontakt_osobe: Json | null
          meta_description: string | null
          meta_title: string | null
          mjesna_zajednica: string | null
          mjesto_rodenja: string | null
          mjesto_smrti: string | null
          ozalosceni: string[] | null
          paid: boolean | null
          podnaslov: string | null
          prezime: string
          profesija: string | null
          slug: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          vrijeme_ukopa: string | null
        }
        Insert: {
          active?: boolean | null
          biografija?: string | null
          created_at?: string | null
          datum_rodenja?: string | null
          datum_smrti?: string | null
          datum_ukopa?: string | null
          fotografija_url?: string | null
          groblje?: string | null
          id?: string
          ime: string
          kontakt_osoba_email?: string | null
          kontakt_osoba_ime?: string | null
          kontakt_osoba_telefon?: string | null
          kontakt_osobe?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          mjesna_zajednica?: string | null
          mjesto_rodenja?: string | null
          mjesto_smrti?: string | null
          ozalosceni?: string[] | null
          paid?: boolean | null
          podnaslov?: string | null
          prezime: string
          profesija?: string | null
          slug?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          vrijeme_ukopa?: string | null
        }
        Update: {
          active?: boolean | null
          biografija?: string | null
          created_at?: string | null
          datum_rodenja?: string | null
          datum_smrti?: string | null
          datum_ukopa?: string | null
          fotografija_url?: string | null
          groblje?: string | null
          id?: string
          ime?: string
          kontakt_osoba_email?: string | null
          kontakt_osoba_ime?: string | null
          kontakt_osoba_telefon?: string | null
          kontakt_osobe?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          mjesna_zajednica?: string | null
          mjesto_rodenja?: string | null
          mjesto_smrti?: string | null
          ozalosceni?: string[] | null
          paid?: boolean | null
          podnaslov?: string | null
          prezime?: string
          profesija?: string | null
          slug?: string | null
          stripe_payment_intent_id?: string | null
          updated_at?: string | null
          vrijeme_ukopa?: string | null
        }
        Relationships: []
      }
      on_page_seo: {
        Row: {
          created_at: string
          id: string
          meta_description: string
          meta_title: string
          page_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_description: string
          meta_title: string
          page_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_description?: string
          meta_title?: string
          page_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount: number | null
          created_at: string
          event_type: string
          failure_code: string | null
          failure_message: string | null
          id: string
          livemode: boolean | null
          occurred_at: string
          order_id: string | null
          status: string | null
          stripe_event_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          event_type: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          livemode?: boolean | null
          occurred_at?: string
          order_id?: string | null
          status?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          event_type?: string
          failure_code?: string | null
          failure_message?: string | null
          id?: string
          livemode?: boolean | null
          occurred_at?: string
          order_id?: string | null
          status?: string | null
          stripe_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "memorial_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      pogrebna_poduzeca: {
        Row: {
          adresa: string
          broj_recenzija: number
          cijena: string
          created_at: string
          dostupno: boolean
          grad: string
          id: string
          meta_description: string | null
          meta_title: string | null
          naziv: string
          ocjena: number
          slug: string | null
          telefon: string
          updated_at: string
          usluge: string[]
          website_url: string
        }
        Insert: {
          adresa: string
          broj_recenzija?: number
          cijena: string
          created_at?: string
          dostupno?: boolean
          grad: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          naziv: string
          ocjena: number
          slug?: string | null
          telefon: string
          updated_at?: string
          usluge?: string[]
          website_url: string
        }
        Update: {
          adresa?: string
          broj_recenzija?: number
          cijena?: string
          created_at?: string
          dostupno?: boolean
          grad?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          naziv?: string
          ocjena?: number
          slug?: string | null
          telefon?: string
          updated_at?: string
          usluge?: string[]
          website_url?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_code_usage: {
        Row: {
          discount_amount: number
          final_price: number
          id: string
          order_id: string | null
          original_price: number
          product_type: string
          promo_code_id: string
          used_at: string
          user_id: string | null
        }
        Insert: {
          discount_amount: number
          final_price: number
          id?: string
          order_id?: string | null
          original_price: number
          product_type: string
          promo_code_id: string
          used_at?: string
          user_id?: string | null
        }
        Update: {
          discount_amount?: number
          final_price?: number
          id?: string
          order_id?: string | null
          original_price?: number
          product_type?: string
          promo_code_id?: string
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_usage_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          created_by_admin_id: string | null
          current_uses: number
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          max_uses_per_user: number
          product_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          created_by_admin_id?: string | null
          current_uses?: number
          discount_type: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number
          product_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          created_by_admin_id?: string | null
          current_uses?: number
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          max_uses_per_user?: number
          product_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_codes_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      sprovodi: {
        Row: {
          broj_groba: string | null
          created_at: string
          datum_rodenja: string | null
          datum_smrti: string
          datum_sprovoda: string
          dvorana: string | null
          godina: number | null
          grad: string
          groblje: string
          id: string
          ime: string
          izvor: string | null
          kontakt_osoba_ime: string | null
          kontakt_osoba_telefon: string | null
          lokacija: string
          meta_description: string | null
          meta_title: string | null
          parcel: string | null
          prezime: string
          source_key: string | null
          tip_sprovoda: string
          updated_at: string
          vrijeme_sprovoda: string
        }
        Insert: {
          broj_groba?: string | null
          created_at?: string
          datum_rodenja?: string | null
          datum_smrti: string
          datum_sprovoda: string
          dvorana?: string | null
          godina?: number | null
          grad: string
          groblje: string
          id?: string
          ime: string
          izvor?: string | null
          kontakt_osoba_ime?: string | null
          kontakt_osoba_telefon?: string | null
          lokacija: string
          meta_description?: string | null
          meta_title?: string | null
          parcel?: string | null
          prezime: string
          source_key?: string | null
          tip_sprovoda: string
          updated_at?: string
          vrijeme_sprovoda: string
        }
        Update: {
          broj_groba?: string | null
          created_at?: string
          datum_rodenja?: string | null
          datum_smrti?: string
          datum_sprovoda?: string
          dvorana?: string | null
          godina?: number | null
          grad?: string
          groblje?: string
          id?: string
          ime?: string
          izvor?: string | null
          kontakt_osoba_ime?: string | null
          kontakt_osoba_telefon?: string | null
          lokacija?: string
          meta_description?: string | null
          meta_title?: string | null
          parcel?: string | null
          prezime?: string
          source_key?: string | null
          tip_sprovoda?: string
          updated_at?: string
          vrijeme_sprovoda?: string
        }
        Relationships: []
      }
      stripe_webhook_log: {
        Row: {
          error: string | null
          event_type: string
          id: string
          livemode: boolean | null
          processed_at: string | null
          processed_ok: boolean | null
          received_at: string
          stripe_event_id: string
        }
        Insert: {
          error?: string | null
          event_type: string
          id?: string
          livemode?: boolean | null
          processed_at?: string | null
          processed_ok?: boolean | null
          received_at?: string
          stripe_event_id: string
        }
        Update: {
          error?: string | null
          event_type?: string
          id?: string
          livemode?: boolean | null
          processed_at?: string | null
          processed_ok?: boolean | null
          received_at?: string
          stripe_event_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      virtual_candles: {
        Row: {
          active: boolean | null
          created_at: string
          expires_at: string
          id: string
          meta_description: string | null
          meta_title: string | null
          paid: boolean | null
          pokojnik_ime: string
          pokojnik_prezime: string
          poruka: string | null
          stripe_payment_intent_id: string | null
          zapalio_email: string
          zapalio_ime: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          expires_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          paid?: boolean | null
          pokojnik_ime: string
          pokojnik_prezime: string
          poruka?: string | null
          stripe_payment_intent_id?: string | null
          zapalio_email: string
          zapalio_ime: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          expires_at?: string
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          paid?: boolean | null
          pokojnik_ime?: string
          pokojnik_prezime?: string
          poruka?: string | null
          stripe_payment_intent_id?: string | null
          zapalio_email?: string
          zapalio_ime?: string
        }
        Relationships: []
      }
    }
    Views: {
      approved_memorial_quotes: {
        Row: {
          approved_at: string | null
          autor: string | null
          created_at: string | null
          id: string | null
          relacija: string | null
          tekst: string | null
        }
        Insert: {
          approved_at?: string | null
          autor?: string | null
          created_at?: string | null
          id?: string | null
          relacija?: string | null
          tekst?: string | null
        }
        Update: {
          approved_at?: string | null
          autor?: string | null
          created_at?: string | null
          id?: string | null
          relacija?: string | null
          tekst?: string | null
        }
        Relationships: []
      }
      virtual_candles_public: {
        Row: {
          active: boolean | null
          created_at: string | null
          expires_at: string | null
          id: string | null
          is_burning: boolean | null
          paid: boolean | null
          pokojnik_ime: string | null
          pokojnik_prezime: string | null
          poruka: string | null
          zapalio_ime: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_burning?: never
          paid?: boolean | null
          pokojnik_ime?: string | null
          pokojnik_prezime?: string | null
          poruka?: string | null
          zapalio_ime?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          is_burning?: never
          paid?: boolean | null
          pokojnik_ime?: string | null
          pokojnik_prezime?: string | null
          poruka?: string | null
          zapalio_ime?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_blog_report: { Args: { _from: string; _to: string }; Returns: Json }
      admin_delete_memorial: {
        Args: { _memorial_id: string }
        Returns: undefined
      }
      admin_delete_obituary: {
        Args: { _obituary_id: string }
        Returns: undefined
      }
      admin_sales_report: {
        Args: {
          _bucket?: string
          _from: string
          _livemode?: boolean
          _promo?: string
          _source?: string
          _to: string
          _visibility?: string
        }
        Returns: Json
      }
      admin_sales_state: { Args: never; Returns: Json }
      can_edit_memorial: { Args: { _memorial_id: string }; Returns: boolean }
      can_moderate_memorial: {
        Args: { _memorial_id: string }
        Returns: boolean
      }
      claim_admin_role: { Args: never; Returns: boolean }
      claim_capi_delivery: {
        Args: { _session_id: string }
        Returns: {
          attempts: number
          claim_token: string | null
          client_ip: string | null
          client_user_agent: string | null
          created_at: string
          currency: string
          event_id: string
          event_name: string
          event_time: number
          id: string
          last_error: string | null
          locked_at: string | null
          memorial_id: string | null
          meta_body: Json | null
          meta_status: number | null
          next_attempt_at: string | null
          order_id: string | null
          sent_at: string | null
          status: string
          stripe_session_id: string
          updated_at: string
          user_id: string | null
          value: number
        }[]
        SetofOptions: {
          from: "*"
          to: "meta_capi_deliveries"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_old_memorial_quotes: { Args: never; Returns: undefined }
      create_memorial_person: {
        Args: {
          _datum_rodenja?: string
          _datum_smrti?: string
          _groblje?: string
          _ime: string
          _mjesto_rodenja?: string
          _mjesto_smrti?: string
          _prezime: string
          _profesija?: string
        }
        Returns: {
          active: boolean | null
          biografija: string | null
          created_at: string | null
          datum_rodenja: string | null
          datum_smrti: string | null
          datum_ukopa: string | null
          fotografija_url: string | null
          groblje: string | null
          id: string
          ime: string
          kontakt_osoba_email: string | null
          kontakt_osoba_ime: string | null
          kontakt_osoba_telefon: string | null
          kontakt_osobe: Json | null
          meta_description: string | null
          meta_title: string | null
          mjesna_zajednica: string | null
          mjesto_rodenja: string | null
          mjesto_smrti: string | null
          ozalosceni: string[] | null
          paid: boolean | null
          podnaslov: string | null
          prezime: string
          profesija: string | null
          slug: string | null
          stripe_payment_intent_id: string | null
          updated_at: string | null
          vrijeme_ukopa: string | null
        }
        SetofOptions: {
          from: "*"
          to: "obituaries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finish_capi_delivery: {
        Args: {
          _error: string
          _id: string
          _meta_body: Json
          _meta_status: number
          _next_attempt_at: string
          _status: string
          _token: string
        }
        Returns: boolean
      }
      generate_blog_slug: {
        Args: { id_param: string; title_param: string }
        Returns: string
      }
      generate_groblje_slug: {
        Args: { id_param: string; naziv_param: string }
        Returns: string
      }
      generate_memorial_slug: {
        Args: {
          _ime: string
          _prezime: string
          _rodenja: string
          _smrti: string
        }
        Returns: string
      }
      generate_obituary_slug: {
        Args: { id_param: string; ime_param: string; prezime_param: string }
        Returns: string
      }
      generate_pogrebno_poduzece_slug: {
        Args: { id_param: string; naziv_param: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_memorial_owner: { Args: { _memorial_id: string }; Returns: boolean }
      mark_checkout_returned: {
        Args: { _memorial_id: string }
        Returns: undefined
      }
      memorial_allows: {
        Args: { _memorial_id: string; _what: string }
        Returns: boolean
      }
      memorial_is_viewable: { Args: { _memorial_id: string }; Returns: boolean }
      memorial_role: {
        Args: { _memorial_id: string; _user_id: string }
        Returns: string
      }
      memorial_stub_by_slug: {
        Args: { _slug: string }
        Returns: {
          id: string
          is_private: boolean
          slug: string
        }[]
      }
      memorial_tributes_auto_approved: {
        Args: { _memorial_id: string }
        Returns: boolean
      }
      my_withdrawable_orders: {
        Args: never
        Returns: {
          amount_paid: number
          is_free: boolean
          memorial_slug: string
          order_id: string
          paid_at: string
        }[]
      }
      obituary_city_counts: {
        Args: never
        Returns: {
          count: number
          name: string
        }[]
      }
      publish_scheduled_memorials: { Args: never; Returns: number }
      purge_capi_identifiers: { Args: never; Returns: number }
      search_memorial_people: {
        Args: { _limit?: number; _query: string }
        Returns: {
          p_datum_rodenja: string
          p_datum_smrti: string
          p_ime: string
          p_prezime: string
          p_slug: string
        }[]
      }
      virtual_candle_counts: {
        Args: never
        Returns: {
          this_week: number
          today: number
          total: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
