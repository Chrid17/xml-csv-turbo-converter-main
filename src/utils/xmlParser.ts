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
  
  // Only return the requested fields for mapping
  const mappingFields: XMLField[] = [];

  // 1. Order Reference
  const orderRef = xmlDoc.querySelector('orderIdentification > uniqueCreatorIdentification')?.textContent?.trim() || '';
  mappingFields.push({
    path: '__order_reference__',
    name: 'Order Reference',
    type: 'text',
    sample: orderRef
  });

  // 2. Branch Code
  const buyer = xmlDoc.querySelector('buyer');
  let branchCodeSample = '';
  if (buyer) {
    const additionalPartyIdentifications = Array.from(buyer.querySelectorAll('additionalPartyIdentification'));
    const branchCodeIdentification = additionalPartyIdentifications.find(api => {
      const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
      const valueText = api.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
      return type === 'BUYER_ASSIGNED_IDENTIFIER_FOR_A_PARTY' && /^\d+$/.test(valueText);
    });
    if (branchCodeIdentification) {
      branchCodeSample = branchCodeIdentification.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
    }
  }
  mappingFields.push({
    path: '__branch_code__',
    name: 'Branch Code',
    type: 'text',
    sample: branchCodeSample
  });

  // 3. Customer (town)
  let customerSample = '';
  if (buyer) {
    const additionalPartyIdentifications = Array.from(buyer.querySelectorAll('additionalPartyIdentification'));
    const townIdentification = additionalPartyIdentifications.find(api => {
      const type = api.querySelector('additionalPartyIdentificationType')?.textContent?.trim();
      const valueText = api.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
      return type === 'BUYER_ASSIGNED_IDENTIFIER_FOR_A_PARTY' && /[a-zA-Z]/.test(valueText);
    });
    if (townIdentification) {
      customerSample = townIdentification.querySelector('additionalPartyIdentificationValue')?.textContent?.trim() || '';
    }
  }
  mappingFields.push({
    path: '__customer_town__',
    name: 'Customer',
    type: 'text',
    sample: customerSample
  });

  // 4. Creation Date
  const creationDate = xmlDoc.querySelector('DocumentIdentification > CreationDateAndTime')?.textContent?.trim() || '';
  mappingFields.push({
    path: '__creation_date__',
    name: 'Creation Date',
    type: 'text',
    sample: creationDate
  });

  // 5. Delivery Date
  const deliveryDate = xmlDoc.querySelector('orderLogisticalDateGroup > requestedDeliveryDateAtUltimateConsignee > date')?.textContent?.trim() || '';
  mappingFields.push({
    path: '__delivery_date__',
    name: 'Delivery Date',
    type: 'text',
    sample: deliveryDate
  });

  // 6. Order Lines (count)
  const orderLinesCount = xmlDoc.querySelectorAll('orderLineItem').length.toString();
  mappingFields.push({
    path: '__order_lines__',
    name: 'Order Lines',
    type: 'text',
    sample: orderLinesCount
  });

  // 7. Order Lines/Quantity (per line item)
  const firstOrderLineQuantity = xmlDoc.querySelector('orderLineItem > requestedQuantity > value')?.textContent?.trim() || '';
  mappingFields.push({
    path: '__order_line_quantity__',
    name: 'Order Lines/Quantity',
    type: 'text',
    sample: firstOrderLineQuantity
  });

  // 8. Order Lines/Unit Price (per line item)
  const firstOrderLineUnitPrice = xmlDoc.querySelector('orderLineItem > netPrice > amount > monetaryAmount')?.textContent?.trim() || '';
  mappingFields.push({
    path: '__order_line_unit_price__',
    name: 'Order Lines/Unit Price',
    type: 'text',
    sample: firstOrderLineUnitPrice
  });

  // 9. Pack Size (per line item)
  let firstOrderLinePackSize = '';
  let firstOrderLineGTIN = '';
  const firstOrderLineItem = xmlDoc.querySelector('orderLineItem');
  if (firstOrderLineItem) {
    // Pack Size
    const additionalTradeItemIdentifications = Array.from(firstOrderLineItem.querySelectorAll('additionalTradeItemIdentification'));
    const packSizeIdentification = additionalTradeItemIdentifications.find(ati => {
      const type = ati.querySelector('additionalTradeItemIdentificationType')?.textContent?.trim();
      const valueText = ati.querySelector('additionalTradeItemIdentificationValue')?.textContent?.trim() || '';
      return type === 'SUPPLIER_ASSIGNED' && /^\d+$/.test(valueText);
    });
    if (packSizeIdentification) {
      firstOrderLinePackSize = packSizeIdentification.querySelector('additionalTradeItemIdentificationValue')?.textContent?.trim() || '';
    }
    // GTIN
    const gtin = firstOrderLineItem.querySelector('gtin')?.textContent?.trim() || '';
    firstOrderLineGTIN = gtin;
  }
  mappingFields.push({
    path: '__pack_size__',
    name: 'Pack Size',
    type: 'text',
    sample: firstOrderLinePackSize
  });
  mappingFields.push({
    path: '__gtin__',
    name: 'GTIN',
    type: 'text',
    sample: firstOrderLineGTIN
  });

  return mappingFields;
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