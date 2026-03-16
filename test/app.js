const $ = (selector) => document.querySelector(selector);

const elements = {
  baseUrl: $("#baseUrl"),
  responseMeta: $("#responseMeta"),
  responseBox: $("#responseBox"),
  activityLog: $("#activityLog"),
  serverState: $("#serverState"),
  studentsRows: $("#studentsRows"),
  areasRows: $("#areasRows"),
  schedulesRows: $("#schedulesRows"),
  assignmentsRows: $("#assignmentsRows"),
  tradesRows: $("#tradesRows"),
  kpiStudents: $("#kpiStudents"),
  kpiActiveStudents: $("#kpiActiveStudents"),
  kpiAreas: $("#kpiAreas"),
  kpiAssignments: $("#kpiAssignments"),
  kpiPendingTrades: $("#kpiPendingTrades"),
  formSearchAssignments: $("#formSearchAssignments"),
  assignmentFilterStudentId: $("#assignmentFilterStudentId"),
  assignmentFilterName: $("#assignmentFilterName"),
  resetAssignmentsFilter: $("#resetAssignmentsFilter"),
  assignmentFilterMeta: $("#assignmentFilterMeta"),
  bulkDeleteScheduleId: $("#bulkDeleteScheduleId"),
  statusAssignmentId: $("#statusAssignmentId"),
  reassignAssignmentId: $("#reassignAssignmentId"),
  tradeRequesterId: $("#tradeRequesterId"),
  tradeTargetId: $("#tradeTargetId"),
  tradeRequestId: $("#tradeRequestId"),
  scheduleUpdateScheduleId: $("#scheduleUpdateScheduleId"),
  scheduleEditDate: $("#scheduleEditDate"),
  scheduleEditStatus: $("#scheduleEditStatus"),
  studentUpdateStudentPk: $("#studentUpdateStudentPk"),
  studentEditStudentId: $("#studentEditStudentId"),
  studentEditName: $("#studentEditName"),
  studentEditGrade: $("#studentEditGrade"),
  studentEditStatus: $("#studentEditStatus"),
  studentEditRole: $("#studentEditRole"),
  studentStatusStudentPk: $("#studentStatusStudentPk"),
  studentStatusValue: $("#studentStatusValue"),
  areaUpdateAreaId: $("#areaUpdateAreaId"),
  areaEditName: $("#areaEditName"),
  areaEditNeedPeoples: $("#areaEditNeedPeoples"),
  areaEditTargetGrades: $("#areaEditTargetGrades"),
  statusValue: $("#statusValue"),
  tradeDecision: $("#tradeDecision"),
};

const state = {
  students: [],
  areas: [],
  schedules: [],
  assignments: [],
  assignmentsView: [],
  assignmentFilter: {
    studentId: "",
    name: "",
  },
  trades: [],
};

const ENDPOINTS = {
  students: "/students/",
  areas: "/areas/",
  schedules: "/schedules/",
  assignments: "/assignments/",
  trades: "/trades/",
};

const STATUS_CLASS_MAP = {
  배정: "status-배정",
  완료: "status-완료",
  취소: "status-취소",
  불이행: "status-불이행",
  대기: "status-대기",
  수락: "status-수락",
  거절: "status-거절",
};

function getDefaultBaseUrl() {
  const origin = typeof window.location.origin === "string" ? window.location.origin.trim() : "";

  if (!origin || origin === "null" || origin === "file://" || window.location.protocol === "file:") {
    return "mock";
  }

  return origin;
}

const defaultBaseUrl = getDefaultBaseUrl();

elements.baseUrl.value = defaultBaseUrl;

function cleanText(value) {
  return (value ?? "").toString().trim();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseOptionalInt(value) {
  const raw = cleanText(value);
  if (!raw) {
    return undefined;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseRequiredInt(value, label) {
  const parsed = parseOptionalInt(value);
  if (parsed === undefined) {
    throw new Error(`${label} 값을 입력하세요.`);
  }
  return parsed;
}

function parseCsvNumbers(value) {
  const raw = cleanText(value);
  if (!raw) {
    return undefined;
  }

  const parsed = raw
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  return parsed.length > 0 ? parsed : undefined;
}

function normalizeBaseUrl() {
  let candidate = cleanText(elements.baseUrl.value) || defaultBaseUrl;
  candidate = candidate.replace(/\/+$/, "");
  candidate = candidate.replace(/\/(ui|docs|redoc)$/, "");
  return candidate;
}

function applyQueryToUrl(url, query = undefined) {
  if (!query) {
    return;
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else {
      url.searchParams.append(key, String(value));
    }
  }
}

function buildUrl(path, query = undefined) {
  const url = new URL(`${normalizeBaseUrl()}${path}`);
  applyQueryToUrl(url, query);
  return url;
}

function buildMockUrl(path, query = undefined) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`mock://local${normalizedPath}`);
  applyQueryToUrl(url, query);
  return url;
}

function isMockMode() {
  const baseUrl = normalizeBaseUrl().toLowerCase();
  return baseUrl === "mock" || baseUrl.startsWith("mock://");
}

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function createMockHttpError(status, detail) {
  const error = new Error(detail);
  error.status = status;
  error.payload = { detail };
  return error;
}

function toOptionalNumber(value) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMockPath(path) {
  const prefixedPath = path.startsWith("/") ? path : `/${path}`;
  const normalized = prefixedPath.replace(/\/+$/, "");
  return normalized || "/";
}

function getNextMockId(items, key) {
  return Math.max(0, ...items.map((item) => Number(item[key]) || 0)) + 1;
}

function parseMockDate(value, label) {
  const raw = cleanText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw createMockHttpError(400, `${label} 형식이 올바르지 않습니다.`);
  }

  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw createMockHttpError(400, `${label} 값이 유효하지 않습니다.`);
  }
  return date;
}

function formatMockDate(date) {
  return date.toISOString().slice(0, 10);
}

function addMockDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toMockResponse(payload, status = 200) {
  return {
    status,
    payload: payload === undefined ? null : deepClone(payload),
  };
}

const MOCK_INITIAL_DATA = {
  students: [
    { student_pk: 1, student_id: "261001", name: "김철수", grade: 1, status: "재학", role: "학생" },
    { student_pk: 2, student_id: "261002", name: "박민지", grade: 1, status: "재학", role: "학생" },
    { student_pk: 3, student_id: "252001", name: "조성모", grade: 2, status: "재학", role: "학생" },
    { student_pk: 4, student_id: "252002", name: "배수지", grade: 2, status: "재학", role: "부반대" },
    { student_pk: 5, student_id: "261005", name: "정태양", grade: 1, status: "재학", role: "학생" },
    { student_pk: 6, student_id: "252006", name: "김태리", grade: 2, status: "재학", role: "학생" },
    { student_pk: 7, student_id: "261007", name: "윤도현", grade: 1, status: "휴학", role: "학생" },
    { student_pk: 8, student_id: "252008", name: "아이유", grade: 2, status: "재학", role: "반대" },
  ],
  areas: [
    { area_id: 1, name: "405호", need_peoples: 2, target_grades: [1] },
    { area_id: 2, name: "304호", need_peoples: 2, target_grades: [2] },
    { area_id: 3, name: "복도", need_peoples: 1, target_grades: [1, 2] },
  ],
  schedules: [
    { schedule_id: 1, cleaning_date: "2026-03-06", status: "예정" },
    { schedule_id: 2, cleaning_date: "2026-03-13", status: "예정" },
  ],
  assignments: [
    { assignment_id: 1, schedule_id: 1, student_pk: 1, area_id: 1, status: "배정" },
    { assignment_id: 2, schedule_id: 1, student_pk: 2, area_id: 1, status: "완료" },
    { assignment_id: 3, schedule_id: 1, student_pk: 3, area_id: 2, status: "배정" },
    { assignment_id: 4, schedule_id: 1, student_pk: 4, area_id: 2, status: "취소" },
    { assignment_id: 5, schedule_id: 1, student_pk: 5, area_id: 3, status: "배정" },
  ],
  trades: [{ request_id: 1, requester_assignment_id: 1, target_assignment_id: 3, status: "대기" }],
};

let mockStore = deepClone(MOCK_INITIAL_DATA);

function getMockStudents({ student_id: studentId, grade, name }) {
  if (studentId) {
    const matchedById = mockStore.students.filter((student) => student.student_id === String(studentId));
    if (!matchedById.length) {
      throw createMockHttpError(404, "존재하지 않는 학번입니다.");
    }
    return matchedById;
  }

  if (name) {
    const matchedByName = mockStore.students.filter((student) => student.name === String(name));
    if (!matchedByName.length) {
      throw createMockHttpError(404, `학생(${name})이 존재하지 않습니다.`);
    }
    return matchedByName;
  }

  const targetGrade = toOptionalNumber(grade);
  if (targetGrade !== undefined) {
    return mockStore.students.filter((student) => student.grade === targetGrade);
  }

  return mockStore.students;
}

function addMockStudent(query = {}) {
  const studentId = cleanText(query.student_id);
  const name = cleanText(query.name);
  const grade = toOptionalNumber(query.grade);
  const status = cleanText(query.status) || "재학";
  const role = cleanText(query.role) || "학생";

  if (!studentId || !name || grade === undefined) {
    throw createMockHttpError(400, "학생 생성에 필요한 값이 부족합니다.");
  }

  if (mockStore.students.some((student) => student.student_id === studentId)) {
    throw createMockHttpError(400, "이미 존재하는 학생입니다.");
  }

  const student = {
    student_pk: getNextMockId(mockStore.students, "student_pk"),
    student_id: studentId,
    name,
    grade,
    status,
    role,
  };
  mockStore.students.push(student);

  return {
    message: `${name} 학생(${studentId})이 추가되었습니다.`,
    student_id: studentId,
    student,
  };
}

