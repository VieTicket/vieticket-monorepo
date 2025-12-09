Order/Checkout/Refund To-Do

1) Order/seat schema hardening
- [x] Add `event_id`/`showing_id` to orders and seat_holds; make areas.showing_id non-null; backfill/migrations.
- [x] Add uniqueness: partial unique index for active holds on `seat_id`; unique on tickets `seat_id` (or `(showing_id, seat_id)` if seats are global).
- [x] Add `orders.expires_at` + status enum extensions (`pending_payment/expired/cancelled/partial_refunded`) and hold TTL policy.
- [ ] Write migrations to backfill new order/hold columns and extend Postgres enums to include new statuses.

2) Checkout/locking flow
- [ ] Make availability + hold creation a single transaction with locking that validates seats belong to the showing.
- [ ] Make payment confirmation a single transaction (status update → holds confirm → tickets insert) and reject if order/holds expired.
- [ ] Decouple VNPay return from session; locate order via signed `vnp_TxnRef`.

3) General admission path
- [ ] Use “virtual” GA seats (pre-generated seats in an area/row per showing) and COUNT/locks for capacity; no new inventory table.
- [ ] Implement GA checkout: select available GA seat_ids under lock, create holds, create order, and reuse seat-based ticket flow.
- [ ] Integrate GA path into existing APIs without modifying event creation schema.

4) Refund engine (after checkout fixes)
- [ ] Implement lifecycle per policy (statuses and approvals for personal/cancelled/postponed/fraud).
- [ ] Add amount calculator with timing windows and allowed percentages; audit override fields.
- [ ] Extend enums to include PSP refund failure state (e.g., `payment_failed`) and store PSP error metadata for manual resolution by admin/platform.
- [ ] Enforce refunded-total cap per order and ticket-level refund uniqueness; update ticket statuses on refund and release seats/GA capacity back to available.

5) Ops/queues + async
- [ ] Add QStash jobs for expiring pending orders/holds with a callback that queries PSP status before setting paid/failed/expired and clearing holds; add payment reconciliation and async email dispatch.
- [ ] Keep mailer signature but send via queued worker/handler.

6) Migrations and tests
- [ ] Write migrations for all schema changes; add tests for checkout locking, GA capacity, refund calculator, and payment callback.
