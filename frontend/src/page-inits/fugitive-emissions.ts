import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type ContentType = 'CO2' | 'R134a' | 'R600a';

type Attachment = {
  name: string;
  url: string;
};

type FugitiveRecord = {
  station: string;
  depot: string;
  activityId: string;
  activityName: string;
  model: string;
  quantityKg: number;
  contentType: ContentType;
  emissionFactor: number;
  emissionFactorUnit: string;
  gwp: number;
  emissions: number;
  dataSource: string;
  factorSource: string;
  factorType: string;
  attachments: Attachment[];
  notes?: string;
};

type ActivityDefinition = {
  id: string;
  name: string;
  model: string;
};

type FactorDefinition = {
  factor: number;
  unit: string;
  gwp: number;
  source: string;
  factorType: string;
};

type StatusConfig = {
  label: string;
  badgeClass: string;
  message: string;
};

type FugitiveCsvRow = CsvRow & {
  depot: string;
  activityId: string;
  contentType: string;
  quantityKg: string;
  dataSource: string;
  notes?: string;
  attachments?: string;
};

const INVENTORY_YEAR = 2024;
const STATION_NAME = '桃園智慧物流園區';
const DATA_URL = `${import.meta.env.BASE_URL}data/fugitive-emissions-activities.csv`;
const ATTACHMENT_BASE_PATH = `${import.meta.env.BASE_URL}attachments/`;
const FACTOR_SOURCE = '逸散性排放計算係數表 (2024 年度)';

const ACTIVITIES: ActivityDefinition[] = [
  { id: 'FE-WTR-01', name: '飲水機冷媒補充作業', model: 'AquaPure-500' },
  { id: 'FE-EXT-CO2', name: '二氧化碳滅火器充填', model: 'SafeGuard-CO2-10' },
  { id: 'FE-EXT-DRY', name: '乾粉滅火器洩漏補藥', model: 'SafeGuard-DP-8' },
  { id: 'FE-SPARE-01', name: '備援滅火器檢修', model: 'ReserveShield-6' },
];

const DEPOT_OPTIONS = ['北一倉儲區', '北二維修區', '冷鏈機房'] as const;

const CONTENT_FACTORS: Record<ContentType, FactorDefinition> = {
  CO2: {
    factor: 1,
    unit: 'kg CO₂e/kg 物質',
    gwp: 1,
    source: FACTOR_SOURCE,
    factorType: '國家公告',
  },
  R134a: {
    factor: 1,
    unit: 'kg CO₂e/kg 物質',
    gwp: 1430,
    source: FACTOR_SOURCE,
    factorType: 'IPCC',
  },
  R600a: {
    factor: 1,
    unit: 'kg CO₂e/kg 物質',
    gwp: 3,
    source: FACTOR_SOURCE,
    factorType: 'IPCC',
  },
};