function parseMockTargetGrades(rawValue) {
  if (Array.isArray(rawValue)) {
    return rawValue.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  }

  const numeric = toOptionalNumber(rawValue);
  if (numeric !== undefined) {
    return [numeric];
  }

  return [];
}

function addMockArea(query = {}) {
  const name = cleanText(query.name);
  const needPeoples = toOptionalNumber(query.need_peoples);
  const targetGrades = parseMockTargetGrades(query.target_grades);

  if (!name || needPeoples === undefined || !targetGrades.length) {
    throw createMockHttpError(400, "구역 생성에 필요한 값이 부족합니다.");
  }
  if (needPeoples < 1) {
    throw createMockHttpError(400, "필요 인원수는 1 이상이어야 합니다.");
  }
  if (mockStore.areas.some((area) => area.name === name)) {
    throw createMockHttpError(400, "이미 존재하는 구역 이름입니다.");
  }

  const area = {
    area_id: getNextMockId(mockStore.areas, "area_id"),
    name,
    need_peoples: needPeoples,
    target_grades: targetGrades,
  };
  mockStore.areas.push(area);

  return {
    message: "청소 구역이 추가되었습니다.",
    area,
  };
}

function updateMockStudent(studentPk, body = {}) {
  const student = mockStore.students.find((item) => item.student_pk === studentPk);
  if (!student) {
    throw createMockHttpError(404, "학생을 찾을 수 없습니다.");
  }

  const updatePayload = {};
  const nextStudentId = cleanText(body.student_id);
  const nextName = cleanText(body.name);
  const nextGrade = toOptionalNumber(body.grade);
  const nextStatus = cleanText(body.status);
  const nextRole = cleanText(body.role);

  if (nextStudentId) {
    const duplicateStudent = mockStore.students.find(
      (item) => item.student_pk !== studentPk && item.student_id === nextStudentId,
    );
    if (duplicateStudent) {
      throw createMockHttpError(400, "해당 정보로 수정할 수 없습니다.");
    }
    updatePayload.student_id = nextStudentId;
  }
  if (nextName) {
    updatePayload.name = nextName;
  }
  if (nextGrade !== undefined) {
    updatePayload.grade = nextGrade;
  }
  if (nextStatus) {
    updatePayload.status = nextStatus;
  }
  if (nextRole) {
    updatePayload.role = nextRole;
  }

  const previousStatus = student.status;
  Object.assign(student, updatePayload);

  const canceledAssignments = [];
  if (previousStatus !== "휴학" && student.status === "휴학") {
    for (const assignment of mockStore.assignments) {
      if (
        assignment.student_pk === studentPk &&
        (assignment.status === "배정" || assignment.status === "불이행")
      ) {
        assignment.status = "취소";
        canceledAssignments.push(assignment.assignment_id);
      }
    }
  }

  return {
    message: "학생 정보가 수정되었습니다.",
    student,
    canceled_assignments: canceledAssignments,
  };
}

function deleteMockStudent(studentPk) {
  const studentIndex = mockStore.students.findIndex((item) => item.student_pk === studentPk);
  if (studentIndex < 0) {
    throw createMockHttpError(404, `${studentPk}번 학생을 찾을 수 없습니다.`);
  }

  const linkedAssignment = mockStore.assignments.find((item) => item.student_pk === studentPk);
  if (linkedAssignment) {
    throw createMockHttpError(400, "배정 이력이 있는 학생은 삭제할 수 없습니다.");
  }

  mockStore.students.splice(studentIndex, 1);
  return { message: "삭제되었습니다." };
}

function updateMockArea(areaId, body = {}) {
  const area = mockStore.areas.find((item) => item.area_id === areaId);
  if (!area) {
    throw createMockHttpError(404, "찾을 수 없습니다.");
  }

  const updatePayload = {};
  const nextName = cleanText(body.name);
  const nextNeedPeoples = toOptionalNumber(body.need_peoples);
  const nextTargetGrades = parseMockTargetGrades(body.target_grades);

  if (nextName) {
    const duplicateArea = mockStore.areas.find(
      (item) => item.area_id !== areaId && item.name === nextName,
    );
    if (duplicateArea) {
      throw createMockHttpError(400, "해당 이름으로 수정할 수 없습니다.");
    }
    updatePayload.name = nextName;
  }
  if (nextNeedPeoples !== undefined) {
    if (nextNeedPeoples < 1) {
      throw createMockHttpError(400, "필요 인원수는 1 이상이어야 합니다.");
    }
    updatePayload.need_peoples = nextNeedPeoples;
  }
  if (Array.isArray(body.target_grades)) {
    if (!nextTargetGrades.length) {
      throw createMockHttpError(400, "대상 학년을 1개 이상 입력하세요.");
    }
    updatePayload.target_grades = nextTargetGrades;
  }

  Object.assign(area, updatePayload);
  return {
    message: "정보가 수정되었습니다.",
    area,
  };
}

function deleteMockArea(areaId) {
  const areaIndex = mockStore.areas.findIndex((item) => item.area_id === areaId);
  if (areaIndex < 0) {
    throw createMockHttpError(404, "찾을 수 없습니다.");
  }

  const linkedAssignment = mockStore.assignments.find((item) => item.area_id === areaId);
  if (linkedAssignment) {
    throw createMockHttpError(400, "배정 이력이 있는 구역은 삭제할 수 없습니다.");
  }

  mockStore.areas.splice(areaIndex, 1);
  return { message: "삭제되었습니다." };
}

function getMockScheduleOrError(scheduleId) {
  const schedule = mockStore.schedules.find((item) => item.schedule_id === scheduleId);
  if (!schedule) {
    throw createMockHttpError(404, "해당 일정이 존재하지 않습니다.");
  }
  return schedule;
}

function cancelMockPendingTradesForAssignmentIds(assignmentIds) {
  if (!assignmentIds.length) {
    return 0;
  }

  const assignmentIdSet = new Set(assignmentIds);
  let canceledTradeCount = 0;

  for (const trade of mockStore.trades) {
    if (
      trade.status === "대기" &&
      (assignmentIdSet.has(trade.requester_assignment_id) || assignmentIdSet.has(trade.target_assignment_id))
    ) {
      trade.status = "취소";
      canceledTradeCount += 1;
    }
  }

  return canceledTradeCount;
}

function deleteMockAssignmentsByIds(assignmentIds) {
  if (!assignmentIds.length) {
    return { deletedAssignmentCount: 0, deletedTradeCount: 0 };
  }

  const assignmentIdSet = new Set(assignmentIds);
  const deletedTradeCount = mockStore.trades.filter(
    (trade) =>
      assignmentIdSet.has(trade.requester_assignment_id) ||
      assignmentIdSet.has(trade.target_assignment_id),
  ).length;
  const deletedAssignmentCount = mockStore.assignments.filter((assignment) =>
    assignmentIdSet.has(assignment.assignment_id),
  ).length;

  mockStore.trades = mockStore.trades.filter(
    (trade) =>
      !assignmentIdSet.has(trade.requester_assignment_id) &&
      !assignmentIdSet.has(trade.target_assignment_id),
  );
  mockStore.assignments = mockStore.assignments.filter(
    (assignment) => !assignmentIdSet.has(assignment.assignment_id),
  );

  return { deletedAssignmentCount, deletedTradeCount };
}

function cancelMockAssignmentsBySchedule(scheduleId) {
  const assignmentIds = mockStore.assignments
    .filter((assignment) => assignment.schedule_id === scheduleId)
    .map((assignment) => assignment.assignment_id);

  let canceledAssignmentCount = 0;
  for (const assignment of mockStore.assignments) {
    if (assignment.schedule_id === scheduleId && assignment.status !== "취소") {
      assignment.status = "취소";
      canceledAssignmentCount += 1;
    }
  }

  const canceledTradeCount = cancelMockPendingTradesForAssignmentIds(assignmentIds);

  return {
    canceledAssignmentCount,
    canceledTradeCount,
  };
}

function getMockSchedules({ schedule_id: scheduleId, cleaning_date: cleaningDate, status } = {}) {
  const numericScheduleId = toOptionalNumber(scheduleId);
  const normalizedCleaningDate = cleanText(cleaningDate);
  const normalizedStatus = cleanText(status);

  if (numericScheduleId !== undefined) {
    const matchedById = mockStore.schedules.filter((schedule) => schedule.schedule_id === numericScheduleId);
    if (!matchedById.length) {
      throw createMockHttpError(404, "해당 일정이 존재하지 않습니다.");
    }
    return matchedById;
  }

  if (normalizedCleaningDate) {
    const matchedByDate = mockStore.schedules.filter((schedule) => schedule.cleaning_date === normalizedCleaningDate);
    if (!matchedByDate.length) {
      throw createMockHttpError(404, "해당 날짜 일정이 존재하지 않습니다.");
    }
    return matchedByDate;
  }

  if (normalizedStatus) {
    return mockStore.schedules.filter((schedule) => schedule.status === normalizedStatus);
  }

  return mockStore.schedules;
}

