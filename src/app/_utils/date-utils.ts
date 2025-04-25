import { format } from 'date-fns';
import { fr } from 'date-fns/locale'; // For French formatting

// Helper function to format a datetime
export const formatDateTime = (date: Date) => {
  return format(date, 'EEEE d MMMM yyyy HH:mm', { locale: fr });
};

// Helper function to format just the date part
export const formatDate = (date: Date) => {
  return format(date, 'EEEE d MMMM yyyy', { locale: fr });
};

// Helper function to format just the time
export const formatTime = (date: Date) => format(date, 'HH:mm', { locale: fr }); 