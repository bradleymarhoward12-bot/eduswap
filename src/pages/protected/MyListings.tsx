import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  createListing,
  deleteListing,
  syncListingSellerName,
  subscribeToListings,
  updateListing,
} from "@/services/listings";
import { ListingTable } from "@/components/dashboard/seller/ListingTable";
import { ListingForm } from "@/components/dashboard/seller/ListingForm";
import { Button } from "@/components/ui/button";
import { Store, Plus, ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import type { ListingItem } from "@/types";
import type { ListingFormValues } from "@/components/dashboard/seller/ListingForm";
import { getUserFullName } from "@/services/firebase";

export default function MyListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingListing, setEditingListing] = useState<ListingItem | null>(
    null,
  );

  const totalSaves = listings.reduce(
    (sum, listing) =>
      sum + (listing.savesCount ?? listing.interestedCount ?? 0),
    0,
  );
  const totalInterestedUsers = listings.reduce((sum, listing) => {
    const next =
      listing.interestedUsers?.length ?? listing.interestedCount ?? 0;
    return sum + next;
  }, 0);

  useEffect(() => {
    if (!user) {
      setListings([]);
      return undefined;
    }

    return subscribeToListings(setListings, { sellerId: user.id });
  }, [user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fullName = getUserFullName(user);
    if (!fullName) {
      return;
    }

    void syncListingSellerName(user.id, fullName);
  }, [user]);

  const handleCreate = async (data: ListingFormValues) => {
    if (!user) return;

    await createListing({
      title: data.title,
      description: data.description?.trim() || undefined,
      price: data.price,
      category: data.category,
      subcategory: data.subcategory?.trim() || undefined,
      condition: data.condition,
      imageUrl: data.image ?? "",
      images: data.images,
      sellerId: user.id,
      sellerName: getUserFullName(user),
      sellerAvatar: user.avatar,
      courseCode: data.courseCode?.trim() || undefined,
      courseTitle: data.courseTitle?.trim() || undefined,
      relatedCourseCodes: data.relatedCourseCodes,
      isAvailable: true,
    });
    toast({ title: "Listing created", description: "Your item is now live." });
  };

  const handleUpdate = async (data: ListingFormValues) => {
    if (!editingListing) return;

    await updateListing(editingListing.id, {
      title: data.title,
      description: data.description?.trim() || undefined,
      price: data.price,
      category: data.category,
      subcategory: data.subcategory?.trim() || undefined,
      condition: data.condition,
      imageUrl: data.image ?? editingListing.images[0] ?? "",
      images: data.images,
      courseCode: data.courseCode?.trim() || undefined,
      courseTitle: data.courseTitle?.trim() || undefined,
      relatedCourseCodes: data.relatedCourseCodes,
    });
    toast({
      title: "Listing updated",
      description: "Changes saved successfully.",
    });
  };

  const handleDelete = async (id: string) => {
    await deleteListing(id);
    toast({ title: "Listing deleted" });
  };

  const openEdit = (listing: ListingItem) => {
    setEditingListing(listing);
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingListing(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="surface-card p-6 sm:p-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Store className="h-7 w-7 text-primary" />
              My Listings
            </h1>
            <p className="text-muted-foreground mt-1 text-sm max-w-2xl">
              Manage your marketplace inventory and keep your course materials
              polished for student buyers.
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="gap-2 shrink-0"
            data-testid="btn-add-listing"
          >
            <Plus className="h-4 w-4" /> Add New Listing
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="surface-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Total Listings
          </div>
          <div className="text-2xl font-bold mt-2">{listings.length}</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Active
          </div>
          <div className="text-2xl font-bold mt-2 text-primary">
            {listings.filter((listing) => listing.isAvailable).length}
          </div>
        </div>
        <div className="surface-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Total Saves
          </div>
          <div className="text-2xl font-bold mt-2">{totalSaves}</div>
        </div>
        <div className="surface-card p-4">
          <div className="text-sm font-medium text-muted-foreground">
            Interested Users
          </div>
          <div className="text-2xl font-bold mt-2">{totalInterestedUsers}</div>
        </div>
      </div>

      <ListingTable
        listings={listings}
        onEdit={openEdit}
        onDelete={handleDelete}
      />

      <ListingForm
        listing={editingListing ?? undefined}
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={editingListing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
