# Design Proposals (Checkout, Orders, Refunds)

## 1) Seat locking and data model guards
- Add showing context everywhere: `orders.showing_id`, `orders.event_id`, `seat_holds.showing_id` (non-null), and make `areas.showing_id` non-null going forward. Validate selected seats belong to the showing during checkout. Also apply with event context if not exists in these schemas.
- Enforce uniqueness for active holds and sold seats: partial unique index on `seat_holds(seat_id)` where `expires_at > now()` and `is_confirmed = false`; unique on `tickets(seat_id)` (or `(showing_id, seat_id)` if seat ids are global) to prevent double-sell.
- Move availability check plus hold creation into a single transaction using `FOR UPDATE SKIP LOCKED` (or constraint errors) to avoid races.
- Add `orders.expires_at`; during payment confirmation, reject if `orders.expires_at` or any `seat_holds.expires_at` is past. Schedule hold cleanup on expiry.

## 2) Payment flow decoupling
- Make VNPay return handler provider-agnostic and unauthenticated: trust signature + `vnp_TxnRef` to locate the order; fall back to a secondary lookup on metadata.
- Collapse payment confirmation into one DB transaction: verify payment → update order status → confirm holds → insert tickets (with event/showing/price snapshot) → emit domain events for email/queues.
- Introduce order statuses: `pending_payment`, `paid`, `failed`, `expired`, `cancelled`, `refunded`, `partial_refunded` (if partials are supported).
- At order creation, schedule a verification callback (QStash) for TTL (e.g., 15m). The callback calls an internal API that queries the PSP (VNPay) for authoritative status before expiring or marking failed; only then clear holds/mark expired.

## 3) General admission support (virtual seats, no new tables)
- Model GA capacity as pre-generated “virtual” seats in an area/row for the showing (e.g., GA-1..GA-N). No new inventory/order_items tables.
- Price stays on the GA area (or optional `showings.ga_price/ga_capacity` to seed seats); `tickets.seat_id` remains required—GA seats are just identifiers in the existing seats table.
- Availability: within one transaction, lock relevant GA seats/holds; count paid tickets (`tickets.status in active/used`) + active holds (`seat_holds.expires_at > now()`) and ensure `held + sold + requested <= capacity`. Select the needed GA seat_ids with `FOR UPDATE SKIP LOCKED`, create holds, and proceed.
- Payment confirmation: same transaction pattern—verify PSP, check expiry, create tickets for the held GA seat_ids, mark order paid, clear holds.
- Refunds: set GA tickets to `refunded` (or delete if desired) so availability counts only consume `active/used` tickets; released seats become available for future sales.

## 4) Refund flow (per policy)
- Introduce refund statuses: `requested`, `pending_organizer`, `pending_admin`, `approved`, `rejected`, `processing`, `completed`, `failed`, `partial` (if amount < base).
- If PSP refund call fails, set refund status to a PSP-failed terminal state (e.g., `payment_failed`) with PSP error metadata; ops manually resolves and marks final status.
- Store policy context: `reason`, `percentage_applied`, `base_amount`, `amount`, `calculation_basis` (tickets sum vs order total), `requested_at`, `decision_at`, `processed_at`, `approved_by`, `rejection_reason`.
- Link refund to tickets via join table; enforce tickets belong to the order and are not already refunded; update `tickets.status` → `refunded` when a refund is processed and release seats/GA capacity back to available.
- Guardrails: check constraint or trigger to ensure cumulative refunded amount per order ≤ `orders.total_amount`; for personal reason enforce timing windows (>=168h → 80%, 120–168h → 60%, else 0).
- Admin override: store previous percentage/amount, new percentage, actor, and timestamp; allow only policy-valid percentages (0/60/80/90/100).

## 5) Queues and timeouts
- Use Upstash QStash (when available) for: (a) expiring pending orders/holds after TTL, (b) payment status reconciliation by querying PSP before status change, (c) email send trigger after payment.
- Keep mail API signature but move sending to a queued worker/route so checkout completion is not blocked by SMTP/HTTP latency.
