# Recipe Journal - Consolidated Development Plan

**Based on:** Current Implementation + Original Plan Best Practices
**Developer:** Solo Developer
**Date:** January 2026

---

## Executive Summary

This plan builds on the existing working implementation (React + Express monorepo) and incrementally adds high-value features from the original plan. Focus is on practical improvements that maximize user value while minimizing complexity.

### Current State
- Working recipe import from URLs
- Solid ingredient parsing with 50+ preparation words
- Recipe scaling (0.1x to 10x) with unit conversion
- Export to clipboard functionality
- Clean component architecture

### Goal
Transform the current "parse and scale" tool into a complete **personal recipe journal** with favorites, persistence, search, and offline access.

---

## Architecture Decision

### Keep Current Stack (No Migration)

| Component | Current (Keep) | Plan Suggested | Decision |
|-----------|---------------|----------------|----------|
| Frontend | React 18 + Vite | Next.js 14 | **Keep React + Vite** - works well, faster dev server |
| Backend | Express.js | Next.js API | **Keep Express** - already structured, no rewrite needed |
| Structure | Monorepo | Unified | **Keep Monorepo** - clean separation of concerns |
| Styling | CSS Modules | Tailwind | **Add Tailwind** - faster styling, responsive utilities |

**Rationale:** Migration to Next.js provides marginal benefits but requires significant rewrite. Current architecture is solid and maintainable.

---

## Phased Development Plan

```
Phase 1: Favorites & Persistence     [Core Value]
Phase 2: Enhanced UX                 [Polish]
Phase 3: Offline & PWA               [Mobile Ready]
Phase 4: Optional Enhancements       [Nice to Have]
```

---

## Phase 1: Favorites & Persistence

### Goal
Enable users to save, organize, and retrieve their favorite recipes.

### Features

#### 1.1 Local Favorites (localStorage)
Save recipes to browser storage for quick access.

**Implementation:**
```typescript
// packages/client/src/services/favorites.ts
interface SavedRecipe extends Recipe {
  savedAt: string;
  lastViewedAt: string;
  notes?: string;
  tags: string[];
  isFavorite: boolean;
}

const favorites = {
  getAll: (): SavedRecipe[] => {
    return JSON.parse(localStorage.getItem('recipe-journal-favorites') || '[]');
  },

  save: (recipe: Recipe, notes?: string): SavedRecipe => {
    const saved: SavedRecipe = {
      ...recipe,
      id: recipe.id || crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      lastViewedAt: new Date().toISOString(),
      notes,
      tags: recipe.tags || [],
      isFavorite: true
    };
    const current = favorites.getAll();
    const existing = current.findIndex(r => r.source === recipe.source);
    if (existing >= 0) {
      current[existing] = { ...current[existing], ...saved };
    } else {
      current.unshift(saved);
    }
    localStorage.setItem('recipe-journal-favorites', JSON.stringify(current));
    return saved;
  },

  remove: (id: string): void => {
    const current = favorites.getAll().filter(r => r.id !== id);
    localStorage.setItem('recipe-journal-favorites', JSON.stringify(current));
  },

  search: (query: string): SavedRecipe[] => {
    const all = favorites.getAll();
    const q = query.toLowerCase();
    return all.filter(r =>
      r.title.toLowerCase().includes(q) ||
      r.tags.some(t => t.toLowerCase().includes(q)) ||
      r.ingredients.some(i => i.ingredient.toLowerCase().includes(q))
    );
  }
};
```

**New Components:**
```
packages/client/src/
├── components/
│   ├── favorites/
│   │   ├── FavoritesList.tsx      # Grid/list of saved recipes
│   │   ├── FavoriteCard.tsx       # Recipe card with quick actions
│   │   ├── SaveRecipeButton.tsx   # Save/unsave toggle
│   │   └── SearchBar.tsx          # Search saved recipes
│   └── recipe/
│       └── RecipeNotes.tsx        # Personal notes on recipe
├── pages/
│   ├── HomePage.tsx               # Landing + recent favorites
│   └── FavoritesPage.tsx          # All saved recipes
└── services/
    └── favorites.ts               # localStorage wrapper
```

