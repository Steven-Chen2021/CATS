import { loadCsvRows, type CsvRow } from '../utils/csv-loader';

type AuditStatus = 'Draft' | 'Submitted' | 'Approved';

type Attachment = { name: string; url: string };

type ForkliftRecord = {
  siteName: string;
  depotName: string;
  model: string;
  usage: string;
  purchaseDate: string;
  energyType: string;
  annualUsage: number;
  usageUnit: string;
  emissionFactor: number;
  emissionFactorUnit: string;
  gwp: number;
  emissions: number;
  dataSource: string;
  factorSource: string;
  attachments: Attachment[];
  notes?: string;
};

const INVENTORY_YEAR = '2024';
const DATA_PATH = `${import.meta.env.BASE_URL}data/purchased-forklift-activities.csv`;
const ATTACHMENT_BASE_PATH = `${import.meta.env.BASE_URL}attachments/`;

const STATUS_DISPLAY: Record<AuditStatus, { label: string; badgeClass: string }> = {
  Draft: { label: '草稿', badgeClass: 'status-badge--draft' },
  Submitted: { label: '已送審', badgeClass: 'status-badge--submitted' },
  Approved: { label: '審核通過', badgeClass: 'status-badge--approved' },
};

export function initPurchasedGoodsServicesForklift() {
  const inventoryYearEl = document.getElementById('forkliftInventoryYear');
  const statusBadge = document.getElementById('forkliftAuditStatus');
  const actionContainer = document.getElementById('forkliftAuditActions');
  const statusMessage = document.getElementById('forkliftAuditMessage');
  const tableBody = document.getElementById('forkliftTableBody');
  const emptyMessage = document.getElementById('forkliftEmptyMessage');

  if (
    !inventoryYearEl ||
    !statusBadge ||
    !actionContainer ||
    !statusMessage ||
    !tableBody ||
    !emptyMessage
  ) {
    return;
  }

  inventoryYearEl.textContent = `${INVENTORY_YEAR} 年`;

  let currentStatus: AuditStatus = 'Draft';
  let statusTimer: number | undefined;

  updateStatusUI();
  loadForkliftRecords();

  function loadForkliftRecords() {
    loadCsvRows(DATA_PATH)
      .then((rows) => rows.map(parseRecord).filter((record): record is ForkliftRecord => record !== null))
      .then((records) => {
        renderTable(records);
      })
      .catch((error) => {
        console.error('Failed to load forklift records from CSV.', error);
        tableBody.innerHTML = '';
        emptyMessage.hidden = false;
        emptyMessage.textContent = '無法載入活動資料，請稍後再試。';
      });
  }

  function parseRecord(row: CsvRow): ForkliftRecord | null {
    const siteName = row.site_name?.trim();
    const depotName = row.depot_name?.trim();
    const model = row.model?.trim();
    const usage = row.usage?.trim();
    const purchaseDate = row.purchase_date?.trim();
    const energyType = row.energy_type?.trim();
    const usageText = row.annual_usage?.trim();
    const usageUnit = row.usage_unit?.trim();
    const emissionFactorText = row.emission_factor?.trim();
    const emissionFactorUnit = row.emission_factor_unit?.trim();
    const gwpText = row.gwp?.trim();
    const emissionsText = row.emissions?.trim();
    const dataSource = row.data_source?.trim();
    const factorSource = row.factor_source?.trim();
    const attachmentsText = row.attachments?.trim();
    const notes = row.notes?.trim();

    if (
      !siteName ||
      !depotName ||
      !model ||
      !usage ||
      !purchaseDate ||
      !energyType ||
      !usageText ||
      !usageUnit ||
      !emissionFactorText ||
      !emissionFactorUnit ||
      !gwpText ||
      !emissionsText ||
      !dataSource ||
      !factorSource
    ) {
      return null;
    }

    const annualUsage = Number.parseFloat(usageText.replace(/,/g, ''));
    const emissionFactor = Number.parseFloat(emissionFactorText.replace(/,/g, ''));
    const gwp = Number.parseFloat(gwpText.replace(/,/g, ''));
    const emissions = Number.parseFloat(emissionsText.replace(/,/g, ''));

    if (![annualUsage, emissionFactor, gwp, emissions].every((value) => Number.isFinite(value))) {
      return null;
    }

    return {
      siteName,
      depotName,
      model,
      usage,
      purchaseDate,
      energyType,
      annualUsage,
      usageUnit,
      emissionFactor,
      emissionFactorUnit,
      gwp,
      emissions,
      dataSource,
      factorSource,
      attachments: parseAttachments(attachmentsText),
      notes,
    };
  }

  function parseAttachments(value?: string): Attachment[] {
    if (!value) {
      return [];
    }

    return value
      .split(';')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        const [fileName, label] = entry.split('|').map((part) => part.trim());
        const name = label || fileName;
        return {
          name,
          url: `${ATTACHMENT_BASE_PATH}${fileName}`,
        };
      })
      .filter((attachment) => Boolean(attachment.url));
  }

  function renderTable(records: ForkliftRecord[]) {
    tableBody.innerHTML = '';

    if (records.length === 0) {
      emptyMessage.hidden = false;
      emptyMessage.textContent = '目前尚無活動資料，請新增資料。';
      return;
    }

    emptyMessage.hidden = true;

    const fragment = document.createDocumentFragment();

    records.forEach((record) => {
      const row = document.createElement('tr');
      row.appendChild(createCell(record.siteName));
      row.appendChild(createCell(record.depotName));
      row.appendChild(createCell(record.model));
      row.appendChild(createCell(record.usage));
      row.appendChild(createCell(formatDate(record.purchaseDate)));
      row.appendChild(createCell(record.energyType));
      row.appendChild(createCell(formatNumber(record.annualUsage, 0, 0)));
      row.appendChild(createCell(record.usageUnit));
      row.appendChild(createCell(formatNumber(record.emissionFactor, 0, 3)));
      row.appendChild(createCell(record.emissionFactorUnit));
      row.appendChild(createCell(formatNumber(record.gwp, 0, 0)));
      row.appendChild(createCell(formatNumber(record.emissions, 0, 2)));
      row.appendChild(createCell(record.dataSource));
      row.appendChild(createCell(record.factorSource));
      row.appendChild(createAttachmentCell(record.attachments));
      row.appendChild(createCell(record.notes || '—'));
      fragment.appendChild(row);
    });

    tableBody.appendChild(fragment);
  }

  function createCell(text: string): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.textContent = text;
    return cell;
  }

  function createAttachmentCell(attachments: Attachment[]): HTMLTableCellElement {
    const cell = document.createElement('td');

    if (attachments.length === 0) {
      cell.textContent = '—';
      return cell;
    }

    const list = document.createElement('ul');
    list.className = 'attachment-links';

    attachments.forEach(({ name, url }) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = name;
      link.download = name;
      item.appendChild(link);
      list.appendChild(item);
    });

    cell.appendChild(list);
    return cell;
  }

  function formatNumber(value: number, minimumFractionDigits: number, maximumFractionDigits: number): string {
    return value.toLocaleString('zh-TW', {
      minimumFractionDigits,
      maximumFractionDigits,
    });
  }

  function formatDate(value: string): string {
    return value.replace(/-/g, '/');
  }

  function updateStatusUI() {
    const config = STATUS_DISPLAY[currentStatus];
    statusBadge.textContent = config.label;
    statusBadge.className = `status-badge ${config.badgeClass}`;

    actionContainer.innerHTML = '';

    if (currentStatus === 'Draft') {
      actionContainer.appendChild(
        createActionButton('送審', () => {
          currentStatus = 'Submitted';
          showStatusMessage('資料已送出審核，等待審核結果。');
          updateStatusUI();
        })
      );
    } else if (currentStatus === 'Submitted') {
      actionContainer.appendChild(
        createActionButton(
          '退回',
          () => {
            currentStatus = 'Draft';
            showStatusMessage('審核人員已退回資料，請修正後再送審。');
            updateStatusUI();
          },
          true
        )
      );

      actionContainer.appendChild(
        createActionButton('審核通過', () => {
          currentStatus = 'Approved';
          showStatusMessage('資料已完成審核。');
          updateStatusUI();
        })
      );
    }
  }

  function createActionButton(label: string, onClick: () => void, isSecondary = false): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = isSecondary ? 'secondary-button' : 'primary-button';
    button.textContent = label;
    button.addEventListener('click', onClick);
    return button;
  }

  function showStatusMessage(message: string) {
    statusMessage.textContent = message;

    if (statusTimer) {
      window.clearTimeout(statusTimer);
    }

    statusTimer = window.setTimeout(() => {
      statusMessage.textContent = '';
    }, 5000);
  }
}
