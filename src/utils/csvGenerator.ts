import { XMLField } from '@/types';
import { findElementByPath } from './xmlParser';

// Helper: Escape CSV value unless it's a GTIN (which should not be quoted)
function escapeCsv(value: string, isGtin = false): string {
  if (isGtin) return value;
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// Helper: Extract branch code from XML
function extractBranchCode(xmlDoc: Document): string {
  // Option 1: Look for <branchCode> element
  let branchCode = xmlDoc.querySelector('branchCode')?.textContent?.trim() || '';
  // Option 2: Look for additionalPartyIdentification with type Buyer_ASSIGNED_IDENTIFIER_FOR_A_PARTY
  if (!branchCode) {
    const buyer = xmlDoc.querySelector('buyer');
    if (buyer) {
      const branchId = Array.from(buyer.querySelectorAll('additionalPartyIdentification')).find(api => {
        const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
        return type === 'Buyer_ASSIGNED_IDENTIFIER_FOR_A_PARTY';
      });
      if (branchId) {
        branchCode = branchId.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
      }
    }
  }
  return branchCode;
}

export const convertXMLToCSV = async (
  file: File,
  fields: string[],
  xmlFields: XMLField[]
): Promise<string> => {
  const text = await file.text();
  const xmlDoc = new DOMParser().parseFromString(text, 'text/xml');
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML format');
  }

  const rows: string[][] = [];
  const headers = fields.map(path => {
    const field = xmlFields.find(f => f.path === path);
    return field ? field.name : path;
  });
  rows.push(headers);

  // Only use <orderLineItem> as record nodes
  const orderLineItems = Array.from(xmlDoc.querySelectorAll('orderLineItem'));
  const branchCode = extractBranchCode(xmlDoc);

  if (orderLineItems.length > 0) {
    orderLineItems.forEach((orderLineItem, index) => {
      const row: string[] = [];
      fields.forEach(fieldPath => {
        let value = '';
        if (fieldPath === '__order_reference__') {
          value = xmlDoc.querySelector('orderIdentification > uniqueCreatorIdentification')?.textContent?.trim() || '';
        } else if (fieldPath === '__branch_code__') {
          value = branchCode;
        } else if (fieldPath === '__customer_town__') {
          const buyer = xmlDoc.querySelector('buyer');
          if (buyer) {
            const townIdentification = Array.from(buyer.querySelectorAll('additionalPartyIdentification')).find(api => {
              const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
              const valueText = api.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
              return type === 'BUYER_ASSIGNED_IDENTIFIER_FOR_A_PARTY' && /[a-zA-Z]/.test(valueText);
            });
            if (townIdentification) {
              value = townIdentification.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
            }
          }
        } else if (fieldPath === '__creation_date__') {
          const fullDate = xmlDoc.querySelector('DocumentIdentification > CreationDateAndTime')?.textContent?.trim() || '';
          const ymd = fullDate.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
            const [y, m, d] = ymd.split('-');
            value = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
          } else {
            value = ymd;
          }
        } else if (fieldPath === '__delivery_date__') {
          const delDate = xmlDoc.querySelector('orderLogisticalDateGroup > requestedDeliveryDateAtUltimateConsignee > date')?.textContent?.trim() || '';
          if (/^\d{4}-\d{2}-\d{2}$/.test(delDate)) {
            const [y, m, d] = delDate.split('-');
            value = `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
          } else {
            value = delDate;
          }
        } else if (fieldPath === '__order_lines__') {
          value = (index + 1).toString();
        } else if (fieldPath === '__order_line_quantity__') {
          value = orderLineItem.querySelector('requestedQuantity > value')?.textContent?.trim() || '';
        } else if (fieldPath === '__order_line_unit_price__') {
          value = orderLineItem.querySelector('netPrice > amount > monetaryAmount')?.textContent?.trim() || '';
        } else if (fieldPath === '__pack_size__') {
          let foundPackSize = '';
          const additionalTradeItemIdentifications = Array.from(orderLineItem.querySelectorAll('additionalTradeItemIdentification'));
          for (const ati of additionalTradeItemIdentifications) {
            const type = ati.querySelector('additionalTradeItemIdentificationType')?.textContent?.trim();
            const valueText = ati.querySelector('additionalTradeItemIdentificationValue')?.textContent?.trim() || '';
            if (type === 'SUPPLIER_ASSIGNED' && /^\d{1,3}$/.test(valueText)) {
              foundPackSize = valueText;
              break;
            }
          }
          value = foundPackSize;
        } else if (fieldPath === '__gtin__') {
          // Do NOT quote GTIN, do NOT prefix with single quote, just output as digits
          value = orderLineItem.querySelector('gtin')?.textContent?.trim() || '';
        }
        // Escape CSV special characters, but DO NOT quote GTIN
        row.push(escapeCsv(value, fieldPath === '__gtin__'));
      });
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
    });
  }

  return rows.map(row => row.join(',')).join('\n');
};

export const convertMultipleXMLToCSV = async (
  files: File[],
  fields: string[],
  xmlFields: XMLField[],
  blankRowCount: number = 2
): Promise<string> => {
  if (files.length === 0) return '';
  const combinedRows: string[][] = [];
  let header: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const csv = await convertXMLToCSV(files[i], fields, xmlFields);
    const lines = csv.split('\n').map(line => line.split(','));
    if (i === 0) {
      header = lines[0];
      combinedRows.push(header);
    }
    const dataRows = lines.slice(1);
    if (i > 0) {
      for (let b = 0; b < blankRowCount; b++) {
        combinedRows.push(Array(header.length).fill(''));
      }
    }
    combinedRows.push(...dataRows);
  }
  while (combinedRows.length > 0 && combinedRows[combinedRows.length - 1].every(cell => cell === '')) {
    combinedRows.pop();
  }
  return combinedRows.map(row => row.join(',')).join('\n');
};

export const downloadAllAsZip = async (results: Array<{ fileName: string; status: string; csvData?: string }>) => {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  results.forEach(result => {
    if (result.status === 'success' && result.csvData) {
      const fileName = result.fileName.replace('.xml', '.csv');
      zip.file(fileName, result.csvData);
    }
  });
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'converted_files.zip';
  a.click();
  URL.revokeObjectURL(url);
};