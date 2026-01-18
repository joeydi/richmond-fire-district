"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { format, parseISO, subMonths, addMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MonthNavigationProps {
  currentMonth: string;
  availableMonths: string[];
}

export function MonthNavigation({
  currentMonth,
  availableMonths,
}: MonthNavigationProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const navigateToMonth = (month: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("month", month);
    startTransition(() => router.push(url.pathname + url.search));
  };

  const currentDate = parseISO(`${currentMonth}-01`);
  const prevMonth = format(subMonths(currentDate, 1), "yyyy-MM");
  const nextMonth = format(addMonths(currentDate, 1), "yyyy-MM");

  // Check if we can navigate (month exists in available months or is in future)
  const canGoPrev = availableMonths.includes(prevMonth) || availableMonths.length === 0;
  const canGoNext = nextMonth <= format(new Date(), "yyyy-MM");

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateToMonth(prevMonth)}
        disabled={isPending || !canGoPrev}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <Select
        value={currentMonth}
        onValueChange={navigateToMonth}
        disabled={isPending}
      >
        <SelectTrigger className="w-48">
          <SelectValue>
            {format(currentDate, "MMMM yyyy")}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {availableMonths.length > 0 ? (
            availableMonths.map((month) => (
              <SelectItem key={month} value={month}>
                {format(parseISO(`${month}-01`), "MMMM yyyy")}
              </SelectItem>
            ))
          ) : (
            <SelectItem value={currentMonth}>
              {format(currentDate, "MMMM yyyy")}
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="icon"
        onClick={() => navigateToMonth(nextMonth)}
        disabled={isPending || !canGoNext}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
