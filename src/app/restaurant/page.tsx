'use client';

// Restaurant portal — three views:
//   'auth'        → sign-in / sign-up form
//   'onboarding'  → 5-step wizard (Find → Details → Hours → Deals → Photo)
//   'dashboard'   → stats + deals list + collab requests

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import type { Restaurant, Deal, Collab } from '@/types';
import CreateDealModal from '@/components/restaurant/CreateDealModal';
import {
  DISCOUNT_TYPE_OPTIONS,
  PRICE_TAG_OPTIONS,
  defaultDiscountValue,
  discountValuePlaceholder,
  isLbDiscount,
  toDbDiscountType,
  type PriceTag,
  type RestaurantDiscountType,
} from '@/lib/restaurantDealForm';
import { dealUsesBasePrice, isFreeItemDiscount, getEffectivePrice, priceTagForPrice } from '@/lib/dealPricing';
import ScannerPanel from '@/components/restaurant/ScannerPanel';
import RestaurantSearch, { type PlaceResult } from '@/components/restaurant/RestaurantSearch';
import {
  defaultHours as defaultHoursEntries,
  hoursRecordToEntries,
  entriesToHoursRecord,
  parseGoogleHours,
  RESTAURANT_DAYS,
  type HoursEntry,
} from '@/lib/restaurantHours';
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
  IconPlayerPause,
  IconPlayerPlay,
  IconShieldLock,
  IconShieldOff,
  IconCreditCard,
  IconLock,
  IconAlertTriangle,
  IconQrcode,
  IconChartBar,
  IconTag,
  IconClock,
  IconChevronRight,
  IconChevronDown,
  IconBrandApple,
  IconBrandGoogle,
  IconBuildingBank,
  IconSettings,
  IconRepeat,
  IconMinus,
  IconHelp,
} from '@tabler/icons-react';
import RestaurantAnalytics from '@/components/restaurant/RestaurantAnalytics';
import type { ClaimRow } from '@/lib/restaurantAnalytics';
import { fetchRestaurantDashboardStats } from '@/lib/fetchRestaurantDashboardStats';
import { setPortalIntent, startGoogleOAuth, signOutFromPortal } from '@/lib/portalAuth';
import { handleOAuthReturn } from '@/lib/oauthCallback';
import { formatDealTitle } from '@/lib/utils';
import {
  dealMatchesScheduleFilter,
  formatDealScheduleDays,
  type DealScheduleFilter,
  WEEKDAY_LABELS,
} from '@/lib/dealSchedule';
import { coordsForCity, DEFAULT_SEARCH_RADIUS_KM } from '@/lib/location';

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

