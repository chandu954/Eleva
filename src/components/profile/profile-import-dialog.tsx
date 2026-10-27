'use client';

import { useState } from 'react';
import type { ChangeEvent, Dispatch, DragEvent, ReactNode, SetStateAction } from 'react';
import { AlertTriangle, Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import pdfToText from 'react-pdftotext';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProUpgradeButton } from '@/components/settings/pro-upgrade-button';
import { cn, withBasePath } from '@/lib/utils';

interface ProfileImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  triggerTitle: string;
  triggerSubtitle: string;
  title: string;
  description: ReactNode;
  dropTitle: string;
  pasteLabel: string;
  placeholder: string;
  content: string;
  onContentChange: Dispatch<SetStateAction<string>>;
  onProcess: (content: string) => void | Promise<void>;
  isProcessing: boolean;
  apiKeyError: string;
}

/**
 * Shared PDF-drop / paste-text import dialog used by both profile import
 * entry points. Owns drag state and PDF extraction; the parent owns the
 * content and the AI import call.
 */
export function ProfileImportDialog({
  open,
  onOpenChange,
  triggerTitle,
  triggerSubtitle,
  title,
  description,
  dropTitle,
  pasteLabel,
  placeholder,
  content,
  onContentChange,
  onProcess,
  isProcessing,
  apiKeyError,
}: ProfileImportDialogProps) {
  const [isDragging, setIsDragging] = useState(false);

  const appendExtractedText = (text: string) => {
    onContentChange((prev) => prev + (prev ? '\n\n' : '') + text);
  };

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  };

  const handleDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === 'application/pdf');

    if (!pdfFile) {
      toast.error('Please drop a PDF file.', {
        position: 'bottom-right',
      });
      return;
    }

    try {
      const text = await pdfToText(pdfFile);
      appendExtractedText(text);
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error(
        'Failed to extract text from the PDF. Please try again or paste the content manually.',
        { position: 'bottom-right' },
      );
    }
  };

  const handleFileInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || file.type !== 'application/pdf') return;

    try {
      const text = await pdfToText(file);
      appendExtractedText(text);
    } catch (error) {
      console.error('PDF processing error:', error);
      toast.error(
        'Failed to extract text from the PDF. Please try again or paste the content manually.',
        { position: 'bottom-right' },
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="group relative bg-violet-500/5 hover:bg-violet-500/10 border-violet-500/20 hover:border-violet-500/30 text-violet-600 transition-all duration-500 hover:scale-[1.02] h-auto py-4"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/0 via-violet-500/5 to-violet-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-violet-500/10 group-hover:scale-110 transition-transform duration-500">
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-violet-600">{triggerTitle}</div>
              <div className="text-sm text-violet-600/70">{triggerSubtitle}</div>
            </div>
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border-white/40 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            {title}
          </DialogTitle>
          <DialogDescription asChild>{description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-4">
            <label
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={cn(
                'border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 transition-colors duration-200 cursor-pointer group',
                isDragging
                  ? 'border-violet-500 bg-violet-50/50'
                  : 'border-gray-200 hover:border-violet-500/50 hover:bg-violet-50/10',
              )}
            >
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileInput}
              />
              <Upload className="w-10 h-10 text-violet-500 group-hover:scale-110 transition-transform duration-200" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{dropTitle}</p>
                <p className="text-sm text-muted-foreground">or click to browse files</p>
              </div>
            </label>
            <div className="relative">
              <div className="absolute -top-3 left-3 bg-white px-2 text-sm text-muted-foreground">
                {pasteLabel}
              </div>
              <Textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder={placeholder}
                className="min-h-[100px] bg-white/50 border-white/40 focus:border-violet-500/40 focus:ring-violet-500/20 transition-all duration-300 pt-4"
              />
            </div>
          </div>
        </div>
        {apiKeyError && (
          <div className="px-4 py-3 bg-red-50/50 border border-red-200/50 rounded-lg flex items-start gap-3 text-red-600 text-sm">
            <div className="p-1.5 rounded-full bg-red-100">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium">API Key Required</p>
              <p className="text-red-500/90">{apiKeyError}</p>
              <div className="mt-2 flex flex-col gap-2 justify-start">
                <div className="w-auto mx-auto">
                  <ProUpgradeButton />
                </div>
                <div className="text-center text-xs text-red-400">or</div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50/50 w-auto mx-auto"
                  onClick={() => (window.location.href = withBasePath('/settings'))}
                >
                  Set API Keys in Settings
                </Button>
              </div>
            </div>
          </div>
        )}
        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="bg-white/50 hover:bg-white/60 transition-all duration-300"
          >
            Cancel
          </Button>
          <Button
            onClick={() => onProcess(content)}
            disabled={isProcessing || !content.trim()}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 transition-all duration-500 hover:scale-[1.02] disabled:hover:scale-100"
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                <span>Process with AI</span>
              </div>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
