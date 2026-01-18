# Phase 2: Cloud & Auth - Detailed Implementation Plan

**Branch:** `phase-2-cloud-and-auth`
**Start Date:** January 2026
**Status:** Ready to Start

---

## Current State Summary

Phase 1 is complete with:
- Recipe parsing from URLs
- Ingredient scaling (0.1x to 10x)
- Local favorites (localStorage)
- Favorites page with search
- Next.js 13 App Router architecture
- Jest tests in place

---

## Phase 2 Implementation Roadmap

```
MILESTONE 1: Authentication Foundation     [~3 days]
MILESTONE 2: Cloud Database Setup          [~2 days]
MILESTONE 3: Data Migration & Sync         [~2 days]
MILESTONE 4: Smart LLM Scaling             [~2 days]
MILESTONE 5: PWA & Offline                 [~2 days]
MILESTONE 6: Internationalization          [~2 days]
```

---

## MILESTONE 1: Authentication Foundation

### Prerequisites (Manual Steps)
- [ ] Create Supabase project at https://supabase.com
- [ ] Enable Email/Password auth provider
- [ ] Enable Google OAuth provider
- [ ] Enable GitHub OAuth provider (optional)
- [ ] Copy API URL and anon key

### Step 1.1: Install Dependencies
```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### Step 1.2: Environment Setup
Create `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Step 1.3: Create Supabase Client
**Files to create:**
```
lib/supabase/
├── client.ts          # Browser client (singleton)
├── server.ts          # Server component client
└── middleware.ts      # Auth middleware helper
```

**`lib/supabase/client.ts`:**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Step 1.4: Auth Context & Hooks
**Files to create:**
```
contexts/
└── AuthContext.tsx    # Provider + useAuth hook

hooks/
├── useUser.ts         # Get current user
└── useAuthForm.ts     # Form state management
```

**Key exports from `useAuth`:**
- `user` - current user object or null
- `session` - current session
- `loading` - auth state loading
- `signIn(email, password)` - email sign in
- `signUp(email, password)` - email sign up
- `signInWithGoogle()` - OAuth
- `signOut()` - logout
- `resetPassword(email)` - password reset

### Step 1.5: Auth UI Components
**Files to create:**
```
components/auth/
├── LoginForm.tsx           # Email/password login
├── SignupForm.tsx          # Registration form
├── ForgotPasswordForm.tsx  # Password reset
├── SocialLoginButtons.tsx  # Google/GitHub buttons
├── UserMenu.tsx            # Dropdown for logged-in user
├── AuthModal.tsx           # Modal wrapper for auth forms
└── index.ts                # Exports
```

### Step 1.6: Auth Pages/Routes
**Files to create:**
```
app/
├── login/
│   └── page.tsx           # Login page
├── signup/
│   └── page.tsx           # Signup page
├── forgot-password/
│   └── page.tsx           # Password reset
└── auth/
    └── callback/
        └── route.ts       # OAuth callback handler
```

### Step 1.7: Protected Routes
**Files to create/modify:**
```
middleware.ts              # Root middleware for auth redirects
components/auth/
└── ProtectedRoute.tsx     # Client-side route protection
```

### Step 1.8: Update Header
**Modify:** `components/layout/Header.tsx`
- Add UserMenu when logged in
- Add Login button when logged out

### Milestone 1 Acceptance Criteria
- [ ] User can sign up with email/password
- [ ] User can sign in with email/password
- [ ] User can sign in with Google OAuth
- [ ] User can sign out
- [ ] User can reset password via email
- [ ] Session persists across browser refresh
- [ ] Header shows user state

---

## MILESTONE 2: Cloud Database Setup

### Step 2.1: Create Database Schema
**Execute in Supabase SQL Editor:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Recipes table
CREATE TABLE recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Recipe metadata
  title TEXT NOT NULL,
  source_url TEXT,
  source_domain TEXT,
  image_url TEXT,
  description TEXT,
  author TEXT,

  -- Timing
  prep_time TEXT,
  cook_time TEXT,
  total_time TEXT,

  -- Servings
  servings_amount DECIMAL,
  servings_unit TEXT,
  original_servings_amount DECIMAL,

  -- Content (stored as JSONB)
  ingredients JSONB NOT NULL DEFAULT '[]',
  instructions JSONB NOT NULL DEFAULT '[]',
  nutrition JSONB,

  -- User additions
  notes TEXT,
  tags TEXT[] DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT true,

  -- Scaling state
  last_scale_multiplier DECIMAL DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_viewed_at TIMESTAMPTZ,

  -- Sync
  sync_version INTEGER DEFAULT 1,
  is_deleted BOOLEAN DEFAULT false
);

