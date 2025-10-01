import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

type Attachment = {
  name: string;
  url: string;
};

type ActivityRecord = {
  station: string;
  depot: string;
  month: number;
  employees: number;
  workdays: number;
  leaveDays: number;
  actualPersonDays: number;
  dataSource: string;
  attachments: Attachment[];
  notes?: string;
};

type StatusConfig = {
  label: string;
  badgeClass: string;
  message: string;
};

type SepticCsvRow = CsvRow & {
  station?: string;
  depot: string;
  month: string;
  employees: string;
  workdays: string;
  leaveDays: string;
  dataSource: string;
  notes?: string;
  attachments?: string;
};

const INVENTORY_YEAR = 2024;
const STATION_NAME = '北部營運總部';
const DATA_URL = `${import.meta.env.BASE_URL}data/septic-tank-activities.csv`;
const ATTACHMENT_BASE_PATH = `${import.meta.env.BASE_URL}attachments/`;
const FACTOR_SOURCE = '環保署化糞池廢水處理排放係數表 (2024 年度)';
const CH4_FACTOR = 0.00062; // kg CH₄ / 人天
const CH4_GWP = 27.2;

const DEPOT_OPTIONS = ['台北營運中心', '新莊物流據點', '桃園配送中心'] as const;

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

const integerFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const factorFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 5,
  maximumFractionDigits: 5,
});

