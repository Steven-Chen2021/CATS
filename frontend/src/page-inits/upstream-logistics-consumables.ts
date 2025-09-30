type AuditStatus = 'Draft' | 'Submitted' | 'L1Approved' | 'L2Approved';

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
  attachments: string[];
  notes?: string;
};

type Option = { value: string | number; label: string };

const INVENTORY_YEAR = '2024';
const SITE_NAME = '台北物流中心';

const DEPOT_OPTIONS = ['北一倉儲中心', '桃園轉運倉', '高雄配銷點'];

const VEHICLE_OPTIONS = ['3.5T 小貨車', '7.5T 大貨車', '冷鏈貨櫃車'];

const FUEL_OPTIONS = ['92 無鉛汽油', '95 無鉛汽油', '柴油', '航空煤油'];

const CONSUMABLE_ITEMS: { name: string; weightKg: number }[] = [
  { name: '瓦楞紙箱 (大)', weightKg: 0.85 },
  { name: '瓦楞紙箱 (中)', weightKg: 0.65 },
  { name: '填充氣泡袋', weightKg: 0.08 },
  { name: '棧板', weightKg: 12 },
  { name: '保冷袋', weightKg: 0.45 },
];

const EMISSION_FACTORS: Record<string, number> = {
  '3.5T 小貨車|92 無鉛汽油': 0.168,
  '3.5T 小貨車|95 無鉛汽油': 0.171,
  '3.5T 小貨車|柴油': 0.149,
  '7.5T 大貨車|柴油': 0.131,
  '冷鏈貨櫃車|柴油': 0.189,
  '冷鏈貨櫃車|航空煤油': 0.215,
};

const FACTOR_SOURCE = '交通運輸排放係數資料庫 2024 年版';

const numberFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const weightFormatter = new Intl.NumberFormat('zh-TW', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function initUpstreamLogisticsConsumables() {
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

  const records: ConsumableRecord[] = [
    {
      location: DEPOT_OPTIONS[0],
      month: 3,
      item: '瓦楞紙箱 (大)',
      vehicle: '3.5T 小貨車',
      fuelType: '柴油',
      origin: '台北市',
      destination: '台中市',
      quantity: 320,
      unitWeightKg: 0.85,
      distanceKm: 170,
      dataSource: '物流系統出貨紀錄',
      factorSource: FACTOR_SOURCE,
      attachments: ['出貨單據_20240315.pdf'],
    },
    {
      location: DEPOT_OPTIONS[1],
      month: 4,
      item: '棧板',
      vehicle: '7.5T 大貨車',
      fuelType: '柴油',
      origin: '桃園市',
      destination: '高雄市',
      quantity: 42,
      unitWeightKg: 12,
      distanceKm: 330,
      dataSource: '外包物流運送紀錄',
      factorSource: FACTOR_SOURCE,
      attachments: [],
      notes: '棧板回收循環使用',
    },
  ];

  let currentStatus: AuditStatus = 'Draft';
  let currentAttachments: string[] = [];
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
    if (selected && !unitWeightInput.readOnly) {
      unitWeightInput.value = selected.weightKg.toString();
    }
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
    if (files && files.length > 0) {
      currentAttachments = collectAttachmentNames(files);
      renderAttachmentList(attachmentList, currentAttachments);
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
    currentAttachments = [];
    renderAttachmentList(attachmentList, currentAttachments);
    unitWeightInput.value = '';
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

  renderTable();
  updateStatusUI();

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
      appendCell(row, record.location);
      appendCell(row, `${record.month} 月`);
      appendCell(row, record.item);
      appendCell(row, record.vehicle);
      appendCell(row, record.fuelType);
      appendCell(row, record.origin);
      appendCell(row, record.destination);
      appendCell(row, numberFormatter.format(record.quantity));
      appendCell(row, numberFormatter.format(record.unitWeightKg));
      appendCell(row, weightFormatter.format(totalWeight));
      appendCell(row, numberFormatter.format(record.distanceKm));
      appendCell(row, weightFormatter.format(emissionFactor));
      appendCell(row, numberFormatter.format(emission));
      appendCell(row, record.dataSource);
      appendCell(row, record.factorSource);

      tableBody.appendChild(row);
    });
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

  function appendCell(row: HTMLTableRowElement, text: string) {
    const cell = document.createElement('td');
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

  function collectAttachmentNames(fileList: FileList | null) {
    if (!fileList) return [];
    return Array.from(fileList).map((file) => file.name);
  }

  function renderAttachmentList(list: HTMLElement, attachments: string[]) {
    list.innerHTML = '';
    attachments.forEach((name) => {
      const item = document.createElement('li');
      item.textContent = name;
      list.appendChild(item);
    });
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