-- Row Level Security
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own recipes"
  ON recipes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes"
  ON recipes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes"
  ON recipes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes"
  ON recipes FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_user_favorite ON recipes(user_id, is_favorite) WHERE is_deleted = false;
CREATE INDEX idx_recipes_user_created ON recipes(user_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.sync_version = OLD.sync_version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipes_updated_at
  BEFORE UPDATE ON recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

### Step 2.2: Create Database Service
**Files to create:**
```
lib/supabase/
├── recipes.ts             # CRUD operations
└── types.ts               # Database types
```

**`lib/supabase/recipes.ts` exports:**
```typescript
// Read operations
getRecipes(userId: string): Promise<Recipe[]>
getRecipeById(id: string): Promise<Recipe | null>
getFavorites(userId: string): Promise<Recipe[]>
searchRecipes(userId: string, query: string): Promise<Recipe[]>

// Write operations
createRecipe(userId: string, recipe: NewRecipe): Promise<Recipe>
updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe>
deleteRecipe(id: string): Promise<void>  // Soft delete

// Batch operations
upsertRecipes(userId: string, recipes: Recipe[]): Promise<Recipe[]>
```

### Step 2.3: Update Types
**Modify:** `types/recipe.ts`
- Add `id`, `user_id`, `created_at`, `updated_at` fields
- Add `sync_version`, `is_deleted` for sync support

### Milestone 2 Acceptance Criteria
- [ ] Database schema created in Supabase
- [ ] RLS policies working correctly
- [ ] CRUD operations work from app
- [ ] Proper TypeScript types

---

## MILESTONE 3: Data Migration & Sync

### Step 3.1: Migration Service
**Files to create:**
```
services/migration/
├── localStorage.ts        # Read from localStorage
├── cloudMigration.ts      # Migrate to Supabase
└── index.ts
```

**Migration flow:**
1. Detect existing localStorage data
2. Show migration prompt to user
3. Transform data to cloud schema
4. Upload to Supabase
5. Clear localStorage (optional)

### Step 3.2: Sync Manager
**Files to create:**
```
services/sync/
├── SyncManager.ts         # Main sync orchestrator
├── ConflictResolver.ts    # Handle merge conflicts
├── OfflineQueue.ts        # Queue offline changes
└── index.ts
```

**Sync Strategy:**
- **Online:** Direct Supabase operations
- **Offline:** Queue in IndexedDB, sync on reconnect
- **Conflicts:** Last-write-wins (by `updated_at`)

### Step 3.3: Favorites Context Update
**Modify:** `contexts/FavoritesContext.tsx`
- Check if user is logged in
- Use cloud storage for logged-in users
- Use localStorage for guests
- Handle offline state

### Step 3.4: Migration UI
**Files to create:**
```
components/migration/
├── MigrationBanner.tsx    # Shows when local data exists
├── MigrationModal.tsx     # Migration progress/confirmation
└── index.ts
```

### Milestone 3 Acceptance Criteria
- [ ] localStorage recipes migrate to cloud
- [ ] Sync works across devices
- [ ] Offline changes sync on reconnect
- [ ] Guest mode still works (localStorage)
- [ ] No data loss during migration

---

## MILESTONE 4: Smart LLM Scaling

### Prerequisites (Manual Steps)
- [ ] Get Anthropic API key from https://console.anthropic.com
- [ ] Add `ANTHROPIC_API_KEY` to `.env.local`

### Step 4.1: Install Dependencies
```bash
npm install @anthropic-ai/sdk
```

### Step 4.2: Environment Setup
Add to `.env.local`:
```env
ANTHROPIC_API_KEY=your_api_key
```

### Step 4.3: LLM Service
**Files to create:**
```
lib/llm/
├── client.ts              # Anthropic client setup
├── prompts.ts             # Scaling prompts
├── scaleWithAI.ts         # Main scaling function
└── cache.ts               # Response caching
```

**Scaling prompt structure:**
```
System: You are a professional chef helping scale recipes.

User: Scale this recipe by {multiplier}x:
{recipe JSON}

Provide:
1. Scaled ingredient amounts (practical measurements)
2. Special handling notes (eggs, leavening, spices)
3. Cooking time adjustments
4. Tips for the scaled version

Respond in JSON format.
```

### Step 4.4: API Route
**Files to create:**
```
app/api/recipes/scale-smart/
└── route.ts               # POST handler for AI scaling
```

**Features:**
- Rate limiting (10 requests/minute per user)
- Response caching (24 hours)
- Fallback to basic math on error
- Cost tracking

### Step 4.5: Update Scaling UI
**Modify:** `components/recipe/ScalingControls.tsx`
- Add "Smart Scale" toggle
- Show loading state while AI processes
- Display AI tips/notes
- Show which adjustments were AI-enhanced

**Files to create:**
```
components/recipe/
├── SmartScaleToggle.tsx   # AI scaling on/off
├── ScalingTips.tsx        # Display AI recommendations
└── AIBadge.tsx            # Indicates AI-enhanced content
```

### Step 4.6: Caching Strategy
**Cache locations:**
- Supabase (persistent) - for logged-in users
- localStorage (session) - for guests

**Cache key:** `${recipe_id}_${multiplier}`

### Milestone 4 Acceptance Criteria
- [ ] AI provides intelligent scaling suggestions
- [ ] Eggs, leavening, spices handled specially
- [ ] Cooking time adjustments provided
- [ ] Results cached to reduce API calls
- [ ] Graceful fallback on API failure
- [ ] Loading state shown during processing

---

## MILESTONE 5: PWA & Offline Support

### Step 5.1: Install Dependencies
```bash
npm install next-pwa
```

### Step 5.2: PWA Configuration
**Modify:** `next.config.js`
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // existing config
});
```

### Step 5.3: Web App Manifest
**Create:** `public/manifest.json`
```json
{
  "name": "Recipe Journal",
  "short_name": "Recipes",
  "description": "Import, scale, and save your favorite recipes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFBF7",
  "theme_color": "#E07A5F",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icons/icon-72.png", "sizes": "72x72", "type": "image/png" },
    { "src": "/icons/icon-96.png", "sizes": "96x96", "type": "image/png" },
    { "src": "/icons/icon-128.png", "sizes": "128x128", "type": "image/png" },
    { "src": "/icons/icon-144.png", "sizes": "144x144", "type": "image/png" },
    { "src": "/icons/icon-152.png", "sizes": "152x152", "type": "image/png" },
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-384.png", "sizes": "384x384", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Step 5.4: App Icons
**Create:** `public/icons/` directory with app icons
- Generate from a master icon using tools like https://realfavicongenerator.net

### Step 5.5: Offline Storage (IndexedDB)
**Install:**
```bash
npm install dexie
```

**Create:** `lib/offline/database.ts`
```typescript
import Dexie from 'dexie';

class RecipeDB extends Dexie {
  recipes: Dexie.Table<OfflineRecipe, string>;
  syncQueue: Dexie.Table<SyncOperation, number>;

  constructor() {
    super('RecipeJournal');
    this.version(1).stores({
      recipes: 'id, userId, title, *tags, updatedAt',
      syncQueue: '++id, operation, createdAt'
    });
  }
}
```

### Step 5.6: Offline UI Components
**Create:**
```
components/common/
├── OfflineBanner.tsx      # "You're offline" banner
├── SyncStatus.tsx         # Sync indicator in header
└── InstallPrompt.tsx      # "Add to home screen" prompt
```

### Step 5.7: Service Worker Customization
**Create:** `public/sw.js` (or let next-pwa generate)

**Caching strategy:**
| Resource | Strategy |
|----------|----------|
| Static assets | Cache First |
| API routes | Network First |
| Images | Stale While Revalidate |
| User data | IndexedDB |

### Milestone 5 Acceptance Criteria
- [ ] App installable on mobile/desktop
- [ ] Manifest configured correctly
- [ ] Works offline (cached pages load)
- [ ] Saved recipes available offline
- [ ] Changes sync when back online
- [ ] Offline indicator visible when disconnected
- [ ] Lighthouse PWA score > 90

---

## MILESTONE 6: Internationalization (Marathi)

### Step 6.1: Install Dependencies
```bash
npm install next-intl
```

### Step 6.2: i18n Configuration
**Create:** `i18n.ts`
```typescript
import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async ({ locale }) => ({
  messages: (await import(`./messages/${locale}.json`)).default
}));
```

### Step 6.3: Translation Files
**Create:**
```
messages/
├── en.json                # English (default)
└── mr.json                # Marathi
```

**English translations (`messages/en.json`):**
```json
{
  "common": {
    "appName": "Recipe Journal",
    "loading": "Loading...",
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "search": "Search"
  },
  "home": {
    "title": "Recipe Journal",
    "subtitle": "Import, scale, and save your favorite recipes",
    "urlPlaceholder": "Paste a recipe URL...",
    "getRecipe": "Get Recipe"
  },
  "recipe": {
    "ingredients": "Ingredients",
    "instructions": "Instructions",
    "servings": "Servings",
    "prepTime": "Prep Time",
    "cookTime": "Cook Time",
    "scale": "Scale",
    "addToFavorites": "Add to Favorites",
    "removeFromFavorites": "Remove from Favorites",
    "exportRecipe": "Export Recipe",
    "notes": "Notes",
    "addNote": "Add a note..."
  },
  "favorites": {
    "title": "My Favorites",
    "empty": "No saved recipes yet",
    "emptyDescription": "Import a recipe and save it to see it here",
    "searchPlaceholder": "Search your recipes..."
  },
  "auth": {
    "signIn": "Sign In",
    "signUp": "Sign Up",
    "signOut": "Sign Out",
    "email": "Email",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "noAccount": "Don't have an account?",
    "hasAccount": "Already have an account?",
    "continueWithGoogle": "Continue with Google"
  }
}
```

**Marathi translations (`messages/mr.json`):**
```json
{
  "common": {
    "appName": "रेसिपी जर्नल",
    "loading": "लोड होत आहे...",
    "save": "जतन करा",
    "cancel": "रद्द करा",
    "delete": "हटवा",
    "search": "शोधा"
  },
  "home": {
    "title": "रेसिपी जर्नल",
    "subtitle": "तुमच्या आवडत्या रेसिपी आयात करा, स्केल करा आणि सेव्ह करा",
    "urlPlaceholder": "रेसिपी URL पेस्ट करा...",
    "getRecipe": "रेसिपी मिळवा"
  },
  "recipe": {
    "ingredients": "साहित्य",
    "instructions": "कृती",
    "servings": "वाढणी",
    "prepTime": "तयारी वेळ",
    "cookTime": "स्वयंपाक वेळ",
    "scale": "प्रमाण",
    "addToFavorites": "आवडीत जोडा",
    "removeFromFavorites": "आवडीतून काढा",
    "exportRecipe": "रेसिपी एक्सपोर्ट करा",
    "notes": "टिप्पणी",
    "addNote": "टिप्पणी जोडा..."
  },
  "favorites": {
    "title": "माझे आवडते",
    "empty": "अद्याप कोणतीही रेसिपी सेव्ह केलेली नाही",
    "emptyDescription": "रेसिपी आयात करा आणि ती सेव्ह करा",
    "searchPlaceholder": "तुमच्या रेसिपीज शोधा..."
  },
  "auth": {
    "signIn": "साइन इन",
    "signUp": "साइन अप",
    "signOut": "साइन आउट",
    "email": "ईमेल",
    "password": "पासवर्ड",
    "forgotPassword": "पासवर्ड विसरलात?",
    "noAccount": "खाते नाही?",
    "hasAccount": "आधीच खाते आहे?",
    "continueWithGoogle": "Google सह सुरू ठेवा"
  }
}
```

### Step 6.4: Update Layout
**Modify:** `app/layout.tsx`
- Wrap with `NextIntlClientProvider`
- Set locale from user preference or browser

### Step 6.5: Language Switcher
**Create:** `components/common/LanguageSwitcher.tsx`
- Toggle between English and Marathi
- Save preference to localStorage/user profile

### Step 6.6: Update Components
Update all components to use `useTranslations()` hook:
```typescript
import { useTranslations } from 'next-intl';

function MyComponent() {
  const t = useTranslations('home');
  return <h1>{t('title')}</h1>;
}
```

### Milestone 6 Acceptance Criteria
- [ ] User can switch between English and Marathi
- [ ] All UI text is translated
- [ ] Language preference persists
- [ ] Devanagari script renders correctly
- [ ] No broken layouts with Marathi text

---

## File Structure After Phase 2

```
recipe-journal/
├── app/
│   ├── api/
│   │   ├── health/route.ts
│   │   └── recipes/
│   │       ├── parse/route.ts
│   │       ├── scale/route.ts
│   │       └── scale-smart/route.ts     # NEW
│   ├── auth/
│   │   └── callback/route.ts            # NEW
│   ├── login/page.tsx                   # NEW
│   ├── signup/page.tsx                  # NEW
│   ├── forgot-password/page.tsx         # NEW
│   ├── favorites/page.tsx
│   ├── layout.tsx                       # MODIFIED
│   └── page.tsx
│
├── components/
│   ├── auth/                            # NEW
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   ├── ForgotPasswordForm.tsx
│   │   ├── SocialLoginButtons.tsx
│   │   ├── UserMenu.tsx
│   │   ├── AuthModal.tsx
│   │   ├── ProtectedRoute.tsx
│   │   └── index.ts
│   ├── common/
│   │   ├── ErrorMessage.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── OfflineBanner.tsx            # NEW
│   │   ├── SyncStatus.tsx               # NEW
│   │   ├── InstallPrompt.tsx            # NEW
│   │   ├── LanguageSwitcher.tsx         # NEW
│   │   └── index.ts
│   ├── favorites/
│   ├── layout/
│   │   ├── Header.tsx                   # MODIFIED
│   │   └── ...
│   ├── migration/                       # NEW
│   │   ├── MigrationBanner.tsx
│   │   ├── MigrationModal.tsx
│   │   └── index.ts
│   └── recipe/
│       ├── SmartScaleToggle.tsx         # NEW
│       ├── ScalingTips.tsx              # NEW
│       ├── AIBadge.tsx                  # NEW
│       └── ...
│
├── contexts/
│   ├── AuthContext.tsx                  # NEW
│   ├── FavoritesContext.tsx             # MODIFIED
│   └── ...
│
├── hooks/
│   ├── useUser.ts                       # NEW
│   ├── useOffline.ts                    # NEW
│   └── ...
│
├── lib/
│   ├── supabase/                        # NEW
│   │   ├── client.ts
│   │   ├── server.ts
│   │   ├── recipes.ts
│   │   └── types.ts
│   ├── llm/                             # NEW
│   │   ├── client.ts
│   │   ├── prompts.ts
│   │   ├── scaleWithAI.ts
│   │   └── cache.ts
│   └── offline/                         # NEW
│       ├── database.ts
│       └── syncQueue.ts
│
├── messages/                            # NEW
│   ├── en.json
│   └── mr.json
│
├── public/
│   ├── manifest.json                    # NEW
│   └── icons/                           # NEW
│       ├── icon-72.png
│       ├── icon-96.png
│       └── ...
│
├── services/
│   ├── migration/                       # NEW
│   │   ├── localStorage.ts
│   │   ├── cloudMigration.ts
│   │   └── index.ts
│   └── sync/                            # NEW
│       ├── SyncManager.ts
│       ├── ConflictResolver.ts
│       ├── OfflineQueue.ts
│       └── index.ts
│
├── middleware.ts                        # NEW
├── i18n.ts                              # NEW
├── next.config.js                       # MODIFIED
├── .env.local                           # NEW (not committed)
└── ...
```

---

## Environment Variables Summary

```env
# .env.local (DO NOT COMMIT)

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Anthropic (LLM)
ANTHROPIC_API_KEY=sk-ant-your-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Testing Checklist

### Milestone 1: Auth
- [ ] Sign up with email creates account
- [ ] Sign in with email works
- [ ] Google OAuth redirects and completes
- [ ] Sign out clears session
- [ ] Password reset sends email
- [ ] Protected routes redirect to login
- [ ] Session persists on refresh

### Milestone 2: Database
- [ ] Create recipe saves to Supabase
- [ ] Read recipes returns user's recipes only
- [ ] Update recipe modifies in Supabase
- [ ] Delete recipe soft-deletes
- [ ] Search works with tags and title
- [ ] RLS blocks access to other users' data

### Milestone 3: Migration & Sync
- [ ] Migration prompt shows for existing users
- [ ] Migration transfers all localStorage recipes
- [ ] Recipes sync across two browsers
- [ ] Offline changes queue properly
- [ ] Sync completes on reconnect
- [ ] Guest mode still works

### Milestone 4: LLM Scaling
- [ ] Smart scale returns AI suggestions
- [ ] Eggs rounded to whole numbers
- [ ] Leavening scaled conservatively
- [ ] Results cached for same recipe/multiplier
- [ ] Fallback to basic math on error
- [ ] Loading state shows during API call

### Milestone 5: PWA
- [ ] Lighthouse PWA score > 90
- [ ] App installable on Chrome desktop
- [ ] App installable on iOS Safari
- [ ] App works offline (cached pages)
- [ ] Saved recipes load offline
- [ ] Offline banner shows when disconnected

### Milestone 6: i18n
- [ ] English displays correctly
- [ ] Marathi displays correctly
- [ ] Language switch works
- [ ] Preference saved to localStorage
- [ ] No layout breaks with Marathi text

---

## Getting Started

### First Steps (Do These Now)
1. Set up Supabase project at https://supabase.com
2. Enable auth providers (Email, Google)
3. Copy environment variables
4. Run the database schema SQL

### Development Commands
```bash
# Install new dependencies
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

---

## Notes

- **Guest Mode:** Users without accounts can still use localStorage (Phase 1 functionality preserved)
- **Migration:** One-time, user-initiated migration from localStorage to cloud
- **Offline-First:** Cloud users get IndexedDB backup for offline access
- **Cost Control:** LLM results are cached to minimize API calls

---

*Implementation Plan v1.0*
*Created: January 2026*
