const INVENTORY_YEARS = ['2023', '2024', '2025'];

const SITE_HIERARCHY = [
  {
    country: '台灣',
    regions: [
      { name: '北部區域', sites: ['台北總部', '松山辦公室'] },
      { name: '中部區域', sites: ['台中營運處'] },
      { name: '南部區域', sites: ['高雄營運中心'] },
    ],
  },
  {
    country: '日本',
    regions: [{ name: '關東區域', sites: ['東京辦公室'] }],
  },
];

const EMISSION_SOURCES = [
  { id: '1.1', name: '固定燃燒排放源 (發電機)' },
  { id: '1.2', name: '移動排放源 (公務汽車、貨車)' },
  { id: '1.4A', name: '逸散性排放 (飲水機)' },
  { id: '1.4B', name: '逸散性排放 (滅火器)' },
  { id: '1.4C', name: '逸散性排放 (補滅火器)' },
  { id: '1.5', name: '化糞池' },
  { id: '2.1', name: '輸入電力的間接排放 (辦公室用電)' },
  { id: '3.1A', name: '上游運輸物流經常耗材' },
  { id: '3.1B', name: '上游運輸辦公耗材' },
  { id: '3.3L', name: '物流運輸排放 (陸運)' },
  { id: '3.3S', name: '物流運輸排放 (海運)' },
  { id: '3.3A', name: '物流運輸排放 (空運)' },
  { id: '3.5', name: '商務差旅' },
  { id: '4.1', name: '採購商品或服務－倉儲堆高機' },
  { id: '4.3', name: '燃料與能源相關活動外購能源' },
];

type AssociationStore = Record<string, { sources: string[]; updatedAt: string }>;

type Option = { value: string; label: string };

type Selection = {
  year: string;
  country: string;
  region: string;
  site: string;
};

function getAssociationStore(): AssociationStore {
  const globalWindow = window as typeof window & {
    __emissionSourceSiteAssociations?: AssociationStore;
  };

  if (!globalWindow.__emissionSourceSiteAssociations) {
    globalWindow.__emissionSourceSiteAssociations = {};
  }

  return globalWindow.__emissionSourceSiteAssociations;
}

function populateSelect(select: HTMLSelectElement, options: Option[], placeholder: string) {
  const currentValue = select.value;
  select.innerHTML = '';

  const placeholderOption = document.createElement('option');
  placeholderOption.value = '';
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    select.appendChild(optionEl);
  });

  if (options.some((option) => option.value === currentValue)) {
    select.value = currentValue;
  } else {
    select.value = '';
  }

  select.disabled = options.length === 0;
}

