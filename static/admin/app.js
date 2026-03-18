// 관리자 페이지 앱
if (!requireAuth()) throw new Error("Not authenticated");

const user = getStoredUser();
if (user.role !== "관리자") { window.location.href = "/user"; throw new Error("Not admin"); }

document.getElementById("userInfo").textContent = `${user.name} (${user.role})`;

// ===== 상태 =====
const state = { students: [], areas: [], schedules: [], assignments: [], trades: [] };

// ===== 유틸 =====
const alertEl = document.getElementById("alert");
function showAlert(msg, type = "error") {
  alertEl.className = "alert alert-" + type;
  alertEl.textContent = msg;
  alertEl.style.display = "block";
  setTimeout(() => alertEl.style.display = "none", 5000);
}

function studentName(pk) {
  const s = state.students.find(s => s.student_pk === pk);
  return s ? `${s.name}(${s.student_id})` : `#${pk}`;
}
function areaName(id) {
  const a = state.areas.find(a => a.area_id === id);
  return a ? a.name : `#${id}`;
}
function scheduleDate(id) {
  const s = state.schedules.find(s => s.schedule_id === id);
  return s ? s.cleaning_date : `#${id}`;
}

// ===== 탭 =====
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

// ===== 데이터 로드 =====
async function loadAll() {
  try {
    const [students, areas, schedules, assignments, trades] = await Promise.all([
      api("GET", "/students/"),
      api("GET", "/areas/"),
      api("GET", "/schedules/"),
      api("GET", "/assignments/"),
      api("GET", "/trades/"),
    ]);
    state.students = students || [];
    state.areas = areas || [];
    state.schedules = schedules || [];
    state.assignments = assignments || [];
    state.trades = trades || [];
    renderAll();
  } catch (err) {
    showAlert("데이터 로드 실패: " + err.message);
  }
}

function renderAll() {
  renderStudents();
  renderAreas();
  renderSchedules();
  renderAssignments();
  renderTrades();
  syncSelectors();
}

// ===== 학생 렌더링 =====
function renderStudents() {
  const search = (document.getElementById("studentSearch").value || "").toLowerCase();
  const filtered = state.students.filter(s =>
    s.student_id.toLowerCase().includes(search) || s.name.toLowerCase().includes(search)
  );
  document.getElementById("studentsTable").innerHTML = filtered.length === 0
    ? `<tr><td colspan="7" class="empty-state">학생이 없습니다</td></tr>`
    : filtered.map(s => `<tr>
        <td>${s.student_pk}</td>
        <td>${escapeHtml(s.student_id)}</td>
        <td>${escapeHtml(s.name)}</td>
        <td>${s.grade}</td>
        <td>${statusBadge(s.status)}</td>
        <td>${escapeHtml(s.role)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editStudent(${s.student_pk})">수정</button>
          <button class="btn btn-sm btn-danger" onclick="deleteStudent(${s.student_pk})">삭제</button>
        </td>
      </tr>`).join("");
}

document.getElementById("studentSearch").addEventListener("input", renderStudents);

// ===== 구역 렌더링 =====
function renderAreas() {
  document.getElementById("areasTable").innerHTML = state.areas.length === 0
    ? `<tr><td colspan="5" class="empty-state">구역이 없습니다</td></tr>`
    : state.areas.map(a => `<tr>
        <td>${a.area_id}</td>
        <td>${escapeHtml(a.name)}</td>
        <td>${a.need_peoples}</td>
        <td>${a.target_grades.join(", ")}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editArea(${a.area_id})">수정</button>
          <button class="btn btn-sm btn-danger" onclick="deleteArea(${a.area_id})">삭제</button>
        </td>
      </tr>`).join("");
}

// ===== 일정 렌더링 =====
function renderSchedules() {
  document.getElementById("schedulesTable").innerHTML = state.schedules.length === 0
    ? `<tr><td colspan="4" class="empty-state">일정이 없습니다</td></tr>`
    : state.schedules.map(s => `<tr>
        <td>${s.schedule_id}</td>
        <td>${s.cleaning_date}</td>
        <td>${statusBadge(s.status)}</td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="editSchedule(${s.schedule_id})">수정</button>
          <button class="btn btn-sm btn-danger" onclick="deleteSchedule(${s.schedule_id})">삭제</button>
        </td>
      </tr>`).join("");
}

// ===== 배정 렌더링 =====
function renderAssignments() {
  const filterSch = document.getElementById("assignmentFilterSchedule").value;
  let filtered = state.assignments;
  if (filterSch) filtered = filtered.filter(a => a.schedule_id === parseInt(filterSch));

  document.getElementById("assignmentsTable").innerHTML = filtered.length === 0
    ? `<tr><td colspan="6" class="empty-state">배정이 없습니다</td></tr>`
    : filtered.map(a => `<tr>
        <td>${a.assignment_id}</td>
        <td>${scheduleDate(a.schedule_id)}</td>
        <td>${studentName(a.student_pk)}</td>
        <td>${areaName(a.area_id)}</td>
        <td>${statusBadge(a.status)}</td>
        <td>
          <select onchange="updateAssignmentStatus(${a.assignment_id}, this.value)" style="padding:4px;border-radius:4px;border:1px solid var(--border)">
            <option value="" selected disabled>상태 변경</option>
            <option value="배정">배정</option>
            <option value="완료">완료</option>
            <option value="취소">취소</option>
            <option value="불이행">불이행</option>
          </select>
          <button class="btn btn-sm btn-outline" onclick="reassignAssignment(${a.assignment_id})">재배정</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAssignment(${a.assignment_id})">삭제</button>
        </td>
      </tr>`).join("");
}