function addMockSchedules(query = {}) {
  const startDate = parseMockDate(query.start_date, "시작일");
  const endDate = parseMockDate(query.end_date, "종료일");
  if (startDate > endDate) {
    throw createMockHttpError(400, "시작일은 종료일보다 늦을 수 없습니다.");
  }

  const fridayDates = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    if (cursor.getUTCDay() === 5) {
      fridayDates.push(formatMockDate(cursor));
    }
    cursor = addMockDays(cursor, 1);
  }

  const existingDates = new Set(mockStore.schedules.map((schedule) => schedule.cleaning_date));
  let nextId = getNextMockId(mockStore.schedules, "schedule_id");
  const createdSchedules = [];

  for (const cleaningDate of fridayDates) {
    if (existingDates.has(cleaningDate)) {
      continue;
    }
    const newSchedule = { schedule_id: nextId, cleaning_date: cleaningDate, status: "예정" };
    mockStore.schedules.push(newSchedule);
    createdSchedules.push(newSchedule);
    existingDates.add(cleaningDate);
    nextId += 1;
  }

  if (!createdSchedules.length) {
    throw createMockHttpError(400, "해당 기간의 금요일 일정이 이미 모두 등록되어 있습니다.");
  }

  return {
    message: "청소 일정이 생성되었습니다.",
    created_count: createdSchedules.length,
    schedules: createdSchedules,
  };
}

function updateMockSchedule(scheduleId, body = {}) {
  const schedule = getMockScheduleOrError(scheduleId);
  const nextCleaningDate = cleanText(body.cleaning_date);
  const nextStatus = cleanText(body.status);
  const allowedStatuses = new Set(["예정", "완료", "취소"]);

  if (nextStatus && !allowedStatuses.has(nextStatus)) {
    throw createMockHttpError(400, "유효하지 않은 일정 상태 값입니다.");
  }

  if (nextCleaningDate) {
    parseMockDate(nextCleaningDate, "청소일");
    const duplicateSchedule = mockStore.schedules.find(
      (item) => item.schedule_id !== scheduleId && item.cleaning_date === nextCleaningDate,
    );
    if (duplicateSchedule) {
      throw createMockHttpError(400, "해당 날짜 일정이 이미 존재합니다.");
    }
  }

  const previousStatus = schedule.status;
  if (nextCleaningDate) {
    schedule.cleaning_date = nextCleaningDate;
  }
  if (nextStatus) {
    schedule.status = nextStatus;
  }

  let canceledAssignmentCount = 0;
  let canceledTradeCount = 0;
  if (previousStatus !== "취소" && schedule.status === "취소") {
    const result = cancelMockAssignmentsBySchedule(scheduleId);
    canceledAssignmentCount = result.canceledAssignmentCount;
    canceledTradeCount = result.canceledTradeCount;
  }

  return {
    message: "일정이 수정되었습니다.",
    schedule,
    canceled_assignment_count: canceledAssignmentCount,
    canceled_trade_count: canceledTradeCount,
  };
}

function deleteMockSchedule(scheduleId) {
  const scheduleIndex = mockStore.schedules.findIndex((item) => item.schedule_id === scheduleId);
  if (scheduleIndex < 0) {
    throw createMockHttpError(404, "해당 일정이 존재하지 않습니다.");
  }

  const assignmentIds = mockStore.assignments
    .filter((assignment) => assignment.schedule_id === scheduleId)
    .map((assignment) => assignment.assignment_id);
  const { deletedAssignmentCount, deletedTradeCount } = deleteMockAssignmentsByIds(assignmentIds);

  mockStore.schedules.splice(scheduleIndex, 1);

  return {
    message: "일정이 삭제되었습니다.",
    deleted_assignment_count: deletedAssignmentCount,
    deleted_trade_count: deletedTradeCount,
  };
}

function buildMockFairnessCounts() {
  const counts = new Map();
  for (const student of mockStore.students) {
    if (student.status === "재학") {
      counts.set(student.student_pk, 0);
    }
  }
  for (const assignment of mockStore.assignments) {
    if (assignment.status === "취소") {
      continue;
    }
    if (counts.has(assignment.student_pk)) {
      counts.set(assignment.student_pk, (counts.get(assignment.student_pk) ?? 0) + 1);
    }
  }
  return counts;
}

function pickMockFairStudent(candidates, fairnessCounts) {
  let minCount = Number.POSITIVE_INFINITY;
  for (const student of candidates) {
    minCount = Math.min(minCount, fairnessCounts.get(student.student_pk) ?? 0);
  }
  const leastLoaded = candidates.filter((student) => (fairnessCounts.get(student.student_pk) ?? 0) === minCount);
  const randomIndex = Math.floor(Math.random() * leastLoaded.length);
  return leastLoaded[randomIndex];
}

function createMockAssignmentsForSchedule(scheduleId, nextId, fairnessCounts) {
  const usedStudentPks = new Set();
  const createdAssignments = [];
  const unfilledNeeds = [];
  const sortedAreas = [...mockStore.areas].sort((left, right) => left.area_id - right.area_id);

  for (const area of sortedAreas) {
    const requiredCount = Math.max(0, toOptionalNumber(area.need_peoples) ?? 0);
    let assignedCount = 0;

    for (let index = 0; index < requiredCount; index += 1) {
      const candidates = mockStore.students.filter(
        (student) =>
          student.status === "재학" &&
          (area.target_grades || []).includes(student.grade) &&
          !usedStudentPks.has(student.student_pk),
      );

      if (!candidates.length) {
        break;
      }

      const selected = pickMockFairStudent(candidates, fairnessCounts);
      const assignment = {
        assignment_id: nextId,
        schedule_id: scheduleId,
        student_pk: selected.student_pk,
        area_id: area.area_id,
        status: "배정",
      };

      mockStore.assignments.push(assignment);
      createdAssignments.push(assignment);
      usedStudentPks.add(selected.student_pk);
      fairnessCounts.set(selected.student_pk, (fairnessCounts.get(selected.student_pk) ?? 0) + 1);
      nextId += 1;
      assignedCount += 1;
    }

    const missingCount = requiredCount - assignedCount;
    if (missingCount > 0) {
      unfilledNeeds.push({
        schedule_id: scheduleId,
        area_id: area.area_id,
        area_name: area.name,
        required_count: requiredCount,
        assigned_count: assignedCount,
        missing_count: missingCount,
      });
    }
  }

  return { createdAssignments, nextId, unfilledNeeds };
}

function getMockAssignments({ assignment_id: assignmentId, schedule_id: scheduleId, student_pk: studentPk, area_id: areaId, status } = {}) {
  const numericAssignmentId = toOptionalNumber(assignmentId);
  if (numericAssignmentId !== undefined) {
    const matchedById = mockStore.assignments.filter((assignment) => assignment.assignment_id === numericAssignmentId);
    if (!matchedById.length) {
      throw createMockHttpError(404, "해당 배정이 존재하지 않습니다.");
    }
    return matchedById;
  }

  let matched = [...mockStore.assignments];
  const numericScheduleId = toOptionalNumber(scheduleId);
  const numericStudentPk = toOptionalNumber(studentPk);
  const numericAreaId = toOptionalNumber(areaId);

  if (numericScheduleId !== undefined) {
    matched = matched.filter((assignment) => assignment.schedule_id === numericScheduleId);
  }
  if (numericStudentPk !== undefined) {
    matched = matched.filter((assignment) => assignment.student_pk === numericStudentPk);
  }
  if (numericAreaId !== undefined) {
    matched = matched.filter((assignment) => assignment.area_id === numericAreaId);
  }
  if (status) {
    matched = matched.filter((assignment) => assignment.status === String(status));
  }

  return matched;
}

function addMockAssignments() {
  const pendingSchedules = mockStore.schedules.filter((schedule) => schedule.status === "예정");
  if (!pendingSchedules.length) {
    throw createMockHttpError(400, "배정 가능한 예정 일정이 없습니다.");
  }

  let nextId = getNextMockId(mockStore.assignments, "assignment_id");
  const fairnessCounts = buildMockFairnessCounts();
  let totalCreatedCount = 0;
  const results = [];
  const skippedScheduleIds = [];
  const totalUnfilledNeeds = [];

  for (const schedule of [...mockStore.schedules].sort((left, right) => left.schedule_id - right.schedule_id)) {
    if (schedule.status !== "예정") {
      skippedScheduleIds.push(schedule.schedule_id);
      continue;
    }

    const alreadyAssigned = mockStore.assignments.some((assignment) => assignment.schedule_id === schedule.schedule_id);
    if (alreadyAssigned) {
      skippedScheduleIds.push(schedule.schedule_id);
      continue;
    }

    const { createdAssignments, nextId: nextAssignmentId, unfilledNeeds } = createMockAssignmentsForSchedule(
      schedule.schedule_id,
      nextId,
      fairnessCounts,
    );

    nextId = nextAssignmentId;
    if (createdAssignments.length) {
      totalCreatedCount += createdAssignments.length;
      results.push({
        schedule_id: schedule.schedule_id,
        created_count: createdAssignments.length,
        assignments: createdAssignments,
        unfilled_needs: unfilledNeeds,
      });
      totalUnfilledNeeds.push(...unfilledNeeds);
    } else {
      skippedScheduleIds.push(schedule.schedule_id);
      totalUnfilledNeeds.push(...unfilledNeeds);
    }
  }

  if (!totalCreatedCount) {
    throw createMockHttpError(400, "배정 가능한 일정이 없습니다.");
  }

  return {
    message: "전체 일정 자동 배정이 완료되었습니다.",
    created_schedule_count: results.length,
    total_created_count: totalCreatedCount,
    results,
    skipped_schedule_ids: skippedScheduleIds,
    total_unfilled_needs: totalUnfilledNeeds,
  };
}

function getMockAssignmentOrError(assignmentId) {
  const assignment = mockStore.assignments.find((item) => item.assignment_id === assignmentId);
  if (!assignment) {
    throw createMockHttpError(404, "해당 배정이 존재하지 않습니다.");
  }
  return assignment;
}

function getMockCleaningCount(studentPk) {
  return mockStore.assignments.filter(
    (assignment) =>
      assignment.student_pk === studentPk &&
      assignment.status !== "취소" &&
      assignment.status !== "불이행",
  ).length;
}