#### 1.2 Navigation & Routing
Add client-side routing for multiple pages.

**Install:**
```bash
npm install react-router-dom -w @recipe-journal/client
```

**Routes:**
| Path | Component | Description |
|------|-----------|-------------|
| `/` | HomePage | URL input + recent favorites |
| `/favorites` | FavoritesPage | All saved recipes with search |
| `/recipe/:id` | RecipePage | View saved recipe |

#### 1.3 Server-Side Persistence (SQLite)
Optional but recommended: Persist recipes across browser clears.

**Install:**
```bash
npm install better-sqlite3 -w @recipe-journal/server
npm install -D @types/better-sqlite3 -w @recipe-journal/server
```

**Database Schema:**
```sql
-- packages/server/src/db/schema.sql

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  source TEXT NOT NULL,
  source_domain TEXT,
  description TEXT,
  image TEXT,
  author TEXT,

  prep_time INTEGER,
  cook_time INTEGER,
  total_time INTEGER,
  servings INTEGER,

  ingredients TEXT NOT NULL,  -- JSON array
  instructions TEXT NOT NULL, -- JSON array
  nutrition TEXT,             -- JSON object
  tags TEXT,                  -- JSON array

  notes TEXT,
  is_favorite INTEGER DEFAULT 1,

  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  last_viewed_at TEXT
);

CREATE INDEX idx_recipes_favorite ON recipes(is_favorite);
CREATE INDEX idx_recipes_created ON recipes(created_at DESC);
```

**New API Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/favorites` | List all saved recipes |
| GET | `/api/favorites/:id` | Get single recipe |
| POST | `/api/favorites` | Save a recipe |
| PATCH | `/api/favorites/:id` | Update recipe (notes, tags) |
| DELETE | `/api/favorites/:id` | Remove from favorites |
| GET | `/api/favorites/search?q=` | Search recipes |

### Phase 1 Deliverables

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| localStorage favorites service | High | 2-3 hours |
| Save/Unsave button on RecipeCard | High | 1 hour |
| Favorites page with list view | High | 3-4 hours |
| Search bar for favorites | High | 2 hours |
| React Router setup | High | 1-2 hours |
| SQLite persistence (optional) | Medium | 4-5 hours |
| Recipe notes feature | Medium | 2 hours |
| Tags/categories | Low | 2-3 hours |

**Total Estimated Effort:** 2-3 days

---

## Phase 2: Enhanced UX

### Goal
Polish the interface and improve user experience based on plan's UI/UX guidelines.

### Features

#### 2.1 Tailwind CSS Integration
Replace CSS modules with Tailwind for faster development.

**Install:**
```bash
npm install -D tailwindcss postcss autoprefixer -w @recipe-journal/client
npx tailwindcss init -p
```

**Color Palette (from Plan):**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#E07A5F',  // Warm terracotta
          dark: '#C45D43',
          light: '#F4A582',
        },
        surface: '#FFFBF7',    // Warm white background
        scaled: '#9F7AEA',     // Highlight for scaled quantities
      }
    }
  }
}
```

#### 2.2 Improved Recipe Display
Better visual hierarchy and mobile experience.

**Enhancements:**
- Scaled quantities highlighted with `scaled` color
- Collapsible ingredients/instructions sections
- Print-friendly view
- Share button (copy link or text)

#### 2.3 Enhanced Scaling UI
More intuitive scaling controls.

**Features:**
- Visual slider for multiplier (0.5x to 4x)
- Servings-based scaling ("I need 6 servings")
- Quick presets: Half, Original, Double, Triple
- Unit system toggle (US/Metric) - leverage existing conversion

#### 2.4 Loading & Error States
Better feedback during operations.

**Components:**
```
components/common/
├── Skeleton.tsx          # Loading placeholder
├── Toast.tsx             # Success/error notifications
└── EmptyState.tsx        # No favorites yet, etc.
```

#### 2.5 Responsive Design
Mobile-first approach for kitchen use.

**Breakpoints:**
- Mobile (< 640px): Single column, large tap targets
- Tablet (640-1024px): Two column layout
- Desktop (> 1024px): Three column, sidebar

