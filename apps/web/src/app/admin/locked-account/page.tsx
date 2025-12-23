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
import { Unlock, Loader2, Clock, UserX, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from "lucide-react";
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

export default function LockedAccountPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchUsers();
    
    // Refresh users every 3 seconds to check for expired bans
    const interval = setInterval(fetchUsers, 3000);
    
    // Also unlock expired bans every 10 minutes (same as worker interval)
    const unlockInterval = setInterval(async () => {
      try {
        const response = await fetch("/api/admin/unlock-expired-bans", {
          method: "POST",
        });
        if (response.ok) {
          const data = await response.json();
          if (data.unlockedCount > 0) {
            console.log(`Auto-unlocked ${data.unlockedCount} expired ban(s)`);
            // Refresh users list to reflect changes
            fetchUsers();
          }
        }
      } catch (error) {
        console.error("Error auto-unlocking expired bans:", error);
      }
    }, 10 * 60 * 1000); // 10 minutes
    
    return () => {
      clearInterval(interval);
      clearInterval(unlockInterval);
    };
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await response.json();
      // Filter to show only banned users
      const bannedUsers = data.users.filter((user: User) => user.banned === true);
      setUsers(bannedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
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

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredAndSortedUsers.slice(startIndex, endIndex);

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
      return <ArrowUpDown className="h-4 w-4 text-slate-400/50" />;
    }
    return sortDirection === 'asc' ? 
      <ArrowUp className="h-4 w-4 text-slate-300" /> : 
      <ArrowDown className="h-4 w-4 text-slate-300" />;
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
          banReason: null,
          banExpires: null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user status");
      }

      const data = await response.json();
      
      // Update local state - remove user from list if unlocked
      setUsers(prevUsers =>
        prevUsers.filter(user => user.id !== userId)
      );

      toast.success(data.message);
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">Locked Accounts</h1>
          <p className="text-slate-400">
            Manage and review locked user accounts.
          </p>
        </div>

        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <UserX className="h-5 w-5 text-yellow-400" />
              Locked User Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
              <span className="ml-2 text-slate-300">Loading locked users...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-yellow-400 via-yellow-300 to-violet-400 bg-clip-text text-transparent">Locked Accounts</h1>
        <p className="text-slate-400">
          Manage and review locked user accounts.
        </p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserX className="h-5 w-5 text-yellow-400" />
            Locked User Accounts ({filteredAndSortedUsers.length} of {users.length})
            {totalPages > 1 && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                (Page {currentPage} of {totalPages})
              </span>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-violet-400/50"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredAndSortedUsers.length === 0 ? (
            <div className="text-center py-8">
              <UserX className="h-12 w-12 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-400">
                {searchQuery.trim() ? "No locked accounts match your search." : "No locked accounts found."}
              </p>
            </div>
          ) : (
            <div className="rounded-md border border-slate-700/50">
              <Table className="table-fixed w-full">
                <TableHeader>
                  <TableRow className="border-slate-700/50">
                    <TableHead className="w-[200px] text-slate-300">Name</TableHead>
                    <TableHead className="w-[200px] text-slate-300">Email</TableHead>
                    <TableHead 
                      className="w-[120px] cursor-pointer hover:bg-slate-700/30 transition-colors text-slate-300"
                      onClick={() => handleSort('role')}
                    >
                      <div className="flex items-center gap-1">
                        Role
                        {getSortIcon('role')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] text-slate-300">Status</TableHead>
                    <TableHead className="w-[200px] text-slate-300">Ban Details</TableHead>
                    <TableHead className="w-[130px] text-slate-300">Email Verified</TableHead>
                    <TableHead 
                      className="w-[120px] cursor-pointer hover:bg-slate-700/30 transition-colors text-slate-300"
                      onClick={() => handleSort('createdAt')}
                    >
                      <div className="flex items-center gap-1">
                        Created
                        {getSortIcon('createdAt')}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] text-right text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedUsers.map((user) => {
                    const statusInfo = getStatusInfo(user);
                    return (
                      <TableRow key={user.id} className="border-slate-700/50 hover:bg-slate-700/20">
                        <TableCell className="font-medium w-[200px] min-w-0 text-slate-200">
                          <div className="truncate" title={user.name}>
                            {user.name}
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] min-w-0 text-slate-300">
                          <div className="truncate" title={user.email}>
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px]">
                          <div className="truncate">
                            <Badge variant={getRoleBadgeVariant(user.role)} className="truncate max-w-full">
                              <span className="truncate block" title={user.role}>
                                {user.role}
                              </span>
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="w-[150px] min-w-0">
                          <div className="truncate">
                            <Badge variant={statusInfo.variant} className="truncate max-w-full">
                              <span className="truncate block" title={statusInfo.status}>
                                {statusInfo.status}
                              </span>
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="w-[200px] min-w-0">
                          {user.banReason && (
                            <div className="min-w-0">
                              <div className="text-sm text-slate-400 truncate" title={user.banReason}>
                                {user.banReason}
                              </div>
                              {user.banExpires && (
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 min-w-0">
                                  <Clock className="h-3 w-3 flex-shrink-0 text-yellow-400" />
                                  <span className="truncate min-w-0" title={`Expires: ${formatDateTime(user.banExpires.toString())}`}>
                                    Expires: {formatDateTime(user.banExpires.toString())}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="w-[130px]">
                          <Badge variant={user.emailVerified ? "default" : "secondary"}>
                            {user.emailVerified ? "Verified" : "Unverified"}
                          </Badge>
                        </TableCell>
                        <TableCell className="w-[120px] text-slate-300">
                          <div className="truncate" title={formatDate(user.createdAt)}>
                            {formatDate(user.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell className="w-[120px] text-right">
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
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination - Always show when there are users */}
          {filteredAndSortedUsers.length > 0 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700/50">
              <div className="text-sm text-slate-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedUsers.length)} of {filteredAndSortedUsers.length} user{filteredAndSortedUsers.length !== 1 ? 's' : ''}
              </div>
              {totalPages > 1 ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="border-slate-600 bg-slate-700/50 text-white hover:bg-violet-500/20 hover:border-violet-400/50 hover:text-violet-300 disabled:bg-slate-800/30 disabled:text-slate-500"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm font-medium px-3 text-slate-300">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="border-slate-600 bg-slate-700/50 text-white hover:bg-violet-500/20 hover:border-violet-400/50 hover:text-violet-300 disabled:bg-slate-800/30 disabled:text-slate-500"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm font-medium px-3 text-slate-300">
                  Page 1 of 1
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 