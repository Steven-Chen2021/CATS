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

  const resolveUrl = (path) => {
    const base = new URL('.', window.location.href);
    return new URL(path, base).toString();
  };

  const loadPage = (path) => {
    const url = resolveUrl(path);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load ${url}`);
        }
        return response.text();
      })
      .then((html) => {
        const template = document.createElement('template');
        template.innerHTML = html.trim();

        const fragment = template.content.cloneNode(true);
        const scripts = Array.from(fragment.querySelectorAll('script'));

        scripts.forEach((script) => script.parentNode?.removeChild(script));

        contentArea.innerHTML = '';
        contentArea.appendChild(fragment);

        scripts.forEach((script) => {
          const executableScript = document.createElement('script');

          Array.from(script.attributes).forEach((attr) => {
            executableScript.setAttribute(attr.name, attr.value);
          });

          if (script.textContent) {
            executableScript.textContent = script.textContent;
          }

          contentArea.appendChild(executableScript);
        });
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
      const target = event.currentTarget;
      const url = target.getAttribute('href');
      loadPage(url);

      menuLinks.forEach((menuLink) => menuLink.classList.remove('active'));
      target.classList.add('active');
    });
  });

  if (menuLinks.length > 0) {
    const firstLink = menuLinks[0];
    firstLink.classList.add('active');
    loadPage(firstLink.getAttribute('href'));
  }
});