export function initSepticTank() {
  const yearElement = document.getElementById('septicInventoryYear');
  const statusBadge = document.getElementById('septicAuditStatus');
  const actionContainer = document.getElementById('septicAuditActions');
  const statusMessage = document.getElementById('septicAuditMessage');
  const tableBody = document.getElementById('septicActivityTableBody');
  const emptyMessage = document.getElementById('septicEmptyMessage');
  const addButton = document.getElementById('openSepticAddModal');
  const addModal = document.getElementById('septicAddModal');
  const addForm = document.getElementById('septicAddForm') as HTMLFormElement | null;
  const modalError = document.getElementById('septicModalError');
  const modalStation = document.getElementById('septicModalStationName');
  const depotSelect = document.getElementById('septicModalDepotSelect') as HTMLSelectElement | null;
  const monthSelect = document.getElementById('septicModalMonthSelect') as HTMLSelectElement | null;
  const employeesInput = document.getElementById('septicModalEmployees') as HTMLInputElement | null;
  const workdaysInput = document.getElementById('septicModalWorkdays') as HTMLInputElement | null;
  const leaveDaysInput = document.getElementById('septicModalLeaveDays') as HTMLInputElement | null;
  const dataSourceInput = document.getElementById('septicModalDataSource') as HTMLInputElement | null;
  const notesInput = document.getElementById('septicModalNotes') as HTMLTextAreaElement | null;
  const attachmentList = document.getElementById('septicAttachmentList');
  const attachmentInput = document.getElementById('septicAttachmentInput') as HTMLInputElement | null;
  const browseButton = document.getElementById('septicAttachmentBrowse');
  const dropZone = document.getElementById('septicDropZone');
  const returnModal = document.getElementById('septicReturnModal');
  const returnForm = document.getElementById('septicReturnForm') as HTMLFormElement | null;
  const returnReason = document.getElementById('septicReturnReason') as HTMLTextAreaElement | null;
  const returnError = document.getElementById('septicReturnError');

  if (
    !yearElement ||
    !statusBadge ||
    !actionContainer ||
    !statusMessage ||
    !tableBody ||
    !emptyMessage
  ) {
    return;
  }

  let records: ActivityRecord[] = [];
  let status: AuditStatus = 'Draft';
  let pendingAttachments: Attachment[] = [];

  yearElement.textContent = `${INVENTORY_YEAR} 年`;
  if (modalStation) {
    modalStation.textContent = STATION_NAME;
  }

  populateDepotOptions();
  populateMonthOptions();
  updateAuditStatus('Draft');
  loadInitialData();

  if (addButton) {
    addButton.addEventListener('click', () => {
      if (status === 'L2Approved') {
        return;
      }
      resetAddForm();
      openModal(addModal);
    });
  }

  if (addForm) {
    addForm.addEventListener('submit', (event) => {
      event.preventDefault();

      if (!depotSelect || !monthSelect || !employeesInput || !workdaysInput || !leaveDaysInput || !dataSourceInput) {
        return;
      }

      const depot = depotSelect.value.trim();
      const month = Number(monthSelect.value);
      const employees = Number(employeesInput.value);
      const workdays = Number(workdaysInput.value);
      const leaveDays = Number(leaveDaysInput.value);
      const dataSource = dataSourceInput.value.trim();
      const notes = notesInput?.value.trim() || undefined;

      if (!depot || Number.isNaN(month) || Number.isNaN(employees) || Number.isNaN(workdays) || Number.isNaN(leaveDays) || !dataSource) {
        showModalError('請完整填寫所有必填欄位。');
        return;
      }

      if (employees < 0 || workdays < 0 || leaveDays < 0) {
        showModalError('員工數、工作天數與休假天數不可為負數。');
        return;
      }

      const actualPersonDays = calculateActualPersonDays(employees, workdays, leaveDays);

      records.push({
        station: STATION_NAME,
        depot,
        month,
        employees,
        workdays,
        leaveDays,
        actualPersonDays,
        dataSource,
        attachments: pendingAttachments.slice(),
        notes,
      });

      renderTable();
      resetAddForm();
      closeModal(addModal);
    });
  }

  if (browseButton && attachmentInput) {
    browseButton.addEventListener('click', () => {
      attachmentInput.click();
    });
  }

  if (attachmentInput) {
    attachmentInput.addEventListener('change', () => {
      if (!attachmentInput.files) {
        return;
      }

      Array.from(attachmentInput.files).forEach((file) => {
        pendingAttachments.push({ name: file.name, url: URL.createObjectURL(file) });
      });

      renderAttachmentList(attachmentList, pendingAttachments);
      attachmentInput.value = '';
    });
  }

  setupDropZone(dropZone, (files) => {
    if (!files.length) {
      return;
    }

    Array.from(files).forEach((file) => {
      pendingAttachments.push({ name: file.name, url: URL.createObjectURL(file) });
    });

    renderAttachmentList(attachmentList, pendingAttachments);
  });

  setupModalDismissal(addModal, () => {
    resetAddForm();
  });

  setupModalDismissal(returnModal, () => {
    if (returnError) {
      returnError.textContent = '';
      returnError.setAttribute('hidden', '');
    }
    if (returnReason) {
      returnReason.value = '';
    }
  });

  if (returnForm) {
    returnForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!returnReason) {
        return;
      }
      const reason = returnReason.value.trim();
      if (!reason) {
        if (returnError) {
          returnError.textContent = '請輸入退回原因後再送出。';
          returnError.removeAttribute('hidden');
        }
        return;
      }

      updateAuditStatus('Draft', { reason });
      if (returnError) {
        returnError.textContent = '';
        returnError.setAttribute('hidden', '');
      }
      returnReason.value = '';
      closeModal(returnModal);
    });
  }

  function loadInitialData() {
    loadCsvRows(DATA_URL)
      .then((rows) => {
        records = rows
          .map((row) => csvRowToRecord(row as SepticCsvRow))
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
      const row = document.createElement('tr');
      const emissions = calculateEmissions(record.actualPersonDays);

      row.appendChild(createCell(record.station));
      row.appendChild(createCell(record.depot, true));
      row.appendChild(createCell(`${record.month} 月`, true));
      row.appendChild(createCell(integerFormatter.format(record.employees), true));
      row.appendChild(createCell(integerFormatter.format(record.workdays), true));
      row.appendChild(createCell(decimalFormatter.format(record.leaveDays), true));
      row.appendChild(createCell(decimalFormatter.format(record.actualPersonDays)));
      row.appendChild(createCell(formatFactor(CH4_FACTOR)));
      row.appendChild(createCell(decimalFormatter.format(CH4_GWP)));
      row.appendChild(createCell(decimalFormatter.format(emissions)));
      row.appendChild(createCell(record.dataSource, true));
      row.appendChild(createCell(FACTOR_SOURCE));
      row.appendChild(createAttachmentCell(record.attachments));
      row.appendChild(createCell(record.notes || '—', true));

      tableBody.appendChild(row);
    });
  }

  function renderAuditButtons() {
    actionContainer.innerHTML = '';

    const buttons: Array<{ label: string; handler: () => void; variant?: 'primary' | 'secondary' }> = [];

    if (status === 'Draft') {
      buttons.push({ label: '送審', handler: () => updateAuditStatus('Submitted'), variant: 'primary' });
    } else if (status === 'Submitted' || status === 'L1Approved') {
      buttons.push({ label: '審核通過', handler: handleApprove, variant: 'primary' });
      buttons.push({ label: '退回', handler: openReturnModal });
    }

    buttons.forEach((config) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = config.label;
      button.className = config.variant === 'primary' ? 'primary-button' : 'secondary-button';
      button.addEventListener('click', config.handler);
      actionContainer.appendChild(button);
    });
  }

  function handleApprove() {
    if (status === 'Submitted') {
      updateAuditStatus('L1Approved');
    } else if (status === 'L1Approved') {
      updateAuditStatus('L2Approved');
    }
  }

  function openReturnModal() {
    if (returnError) {
      returnError.textContent = '';
      returnError.setAttribute('hidden', '');
    }
    if (returnReason) {
      returnReason.value = '';
    }
    openModal(returnModal);
  }

  function updateAuditStatus(next: AuditStatus, details?: { reason?: string }) {
    status = next;
    const config = STATUS_CONFIG[next];

    statusBadge.textContent = config.label;
    statusBadge.className = `status-badge ${config.badgeClass}`;

    if (next === 'Draft' && details?.reason) {
      statusMessage.textContent = `資料已被退回，原因：${details.reason}`;
    } else {
      statusMessage.textContent = config.message;
    }

    renderAuditButtons();
    toggleFormAvailability();
  }

  function toggleFormAvailability() {
    const disable = status === 'L2Approved';
    if (addButton) {
      addButton.toggleAttribute('disabled', disable);
    }
  }

  function resetAddForm() {
    if (!addForm) {
      return;
    }

    addForm.reset();
    pendingAttachments = [];
    renderAttachmentList(attachmentList, pendingAttachments);
    populateDepotOptions();
    populateMonthOptions();

    if (modalError) {
      modalError.textContent = '';
      modalError.setAttribute('hidden', '');
    }
  }

  function showModalError(message: string) {
    if (!modalError) {
      return;
    }
    modalError.textContent = message;
    modalError.removeAttribute('hidden');
  }

  function populateDepotOptions() {
    if (!depotSelect) {
      return;
    }

    depotSelect.innerHTML = '';

    if (DEPOT_OPTIONS.length === 1) {
      const onlyDepot = DEPOT_OPTIONS[0];
      const option = document.createElement('option');
      option.value = onlyDepot;
      option.textContent = onlyDepot;
      depotSelect.appendChild(option);
      depotSelect.value = onlyDepot;
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

  function populateMonthOptions() {
    if (!monthSelect) {
      return;
    }

    monthSelect.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '請選擇月份';
    placeholder.disabled = true;
    placeholder.selected = true;
    monthSelect.appendChild(placeholder);

    MONTH_OPTIONS.forEach((month) => {
      const option = document.createElement('option');
      option.value = String(month);
      option.textContent = `${month} 月`;
      monthSelect.appendChild(option);
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

  function calculateActualPersonDays(employees: number, workdays: number, leaveDays: number) {
    const total = employees * workdays - leaveDays;
    return total < 0 ? 0 : total;
  }

  function calculateEmissions(actualPersonDays: number) {
    return actualPersonDays * CH4_FACTOR * CH4_GWP;
  }

  function formatFactor(value: number) {
    if (value < 1) {
      return factorFormatter.format(value);
    }
    return decimalFormatter.format(value);
  }

  function csvRowToRecord(row: SepticCsvRow): ActivityRecord | null {
    const month = Number(row.month);
    const employees = Number(row.employees);
    const workdays = Number(row.workdays);
    const leaveDays = Number(row.leaveDays);

    if (Number.isNaN(month) || Number.isNaN(employees) || Number.isNaN(workdays) || Number.isNaN(leaveDays)) {
      return null;
    }

    const actualPersonDays = calculateActualPersonDays(employees, workdays, leaveDays);

    return {
      station: row.station?.trim() || STATION_NAME,
      depot: row.depot.trim(),
      month,
      employees,
      workdays,
      leaveDays,
      actualPersonDays,
      dataSource: row.dataSource.trim(),
      attachments: parseAttachmentField(row.attachments || ''),
      notes: row.notes?.trim() || undefined,
    };
  }

  function parseAttachmentField(field: string): Attachment[] {
    if (!field) {
      return [];
    }

    return field.split(';').map((entry) => parseAttachment(entry)).filter((item): item is Attachment => Boolean(item));
  }

  function parseAttachment(entry: string): Attachment | null {
    const [name, url] = entry.split('|').map((value) => value.trim());
    if (!name) {
      return null;
    }

    return {
      name,
      url: url ? resolveAttachmentUrl(url) : '#',
    };
  }

  function resolveAttachmentUrl(path: string) {
    if (/^https?:/i.test(path)) {
      return path;
    }
    return `${ATTACHMENT_BASE_PATH}${path}`;
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
      if (target.matches('[data-close-modal]') || target === modal) {
        if (onClose) {
          onClose();
        }
        closeModal(modal);
      }
    });
  }

  function setupDropZone(zone: HTMLElement | null, onFilesDropped: (files: FileList) => void) {
    if (!zone) {
      return;
    }

    zone.addEventListener('click', () => {
      attachmentInput?.click();
    });

    zone.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        attachmentInput?.click();
      }
    });

    zone.addEventListener('dragover', (event) => {
      event.preventDefault();
      zone.classList.add('is-dragover');
    });

    zone.addEventListener('dragleave', () => {
      zone.classList.remove('is-dragover');
    });

    zone.addEventListener('drop', (event) => {
      event.preventDefault();
      zone.classList.remove('is-dragover');
      if (event.dataTransfer?.files) {
        onFilesDropped(event.dataTransfer.files);
      }
    });
  }
}
