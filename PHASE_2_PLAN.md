# Phase 2: Cloud Sync, Authentication & Smart Features

**Branch:** `phase-2-cloud-and-auth`
**Created:** January 2026
**Status:** Planning

---

## Overview

Phase 2 transforms the Recipe Journal from a local-only app to a cloud-enabled, authenticated application with smart AI-powered features.

---

## Features Breakdown

### 2.1 User Authentication (Priority: High)
### 2.2 Cloud Database & Sync (Priority: High)
### 2.3 Smart Scaling with LLM (Priority: Medium)
### 2.4 PWA / Offline Mode (Priority: Medium)
### 2.5 Internationalization - Marathi UI (Priority: Low)

---

## Detailed Implementation Plan

---

## 2.1 User Authentication

**Goal:** Allow users to create accounts and sign in to sync their recipes across devices.

### Technology Stack
| Component | Technology | Reason |
|-----------|------------|--------|
| Auth Provider | Supabase Auth | Free tier, easy setup, multiple providers |
| Session Management | Supabase JS Client | Built-in session handling |
| Social Login | Google, GitHub | Most common providers |

### Implementation Steps

#### Step 1: Supabase Project Setup
- [ ] Create Supabase project at supabase.com
- [ ] Get API URL and anon key
- [ ] Configure environment variables
- [ ] Set up auth providers (Email, Google, GitHub)

#### Step 2: Install Dependencies
```bash
npm install @supabase/supabase-js
```

#### Step 3: Create Supabase Client
```
lib/supabase/client.ts
├── createClient()
├── getSession()
└── getUser()
```

#### Step 4: Auth Context & Hooks
```
contexts/AuthContext.tsx
├── AuthProvider
├── useAuth() hook
├── signIn()
├── signUp()
├── signOut()
└── resetPassword()
```

#### Step 5: Auth UI Components
```
components/auth/
├── LoginForm.tsx
├── SignupForm.tsx
├── ForgotPasswordForm.tsx
├── SocialLoginButtons.tsx
├── UserMenu.tsx
└── ProtectedRoute.tsx
```

#### Step 6: Auth Pages
```
app/
├── login/page.tsx
├── signup/page.tsx
├── forgot-password/page.tsx
└── callback/page.tsx (OAuth redirect)
```

### Acceptance Criteria
- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] User can sign in with Google
- [ ] User can sign out
- [ ] User can reset password
- [ ] Session persists across browser refresh
- [ ] Protected routes redirect to login

---

## 2.2 Cloud Database & Sync

**Goal:** Store user recipes in the cloud and sync across devices.

### Database Schema

```sql
-- Users (managed by Supabase Auth)

-- Recipes Table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  source_url TEXT,
  image_url TEXT,
  servings_amount DECIMAL,
  servings_unit TEXT,
  prep_time TEXT,
  cook_time TEXT,
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  last_scaled_multiplier DECIMAL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own recipes"
  ON recipes FOR ALL
  USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_is_favorite ON recipes(is_favorite);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
```

### Implementation Steps

#### Step 1: Database Setup
- [ ] Create `recipes` table in Supabase
- [ ] Enable Row Level Security (RLS)
- [ ] Create RLS policies
- [ ] Create indexes for performance

#### Step 2: Database Service Layer
```
lib/supabase/
├── client.ts
├── recipes.ts
│   ├── getRecipes()
│   ├── getRecipeById()
│   ├── createRecipe()
│   ├── updateRecipe()
│   ├── deleteRecipe()
│   ├── searchRecipes()
│   └── getFavorites()
└── sync.ts
    ├── syncLocalToCloud()
    ├── syncCloudToLocal()
    └── mergeConflicts()
```

#### Step 3: Migration Strategy (localStorage → Cloud)
```
services/migration.ts
├── detectExistingLocalData()
├── promptUserToMigrate()
├── migrateLocalToCloud()
└── clearLocalAfterMigration()
```

#### Step 4: Offline-First Architecture
```
services/sync/
├── SyncManager.ts
├── ConflictResolver.ts
├── OfflineQueue.ts
└── SyncStatus.tsx (UI indicator)
```