function updateMockAssignmentStatus(assignmentId, status) {
  const allowedStatuses = new Set(["배정", "완료", "취소", "불이행"]);
  const assignment = getMockAssignmentOrError(assignmentId);
  if (!allowedStatuses.has(status)) {
    throw createMockHttpError(400, "유효하지 않은 청소 현황 값입니다.");
  }

  assignment.status = status;
  const canceledTradeCount = status === "취소" ? cancelMockPendingTradesForAssignmentIds([assignmentId]) : 0;
  return {
    message: "청소 현황이 수정되었습니다.",
    assignment,
    canceled_trade_count: canceledTradeCount,
  };
}

function reassignMockCanceledAssignment(assignmentId) {
  const assignment = getMockAssignmentOrError(assignmentId);
  if (assignment.status !== "취소") {
    throw createMockHttpError(400, "취소된 배정만 재배정할 수 있습니다.");
  }

  const area = mockStore.areas.find((item) => item.area_id === assignment.area_id);
  if (!area) {
    throw createMockHttpError(404, "연결된 청소 구역이 존재하지 않습니다.");
  }

  const assignedStudentPks = new Set(
    mockStore.assignments
      .filter(
        (item) =>
          item.schedule_id === assignment.schedule_id &&
          item.assignment_id !== assignment.assignment_id &&
          item.status !== "취소",
      )
      .map((item) => item.student_pk),
  );

  const candidates = mockStore.students.filter(
    (student) =>
      student.status === "재학" &&
      (area.target_grades || []).includes(student.grade) &&
      !assignedStudentPks.has(student.student_pk),
  );

  if (!candidates.length) {
    throw createMockHttpError(400, "재배정 가능한 학생이 없습니다.");
  }

  const selected = [...candidates].sort(
    (left, right) => getMockCleaningCount(left.student_pk) - getMockCleaningCount(right.student_pk) || left.student_pk - right.student_pk,
  )[0];

  assignment.student_pk = selected.student_pk;
  assignment.status = "배정";

  return {
    message: "재배정이 완료되었습니다.",
    assignment,
    selected_student_cleaning_count: getMockCleaningCount(selected.student_pk),
  };
}

function deleteMockAssignment(assignmentId) {
  getMockAssignmentOrError(assignmentId);
  const { deletedAssignmentCount, deletedTradeCount } = deleteMockAssignmentsByIds([assignmentId]);

  return {
    message: "배정이 삭제되었습니다.",
    deleted_assignment_count: deletedAssignmentCount,
    deleted_trade_count: deletedTradeCount,
  };
}

function deleteMockAssignments(query = {}) {
  const scheduleId = toOptionalNumber(query.schedule_id);
  let assignmentIds = [];

  if (scheduleId !== undefined) {
    getMockScheduleOrError(scheduleId);
    assignmentIds = mockStore.assignments
      .filter((assignment) => assignment.schedule_id === scheduleId)
      .map((assignment) => assignment.assignment_id);
  } else {
    assignmentIds = mockStore.assignments.map((assignment) => assignment.assignment_id);
  }

  const { deletedAssignmentCount, deletedTradeCount } = deleteMockAssignmentsByIds(assignmentIds);

  return {
    message: "배정이 일괄 삭제되었습니다.",
    schedule_id: scheduleId,
    deleted_assignment_count: deletedAssignmentCount,
    deleted_trade_count: deletedTradeCount,
  };
}

function getMockTradeOrError(requestId) {
  const trade = mockStore.trades.find((item) => item.request_id === requestId);
  if (!trade) {
    throw createMockHttpError(404, "해당 교환 요청이 존재하지 않습니다.");
  }
  return trade;
}

function hasMockActiveAssignment(scheduleId, studentPk, excludedAssignmentIds = new Set()) {
  return mockStore.assignments.some(
    (assignment) =>
      assignment.schedule_id === scheduleId &&
      assignment.student_pk === studentPk &&
      !excludedAssignmentIds.has(assignment.assignment_id) &&
      assignment.status !== "취소",
  );
}

function validateMockTradePair(requesterAssignmentId, targetAssignmentId) {
  if (requesterAssignmentId === targetAssignmentId) {
    throw createMockHttpError(400, "동일한 배정끼리는 교환할 수 없습니다.");
  }

  const requesterAssignment = getMockAssignmentOrError(requesterAssignmentId);
  const targetAssignment = getMockAssignmentOrError(targetAssignmentId);

  if (requesterAssignment.status === "취소" || targetAssignment.status === "취소") {
    throw createMockHttpError(400, "취소된 배정은 교환할 수 없습니다.");
  }

  const excludedIds = new Set([requesterAssignment.assignment_id, targetAssignment.assignment_id]);
  if (hasMockActiveAssignment(requesterAssignment.schedule_id, targetAssignment.student_pk, excludedIds)) {
    throw createMockHttpError(400, "교환 후 신청자 일정에 동일 학생이 중복 배정됩니다.");
  }
  if (hasMockActiveAssignment(targetAssignment.schedule_id, requesterAssignment.student_pk, excludedIds)) {
    throw createMockHttpError(400, "교환 후 대상자 일정에 동일 학생이 중복 배정됩니다.");
  }

  return { requesterAssignment, targetAssignment };
}

function getMockTrades({ request_id: requestId, requester_assignment_id: requesterAssignmentId, target_assignment_id: targetAssignmentId, status } = {}) {
  const numericRequestId = toOptionalNumber(requestId);
  if (numericRequestId !== undefined) {
    const matchedById = mockStore.trades.filter((trade) => trade.request_id === numericRequestId);
    if (!matchedById.length) {
      throw createMockHttpError(404, "해당 교환 요청이 존재하지 않습니다.");
    }
    return matchedById;
  }

  let matched = [...mockStore.trades];
  const numericRequesterAssignmentId = toOptionalNumber(requesterAssignmentId);
  const numericTargetAssignmentId = toOptionalNumber(targetAssignmentId);

  if (numericRequesterAssignmentId !== undefined) {
    matched = matched.filter((trade) => trade.requester_assignment_id === numericRequesterAssignmentId);
  }
  if (numericTargetAssignmentId !== undefined) {
    matched = matched.filter((trade) => trade.target_assignment_id === numericTargetAssignmentId);
  }
  if (status) {
    matched = matched.filter((trade) => trade.status === String(status));
  }
  return matched;
}

function addMockTrade(body = {}) {
  const requesterAssignmentId = toOptionalNumber(body.requester_assignment_id);
  const targetAssignmentId = toOptionalNumber(body.target_assignment_id);
  if (requesterAssignmentId === undefined || targetAssignmentId === undefined) {
    throw createMockHttpError(400, "교환 요청 값이 유효하지 않습니다.");
  }

  validateMockTradePair(requesterAssignmentId, targetAssignmentId);

  const hasPending = mockStore.trades.some(
    (trade) =>
      trade.status === "대기" &&
      ((trade.requester_assignment_id === requesterAssignmentId && trade.target_assignment_id === targetAssignmentId) ||
        (trade.requester_assignment_id === targetAssignmentId && trade.target_assignment_id === requesterAssignmentId)),
  );
  if (hasPending) {
    throw createMockHttpError(400, "이미 대기 중인 동일 교환 요청이 존재합니다.");
  }

  const trade = {
    request_id: getNextMockId(mockStore.trades, "request_id"),
    requester_assignment_id: requesterAssignmentId,
    target_assignment_id: targetAssignmentId,
    status: "대기",
  };
  mockStore.trades.push(trade);

  return {
    message: "교환 요청이 등록되었습니다.",
    trade,
  };
}

function updateMockTradeStatus(requestId, body = {}) {
  const trade = getMockTradeOrError(requestId);
  if (trade.status !== "대기") {
    throw createMockHttpError(400, "대기 중인 요청만 처리할 수 있습니다.");
  }

  const nextStatus = cleanText(body.status);
  const allowedStatuses = new Set(["수락", "거절", "취소"]);
  if (!allowedStatuses.has(nextStatus)) {
    throw createMockHttpError(400, "요청 상태는 수락/거절/취소만 가능합니다.");
  }

  if (nextStatus === "수락") {
    const { requesterAssignment, targetAssignment } = validateMockTradePair(
      trade.requester_assignment_id,
      trade.target_assignment_id,
    );

    const tempStudentPk = requesterAssignment.student_pk;
    requesterAssignment.student_pk = targetAssignment.student_pk;
    targetAssignment.student_pk = tempStudentPk;
  }

  trade.status = nextStatus;

  return {
    message: "교환 요청 상태가 변경되었습니다.",
    trade,
  };
}

function deleteMockTrade(requestId) {
  const tradeIndex = mockStore.trades.findIndex((item) => item.request_id === requestId);
  if (tradeIndex < 0) {
    throw createMockHttpError(404, "해당 교환 요청이 존재하지 않습니다.");
  }

  mockStore.trades.splice(tradeIndex, 1);
  return { message: "교환 요청이 삭제되었습니다." };
}

