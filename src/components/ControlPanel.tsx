
import React from 'react';
import { Zap, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ConversionResult } from '@/types';
import { downloadAllAsZip } from '@/utils/csvGenerator';

interface ControlPanelProps {
  files: File[];
  selectedFields: string[];
  isProcessing: boolean;
  progress: number;
  results: ConversionResult[];
  onStartConversion: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  files,
  selectedFields,
  isProcessing,
  progress,
  results,
  onStartConversion
}) => {
  const handleDownloadAll = () => {
    downloadAllAsZip(results);
  };

  return (
    <div>
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm sticky top-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-purple-500" />
            Conversion Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={onStartConversion}
            disabled={isProcessing || files.length === 0 || selectedFields.length === 0}
            className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600"
            size="lg"
          >
            {isProcessing ? 'Converting...' : 'Start Conversion'}
          </Button>

          {isProcessing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">
                  {results.filter(r => r.status === 'success').length} converted
                </span>
              </div>
              
              <Button
                onClick={handleDownloadAll}
                variant="outline"
                className="w-full"
                disabled={results.filter(r => r.status === 'success').length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                Download All as ZIP
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ControlPanel;
