import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Button } from "@/components/ui/button";
import type { TutorCourse, TutorProfile } from "@/types";
import { Switch } from "@/components/ui/switch";
import { uploadImage } from "@/lib/cloudinary";
import { Badge } from "@/components/ui/badge";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { normalizeTutorCourse } from "@/utils/tutorCourses";

const schema = z.object({
  bio: z.string().min(1),
  hourlyRate: z.coerce.number().min(0),
  availability: z.string().min(1),
  isAvailable: z.boolean(),
  avatar: z.string().optional().or(z.literal("")),
});

export type TutorProfileFormValues = z.infer<typeof schema>;
export type TutorProfileFormSubmitValues = Omit<
  TutorProfileFormValues,
  "availability"
> & {
  courses: TutorCourse[];
  availability: string[];
};

interface TutorProfileFormProps {
  profile?: TutorProfile;
  onSubmit: (data: TutorProfileFormSubmitValues) => void | Promise<void>;
}

type CourseDraft = {
  code: string;
  title: string;
  grade: string;
};

const emptyCourseDraft: CourseDraft = {
  code: "",
  title: "",
  grade: "",
};

export function TutorProfileForm({ profile, onSubmit }: TutorProfileFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [courses, setCourses] = useState<TutorCourse[]>(profile?.courses ?? []);
  const [courseDraft, setCourseDraft] = useState<CourseDraft>(emptyCourseDraft);
  const [editingCourseIndex, setEditingCourseIndex] = useState<number | null>(
    null,
  );
  const [courseError, setCourseError] = useState("");

  const form = useForm<TutorProfileFormValues>({
    resolver: zodResolver(schema) as unknown as any,
    defaultValues: {
      bio: profile?.bio ?? "",
      hourlyRate: profile?.hourlyRate ?? 0,
      availability: profile?.availability?.join(", ") ?? "",
      isAvailable: profile?.isAvailable ?? false,
      avatar: profile?.avatar ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      bio: profile?.bio ?? "",
      hourlyRate: profile?.hourlyRate ?? 0,
      availability: profile?.availability?.join(", ") ?? "",
      isAvailable: profile?.isAvailable ?? false,
      avatar: profile?.avatar ?? "",
    });
    setCourses(profile?.courses ?? []);
    setCourseDraft(emptyCourseDraft);
    setEditingCourseIndex(null);
    setCourseError("");
    setSelectedFile(null);
  }, [form, profile]);

  const saveCourse = () => {
    const normalized = normalizeTutorCourse({
      code: courseDraft.code,
      title: courseDraft.title,
      grade: courseDraft.grade,
    });

    if (!normalized) {
      setCourseError("Course code and title are required.");
      return;
    }

    setCourseError("");
    setCourses((current) => {
      if (editingCourseIndex === null) {
        return [...current, normalized];
      }

      return current.map((course, index) =>
        index === editingCourseIndex ? normalized : course,
      );
    });
    setCourseDraft(emptyCourseDraft);
    setEditingCourseIndex(null);
  };

  const editCourse = (course: TutorCourse, index: number) => {
    setEditingCourseIndex(index);
    setCourseDraft({
      code: course.code,
      title: course.title,
      grade: course.grade ?? "",
    });
    setCourseError("");
  };

  const deleteCourse = (index: number) => {
    setCourses((current) =>
      current.filter((_, courseIndex) => courseIndex !== index),
    );
    if (editingCourseIndex === index) {
      setEditingCourseIndex(null);
      setCourseDraft(emptyCourseDraft);
    }
  };

  const handleSubmit = async (data: TutorProfileFormValues) => {
    if (courses.length === 0) {
      setCourseError("Add at least one course before saving.");
      return;
    }

    setIsUploading(true);
    try {
      const avatar = selectedFile
        ? await uploadImage(selectedFile)
        : (data.avatar ?? "");
      const formattedData: TutorProfileFormSubmitValues = {
        ...data,
        avatar,
        courses,
        availability: data.availability
          .split(",")
          .map((slot) => slot.trim())
          .filter(Boolean),
      };
      await Promise.resolve(onSubmit(formattedData));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 max-w-2xl"
      >
        <FormField
          control={form.control}
          name="isAvailable"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Profile Visibility</FormLabel>
                <div className="text-sm text-muted-foreground">
                  Allow students to find you in the tutor directory
                </div>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  data-testid="switch-tutor-visibility"
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Avatar Upload
          </label>
          <Input
            type="file"
            accept="image/*"
            onChange={(event) =>
              setSelectedFile(event.target.files?.[0] ?? null)
            }
          />
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bio & Qualifications</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Share your major, expertise, and tutoring style..."
                  className="min-h-[120px] resize-none"
                  {...field}
                  data-testid="input-tutor-bio"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-4 rounded-lg border p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-medium leading-none">Courses</p>
              <p className="text-sm text-muted-foreground">
                Add at least one course you can tutor.
              </p>
            </div>
            <Badge variant="secondary">{courses.length} added</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_120px_auto] gap-3">
            <Input
              placeholder="Course code"
              value={courseDraft.code}
              onChange={(event) =>
                setCourseDraft((current) => ({
                  ...current,
                  code: event.target.value,
                }))
              }
              data-testid="input-tutor-course-code"
            />
            <Input
              placeholder="Course title"
              value={courseDraft.title}
              onChange={(event) =>
                setCourseDraft((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              data-testid="input-tutor-course-title"
            />
            <Input
              placeholder="Grade"
              value={courseDraft.grade}
              onChange={(event) =>
                setCourseDraft((current) => ({
                  ...current,
                  grade: event.target.value,
                }))
              }
              data-testid="input-tutor-course-grade"
            />
            <Button type="button" onClick={saveCourse} className="gap-2">
              {editingCourseIndex === null ? (
                <Plus className="h-4 w-4" />
              ) : (
                <Pencil className="h-4 w-4" />
              )}
              {editingCourseIndex === null ? "Add" : "Update"}
            </Button>
          </div>

          {courseError && (
            <p className="text-sm text-destructive">{courseError}</p>
          )}

          <div className="space-y-3">
            {courses.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No courses added yet.
              </p>
            ) : (
              courses.map((course, index) => (
                <div
                  key={`${course.code}-${course.title}-${index}`}
                  className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{course.code}</Badge>
                      <p className="font-medium truncate">{course.title}</p>
                    </div>
                    {course.grade && (
                      <p className="text-sm text-muted-foreground">
                        Grade: {course.grade}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editCourse(course, index)}
                      className="gap-2"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteCourse(index)}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <FormField
          control={form.control}
          name="hourlyRate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Hourly Rate (₱)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  {...field}
                  data-testid="input-tutor-rate"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Availability Slots (comma separated)</FormLabel>
              <FormControl>
                <Input
                  placeholder="Mon 3-5pm, Wed 10am-1pm"
                  {...field}
                  data-testid="input-tutor-availability"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          data-testid="btn-tutor-save"
          disabled={isUploading || courses.length === 0}
        >
          {isUploading ? "Saving..." : "Save Profile"}
        </Button>
      </form>
    </Form>
  );
}
