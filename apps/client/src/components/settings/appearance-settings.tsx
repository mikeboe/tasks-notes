import { Moon, Sun, Monitor } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTheme } from "@/components/theme-provider";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize the appearance of the app. Automatically switch between day and night themes.
        </p>
      </div>

      <div className="space-y-4">
        <Label>Theme</Label>
        <RadioGroup value={theme} onValueChange={setTheme}>
          <div className="flex items-center space-x-3 space-y-0">
            <RadioGroupItem value="light" id="light" />
            <Label htmlFor="light" className="flex items-center gap-2 font-normal cursor-pointer">
              <Sun className="h-4 w-4" />
              Light
            </Label>
          </div>
          <div className="flex items-center space-x-3 space-y-0">
            <RadioGroupItem value="dark" id="dark" />
            <Label htmlFor="dark" className="flex items-center gap-2 font-normal cursor-pointer">
              <Moon className="h-4 w-4" />
              Dark
            </Label>
          </div>
          <div className="flex items-center space-x-3 space-y-0">
            <RadioGroupItem value="system" id="system" />
            <Label htmlFor="system" className="flex items-center gap-2 font-normal cursor-pointer">
              <Monitor className="h-4 w-4" />
              System
            </Label>
          </div>
        </RadioGroup>
      </div>
    </div>
  );
}
