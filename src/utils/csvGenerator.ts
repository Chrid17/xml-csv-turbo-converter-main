
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

  recordNodes.forEach((record, index) => {
    const row: string[] = [];
    
    fields.forEach(fieldPath => {
      let value = '';
      
      if (fieldPath.includes('@')) {
        // Handle attributes
        const [elementPath, attrName] = fieldPath.split('@');
        const element = findElementByPath(record, elementPath, xmlDoc.documentElement!);
        if (element && element.hasAttribute(attrName)) {
          value = element.getAttribute(attrName) || '';
        }
      } else {
        // Handle elements
        const element = findElementByPath(record, fieldPath, xmlDoc.documentElement!);
        if (element) {
          value = element.textContent?.trim() || '';
        }
      }
      
      // Escape CSV special characters
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = `"${value.replace(/"/g, '""')}"`;
      }
      
      row.push(value);
    });
    
    // Only add row if it has some data
    if (row.some(cell => cell.trim() !== '')) {
      rows.push(row);
    }
    
    console.log(`Record ${index + 1} data:`, row);
  });

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
