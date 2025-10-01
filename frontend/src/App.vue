<template>
  <div class="app-root">
    <div v-if="!isLoggedIn" class="login-container">
      <form class="login-box" @submit.prevent="handleLogin">
        <h1 class="login-title">{{ texts.login.title }}</h1>
        <label class="form-label" for="username">{{ texts.login.usernameLabel }}</label>
        <input
          id="username"
          v-model="form.username"
          class="form-input"
          type="text"
          autocomplete="username"
          :placeholder="texts.login.usernamePlaceholder"
          required
        />
        <label class="form-label" for="password">{{ texts.login.passwordLabel }}</label>
        <input
          id="password"
          v-model="form.password"
          class="form-input"
          type="password"
          autocomplete="current-password"
          :placeholder="texts.login.passwordPlaceholder"
          required
        />
        <label class="form-label" for="verificationCode">{{ texts.login.verificationCodeLabel }}</label>
        <input
          id="verificationCode"
          v-model="form.verificationCode"
          class="form-input"
          type="text"
          :placeholder="texts.login.verificationCodePlaceholder"
          required
        />
        <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
        <button class="primary-button" type="submit">{{ texts.login.submit }}</button>
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
            {{ isNavCollapsed ? texts.dashboard.showMenu : texts.dashboard.hideMenu }}
          </button>
          <div class="logo" aria-hidden="true">🐱</div>
        </div>
        <div class="top-bar-right">
          <div class="language-switcher">
            <label class="sr-only" for="language-select">{{ texts.languageSwitcher.label }}</label>
            <span aria-hidden="true" class="language-prefix">🌐</span>
            <select
              id="language-select"
              v-model="currentLanguage"
              class="language-select"
              :aria-label="texts.languageSwitcher.ariaLabel"
            >
              <option v-for="language in languageOptions" :key="language.code" :value="language.code">
                {{ language.label }}
              </option>
            </select>
          </div>
          <div class="user-info">
            <span class="user-label">{{ texts.dashboard.loggedInAs }}</span>
            <span class="user-name">{{ storedUser }}</span>
            <button class="secondary-button" type="button" @click="handleLogout">
              {{ texts.dashboard.logout }}
            </button>
          </div>
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
            {{ texts.dashboard.emptyState }}
          </p>
        </section>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue';

const STORAGE_KEYS = {
  username: 'username',
  verificationCode: 'verificationCode',
};

const LANGUAGE_STORAGE_KEY = 'preferredLanguage';

const languageOptions = [
  { code: 'zh-TW', label: '繁中', htmlLang: 'zh-Hant' },
  { code: 'zh-CN', label: '简中', htmlLang: 'zh-Hans' },
  { code: 'en', label: 'English', htmlLang: 'en' },
] as const;

const MENU_STRUCTURE = [
  {
    id: 'systemParameters',
    links: [
      { id: 'organizationStructure', href: 'pages/organization-structure.html' },
      { id: 'siteSettings', href: 'pages/site-settings.html' },
      { id: 'emissionSourceTypes', href: 'pages/emission-source-types.html' },
      {
        id: 'emissionSourceSiteAssociation',
        href: 'pages/emission-source-site-association.html',
      },
      { id: 'emissionSourceInstances', href: 'pages/emission-source-instances.html' },
      { id: 'calculationFactors', href: 'pages/calculation-factors.html' },
      { id: 'reviewProcess', href: 'pages/review-process.html' },
    ],
  },
  {
    id: 'dataCollection',
    links: [
      { id: 'stationaryCombustion', href: 'pages/stationary-combustion.html' },
      { id: 'mobileSources', href: 'pages/mobile-sources.html' },
      { id: 'fugitiveEmissions', href: 'pages/fugitive-emissions.html' },
      { id: 'septicTank', href: 'pages/septic-tank.html' },
      { id: 'indirectElectricity', href: 'pages/indirect-electricity.html' },
      { id: 'upstreamLogisticsConsumables', href: 'pages/upstream-logistics-consumables.html' },
      { id: 'upstreamOfficeConsumables', href: 'pages/upstream-office-consumables.html' },
      { id: 'businessTravel', href: 'pages/business-travel.html' },
      {
        id: 'purchasedGoodsServicesForklift',
        href: 'pages/purchased-goods-services-forklift.html',
      },
      { id: 'fuelEnergyRelated', href: 'pages/fuel-energy-related.html' },
      { id: 'logisticsGoodsTransport', href: 'pages/logistics-goods-transport.html' },
      { id: 'logisticsTransportLand', href: 'pages/logistics-transport-land.html' },
      { id: 'logisticsTransportSea', href: 'pages/logistics-transport-sea.html' },
      { id: 'logisticsTransportAir', href: 'pages/logistics-transport-air.html' },
    ],
  },
  {
    id: 'inventorySummary',
    links: [{ id: 'inventorySummaryLink', href: 'pages/inventory-summary.html' }],
  },
] as const;

