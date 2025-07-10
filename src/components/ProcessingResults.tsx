
import React from 'react';
import { Download, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ConversionResult } from '@/types';

interface ProcessingResultsProps {
  results: ConversionResult[];
}

const ProcessingResults: React.FC<ProcessingResultsProps> = ({ results }) => {
  // Defensive: ensure results is always an array
  const safeResults = Array.isArray(results) ? results : [];

  const downloadCSV = (result: ConversionResult) => {
    if (result.csvData) {
      const blob = new Blob([result.csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName?.replace('.xml', '.csv') || 'download.csv';
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const successCount = safeResults.filter(r => r.status === 'success').length;
  const errorCount = safeResults.filter(r => r.status === 'error').length;
  const processingCount = safeResults.filter(r => r.status === 'processing').length;

  return (
    <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-500" />
          Processing Results
        </CardTitle>
        <CardDescription>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {successCount} successful
            </span>
            {errorCount > 0 && (
              <span className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                {errorCount} failed
              </span>
            )}
            {processingCount > 0 && (
              <span className="flex items-center gap-1">
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                {processingCount} processing
              </span>
            )}
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80 w-full">
          <div className="space-y-2">
            {safeResults.length === 0 && (
              <div className="text-center text-gray-400 py-8">No results to display yet.</div>
            )}
            {safeResults.map((result, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border bg-white/50"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {result.status === 'success' && (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {result.status === 'error' && (
                    <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                  )}
                  {result.status === 'processing' && (
                    <Loader2 className="h-5 w-5 text-blue-500 animate-spin flex-shrink-0" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-700 truncate">
                      {result.fileName || 'Unknown file'}
                    </p>
                    {result.status === 'success' && result.rowCount && (
                      <p className="text-xs text-gray-500">
                        {result.rowCount} rows converted
                      </p>
                    )}
                    {result.status === 'error' && result.error && (
                      <p className="text-xs text-red-500 truncate">
                        {result.error}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        result.status === 'success' ? 'default' :
                        result.status === 'error' ? 'destructive' : 'secondary'
                      }
                      className="text-xs"
                    >
                      {result.status}
                    </Badge>
                    
                    {result.status === 'success' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadCSV(result)}
                        className="h-8"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        CSV
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ProcessingResults;
