# Recipe Journal - Pending Implementation

**Date:** January 2026
**Branch:** `phase-2-cloud-and-auth`
**Remaining Progress:** 6% of planned features

---

## Executive Summary

The Recipe Journal application is 94% complete. The remaining features are primarily focused on internationalization (Marathi language support) and optional enhancements that were deprioritized in favor of core functionality.

---

## Milestone 6: Internationalization (Marathi)

**Status:** NOT STARTED
**Priority:** Medium
**Estimated Effort:** 2-3 days

### 6.1 i18n Framework Setup
- Install next-intl or react-i18next
- Configure i18n routing
- Set up locale detection

### 6.2 Translation Files
- Create English translations (messages/en.json)
- Create Marathi translations (messages/mr.json)
- Cover all UI text strings

### 6.3 Translation Categories Required
- Common strings (app name, buttons, actions)
- Home page strings
- Recipe display strings
- Favorites page strings
- Authentication strings
- Error messages
- Offline/sync status messages

### 6.4 Language Switcher Component
- Toggle between English and Marathi
- Save language preference to localStorage
- Sync preference with user profile (if logged in)

### 6.5 Layout Updates
- Wrap app with i18n provider
- Update all components to use translation hooks
- Handle text direction (LTR for both languages)

### 6.6 Acceptance Criteria
- [ ] User can switch between English and Marathi
- [ ] All UI text is translated
- [ ] Language preference persists across sessions
- [ ] Devanagari script renders correctly
- [ ] No broken layouts with Marathi text
- [ ] Numbers and dates formatted per locale

---

## Phase 4: Optional Enhancements

**Status:** NOT STARTED
**Priority:** Low
**Estimated Effort:** 3-4 days (all features combined)

### 4.1 Shopping List Generation
- Combine ingredients from multiple recipes
- Group ingredients by category (produce, dairy, pantry, etc.)
- Checkbox to mark items as purchased
- Export to text/copy to clipboard
- Clear completed items

**Components Required:**
- ShoppingList page
- ShoppingListItem component
- CategoryGroup component
- Add from recipe button

### 4.2 Recipe Editing
- Edit imported recipe ingredients
- Modify quantities, units, and items
- Reorder instructions via drag-and-drop
- Add/remove ingredients and steps
- Save edited version as new recipe

**Components Required:**
- RecipeEditor component
- EditableIngredient component
- EditableInstruction component
- Save/Cancel controls

### 4.3 Import History
- Track recently imported URLs
- Quick re-import from history
- Clear history option
- Limit history to last 20 entries

**Components Required:**
- ImportHistory component
- HistoryItem component
- Clear history button

### 4.4 Enhanced Scaling Categories
- Categorize ingredients (discrete, leavening, spices, etc.)
- Apply category-specific scaling rules
- Show scaling notes per category
- Manual category override

**Already Partially Implemented:**
- Smart LLM scaling handles most of this
- Could add rule-based fallback for when AI is unavailable

---

## Phase 3 (Original Plan): Deprioritized Features

**Status:** NOT PLANNED
**Priority:** Very Low

These features from the original plan were intentionally deprioritized:

### Browser Extension
- Quick save recipes from any page
- One-click import to Recipe Journal
- Browser toolbar integration

**Reason Deprioritized:** Significant development effort for marginal convenience gain. Users can copy/paste URLs.

### Marathi Recipe Parsing
- Parse recipes written in Devanagari script
- Handle Marathi ingredient names
- Marathi measurement terms

**Reason Deprioritized:** Complex NLP challenge. Current URL-based import handles most use cases.

### Meal Planning
- Weekly meal calendar
- Drag recipes to calendar slots
- Generate shopping lists from meal plan
- Nutritional tracking

**Reason Deprioritized:** Scope creep beyond core recipe journal functionality.

### Premium/Monetization
- Stripe payment integration
- Premium feature tiers
- Usage limits for free tier
- Subscription management

**Reason Deprioritized:** Premature optimization. Focus on building useful tool first.

---

## Implementation Priority Matrix

```
                    HIGH VALUE
                        |
     +------------------+------------------+
     |                  |                  |
     |                  |  Milestone 6:    |
     |                  |  i18n (Marathi)  |
     |                  |                  |
LOW -+------------------+------------------+- HIGH
EFFORT                  |                  |  EFFORT
     |                  |                  |
     |  Import History  |  Shopping List   |
     |  (Quick Win)     |  Recipe Editing  |
     |                  |                  |
     +------------------+------------------+
                        |
                    LOW VALUE
```

---

## Recommended Implementation Order

### If Marathi Support is Needed:

| Order | Feature | Effort | Notes |
|-------|---------|--------|-------|
| 1 | i18n Framework Setup | 2-3 hours | Foundation for all translations |
| 2 | English Translations | 2-3 hours | Extract all strings |
| 3 | Marathi Translations | 4-5 hours | Translate all strings |
| 4 | Language Switcher | 1-2 hours | UI component |
| 5 | Testing & Polish | 2-3 hours | Layout fixes, edge cases |

### If Only Optional Features are Needed:

| Order | Feature | Effort | Notes |
|-------|---------|--------|-------|
| 1 | Import History | 2 hours | Quick win, improves UX |
| 2 | Shopping List | 5-6 hours | High value for meal prep |
| 3 | Recipe Editing | 4-5 hours | Power user feature |

---

## Technical Debt & Improvements

These are not new features but areas that could be improved:

### Testing
- Add more unit tests for services
- Add integration tests for API routes
- Add E2E tests for critical flows
- Improve test coverage

### Performance
- Audit and optimize bundle size
- Implement code splitting
- Add performance monitoring
- Optimize image loading

### Documentation
- Add API documentation
- Create user guide
- Document deployment process
- Add contributing guidelines

### Accessibility
- Audit for WCAG compliance
- Add ARIA labels where missing
- Test with screen readers
- Improve keyboard navigation

---

## Dependencies Required for Pending Features

### For Internationalization (Milestone 6):
- next-intl (recommended for Next.js)
- OR react-i18next + i18next

### For Shopping List:
- No additional dependencies required
- Could add drag-and-drop library for reordering

### For Recipe Editing:
- Could add @dnd-kit for drag-and-drop instruction reordering
- Form library (react-hook-form already may be present)

---

## Summary

| Category | Status | Items |
|----------|--------|-------|
| **Must Complete** | Pending | Milestone 6 (i18n) if Marathi needed |
| **Nice to Have** | Not Started | Shopping List, Recipe Editing, Import History |
| **Deprioritized** | Not Planned | Browser Extension, Meal Planning, Monetization |

**Estimated Remaining Effort:**
- With i18n: 2-3 days
- Without i18n: 1-2 days (optional features only)
- Total if all features: 5-7 days

---

## Decision Points

Before implementing remaining features, consider:

1. **Is Marathi support needed?**
   - If yes: Prioritize Milestone 6
   - If no: Skip entirely or defer

2. **Which optional features provide most value?**
   - Shopping List: Best for meal preppers
   - Recipe Editing: Best for power users
   - Import History: Quick win for everyone

3. **What is the target audience?**
   - Personal use: Current features may be sufficient
   - Public launch: Consider all pending features
   - Regional focus: i18n becomes critical

---

*Document Generated: January 2026*
