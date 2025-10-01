import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type TransportMode = 'plane' | 'hsr' | 'train' | 'car' | 'metro';

type TravelRecord = {
  id: string;
  company: string;
  site: string;
  departureDate: string;
  transportation: TransportMode;
  cabinClass?: string;
  origin: string;
  destination: string;
  dailyTrips: number;
  passengers: number;
  distanceKm: number;
  dataSource: string;
  attachments: string[];
  notes?: string;
};

type Option = { value: string; label: string };

type FactorDetail = {
  factor: number;
  source: string;
  gwp?: number;
};

type StatusConfig = {
  label: string;
  className: string;
  message: string;
  buttons: (
    | { type: 'submit'; label: string }
    | { type: 'approve'; label: string }
    | { type: 'return'; label: string }
  )[];
};

const COMPANY_NAME = '綠程科技股份有限公司';
const INVENTORY_YEAR = '2024';

const SITE_OPTIONS: string[] = ['台北總部', '新竹研發中心', '台中營運處'];

const TRANSPORT_OPTIONS: Option[] = [
  { value: 'plane', label: '飛機' },
  { value: 'hsr', label: '高鐵' },
  { value: 'train', label: '火車' },
  { value: 'car', label: '汽車' },
  { value: 'metro', label: '地鐵' },
];

const CABIN_OPTIONS: Option[] = [
  { value: 'economy', label: '經濟艙' },
  { value: 'business', label: '商務艙' },
  { value: 'first', label: '頭等艙' },
];

const FACTOR_SOURCE_DEFAULT = '交通部運輸排放係數資料庫 2024 年版';
const TRAVEL_DATA_PATH = `${import.meta.env.BASE_URL}data/business-travel.csv`;

const FACTOR_DETAILS: Record<string, FactorDetail> = {
  'plane|economy': {
    factor: 0.092,
    gwp: 1.9,
    source: '民航運輸排放因子參考值（2024）',
  },
  'plane|business': {
    factor: 0.134,
    gwp: 1.9,
    source: '民航運輸排放因子參考值（2024）',
  },
  'plane|first': {
    factor: 0.181,
    gwp: 1.9,
    source: '民航運輸排放因子參考值（2024）',
  },
  hsr: { factor: 0.015, source: '高速鐵路能源效率報告 2023' },
  train: { factor: 0.045, source: '台鐵運輸排放公告 2023' },
  car: { factor: 0.185, source: '交通部公路總局車輛排放係數 2024' },
  metro: { factor: 0.028, source: '大眾捷運電力排放係數公告 2023' },
};

const STATUS_CONFIG: Record<AuditStatus, StatusConfig> = {
  Draft: {
    label: '草稿',
    className: 'status-badge--draft',
    message: '目前狀態為草稿，可繼續編輯或新增活動資料。',
    buttons: [{ type: 'submit', label: '送審' }],
  },
  Submitted: {
    label: '待審核',
    className: 'status-badge--submitted',
    message: '資料已送審，請等待審核人員確認。',
    buttons: [
      { type: 'approve', label: '審核通過' },
      { type: 'return', label: '退回' },
    ],
  },
  L1Approved: {
    label: '一階審核通過',
    className: 'status-badge--l1approved',
    message: '資料已通過一階審核，請進行最終審核。',
    buttons: [
      { type: 'approve', label: '審核通過' },
      { type: 'return', label: '退回' },
    ],
  },
  L2Approved: {
    label: '二階審核通過',
    className: 'status-badge--approved',
    message: '資料已完成所有審核流程，不可再進行送審或退回。',
    buttons: [],
  },
};

const numberFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const factorFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
});

let records: TravelRecord[] = [];

let recordCounter = 0;
let currentStatus: AuditStatus = 'Draft';
let pendingReturn = false;

