
import { XMLField } from '@/types';
import { findElementByPath } from './xmlParser';

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

  // Find all possible record nodes by looking for repeating elements
  const findAllRecordNodes = (node: Element): Element[] => {
    const allNodes: Element[] = [];
    
    // Check if current node has data (text content or attributes)
    const hasData = node.textContent?.trim() || node.attributes.length > 0;
    if (hasData) {
      allNodes.push(node);
    }
    
    // Recursively search children
    Array.from(node.children).forEach(child => {
      const childNodes = findAllRecordNodes(child);
      allNodes.push(...childNodes);
    });
    
    return allNodes;
  };

  // Get all potential record nodes
  const allNodes = xmlDoc.documentElement ? findAllRecordNodes(xmlDoc.documentElement) : [];
  console.log(`Found ${allNodes.length} potential record nodes`);

  // Group nodes that might represent the same type of record
  const nodesByTag: { [key: string]: Element[] } = {};
  allNodes.forEach(node => {
    const tagName = node.tagName;
    if (!nodesByTag[tagName]) {
      nodesByTag[tagName] = [];
    }
    nodesByTag[tagName].push(node);
  });

  // Find the tag with the most instances (likely our record type)
  let recordNodes: Element[] = [];
  let maxCount = 0;
  Object.entries(nodesByTag).forEach(([tag, nodes]) => {
    if (nodes.length > maxCount && nodes.length > 1) {
      maxCount = nodes.length;
      recordNodes = nodes;
    }
  });

  // If no repeating elements found, treat the entire document as one record
  if (recordNodes.length === 0 && xmlDoc.documentElement) {
    recordNodes = [xmlDoc.documentElement];
  }

  console.log(`Processing ${recordNodes.length} record nodes`);

  // For new mapping: only use <orderLineItem> as record nodes
  const orderLineItems = Array.from(xmlDoc.querySelectorAll('orderLineItem'));
  if (orderLineItems.length > 0) {
    orderLineItems.forEach((orderLineItem, index) => {
      const row: string[] = [];
      fields.forEach(fieldPath => {
        let value = '';
        if (fieldPath === '__order_reference__') {
          value = xmlDoc.querySelector('orderIdentification > uniqueCreatorIdentification')?.textContent?.trim() || '';
        } else if (fieldPath === '__customer_town__') {
          const buyer = xmlDoc.querySelector('buyer');
          if (buyer) {
            const additionalPartyIdentifications = Array.from(buyer.querySelectorAll('additionalPartyIdentification'));
            const townIdentification = additionalPartyIdentifications.find(api => {
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
          // Robust: always pick the first SUPPLIER_ASSIGNED numeric value for this line
          let foundPackSize = '';
          const additionalTradeItemIdentifications = Array.from(orderLineItem.querySelectorAll('additionalTradeItemIdentification'));
          for (const ati of additionalTradeItemIdentifications) {
            const type = ati.querySelector('additionalTradeItemIdentificationType')?.textContent?.trim();
            const valueText = ati.querySelector('additionalTradeItemIdentificationValue')?.textContent?.trim() || '';
            // Only accept 1-3 digit numbers as pack size
            if (type === 'SUPPLIER_ASSIGNED' && /^\d{1,3}$/.test(valueText)) {
              foundPackSize = valueText;
              break;
            }
          }
          value = foundPackSize;
        } else if (fieldPath === '__gtin__') {
          const gtinValue = orderLineItem.querySelector('gtin')?.textContent?.trim() || '';
          value = gtinValue ? `="${gtinValue}"` : '';
        }
        // Escape CSV special characters
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
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
  console.log(`Generated CSV with ${rows.length - 1} data rows`);
  
  return csvContent;
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
