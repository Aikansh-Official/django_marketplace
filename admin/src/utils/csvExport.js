import toast from 'react-hot-toast';
import { escapeCSVCell } from './csvCell';

/**
 * Universal CSV Export Helper
 * @param {Array<Object>} data Array of objects or formatted rows
 * @param {Array<string>} headers Column header titles
 * @param {Function} rowMapper Function that converts each item to an array of cell values
 * @param {string} filename Output file name
 */
export function exportToCSV({ data, headers, rowMapper, filename = 'campxchange_export.csv' }) {
  if (!data || data.length === 0) {
    toast.error('No data available to export.');
    return;
  }

  try {
    const csvRows = [];

    // Header row
    csvRows.push(headers.map(escapeCSVCell).join(','));

    // Data rows
    for (const item of data) {
      const row = rowMapper(item);
      const formattedRow = row.map(escapeCSVCell);
      csvRows.push(formattedRow.join(','));
    }

    const csvContent = '\uFEFF' + csvRows.join('\r\n'); // UTF-8 BOM for Excel
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${data.length} records to ${filename}`);
  } catch (err) {
    console.error('CSV Export Error:', err);
    toast.error('Failed to export CSV file.');
  }
}
