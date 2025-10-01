import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type Attachment = {
  name: string;
  url: string;
  isLocal?: boolean;
};

type ElectricityRecord = {
  id: string;
  station: string;
  site: string;
  startDate: string;
  endDate: string;
  usageSelf: number;
  usageShared: number;
  attachments: Attachment[];
  notes?: string;
};

type StatusButton =
  | { type: 'submit'; label: string }
  | { type: 'approve'; label: string }
  | { type: 'return'; label: string };

type StatusConfig = {
  label: string;
  className: string;
  message: string;
  buttons: StatusButton[];
};

const INVENTORY_YEAR = '2024';
const DEFAULT_STATION = '北區營運站';
const SITE_OPTIONS = ['台北總部', '新竹研發中心', '台中營運處'];

const DATA_PATH = `${import.meta.env.BASE_URL}data/purchased-electricity-activities.csv`;

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
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

let records: ElectricityRecord[] = [];
let status: AuditStatus = 'Draft';
let recordCounter = 0;
let lastReturnReason: string | null = null;

let pendingFiles: File[] = [];

export function initIndirectElectricity() {
  const yearDisplay = document.getElementById('inventoryYearDisplay');
  const statusLabel = document.getElementById('auditStatusLabel');
  const statusMessage = document.getElementById('auditStatusMessage');
  const actionButtons = document.getElementById('auditActionButtons');
  const tableBody = document.getElementById('electricityTableBody');
  const emptyMessage = document.getElementById('electricityEmptyMessage');
  const addButton = document.getElementById('addElectricityButton');
  const tableAddButton = document.getElementById('tableAddButton');
  const addModal = document.getElementById('addElectricityModal');
  const addForm = document.getElementById('addElectricityForm') as HTMLFormElement | null;
  const siteSelect = document.getElementById('modalSiteSelect') as HTMLSelectElement | null;
  const startInput = document.getElementById('modalStartDate') as HTMLInputElement | null;
  const endInput = document.getElementById('modalEndDate') as HTMLInputElement | null;
  const usageSelfInput = document.getElementById('modalUsageSelf') as HTMLInputElement | null;
  const usageSharedInput = document.getElementById('modalUsageShared') as HTMLInputElement | null;
  const attachmentInput = document.getElementById('attachmentInput') as HTMLInputElement | null;
  const attachmentPreview = document.getElementById('attachmentPreview');
  const browseButton = document.getElementById('browseAttachmentButton');
  const dropZone = document.getElementById('attachmentDropZone');
  const addError = document.getElementById('addElectricityError');
  const notesInput = document.getElementById('modalNotes') as HTMLTextAreaElement | null;
  const reasonModal = document.getElementById('returnReasonModal');
  const reasonForm = document.getElementById('returnReasonForm') as HTMLFormElement | null;
  const reasonInput = document.getElementById('returnReasonInput') as HTMLTextAreaElement | null;
  const reasonError = document.getElementById('returnReasonError');

  if (
    !yearDisplay ||
    !statusLabel ||
    !statusMessage ||
    !actionButtons ||
    !tableBody ||
    !emptyMessage ||
    !addButton ||
    !tableAddButton ||
    !addModal ||
    !addForm ||
    !siteSelect ||
    !startInput ||
    !endInput ||
    !usageSelfInput ||
    !usageSharedInput ||
    !attachmentInput ||
    !attachmentPreview ||
    !browseButton ||
    !dropZone ||
    !addError ||
    !notesInput ||
    !reasonModal ||
    !reasonForm ||
    !reasonInput ||
    !reasonError
  ) {
    return;
  }

  yearDisplay.textContent = `${INVENTORY_YEAR} 年`;
  populateSiteOptions(siteSelect);

  void loadInitialRecords();

  const openAddModal = () => {
    pendingFiles = [];
    addForm.reset();
    siteSelect.value = siteSelect.options[0]?.value ?? '';
    renderAttachmentPreview(attachmentPreview);
    addError.textContent = '';
    openModal(addModal);
  };

  addButton.addEventListener('click', openAddModal);
  tableAddButton.addEventListener('click', openAddModal);

  addModal.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', () => closeModal(addModal));
  });

  reasonModal.querySelectorAll('[data-close-modal]').forEach((element) => {
    element.addEventListener('click', () => closeModal(reasonModal));
  });

  browseButton.addEventListener('click', () => attachmentInput.click());

  attachmentInput.addEventListener('change', () => {
    if (attachmentInput.files) {
      addFiles(Array.from(attachmentInput.files));
      attachmentInput.value = '';
      renderAttachmentPreview(attachmentPreview);
    }
  });

  dropZone.addEventListener('dragover', (event) => {
    event.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropZone.classList.remove('dragover');
    const files = event.dataTransfer?.files;
    if (files) {
      addFiles(Array.from(files));
      renderAttachmentPreview(attachmentPreview);
    }
  });

  addForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addError.textContent = '';

    const startDate = startInput.value;
    const endDate = endInput.value;
    const usageSelf = Number.parseFloat(usageSelfInput.value);
    const usageShared = Number.parseFloat(usageSharedInput.value);

    if (!isValidDateRange(startDate, endDate)) {
      addError.textContent = '請確認計費起訖日期，迄日不可早於起日。';
      return;
    }

    if (!isValidUsage(usageSelf) || !isValidUsage(usageShared)) {
      addError.textContent = '辦公室用電度數僅允許輸入 0 以上數字。';
      return;
    }

    const record: ElectricityRecord = {
      id: `electricity-${recordCounter + 1}`,
      station: DEFAULT_STATION,
      site: siteSelect.value,
      startDate,
      endDate,
      usageSelf,
      usageShared,
      attachments: pendingFiles.map((file) => ({
        name: file.name,
        url: URL.createObjectURL(file),
        isLocal: true,
      })),
      notes: notesInput.value.trim() || undefined,
    };

    recordCounter += 1;
    records.unshift(record);
    renderRecords(tableBody, emptyMessage);
    pendingFiles = [];
    renderAttachmentPreview(attachmentPreview);
    closeModal(addModal);
  });

  reasonForm.addEventListener('submit', (event) => {
    event.preventDefault();
    reasonError.textContent = '';

    const reason = reasonInput.value.trim();
    if (!reason) {
      reasonError.textContent = '退回原因不可為空白。';
      return;
    }

    lastReturnReason = reason;
    reasonInput.value = '';
    closeModal(reasonModal);
    updateStatus('Draft', statusLabel, statusMessage, actionButtons);
  });

  renderStatus(statusLabel, statusMessage, actionButtons);

  function addFiles(files: File[]) {
    const validFiles = files.filter((file) => file.size > 0);
    pendingFiles.push(...validFiles);
  }

  function openReturnModal() {
    reasonInput.value = '';
    reasonError.textContent = '';
    openModal(reasonModal);
  }

  function handleStatusAction(action: StatusButton['type']) {
    if (action === 'submit') {
      updateStatus('Submitted', statusLabel, statusMessage, actionButtons);
      return;
    }

    if (action === 'approve') {
      if (status === 'Submitted') {
        updateStatus('L1Approved', statusLabel, statusMessage, actionButtons);
      } else if (status === 'L1Approved') {
        updateStatus('L2Approved', statusLabel, statusMessage, actionButtons);
      }
      return;
    }

    if (action === 'return') {
      openReturnModal();
    }
  }

  actionButtons.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const action = target.getAttribute('data-status-action');
    if (!action) {
      return;
    }

    handleStatusAction(action as StatusButton['type']);
  });

  function openModal(element: HTMLElement) {
    element.setAttribute('aria-hidden', 'false');
  }

  function closeModal(element: HTMLElement) {
    element.setAttribute('aria-hidden', 'true');
  }

  function populateSiteOptions(select: HTMLSelectElement) {
    select.innerHTML = '';
    SITE_OPTIONS.forEach((site) => {
      const option = document.createElement('option');
      option.value = site;
      option.textContent = site;
      select.appendChild(option);
    });
  }

  function renderAttachmentPreview(container: Element) {
    container.innerHTML = '';
    if (pendingFiles.length === 0) {
      return;
    }

    pendingFiles.forEach((file, index) => {
      const item = document.createElement('li');
      item.className = 'attachment-item';
      const name = document.createElement('span');
      name.textContent = file.name;
      item.appendChild(name);

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.textContent = '移除';
      removeButton.addEventListener('click', () => {
        pendingFiles.splice(index, 1);
        renderAttachmentPreview(container);
      });
      item.appendChild(removeButton);

      container.appendChild(item);
    });
  }

  async function loadInitialRecords() {
    try {
      const rows = await loadCsvRows(DATA_PATH);
      records = rows.map((row, index) => mapRowToRecord(row, index + 1));
      recordCounter = records.length;
    } catch (error) {
      console.error('Failed to load purchased electricity activities', error);
      records = [];
      recordCounter = 0;
    }

    renderRecords(tableBody, emptyMessage);
  }

  function renderRecords(body: HTMLElement, emptyState: HTMLElement) {
    body.innerHTML = '';

    if (records.length === 0) {
      emptyState.removeAttribute('hidden');
      return;
    }

    emptyState.setAttribute('hidden', '');
    const fragment = document.createDocumentFragment();

    records.forEach((record) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(record.station));
      row.appendChild(createCell(record.site));
      row.appendChild(createCell(formatDate(record.startDate)));
      row.appendChild(createCell(formatDate(record.endDate)));
      row.appendChild(createNumberCell(record.usageSelf, true));
      row.appendChild(createNumberCell(record.usageShared, true));
      row.appendChild(createNumberCell(record.usageSelf + record.usageShared));
      row.appendChild(createAttachmentCell(record.attachments));
      row.appendChild(createCell(record.notes ?? '-'));
      fragment.appendChild(row);
    });

    body.appendChild(fragment);
  }

  function renderStatus(
    labelElement: HTMLElement,
    messageElement: HTMLElement,
    actionsElement: HTMLElement
  ) {
    const config = STATUS_CONFIG[status];
    labelElement.textContent = config.label;
    labelElement.className = `status-badge ${config.className}`;
    const messageParts = [config.message];
    if (status === 'Draft' && lastReturnReason) {
      messageParts.push(`最近退回原因：${lastReturnReason}`);
    }
    messageElement.textContent = messageParts.join(' ');

    actionsElement.innerHTML = '';
    config.buttons.forEach((button) => {
      const element = document.createElement('button');
      element.className = button.type === 'submit' ? 'primary-button' : 'secondary-button';
      element.type = 'button';
      element.textContent = button.label;
      element.setAttribute('data-status-action', button.type);
      actionsElement.appendChild(element);
    });
  }

  function updateStatus(
    nextStatus: AuditStatus,
    labelElement: HTMLElement,
    messageElement: HTMLElement,
    actionsElement: HTMLElement
  ) {
    status = nextStatus;
    renderStatus(labelElement, messageElement, actionsElement);
  }

  function createCell(content: string) {
    const cell = document.createElement('td');
    cell.textContent = content;
    return cell;
  }

  function createNumberCell(value: number, editable = false) {
    const cell = document.createElement('td');
    cell.textContent = numberFormatter.format(value);
    if (editable) {
      cell.setAttribute('data-editable', 'true');
    }
    return cell;
  }

  function createAttachmentCell(attachments: Attachment[]) {
    const cell = document.createElement('td');
    if (attachments.length === 0) {
      cell.textContent = '-';
      return cell;
    }

    const list = document.createElement('ul');
    list.className = 'attachment-list';
    attachments.forEach((attachment) => {
      const item = document.createElement('li');
      item.className = 'attachment-item';
      const link = document.createElement('a');
      link.href = attachment.url;
      link.textContent = attachment.name;
      link.target = '_blank';
      link.rel = 'noreferrer';
      if (attachment.isLocal) {
        link.download = attachment.name;
      }
      item.appendChild(link);
      list.appendChild(item);
    });
    cell.appendChild(list);
    return cell;
  }

  function formatDate(value: string) {
    if (!value) {
      return '-';
    }
    return value.split('-').join('/');
  }

  function isValidDateRange(startDate: string, endDate: string) {
    if (!startDate || !endDate) {
      return false;
    }
    return new Date(startDate).getTime() <= new Date(endDate).getTime();
  }

  function isValidUsage(value: number) {
    return Number.isFinite(value) && value >= 0;
  }

  function mapRowToRecord(row: CsvRow, index: number): ElectricityRecord {
    const usageSelf = Number.parseFloat(row.UsageSelf ?? '0');
    const usageShared = Number.parseFloat(row.UsageShared ?? '0');

    return {
      id: `electricity-${index}`,
      station: row.Station?.trim() || DEFAULT_STATION,
      site: row.Site?.trim() || SITE_OPTIONS[0],
      startDate: row.StartDate ?? '',
      endDate: row.EndDate ?? '',
      usageSelf: Number.isFinite(usageSelf) ? usageSelf : 0,
      usageShared: Number.isFinite(usageShared) ? usageShared : 0,
      attachments: parseAttachments(row.Attachments),
      notes: normalizeNotes(row.Notes),
    };
  }

  function parseAttachments(field: string | undefined): Attachment[] {
    if (!field) {
      return [];
    }

    return field
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        const [name, url] = entry.split('|');
        return {
          name: (name ?? '').trim(),
          url: (url ?? '#').trim() || '#',
        };
      })
      .filter((attachment) => attachment.name.length > 0);
  }

  function normalizeNotes(notes: string | undefined) {
    if (!notes || notes.trim() === '-' || notes.trim().length === 0) {
      return undefined;
    }
    return notes.trim();
  }
}
