
import React from 'react';
import { Upload, FileText, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import FileUploadZone from '@/components/FileUploadZone';
import FieldMappingPanel from '@/components/FieldMappingPanel';
import { XMLField } from '@/types';

interface UploadSectionProps {
  files: File[];
  xmlFields: XMLField[];
  selectedFields: string[];
  showFieldMapping: boolean;
  onFilesSelected: (files: File[]) => void;
  onSelectionChange: (fields: string[]) => void;
}

const UploadSection: React.FC<UploadSectionProps> = ({
  files,
  xmlFields,
  selectedFields,
  showFieldMapping,
  onFilesSelected,
  onSelectionChange
}) => {
  return (
    <div className="lg:col-span-2">
      <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-500" />
            Upload XML Files
          </CardTitle>
          <CardDescription>
            Select up to 360 XML files for batch conversion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone onFilesSelected={onFilesSelected} />
          
          {files.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <span className="font-medium">{files.length} files selected</span>
                <Badge variant="secondary">{files.length}/360</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Field Mapping Panel */}
      {showFieldMapping && (
        <Card className="border-0 shadow-lg bg-white/70 backdrop-blur-sm mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-green-500" />
              Field Mapping
            </CardTitle>
            <CardDescription>
              Select which XML fields to include in your CSV output
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldMappingPanel
              fields={xmlFields}
              selectedFields={selectedFields}
              onSelectionChange={onSelectionChange}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadSection;
