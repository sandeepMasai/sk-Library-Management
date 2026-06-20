import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { PlanPayload, PlanRow } from '../api/superadminApi';

type LibraryOption = { id: string; name: string };

type PlanFormModalProps = {
  open: boolean;
  editing: PlanRow | null;
  libraries: LibraryOption[];
  saving: boolean;
  onClose: () => void;
  onSave: (payload: PlanPayload) => Promise<void>;
};

const DURATION_PRESETS = [
  { label: '7 Days', days: 7 },
  { label: '30 Days', days: 30 },
  { label: '90 Days', days: 90 },
  { label: '180 Days', days: 180 },
  { label: '1 Year', days: 365 },
];

function slugifyPlanKey(raw: string) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '')
    .slice(0, 40);
}

function calcFinal(price: number, discountPct: number) {
  const p = Number(price || 0);
  const d = Math.min(100, Math.max(0, Number(discountPct || 0)));
  return Math.max(0, Math.round((p - p * (d / 100)) * 100) / 100);
}

export function PlanFormModal({ open, editing, libraries, saving, onClose, onSave }: PlanFormModalProps) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [originalPrice, setOriginalPrice] = useState('');
  const [discount, setDiscount] = useState('0');
  const [duration, setDuration] = useState('30');
  const [tag, setTag] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [isOneTimeOffer, setIsOneTimeOffer] = useState(false);
  const [isTrial, setIsTrial] = useState(false);
  const [allowedLibraryIds, setAllowedLibraryIds] = useState<string[]>([]);
  const [libSearch, setLibSearch] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [badgeRecommended, setBadgeRecommended] = useState(false);
  const [badgeBestValue, setBadgeBestValue] = useState(false);
  const [badgeLimitedTime, setBadgeLimitedTime] = useState(false);
  const [badgeExclusive, setBadgeExclusive] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    if (editing) {
      setName(editing.name || '');
      setKey(String(editing.key || ''));
      setDescription(String(editing.description || ''));
      setPrice(String(editing.price ?? 0));
      setOriginalPrice(editing.originalPrice != null ? String(editing.originalPrice) : '');
      setDiscount(String(editing.discount ?? 0));
      setDuration(String(editing.duration ?? 30));
      setTag(String(editing.tag || ''));
      setIsActive(Boolean(editing.isActive));
      setIsPublic(editing.isPublic !== false);
      setIsOneTimeOffer(Boolean(editing.isOneTimeOffer));
      setIsTrial(Boolean(editing.isTrial));
      setAllowedLibraryIds(Array.isArray(editing.allowedLibraryIds) ? editing.allowedLibraryIds.map(String) : []);
      setCampaignName(String(editing.campaignName || ''));
      setPromoStart(editing.promoStartDate ? String(editing.promoStartDate).slice(0, 10) : '');
      setPromoEnd(editing.promoEndDate ? String(editing.promoEndDate).slice(0, 10) : '');
      setBadgeRecommended(Boolean(editing.badges?.recommended));
      setBadgeBestValue(Boolean(editing.badges?.bestValue));
      setBadgeLimitedTime(Boolean(editing.badges?.limitedTime));
      setBadgeExclusive(Boolean(editing.badges?.exclusive));
    } else {
      setName('');
      setKey('');
      setDescription('');
      setPrice('0');
      setOriginalPrice('');
      setDiscount('0');
      setDuration('30');
      setTag('');
      setIsActive(true);
      setIsPublic(true);
      setIsOneTimeOffer(false);
      setIsTrial(false);
      setAllowedLibraryIds([]);
      setLibSearch('');
      setCampaignName('');
      setPromoStart('');
      setPromoEnd('');
      setBadgeRecommended(false);
      setBadgeBestValue(false);
      setBadgeLimitedTime(false);
      setBadgeExclusive(false);
    }
  }, [open, editing]);

  const finalPrice = useMemo(() => calcFinal(Number(price), Number(discount)), [price, discount]);
  const origNum = originalPrice.trim() ? Number(originalPrice) : null;
  const savings =
    origNum != null && origNum > finalPrice ? Math.round((origNum - finalPrice) * 100) / 100 : 0;

  const filteredLibraries = useMemo(() => {
    const q = libSearch.trim().toLowerCase();
    if (!q) return libraries;
    return libraries.filter((l) => l.name.toLowerCase().includes(q));
  }, [libraries, libSearch]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const trimmedName = name.trim();
    const planKey = slugifyPlanKey(key.trim() || trimmedName);
    const priceNum = Number(price);
    const discountNum = Number(discount);
    const durationNum = Number(duration);
    const origRaw = originalPrice.trim();
    const origVal = origRaw ? Number(origRaw) : null;

    if (!trimmedName) return setError('Plan name is required');
    if (!planKey) return setError('Plan key is required');
    if (!Number.isFinite(priceNum) || priceNum < 0) return setError('Enter a valid offer price');
    if (origRaw && (!Number.isFinite(origVal!) || origVal! < 0)) return setError('Enter a valid original price');
    if (!Number.isFinite(discountNum) || discountNum < 0 || discountNum > 100) {
      return setError('Discount must be between 0 and 100');
    }
    if (!Number.isFinite(durationNum) || durationNum < 1) return setError('Duration must be at least 1 day');
    if (!isPublic && allowedLibraryIds.length === 0) {
      return setError('Select at least one library for a library-specific plan');
    }

    try {
      await onSave({
        name: trimmedName,
        key: planKey,
        price: priceNum,
        discount: discountNum,
        duration: durationNum,
        isActive,
        tag: tag.trim() || null,
        originalPrice: origVal,
        isPublic,
        isOneTimeOffer,
        isTrial,
        allowedLibraryIds: isPublic ? [] : allowedLibraryIds,
        description: description.trim(),
        campaignName: campaignName.trim() || null,
        promoStartDate: promoStart.trim() || null,
        promoEndDate: promoEnd.trim() || null,
        badges: {
          recommended: badgeRecommended,
          bestValue: badgeBestValue,
          limitedTime: badgeLimitedTime,
          exclusive: badgeExclusive,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-emerald-900/95 text-white shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-white">{editing ? 'Edit Plan' : 'Create Plan'}</h2>
            <p className="text-xs text-white/60">Configure pricing, duration, visibility & badges</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-2 py-1 text-white/60 hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="overflow-y-auto px-6 py-5" style={{ maxHeight: 'calc(92vh - 140px)' }}>
          {error ? (
            <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Input dark label="Plan Name" value={name} onChange={(e) => {
              setName(e.target.value);
              if (!editing) setKey(slugifyPlanKey(e.target.value));
            }} placeholder="Premium Plan" />
            <Input dark label="Plan Key" value={key} onChange={(e) => setKey(slugifyPlanKey(e.target.value))} placeholder="premium-plan" />
          </div>

          <div className="mt-4">
            <Input dark label="Description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short plan description" />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-white/80">Plan Duration</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATION_PRESETS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDuration(String(opt.days))}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    Number(duration) === opt.days
                      ? 'bg-white text-emerald-800'
                      : 'bg-white/10 text-white/80 hover:bg-white/15'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Input dark label="Custom Duration (days)" type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} />
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input dark label="Original Price (₹)" type="number" min={0} value={originalPrice} onChange={(e) => setOriginalPrice(e.target.value)} placeholder="4999" />
            <Input dark label="Offer Price (₹)" type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="3999" />
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Input dark label="Discount (%)" type="number" min={0} max={100} value={discount} onChange={(e) => setDiscount(e.target.value)} />
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/15 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-200">Auto Savings</p>
              <p className="mt-1 text-sm text-white">
                {origNum != null && origNum > finalPrice ? `₹${origNum} → ₹${finalPrice}` : `Final: ₹${finalPrice}`}
              </p>
              {savings > 0 ? <p className="mt-1 text-xs text-emerald-200">Savings: ₹{savings.toLocaleString('en-IN')}</p> : null}
            </div>
          </div>

          <div className="mt-5 space-y-3 rounded-xl border border-white/15 bg-white/5 p-4">
            <p className="text-sm font-semibold text-white">Plan Type</p>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-white/85">
              <input type="radio" checked={isPublic && !isOneTimeOffer} onChange={() => { setIsPublic(true); setIsOneTimeOffer(false); }} className="accent-emerald-400" />
              Public Plan — visible to all libraries
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-white/85">
              <input type="radio" checked={isOneTimeOffer} onChange={() => { setIsOneTimeOffer(true); setIsPublic(true); }} className="accent-emerald-400" />
              One-Time Offer — purchase once, never shown again
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-white/85">
              <input type="radio" checked={!isPublic} onChange={() => { setIsPublic(false); setIsOneTimeOffer(false); }} className="accent-emerald-400" />
              Library-Specific — selected libraries only
            </label>
            <label className="flex cursor-pointer items-center gap-3 text-sm text-white/85">
              <input type="checkbox" checked={isTrial} onChange={(e) => setIsTrial(e.target.checked)} className="accent-emerald-400" />
              Trial Plan
            </label>
          </div>

          {!isPublic ? (
            <div className="mt-4 rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-semibold text-white">Library Selection</p>
              <div className="mt-3">
                <Input dark label="Search Libraries" value={libSearch} onChange={(e) => setLibSearch(e.target.value)} placeholder="Search by name" />
              </div>
              <div className="mt-3 max-h-36 space-y-2 overflow-y-auto">
                {filteredLibraries.map((lib) => (
                  <label key={lib.id} className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
                    <input
                      type="checkbox"
                      checked={allowedLibraryIds.includes(lib.id)}
                      onChange={(e) => {
                        setAllowedLibraryIds((prev) =>
                          e.target.checked ? [...prev, lib.id] : prev.filter((id) => id !== lib.id)
                        );
                      }}
                      className="accent-primary"
                    />
                    {lib.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input dark label="Campaign Name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Summer Offer" />
            <Input dark label="Tag" value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Most Popular" />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input dark label="Promo Start Date" type="date" value={promoStart} onChange={(e) => setPromoStart(e.target.value)} />
            <Input dark label="Promo End Date" type="date" value={promoEnd} onChange={(e) => setPromoEnd(e.target.value)} />
          </div>

          <div className="mt-5">
            <p className="text-sm font-semibold text-white">Conversion Badges</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                { label: '⭐ Most Popular', checked: badgeRecommended, set: setBadgeRecommended },
                { label: '🔥 Best Value', checked: badgeBestValue, set: setBadgeBestValue },
                { label: '⏰ Limited Time', checked: badgeLimitedTime, set: setBadgeLimitedTime },
                { label: '🎁 Exclusive Offer', checked: badgeExclusive, set: setBadgeExclusive },
              ].map((b) => (
                <label key={b.label} className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white/85">
                  <input type="checkbox" checked={b.checked} onChange={(e) => b.set(e.target.checked)} className="accent-primary" />
                  {b.label}
                </label>
              ))}
            </div>
          </div>

          <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-white/85">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-emerald-400" />
            Plan is active
          </label>

          <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
            <Button type="button" variant="outline" className="!border-white/25 !text-white hover:!bg-white/10" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : editing ? 'Update Plan' : 'Create Plan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
