import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ALL_STATES, INDIA_STATE_CITIES } from '../../../data/indiaLocations';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Select } from '../../../components/ui/Select';
import { formatDisplayName } from '../../../utils/formatName';
import { notifyLibraryLogoUpdated } from '../../../lib/auth';
import { updateLibraryProfile, uploadLibraryLogo } from '../../api/libraryApi';
import { SettingsCard, SettingsField, SettingsSection } from './SettingsPrimitives';

type ProfileData = Record<string, unknown>;

type ProfileForm = {
  libraryName: string;
  ownerName: string;
  email: string;
  phone: string;
  state: string;
  city: string;
  place: string;
  pincode: string;
  address: string;
  whatsappNumber: string;
  totalSeats: string;
  logoUrl: string;
};

type LibraryProfileSectionProps = {
  profile: ProfileData;
  onProfileUpdated?: (profile: ProfileData) => void;
  onSaving?: () => void;
  onSaved?: () => void;
  onSaveError?: (message: string) => void;
};

function profileToForm(profile: ProfileData): ProfileForm {
  const comm = profile.communication as { whatsapp?: string } | undefined;
  return {
    libraryName: String(profile.libraryName || ''),
    ownerName: String(profile.name || profile.ownerName || ''),
    email: String(profile.email || ''),
    phone: String(profile.phone || ''),
    state: String(profile.state || ''),
    city: String(profile.city || ''),
    place: String(profile.place || ''),
    pincode: String(profile.pincode || ''),
    address: String(profile.address || ''),
    whatsappNumber: String(profile.whatsappNumber || comm?.whatsapp || ''),
    totalSeats: String(profile.totalSeats ?? ''),
    logoUrl: String(profile.logoUrl || ''),
  };
}

function formatPreviewLine(value: unknown, fallback = '—'): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—') return fallback;
  return formatDisplayName(raw);
}

function displayValue(value: string) {
  const v = value.trim();
  return v ? formatPreviewLine(v) : '—';
}

