import { CalendarDays } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect } from 'react';

export default function Calendar() {
  const { user, googleAccessToken } = useAuth();

  useEffect(() => {
    console.log('Calendar.tsx - User:', user?.email);
    console.log('Calendar.tsx - Google Access Token:', googleAccessToken ? '✅ Available' : '❌ Missing');
    
    if (!user || !googleAccessToken) {
      console.log('Waiting for user and Google access token...');
      return;
    }

    const fetchGoogleCalendarEvents = async () => {
      try {
        console.log('Fetching Google Calendar events...');
        // Get current month's date range
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const timeMin = startOfMonth.toISOString();
        const timeMax = endOfMonth.toISOString();
        
        console.log('API URL:', `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`);
        
        // Call Google Calendar API
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`,
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
            },
          }
        );

        console.log('Google Calendar API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Google Calendar API error: ${response.status}`);
        }

        const data = await response.json();
        
        console.log(`📅 Google Calendar Events for ${now.toLocaleString('default', { month: 'long', year: 'numeric' })}:`);
        console.log(`Total events this month: ${data.items?.length || 0}`);
        console.log(data.items || []);
        
        if (!data.items || data.items.length === 0) {
          console.log('No events scheduled for this month');
        } else {
          data.items.forEach((event: any, index: number) => {
            const eventDate = new Date(event.start.dateTime || event.start.date).toLocaleDateString();
            const eventTime = event.start.dateTime ? new Date(event.start.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'All day';
            console.log(`${index + 1}. ${event.summary} - ${eventDate} at ${eventTime}`);
          });
        }
      } catch (error) {
        console.error('Error fetching Google Calendar events:', error);
      }
    };

    fetchGoogleCalendarEvents();
  }, [user, googleAccessToken]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
        <p className="text-gray-600">Your Google Calendar events for this month.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-blue-50 p-6 rounded-full mb-4">
          <CalendarDays className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Google Calendar</h2>
        <p className="text-gray-600 text-center max-w-md">
          Check the console to see your Google Calendar events for this month.
        </p>
      </div>
    </div>
  );
}
