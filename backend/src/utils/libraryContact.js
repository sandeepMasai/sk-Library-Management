/**
 * Library contact fields for student-facing APIs.
 */
function toLibraryContactDto(lib) {
  if (!lib) return null;
  const whatsapp = String(lib.communication?.whatsapp || lib.whatsappNumber || "").trim();
  const channel = String(lib.communication?.channel || lib.communityLinks?.whatsappChannel || "").trim();
  const email = String(lib.communication?.email || lib.email || "").trim();
  const phone = String(lib.phone || "").trim();
  const whatsappGroup = String(lib.communityLinks?.whatsappGroup || "").trim();
  const address = String(lib.address || "").trim();

  return {
    libraryId: lib._id?.toString?.() || String(lib._id),
    libraryName: String(lib.name || "").trim(),
    email,
    phone,
    whatsapp,
    address,
    channel,
    whatsappGroup,
  };
}

module.exports = { toLibraryContactDto };
