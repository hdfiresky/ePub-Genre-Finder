
import React, { useCallback, useRef } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  selectedFile: File | null;
}

/**
 * A reusable file upload component that supports both clicking to select a file
 * and dragging and dropping a file.
 * @param {FileUploadProps} props The component props.
 * @param {function} props.onFileSelect Callback function to be invoked when a file is selected.
 * @param {File | null} props.selectedFile The currently selected file, used to display its name.
 * @returns {React.FC} The rendered file upload component.
 */
export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, selectedFile }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles the file change event from the hidden file input element.
   * This is triggered when a user selects a file via the file dialog.
   * @param {React.ChangeEvent<HTMLInputElement>} event The input change event.
   */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      onFileSelect(event.target.files[0]);
    }
  };

  /**
   * Handles the drag-over event on the drop zone.
   * It prevents the browser's default behavior and adds a visual indicator to show the area is a valid drop target.
   * @param {React.DragEvent<HTMLLabelElement>} event The drag event.
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.add('border-indigo-400');
  }, []);
  
  /**
   * Handles the drag-leave event on the drop zone.
   * It removes the visual indicator when the dragged file leaves the drop area.
   * @param {React.DragEvent<HTMLLabelElement>} event The drag event.
   */
  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-400');
  }, []);

  /**
   * Handles the drop event on the drop zone.
   * It prevents the default browser behavior, validates that the dropped file is an ePub,
   * and then calls the onFileSelect callback with the file.
   * @param {React.DragEvent<HTMLLabelElement>} event The drop event.
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.currentTarget.classList.remove('border-indigo-400');
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      if (event.dataTransfer.files[0].type === 'application/epub+zip') {
        onFileSelect(event.dataTransfer.files[0]);
      } else {
        alert('Please drop an .epub file.');
      }
    }
  }, [onFileSelect]);
  
  /**
   * Handles a click on the upload area.
   * It programmatically triggers a click on the hidden file input element, opening the file selection dialog.
   */
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <label
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-indigo-400 focus:outline-none"
      >
        <span className="flex items-center space-x-2">
          <UploadIcon />
          <span className="font-medium text-gray-600">
            {selectedFile ? selectedFile.name : 'Drop .epub file here, or click to select'}
          </span>
        </span>
        <input
          ref={fileInputRef}
          type="file"
          id="epub-upload"
          name="epub-upload"
          accept=".epub,application/epub+zip"
          onChange={handleFileChange}
          className="hidden"
        />
      </label>
    </div>
  );
};
