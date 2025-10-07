import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  Building,
  Rocket,
  Target,
  Zap,
  Star,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Predefined color palette (8 colors)
export const TEAM_COLORS = [
  { name: "Blue", value: "#3B82F6", bg: "bg-blue-500" },
  { name: "Purple", value: "#A855F7", bg: "bg-purple-500" },
  { name: "Pink", value: "#EC4899", bg: "bg-pink-500" },
  { name: "Green", value: "#10B981", bg: "bg-green-500" },
  { name: "Orange", value: "#F97316", bg: "bg-orange-500" },
  { name: "Red", value: "#EF4444", bg: "bg-red-500" },
  { name: "Teal", value: "#14B8A6", bg: "bg-teal-500" },
  { name: "Amber", value: "#F59E0B", bg: "bg-amber-500" },
] as const;

// Predefined icon set
export const TEAM_ICONS = [
  { name: "Users", component: Users },
  { name: "Briefcase", component: Briefcase },
  { name: "Building", component: Building },
  { name: "Rocket", component: Rocket },
  { name: "Target", component: Target },
  { name: "Zap", component: Zap },
  { name: "Star", component: Star },
  { name: "Heart", component: Heart },
] as const;

interface CreateTeamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateTeam: (data: { name: string; color: string; icon: string }) => Promise<void>;
  isCreating?: boolean;
}

export function CreateTeamDialog({
  open,
  onOpenChange,
  onCreateTeam,
  isCreating = false,
}: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(TEAM_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(TEAM_ICONS[0].name);

  const handleCreate = async () => {
    if (!name.trim()) {
      return;
    }

    await onCreateTeam({
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon,
    });

    // Reset form
    setName("");
    setSelectedColor(TEAM_COLORS[0].value);
    setSelectedIcon(TEAM_ICONS[0].name);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form when closing
    setName("");
    setSelectedColor(TEAM_COLORS[0].value);
    setSelectedIcon(TEAM_ICONS[0].name);
  };

  const SelectedIconComponent = TEAM_ICONS.find(
    (icon) => icon.name === selectedIcon
  )?.component || Users;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team with a custom name, color, and icon.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter team name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_ICONS.map((icon) => {
                const IconComponent = icon.component;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIcon(icon.name)}
                    className={cn(
                      "flex items-center justify-center p-3 rounded-md border-2 transition-all hover:bg-accent",
                      selectedIcon === icon.name
                        ? "border-primary bg-accent"
                        : "border-border"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selection */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {TEAM_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "flex items-center justify-center p-3 rounded-md border-2 transition-all",
                    selectedColor === color.value
                      ? "border-primary ring-2 ring-primary ring-offset-2"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <div className={cn("h-6 w-6 rounded-full", color.bg)} />
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview</Label>
            <div className="flex items-center gap-3 p-4 border rounded-md bg-accent/50">
              <div
                className="flex items-center justify-center h-10 w-10 rounded-md"
                style={{ backgroundColor: selectedColor }}
              >
                <SelectedIconComponent className="h-5 w-5 text-white" />
              </div>
              <span className="font-medium">{name || "Team Name"}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Creating..." : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
