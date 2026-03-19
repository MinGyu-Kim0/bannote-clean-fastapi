// 이미 로그인 되어 있으면 리다이렉트
(function checkExisting() {
  const token = getToken();
  const user = getStoredUser();
  if (token && user) {
    window.location.href = user.role === "관리자" ? "/admin" : "/user";
  }
})();

// URL 쿼리스트링에 학번이 있으면 미리 채움
(function prefillStudentId() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id) {
    const input = document.getElementById("studentId");
    input.value = id;
    input.readOnly = true;
    document.getElementById("newPassword").focus();
  }
})();

const alertEl = document.getElementById("alert");

function showAlert(msg, type = "error") {
  alertEl.className = "alert alert-" + type;
  alertEl.textContent = msg;
  alertEl.style.display = "block";
}

function hideAlert() {
  alertEl.style.display = "none";
}

document.getElementById("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const studentId = document.getElementById("studentId").value.trim();
  const newPw = document.getElementById("newPassword").value;
  const confirmPw = document.getElementById("confirmPassword").value;

  if (newPw !== confirmPw) {
    showAlert("비밀번호가 일치하지 않습니다.");
    return;
  }

  try {
    const data = await api("POST", "/auth/setup-password", {
      body: { student_id: studentId, password: newPw },
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    window.location.href = data.user.role === "관리자" ? "/admin" : "/user";
  } catch (err) {
    if (err.message.includes("이미 비밀번호가 설정되어 있습니다")) {
      showAlert("이미 비밀번호가 설정된 계정입니다. 로그인 페이지에서 로그인해주세요.");
    } else {
      showAlert(err.message);
    }
  }
});
