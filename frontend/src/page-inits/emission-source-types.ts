const EMISSION_SOURCE_TYPES = [
  { code: '1.1', name: '固定燃燒排放源 (發電機)' },
  { code: '1.2', name: '移動排放源 (公務汽車、貨車)' },
  { code: '1.4', name: '逸散性排放(飲水機、滅火器、補滅火器)' },
  { code: '1.4', name: '化糞池' },
  { code: '2.1', name: '輸入電力的間接排放 (辦公室用電)' },
  { code: '3.1', name: '上游運輸物流經常耗材' },
  { code: '3.1', name: '上游運輸辦公耗材' },
  { code: '3.3', name: '物流運輸排放 (陸運)' },
  { code: '3.3', name: '物流運輸排放 (海運)' },
  { code: '3.3', name: '物流運輸排放 (空運)' },
  { code: '3.5', name: '商務差旅' },
  { code: '4.1', name: '採購商品或服務_倉儲堆高機' },
  { code: '4.3', name: '燃料與能源相關活動外購能源' },
];

function ensureDataCopy() {
  return EMISSION_SOURCE_TYPES.map((item) => ({ ...item }));
}

export function initEmissionSourceTypes() {
  try {
    const container = document.getElementById('emissionSourceTypesTable');
    if (!container) {
      return;
    }

    const Handsontable = (window as any).Handsontable;
    if (!Handsontable) {
      console.error('Handsontable not available for emission source types.');
      return;
    }

    const existingInstance = (container as any).__handsontableInstance;
    if (existingInstance) {
      existingInstance.loadData(ensureDataCopy());
      return;
    }

    const hot = new Handsontable(container, {
      data: ensureDataCopy(),
      dataSchema: { code: '', name: '' },
      colHeaders: ['編號', '排放源名稱'],
      columns: [
        {
          data: 'code',
          type: 'text',
          placeholder: '輸入編號',
          validator(value: string, callback: (valid: boolean) => void) {
            callback(!value || value.trim().length > 0);
          },
        },
        {
          data: 'name',
          type: 'text',
          placeholder: '輸入排放源名稱',
          validator(value: string, callback: (valid: boolean) => void) {
            callback(!value || value.trim().length > 0);
          },
        },
      ],
      rowHeaders: true,
      stretchH: 'all',
      height: 'auto',
      manualColumnResize: true,
      manualRowResize: true,
      licenseKey: 'non-commercial-and-evaluation',
      className: 'htMiddle',
      minSpareRows: 1,
    });

    (container as any).__handsontableInstance = hot;
  } catch (error) {
    console.error('Failed to initialise emission source types table', error);
  }
}
