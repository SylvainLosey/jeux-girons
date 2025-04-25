import type { RouterOutputs } from "~/trpc/react";

// Define types based on tRPC router outputs
export type Group = RouterOutputs["group"]["getAll"][number];
export type Game = RouterOutputs["game"]["getAll"][number];

// Define the structure for a single entry in the schedule
export interface ScheduleEntry {
  group: Group;
  game: Game;
  round?: number; // Optional round number (defaults to 1)
}

// Define the structure for a timeslot
export interface TimeSlot {
  slotIndex: number;
  startTime: Date;
  endTime: Date;
  entries: ScheduleEntry[]; // Pairings for this timeslot
}

// Define the overall schedule structure
export type Schedule = TimeSlot[];

// Define the structure for a time range with full datetime support
export interface TimeRange {
  id: string;
  startTime: Date;
  endTime: Date;
} 

export interface SavedScheduleMetadata {
    id: number;
    name: string;
    description: string | null;
    gameDurationMs: number;
    transitionTimeMs: number;
    createdAt: Date;
    updatedAt: Date | null;
  }
  
  export interface SavedSchedule extends SavedScheduleMetadata {
    timeRanges: TimeRange[];
    schedule: Schedule;
  }
  
  export interface SaveScheduleInput {
    name: string;
    description?: string;
    gameDurationMs: number;
    transitionTimeMs: number;
    timeRanges: {
      startTime: Date;
      endTime: Date;
    }[];
    schedule: {
      slotIndex: number;
      startTime: Date;
      endTime: Date;
      entries: {
        groupId: number;
        gameId: number;
        round: number;
      }[];
    }[];
  }