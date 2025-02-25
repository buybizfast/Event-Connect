import React, { useRef, ReactNode } from 'react';

interface ProfileImageUploadProps {
  onImageSelected: (file: File | null) => void;
  children: ReactNode;
  className?: string;
}

export default function ProfileImageUpload({ onImageSelected, children, className }: ProfileImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  };

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className || ''}`}>
      {children}
      <input
        type="file"
        id="photo-upload"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
        ref={fileInputRef}
      />
    </div>
  );
} 