// 이미 로그인 되어 있으면 리다이렉트
(function checkExisting() {
  const token = getToken();
  const user = getStoredUser();
  if (token && user) {
    window.location.href = user.role === "관리자" ? "/admin" : "/user";
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

function showLogin() {
  document.getElementById("loginForm").style.display = "";
  document.getElementById("setupForm").style.display = "none";
  hideAlert();
}

function showSetup(studentId) {
  document.getElementById("loginForm").style.display = "none";
  document.getElementById("setupForm").style.display = "";
  document.getElementById("setupStudentId").value = studentId;
  document.getElementById("newPassword").focus();
}

// 로그인 폼
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const studentId = document.getElementById("studentId").value.trim();
  const password = document.getElementById("password").value;

  try {
    const data = await api("POST", "/auth/login", {
      body: { student_id: studentId, password: password },
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    window.location.href = data.user.role === "관리자" ? "/admin" : "/user";
  } catch (err) {
    if (err.message.includes("비밀번호가 설정되지 않았습니다")) {
      showSetup(studentId);
      showAlert("초기 비밀번호를 설정해주세요.", "info");
    } else {
      showAlert(err.message);
    }
  }
});

// 비밀번호 설정 폼
document.getElementById("setupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAlert();

  const studentId = document.getElementById("setupStudentId").value;
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
    showAlert(err.message);
  }
});
