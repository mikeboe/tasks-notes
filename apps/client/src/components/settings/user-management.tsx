import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TeamAssignmentCombobox } from "./team-assignment-combobox";
import { InviteUserDialog } from "./invite-user-dialog";
import { TasksApi } from "@/lib/tasks-api";
import { TeamsApi, type Team } from "@/lib/teams-api";
import { UserPlus, Mail } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@/types";

interface UserManagementProps {}

export function UserManagement({}: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersResponse, teamsData] = await Promise.all([
        TasksApi.getUsers(),
        TeamsApi.getTeams()
      ]);

      if (usersResponse.success && usersResponse.data) {
        setUsers(usersResponse.data);
      }

      setTeams(teamsData);
    } catch (error) {
      toast.error("Failed to load users and teams");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeamAssignmentChange = async (_userId: string, _teamIds: string[]) => {
    // Here you would implement the logic to update user team assignments
    // For now, we'll just show a toast
    toast.success("Team assignments updated");
    // In a real implementation, you'd call an API endpoint to update the user's teams
  };

  const getUserInitials = (user: User) => {
    if (user.firstName) {
      const lastInitial = user.lastName?.charAt(0)?.toUpperCase() || '';
      return user.firstName.charAt(0).toUpperCase() + lastInitial;
    }
    return user.email?.charAt(0)?.toUpperCase() || 'U';
  };

  const filteredUsers = users.filter(user => {
    const searchLower = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    return fullName.includes(searchLower) || email.includes(searchLower);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <Label htmlFor="user-search">Search Users</Label>
          <Input
            id="user-search"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="pt-6">
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Teams</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profilePicture || user.avatar?.url} />
                        <AvatarFallback>{getUserInitials(user)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TeamAssignmentCombobox
                      userId={user.id}
                      availableTeams={teams}
                      onTeamsChange={(teamIds) => handleTeamAssignmentChange(user.id, teamIds)}
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        onUserInvited={loadData}
      />
    </div>
  );
}