### Data Flow
```
User Action → Local State → IndexedDB (offline) → Supabase (online)
                    ↑                                    ↓
                    └────────── Sync on reconnect ──────┘
```

### Acceptance Criteria
- [ ] Recipes save to cloud when user is logged in
- [ ] Recipes sync across devices
- [ ] Offline changes sync when back online
- [ ] Existing localStorage data can be migrated
- [ ] Conflict resolution works correctly
- [ ] Guest mode still works (localStorage only)

---

## 2.3 Smart Scaling with LLM

**Goal:** Use Claude AI to intelligently scale recipes, handling edge cases like eggs, leavening, and spices.

### Why LLM?
| Scenario | Basic Math | LLM |
|----------|-----------|-----|
| 2 eggs × 0.5 | 1 egg | "1 egg or 2 tbsp egg substitute" |
| 1 tsp baking soda × 3 | 3 tsp | "2.5 tsp (leavening doesn't scale linearly)" |
| Salt to taste × 2 | Salt to taste × 2 | "Start with 1.5x salt, adjust to taste" |
| 350°F × 2 | 700°F | "350°F (temperature stays same, increase time)" |

### Technology Stack
| Component | Technology |
|-----------|------------|
| LLM | Claude 3.5 Haiku (fast, cheap) |
| API | Anthropic API |
| Caching | Redis or Supabase |

### Implementation Steps

#### Step 1: API Setup
- [ ] Get Anthropic API key
- [ ] Set up environment variables
- [ ] Create API route for scaling

#### Step 2: Scaling Service
```
lib/llm/
├── client.ts (Anthropic client)
├── prompts.ts (scaling prompts)
├── scaleWithAI.ts
└── cache.ts (cache results)
```

#### Step 3: API Route
```
app/api/recipes/scale-smart/route.ts
├── POST handler
├── Rate limiting
├── Response caching
└── Error handling
```

#### Step 4: Scaling Prompt
```
You are a professional chef helping scale recipes.

Recipe: {recipe}
Scale to: {multiplier}x

For each ingredient:
1. Calculate the scaled amount
2. If it's a problematic ingredient (eggs, leavening, spices), provide guidance
3. Round to practical measurements

Also provide:
- Cooking time adjustments
- Temperature adjustments (if any)
- Tips for the scaled version
```

#### Step 5: UI Integration
```
components/recipe/
├── SmartScalingControls.tsx
├── ScalingTips.tsx
└── AIBadge.tsx (indicates AI-enhanced)
```

### Cost Estimation
| Usage | Cost |
|-------|------|
| Per recipe scale | ~$0.002 - $0.005 |
| 1000 scales/month | ~$2 - $5 |

### Acceptance Criteria
- [ ] AI scaling handles eggs intelligently
- [ ] AI scaling handles leavening agents
- [ ] AI provides cooking tips for scaled recipes
- [ ] Results are cached to reduce API calls
- [ ] Fallback to basic math if API fails
- [ ] Loading state while AI processes

---

## 2.4 PWA / Offline Mode

**Goal:** Make the app installable and functional offline.

### PWA Features
| Feature | Description |
|---------|-------------|
| Installable | Add to home screen on mobile/desktop |
| Offline | Works without internet |
| Background Sync | Syncs when back online |
| Push Notifications | Recipe reminders (future) |

### Implementation Steps