function libraryLogoInitials(name: string) {
  const formatted = formatPreviewLine(name, 'L');
  return formatted
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

type LibraryLogoPickerProps = {
  logoUrl: string;
  libraryName: string;
  uploading: boolean;
  previewUrl?: string | null;
  onPick: () => void;
};

function LibraryLogoPicker({ logoUrl, libraryName, uploading, previewUrl, onPick }: LibraryLogoPickerProps) {
  const displayUrl = previewUrl || logoUrl;
  const initials = libraryLogoInitials(libraryName);

  return (
    <div className="mb-8 flex flex-col items-center border-b border-white/10 pb-8">
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="group relative disabled:cursor-wait disabled:opacity-70"
        aria-label="Change library profile photo"
      >
        <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-white/20 bg-white/10 shadow-lg ring-2 ring-white/10 transition group-hover:ring-teal-400/45">
          {displayUrl ? (
            <img key={displayUrl} src={displayUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/40 to-violet-500/30 text-2xl font-bold text-white">
              {initials}
            </div>
          )}
          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-[#0f172a]/75">
              <span className="text-[10px] font-bold uppercase tracking-wide text-white">Uploading</span>
            </div>
          ) : null}
        </div>
        <span className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#0f172a] bg-teal-500 text-sm shadow-md transition group-hover:bg-teal-400">
          📷
        </span>
      </button>
      <p className="mt-3 text-sm font-semibold text-white">{formatPreviewLine(libraryName, 'Your Library')}</p>
      <p className="mt-1 text-xs text-white/55">
        {uploading ? 'Saving new library photo…' : 'Click photo to change library profile image'}
      </p>
      <p className="mt-1 text-[10px] text-white/40">PNG, JPG or WebP · max 5 MB</p>
    </div>
  );
}

function LibraryProfilePreviewCard({ form }: { form: ProfileForm }) {
  const city = formatPreviewLine(form.city, '');
  const state = formatPreviewLine(form.state, '');
  const location = [city, state].filter(Boolean).join(', ') || 'Your city';
  const displayLibrary = formatPreviewLine(form.libraryName, 'Your Library');
  const displayOwner = formatPreviewLine(form.ownerName, 'Library Owner');

  const infoRows = [
    { icon: '✉️', label: 'Email', value: form.email },
    { icon: '📞', label: 'Phone', value: form.phone },
    { icon: '💬', label: 'WhatsApp', value: form.whatsappNumber },
    { icon: '📍', label: 'Area', value: form.place },
  ].filter((row) => row.value);

  return (
    <div className="settings-preview-card admin-card mt-4 overflow-hidden rounded-2xl p-0">
      <div className="relative bg-gradient-to-br from-primary/30 via-violet-500/20 to-cyan-500/15 px-5 pb-16 pt-8 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.12),transparent_55%)]" />
        <span className="relative inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-100">
          Live preview
        </span>
      </div>

      <div className="relative -mt-12 px-5 pb-5 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-[#0f172a] bg-white/10 shadow-xl ring-2 ring-white/15">
          {form.logoUrl ? (
            <img key={form.logoUrl} src={form.logoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-white">{libraryLogoInitials(form.libraryName)}</span>
          )}
        </div>

        <h3 className="font-display mt-4 text-xl font-bold tracking-tight text-white">{displayLibrary}</h3>
        <p className="mt-1 text-sm font-medium text-emerald-200/90">{displayOwner}</p>
        <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-white/45">Library owner</p>

        <p className="mx-auto mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs text-white/75">
          <span aria-hidden>📍</span>
          {location}
        </p>
      </div>

      <div className="mx-5 mb-5 space-y-2 border-t border-white/10 pt-4">
        {(infoRows.length ? infoRows : [{ icon: '✉️', label: 'Email', value: form.email || '—' }]).map((row) => (
          <div
            key={row.label}
            className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-left"
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm">
              {row.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">{row.label}</p>
              <p className="mt-0.5 truncate text-sm font-medium text-white">{row.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LibraryProfileSection({
  profile,
  onProfileUpdated,
  onSaving,
  onSaved,
  onSaveError,
}: LibraryProfileSectionProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [savedForm, setSavedForm] = useState<ProfileForm>(() => profileToForm(profile));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState('');
  const [savedFlash, setSavedFlash] = useState(false);
  const [logoFlash, setLogoFlash] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  useEffect(() => {
    const next = profileToForm(profile);
    setForm(next);
    setSavedForm(next);
    setEditing(false);
  }, [profile]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const stateOptions = useMemo(
    () => [{ value: '', label: 'Select state' }, ...ALL_STATES.map((s) => ({ value: s, label: s }))],
    []
  );

  const cityOptions = useMemo(() => {
    const cities = form.state ? INDIA_STATE_CITIES[form.state] || [] : [];
    return [{ value: '', label: 'Select city' }, ...cities.map((c) => ({ value: c, label: c }))];
  }, [form.state]);

  function patch<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError('');
  }

  function startEditing() {
    setForm(savedForm);
    setError('');
    setSavedFlash(false);
    setEditing(true);
  }

  function cancelEditing() {
    setForm(savedForm);
    setError('');
    setEditing(false);
  }

  async function handleLogoChange(file: File | undefined) {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a PNG, JPG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setLogoPreview(preview);
    setUploadingLogo(true);
    setError('');
    onSaving?.();
    try {
      const res = await uploadLibraryLogo(file);
      const nextProfile = (res.profile || profile) as ProfileData;
      if (res.logoUrl) nextProfile.logoUrl = res.logoUrl;
      const nextForm = profileToForm(nextProfile);
      setForm(nextForm);
      setSavedForm(nextForm);
      onProfileUpdated?.(nextProfile);
      if (res.logoUrl) notifyLibraryLogoUpdated(res.logoUrl);
      onSaved?.();
      setLogoFlash(true);
      setTimeout(() => setLogoFlash(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Logo upload failed';
      setError(msg);
      onSaveError?.(msg);
    } finally {
      URL.revokeObjectURL(preview);
      setLogoPreview(null);
      setUploadingLogo(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const libraryName = form.libraryName.trim();
    const ownerName = form.ownerName.trim();
    const city = form.city.trim();
    const phoneDigits = form.phone.replace(/\D/g, '').slice(-10);
    const pincode = form.pincode.replace(/\D/g, '').slice(0, 6);

    if (!libraryName || !ownerName || !city) {
      setError('Library name, owner name, and city are required.');
      return;
    }
    if (pincode && pincode.length !== 6) {
      setError('PIN code must be exactly 6 digits.');
      return;
    }
    if (form.phone.trim() && phoneDigits.length !== 10) {
      setError('Phone must be a valid 10-digit Indian mobile number.');
      return;
    }

    setSaving(true);
    onSaving?.();
    try {
      const res = await updateLibraryProfile({
        libraryName,
        name: ownerName,
        city,
        state: form.state.trim(),
        place: form.place.trim(),
        pincode,
        address: form.address.trim(),
        phone: phoneDigits || undefined,
        whatsappNumber: form.whatsappNumber.replace(/\D/g, '') || undefined,
      });

      const nextProfile = (res.profile || profile) as ProfileData;
      const nextForm = profileToForm(nextProfile);
      setForm(nextForm);
      setSavedForm(nextForm);
      onProfileUpdated?.(nextProfile);
      onSaved?.();
      setEditing(false);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile';
      setError(msg);
      onSaveError?.(msg);
    } finally {
      setSaving(false);
    }
  }

  const emailVerified = Boolean(profile.isEmailVerified);
  const previewForm = editing ? form : savedForm;
  const previewFormWithLogo = logoPreview ? { ...previewForm, logoUrl: logoPreview } : previewForm;
  const activeLogoForm = editing ? form : savedForm;

  return (
    <SettingsSection
      title="Library profile"
      description={
        editing
          ? 'Update your library details, then save or cancel.'
          : 'Your library details from registration — click Edit profile to make changes.'
      }
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
          <SettingsCard>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                void handleLogoChange(e.target.files?.[0]);
                e.target.value = '';
              }}
            />

            <LibraryLogoPicker
              logoUrl={activeLogoForm.logoUrl}
              libraryName={activeLogoForm.libraryName}
              uploading={uploadingLogo}
              previewUrl={logoPreview}
              onPick={() => logoInputRef.current?.click()}
            />

            {logoFlash ? (
              <p className="-mt-4 mb-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Library profile photo updated.
              </p>
            ) : null}

            {error && !editing ? (
              <p className="-mt-4 mb-6 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            ) : null}

            {!editing ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <SettingsField label="Library name" value={displayValue(savedForm.libraryName)} />
                  <SettingsField label="Owner name" value={displayValue(savedForm.ownerName)} />
                  <div className="sm:col-span-2">
                    <SettingsField label="Email" value={savedForm.email || '—'} />
                    {emailVerified ? (
                      <p className="mt-1 text-xs text-emerald-300">✓ Email verified</p>
                    ) : null}
                  </div>
                  <SettingsField label="Mobile" value={savedForm.phone || '—'} />
                  <SettingsField label="WhatsApp" value={savedForm.whatsappNumber || '—'} />
                  <SettingsField label="State" value={displayValue(savedForm.state)} />
                  <SettingsField label="City" value={displayValue(savedForm.city)} />
                  <SettingsField label="Area / locality" value={displayValue(savedForm.place)} />
                  <SettingsField label="PIN code" value={savedForm.pincode || '—'} />
                  <div className="sm:col-span-2">
                    <SettingsField label="Full address" value={savedForm.address || '—'} />
                  </div>
                  <SettingsField
                    label="Total seats"
                    value={savedForm.totalSeats || '—'}
                    hint="Manage from Admin → Seats"
                  />
                </div>

                <div className="mt-6">
                  <Button type="button" onClick={startEditing}>
                    Edit profile
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 inline-flex rounded-full border border-teal-400/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-200">
                  Editing mode
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    dark
                    label="Library name *"
                    required
                    value={form.libraryName}
                    onChange={(e) => patch('libraryName', e.target.value)}
                  />
                  <Input
                    dark
                    label="Owner name *"
                    required
                    value={form.ownerName}
                    onChange={(e) => patch('ownerName', e.target.value)}
                  />

                  <div className="sm:col-span-2">
                    <Input dark label="Email" type="email" value={form.email} readOnly disabled />
                    {emailVerified ? (
                      <p className="mt-1 text-xs text-emerald-300">✓ Email verified — cannot be changed here</p>
                    ) : null}
                  </div>

                  <Input
                    dark
                    label="Mobile (optional)"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => patch('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                  <Input
                    dark
                    label="WhatsApp number (optional)"
                    type="tel"
                    value={form.whatsappNumber}
                    onChange={(e) => patch('whatsappNumber', e.target.value.replace(/\D/g, '').slice(0, 15))}
                  />

                  <Select
                    dark
                    label="State *"
                    required
                    value={form.state}
                    onChange={(e) => {
                      setForm((prev) => ({ ...prev, state: e.target.value, city: '' }));
                      setError('');
                    }}
                    options={stateOptions}
                  />
                  <Select
                    dark
                    label="City *"
                    required
                    value={form.city}
                    onChange={(e) => patch('city', e.target.value)}
                    options={cityOptions}
                  />

                  <Input
                    dark
                    label="Area / locality *"
                    required
                    value={form.place}
                    onChange={(e) => patch('place', e.target.value)}
                  />
                  <Input
                    dark
                    label="PIN code *"
                    required
                    value={form.pincode}
                    maxLength={6}
                    onChange={(e) => patch('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                  />

                  <div className="sm:col-span-2">
                    <Input
                      dark
                      label="Full address (optional)"
                      value={form.address}
                      onChange={(e) => patch('address', e.target.value)}
                      hint="Street, building, landmark — shown on communications"
                    />
                  </div>

                  <Input
                    dark
                    label="Total seats"
                    value={form.totalSeats || '—'}
                    readOnly
                    disabled
                    hint="Manage seats from Admin → Seats"
                  />
                </div>

                {error ? (
                  <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </p>
                ) : null}

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button type="submit" disabled={saving || !isDirty}>
                    {saving ? 'Saving…' : 'Save changes'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    className="!border-white/30 !bg-white/5 !text-white hover:!bg-white/15"
                    onClick={cancelEditing}
                  >
                    Cancel
                  </Button>
                </div>
              </>
            )}

            {!editing && savedFlash ? (
              <p className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                Profile saved successfully.
              </p>
            ) : null}
          </SettingsCard>

          <SettingsCard className="h-fit xl:sticky xl:top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-white/60">Preview card</p>
            <LibraryProfilePreviewCard form={previewFormWithLogo} />
          </SettingsCard>
        </div>
      </form>
    </SettingsSection>
  );
}