const STATUS_CONFIG: Record<AuditStatus, StatusConfig> = {
  Draft: {
    label: '草稿',
    badgeClass: 'status-badge--draft',
    message: '目前狀態為草稿，可繼續編輯活動資料。',
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

const quantityFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function initFugitiveEmissions() {
  const yearElement = document.getElementById('fugitiveInventoryYear');
  const statusBadge = document.getElementById('fugitiveAuditStatus');
  const actionContainer = document.getElementById('fugitiveAuditActions');
  const statusMessage = document.getElementById('fugitiveAuditMessage');
  const tableBody = document.getElementById('fugitiveTableBody');
  const emptyMessage = document.getElementById('fugitiveEmptyMessage');
  const addButton = document.getElementById('openFugitiveAddModal');
  const addModal = document.getElementById('fugitiveAddModal');
  const addForm = document.getElementById('fugitiveAddForm') as HTMLFormElement | null;
  const depotSelect = document.getElementById('fugitiveModalDepot') as HTMLSelectElement | null;
  const activitySelect = document.getElementById('fugitiveModalActivity') as HTMLSelectElement | null;
  const modelInput = document.getElementById('fugitiveModalModel') as HTMLInputElement | null;
  const quantityInput = document.getElementById('fugitiveModalQuantity') as HTMLInputElement | null;
  const contentSelect = document.getElementById('fugitiveModalContent') as HTMLSelectElement | null;
  const dataSourceInput = document.getElementById('fugitiveModalDataSource') as HTMLInputElement | null;
  const notesInput = document.getElementById('fugitiveModalNotes') as HTMLTextAreaElement | null;
  const attachmentInput = document.getElementById('fugitiveModalAttachment') as HTMLInputElement | null;
  const attachmentList = document.getElementById('fugitiveModalAttachmentList');
  const browseButton = document.getElementById('fugitiveModalBrowse');
  const dropZone = document.getElementById('fugitiveModalDropZone');
  const modalError = document.getElementById('fugitiveModalError');
  const returnModal = document.getElementById('fugitiveReturnModal');
  const returnForm = document.getElementById('fugitiveReturnForm') as HTMLFormElement | null;
  const returnReasonInput = document.getElementById('fugitiveReturnReason') as HTMLTextAreaElement | null;
  const returnError = document.getElementById('fugitiveReturnError');

  if (
    !yearElement ||
    !statusBadge ||
    !actionContainer ||
    !statusMessage ||
    !tableBody ||
    !emptyMessage ||
    !addButton ||
    !addModal ||
    !addForm ||
    !depotSelect ||
    !activitySelect ||
    !modelInput ||
    !quantityInput ||
    !contentSelect ||
    !dataSourceInput ||
    !attachmentInput ||
    !attachmentList ||
    !browseButton ||
    !dropZone ||
    !modalError ||
    !notesInput ||
    !returnModal ||
    !returnForm ||
    !returnReasonInput ||
    !returnError
  ) {
    return;
  }

  let records: FugitiveRecord[] = [];
  let currentStatus: AuditStatus = 'Draft';
  let pendingAttachments: Attachment[] = [];

  yearElement.textContent = `${INVENTORY_YEAR} 年`;
  updateStatusUI();
  renderActionButtons();
  populateDepotOptions();
  populateActivityOptions();
  populateContentOptions();
  updateModelField(activitySelect.value);
  loadInitialRecords();

  addButton.addEventListener('click', () => {
    resetAddForm();
    openModal(addModal);
    (DEPOT_OPTIONS.length === 1 ? activitySelect : depotSelect).focus();
  });

  addModal.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-close-modal]')) {
      closeModal(addModal);
    }
  });

  returnModal.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-close-modal]')) {
      closeModal(returnModal);
    }
  });

  document.addEventListener('keydown', handleEscapeKey);

  activitySelect.addEventListener('change', () => {
    updateModelField(activitySelect.value);
  });

  if (browseButton) {
    browseButton.addEventListener('click', () => attachmentInput.click());
  }

  attachmentInput.addEventListener('change', () => {
    pendingAttachments = collectAttachments(attachmentInput.files);
    renderAttachmentList();
  });

  setupDropZone();

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    modalError.textContent = '';

    const depotValue = depotSelect.value || (DEPOT_OPTIONS.length === 1 ? DEPOT_OPTIONS[0] : '');
    const activityId = activitySelect.value;
    const contentValue = contentSelect.value as ContentType | '';
    const quantityValue = Number.parseFloat(quantityInput.value);
    const dataSource = dataSourceInput.value.trim();
    const notes = notesInput.value.trim();

    if (!depotValue) {
      modalError.textContent = '請選擇據點名稱。';
      depotSelect.focus();
      return;
    }

    if (!activityId) {
      modalError.textContent = '請選擇活動/設備。';
      activitySelect.focus();
      return;
    }

    if (Number.isNaN(quantityValue) || quantityValue < 0) {
      modalError.textContent = '活動數據需為 0 以上之數值。';
      quantityInput.focus();
      return;
    }

    if (!contentValue || !(contentValue in CONTENT_FACTORS)) {
      modalError.textContent = '請選擇內容物種類。';
      contentSelect.focus();
      return;
    }

    if (!dataSource) {
      modalError.textContent = '請輸入活動數據來源。';
      dataSourceInput.focus();
      return;
    }

    const activity = getActivityDefinition(activityId);

    if (!activity) {
      modalError.textContent = '無法識別所選活動，請重新選擇。';
      activitySelect.focus();
      return;
    }

    const factor = CONTENT_FACTORS[contentValue];

    const newRecord: FugitiveRecord = {
      station: STATION_NAME,
      depot: depotValue,
      activityId,
      activityName: activity.name,
      model: activity.model,
      quantityKg: quantityValue,
      contentType: contentValue,
      emissionFactor: factor.factor,
      emissionFactorUnit: factor.unit,
      gwp: factor.gwp,
      emissions: quantityValue * factor.factor * factor.gwp,
      dataSource,
      factorSource: factor.source,
      factorType: factor.factorType,
      attachments: pendingAttachments.map((attachment) => ({ ...attachment })),
      notes: notes ? notes : undefined,
    };

    records.push(newRecord);
    renderRecords();
    closeModal(addModal);
    resetAddForm();
  });

  returnForm.addEventListener('submit', (event) => {
    event.preventDefault();
    returnError.textContent = '';

    const reason = returnReasonInput.value.trim();

    if (!reason) {
      returnError.textContent = '請輸入退回原因。';
      returnReasonInput.focus();
      return;
    }

    currentStatus = 'Draft';
    updateStatusUI(`資料已退回，原因：${reason}`);
    renderActionButtons();
    closeModal(returnModal);
  });

  function renderRecords() {
    tableBody.innerHTML = '';

    if (records.length === 0) {
      emptyMessage.hidden = false;
      return;
    }

    emptyMessage.hidden = true;

    records.forEach((record) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(record.station));
      row.appendChild(createCell(record.depot));
      row.appendChild(createCell(record.activityName));
      row.appendChild(createCell(record.model));
      row.appendChild(createCell(quantityFormatter.format(record.quantityKg)));
      row.appendChild(createCell(record.contentType));
      row.appendChild(createCell(decimalFormatter.format(record.emissionFactor)));
      row.appendChild(createCell(record.emissionFactorUnit));
      row.appendChild(createCell(record.gwp.toString()));
      row.appendChild(createCell(decimalFormatter.format(record.emissions)));
      row.appendChild(createCell(record.dataSource));
      row.appendChild(createCell(record.factorSource));
      row.appendChild(createCell(record.factorType));
      row.appendChild(createAttachmentCell(record.attachments));
      row.appendChild(createCell(record.notes || '—'));
      tableBody.appendChild(row);
    });
  }

  function updateStatusUI(customMessage?: string) {
    const config = STATUS_CONFIG[currentStatus];
    statusBadge.textContent = config.label;
    statusBadge.className = `status-badge ${config.badgeClass}`;
    statusMessage.textContent = customMessage ?? config.message;
  }

  function renderActionButtons() {
    actionContainer.innerHTML = '';

    if (currentStatus === 'Draft') {
      const submitButton = createActionButton('送審', () => {
        currentStatus = 'Submitted';
        updateStatusUI('資料已送出審核，等待審核結果。');
        renderActionButtons();
      });
      actionContainer.appendChild(submitButton);
      return;
    }

    if (currentStatus === 'Submitted' || currentStatus === 'L1Approved') {
      const approveButton = createActionButton('審核通過', () => {
        if (currentStatus === 'Submitted') {
          currentStatus = 'L1Approved';
          updateStatusUI('資料已通過一階審核。');
        } else {
          currentStatus = 'L2Approved';
          updateStatusUI('資料已完成審核流程。');
        }
        renderActionButtons();
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
  }

  function closeModal(modal: HTMLElement) {
    modal.setAttribute('aria-hidden', 'true');
  }

  function handleEscapeKey(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      return;
    }

    if (addModal.getAttribute('aria-hidden') === 'false') {
      closeModal(addModal);
    }

    if (returnModal.getAttribute('aria-hidden') === 'false') {
      closeModal(returnModal);
    }
  }

  function populateDepotOptions() {
    depotSelect.innerHTML = '';

    if (DEPOT_OPTIONS.length === 1) {
      const option = document.createElement('option');
      option.value = DEPOT_OPTIONS[0];
      option.textContent = DEPOT_OPTIONS[0];
      option.selected = true;
      depotSelect.appendChild(option);
      depotSelect.disabled = true;
      return;
    }

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '請選擇據點';
    placeholder.disabled = true;
    placeholder.selected = true;
    depotSelect.appendChild(placeholder);

    DEPOT_OPTIONS.forEach((depot) => {
      const option = document.createElement('option');
      option.value = depot;
      option.textContent = depot;
      depotSelect.appendChild(option);
    });
  }

  function populateActivityOptions() {
    activitySelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '請選擇活動/設備';
    placeholder.disabled = true;
    placeholder.selected = true;
    activitySelect.appendChild(placeholder);

    ACTIVITIES.forEach((activity) => {
      const option = document.createElement('option');
      option.value = activity.id;
      option.textContent = activity.name;
      activitySelect.appendChild(option);
    });
  }

  function populateContentOptions() {
    contentSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '請選擇內容物';
    placeholder.disabled = true;
    placeholder.selected = true;
    contentSelect.appendChild(placeholder);

    (Object.keys(CONTENT_FACTORS) as ContentType[]).forEach((content) => {
      const option = document.createElement('option');
      option.value = content;
      option.textContent = content;
      contentSelect.appendChild(option);
    });
  }

  function updateModelField(activityId: string) {
    const activity = getActivityDefinition(activityId);
    modelInput.value = activity ? activity.model : '';
  }

  function resetAddForm() {
    addForm.reset();
    pendingAttachments = [];
    renderAttachmentList();
    modalError.textContent = '';
    depotSelect.disabled = DEPOT_OPTIONS.length === 1;
    if (DEPOT_OPTIONS.length === 1) {
      depotSelect.value = DEPOT_OPTIONS[0];
    }
    updateModelField(activitySelect.value);
  }

  function collectAttachments(files: FileList | null): Attachment[] {
    if (!files || files.length === 0) {
      return [];
    }

    return Array.from(files).map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file),
    }));
  }

  function renderAttachmentList() {
    attachmentList.innerHTML = '';
    pendingAttachments.forEach((attachment) => {
      const item = document.createElement('li');
      item.textContent = attachment.name;
      attachmentList.appendChild(item);
    });
  }

  function setupDropZone() {
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
      const files = event.dataTransfer?.files ?? null;
      pendingAttachments = collectAttachments(files);
      renderAttachmentList();
    });
  }

  function createCell(value: string) {
    const cell = document.createElement('td');
    cell.textContent = value;
    return cell;
  }

  function createAttachmentCell(attachments: Attachment[]) {
    const cell = document.createElement('td');

    if (!attachments.length) {
      cell.textContent = '—';
      return cell;
    }

    const list = document.createElement('ul');
    list.className = 'attachment-links';

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

  function createActionButton(label: string, handler: () => void, secondary = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.className = secondary ? 'secondary-button' : 'primary-button';
    button.addEventListener('click', handler);
    return button;
  }

  async function loadInitialRecords() {
    try {
      const rows = await loadCsvRows(DATA_URL);
      records = rows
        .map((row) => createRecordFromRow(row as FugitiveCsvRow))
        .filter((record): record is FugitiveRecord => Boolean(record));
      renderRecords();
    } catch (error) {
      statusMessage.textContent = `無法載入活動資料：${error instanceof Error ? error.message : '未知錯誤'}`;
    }
  }

  function createRecordFromRow(row: FugitiveCsvRow): FugitiveRecord | null {
    const activity = getActivityDefinition(row.activityId);
    const content = parseContentType(row.contentType);
    const quantity = Number.parseFloat(row.quantityKg);

    if (!activity || !content || Number.isNaN(quantity) || quantity < 0) {
      return null;
    }

    const factor = CONTENT_FACTORS[content];
    const dataSource = (row.dataSource || '').trim() || '—';
    const notes = (row.notes || '').trim();

    return {
      station: STATION_NAME,
      depot: row.depot.trim() || DEPOT_OPTIONS[0],
      activityId: activity.id,
      activityName: activity.name,
      model: activity.model,
      quantityKg: quantity,
      contentType: content,
      emissionFactor: factor.factor,
      emissionFactorUnit: factor.unit,
      gwp: factor.gwp,
      emissions: quantity * factor.factor * factor.gwp,
      dataSource,
      factorSource: factor.source,
      factorType: factor.factorType,
      attachments: parseAttachmentList(row.attachments),
      notes: notes || undefined,
    };
  }

  function parseContentType(value: string): ContentType | null {
    const normalized = value?.trim() as ContentType | undefined;
    if (!normalized) {
      return null;
    }

    if (normalized === 'CO2' || normalized === 'R134a' || normalized === 'R600a') {
      return normalized;
    }

    return null;
  }

  function parseAttachmentList(value?: string): Attachment[] {
    if (!value) {
      return [];
    }

    return value
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map(parseAttachmentEntry)
      .filter((attachment): attachment is Attachment => Boolean(attachment));
  }

  function parseAttachmentEntry(entry: string): Attachment | null {
    const [rawName, rawUrl] = entry.split('|');
    const name = rawName?.trim();

    if (!name) {
      return null;
    }

    const resolvedUrl = rawUrl && rawUrl.trim().length > 0
      ? resolveAttachmentUrl(rawUrl.trim())
      : `${ATTACHMENT_BASE_PATH}${encodeURIComponent(name)}`;

    return {
      name,
      url: resolvedUrl,
    };
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

  function getActivityDefinition(id: string) {
    return ACTIVITIES.find((activity) => activity.id === id) || null;
  }
}
