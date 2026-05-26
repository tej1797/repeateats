'use client';

// Restaurant portal — three views:
//   'auth'        → sign-in / sign-up form
//   'onboarding'  → 5-step wizard (Find → Details → Hours → Deals → Photo)
//   'dashboard'   → stats + deals list + collab requests

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Restaurant, Deal, Collab } from '@/types';
import {
  IconBuildingStore,
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconMapPin,
  IconPhone,
  IconGlobe,
  IconBrandInstagram,
  IconMicrophone,
  IconLayoutGrid,
  IconPencil,
  IconPhoto,
  IconTrash,
  IconPlus,
  IconLogout,
  IconStar,
  IconX,
  IconLoader2,
  IconSearch,
  IconUpload,
  IconFileText,
} from '@tabler/icons-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

// Maps the human-readable cuisine label to the category slug used in the deals feed
const CUISINE_TO_CATEGORY: Record<string, string> = {
  Indian: 'indian', Italian: 'italian', Japanese: 'japanese',
  Chinese: 'chinese', Mexican: 'mexican', Thai: 'thai',
  Mediterranean: 'mediterranean', American: 'american', BBQ: 'bbq',
  Seafood: 'seafood', Vegan: 'vegan', Pizza: 'pizza',
  Burgers: 'burgers', Other: 'other',
};

const CUISINES = Object.keys(CUISINE_TO_CATEGORY);

const ONTARIO_CITIES = [
  'Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan',
  'Richmond Hill', 'Oakville', 'Burlington', 'Hamilton',
  'Waterloo', 'Kitchener', 'Cambridge', 'Guelph', 'London', 'Ottawa',
];

// Eight ready-to-use deal templates shown in Step 4 Templates mode
const DEAL_TEMPLATES = [
  { emoji: '🍽️', title: '20% Off Full Menu',   discount_type: 'percentage', discount_value: '20%',          description: 'Get 20% off everything on our menu.',              scope: 'menu',     deal_types: ['dine-in', 'pickup'] },
  { emoji: '🥗', title: 'Free Appetizer',        discount_type: 'free_item',  discount_value: 'Free appetizer', description: 'Free starter with any main course order.',         scope: 'single',   deal_types: ['dine-in'] },
  { emoji: '🍺', title: 'BOGO Drinks',           discount_type: 'bogo',       discount_value: 'BOGO',           description: 'Buy one drink, get one free.',                     scope: 'category', deal_types: ['dine-in'] },
  { emoji: '⏰', title: 'Early Bird Special',    discount_type: 'percentage', discount_value: '15%',            description: '15% off when you dine before 6 PM.',               scope: 'menu',     deal_types: ['dine-in'] },
  { emoji: '👨‍👩‍👧', title: 'Family Feast Deal',   discount_type: 'set_price',  discount_value: '$49.99',         description: 'Family meal for 4 — mains, sides & drinks.',       scope: 'bundle',   deal_types: ['dine-in', 'pickup'] },
  { emoji: '🎉', title: 'Weekend Brunch Promo',  discount_type: 'percentage', discount_value: '25%',            description: '25% off all brunch items Sat & Sun.',              scope: 'menu',     deal_types: ['dine-in'] },
  { emoji: '🥡', title: 'Takeout Tuesday',       discount_type: 'fixed',      discount_value: '$5 off',         description: '$5 off all pickup orders on Tuesdays.',            scope: 'menu',     deal_types: ['pickup'] },
  { emoji: '💚', title: 'Loyalty Reward',        discount_type: 'free_item',  discount_value: 'Free dessert',   description: 'Free dessert on your third visit.',                scope: 'single',   deal_types: ['dine-in'] },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

// Per-day hours entry used in the hours editor (Step 3)
interface HoursEntry {
  open: string;   // "11:00"
  close: string;  // "22:00"
  closed: boolean;
}

// A single deal being composed before it's POSTed
interface DealDraft {
  emoji: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: string;
  scope: string;
  deal_types: string[];
  available_days: string[];
  valid_from: string;
  valid_until: string;
  max_claims: string;   // kept as string so empty means "unlimited"
  is_coming: boolean;
}

// All data collected across the 5 wizard steps
interface WizardData {
  // Step 1 — Google Places auto-fill
  name: string; address: string; city: string;
  phone: string; website: string; placeRating: number;
  // Step 2 — Extra details
  cuisine: string; province: string; postal: string;
  instagram: string; description: string;
  // Step 3 — Hours + service toggles
  hours: Record<string, HoursEntry>;
  acceptsDineIn: boolean; acceptsPickup: boolean;
  acceptsDelivery: boolean; openToCollabs: boolean;
  // Step 4 — Deal creator
  dealMode: 'templates' | 'manual' | 'voice' | 'menu';
  deals: DealDraft[];
  // Step 5 — Cover photo
  photoFile: File | null;
  photoPreviewUrl: string;
}

// Shape returned by /api/google-places
interface PlaceSuggestion {
  name: string; address: string; phone: string;
  website: string; hours: string; rating: number; types: string[];
}

type ViewState = 'auth' | 'onboarding' | 'dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultHours(): Record<string, HoursEntry> {
  return Object.fromEntries(
    DAYS.map((d) => [d, { open: '11:00', close: '22:00', closed: false }])
  );
}

