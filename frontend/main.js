window.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  if (!username) {
    window.location.href = 'login.html';
    return;
  }

  const userInfo = document.getElementById('userInfo');
  userInfo.textContent = `Logged in as: ${username}`;
});
