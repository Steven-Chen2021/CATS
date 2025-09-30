<template>
  <div class="app-root">
    <div v-if="!isLoggedIn" class="login-container">
      <form class="login-box" @submit.prevent="handleLogin">
        <h1 class="login-title">Login</h1>
        <label class="form-label" for="username">User ID</label>
        <input
          id="username"
          v-model="form.username"
          class="form-input"
          type="text"
          autocomplete="username"
          placeholder="Enter your user ID"
          required
        />
        <label class="form-label" for="password">Password</label>
        <input
          id="password"
          v-model="form.password"
          class="form-input"
          type="password"
          autocomplete="current-password"
          placeholder="Enter your password"
          required
        />
        <label class="form-label" for="verificationCode">Verification Code</label>
        <input
          id="verificationCode"
          v-model="form.verificationCode"
          class="form-input"
          type="text"
          placeholder="Enter your verification code"
          required
        />
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <button class="primary-button" type="submit">Login</button>
      </form>
    </div>

    <div v-else class="dashboard-root">
      <header class="top-bar">
        <div class="top-bar-left">
          <button
            class="toggle-nav-button"
            type="button"
            :aria-expanded="!isNavCollapsed"
            aria-controls="mainNavigation"
            @click="toggleNavigation"
          >
            {{ isNavCollapsed ? '顯示選單' : '隱藏選單' }}
          </button>
          <div class="logo" aria-hidden="true">🐱</div>
        </div>
        <div class="user-info">
          <span class="user-label">Logged in as:</span>
          <span class="user-name">{{ storedUser }}</span>
          <button class="secondary-button" type="button" @click="handleLogout">Logout</button>
        </div>
      </header>
      <main class="main-layout">
        <nav
          v-show="!isNavCollapsed"
          id="mainNavigation"
          class="side-nav"
          aria-label="Main navigation"
          :aria-hidden="isNavCollapsed"
        >
          <ul class="nav-list">
            <li
              v-for="section in menuSections"
              :key="section.title"
              class="nav-item"
            >
              <div class="nav-item-title">{{ section.title }}</div>
              <ul v-if="section.links?.length" class="nav-sublist">
                <li
                  v-for="link in section.links"
                  :key="link.href"
                  class="nav-subitem"
                >
                  <a
                    class="nav-subitem-link"
                    :class="{ 'is-active': activeHref === link.href }"
                    :href="link.href"
                    :aria-current="activeHref === link.href ? 'page' : undefined"
                    @click.prevent="handleSelectLink(link.href)"
                  >
                    {{ link.label }}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
        <section class="dashboard">
          <div
            v-if="activeContent"
            key="content"
            class="dashboard-content"
            v-html="activeContent"
          />
          <p v-else class="dashboard-placeholder">
            請從左側選擇一個項目以載入對應內容。
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';

const STORAGE_KEYS = {
  username: 'username',
  verificationCode: 'verificationCode',
};

const menuSections = [
  {
    title: '系統參數定義',
    links: [
      { label: '組織架構設定', href: 'pages/organization-structure.html' },
      { label: '據點設定', href: 'pages/site-settings.html' },
      { label: '排放源類型設定', href: 'pages/emission-source-types.html' },
      {
        label: '排放源與據點關聯管理',
        href: 'pages/emission-source-site-association.html',
      },
      { label: '排放源實例管理', href: 'pages/emission-source-instances.html' },
      { label: '計算因子管理', href: 'pages/calculation-factors.html' },
      { label: '審核流程定義', href: 'pages/review-process.html' },
    ],
  },
  {
    title: '資料蒐集',
    links: [
      { label: '固定燃燒排放源 (發電機)', href: 'pages/stationary-combustion.html' },
      { label: '移動排放源 (公務汽車、貨車)', href: 'pages/mobile-sources.html' },
      {
        label: '逸散性排放(飲水機、滅火器、補滅火器)',
        href: 'pages/fugitive-emissions.html',
      },
      { label: '化糞池', href: 'pages/septic-tank.html' },
      {
        label: '輸入電力的間接排放 (辦公室用電)',
        href: 'pages/indirect-electricity.html',
      },
      {
        label: '上游運輸物流經常耗材',
        href: 'pages/upstream-logistics-consumables.html',
      },
      {
        label: '上游運輸辦公耗材',
        href: 'pages/upstream-office-consumables.html',
      },
      { label: '商務差旅', href: 'pages/business-travel.html' },
      {
        label: '採購商品或服務－倉儲堆高機',
        href: 'pages/purchased-goods-services-forklift.html',
      },
      {
        label: '燃料與能源相關活動外購能源',
        href: 'pages/fuel-energy-related.html',
      },
      { label: '物流貨物運輸', href: 'pages/logistics-goods-transport.html' },
      { label: '物流運輸排放 (陸運)', href: 'pages/logistics-transport-land.html' },
      { label: '物流運輸排放 (海運)', href: 'pages/logistics-transport-sea.html' },
      { label: '物流運輸排放 (空運)', href: 'pages/logistics-transport-air.html' },
    ],
  },
  {
    title: '清冊簡表',
    links: [{ label: '清冊簡表', href: 'pages/inventory-summary.html' }],
  },
];

