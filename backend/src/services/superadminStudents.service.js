const mongoose = require("mongoose");
const Library = require("../models/Library");
const Student = require("../models/Student");
const SeatAllocation = require("../models/SeatAllocation");
const Attendance = require("../models/Attendance");

const PLAN_LABELS = {
  none: "Free",
  trial: "Trial",
  monthly: "Monthly",
  "6month": "6-Month",
  yearly: "Yearly",
  pro: "Pro",
};

function planLabel(lib) {
  const key = String(lib?.currentPlanKey || lib?.plan || "none").toLowerCase();
  return PLAN_LABELS[key] || key;
}

function formatShiftTiming(shift) {
  if (!shift) return null;
  const fmt = (mins) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const ap = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
  };
  if (shift.startTime != null && shift.endTime != null) {
    return `${fmt(shift.startTime)} – ${fmt(shift.endTime)}`;
  }
  return shift.name || null;
}

function planDurationDays(joinDate, expiryDate) {
  const j = joinDate ? new Date(joinDate).getTime() : null;
  const e = expiryDate ? new Date(expiryDate).getTime() : null;
  if (!j || !e || !Number.isFinite(j) || !Number.isFinite(e)) return null;
  return Math.max(1, Math.round((e - j) / (24 * 60 * 60 * 1000)));
}

function parsePagination(query) {
  const page = Math.max(1, Number(query.page || 1));
  const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

function escapeRegex(str) {
  return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function listLibrariesWithStudentAnalytics(query = {}) {
  const { page, limit, skip } = parsePagination(query);
  const search = String(query.search || "").trim();
  const now = new Date();

  const filter = {};
  if (search) {
    filter.$or = [
      { name: { $regex: escapeRegex(search), $options: "i" } },
      { ownerName: { $regex: escapeRegex(search), $options: "i" } },
      { city: { $regex: escapeRegex(search), $options: "i" } },
    ];
  }

  const [total, rows] = await Promise.all([
    Library.countDocuments(filter),
    Library.aggregate([
      { $match: filter },
      { $sort: { name: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "students",
          let: { libId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$libraryId", "$$libId"] }, { $eq: ["$isDeleted", false] }],
                },
              },
            },
            {
              $group: {
                _id: null,
                totalStudents: { $sum: 1 },
                activeStudents: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ["$isBlocked", false] },
                          { $gte: ["$expiryDate", now] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                expiredStudents: {
                  $sum: {
                    $cond: [{ $lt: ["$expiryDate", now] }, 1, 0],
                  },
                },
                revenue: {
                  $sum: {
                    $cond: [{ $eq: ["$feeStatus", "paid"] }, "$feeAmount", 0],
                  },
                },
              },
            },
          ],
          as: "stats",
        },
      },
      {
        $addFields: {
          studentStats: { $ifNull: [{ $first: "$stats" }, {}] },
        },
      },
      { $project: { stats: 0 } },
    ]),
  ]);

  const libraries = rows.map((lib) => {
    const s = lib.studentStats || {};
    return {
      id: lib._id.toString(),
      name: lib.name,
      ownerName: lib.ownerName,
      city: lib.city || "",
      state: lib.state || "",
      planName: planLabel(lib),
      status: lib.isActive ? "active" : "inactive",
      isActive: Boolean(lib.isActive),
      totalStudents: Number(s.totalStudents || 0),
      activeStudents: Number(s.activeStudents || 0),
      expiredStudents: Number(s.expiredStudents || 0),
      revenue: Number(s.revenue || 0),
    };
  });

  const summary = libraries.reduce(
    (acc, l) => {
      acc.totalStudents += l.totalStudents;
      acc.activeStudents += l.activeStudents;
      acc.expiredStudents += l.expiredStudents;
      return acc;
    },
    { totalStudents: 0, activeStudents: 0, expiredStudents: 0 }
  );

  return { libraries, page, limit, total, summary };
}

