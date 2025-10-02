const INVENTORY_YEARS = ['2023', '2024', '2025'];

const SITE_STRUCTURE = [
  {
    country: '台灣',
    regions: [
      {
        name: '北部區域',
        stations: [
          { name: '台北總部', facilities: ['台北總部大樓', '內湖資料中心'] },
          { name: '松山辦公室', facilities: ['松山辦公室'] },
        ],
      },
      {
        name: '中部區域',
        stations: [
          { name: '台中營運處', facilities: ['台中營運處'] },
        ],
      },
      {
        name: '南部區域',
        stations: [
          { name: '高雄營運中心', facilities: ['高雄物流倉庫', '高雄備援機房'] },
        ],
      },
    ],
  },
  {
    country: '日本',
    regions: [
      {
        name: '關東區域',
        stations: [
          { name: '東京辦公室', facilities: ['東京辦公室'] },
          { name: '橫濱倉儲中心', facilities: ['橫濱倉儲中心 A 棟', '橫濱倉儲中心 B 棟'] },
        ],
      },
    ],
  },
];

const SOURCE_TYPES = [
  { id: '1.1', name: '固定燃燒排放源 (發電機)' },
  { id: '1.2', name: '移動排放源 (公務車)' },
  { id: '1.4A', name: '逸散性排放 (飲水機)' },
  { id: '2.1', name: '輸入電力的間接排放 (辦公室用電)' },
  { id: '3.1A', name: '上游運輸物流經常耗材' },
  { id: '3.3L', name: '物流運輸排放 (陸運)' },
];

type InstanceRecord = {
  id: string;
  year: string;
  country: string;
  region: string;
  site: string;
  facility: string;
  sourceTypeId: string;
  sourceTypeName: string;
  instanceName: string;
  systemNumber: string;
  assetNumber: string;
  activationDate: string;
  notes?: string;
  maintainer: string;
};

type FilterSelection = {
  year: string;
  country: string;
  region: string;
  site: string;
  sourceTypeId: string;
};

type Option = { value: string; label: string };

type StationConfig = { name: string; facilities: string[] };

type RegionConfig = { name: string; stations: StationConfig[] };

type CountryConfig = { country: string; regions: RegionConfig[] };

const INITIAL_INSTANCES: InstanceRecord[] = [
  {
    id: 'taipei-generator-1',
    year: '2024',
    country: '台灣',
    region: '北部區域',
    site: '台北總部',
    facility: '台北總部大樓',
    sourceTypeId: '1.1',
    sourceTypeName: '固定燃燒排放源 (發電機)',
    instanceName: 'A 棟緊急發電機',
    systemNumber: 'GEN-TPE-001',
    assetNumber: 'AST-2024-015',
    activationDate: '2023-03-15',
    notes: '品牌：CAT / 型號：C27 / 容量：750kW',
    maintainer: '王大同',
  },
  {
    id: 'taipei-ev-fleet',
    year: '2024',
    country: '台灣',
    region: '北部區域',
    site: '台北總部',
    facility: '內湖資料中心',
    sourceTypeId: '1.2',
    sourceTypeName: '移動排放源 (公務車)',
    instanceName: '資料中心派車 A01',
    systemNumber: 'VEH-TPE-301',
    assetNumber: 'AST-2022-088',
    activationDate: '2022-07-01',
    notes: '油種：柴油 / 排氣量：3.0L',
    maintainer: '陳雅惠',
  },
  {
    id: 'kaohsiung-generator',
    year: '2023',
    country: '台灣',
    region: '南部區域',
    site: '高雄營運中心',
    facility: '高雄物流倉庫',
    sourceTypeId: '1.1',
    sourceTypeName: '固定燃燒排放源 (發電機)',
    instanceName: '倉庫備援發電機',
    systemNumber: 'GEN-KHH-002',
    assetNumber: 'AST-2021-042',
    activationDate: '2021-11-20',
    notes: '品牌：Kohler / 容量：550kW',
    maintainer: '許智彥',
  },
  {
    id: 'tokyo-electricity',
    year: '2024',
    country: '日本',
    region: '關東區域',
    site: '東京辦公室',
    facility: '東京辦公室',
    sourceTypeId: '2.1',
    sourceTypeName: '輸入電力的間接排放 (辦公室用電)',
    instanceName: '東京辦公室用電',
    systemNumber: 'ELE-TYO-101',
    assetNumber: 'AST-2023-115',
    activationDate: '2023-01-01',
    notes: '契約容量：120kW / 合約編號：TYO-EL-2023',
    maintainer: '佐藤花奈',
  },
  {
    id: 'yokohama-logistics',
    year: '2025',
    country: '日本',
    region: '關東區域',
    site: '橫濱倉儲中心',
    facility: '橫濱倉儲中心 A 棟',
    sourceTypeId: '3.3L',
    sourceTypeName: '物流運輸排放 (陸運)',
    instanceName: '橫濱出貨物流車隊',
    systemNumber: 'LOG-YOK-007',
    assetNumber: 'AST-2024-233',
    activationDate: '2024-09-15',
    notes: '合作物流商：GreenMove',
    maintainer: '山口裕太',
  },
];

