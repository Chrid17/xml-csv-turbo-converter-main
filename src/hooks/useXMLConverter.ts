
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { XMLField, ConversionResult } from '@/types';
import { analyzeXMLStructure } from '@/utils/xmlParser';
import { convertXMLToCSV, convertMultipleXMLToCSV } from '@/utils/csvGenerator';

export const useXMLConverter = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [xmlFields, setXmlFields] = useState<XMLField[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ConversionResult[]>([]);
  const [showFieldMapping, setShowFieldMapping] = useState(false);
  const { toast } = useToast();

  const handleFilesSelected = useCallback(async (newFiles: File[]) => {
    if (newFiles.length > 360) {
      toast({
        title: "Too many files",
        description: "Maximum 360 files allowed at once",
        variant: "destructive"
      });
      return;
    }
    // Filter out duplicates by name and size
    const existingFiles = files;
    const uniqueNewFiles = newFiles.filter(
      nf => !existingFiles.some(ef => ef.name === nf.name && ef.size === nf.size)
    );
    if (uniqueNewFiles.length < newFiles.length) {
      toast({
        title: "Duplicate files skipped",
        description: `Some files were already uploaded and have been ignored.`,
        variant: "destructive"
      });
    }
    const allFiles = [...existingFiles, ...uniqueNewFiles];
    setFiles(allFiles);
    setResults([]);
    setProgress(0);
    
    // Analyze first file to extract field structure
    if (allFiles.length > 0) {
      try {
        const fields = await analyzeXMLStructure(allFiles[0]);
        setXmlFields(fields);
        // Auto-select all mapping fields by default
        setSelectedFields(fields.map(f => f.path));
        setShowFieldMapping(true);
        console.log('Extracted fields:', fields);
      } catch (error) {
        console.error('Error analyzing XML structure:', error);
        toast({
          title: "Analysis failed",
          description: "Could not analyze XML structure",
          variant: "destructive"
        });
      }
    }
    
    toast({
      title: "Files loaded",
      description: `${uniqueNewFiles.length} new XML files ready for conversion`,
    });
  }, [toast, files]);

  const startConversion = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload XML files first",
        variant: "destructive"
      });
      return;
    }

    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select fields to convert",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setResults([]);

    try {
      // Use the new function to combine all files into one CSV
      const csvData = await convertMultipleXMLToCSV(files, selectedFields, xmlFields, 2); // 2 blank rows between
      const result: ConversionResult = {
        fileName: files.length === 1 ? files[0].name.replace(/\.xml$/i, '.csv') : 'combined_orders.csv',
        status: 'success',
        csvData,
        rowCount: csvData.split('\n').length - 1
      };
      setResults([result]);
      setProgress(100);
      toast({
        title: "Conversion complete",
        description: `Processed ${files.length} files into one CSV`,
      });
    } catch (error) {
      setResults([{
        fileName: 'combined_orders.csv',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }]);
      toast({
        title: "Conversion failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
    setIsProcessing(false);
  };

  return {
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
  };
};