const translations = {
  'zh-TW': {
    languageSwitcher: {
      label: '選擇語言',
      ariaLabel: '選擇介面語言',
    },
    login: {
      title: '登入',
      usernameLabel: '使用者帳號',
      usernamePlaceholder: '請輸入使用者帳號',
      passwordLabel: '密碼',
      passwordPlaceholder: '請輸入密碼',
      verificationCodeLabel: '驗證碼',
      verificationCodePlaceholder: '請輸入驗證碼',
      submit: '登入',
      validationRequired: '請填寫所有必填欄位。',
    },
    dashboard: {
      showMenu: '顯示選單',
      hideMenu: '隱藏選單',
      loggedInAs: '登入身分：',
      logout: '登出',
      emptyState: '請從左側選擇一個項目以載入對應內容。',
      loadErrorHtml: '<section class="page-content"><p>無法載入選取的內容。</p></section>',
    },
    menu: {
      sections: {
        systemParameters: '系統參數定義',
        dataCollection: '資料蒐集',
        inventorySummary: '清冊簡表',
      },
      links: {
        organizationStructure: '組織架構設定',
        siteSettings: '據點設定',
        emissionSourceTypes: '排放源類型設定',
        emissionSourceSiteAssociation: '排放源與據點關聯管理',
        emissionSourceInstances: '排放源實例管理',
        calculationFactors: '計算因子管理',
        reviewProcess: '審核流程定義',
        stationaryCombustion: '固定燃燒排放源 (發電機)',
        mobileSources: '移動排放源 (公務汽車、貨車)',
        fugitiveEmissions: '逸散性排放(飲水機、滅火器、補滅火器)',
        septicTank: '化糞池',
        indirectElectricity: '輸入電力的間接排放 (辦公室用電)',
        upstreamLogisticsConsumables: '上游運輸物流經常耗材',
        upstreamOfficeConsumables: '上游運輸辦公耗材',
        businessTravel: '商務差旅',
        purchasedGoodsServicesForklift: '採購商品或服務－倉儲堆高機',
        fuelEnergyRelated: '燃料與能源相關活動外購能源',
        logisticsGoodsTransport: '物流貨物運輸',
        logisticsTransportLand: '物流運輸排放 (陸運)',
        logisticsTransportSea: '物流運輸排放 (海運)',
        logisticsTransportAir: '物流運輸排放 (空運)',
        inventorySummaryLink: '清冊簡表',
      },
    },
  },
  'zh-CN': {
    languageSwitcher: {
      label: '选择语言',
      ariaLabel: '选择界面语言',
    },
    login: {
      title: '登录',
      usernameLabel: '用户账号',
      usernamePlaceholder: '请输入用户账号',
      passwordLabel: '密码',
      passwordPlaceholder: '请输入密码',
      verificationCodeLabel: '验证码',
      verificationCodePlaceholder: '请输入验证码',
      submit: '登录',
      validationRequired: '请填写所有必填栏位。',
    },
    dashboard: {
      showMenu: '显示选单',
      hideMenu: '隐藏选单',
      loggedInAs: '登录身份：',
      logout: '退出登录',
      emptyState: '请从左侧选择一个项目以载入对应内容。',
      loadErrorHtml: '<section class="page-content"><p>无法载入选取的内容。</p></section>',
    },
    menu: {
      sections: {
        systemParameters: '系统参数定义',
        dataCollection: '资料搜集',
        inventorySummary: '清册简表',
      },
      links: {
        organizationStructure: '组织架构设定',
        siteSettings: '据点设定',
        emissionSourceTypes: '排放源类型设定',
        emissionSourceSiteAssociation: '排放源与据点关联管理',
        emissionSourceInstances: '排放源实例管理',
        calculationFactors: '计算因子管理',
        reviewProcess: '审核流程定义',
        stationaryCombustion: '固定燃烧排放源 (发电机)',
        mobileSources: '移动排放源 (公务汽车、货车)',
        fugitiveEmissions: '逸散性排放(饮水机、灭火器、补灭火器)',
        septicTank: '化粪池',
        indirectElectricity: '输入电力的间接排放 (办公室用电)',
        upstreamLogisticsConsumables: '上游运输物流经常耗材',
        upstreamOfficeConsumables: '上游运输办公耗材',
        businessTravel: '商务差旅',
        purchasedGoodsServicesForklift: '采购商品或服务－仓储堆高机',
        fuelEnergyRelated: '燃料与能源相关活动外购能源',
        logisticsGoodsTransport: '物流货物运输',
        logisticsTransportLand: '物流运输排放 (陆运)',
        logisticsTransportSea: '物流运输排放 (海运)',
        logisticsTransportAir: '物流运输排放 (空运)',
        inventorySummaryLink: '清册简表',
      },
    },
  },
  en: {
    languageSwitcher: {
      label: 'Select language',
      ariaLabel: 'Choose interface language',
    },
    login: {
      title: 'Login',
      usernameLabel: 'User ID',
      usernamePlaceholder: 'Enter your user ID',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      verificationCodeLabel: 'Verification Code',
      verificationCodePlaceholder: 'Enter your verification code',
      submit: 'Login',
      validationRequired: 'Please fill out all required fields.',
    },
    dashboard: {
      showMenu: 'Show menu',
      hideMenu: 'Hide menu',
      loggedInAs: 'Logged in as:',
      logout: 'Logout',
      emptyState: 'Select an item on the left to load its content.',
      loadErrorHtml:
        '<section class="page-content"><p>Unable to load the selected content.</p></section>',
    },
    menu: {
      sections: {
        systemParameters: 'System Parameter Settings',
        dataCollection: 'Data Collection',
        inventorySummary: 'Inventory Summary',
      },
      links: {
        organizationStructure: 'Organization Structure Settings',
        siteSettings: 'Site Settings',
        emissionSourceTypes: 'Emission Source Type Settings',
        emissionSourceSiteAssociation: 'Emission Source & Site Association',
        emissionSourceInstances: 'Emission Source Instance Management',
        calculationFactors: 'Calculation Factor Management',
        reviewProcess: 'Review Process Definition',
        stationaryCombustion: 'Stationary Combustion Sources (Generators)',
        mobileSources: 'Mobile Sources (Company Cars & Trucks)',
        fugitiveEmissions: 'Fugitive Emissions (Dispensers & Extinguishers)',
        septicTank: 'Septic Tank',
        indirectElectricity: 'Indirect Electricity Emissions (Office Power)',
        upstreamLogisticsConsumables: 'Upstream Logistics Consumables',
        upstreamOfficeConsumables: 'Upstream Office Consumables',
        businessTravel: 'Business Travel',
        purchasedGoodsServicesForklift: 'Purchased Goods/Services – Warehouse Forklifts',
        fuelEnergyRelated: 'Fuel & Energy Activities - Purchased Energy',
        logisticsGoodsTransport: 'Logistics Goods Transport',
        logisticsTransportLand: 'Logistics Emissions (Land Transport)',
        logisticsTransportSea: 'Logistics Emissions (Sea Transport)',
        logisticsTransportAir: 'Logistics Emissions (Air Transport)',
        inventorySummaryLink: 'Inventory Summary',
      },
    },
  },
} as const;