### Phase 2 Deliverables

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| Tailwind CSS setup & migration | High | 4-5 hours |
| Mobile responsive layout | High | 3-4 hours |
| Improved scaling controls | Medium | 3 hours |
| Toast notifications | Medium | 2 hours |
| Print-friendly styles | Low | 2 hours |
| Skeleton loaders | Low | 1-2 hours |

**Total Estimated Effort:** 2-3 days

---

## Phase 3: Offline & PWA

### Goal
Make the app installable and usable offline for kitchen use.

### Features

#### 3.1 PWA Manifest
Enable "Add to Home Screen" on mobile.

**Create:** `packages/client/public/manifest.json`
```json
{
  "name": "Recipe Journal",
  "short_name": "Recipes",
  "description": "Import, scale, and save your favorite recipes",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#FFFBF7",
  "theme_color": "#E07A5F",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

#### 3.2 Service Worker
Cache app shell and saved recipes for offline access.

**Install:**
```bash
npm install vite-plugin-pwa -w @recipe-journal/client
```

**Configuration:**
```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50 }
            }
          }
        ]
      }
    })
  ]
});
```

#### 3.3 IndexedDB for Offline Recipes
Store favorites in IndexedDB for offline access.

**Install:**
```bash
npm install dexie -w @recipe-journal/client
```

**Implementation:**
```typescript
// packages/client/src/services/offlineDb.ts
import Dexie, { Table } from 'dexie';

interface OfflineRecipe extends SavedRecipe {
  syncStatus: 'synced' | 'pending' | 'conflict';
}

class RecipeDatabase extends Dexie {
  recipes!: Table<OfflineRecipe>;

  constructor() {
    super('RecipeJournal');
    this.version(1).stores({
      recipes: 'id, title, savedAt, *tags, syncStatus'
    });
  }
}

export const db = new RecipeDatabase();
```

#### 3.4 Offline Indicator
Show user when they're offline and what's available.

### Phase 3 Deliverables

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| PWA manifest + icons | High | 2 hours |
| Service worker (vite-plugin-pwa) | High | 2-3 hours |
| IndexedDB storage | Medium | 3-4 hours |
| Offline indicator UI | Medium | 1-2 hours |
| Sync when back online | Low | 3-4 hours |

**Total Estimated Effort:** 2-3 days

---

## Phase 4: Optional Enhancements

### Goal
Add nice-to-have features based on usage and feedback.

### 4.1 Marathi UI (i18n)

**Only if needed for your use case.**

**Install:**
```bash
npm install react-i18next i18next -w @recipe-journal/client
```

**Translation Files:**
```
packages/client/src/
└── locales/
    ├── en.json
    └── mr.json
```

**Key Translations:**
```json
{
  "app.title": "रेसिपी जर्नल",
  "import.placeholder": "रेसिपी URL येथे पेस्ट करा...",
  "scale.label": "प्रमाण",
  "ingredients.title": "साहित्य",
  "method.title": "कृती"
}
```

### 4.2 Smart Scaling Tips

Enhance existing scaling tips based on plan's logic.

**Add to ScalingService:**
```typescript
// Enhanced scaling categories
function categorizeIngredient(ingredient: string): ScaleCategory {
  const item = ingredient.toLowerCase();

  // Discrete items - round to whole numbers
  if (/\b(egg|eggs|lemon|lime|banana|avocado)\b/.test(item)) {
    return 'discrete';
  }

  // Leavening - scale at 75% for large batches
  if (/\b(baking powder|baking soda|yeast)\b/.test(item)) {
    return 'leavening';
  }

  // Spices/seasonings - scale conservatively
  if (/\b(salt|pepper|cumin|cinnamon|chili|paprika|oregano)\b/.test(item)) {
    return 'sublinear';
  }

  return 'linear';
}

