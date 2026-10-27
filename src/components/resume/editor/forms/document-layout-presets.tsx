import { Button } from "@/components/ui/button";
import { LayoutTemplate } from "lucide-react";
import { DocumentSettings } from "@/lib/types";

export interface DocumentLayoutPresetsProps {
  documentSettings: DocumentSettings;
  defaultSettings: DocumentSettings;
  onApply: (settings: DocumentSettings) => void;
}

export function DocumentLayoutPresets({ documentSettings, defaultSettings, onApply }: DocumentLayoutPresetsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 pt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onApply({...defaultSettings})}
        className="relative h-60 group p-0 overflow-hidden border-slate-200 hover:border-teal-600/40 transition-colors"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50/50 to-cyan-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative h-full w-full flex flex-col items-center">
          <div className="w-full p-2 text-xs font-medium text-teal-600 border-b border-slate-200 bg-slate-50/80">
            <LayoutTemplate className="w-3 h-3 inline-block mr-1" />
            Default Layout
          </div>
          <div className="flex-1 w-full p-2 flex flex-col justify-between">
            {/* Mock resume content - Default */}
            <div>
              <div className="w-3/4 h-2 bg-slate-300 rounded mb-6" />
              <div className="flex space-x-2 mb-4">
                <div className="w-1/3 h-1 bg-slate-300 rounded" />
                <div className="w-1/3 h-1 bg-slate-300 rounded" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="w-1/3 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-10/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="w-1/3 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-10/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="w-1/3 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1.5">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-10/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onApply({
          ...documentSettings,
          footer_width: 0,
          show_ubc_footer: false,
          header_name_size: 24,
          skills_margin_top: 0,
          document_font_size: 10,
          projects_margin_top: 0,
          skills_item_spacing: 0,
          document_line_height: 1.2,
          education_margin_top: 0,
          skills_margin_bottom: 2,
          experience_margin_top: 2,
          projects_item_spacing: 0,
          education_item_spacing: 0,
          projects_margin_bottom: 0,
          education_margin_bottom: 0,
          experience_item_spacing: 1,
          document_margin_vertical: 20,
          experience_margin_bottom: 0,
          skills_margin_horizontal: 0,
          document_margin_horizontal: 28,
          header_name_bottom_spacing: 16,
          projects_margin_horizontal: 0,
          education_margin_horizontal: 0,
          experience_margin_horizontal: 0
        })}
        className="relative h-60 group p-0 overflow-hidden border-slate-200 hover:border-pink-600/40 transition-colors"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-50/50 to-rose-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="relative h-full w-full flex flex-col items-center">
          <div className="w-full p-2 text-xs font-medium text-pink-600 border-b border-slate-200 bg-slate-50/80">
            <LayoutTemplate className="w-3 h-3 inline-block mr-1" />
            Compact Layout
          </div>
          <div className="flex-1 w-full p-2 flex flex-col justify-start space-y-2">
            {/* Mock resume content - Compact */}
            <div>
              <div className="w-2/3 h-2 bg-slate-300 rounded mb-3" />
              <div className="flex space-x-1.5 mb-2">
                <div className="w-1/4 h-1 bg-slate-300 rounded" />
                <div className="w-1/4 h-1 bg-slate-300 rounded" />
                <div className="w-1/4 h-1 bg-slate-300 rounded" />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="w-1/4 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-10/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="w-1/4 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-10/12 h-1 bg-slate-300 rounded" />
                  <div className="w-9/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="w-1/4 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-9/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="w-1/4 h-1.5 bg-slate-300 rounded" />
                <div className="space-y-1">
                  <div className="w-full h-1 bg-slate-300 rounded" />
                  <div className="w-11/12 h-1 bg-slate-300 rounded" />
                  <div className="w-9/12 h-1 bg-slate-300 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Button>
    </div>
  );
}