export function initBusinessTravel() {
  const yearDisplay = document.getElementById('inventoryYearDisplay');
  const statusLabel = document.getElementById('auditStatusLabel');
  const statusMessage = document.getElementById('auditStatusMessage');
  const actionContainer = document.getElementById('auditActionButtons');
  const tableBody = document.getElementById('travelTableBody');
  const emptyMessage = document.getElementById('travelEmptyMessage');
  const addButton = document.getElementById('addTravelButton');
  const addModal = document.getElementById('addRecordModal');
  const addForm = document.getElementById('addRecordForm') as HTMLFormElement | null;
  const siteSelect = document.getElementById('modalSiteSelect') as HTMLSelectElement | null;
  const transportSelect = document.getElementById('modalTransportSelect') as HTMLSelectElement | null;
  const cabinSelect = document.getElementById('modalCabinSelect') as HTMLSelectElement | null;
  const attachmentInput = document.getElementById('attachmentInput') as HTMLInputElement | null;
  const attachmentList = document.getElementById('attachmentList');
  const dropZone = document.getElementById('attachmentDropZone');
  const browseButton = document.getElementById('browseAttachmentButton');
  const addError = document.getElementById('addRecordError');
  const tableAddButton = document.getElementById('tableAddTravelButton');
  const reasonModal = document.getElementById('returnReasonModal');
  const reasonForm = document.getElementById('returnReasonForm') as HTMLFormElement | null;
  const reasonInput = document.getElementById('returnReasonInput') as HTMLTextAreaElement | null;
  const reasonError = document.getElementById('returnReasonError');

  if (
    !yearDisplay ||
    !statusLabel ||
    !statusMessage ||
    !actionContainer ||
    !tableBody ||
    !emptyMessage ||
    !addButton ||
    !addModal ||
    !addForm ||
    !siteSelect ||
    !transportSelect ||
    !cabinSelect ||
    !attachmentInput ||
    !attachmentList ||
    !dropZone ||
    !browseButton ||
    !addError ||
    !tableAddButton ||
    !reasonModal ||
    !reasonForm ||
    !reasonInput ||
    !reasonError
  ) {
    return;
  }

  yearDisplay.textContent = `${INVENTORY_YEAR} 年`;

  populateSelect(siteSelect, SITE_OPTIONS.map((value) => ({ value, label: value })), '請選擇據點');
  populateSelect(transportSelect, TRANSPORT_OPTIONS, '請選擇交通方式');
  populateSelect(cabinSelect, CABIN_OPTIONS, '請選擇艙等');

  void loadInitialRecords();
  renderRecords();
  renderStatus();
  syncCabinAvailability(transportSelect, cabinSelect);

  const openAddRecordModal = () => openModal(addModal);

  addButton.addEventListener('click', openAddRecordModal);
  tableAddButton.addEventListener('click', openAddRecordModal);
  addModal.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', () => closeModal(addModal));
  });

  reasonModal.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', () => closeModal(reasonModal));
  });

  transportSelect.addEventListener('change', () => {
    syncCabinAvailability(transportSelect, cabinSelect);
  });

  browseButton.addEventListener('click', () => attachmentInput.click());

  attachmentInput.addEventListener('change', () => {
    const names = collectAttachmentNames(attachmentInput.files);
    renderAttachmentList(attachmentList, names);
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('is-dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('is-dragover');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('is-dragover');
    const files = event.dataTransfer?.files;
    const names = collectAttachmentNames(files || null);
    renderAttachmentList(attachmentList, names);
  });

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addError.textContent = '';

    const formData = new FormData(addForm);
    const transport = formData.get('transportation');

    if (!transport) {
      addError.textContent = '請選擇交通方式。';
      return;
    }

    const transportValue = transport.toString() as TransportMode;

    if (transportValue === 'plane' && !formData.get('cabin')) {
      addError.textContent = '搭乘飛機時需選擇艙等。';
      return;
    }

    const passengers = toPositiveNumber(formData.get('passengers'), 1);
    const distanceKm = toPositiveNumber(formData.get('distance'), 0);
    const dailyTrips = toPositiveNumber(formData.get('dailyTrips'), 0);

    if (passengers <= 0) {
      addError.textContent = '人次需大於 0。';
      return;
    }

    if (distanceKm < 0) {
      addError.textContent = '運輸公里數不可為負值。';
      return;
    }

    if (dailyTrips < 0) {
      addError.textContent = '單日趟數不可為負值。';
      return;
    }

    const attachmentNames = collectAttachmentNames(attachmentInput.files);

    const newRecord: TravelRecord = {
      id: `rec-${++recordCounter}`,
      company: COMPANY_NAME,
      site: formData.get('site')?.toString() || SITE_OPTIONS[0],
      departureDate: formData.get('departureDate')?.toString() || '',
      transportation: transportValue,
      cabinClass: formData.get('cabin')?.toString() || undefined,
      origin: formData.get('origin')?.toString() || '',
      destination: formData.get('destination')?.toString() || '',
      dailyTrips,
      passengers,
      distanceKm,
      dataSource: formData.get('dataSource')?.toString() || '',
      attachments: attachmentNames,
      notes: formData.get('notes')?.toString() || undefined,
    };

    records = [...records, newRecord];
    renderRecords();
    closeModal(addModal);
    addForm.reset();
    renderAttachmentList(attachmentList, []);
    syncCabinAvailability(transportSelect, cabinSelect);
    statusMessage.textContent = '已新增 1 筆活動資料，可繼續送審或編輯。';
  });

  reasonForm.addEventListener('submit', (event) => {
    event.preventDefault();
    reasonError.textContent = '';
    const reason = reasonInput.value.trim();

    if (!reason) {
      reasonError.textContent = '退回原因為必填欄位。';
      return;
    }

    closeModal(reasonModal);
    reasonForm.reset();

    if (pendingReturn) {
      currentStatus = 'Draft';
      renderStatus(`資料已退回，原因：${reason}`);
    }
    pendingReturn = false;
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (addModal.classList.contains('is-open')) {
        closeModal(addModal);
      }
      if (reasonModal.classList.contains('is-open')) {
        closeModal(reasonModal);
      }
    }
  });

  async function loadInitialRecords() {
    try {
      const rows = await loadCsvRows(TRAVEL_DATA_PATH);
      records = rows
        .map(mapRowToRecord)
        .filter((record): record is TravelRecord => record !== null);
      recordCounter = Math.max(recordCounter, getMaxRecordIndex(records));
      renderRecords();
    } catch (error) {
      console.error('Failed to load business travel records from CSV.', error);
      renderStatus('初始化資料載入失敗，請稍後再試。');
    }
  }

  function mapRowToRecord(row: CsvRow): TravelRecord | null {
    const id = row.id?.trim();
    const company = row.company?.trim() || COMPANY_NAME;
    const site = row.site?.trim();
    const departureDate = row.departureDate?.trim() ?? '';
    const transport = row.transportation?.trim() as TransportMode;
    const origin = row.origin?.trim();
    const destination = row.destination?.trim();
    const dataSource = row.dataSource?.trim() ?? '';
    const notes = row.notes?.trim();
    const dailyTrips = parseNumber(row.dailyTrips);
    const passengers = parseNumber(row.passengers);
    const distanceKm = parseNumber(row.distanceKm);

    if (!id || !site || !origin || !destination) {
      return null;
    }

    if (!isValidTransport(transport)) {
      return null;
    }

    if (!Number.isFinite(dailyTrips) || dailyTrips < 0) {
      return null;
    }

    if (!Number.isFinite(passengers) || passengers <= 0) {
      return null;
    }

    if (!Number.isFinite(distanceKm) || distanceKm < 0) {
      return null;
    }

    let cabinClass: string | undefined;
    const cabinValue = row.cabinClass?.trim();
    if (transport === 'plane') {
      cabinClass = CABIN_OPTIONS.some((option) => option.value === cabinValue) ? cabinValue : undefined;
    }

    return {
      id,
      company,
      site,
      departureDate,
      transportation: transport,
      cabinClass,
      origin,
      destination,
      dailyTrips,
      passengers,
      distanceKm,
      dataSource,
      attachments: parseAttachmentList(row.attachments),
      notes: notes ? notes : undefined,
    };
  }

  function parseAttachmentList(value?: string): string[] {
    if (!value) {
      return [];
    }

    return value
      .split(';')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  function parseNumber(value?: string): number {
    const result = Number(value ?? '');
    return Number.isFinite(result) ? result : NaN;
  }

  function isValidTransport(value: string | TransportMode | undefined): value is TransportMode {
    return TRANSPORT_OPTIONS.some((option) => option.value === value);
  }

  function getMaxRecordIndex(list: TravelRecord[]): number {
    return list.reduce((max, record) => {
      const match = /^rec-(\d+)$/.exec(record.id);
      if (!match) {
        return max;
      }
      const numericId = Number.parseInt(match[1], 10);
      return Number.isFinite(numericId) && numericId > max ? numericId : max;
    }, 0);
  }

  function renderRecords() {
    tableBody.innerHTML = '';

    if (records.length === 0) {
      emptyMessage.removeAttribute('hidden');
      return;
    }

    emptyMessage.setAttribute('hidden', '');

    records.forEach((record) => {
      const row = createRow(record);
      tableBody.appendChild(row);
    });
  }

  function renderStatus(customMessage?: string) {
    const config = STATUS_CONFIG[currentStatus];
    statusLabel.textContent = config.label;
    statusLabel.className = `status-badge ${config.className}`;
    statusMessage.textContent = customMessage || config.message;

    actionContainer.innerHTML = '';

    config.buttons.forEach((buttonConfig) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = buttonConfig.label;
      button.className =
        buttonConfig.type === 'submit' ? 'primary-button' : 'secondary-button';

      if (buttonConfig.type === 'submit') {
        button.addEventListener('click', () => {
          currentStatus = 'Submitted';
          renderStatus('資料已送審，等待審核結果。');
        });
      }

      if (buttonConfig.type === 'approve') {
        button.addEventListener('click', () => {
          if (currentStatus === 'Submitted') {
            currentStatus = 'L1Approved';
            renderStatus('資料已通過一階審核，請繼續進行最終審核。');
          } else if (currentStatus === 'L1Approved') {
            currentStatus = 'L2Approved';
            renderStatus('資料已完成所有審核流程。');
          }
        });
      }

      if (buttonConfig.type === 'return') {
        button.addEventListener('click', () => {
          pendingReturn = true;
          reasonError.textContent = '';
          reasonForm.reset();
          openModal(reasonModal);
        });
      }

      actionContainer.appendChild(button);
    });
  }

  function createRow(record: TravelRecord) {
    const row = document.createElement('tr');
    row.dataset.id = record.id;

    row.appendChild(createActionCell());

    row.appendChild(createTextCell(record.company));

    row.appendChild(
      createEditableCell(() => {
        const select = createSelect(SITE_OPTIONS, record.site);
        select.classList.add('table-select');
        select.addEventListener('change', () => {
          record.site = select.value;
        });
        return select;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'date';
        input.value = record.departureDate;
        input.className = 'table-input';
        input.addEventListener('change', () => {
          record.departureDate = input.value;
        });
        return input;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const select = document.createElement('select');
        select.className = 'table-select';
        populateSelect(select, TRANSPORT_OPTIONS, '請選擇交通方式');
        select.value = record.transportation;
        select.addEventListener('change', () => {
          record.transportation = select.value as TransportMode;
          if (record.transportation !== 'plane') {
            record.cabinClass = undefined;
          } else if (!record.cabinClass) {
            record.cabinClass = CABIN_OPTIONS[0]?.value;
          }
          updateRow(row, record);
        });
        return select;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = record.origin;
        input.className = 'table-input';
        input.placeholder = '例如：台北';
        input.addEventListener('input', () => {
          record.origin = input.value;
        });
        return input;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = record.destination;
        input.className = 'table-input';
        input.placeholder = '例如：東京';
        input.addEventListener('input', () => {
          record.destination = input.value;
        });
        return input;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const select = document.createElement('select');
        select.className = 'table-select';
        select.dataset.field = 'cabin';
        populateSelect(select, CABIN_OPTIONS, '請選擇艙等');
        select.value = record.cabinClass || '';
        const isPlane = record.transportation === 'plane';
        select.disabled = !isPlane;
        if (!isPlane) {
          select.value = '';
        }
        select.addEventListener('change', () => {
          record.cabinClass = select.value || undefined;
          updateRow(row, record);
        });
        return select;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '1';
        input.value = record.dailyTrips.toString();
        input.className = 'table-input';
        input.addEventListener('input', () => {
          record.dailyTrips = ensureNonNegative(input);
        });
        return input;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '1';
        input.step = '1';
        input.value = record.passengers.toString();
        input.className = 'table-input';
        input.addEventListener('input', () => {
          const value = ensureNonNegative(input);
          record.passengers = value === 0 ? 0 : value;
          updateRow(row, record);
        });
        return input;
      })
    );

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.step = '0.1';
        input.value = record.distanceKm.toString();
        input.className = 'table-input';
        input.addEventListener('input', () => {
          record.distanceKm = ensureNonNegative(input, true);
          updateRow(row, record);
        });
        return input;
      })
    );

    const factorCell = document.createElement('td');
    factorCell.classList.add('table-number');
    factorCell.dataset.field = 'factor';
    row.appendChild(factorCell);

    const footprintCell = document.createElement('td');
    footprintCell.classList.add('table-number');
    footprintCell.dataset.field = 'footprint';
    row.appendChild(footprintCell);

    const emissionCell = document.createElement('td');
    emissionCell.classList.add('table-number');
    emissionCell.dataset.field = 'emission';
    row.appendChild(emissionCell);

    row.appendChild(
      createEditableCell(() => {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = record.dataSource;
        input.className = 'table-input';
        input.placeholder = '例如：差旅平台匯出';
        input.addEventListener('input', () => {
          record.dataSource = input.value;
        });
        return input;
      })
    );

    const factorSourceCell = document.createElement('td');
    factorSourceCell.dataset.field = 'source';
    row.appendChild(factorSourceCell);

    updateRow(row, record);

    return row;
  }

  function createActionCell() {
    const cell = document.createElement('td');
    cell.className = 'table-action-cell';
    return cell;
  }

  function createTextCell(text: string) {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
  }

  function createEditableCell(factory: () => HTMLElement) {
    const cell = document.createElement('td');
    cell.classList.add('is-editable-cell');
    const control = factory();
    cell.appendChild(control);
    return cell;
  }

  function updateRow(row: HTMLTableRowElement, record: TravelRecord) {
    const factorDetail = getFactorDetail(record);
    const footprint = record.passengers * record.distanceKm * factorDetail.factor;
    const totalEmission = footprint * (factorDetail.gwp ?? 1);

    const factorCell = row.querySelector<HTMLTableCellElement>('[data-field="factor"]');
    const footprintCell = row.querySelector<HTMLTableCellElement>('[data-field="footprint"]');
    const emissionCell = row.querySelector<HTMLTableCellElement>('[data-field="emission"]');
    const sourceCell = row.querySelector<HTMLTableCellElement>('[data-field="source"]');

    if (factorCell) {
      factorCell.textContent = factorDetail.factor
        ? factorFormatter.format(factorDetail.factor)
        : '—';
    }
    if (footprintCell) {
      footprintCell.textContent = numberFormatter.format(footprint);
    }
    if (emissionCell) {
      emissionCell.textContent = numberFormatter.format(totalEmission);
    }
    if (sourceCell) {
      sourceCell.textContent = factorDetail.source;
    }

    const cabinSelect = row.querySelector<HTMLSelectElement>('select[data-field="cabin"]');
    if (cabinSelect) {
      if (record.transportation !== 'plane') {
        cabinSelect.value = '';
        cabinSelect.disabled = true;
      } else {
        cabinSelect.disabled = false;
        cabinSelect.value = record.cabinClass || '';
      }
    }
  }

  function renderAttachmentList(target: HTMLElement, items: string[]) {
    target.innerHTML = '';
    if (items.length === 0) {
      return;
    }
    items.forEach((name) => {
      const li = document.createElement('li');
      li.textContent = name;
      target.appendChild(li);
    });
  }

  function openModal(modal: HTMLElement) {
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal: HTMLElement) {
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function populateSelect(
    select: HTMLSelectElement,
    options: Option[],
    placeholder?: string
  ) {
    select.innerHTML = '';
    const shouldUsePlaceholder = Boolean(placeholder) && options.length > 1;
    if (shouldUsePlaceholder) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = placeholder;
      option.disabled = true;
      option.selected = true;
      select.appendChild(option);
    }
    options.forEach((item) => {
      const option = document.createElement('option');
      option.value = item.value;
      option.textContent = item.label;
      select.appendChild(option);
    });
    if (!shouldUsePlaceholder && options.length > 0) {
      select.value = options[0].value;
    }
  }

  function createSelect(options: string[], value: string) {
    const select = document.createElement('select');
    populateSelect(
      select,
      options.map((option) => ({ value: option, label: option })),
      '請選擇據點'
    );
    select.value = value;
    return select;
  }

  function syncCabinAvailability(
    transportSelect: HTMLSelectElement,
    cabinSelect: HTMLSelectElement
  ) {
    const isPlane = transportSelect.value === 'plane';
    cabinSelect.disabled = !isPlane;
    if (!isPlane) {
      cabinSelect.value = '';
    }
  }

  function collectAttachmentNames(fileList: FileList | null) {
    if (!fileList) {
      return [];
    }
    return Array.from(fileList).map((file) => file.name);
  }

  function toPositiveNumber(value: FormDataEntryValue | null, fallback: number) {
    const parsed = Number(value);
    if (Number.isNaN(parsed) || parsed < 0) {
      return fallback;
    }
    return parsed;
  }

  function ensureNonNegative(input: HTMLInputElement, allowDecimal = false) {
    const value = allowDecimal ? Number(input.value) : parseInt(input.value, 10);
    if (Number.isNaN(value) || value < 0) {
      input.value = '0';
      return 0;
    }
    return value;
  }

  function getFactorDetail(record: TravelRecord): FactorDetail {
    if (record.transportation === 'plane') {
      const key = record.cabinClass ? `plane|${record.cabinClass}` : '';
      if (!key) {
        return {
          factor: 0,
          source: '請先選擇艙等以取得排放係數',
        };
      }
      return FACTOR_DETAILS[key] || {
        factor: 0,
        source: FACTOR_SOURCE_DEFAULT,
      };
    }

    return (
      FACTOR_DETAILS[record.transportation] || {
        factor: 0,
        source: FACTOR_SOURCE_DEFAULT,
      }
    );
  }

  renderStatus();
}