async function attachSeatAndAttendance(libraryId, students) {
  if (!students.length) return students;

  const studentIds = students.map((s) => s._id);
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 30);

  const [allocations, attendanceAgg] = await Promise.all([
    SeatAllocation.find({
      libraryId,
      studentId: { $in: studentIds },
      status: "active",
    })
      .populate("seatId", "number label")
      .populate("shiftId", "name startTime endTime type")
      .lean(),
    Attendance.aggregate([
      {
        $match: {
          libraryId,
          studentId: { $in: studentIds },
          attendanceDate: { $gte: since },
          status: "present",
        },
      },
      { $group: { _id: "$studentId", presentDays: { $sum: 1 } } },
    ]),
  ]);

  const allocByStudent = new Map(allocations.map((a) => [String(a.studentId), a]));
  const presentByStudent = new Map(attendanceAgg.map((a) => [String(a._id), Number(a.presentDays || 0)]));

  return students.map((s) => {
    const alloc = allocByStudent.get(String(s._id));
    const seat = alloc?.seatId;
    const shift = alloc?.shiftId;
    const presentDays = presentByStudent.get(String(s._id)) || 0;
    const attendancePercent = Math.min(100, Math.round((presentDays / 30) * 1000) / 10);

    return {
      id: s._id.toString(),
      name: s.name,
      phone: s.mobile,
      email: s.email || null,
      seatNumber: seat ? String(seat.label || seat.number) : null,
      timing: formatShiftTiming(shift),
      planDurationDays: planDurationDays(s.joinDate, s.expiryDate),
      fees: Number(s.feeAmount || 0),
      feeStatus: s.feeStatus,
      joinDate: s.joinDate?.toISOString?.() || null,
      expiryDate: s.expiryDate?.toISOString?.() || null,
      isActive: !s.isBlocked && new Date(s.expiryDate).getTime() >= now.getTime(),
      isBlocked: Boolean(s.isBlocked),
      membershipStatus: s.membershipStatus || "active",
      attendancePercent,
    };
  });
}

async function listLibraryStudents(libraryId, query = {}) {
  if (!mongoose.Types.ObjectId.isValid(libraryId)) {
    const err = new Error("Invalid library id");
    err.status = 400;
    throw err;
  }

  const lib = await Library.findById(libraryId).select("name ownerName city state").lean();
  if (!lib) {
    const err = new Error("Library not found");
    err.status = 404;
    throw err;
  }

  const { page, limit, skip } = parsePagination(query);
  const search = String(query.search || "").trim();
  const statusFilter = String(query.status || "all").toLowerCase();
  const expiryFilter = String(query.expiry || "all").toLowerCase();
  const seatFilter = String(query.seat || "").trim();
  const now = new Date();

  const and = [{ libraryId: new mongoose.Types.ObjectId(libraryId), isDeleted: false }];

  if (search) {
    and.push({
      $or: [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { mobile: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
        { username: { $regex: escapeRegex(search), $options: "i" } },
      ],
    });
  }

  if (statusFilter === "active") {
    and.push({ isBlocked: false, expiryDate: { $gte: now } });
  } else if (statusFilter === "inactive") {
    and.push({ $or: [{ isBlocked: true }, { expiryDate: { $lt: now } }] });
  }

  if (expiryFilter === "expired") {
    and.push({ expiryDate: { $lt: now } });
  } else if (expiryFilter === "expiring") {
    const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    and.push({ expiryDate: { $gte: now, $lte: soon } });
  }

  const match = and.length === 1 ? and[0] : { $and: and };

  const [total, rawStudents, statsAgg] = await Promise.all([
    Student.countDocuments(match),
    Student.find(match).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Student.aggregate([
      { $match: { libraryId: new mongoose.Types.ObjectId(libraryId), isDeleted: false } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: {
              $cond: [{ $and: [{ $eq: ["$isBlocked", false] }, { $gte: ["$expiryDate", now] }] }, 1, 0],
            },
          },
          expired: { $sum: { $cond: [{ $lt: ["$expiryDate", now] }, 1, 0] } },
        },
      },
    ]),
  ]);

  let students = await attachSeatAndAttendance(libraryId, rawStudents);

  if (seatFilter) {
    const q = seatFilter.toLowerCase();
    students = students.filter((s) => String(s.seatNumber || "").toLowerCase().includes(q));
  }

  const stats = statsAgg[0] || { total: 0, active: 0, expired: 0 };

  return {
    library: {
      id: lib._id.toString(),
      name: lib.name,
      ownerName: lib.ownerName,
      city: lib.city || "",
      state: lib.state || "",
    },
    students,
    page,
    limit,
    total,
    analytics: {
      totalStudents: Number(stats.total || 0),
      activeStudents: Number(stats.active || 0),
      expiredStudents: Number(stats.expired || 0),
    },
  };
}