const isLoggedIn = ref(false);
const isNavCollapsed = ref(false);
const errorMessage = ref('');

const form = reactive({
  username: '',
  password: '',
  verificationCode: '',
});

const storedUser = computed(
  () => form.username || localStorage.getItem(STORAGE_KEYS.username) || ''
);

const pageModules = import.meta.glob('../pages/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

// Programmatic page initializers for pages that previously relied on inline scripts
const pageInitializers: Record<string, () => void> = {};

// Lazy-load initializer modules and register them keyed by href used in the menu
import('./page-inits/organization-structure').then((m) => (pageInitializers['pages/organization-structure.html'] = m.initOrganizationStructure)).catch(() => {});
import('./page-inits/site-settings')
  .then((m) => (pageInitializers['pages/site-settings.html'] = m.initSiteSettings))
  .catch(() => {});
import('./page-inits/emission-source-types')
  .then(
    (m) =>
      (pageInitializers['pages/emission-source-types.html'] =
        m.initEmissionSourceTypes)
  )
  .catch(() => {});
import('./page-inits/emission-source-site-association')
  .then(
    (m) =>
      (pageInitializers['pages/emission-source-site-association.html'] =
        m.initEmissionSourceSiteAssociation)
  )
  .catch(() => {});
import('./page-inits/upstream-logistics-consumables')
  .then(
    (m) =>
      (pageInitializers['pages/upstream-logistics-consumables.html'] =
        m.initUpstreamLogisticsConsumables)
  )
  .catch(() => {});

const activeHref = ref('');
const activeContent = ref('');

onMounted(() => {
  const username = localStorage.getItem(STORAGE_KEYS.username);
  const verificationCode = localStorage.getItem(STORAGE_KEYS.verificationCode);

  if (username && verificationCode) {
    form.username = username;
    form.verificationCode = verificationCode;
    isLoggedIn.value = true;
  }
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadDefaultContent();
  } else {
    activeHref.value = '';
    activeContent.value = '';
  }
});

function handleLogin() {
  if (!form.username || !form.password || !form.verificationCode) {
    errorMessage.value = 'Please fill out all required fields.';
    return;
  }

  errorMessage.value = '';
  localStorage.setItem(STORAGE_KEYS.username, form.username);
  localStorage.setItem(STORAGE_KEYS.verificationCode, form.verificationCode);
  isLoggedIn.value = true;
}

function handleLogout() {
  localStorage.removeItem(STORAGE_KEYS.username);
  localStorage.removeItem(STORAGE_KEYS.verificationCode);
  form.password = '';
  isNavCollapsed.value = false;
  isLoggedIn.value = false;
}

function handleSelectLink(href: string) {
  if (activeHref.value === href) {
    return;
  }
  setActiveContent(href);
}

function toggleNavigation() {
  isNavCollapsed.value = !isNavCollapsed.value;
}

function loadDefaultContent() {
  const firstSection = menuSections.find((section) => section.links?.length);
  const firstHref = firstSection?.links?.[0]?.href;

  if (firstHref) {
    setActiveContent(firstHref);
  }
}

