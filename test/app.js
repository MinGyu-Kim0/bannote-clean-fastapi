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
    : "http://127.0.0.1:8000";

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

function buildUrl(path, query = undefined) {
  const url = new URL(`${normalizeBaseUrl()}${path}`);

  if (!query) {
    return url;
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

  return url;
}

async function requestApi(method, path, { query, body } = {}) {
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
  if (!state.assignments.length) {
    elements.assignmentsRows.innerHTML = `<tr><td colspan="6">데이터 없음</td></tr>`;
    return;
  }

  const studentsMap = new Map(state.students.map((student) => [student.student_pk, student]));
  const areasMap = new Map(state.areas.map((area) => [area.area_id, area]));

  elements.assignmentsRows.innerHTML = state.assignments
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
  renderStudents();
  renderAreas();
  renderSchedules();
  renderAssignments();
  renderTrades();
  syncSelectors();
  renderKpis();
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
