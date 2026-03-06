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
  statusAssignmentId: $("#statusAssignmentId"),
  reassignAssignmentId: $("#reassignAssignmentId"),
  tradeRequesterId: $("#tradeRequesterId"),
  tradeTargetId: $("#tradeTargetId"),
  tradeRequestId: $("#tradeRequestId"),
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
  추노: "status-추노",
  대기: "status-대기",
  수락: "status-수락",
  거절: "status-거절",
};

const defaultBaseUrl =
  window.location.origin && window.location.origin !== "null"
    ? window.location.origin
    : "mock";

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
    { schedule_id: 1, cleaning_date: "2026-03-06" },
    { schedule_id: 2, cleaning_date: "2026-03-13" },
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
  const studentPk = toOptionalNumber(query.student_pk);
  const studentId = cleanText(query.student_id);
  const name = cleanText(query.name);
  const grade = toOptionalNumber(query.grade);
  const status = cleanText(query.status) || "재학";
  const role = cleanText(query.role) || "학생";

  if (studentPk === undefined || !studentId || !name || grade === undefined) {
    throw createMockHttpError(400, "학생 생성에 필요한 값이 부족합니다.");
  }

  if (mockStore.students.some((student) => student.student_pk === studentPk || student.student_id === studentId)) {
    throw createMockHttpError(400, "이미 존재하는 학생입니다.");
  }

  mockStore.students.push({
    student_pk: studentPk,
    student_id: studentId,
    name,
    grade,
    status,
    role,
  });

  return {
    message: `${name} 학생(${studentId})이 추가되었습니다.`,
    student_id: studentId,
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
  const areaId = toOptionalNumber(query.area_id);
  const name = cleanText(query.name);
  const needPeoples = toOptionalNumber(query.need_peoples);
  const targetGrades = parseMockTargetGrades(query.target_grades);

  if (areaId === undefined || !name || needPeoples === undefined || !targetGrades.length) {
    throw createMockHttpError(400, "구역 생성에 필요한 값이 부족합니다.");
  }
  if (needPeoples < 1) {
    throw createMockHttpError(400, "필요 인원수는 1 이상이어야 합니다.");
  }
  if (mockStore.areas.some((area) => area.area_id === areaId || area.name === name)) {
    throw createMockHttpError(400, "이미 존재하는 구역입니다.");
  }

  mockStore.areas.push({
    area_id: areaId,
    name,
    need_peoples: needPeoples,
    target_grades: targetGrades,
  });

  return { message: `${name} 추가 되었습니다.`, name };
}

function getMockSchedules({ schedule_id: scheduleId, cleaning_date: cleaningDate } = {}) {
  const numericScheduleId = toOptionalNumber(scheduleId);
  const normalizedCleaningDate = cleanText(cleaningDate);

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
    const newSchedule = { schedule_id: nextId, cleaning_date: cleaningDate };
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
  if (!mockStore.schedules.length) {
    throw createMockHttpError(400, "생성된 일정이 없어 배정을 진행할 수 없습니다.");
  }

  let nextId = getNextMockId(mockStore.assignments, "assignment_id");
  const fairnessCounts = buildMockFairnessCounts();
  let totalCreatedCount = 0;
  const results = [];
  const skippedScheduleIds = [];
  const totalUnfilledNeeds = [];

  for (const schedule of [...mockStore.schedules].sort((left, right) => left.schedule_id - right.schedule_id)) {
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
      assignment.status !== "추노",
  ).length;
}

