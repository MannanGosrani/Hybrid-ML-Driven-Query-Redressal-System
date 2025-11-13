import { supabase, type Ticket, type TicketStatus } from './supabase';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';


dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);
dayjs.tz.setDefault('Asia/Kolkata');

export async function generateTicketNumber(): Promise<string> {
  const yearMonth = dayjs().format('YYYYMM');
  const prefix = `NM-${yearMonth}-`;
  
  
  const timestamp = Date.now();
  const millisPart = timestamp.toString().slice(-4);
  const randomPart = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const uniqueNumber = `${millisPart}${randomPart}`;
  
  return `${prefix}${uniqueNumber}`;
}


export function getStatusColor(status: TicketStatus): string {
  const colors: Record<TicketStatus, string> = {
    OPEN: 'text-info',
    UNDER_REVIEW: 'text-warning',
    CLOSED: 'text-muted-foreground'
  };
  return colors[status] || 'text-muted-foreground';
}

export function formatRelativeTime(date: string): string {
  return dayjs(date).fromNow();
}


export function formatFullDate(date: string): string {
  return dayjs(date).format('DD MMM YYYY, h:mm A');
}
