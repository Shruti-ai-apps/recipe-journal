## Code Review: Deterministic Scaling + LLM Smart Scaling

Date: 2026-01-19

### Scope
- Deterministic scaling: API `/api/recipes/scale` + `lib/scaling/ScalingService`
- LLM smart scaling: API `/api/recipes/scale-smart` + `lib/llm/*`
- UI integration: `app/page` (switching between deterministic vs. smart outputs)

---

### Current Behavior (As-Is)
- Deterministic scaling always produces scaled servings, scaled ingredients, and generic scaling tips; it supports range quantities, friendly vs. exact rounding, basic unit-system conversion, and special handling for tiny quantities (“pinch” / “to taste”).
- Smart scaling is an optional, separate API call on top of deterministic scaling. The UI first calls deterministic scaling, then (when enabled) calls smart scaling and replaces only the ingredient list + tips with the smart result.
- Smart scaling uses Gemini to produce per-ingredient “advisory” metadata (category, adjustment flags, reasons) plus tips and an optional cooking-time note. Numeric scaling remains deterministic and multiplier-correct even if the model suggests sublinear adjustments.
- If the model call fails or the response cannot be parsed, smart scaling returns deterministic linear scaling plus basic tips and marks the result as not AI-powered.
- Smart-scaling rate limiting is per-instance in memory and keyed primarily by IP headers; caching is implemented in browser local storage and therefore does not apply to server-side smart-scaling requests.
- API response semantics differ between endpoints: deterministic scaling errors follow the standard success=false pattern, while smart scaling can return a successful HTTP response even when the AI portion “failed” (AI success is represented inside the returned data).

---

### After-Change Behavior (Recommended Target)
- One consistent scaling pipeline: deterministic scaling remains the source of truth for quantities and display formatting (including tiny-amount rules and unit conversions), while the LLM only enriches the result with categories, practical tips, and optional cooking-time guidance.
- Smart scaling becomes operationally scalable: server-side caching, distributed/bounded rate limiting, and request coalescing prevent repeated LLM calls for identical inputs and reduce burst amplification.
- The LLM contract matches actual usage: prompts request only the metadata and tips the app consumes, minimizing tokens and reducing parse failures.
- API semantics are consistent and easy to reason about: success/error signaling and metadata (especially cache-hit reporting) are standardized across endpoints.
- Observability is first-class: metrics/logs capture latency, cache efficiency, and LLM failure modes without storing sensitive or bulky model outputs.

---

### Review Comments

Must-have
- Make smart-scaling caching real for the server path (and ensure cache keys change when recipe content changes), otherwise cost/latency scale directly with traffic and repeated user actions.
- Replace per-instance in-memory rate limiting with a distributed or bounded approach; the current mechanism is both bypassable and memory-growth-prone under high-cardinality identifiers.
- Align the “smart scaling” promise with behavior: today the model cannot actually adjust quantities (only annotate and advise). Either update messaging/contract to “advisory AI” or explicitly support controlled, opt-in quantity adjustments for specific categories.
- Unify deterministic vs. smart display rules: smart scaling currently bypasses deterministic tiny-amount handling and unit conversion, which can cause inconsistent ingredient display when toggling.
- Remove or implement unused/duplicate API surface (for example, parallel “targetServings” fields and duplicated smart-scaling types), to avoid drift and integration bugs over time.

Nice-to-have
- Debounce or coalesce repeated smart-scaling calls from UI interactions (especially rapid multiplier changes) to reduce unnecessary load and improve responsiveness.
- Add single-flight request coalescing on the server for identical recipe+multiplier requests to avoid thundering-herd spikes.
- Improve model-output robustness (structured JSON mode if supported, stricter validation, clearer error classification) while keeping fallback behavior.
- Expand unit conversion to choose “best” units (e.g., grams to kilograms, milliliters to liters) rather than only mapping to a single fixed target unit.
- Fix visible character-encoding artifacts in UI strings and range separators to prevent garbled text in tips and ingredient ranges.

---

### Impact

User experience
- Current: toggling smart scaling can change formatting rules; smart scaling may feel inconsistent with claims when it only annotates rather than adjusts.
- After change: consistent ingredient formatting across modes, faster responses, fewer intermittent smart-scaling failures, and clearer expectations.

Cost and performance
- Current: smart-scaling cost and latency scale linearly with usage; repeated calls for the same recipe/multiplier are not avoided.
- After change: server caching + coalescing + prompt minimization reduce provider calls and token usage, improving both throughput and cost predictability.

Reliability and operations
- Current: rate limits are not reliable across instances; cache-hit reporting is not meaningful; troubleshooting is harder without clear metrics.
- After change: stable rate limits, bounded memory usage, accurate cache metrics, and better incident triage via structured logs and request IDs.

Maintainability
- Current: duplicated types and partially redundant “targetServings” fields increase drift risk; two scaling implementations can diverge in edge-case handling.
- After change: a single scaling source of truth and a smaller, explicit LLM contract reduce regressions and speed up future enhancements.

---

### Long-Run Usefulness of This Review
- Establishes a durable contract: deterministic scaling defines quantities and display; LLM enriches only metadata and guidance.
- Provides a production-readiness checklist for any LLM endpoint (distributed rate limits, server caching, coalescing, observability, consistent API semantics).
- Reduces future rework by documenting where current behavior diverges from product expectations and where the system will otherwise drift over time.

