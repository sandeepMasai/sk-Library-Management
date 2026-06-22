const mongoose = require("mongoose");
const Seat = require("../models/Seat");
const SeatAllocation = require("../models/SeatAllocation");
const { createHttpError } = require("../utils/httpError");

function requireObjectId(value, message) {
  const id = String(value || "").trim();
  if (!mongoose.Types.ObjectId.isValid(id)) throw createHttpError(400, message);
  return id;
}

function resolveLibraryId(user, query = {}, body = {}) {
  if (user?.role === "admin") {
    return requireObjectId(query.libraryId || body.libraryId, "libraryId is required for admin");
  }
  return user?.libraryId;
}

function toSeatResponse(seat) {
  return {
    id: seat._id.toString(),
    libraryId: seat.libraryId?.toString?.() || null,
    number: seat.number,
    spaceId: seat.spaceId ? seat.spaceId.toString() : null,
    status: seat.status,
    studentId: seat.studentId ? seat.studentId.toString() : null,
  };
}

async function listSeats({ user, query }) {
  const libraryId = resolveLibraryId(user, query);
  const list = await Seat.find({ libraryId }).sort({ number: 1 }).lean();
  return list.map(toSeatResponse);
}

async function createSeat({ user, body }) {
  const libraryId = user.libraryId;
  const number = Number(body?.number);
  const spaceId = body?.spaceId ? String(body.spaceId).trim() : null;
  if (!Number.isInteger(number) || number < 1) throw createHttpError(400, "number must be a positive integer");
  if (spaceId && !mongoose.Types.ObjectId.isValid(spaceId)) throw createHttpError(400, "Invalid spaceId");

  const created = await Seat.create({ libraryId, number, spaceId: spaceId || null, status: "available", studentId: null });
  return toSeatResponse(created);
}

async function bulkCreateSeatsForSpace(libraryId, spaceId, count) {
  const maxDoc = await Seat.findOne({ libraryId }).sort({ number: -1 }).select("number").lean();
  const start = maxDoc?.number ? maxDoc.number + 1 : 1;
  const docs = [];
  for (let n = start; n < start + count; n++) {
    docs.push({ libraryId, number: n, spaceId, status: "available", studentId: null });
  }
  if (docs.length) await Seat.insertMany(docs, { ordered: false });
  return { created: docs.length, startNumber: start };
}

async function bulkCreateSeats({ user, body }) {
  const libraryId = user.libraryId;
  const totalSeats = Number(body?.totalSeats);
  const spaceId = body?.spaceId ? String(body.spaceId).trim() : null;
  if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 5000) {
    throw createHttpError(400, "totalSeats must be an integer between 1 and 5000");
  }
  if (spaceId && !mongoose.Types.ObjectId.isValid(spaceId)) throw createHttpError(400, "Invalid spaceId");

  if (spaceId) {
    await bulkCreateSeatsForSpace(libraryId, spaceId, totalSeats);
    const list = await Seat.find({ libraryId }).sort({ number: 1 }).lean();
    return list.map(toSeatResponse);
  }

  const existing = await Seat.find({ libraryId, number: { $gte: 1, $lte: totalSeats } }, { number: 1 }).lean();
  const existsSet = new Set(existing.map((s) => s.number));
  const docs = [];
  for (let n = 1; n <= totalSeats; n++) {
    if (!existsSet.has(n)) docs.push({ libraryId, number: n, spaceId: spaceId || null, status: "available", studentId: null });
  }
  if (docs.length) await Seat.insertMany(docs, { ordered: false });
  const list = await Seat.find({ libraryId }).sort({ number: 1 }).lean();
  return list.map(toSeatResponse);
}

/**
 * Set library seat capacity to exactly `totalSeats` (numbered 1..N).
 * Removes seats with number > N when safe (no active allocation / not occupied).
 * Adds missing seats in 1..N range (same as bulk-create gap fill).
 */
async function setTotalSeats({ user, body }) {
  const libraryId = user.libraryId;
  const totalSeats = Number(body?.totalSeats);
  if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 5000) {
    throw createHttpError(400, "totalSeats must be an integer between 1 and 5000");
  }

  const highSeats = await Seat.find({ libraryId, number: { $gt: totalSeats } }).select("_id number status studentId").lean();
  if (highSeats.length) {
    const ids = highSeats.map((s) => s._id);
    const legacyBlock = await Seat.exists({
      _id: { $in: ids },
      $or: [{ status: "occupied" }, { studentId: { $ne: null } }],
    });
    if (legacyBlock) {
      throw createHttpError(
        409,
        "Cannot lower seat count: some seats above the new total are still marked occupied. Unassign them first."
      );
    }
    const allocBlock = await SeatAllocation.exists({
      libraryId,
      seatId: { $in: ids },
      status: "active",
    });
    if (allocBlock) {
      throw createHttpError(
        409,
        "Cannot lower seat count: seats above the new total still have active shift assignments. Unassign them first."
      );
    }
    await Seat.deleteMany({ _id: { $in: ids } });
  }

  const existing = await Seat.find({ libraryId, number: { $gte: 1, $lte: totalSeats } }, { number: 1 }).lean();
  const existsSet = new Set(existing.map((s) => s.number));
  const docs = [];
  for (let n = 1; n <= totalSeats; n++) {
    if (!existsSet.has(n)) {
      docs.push({ libraryId, number: n, spaceId: null, status: "available", studentId: null });
    }
  }
  if (docs.length) await Seat.insertMany(docs, { ordered: false });

  const list = await Seat.find({ libraryId }).sort({ number: 1 }).lean();
  return list.map(toSeatResponse);
}

async function updateSeatSpace({ user, params, body }) {
  const libraryId = user.libraryId;
  const seatId = requireObjectId(params.id, "Invalid seatId");
  const spaceId = body?.spaceId === null || body?.spaceId === "" ? null : String(body?.spaceId || "").trim();
  if (spaceId && !mongoose.Types.ObjectId.isValid(spaceId)) throw createHttpError(400, "Invalid spaceId");

  const updated = await Seat.findOneAndUpdate({ _id: seatId, libraryId }, { spaceId: spaceId || null }, { new: true });
  if (!updated) throw createHttpError(404, "Seat not found");
  return toSeatResponse(updated);
}

async function assignSeat({ user, params = {}, body = {} }) {
  const libraryId = user.libraryId;
  const seatId = requireObjectId(params.id || body.seatId, "Invalid seatId/studentId");
  const studentId = requireObjectId(body.studentId, "Invalid seatId/studentId");

  const seat = await Seat.findOne({ _id: seatId, libraryId });
  if (!seat) throw createHttpError(404, "Seat not found");
  seat.studentId = studentId;
  seat.status = "occupied";
  await seat.save();
  return toSeatResponse(seat);
}

async function unassignSeat({ user, params = {}, body = {} }) {
  const libraryId = user.libraryId;
  const seatId = requireObjectId(params.id || body.seatId, "Invalid seatId");

  const seat = await Seat.findOne({ _id: seatId, libraryId });
  if (!seat) throw createHttpError(404, "Seat not found");
  seat.studentId = null;
  seat.status = "available";
  await seat.save();
  return toSeatResponse(seat);
}

module.exports = {
  listSeats,
  createSeat,
  bulkCreateSeats,
  bulkCreateSeatsForSpace,
  setTotalSeats,
  updateSeatSpace,
  assignSeat,
  unassignSeat,
};
