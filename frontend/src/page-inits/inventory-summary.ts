import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type InventorySummaryRecord = {
  year: number;
  country: string;
  region: string;
  site: string;
  emissionSources: string[];
  status: AuditStatus;
};

type EmissionSourceLink = {
  href: string;
};

type StatusOption = { value: string; label: string };

type Filters = {
  year: string | null;
  country: string | null;
  region: string | null;
  site: string | null;
  status: string | null;
};

const DATA_PATH = `${import.meta.env.BASE_URL}data/inventory-summary.csv`;
const EMISSION_SOURCE_SEPARATOR = '|';

const STATUS_PERCENTAGE: Record<AuditStatus, number> = {
  Draft: 0,
  Submitted: 50,
  L1Approved: 75,
  L2Approved: 100,
};

const STATUS_OPTIONS: StatusOption[] = [
  { value: '', label: '全部' },
  { value: 'Draft', label: 'Draft (0%)' },
  { value: 'Submitted', label: 'Submitted (50%)' },
  { value: 'L1Approved', label: 'L1Approved (75%)' },
  { value: 'L2Approved', label: 'L2Approved (100%)' },
];

const EMISSION_SOURCE_LINKS: Record<string, EmissionSourceLink> = {
  固定燃燒排放: { href: 'pages/stationary-combustion.html' },
  輸入電力的間接排放: { href: 'pages/indirect-electricity.html' },
  逸散性排放: { href: 'pages/fugitive-emissions.html' },
  '物流運輸排放 (陸運)': { href: 'pages/logistics-transport-land.html' },
  '物流運輸排放 (海運)': { href: 'pages/logistics-transport-sea.html' },
  '物流運輸排放 (空運)': { href: 'pages/logistics-transport-air.html' },
  物流貨物運輸: { href: 'pages/logistics-goods-transport.html' },
  上游運輸物流經常耗材: { href: 'pages/upstream-logistics-consumables.html' },
  上游運輸辦公耗材: { href: 'pages/upstream-office-consumables.html' },
  商務差旅: { href: 'pages/business-travel.html' },
  業務差旅: { href: 'pages/business-travel.html' },
  自有車隊燃料使用: { href: 'pages/mobile-sources.html' },
  員工通勤: { href: 'pages/mobile-sources.html' },
  製程逸散排放: { href: 'pages/fugitive-emissions.html' },
  購買冷媒: { href: 'pages/fugitive-emissions.html' },
  產品使用排放: { href: 'pages/purchased-goods-services-forklift.html' },
  租賃資產能源使用: { href: 'pages/fuel-energy-related.html' },
  輸入蒸氣的間接排放: { href: 'pages/fuel-energy-related.html' },
  外購蒸氣: { href: 'pages/fuel-energy-related.html' },
};

const NAVIGATION_EVENT_NAME = 'cats:navigate';

function parseRecord(row: CsvRow): InventorySummaryRecord | null {
  const yearText = row.year?.trim();
  const country = row.country?.trim();
  const region = row.region?.trim();
  const site = row.site?.trim();
  const emissionSourcesText = row.emission_sources?.trim();
  const status = row.status?.trim() as AuditStatus | undefined;

  if (!yearText || !country || !region || !site || !emissionSourcesText || !status) {
    return null;
  }

  const yearNumber = Number.parseInt(yearText, 10);
  if (Number.isNaN(yearNumber)) {
    return null;
  }

  if (!(status in STATUS_PERCENTAGE)) {
    return null;
  }

  const emissionSources = emissionSourcesText
    .split(EMISSION_SOURCE_SEPARATOR)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return {
    year: yearNumber,
    country,
    region,
    site,
    emissionSources,
    status,
  };
}

function populateSelect(
  select: HTMLSelectElement,
  options: StatusOption[],
  { addAllOption = false }: { addAllOption?: boolean } = {}
) {
  const fragment = document.createDocumentFragment();

  if (addAllOption) {
    const allOption = document.createElement('option');
    allOption.value = '';
    allOption.textContent = '全部';
    fragment.appendChild(allOption);
  }

  options.forEach((option) => {
    const optionEl = document.createElement('option');
    optionEl.value = option.value;
    optionEl.textContent = option.label;
    fragment.appendChild(optionEl);
  });

  select.innerHTML = '';
  select.appendChild(fragment);
}

function populateSelectWithStrings(select: HTMLSelectElement, values: string[]) {
  populateSelect(
    select,
    values.map((value) => ({ value, label: value })),
    { addAllOption: true }
  );
}

function getUniqueValues(records: InventorySummaryRecord[], key: 'country' | 'region' | 'site'): string[] {
  const set = new Set<string>();
  records.forEach((record) => set.add(record[key]));
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
}

function formatStatus(status: AuditStatus) {
  const percentage = STATUS_PERCENTAGE[status];
  return typeof percentage === 'number' ? `${status} (${percentage}%)` : status;
}

function navigateToEmissionSource(href: string, site: string, sourceType: string) {
  const detail = { href, site, sourceType };
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT_NAME, { detail }));
}