function handleMockRequest(method, path, { query = {}, body = {} } = {}) {
  const normalizedPath = normalizeMockPath(path);

  if (method === "GET" && normalizedPath === "/health") {
    return toMockResponse({ status: "ok", version: "mock-1.0.0" });
  }

  if (normalizedPath === "/students") {
    if (method === "GET") {
      return toMockResponse(getMockStudents(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockStudent(body), 201);
    }
  }

  const studentMatch = normalizedPath.match(/^\/students\/(\d+)$/);
  if (studentMatch && method === "PATCH") {
    const studentPk = Number(studentMatch[1]);
    return toMockResponse(updateMockStudent(studentPk, body));
  }
  if (studentMatch && method === "DELETE") {
    const studentPk = Number(studentMatch[1]);
    return toMockResponse(deleteMockStudent(studentPk));
  }

  if (normalizedPath === "/areas") {
    if (method === "GET") {
      return toMockResponse(mockStore.areas);
    }
    if (method === "POST") {
      return toMockResponse(addMockArea(body), 201);
    }
  }

  const areaMatch = normalizedPath.match(/^\/areas\/(\d+)$/);
  if (areaMatch && method === "PATCH") {
    const areaId = Number(areaMatch[1]);
    return toMockResponse(updateMockArea(areaId, body));
  }
  if (areaMatch && method === "DELETE") {
    const areaId = Number(areaMatch[1]);
    return toMockResponse(deleteMockArea(areaId));
  }

  if (normalizedPath === "/schedules") {
    if (method === "GET") {
      return toMockResponse(getMockSchedules(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockSchedules(query), 201);
    }
  }

  const scheduleMatch = normalizedPath.match(/^\/schedules\/(\d+)$/);
  if (scheduleMatch && method === "PATCH") {
    const scheduleId = Number(scheduleMatch[1]);
    return toMockResponse(updateMockSchedule(scheduleId, body));
  }
  if (scheduleMatch && method === "DELETE") {
    const scheduleId = Number(scheduleMatch[1]);
    return toMockResponse(deleteMockSchedule(scheduleId));
  }

  if (normalizedPath === "/assignments") {
    if (method === "GET") {
      return toMockResponse(getMockAssignments(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockAssignments(), 201);
    }
    if (method === "DELETE") {
      return toMockResponse(deleteMockAssignments(query));
    }
  }

  const assignmentStatusMatch = normalizedPath.match(/^\/assignments\/(\d+)\/status$/);
  if (assignmentStatusMatch && method === "PATCH") {
    const assignmentId = Number(assignmentStatusMatch[1]);
    return toMockResponse(updateMockAssignmentStatus(assignmentId, cleanText(query.status)));
  }

  const assignmentReassignMatch = normalizedPath.match(/^\/assignments\/(\d+)\/reassign$/);
  if (assignmentReassignMatch && method === "POST") {
    const assignmentId = Number(assignmentReassignMatch[1]);
    return toMockResponse(reassignMockCanceledAssignment(assignmentId));
  }

  const assignmentDeleteMatch = normalizedPath.match(/^\/assignments\/(\d+)$/);
  if (assignmentDeleteMatch && method === "DELETE") {
    const assignmentId = Number(assignmentDeleteMatch[1]);
    return toMockResponse(deleteMockAssignment(assignmentId));
  }

  if (normalizedPath === "/trades") {
    if (method === "GET") {
      return toMockResponse(getMockTrades(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockTrade(body), 201);
    }
  }

  const tradeMatch = normalizedPath.match(/^\/trades\/(\d+)$/);
  if (tradeMatch && method === "PATCH") {
    const requestId = Number(tradeMatch[1]);
    return toMockResponse(updateMockTradeStatus(requestId, body));
  }
  if (tradeMatch && method === "DELETE") {
    const requestId = Number(tradeMatch[1]);
    return toMockResponse(deleteMockTrade(requestId));
  }

  throw createMockHttpError(404, "Mock API에서 지원하지 않는 경로입니다.");
}

async function requestMockApi(method, path, { query, body } = {}) {
  const url = buildMockUrl(path, query);
  const startedAt = performance.now();

  try {
    const { status, payload } = handleMockRequest(method, path, { query, body });
    return {
      ok: status >= 200 && status < 300,
      status,
      method,
      url: url.toString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      payload,
    };
  } catch (error) {
    const status = Number.isFinite(error.status) ? error.status : 500;
    const payload = error.payload ?? { detail: error.message ?? "Mock API 처리 중 오류가 발생했습니다." };
    return {
      ok: false,
      status,
      method,
      url: url.toString(),
      elapsedMs: Math.round(performance.now() - startedAt),
      payload,
    };
  }
}

async function requestApi(method, path, { query, body } = {}) {
  if (isMockMode()) {
    return requestMockApi(method, path, { query, body });
  }

  const url = buildUrl(path, query);
  const options = { method, headers: {} };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  const startedAt = performance.now();
  const response = await fetch(url, options);
  const elapsedMs = Math.round(performance.now() - startedAt);
  const text = await response.text();

  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return {
    ok: response.ok,
    status: response.status,
    method,
    url: url.toString(),
    elapsedMs,
    payload,
  };
}

function setServerState(text, isOk) {
  elements.serverState.textContent = text;
  elements.serverState.classList.remove("ok", "error");
  elements.serverState.classList.add(isOk ? "ok" : "error");
}

function pushActivity(operation, ok, message) {
  const item = document.createElement("li");
  const now = new Date().toLocaleTimeString("ko-KR", { hour12: false });
  item.className = ok ? "ok" : "error";
  item.textContent = `${now} | ${operation} | ${message}`;
  elements.activityLog.prepend(item);

  while (elements.activityLog.children.length > 14) {
    elements.activityLog.removeChild(elements.activityLog.lastElementChild);
  }
}

function showResult(operation, result) {
  elements.responseMeta.textContent = `${operation} | ${result.status} | ${result.elapsedMs}ms`;
  elements.responseMeta.classList.remove("ok", "error");
  elements.responseMeta.classList.add(result.ok ? "ok" : "error");

  elements.responseBox.textContent = JSON.stringify(
    {
      operation,
      method: result.method,
      status: result.status,
      url: result.url,
      elapsed_ms: result.elapsedMs,
      response: result.payload,
    },
    null,
    2,
  );

  pushActivity(operation, result.ok, `HTTP ${result.status}`);
}

function showClientError(operation, error) {
  elements.responseMeta.textContent = `${operation} | client error`;
  elements.responseMeta.classList.remove("ok");
  elements.responseMeta.classList.add("error");
  elements.responseBox.textContent = JSON.stringify(
    {
      operation,
      message: error.message ?? String(error),
    },
    null,
    2,
  );
  pushActivity(operation, false, "client error");
}

function renderStatus(status) {
  const className = STATUS_CLASS_MAP[status] || "";
  return `<span class="status-pill ${className}">${escapeHtml(status || "-")}</span>`;
}

function renderStudents() {
  if (!state.students.length) {
    elements.studentsRows.innerHTML = `<tr><td colspan="6">데이터 없음</td></tr>`;
    return;
  }

  const linkedStudentPks = new Set(state.assignments.map((assignment) => assignment.student_pk));

  elements.studentsRows.innerHTML = state.students
    .map(
      (student) => {
        const deleteAction = linkedStudentPks.has(student.student_pk)
          ? `<button type="button" class="mini-btn locked" disabled title="배정 이력이 있어 삭제할 수 없습니다.">잠김</button>`
          : `<button type="button" class="mini-btn warn" data-action="delete-student" data-student-pk="${student.student_pk}">삭제</button>`;

        return `
        <tr data-student-row-id="${student.student_pk}">
          <td>${student.student_pk}</td>
          <td>${escapeHtml(student.student_id)}</td>
          <td>${escapeHtml(student.name)}</td>
          <td>${student.grade}</td>
          <td>${renderStatus(student.status)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn" data-action="pick-student" data-student-pk="${student.student_pk}">편집</button>
              ${deleteAction}
            </div>
          </td>
        </tr>
      `;
      },
    )
    .join("");
}

function renderAreas() {
  if (!state.areas.length) {
    elements.areasRows.innerHTML = `<tr><td colspan="5">데이터 없음</td></tr>`;
    return;
  }

  const linkedAreaIds = new Set(state.assignments.map((assignment) => assignment.area_id));

  elements.areasRows.innerHTML = state.areas
    .map(
      (area) => {
        const deleteAction = linkedAreaIds.has(area.area_id)
          ? `<button type="button" class="mini-btn locked" disabled title="배정 이력이 있어 삭제할 수 없습니다.">잠김</button>`
          : `<button type="button" class="mini-btn warn" data-action="delete-area" data-area-id="${area.area_id}">삭제</button>`;

        return `
        <tr data-area-row-id="${area.area_id}">
          <td>${area.area_id}</td>
          <td>${escapeHtml(area.name)}</td>
          <td>${area.need_peoples}</td>
          <td>${escapeHtml((area.target_grades || []).join(", "))}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn" data-action="pick-area" data-area-id="${area.area_id}">편집</button>
              ${deleteAction}
            </div>
          </td>
        </tr>
      `;
      },
    )
    .join("");
}

function renderSchedules() {
  if (!state.schedules.length) {
    elements.schedulesRows.innerHTML = `<tr><td colspan="4">데이터 없음</td></tr>`;
    return;
  }

  elements.schedulesRows.innerHTML = state.schedules
    .map(
      (schedule) => `
        <tr data-schedule-row-id="${schedule.schedule_id}">
          <td>${schedule.schedule_id}</td>
          <td>${escapeHtml(schedule.cleaning_date)}</td>
          <td>${renderStatus(schedule.status || "예정")}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn" data-action="pick-schedule" data-schedule-id="${schedule.schedule_id}">편집</button>
              <button type="button" class="mini-btn warn" data-action="delete-schedule" data-schedule-id="${schedule.schedule_id}">삭제</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderAssignments() {
  const assignments = state.assignmentsView;
  if (!assignments.length) {
    elements.assignmentsRows.innerHTML = `<tr><td colspan="6">데이터 없음</td></tr>`;
    if (elements.assignmentFilterMeta) {
      elements.assignmentFilterMeta.textContent = `조회 ${state.assignmentsView.length}건 / 전체 ${state.assignments.length}건`;
    }
    return;
  }

  const studentsMap = new Map(state.students.map((student) => [student.student_pk, student]));
  const areasMap = new Map(state.areas.map((area) => [area.area_id, area]));
  const schedulesMap = new Map(state.schedules.map((schedule) => [schedule.schedule_id, schedule]));

  elements.assignmentsRows.innerHTML = assignments
    .map((assignment) => {
      const student = studentsMap.get(assignment.student_pk);
      const area = areasMap.get(assignment.area_id);
      const schedule = schedulesMap.get(assignment.schedule_id);
      const studentName = student ? `${student.name}(${student.student_pk})` : `PK ${assignment.student_pk}`;
      const areaName = area ? `${area.name}(${area.area_id})` : `구역 ${assignment.area_id}`;
      const scheduleLabel = schedule?.cleaning_date ?? `일정 ${assignment.schedule_id}`;

      return `
        <tr>
          <td>${assignment.assignment_id}</td>
          <td>${escapeHtml(scheduleLabel)}</td>
          <td>${escapeHtml(areaName)}</td>
          <td>${escapeHtml(studentName)}</td>
          <td>${renderStatus(assignment.status)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn" data-action="set-requester" data-assignment-id="${assignment.assignment_id}">신청자</button>
              <button type="button" class="mini-btn alt" data-action="set-target" data-assignment-id="${assignment.assignment_id}">대상자</button>
              <button type="button" class="mini-btn warn" data-action="set-status-target" data-assignment-id="${assignment.assignment_id}">상태</button>
              <button type="button" class="mini-btn warn" data-action="delete-assignment" data-assignment-id="${assignment.assignment_id}">삭제</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");

  if (elements.assignmentFilterMeta) {
    elements.assignmentFilterMeta.textContent = `조회 ${state.assignmentsView.length}건 / 전체 ${state.assignments.length}건`;
  }
}

function renderTrades() {
  if (!state.trades.length) {
    elements.tradesRows.innerHTML = `<tr><td colspan="5">데이터 없음</td></tr>`;
    return;
  }

  elements.tradesRows.innerHTML = state.trades
    .map((trade) => {
      const quickActions =
        trade.status === "대기"
          ? `
            <button type="button" class="mini-btn" data-action="pick-trade" data-request-id="${trade.request_id}">선택</button>
            <button type="button" class="mini-btn" data-action="quick-trade" data-request-id="${trade.request_id}" data-status="수락">수락</button>
            <button type="button" class="mini-btn alt" data-action="quick-trade" data-request-id="${trade.request_id}" data-status="거절">거절</button>
            <button type="button" class="mini-btn warn" data-action="delete-trade" data-request-id="${trade.request_id}">삭제</button>
          `
          : `
            <button type="button" class="mini-btn" data-action="pick-trade" data-request-id="${trade.request_id}">선택</button>
            <button type="button" class="mini-btn warn" data-action="delete-trade" data-request-id="${trade.request_id}">삭제</button>
          `;

      return `
        <tr>
          <td>${trade.request_id}</td>
          <td>${trade.requester_assignment_id}</td>
          <td>${trade.target_assignment_id}</td>
          <td>${renderStatus(trade.status)}</td>
          <td><div class="row-actions">${quickActions}</div></td>
        </tr>
      `;
    })
    .join("");
}

function setSelectOptions(selectElement, options, placeholder, previousValue = "") {
  const html = [`<option value="">${escapeHtml(placeholder)}</option>`]
    .concat(options.map((option) => `<option value="${option.value}">${escapeHtml(option.label)}</option>`))
    .join("");
  selectElement.innerHTML = html;

  if (previousValue && options.some((option) => String(option.value) === String(previousValue))) {
    selectElement.value = String(previousValue);
  }
}

function syncSelectors() {
  const previousBulkDeleteScheduleId = elements.bulkDeleteScheduleId.value;
  const previousStatusAssignmentId = elements.statusAssignmentId.value;
  const previousReassignAssignmentId = elements.reassignAssignmentId.value;
  const previousTradeRequesterId = elements.tradeRequesterId.value;
  const previousTradeTargetId = elements.tradeTargetId.value;
  const previousTradeRequestId = elements.tradeRequestId.value;
  const previousScheduleUpdateScheduleId = elements.scheduleUpdateScheduleId.value;
  const previousStudentUpdateStudentPk = elements.studentUpdateStudentPk.value;
  const previousStudentStatusStudentPk = elements.studentStatusStudentPk.value;
  const previousAreaUpdateAreaId = elements.areaUpdateAreaId.value;

  const assignmentOptions = state.assignments.map((assignment) => ({
    value: assignment.assignment_id,
    label: `#${assignment.assignment_id} | 일정 ${assignment.schedule_id} | ${assignment.status}`,
  }));

  const canceledAssignmentOptions = state.assignments
    .filter((assignment) => assignment.status === "취소")
    .map((assignment) => ({
      value: assignment.assignment_id,
      label: `#${assignment.assignment_id} | 일정 ${assignment.schedule_id} | 취소`,
    }));

  const pendingTradeOptions = state.trades
    .filter((trade) => trade.status === "대기")
    .map((trade) => ({
      value: trade.request_id,
      label: `#${trade.request_id} | ${trade.requester_assignment_id} ↔ ${trade.target_assignment_id}`,
    }));

  const scheduleOptions = state.schedules.map((schedule) => ({
    value: schedule.schedule_id,
    label: `일정 ${schedule.schedule_id} | ${schedule.cleaning_date} | ${schedule.status || "예정"}`,
  }));

  const studentOptions = state.students.map((student) => ({
    value: student.student_pk,
    label: `${student.name} (${student.student_id}) | ${student.status}`,
  }));

  const areaOptions = state.areas.map((area) => ({
    value: area.area_id,
    label: `${area.name} | 인원 ${area.need_peoples}`,
  }));

  setSelectOptions(
    elements.bulkDeleteScheduleId,
    scheduleOptions,
    scheduleOptions.length ? "전체 배정" : "삭제할 배정 없음",
    previousBulkDeleteScheduleId,
  );
  setSelectOptions(elements.statusAssignmentId, assignmentOptions, "배정 선택", previousStatusAssignmentId);
  setSelectOptions(
    elements.reassignAssignmentId,
    canceledAssignmentOptions,
    canceledAssignmentOptions.length ? "취소 배정 선택" : "취소 배정 없음",
    previousReassignAssignmentId,
  );
  setSelectOptions(elements.tradeRequesterId, assignmentOptions, "신청자 배정 선택", previousTradeRequesterId);
  setSelectOptions(elements.tradeTargetId, assignmentOptions, "대상자 배정 선택", previousTradeTargetId);
  setSelectOptions(
    elements.scheduleUpdateScheduleId,
    scheduleOptions,
    scheduleOptions.length ? "일정 선택" : "일정 없음",
    previousScheduleUpdateScheduleId,
  );
  setSelectOptions(
    elements.studentUpdateStudentPk,
    studentOptions,
    studentOptions.length ? "학생 선택" : "학생 없음",
    previousStudentUpdateStudentPk,
  );
  setSelectOptions(
    elements.studentStatusStudentPk,
    studentOptions,
    studentOptions.length ? "학생 선택" : "학생 없음",
    previousStudentStatusStudentPk,
  );
  setSelectOptions(
    elements.areaUpdateAreaId,
    areaOptions,
    areaOptions.length ? "구역 선택" : "구역 없음",
    previousAreaUpdateAreaId,
  );
  setSelectOptions(
    elements.tradeRequestId,
    pendingTradeOptions,
    pendingTradeOptions.length ? "요청 선택" : "대기 요청 없음",
    previousTradeRequestId,
  );

  syncScheduleUpdateForm();
  syncStudentUpdateForm();
  syncAreaUpdateForm();
}

function clearScheduleUpdateForm() {
  elements.scheduleEditDate.value = "";
  elements.scheduleEditStatus.value = "";
}

function syncScheduleUpdateForm() {
  const scheduleId = parseOptionalInt(elements.scheduleUpdateScheduleId.value);
  if (scheduleId === undefined) {
    clearScheduleUpdateForm();
    return;
  }

  const schedule = state.schedules.find((item) => item.schedule_id === scheduleId);
  if (!schedule) {
    clearScheduleUpdateForm();
    return;
  }

  elements.scheduleEditDate.value = schedule.cleaning_date ?? "";
  elements.scheduleEditStatus.value = schedule.status ?? "예정";
}

function clearStudentUpdateForm() {
  elements.studentEditStudentId.value = "";
  elements.studentEditName.value = "";
  elements.studentEditGrade.value = "";
  elements.studentEditStatus.value = "";
  elements.studentEditRole.value = "";
}

function syncStudentUpdateForm() {
  const studentPk = parseOptionalInt(elements.studentUpdateStudentPk.value);
  if (studentPk === undefined) {
    clearStudentUpdateForm();
    return;
  }

  const student = state.students.find((item) => item.student_pk === studentPk);
  if (!student) {
    clearStudentUpdateForm();
    return;
  }

  elements.studentEditStudentId.value = student.student_id ?? "";
  elements.studentEditName.value = student.name ?? "";
  elements.studentEditGrade.value = student.grade ?? "";
  elements.studentEditStatus.value = student.status ?? "";
  elements.studentEditRole.value = student.role ?? "";
}

function clearAreaUpdateForm() {
  elements.areaEditName.value = "";
  elements.areaEditNeedPeoples.value = "";
  elements.areaEditTargetGrades.value = "";
}

function syncAreaUpdateForm() {
  const areaId = parseOptionalInt(elements.areaUpdateAreaId.value);
  if (areaId === undefined) {
    clearAreaUpdateForm();
    return;
  }

  const area = state.areas.find((item) => item.area_id === areaId);
  if (!area) {
    clearAreaUpdateForm();
    return;
  }

  elements.areaEditName.value = area.name ?? "";
  elements.areaEditNeedPeoples.value = area.need_peoples ?? "";
  elements.areaEditTargetGrades.value = (area.target_grades || []).join(", ");
}

function renderKpis() {
  const activeStudents = state.students.filter((student) => student.status === "재학").length;
  const pendingTrades = state.trades.filter((trade) => trade.status === "대기").length;

  elements.kpiStudents.textContent = String(state.students.length);
  elements.kpiActiveStudents.textContent = String(activeStudents);
  elements.kpiAreas.textContent = String(state.areas.length);
  elements.kpiAssignments.textContent = String(state.assignments.length);
  elements.kpiPendingTrades.textContent = String(pendingTrades);
}

function renderAll() {
  applyAssignmentFilter();
  renderStudents();
  renderAreas();
  renderSchedules();
  renderAssignments();
  renderTrades();
  syncSelectors();
  renderKpis();
}

function focusRow(selector) {
  const row = document.querySelector(selector);
  if (!row) {
    return;
  }

  row.scrollIntoView({ block: "nearest", inline: "nearest" });
  row.classList.add("row-flash");
  window.setTimeout(() => {
    row.classList.remove("row-flash");
  }, 1800);
}

function focusStudentRow(studentPk) {
  if (studentPk === undefined || studentPk === null) {
    return;
  }

  const nextValue = String(studentPk);
  elements.studentUpdateStudentPk.value = nextValue;
  elements.studentStatusStudentPk.value = nextValue;
  syncStudentUpdateForm();
  focusRow(`[data-student-row-id="${nextValue}"]`);
}

function focusAreaRow(areaId) {
  if (areaId === undefined || areaId === null) {
    return;
  }

  const nextValue = String(areaId);
  elements.areaUpdateAreaId.value = nextValue;
  syncAreaUpdateForm();
  focusRow(`[data-area-row-id="${nextValue}"]`);
}

function focusScheduleRow(scheduleId) {
  if (scheduleId === undefined || scheduleId === null) {
    return;
  }

  const nextValue = String(scheduleId);
  elements.scheduleUpdateScheduleId.value = nextValue;
  if (elements.bulkDeleteScheduleId.querySelector(`option[value="${nextValue}"]`)) {
    elements.bulkDeleteScheduleId.value = nextValue;
  }
  syncScheduleUpdateForm();
  focusRow(`[data-schedule-row-id="${nextValue}"]`);
}

function applyAssignmentFilter() {
  const normalizedStudentId = cleanText(state.assignmentFilter.studentId);
  const normalizedName = cleanText(state.assignmentFilter.name);

  elements.assignmentFilterStudentId.value = normalizedStudentId;
  elements.assignmentFilterName.value = normalizedName;

  if (!normalizedStudentId && !normalizedName) {
    state.assignmentsView = [...state.assignments];
    return;
  }

  const matchedStudentPks = new Set(
    state.students
      .filter((student) => {
        const byStudentId = !normalizedStudentId || cleanText(student.student_id).includes(normalizedStudentId);
        const byName = !normalizedName || cleanText(student.name).includes(normalizedName);
        return byStudentId && byName;
      })
      .map((student) => student.student_pk),
  );

  state.assignmentsView = state.assignments.filter((assignment) => matchedStudentPks.has(assignment.student_pk));
}

async function refreshEntity(entity, { silent = true, render = true } = {}) {
  const result = await requestApi("GET", ENDPOINTS[entity]);
  if (result.ok && Array.isArray(result.payload)) {
    state[entity] = result.payload;
  }
  if (render) {
    renderAll();
  }
  if (!silent) {
    showResult(`${entity} 조회`, result);
  }
  return result;
}

async function refreshAll({ silent = false } = {}) {
  const summary = {};
  let allOk = true;

  for (const entity of Object.keys(ENDPOINTS)) {
    const result = await refreshEntity(entity, { silent: true, render: false });
    summary[entity] = {
      status: result.status,
      count: Array.isArray(result.payload) ? result.payload.length : 0,
    };
    if (!result.ok) {
      allOk = false;
    }
  }

  renderAll();

  const aggregateResult = {
    ok: allOk,
    status: allOk ? 200 : 207,
    method: "GET",
    url: `${normalizeBaseUrl()}/(sync)`,
    elapsedMs: 0,
    payload: summary,
  };

  if (!silent) {
    showResult("전체 동기화", aggregateResult);
  }

  return aggregateResult;
}

async function runMutation(operation, requestRunner) {
  try {
    const result = await requestRunner();
    showResult(operation, result);
    if (result.ok) {
      await refreshAll({ silent: true });
    }
    return result;
  } catch (error) {
    showClientError(operation, error);
    return null;
  }
}

async function guardForm(operation, runner) {
  try {
    await runner();
  } catch (error) {
    showClientError(operation, error);
  }
}

function bindPanelRefreshButtons() {
  document.querySelectorAll("[data-refresh]").forEach((button) => {
    button.addEventListener("click", async () => {
      const entity = button.dataset.refresh;
      try {
        await refreshEntity(entity, { silent: false });
      } catch (error) {
        showClientError(`${entity} 조회`, error);
      }
    });
  });
}

function bindQuickActions() {
  document.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) {
      return;
    }

    const assignmentId = actionButton.dataset.assignmentId;
    const requestId = actionButton.dataset.requestId;
    const studentPk = actionButton.dataset.studentPk;
    const areaId = actionButton.dataset.areaId;
    const scheduleId = actionButton.dataset.scheduleId;

    if (actionButton.dataset.action === "set-requester" && assignmentId) {
      elements.tradeRequesterId.value = assignmentId;
      return;
    }

    if (actionButton.dataset.action === "set-target" && assignmentId) {
      elements.tradeTargetId.value = assignmentId;
      return;
    }

    if (actionButton.dataset.action === "pick-student" && studentPk) {
      elements.studentUpdateStudentPk.value = studentPk;
      elements.studentStatusStudentPk.value = studentPk;
      syncStudentUpdateForm();
      return;
    }

    if (actionButton.dataset.action === "pick-area" && areaId) {
      elements.areaUpdateAreaId.value = areaId;
      syncAreaUpdateForm();
      return;
    }

    if (actionButton.dataset.action === "pick-schedule" && scheduleId) {
      focusScheduleRow(scheduleId);
      return;
    }

    if (actionButton.dataset.action === "set-status-target" && assignmentId) {
      elements.statusAssignmentId.value = assignmentId;
      if (elements.reassignAssignmentId.querySelector(`option[value="${assignmentId}"]`)) {
        elements.reassignAssignmentId.value = assignmentId;
      }
      return;
    }

    if (actionButton.dataset.action === "pick-trade" && requestId) {
      elements.tradeRequestId.value = requestId;
      return;
    }

    if (actionButton.dataset.action === "quick-trade" && requestId) {
      const status = actionButton.dataset.status;
      await runMutation(`교환 요청 ${status}`, () =>
        requestApi("PATCH", `/trades/${requestId}`, { body: { status } }),
      );
      return;
    }

    if (actionButton.dataset.action === "delete-student" && studentPk) {
      const student = state.students.find((item) => String(item.student_pk) === String(studentPk));
      if (!window.confirm(`${student?.name ?? "선택한 학생"}을(를) 삭제할까요?`)) {
        return;
      }
      await runMutation("학생 삭제", () => requestApi("DELETE", `/students/${studentPk}`));
      return;
    }

    if (actionButton.dataset.action === "delete-area" && areaId) {
      const area = state.areas.find((item) => String(item.area_id) === String(areaId));
      if (!window.confirm(`${area?.name ?? "선택한 구역"}을(를) 삭제할까요?`)) {
        return;
      }
      await runMutation("구역 삭제", () => requestApi("DELETE", `/areas/${areaId}`));
      return;
    }

    if (actionButton.dataset.action === "delete-schedule" && scheduleId) {
      const schedule = state.schedules.find((item) => String(item.schedule_id) === String(scheduleId));
      if (
        !window.confirm(
          `${schedule?.cleaning_date ?? `일정 ${scheduleId}`}을(를) 삭제할까요? 연결된 배정과 교환 요청도 함께 삭제됩니다.`,
        )
      ) {
        return;
      }
      await runMutation("일정 삭제", () => requestApi("DELETE", `/schedules/${scheduleId}`));
      return;
    }

    if (actionButton.dataset.action === "delete-assignment" && assignmentId) {
      if (!window.confirm(`#${assignmentId} 배정을 삭제할까요? 연결된 교환 요청도 함께 삭제됩니다.`)) {
        return;
      }
      await runMutation("배정 삭제", () => requestApi("DELETE", `/assignments/${assignmentId}`));
      return;
    }

    if (actionButton.dataset.action === "delete-trade" && requestId) {
      if (!window.confirm(`#${requestId} 교환 요청을 삭제할까요?`)) {
        return;
      }
      await runMutation("교환 요청 삭제", () => requestApi("DELETE", `/trades/${requestId}`));
    }
  });
}

function bindForms() {
  elements.formSearchAssignments.addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("배정표 조회", async () => {
      state.assignmentFilter.studentId = cleanText(elements.assignmentFilterStudentId.value);
      state.assignmentFilter.name = cleanText(elements.assignmentFilterName.value);
      await refreshEntity("assignments", { silent: false });
    });
  });

  elements.resetAssignmentsFilter.addEventListener("click", async () => {
    await guardForm("배정표 조회 초기화", async () => {
      state.assignmentFilter.studentId = "";
      state.assignmentFilter.name = "";
      await refreshEntity("assignments", { silent: false });
    });
  });

  $("#formCreateSchedule").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("일정 생성", async () => {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const result = await runMutation("일정 생성", () =>
        requestApi("POST", "/schedules/", {
          query: {
            start_date: cleanText(formData.get("start_date")),
            end_date: cleanText(formData.get("end_date")),
          },
        }),
      );
      if (result?.ok) {
        form.reset();
        const createdSchedules = Array.isArray(result.payload?.schedules) ? result.payload.schedules : [];
        const lastCreatedSchedule = createdSchedules[createdSchedules.length - 1];
        focusScheduleRow(lastCreatedSchedule?.schedule_id);
      }
    });
  });

  elements.scheduleUpdateScheduleId.addEventListener("change", () => {
    syncScheduleUpdateForm();
  });

  elements.studentUpdateStudentPk.addEventListener("change", () => {
    syncStudentUpdateForm();
  });

  elements.areaUpdateAreaId.addEventListener("change", () => {
    syncAreaUpdateForm();
  });

  $("#formAutoAssign").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("자동 배정", async () => {
      await runMutation("자동 배정", () => requestApi("POST", "/assignments/"));
    });
  });

  $("#formBulkDeleteAssignments").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("배정 일괄 삭제", async () => {
      const scheduleId = parseOptionalInt(elements.bulkDeleteScheduleId.value);
      const targetLabel =
        scheduleId === undefined
          ? "전체 배정"
          : state.schedules.find((item) => item.schedule_id === scheduleId)?.cleaning_date ?? `일정 ${scheduleId}`;

      if (!window.confirm(`${targetLabel}의 배정을 삭제할까요? 연결된 교환 요청도 함께 삭제됩니다.`)) {
        return;
      }

      await runMutation("배정 일괄 삭제", () =>
        requestApi("DELETE", "/assignments/", {
          query: scheduleId === undefined ? undefined : { schedule_id: scheduleId },
        }),
      );
    });
  });

  $("#formUpdateAssignmentStatus").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("배정 상태 변경", async () => {
      const assignmentId = parseRequiredInt(elements.statusAssignmentId.value, "배정 ID");
      const status = cleanText(elements.statusValue.value);
      await runMutation("배정 상태 변경", () =>
        requestApi("PATCH", `/assignments/${assignmentId}/status`, { query: { status } }),
      );
    });
  });

  $("#formUpdateSchedule").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("일정 수정", async () => {
      const scheduleId = parseRequiredInt(elements.scheduleUpdateScheduleId.value, "일정");
      const payload = {};

      const cleaningDate = cleanText(elements.scheduleEditDate.value);
      const status = cleanText(elements.scheduleEditStatus.value);

      if (cleaningDate) {
        payload.cleaning_date = cleaningDate;
      }
      if (status) {
        payload.status = status;
      }

      if (!Object.keys(payload).length) {
        throw new Error("수정할 일자 또는 상태를 입력하세요.");
      }

      const result = await runMutation("일정 수정", () =>
        requestApi("PATCH", `/schedules/${scheduleId}`, {
          body: payload,
        }),
      );

      if (result?.ok) {
        focusScheduleRow(scheduleId);
      }
    });
  });

  $("#formReassignCanceled").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("취소 배정 재할당", async () => {
      const assignmentId = parseRequiredInt(elements.reassignAssignmentId.value, "취소 배정 ID");
      await runMutation("취소 배정 재할당", () =>
        requestApi("POST", `/assignments/${assignmentId}/reassign`),
      );
    });
  });

  $("#formCreateTrade").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("교환 요청 생성", async () => {
      const requesterAssignmentId = parseRequiredInt(elements.tradeRequesterId.value, "신청자 배정 ID");
      const targetAssignmentId = parseRequiredInt(elements.tradeTargetId.value, "대상 배정 ID");

      if (requesterAssignmentId === targetAssignmentId) {
        throw new Error("신청자 배정과 대상 배정은 달라야 합니다.");
      }

      await runMutation("교환 요청 생성", () =>
        requestApi("POST", "/trades/", {
          body: {
            requester_assignment_id: requesterAssignmentId,
            target_assignment_id: targetAssignmentId,
          },
        }),
      );
    });
  });

  $("#formProcessTrade").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("교환 요청 처리", async () => {
      const requestId = parseRequiredInt(elements.tradeRequestId.value, "요청 ID");
      const status = cleanText(elements.tradeDecision.value);
      await runMutation("교환 요청 처리", () =>
        requestApi("PATCH", `/trades/${requestId}`, { body: { status } }),
      );
    });
  });

  $("#formAddStudent").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("학생 등록", async () => {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const result = await runMutation("학생 등록", () =>
        requestApi("POST", "/students/", {
          body: {
            student_id: cleanText(formData.get("student_id")),
            name: cleanText(formData.get("name")),
            grade: parseRequiredInt(formData.get("grade"), "학년"),
            status: cleanText(formData.get("status")) || undefined,
            role: cleanText(formData.get("role")) || undefined,
          },
        }),
      );
      if (result?.ok) {
        form.reset();
        focusStudentRow(result.payload?.student?.student_pk);
      }
    });
  });

  $("#formUpdateStudentStatus").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("학생 상태 변경", async () => {
      const studentPk = parseRequiredInt(elements.studentStatusStudentPk.value, "학생");
      const status = cleanText(elements.studentStatusValue.value);
      const result = await runMutation("학생 상태 변경", () =>
        requestApi("PATCH", `/students/${studentPk}`, {
          body: {
            status,
          },
        }),
      );
      if (result?.ok) {
        elements.studentStatusValue.value = "";
      }
    });
  });

  $("#formUpdateStudent").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("학생 수정", async () => {
      const studentPk = parseRequiredInt(elements.studentUpdateStudentPk.value, "학생");
      const payload = {};

      const studentId = cleanText(elements.studentEditStudentId.value);
      const name = cleanText(elements.studentEditName.value);
      const grade = parseOptionalInt(elements.studentEditGrade.value);
      const status = cleanText(elements.studentEditStatus.value);
      const role = cleanText(elements.studentEditRole.value);

      if (studentId) {
        payload.student_id = studentId;
      }
      if (name) {
        payload.name = name;
      }
      if (grade !== undefined) {
        payload.grade = grade;
      }
      if (status) {
        payload.status = status;
      }
      if (role) {
        payload.role = role;
      }

      if (!Object.keys(payload).length) {
        throw new Error("수정할 값을 1개 이상 입력하세요.");
      }

      await runMutation("학생 수정", () =>
        requestApi("PATCH", `/students/${studentPk}`, {
          body: payload,
        }),
      );
    });
  });

  $("#formAddArea").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("구역 등록", async () => {
      const form = event.currentTarget;
      const formData = new FormData(form);
      const targetGrades = parseCsvNumbers(formData.get("target_grades"));
      if (!targetGrades) {
        throw new Error("대상 학년을 1개 이상 입력하세요. 예: 1,2");
      }

      const result = await runMutation("구역 등록", () =>
        requestApi("POST", "/areas/", {
          body: {
            name: cleanText(formData.get("name")),
            need_peoples: parseRequiredInt(formData.get("need_peoples"), "필요 인원"),
            target_grades: targetGrades,
          },
        }),
      );
      if (result?.ok) {
        form.reset();
        focusAreaRow(result.payload?.area?.area_id);
      }
    });
  });

  $("#formUpdateArea").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("구역 수정", async () => {
      const areaId = parseRequiredInt(elements.areaUpdateAreaId.value, "구역");
      const payload = {};

      const name = cleanText(elements.areaEditName.value);
      const needPeoples = parseOptionalInt(elements.areaEditNeedPeoples.value);
      const targetGradesText = cleanText(elements.areaEditTargetGrades.value);

      if (name) {
        payload.name = name;
      }
      if (needPeoples !== undefined) {
        payload.need_peoples = needPeoples;
      }
      if (targetGradesText) {
        const targetGrades = parseCsvNumbers(targetGradesText);
        if (!targetGrades) {
          throw new Error("대상 학년을 1개 이상 입력하세요. 예: 1,2");
        }
        payload.target_grades = targetGrades;
      }

      if (!Object.keys(payload).length) {
        throw new Error("수정할 값을 1개 이상 입력하세요.");
      }

      await runMutation("구역 수정", () =>
        requestApi("PATCH", `/areas/${areaId}`, {
          body: payload,
        }),
      );
    });
  });
}

