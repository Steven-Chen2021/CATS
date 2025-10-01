type FuelType = '92 無鉛汽油' | '95 無鉛汽油' | '98 無鉛汽油' | '柴油';

type Attachment = {
  name: string;
  url: string;
};

type ActivityRecord = {
  station: string;
  depot: string;
  vehicle: string;
  fuelType: FuelType;
  month: number;
  volume: number;
  dataSource: string;
  attachments: Attachment[];
  notes?: string;
};

type DepotDefinition = {
  name: string;
  station: string;
  vehicles: string[];
};

type FactorEntry = {
  co2: number;
  co2Unit: string;
  co2Gwp: number;
  ch4: number;
  ch4Unit: string;
  ch4Gwp: number;
  n2o: number;
  n2oUnit: string;
  n2oGwp: number;
  source: string;
};

type CsvRow = {
  station?: string;
  depot: string;
  vehicle: string;
  fuelType: string;
  month: string;
  volume: string;
  dataSource: string;
  attachments?: string;
  notes?: string;
};

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type StatusConfig = {
  label: string;
  badgeClass: string;
  message: string;
};

const INVENTORY_YEAR = 2024;
const DEFAULT_STATION = '北部營運總部';
const FACTOR_SOURCE = '環保署移動燃料燃燒排放係數表 (2024 年度)';
const DATA_URL = `${import.meta.env.BASE_URL}data/mobile-combustion-activities.csv`;

const DEPOTS: DepotDefinition[] = [
  {
    station: DEFAULT_STATION,
    name: '台北車隊營運中心',
    vehicles: ['北營-001', '北營-002', '北營-105'],
  },
  {
    station: DEFAULT_STATION,
    name: '新莊物流據點',
    vehicles: ['新莊-301', '新莊-318'],
  },
  {
    station: DEFAULT_STATION,
    name: '桃園配送據點',
    vehicles: ['桃配-210', '桃配-226'],
  },
];

const FACTOR_TABLE: Record<FuelType, FactorEntry> = {
  '92 無鉛汽油': {
    co2: 2.32,
    co2Unit: 'kg CO₂ / 公升',
    co2Gwp: 1,
    ch4: 0.00021,
    ch4Unit: 'kg CH₄ / 公升',
    ch4Gwp: 27.2,
    n2o: 0.00021,
    n2oUnit: 'kg N₂O / 公升',
    n2oGwp: 273,
    source: FACTOR_SOURCE,
  },
  '95 無鉛汽油': {
    co2: 2.28,
    co2Unit: 'kg CO₂ / 公升',
    co2Gwp: 1,
    ch4: 0.0002,
    ch4Unit: 'kg CH₄ / 公升',
    ch4Gwp: 27.2,
    n2o: 0.00019,
    n2oUnit: 'kg N₂O / 公升',
    n2oGwp: 273,
    source: FACTOR_SOURCE,
  },
  '98 無鉛汽油': {
    co2: 2.26,
    co2Unit: 'kg CO₂ / 公升',
    co2Gwp: 1,
    ch4: 0.00019,
    ch4Unit: 'kg CH₄ / 公升',
    ch4Gwp: 27.2,
    n2o: 0.00019,
    n2oUnit: 'kg N₂O / 公升',
    n2oGwp: 273,
    source: FACTOR_SOURCE,
  },
  柴油: {
    co2: 2.68,
    co2Unit: 'kg CO₂ / 公升',
    co2Gwp: 1,
    ch4: 0.00005,
    ch4Unit: 'kg CH₄ / 公升',
    ch4Gwp: 27.2,
    n2o: 0.00012,
    n2oUnit: 'kg N₂O / 公升',
    n2oGwp: 273,
    source: FACTOR_SOURCE,
  },
};

const STATUS_CONFIG: Record<AuditStatus, StatusConfig> = {
  Draft: {
    label: '草稿',
    badgeClass: 'status-badge--draft',
    message: '目前狀態為草稿，可繼續編輯或新增活動資料。',
  },
  Submitted: {
    label: '已送審',
    badgeClass: 'status-badge--submitted',
    message: '資料已送出審核，請等待審核結果。',
  },
  L1Approved: {
    label: '一階審核通過',
    badgeClass: 'status-badge--l1',
    message: '資料已通過一階審核，可進行二階審核。',
  },
  L2Approved: {
    label: '二階審核通過',
    badgeClass: 'status-badge--l2',
    message: '資料已完成二階審核，所有操作已鎖定。',
  },
};

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

