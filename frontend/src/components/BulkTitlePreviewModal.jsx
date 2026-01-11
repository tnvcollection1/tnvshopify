import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Checkbox } from '../components/ui/checkbox';
import {
  Sparkles,
  Check,
  X,
  Loader2,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const BulkTitlePreviewModal = ({
  isOpen,
  onClose,
  previewResults,
  isApplying,
  onApplySelected,
  applyProgress,
}) => {
  const [selectedItems, setSelectedItems] = useState(() => {
    // Initially select all successful items
    const initial = new Set();
    previewResults.forEach((item, index) => {
      if (item.success && item.suggested_title) {
        initial.add(index);
      }
    });
    return initial;
  });
  const [expandedItems, setExpandedItems] = useState(new Set());

  const successCount = previewResults.filter(r => r.success && r.suggested_title).length;
  const failedCount = previewResults.filter(r => !r.success || !r.suggested_title).length;

  const toggleItem = (index) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleExpand = (index) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const selectAll = () => {
    const all = new Set();
    previewResults.forEach((item, index) => {
      if (item.success && item.suggested_title) {
        all.add(index);
      }
    });
    setSelectedItems(all);
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleApply = () => {
    const selectedResults = previewResults.filter((_, index) => selectedItems.has(index));
    onApplySelected(selectedResults);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-white">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Bulk Title Enhancement Preview
          </DialogTitle>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="px-6 py-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Ready:</span>
                <span className="font-semibold text-green-700">{successCount}</span>
              </div>
              {failedCount > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-gray-600">Failed:</span>
                  <span className="font-semibold text-red-700">{failedCount}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-purple-500" />
                <span className="text-gray-600">Selected:</span>
                <span className="font-semibold text-purple-700">{selectedItems.size}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
            </div>
          </div>
        </div>

        {/* Results List */}
        <ScrollArea className="flex-1 max-h-[calc(90vh-220px)]">
          <div className="p-4 space-y-3">
            {previewResults.map((item, index) => {
              const isSuccess = item.success && item.suggested_title;
              const isSelected = selectedItems.has(index);
              const isExpanded = expandedItems.has(index);

              return (
                <div
                  key={index}
                  className={`
                    border rounded-lg overflow-hidden transition-all
                    ${isSuccess 
                      ? isSelected 
                        ? 'border-purple-300 bg-purple-50/50' 
                        : 'border-gray-200 bg-white'
                      : 'border-red-200 bg-red-50/50'
                    }
                  `}
                >
                  {/* Main Row */}
                  <div className="flex items-start gap-3 p-3">
                    {/* Checkbox */}
                    {isSuccess && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleItem(index)}
                        className="mt-1"
                      />
                    )}
                    {!isSuccess && (
                      <AlertCircle className="w-5 h-5 text-red-500 mt-1 flex-shrink-0" />
                    )}

                    {/* Image */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-6 h-6 text-gray-300" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {isSuccess ? (
                        <>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">Original:</span>
                            <span className="text-sm text-gray-600 line-clamp-1">
                              {item.original_title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <ArrowRight className="w-4 h-4 text-purple-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-gray-900 line-clamp-1">
                              {item.suggested_title}
                            </span>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-gray-900 line-clamp-1 mb-1">
                            {item.original_title}
                          </p>
                          <p className="text-xs text-red-600">
                            {item.error || 'Failed to generate suggestion'}
                          </p>
                        </>
                      )}
                    </div>

                    {/* Expand Button */}
                    {isSuccess && item.all_suggestions?.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleExpand(index)}
                        className="flex-shrink-0"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && item.all_suggestions?.length > 1 && (
                    <div className="px-3 pb-3 pt-0 border-t bg-gray-50/50">
                      <p className="text-xs text-gray-500 mb-2 mt-2">Alternative suggestions:</p>
                      <div className="space-y-1">
                        {item.all_suggestions.slice(1).map((suggestion, i) => (
                          <div 
                            key={i}
                            className="text-sm text-gray-600 pl-4 border-l-2 border-gray-200"
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                      {item.description && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Generated description:</p>
                          <p className="text-xs text-gray-600 line-clamp-3">
                            {item.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Review the AI suggestions above. Uncheck any you don't want to apply.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedItems.size === 0 || isApplying}
              className="bg-purple-500 hover:bg-purple-600"
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Applying {applyProgress.current}/{applyProgress.total}...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Apply {selectedItems.size} Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkTitlePreviewModal;