function bindTopActions() {
  $("#applyBaseUrl").addEventListener("click", async () => {
    elements.baseUrl.value = normalizeBaseUrl();

    try {
      await refreshAll({ silent: true });
      setServerState(`Base URL 적용 및 동기화 완료: ${elements.baseUrl.value}`, true);
    } catch (error) {
      showClientError("Base URL 적용", error);
      setServerState(`Base URL 적용 실패: ${elements.baseUrl.value}`, false);
    }
  });

  $("#healthBtn").addEventListener("click", async () => {
    try {
      const result = await requestApi("GET", "/health");
      showResult("헬스체크", result);
      setServerState(
        result.ok ? "API 연결 정상" : `API 응답 오류 (${result.status})`,
        result.ok,
      );
    } catch (error) {
      showClientError("헬스체크", error);
      setServerState("API 연결 실패", false);
    }
  });

  $("#refreshAllBtn").addEventListener("click", async () => {
    try {
      await refreshAll({ silent: false });
    } catch (error) {
      showClientError("전체 동기화", error);
    }
  });
}

async function bootstrap() {
  bindTopActions();
  bindPanelRefreshButtons();
  bindQuickActions();
  bindForms();

  try {
    await refreshAll({ silent: true });
    setServerState("초기 데이터 동기화 완료", true);
  } catch (error) {
    showClientError("초기 동기화", error);
    setServerState("초기 동기화 실패", false);
  }
}

bootstrap();