#### Step 1: Web App Manifest
```json
// public/manifest.json
{
  "name": "Recipe Journal",
  "short_name": "Recipes",
  "description": "Import, scale, and save your favorite recipes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#e67e22",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

#### Step 2: Service Worker
```
public/sw.js
├── Cache static assets
├── Cache API responses
├── Offline fallback page
└── Background sync queue
```

#### Step 3: next-pwa Integration
```bash
npm install next-pwa
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  // Next.js config
});
```

#### Step 4: Offline Data Storage
```
lib/offline/
├── indexedDB.ts
├── offlineStorage.ts
└── syncQueue.ts
```

#### Step 5: Offline UI Indicators
```
components/common/
├── OfflineBanner.tsx
├── SyncStatus.tsx
└── InstallPrompt.tsx
```

### Caching Strategy
| Resource | Strategy |
|----------|----------|
| Static assets (JS, CSS) | Cache First |
| Images | Stale While Revalidate |
| API responses | Network First, Cache Fallback |
| User data | IndexedDB + Background Sync |

### Acceptance Criteria
- [ ] App can be installed on mobile/desktop
- [ ] App works offline (cached pages)
- [ ] Recipes are available offline
- [ ] Changes made offline sync when back online
- [ ] Offline indicator shows when disconnected
- [ ] Install prompt appears for eligible users

---

## 2.5 Internationalization (Marathi UI)

**Goal:** Support Marathi language for the user interface.

### Implementation Steps

#### Step 1: i18n Setup
```bash
npm install next-intl
```

#### Step 2: Translation Files
```
messages/
├── en.json
└── mr.json (Marathi)
```

#### Step 3: Sample Translations
```json
// messages/en.json
{
  "home": {
    "title": "Recipe Journal",
    "subtitle": "Import, scale, and save your favorite recipes",
    "urlPlaceholder": "Paste recipe URL here...",
    "getRecipe": "Get Recipe"
  },
  "recipe": {
    "ingredients": "Ingredients",
    "instructions": "Instructions",
    "servings": "Servings",
    "scale": "Scale"
  }
}

// messages/mr.json
{
  "home": {
    "title": "रेसिपी जर्नल",
    "subtitle": "तुमच्या आवडत्या रेसिपी आयात करा, स्केल करा आणि सेव्ह करा",
    "urlPlaceholder": "रेसिपी URL इथे पेस्ट करा...",
    "getRecipe": "रेसिपी मिळवा"
  },
  "recipe": {
    "ingredients": "साहित्य",
    "instructions": "कृती",
    "servings": "वाढणी",
    "scale": "प्रमाण"
  }
}
```

#### Step 4: Language Switcher
```
components/common/
└── LanguageSwitcher.tsx
```

#### Step 5: RTL Support (if needed)
- Marathi uses Devanagari script (LTR)
- No RTL support needed

### Acceptance Criteria
- [ ] User can switch between English and Marathi
- [ ] All UI text is translated
- [ ] Language preference is saved
- [ ] Devanagari script renders correctly
- [ ] Dates/numbers formatted correctly

---

## Implementation Order

| Order | Feature | Effort | Dependencies |
|-------|---------|--------|--------------|
| 1 | User Authentication | 1 week | Supabase project |
| 2 | Cloud Database | 1 week | Auth complete |
| 3 | Data Migration | 3 days | Database complete |
| 4 | Smart Scaling (LLM) | 1 week | None |
| 5 | PWA / Offline | 1 week | Database complete |
| 6 | Internationalization | 3 days | None |

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Anthropic (for LLM)
ANTHROPIC_API_KEY=your_anthropic_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing Plan

| Feature | Test Type |
|---------|-----------|
| Auth flows | E2E (Playwright) |
| Database CRUD | Integration tests |
| Sync logic | Unit tests |
| LLM scaling | Unit tests + mocks |
| PWA | Manual + Lighthouse |
| i18n | Unit tests |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| User signups | Track conversion |
| Recipes synced | Average per user |
| LLM usage | Calls per recipe |
| PWA installs | Install rate |
| Offline usage | Sessions offline |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Supabase downtime | Offline-first architecture |
| LLM API costs | Caching, rate limiting |
| Migration data loss | Backup before migration |
| Complex sync conflicts | Simple "last write wins" initially |

---

## Next Steps

1. [ ] Set up Supabase project
2. [ ] Install Supabase dependencies
3. [ ] Create auth context and hooks
4. [ ] Build login/signup UI
5. [ ] Create database schema
6. [ ] Implement CRUD operations
7. [ ] Build migration flow
8. [ ] Add LLM scaling
9. [ ] Implement PWA
10. [ ] Add Marathi translations

---

*Plan created: January 2026*
