document.getElementById('loginBtn').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const verificationCode = document.getElementById('verificationCode').value.trim();

  // For demo purposes, accept any credentials
  localStorage.setItem('username', username);
  localStorage.setItem('verificationCode', verificationCode);
  window.location.href = 'main.html';
});