function populateSelect(select: HTMLSelectElement, options: Option[], placeholder?: string) {
  const previousValue = select.value;
  select.innerHTML = '';

  if (placeholder) {
    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    select.appendChild(placeholderOption);
  }

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    select.appendChild(optionEl);
  });

  if (options.some((option) => option.value === previousValue)) {
    select.value = previousValue;
  } else if (!placeholder && options.length) {
    select.value = options[0]?.value || '';
  } else {
    select.value = '';
  }

  if (placeholder) {
    select.disabled = options.length === 0;
  } else {
    select.disabled = false;
  }
}

function findCountryConfig(country: string): CountryConfig | undefined {
  return SITE_STRUCTURE.find((item) => item.country === country);
}

function findRegionConfig(country: string, region: string): RegionConfig | undefined {
  return findCountryConfig(country)?.regions.find((item) => item.name === region);
}

function findStationConfig(country: string, region: string, site: string): StationConfig | undefined {
  return findRegionConfig(country, region)?.stations.find((item) => item.name === site);
}

function getFacilities(country: string, region: string, site: string): string[] {
  const station = findStationConfig(country, region, site);
  if (!station) {
    return site ? [site] : [];
  }

  return station.facilities.length ? station.facilities : [station.name];
}

function formatSummary(selection: FilterSelection) {
  return `盤查年度 ${selection.year} · ${selection.country} / ${selection.region} / ${selection.site} · 排放源 ${selection.sourceTypeId}`;
}

function filterInstances(records: InstanceRecord[], selection: FilterSelection) {
  return records.filter(
    (record) =>
      record.year === selection.year &&
      record.country === selection.country &&
      record.region === selection.region &&
      record.site === selection.site &&
      record.sourceTypeId === selection.sourceTypeId
  );
}

function createTableRow(record: InstanceRecord) {
  const tr = document.createElement('tr');

  const cells: (keyof InstanceRecord | 'notes')[] = [
    'facility',
    'sourceTypeName',
    'instanceName',
    'systemNumber',
    'assetNumber',
    'activationDate',
    'notes',
    'maintainer',
  ];

  cells.forEach((key) => {
    const td = document.createElement('td');
    const value = record[key as keyof InstanceRecord];
    td.textContent = value ? String(value) : '—';
    tr.appendChild(td);
  });

  return tr;
}

