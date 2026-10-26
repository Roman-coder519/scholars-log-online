import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListTasks, getListTasksQueryKey } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";

export default function Schedule() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());

  const { data: tasks = [] } = useListTasks({}, { query: { queryKey: getListTasksQueryKey() } });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad start
  const startDay = monthStart.getDay();
  const paddedDays = Array(startDay).fill(null).concat(days);

  function getTasksForDay(date: Date) {
    const dateStr = date.toISOString().split("T")[0];
    return tasks.filter(t => t.dueDate === dateStr);
  }

  const selectedTasks = getTasksForDay(selectedDay);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold">Schedule</h1>
        <p className="text-sm text-muted-foreground">Calendar view of your tasks</p>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <Card>
            <CardContent className="p-4">
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} data-testid="button-prev-month">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="font-semibold">{format(currentDate, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} data-testid="button-next-month">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {paddedDays.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const dayTasks = getTasksForDay(day);
                  const isSelected = isSameDay(day, selectedDay);
                  return (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-colors",
                        isToday(day) && "font-bold",
                        isSelected ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                        !isSameMonth(day, currentDate) && "opacity-30"
                      )}
                      data-testid={`calendar-day-${day.toISOString().split("T")[0]}`}
                    >
                      <span>{format(day, "d")}</span>
                      {dayTasks.length > 0 && (
                        <div className={cn("flex gap-0.5 mt-1 flex-wrap justify-center", isSelected ? "opacity-80" : "")}>
                          {dayTasks.slice(0, 3).map((_, ti) => (
                            <div key={ti} className={cn("w-1 h-1 rounded-full", isSelected ? "bg-primary-foreground/70" : "bg-primary")} />
                          ))}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Selected day tasks */}
        <div>
          <h3 className="font-semibold text-sm mb-3">{format(selectedDay, "EEEE, MMMM d")}</h3>
          {selectedTasks.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No tasks for this day
            </div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card>
                    <CardContent className="p-3">
                      <p className={cn("text-sm font-medium", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.scheduledTime && <span className="text-xs text-muted-foreground">{task.scheduledTime}</span>}
                        {task.subject && <span className="text-xs text-muted-foreground">{task.subject}</span>}
                        <span className={cn("text-xs capitalize", task.priority === "high" ? "text-destructive" : "text-muted-foreground")}>{task.priority}</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