async function getStudentDetail(studentId) {
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    const err = new Error("Invalid student id");
    err.status = 400;
    throw err;
  }

  const student = await Student.findOne({ _id: studentId, isDeleted: false }).lean();
  if (!student) {
    const err = new Error("Student not found");
    err.status = 404;
    throw err;
  }

  const libraryId = student.libraryId;
  const now = new Date();
  const since = new Date(now);
  since.setDate(since.getDate() - 30);

  const [library, allocation, presentDays, totalDays] = await Promise.all([
    Library.findById(libraryId).select("name city state address ownerName").lean(),
    SeatAllocation.findOne({ studentId: student._id, status: "active" })
      .populate("seatId", "number label")
      .populate("shiftId", "name startTime endTime")
      .lean(),
    Attendance.countDocuments({
      libraryId,
      studentId: student._id,
      attendanceDate: { $gte: since },
      status: "present",
    }),
    Attendance.countDocuments({
      libraryId,
      studentId: student._id,
      attendanceDate: { $gte: since },
    }),
  ]);

  const attendancePercent =
    totalDays > 0
      ? Math.min(100, Math.round((presentDays / totalDays) * 1000) / 10)
      : Math.min(100, Math.round((presentDays / 30) * 1000) / 10);

  const seat = allocation?.seatId;
  const shift = allocation?.shiftId;

  const notes =
    student.auditMeta && typeof student.auditMeta === "object" && student.auditMeta.notes
      ? String(student.auditMeta.notes)
      : null;

  return {
    id: student._id.toString(),
    fullName: student.name,
    phone: student.mobile,
    email: student.email || null,
    libraryName: library?.name || "—",
    libraryId: libraryId?.toString?.() || null,
    seatNumber: seat ? String(seat.label || seat.number) : null,
    timing: formatShiftTiming(shift),
    address: library?.address || [library?.city, library?.state].filter(Boolean).join(", ") || null,
    attendancePercent,
    attendancePresentDays: presentDays,
    joinDate: student.joinDate?.toISOString?.() || null,
    expiryDate: student.expiryDate?.toISOString?.() || null,
    planDurationDays: planDurationDays(student.joinDate, student.expiryDate),
    fees: Number(student.feeAmount || 0),
    feeStatus: student.feeStatus,
    feeMethod: student.feeMethod || "cash",
    isActive: !student.isBlocked && new Date(student.expiryDate).getTime() >= now.getTime(),
    isBlocked: Boolean(student.isBlocked),
    membershipStatus: student.membershipStatus,
    notes,
    paymentHistory: [
      {
        id: `${student._id}-fee`,
        date: student.joinDate?.toISOString?.() || null,
        amount: Number(student.feeAmount || 0),
        status: student.feeStatus,
        method: student.feeMethod || "cash",
        label: "Membership fee",
      },
    ],
  };
}

module.exports = {
  listLibrariesWithStudentAnalytics,
  listLibraryStudents,
  getStudentDetail,
};
