# Launch Feature Matrix

Do not automatically change feature flags during deployment. Validate and change them deliberately in the admin workflow or database procedure approved for launch.

| Feature                       | Current default | Required input                         | Launch recommendation                         | Validation needed                       |
| ----------------------------- | --------------- | -------------------------------------- | --------------------------------------------- | --------------------------------------- |
| payments.paypal               | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.apple_pay            | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.google_pay           | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.cards                | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.payoneer             | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.crypto               | Off             | Provider approval                      | Off                                           | Later provider task                     |
| payments.osrs_gp              | Off             | Business approval                      | Off                                           | Manual policy review                    |
| delivery.priority             | Off             | Price and ETA                          | Off until approved                            | Admin price review                      |
| delivery.express              | Off             | Price and ETA                          | Off until approved                            | Admin price review                      |
| catalogue_card_engine_enabled | On              | None for catalogue display             | On                                            | Public catalogue smoke                  |
| rsn_eligibility_enabled       | Off             | HMAC secret and provider policy        | Off until reviewed                            | RSN lookup, rate-limit and cache test   |
| skilling_calculator_enabled   | Off             | Client-approved rates                  | Off until approved                            | Estimate QA and admin review            |
| bossing_calculator_enabled    | Off             | Client-approved rates                  | Off until approved                            | Estimate QA and admin review            |
| premium_configurator_enabled  | Off             | Client-approved packages               | Off until approved                            | Estimate QA and admin review            |
| global_pricing_enabled        | Off             | Published pricing revision             | Off until approved                            | Estimate comparison                     |
| gold_engine_enabled           | Off             | Buy/sell rates and stock               | Off until approved                            | Gold estimate and inventory QA          |
| account_marketplace_enabled   | Off             | Approved listings                      | Off until approved                            | Listing privacy and public QA           |
| custom_account_build_enabled  | Off             | Pricing rules and attachment policy    | Off until approved                            | Request and attachment QA               |
| product_marketplace_enabled   | Off             | Approved products and stock            | Off until approved                            | Product browsing and stock QA           |
| cart_enabled                  | Off             | Checkout approval                      | Enable only with guest_checkout decision      | Cart smoke and cookie review            |
| guest_checkout_enabled        | Off             | Manual payment instructions            | Off until manual flow approved                | Checkout without external payment       |
| external_payments_enabled     | Off             | Approved provider credentials          | Off                                           | Provider integration task               |
| payment_webhooks_enabled      | Off             | Verified provider signatures           | Off                                           | Webhook signature and idempotency tests |
| payment_refunds_enabled       | Off             | Refund policy and operator permissions | Off unless manual workflow supports it safely | Refund permission and audit review      |
| customer_accounts_enabled     | Off             | Client approval                        | Off or staged limited launch                  | Registration/login QA                   |
| customer_registration_enabled | Off             | Client approval and email plan         | Off until approved                            | Registration and verification path      |
| customer_dashboard_enabled    | Off             | Client approval                        | Off until approved                            | Authenticated dashboard smoke           |
| live_chat_enabled             | Off             | Chat hours and staffing                | Off until approved                            | Admin/support QA                        |
| guest_live_chat_enabled       | Off             | Chat operating policy                  | Off until approved                            | Guest chat HTTP fallback                |
| customer_live_chat_enabled    | Off             | Customer support policy                | Off until approved                            | Customer chat QA                        |
| chat_realtime_enabled         | Off             | Explicit origins and PM2 gateway       | Enable only after staging WebSocket test      | Socket.IO through Nginx                 |

Recommended initial payment state:

- `PAYMENT_PROVIDER=MANUAL_REVIEW`
- `EXTERNAL_PAYMENTS_ENABLED=false`
- `PAYMENT_WEBHOOKS_ENABLED=false`
- `PAYMENT_REFUNDS_ENABLED=false`

Recommended initial email state:

- `EMAIL_DELIVERY_ENABLED=false`

Recommended chat state:

- Keep realtime off until `/socket.io` is verified through staging HTTPS and the client approves chat operating hours.
