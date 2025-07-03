
export interface XMLField {
  path: string;
  name: string;
  type: string;
  sample?: string;
}

export interface ConversionResult {
  fileName: string;
  status: 'success' | 'error' | 'processing';
  csvData?: string;
  error?: string;
  rowCount?: number;
}