function setActiveContent(href: string) {
  const moduleKey = getModuleKey(href);
  const html = moduleKey ? pageModules[moduleKey] : undefined;

  activeHref.value = href;
  activeContent.value =
    html || '<section class="page-content"><p>無法載入選取的內容。</p></section>';

  // Call page initializer if present. Use a microtask to ensure DOM has updated.
  Promise.resolve().then(() => {
    const init = pageInitializers[href];
    if (typeof init === 'function') {
      try {
        init();
      } catch (e) {
        console.error('Page initializer error for', href, e);
      }
    }
  });
}

function getModuleKey(href: string) {
  if (!href) return '';
  const normalized = href.replace(/^\/*/, '');
  const key = `../${normalized}`;
  return key in pageModules ? key : '';
}

if (isLoggedIn.value) {
  loadDefaultContent();
}
</script>

<style scoped>
.app-root {
  min-height: 100vh;
  background: #f5f7fa;
  color: #1f2933;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.login-box {
  width: min(360px, 100%);
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
  padding: 2.5rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  text-align: center;
  color: #1a202c;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: #4a5568;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}

.primary-button {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  border: none;
  color: white;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.75rem;
  border-radius: 10px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 18px rgba(37, 99, 235, 0.2);
}

.primary-button:active {
  transform: translateY(0);
}

.error-text {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #dc2626;
}

.dashboard-root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  background: #1f2937;
  color: #f9fafb;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-nav-button {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  background: transparent;
  border: 1px solid rgba(249, 250, 251, 0.4);
  border-radius: 9999px;
  color: inherit;
  padding: 0.4rem 0.85rem;
  font-size: 0.85rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.toggle-nav-button:hover,
.toggle-nav-button:focus {
  background: rgba(249, 250, 251, 0.12);
  border-color: rgba(249, 250, 251, 0.6);
  outline: none;
}

.logo {
  font-size: 1.75rem;
}

.user-info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  font-size: 0.95rem;
}

.user-label {
  opacity: 0.75;
}

.user-name {
  font-weight: 600;
}

.secondary-button {
  background: transparent;
  border: 1px solid rgba(249, 250, 251, 0.5);
  border-radius: 9999px;
  color: inherit;
  padding: 0.35rem 0.85rem;
  font-size: 0.9rem;
  cursor: pointer;
  transition: background 0.2s ease, color 0.2s ease;
}

.secondary-button:hover {
  background: rgba(249, 250, 251, 0.12);
}

.main-layout {
  display: flex;
  flex: 1;
  min-height: 0;
}

.side-nav {
  width: 220px;
  background: linear-gradient(180deg, #111827, #1f2937);
  color: #e5e7eb;
  padding: 1.5rem 1rem;
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.nav-item {
  padding: 0.75rem;
  border-radius: 10px;
  transition: background 0.2s ease;
  cursor: default;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.nav-item-title {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.nav-sublist {
  list-style: none;
  margin: 0;
  padding: 0 0 0 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.nav-subitem {
  font-size: 0.9rem;
  color: rgba(229, 231, 235, 0.85);
  line-height: 1.4;
}

.nav-subitem-link {
  display: block;
  color: inherit;
  text-decoration: none;
  padding: 0.3rem 0.4rem;
  border-radius: 6px;
  transition: background 0.2s ease, color 0.2s ease;
}

.nav-subitem-link:hover,
.nav-subitem-link:focus {
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  outline: none;
}

.nav-subitem-link.is-active {
  background: rgba(79, 70, 229, 0.35);
  color: #ffffff;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.dashboard {
  flex: 1;
  padding: 2rem;
  background: #f1f5f9;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-content {
  flex: 1;
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 20px 35px rgba(15, 23, 42, 0.08);
  padding: 2rem;
  overflow: auto;
  line-height: 1.7;
  color: #1f2933;
}

.dashboard-content :deep(h1),
.dashboard-content :deep(h2),
.dashboard-content :deep(h3) {
  color: #1f2937;
}

.dashboard-placeholder {
  margin: 0;
  color: #4b5563;
  font-size: 1rem;
}

@media (max-width: 768px) {
  .top-bar {
    flex-direction: column;
    gap: 0.75rem;
    text-align: center;
  }

  .top-bar-left {
    width: 100%;
    justify-content: space-between;
  }

  .toggle-nav-button {
    align-self: flex-start;
  }

  .main-layout {
    flex-direction: column;
  }

  .side-nav {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: stretch;
  }
}
</style>