function updateMockAssignmentStatus(assignmentId, status) {
  const allowedStatuses = new Set(["배정", "완료", "취소", "추노"]);
  const assignment = getMockAssignmentOrError(assignmentId);
  if (!allowedStatuses.has(status)) {
    throw createMockHttpError(400, "유효하지 않은 청소 현황 값입니다.");
  }

  assignment.status = status;
  return {
    message: "청소 현황이 수정되었습니다.",
    assignment,
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
      return toMockResponse(addMockStudent(query), 201);
    }
  }

  if (normalizedPath === "/areas") {
    if (method === "GET") {
      return toMockResponse(mockStore.areas);
    }
    if (method === "POST") {
      return toMockResponse(addMockArea(query), 201);
    }
  }

  if (normalizedPath === "/schedules") {
    if (method === "GET") {
      return toMockResponse(getMockSchedules(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockSchedules(query), 201);
    }
  }

  if (normalizedPath === "/assignments") {
    if (method === "GET") {
      return toMockResponse(getMockAssignments(query));
    }
    if (method === "POST") {
      return toMockResponse(addMockAssignments(), 201);
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
    elements.studentsRows.innerHTML = `<tr><td colspan="5">데이터 없음</td></tr>`;
    return;
  }

  elements.studentsRows.innerHTML = state.students
    .map(
      (student) => `
        <tr>
          <td>${student.student_pk}</td>
          <td>${escapeHtml(student.student_id)}</td>
          <td>${escapeHtml(student.name)}</td>
          <td>${student.grade}</td>
          <td>${renderStatus(student.status)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderAreas() {
  if (!state.areas.length) {
    elements.areasRows.innerHTML = `<tr><td colspan="4">데이터 없음</td></tr>`;
    return;
  }

  elements.areasRows.innerHTML = state.areas
    .map(
      (area) => `
        <tr>
          <td>${area.area_id}</td>
          <td>${escapeHtml(area.name)}</td>
          <td>${area.need_peoples}</td>
          <td>${escapeHtml((area.target_grades || []).join(", "))}</td>
        </tr>
      `,
    )
    .join("");
}

function renderSchedules() {
  if (!state.schedules.length) {
    elements.schedulesRows.innerHTML = `<tr><td colspan="2">데이터 없음</td></tr>`;
    return;
  }

  elements.schedulesRows.innerHTML = state.schedules
    .map(
      (schedule) => `
        <tr>
          <td>${schedule.schedule_id}</td>
          <td>${escapeHtml(schedule.cleaning_date)}</td>
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

  elements.assignmentsRows.innerHTML = assignments
    .map((assignment) => {
      const student = studentsMap.get(assignment.student_pk);
      const area = areasMap.get(assignment.area_id);
      const studentName = student ? `${student.name}(${student.student_pk})` : `PK ${assignment.student_pk}`;
      const areaName = area ? `${area.name}(${area.area_id})` : `구역 ${assignment.area_id}`;

      return `
        <tr>
          <td>${assignment.assignment_id}</td>
          <td>${assignment.schedule_id}</td>
          <td>${escapeHtml(areaName)}</td>
          <td>${escapeHtml(studentName)}</td>
          <td>${renderStatus(assignment.status)}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn" data-action="set-requester" data-assignment-id="${assignment.assignment_id}">신청자</button>
              <button type="button" class="mini-btn alt" data-action="set-target" data-assignment-id="${assignment.assignment_id}">대상자</button>
              <button type="button" class="mini-btn warn" data-action="set-status-target" data-assignment-id="${assignment.assignment_id}">상태</button>
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
          `
          : `<button type="button" class="mini-btn" data-action="pick-trade" data-request-id="${trade.request_id}">선택</button>`;

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
  const previousStatusAssignmentId = elements.statusAssignmentId.value;
  const previousReassignAssignmentId = elements.reassignAssignmentId.value;
  const previousTradeRequesterId = elements.tradeRequesterId.value;
  const previousTradeTargetId = elements.tradeTargetId.value;
  const previousTradeRequestId = elements.tradeRequestId.value;

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
    elements.tradeRequestId,
    pendingTradeOptions,
    pendingTradeOptions.length ? "요청 선택" : "대기 요청 없음",
    previousTradeRequestId,
  );
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

    if (actionButton.dataset.action === "set-requester" && assignmentId) {
      elements.tradeRequesterId.value = assignmentId;
      return;
    }

    if (actionButton.dataset.action === "set-target" && assignmentId) {
      elements.tradeTargetId.value = assignmentId;
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
      const formData = new FormData(event.currentTarget);
      const result = await runMutation("일정 생성", () =>
        requestApi("POST", "/schedules/", {
          query: {
            start_date: cleanText(formData.get("start_date")),
            end_date: cleanText(formData.get("end_date")),
          },
        }),
      );
      if (result?.ok) {
        event.currentTarget.reset();
      }
    });
  });

  $("#formAutoAssign").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("자동 배정", async () => {
      await runMutation("자동 배정", () => requestApi("POST", "/assignments/"));
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
      const formData = new FormData(event.currentTarget);
      const result = await runMutation("학생 등록", () =>
        requestApi("POST", "/students/", {
          query: {
            student_pk: parseRequiredInt(formData.get("student_pk"), "학생 PK"),
            student_id: cleanText(formData.get("student_id")),
            name: cleanText(formData.get("name")),
            grade: parseRequiredInt(formData.get("grade"), "학년"),
            status: cleanText(formData.get("status")) || undefined,
            role: cleanText(formData.get("role")) || undefined,
          },
        }),
      );
      if (result?.ok) {
        event.currentTarget.reset();
      }
    });
  });

  $("#formAddArea").addEventListener("submit", async (event) => {
    event.preventDefault();
    await guardForm("구역 등록", async () => {
      const formData = new FormData(event.currentTarget);
      const targetGrades = parseCsvNumbers(formData.get("target_grades"));
      if (!targetGrades) {
        throw new Error("대상 학년을 1개 이상 입력하세요. 예: 1,2");
      }

      const result = await runMutation("구역 등록", () =>
        requestApi("POST", "/areas/", {
          query: {
            area_id: parseRequiredInt(formData.get("area_id"), "구역 ID"),
            name: cleanText(formData.get("name")),
            need_peoples: parseRequiredInt(formData.get("need_peoples"), "필요 인원"),
            target_grades: targetGrades,
          },
        }),
      );
      if (result?.ok) {
        event.currentTarget.reset();
      }
    });
  });
}

function bindTopActions() {
  $("#applyBaseUrl").addEventListener("click", () => {
    elements.baseUrl.value = normalizeBaseUrl();
    setServerState(`Base URL 적용: ${elements.baseUrl.value}`, true);
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
