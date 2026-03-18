// 유저 페이지 앱
if (!requireAuth()) throw new Error("Not authenticated");

const user = getStoredUser();
document.getElementById("userInfo").textContent = `${user.name} (${user.student_id})`;

const state = { myAssignments: [], areas: [], schedules: [], trades: [], peerAssignments: [], studentNames: {} };
const myPk = user.student_pk;
const peerAssignmentsBody = document.getElementById("peerAssignments");
const targetAssignmentInput = document.getElementById("targetAssignmentId");

const alertEl = document.getElementById("alert");
function showAlert(msg, type = "error") {
  alertEl.className = "alert alert-" + type;
  alertEl.textContent = msg;
  alertEl.style.display = "block";
  setTimeout(() => alertEl.style.display = "none", 5000);
}

function studentName(pk) {
  return state.studentNames[pk] || `#${pk}`;
}
function areaName(id) {
  const a = state.areas.find(a => a.area_id === id);
  return a ? a.name : `#${id}`;
}
function scheduleDate(id) {
  const s = state.schedules.find(s => s.schedule_id === id);
  return s ? s.cleaning_date : `#${id}`;
}

function renderTradeCandidateMessage(message) {
  peerAssignmentsBody.innerHTML = `<tr><td colspan="6" class="empty-state">${message}</td></tr>`;
}

function resetTradeCandidates(message = "내 배정을 선택하면 다른 일정의 교환 가능 배정을 볼 수 있습니다.") {
  state.peerAssignments = [];
  targetAssignmentInput.value = "";
  renderTradeCandidateMessage(message);
}

// ===== 데이터 로드 =====
async function loadAll() {
  try {
    const [assignments, areas, schedules, trades, studentNames] = await Promise.all([
      api("GET", "/assignments/", { query: { student_pk: myPk } }),
      api("GET", "/areas/"),
      api("GET", "/schedules/"),
      api("GET", "/trades/"),
      api("GET", "/students/names"),
    ]);
    state.myAssignments = assignments || [];
    state.areas = areas || [];
    state.schedules = schedules || [];
    state.studentNames = studentNames || {};

    // 내 배정 ID 목록
    const myAssignmentIds = new Set(state.myAssignments.map(a => a.assignment_id));
    // 나와 관련된 교환만 필터
    state.trades = (trades || []).filter(t =>
      myAssignmentIds.has(t.requester_assignment_id) || myAssignmentIds.has(t.target_assignment_id)
    );

    renderAll();
  } catch (err) {
    showAlert("데이터 로드 실패: " + err.message);
  }
}

function renderAll() {
  renderMyAssignments();
  renderMyTrades();
  syncAssignmentSelector();
  resetTradeCandidates();
}

