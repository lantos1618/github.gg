'use client';

import { Palette } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { CardWithHeader } from '@/components/common';
import { TextButton } from '@/components/ui/text-button';
import { TextLink } from '@/components/ui/text-link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ProfileCustomizationCardProps {
  isPaid: boolean;
  localStyles: Record<string, string | boolean | undefined>;
  onStyleChange: (key: string, value: string | boolean) => void;
  onReset: () => void;
}

export function ProfileCustomizationCard({
  isPaid,
  localStyles,
  onStyleChange,
  onReset,
}: ProfileCustomizationCardProps) {
  return (
    <CardWithHeader
      title="Profile"
      description="Custom colors and effects."
      icon={Palette}
      action={isPaid ? (
        <TextButton type="button" onClick={onReset}>
          Reset
        </TextButton>
      ) : undefined}
    >
      {isPaid ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Primary Color</Label>
              <div className="flex gap-2 items-center">
                <div
                  className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                  style={{ backgroundColor: (localStyles.primaryColor as string) || '#000000' }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="w-full h-full" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker
                        color={(localStyles.primaryColor as string) || '#000000'}
                        onChange={(color) => onStyleChange('primaryColor', color)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  value={(localStyles.primaryColor as string) || ''}
                  placeholder="#000000"
                  onChange={(e) => onStyleChange('primaryColor', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Text Color</Label>
               <div className="flex gap-2 items-center">
                <div
                  className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                  style={{ backgroundColor: (localStyles.textColor as string) || '#000000' }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="w-full h-full" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker
                        color={(localStyles.textColor as string) || '#000000'}
                        onChange={(color) => onStyleChange('textColor', color)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  value={(localStyles.textColor as string) || ''}
                  placeholder="#000000"
                  onChange={(e) => onStyleChange('textColor', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Background Color</Label>
               <div className="flex gap-2 items-center">
                <div
                  className="w-10 h-10 rounded border cursor-pointer shadow-sm"
                  style={{ backgroundColor: (localStyles.backgroundColor as string) || '#ffffff' }}
                >
                  <Popover>
                    <PopoverTrigger asChild>
                      <div className="w-full h-full" />
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-3">
                      <HexColorPicker
                        color={(localStyles.backgroundColor as string) || '#ffffff'}
                        onChange={(color) => onStyleChange('backgroundColor', color)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <Input
                  value={(localStyles.backgroundColor as string) || ''}
                  placeholder="#ffffff"
                  onChange={(e) => onStyleChange('backgroundColor', e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sparkle Emoji</Label>
              <Input
                value={(localStyles.emoji as string) || ''}
                placeholder="✨"
                maxLength={2}
                onChange={(e) => onStyleChange('emoji', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Emoji to use for sparkle effects</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="sparkles-enabled">Enable Sparkle Effects</Label>
              <p className="text-sm text-muted-foreground">
                Show floating animations on your profile
              </p>
            </div>
            <Switch
              id="sparkles-enabled"
              checked={(localStyles.sparkles as boolean) ?? false}
              onCheckedChange={(checked) => onStyleChange('sparkles', checked)}
            />
          </div>
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-sm text-[#999] mb-3">Pro feature</p>
          <TextLink href="/pricing" active>
            Upgrade
          </TextLink>
        </div>
      )}
    </CardWithHeader>
  );
}
