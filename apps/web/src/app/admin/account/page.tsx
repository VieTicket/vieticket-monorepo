"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Lock, Unlock, Loader2, Clock, Users, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean | null;
  banReason: string | null;
  banExpires: Date | null;
  createdAt: string;
  updatedAt: string;
}

type SortField = 'role' | 'createdAt' | null;
type SortDirection = 'asc' | 'desc';

export default function AccountPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banExpires, setBanExpires] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    fetchUsers();
    
    // Refresh users every 5 minutes to check for expired bans
    const interval = setInterval(fetchUsers, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      setUsers(data.users);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleLockClick = (user: User) => {
    setSelectedUser(user);
    setBanReason(user.banReason || "");
    setBanExpires(user.banExpires ? new Date(user.banExpires).toISOString().slice(0, 16) : "");
    setDialogOpen(true);
  };

  const handleLockToggle = async (userId: string, currentBanned: boolean) => {
    setUpdatingUsers(prev => new Set(prev).add(userId));
    
    try {
      const response = await fetch(`/api/admin/users/${userId}/lock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          banned: !currentBanned,
          banReason: !currentBanned ? banReason || "Account locked by administrator" : null,
          banExpires: !currentBanned ? banExpires || null : null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      const data = await response.json();
      
      // Update local state
      setUsers(prevUsers =>
        prevUsers.map(user =>
          user.id === userId
            ? {
                ...user,
                banned: !currentBanned,
                banReason: !currentBanned ? banReason || "Account locked by administrator" : null,
                banExpires: !currentBanned ? banExpires ? new Date(banExpires) : null : null,
              }
            : user
        )
      );

      toast.success(data.message);
      setDialogOpen(false);
      setSelectedUser(null);
      setBanReason("");
      setBanExpires("");
    } catch (error) {
      console.error("Error updating user status:", error);
      toast.error("Failed to update user status");
    } finally {
      setUpdatingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "organizer":
        return "default";
      case "customer":
        return "secondary";
      default:
        return "outline";
    }
  };

  const getStatusInfo = (user: User) => {
    if (!user.banned) {
      return { status: "Active", variant: "default" as const };
    }
    
    if (user.banExpires) {
      const now = new Date();
      const expiresAt = new Date(user.banExpires);
      
      if (expiresAt <= now) {
        return { status: "Expired", variant: "secondary" as const };
      }
      
      return { 
        status: `Locked (Expires: ${formatDateTime(user.banExpires.toString())})`, 
        variant: "destructive" as const 
      };
    }
    
    return { status: "Locked (Permanent)", variant: "destructive" as const };
  };

  // Filter and sort users based on search query and sort settings
  const filteredAndSortedUsers = useMemo(() => {
    let filtered = users;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = users.filter(user => 
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    if (sortField) {
      filtered = [...filtered].sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;
        
        if (sortField === 'role') {
          aValue = a.role.toLowerCase();
          bValue = b.role.toLowerCase();
        } else if (sortField === 'createdAt') {
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
        } else {
          return 0;
        }
        
        if (aValue < bValue) {
          return sortDirection === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortDirection === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [users, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field with ascending direction
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
          <p className="text-muted-foreground">
            Manage user accounts and permissions.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading users...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Account Management</h1>
        <p className="text-muted-foreground">
          Manage user accounts and permissions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Accounts ({filteredAndSortedUsers.length} of {users.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('role')}
                  >
                    <div className="flex items-center gap-1">
                      Role
                      {getSortIcon('role')}
                    </div>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ban Details</TableHead>
                  <TableHead>Email Verified</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedUsers.map((user) => {
                  const statusInfo = getStatusInfo(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned && user.banReason && (
                          <div className="max-w-xs">
                            <div className="text-sm text-muted-foreground">
                              {user.banReason}
                            </div>
                            {user.banExpires && (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3" />
                                Expires: {formatDateTime(user.banExpires.toString())}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.emailVerified ? "default" : "secondary"}>
                          {user.emailVerified ? "Verified" : "Unverified"}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(user.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        {user.banned ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleLockToggle(user.id, !!user.banned)}
                            disabled={updatingUsers.has(user.id)}
                          >
                            {updatingUsers.has(user.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Unlock className="h-4 w-4 mr-1" />
                                Unlock
                              </>
                            )}
                          </Button>
                        ) : (
                          <Dialog open={dialogOpen && selectedUser?.id === user.id} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleLockClick(user)}
                              >
                                <Lock className="h-4 w-4 mr-1" />
                                Lock
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Lock User Account</DialogTitle>
                                <DialogDescription>
                                  Lock the account for user: {selectedUser?.name} ({selectedUser?.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                  <Label htmlFor="banReason">Ban Reason</Label>
                                  <Input
                                    id="banReason"
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    placeholder="Enter reason for locking the account"
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor="banExpires">Ban Expires (Optional)</Label>
                                  <Input
                                    id="banExpires"
                                    type="datetime-local"
                                    value={banExpires}
                                    onChange={(e) => setBanExpires(e.target.value)}
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setDialogOpen(false);
                                    setSelectedUser(null);
                                    setBanReason("");
                                    setBanExpires("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => selectedUser && handleLockToggle(selectedUser.id, !!selectedUser.banned)}
                                  disabled={updatingUsers.has(selectedUser?.id || "")}
                                >
                                  {updatingUsers.has(selectedUser?.id || "") ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Lock className="h-4 w-4 mr-1" />
                                      Lock Account
                                    </>
                                  )}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 