// ===== 교환 렌더링 =====
function renderTrades() {
  document.getElementById("tradesTable").innerHTML = state.trades.length === 0
    ? `<tr><td colspan="5" class="empty-state">교환 요청이 없습니다</td></tr>`
    : state.trades.map(t => `<tr>
        <td>${t.request_id}</td>
        <td>${t.requester_assignment_id}</td>
        <td>${t.target_assignment_id}</td>
        <td>${statusBadge(t.status)}</td>
        <td>${t.status === "대기" ? `
          <button class="btn btn-sm btn-success" onclick="updateTrade(${t.request_id}, '수락')">수락</button>
          <button class="btn btn-sm btn-warning" onclick="updateTrade(${t.request_id}, '거절')">거절</button>
          <button class="btn btn-sm btn-outline" onclick="updateTrade(${t.request_id}, '취소')">취소</button>
        ` : ""}
          <button class="btn btn-sm btn-danger" onclick="deleteTrade(${t.request_id})">삭제</button>
        </td>
      </tr>`).join("");
}

// ===== 셀렉터 동기화 =====
function syncSelectors() {
  const schOpts = state.schedules.map(s => `<option value="${s.schedule_id}">${s.cleaning_date} (${s.status})</option>`).join("");
  document.getElementById("deleteScheduleSelect").innerHTML = `<option value="">일정 선택...</option>` + schOpts;
  document.getElementById("assignmentFilterSchedule").innerHTML = `<option value="">전체 일정</option>` + schOpts;
}

document.getElementById("assignmentFilterSchedule").addEventListener("change", renderAssignments);

// ===== CRUD 액션 =====

