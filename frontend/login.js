document.getElementById('loginBtn').addEventListener('click', () => {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    alert('Please enter username and password');
    return;
  }

  // For demo purposes, accept any credentials
  localStorage.setItem('username', username);
  window.location.href = 'main.html';
});
