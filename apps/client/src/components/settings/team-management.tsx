import { useState, useEffect } from "react";
import { TeamsApi, type Team } from "@/lib/teams-api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TEAM_COLORS, TEAM_ICONS } from "@/components/create-team-dialog";


interface EditTeamDialogProps {
  team: Team | null;
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

function EditTeamDialog({ team, open, onClose, onSave }: EditTeamDialogProps) {
  const [name, setName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(TEAM_COLORS[0].value);
  const [selectedIcon, setSelectedIcon] = useState<string>(TEAM_ICONS[0].name);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (team) {
      setName(team.name);
      setSelectedColor(team.color || TEAM_COLORS[0].value);
      setSelectedIcon(team.icon || TEAM_ICONS[0].name);
    } else {
      setName("");
      setSelectedColor(TEAM_COLORS[0].value);
      setSelectedIcon(TEAM_ICONS[0].name);
    }
  }, [team]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }

    setIsLoading(true);
    try {
      if (team) {
        // Update existing team
        await TeamsApi.updateTeam(team.id, {
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });
        toast.success("Team updated successfully");
      } else {
        // Create new team
        await TeamsApi.createTeam({
          name: name.trim(),
          color: selectedColor,
          icon: selectedIcon,
        });
        toast.success("Team created successfully");
      }
      onSave();
      onClose();
    } catch (error) {
      toast.error(team ? "Failed to update team" : "Failed to create team");
    } finally {
      setIsLoading(false);
    }
  };

  const SelectedIconComponent = TEAM_ICONS.find(
    (icon) => icon.name === selectedIcon
  )?.component || Users;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{team ? "Edit Team" : "Create Team"}</DialogTitle>
          <DialogDescription>
            {team
              ? "Update the team's name, color, and icon."
              : "Create a new team with a name, color, and icon."}
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
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Saving..." : team ? "Save Changes" : "Create Team"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const fetchTeams = async () => {
    setIsLoading(true);
    try {
      const fetchedTeams = await TeamsApi.getTeams();
      setTeams(fetchedTeams);
    } catch (error) {
      toast.error("Failed to load teams");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (team: Team) => {
    if (!confirm(`Are you sure you want to delete "${team.name}"?`)) {
      return;
    }

    try {
      await TeamsApi.deleteTeam(team.id);
      toast.success("Team deleted successfully");
      fetchTeams();
    } catch (error) {
      toast.error("Failed to delete team");
    }
  };

  const handleDialogClose = () => {
    setIsEditDialogOpen(false);
    setIsCreateDialogOpen(false);
    setEditingTeam(null);
  };

  const handleSave = () => {
    fetchTeams();
  };

  const getTeamIcon = (iconName?: string) => {
    const icon = TEAM_ICONS.find((i) => i.name === iconName);
    return icon?.component || Users;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-muted-foreground">Loading teams...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Team Management</h2>
          <p className="text-muted-foreground">
            Manage your teams, customize their appearance, and organize your workspace.
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teams.map((team) => {
          const IconComponent = getTeamIcon(team.icon);
          const teamColor = team.color || TEAM_COLORS[0].value;

          return (
            <Card key={team.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex items-center justify-center h-10 w-10 rounded-md shrink-0"
                      style={{ backgroundColor: teamColor }}
                    >
                      <IconComponent className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{team.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {team.memberCount || 0} member{team.memberCount !== 1 ? "s" : ""}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(team)}
                    className="flex-1"
                  >
                    <Pencil className="mr-2 h-3 w-3" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(team)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {teams.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">
              No teams yet. Create your first team to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <EditTeamDialog
        team={editingTeam}
        open={isEditDialogOpen}
        onClose={handleDialogClose}
        onSave={handleSave}
      />

      <EditTeamDialog
        team={null}
        open={isCreateDialogOpen}
        onClose={handleDialogClose}
        onSave={handleSave}
      />
    </div>
  );
}