// Ready-to-use deal templates shown in Step 4 Templates mode
const DEAL_TEMPLATES = [
  { emoji: '🍽️', title: '20% Off Full Menu',   discount_type: 'percentage', discount_value: '20%',          description: 'Get 20% off everything on our menu.',              scope: 'menu',     deal_types: ['dine-in', 'pickup'] },
  { emoji: '🥗', title: 'Free Appetizer',        discount_type: 'free_item',  discount_value: 'Free appetizer', description: 'Free starter with any main course order.',         scope: 'single',   deal_types: ['dine-in'] },
  { emoji: '🍺', title: 'BOGO Drinks',           discount_type: 'bogo',       discount_value: 'Buy 1 Get 1 Free', description: 'Buy one drink, get one free.',                   scope: 'category', deal_types: ['dine-in'] },
  { emoji: '🥡', title: 'Buy 1 Get 1 50% Off', discount_type: 'bogo_half',  discount_value: '50% off 2nd item', description: 'Second item half price — great for takeout specials.', scope: 'single', deal_types: ['pickup'] },
  { emoji: '🐟', title: 'Fish Pakora lb Deal',   discount_type: 'bogo_lb',    discount_value: '50% off 2nd lb', description: 'Buy 1 lb Fish Pakora, get the 2nd lb 50% off.',    scope: 'single',   scope_detail: 'Fish Pakora', deal_types: ['pickup'] },
  { emoji: '💵', title: '$12 Daily Special',     discount_type: 'set_price',  discount_value: '$12',            description: 'Full meal special for $12.',                       scope: 'single',   deal_types: ['pickup'], price_tag: 'under12' as PriceTag },
  { emoji: '⏰', title: 'Early Bird Special',    discount_type: 'percentage', discount_value: '15%',            description: '15% off when you dine before 6 PM.',               scope: 'menu',     deal_types: ['dine-in'] },
  { emoji: '👨‍👩‍👧', title: 'Family Feast Deal',   discount_type: 'set_price',  discount_value: '$49.99',         description: 'Family meal for 4 — mains, sides & drinks.',       scope: 'bundle',   deal_types: ['dine-in', 'pickup'] },
  { emoji: '🎉', title: 'Weekend Brunch Promo',  discount_type: 'percentage', discount_value: '25%',            description: '25% off all brunch items Sat & Sun.',              scope: 'menu',     deal_types: ['dine-in'] },
  { emoji: '🥡', title: 'Takeout Tuesday',       discount_type: 'fixed',      discount_value: '$5 off',         description: '$5 off all pickup orders on Tuesdays.',            scope: 'menu',     deal_types: ['pickup'] },
  { emoji: '💚', title: 'Loyalty Reward',        discount_type: 'free_item',  discount_value: 'Free dessert',   description: 'Free dessert on your third visit.',                scope: 'single',   deal_types: ['dine-in'] },
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

// HoursEntry imported from @/lib/restaurantHours

// A single deal being composed before it's POSTed
interface DealDraft {
  emoji: string;
  title: string;
  description: string;
  discount_type: string;
  discount_value: string;
  scope: string;
  scope_detail: string;
  deal_types: string[];
  available_days: string[];
  valid_from: string;
  valid_until: string;
  max_claims: string;   // kept as string so empty means "unlimited"
  is_coming: boolean;
  diet_type: 'veg' | 'nonveg' | 'both';
  price_tag: PriceTag;
  base_price: string;            // kept as string; '' = not set
  free_condition_type: 'spend' | 'item';
  free_condition_value: string;
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
  name: string; address: string; phone: string | null;
  website: string | null; hours: string | null; hours_raw: string[] | null;
  rating: number | null; types: string[]; place_id: string;
  source?: 'google' | 'database';
}

type ViewState = 'loading' | 'auth' | 'onboarding' | 'dashboard';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultHours(): Record<string, HoursEntry> {
  return defaultHoursEntries();
}

function todayStr(): string { return new Date().toISOString().split('T')[0]; }
function nextMonthStr(): string {
  return new Date(Date.now() + 30 * 86_400_000).toISOString().split('T')[0];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function RestaurantPage() {
  // Single Supabase client instance for the lifetime of this page
  const supabase = useRef(createClient()).current;

  const [view,        setView]       = useState<ViewState>('loading');
  const [user,        setUser]       = useState<SupabaseUser | null>(null);
  const [restaurant,  setRestaurant] = useState<Restaurant | null>(null);
  const [step,        setStep]       = useState(1);
  const [publishing,        setPublishing]        = useState(false);
  const [publishError,      setPublishError]      = useState('');
  // Set when the user already has a restaurant — shows conflict UI instead of generic error
  const [conflictRestaurant, setConflictRestaurant] = useState<Restaurant | null>(null);

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
    let mounted = true;

    const resolveSession = async (userId: string) => {
      setUser({ id: userId } as SupabaseUser);
      try {
        // Primary: always look up by owner_id — never trust any cached restaurant_id
        let { data: rest } = await supabase
          .from('restaurants')
          .select('*')
          .eq('owner_id', userId)
          .maybeSingle();

        // Fallback: if no row found by UUID, try by owner_email (handles rows created before
        // the owner_id column was populated). Critically: only repair ownership when the fresh
        // JWT user ID matches the userId we were called with — prevents a stale getSession()
        // token from corrupting a different user's restaurant.
        if (!rest) {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          // Guard: confirmed JWT user must match the session userId we received
          if (authUser?.id === userId && authUser.email) {
            const { data: byEmail } = await supabase
              .from('restaurants')
              .select('*')
              .eq('owner_email', authUser.email)
              .maybeSingle();

            if (byEmail) {
              // Repair: write owner_id so primary path works on future logins
              await supabase
                .from('restaurants')
                .update({ owner_id: userId })
                .eq('id', byEmail.id)
                .eq('owner_email', authUser.email); // extra guard: only touch this exact row
              rest = { ...byEmail, owner_id: userId } as typeof byEmail;
            }
          }
        }

        if (!mounted) return;
        if (rest) { setRestaurant(rest as Restaurant); setView('dashboard'); }
        else { setView('onboarding'); }
      } catch { if (mounted) setView('onboarding'); }
    };

    const init = async () => {
      try {
        await handleOAuthReturn(supabase, 'restaurant');
        // Use getUser() (validates JWT server-side) instead of getSession() (reads localStorage).
        // This prevents a stale cached session from loading the wrong restaurant.
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        if (!mounted) return;
        if (verifiedUser) {
          await resolveSession(verifiedUser.id);
          if (mounted) setUser(verifiedUser);
        }
      } catch (err) {
        console.error('[RestaurantPage] init error:', err);
      }
    };

    void init();

    // Safety timeout — if still loading after 3 s, fall back to login form
    const timeout = setTimeout(() => {
      if (mounted) setView((v) => v === 'loading' ? 'auth' : v);
    }, 3000);

    // onAuthStateChange fires INITIAL_SESSION (on load) + SIGNED_IN + SIGNED_OUT
    // INITIAL_SESSION fires after the client detects the cookie — this is the reliable
    // signal after an OAuth callback where getSession() may race the cookie propagation
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
          await resolveSession(session.user.id);
          if (mounted) setUser(session.user);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setRestaurant(null);
          setView('auth');
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  // ── Publish (Step 5 submit) ───────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!user) return;
    setPublishing(true);
    setPublishError('');

    // Failsafe: if publish hangs for 10s, surface an error
    let timedOut = false;
    const timeoutId = setTimeout(() => {
      timedOut = true;
      setPublishing(false);
      setPublishError('Publishing is taking too long. Please check your connection and try again.');
    }, 10000);

    try {
      // Fresh auth check — ensures the session is still valid
      const { data: { user: freshUser }, error: authErr } = await supabase.auth.getUser();
      if (authErr || !freshUser) {
        clearTimeout(timeoutId);
        setPublishError('Session expired — please sign in again.');
        setView('auth');
        return;
      }

      const hoursPayload = Object.fromEntries(
        DAYS.map((d) => [
          d.toLowerCase(),
          wizard.hours[d].closed
            ? 'Closed'
            : `${wizard.hours[d].open}–${wizard.hours[d].close}`,
        ])
      );

      const restaurantPayload = {
        owner_id:         freshUser.id,
        name:             wizard.name,
        cuisine:          wizard.cuisine  || 'Other',
        category:         CUISINE_TO_CATEGORY[wizard.cuisine] ?? 'other',
        city:             wizard.city,
        address:          wizard.address  || '',
        phone:            wizard.phone    || '',
        website:          wizard.website  || '',
        instagram:        wizard.instagram || '',
        description:      wizard.description || '',
        hours:            hoursPayload,
        accepts_dine_in:  wizard.acceptsDineIn,
        accepts_pickup:   wizard.acceptsPickup,
        accepts_delivery: wizard.acceptsDelivery,
        open_to_collabs:  wizard.openToCollabs,
        rating:           wizard.placeRating || 4.5,
        is_live:          false,
      };

      // Check if this owner already has a restaurant (re-publish scenario)
      const { data: existing } = await supabase
        .from('restaurants')
        .select('id')
        .eq('owner_id', freshUser.id)
        .maybeSingle();

      let newRest: Restaurant;

      if (existing) {
        const { data, error: updateError } = await supabase
          .from('restaurants')
          .update(restaurantPayload)
          .eq('id', existing.id)
          .select()
          .single();
        if (updateError) {
          clearTimeout(timeoutId);
          setPublishError(
            updateError.message.includes('permission') || updateError.code === '42501'
              ? 'Permission denied — please sign out and sign back in, then try again.'
              : `Could not update restaurant: ${updateError.message}`
          );
          return;
        }
        newRest = data as Restaurant;
      } else {
        const { data, error: insertError } = await supabase
          .from('restaurants')
          .insert(restaurantPayload)
          .select()
          .single();
        if (insertError) {
          clearTimeout(timeoutId);
          // 23505 = unique constraint — this owner already has a restaurant row.
          // Surface a friendly conflict UI instead of a generic error so the user
          // knows exactly what happened and can navigate to their existing dashboard.
          if (insertError.code === '23505') {
            const { data: raceRest } = await supabase
              .from('restaurants')
              .select('*')
              .eq('owner_id', freshUser.id)
              .maybeSingle();
            if (raceRest) {
              setConflictRestaurant(raceRest as Restaurant);
              setPublishError('conflict');
              setPublishing(false);
              return;
            }
          }
          setPublishError(
            insertError.message.includes('permission') || insertError.code === '42501'
              ? 'Permission denied — please sign out and sign back in, then try again.'
              : `Could not create restaurant: ${insertError.message}`
          );
          return;
        }
        newRest = data as Restaurant;
      }

      // Upload cover photo to Supabase Storage (if the user chose one)
      let coverUrl: string | null = null;
      if (wizard.photoFile) {
        const ext  = wizard.photoFile.name.split('.').pop() ?? 'jpg';
        const path = `covers/${newRest.id}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('restaurant-photos')
          .upload(path, wizard.photoFile, { upsert: true });
        if (!upErr) {
          const { data: pub } = supabase.storage.from('restaurant-photos').getPublicUrl(path);
          coverUrl = pub.publicUrl;
        }
      }

      // If the owner didn't upload a photo, kick off a background backfill to
      // fetch one from Google Places and store it in Supabase Storage.
      // Fire-and-forget — don't block the publish flow. The browser session
      // cookie is sent automatically so the route can verify ownership.
      if (!coverUrl) {
        fetch('/api/admin/backfill-photos', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ id: newRest.id }),
        }).catch(() => { /* non-critical */ });
      }

      // Mark live + save cover URL
      const updateFields: Record<string, unknown> = { is_live: true };
      if (coverUrl) updateFields.cover_url = coverUrl;
      const { data: liveRest, error: liveErr } = await supabase
        .from('restaurants')
        .update(updateFields)
        .eq('id', newRest.id)
        .select()
        .single();
      if (liveErr) {
        clearTimeout(timeoutId);
        setPublishError(`Could not go live: ${liveErr.message}`);
        return;
      }

      // Create any deals added during onboarding
      for (const draft of wizard.deals) {
        await supabase.from('deals').insert({
          restaurant_id:  newRest.id,
          emoji:          draft.emoji,
          title:          draft.title,
          description:    draft.description || null,
          discount_type:  toDbDiscountType(draft.discount_type as RestaurantDiscountType),
          discount_value: draft.discount_value || null,
          deal_types:     draft.deal_types,
          available_days: draft.available_days,
          scope:          draft.scope,
          scope_detail:   draft.scope_detail || null,
          valid_from:     draft.valid_from || null,
          valid_until:    draft.valid_until || null,
          max_claims:     draft.max_claims ? Number(draft.max_claims) : null,
          is_coming:      draft.is_coming,
          is_active:      !draft.is_coming,
          diet_type:      draft.diet_type || 'veg',
          price_tag:      draft.price_tag || null,
          base_price:     draft.discount_type !== 'free_item' && draft.base_price?.trim()
                            ? parseFloat(draft.base_price) : null,
          free_condition_type:  draft.discount_type === 'free_item' ? draft.free_condition_type : null,
          free_condition_value: draft.discount_type === 'free_item' ? (draft.free_condition_value?.trim() || null) : null,
          current_claims: 0,
        });
      }

      if (timedOut) return; // timeout already showed an error — don't navigate
      clearTimeout(timeoutId);
      setRestaurant(liveRest as Restaurant);
      setView('dashboard');

    } catch (err) {
      clearTimeout(timeoutId);
      if (timedOut) return;
      console.error('[handlePublish]', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setPublishError(
        msg.includes('permission') || msg.includes('RLS')
          ? 'Permission denied — please sign out and sign back in, then try again.'
          : msg
      );
    } finally {
      if (!timedOut) setPublishing(false);
    }
  }, [user, wizard, supabase]);

  const handleSignOut = useCallback(async () => {
    await signOutFromPortal(supabase, 'restaurant');
  }, [supabase]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
        <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

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
              conflictRestaurant={conflictRestaurant}
              onGoToDashboard={() => {
                if (conflictRestaurant) {
                  setRestaurant(conflictRestaurant);
                  setView('dashboard');
                }
              }}
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

function GoogleSVG() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.25-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function friendlyRestaurantError(msg: string) {
  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials'))
    return "Hmm, that's not right 🤔 Check your email and password";
  if (msg.includes('User already registered')) return "That email is taken — sign in instead?";
  if (msg.includes('rate limit') || msg.includes('too many')) return "Whoa, slow down! Try in 30 seconds";
  return msg;
}

function AuthView({ supabase }: { supabase: ReturnType<typeof createClient> }) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [btnState, setBtnState] = useState<'idle'|'loading'|'success'>('idle');
  const [error,    setError]    = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [cursor,   setCursor]   = useState({ x: 200, y: 200 });
  const leftRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'auth') {
      setError('Google sign-in failed. Please try again or use email.');
      window.history.replaceState({}, '', '/restaurant');
    }
  }, []);

  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const fn = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      setCursor({ x: e.clientX - r.left, y: e.clientY - r.top });
    };
    el.addEventListener('mousemove', fn);
    return () => el.removeEventListener('mousemove', fn);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp && password !== confirm) {
      setError("Passwords don't match");
      return;
    }
    setBtnState('loading'); setError('');

    if (isSignUp) {
      void setPortalIntent('restaurant');
      const { data, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { role: 'restaurant' },
          emailRedirectTo: window.location.origin,
        },
      });
      if (authErr) { setBtnState('idle'); setError(friendlyRestaurantError(authErr.message)); return; }
      setBtnState('success');
      // If Supabase auto-confirmed the email, session exists → onAuthStateChange handles it
      // Otherwise redirect to verify-email page
      if (!data.session) {
        setTimeout(() => {
          window.location.href = `/restaurant/verify-email?email=${encodeURIComponent(email)}`;
        }, 600);
      }
    } else {
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) { setBtnState('idle'); setError(friendlyRestaurantError(authErr.message)); return; }
      setBtnState('success');
      // Success → onAuthStateChange in the parent handles view transition
    }
  };

  const handleGoogle = async () => {
    await startGoogleOAuth(supabase, 'restaurant');
  };

  const GREEN = '#1249A9';

  return (
    <div className="min-h-screen flex" style={{ background: '#0D0D0D' }}>
      {/* Left panel */}
      <div
        ref={leftRef}
        className="hidden lg:flex w-[40%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: '#0a1a12' }}
      >
        <div className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(500px circle at ${cursor.x}px ${cursor.y}px, rgba(18,73,169,0.2), transparent 50%)` }} />
        <a href="/" className="text-[13px] z-10" style={{ color: 'rgba(255,255,255,0.4)' }}>← Back to home</a>
        <div className="z-10">
          <div className="w-16 h-16 rounded-2xl mb-5 flex items-center justify-center" style={{ background: 'rgba(18,73,169,0.3)', border: '1px solid rgba(18,73,169,0.5)' }}>
            <IconBuildingStore size={32} style={{ color: '#34d399' }} />
          </div>
          <p className="font-display text-[26px] font-extrabold text-white leading-tight mb-4">
            Free forever.<br/>No commission.<br/>Go live in minutes.
          </p>
          <div className="flex flex-col gap-2">
            {['50+ restaurants onboard', '168 deals claimed this week', '$0 monthly fee — always'].map((t) => (
              <div key={t} className="flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
                <span className="text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ height: 40 }} />
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: '#0D0D0D' }}>
        <div className="w-full max-w-[420px] rounded-2xl p-8" style={{ background: '#fff', borderTop: `4px solid ${GREEN}`, boxShadow: '0 25px 60px rgba(0,0,0,0.5)' }}>
          <div className="mb-6">
            <div className="font-display text-[28px] font-extrabold tracking-tight leading-none mb-1">
              Rep<span style={{ color: '#E85D04' }}>EAT</span>
            </div>
            <p className="text-[14px]" style={{ color: '#6B7280' }}>Restaurant Portal · {isSignUp ? 'Create your free account' : 'Sign in to manage deals'}</p>
          </div>

          <button onClick={handleGoogle} className="w-full h-12 rounded-xl flex items-center justify-center gap-3 font-semibold text-[14px] mb-4 transition-all hover:-translate-y-0.5 hover:shadow-md" style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#111' }}>
            <GoogleSVG /> Continue with Google
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
            <span className="text-[12px]" style={{ color: '#9CA3AF' }}>or with email</span>
            <div className="flex-1 h-px" style={{ background: '#E5E7EB' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="owner@restaurant.com" required
              className="w-full h-12 px-4 rounded-xl text-[15px] outline-none transition-all"
              style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
              onFocus={(e) => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = `0 0 0 3px rgba(18,73,169,0.1)`; }}
              onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
            />
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required
                className="w-full h-12 pl-4 pr-12 rounded-xl text-[15px] outline-none transition-all"
                style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
                onFocus={(e) => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = `0 0 0 3px rgba(18,73,169,0.1)`; }}
                onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <IconX size={17} /> : <IconSearch size={17} />}
              </button>
            </div>
            {isSignUp && (
              <div className="relative">
                <input type={showConf ? 'text' : 'password'} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" required
                  className="w-full h-12 pl-4 pr-12 rounded-xl text-[15px] outline-none transition-all"
                  style={{ border: '1.5px solid #E5E7EB', background: '#FAFAFA' }}
                  onFocus={(e) => { e.target.style.borderColor = GREEN; e.target.style.boxShadow = `0 0 0 3px rgba(18,73,169,0.1)`; }}
                  onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowConf((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConf ? <IconX size={17} /> : <IconSearch size={17} />}
                </button>
              </div>
            )}
            {confirm.length > 0 && confirm !== password && (
              <p className="text-[12px] text-red-500 ml-1">Passwords don&apos;t match</p>
            )}
            {error && <div className="px-4 py-3 rounded-xl text-[13px]" style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626' }}>{error}</div>}
            <button type="submit" disabled={btnState !== 'idle' || (isSignUp && (password !== confirm || password.length < 6))}
              className="w-full h-12 rounded-xl font-bold text-[15px] text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
              style={{ background: btnState === 'success' ? '#16a34a' : GREEN }}>
              {btnState === 'loading' && <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />}
              {btnState === 'idle' && (isSignUp ? 'Create free account' : 'Sign in')}
              {btnState === 'loading' && (isSignUp ? 'Creating account...' : 'Signing you in...')}
              {btnState === 'success' && (isSignUp ? 'Account created! Check email ✉️' : 'Welcome! 🎉')}
            </button>
          </form>

          <p className="text-center text-[13px] mt-4" style={{ color: '#6B7280' }}>
            {isSignUp ? 'Already have an account? ' : 'No account yet? '}
            <button onClick={() => setIsSignUp(!isSignUp)} className="font-semibold" style={{ color: GREEN }}>
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
  const [query,     setQuery]     = useState(wizard.name);
  const [results,   setResults]   = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected,  setSelected]  = useState(!!wizard.name);
  const [source,    setSource]    = useState<'google' | 'database' | null>(null);
  const [open,      setOpen]      = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const searchLocRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const [lat, lng] = coordsForCity(wizard.city);
    searchLocRef.current = { lat, lng };
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        searchLocRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      },
      () => { /* keep city fallback */ },
      { timeout: 8000, maximumAge: 300_000 },
    );
  }, [wizard.city]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Debounce — fire search 300 ms after the user stops typing
  useEffect(() => {
    if (!query.trim() || selected) { setResults([]); setOpen(false); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const loc = searchLocRef.current ?? { lat: coordsForCity(wizard.city)[0], lng: coordsForCity(wizard.city)[1] };
        const params = new URLSearchParams({
          query,
          lat:       String(loc.lat),
          lng:       String(loc.lng),
          radius_km: String(DEFAULT_SEARCH_RADIUS_KM),
        });
        if (wizard.city) params.set('city', wizard.city);
        const res  = await fetch(`/api/google-places?${params.toString()}`);
        const json = await res.json() as { data?: PlaceSuggestion[] };
        const list = json.data ?? [];
        setResults(list);
        setOpen(list.length > 0);
      } catch { setResults([]); setOpen(false); }
      finally  { setSearching(false); }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, selected, wizard.city]);

  const handleSelect = (place: PlaceSuggestion) => {
    const matched      = ONTARIO_CITIES.find((c) => place.address.includes(c));
    const fallbackCity = place.address.split(',')[1]?.trim() ?? 'Toronto';
    const patchData: Partial<WizardData> = {
      name:        place.name,
      address:     place.address,
      city:        matched ?? fallbackCity,
      phone:       place.phone    ?? '',
      website:     place.website  ?? '',
      placeRating: place.rating   ?? 0,
    };
    if (place.hours_raw && place.hours_raw.length > 0) {
      patchData.hours = parseGoogleHours(place.hours_raw);
    }
    patch(patchData);
    setQuery(place.name);
    setResults([]);
    setOpen(false);
    setSelected(true);
    setSource(place.source ?? 'google');
  };

  const handleClear = () => {
    setQuery(''); setSelected(false); setSource(null);
    patch({ name: '', address: '', phone: '', website: '', placeRating: 0 });
  };

  return (
    <div>
      <h2 className="font-display text-xl font-bold mb-1">Find your restaurant</h2>
      <p className="text-t2 text-sm mb-5">
        Search by name — we&apos;ll pull in your business info automatically.
      </p>

      {/* Search box + dropdown */}
      <div className="relative mb-4" ref={wrapRef}>
        <IconSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-t3 pointer-events-none z-10" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(false); setSource(null); }}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder="e.g. Karahi Boys, Mississauga"
          className="w-full h-11 pl-9 pr-10 border border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 transition-all"
        />
        {searching && (
          <IconLoader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t3 animate-spin z-10" />
        )}
        {!searching && (query || selected) && (
          <button onClick={handleClear} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-t3 hover:text-tx z-10">
            <IconX size={16} />
          </button>
        )}

        {/* Dropdown */}
        {open && results.length > 0 && (
          <ul className="absolute top-full left-0 right-0 mt-1 border border-[var(--bd2)] rounded-brands overflow-hidden shadow-brand z-50 bg-surface">
            {results.map((r, i) => (
              <li key={`${r.place_id ?? r.name}-${i}`}>
                <button
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                  className="w-full text-left px-4 py-3 hover:bg-surface2 transition-colors border-b border-[var(--bd)] last:border-0"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm text-tx">{r.name}</span>
                    {r.source === 'database' ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 flex-shrink-0">In RepEAT</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex-shrink-0">Google Maps</span>
                    )}
                  </div>
                  <div className="text-xs text-t2 mt-0.5 truncate">{r.address}</div>
                  {r.rating != null && r.rating > 0 && (
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
      </div>

      {/* Source banner after selection */}
      {selected && source && (
        <div className={`inline-flex items-center gap-1.5 text-xs rounded-brands px-3 py-1.5 mb-3 ${
          source === 'google'
            ? 'text-green-700 bg-green-50 border border-green-200'
            : 'text-blue-700 bg-blue-50 border border-blue-200'
        }`}>
          <IconCheck size={13} />
          {source === 'google'
            ? 'Data fetched from Google Maps — edit any field below'
            : 'Found in RepEAT database — edit any field below'}
        </div>
      )}

      {/* Editable fields shown after a place is selected */}
      {selected && (
        <div className="space-y-3">
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

      {/* Manual entry / not finding restaurant */}
      {!selected && (
        <p className="text-center text-[13px] text-t3 mt-4">
          Not finding your restaurant?{' '}
          <button
            onClick={() => { patch({ name: query || 'My Restaurant' }); setSelected(true); setSource(null); }}
            className="text-brand font-semibold hover:underline"
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
          discount_value: '', scope: 'menu', scope_detail: '', deal_types: ['dine-in'],
          available_days: ['all'], valid_from: todayStr(), valid_until: nextMonthStr(),
          max_claims: '', is_coming: false, diet_type: 'veg', price_tag: null,
          base_price: '', free_condition_type: 'spend', free_condition_value: '',
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

  // Merge a change, then auto-pick the price tag from the resulting effective price.
  const changeWithAutoTag = (partial: Partial<DealDraft>) => {
    const merged = { ...deal, ...partial };
    const eff = getEffectivePrice({
      discount_type: toDbDiscountType(merged.discount_type as RestaurantDiscountType),
      discount_value: merged.discount_value,
      base_price: merged.base_price?.trim() ? parseFloat(merged.base_price) : null,
    });
    onChange(eff === null ? partial : { ...partial, price_tag: priceTagForPrice(eff) });
  };

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
                onChange={(e) => {
                  const next = e.target.value;
                  // Always reset to the new type's preset so a stale value
                  // (e.g. "By weight") doesn't linger when switching types.
                  changeWithAutoTag({ discount_type: next, discount_value: defaultDiscountValue(next) });
                }}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              >
                {DISCOUNT_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Value</label>
              <input
                type="text" value={deal.discount_value}
                onChange={(e) => changeWithAutoTag({ discount_value: e.target.value })}
                placeholder={discountValuePlaceholder(deal.discount_type)}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          </div>
          {isLbDiscount(deal.discount_type) && (
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Item (lb deal)</label>
              <input
                type="text"
                value={deal.scope_detail}
                onChange={(e) => onChange({ scope_detail: e.target.value })}
                placeholder="e.g. Fish Pakora"
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          )}
          {dealUsesBasePrice(deal.discount_type) && (
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">
                {deal.discount_type === 'percentage' || deal.discount_type === 'dollar' || deal.discount_type === 'set_price' ? 'Regular price'
                  : deal.discount_type === 'bogo_lb' ? 'Price per lb' : 'Item price'} ($ per item)
              </label>
              <input
                type="text" inputMode="decimal" value={deal.base_price}
                onChange={(e) => changeWithAutoTag({ base_price: e.target.value.replace(/[^0-9.]/g, '') })}
                placeholder="20"
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          )}
          {isFreeItemDiscount(deal.discount_type) && (
            <div>
              <label className="block text-[12px] font-semibold text-t2 mb-1">Free item condition</label>
              <div className="flex gap-1.5 mb-1.5">
                {([{ id: 'spend' as const, label: 'Min spend' }, { id: 'item' as const, label: 'With purchase of' }]).map(({ id, label }) => (
                  <button
                    key={id} type="button"
                    onClick={() => onChange({ free_condition_type: id, free_condition_value: '' })}
                    className="flex-1 h-8 rounded-brands border text-[12px] font-semibold transition-all"
                    style={deal.free_condition_type === id
                      ? { borderColor: 'var(--brand)', background: 'rgba(232,93,4,0.08)', color: 'var(--brand)' }
                      : { borderColor: 'var(--bd2)', color: 'var(--t2)' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <input
                type="text"
                inputMode={deal.free_condition_type === 'spend' ? 'decimal' : 'text'}
                value={deal.free_condition_value}
                onChange={(e) => onChange({ free_condition_value: deal.free_condition_type === 'spend' ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value })}
                placeholder={deal.free_condition_type === 'spend' ? '$30 min spend' : 'e.g. any large pizza'}
                className="w-full h-9 px-2 border border-[var(--bd2)] rounded-brands bg-surface text-sm text-tx outline-none focus:border-brand"
              />
            </div>
          )}
          <div>
            <label className="block text-[12px] font-semibold text-t2 mb-1">Price tag (optional)</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRICE_TAG_OPTIONS.map(({ id, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => onChange({ price_tag: id })}
                  className="h-8 px-3 rounded-brands border text-[12px] font-semibold transition-all"
                  style={deal.price_tag === id
                    ? { borderColor: 'var(--brand)', background: 'rgba(232,93,4,0.08)', color: 'var(--brand)' }
                    : { borderColor: 'var(--bd2)', color: 'var(--t2)' }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-t2 mb-1">Diet type</label>
            <div className="flex gap-2">
              {([
                { id: 'veg' as const,    label: '🟢 Veg' },
                { id: 'nonveg' as const, label: '🔴 Non-Veg' },
                { id: 'both' as const,   label: '🟢🔴 Both' },
              ]).map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onChange({ diet_type: id })}
                  className={`flex-1 h-8 rounded-brands border text-[12px] font-semibold ${deal.diet_type === id ? 'border-brand text-brand bg-brand/5' : 'border-[var(--bd2)] text-t2'}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-t3 mt-1">*eggs are non-veg · &ldquo;Both&rdquo; appears in veg &amp; non-veg filters</p>
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
  wizard, patch, publishing, publishError, onPublish, conflictRestaurant, onGoToDashboard,
}: {
  wizard: WizardData;
  patch: (p: Partial<WizardData>) => void;
  publishing: boolean;
  publishError: string;
  onPublish: () => void;
  conflictRestaurant?: Restaurant | null;
  onGoToDashboard?: () => void;
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

      {/* 409 conflict — existing restaurant found for this account */}
      {publishError === 'conflict' && conflictRestaurant ? (
        <div className="rounded-brands border border-amber-200 bg-amber-50 px-4 py-4 mb-4">
          <p className="text-[14px] font-bold text-amber-800 mb-1">
            An account already exists for this email.
          </p>
          <p className="text-[13px] text-amber-700 mb-3">
            <strong>{conflictRestaurant.name}</strong> is already registered to your account.
            You don&apos;t need to create another one.
          </p>
          <button
            onClick={onGoToDashboard}
            className="h-10 px-5 bg-brand hover:bg-brand2 text-white text-[13px] font-bold rounded-brands transition-colors"
          >
            Go to my dashboard →
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

type DashTab = 'dashboard' | 'deals' | 'analytics' | 'profile' | 'scanner' | 'settings';

interface ManagerPerms {
  dashboard: boolean; deals: boolean; analytics: boolean;
  collabs: boolean; profile: boolean; scanner: boolean;
}
interface ManagerLock { restaurant_id: string; perms: ManagerPerms; tab?: DashTab }

const TAB_ORDER: { id: DashTab; perm?: keyof ManagerPerms }[] = [
  { id: 'dashboard', perm: 'dashboard' },
  { id: 'deals',     perm: 'deals'     },
  { id: 'analytics', perm: 'analytics' },
  { id: 'scanner',   perm: 'scanner'   },
  { id: 'profile',   perm: 'profile'   },
  { id: 'settings'  },
];

function isTabAllowed(tab: DashTab, managerMode: boolean, perms: ManagerPerms): boolean {
  if (!managerMode) return true;
  if (tab === 'settings') return false;
  const entry = TAB_ORDER.find((t) => t.id === tab);
  if (!entry?.perm) return false;
  return perms[entry.perm];
}

function firstAllowedTab(managerMode: boolean, perms: ManagerPerms): DashTab {
  if (!managerMode) return 'dashboard';
  const found = TAB_ORDER.find((t) => t.perm && perms[t.perm]);
  return found?.id ?? 'scanner';
}

type DealFilter = 'all' | 'active' | 'paused' | 'sold_out' | 'expired';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function isDealExpired(deal: Deal): boolean {
  if (!deal.valid_until) return false;
  return deal.valid_until < todayISO();
}

function isDealSoldOut(deal: Deal): boolean {
  return deal.max_claims !== null && deal.max_claims > 0 && deal.current_claims >= deal.max_claims;
}

/** Single bucket per deal for filter tabs (expired > sold out > paused > active > other). */
function dealFilterBucket(deal: Deal): 'active' | 'paused' | 'sold_out' | 'expired' | 'other' {
  if (isDealExpired(deal)) return 'expired';
  if (isDealSoldOut(deal)) return 'sold_out';
  if (!deal.is_active && !deal.is_coming) return 'paused';
  if (deal.is_active && !deal.is_coming) return 'active';
  return 'other';
}

function classifyDeal(deal: Deal): 'active' | 'paused' | 'sold_out' | 'expired' | 'other' {
  return dealFilterBucket(deal);
}

function duplicateDealTitle(title: string): string {
  return `${formatDealTitle(title.replace(/\*+$/, '').trimEnd())}*`;
}

function formatDealDate(iso: string | null): string {
  if (!iso) return 'Not set';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDealDateShort(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function shiftDateISO(iso: string | null, days: number): string {
  const base = iso ? new Date(`${iso}T12:00:00`) : new Date();
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

/** Inclusive span between start and end (e.g. Jun 1 → Jun 10 = 9 day offset). */
function dealDurationDays(deal: Deal): number {
  if (!deal.valid_from || !deal.valid_until) return 7;
  const from = new Date(`${deal.valid_from}T12:00:00`);
  const until = new Date(`${deal.valid_until}T12:00:00`);
  return Math.max(0, Math.round((until.getTime() - from.getTime()) / 86_400_000));
}

/** Next run: same title/details, today as start, same day-span as original. */
function nextDuplicateDates(deal: Deal): { valid_from: string; valid_until: string } {
  const duration = dealDurationDays(deal);
  const valid_from = todayISO();
  const valid_until = shiftDateISO(valid_from, duration);
  return { valid_from, valid_until };
}

function dealStatusMeta(deal: Deal): { label: string; color: string } {
  const bucket = dealFilterBucket(deal);
  if (bucket === 'expired') return { label: 'Expired', color: '#FF7A30' };
  if (bucket === 'sold_out') return { label: 'Sold out', color: '#22C55E' };
  if (bucket === 'paused') return { label: 'Paused', color: '#888' };
  if (bucket === 'active') return { label: 'Active', color: '#1249A9' };
  if (deal.is_coming) return { label: 'Coming soon', color: '#A855F7' };
  return { label: 'Active', color: '#1249A9' };
}

function dealFilterEmptyLabel(filter: DealFilter): string {
  if (filter === 'all') return '';
  if (filter === 'sold_out') return 'sold out';
  return filter;
}

// SHA-256 hex digest for PIN hashing (browser-native)
async function sha256hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Collab joined with the creator's handle + payout readiness (restaurant view).
type RestaurantCollab = Collab & {
  influencer: {
    id: string;
    instagram_handle: string | null;
    tiktok_handle: string | null;
    payouts_enabled: boolean | null;
  } | null;
};

function Dashboard({ restaurant: initialRestaurant, user, onSignOut, supabase }: {
  restaurant: Restaurant;
  user: SupabaseUser;
  onSignOut: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [tab,             setTab]             = useState<DashTab>(() => {
    if (typeof window === 'undefined') return 'dashboard';
    try {
      const raw = localStorage.getItem('repeateats.manager_locked');
      if (raw) {
        const lock = JSON.parse(raw) as ManagerLock;
        if (lock.restaurant_id === initialRestaurant.id) {
          if (lock.tab && isTabAllowed(lock.tab, true, lock.perms)) return lock.tab;
          return firstAllowedTab(true, lock.perms);
        }
      }
      const saved = localStorage.getItem('repeateats.restaurant_tab') as DashTab | null;
      if (saved) return saved;
    } catch { /* ignore */ }
    return 'dashboard';
  });
  const [restaurant,      setRestaurant]      = useState<Restaurant>(initialRestaurant);
  const [deals,           setDeals]           = useState<Deal[]>([]);
  const [collabs,         setCollabs]         = useState<RestaurantCollab[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [showCreateDeal,  setShowCreateDeal]  = useState(false);
  const [editingDeal,     setEditingDeal]     = useState<Deal | null>(null);
  const [dealFilter,      setDealFilter]      = useState<DealFilter>('all');
  const [scheduleFilter,  setScheduleFilter]  = useState<DealScheduleFilter>('all');
  const [showDayPicker,   setShowDayPicker]   = useState(false);

  // Manager mode — driven by DB flag + localStorage lock
  const [managerMode,  setManagerMode]  = useState(false);
  const [managerPerms, setManagerPerms] = useState<ManagerPerms>({ dashboard: false, deals: false, analytics: false, collabs: false, profile: false, scanner: true });

  useEffect(() => {
    try {
      const raw = localStorage.getItem('repeateats.manager_locked');
      if (!raw) return;
      const lock = JSON.parse(raw) as ManagerLock;
      if (lock.restaurant_id === initialRestaurant.id) {
        setManagerMode(true);
        setManagerPerms(lock.perms);
        const allowed = lock.tab && isTabAllowed(lock.tab, true, lock.perms)
          ? lock.tab
          : firstAllowedTab(true, lock.perms);
        setTab(allowed);
        supabase.from('restaurants').select('manager_mode_enabled').eq('id', initialRestaurant.id).single()
          .then(({ data }) => {
            if (!data?.manager_mode_enabled) {
              localStorage.removeItem('repeateats.manager_locked');
              setManagerMode(false);
              setTab('dashboard');
            }
          });
      }
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRestaurant.id]);

  const [dashStats, setDashStats] = useState<{
    active_deals: number; redeemed_claims: number; awaiting_scan: number;
  } | null>(null);
  const [claimRows, setClaimRows] = useState<ClaimRow[]>([]);

  const reloadDashboardStats = useCallback(async () => {
    try {
      const stats = await fetchRestaurantDashboardStats(supabase, restaurant.id);
      setDashStats({
        active_deals:    stats.active_deals,
        redeemed_claims: stats.redeemed_claims,
        awaiting_scan:   stats.awaiting_scan,
      });
      setClaimRows(stats.claims);
    } catch (err) {
      console.error('dashboard stats load failed:', err);
    }
  }, [supabase, restaurant.id]);

  const setTabPersist = useCallback((next: DashTab) => {
    setTab(next);
    try {
      localStorage.setItem('repeateats.restaurant_tab', next);
      if (managerMode) {
        const raw = localStorage.getItem('repeateats.manager_locked');
        if (raw) {
          const lock = JSON.parse(raw) as ManagerLock;
          localStorage.setItem('repeateats.manager_locked', JSON.stringify({ ...lock, tab: next }));
        }
      }
    } catch { /* ignore */ }
  }, [managerMode]);

  useEffect(() => {
    if (!managerMode) return;
    if (!isTabAllowed(tab, managerMode, managerPerms)) {
      setTabPersist(firstAllowedTab(true, managerPerms));
    }
  }, [managerMode, managerPerms, tab, setTabPersist]);

  useEffect(() => {
    async function load() {
      const [dr, cr] = await Promise.all([
        supabase.from('deals').select('*').eq('restaurant_id', restaurant.id).order('created_at', { ascending: false }),
        supabase.from('collabs')
          .select('*, influencer:influencers(id, instagram_handle, tiktok_handle, payouts_enabled)')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false }),
      ]);
      setDeals((dr.data ?? []) as Deal[]);
      setCollabs((cr.data ?? []) as RestaurantCollab[]);
      await reloadDashboardStats();
      setLoading(false);
    }
    void load();
  }, [restaurant.id, supabase, reloadDashboardStats]);

  useEffect(() => {
    if (tab === 'analytics') void reloadDashboardStats();
  }, [tab, reloadDashboardStats]);

  useEffect(() => {
    if (!managerMode) void reloadDashboardStats();
  }, [managerMode, reloadDashboardStats]);

  // Prefer RPC values; fall back to locally derived counts.
  const activeDeals = deals.filter((d) => classifyDeal(d) === 'active');
  const openCollabs = collabs.filter((c) => c.status === 'open' || c.status === 'negotiating');
  const redeemedCount = dashStats?.redeemed_claims ?? 0;
  const awaitingCount = dashStats?.awaiting_scan ?? deals.reduce((s, d) => s + d.current_claims, 0);
  const activeDealCount = dashStats?.active_deals ?? activeDeals.length;

  const toggleActive = async (deal: Deal) => {
    await supabase.from('deals').update({ is_active: !deal.is_active }).eq('id', deal.id);
    setDeals((prev) => prev.map((d) => d.id === deal.id ? { ...d, is_active: !d.is_active } : d));
  };

  // ── Collab escrow actions ──────────────────────────────────────────────────
  const [collabBusyId, setCollabBusyId] = useState<string | null>(null);
  const [collabError,  setCollabError]  = useState<{ id: string; msg: string } | null>(null);

  const fundCollab = async (c: RestaurantCollab) => {
    const amount = c.agreed_amount ?? c.offer_amount_max ?? c.offer_amount_min;
    if (!amount) { setCollabError({ id: c.id, msg: 'Set an agreed amount first.' }); return; }
    if (!confirm(`Fund this collab? $${amount} CAD will be charged to your saved payment method and held in escrow until you release it.`)) return;
    setCollabBusyId(c.id); setCollabError(null);
    try {
      const res = await fetch(`/api/collabs/${c.id}/fund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agreed_amount: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not fund collab');
      setCollabs((prev) => prev.map((x) => x.id === c.id
        ? { ...x, payment_status: 'escrowed', agreed_amount: data.amount, platform_fee_cents: data.platform_fee_cents, funded_at: new Date().toISOString() }
        : x));
    } catch (e) {
      setCollabError({ id: c.id, msg: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setCollabBusyId(null);
    }
  };

  const releaseCollab = async (c: RestaurantCollab) => {
    if (!c.influencer?.payouts_enabled) { setCollabError({ id: c.id, msg: 'Creator hasn’t finished payout setup yet.' }); return; }
    const fee = c.platform_fee_cents ?? Math.round((c.agreed_amount ?? 0) * 2);
    const net = ((c.agreed_amount ?? 0) * 100 - fee) / 100;
    if (!confirm(`Release payment to the creator? They receive $${net.toFixed(2)} CAD (after RepEAT's 2% fee). This cannot be undone.`)) return;
    setCollabBusyId(c.id); setCollabError(null);
    try {
      const res = await fetch(`/api/collabs/${c.id}/release`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not release payment');
      setCollabs((prev) => prev.map((x) => x.id === c.id
        ? { ...x, payment_status: 'released', status: 'completed', released_at: new Date().toISOString() }
        : x));
    } catch (e) {
      setCollabError({ id: c.id, msg: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setCollabBusyId(null);
    }
  };

  const deleteDeal = async (deal: Deal) => {
    if (!confirm(`Delete "${deal.title}"? This cannot be undone.`)) return;
    await supabase.from('deals').delete().eq('id', deal.id);
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
  };

  const duplicateDeal = async (deal: Deal) => {
    const meta = deal as Deal & {
      diet_type?: string; price_tag?: PriceTag;
      base_price?: number | null; free_condition_type?: 'spend' | 'item' | null; free_condition_value?: string | null;
    };
    const { valid_from, valid_until } = nextDuplicateDates(deal);
    const duration = dealDurationDays(deal);
    const newTitle = duplicateDealTitle(deal.title);
    const ok = confirm(
      `Duplicate "${deal.title}" as "${newTitle}" for the next ${duration} day${duration !== 1 ? 's' : ''}?\n\n` +
      `New dates: ${formatDealDate(valid_from)} → ${formatDealDate(valid_until)}\n` +
      `The original deal stays unchanged.`,
    );
    if (!ok) return;

    const { data, error } = await supabase
      .from('deals')
      .insert({
        restaurant_id:  deal.restaurant_id,
        title:          newTitle,
        description:    deal.description,
        discount_type:  deal.discount_type,
        discount_value: deal.discount_value,
        deal_types:     deal.deal_types,
        available_days: deal.available_days,
        scope:          deal.scope,
        scope_detail:   deal.scope_detail,
        emoji:          deal.emoji,
        photo_url:      deal.photo_url,
        valid_from,
        valid_until,
        max_claims:     deal.max_claims,
        current_claims: 0,
        is_coming:      false,
        is_active:      true,
        diet_type:      meta.diet_type ?? 'veg',
        price_tag:      meta.price_tag ?? null,
        base_price:           meta.base_price ?? null,
        free_condition_type:  meta.free_condition_type ?? null,
        free_condition_value: meta.free_condition_value ?? null,
      })
      .select()
      .single();
    if (!error && data) {
      setDeals((prev) => [data as Deal, ...prev]);
      setDealFilter('active');
    }
  };

  const shiftDealDate = async (
    deal: Deal,
    field: 'valid_from' | 'valid_until',
    days: number,
  ) => {
    const next = shiftDateISO(deal[field], days);
    const { error } = await supabase
      .from('deals')
      .update({ [field]: next })
      .eq('id', deal.id);
    if (!error) {
      setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, [field]: next } : d)));
    }
  };

  const BLUE = '#1249A9';
  const GREEN = '#22C55E';

  const restMeta = restaurant as unknown as Record<string, unknown>;
  const trialEndsAt = restMeta.trial_ends_at as string | null;
  const restaurantTier = restMeta.restaurant_tier as string | null;
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((new Date(trialEndsAt).getTime() - Date.now()) / 86_400_000))
    : 0;
  const tierLabel = restaurantTier === 'trial'
    ? `Pro trial · ${trialDaysLeft}d left`
    : restaurantTier === 'pro'
      ? 'Pro plan'
      : restaurantTier === 'starter'
        ? 'Starter plan'
        : 'Free plan';

  const TAB_LABELS: Record<DashTab, string> = {
    dashboard: 'Dashboard',
    deals:     'Deals',
    analytics: 'Analytics',
    profile:   'Profile',
    scanner:   'Scan QR',
    settings:  'Settings',
  };

  const ALL_TABS: { id: DashTab; label: string; perm?: keyof ManagerPerms }[] = [
    { id: 'dashboard', label: 'Dashboard', perm: 'dashboard' },
    { id: 'deals',     label: 'Deals',     perm: 'deals'     },
    { id: 'analytics', label: 'Analytics', perm: 'analytics' },
    { id: 'scanner',   label: 'Scanner',   perm: 'scanner'   },
    { id: 'profile',   label: 'Profile',   perm: 'profile'   },
    { id: 'settings',  label: 'Settings'                     },
  ];

  // In manager mode, only show tabs the owner enabled (settings never shown to manager)
  const TABS = managerMode
    ? ALL_TABS.filter((t) => t.perm && managerPerms[t.perm])
    : ALL_TABS;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Sticky header */}
      <header className="bg-surface border-b border-[var(--bd)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/restaurant" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div>
              <div className="font-display text-[18px] font-extrabold leading-none">
                Rep<span className="text-brand">EAT</span>
              </div>
              <div className="text-[11px] text-[#666] leading-none mt-0.5">{TAB_LABELS[tab]}</div>
            </div>
          </a>
          {managerMode ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[12px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(18,73,169,0.1)', color: BLUE }}>
                <IconShieldLock size={13} /> Manager Mode
              </span>
            </div>
          ) : (
            <button type="button" onClick={() => void onSignOut()} className="inline-flex items-center gap-1.5 text-[13px] text-t2 hover:text-tx transition-colors">
              <IconLogout size={16} /> Sign out
            </button>
          )}
        </div>
        {/* Tab nav */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none pb-0">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTabPersist(t.id)}
              className="px-4 py-2.5 text-[13px] font-semibold whitespace-nowrap border-b-2 transition-colors"
              style={{
                borderColor: tab === t.id ? BLUE : 'transparent',
                color: tab === t.id ? BLUE : 'var(--t2)',
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">

        {/* ── DASHBOARD TAB ─────────────────────────────────────── */}
        {tab === 'dashboard' && (!managerMode || managerPerms.dashboard) && (
          <div className="space-y-5">
            {/* Welcome header */}
            <div>
              <p className="text-[13px] text-[#888] mb-1">Welcome back</p>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-[26px] font-extrabold text-white leading-tight">
                  {restaurant.name}
                </h1>
                {restaurant.rating > 0 && (
                  <span
                    className="inline-flex items-center gap-1 text-[12px] font-bold px-2.5 py-1 rounded-full"
                    style={{ border: '1px solid rgba(234,179,8,0.4)', background: '#1A1A1A', color: '#EAB308' }}
                  >
                    <IconStar size={12} fill="currentColor" />
                    {restaurant.rating.toFixed(1)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-[12px] text-[#888]">
                  <span className="w-2 h-2 rounded-full" style={{ background: restaurant.is_live ? BLUE : '#666' }} />
                  {restaurant.is_live ? 'Live · accepting claims' : 'Paused · not accepting claims'}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1 rounded-full border border-[#333] bg-[#141414]"
                >
                  <IconStar size={11} style={{ color: '#EAB308' }} fill="currentColor" />
                  <span className="text-[#CCC]">{tierLabel}</span>
                  <button
                    type="button"
                    onClick={() => { window.location.href = '/restaurant/plans'; }}
                    className="text-[11px] font-bold ml-1"
                    style={{ color: BLUE }}
                  >
                    Plans &gt;
                  </button>
                </span>
              </div>
            </div>

            {(!managerMode || managerPerms.scanner) && (
            <button
              type="button"
              onClick={() => setTabPersist('scanner')}
              className="w-full flex items-center gap-4 rounded-2xl p-4 transition-all hover:opacity-95 text-left"
              style={{ background: BLUE }}
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                <IconQrcode size={24} className="text-white" stroke={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[16px] text-white">Redeem a customer QR code</p>
                <p className="text-[12px] text-white/70">Scan the QR they show you at checkout</p>
              </div>
              <IconArrowRight size={20} className="text-white/80 flex-shrink-0" />
            </button>
            )}

            {/* 2×2 metrics grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Awaiting scan',   value: awaitingCount,  icon: IconQrcode,  color: '#FF7A30' },
                { label: 'Active deals',    value: activeDealCount, icon: IconTag,     color: BLUE },
                { label: 'Redeemed',        value: redeemedCount,  icon: IconCheck,   color: GREEN },
                { label: 'Collab requests', value: openCollabs.length, icon: IconStar, color: '#A855F7' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="rounded-2xl p-4"
                  style={{ background: '#141414', border: '1px solid #222' }}
                >
                  <Icon size={20} style={{ color }} className="mb-2" stroke={1.5} />
                  <div className="font-display text-[28px] font-extrabold text-white leading-none">{value}</div>
                  <div className="text-[12px] text-[#888] mt-1">{label}</div>
                </div>
              ))}
            </div>

            {/* Quick actions — matches app 2×2 + Settings row */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'New deal',   icon: IconPlus,          action: () => setShowCreateDeal(true) },
                { label: 'Analytics', icon: IconChartBar,      action: () => setTabPersist('analytics') },
                { label: 'Plans',     icon: IconStar,          action: () => setTabPersist('settings') },
                { label: 'Profile',   icon: IconBuildingStore, action: () => setTabPersist('profile') },
              ].map(({ label, icon: Icon, action }) => (
                <button
                  key={label}
                  type="button"
                  onClick={action}
                  className="rounded-2xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-[#1A1A1A]"
                  style={{ background: '#141414', border: '1px solid #222' }}
                >
                  <div className="w-10 h-10 rounded-full border border-[#444] flex items-center justify-center">
                    <Icon size={18} className="text-white" stroke={1.5} />
                  </div>
                  <span className="text-[13px] font-semibold text-white">{label}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setTabPersist('settings')}
              className="w-full rounded-2xl p-4 flex items-center justify-center gap-2 transition-all hover:bg-[#1A1A1A]"
              style={{ background: '#141414', border: '1px solid #222' }}
            >
              <IconSettings size={18} className="text-white" />
              <span className="text-[13px] font-semibold text-white">Settings</span>
            </button>

            {/* ── Creator Collabs (escrow) ───────────────────────── */}
            {collabs.filter((c) => c.influencer_id).length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 pt-1">
                  <IconStar size={16} style={{ color: '#A855F7' }} />
                  <h3 className="font-display text-[16px] font-bold text-white">Creator Collabs</h3>
                </div>
                {collabs.filter((c) => c.influencer_id).map((c) => {
                  const handle = c.influencer?.instagram_handle
                    ? `@${c.influencer.instagram_handle}`
                    : c.influencer?.tiktok_handle ? `@${c.influencer.tiktok_handle}` : 'Creator';
                  const amount = c.agreed_amount ?? c.offer_amount_max ?? c.offer_amount_min ?? 0;
                  const busy = collabBusyId === c.id;
                  const PAY_BADGE = {
                    pending:  { label: 'Not funded', color: '#F59E0B', bg: 'rgba(245,158,11,0.15)' },
                    escrowed: { label: 'In escrow',  color: '#60A5FA', bg: 'rgba(96,165,250,0.15)' },
                    released: { label: 'Paid out',   color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
                  }[c.payment_status] ?? { label: c.payment_status, color: '#888', bg: '#222' };
                  return (
                    <div key={c.id} className="rounded-2xl p-4 space-y-3" style={{ background: '#141414', border: '1px solid #222' }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-[14px] text-white truncate">{c.title ?? c.deliverables ?? 'Collab'}</div>
                          <div className="text-[12px] text-[#888] mt-0.5">{handle} · ${amount} CAD</div>
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0" style={{ background: PAY_BADGE.bg, color: PAY_BADGE.color }}>
                          {PAY_BADGE.label}
                        </span>
                      </div>

                      {c.payment_status === 'escrowed' && (
                        <div className="text-[11px] text-[#888]">
                          ${amount} held in escrow · creator gets ${(((amount * 100) - (c.platform_fee_cents ?? Math.round(amount * 2))) / 100).toFixed(2)} after RepEAT&apos;s 2% fee
                        </div>
                      )}

                      {collabError?.id === c.id && (
                        <p className="text-[12px] text-red-400">{collabError.msg}</p>
                      )}

                      {c.payment_status === 'pending' && (
                        <button onClick={() => fundCollab(c)} disabled={busy}
                          className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ background: '#7E22CE' }}>
                          {busy ? <IconLoader2 size={15} className="animate-spin" /> : <><IconLock size={14} /> Fund collab (hold ${amount})</>}
                        </button>
                      )}
                      {c.payment_status === 'escrowed' && (
                        <button onClick={() => releaseCollab(c)} disabled={busy || !c.influencer?.payouts_enabled}
                          className="w-full h-10 rounded-xl text-[13px] font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ background: '#16A34A' }}>
                          {busy ? <IconLoader2 size={15} className="animate-spin" />
                            : !c.influencer?.payouts_enabled ? 'Waiting on creator payout setup'
                            : <><IconCheck size={14} /> Release payment</>}
                        </button>
                      )}
                      {c.payment_status === 'released' && (
                        <div className="text-[12px] font-semibold flex items-center gap-1.5" style={{ color: '#4ADE80' }}>
                          <IconCheck size={14} /> Paid out{c.released_at ? ` · ${new Date(c.released_at).toLocaleDateString('en-CA')}` : ''}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ── DEALS TAB ─────────────────────────────────────────── */}
        {tab === 'deals' && (!managerMode || managerPerms.deals) && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold">Your Deals</h2>
              <button onClick={() => setShowCreateDeal(true)}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-brands text-sm font-semibold text-white"
                style={{ background: BLUE }}>
                <IconPlus size={15} /> Create deal
              </button>
            </div>
            {loading ? (
              <div className="space-y-2">{[1,2,3].map((n) => <div key={n} className="h-20 bg-surface animate-pulse rounded-brands" />)}</div>
            ) : deals.length === 0 ? (
              <div className="bg-surface rounded-brand border-2 border-dashed border-[var(--bd2)] p-12 text-center">
                <div className="text-4xl mb-3">🎫</div>
                <p className="font-semibold text-tx mb-1">No deals yet</p>
                <p className="text-t2 text-sm mb-4">Create your first deal to start attracting customers</p>
                <button onClick={() => setShowCreateDeal(true)} className="inline-flex items-center gap-1.5 px-5 h-10 rounded-brands text-sm font-semibold text-white" style={{ background: BLUE }}>
                  <IconPlus size={15} /> Create your first deal
                </button>
              </div>
            ) : (() => {
              const filterCounts = {
                all:      deals.length,
                active:   deals.filter((d) => dealFilterBucket(d) === 'active').length,
                paused:   deals.filter((d) => dealFilterBucket(d) === 'paused').length,
                sold_out: deals.filter((d) => dealFilterBucket(d) === 'sold_out').length,
                expired:  deals.filter((d) => dealFilterBucket(d) === 'expired').length,
              };
              const scheduleCounts = {
                today:    deals.filter((d) => dealMatchesScheduleFilter(d, 'today')).length,
                tomorrow: deals.filter((d) => dealMatchesScheduleFilter(d, 'tomorrow')).length,
              };
              const filteredDeals = deals.filter((d) => {
                if (dealFilter !== 'all' && dealFilterBucket(d) !== dealFilter) return false;
                if (scheduleFilter !== 'all' && !dealMatchesScheduleFilter(d, scheduleFilter)) return false;
                return true;
              });

              return (
                <>
                  <div className="flex gap-2 overflow-x-auto scrollbar-none p-1 rounded-xl" style={{ background: '#141414' }}>
                    {([
                      ['all',      `All ${filterCounts.all}`],
                      ['active',   `Active ${filterCounts.active}`],
                      ['paused',   `Pause ${filterCounts.paused}`],
                      ['sold_out', `Sold out ${filterCounts.sold_out}`],
                      ['expired',  `Expired ${filterCounts.expired}`],
                    ] as const).map(([id, label]) => {
                      const active = dealFilter === id;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setDealFilter(id)}
                          className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                          style={active
                            ? { background: 'rgba(18,73,169,0.25)', color: BLUE }
                            : { color: '#888' }}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <span className="w-px h-6 bg-[#333] self-center flex-shrink-0 mx-0.5" />
                    {([
                      ['today',    `Today ${scheduleCounts.today}`],
                      ['tomorrow', `Tomorrow ${scheduleCounts.tomorrow}`],
                    ] as const).map(([id, label]) => {
                      const active = scheduleFilter === id && !showDayPicker;
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setScheduleFilter(id);
                            setShowDayPicker(false);
                          }}
                          className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                          style={active
                            ? { background: 'rgba(18,73,169,0.25)', color: BLUE }
                            : { color: '#888' }}
                        >
                          {label}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        setShowDayPicker((v) => !v);
                        if (showDayPicker) setScheduleFilter('all');
                      }}
                      className="flex-shrink-0 px-3.5 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                      style={(showDayPicker || WEEKDAY_LABELS.includes(scheduleFilter as typeof WEEKDAY_LABELS[number]))
                        ? { background: 'rgba(18,73,169,0.25)', color: BLUE }
                        : { color: '#888' }}
                    >
                      Days
                    </button>
                  </div>

                  {(showDayPicker || WEEKDAY_LABELS.includes(scheduleFilter as typeof WEEKDAY_LABELS[number])) && (
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-none px-1 pb-1">
                      {WEEKDAY_LABELS.map((day) => {
                        const count = deals.filter((d) => dealMatchesScheduleFilter(d, day)).length;
                        const active = scheduleFilter === day;
                        return (
                          <button
                            key={day}
                            type="button"
                            onClick={() => {
                              setScheduleFilter(day);
                              setShowDayPicker(true);
                            }}
                            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all"
                            style={active
                              ? { background: 'rgba(18,73,169,0.2)', color: BLUE, border: `1px solid ${BLUE}` }
                              : { color: '#888', border: '1px solid #333' }}
                          >
                            {day} {count}
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => { setScheduleFilter('all'); setShowDayPicker(false); }}
                        className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#666] border border-[#333]"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  {filteredDeals.length === 0 ? (
                    <p className="text-[13px] text-t2 py-4">
                      No deals match
                      {dealFilter !== 'all' ? ` (${dealFilterEmptyLabel(dealFilter)})` : ''}
                      {scheduleFilter !== 'all' ? ` for ${scheduleFilter === 'today' ? 'today' : scheduleFilter === 'tomorrow' ? 'tomorrow' : scheduleFilter}` : ''}.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {filteredDeals.map((deal) => {
                        const status = dealStatusMeta(deal);
                        return (
                          <div key={deal.id} className="rounded-2xl px-4 py-3" style={{ background: '#141414', border: '1px solid #222' }}>
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden" style={{ background: 'rgba(18,73,169,0.12)' }}>
                                {restaurant.cover_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={restaurant.cover_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-xl">{deal.emoji}</div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-[14px] text-tx truncate">{formatDealTitle(deal.title)}</p>
                                <p className="text-[12px] mt-0.5">
                                  <span style={{ color: status.color, fontWeight: 600 }}>{status.label}</span>
                                  <span className="text-t2"> · ends {formatDealDateShort(deal.valid_until)}</span>
                                  <span className="text-t2"> · {formatDealScheduleDays(deal)}</span>
                                </p>
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex-1 h-1.5 bg-surface2 rounded-full overflow-hidden">
                                    {deal.max_claims !== null && deal.max_claims > 0 && (
                                      <div
                                        className="h-full bg-brand rounded-full transition-all"
                                        style={{ width: `${Math.min(100, (deal.current_claims / deal.max_claims) * 100)}%` }}
                                      />
                                    )}
                                  </div>
                                  <span className="text-[11px] font-semibold text-t2 tabular-nums shrink-0">
                                    {deal.max_claims !== null && deal.max_claims > 0
                                      ? `${deal.current_claims}/${deal.max_claims}`
                                      : `${deal.current_claims} · No limit`}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-t2">
                                  <span>Start: <span className="text-tx font-medium">{formatDealDate(deal.valid_from)}</span></span>
                                  <span>End: <span className="text-tx font-medium">{formatDealDate(deal.valid_until)}</span></span>
                                </div>
                                <div className="flex flex-wrap items-center gap-3 mt-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-t3 uppercase">Start</span>
                                    <button type="button" onClick={() => void shiftDealDate(deal, 'valid_from', -1)} title="Start −1 day" className="w-7 h-7 rounded-lg border border-[var(--bd)] flex items-center justify-center text-t2 hover:text-brand hover:border-brand/40 transition-colors">
                                      <IconMinus size={12} />
                                    </button>
                                    <button type="button" onClick={() => void shiftDealDate(deal, 'valid_from', 1)} title="Start +1 day" className="w-7 h-7 rounded-lg border border-[var(--bd)] flex items-center justify-center text-t2 hover:text-brand hover:border-brand/40 transition-colors">
                                      <IconPlus size={12} />
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-semibold text-t3 uppercase">End</span>
                                    <button type="button" onClick={() => void shiftDealDate(deal, 'valid_until', -1)} title="End −1 day" className="w-7 h-7 rounded-lg border border-[var(--bd)] flex items-center justify-center text-t2 hover:text-brand hover:border-brand/40 transition-colors">
                                      <IconMinus size={12} />
                                    </button>
                                    <button type="button" onClick={() => void shiftDealDate(deal, 'valid_until', 1)} title="End +1 day" className="w-7 h-7 rounded-lg border border-[var(--bd)] flex items-center justify-center text-t2 hover:text-brand hover:border-brand/40 transition-colors">
                                      <IconPlus size={12} />
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => void duplicateDeal(deal)}
                                  title="Duplicate deal for next period (same duration from today)"
                                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-brands text-t2 hover:text-brand hover:bg-brandlt transition-colors border border-[var(--bd)]"
                                >
                                  <span className="text-[11px] font-semibold whitespace-nowrap">Duplicate</span>
                                  <IconRepeat size={14} stroke={1.75} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingDeal(deal)}
                                  title="Edit deal"
                                  className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-brands text-t2 hover:text-brand hover:bg-brandlt transition-colors border border-[var(--bd)]"
                                >
                                  <span className="text-[11px] font-semibold whitespace-nowrap">Edit</span>
                                  <IconPencil size={14} stroke={1.75} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => toggleActive(deal)}
                                  title={deal.is_active ? 'Pause deal' : 'Resume deal'}
                                  className={`w-8 h-8 rounded-brands flex items-center justify-center transition-colors border ${deal.is_active ? 'border-[var(--bd)] text-t2 hover:text-amber-600 hover:border-amber-300' : 'border-brand/40 text-brand hover:bg-brand hover:text-white'}`}
                                >
                                  {deal.is_active ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteDeal(deal)}
                                  title="Delete deal"
                                  className="w-8 h-8 rounded-brands flex items-center justify-center text-t2 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors border border-[var(--bd)]"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}

        {/* ── ANALYTICS TAB ─────────────────────────────────────── */}
        {tab === 'analytics' && (!managerMode || managerPerms.analytics) && (
          <RestaurantAnalytics
            restaurantName={restaurant.name}
            restaurantCoverUrl={restaurant.cover_url}
            claims={claimRows}
            activeDealCount={activeDealCount}
            deals={deals.map((d) => ({ id: d.id, max_claims: d.max_claims }))}
            loading={loading}
          />
        )}

        {/* ── SCANNER TAB ───────────────────────────────────────── */}
        {tab === 'scanner' && (!managerMode || managerPerms.scanner) && (
          <ScannerPanel restaurantId={restaurant.id} />
        )}

        {/* ── PROFILE TAB ───────────────────────────────────────── */}
        {tab === 'profile' && (!managerMode || managerPerms.profile) && (
          <ProfileTab restaurant={restaurant} setRestaurant={setRestaurant} supabase={supabase} user={user} onGoSettings={() => setTabPersist('settings')} trialLabel={tierLabel} />
        )}

        {/* ── SETTINGS TAB ──────────────────────────────────────── */}
        {tab === 'settings' && (
          <SettingsTab restaurant={restaurant} setRestaurant={setRestaurant} supabase={supabase} onSignOut={onSignOut} />
        )}

      </main>

      {(showCreateDeal || editingDeal) && (
        <CreateDealModal
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          restaurantCity={restaurant.city}
          restaurantCoverUrl={restaurant.cover_url}
          tier={restaurantTier}
          activeDealCount={activeDealCount}
          existingDeal={editingDeal ?? undefined}
          onCreated={(deal) => {
            if (editingDeal) {
              setDeals((prev) => prev.map((d) => d.id === (deal as unknown as Deal).id ? deal as unknown as Deal : d));
              setEditingDeal(null);
            } else {
              setDeals((prev) => [deal as unknown as Deal, ...prev]);
              setShowCreateDeal(false);
            }
          }}
          onClose={() => { setShowCreateDeal(false); setEditingDeal(null); }}
        />
      )}

      {/* Manager mode exit — shown as a subtle link when locked */}
      {managerMode && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
          <ManagerExitPrompt
            restaurant={restaurant}
            onExit={() => {
              localStorage.removeItem('repeateats.manager_locked');
              supabase.from('restaurants').update({ manager_mode_enabled: false }).eq('id', restaurant.id);
              setManagerMode(false);
              setRestaurant({ ...restaurant, manager_mode_enabled: false } as Restaurant);
              setTabPersist('dashboard');
              void reloadDashboardStats();
            }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Hours Accordion ─────────────────────────────────────────────────────────
function HoursAccordion({ hoursEntries, updateHours, setEditing, labelCls }: {
  hoursEntries: Record<string, HoursEntry>;
  updateHours: (day: string, field: keyof HoursEntry, value: string | boolean) => void;
  setEditing: (v: boolean) => void;
  labelCls: string;
}) {
  const [open, setOpen] = useState(false);

  const summary = RESTAURANT_DAYS.map(day => {
    const e = hoursEntries[day];
    return e.closed ? null : `${day} ${e.open}–${e.close}`;
  }).filter(Boolean);

  const summaryText = summary.length === 0
    ? 'All days closed'
    : summary.length <= 2
      ? summary.join(', ')
      : `${summary[0]}, +${summary.length - 1} more`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between"
      >
        <label className={`${labelCls} flex items-center gap-1.5 pointer-events-none`}>
          <IconClock size={14} /> Opening hours
        </label>
        <div className="flex items-center gap-2">
          {!open && <span className="text-[12px] text-[#888] truncate max-w-[180px]">{summaryText}</span>}
          <IconChevronDown size={15} className="text-[#888] shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
        </div>
      </button>
      {open && (
        <div className="space-y-2 mt-3">
          {RESTAURANT_DAYS.map((day) => {
            const entry = hoursEntries[day];
            return (
              <div key={day} className="flex items-center gap-2">
                <span className="w-9 text-[12px] font-bold text-[#888] shrink-0">{day}</span>
                {entry.closed ? (
                  <button
                    type="button"
                    onClick={() => { updateHours(day, 'closed', false); setEditing(true); }}
                    className="flex-1 h-9 px-3 rounded-lg text-[13px] text-[#888] border border-[#333] bg-[#1A1A1A] text-left"
                  >
                    Closed
                  </button>
                ) : (
                  <>
                    <input
                      type="text"
                      value={`${entry.open}–${entry.close}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(/[–\-]/);
                        if (parts.length >= 2) {
                          updateHours(day, 'open', parts[0].trim());
                          updateHours(day, 'close', parts[1].trim());
                        }
                        setEditing(true);
                      }}
                      className="flex-1 h-9 px-3 rounded-lg text-[13px] text-white border border-[#333] bg-[#1A1A1A] outline-none focus:border-[#1249A9]"
                    />
                    <button
                      type="button"
                      onClick={() => { updateHours(day, 'closed', true); setEditing(true); }}
                      className="h-9 px-3 rounded-lg text-[12px] font-semibold text-[#888] border border-[#333] bg-[#1A1A1A] hover:text-white transition-colors shrink-0"
                    >
                      Closed
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ restaurant, setRestaurant, supabase, user, onGoSettings, trialLabel }: {
  restaurant: Restaurant;
  setRestaurant: (r: Restaurant) => void;
  supabase: ReturnType<typeof createClient>;
  user: SupabaseUser;
  onGoSettings: () => void;
  trialLabel: string;
}) {
  const [form, setForm] = useState({
    name:       restaurant.name ?? '',
    cuisine:    restaurant.cuisine ?? '',
    city:       restaurant.city ?? '',
    address:    restaurant.address ?? '',
    phone:      restaurant.phone ?? '',
    website:    restaurant.website ?? '',
    instagram:  ((restaurant as unknown) as Record<string, unknown>).instagram as string ?? '',
    description:((restaurant as unknown) as Record<string, unknown>).description as string ?? '',
  });
  const [hoursEntries, setHoursEntries] = useState<Record<string, HoursEntry>>(
    () => hoursRecordToEntries(restaurant.hours),
  );
  const [saving,         setSaving]         = useState(false);
  const [saved,          setSaved]          = useState(false);
  const [isLive,         setIsLive]         = useState(restaurant.is_live);
  const [collabs,        setCollabs]        = useState(((restaurant as unknown) as Record<string, unknown>).open_to_collabs as boolean ?? false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverPreview,   setCoverPreview]   = useState<string | null>(restaurant.cover_url ?? null);
  const [editing,        setEditing]        = useState(false);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const BLUE   = '#1249A9';
  const PURPLE = '#A855F7';

  const ONTARIO_CITIES = [
    'Toronto', 'Mississauga', 'Brampton', 'Markham', 'Vaughan',
    'Richmond Hill', 'Oakville', 'Burlington', 'Hamilton',
    'Waterloo', 'Kitchener', 'Cambridge', 'Guelph', 'London', 'Ottawa',
  ];

  const updateHours = (day: string, field: keyof HoursEntry, value: string | boolean) => {
    setHoursEntries((prev) => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handlePlaceSelect = (place: PlaceResult) => {
    if (place.place_id === '__manual__') return;
    const matched      = ONTARIO_CITIES.find((c) => place.address.includes(c));
    const fallbackCity = place.address.split(',')[1]?.trim() ?? form.city;
    setForm((f) => ({
      ...f,
      name:    place.name,
      address: place.address,
      city:    matched ?? fallbackCity,
      phone:   place.phone   ?? f.phone,
      website: place.website ?? f.website,
    }));
    if (place.hours_raw && place.hours_raw.length > 0) {
      setHoursEntries(parseGoogleHours(place.hours_raw));
    }
    setEditing(true);
  };

  const save = async () => {
    setSaving(true);
    const hoursRecord = entriesToHoursRecord(hoursEntries);
    const { data } = await supabase
      .from('restaurants')
      .update({ ...form, hours: hoursRecord, is_live: isLive, open_to_collabs: collabs })
      .eq('id', restaurant.id)
      .select()
      .single();
    if (data) setRestaurant(data as Restaurant);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCoverUpload = async (file: File) => {
    setCoverUploading(true);
    try {
      const preview = URL.createObjectURL(file);
      setCoverPreview(preview);
      const ext  = file.name.split('.').pop() ?? 'jpg';
      const path = `covers/${restaurant.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('restaurant-photos')
        .upload(path, file, { upsert: true });
      if (upErr) { setCoverPreview(restaurant.cover_url ?? null); return; }
      const { data: pub } = supabase.storage.from('restaurant-photos').getPublicUrl(path);
      if (!pub.publicUrl) return;
      const { data: updated } = await supabase
        .from('restaurants')
        .update({ cover_url: pub.publicUrl })
        .eq('id', restaurant.id)
        .select()
        .single();
      if (updated) { setRestaurant(updated as Restaurant); setCoverPreview(pub.publicUrl); }
    } finally {
      setCoverUploading(false);
    }
  };

  const inputCls = 'w-full h-11 px-3 rounded-xl text-[14px] text-white outline-none border border-[#333] bg-[#1A1A1A] focus:border-[#1249A9] transition-colors';
  const labelCls = 'block text-[12px] font-semibold text-[#888] mb-1.5';

  return (
    <div className="space-y-4 pb-8">
      {/* Plans & billing card */}
      <button
        type="button"
        onClick={onGoSettings}
        className="w-full flex items-center gap-3 rounded-2xl p-4 text-left transition-all hover:bg-[#1A1A1A]"
        style={{ background: '#141414', border: '1px solid #222' }}
      >
        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `${BLUE}22` }}>
          <IconStar size={18} style={{ color: BLUE }} fill="currentColor" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[14px] text-white">Plans & billing</p>
          <p className="text-[12px] text-[#888]">{trialLabel}</p>
        </div>
        <IconChevronRight size={18} className="text-[#666] flex-shrink-0" />
      </button>

      {/* Restaurant summary card */}
      <div className="rounded-2xl p-4" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[16px] text-white">{restaurant.name}</p>
            <p className="text-[12px] text-[#888] mt-0.5">
              {restaurant.city} · {restaurant.cuisine}
              {restaurant.rating > 0 && (
                <span className="ml-2 inline-flex items-center gap-0.5 text-amber-400">
                  <IconStar size={11} fill="currentColor" /> {restaurant.rating.toFixed(1)}
                </span>
              )}
            </p>
            <p className="text-[12px] text-[#666] mt-1 truncate">{user.email}</p>
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{
              background: `${BLUE}18`,
              border: `1px solid ${BLUE}44`,
              color: BLUE,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: BLUE }} />
            {isLive ? 'Visible' : 'Hidden'}
          </span>
        </div>
      </div>

      {/* Profile edit card */}
      <div className="rounded-2xl p-4 space-y-4" style={{ background: '#141414', border: '1px solid #222' }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[15px] text-white">Profile</h3>
          {editing && (
            <button type="button" onClick={() => setEditing(false)} className="text-[13px] font-semibold" style={{ color: BLUE }}>
              Cancel
            </button>
          )}
        </div>

        {/* Google search */}
        <div>
          <label className={labelCls}>Find on Google (recommended)</label>
          <RestaurantSearch
            variant="dark"
            placeholder="Search for your restaurant…"
            restaurantId={restaurant.id}
            defaultCity={restaurant.city}
            restaurantLat={restaurant.lat}
            restaurantLng={restaurant.lng}
            onSelect={handlePlaceSelect}
          />
        </div>

        {/* Cover photo */}
        <div>
          <label className={labelCls}>Cover photo</label>
          <div className="rounded-xl overflow-hidden mb-2" style={{ background: '#1A1A1A' }}>
            {coverPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverPreview} alt="Cover" className="w-full h-36 object-cover" />
            ) : (
              <div className="w-full h-36 flex items-center justify-center">
                <IconPhoto size={32} className="text-[#444]" />
              </div>
            )}
          </div>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleCoverUpload(f);
              e.target.value = '';
            }}
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={coverUploading}
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold disabled:opacity-50"
              style={{ color: BLUE }}
            >
              {coverUploading ? <IconLoader2 size={14} className="animate-spin" /> : <IconPencil size={14} />}
              Change
            </button>
            {coverPreview && (
              <button
                type="button"
                onClick={() => { setCoverPreview(null); }}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-red-400"
              >
                <IconX size={14} /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Form fields */}
        <div>
          <label className={labelCls}>Restaurant name *</label>
          <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setEditing(true); }} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Cuisine</label>
          <select
            value={form.cuisine}
            onChange={(e) => { setForm((f) => ({ ...f, cuisine: e.target.value })); setEditing(true); }}
            className={inputCls}
          >
            {CUISINES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>City</label>
          <input value={form.city} onChange={(e) => { setForm((f) => ({ ...f, city: e.target.value })); setEditing(true); }} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Address</label>
          <textarea
            value={form.address}
            onChange={(e) => { setForm((f) => ({ ...f, address: e.target.value })); setEditing(true); }}
            rows={2}
            className={`${inputCls} h-auto py-2 resize-none`}
          />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setEditing(true); }} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Website</label>
          <input value={form.website} onChange={(e) => { setForm((f) => ({ ...f, website: e.target.value })); setEditing(true); }} className={inputCls} />
        </div>

        {/* Opening hours — collapsible */}
        <HoursAccordion
          hoursEntries={hoursEntries}
          updateHours={updateHours}
          setEditing={setEditing}
          labelCls={labelCls}
        />

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-[#222]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14px] font-semibold text-white">Go Live</div>
              <div className="text-[12px] text-[#888]">Publish your restaurant listing (use Settings to pause visibility anytime)</div>
            </div>
            <button
              type="button"
              onClick={() => { setIsLive(!isLive); setEditing(true); }}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{ background: isLive ? BLUE : '#333' }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ left: isLive ? 'calc(100% - 22px)' : 2 }} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[14px] font-semibold text-white">Open to creator collabs</div>
              <div className="text-[12px] text-[#888]">Receive paid collab requests</div>
            </div>
            <button
              type="button"
              onClick={() => { setCollabs(!collabs); setEditing(true); }}
              className="relative w-11 h-6 rounded-full transition-colors shrink-0"
              style={{ background: collabs ? PURPLE : '#333' }}
            >
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                style={{ left: collabs ? 'calc(100% - 22px)' : 2 }} />
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="w-full h-12 rounded-xl text-white font-bold text-[15px] transition-all disabled:opacity-50"
        style={{ background: BLUE }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
      </button>

      {/* Account info — shown at the bottom of Profile */}
      <div className="rounded-2xl p-5 space-y-3" style={{ background: '#1A1A1A', border: '1px solid #2A2A2A' }}>
        <h3 className="font-semibold text-[15px] text-white">Account</h3>
        <div className="space-y-2.5 text-[13px]">
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Name</span>
            <span className="font-medium text-white">
              {user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '—'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Email</span>
            <span className="font-medium text-white truncate max-w-[220px] text-right">{user.email ?? '—'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[#888]">Member since</span>
            <span className="font-medium text-white">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short' })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Manager Exit Prompt ──────────────────────────────────────────────────────
function ManagerExitPrompt({ restaurant, onExit }: {
  restaurant: Restaurant;
  onExit: () => void;
}) {
  const [open,  setOpen]  = useState(false);
  const [pin,   setPin]   = useState('');
  const [error, setError] = useState('');
  const [busy,  setBusy]  = useState(false);

  const handleVerify = async () => {
    if (pin.length !== 6) return;
    setBusy(true);
    const hash = await sha256hex(pin + restaurant.id);
    const ownerHash = (restaurant as unknown as Record<string,unknown>).owner_pin_hash as string | null;
    if (hash === ownerHash) {
      onExit();
    } else {
      setError('Incorrect PIN');
      setPin('');
    }
    setBusy(false);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-t3 hover:text-t2 transition-colors bg-surface px-3 py-1 rounded-full border border-[var(--bd)] shadow-sm">
        Exit manager mode
      </button>
    );
  }

  return (
    <div className="bg-surface rounded-brand shadow-brand2 border border-[var(--bd)] p-4 w-[280px] text-center animate-[slideUp_0.18s_ease]">
      <p className="text-[13px] font-bold mb-3">Enter Owner PIN to exit</p>
      <input
        type="password" maxLength={6} value={pin} autoFocus
        onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setError(''); }}
        onKeyDown={e => e.key === 'Enter' && handleVerify()}
        placeholder="6-digit PIN"
        className="w-full h-10 px-3 text-center font-mono text-[18px] tracking-widest border border-[var(--bd2)] rounded-brands bg-surface outline-none focus:border-[#1249A9] mb-2"
      />
      {error && <p className="text-[12px] text-red-500 mb-2">{error}</p>}
      <div className="flex gap-2">
        <button onClick={() => setOpen(false)} className="flex-1 h-9 rounded-brands border border-[var(--bd2)] text-[13px] text-t2">Cancel</button>
        <button onClick={handleVerify} disabled={pin.length !== 6 || busy}
          className="flex-1 h-9 rounded-brands text-[13px] font-bold text-white disabled:opacity-50"
          style={{ background: '#1249A9' }}>
          {busy ? '…' : 'Confirm'}
        </button>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ restaurant, setRestaurant, supabase, onSignOut }: {
  restaurant: Restaurant;
  setRestaurant: (r: Restaurant) => void;
  supabase: ReturnType<typeof createClient>;
  onSignOut: () => void;
}) {
  const rest = restaurant as unknown as Record<string, unknown>;
  const GREEN = '#1249A9';

  // Pause / live
  const [isPaused,    setIsPaused]    = useState(!!(rest.is_paused as boolean));
  const [isLiveLocal, setIsLiveLocal] = useState(restaurant.is_live);
  const [toggling,    setToggling]    = useState(false);

  // Notifications
  const [notifs, setNotifs] = useState({ claimed: true, expired: true, collabs: true, weekly: false });

  // Manager mode
  const [mgrEnabled,  setMgrEnabled]  = useState(!!(rest.manager_mode_enabled as boolean));
  const [showMgrSetup, setShowMgrSetup] = useState(false);
  const [showDisableMgr, setShowDisableMgr] = useState(false);

  // Keep local mgrEnabled in sync when restaurant prop changes (e.g. after exit prompt)
  useEffect(() => {
    setMgrEnabled(!!(restaurant as unknown as Record<string,unknown>).manager_mode_enabled);
  }, [(restaurant as unknown as Record<string,unknown>).manager_mode_enabled]);

  // Payment methods
  const [ownerPinForPay, setOwnerPinForPay] = useState('');
  const [payPinError,   setPayPinError]   = useState('');
  const [payPinBusy,    setPayPinBusy]    = useState(false);
  const [payUnlocked,   setPayUnlocked]   = useState(false);

  // Danger zone
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting,        setDeleting]        = useState(false);

  const Toggle = ({ val, onToggle, disabled = false }: { val: boolean; onToggle: () => void; disabled?: boolean }) => (
    <button onClick={onToggle} disabled={disabled}
      className="relative w-10 h-6 rounded-full transition-colors shrink-0 disabled:opacity-60"
      style={{ background: val ? GREEN : '#D1D5DB' }}>
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: val ? 'calc(100% - 22px)' : 2 }} />
    </button>
  );

  const togglePause = async () => {
    setToggling(true);
    const newVal = !isPaused;
    const { data } = await supabase.from('restaurants').update({ is_paused: newVal }).eq('id', restaurant.id).select().single();
    if (data) { setRestaurant(data as Restaurant); setIsPaused(newVal); }
    setToggling(false);
  };

  const toggleLive = async () => {
    setToggling(true);
    const { data } = await supabase.from('restaurants').update({ is_live: !isLiveLocal }).eq('id', restaurant.id).select().single();
    if (data) { setRestaurant(data as Restaurant); setIsLiveLocal(!isLiveLocal); }
    setToggling(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('deals').delete().eq('restaurant_id', restaurant.id);
    await supabase.from('restaurants').delete().eq('id', restaurant.id);
    setDeleting(false);
    onSignOut();
  };

  const verifyOwnerPin = async (pin: string): Promise<boolean> => {
    const hash = await sha256hex(pin + restaurant.id);
    return hash === (rest.owner_pin_hash as string | null);
  };

  const handlePayPinSubmit = async () => {
    if (ownerPinForPay.length !== 6) return;
    setPayPinBusy(true);
    const ok = await verifyOwnerPin(ownerPinForPay);
    setPayPinBusy(false);
    if (ok) { setPayUnlocked(true); setPayPinError(''); }
    else { setPayPinError('Incorrect PIN'); setOwnerPinForPay(''); }
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold">Settings</h2>

      {/* ── Pause Restaurant ───────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4">
        <h3 className="font-semibold text-base">Pause Restaurant</h3>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-tx">{isPaused ? '⏸ Paused — hidden from customers' : '✅ Active — visible to customers'}</div>
            <div className="text-[12px] text-t2">Temporarily hide your restaurant from the customer feed without deleting anything</div>
          </div>
          <Toggle val={isPaused} onToggle={togglePause} disabled={toggling} />
        </div>
        <div className="flex items-center justify-between gap-4 pt-2 border-t border-[var(--bd)]">
          <div>
            <div className="text-sm font-semibold text-tx">{isLiveLocal ? '🟢 Live on RepEAT' : '⭕ Not published'}</div>
            <div className="text-[12px] text-t2">Master listing toggle — when off, restaurant is completely hidden</div>
          </div>
          <Toggle val={isLiveLocal} onToggle={toggleLive} disabled={toggling} />
        </div>
      </div>

      {/* ── Manager Mode ───────────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <IconShieldLock size={16} style={{ color: GREEN }} /> Manager Mode
          </h3>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${mgrEnabled ? 'bg-green-100 text-green-700' : 'bg-surface2 text-t3'}`}>
            {mgrEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <p className="text-[13px] text-t2">Give staff scanner-only access. You choose which other tabs they can see. Both you and staff get separate PINs.</p>
        {mgrEnabled ? (
          <button onClick={() => setShowDisableMgr(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-brands text-[13px] font-semibold border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
            <IconShieldOff size={14} /> Disable Manager Mode
          </button>
        ) : (
          <button onClick={() => setShowMgrSetup(true)}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-brands text-[13px] font-semibold text-white transition-colors"
            style={{ background: GREEN }}>
            <IconShieldLock size={14} /> Enable Manager Mode
          </button>
        )}
      </div>

      {/* ── Security & PINs ────────────────────────────────────── */}
      <PinSettings restaurant={restaurant} setRestaurant={setRestaurant} />

      {/* ── Payment Methods ────────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <IconCreditCard size={16} style={{ color: GREEN }} /> Payment Methods
          </h3>
          {!payUnlocked && (
            <span className="text-[11px] text-t3 flex items-center gap-1"><IconLock size={12} /> Owner PIN required</span>
          )}
        </div>
        {!payUnlocked ? (
          <div className="space-y-3">
            <p className="text-[13px] text-t2">Enter your Owner PIN to view or edit payment details.</p>
            <div className="flex gap-2">
              <input type="password" maxLength={6} value={ownerPinForPay}
                onChange={e => { setOwnerPinForPay(e.target.value.replace(/\D/,'')); setPayPinError(''); }}
                onKeyDown={e => e.key === 'Enter' && handlePayPinSubmit()}
                placeholder="6-digit PIN"
                className="flex-1 h-10 px-3 font-mono text-[16px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface outline-none focus:border-[#1249A9]"
              />
              <button onClick={handlePayPinSubmit} disabled={ownerPinForPay.length !== 6 || payPinBusy}
                className="h-10 px-4 rounded-brands text-[13px] font-semibold text-white disabled:opacity-50"
                style={{ background: GREEN }}>
                {payPinBusy ? '…' : 'Unlock'}
              </button>
            </div>
            {payPinError && <p className="text-[12px] text-red-500">{payPinError}</p>}
            {!(rest.owner_pin_hash as string | null) && (
              <p className="text-[12px] text-amber-600 bg-amber-50 border border-amber-200 rounded-brands px-3 py-2">
                ⚠️ No Owner PIN set — enable Manager Mode first to create your PINs.
              </p>
            )}
          </div>
        ) : (
          <PaymentMethodsEditor />
        )}
      </div>

      {/* ── Notifications ──────────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4">
        <h3 className="font-semibold text-base">Notifications</h3>
        {([
          { key: 'claimed' as const, label: 'Deal claimed', sub: 'Email when a customer claims your deal' },
          { key: 'expired' as const, label: 'Deal expired', sub: 'Email when a deal reaches its end date' },
          { key: 'collabs' as const, label: 'Collab requests', sub: 'Email when a creator sends a proposal' },
          { key: 'weekly'  as const, label: 'Weekly summary', sub: 'Sunday summary of claims and activity' },
        ]).map(({ key, label, sub }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-tx">{label}</div>
              <div className="text-[12px] text-t2">{sub}</div>
            </div>
            <Toggle val={notifs[key]} onToggle={() => setNotifs((n) => ({ ...n, [key]: !n[key] }))} />
          </div>
        ))}
      </div>

      {/* ── Help & Support ─────────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5">
        <h3 className="font-semibold text-base mb-3">Help & Support</h3>
        <p className="text-[13px] text-t2 mb-3">Got a question or issue? Raise a ticket and we&apos;ll get back to you within 24 hours.</p>
        <a href="/restaurant/help"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-brands text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: '#1249A9' }}>
          <IconHelp size={15} /> Open Support Centre
        </a>
      </div>

      {/* ── Danger Zone ────────────────────────────────────────── */}
      <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4 border border-red-100">
        <h3 className="font-semibold text-base text-red-600 flex items-center gap-2">
          <IconAlertTriangle size={15} /> Danger Zone
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-tx">Delete listing</div>
            <div className="text-[12px] text-t2">Permanently removes your restaurant and all deals</div>
          </div>
          <button onClick={() => setShowDeleteModal(true)}
            className="px-4 h-9 rounded-brands text-[13px] font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
            Delete
          </button>
        </div>
      </div>

      {/* Delete modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-surface rounded-brand p-6 w-full max-w-[380px] shadow-2xl">
            <h3 className="font-bold text-[18px] mb-2">Delete listing?</h3>
            <p className="text-[13px] text-t2 mb-5">This will permanently delete <strong>{restaurant.name}</strong> and all its deals. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 h-11 rounded-brands border border-[var(--bd2)] text-[14px] font-semibold text-t2">Cancel</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 h-11 rounded-brands text-[14px] font-bold text-white disabled:opacity-60" style={{ background: '#EF4444' }}>
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manager Mode setup modal */}
      {showMgrSetup && (
        <ManagerSetupModal
          restaurant={restaurant}
          supabase={supabase}
          onDone={(perms) => {
            setMgrEnabled(true);
            setShowMgrSetup(false);
            // Lock this device into manager mode
            localStorage.setItem('repeateats.manager_locked', JSON.stringify({ restaurant_id: restaurant.id, perms }));
            window.location.reload();
          }}
          onClose={() => setShowMgrSetup(false)}
        />
      )}

      {/* Manager Mode disable modal */}
      {showDisableMgr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowDisableMgr(false)} />
          <OwnerPinGate
            restaurant={restaurant}
            title="Disable Manager Mode"
            onSuccess={async () => {
              await supabase.from('restaurants').update({ manager_mode_enabled: false }).eq('id', restaurant.id);
              localStorage.removeItem('repeateats.manager_locked');
              setMgrEnabled(false);
              setRestaurant({ ...restaurant, manager_mode_enabled: false } as Restaurant);
              setShowDisableMgr(false);
            }}
            onClose={() => setShowDisableMgr(false)}
          />
        </div>
      )}
    </div>
  );
}

// ─── Owner PIN Gate ───────────────────────────────────────────────────────────
function OwnerPinGate({ restaurant, title, onSuccess, onClose }: {
  restaurant: Restaurant; title: string;
  onSuccess: () => void | Promise<void>; onClose: () => void;
}) {
  const rest = restaurant as unknown as Record<string,unknown>;
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const verify = async () => {
    if (pin.length !== 6) return;
    setBusy(true);
    const hash = await sha256hex(pin + restaurant.id);
    if (hash === (rest.owner_pin_hash as string | null)) {
      await onSuccess();
    } else { setErr('Incorrect PIN'); setPin(''); }
    setBusy(false);
  };
  return (
    <div className="relative bg-surface rounded-brand p-6 w-full max-w-[340px] shadow-2xl">
      <button onClick={onClose} className="absolute top-3 right-3 text-t3 hover:text-tx"><IconX size={16} /></button>
      <h3 className="font-bold text-[17px] mb-1">{title}</h3>
      <p className="text-[13px] text-t2 mb-4">Enter your 6-digit Owner PIN to continue.</p>
      <input type="password" maxLength={6} value={pin} autoFocus
        onChange={e => { setPin(e.target.value.replace(/\D/g,'')); setErr(''); }}
        onKeyDown={e => e.key === 'Enter' && verify()}
        placeholder="6-digit PIN"
        className="w-full h-11 px-3 font-mono text-[18px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface outline-none focus:border-[#1249A9] mb-2"
      />
      {err && <p className="text-[12px] text-red-500 mb-2">{err}</p>}
      <button onClick={verify} disabled={pin.length !== 6 || busy}
        className="w-full h-11 rounded-brands text-[14px] font-bold text-white disabled:opacity-50"
        style={{ background: '#1249A9' }}>
        {busy ? '…' : 'Confirm'}
      </button>
    </div>
  );
}

// ─── Manager Setup Modal ──────────────────────────────────────────────────────
function ManagerSetupModal({ restaurant, supabase, onDone, onClose }: {
  restaurant: Restaurant;
  supabase: ReturnType<typeof createClient>;
  onDone: (perms: ManagerPerms) => void;
  onClose: () => void;
}) {
  const GREEN = '#1249A9';
  const [mgrPin,   setMgrPin]   = useState('');
  const [ownPin,   setOwnPin]   = useState('');
  const [perms, setPerms] = useState<ManagerPerms>({ dashboard: false, deals: false, analytics: false, collabs: false, profile: false, scanner: true });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    if (mgrPin.length !== 6) { setErr('Manager PIN must be 6 digits'); return; }
    if (ownPin.length !== 6) { setErr('Owner PIN must be 6 digits'); return; }
    if (mgrPin === ownPin) { setErr('Manager and Owner PINs must be different'); return; }
    setSaving(true);
    const [mgrHash, ownHash] = await Promise.all([
      sha256hex(mgrPin + restaurant.id),
      sha256hex(ownPin + restaurant.id),
    ]);
    const { error } = await supabase.from('restaurants').update({
      manager_pin_hash: mgrHash,
      owner_pin_hash: ownHash,
      manager_mode_enabled: true,
      manager_perms: perms,
    }).eq('id', restaurant.id);
    setSaving(false);
    if (error) { setErr(error.message); return; }
    onDone(perms);
  };

  const permLabels: { key: keyof ManagerPerms; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'deals',     label: 'Deals' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'collabs',   label: 'Collabs' },
    { key: 'profile',   label: 'Profile' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface rounded-brand p-6 w-full max-w-[420px] shadow-2xl max-h-[90vh] overflow-y-auto scrollbar-none">
        <button onClick={onClose} className="absolute top-3 right-3 text-t3 hover:text-tx"><IconX size={16} /></button>
        <h3 className="font-bold text-[18px] mb-1 flex items-center gap-2"><IconShieldLock size={18} style={{ color: GREEN }} /> Enable Manager Mode</h3>
        <p className="text-[13px] text-t2 mb-5">Set PINs and choose which tabs your staff can access. The Scanner tab is always available.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Manager PIN (staff uses this)</label>
            <input type="password" maxLength={6} value={mgrPin} placeholder="6 digits"
              onChange={e => setMgrPin(e.target.value.replace(/\D/g,''))}
              className="w-full h-10 px-3 font-mono text-[16px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface outline-none focus:border-[#1249A9]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Owner PIN (you use this to exit + view payments)</label>
            <input type="password" maxLength={6} value={ownPin} placeholder="6 digits"
              onChange={e => setOwnPin(e.target.value.replace(/\D/g,''))}
              className="w-full h-10 px-3 font-mono text-[16px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface outline-none focus:border-[#1249A9]"
            />
          </div>

          <div>
            <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-2">Staff tab permissions</label>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 rounded-brands border border-[var(--bd)] bg-surface2 opacity-70">
                <span className="text-[13px] font-semibold text-tx">📷 Scanner</span>
                <span className="text-[11px] text-t2 font-semibold">Always on</span>
              </div>
              {permLabels.map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between p-3 rounded-brands border border-[var(--bd)]">
                  <span className="text-[13px] font-semibold text-tx">{label}</span>
                  <button onClick={() => setPerms(p => ({ ...p, [key]: !p[key] }))}
                    className="relative w-9 h-5 rounded-full transition-colors"
                    style={{ background: perms[key] ? GREEN : '#D1D5DB' }}>
                    <span className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all"
                      style={{ left: perms[key] ? 'calc(100% - 18px)' : 2 }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {err && <p className="text-[12px] text-red-500 mt-3">{err}</p>}
        <button onClick={handleSave} disabled={saving || mgrPin.length !== 6 || ownPin.length !== 6}
          className="w-full h-11 mt-5 rounded-brands text-[14px] font-bold text-white disabled:opacity-50 transition-all"
          style={{ background: GREEN }}>
          {saving ? 'Saving…' : 'Enable Manager Mode'}
        </button>
      </div>
    </div>
  );
}

// ─── Security & PINs ──────────────────────────────────────────────────────────
// Set/change the Owner and Manager PINs via the shared server endpoint, so a PIN
// set on the website also works in the mobile app (and vice-versa). The owner is
// authenticated, so setting a new PIN here also serves as "forgot PIN" recovery.
function PinSettings({ restaurant, setRestaurant }: {
  restaurant: Restaurant;
  setRestaurant: (r: Restaurant) => void;
}) {
  const GREEN = '#1249A9';
  const rest = restaurant as unknown as Record<string, unknown>;

  const ROWS = [
    { kind: 'owner'   as const, label: 'Owner PIN',   col: 'owner_pin_hash',   sub: 'Unlocks payment methods & disables Manager Mode' },
    { kind: 'manager' as const, label: 'Manager PIN', col: 'manager_pin_hash', sub: 'Lets staff sign in to Manager Mode (scanner-only)' },
  ];

  // An Owner PIN already on file means ANY PIN change (owner or manager) must be
  // proven with the current Owner PIN or an emailed OTP — matches the server gate.
  const ownerIsSet = !!(rest.owner_pin_hash as string | null);

  type DraftRow = {
    pin: string; confirm: string; open: boolean;
    currentPin: string; otp: string; useOtp: boolean; otpSent: boolean;
  };
  const blankRow: DraftRow = { pin: '', confirm: '', open: false, currentPin: '', otp: '', useOtp: false, otpSent: false };
  const [draft, setDraft] = useState<Record<string, DraftRow>>({
    owner:   { ...blankRow },
    manager: { ...blankRow },
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [msg,  setMsg]  = useState<{ kind: string; ok: boolean; text: string } | null>(null);

  const update = (kind: string, patch: Partial<DraftRow>) =>
    setDraft((d) => ({ ...d, [kind]: { ...d[kind], ...patch } }));

  const sendOtp = async (kind: 'owner' | 'manager') => {
    setBusy(`${kind}:otp`); setMsg(null);
    try {
      const res = await fetch('/api/restaurant/pin/recovery/start', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not send code');
      update(kind, { useOtp: true, otpSent: true, currentPin: '' });
      setMsg({ kind, ok: true, text: `Code sent to ${data.email ?? 'your email'}.` });
    } catch (e) {
      setMsg({ kind, ok: false, text: e instanceof Error ? e.message : 'Could not send code' });
    } finally {
      setBusy(null);
    }
  };

  const save = async (kind: 'owner' | 'manager', col: string) => {
    const { pin, confirm, currentPin, otp, useOtp } = draft[kind];
    if (!/^\d{6}$/.test(pin)) { setMsg({ kind, ok: false, text: 'PIN must be 6 digits.' }); return; }
    if (pin !== confirm)      { setMsg({ kind, ok: false, text: 'PINs do not match.' }); return; }
    // Proof required only when an Owner PIN already exists.
    if (ownerIsSet) {
      if (useOtp && !/^\d{6}$/.test(otp)) { setMsg({ kind, ok: false, text: 'Enter the 6-digit code from your email.' }); return; }
      if (!useOtp && !/^\d{6}$/.test(currentPin)) { setMsg({ kind, ok: false, text: 'Enter your current Owner PIN.' }); return; }
    }
    setBusy(kind); setMsg(null);
    try {
      const res = await fetch('/api/restaurant/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind, pin,
          ...(ownerIsSet && !useOtp ? { current_pin: currentPin } : {}),
          ...(ownerIsSet && useOtp  ? { otp } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Could not save PIN');
      // Sync local state so unlock checks use the new hash immediately.
      setRestaurant({ ...(restaurant as object), [col]: data.hash } as Restaurant);
      update(kind, { ...blankRow });
      setMsg({ kind, ok: true, text: 'PIN saved.' });
    } catch (e) {
      setMsg({ kind, ok: false, text: e instanceof Error ? e.message : 'Something went wrong' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-surface rounded-brand shadow-brand p-5 space-y-4">
      <h3 className="font-semibold text-base flex items-center gap-2">
        <IconLock size={16} style={{ color: GREEN }} /> Security &amp; PINs
      </h3>
      <p className="text-[13px] text-t2">Set or change your PINs. They stay valid until you change them, and work on both the website and the app.</p>

      {ROWS.map(({ kind, label, col, sub }) => {
        const isSet = !!(rest[col] as string | null);
        const d = draft[kind];
        return (
          <div key={kind} className="rounded-brands border border-[var(--bd)] p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-tx">{label}</div>
                <div className="text-[12px] text-t2">{sub}</div>
              </div>
              <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${isSet ? 'bg-green-100 text-green-700' : 'bg-surface2 text-t3'}`}>
                {isSet ? 'Set' : 'Not set'}
              </span>
            </div>

            {d.open ? (
              <div className="space-y-2">
                {/* Proof step — only when an Owner PIN already exists. */}
                {ownerIsSet && (
                  <div className="space-y-2 pb-2 mb-1 border-b border-[var(--bd)]">
                    <p className="text-[12px] text-t2">
                      {d.useOtp
                        ? 'Enter the 6-digit code we emailed the owner.'
                        : 'Confirm the current Owner PIN to make this change.'}
                    </p>
                    {d.useOtp ? (
                      <input type="text" inputMode="numeric" maxLength={6} value={d.otp}
                        onChange={(e) => update(kind, { otp: e.target.value.replace(/\D/g, '') })}
                        placeholder="6-digit email code"
                        className="w-full h-10 px-3 font-mono text-[15px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface text-tx outline-none focus:border-[#1249A9]" />
                    ) : (
                      <input type="password" inputMode="numeric" maxLength={6} value={d.currentPin}
                        onChange={(e) => update(kind, { currentPin: e.target.value.replace(/\D/g, '') })}
                        placeholder="Current Owner PIN"
                        className="w-full h-10 px-3 font-mono text-[15px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface text-tx outline-none focus:border-[#1249A9]" />
                    )}
                    {d.useOtp ? (
                      <button type="button" onClick={() => update(kind, { useOtp: false, otp: '' })}
                        className="text-[12px] font-semibold" style={{ color: GREEN }}>Use Owner PIN instead</button>
                    ) : (
                      <button type="button" onClick={() => sendOtp(kind)} disabled={busy === `${kind}:otp`}
                        className="text-[12px] font-semibold disabled:opacity-50" style={{ color: GREEN }}>
                        {busy === `${kind}:otp` ? 'Sending…' : 'Forgot Owner PIN? Email me a code'}
                      </button>
                    )}
                  </div>
                )}
                <input type="password" inputMode="numeric" maxLength={6} value={d.pin}
                  onChange={(e) => update(kind, { pin: e.target.value.replace(/\D/g, '') })}
                  placeholder={isSet ? 'New 6-digit PIN' : '6-digit PIN'}
                  className="w-full h-10 px-3 font-mono text-[15px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface text-tx outline-none focus:border-[#1249A9]" />
                <input type="password" inputMode="numeric" maxLength={6} value={d.confirm}
                  onChange={(e) => update(kind, { confirm: e.target.value.replace(/\D/g, '') })}
                  placeholder="Confirm PIN"
                  className="w-full h-10 px-3 font-mono text-[15px] tracking-widest text-center border border-[var(--bd2)] rounded-brands bg-surface text-tx outline-none focus:border-[#1249A9]" />
                {msg?.kind === kind && <p className={`text-[12px] ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>{msg.text}</p>}
                <div className="flex gap-2">
                  <button onClick={() => { update(kind, { ...blankRow }); setMsg(null); }}
                    className="flex-1 h-9 rounded-brands border border-[var(--bd2)] text-[13px] font-semibold text-t2">Cancel</button>
                  <button onClick={() => save(kind, col)} disabled={busy === kind}
                    className="flex-1 h-9 rounded-brands text-[13px] font-bold text-white disabled:opacity-50"
                    style={{ background: GREEN }}>
                    {busy === kind ? 'Saving…' : 'Save PIN'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button onClick={() => { update(kind, { open: true }); setMsg(null); }}
                  className="h-9 px-4 rounded-brands text-[13px] font-semibold text-white" style={{ background: GREEN }}>
                  {isSet ? `Change ${label}` : `Set ${label}`}
                </button>
                {msg?.kind === kind && msg.ok && <span className="text-[12px] text-green-600">{msg.text}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Payment Methods Editor ───────────────────────────────────────────────────
interface StripePaymentMethod {
  id: string;
  type: string;
  card: { brand: string; last4: string; exp_month: number; exp_year: number } | null;
  acss: { bank_name: string | null; last4: string } | null;
  is_default: boolean;
}

function PaymentMethodsEditor() {
  const GREEN = '#1249A9';
  const [methods, setMethods] = useState<StripePaymentMethod[]>([]);
  const [loaded,  setLoaded]  = useState(false);
  const [busy,    setBusy]    = useState(false);
  const [error,   setError]   = useState('');
  // Which express wallet this device supports — drives Apple Pay vs Google Pay button.
  const [wallet,  setWallet]  = useState<'apple' | 'google' | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/stripe/payment-methods?context=restaurant');
      if (!res.ok) throw new Error('Failed to load payment methods');
      const data = await res.json();
      setMethods(data.methods ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
    // If we just returned from Stripe's hosted add flow, refresh + clean the URL.
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('pm_added')) {
      const url = new URL(window.location.href);
      url.searchParams.delete('pm_added');
      window.history.replaceState({}, '', url.toString());
    }
    // Detect which express wallet to surface: Apple Pay on Apple devices, else Google Pay.
    try {
      const AP = (window as unknown as { ApplePaySession?: { canMakePayments?: () => boolean } }).ApplePaySession;
      setWallet(AP?.canMakePayments?.() ? 'apple' : 'google');
    } catch {
      setWallet('google');
    }
  }, [load]);

  const addMethod = async (method: 'card' | 'acss_debit') => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/stripe/payment-methods/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'restaurant', method, return_url: `${window.location.origin}/restaurant?tab=settings` }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Could not start Stripe');
      window.location.href = data.url; // hosted redirect
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setBusy(false);
    }
  };

  const removeMethod = async (id: string) => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/stripe/payment-methods/detach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: 'restaurant', payment_method_id: id }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Could not remove'); }
      setMethods(prev => prev.filter(m => m.id !== id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  if (!loaded) return <div className="h-10 bg-surface2 rounded-brands animate-pulse" />;

  return (
    <div className="space-y-4">
      {/* Trust note */}
      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-brands" style={{ background: 'rgba(18,73,169,0.08)' }}>
        <IconLock size={14} style={{ color: GREEN }} className="flex-shrink-0 mt-0.5" />
        <p className="text-[12px] text-t2 leading-relaxed">
          Payment methods are stored securely by <strong>Stripe</strong> — RepEAT never sees or
          keeps your card or bank details. Used to pay your RepEAT subscription and to fund creator collabs.
        </p>
      </div>

      {/* Saved methods */}
      {methods.length === 0 ? (
        <p className="text-[13px] text-t2">No payment methods yet. Add one to get started.</p>
      ) : (
        <div className="space-y-2">
          {methods.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-brands border border-[var(--bd2)]">
              <div className="flex items-center gap-3 min-w-0">
                <IconCreditCard size={18} className="text-t2 flex-shrink-0" />
                <div className="min-w-0">
                  {m.card ? (
                    <div className="text-[13px] font-semibold text-tx capitalize truncate">
                      {m.card.brand} •••• {m.card.last4}
                    </div>
                  ) : m.acss ? (
                    <div className="text-[13px] font-semibold text-tx truncate">
                      {m.acss.bank_name ?? 'Bank account'} •••• {m.acss.last4}
                    </div>
                  ) : (
                    <div className="text-[13px] font-semibold text-tx capitalize truncate">{m.type.replace('_', ' ')}</div>
                  )}
                  <div className="text-[11px] text-t3">
                    {m.card ? `Expires ${String(m.card.exp_month).padStart(2,'0')}/${m.card.exp_year}` : 'Pre-authorized debit'}
                    {m.is_default && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(18,73,169,0.12)', color: GREEN }}>Default</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => removeMethod(m.id)} disabled={busy}
                className="text-[12px] font-semibold text-red-500 hover:text-red-600 disabled:opacity-50 flex-shrink-0">
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-[12px] text-red-500">{error}</p>}

      {/* Express wallet — Apple Pay on Apple devices, Google Pay elsewhere.
          Opens the secure Stripe page where the device's wallet sheet appears. */}
      {wallet === 'apple' && (
        <button onClick={() => addMethod('card')} disabled={busy}
          className="w-full h-11 rounded-brands text-[15px] font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: '#000' }}>
          <IconBrandApple size={20} /> Pay
        </button>
      )}
      {wallet === 'google' && (
        <button onClick={() => addMethod('card')} disabled={busy}
          className="w-full h-11 rounded-brands text-[15px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2 bg-white text-[#3c4043] border border-[var(--bd2)] hover:bg-gray-50 transition-colors">
          <IconBrandGoogle size={18} /> Pay
        </button>
      )}

      {/* Add card / bank → Stripe-hosted */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        <button onClick={() => addMethod('card')} disabled={busy}
          className="h-10 rounded-brands text-[13px] font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: GREEN }}>
          <IconCreditCard size={15} /> Add card
        </button>
        <button onClick={() => addMethod('acss_debit')} disabled={busy}
          className="h-10 rounded-brands text-[13px] font-semibold disabled:opacity-50 flex items-center justify-center gap-2 border border-[var(--bd2)] text-tx hover:bg-surface2 transition-colors">
          <IconBuildingBank size={15} /> Add bank account
        </button>
      </div>
      <p className="text-[11px] text-t3 text-center leading-relaxed">
        {wallet === 'apple'
          ? 'Apple Pay opens the secure Stripe page to confirm with your wallet.'
          : 'Google Pay opens the secure Stripe page to confirm with your wallet.'}
        <br />Bank account uses Interac-linked pre-authorized debit (ACSS).
      </p>
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
