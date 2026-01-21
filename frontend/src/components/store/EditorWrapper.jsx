import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Edit3 } from 'lucide-react';

// Check if we're in editor mode
export const useEditorMode = () => {
  const [searchParams] = useSearchParams();
  return searchParams.get('editor') === 'true';
};

// Send message to parent editor
export const selectSection = (sectionType) => {
  if (window.parent !== window) {
    window.parent.postMessage({
      type: 'EDITOR_SELECT_SECTION',
      sectionType
    }, '*');
  }
};

// Editable section wrapper - adds click-to-edit functionality
export const EditableSection = ({ children, sectionType, className = '' }) => {
  const isEditorMode = useEditorMode();
  const [isHovered, setIsHovered] = useState(false);

  if (!isEditorMode) {
    return <>{children}</>;
  }

  return (
    <div 
      className={`relative group ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        selectSection(sectionType);
      }}
      style={{ cursor: 'pointer' }}
    >
      {children}
      
      {/* Hover overlay */}
      <div 
        className={`absolute inset-0 border-2 border-blue-500 bg-blue-500/5 pointer-events-none transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 1000 }}
      />
      
      {/* Edit badge */}
      <div 
        className={`absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1 shadow-lg transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 1001 }}
      >
        <Edit3 className="w-3 h-3" />
        <span className="capitalize">{sectionType.replace(/-/g, ' ')}</span>
      </div>
    </div>
  );
};

// Editor mode indicator for the preview
export const EditorModeIndicator = () => {
  const isEditorMode = useEditorMode();
  
  if (!isEditorMode) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[9999] flex items-center gap-2">
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <span>Editor Mode Active</span>
    </div>
  );
};

export default EditableSection;
