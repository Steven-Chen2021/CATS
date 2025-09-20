window.addEventListener('DOMContentLoaded', () => {
  const username = localStorage.getItem('username');
  if (!username) {
    window.location.href = 'login.html';
    return;
  }

  const userInfo = document.getElementById('userInfo');
  userInfo.textContent = `Logged in as: ${username}`;

  const contentArea = document.getElementById('contentArea');
  const menuLinks = document.querySelectorAll('.menu-link');

  const loadPage = (url) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${url}`);
        }
        return response.text();
      })
      .then((html) => {
        contentArea.innerHTML = html;
      })
      .catch((error) => {
        console.error(error);
        contentArea.innerHTML =
          '<p class="error-message">Unable to load the requested page.</p>';
      });
  };

  menuLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const url = link.getAttribute('href');
      loadPage(url);

      menuLinks.forEach((menuLink) => menuLink.classList.remove('active'));
      link.classList.add('active');
    });
  });

  if (menuLinks.length > 0) {
    const firstLink = menuLinks[0];
    firstLink.classList.add('active');
    loadPage(firstLink.getAttribute('href'));
  }
});
