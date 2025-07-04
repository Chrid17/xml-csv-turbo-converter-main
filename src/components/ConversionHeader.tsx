
import React from 'react';
import { Zap } from 'lucide-react';

const ConversionHeader = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center gap-3 mb-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
          XML to CSV Converter
        </h1>
      </div>
      <p className="text-lg text-gray-600 max-w-2xl mx-auto">
        Convert up to 360 XML files to CSV format at once with custom field mapping
      </p>
    </div>
  );
};

export default ConversionHeader;
