const mongoose = require("mongoose");
const Library = require("../models/Library");
const Subscription = require("../models/Subscription");

function libraryUsedOneTimeKeys(library) {
  const keys = new Set(
    (Array.isArray(library?.usedOneTimePlans) ? library.usedOneTimePlans : []).map((k) =>
      String(k || "").trim().toLowerCase()
    )
  );
  keys.delete("");
  if (library?.trialUsed) keys.add("trial");
  return keys;
}

function normalizeLibraryId(library) {
  return String(library?._id || library?.id || "").trim();
}

function normalizeAllowedIds(plan) {
  return (Array.isArray(plan?.allowedLibraryIds) ? plan.allowedLibraryIds : [])
    .map((id) => String(id || "").trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));
}

function derivePlanType(plan) {
  if (!plan) return "public";
  if (plan.isTrial) return "trial";
  if (plan.isOneTimeOffer) return "one_time";
  if (plan.promoStartDate || plan.promoEndDate || plan.campaignName) return "promotional";
  if (plan.isPublic === false) return "library_specific";
  return "public";
}

function isPromotionActive(plan, now = new Date()) {
  const start = plan?.promoStartDate ? new Date(plan.promoStartDate) : null;
  const end = plan?.promoEndDate ? new Date(plan.promoEndDate) : null;
  if (start && now < start) return false;
  if (end && now > end) return false;
  return true;
}

function promoDaysRemaining(plan, now = new Date()) {
  if (!plan?.promoEndDate) return null;
  const end = new Date(plan.promoEndDate);
  if (Number.isNaN(end.getTime())) return null;
  const diff = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(0, diff);
}

function normalizePlanFeatures(plan) {
  const raw = plan?.features;
  if (Array.isArray(raw)) return raw.map((item) => String(item || "").trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    const list = raw.list || raw.items || raw.features;
    if (Array.isArray(list)) return list.map((item) => String(item || "").trim()).filter(Boolean);
  }
  return [];
}

/**
 * True when the library has ever subscribed (trial or any paid plan).
 * Used to hide ₹99 trial for non-brand-new libraries forever.
 */
function libraryHasSubscriptionHistory(library, options = {}) {
  if (!library) return false;

  const subscriptionCount = options.subscriptionCount;
  if (typeof subscriptionCount === "number" && subscriptionCount > 0) return true;

  if (library.trialUsed) return true;

  const currentKey = String(library.currentPlanKey || "").trim().toLowerCase();
  if (currentKey && currentKey !== "none") return true;

  const plan = String(library.plan || "").trim().toLowerCase();
  if (plan && plan !== "none" && plan !== "free") return true;

  if (library.planStartDate) return true;

  return false;
}

function canShowTrialPlan(library, options = {}) {
  return !libraryHasSubscriptionHistory(library, options);
}

async function loadLibraryEligibilityContext(libraryId, options = {}) {
  if (!libraryId) return { library: {}, subscriptionCount: 0 };

  const skipSubscriptionCount = Boolean(options.skipSubscriptionCount);

  const libraryPromise = Library.findById(libraryId)
    .select("trialUsed usedOneTimePlans currentPlanKey plan planStartDate planExpiryDate subscriptionStatus")
    .lean();

  if (skipSubscriptionCount) {
    const library = await libraryPromise;
    return { library: library || {}, subscriptionCount: 0 };
  }

  const [library, subscriptionCount] = await Promise.all([
    libraryPromise,
    Subscription.countDocuments({ libraryId }),
  ]);

  return { library: library || {}, subscriptionCount };
}

/**
 * Whether a library may see and purchase this plan.
 */
function isPlanVisibleToLibrary(plan, library, options = {}) {
  if (!plan || !plan.isActive) return false;

  const planKey = String(plan.key || "").trim().toLowerCase();
  if (!planKey) return false;

  if (plan.isTrial || plan.showOnlyForNew) {
    if (!canShowTrialPlan(library, options)) return false;
  }

  const usedKeys = libraryUsedOneTimeKeys(library);
  if (plan.isOneTimeOffer || plan.isTrial) {
    if (usedKeys.has(planKey)) return false;
  }

  if ((plan.promoStartDate || plan.promoEndDate) && !isPromotionActive(plan)) {
    return false;
  }

  const isPublic = plan.isPublic !== false;
  const allowed = normalizeAllowedIds(plan);
  const libId = normalizeLibraryId(library);

  if (!isPublic) {
    if (!allowed.length || !libId) return false;
    return allowed.includes(libId);
  }

  return true;
}

function assertLibraryCanPurchasePlan(plan, library, options = {}) {
  if (!isPlanVisibleToLibrary(plan, library, options)) {
    const err = new Error("This plan is not available for your library");
    err.statusCode = 400;
    err.code = "PLAN_NOT_ELIGIBLE";
    throw err;
  }
}

function formatPlanForClient(plan) {
  const price = Number(plan.price || 0);
  const finalPrice = Number(plan.finalPrice ?? plan.price ?? 0);
  const originalPrice =
    plan.originalPrice != null && Number.isFinite(Number(plan.originalPrice))
      ? Number(plan.originalPrice)
      : null;
  const strikePrice =
    originalPrice != null && originalPrice > finalPrice ? originalPrice : price > finalPrice ? price : null;
  const savings =
    strikePrice != null && strikePrice > finalPrice ? Math.round((strikePrice - finalPrice) * 100) / 100 : 0;

  return {
    _id: plan._id,
    name: plan.name,
    key: plan.key,
    description: plan.description || "",
    price,
    discount: Number(plan.discount || 0),
    finalPrice,
    originalPrice,
    strikePrice,
    savings,
    duration: plan.duration,
    isActive: plan.isActive,
    tag: plan.tag || null,
    isTrial: Boolean(plan.isTrial),
    showOnlyForNew: Boolean(plan.showOnlyForNew),
    isPublic: plan.isPublic !== false,
    isOneTimeOffer: Boolean(plan.isOneTimeOffer),
    allowedLibraryIds: normalizeAllowedIds(plan),
    planType: derivePlanType(plan),
    campaignName: plan.campaignName || null,
    promoStartDate: plan.promoStartDate?.toISOString?.() || null,
    promoEndDate: plan.promoEndDate?.toISOString?.() || null,
    promoDaysRemaining: promoDaysRemaining(plan),
    badges: {
      recommended: Boolean(plan.badgeRecommended),
      bestValue: Boolean(plan.badgeBestValue),
      limitedTime: Boolean(plan.badgeLimitedTime || (plan.promoEndDate && promoDaysRemaining(plan) != null)),
      exclusive: Boolean(plan.badgeExclusive || plan.isPublic === false),
    },
    features: normalizePlanFeatures(plan),
    updatedAt: plan.updatedAt?.toISOString?.() || null,
  };
}

module.exports = {
  libraryUsedOneTimeKeys,
  derivePlanType,
  isPromotionActive,
  promoDaysRemaining,
  libraryHasSubscriptionHistory,
  canShowTrialPlan,
  loadLibraryEligibilityContext,
  isPlanVisibleToLibrary,
  assertLibraryCanPurchasePlan,
  formatPlanForClient,
};