export function initEmissionSourceInstances() {
  const form = document.getElementById('instanceFilterForm') as HTMLFormElement | null;
  const yearSelect = document.getElementById('filterYearSelect') as HTMLSelectElement | null;
  const countrySelect = document.getElementById('filterCountrySelect') as HTMLSelectElement | null;
  const regionSelect = document.getElementById('filterRegionSelect') as HTMLSelectElement | null;
  const siteSelect = document.getElementById('filterSiteSelect') as HTMLSelectElement | null;
  const sourceTypeSelect = document.getElementById('filterSourceTypeSelect') as HTMLSelectElement | null;
  const errorMessage = document.getElementById('filterErrorMessage');
  const summaryEl = document.getElementById('selectionSummary');
  const tableBody = document.getElementById('instanceTableBody');
  const emptyMessage = document.getElementById('instancesEmptyMessage');
  const statusMessage = document.getElementById('instanceStatusMessage');
  const addButton = document.getElementById('openInstanceModal') as HTMLButtonElement | null;
  const modal = document.getElementById('createInstanceModal') as HTMLDivElement | null;
  const modalForm = document.getElementById('createInstanceForm') as HTMLFormElement | null;
  const modalFacilitySelect = document.getElementById('modalFacilitySelect') as HTMLSelectElement | null;
  const modalSourceTypeSelect = document.getElementById('modalSourceTypeSelect') as HTMLSelectElement | null;
  const modalError = document.getElementById('modalErrorMessage');
  const modalCloseButtons = modal?.querySelectorAll<HTMLElement>('[data-close-modal]');
  const modalOverlay = modal?.querySelector('.modal__overlay') as HTMLElement | null;

  if (
    !form ||
    !yearSelect ||
    !countrySelect ||
    !regionSelect ||
    !siteSelect ||
    !sourceTypeSelect ||
    !summaryEl ||
    !tableBody ||
    !emptyMessage ||
    !statusMessage ||
    !addButton ||
    !modal ||
    !modalForm ||
    !modalFacilitySelect ||
    !modalSourceTypeSelect ||
    !modalError ||
    !modalCloseButtons ||
    !modalOverlay
  ) {
    return;
  }

  let records: InstanceRecord[] = [...INITIAL_INSTANCES];
  let currentSelection: FilterSelection | undefined;
  let facilitiesForModal: string[] = [];

  populateSelect(
    yearSelect,
    INVENTORY_YEARS.map((year) => ({ value: year, label: `${year} 年` })),
    '請選擇盤查年度'
  );

  populateSelect(
    countrySelect,
    SITE_STRUCTURE.map((item) => ({ value: item.country, label: item.country })),
    '請選擇國家'
  );

  populateSelect(
    sourceTypeSelect,
    SOURCE_TYPES.map((type) => ({ value: type.id, label: `${type.id} ${type.name}` })),
    '請選擇排放源類型'
  );

  const modalTypeOptions = SOURCE_TYPES.map((type) => ({
    value: type.id,
    label: `${type.id} ${type.name}`,
  }));

  function clearError() {
    errorMessage.textContent = '';
  }

  function setError(text: string) {
    errorMessage.textContent = text;
  }

  function clearStatus() {
    statusMessage.textContent = '';
  }

  function setStatus(text: string) {
    statusMessage.textContent = text;
    window.setTimeout(() => {
      if (statusMessage.textContent === text) {
        statusMessage.textContent = '';
      }
    }, 4000);
  }

  function updateRegions() {
    const country = countrySelect.value;
    const countryConfig = findCountryConfig(country);
    const options = countryConfig
      ? countryConfig.regions.map((region) => ({ value: region.name, label: region.name }))
      : [];
    populateSelect(regionSelect, options, country ? '請選擇區域' : '請先選擇國家');
    if (!country) {
      populateSelect(siteSelect, [], '請先選擇區域');
    }
    updateAddButtonState();
  }

  function updateSites() {
    const country = countrySelect.value;
    const region = regionSelect.value;
    const regionConfig = findRegionConfig(country, region);
    const options = regionConfig
      ? regionConfig.stations.map((station) => ({ value: station.name, label: station.name }))
      : [];
    populateSelect(siteSelect, options, region ? '請選擇站點' : '請先選擇區域');
    updateAddButtonState();
  }

  function updateAddButtonState() {
    const readyForModal =
      !!yearSelect.value &&
      !!countrySelect.value &&
      !!regionSelect.value &&
      !!siteSelect.value &&
      !!sourceTypeSelect.value;
    addButton.disabled = !readyForModal;
  }

  function renderTable(selection: FilterSelection) {
    const matched = filterInstances(records, selection);
    tableBody.innerHTML = '';

    if (matched.length === 0) {
      emptyMessage.removeAttribute('hidden');
    } else {
      emptyMessage.setAttribute('hidden', '');
      matched
        .sort((a, b) => a.instanceName.localeCompare(b.instanceName, 'zh-TW'))
        .forEach((record) => {
          tableBody.appendChild(createTableRow(record));
        });
    }
  }

  function applySelection(selection: FilterSelection) {
    currentSelection = selection;
    summaryEl.textContent = formatSummary(selection);
    renderTable(selection);
  }

  function openModal() {
    if (!currentSelection) {
      return;
    }

    facilitiesForModal = getFacilities(
      currentSelection.country,
      currentSelection.region,
      currentSelection.site
    );

    populateSelect(
      modalFacilitySelect,
      facilitiesForModal.map((facility) => ({ value: facility, label: facility }))
    );
    if (facilitiesForModal.length <= 1) {
      modalFacilitySelect.disabled = true;
    } else {
      modalFacilitySelect.disabled = false;
    }

    populateSelect(modalSourceTypeSelect, modalTypeOptions);
    modalSourceTypeSelect.value = currentSelection.sourceTypeId;

    modalForm.reset();
    modalFacilitySelect.value = facilitiesForModal[0] || '';
    modalSourceTypeSelect.value = currentSelection.sourceTypeId;
    modalError.textContent = '';

    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('is-open');
    modal.querySelector<HTMLElement>('.modal__body input, .modal__body select, .modal__body textarea')?.focus();
  }

  function closeModal() {
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('is-open');
    modalError.textContent = '';
  }

  countrySelect.addEventListener('change', () => {
    updateRegions();
    clearError();
    clearStatus();
  });

  regionSelect.addEventListener('change', () => {
    updateSites();
    clearError();
    clearStatus();
  });

  siteSelect.addEventListener('change', () => {
    updateAddButtonState();
    clearError();
    clearStatus();
  });

  sourceTypeSelect.addEventListener('change', () => {
    updateAddButtonState();
    clearError();
    clearStatus();
  });

  yearSelect.addEventListener('change', () => {
    updateAddButtonState();
    clearError();
    clearStatus();
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    clearStatus();

    if (!form.checkValidity()) {
      form.reportValidity();
      setError('請完整選擇篩選條件後再查詢。');
      return;
    }

    clearError();

    const selection: FilterSelection = {
      year: yearSelect.value,
      country: countrySelect.value,
      region: regionSelect.value,
      site: siteSelect.value,
      sourceTypeId: sourceTypeSelect.value,
    };

    applySelection(selection);
  });

  addButton.addEventListener('click', () => {
    if (!currentSelection) {
      setError('請先查詢後再新增排放源實例。');
      return;
    }
    openModal();
  });

  modalCloseButtons.forEach((button) => {
    button.addEventListener('click', () => {
      closeModal();
    });
  });

  modalOverlay.addEventListener('click', () => {
    closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  modalForm.addEventListener('submit', (event) => {
    event.preventDefault();

    if (!currentSelection) {
      return;
    }

    if (!modalForm.checkValidity()) {
      modalForm.reportValidity();
      modalError.textContent = '請確認所有必填欄位均已填寫。';
      return;
    }

    const facility = modalFacilitySelect.value || facilitiesForModal[0] || currentSelection.site;
    const sourceTypeId = modalSourceTypeSelect.value;
    const sourceType = SOURCE_TYPES.find((type) => type.id === sourceTypeId);

    const formData = new FormData(modalForm);

    const instanceName = String(formData.get('instanceName') || '').trim();
    const systemNumber = String(formData.get('systemNumber') || '').trim();
    const assetNumber = String(formData.get('assetNumber') || '').trim();
    const activationDate = String(formData.get('activationDate') || '');
    const notes = String(formData.get('notes') || '').trim();
    const maintainer = String(formData.get('maintainer') || '').trim();

    if (!instanceName || !systemNumber || !assetNumber || !activationDate || !maintainer) {
      modalError.textContent = '請完整填寫必填欄位。';
      return;
    }

    const newRecord: InstanceRecord = {
      id: `instance-${Date.now()}`,
      year: currentSelection.year,
      country: currentSelection.country,
      region: currentSelection.region,
      site: currentSelection.site,
      facility,
      sourceTypeId,
      sourceTypeName: sourceType ? sourceType.name : sourceTypeId,
      instanceName,
      systemNumber,
      assetNumber,
      activationDate,
      notes: notes || undefined,
      maintainer,
    };

    records = [...records, newRecord];
    applySelection(currentSelection);
    setStatus('已新增 1 筆排放源實例。');
    closeModal();
  });
}
