// 공통 API 래퍼 및 인증 토큰 관리

const API_BASE = window.location.origin;

function getToken() {
  return localStorage.getItem("access_token");
}

function setToken(token) {
  localStorage.setItem("access_token", token);
}

function getStoredUser() {
  const raw = localStorage.getItem("user");
  return raw ? JSON.parse(raw) : null;
}

function setStoredUser(user) {
  localStorage.setItem("user", JSON.stringify(user));
}

function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

function requireAuth() {
  if (!getToken()) {
    window.location.href = "/login";
    return false;
  }
  return true;
}

async function api(method, path, { query, body } = {}) {
  let url = API_BASE + path;

  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== null && v !== undefined && v !== "") params.append(k, v);
    }
    const qs = params.toString();
    if (qs) url += "?" + qs;
  }

  const headers = {};
  const token = getToken();
  if (token) headers["Authorization"] = "Bearer " + token;

  const opts = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(url, opts);

  if (res.status === 401) {
    logout();
    return null;
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const msg = payload?.detail || `HTTP ${res.status} 오류`;
    throw new Error(msg);
  }

  return payload;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function statusBadge(value) {
  const cls = {
    "배정": "badge-assigned",
    "완료": "badge-done",
    "취소": "badge-cancelled",
    "불이행": "badge-noncompliant",
    "예정": "badge-scheduled",
    "대기": "badge-pending",
    "수락": "badge-accepted",
    "거절": "badge-rejected",
  }[value] || "badge-default";
  return `<span class="badge ${cls}">${escapeHtml(value)}</span>`;
}
