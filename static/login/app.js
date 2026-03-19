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

async function doLogin() {
  hideAlert();

  const studentId = document.getElementById("studentId").value.trim();
  const password = document.getElementById("password").value;

  if (!studentId || !password) {
    showAlert("학번과 비밀번호를 입력해주세요.");
    return;
  }

  try {
    const data = await api("POST", "/auth/login", {
      body: { student_id: studentId, password: password },
    });
    setToken(data.access_token);
    setStoredUser(data.user);
    window.location.href = data.user.role === "관리자" ? "/admin" : "/user";
  } catch (err) {
    if (err.message.includes("비밀번호가 설정되지 않았습니다")) {
      showAlert("비밀번호가 설정되지 않은 계정입니다. 비밀번호 설정 후 로그인해주세요.");
    } else {
      showAlert(err.message);
    }
  }
}

document.getElementById("loginBtn").addEventListener("click", doLogin);

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});
