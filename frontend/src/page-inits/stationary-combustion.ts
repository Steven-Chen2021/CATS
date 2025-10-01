import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

const LITER_PER_GALLON = 3.78541;

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type FuelType = '92 無鉛汽油' | '95 無鉛汽油' | '98 無鉛汽油' | '柴油';

type CombustionRecord = {
  depot: string;
  activityId: string;
  fuelType: FuelType;
  month: number;
  quantity: number;
  unit: '公升' | '加侖';
  dataSource: string;
  notes?: string;
  attachments: string[];
};

type ActivityDefinition = {
  id: string;
  name: string;
  equipmentCode: string;
  supportedFuels: FuelType[];
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

type Option = { value: string | number; label: string };

const INVENTORY_YEAR = 2024;
const SITE_NAME = '中部營運總部';

const DEPOT_OPTIONS = ['台中營運中心', '彰化配送據點', '南投備援倉'];

const ACTIVITIES: ActivityDefinition[] = [
  {
    id: 'GEN-001',
    name: '台中營運中心緊急發電機',
    equipmentCode: 'GEN-001',
    supportedFuels: ['柴油'],
  },
  {
    id: 'GEN-002',
    name: '倉儲棟後備發電機',
    equipmentCode: 'GEN-002',
    supportedFuels: ['92 無鉛汽油', '95 無鉛汽油'],
  },
  {
    id: 'BO-101',
    name: '鍋爐燃燒設備',
    equipmentCode: 'BO-101',
    supportedFuels: ['柴油', '98 無鉛汽油'],
  },
];

const FACTOR_SOURCE = '環保署固定燃燒排放係數表 (2024 年度)';
const COMBUSTION_DATA_PATH = `${import.meta.env.BASE_URL}data/stationary-combustion.csv`;

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
  '柴油': {
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

const ALL_FUELS = Object.keys(FACTOR_TABLE) as FuelType[];

const numberFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const emissionFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function initStationaryCombustion() {
  const inventoryYearEl = document.getElementById('stationaryInventoryYear');
  const statusLabel = document.getElementById('stationaryAuditStatus');
  const actionContainer = document.getElementById('stationaryAuditActions');
  const statusMessage = document.getElementById('stationaryAuditMessage');
  const tableBody = document.getElementById('stationaryTableBody');
  const emptyMessage = document.getElementById('stationaryEmptyMessage');
  const addButton = document.getElementById('addCombustionRecordButton');
  const addModal = document.getElementById('stationaryAddModal');
  const addForm = document.getElementById('stationaryAddForm') as HTMLFormElement | null;
  const depotSelect = document.getElementById('stationaryModalDepot') as HTMLSelectElement | null;
  const activitySelect = document.getElementById('stationaryModalActivity') as HTMLSelectElement | null;
  const fuelSelect = document.getElementById('stationaryModalFuel') as HTMLSelectElement | null;
  const monthSelect = document.getElementById('stationaryModalMonth') as HTMLSelectElement | null;
  const quantityInput = document.getElementById('stationaryModalQuantity') as HTMLInputElement | null;
  const unitSelect = document.getElementById('stationaryModalUnit') as HTMLSelectElement | null;
  const sourceInput = document.getElementById('stationaryModalSource') as HTMLInputElement | null;
  const notesInput = document.getElementById('stationaryModalNotes') as HTMLTextAreaElement | null;
  const attachmentInput = document.getElementById('stationaryModalAttachments') as HTMLInputElement | null;
  const attachmentList = document.getElementById('stationaryModalAttachmentList');
  const browseButton = document.getElementById('stationaryModalBrowse');
  const dropZone = document.getElementById('stationaryModalDropZone');
  const modalError = document.getElementById('stationaryModalError');
  const returnModal = document.getElementById('stationaryReturnModal');
  const returnForm = document.getElementById('stationaryReturnForm') as HTMLFormElement | null;
  const returnReasonInput = document.getElementById('stationaryReturnReason') as HTMLTextAreaElement | null;
  const returnError = document.getElementById('stationaryReturnError');

  if (
    !inventoryYearEl ||
    !statusLabel ||
    !actionContainer ||
    !statusMessage ||
    !tableBody ||
    !emptyMessage ||
    !addButton ||
    !addModal ||
    !addForm ||
    !depotSelect ||
    !activitySelect ||
    !fuelSelect ||
    !monthSelect ||
    !quantityInput ||
    !unitSelect ||
    !sourceInput ||
    !notesInput ||
    !attachmentInput ||
    !attachmentList ||
    !browseButton ||
    !dropZone ||
    !modalError ||
    !returnModal ||
    !returnForm ||
    !returnReasonInput ||
    !returnError
  ) {
    return;
  }

  inventoryYearEl.textContent = `${INVENTORY_YEAR} 年`;

  let currentStatus: AuditStatus = 'Draft';
  let currentAttachments: string[] = [];
  let presetContext: { depot?: string; activityId?: string; fuelType?: FuelType } | null = null;
  let statusResetTimeout: number | undefined;

  let records: CombustionRecord[] = [];

  populateSelect(
    depotSelect,
    DEPOT_OPTIONS.map((label) => ({ value: label, label })),
    '請選擇據點'
  );
  populateSelect(
    activitySelect,
    ACTIVITIES.map((activity) => ({ value: activity.id, label: activity.name })),
    '請選擇活動/設備'
  );
  populateSelect(
    monthSelect,
    Array.from({ length: 12 }, (_, index) => ({ value: index + 1, label: `${index + 1} 月` })),
    '請選擇月份'
  );
  setFuelOptionsForActivity('');

  activitySelect.addEventListener('change', () => {
    setFuelOptionsForActivity(activitySelect.value, fuelSelect.value as FuelType);
  });

  browseButton.addEventListener('click', () => attachmentInput.click());

  attachmentInput.addEventListener('change', () => {
    currentAttachments = collectAttachmentNames(attachmentInput.files);
    renderAttachmentList(attachmentList, currentAttachments);
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
    currentAttachments = collectAttachmentNames(files || null);
    renderAttachmentList(attachmentList, currentAttachments);
  });

  addButton.addEventListener('click', () => {
    presetContext = null;
    openAddModal();
  });

  Array.from(addModal.querySelectorAll('[data-close-modal]')).forEach((element) => {
    element.addEventListener('click', () => closeModal(addModal));
  });

  Array.from(returnModal.querySelectorAll('[data-close-modal]')).forEach((element) => {
    element.addEventListener('click', () => closeModal(returnModal));
  });

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    modalError.textContent = '';

    const depot = depotSelect.value;
    const activityId = activitySelect.value;
    const fuelType = fuelSelect.value as FuelType;
    const month = Number(monthSelect.value);
    const quantity = Number(quantityInput.value);
    const unit = unitSelect.value as '公升' | '加侖';
    const dataSource = sourceInput.value.trim();
    const notes = notesInput.value.trim();

    if (!depot || !activityId || !fuelType || !month || !Number.isFinite(quantity) || quantity < 0 || !dataSource) {
      modalError.textContent = '請確認已填寫所有必填欄位，並且採購量不可為負數。';
      return;
    }

    const record: CombustionRecord = {
      depot,
      activityId,
      fuelType,
      month,
      quantity,
      unit,
      dataSource,
      notes: notes ? notes : undefined,
      attachments: [...currentAttachments],
    };

    records.push(record);
    renderTable();
    addForm.reset();
    currentAttachments = [];
    renderAttachmentList(attachmentList, currentAttachments);
    closeModal(addModal);
    presetContext = null;
  });

  returnForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const reason = returnReasonInput.value.trim();
    if (!reason) {
      returnError.textContent = '退回原因為必填欄位。';
      return;
    }

    currentStatus = 'Draft';
    updateStatusUI('資料已退回，原因：' + reason);
    closeModal(returnModal);
    returnForm.reset();
    returnError.textContent = '';
  });

  returnForm.addEventListener('reset', () => {
    returnError.textContent = '';
  });

  void loadInitialRecords();
  updateStatusUI();
  renderTable();

  async function loadInitialRecords() {
    try {
      const rows = await loadCsvRows(COMBUSTION_DATA_PATH);
      records = rows
        .map(mapRowToRecord)
        .filter((record): record is CombustionRecord => record !== null);
      renderTable();
    } catch (error) {
      console.error('Failed to load stationary combustion records from CSV.', error);
      updateStatusUI('初始化資料載入失敗，請稍後再試。');
    }
  }

  function openAddModal() {
    if (presetContext?.depot) {
      depotSelect.value = presetContext.depot;
    } else if (DEPOT_OPTIONS.length === 1) {
      depotSelect.value = DEPOT_OPTIONS[0];
    } else {
      depotSelect.value = '';
    }

    if (presetContext?.activityId) {
      activitySelect.value = presetContext.activityId;
    } else {
      activitySelect.value = '';
    }

    setFuelOptionsForActivity(activitySelect.value, presetContext?.fuelType);

    monthSelect.value = '';
    quantityInput.value = '';
    unitSelect.value = '公升';
    sourceInput.value = '';
    notesInput.value = '';
    modalError.textContent = '';
    currentAttachments = [];
    renderAttachmentList(attachmentList, currentAttachments);

    openModal(addModal);
    depotSelect.focus();
  }

  function renderTable() {
    tableBody.innerHTML = '';
    if (records.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    emptyMessage.hidden = true;

    records.forEach((record) => {
      const activity = getActivityDefinition(record.activityId);
      const factor = FACTOR_TABLE[record.fuelType];
      const row = document.createElement('tr');

      const actionCell = document.createElement('td');
      actionCell.classList.add('col-actions');
      const createButton = document.createElement('button');
      createButton.type = 'button';
      createButton.className = 'secondary-button';
      createButton.textContent = '新增';
      createButton.addEventListener('click', () => {
        presetContext = {
          depot: record.depot,
          activityId: record.activityId,
          fuelType: record.fuelType,
        };
        openAddModal();
      });
      actionCell.appendChild(createButton);
      row.appendChild(actionCell);

      row.appendChild(createCell(SITE_NAME));
      row.appendChild(createCell(record.depot, true));
      row.appendChild(createCell(activity?.name || record.activityId, true));
      row.appendChild(createCell(activity?.equipmentCode || '—'));
      row.appendChild(createCell(record.fuelType, true));
      row.appendChild(createCell(`${record.month} 月`, true));
      row.appendChild(createCell(numberFormatter.format(record.quantity), true));
      row.appendChild(createCell(record.unit, true));

      if (factor) {
        row.appendChild(createCell(factor.co2.toFixed(5)));
        row.appendChild(createCell(factor.co2Unit));
        row.appendChild(createCell(numberFormatter.format(factor.co2Gwp)));
        row.appendChild(createCell(factor.ch4.toExponential(5)));
        row.appendChild(createCell(factor.ch4Unit));
        row.appendChild(createCell(numberFormatter.format(factor.ch4Gwp)));
        row.appendChild(createCell(factor.n2o.toExponential(5)));
        row.appendChild(createCell(factor.n2oUnit));
        row.appendChild(createCell(numberFormatter.format(factor.n2oGwp)));

        const quantityInLiters = record.unit === '加侖' ? record.quantity * LITER_PER_GALLON : record.quantity;
        const emission =
          quantityInLiters * factor.co2 * factor.co2Gwp +
          quantityInLiters * factor.ch4 * factor.ch4Gwp +
          quantityInLiters * factor.n2o * factor.n2oGwp;
        row.appendChild(createCell(emissionFormatter.format(emission)));
      } else {
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
        row.appendChild(createCell('—'));
      }

      row.appendChild(createCell(record.dataSource, true));
      row.appendChild(createCell(factor?.source || FACTOR_SOURCE));
      row.appendChild(createCell(record.notes || '—', true));

      tableBody.appendChild(row);
    });
  }

  function mapRowToRecord(row: CsvRow): CombustionRecord | null {
    const depot = row.depot?.trim();
    const activityId = row.activityId?.trim();
    const fuelType = (row.fuelType?.trim() ?? '') as FuelType;
    const month = parseInteger(row.month);
    const quantity = parseNumber(row.quantity);
    const unit = parseUnit(row.unit);

    if (!depot || !activityId || !ALL_FUELS.includes(fuelType) || !unit) {
      return null;
    }

    if (!Number.isFinite(month) || month < 1 || month > 12) {
      return null;
    }

    if (!Number.isFinite(quantity) || quantity < 0) {
      return null;
    }

    const notes = row.notes?.trim();

    return {
      depot,
      activityId,
      fuelType,
      month,
      quantity,
      unit,
      dataSource: row.dataSource?.trim() || '',
      notes: notes && notes.length > 0 ? notes : undefined,
      attachments: parseAttachmentList(row.attachments),
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

  function parseInteger(value?: string): number {
    const result = Number.parseInt(value ?? '', 10);
    return Number.isFinite(result) ? result : NaN;
  }

  function parseUnit(value?: string): CombustionRecord['unit'] | null {
    if (value === '公升' || value === '加侖') {
      return value;
    }
    return null;
  }

  function updateStatusUI(message?: string) {
    statusLabel.textContent = getStatusLabel(currentStatus);
    statusLabel.className = `status-badge ${getStatusClass(currentStatus)}`;
    renderStatusActions();

    statusMessage.textContent = message ?? '';

    if (statusResetTimeout) {
      window.clearTimeout(statusResetTimeout);
    }

    if (message) {
      statusResetTimeout = window.setTimeout(() => {
        statusMessage.textContent = '';
      }, 5000);
    }
  }

  function renderStatusActions() {
    actionContainer.innerHTML = '';

    if (currentStatus === 'Draft') {
      const submitButton = createActionButton('送審', () => {
        currentStatus = 'Submitted';
        updateStatusUI('資料已送出審核。');
      });
      actionContainer.appendChild(submitButton);
      return;
    }

    if (currentStatus === 'Submitted' || currentStatus === 'L1Approved') {
      const approveButton = createActionButton('審核通過', () => {
        if (currentStatus === 'Submitted') {
          currentStatus = 'L1Approved';
          updateStatusUI('已完成第一階段審核。');
        } else {
          currentStatus = 'L2Approved';
          updateStatusUI('資料已完成審核流程。');
        }
      });

      const returnButton = createActionButton('退回', () => {
        returnReasonInput.value = '';
        returnError.textContent = '';
        openModal(returnModal);
        returnReasonInput.focus();
      }, true);

      actionContainer.appendChild(approveButton);
      actionContainer.appendChild(returnButton);
      return;
    }
  }

  function openModal(modal: HTMLElement) {
    modal.setAttribute('aria-hidden', 'false');
    document.addEventListener('keydown', handleEscape, { once: true });
  }

  function closeModal(modal: HTMLElement) {
    modal.setAttribute('aria-hidden', 'true');
  }

  function handleEscape(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (addModal.getAttribute('aria-hidden') === 'false') {
        closeModal(addModal);
      }
      if (returnModal.getAttribute('aria-hidden') === 'false') {
        closeModal(returnModal);
      }
    }
  }

  function createCell(value: string, editable = false) {
    const cell = document.createElement('td');
    cell.textContent = value;
    if (editable) {
      cell.classList.add('editable-cell');
    }
    return cell;
  }

  function createActionButton(label: string, handler: () => void, isSecondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isSecondary ? 'secondary-button' : 'primary-button';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
  }

  function getStatusLabel(status: AuditStatus) {
    switch (status) {
      case 'Draft':
        return '草稿';
      case 'Submitted':
        return '待審核';
      case 'L1Approved':
        return '一階審核通過';
      case 'L2Approved':
        return '二階審核通過';
      default:
        return '';
    }
  }

  function getStatusClass(status: AuditStatus) {
    switch (status) {
      case 'Draft':
        return 'status-badge--draft';
      case 'Submitted':
        return 'status-badge--submitted';
      case 'L1Approved':
        return 'status-badge--l1';
      case 'L2Approved':
        return 'status-badge--l2';
      default:
        return 'status-badge--draft';
    }
  }

  function populateSelect(select: HTMLSelectElement, options: Option[], placeholder: string) {
    select.innerHTML = '';

    const placeholderOption = document.createElement('option');
    placeholderOption.value = '';
    placeholderOption.textContent = placeholder;
    placeholderOption.disabled = true;
    placeholderOption.selected = true;
    select.appendChild(placeholderOption);

    options.forEach((option) => {
      const element = document.createElement('option');
      element.value = String(option.value);
      element.textContent = option.label;
      select.appendChild(element);
    });
  }

  function populateFuelOptions(select: HTMLSelectElement, fuels: FuelType[], selected?: FuelType) {
    select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '請選擇油品';
    placeholder.disabled = true;
    if (!selected) {
      placeholder.selected = true;
    }
    select.appendChild(placeholder);

    fuels.forEach((fuel) => {
      const option = document.createElement('option');
      option.value = fuel;
      option.textContent = fuel;
      if (fuel === selected) {
        option.selected = true;
      }
      select.appendChild(option);
    });
  }

  function setFuelOptionsForActivity(activityId: string, selectedFuel?: FuelType) {
    const activity = getActivityDefinition(activityId);
    const fuels = activity ? activity.supportedFuels : ALL_FUELS;
    populateFuelOptions(fuelSelect, fuels, selectedFuel && fuels.includes(selectedFuel) ? selectedFuel : undefined);
  }

  function collectAttachmentNames(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      return [];
    }
    return Array.from(fileList).map((file) => file.name);
  }

  function renderAttachmentList(container: HTMLElement, attachments: string[]) {
    container.innerHTML = '';
    attachments.forEach((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      container.appendChild(item);
    });
  }

  function getActivityDefinition(id: string) {
    return ACTIVITIES.find((activity) => activity.id === id) || null;
  }
}
