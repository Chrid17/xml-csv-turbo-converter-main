import { XMLField } from '@/types';
// import { findElementByPath } from './xmlParser'; //
export const convertXMLToCSV = async (file: File, fields: string[], xmlFields: XMLField[]): Promise<string> => {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('Invalid XML format');
  }  
  const rows: string[][] = [];
  const headers = fields.map(path => {
    const field = xmlFields.find(f => f.path === path);
    return field ? field.name : path;
  });
  rows.push(headers);
  console.log('CSV Headers:', headers);

  const orderLineItems = Array.from(xmlDoc.querySelectorAll('orderLineItem'));
  if (orderLineItems.length > 0) {
    const orderRef = xmlDoc.querySelector('orderIdentification > uniqueCreatorIdentification')?.textContent?.trim() || '';
    let branchCode = '';
    const buyer = xmlDoc.querySelector('buyer');
    if (buyer) {
      const additionalPartyIdentifications = Array.from(buyer.querySelectorAll('additionalPartyIdentification'));
      const branchCodeIdentification = additionalPartyIdentifications.find(api => {
        const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
        const valueText = api.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
        return type === 'BUYER_ASSIGNED_IDENTIFIER_FOR_A_PARTY' && /^\d+$/.test(valueText);
      });
      if (branchCodeIdentification) {
        branchCode = 'WBW' + (branchCodeIdentification.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '');
      }
    }
    let customer = '';
    if (buyer) {
      const additionalPartyIdentifications = Array.from(buyer.querySelectorAll('additionalPartyIdentification'));
      const townIdentification = additionalPartyIdentifications.find(api => {
        const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
        const valueText = api.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
        return type === 'BUYER_ASSIGNED_IDENTIFIER_FOR_A_PARTY' && /[a-zA-Z]/.test(valueText);
      });
      if (townIdentification) {
        customer = townIdentification.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
      }
    }
    const creationDate = (() => {
      const fullDate = xmlDoc.querySelector('DocumentIdentification > CreationDateAndTime')?.textContent?.trim() || '';
      let [datePart] = fullDate.split('T');
      if (!datePart) datePart = fullDate; // Handle cases where no 'T' separator exists
      if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        const [y, m, d] = datePart.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(datePart)) {
        const [d, m, y] = datePart.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
      return datePart; // Fallback for invalid formats
    })();
    const deliveryDate = (() => {
      const delDate = xmlDoc.querySelector('orderLogisticalDateGroup > requestedDeliveryDateAtUltimateConsignee > date')?.textContent?.trim() || '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(delDate)) {
        const [y, m, d] = delDate.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      } else if (/^\d{2}-\d{2}-\d{4}$/.test(delDate)) {
        const [d, m, y] = delDate.split('-');
        return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
      }
      return delDate; // Fallback for invalid formats
    })();

    orderLineItems.forEach((orderLineItem, index) => {
      const row: string[] = [];
      fields.forEach(fieldPath => {
        let value = '';
        if (fieldPath === '__customer_reference__') {
          value = (index === 0) ? orderRef : '';
          console.log(`Customer Reference for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__branch_code__') {
          value = (index === 0) ? branchCode : '';
          console.log(`Branch Code for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__customer_town__') {
          value = (index === 0) ? customer : '';
          console.log(`Customer Town for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__creation_date__') {
          value = (index === 0) ? creationDate : '';
          console.log(`Creation Date for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__delivery_date__') {
          value = (index === 0) ? deliveryDate : '';
          console.log(`Delivery Date for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__order_lines__') {
          value = (index + 1).toString();
          console.log(`Order Line for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__order_line_quantity__') {
          value = orderLineItem.querySelector('requestedQuantity > value')?.textContent?.trim() || '';
          console.log(`Order Line Quantity for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__order_line_unit_price__') {
          value = orderLineItem.querySelector('netPrice > amount > monetaryAmount')?.textContent?.trim() || '';
          console.log(`Order Line Unit Price for row ${index + 1}: "${value}"`);
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
          console.log(`Pack Size for row ${index + 1}: "${value}"`);
        } else if (fieldPath === '__gtin__') {
          value = orderLineItem.querySelector('gtin')?.textContent?.trim() || '';
          console.log(`GTIN for row ${index + 1}: "${value}"`);
        }
        value = value.trim();
        if (fieldPath === '__branch_code__' && value) {
          value = `"${value.replace(/"/g, '""')}"`;
        } else if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        row.push(value);
      });
      if (row.some(cell => cell.trim() !== '')) {
        rows.push(row);
      }
      console.log(`OrderLineItem ${index + 1} data:`, row);
    });
  }

  const csvContent = rows.map(row => row.join(',')).join('\n');
  console.log(`Generated CSV with ${rows.length - 1} data rows:`, csvContent);
  
  return csvContent;
};

export const convertMultipleXMLToCSV = async (
  files: File[],
  fields: string[],
  xmlFields: XMLField[],
  blankRowCount: number = 0
): Promise<string> => {
  if (files.length === 0) return '';

  // Load previously processed files from localStorage
  const storedFiles = localStorage.getItem('processedFiles');
  const processedFiles = new Set<string>(storedFiles ? JSON.parse(storedFiles) : []);

  const combinedRows: string[][] = [];
  let header: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileName = file.name;

    // Check for duplicate file
    if (processedFiles.has(fileName)) {
      console.log(`Duplicate file detected and skipped: ${fileName}`);
      continue; // Skip processing this file
    }

    // Process the file
    const csv = await convertXMLToCSV(file, fields, xmlFields);
    const lines = csv.split('\n').map(line => line.split(',').map(cell => cell.trim()));
    if (i === 0) {
      header = lines[0];
      combinedRows.push(header);
    }
    const dataRows = lines.slice(1);
    combinedRows.push(...dataRows);

    // Mark file as processed
    processedFiles.add(fileName);
    localStorage.setItem('processedFiles', JSON.stringify(Array.from(processedFiles)));
  }

  while (combinedRows.length > 0 && combinedRows[combinedRows.length - 1].every(cell => cell === '')) {
    combinedRows.pop();
  }

  const finalCsv = combinedRows.map(row => row.join(',')).join('\n');
  console.log('Combined CSV:', finalCsv);
  return finalCsv;
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