// ===== 내 배정표 =====
function renderMyAssignments() {
  const tbody = document.getElementById("myAssignments");
  if (state.myAssignments.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="empty-state">배정된 청소가 없습니다</td></tr>`;
    return;
  }
  tbody.innerHTML = state.myAssignments.map(a => `<tr>
    <td>${a.assignment_id}</td>
    <td>${scheduleDate(a.schedule_id)}</td>
    <td>${areaName(a.area_id)}</td>
    <td>${statusBadge(a.status)}</td>
  </tr>`).join("");
}

// ===== 배정 셀렉터 =====
function syncAssignmentSelector() {
  const sel = document.getElementById("myAssignmentSelect");
  const activeAssignments = state.myAssignments.filter(a => a.status === "배정");
  sel.innerHTML = `<option value="">배정 선택...</option>` +
    activeAssignments.map(a =>
      `<option value="${a.assignment_id}">${scheduleDate(a.schedule_id)} - ${areaName(a.area_id)} (ID: ${a.assignment_id})</option>`
    ).join("");
}

function selectTradeTarget(assignmentId) {
  targetAssignmentInput.value = assignmentId;
}

// 배정 선택 시 다른 일정 교환 후보 보기
document.getElementById("myAssignmentSelect").addEventListener("change", async (e) => {
  const assignmentId = parseInt(e.target.value);
  if (!assignmentId) {
    resetTradeCandidates();
    return;
  }

  const myAssignment = state.myAssignments.find(a => a.assignment_id === assignmentId);
  if (!myAssignment) {
    resetTradeCandidates("선택한 배정을 찾을 수 없습니다.");
    return;
  }

  try {
    const peers = await api("GET", "/assignments/", { query: { status: "배정" } });
    const others = (peers || []).filter(a => {
      if (a.assignment_id === myAssignment.assignment_id) return false;
      if (a.student_pk === myPk || a.status === "취소") return false;
      if (a.schedule_id === myAssignment.schedule_id) return false;
      const area = state.areas.find(ar => ar.area_id === a.area_id);
      return area && area.target_grades.includes(user.grade);
    });
    state.peerAssignments = others;

    if (others.length === 0) {
      renderTradeCandidateMessage("교환 가능한 다른 일정 배정이 없습니다.");
    } else {
      peerAssignmentsBody.innerHTML = others.map(a => `<tr>
        <td>${a.assignment_id}</td>
        <td>${studentName(a.student_pk)}</td>
        <td>${scheduleDate(a.schedule_id)}</td>
        <td>${areaName(a.area_id)}</td>
        <td>${statusBadge(a.status)}</td>
        <td><button type="button" class="btn btn-sm btn-outline" onclick="selectTradeTarget(${a.assignment_id})">선택</button></td>
      </tr>`).join("");
    }
  } catch (err) {
    renderTradeCandidateMessage("조회 실패");
  }
});

// ===== 내 교환 내역 =====
function renderMyTrades() {
  const tbody = document.getElementById("myTrades");
  const myAssignmentIds = new Set(state.myAssignments.map(a => a.assignment_id));

  if (state.trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">교환 내역이 없습니다</td></tr>`;
    return;
  }

  tbody.innerHTML = state.trades.map(t => {
    const isSent = myAssignmentIds.has(t.requester_assignment_id);
    const direction = isSent
      ? `<span class="direction-sent">보낸 요청</span>`
      : `<span class="direction-received">받은 요청</span>`;
    const myId = isSent ? t.requester_assignment_id : t.target_assignment_id;
    const otherId = isSent ? t.target_assignment_id : t.requester_assignment_id;

    let actions = "";
    if (t.status === "대기") {
      if (isSent) {
        actions = `<button class="btn btn-sm btn-outline" onclick="cancelTrade(${t.request_id})">취소</button>`;
      } else {
        actions = `
          <button class="btn btn-sm btn-success" onclick="respondTrade(${t.request_id}, '수락')">수락</button>
          <button class="btn btn-sm btn-danger" onclick="respondTrade(${t.request_id}, '거절')">거절</button>
        `;
      }
    }

    return `<tr>
      <td>${t.request_id}</td>
      <td>${myId}</td>
      <td>${otherId}</td>
      <td>${direction}</td>
      <td>${statusBadge(t.status)}</td>
      <td>${actions}</td>
    </tr>`;
  }).join("");
}

// ===== 교환 액션 =====

// 교환 요청
document.getElementById("tradeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/trades/", { body: {
      requester_assignment_id: parseInt(fd.get("requester_assignment_id")),
      target_assignment_id: parseInt(fd.get("target_assignment_id")),
    }});
    e.target.reset();
    resetTradeCandidates();
    showAlert("교환 요청이 전송되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 교환 취소 (보낸 요청)
async function cancelTrade(requestId) {
  try {
    await api("PATCH", `/trades/${requestId}`, { body: { status: "취소" } });
    showAlert("교환 요청이 취소되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
}

// 교환 응답 (받은 요청)
async function respondTrade(requestId, status) {
  try {
    await api("PATCH", `/trades/${requestId}`, { body: { status } });
    showAlert(`교환이 ${status}되었습니다.`, "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
}

// ===== 초기 로드 =====
loadAll();
