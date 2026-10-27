import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { DocumentSettings } from "@/lib/types";
import { NumberInput } from "./document-number-input";

type DocumentSection = 'skills' | 'experience' | 'projects' | 'education';

export interface SectionSettingsProps {
  title: string;
  section: DocumentSection;
  documentSettings: DocumentSettings;
  onSettingsChange: (settings: DocumentSettings) => void;
}

export function SectionSettings({ title, section, documentSettings, onSettingsChange }: SectionSettingsProps) {
  return (
    <div className="space-y-4 bg-slate-50/50 rounded-lg border border-slate-200/50">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Space Above {title} Section</Label>
          <div className="flex items-center">
            <NumberInput
              value={documentSettings?.[`${section}_margin_top`] ?? 2}
              min={0}
              max={48}
              step={1}
              onChange={(value) => 
                onSettingsChange({
                  ...documentSettings,
                  [`${section}_margin_top`]: value
                })
              }
            />
            <span className="text-xs text-muted-foreground/60 ml-1">pt</span>
          </div>
        </div>
        <Slider
          value={[Number(documentSettings?.[`${section}_margin_top`] ?? 2)]}
          min={0}
          max={48}
          step={1}
          onValueChange={([value]) => 
            onSettingsChange({
              ...documentSettings,
              [`${section}_margin_top`]: value
            })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Space Below {title} Section</Label>
          <div className="flex items-center">
            <NumberInput
              value={documentSettings?.[`${section}_margin_bottom`] ?? 2}
              min={0}
              max={48}
              step={1}
              onChange={(value) => 
                onSettingsChange({
                  ...documentSettings,
                  [`${section}_margin_bottom`]: value
                })
              }
            />
            <span className="text-xs text-muted-foreground/60 ml-1">pt</span>
          </div>
        </div>
        <Slider
          value={[Number(documentSettings?.[`${section}_margin_bottom`] ?? 2)]}
          min={0}
          max={48}
          step={1}
          onValueChange={([value]) => 
            onSettingsChange({
              ...documentSettings,
              [`${section}_margin_bottom`]: value
            })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Horizontal Margins</Label>
          <div className="flex items-center">
            <NumberInput
              value={documentSettings?.[`${section}_margin_horizontal`] ?? 0}
              min={0}
              max={72}
              step={2}
              onChange={(value) => 
                onSettingsChange({
                  ...documentSettings,
                  [`${section}_margin_horizontal`]: value
                })
              }
            />
            <span className="text-xs text-muted-foreground/60 ml-1">pt</span>
          </div>
        </div>
        <Slider
          value={[Number(documentSettings?.[`${section}_margin_horizontal`] ?? 0)]}
          min={0}
          max={72}
          step={2}
          onValueChange={([value]) => 
            onSettingsChange({
              ...documentSettings,
              [`${section}_margin_horizontal`]: value
            })
          }
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-muted-foreground">Space Between Items</Label>
          <div className="flex items-center">
            <NumberInput
              value={documentSettings?.[`${section}_item_spacing`] ?? 4}
              min={0}
              max={16}
              step={0.5}
              onChange={(value) => 
                onSettingsChange({
                  ...documentSettings,
                  [`${section}_item_spacing`]: value
                })
              }
            />
            <span className="text-xs text-muted-foreground/60 ml-1">pt</span>
          </div>
        </div>
        <Slider
          value={[Number(documentSettings?.[`${section}_item_spacing`] ?? 4)]}
          min={0}
          max={16}
          step={0.5}
          onValueChange={([value]) => 
            onSettingsChange({
              ...documentSettings,
              [`${section}_item_spacing`]: value
            })
          }
        />
      </div>
    </div>
  );
}
