import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
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
import { Check, X, MessageSquare, ExternalLink } from "lucide-react";
import { useChat } from "@/context/ChatContext";
import { useAuth } from "@/context/AuthContext";
import {
  subscribeToTutorRequests,
  updateTutorRequestStatus,
  type TutorRequestRecord,
} from "@/services/tutorRequests";
import { formatTutorCourse } from "@/utils/tutorCourses";

interface TutorRequestsTableProps {
  focusRequestId?: string;
}

export function InterestTable({ focusRequestId }: TutorRequestsTableProps) {
  const { user } = useAuth();
  const { openChat } = useChat();
  const [, setLocation] = useLocation();
  const [requests, setRequests] = useState<TutorRequestRecord[]>([]);
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  useEffect(() => {
    if (!user) {
      setRequests([]);
      return undefined;
    }

    return subscribeToTutorRequests(user.id, setRequests);
  }, [user]);

  useEffect(() => {
    if (!focusRequestId) return;
    const row = rowRefs.current[focusRequestId];
    row?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusRequestId, requests]);

  const highlightedId = focusRequestId ?? "";

  const orderedRequests = useMemo(
    () => [...requests].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [requests],
  );

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Course</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orderedRequests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                No requests yet.
              </TableCell>
            </TableRow>
          ) : (
            orderedRequests.map((req) => (
              <TableRow
                key={req.id}
                ref={(node) => {
                  rowRefs.current[req.id] = node;
                }}
                data-testid={`row-request-${req.id}`}
                className={req.id === highlightedId ? "bg-primary/5" : ""}
              >
                <TableCell className="font-medium">
                  {req.studentName}
                </TableCell>
                <TableCell>
                  {formatTutorCourse({ code: req.courseCode, title: req.courseTitle })}
                </TableCell>
                <TableCell className="max-w-[320px] truncate">
                  {req.message}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={req.status === "pending" ? "secondary" : req.status === "accepted" ? "default" : "destructive"}
                  >
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Message"
                      onClick={() =>
                        openChat(
                          req.studentId,
                          req.studentName,
                          { code: req.courseCode, title: req.courseTitle },
                        )
                      }
                    >
                      <MessageSquare className="h-4 w-4 text-primary" />
                    </Button>
                    {req.status === "pending" && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Accept"
                          className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={async () => {
                            await updateTutorRequestStatus(req.id, "accepted");
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reject"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={async () => {
                            await updateTutorRequestStatus(req.id, "rejected");
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View Details"
                      onClick={() => setLocation(`/tutor/requests?requestId=${req.id}`)}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
