# Storefront service fixes

Implement the customer's dedicated Dizana's Quiver page, distinct quest membership tags, advisory skilling method levels, and bounded Infernal artwork. Match the existing public design on desktop and mobile.

Plan: preserve the premium configuration and server pricing architecture; route Quiver links to `/quiver`; keep all Quiver content separate from Infernal; change the shared skilling estimator used by quotes and checkout; verify invalid progression and unavailable options remain rejected. Fix CSS specificity and bound artwork dimensions. Test, document, and deliver the website changes under the user's authorization.

Risks: no existing Quiver premium configuration was found. The site's published Colosseum completion rate was subsequently verified and is reused for initialization; no new price is invented. The atomic seed preserves all subsequent admin edits. Homepage link repair targets only the legacy Quiver destination. No destructive migration or payment changes.