export function initMobileSources() {
  const tableBody = document.getElementById('mobileActivityTableBody');
  const emptyMessage = document.getElementById('mobileEmptyMessage');
  const inventoryYearDisplay = document.getElementById('inventoryYearDisplay');
  const auditStatusBadge = document.getElementById('auditStatusBadge');
  const auditButtons = document.getElementById('auditActionButtons');
  const auditMessage = document.getElementById('auditStatusMessage');
  const openAddButton = document.getElementById('openAddActivity');
  const addModal = document.getElementById('addActivityModal');
  const addForm = document.getElementById('addActivityForm') as HTMLFormElement | null;
  const addModalError = document.getElementById('addModalError');
  const modalStationName = document.getElementById('modalStationName');
  const depotSelect = document.getElementById('modalDepotSelect') as HTMLSelectElement | null;
  const vehicleSelect = document.getElementById('modalVehicleSelect') as HTMLSelectElement | null;
  const fuelSelect = document.getElementById('modalFuelSelect') as HTMLSelectElement | null;
  const monthSelect = document.getElementById('modalMonthSelect') as HTMLSelectElement | null;
  const volumeInput = document.getElementById('modalVolumeInput') as HTMLInputElement | null;
  const dataSourceInput = document.getElementById('modalDataSource') as HTMLInputElement | null;
  const notesInput = document.getElementById('modalNotes') as HTMLTextAreaElement | null;
  const dropZone = document.getElementById('mobileAttachmentDropZone');
  const attachmentInput = document.getElementById('mobileAttachmentInput') as HTMLInputElement | null;
  const attachmentList = document.getElementById('mobileAttachmentList');
  const triggerAttachmentButton = document.getElementById('triggerAttachmentInput');
  const returnModal = document.getElementById('returnReasonModal');
  const returnForm = document.getElementById('returnReasonForm') as HTMLFormElement | null;
  const returnReasonInput = document.getElementById('returnReasonInput') as HTMLTextAreaElement | null;
  const returnModalError = document.getElementById('returnModalError');

  if (!tableBody || !emptyMessage || !inventoryYearDisplay || !auditStatusBadge || !auditButtons || !auditMessage) {
    return;
  }

  let records: ActivityRecord[] = [];
  let currentStatus: AuditStatus = 'Draft';
  let pendingAttachments: Attachment[] = [];

  inventoryYearDisplay.textContent = `${INVENTORY_YEAR} 年`;
  if (modalStationName) {
    modalStationName.textContent = DEFAULT_STATION;
  }

  populateDepotOptions();
  populateFuelOptions();
  populateMonthOptions();

  if (openAddButton && addModal) {
    openAddButton.addEventListener('click', () => {
      openModal(addModal);
      resetAddForm();
    });
  }

  setupModalDismissal(addModal, resetAddForm);
  setupModalDismissal(returnModal);

  if (triggerAttachmentButton && attachmentInput) {
    triggerAttachmentButton.addEventListener('click', () => attachmentInput.click());
  }

  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      const files = attachmentInput.files;
      if (files) {
        Array.from(files).forEach((file) => {
          pendingAttachments.push({ name: file.name, url: URL.createObjectURL(file) });
        });
        renderAttachmentList(attachmentList, pendingAttachments);
        attachmentInput.value = '';
      }
    });
  }

  if (dropZone) {
    ['dragenter', 'dragover'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add('is-dragover');
      });
    });

    ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove('is-dragover');
      });
    });

    dropZone.addEventListener('drop', (event) => {
      const transfer = event.dataTransfer;
      if (transfer?.files?.length) {
        Array.from(transfer.files).forEach((file) => {
          pendingAttachments.push({ name: file.name, url: URL.createObjectURL(file) });
        });
        renderAttachmentList(attachmentList, pendingAttachments);
      }
    });

    dropZone.addEventListener('keydown', (event) => {
      if ((event.key === 'Enter' || event.key === ' ') && attachmentInput) {
        event.preventDefault();
        attachmentInput.click();
      }
    });
  }

  depotSelect?.addEventListener('change', () => {
    updateVehicleOptions();
  });

  if (addForm) {
    addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!depotSelect || !vehicleSelect || !fuelSelect || !monthSelect || !volumeInput || !dataSourceInput) {
        return;
      }

      const depot = depotSelect.value.trim();
      const vehicle = vehicleSelect.value.trim();
      const fuelType = fuelSelect.value as FuelType;
      const month = Number(monthSelect.value);
      const volume = Number(volumeInput.value);
      const dataSource = dataSourceInput.value.trim();
      const notes = notesInput?.value.trim() || '';

      if (!depot || !vehicle || !fuelType || !month || Number.isNaN(volume) || volume < 0 || !dataSource) {
        if (addModalError) {
          addModalError.textContent = '請確認已填寫所有必填欄位，且加油量不可為負數。';
          addModalError.removeAttribute('hidden');
        }
        return;
      }

      const normalizedFuel = normalizeFuelType(fuelType);
      if (!normalizedFuel) {
        if (addModalError) {
          addModalError.textContent = '油料種類不在允許範圍內，請重新選擇。';
          addModalError.removeAttribute('hidden');
        }
        return;
      }

      const record: ActivityRecord = {
        station: findStationByDepot(depot) || DEFAULT_STATION,
        depot,
        vehicle,
        fuelType: normalizedFuel,
        month,
        volume,
        dataSource,
        notes: notes || undefined,
        attachments: pendingAttachments.slice(),
      };

      records.push(record);
      renderTable();
      resetAddForm();
      if (addModal) {
        closeModal(addModal);
      }
    });
  }

  if (returnForm) {
    returnForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!returnReasonInput) {
        return;
      }
      const reason = returnReasonInput.value.trim();
      if (!reason) {
        if (returnModalError) {
          returnModalError.textContent = '請輸入退回原因後再送出。';
          returnModalError.removeAttribute('hidden');
        }
        return;
      }

      updateAuditStatus('Draft', { returnReason: reason });
      returnReasonInput.value = '';
      if (returnModalError) {
        returnModalError.textContent = '';
        returnModalError.setAttribute('hidden', '');
      }
      if (returnModal) {
        closeModal(returnModal);
      }
    });
  }

  updateAuditStatus('Draft');
  loadInitialData();

  function loadInitialData() {
    fetch(DATA_URL)
      .then((response) => (response.ok ? response.text() : ''))
      .then((text) => {
        if (!text) {
          renderTable();
          return;
        }
        const rows = parseCsv(text);
        records = rows
          .map((row) => csvRowToRecord(row))
          .filter((record): record is ActivityRecord => Boolean(record));
        renderTable();
      })
      .catch(() => {
        renderTable();
      });
  }

  function renderTable() {
    tableBody.innerHTML = '';

    if (records.length === 0) {
      emptyMessage.removeAttribute('hidden');
      return;
    }

    emptyMessage.setAttribute('hidden', '');

    records.forEach((record) => {
      const factor = FACTOR_TABLE[record.fuelType];
      const emission = calculateEmission(record.volume, factor);
      const row = document.createElement('tr');

      row.appendChild(createCell('—'));
      row.appendChild(createCell(record.station));
      row.appendChild(createCell(record.depot, true));
      row.appendChild(createCell(record.vehicle, true));
      row.appendChild(createCell(record.fuelType, true));
      row.appendChild(createCell(`${record.month} 月`, true));
      row.appendChild(createCell(formatVolume(record.volume), true));
      row.appendChild(createCell(formatFactor(factor.co2)));
      row.appendChild(createCell(factor.co2Unit));
      row.appendChild(createCell(formatNumber(factor.co2Gwp)));
      row.appendChild(createCell(formatFactor(factor.ch4)));
      row.appendChild(createCell(factor.ch4Unit));
      row.appendChild(createCell(formatNumber(factor.ch4Gwp)));
      row.appendChild(createCell(formatFactor(factor.n2o)));
      row.appendChild(createCell(factor.n2oUnit));
      row.appendChild(createCell(formatNumber(factor.n2oGwp)));
      row.appendChild(createCell(formatEmission(emission)));
      row.appendChild(createCell(factor.source));
      row.appendChild(createAttachmentCell(record.attachments));
      row.appendChild(createCell(record.dataSource, true));
      row.appendChild(createCell(record.notes || '—', true));

      tableBody.appendChild(row);
    });
  }

  function renderAuditButtons() {
    auditButtons.innerHTML = '';

    const buttonGroup: Array<{ label: string; handler: () => void; variant?: 'primary' | 'secondary' }> = [];

    if (currentStatus === 'Draft') {
      buttonGroup.push({ label: '送審', handler: () => updateAuditStatus('Submitted'), variant: 'primary' });
    } else if (currentStatus === 'Submitted' || currentStatus === 'L1Approved') {
      buttonGroup.push({ label: '審核通過', handler: handleApprove, variant: 'primary' });
      buttonGroup.push({ label: '退回', handler: () => openReturnModal() });
    }

    buttonGroup.forEach((buttonConfig) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = buttonConfig.label;
      button.className = buttonConfig.variant === 'primary' ? 'primary-button' : 'secondary-button';
      button.addEventListener('click', buttonConfig.handler);
      auditButtons.appendChild(button);
    });
  }

  function handleApprove() {
    if (currentStatus === 'Submitted') {
      updateAuditStatus('L1Approved');
    } else if (currentStatus === 'L1Approved') {
      updateAuditStatus('L2Approved');
    }
  }

  function openReturnModal() {
    if (!returnModal) {
      return;
    }
    if (returnModalError) {
      returnModalError.textContent = '';
      returnModalError.setAttribute('hidden', '');
    }
    if (returnReasonInput) {
      returnReasonInput.value = '';
    }
    openModal(returnModal);
  }

  function updateAuditStatus(status: AuditStatus, details?: { returnReason?: string }) {
    currentStatus = status;
    const config = STATUS_CONFIG[status];
    auditStatusBadge.textContent = config.label;
    auditStatusBadge.className = `status-badge ${config.badgeClass}`;

    if (status === 'Draft' && details?.returnReason) {
      auditMessage.textContent = `資料已被退回，原因：${details.returnReason}`;
    } else {
      auditMessage.textContent = config.message;
    }

    renderAuditButtons();
    toggleFormAvailability();
  }

  function toggleFormAvailability() {
    const disableForm = currentStatus === 'L2Approved';
    if (openAddButton) {
      openAddButton.toggleAttribute('disabled', disableForm);
    }
  }

  function csvRowToRecord(row: CsvRow): ActivityRecord | null {
    const fuelType = normalizeFuelType(row.fuelType);
    const month = Number(row.month);
    const volume = Number(row.volume);

    if (!fuelType || Number.isNaN(month) || Number.isNaN(volume)) {
      return null;
    }

    return {
      station: row.station?.trim() || findStationByDepot(row.depot) || DEFAULT_STATION,
      depot: row.depot.trim(),
      vehicle: row.vehicle.trim(),
      fuelType,
      month,
      volume,
      dataSource: row.dataSource.trim(),
      notes: row.notes?.trim() || undefined,
      attachments: parseAttachmentField(row.attachments || ''),
    };
  }

  function parseCsv(text: string): CsvRow[] {
    const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length <= 1) {
      return [];
    }
    const headers = lines[0].split(',').map((header) => header.trim());

    return lines.slice(1).map((line) => {
      const values = line.split(',').map((value) => value.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] ?? '';
      });
      return row as CsvRow;
    });
  }

  function parseAttachmentField(field: string): Attachment[] {
    if (!field) {
      return [];
    }
    return field
      .split(';')
      .map((entry) => parseAttachmentEntry(entry))
      .filter((attachment): attachment is Attachment => Boolean(attachment));
  }

  function parseAttachmentEntry(entry: string): Attachment | null {
    const [namePart, urlPart] = entry.split('|').map((value) => value.trim());
    if (!namePart) {
      return null;
    }
    const url = resolveAttachmentUrl(urlPart || namePart);
    return { name: namePart, url };
  }

  function resolveAttachmentUrl(path: string) {
    if (!path) {
      return '';
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    try {
      return new URL(path, `${window.location.origin}${import.meta.env.BASE_URL}`).toString();
    } catch {
      return path;
    }
  }

  function findStationByDepot(depot: string) {
    return DEPOTS.find((definition) => definition.name === depot)?.station || '';
  }

  function normalizeFuelType(fuel: string): FuelType | null {
    const trimmed = fuel.trim() as FuelType;
    return trimmed in FACTOR_TABLE ? trimmed : null;
  }

  function populateDepotOptions() {
    if (!depotSelect) {
      return;
    }
    depotSelect.innerHTML = '';
    DEPOTS.forEach((depot, index) => {
      const option = document.createElement('option');
      option.value = depot.name;
      option.textContent = depot.name;
      if (index === 0) {
        option.selected = true;
      }
      depotSelect.appendChild(option);
    });
    updateVehicleOptions();
  }

  function updateVehicleOptions() {
    if (!depotSelect || !vehicleSelect) {
      return;
    }
    const selectedDepot = depotSelect.value;
    const depot = DEPOTS.find((definition) => definition.name === selectedDepot);
    const vehicles = depot?.vehicles || [];
    vehicleSelect.innerHTML = '';

    vehicles.forEach((vehicle, index) => {
      const option = document.createElement('option');
      option.value = vehicle;
      option.textContent = vehicle;
      if (index === 0) {
        option.selected = true;
      }
      vehicleSelect.appendChild(option);
    });
  }

  function populateFuelOptions() {
    if (!fuelSelect) {
      return;
    }
    fuelSelect.innerHTML = '';
    (Object.keys(FACTOR_TABLE) as FuelType[]).forEach((fuel) => {
      const option = document.createElement('option');
      option.value = fuel;
      option.textContent = fuel;
      fuelSelect.appendChild(option);
    });
  }

  function populateMonthOptions() {
    if (!monthSelect) {
      return;
    }
    monthSelect.innerHTML = '';
    MONTH_OPTIONS.forEach((month) => {
      const option = document.createElement('option');
      option.value = String(month);
      option.textContent = `${month} 月`;
      monthSelect.appendChild(option);
    });
  }

  function resetAddForm() {
    if (!addForm) {
      return;
    }
    addForm.reset();
    pendingAttachments = [];
    renderAttachmentList(attachmentList, pendingAttachments);
    if (addModalError) {
      addModalError.textContent = '';
      addModalError.setAttribute('hidden', '');
    }
    populateDepotOptions();
    populateFuelOptions();
    populateMonthOptions();
  }

  function renderAttachmentList(container: HTMLElement | null, attachments: Attachment[]) {
    if (!container) {
      return;
    }
    container.innerHTML = '';
    attachments.forEach((attachment) => {
      const item = document.createElement('li');
      item.textContent = attachment.name;
      container.appendChild(item);
    });
  }

  function createAttachmentCell(attachments: Attachment[]) {
    const cell = document.createElement('td');
    cell.classList.add('editable');
    if (attachments.length === 0) {
      cell.textContent = '—';
      return cell;
    }

    const list = document.createElement('ul');
    list.className = 'record-attachments';

    attachments.forEach((attachment) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = attachment.url;
      link.textContent = attachment.name;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.download = attachment.name;
      item.appendChild(link);
      list.appendChild(item);
    });

    cell.appendChild(list);
    return cell;
  }

  function createCell(value: string, editable = false) {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (editable) {
      cell.classList.add('editable');
    }
    return cell;
  }

  function calculateEmission(volume: number, factor: FactorEntry) {
    return volume * factor.co2 * factor.co2Gwp + volume * factor.ch4 * factor.ch4Gwp + volume * factor.n2o * factor.n2oGwp;
  }

  function formatVolume(volume: number) {
    return `${formatNumber(volume, 2)}`;
  }

  function formatFactor(value: number) {
    return formatNumber(value, value < 1 ? 5 : 2);
  }

  function formatEmission(value: number) {
    return formatNumber(value, 2);
  }

  function formatNumber(value: number, fractionDigits = 0) {
    return new Intl.NumberFormat('zh-TW', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  }

  function openModal(modal: HTMLElement | null) {
    if (!modal) {
      return;
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal: HTMLElement | null) {
    if (!modal) {
      return;
    }
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setupModalDismissal(modal: HTMLElement | null, onClose?: () => void) {
    if (!modal) {
      return;
    }
    modal.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('[data-close-modal]')) {
        if (onClose) {
          onClose();
        }
        closeModal(modal);
      }
    });
  }
}
