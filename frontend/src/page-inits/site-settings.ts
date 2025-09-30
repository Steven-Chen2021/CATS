// Programmatic initializer for the site-settings page
export function initSiteSettings() {
  try {
    const container = document.getElementById('siteLocationsTable');
    if (!container) return;

    const Handsontable = (window as any).Handsontable;
    if (!Handsontable) {
      console.error('Handsontable not available for site-settings init.');
      return;
    }

    // sample data
    const data = [
      { locationName: '松山辦公室', status: '啟用', statusDate: '2024-03-01' }
    ];

    const hot = new Handsontable(container, {
      data,
      dataSchema: { locationName: '', status: '啟用', statusDate: null },
      colHeaders: ['據點名稱', '狀態', '狀態更新日期'],
      columns: [
        { data: 'locationName', type: 'text' },
        { data: 'status', type: 'dropdown', source: ['啟用', '停用'] },
        { data: 'statusDate', type: 'date', dateFormat: 'YYYY-MM-DD', correctFormat: true }
      ],
      stretchH: 'all',
      rowHeaders: true,
      licenseKey: 'non-commercial-and-evaluation',
      height: 'auto',
      minSpareRows: 1,
      manualColumnResize: true,
      manualRowResize: true,
      className: 'htMiddle'
    });

    (container as any).__handsontableInstance = hot;
  } catch (err) {
    console.error('Failed to init site settings table', err);
  }
}
