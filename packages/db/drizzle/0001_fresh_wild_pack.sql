CREATE TYPE "public"."payout_status" AS ENUM('pending', 'in_discussion', 'cancelled', 'approved', 'rejected', 'completed');--> statement-breakpoint
CREATE TABLE "showings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"seat_map_id" text,
	"name" varchar(255),
	"start_time" timestamp NOT NULL,
	"end_time" timestamp NOT NULL,
	"ticket_sale_start" timestamp,
	"ticket_sale_end" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_email_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"sender_user_id" text NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"organizer_id" text NOT NULL,
	"status" "payout_status" DEFAULT 'pending' NOT NULL,
	"requested_amount" numeric NOT NULL,
	"agreed_amount" numeric,
	"request_date" timestamp DEFAULT now() NOT NULL,
	"completion_date" timestamp,
	"proof_document_url" text
);
--> statement-breakpoint
CREATE TABLE "ratings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"stars" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "organizer_rating_stats" (
	"organizer_id" text PRIMARY KEY NOT NULL,
	"total_stars" integer DEFAULT 0 NOT NULL,
	"ratings_count" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "organizers" ADD COLUMN "tax_code" varchar(50);--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "showing_id" uuid;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "max_tickets_by_order" integer;--> statement-breakpoint
ALTER TABLE "showings" ADD CONSTRAINT "showings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_email_logs" ADD CONSTRAINT "ticket_email_logs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_email_logs" ADD CONSTRAINT "ticket_email_logs_sender_user_id_user_id_fk" FOREIGN KEY ("sender_user_id") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_rating_stats" ADD CONSTRAINT "organizer_rating_stats_organizer_id_organizers_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."organizers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "showings_event_id_idx" ON "showings" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_ticket_email_logs_ticket_recipient" ON "ticket_email_logs" USING btree ("ticket_id","recipient_email");--> statement-breakpoint
CREATE INDEX "idx_ticket_email_logs_sent_at" ON "ticket_email_logs" USING btree ("sentAt");--> statement-breakpoint
CREATE INDEX "idx_ticket_email_logs_ticket_recent" ON "ticket_email_logs" USING btree ("ticket_id","sentAt");--> statement-breakpoint
CREATE INDEX "payout_requests_event_id_index" ON "payout_requests" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "payout_requests_organizer_id_index" ON "payout_requests" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "payout_requests_request_date_index" ON "payout_requests" USING btree ("request_date");--> statement-breakpoint
CREATE INDEX "idx_event_ratings_event_id" ON "ratings" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "idx_event_ratings_user_id" ON "ratings" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_showing_id_showings_id_fk" FOREIGN KEY ("showing_id") REFERENCES "public"."showings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "areas_event_id_idx" ON "areas" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "areas_showing_id_idx" ON "areas" USING btree ("showing_id");--> statement-breakpoint
CREATE INDEX "events_organizer_id_idx" ON "events" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "rows_area_id_idx" ON "rows" USING btree ("area_id");--> statement-breakpoint
CREATE INDEX "seats_row_id_idx" ON "seats" USING btree ("row_id");