function getScalingNote(category: ScaleCategory, multiplier: number): string | null {
  if (category === 'sublinear' && multiplier > 2) {
    return 'Scaled conservatively - taste and adjust';
  }
  if (category === 'leavening' && multiplier > 2) {
    return 'Scaled at 75% for large batch';
  }
  return null;
}
```

### 4.3 Shopping List Generation

Generate grocery list from one or more recipes.

**Features:**
- Combine ingredients from multiple recipes
- Group by category (produce, dairy, pantry)
- Checkbox to mark as purchased
- Export to text/copy

### 4.4 Recipe Editing

Allow users to modify imported recipes.

**Features:**
- Edit ingredients (quantity, unit, item)
- Reorder instructions
- Add personal notes
- Custom tags

### 4.5 Import History

Track recently imported URLs for quick re-import.

### Phase 4 Deliverables

| Deliverable | Priority | Effort |
|-------------|----------|--------|
| Marathi UI translations | Low | 4-5 hours |
| Enhanced scaling categories | Low | 2-3 hours |
| Shopping list feature | Low | 5-6 hours |
| Recipe editing | Low | 4-5 hours |
| Import history | Low | 2 hours |

**Total Estimated Effort:** 3-4 days (all optional features)

---

## Features Intentionally Skipped

These features from the original plan are **not included** due to complexity vs. value for a solo developer:

| Feature | Reason to Skip |
|---------|---------------|
| **User Accounts & Auth** | Unnecessary for personal use; adds significant complexity |
| **Cloud Sync (Supabase)** | localStorage + SQLite sufficient; no recurring costs |
| **LLM Integration** | Current regex parsing is robust; LLM adds cost & latency |
| **Browser Extension** | Nice-to-have but significant effort for marginal gain |
| **Monetization** | Premature; focus on building useful tool first |
| **Next.js Migration** | Current stack works; migration is pure overhead |

**Note:** These can be reconsidered if you decide to launch publicly.

---

## Implementation Priority Matrix

```
                    HIGH VALUE
                        │
     ┌──────────────────┼──────────────────┐
     │                  │                  │
     │  Phase 1:        │  Phase 2:        │
     │  Favorites       │  UX Polish       │
     │  Persistence     │  Responsive      │
     │  Search          │  Tailwind        │
     │                  │                  │
LOW ─┼──────────────────┼──────────────────┼─ HIGH
EFFORT                  │                  │  EFFORT
     │                  │                  │
     │  Quick Wins:     │  Phase 3-4:      │
     │  Better tips     │  PWA/Offline     │
     │  Import history  │  i18n            │
     │                  │  Shopping list   │
     │                  │                  │
     └──────────────────┼──────────────────┘
                        │
                    LOW VALUE