const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
const defaultLanguage =
  languageOptions.find((option) => option.code === storedLanguage)?.code || 'zh-TW';

const currentLanguage = ref(defaultLanguage);

const texts = computed(() => translations[currentLanguage.value] || translations['zh-TW']);

type NavigationDetail = {
  href: string;
  site?: string;
  sourceType?: string;
};

const EMISSION_CONTEXT_STORAGE_KEY = 'catsSelectedEmissionContext';

const menuSections = computed(() => {
  const activeTexts = texts.value;
  return MENU_STRUCTURE.map((section) => ({
    title: activeTexts.menu.sections[section.id],
    links: section.links.map((link) => ({
      href: link.href,
      label: activeTexts.menu.links[link.id],
    })),
  }));
});

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
import('./page-inits/stationary-combustion')
  .then(
    (m) =>
      (pageInitializers['pages/stationary-combustion.html'] =
        m.initStationaryCombustion)
  )
  .catch(() => {});
import('./page-inits/inventory-summary')
  .then(
    (m) =>
      (pageInitializers['pages/inventory-summary.html'] =
        m.initInventorySummary)
  )
  .catch(() => {});
import('./page-inits/business-travel')
  .then(
    (m) =>
      (pageInitializers['pages/business-travel.html'] = m.initBusinessTravel)
  )
  .catch(() => {});
