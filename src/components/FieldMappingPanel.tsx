
import React from 'react';
import { Check, Tag, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { XMLField } from '@/pages/Index';

interface FieldMappingPanelProps {
  fields: XMLField[];
  selectedFields: string[];
  onSelectionChange: (selectedFields: string[]) => void;
}

const FieldMappingPanel: React.FC<FieldMappingPanelProps> = ({
  fields,
  selectedFields,
  onSelectionChange
}) => {
  const handleFieldToggle = (fieldPath: string) => {
    const newSelection = selectedFields.includes(fieldPath)
      ? selectedFields.filter(f => f !== fieldPath)
      : [...selectedFields, fieldPath];
    
    onSelectionChange(newSelection);
  };

  const selectAll = () => {
    onSelectionChange(fields.map(f => f.path));
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const groupedFields = fields.reduce((acc, field) => {
    const rootElement = field.path.split('.')[0];
    if (!acc[rootElement]) {
      acc[rootElement] = [];
    }
    acc[rootElement].push(field);
    return acc;
  }, {} as Record<string, XMLField[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-gray-700">Available Fields</h4>
          <Badge variant="secondary">{selectedFields.length} selected</Badge>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearAll}>
            Clear All
          </Button>
        </div>
      </div>

      <ScrollArea className="h-80 w-full border rounded-lg p-4">
        <div className="space-y-4">
          {Object.entries(groupedFields).map(([rootElement, elementFields]) => (
            <div key={rootElement} className="space-y-2">
              <h5 className="font-medium text-gray-600 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                {rootElement}
              </h5>
              
              {elementFields.map((field) => (
                <div
                  key={field.path}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Checkbox
                    checked={selectedFields.includes(field.path)}
                    onCheckedChange={() => handleFieldToggle(field.path)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-700 truncate">
                        {field.name}
                      </span>
                      <Badge 
                        variant={field.type === 'attribute' ? 'outline' : 'secondary'}
                        className="text-xs"
                      >
                        {field.type === 'attribute' ? '@' : <Type className="h-3 w-3" />}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-gray-500 mb-1">
                      Path: {field.path}
                    </p>
                    
                    {field.sample && (
                      <p className="text-xs text-gray-400 italic truncate">
                        Sample: "{field.sample}"
                      </p>
                    )}
                  </div>
                  
                  {selectedFields.includes(field.path) && (
                    <Check className="h-4 w-4 text-green-500 mt-1" />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </ScrollArea>

      {selectedFields.length > 0 && (
        <div className="p-4 bg-green-50 rounded-lg">
          <h5 className="font-medium text-green-800 mb-2">Selected Fields Preview</h5>
          <div className="flex flex-wrap gap-2">
            {selectedFields.slice(0, 10).map((fieldPath) => {
              const field = fields.find(f => f.path === fieldPath);
              return (
                <Badge key={fieldPath} variant="outline" className="text-green-700 border-green-300">
                  {field?.name || fieldPath}
                </Badge>
              );
            })}
            {selectedFields.length > 10 && (
              <Badge variant="outline" className="text-green-700 border-green-300">
                +{selectedFields.length - 10} more
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FieldMappingPanel;