// 학생 등록
document.getElementById("addStudentForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/students/", { body: {
      student_id: fd.get("student_id"),
      name: fd.get("name"),
      grade: parseInt(fd.get("grade")),
      role: fd.get("role"),
    }});
    e.target.reset();
    showAlert("학생이 등록되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 구역 등록
document.getElementById("addAreaForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/areas/", { body: {
      name: fd.get("name"),
      need_peoples: parseInt(fd.get("need_peoples")),
      target_grades: fd.get("target_grades").split(",").map(Number),
    }});
    e.target.reset();
    showAlert("구역이 등록되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 일정 생성
document.getElementById("addScheduleForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/schedules/", { query: {
      start_date: fd.get("start_date"),
      end_date: fd.get("end_date"),
    }});
    e.target.reset();
    showAlert("일정이 생성되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 교환 등록
document.getElementById("addTradeForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    await api("POST", "/trades/", { body: {
      requester_assignment_id: parseInt(fd.get("requester_assignment_id")),
      target_assignment_id: parseInt(fd.get("target_assignment_id")),
    }});
    e.target.reset();
    showAlert("교환 요청이 등록되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 자동 배정
document.getElementById("autoAssignBtn").addEventListener("click", async () => {
  try {
    const result = await api("POST", "/assignments/");
    showAlert("자동 배정이 완료되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 일정별 배정 삭제
document.getElementById("deleteAssignmentsBtn").addEventListener("click", async () => {
  const schId = document.getElementById("deleteScheduleSelect").value;
  if (!schId) { showAlert("일정을 선택해주세요."); return; }
  if (!confirm("선택한 일정의 모든 배정을 삭제하시겠습니까?")) return;
  try {
    await api("DELETE", "/assignments/", { query: { schedule_id: schId } });
    showAlert("배정이 삭제되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 전체 배정 일괄 삭제
document.getElementById("deleteAllAssignmentsBtn").addEventListener("click", async () => {
  if (!confirm("모든 배정을 삭제하시겠습니까? 관련 교환도 함께 삭제됩니다.")) return;
  try {
    await api("DELETE", "/assignments/");
    showAlert("전체 배정이 삭제되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 개별 삭제 함수들
async function deleteStudent(pk) {
  if (!confirm("이 학생을 삭제하시겠습니까?")) return;
  try { await api("DELETE", `/students/${pk}`); showAlert("삭제되었습니다.", "success"); await loadAll(); }
  catch (err) { showAlert(err.message); }
}
async function deleteArea(id) {
  if (!confirm("이 구역을 삭제하시겠습니까?")) return;
  try { await api("DELETE", `/areas/${id}`); showAlert("삭제되었습니다.", "success"); await loadAll(); }
  catch (err) { showAlert(err.message); }
}
async function deleteSchedule(id) {
  if (!confirm("이 일정을 삭제하시겠습니까? 관련 배정도 삭제됩니다.")) return;
  try { await api("DELETE", `/schedules/${id}`); showAlert("삭제되었습니다.", "success"); await loadAll(); }
  catch (err) { showAlert(err.message); }
}
async function deleteAssignment(id) {
  if (!confirm("이 배정을 삭제하시겠습니까?")) return;
  try { await api("DELETE", `/assignments/${id}`); showAlert("삭제되었습니다.", "success"); await loadAll(); }
  catch (err) { showAlert(err.message); }
}
async function deleteTrade(id) {
  if (!confirm("이 교환 요청을 삭제하시겠습니까?")) return;
  try { await api("DELETE", `/trades/${id}`); showAlert("삭제되었습니다.", "success"); await loadAll(); }
  catch (err) { showAlert(err.message); }
}

// 배정 상태 변경
async function updateAssignmentStatus(id, status) {
  if (!status) return;
  try {
    await api("PATCH", `/assignments/${id}/status`, { query: { status } });
    showAlert("상태가 변경되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
}

// 재배정
async function reassignAssignment(id) {
  try {
    await api("POST", `/assignments/${id}/reassign`);
    showAlert("재배정이 완료되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
}

// 교환 상태 변경
async function updateTrade(id, status) {
  try {
    await api("PATCH", `/trades/${id}`, { body: { status } });
    showAlert(`교환이 ${status}되었습니다.`, "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
}

// ===== 수정 모달 =====
let editContext = null;

function closeModal() {
  document.getElementById("editModal").style.display = "none";
  editContext = null;
}

function openModal(title, fields, onSave) {
  editContext = onSave;
  document.getElementById("editModalTitle").textContent = title;
  const form = document.getElementById("editForm");
  form.innerHTML = fields.map(f => `
    <div class="form-group">
      <label>${f.label}</label>
      ${f.type === "select"
        ? `<select name="${f.name}">${f.options.map(o => `<option value="${o.value}" ${o.value === f.value ? "selected" : ""}>${o.label}</option>`).join("")}</select>`
        : `<input name="${f.name}" value="${escapeHtml(String(f.value || ""))}" type="${f.type || "text"}">`
      }
    </div>
  `).join("");
  document.getElementById("editModal").style.display = "flex";
}

document.getElementById("editSubmitBtn").addEventListener("click", async () => {
  if (!editContext) return;
  const form = document.getElementById("editForm");
  const fd = new FormData(form);
  const data = {};
  for (const [k, v] of fd.entries()) data[k] = v;
  try {
    await editContext(data);
    closeModal();
    showAlert("수정되었습니다.", "success");
    await loadAll();
  } catch (err) { showAlert(err.message); }
});

// 학생 수정
function editStudent(pk) {
  const s = state.students.find(s => s.student_pk === pk);
  if (!s) return;
  openModal("학생 수정", [
    { name: "student_id", label: "학번", value: s.student_id },
    { name: "name", label: "이름", value: s.name },
    { name: "grade", label: "학년", value: s.grade, type: "number" },
    { name: "status", label: "상태", type: "select", value: s.status, options: [
      { value: "재학", label: "재학" }, { value: "휴학", label: "휴학" }, { value: "졸업", label: "졸업" },
    ]},
    { name: "role", label: "역할", type: "select", value: s.role, options: [
      { value: "학생", label: "학생" }, { value: "관리자", label: "관리자" },
    ]},
  ], async (data) => {
    await api("PATCH", `/students/${pk}`, { body: {
      student_id: data.student_id,
      name: data.name,
      grade: parseInt(data.grade),
      status: data.status,
      role: data.role,
    }});
  });
}

// 구역 수정
function editArea(id) {
  const a = state.areas.find(a => a.area_id === id);
  if (!a) return;
  openModal("구역 수정", [
    { name: "name", label: "구역명", value: a.name },
    { name: "need_peoples", label: "필요 인원", value: a.need_peoples, type: "number" },
    { name: "target_grades", label: "대상 학년 (쉼표 구분)", value: a.target_grades.join(",") },
  ], async (data) => {
    await api("PATCH", `/areas/${id}`, { body: {
      name: data.name,
      need_peoples: parseInt(data.need_peoples),
      target_grades: data.target_grades.split(",").map(Number),
    }});
  });
}

// 일정 수정
function editSchedule(id) {
  const s = state.schedules.find(s => s.schedule_id === id);
  if (!s) return;
  openModal("일정 수정", [
    { name: "cleaning_date", label: "청소일", value: s.cleaning_date, type: "date" },
    { name: "status", label: "상태", type: "select", value: s.status, options: [
      { value: "예정", label: "예정" }, { value: "완료", label: "완료" }, { value: "취소", label: "취소" },
    ]},
  ], async (data) => {
    await api("PATCH", `/schedules/${id}`, { body: {
      cleaning_date: data.cleaning_date,
      status: data.status,
    }});
  });
}

// 모달 외부 클릭 닫기
document.getElementById("editModal").addEventListener("click", (e) => {
  if (e.target.id === "editModal") closeModal();
});

// ===== 초기 로드 =====
loadAll();