function createEmissionSourceCell(site: string, sources: string[]): HTMLElement {
  const container = document.createElement('span');
  container.className = 'emission-source-links';

  sources.forEach((source, index) => {
    if (index > 0) {
      container.append(document.createTextNode('、'));
    }

    const config = EMISSION_SOURCE_LINKS[source];

    if (!config) {
      container.append(document.createTextNode(source));
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'link-button';
    button.textContent = source;
    button.addEventListener('click', () => navigateToEmissionSource(config.href, site, source));

    container.append(button);
  });

  return container;
}

function readFilters(form: HTMLFormElement): Filters {
  const formData = new FormData(form);
  return {
    year: (formData.get('year') as string) || null,
    country: (formData.get('country') as string) || null,
    region: (formData.get('region') as string) || null,
    site: (formData.get('site') as string) || null,
    status: (formData.get('status') as string) || null,
  };
}

function applyFilters(records: InventorySummaryRecord[], filters: Filters) {
  return records.filter((item) => {
    return (
      (!filters.year || String(item.year) === filters.year) &&
      (!filters.country || item.country === filters.country) &&
      (!filters.region || item.region === filters.region) &&
      (!filters.site || item.site === filters.site) &&
      (!filters.status || item.status === filters.status)
    );
  });
}

function renderRows(
  tableBody: HTMLElement,
  emptyMessage: HTMLElement,
  messageContainer: HTMLElement | null,
  data: InventorySummaryRecord[]
) {
  tableBody.innerHTML = '';

  if (!data.length) {
    emptyMessage.toggleAttribute('hidden', false);
    return;
  }

  emptyMessage.toggleAttribute('hidden', true);

  const fragment = document.createDocumentFragment();

  data.forEach((item) => {
    const row = document.createElement('tr');

    const downloadSimpleButton = document.createElement('button');
    downloadSimpleButton.type = 'button';
    downloadSimpleButton.className = 'secondary-button download-button';
    downloadSimpleButton.textContent = '下載簡表';
    downloadSimpleButton.addEventListener('click', () =>
      simulateDownload(messageContainer, `${item.site} - ${item.year} 清冊簡表`)
    );

    const downloadAllButton = document.createElement('button');
    downloadAllButton.type = 'button';
    downloadAllButton.className = 'secondary-button download-button';
    downloadAllButton.textContent = '下載簡表與所有活動';
    downloadAllButton.addEventListener('click', () =>
      simulateDownload(messageContainer, `${item.site} - ${item.year} 清冊簡表與所有活動`)
    );

    const downloadButtons = document.createElement('div');
    downloadButtons.className = 'download-button-group';
    downloadButtons.append(downloadSimpleButton, downloadAllButton);

    const cells: (string | number | HTMLElement)[] = [
      item.year,
      item.country,
      item.region,
      item.site,
      createEmissionSourceCell(item.site, item.emissionSources),
      formatStatus(item.status),
      downloadButtons,
    ];

    cells.forEach((value) => {
      const cell = document.createElement('td');
      if (value instanceof HTMLElement) {
        cell.appendChild(value);
      } else {
        cell.textContent = String(value);
      }
      row.appendChild(cell);
    });

    fragment.appendChild(row);
  });

  tableBody.appendChild(fragment);
}

function simulateDownload(messageContainer: HTMLElement | null, text: string) {
  if (!messageContainer) {
    return;
  }

  messageContainer.textContent = `${text} 的 Excel 檔案下載已模擬完成。`;

  window.setTimeout(() => {
    if (messageContainer.textContent === `${text} 的 Excel 檔案下載已模擬完成。`) {
      messageContainer.textContent = '';
    }
  }, 3000);
}

export function initInventorySummary() {
  const form = document.getElementById('inventorySummaryFilters') as HTMLFormElement | null;
  const yearSelect = document.getElementById('filterYear') as HTMLSelectElement | null;
  const countrySelect = document.getElementById('filterCountry') as HTMLSelectElement | null;
  const regionSelect = document.getElementById('filterRegion') as HTMLSelectElement | null;
  const siteSelect = document.getElementById('filterSite') as HTMLSelectElement | null;
  const statusSelect = document.getElementById('filterStatus') as HTMLSelectElement | null;
  const tableBody = document.getElementById('inventorySummaryTableBody');
  const emptyHint = document.getElementById('inventorySummaryEmpty');
  const messageContainer = document.getElementById('inventorySummaryMessage');

  if (
    !form ||
    !yearSelect ||
    !countrySelect ||
    !regionSelect ||
    !siteSelect ||
    !statusSelect ||
    !tableBody ||
    !emptyHint
  ) {
    return;
  }

  let records: InventorySummaryRecord[] = [];
  let defaultYear = '';

  const initialize = async () => {
    const rows = await loadCsvRows(DATA_PATH);
    records = rows
      .map((row) => parseRecord(row))
      .filter((record): record is InventorySummaryRecord => record !== null);

    const years = Array.from(new Set(records.map((item) => item.year))).sort((a, b) => b - a);

    populateSelect(
      yearSelect,
      years.map((year) => ({ value: String(year), label: String(year) }))
    );

    const currentYear = new Date().getFullYear();
    const preferredYear = currentYear - 1;
    const fallbackYear = years[0];

    if (years.includes(preferredYear)) {
      defaultYear = String(preferredYear);
    } else if (typeof fallbackYear === 'number') {
      defaultYear = String(fallbackYear);
    }

    if (defaultYear) {
      yearSelect.value = defaultYear;
    }

    populateSelectWithStrings(countrySelect, getUniqueValues(records, 'country'));
    populateSelectWithStrings(regionSelect, getUniqueValues(records, 'region'));
    populateSelectWithStrings(siteSelect, getUniqueValues(records, 'site'));
    populateSelect(statusSelect, STATUS_OPTIONS);

    renderRows(
      tableBody,
      emptyHint,
      messageContainer,
      applyFilters(records, readFilters(form))
    );
  };

  void initialize();

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const filtered = applyFilters(records, readFilters(form));
    renderRows(tableBody, emptyHint, messageContainer, filtered);
  });

  form.addEventListener('reset', () => {
    window.setTimeout(() => {
      if (defaultYear) {
        yearSelect.value = defaultYear;
      }
      const filtered = applyFilters(records, readFilters(form));
      renderRows(tableBody, emptyHint, messageContainer, filtered);
    });
  });
}

