import { ListingItem } from "@/types";
import { formatCurrency } from "@/utils/formatCurrency";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2 } from "lucide-react";
import { resolveListingImageUrl } from "@/utils/listingImage";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ListingTableProps {
  listings: ListingItem[];
  onEdit: (listing: ListingItem) => void;
  onDelete: (id: string) => void;
}

export function ListingTable({
  listings,
  onEdit,
  onDelete,
}: ListingTableProps) {
  if (listings.length === 0) {
    return (
      <div className="surface-card border-dashed p-10 text-center text-muted-foreground">
        <p>You don't have any active listings yet.</p>
      </div>
    );
  }

  return (
    <div className="surface-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {listings.map((listing) => (
            <TableRow
              key={listing.id}
              data-testid={`row-listing-${listing.id}`}
            >
              <TableCell>
                <div className="w-12 h-12 rounded overflow-hidden">
                  <img
                    src={resolveListingImageUrl({
                      imageUrl: listing.images[0],
                      title: listing.title,
                      category: listing.category,
                    })}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </TableCell>
              <TableCell className="font-medium">{listing.title}</TableCell>
              <TableCell>{formatCurrency(listing.price)}</TableCell>
              <TableCell>
                <Badge variant="outline">{listing.category}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={listing.isAvailable ? "default" : "secondary"}>
                  {listing.isAvailable ? "Active" : "Sold"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="space-y-0.5 text-sm">
                  <p className="font-medium">
                    {(listing.interestedCount ?? 0).toLocaleString()} interested
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(
                      listing.savesCount ??
                      listing.interestedCount ??
                      0
                    ).toLocaleString()}{" "}
                    saves
                    {listing.interestedUsers?.length
                      ? `, ${listing.interestedUsers.length.toLocaleString()} users`
                      : ""}
                  </p>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(listing)}
                    data-testid={`btn-edit-${listing.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        data-testid={`btn-delete-${listing.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Listing?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently
                          delete your listing for "{listing.title}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDelete(listing.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
