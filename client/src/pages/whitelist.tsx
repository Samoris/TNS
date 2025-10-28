import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, User } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface WhitelistEntry {
  id: string;
  address: string;
  allowedMints: number;
  usedMints: number;
  isActive: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function WhitelistManagement() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<WhitelistEntry | null>(null);

  // Form states
  const [newAddress, setNewAddress] = useState("");
  const [newAllowedMints, setNewAllowedMints] = useState("5");
  const [newNote, setNewNote] = useState("");

  // Fetch all whitelist entries
  const { data: whitelistEntries, isLoading } = useQuery<WhitelistEntry[]>({
    queryKey: ["/api/whitelist"],
  });

  // Add to whitelist mutation
  const addMutation = useMutation({
    mutationFn: async (data: { address: string; allowedMints: number; note: string }) => {
      return await apiRequest("/api/whitelist", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist"] });
      toast({
        title: "Success",
        description: "Address added to whitelist",
      });
      setIsAddDialogOpen(false);
      setNewAddress("");
      setNewAllowedMints("5");
      setNewNote("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add address",
        variant: "destructive",
      });
    },
  });

  // Update whitelist entry mutation
  const updateMutation = useMutation({
    mutationFn: async ({
      address,
      updates,
    }: {
      address: string;
      updates: { allowedMints?: number; isActive?: boolean; note?: string };
    }) => {
      return await apiRequest(`/api/whitelist/${address}`, {
        method: "PUT",
        body: JSON.stringify(updates),
        headers: { "Content-Type": "application/json" },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist"] });
      toast({
        title: "Success",
        description: "Whitelist entry updated",
      });
      setIsEditDialogOpen(false);
      setSelectedEntry(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update entry",
        variant: "destructive",
      });
    },
  });

  // Delete whitelist entry mutation
  const deleteMutation = useMutation({
    mutationFn: async (address: string) => {
      return await apiRequest(`/api/whitelist/${address}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/whitelist"] });
      toast({
        title: "Success",
        description: "Address removed from whitelist",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove address",
        variant: "destructive",
      });
    },
  });

  const handleAddToWhitelist = () => {
    if (!newAddress || !/^0x[a-fA-F0-9]{40}$/.test(newAddress)) {
      toast({
        title: "Error",
        description: "Please enter a valid Ethereum address",
        variant: "destructive",
      });
      return;
    }

    const allowedMints = parseInt(newAllowedMints);
    if (isNaN(allowedMints) || allowedMints < 1) {
      toast({
        title: "Error",
        description: "Allowed mints must be at least 1",
        variant: "destructive",
      });
      return;
    }

    addMutation.mutate({
      address: newAddress,
      allowedMints,
      note: newNote,
    });
  };

  const handleEdit = (entry: WhitelistEntry) => {
    setSelectedEntry(entry);
    setIsEditDialogOpen(true);
  };

  const handleUpdateEntry = () => {
    if (!selectedEntry) return;

    updateMutation.mutate({
      address: selectedEntry.address,
      updates: {
        allowedMints: selectedEntry.allowedMints,
        isActive: selectedEntry.isActive,
        note: selectedEntry.note || undefined,
      },
    });
  };

  const handleToggleActive = (entry: WhitelistEntry) => {
    updateMutation.mutate({
      address: entry.address,
      updates: { isActive: !entry.isActive },
    });
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
              Whitelist Management
            </h1>
            <p className="text-muted-foreground">
              Manage whitelisted addresses for free domain minting (5+ characters only)
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-whitelist" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Address
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Address to Whitelist</DialogTitle>
                <DialogDescription>
                  Whitelisted users can register 5+ character domains for free
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="address">Ethereum Address</Label>
                  <Input
                    id="address"
                    data-testid="input-whitelist-address"
                    placeholder="0x..."
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="allowedMints">Allowed Free Mints</Label>
                  <Input
                    id="allowedMints"
                    data-testid="input-allowed-mints"
                    type="number"
                    min="1"
                    value={newAllowedMints}
                    onChange={(e) => setNewAllowedMints(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="note">Note (Optional)</Label>
                  <Textarea
                    id="note"
                    data-testid="input-whitelist-note"
                    placeholder="e.g., Early supporter, Team member"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  data-testid="button-cancel-add"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToWhitelist}
                  disabled={addMutation.isPending}
                  data-testid="button-confirm-add"
                >
                  {addMutation.isPending ? "Adding..." : "Add to Whitelist"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Whitelisted</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-whitelisted">
                {whitelistEntries?.length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Active</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-active-whitelisted">
                {whitelistEntries?.filter((e) => e.isActive).length || 0}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Free Mints Available</CardDescription>
              <CardTitle className="text-3xl" data-testid="text-total-free-mints">
                {whitelistEntries?.reduce((sum, e) => sum + (e.allowedMints - e.usedMints), 0) || 0}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Whitelist Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Whitelisted Addresses
            </CardTitle>
            <CardDescription>
              Note: Whitelist applies only to 5+ character domains (30 TRUST/year normally)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading whitelist...</div>
            ) : !whitelistEntries || whitelistEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No whitelisted addresses yet. Add one to get started!
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Address</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Free Mints</TableHead>
                      <TableHead>Used</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Note</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {whitelistEntries.map((entry) => (
                      <TableRow key={entry.id} data-testid={`row-whitelist-${entry.address}`}>
                        <TableCell className="font-mono" data-testid={`text-address-${entry.address}`}>
                          {formatAddress(entry.address)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.isActive ? "default" : "secondary"}
                            data-testid={`badge-status-${entry.address}`}
                          >
                            {entry.isActive ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </>
                            ) : (
                              <>
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell data-testid={`text-allowed-${entry.address}`}>
                          {entry.allowedMints}
                        </TableCell>
                        <TableCell data-testid={`text-used-${entry.address}`}>
                          {entry.usedMints}
                        </TableCell>
                        <TableCell data-testid={`text-remaining-${entry.address}`}>
                          <span className="font-semibold text-primary">
                            {entry.allowedMints - entry.usedMints}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`text-note-${entry.address}`}>
                          {entry.note || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(entry)}
                              data-testid={`button-edit-${entry.address}`}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleToggleActive(entry)}
                              data-testid={`button-toggle-${entry.address}`}
                            >
                              {entry.isActive ? <XCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => deleteMutation.mutate(entry.address)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${entry.address}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Whitelist Entry</DialogTitle>
              <DialogDescription>Update allowance and note for this address</DialogDescription>
            </DialogHeader>
            {selectedEntry && (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={selectedEntry.address} disabled className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-allowedMints">Allowed Free Mints</Label>
                  <Input
                    id="edit-allowedMints"
                    type="number"
                    min="0"
                    value={selectedEntry.allowedMints}
                    onChange={(e) =>
                      setSelectedEntry({
                        ...selectedEntry,
                        allowedMints: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-note">Note</Label>
                  <Textarea
                    id="edit-note"
                    value={selectedEntry.note || ""}
                    onChange={(e) =>
                      setSelectedEntry({
                        ...selectedEntry,
                        note: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Used Mints: {selectedEntry.usedMints}</Label>
                  <Label className="text-muted-foreground">
                    Remaining: {selectedEntry.allowedMints - selectedEntry.usedMints}
                  </Label>
                </div>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setSelectedEntry(null);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateEntry} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Updating..." : "Update Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Info Card */}
        <Card className="mt-8 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="text-blue-700 dark:text-blue-400">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              <strong>✓ 5+ character domains:</strong> Whitelisted users get FREE registration (normally 30 TRUST/year)
            </p>
            <p>
              <strong>✗ 3-4 character domains:</strong> Always require payment (100 TRUST and 70 TRUST respectively)
            </p>
            <p>
              <strong>Note:</strong> Premium short domains maintain their value and are excluded from whitelist benefits
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
