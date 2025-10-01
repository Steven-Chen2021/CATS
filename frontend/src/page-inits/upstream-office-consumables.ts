import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type Attachment = { name: string; url: string };

type ConsumableRecord = {
  location: string;
  month: number;
  item: string;
  vehicle: string;
  fuelType: string;
  origin: string;
  destination: string;
  quantity: number;
  unitWeightKg: number;
  distanceKm: number;
  dataSource: string;
  factorSource: string;
  attachments: Attachment[];
  notes?: string;
};

type Option = { value: string | number; label: string };

const INVENTORY_YEAR = '2024';
const SITE_NAME = '北區營運總部';

const DEPOT_OPTIONS = ['松山辦公中心', '板橋物流據點', '桃園文件倉庫'];

const VEHICLE_OPTIONS = ['3.5T 以下小貨車', '5T 文件專車', '電動配送廂型車'];

const FUEL_OPTIONS = ['92 無鉛汽油', '95 無鉛汽油', '98 無鉛汽油', '柴油', '電力'];

const CONSUMABLE_ITEMS: { name: string; weightKg: number }[] = [
  { name: 'A4 影印紙 (5 仟/箱)', weightKg: 12.5 },
  { name: 'A3 影印紙 (3 仟/箱)', weightKg: 13.2 },
  { name: '高解析度碳粉匣', weightKg: 0.95 },
  { name: '裝訂耗材組', weightKg: 2.1 },
  { name: '辦公文具補充包', weightKg: 5.6 },
  { name: '電腦周邊配件箱', weightKg: 7.8 },
];

const EMISSION_FACTORS: Record<string, number> = {
  '3.5T 以下小貨車|92 無鉛汽油': 0.168,
  '3.5T 以下小貨車|95 無鉛汽油': 0.171,
  '3.5T 以下小貨車|98 無鉛汽油': 0.176,
  '3.5T 以下小貨車|柴油': 0.149,
  '5T 文件專車|柴油': 0.138,
  '5T 文件專車|95 無鉛汽油': 0.174,
  '電動配送廂型車|電力': 0.055,
};

const FACTOR_SOURCE = '企業運輸排放係數表 (2024)';
const CONSUMABLES_DATA_PATH = `${import.meta.env.BASE_URL}data/upstream-office-consumables.csv`;
const ATTACHMENT_BASE_PATH = `${import.meta.env.BASE_URL}attachments/`;

const numberFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const weightFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function initUpstreamOfficeConsumables() {
  const statusLabel = document.getElementById('auditStatusLabel');
  const actionContainer = document.getElementById('auditActionButtons');
  const messageArea = document.getElementById('auditStatusMessage');
  const yearDisplay = document.getElementById('inventoryYearDisplay');
  const tableBody = document.getElementById('consumablesTableBody');
  const emptyMessage = document.getElementById('emptyTableMessage');
  const addButton = document.getElementById('addRecordButton');
  const addModal = document.getElementById('addRecordModal');
  const addForm = document.getElementById('addRecordForm') as HTMLFormElement | null;
  const itemSelect = document.getElementById('modalItemSelect') as HTMLSelectElement | null;
  const unitWeightInput = document.getElementById('unitWeightInput') as HTMLInputElement | null;
  const monthSelect = document.getElementById('modalMonthSelect') as HTMLSelectElement | null;
  const siteSelect = document.getElementById('modalSiteSelect') as HTMLSelectElement | null;
  const vehicleSelect = document.getElementById('modalVehicleSelect') as HTMLSelectElement | null;
  const fuelSelect = document.getElementById('modalFuelSelect') as HTMLSelectElement | null;
  const attachmentInput = document.getElementById('attachmentInput') as HTMLInputElement | null;
  const attachmentList = document.getElementById('attachmentList');
  const dropZone = document.getElementById('attachmentDropZone');
  const browseButton = document.getElementById('browseAttachmentButton');
  const addError = document.getElementById('addRecordError');
  const reasonModal = document.getElementById('returnReasonModal');
  const reasonForm = document.getElementById('returnReasonForm') as HTMLFormElement | null;
  const reasonInput = document.getElementById('returnReasonInput') as HTMLTextAreaElement | null;
  const reasonError = document.getElementById('returnReasonError');

  if (
    !statusLabel ||
    !actionContainer ||
    !messageArea ||
    !yearDisplay ||
    !tableBody ||
    !emptyMessage ||
    !addButton ||
    !addModal ||
    !addForm ||
    !itemSelect ||
    !unitWeightInput ||
    !monthSelect ||
    !siteSelect ||
    !vehicleSelect ||
    !fuelSelect ||
    !attachmentInput ||
    !attachmentList ||
    !dropZone ||
    !browseButton ||
    !addError ||
    !reasonModal ||
    !reasonForm ||
    !reasonInput ||
    !reasonError
  ) {
    return;
  }

  yearDisplay.textContent = `${INVENTORY_YEAR} 年`;

  let records: ConsumableRecord[] = [];

  let currentStatus: AuditStatus = 'Draft';
  let currentAttachments: Attachment[] = [];
  let statusTimeout: number | undefined;

  populateSelect(
    monthSelect,
    Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` })),
    '請選擇月份'
  );

  populateSelect(siteSelect, DEPOT_OPTIONS.map((label) => ({ value: label, label })), '請選擇據點');
  populateSelect(vehicleSelect, VEHICLE_OPTIONS.map((label) => ({ value: label, label })), '請選擇運具');
  populateSelect(fuelSelect, FUEL_OPTIONS.map((label) => ({ value: label, label })), '請選擇燃料');
  populateSelect(
    itemSelect,
    CONSUMABLE_ITEMS.map((item) => ({ value: item.name, label: `${item.name}（${item.weightKg} kg/件）` })),
    '請選擇耗材品項'
  );

  itemSelect.addEventListener('change', () => {
    const selected = CONSUMABLE_ITEMS.find((item) => item.name === itemSelect.value);
    if (selected) {
      unitWeightInput.value = selected.weightKg.toString();
    }
  });

  browseButton.addEventListener('click', () => attachmentInput.click());

  attachmentInput.addEventListener('change', () => {
    revokeAttachmentUrls(currentAttachments);
    currentAttachments = collectAttachments(attachmentInput.files);
    renderAttachmentList(attachmentList, currentAttachments);
    attachmentInput.value = '';
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
    if (files && files.length > 0) {
      revokeAttachmentUrls(currentAttachments);
      currentAttachments = collectAttachments(files);
      renderAttachmentList(attachmentList, currentAttachments);
      attachmentInput.value = '';
    }
  });

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addError.textContent = '';

    try {
      const formData = new FormData(addForm);
      const quantity = getNonNegativeNumber(formData.get('quantity'), '品項數量');
      const unitWeightKg = getNonNegativeNumber(formData.get('unitWeight'), '單品重量');
      const distanceKm = getNonNegativeNumber(formData.get('distance'), '運輸距離');

      const record: ConsumableRecord = {
        location: String(formData.get('site') || ''),
        month: Number(formData.get('month') || 0),
        item: String(formData.get('item') || ''),
        vehicle: String(formData.get('vehicle') || ''),
        fuelType: String(formData.get('fuelType') || ''),
        origin: String(formData.get('origin') || ''),
        destination: String(formData.get('destination') || ''),
        quantity,
        unitWeightKg,
        distanceKm,
        dataSource: String(formData.get('dataSource') || ''),
        factorSource: FACTOR_SOURCE,
        attachments: [...currentAttachments],
        notes: String(formData.get('notes') || '').trim() || undefined,
      };

      records.push(record);
      renderTable();
      closeModal(addModal);
      addForm.reset();
      currentAttachments = [];
      renderAttachmentList(attachmentList, currentAttachments);
      unitWeightInput.value = '';
      showMessage(`${record.item} 已新增至活動資料。`);
    } catch (error) {
      addError.textContent = error instanceof Error ? error.message : '欄位驗證失敗，請重新確認。';
    }
  });

  addButton.addEventListener('click', () => {
    addForm.reset();
    revokeAttachmentUrls(currentAttachments);
    currentAttachments = [];
    renderAttachmentList(attachmentList, currentAttachments);
    unitWeightInput.value = '';
    attachmentInput.value = '';
    openModal(addModal);
    addError.textContent = '';
    monthSelect.focus();
  });

  setupModalDismissal(addModal);
  setupModalDismissal(reasonModal);

  reasonForm.addEventListener('submit', (event) => {
    event.preventDefault();
    reasonError.textContent = '';

    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonError.textContent = '請填寫退回原因後再送出。';
      return;
    }

    currentStatus = 'Draft';
    updateStatusUI();
    closeModal(reasonModal);
    reasonInput.value = '';
    showMessage(`資料已退回。原因：${reason}`);
  });

  void loadInitialRecords();
  renderTable();
  updateStatusUI();

  async function loadInitialRecords() {
    try {
      const rows = await loadCsvRows(CONSUMABLES_DATA_PATH);
      records = rows
        .map(mapRowToRecord)
        .filter((record): record is ConsumableRecord => record !== null);
      renderTable();
    } catch (error) {
      console.error('Failed to load consumable records from CSV.', error);
      showMessage('初始化資料載入失敗，請稍後再試。');
    }
  }

  function renderTable() {
    tableBody.innerHTML = '';

    if (records.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    emptyMessage.hidden = true;

    records.forEach((record) => {
      const row = document.createElement('tr');
      const totalWeight = (record.quantity * record.unitWeightKg) / 1000;
      const emissionFactor = resolveEmissionFactor(record.vehicle, record.fuelType);
      const emission = totalWeight * record.distanceKm * emissionFactor;

      appendCell(row, SITE_NAME);
      appendCell(row, record.location, true);
      appendCell(row, `${record.month} 月`, true);
      appendCell(row, record.item, true);
      appendCell(row, record.vehicle, true);
      appendCell(row, record.fuelType, true);
      appendCell(row, record.origin, true);
      appendCell(row, record.destination, true);
      appendCell(row, numberFormatter.format(record.quantity), true);
      appendCell(row, numberFormatter.format(record.unitWeightKg), true);
      appendCell(row, weightFormatter.format(totalWeight));
      appendCell(row, numberFormatter.format(record.distanceKm), true);
      appendCell(row, weightFormatter.format(emissionFactor));
      appendCell(row, numberFormatter.format(emission));
      appendCell(row, record.dataSource, true);
      appendCell(row, record.factorSource);
      row.appendChild(createAttachmentCell(record));

      tableBody.appendChild(row);
    });
  }

  function mapRowToRecord(row: CsvRow): ConsumableRecord | null {
    const month = parseInteger(row.month);
    const quantity = parseNumber(row.quantity);
    const unitWeightKg = parseNumber(row.unitWeightKg);
    const distanceKm = parseNumber(row.distanceKm);

    if (!row.location || !row.item || !row.vehicle || !row.fuelType || !row.origin || !row.destination) {
      return null;
    }

    if (!Number.isFinite(month) || month <= 0) {
      return null;
    }

    if (!Number.isFinite(quantity) || !Number.isFinite(unitWeightKg) || !Number.isFinite(distanceKm)) {
      return null;
    }

    return {
      location: row.location,
      month,
      item: row.item,
      vehicle: row.vehicle,
      fuelType: row.fuelType,
      origin: row.origin,
      destination: row.destination,
      quantity,
      unitWeightKg,
      distanceKm,
      dataSource: row.dataSource?.trim() || '',
      factorSource: row.factorSource?.trim() || FACTOR_SOURCE,
      attachments: parseAttachmentList(row.attachments),
      notes: row.notes?.trim() ? row.notes.trim() : undefined,
    };
  }

  function parseAttachmentList(value?: string): Attachment[] {
    if (!value) {
      return [];
    }

    return value
      .split(/[;,]/)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((entry) => parseAttachmentEntry(entry))
      .filter((attachment): attachment is Attachment => Boolean(attachment));
  }

  function parseAttachmentEntry(entry: string): Attachment | null {
    if (!entry) {
      return null;
    }

    const [rawName, rawUrl] = entry.split('|');
    const name = rawName?.trim() ?? '';

    if (!name) {
      return null;
    }

    const url = rawUrl && rawUrl.trim().length > 0
      ? resolveAttachmentUrl(rawUrl.trim())
      : `${ATTACHMENT_BASE_PATH}${encodeURIComponent(name)}`;

    return { name, url };
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

  function parseNumber(value?: string): number {
    const result = Number(value ?? '');
    return Number.isFinite(result) ? result : NaN;
  }

  function parseInteger(value?: string): number {
    const result = Number.parseInt(value ?? '', 10);
    return Number.isFinite(result) ? result : NaN;
  }

  function updateStatusUI() {
    const { label, className } = mapStatusToDisplay(currentStatus);
    statusLabel.textContent = label;
    statusLabel.className = `status-badge ${className}`;

    actionContainer.innerHTML = '';

    if (currentStatus === 'Draft') {
      actionContainer.appendChild(createActionButton('送審', () => {
        currentStatus = 'Submitted';
        updateStatusUI();
        showMessage('資料已送審，等待 L1 審核。');
      }));
    } else if (currentStatus === 'Submitted' || currentStatus === 'L1Approved') {
      actionContainer.appendChild(
        createActionButton('退回', () => {
          reasonError.textContent = '';
          reasonInput.value = '';
          openModal(reasonModal);
          reasonInput.focus();
        }, true)
      );

      actionContainer.appendChild(
        createActionButton('審核通過', () => {
          if (currentStatus === 'Submitted') {
            currentStatus = 'L1Approved';
            showMessage('資料已通過 L1 審核，等待 L2 審核。');
          } else {
            currentStatus = 'L2Approved';
            showMessage('資料已完成 L2 審核。');
          }
          updateStatusUI();
        })
      );
    }
  }

  function showMessage(message: string) {
    messageArea.textContent = message;
    if (statusTimeout) {
      window.clearTimeout(statusTimeout);
    }
    statusTimeout = window.setTimeout(() => {
      messageArea.textContent = '';
    }, 5000);
  }

  function createActionButton(label: string, onClick: () => void, isSecondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isSecondary ? 'secondary-button' : 'primary-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function mapStatusToDisplay(status: AuditStatus) {
    switch (status) {
      case 'Draft':
        return { label: '草稿', className: 'status-badge--draft' };
      case 'Submitted':
        return { label: '待審 (L1)', className: 'status-badge--submitted' };
      case 'L1Approved':
        return { label: 'L1 審核通過', className: 'status-badge--l1' };
      case 'L2Approved':
        return { label: 'L2 審核通過', className: 'status-badge--l2' };
      default:
        return { label: '草稿', className: 'status-badge--draft' };
    }
  }

  function resolveEmissionFactor(vehicle: string, fuel: string) {
    const key = `${vehicle}|${fuel}`;
    return EMISSION_FACTORS[key] ?? 0.102;
  }

  function createAttachmentCell(record: ConsumableRecord) {
    const cell = document.createElement('td');
    cell.classList.add('attachment-cell', 'is-editable-cell');

    if (record.attachments.length > 0) {
      const list = document.createElement('ul');
      list.className = 'attachment-links';

      record.attachments.forEach(({ name, url }) => {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = url;
        link.textContent = name;
        link.download = name;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        item.appendChild(link);
        list.appendChild(item);
      });

      cell.appendChild(list);
    } else {
      const placeholder = document.createElement('span');
      placeholder.className = 'attachment-empty';
      placeholder.textContent = '未上傳';
      cell.appendChild(placeholder);
    }

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.multiple = true;
    fileInput.hidden = true;

    const uploadButton = document.createElement('button');
    uploadButton.type = 'button';
    uploadButton.className = 'attachment-upload-button';
    uploadButton.textContent = record.attachments.length > 0 ? '重新上傳' : '上傳附件';

    uploadButton.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', () => {
      const files = fileInput.files;
      if (!files || files.length === 0) {
        return;
      }

      revokeAttachmentUrls(record.attachments);
      record.attachments = collectAttachments(files);
      fileInput.value = '';
      renderTable();
      showMessage(`${record.item} 的附件已更新。`);
    });

    cell.appendChild(fileInput);
    cell.appendChild(uploadButton);

    return cell;
  }

  function appendCell(row: HTMLTableRowElement, text: string, isEditable = false) {
    const cell = document.createElement('td');
    if (isEditable) {
      cell.classList.add('is-editable-cell');
    }
    cell.textContent = text;
    row.appendChild(cell);
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
      const el = document.createElement('option');
      el.value = String(option.value);
      el.textContent = option.label;
      select.appendChild(el);
    });
  }

  function getNonNegativeNumber(value: FormDataEntryValue | null, label: string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new Error(`${label} 需輸入 0 以上之數值。`);
    }
    return numeric;
  }

  function collectAttachments(fileList: FileList | null): Attachment[] {
    if (!fileList || fileList.length === 0) {
      return [];
    }

    return Array.from(fileList).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }

  function renderAttachmentList(list: HTMLElement, attachments: Attachment[]) {
    list.innerHTML = '';
    attachments.forEach(({ name }) => {
      const item = document.createElement('li');
      item.textContent = name;
      list.appendChild(item);
    });
  }

  function revokeAttachmentUrls(attachments: Attachment[]) {
    attachments
      .filter((attachment) => attachment.url.startsWith('blob:'))
      .forEach((attachment) => URL.revokeObjectURL(attachment.url));
  }

  function openModal(modal: HTMLElement) {
    modal.classList.add('is-active');
    modal.setAttribute('aria-hidden', 'false');
  }

  function closeModal(modal: HTMLElement) {
    modal.classList.remove('is-active');
    modal.setAttribute('aria-hidden', 'true');
  }

  function setupModalDismissal(modal: HTMLElement) {
    modal.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.matches('[data-close-modal]')) {
        closeModal(modal);
      }
    });
  }
}