import('./page-inits/mobile-sources')
  .then((m) => (pageInitializers['pages/mobile-sources.html'] = m.initMobileSources))
  .catch(() => {});

const activeHref = ref('');
const activeContent = ref('');

function storeEmissionContext(detail: NavigationDetail | undefined) {
  if (!detail) {
    return;
  }

  const { site, sourceType } = detail;

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  if (!site && !sourceType) {
    sessionStorage.removeItem(EMISSION_CONTEXT_STORAGE_KEY);
    return;
  }

  try {
    sessionStorage.setItem(
      EMISSION_CONTEXT_STORAGE_KEY,
      JSON.stringify({ site: site || '', sourceType: sourceType || '' })
    );
  } catch (error) {
    console.warn('Failed to persist emission source context', error);
  }
}

function handleExternalNavigation(event: Event) {
  const customEvent = event as CustomEvent<NavigationDetail>;
  const detail = customEvent.detail;

  if (!detail?.href) {
    return;
  }

  storeEmissionContext(detail);
  isNavCollapsed.value = false;
  setActiveContent(detail.href);
}

onMounted(() => {
  const username = localStorage.getItem(STORAGE_KEYS.username);
  const verificationCode = localStorage.getItem(STORAGE_KEYS.verificationCode);

  if (username && verificationCode) {
    form.username = username;
    form.verificationCode = verificationCode;
    isLoggedIn.value = true;
  }

  window.addEventListener('cats:navigate', handleExternalNavigation as EventListener);
});

onUnmounted(() => {
  window.removeEventListener('cats:navigate', handleExternalNavigation as EventListener);
});

watch(isLoggedIn, (loggedIn) => {
  if (loggedIn) {
    loadDefaultContent();
  } else {
    activeHref.value = '';
    activeContent.value = '';
  }
});

watch(
  currentLanguage,
  (lang) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    const htmlLang =
      languageOptions.find((option) => option.code === lang)?.htmlLang || 'zh-Hant';
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('lang', htmlLang);
    }
    if (errorMessage.value) {
      errorMessage.value = texts.value.login.validationRequired;
    }
  },
  { immediate: true }
);

function handleLogin() {
  if (!form.username || !form.password || !form.verificationCode) {
    errorMessage.value = texts.value.login.validationRequired;
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
  storeEmissionContext({ href });
  setActiveContent(href);
}

function toggleNavigation() {
  isNavCollapsed.value = !isNavCollapsed.value;
}

function loadDefaultContent() {
  const firstSection = menuSections.value.find((section) => section.links?.length);
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
    html || texts.value.dashboard.loadErrorHtml;

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

.top-bar-right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.language-switcher {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: 9999px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(249, 250, 251, 0.2);
}

.language-prefix {
  font-size: 0.95rem;
}

.language-select {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 0.9rem;
  cursor: pointer;
}

.language-select:focus {
  outline: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
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
