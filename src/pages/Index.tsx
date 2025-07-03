
import React from 'react';
import ConversionHeader from '@/components/ConversionHeader';
import UploadSection from '@/components/UploadSection';
import ControlPanel from '@/components/ControlPanel';
import ProcessingResults from '@/components/ProcessingResults';
import { useXMLConverter } from '@/hooks/useXMLConverter';

const Index = () => {
  const {
    files,
    xmlFields,
    selectedFields,
    setSelectedFields,
    isProcessing,
    progress,
    results,
    showFieldMapping,
    handleFilesSelected,
    startConversion
  } = useXMLConverter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <ConversionHeader />

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <UploadSection
            files={files}
            xmlFields={xmlFields}
            selectedFields={selectedFields}
            showFieldMapping={showFieldMapping}
            onFilesSelected={handleFilesSelected}
            onSelectionChange={setSelectedFields}
          />

          {/* Control Panel */}
          <ControlPanel
            files={files}
            selectedFields={selectedFields}
            isProcessing={isProcessing}
            progress={progress}
            results={results}
            onStartConversion={startConversion}
          />
        </div>

        {/* Results Section */}
        {results.length > 0 && (
          <div className="mt-8">
            <ProcessingResults results={results} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