function todayStr(): string { return new Date().toISOString().split('T')[0]; }
function nextMonthStr(): string {
  return new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  // Single Supabase client instance for the lifetime of this page
  const supabase = useRef(createClient()).current;

  const [view,        setView]       = useState<ViewState>('auth');
  const [user,        setUser]       = useState<SupabaseUser | null>(null);
  const [restaurant,  setRestaurant] = useState<Restaurant | null>(null);
  const [step,        setStep]       = useState(1);
  const [publishing,  setPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');

  const [wizard, setWizard] = useState<WizardData>({
    name: '', address: '', city: 'Toronto', phone: '', website: '', placeRating: 0,
    cuisine: 'Indian', province: 'ON', postal: '', instagram: '', description: '',
    hours: defaultHours(),
    acceptsDineIn: true, acceptsPickup: true, acceptsDelivery: false, openToCollabs: false,
    dealMode: 'templates', deals: [],
    photoFile: null, photoPreviewUrl: '',
  });

  // Convenience: merge partial updates into wizard state
  const patch = useCallback((partial: Partial<WizardData>) => {
    setWizard((prev) => ({ ...prev, ...partial }));
  }, []);

  // ── Auth listener — runs once on mount ────────────────────────────────────
  useEffect(() => {
    // Check existing session immediately (handles page refresh while logged in)
    void supabase.auth.getUser().then(async ({ data: { user: u } }) => {
      if (!u) return;
      setUser(u);
      await resolveRestaurant(u.id);
    });

    // Also subscribe for SIGNED_IN / SIGNED_OUT events (handles OAuth callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user);
          await resolveRestaurant(session.user.id);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRestaurant(null);
          setView('auth');
        }
      }
    );
    return () => subscription.unsubscribe();
  // resolveRestaurant is stable (defined outside effect), safe to omit from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // Check if this user already has a restaurant → dashboard, otherwise onboarding
  async function resolveRestaurant(uid: string) {
    const { data: rest } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', uid)
      .maybeSingle();
    if (rest) {
      setRestaurant(rest as Restaurant);
      setView('dashboard');
    } else {
      setView('onboarding');
    }
  }

  // ── Publish (Step 5 submit) ───────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!user) return;
    setPublishing(true);
    setPublishError('');

    try {
      // 1. Create restaurant record via API route
      const res = await fetch('/api/restaurants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_id:        user.id,
          name:            wizard.name,
          cuisine:         wizard.cuisine,
          category:        CUISINE_TO_CATEGORY[wizard.cuisine] ?? 'other',
          city:            wizard.city,
          address:         wizard.address,
          phone:           wizard.phone,
          website:         wizard.website,
          instagram:       wizard.instagram,
          description:     wizard.description,
          // Serialise hours: { Mon: "11:00–22:00" } or "Closed"
          hours: Object.fromEntries(
            DAYS.map((d) => [
              d.toLowerCase(),
              wizard.hours[d].closed
                ? 'Closed'
                : `${wizard.hours[d].open}–${wizard.hours[d].close}`,
            ])
          ),
          accepts_dine_in:  wizard.acceptsDineIn,
          accepts_pickup:   wizard.acceptsPickup,
          accepts_delivery: wizard.acceptsDelivery,
          open_to_collabs:  wizard.openToCollabs,
          rating:           wizard.placeRating || 4.5,
          is_live:          false, // flipped to true below after photo upload
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { restaurant: newRest } = await res.json() as { restaurant: Restaurant };

      // 2. Upload cover photo to Supabase Storage (if the user chose one)
      let coverUrl: string | null = null;
      if (wizard.photoFile) {
        const ext  = wizard.photoFile.name.split('.').pop() ?? 'jpg';
        const path = `covers/${newRest.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('restaurant-photos')
          .upload(path, wizard.photoFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage
            .from('restaurant-photos')
            .getPublicUrl(path);
          coverUrl = pub.publicUrl;
        }
      }

      // 3. Mark is_live and save cover URL
      await fetch(`/api/restaurants/${newRest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_live: true, cover_url: coverUrl }),
      });

      // 4. Create any deals the user added during onboarding
      for (const draft of wizard.deals) {
        await fetch('/api/deals', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...draft,
            restaurant_id: newRest.id,
            max_claims: draft.max_claims ? Number(draft.max_claims) : null,
          }),
        });
      }

      // 5. Fetch the final record and flip to dashboard
      const { data: finalRest } = await supabase
        .from('restaurants').select('*').eq('id', newRest.id).single();
      setRestaurant(finalRest as Restaurant);
      setView('dashboard');
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPublishing(false);
    }
  }, [user, wizard, supabase]);

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, [supabase]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (view === 'auth') {
    return <AuthView supabase={supabase} />;
  }

  if (view === 'dashboard' && restaurant) {
    return (
      <Dashboard
        restaurant={restaurant}
        user={user!}
        onSignOut={handleSignOut}
        supabase={supabase}
      />
    );
  }

  // Onboarding wizard
  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-5">
          <div className="font-display text-3xl font-extrabold tracking-tight leading-none mb-1">
            Rep<span className="text-brand">EAT</span>
          </div>
          <p className="text-t2 text-sm">Restaurant Portal — go live in minutes</p>
        </div>

        <StepIndicator current={step} />

        {/* Card */}
        <div className="bg-surface rounded-brand shadow-brand p-6 mt-4">
          {step === 1 && <Step1Places wizard={wizard} patch={patch} />}
          {step === 2 && <Step2Details wizard={wizard} patch={patch} />}
          {step === 3 && <Step3Hours   wizard={wizard} patch={patch} />}
          {step === 4 && <Step4Deals   wizard={wizard} patch={patch} />}
          {step === 5 && (
            <Step5Photo
              wizard={wizard}
              patch={patch}
              publishing={publishing}
              publishError={publishError}
              onPublish={handlePublish}
            />
          )}

          {/* Back / Continue nav (hidden on step 5 where Publish replaces Continue) */}
          {step < 5 && (
            <div className="flex justify-between mt-6 pt-4 border-t border-[var(--bd)]">
              <button
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                className="inline-flex items-center gap-1.5 px-4 h-10 rounded-brands border border-[var(--bd2)] text-t2 text-sm font-semibold disabled:opacity-40 hover:border-brand hover:text-brand transition-colors"
              >
                <IconArrowLeft size={15} /> Back
              </button>
              <button
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="inline-flex items-center gap-1.5 px-5 h-10 bg-brand hover:bg-brand2 text-white rounded-brands text-sm font-semibold transition-colors"
              >
                Continue <IconArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── StepIndicator ────────────────────────────────────────────────────────────

const STEP_LABELS = ['Find', 'Details', 'Hours', 'Deals', 'Photo'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-start justify-center">
      {STEP_LABELS.map((label, idx) => {
        const n = idx + 1;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  done   ? 'bg-brand text-white' :
                  active ? 'bg-brand text-white ring-4 ring-brand/20' :
                           'bg-surface2 text-t3'
                }`}
              >
                {done ? <IconCheck size={14} /> : n}
              </div>
              <span className={`text-[11px] mt-1 font-medium ${active ? 'text-brand' : 'text-t3'}`}>
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              // Connector line between circles
              <div className={`w-10 h-0.5 mx-1 mb-4 ${done ? 'bg-brand' : 'bg-[var(--bd2)]'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AuthView ─────────────────────────────────────────────────────────────────

function AuthView({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const fn = isSignUp
      ? supabase.auth.signUp({ email, password })
      : supabase.auth.signInWithPassword({ email, password });
    const { error: authErr } = await fn;
    setLoading(false);
    if (authErr) setError(authErr.message);
    // Success → onAuthStateChange in the parent handles view transition
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-[14px] text-t2 hover:text-brand mb-6 transition-colors"
        >
          <IconArrowLeft size={16} /> Back to home
        </a>

        <div className="bg-surface rounded-brand shadow-brand p-7">
          {/* Brand header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-brands bg-[#ECFDF5] flex items-center justify-center">
              <IconBuildingStore size={24} style={{ color: '#065F46' }} />
            </div>
            <div>
              <div className="font-display text-[22px] font-extrabold tracking-tight leading-none">
                Rep<span className="text-brand">EAT</span>
              </div>
              <p className="text-[12px] text-t2">Restaurant Portal · Ontario</p>
            </div>
          </div>

          <p className="text-sm text-t2 mb-5">
            {isSignUp
              ? 'Create a free account to list your restaurant.'
              : 'Sign in to manage your deals and collabs.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1">Email</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="owner@restaurant.com" required
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1">Password</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" required
                className="w-full h-11 px-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-[#065F46] focus:ring-2 focus:ring-[#065F46]/10 transition-all"
              />
            </div>
            {error && (
              <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2">{error}</p>
            )}
            <button
              type="submit" disabled={loading}
              className="w-full h-11 bg-[#065F46] hover:bg-[#047857] disabled:opacity-60 text-white font-semibold rounded-brands transition-colors"
            >
              {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="flex items-center gap-2 mb-3">
            <div className="flex-1 h-px bg-[var(--bd)]" />
            <span className="text-[12px] text-t3">or</span>
            <div className="flex-1 h-px bg-[var(--bd)]" />
          </div>

          <button
            onClick={handleGoogle}
            className="w-full h-11 border border-[var(--bd2)] rounded-brands font-semibold text-[14px] text-tx hover:border-[#065F46] hover:text-[#065F46] transition-all flex items-center justify-center gap-2"
          >
            <span className="text-[16px]">G</span> Continue with Google
          </button>

          <p className="text-center text-[13px] text-t2 mt-4">
            {isSignUp ? 'Already have an account?' : 'No account yet?'}{' '}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-brand font-semibold"
            >
              {isSignUp ? 'Sign in →' : 'Create one free →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Google Places search ─────────────────────────────────────────────

function Step1Places({
  wizard, patch,
}: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const [query,    setQuery]    = useState(wizard.name);
  const [results,  setResults]  = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(!!wizard.name);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce — fire the Places search 500 ms after the user stops typing
  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`/api/google-places?q=${encodeURIComponent(query)}`);
        const json = await res.json() as { places?: PlaceSuggestion[] };
        setResults(json.places ?? []);
      } catch { setResults([]); }
      finally  { setSearching(false); }
    }, 500);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected]);

  const handleSelect = (place: PlaceSuggestion) => {
    // Try to match a known Ontario city in the address string
    const matched = ONTARIO_CITIES.find((c) => place.address.includes(c));
    // Fallback: second comma-segment of the address often contains the city
    const fallbackCity = place.address.split(',')[1]?.trim() ?? 'Toronto';
    patch({
      name: place.name, address: place.address,
      city: matched ?? fallbackCity,
      phone: place.phone, website: place.website, placeRating: place.rating,
    });
    setQuery(place.name);
    setResults([]);
    setSelected(true);
  };

  const handleClear = () => {
    setQuery(''); setSelected(false);
    patch({ name: '', address: '', phone: '', website: '', placeRating: 0 });
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Find your restaurant</h2>
      <p className="text-t2 text-sm mb-5">
        Search by name — we&apos;ll pull in your Google Business info automatically.
      </p>

      {/* Search box */}
      <div className="relative mb-4">
        <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(false); }}
          placeholder="e.g. Pai Northern Thai Kitchen, Toronto"
          className="w-full h-11 pl-9 pr-10 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
        />
        {searching && (
          <IconLoader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t3 animate-spin" />
        )}
        {!searching && (query || selected) && (
          <button onClick={handleClear} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t3 hover:text-tx">
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {results.length > 0 && (
        <ul className="border border-[var(--bd2)] rounded-brands overflow-hidden shadow-brand mb-4">
          {results.map((r, i) => (
            <li key={`${r.name}-${i}`}>
              <button
                onClick={() => handleSelect(r)}
                className="w-full text-left px-4 py-3 hover:bg-surface2 transition-colors border-b border-[var(--bd)] last:border-0"
              >
                <div className="font-semibold text-sm text-tx">{r.name}</div>
                <div className="text-xs text-t2 mt-0.5">{r.address}</div>
                {r.rating > 0 && (
                  <div className="text-xs text-t3 mt-0.5">
                    <IconStar size={11} className="inline mr-0.5 text-yellow-500" />
                    {r.rating}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Editable fields shown after a place is selected */}
      {selected && (
        <div className="space-y-3 pt-1">
          <div className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 rounded-brands px-3 py-1.5 mb-1">
            <IconCheck size={13} /> Business info imported — edit any field below
          </div>

          <InputField label="Restaurant name" value={wizard.name}
            onChange={(v) => patch({ name: v })} />
          <InputField
            label="Address" value={wizard.address} onChange={(v) => patch({ address: v })}
            icon={<IconMapPin size={14} className="text-t3" />}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[13px] font-semibold text-t2 mb-1">City</label>
              <select
                value={wizard.city}
                onChange={(e) => patch({ city: e.target.value })}
                className="w-full h-10 px-3 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-sm outline-none focus:border-brand transition-all"
              >
                {ONTARIO_CITIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <InputField
              label="Phone" value={wizard.phone} onChange={(v) => patch({ phone: v })}
              icon={<IconPhone size={14} className="text-t3" />}
            />
          </div>
          <InputField
            label="Website" value={wizard.website} onChange={(v) => patch({ website: v })}
            icon={<IconGlobe size={14} className="text-t3" />}
          />
        </div>
      )}

      {/* Skip / manual entry option */}
      {!selected && (
        <p className="text-center text-[13px] text-t3 mt-4">
          Not on Google?{' '}
          <button
            onClick={() => { patch({ name: query || 'My Restaurant' }); setSelected(true); }}
            className="text-brand font-semibold"
          >
            Enter details manually →
          </button>
        </p>
      )}
    </div>
  );
}

// ─── Step 2: Details ──────────────────────────────────────────────────────────

function Step2Details({
  wizard, patch,
}: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Restaurant details</h2>
      <p className="text-t2 text-sm mb-5">A few more details so customers know what to expect.</p>

      <div className="space-y-3">
        <div>
          <label className="block text-[13px] font-semibold text-t2 mb-1">Cuisine type</label>
          <select
            value={wizard.cuisine}
            onChange={(e) => patch({ cuisine: e.target.value })}
            className="w-full h-10 px-3 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-sm outline-none focus:border-brand transition-all"
          >
            {CUISINES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>

        <InputField
          label="Instagram handle (optional)" value={wizard.instagram}
          onChange={(v) => patch({ instagram: v })} placeholder="@yourrestaurant"
          icon={<IconBrandInstagram size={14} className="text-t3" />}
        />

        <div>
          <label className="block text-[13px] font-semibold text-t2 mb-1">Short description</label>
          <textarea
            value={wizard.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="What makes your place special? (1–2 sentences)"
            rows={3}
            className="w-full px-3.5 py-2.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InputField
            label="Province" value={wizard.province}
            onChange={(v) => patch({ province: v })} placeholder="ON"
          />
          <InputField
            label="Postal code" value={wizard.postal}
            onChange={(v) => patch({ postal: v })} placeholder="M5V 3A8"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Hours + service toggles ─────────────────────────────────────────

function Step3Hours({
  wizard, patch,
}: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  // Update a single field within a single day's hours entry
  const updateHours = (day: string, field: keyof HoursEntry, value: string | boolean) => {
    patch({
      hours: { ...wizard.hours, [day]: { ...wizard.hours[day], [field]: value } },
    });
  };

  // Copy one day's open/close times to all currently-open days
  const applyToAll = (day: string) => {
    const src = wizard.hours[day];
    const updated = { ...wizard.hours };
    DAYS.forEach((d) => {
      if (!updated[d].closed) {
        updated[d] = { ...updated[d], open: src.open, close: src.close };
      }
    });
    patch({ hours: updated });
  };

  const SERVICE_TOGGLES = [
    { key: 'acceptsDineIn'  as const, label: 'Dine-in',          emoji: '🍽️' },
    { key: 'acceptsPickup'  as const, label: 'Pickup',           emoji: '🥡' },
    { key: 'acceptsDelivery' as const, label: 'Delivery',        emoji: '🛵' },
    { key: 'openToCollabs'  as const, label: 'Open to collabs',  emoji: '📸' },
  ];

  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Hours & services</h2>
      <p className="text-t2 text-sm mb-5">
        Set your operating hours and which order types you accept.
      </p>

      {/* Day-by-day hours editor */}
      <div className="space-y-2 mb-6">
        {DAYS.map((day) => {
          const entry = wizard.hours[day];
          return (
            <div key={day} className="flex items-center gap-2">
              {/* Day label — click to toggle closed */}
              <button
                onClick={() => updateHours(day, 'closed', !entry.closed)}
                className={`w-12 py-1 text-center text-[11px] font-bold rounded-brands border transition-colors shrink-0 ${
                  entry.closed
                    ? 'bg-surface2 border-[var(--bd)] text-t3'
                    : 'bg-brand/10 border-brand/30 text-brand'
                }`}
              >
                {day}
              </button>

              {entry.closed ? (
                <span className="text-sm text-t3 italic">Closed</span>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time" value={entry.open}
                    onChange={(e) => updateHours(day, 'open', e.target.value)}
                    className="h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand transition-all"
                  />
                  <span className="text-t3 text-sm">–</span>
                  <input
                    type="time" value={entry.close}
                    onChange={(e) => updateHours(day, 'close', e.target.value)}
                    className="h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand transition-all"
                  />
                  <button
                    onClick={() => applyToAll(day)}
                    className="text-[11px] text-t3 hover:text-brand ml-1 whitespace-nowrap"
                    title="Apply these hours to all open days"
                  >
                    Apply all
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Service toggles */}
      <div className="border-t border-[var(--bd)] pt-4">
        <p className="text-[13px] font-semibold text-t2 mb-3">Services you offer</p>
        <div className="grid grid-cols-2 gap-2">
          {SERVICE_TOGGLES.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => patch({ [key]: !wizard[key] } as Partial<WizardData>)}
              className={`h-11 rounded-brands border text-sm font-semibold transition-colors ${
                wizard[key]
                  ? 'bg-brand text-white border-brand'
                  : 'bg-surface border-[var(--bd2)] text-t2 hover:border-brand hover:text-brand'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: Deal creator ─────────────────────────────────────────────────────

function Step4Deals({
  wizard, patch,
}: { wizard: WizardData; patch: (p: Partial<WizardData>) => void }) {
  const MODES = [
    { id: 'templates' as const, label: 'Templates', Icon: IconLayoutGrid },
    { id: 'manual'    as const, label: 'Manual',    Icon: IconPencil },
    { id: 'voice'     as const, label: 'Voice',     Icon: IconMicrophone },
    { id: 'menu'      as const, label: 'Menu Import', Icon: IconFileText },
  ];

  const addDeal = (draft: Partial<DealDraft>) => {
    patch({
      deals: [
        ...wizard.deals,
        {
          emoji: '🍽️', title: '', description: '', discount_type: 'percentage',
          discount_value: '', scope: 'menu', deal_types: ['dine-in'],
          available_days: ['all'], valid_from: todayStr(), valid_until: nextMonthStr(),
          max_claims: '', is_coming: false,
          ...draft,
        },
      ],
    });
  };

  const removeDeal = (idx: number) => {
    patch({ deals: wizard.deals.filter((_, i) => i !== idx) });
  };

  const updateDeal = (idx: number, partial: Partial<DealDraft>) => {
    patch({ deals: wizard.deals.map((d, i) => i === idx ? { ...d, ...partial } : d) });
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Create your deals</h2>
      <p className="text-t2 text-sm mb-4">
        Add promotions for customers to claim. You can always add more later from the dashboard.
      </p>

      {/* Mode tab bar */}
      <div className="flex gap-1.5 p-1 bg-surface2 rounded-brands mb-5">
        {MODES.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => patch({ dealMode: id })}
            className={`flex-1 flex items-center justify-center gap-1 h-9 rounded-[7px] text-[13px] font-semibold transition-colors ${
              wizard.dealMode === id
                ? 'bg-surface text-brand shadow-sm'
                : 'text-t2 hover:text-tx'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Templates */}
      {wizard.dealMode === 'templates' && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DEAL_TEMPLATES.map((t) => {
            const isAdded = wizard.deals.some((d) => d.title === t.title);
            return (
              <button
                key={t.title}
                onClick={() => !isAdded && addDeal({ ...t, deal_types: [...t.deal_types] })}
                disabled={isAdded}
                className={`text-left p-3 border rounded-brands transition-all ${
                  isAdded
                    ? 'border-brand/40 bg-brand/5 cursor-default opacity-70'
                    : 'border-[var(--bd2)] hover:border-brand hover:bg-brand/5 cursor-pointer'
                }`}
              >
                <div className="text-xl mb-1">{t.emoji}</div>
                <div className="text-[13px] font-semibold text-tx leading-tight">{t.title}</div>
                <div className="text-[11px] text-t2 mt-0.5">{t.discount_value}</div>
                {isAdded && <div className="text-[11px] text-brand font-bold mt-1">Added</div>}
              </button>
            );
          })}
        </div>
      )}

      {/* Manual — tap to add blank deal */}
      {wizard.dealMode === 'manual' && (
        <button
          onClick={() => addDeal({})}
          className="w-full h-11 border-2 border-dashed border-[var(--bd2)] rounded-brands text-t2 text-sm font-semibold hover:border-brand hover:text-brand transition-colors flex items-center justify-center gap-2 mb-3"
        >
          <IconPlus size={16} /> Add a deal
        </button>
      )}

      {/* Voice */}
      {wizard.dealMode === 'voice' && (
        <VoiceMode
          onCapture={(text) => addDeal({ title: text.slice(0, 60), description: text })}
        />
      )}

      {/* Menu import */}
      {wizard.dealMode === 'menu' && (
        <MenuImportMode
          onImport={(items) =>
            items.forEach((item) =>
              addDeal({ title: `${item} Deal`, description: `Promotion on ${item}.`, emoji: '🍽️' })
            )
          }
        />
      )}

      {/* Current deals list */}
      {wizard.deals.length > 0 && (
        <div className="space-y-3 mt-3">
          <p className="text-[13px] font-semibold text-t2">
            {wizard.deals.length} deal{wizard.deals.length !== 1 ? 's' : ''} added:
          </p>
          {wizard.deals.map((deal, idx) => (
            <DealEditor
              key={idx}
              deal={deal}
              onChange={(p) => updateDeal(idx, p)}
              onRemove={() => removeDeal(idx)}
            />
          ))}
        </div>
      )}

      {wizard.deals.length === 0 && wizard.dealMode !== 'voice' && wizard.dealMode !== 'menu' && (
        <p className="text-center text-[13px] text-t3 mt-3">
          No deals yet — you can also skip and add them from the dashboard.
        </p>
      )}
    </div>
  );
}

// ─── Deal editor row ──────────────────────────────────────────────────────────

const DEAL_EMOJIS = ['🍽️','🥗','🍺','⏰','👨‍👩‍👧','🎉','🥡','💚','🔥','🌮','🍣','🍕','🧆','🥩','🍜'];

function DealEditor({
  deal, onChange, onRemove,
}: { deal: DealDraft; onChange: (p: Partial<DealDraft>) => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-[var(--bd2)] rounded-brands overflow-hidden">
      {/* Collapsed header row */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <select
          value={deal.emoji}
          onChange={(e) => onChange({ emoji: e.target.value })}
          className="text-xl bg-transparent border-none outline-none cursor-pointer"
        >
          {DEAL_EMOJIS.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <input
          type="text"
          value={deal.title}
          onChange={(e) => onChange({ title: e.target.value })}
          placeholder="Deal title…"
          className="flex-1 bg-transparent text-sm font-semibold text-tx outline-none placeholder:text-t3"
        />
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-t3 hover:text-brand font-semibold"
        >
          {expanded ? 'Less' : 'More'}
        </button>
        <button onClick={onRemove} className="text-t3 hover:text-red-500 ml-0.5">
          <IconTrash size={15} />
        </button>
      </div>

      {/* Expanded options */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2.5 border-t border-[var(--bd)] bg-surface2">
          <div className="pt-2">
            <label className="block text-[12px] font-semibold text-t2 mb-1">Description</label>
            <textarea
              value={deal.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={2} placeholder="What's included in this deal?"
              className="w-full px-3 py-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Discount type</label>
              <select
                value={deal.discount_type}
                onChange={(e) => onChange({ discount_type: e.target.value })}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              >
                <option value="percentage">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="free_item">Free item</option>
                <option value="bogo">BOGO</option>
                <option value="set_price">Set price</option>
                <option value="free_delivery">Free delivery</option>
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Value</label>
              <input
                type="text" value={deal.discount_value}
                onChange={(e) => onChange({ discount_value: e.target.value })}
                placeholder="20% or $5"
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Valid from</label>
              <input
                type="date" value={deal.valid_from}
                onChange={(e) => onChange({ valid_from: e.target.value })}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Valid until</label>
              <input
                type="date" value={deal.valid_until}
                onChange={(e) => onChange({ valid_until: e.target.value })}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Max claims (blank = unlimited)</label>
              <input
                type="number" value={deal.max_claims}
                onChange={(e) => onChange({ max_claims: e.target.value })}
                placeholder="No limit" min="1"
                className="w-32 h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-t2 cursor-pointer pb-1">
              <input
                type="checkbox" checked={deal.is_coming}
                onChange={(e) => onChange({ is_coming: e.target.checked })}
                className="accent-brand"
              />
              Coming soon
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Voice mode ───────────────────────────────────────────────────────────────

function VoiceMode({ onCapture }: { onCapture: (text: string) => void }) {
  const [listening,   setListening]   = useState(false);
  const [transcript,  setTranscript]  = useState('');
  // Feature-detect the Web Speech API (Chrome/Edge only)
  const supported = typeof window !== 'undefined' && 'webkitSpeechRecognition' in window;
  const recRef = useRef<{ start(): void; stop(): void } | null>(null);

  const toggle = () => {
    if (!supported) return;
    if (listening) { recRef.current?.stop(); setListening(false); return; }
    type SpeechRecAPI = { continuous: boolean; lang: string; start(): void; stop(): void; onresult: unknown; onend: unknown };
    type WinWithSpeech = Window & { webkitSpeechRecognition: new () => SpeechRecAPI };
    const SpeechRec = (window as unknown as WinWithSpeech).webkitSpeechRecognition;
    const rec: SpeechRecAPI = new SpeechRec();
    rec.continuous = false;
    rec.lang = 'en-CA';
    rec.onresult = (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => {
      setTranscript(Array.from(e.results)[0][0].transcript);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  if (!supported) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-t2">Voice input requires Chrome or Edge on desktop.</p>
      </div>
    );
  }

  return (
    <div className="text-center py-4">
      <button
        onClick={toggle}
        className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-white shadow-brand2 transition-all ${
          listening ? 'bg-red-500 animate-pulse' : 'bg-brand hover:bg-brand2'
        }`}
      >
        <IconMicrophone size={28} />
      </button>
      <p className="text-sm text-t2 mb-3">
        {listening ? 'Listening… say your deal out loud.' : 'Tap to start speaking.'}
      </p>
      {transcript && (
        <>
          <div className="bg-surface2 rounded-brands px-4 py-3 text-sm text-tx mb-3 text-left">
            &quot;{transcript}&quot;
          </div>
          <button
            onClick={() => { onCapture(transcript); setTranscript(''); }}
            className="px-4 h-9 bg-brand text-white rounded-brands text-sm font-semibold hover:bg-brand2 transition-colors"
          >
            Add this deal →
          </button>
        </>
      )}
    </div>
  );
}

// ─── Menu import mode ─────────────────────────────────────────────────────────

function MenuImportMode({ onImport }: { onImport: (items: string[]) => void }) {
  const [text, setText] = useState('');
  const lines = text.split('\n').filter((l) => l.trim().length > 2);

  return (
    <div>
      <p className="text-[13px] text-t2 mb-2">
        Paste menu items one per line — we&apos;ll create a deal draft for each.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={6}
        placeholder={'Butter Chicken\nPalak Paneer\nGarlic Naan\nMango Lassi'}
        className="w-full px-3.5 py-2.5 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all resize-none mb-3"
      />
      <button
        onClick={() => { onImport(lines); setText(''); }}
        disabled={lines.length === 0}
        className="px-5 h-10 bg-brand text-white rounded-brands text-sm font-semibold hover:bg-brand2 disabled:opacity-50 transition-colors"
      >
        Import {lines.length} item{lines.length !== 1 ? 's' : ''} →
      </button>
    </div>
  );
}

// ─── Step 5: Photo upload ─────────────────────────────────────────────────────

function Step5Photo({
  wizard, patch, publishing, publishError, onPublish,
}: {
  wizard: WizardData;
  patch: (p: Partial<WizardData>) => void;
  publishing: boolean;
  publishError: string;
  onPublish: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    patch({
      photoFile: file,
      // createObjectURL gives an instant local preview without uploading yet
      photoPreviewUrl: URL.createObjectURL(file),
    });
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Add a cover photo</h2>
      <p className="text-t2 text-sm mb-5">
        A great photo increases deal claims by 3x. You can skip and add later.
      </p>

      {/* Preview card */}
      <div className="bg-surface2 rounded-brand p-4 mb-5">
        <div className="text-[11px] font-bold text-t3 uppercase tracking-wide mb-2">How your listing will look</div>
        <div className="bg-surface rounded-brands border border-[var(--bd)] overflow-hidden shadow-sm">
          {/* Cover image slot */}
          <div className="h-28 bg-surface2 flex items-center justify-center overflow-hidden relative">
            {wizard.photoPreviewUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={wizard.photoPreviewUrl} alt="Cover preview" className="w-full h-full object-cover" />
              : <IconPhoto size={32} className="text-t3" />
            }
          </div>
          <div className="p-3">
            <div className="font-bold text-sm text-tx">{wizard.name || 'Your Restaurant'}</div>
            <div className="text-xs text-t2">{wizard.cuisine} · {wizard.city}</div>
            <div className="mt-1.5">
              <span className="text-[11px] bg-brandlt text-brand font-bold px-2 py-0.5 rounded-full">
                {wizard.deals.length} deal{wizard.deals.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type.startsWith('image/')) handleFile(f); }}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-[var(--bd2)] rounded-brand p-8 text-center cursor-pointer hover:border-brand hover:bg-brand/5 transition-all mb-5"
      >
        <IconUpload size={28} className="mx-auto text-t3 mb-2" />
        <p className="text-sm font-semibold text-t2">
          {wizard.photoPreviewUrl ? 'Change photo' : 'Upload cover photo'}
        </p>
        <p className="text-xs text-t3 mt-1">Drag & drop or click · JPG, PNG, WebP · max 5 MB</p>
        <input
          ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {publishError && (
        <p className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-brands px-3 py-2 mb-4">
          {publishError}
        </p>
      )}

      <button
        onClick={onPublish}
        disabled={publishing}
        className="w-full h-12 bg-brand hover:bg-brand2 disabled:opacity-60 text-white font-bold text-[15px] rounded-brands transition-colors flex items-center justify-center gap-2"
      >
        {publishing
          ? <><IconLoader2 size={18} className="animate-spin" /> Publishing…</>
          : '🚀 Go live now!'
        }
      </button>
      <p className="text-center text-[12px] text-t3 mt-2">
        Your listing goes live instantly. Pause or edit deals at any time.
      </p>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function Dashboard({ restaurant, onSignOut, supabase }: {
  restaurant: Restaurant;
  user: SupabaseUser;
  onSignOut: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [deals,   setDeals]   = useState<Deal[]>([]);
  const [collabs, setCollabs] = useState<Collab[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [dr, cr] = await Promise.all([
        supabase.from('deals').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }),
        supabase.from('collabs').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }),
      ]);
      setDeals((dr.data ?? []) as Deal[]);
      setCollabs((cr.data ?? []) as Collab[]);
      setLoading(false);
    }
    void load();
  }, [restaurant.id, supabase]);

  const totalClaims  = deals.reduce((s, d) => s + d.current_claims, 0);
  const activeDeals  = deals.filter((d) => d.is_active && !d.is_coming);
  const openCollabs  = collabs.filter((c) => c.status === 'open' || c.status === 'negotiating');

  const STATS = [
    { label: 'Total claims',    value: totalClaims,        emoji: '🎟️' },
    { label: 'Active deals',    value: activeDeals.length, emoji: '🔥' },
    { label: 'Collab requests', value: openCollabs.length, emoji: '📸' },
    { label: 'Rating',          value: restaurant.rating.toFixed(1), emoji: '⭐' },
  ];

  const toggleActive = async (deal: Deal) => {
    await supabase.from('deals').update({ is_active: !deal.is_active }).eq('id', deal.id);
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, is_active: !d.is_active } : d));
  };

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sticky header */}
      <header className="bg-surface border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-brands bg-[#ECFDF5] flex items-center justify-center">
              <IconBuildingStore size={18} style={{ color: '#065F46' }} />
            </div>
            <div>
              <div className="font-display text-[15px] font-extrabold leading-none">
                Rep<span className="text-brand">EAT</span>
              </div>
              <div className="text-[11px] text-t2 leading-none mt-0.5">{restaurant.name}</div>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="inline-flex items-center gap-1.5 text-[13px] text-t2 hover:text-tx transition-colors"
          >
            <IconLogout size={16} /> Sign out
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome banner */}
        <div className="bg-surface rounded-brand shadow-brand p-5 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-extrabold">{restaurant.name}</h1>
            <p className="text-t2 text-sm">{restaurant.city} · {restaurant.cuisine}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${
                restaurant.is_live
                  ? 'bg-green-100 text-green-700'
                  : 'bg-surface2 text-t3'
              }`}>
                {restaurant.is_live ? '🟢 Live' : '⏸ Paused'}
              </span>
              {restaurant.rating > 0 && (
                <span className="text-[12px] text-t2">⭐ {restaurant.rating}</span>
              )}
            </div>
          </div>
          <div className="w-14 h-14 rounded-brands bg-surface2 flex items-center justify-center text-3xl shrink-0">
            🍽️
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-surface rounded-brands shadow-brand p-4 text-center">
              <div className="text-2xl mb-1">{s.emoji}</div>
              <div className="font-display text-2xl font-extrabold text-tx">{s.value}</div>
              <div className="text-[12px] text-t2 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Deals section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg font-bold">Your deals</h2>
            <a
              href="/restaurant/deals/new"
              className="inline-flex items-center gap-1 text-[13px] text-brand font-semibold hover:underline"
            >
              <IconPlus size={15} /> Add deal
            </a>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-16 bg-surface animate-pulse rounded-brands" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <div className="bg-surface rounded-brand border-2 border-dashed border-[var(--bd2)] p-8 text-center">
              <p className="text-t2 text-sm mb-3">No deals yet. Add your first promotion!</p>
              <a
                href="/restaurant/deals/new"
                className="inline-flex items-center gap-1.5 px-4 h-9 bg-brand text-white rounded-brands text-sm font-semibold"
              >
                <IconPlus size={15} /> Create a deal
              </a>
            </div>
          ) : (
            <div className="space-y-2">
              {deals.map((deal) => (
                <div key={deal.id} className="bg-surface rounded-brands shadow-brand p-4 flex items-center gap-3">
                  <span className="text-2xl shrink-0">{deal.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-tx truncate">{deal.title}</div>
                    <div className="text-[12px] text-t2">
                      {deal.current_claims} claim{deal.current_claims !== 1 ? 's' : ''}
                      {deal.max_claims ? ` / ${deal.max_claims} max` : ''}
                      {' · '}
                      {deal.is_coming ? '🔜 Coming soon' : deal.is_active ? '🟢 Active' : '⏸ Paused'}
                    </div>
                    {/* Claim progress bar — width is dynamic so must use inline style */}
                    {deal.max_claims !== null && deal.max_claims > 0 && (
                      <div className="mt-1.5 h-1.5 bg-surface2 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand rounded-full transition-all"
                          style={{ width: `${Math.min(100, (deal.current_claims / deal.max_claims) * 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => toggleActive(deal)}
                    className={`shrink-0 text-[12px] font-semibold px-3 py-1 rounded-brands border transition-colors ${
                      deal.is_active
                        ? 'border-[var(--bd2)] text-t2 hover:border-red-300 hover:text-red-500'
                        : 'border-brand/40 text-brand hover:bg-brand hover:text-white'
                    }`}
                  >
                    {deal.is_active ? 'Pause' : 'Activate'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Collab requests (only shown when there are open ones) */}
        {openCollabs.length > 0 && (
          <section>
            <h2 className="font-display text-lg font-bold mb-3">
              Collab requests
              <span className="ml-2 text-[13px] font-semibold text-brand bg-brandlt px-2 py-0.5 rounded-full">
                {openCollabs.length}
              </span>
            </h2>
            <div className="space-y-2">
              {openCollabs.map((c) => (
                <div key={c.id} className="bg-surface rounded-brands shadow-brand p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-brands bg-[#FDF4FF] flex items-center justify-center text-xl shrink-0">
                    📸
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-tx truncate">
                      {c.deliverables ?? 'Collab request'}
                    </div>
                    <div className="text-[12px] text-t2">
                      {c.offer_amount_min && c.offer_amount_max
                        ? `$${c.offer_amount_min}–$${c.offer_amount_max}`
                        : 'Offer TBD'}
                      {' · '}
                      <span className={c.status === 'negotiating' ? 'text-brand' : 'text-t3'}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                  <a
                    href={`/restaurant/collabs/${c.id}`}
                    className="text-[13px] text-brand font-semibold hover:underline shrink-0"
                  >
                    View →
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

// ─── Shared InputField ────────────────────────────────────────────────────────
// Avoids repeating label + input boilerplate across every wizard step.

function InputField({ label, value, onChange, placeholder, icon }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold text-t2 mb-1">{label}</label>
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full h-10 ${icon ? 'pl-8' : 'px-3.5'} pr-3.5 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all`}
        />
      </div>
    </div>
  );
}
