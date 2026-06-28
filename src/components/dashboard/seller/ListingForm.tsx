import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { ListingItem } from "@/types";
import { uploadImages } from "@/lib/cloudinary";
import { useToast } from "@/hooks/use-toast";
import {
  Sparkles,
  ImagePlus,
  Tag,
  BookOpen,
  DollarSign,
  CheckCircle2,
} from "lucide-react";

const schema = z.object({
  title: z.string().min(3, "Please add a title."),
  description: z.string().min(10, "Please add a bit more detail."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  category: z.string().min(1, "Select a category."),
  subcategory: z.string().optional().or(z.literal("")),
  condition: z.string().min(1, "Select a condition."),
  courseCode: z.string().optional().or(z.literal("")),
  courseTitle: z.string().optional().or(z.literal("")),
  relatedCourseCodes: z.array(z.string().min(1)).optional(),
  image: z.string().optional().or(z.literal("")),
  images: z.array(z.string().min(1)).optional(),
});

export type ListingFormValues = z.infer<typeof schema>;

interface ListingFormProps {
  listing?: ListingItem;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ListingFormValues) => void | Promise<void>;
}

export function ListingForm({
  listing,
  isOpen,
  onClose,
  onSubmit,
}: ListingFormProps) {
  const { toast } = useToast();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState<"details" | "context">(
    "details",
  );
  const form = useForm<ListingFormValues>({
    resolver: zodResolver(schema) as unknown as any,
    defaultValues: {
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      price: listing?.price ?? 0,
      category: listing?.category ?? "",
      subcategory: listing?.subcategory ?? "",
      condition: listing?.condition ?? "",
      courseCode: listing?.courseCode ?? "",
      courseTitle: listing?.courseTitle ?? "",
      relatedCourseCodes: listing?.relatedCourseCodes ?? [],
      image: listing?.images?.[0] ?? "",
      images: listing?.images ?? [],
    },
  });

  useEffect(() => {
    form.reset({
      title: listing?.title ?? "",
      description: listing?.description ?? "",
      price: listing?.price ?? 0,
      category: listing?.category ?? "",
      subcategory: listing?.subcategory ?? "",
      condition: listing?.condition ?? "",
      courseCode: listing?.courseCode ?? "",
      courseTitle: listing?.courseTitle ?? "",
      relatedCourseCodes: listing?.relatedCourseCodes ?? [],
      image: listing?.images?.[0] ?? "",
      images: listing?.images ?? [],
    });
    setSelectedFiles([]);
  }, [form, listing, isOpen]);

  const handleSubmit = async (data: ListingFormValues) => {
    const existingImages = [
      data.images?.filter(Boolean) ?? [],
      data.image ? [data.image] : [],
    ]
      .flat()
      .filter(Boolean);

    if (selectedFiles.length === 0 && existingImages.length === 0) {
      form.setError("image", {
        type: "manual",
        message: "Please add at least one image before publishing.",
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadedImages =
        selectedFiles.length > 0
          ? await uploadImages(selectedFiles)
          : existingImages;

      if (uploadedImages.length === 0) {
        throw new Error("Please add at least one image before publishing.");
      }

      await Promise.resolve(
        onSubmit({
          ...data,
          image: uploadedImages[0],
          images: uploadedImages,
        }),
      );
      form.reset();
      setSelectedFiles([]);
      onClose();
    } catch (error) {
      const description =
        error instanceof Error ? error.message : "Image upload failed.";
      toast({ title: "Unable to publish listing", description });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-180">
        <DialogHeader className="border-b border-border/70 bg-linear-to-br from-primary/10 via-background to-background px-6 py-6 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <Sparkles className="h-4 w-4" />
                {listing ? "Edit your listing" : "List something new"}
              </div>
              <DialogTitle className="text-2xl font-semibold tracking-tight">
                {listing ? "Update your listing" : "Create a polished listing"}
              </DialogTitle>
              <DialogDescription className="max-w-2xl text-sm text-muted-foreground">
                Share the essentials clearly so buyers and tutors can understand
                what you’re offering at a glance.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-wrap gap-2 px-6 pt-5 sm:px-8">
          {[
            { id: "details", label: "Item details", icon: Tag },
            { id: "context", label: "Course & media", icon: BookOpen },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPreviewMode(id as "details" | "context")}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-all ${
                previewMode === id
                  ? "border-primary/30 bg-primary/10 text-primary"
                  : "border-border/70 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-5 px-6 py-6 sm:px-8"
          >
            <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm">
              {previewMode === "details" ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are you listing?</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Intro Physics Textbook"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tell buyers why it’s worth it</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            className="min-h-28 resize-none"
                            placeholder="Add key details such as edition, condition, pickup options, and what’s included."
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="rounded-xl border border-dashed border-primary/20 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2 text-primary">
                        <ImagePlus className="h-4 w-4" />
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            Add item photos
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Upload one or several images so buyers can see the
                            item clearly.
                          </p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-primary/30 bg-background px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10">
                          <ImagePlus className="h-4 w-4" />
                          Choose images
                          <Input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(event) => {
                              const nextFiles = Array.from(
                                event.target.files ?? [],
                              );
                              setSelectedFiles(nextFiles);
                              if (nextFiles.length > 0) {
                                form.clearErrors("image");
                              }
                            }}
                          />
                        </label>
                        {selectedFiles.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {selectedFiles.map((file) => (
                              <span
                                key={`${file.name}-${file.size}`}
                                className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                              >
                                {file.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" />
                            Price
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={field.value}
                              onChange={(e) =>
                                field.onChange(e.target.valueAsNumber)
                              }
                              placeholder="0"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Books">Books</SelectItem>
                              <SelectItem value="Electronics">
                                Electronics
                              </SelectItem>
                              <SelectItem value="Furniture">
                                Furniture
                              </SelectItem>
                              <SelectItem value="Clothing">Clothing</SelectItem>
                              <SelectItem value="Sports">Sports</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="condition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Condition</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select condition" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="New">New</SelectItem>
                            <SelectItem value="Like New">Like New</SelectItem>
                            <SelectItem value="Good">Good</SelectItem>
                            <SelectItem value="Fair">Fair</SelectItem>
                            <SelectItem value="Poor">Poor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                    Course fields are optional for general marketplace items.
                    Leave them blank unless the item is tied to a class.
                  </div>

                  <FormField
                    control={form.control}
                    name="subcategory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subcategory</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="e.g. Textbooks, Gadgets"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Course code (optional)
                        </FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="e.g. MATH101" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="courseTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Course title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Optional course name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="relatedCourseCodes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Related course codes (optional)</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Optional. One code per line."
                            rows={3}
                            onChange={(event) =>
                              field.onChange(
                                event.target.value
                                  .split(/\r?\n/)
                                  .map((value) => value.trim())
                                  .filter(Boolean),
                              )
                            }
                            value={field.value?.join("\n") ?? ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Listings with clearer details get more attention.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={isUploading}
                  disabled={isUploading}
                >
                  {isUploading
                    ? "Saving..."
                    : listing
                      ? "Update listing"
                      : "Publish listing"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
