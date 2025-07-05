import { useState } from "react";
import { format } from "date-fns";
import { Clock, Trash2 } from "lucide-react";
import { TimeRange } from "../_types/schedule-types";
import { formatDateTime } from "../_utils/date-utils";
import { Card, CardContent } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

interface TimeRangeEditorProps {
  timeRanges: TimeRange[];
  onUpdateTimeRanges: (timeRanges: TimeRange[]) => void;
}

export function TimeRangeEditor({ timeRanges, onUpdateTimeRanges }: TimeRangeEditorProps) {
  // Update time range with new date or time
  const updateTimeRange = (
    id: string, 
    field: 'startTime' | 'endTime', 
    type: 'date' | 'time',
    value: string
  ) => {
    const updatedRanges = timeRanges.map(range => {
      if (range.id !== id) return range;
      
      const currentDate = new Date(range[field]);
      
      if (type === 'date') {
        // Update the date component
        const newDate = new Date(value);
        if (isNaN(newDate.getTime())) return range;
        
        const updatedDate = new Date(currentDate);
        updatedDate.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
        
        return {
          ...range,
          [field]: updatedDate
        };
      } else {
        // Update the time component
        const timeParts = value.split(':');
        if (timeParts.length !== 2) return range;
        
        const hours = Number(timeParts[0]);
        const minutes = Number(timeParts[1]);
        if (isNaN(hours) || isNaN(minutes)) return range;
        
        const updatedDate = new Date(currentDate);
        updatedDate.setHours(hours, minutes);
        
        return {
          ...range,
          [field]: updatedDate
        };
      }
    });
    
    onUpdateTimeRanges(updatedRanges);
  };

  // Remove a time range
  const removeTimeRange = (id: string) => {
    // Don't allow removing the last range
    if (timeRanges.length <= 1) return;
    onUpdateTimeRanges(timeRanges.filter(range => range.id !== id));
  };

  return (
    <div className="space-y-3">
      {timeRanges.map((range, index) => {
        // Format dates for inputs
        const startDateValue = format(range.startTime, 'yyyy-MM-dd');
        const startTimeValue = format(range.startTime, 'HH:mm');
        const endDateValue = format(range.endTime, 'yyyy-MM-dd');
        const endTimeValue = format(range.endTime, 'HH:mm');
        
        return (
          <Card key={range.id} className="relative">
            <CardContent className="p-4">
              <div className="flex items-center mb-2">
                <Badge variant="outline" className="mr-2">
                  Plage {index + 1}
                </Badge>
                <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                <span className="text-sm font-medium">
                  {formatDateTime(range.startTime)} - {formatDateTime(range.endTime)}
                </span>
                
                {timeRanges.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="ml-auto h-8 w-8"
                    onClick={() => removeTimeRange(range.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-2">
                <div>
                  <p className="text-sm font-medium mb-2">Début</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label htmlFor={`range-start-date-${range.id}`} className="block text-sm">
                        Date
                      </label>
                      <Input
                        id={`range-start-date-${range.id}`}
                        type="date"
                        value={startDateValue}
                        onChange={(e) => updateTimeRange(range.id, 'startTime', 'date', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor={`range-start-time-${range.id}`} className="block text-sm">
                        Heure
                      </label>
                      <Input
                        id={`range-start-time-${range.id}`}
                        type="time"
                        value={startTimeValue}
                        onChange={(e) => updateTimeRange(range.id, 'startTime', 'time', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">Fin</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <label htmlFor={`range-end-date-${range.id}`} className="block text-sm">
                        Date
                      </label>
                      <Input
                        id={`range-end-date-${range.id}`}
                        type="date"
                        value={endDateValue}
                        onChange={(e) => updateTimeRange(range.id, 'endTime', 'date', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor={`range-end-time-${range.id}`} className="block text-sm">
                        Heure
                      </label>
                      <Input
                        id={`range-end-time-${range.id}`}
                        type="time"
                        value={endTimeValue}
                        onChange={(e) => updateTimeRange(range.id, 'endTime', 'time', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              {range.endTime <= range.startTime && (
                <p className="text-sm text-destructive mt-2">
                  L&apos;heure de fin doit être postérieure à l&apos;heure de début
                </p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
} 