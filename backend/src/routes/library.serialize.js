/**
 * Library → API DTO helpers (shared by profile + profile OTP routes).
 */

"use strict";

function toLibraryProfile(lib, extras = {}) {
  return {
    id: lib._id.toString(),
    name: lib.ownerName,
    email: lib.email,
    phone: lib.phone || "",
    isEmailVerified: Boolean(lib.isEmailVerified),
    emailVerifiedAt: lib.emailVerifiedAt?.toISOString?.() || null,
    whatsappNumber: lib.whatsappNumber || "",
    communication: {
      whatsapp: lib.communication?.whatsapp || "",
      channel: lib.communication?.channel || "",
      email: lib.communication?.email || "",
    },
    communityLinks: {
      whatsappGroup: lib.communityLinks?.whatsappGroup || "",
      whatsappChannel: lib.communityLinks?.whatsappChannel || "",
      telegram: lib.communityLinks?.telegram || "",
    },
    libraryName: lib.name,
    address: lib.address || "",
    city: lib.city || "",
    state: lib.state || "",
    place: lib.place || "",
    pincode: lib.pincode || "",
    logoUrl: lib.logoUrl || null,
    plan: lib.plan,
    subscriptionStatus: lib.subscriptionStatus || "inactive",
    cancelledAt: lib.cancelledAt?.toISOString?.() || null,
    cancelReason: lib.cancelReason || null,
    cancelNote: lib.cancelNote || null,
    planExpiryDate: lib.planExpiryDate?.toISOString?.() || null,
    totalSeats: typeof extras.totalSeats === "number" ? extras.totalSeats : undefined,
  };
}

module.exports = { toLibraryProfile };