```

---

## File Structure After All Phases

```
recipe-journal/
├── packages/
│   ├── client/
│   │   ├── public/
│   │   │   ├── manifest.json          # PWA manifest
│   │   │   └── icons/                  # App icons
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── common/
│   │   │   │   │   ├── ErrorMessage.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── Skeleton.tsx        # NEW
│   │   │   │   │   ├── Toast.tsx           # NEW
│   │   │   │   │   └── EmptyState.tsx      # NEW
│   │   │   │   ├── layout/
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   ├── Navigation.tsx      # NEW
│   │   │   │   │   └── OfflineIndicator.tsx # NEW
│   │   │   │   ├── recipe/
│   │   │   │   │   ├── ExportButton.tsx
│   │   │   │   │   ├── IngredientList.tsx
│   │   │   │   │   ├── InstructionsList.tsx
│   │   │   │   │   ├── RecipeCard.tsx
│   │   │   │   │   ├── ScalingControls.tsx
│   │   │   │   │   ├── UrlInput.tsx
│   │   │   │   │   ├── RecipeNotes.tsx     # NEW
│   │   │   │   │   └── SaveButton.tsx      # NEW
│   │   │   │   └── favorites/              # NEW
│   │   │   │       ├── FavoritesList.tsx
│   │   │   │       ├── FavoriteCard.tsx
│   │   │   │       └── SearchBar.tsx
│   │   │   ├── pages/                      # NEW
│   │   │   │   ├── HomePage.tsx
│   │   │   │   ├── FavoritesPage.tsx
│   │   │   │   └── RecipePage.tsx
│   │   │   ├── services/
│   │   │   │   ├── api.ts
│   │   │   │   ├── favorites.ts            # NEW
│   │   │   │   └── offlineDb.ts            # NEW
│   │   │   ├── hooks/                      # NEW
│   │   │   │   ├── useFavorites.ts
│   │   │   │   └── useOffline.ts
│   │   │   ├── locales/                    # NEW (Phase 4)
│   │   │   │   ├── en.json
│   │   │   │   └── mr.json
│   │   │   ├── App.tsx
│   │   │   ├── Router.tsx                  # NEW
│   │   │   └── main.tsx
│   │   ├── tailwind.config.js              # NEW
│   │   └── vite.config.ts                  # Updated for PWA
│   │
│   ├── server/
│   │   ├── src/
│   │   │   ├── db/                         # NEW
│   │   │   │   ├── schema.sql
│   │   │   │   ├── database.ts
│   │   │   │   └── migrations/
│   │   │   ├── controllers/
│   │   │   │   ├── health.controller.ts
│   │   │   │   ├── recipe.controller.ts
│   │   │   │   └── favorites.controller.ts # NEW
│   │   │   ├── routes/
│   │   │   │   ├── index.ts
│   │   │   │   ├── health.routes.ts
│   │   │   │   ├── recipe.routes.ts
│   │   │   │   └── favorites.routes.ts     # NEW
│   │   │   └── services/
│   │   │       ├── cache/
│   │   │       ├── ingredient/
│   │   │       ├── scaling/
│   │   │       └── scraper/
│   │   └── recipe-journal.db               # NEW (SQLite)
│   │
│   └── shared/
│       └── src/
│           ├── types/
│           │   ├── recipe.types.ts
│           │   ├── ingredient.types.ts
│           │   ├── scaling.types.ts
│           │   ├── api.types.ts
│           │   └── favorites.types.ts      # NEW
│           └── constants/
│
├── NEW_DEVELOPMENT_PLAN.md                 # This file
└── package.json
```

---

## Development Checklist

### Phase 1: Favorites & Persistence
- [ ] Create `favorites.ts` service with localStorage
- [ ] Add React Router to client
- [ ] Create HomePage with URL input + recent favorites
- [ ] Create FavoritesPage with list/grid view
- [ ] Add SaveButton component to RecipeCard
- [ ] Implement search functionality
- [ ] Add SQLite database to server (optional)
- [ ] Create favorites API endpoints (optional)
- [ ] Add RecipeNotes component

### Phase 2: Enhanced UX
- [ ] Install and configure Tailwind CSS
- [ ] Migrate components to Tailwind
- [ ] Implement responsive breakpoints
- [ ] Add Toast notification system
- [ ] Improve ScalingControls with slider
- [ ] Add unit system toggle (US/Metric)
- [ ] Create Skeleton loading components
- [ ] Add print stylesheet

### Phase 3: Offline & PWA
- [ ] Create PWA manifest
- [ ] Generate app icons (192px, 512px)
- [ ] Configure vite-plugin-pwa
- [ ] Set up IndexedDB with Dexie
- [ ] Migrate localStorage to IndexedDB
- [ ] Add offline indicator
- [ ] Test offline functionality

### Phase 4: Optional
- [ ] Set up react-i18next
- [ ] Create English translations
- [ ] Create Marathi translations
- [ ] Enhance ingredient categorization
- [ ] Add shopping list feature
- [ ] Enable recipe editing

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Recipes imported successfully | 85%+ |
| Page load time | < 2 seconds |
| Favorites save/retrieve | < 100ms |
| Works offline | All saved recipes accessible |
| Mobile usability | Fully responsive |

---

## Summary

This plan transforms your working recipe parser into a complete personal recipe journal by:

1. **Preserving** your solid existing architecture
2. **Adding** high-value features (favorites, persistence, search)
3. **Polishing** the UX (Tailwind, responsive, better controls)
4. **Enabling** mobile/offline use (PWA)
5. **Skipping** unnecessary complexity (auth, LLM, cloud sync)

**Total estimated effort: 6-10 days** spread across phases, with each phase delivering usable functionality.

---

*Plan Version: 1.0*
*Created: January 2026*
*Based on: Current Implementation + Original Plan Best Practices*
