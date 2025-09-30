// Programmatic initializer for the organization-structure page
export function initOrganizationStructure() {
  try {
    const container = document.getElementById('organizationStructureTable');
    if (!container) return;

    // Avoid double-init
    const existing = (container as any).__handsontableInstance;
    if (existing) {
      try { existing.destroy(); } catch (e) { /* ignore */ }
    }

    const demoData = [
      { country: '台灣', region: '北部區域', site: '台北總部' },
      { country: '台灣', region: '南部區域', site: '高雄營運中心' },
      { country: '日本', region: '關東區域', site: '東京辦公室' }
    ];

    const columnDefinitions = [
      { header: '國家', data: 'country', type: 'text' },
      { header: '區', data: 'region', type: 'text' },
      { header: '站點', data: 'site', type: 'text' }
    ];

    const Handsontable = (window as any).Handsontable;
    if (!Handsontable) {
      console.error('Handsontable not available for organization-structure init.');
      return;
    }

    const hot = new Handsontable(container, {
      data: demoData,
      columns: columnDefinitions.map(({ header, ...col }) => col),
      colHeaders: columnDefinitions.map(({ header }) => header),
      licenseKey: 'non-commercial-and-evaluation',
      stretchH: 'all',
      height: 'auto',
      rowHeaders: true,
      readOnly: true,
      className: 'htMiddle',
      headerClassName: 'htCenter',
      autoColumnSize: { useHeaders: true }
    });

    (container as any).__handsontableInstance = hot;

    // Try to update width when parent changes
    try {
      if ((window as any).ResizeObserver) {
        const ro = new (window as any).ResizeObserver(() => {
          const width = container.clientWidth || container.parentElement?.clientWidth || 0;
          if (width && hot) {
            hot.updateSettings({ width });
            hot.render();
          }
        });
        ro.observe(container);
      }
    } catch (e) {
      // ignore
    }
  } catch (err) {
    // keep failure local
    // eslint-disable-next-line no-console
    console.error('Failed to init organization structure table', err);
  }
}
