
import { XMLField } from '@/types';

export const analyzeXMLStructure = async (file: File): Promise<XMLField[]> => {
  const text = await file.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(text, 'text/xml');
  
  const fields: XMLField[] = [];
  const extractFields = (node: Element, path = '') => {
    const nodeName = node.tagName;
    const currentPath = path ? `${path}.${nodeName}` : nodeName;
    
    // If node has text content and no child elements, it's a data field
    if (node.children.length === 0 && node.textContent?.trim()) {
      fields.push({
        path: currentPath,
        name: nodeName,
        type: 'text',
        sample: node.textContent.trim().substring(0, 50)
      });
    } else if (node.children.length > 0) {
      // Process child elements
      Array.from(node.children).forEach(child => {
        extractFields(child, currentPath);
      });
    }
    
    // Extract attributes
    Array.from(node.attributes).forEach(attr => {
      fields.push({
        path: `${currentPath}@${attr.name}`,
        name: `${nodeName}@${attr.name}`,
        type: 'attribute',
        sample: attr.value.substring(0, 50)
      });
    });
  };
  
  if (xmlDoc.documentElement) {
    extractFields(xmlDoc.documentElement);
  }
  
  // Remove duplicates based on path
  const uniqueFields = fields.filter((field, index, self) => 
    index === self.findIndex(f => f.path === field.path)
  );
  
  return uniqueFields;
};

export const findElementByPath = (root: Element, path: string, documentRoot: Element): Element | null => {
  // First try to find from the current root
  let current: Element | null = root;
  const parts = path.split('.');
  
  // If path starts with document root, start from document
  if (parts[0] === documentRoot.tagName) {
    current = documentRoot;
    parts.shift(); // Remove the root part
  }
  
  for (const part of parts) {
    if (!current) return null;
    
    // Look for direct child first
    let child = Array.from(current.children).find(c => c.tagName === part);
    
    // If not found as direct child, search recursively
    if (!child) {
      const findRecursive = (node: Element): Element | null => {
        if (node.tagName === part) return node;
        for (const childNode of Array.from(node.children)) {
          const found = findRecursive(childNode);
          if (found) return found;
        }
        return null;
      };
      child = findRecursive(current);
    }
    
    current = child;
  }
  
  return current;
};