export function initEmissionSourceSiteAssociation() {
  const form = document.getElementById('siteAssociationFilters') as HTMLFormElement | null;
  const yearSelect = document.getElementById('inventoryYearSelect') as HTMLSelectElement | null;
  const countrySelect = document.getElementById('countrySelect') as HTMLSelectElement | null;
  const regionSelect = document.getElementById('regionSelect') as HTMLSelectElement | null;
  const siteSelect = document.getElementById('siteSelect') as HTMLSelectElement | null;
  const errorMessage = document.getElementById('filterErrorMessage');
  const resultCard = document.getElementById('associationResultCard');
  const summaryEl = document.getElementById('selectionSummary');
  const listContainer = document.getElementById('emissionSourceList');
  const saveButton = document.getElementById('saveAssociationButton') as HTMLButtonElement | null;
  const statusMessage = document.getElementById('saveStatusMessage');

  if (
    !form ||
    !yearSelect ||
    !countrySelect ||
    !regionSelect ||
    !siteSelect ||
    !resultCard ||
    !summaryEl ||
    !listContainer ||
    !saveButton ||
    !statusMessage
  ) {
    return;
  }

  populateSelect(
    yearSelect,
    INVENTORY_YEARS.map((year) => ({ value: year, label: `${year} 年` })),
    '請選擇盤查年度'
  );

  populateSelect(
    countrySelect,
    SITE_HIERARCHY.map((item) => ({ value: item.country, label: item.country })),
    '請選擇國家'
  );

  const store = getAssociationStore();
  let currentKey = '';
  let currentSelection = new Set<string>();
  let clearStatusTimeout: number | undefined;

  function resetResultCard(message: string) {
    resultCard.classList.add('is-inactive');
    listContainer.innerHTML = '';
    saveButton.disabled = true;
    summaryEl.textContent = message;
  }

  function setError(message: string) {
    if (errorMessage) {
      errorMessage.textContent = message;
    }
  }

  function clearError() {
    if (errorMessage) {
      errorMessage.textContent = '';
    }
  }

  function clearStatus() {
    if (clearStatusTimeout) {
      window.clearTimeout(clearStatusTimeout);
      clearStatusTimeout = undefined;
    }
    statusMessage.textContent = '';
  }

  function updateRegions() {
    const country = countrySelect.value;
    const countryConfig = SITE_HIERARCHY.find((item) => item.country === country);
    const options = countryConfig
      ? countryConfig.regions.map((region) => ({ value: region.name, label: region.name }))
      : [];
    populateSelect(regionSelect, options, country ? '請選擇區域' : '請先選擇國家');

    if (!country) {
      populateSelect(siteSelect, [], '請先選擇區域');
    }
  }

  function updateSites() {
    const country = countrySelect.value;
    const region = regionSelect.value;
    const countryConfig = SITE_HIERARCHY.find((item) => item.country === country);
    const regionConfig = countryConfig?.regions.find((item) => item.name === region);
    const options = regionConfig
      ? regionConfig.sites.map((site) => ({ value: site, label: site }))
      : [];
    populateSelect(siteSelect, options, region ? '請選擇站點' : '請先選擇區域');
  }

  function formatSelectionSummary(selection: Selection) {
    return `盤查年度 ${selection.year} · ${selection.country} / ${selection.region} / ${selection.site}`;
  }

  function renderSourceList(selection: Selection) {
    listContainer.innerHTML = '';

    EMISSION_SOURCES.forEach((source) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'source-row';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = source.id;
      checkbox.checked = currentSelection.has(source.id);
      checkbox.addEventListener('change', () => {
        if (checkbox.checked) {
          currentSelection.add(source.id);
        } else {
          currentSelection.delete(source.id);
        }
      });

      const info = document.createElement('div');
      info.className = 'source-info';

      const name = document.createElement('span');
      name.className = 'source-name';
      name.textContent = source.name;

      const meta = document.createElement('span');
      meta.className = 'source-meta';
      meta.textContent = `類型代碼：${source.id}`;

      info.appendChild(name);
      info.appendChild(meta);
      wrapper.appendChild(checkbox);
      wrapper.appendChild(info);
      listContainer.appendChild(wrapper);
    });

    if (!listContainer.children.length) {
      const emptyMessage = document.createElement('p');
      emptyMessage.textContent = '目前沒有可供關聯的排放源。';
      emptyMessage.className = 'source-meta';
      listContainer.appendChild(emptyMessage);
    }

    summaryEl.textContent = formatSelectionSummary(selection);
    resultCard.classList.remove('is-inactive');
    saveButton.disabled = false;
  }

  function handleConfirm(event: Event) {
    event.preventDefault();
    clearStatus();

    const selection: Selection = {
      year: yearSelect.value,
      country: countrySelect.value,
      region: regionSelect.value,
      site: siteSelect.value,
    };

    if (!selection.year) {
      resetResultCard('請先選擇盤查年度。');
      setError('請選擇盤查年度。');
      return;
    }

    if (!selection.country || !selection.region || !selection.site) {
      resetResultCard('請完整選擇國家、區域與站點。');
      setError('請完整選擇國家、區域與站點。');
      return;
    }

    clearError();

    currentKey = [selection.year, selection.country, selection.region, selection.site].join('|');
    const stored = store[currentKey];
    currentSelection = new Set(stored?.sources ?? []);

    renderSourceList(selection);
  }

  function handleSave() {
    if (!currentKey) {
      setError('請先確認條件後再儲存。');
      return;
    }

    clearError();

    const sources = Array.from(currentSelection).sort();
    store[currentKey] = { sources, updatedAt: new Date().toISOString() };

    const message = sources.length
      ? `已儲存 ${sources.length} 項排放源關聯。`
      : '已儲存，目前無勾選排放源。';

    statusMessage.textContent = message;

    clearStatusTimeout = window.setTimeout(() => {
      if (statusMessage.textContent === message) {
        statusMessage.textContent = '';
      }
      clearStatusTimeout = undefined;
    }, 4000);
  }

  updateRegions();
  updateSites();

  countrySelect.addEventListener('change', () => {
    updateRegions();
    updateSites();
  });

  regionSelect.addEventListener('change', () => {
    updateSites();
  });

  form.addEventListener('submit', handleConfirm);
  saveButton.addEventListener('click', handleSave);
}
