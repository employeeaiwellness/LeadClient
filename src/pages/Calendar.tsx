import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays, 
  Clock, 
  Video,
  ExternalLink,
  AlignLeft,
  MapPin,
  MousePointerClick
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths, 
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';

const ModernGoogleCalendar = () => {
  const { user, googleAccessToken } = useAuth();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeEvent, setActiveEvent] = useState<any | null>(null);

  useEffect(() => {
    if (!user || !googleAccessToken) return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const start = startOfMonth(currentDate).toISOString();
        const end = endOfMonth(currentDate).toISOString();
        
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${start}&timeMax=${end}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${googleAccessToken}` } }
        );
        
        if (!response.ok) throw new Error('Failed to fetch');
        const data = await response.json();
        setGoogleEvents(data.items || []);
      } catch (error) {
        console.error('Calendar Fetch Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate, googleAccessToken, user]);

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const selectedDateEvents = useMemo(() => {
    return googleEvents.filter(event => {
      const eventDate = new Date(event.start.dateTime || event.start.date);
      return isSameDay(selectedDate, eventDate);
    });
  }, [selectedDate, googleEvents]);

  const hasEvents = (date: Date) => {
    return googleEvents.some(event => isSameDay(date, new Date(event.start.dateTime || event.start.date)));
  };

  const getMeetingLink = (event: any) => {
    if (event.hangoutLink) return event.hangoutLink;
    if (event.conferenceData?.entryPoints) {
      const videoLink = event.conferenceData.entryPoints.find((ep: any) => ep.entryPointType === 'video');
      if (videoLink) return videoLink.uri;
    }
    if (event.location && (event.location.startsWith('http') || event.location.includes('zoom.us'))) {
      return event.location;
    }
    return null;
  };

  const formatEventTime = (event: any) => {
    if (event.start.date) return "All Day";
    return format(new Date(event.start.dateTime), 'p');
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setActiveEvent(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col items-start gap-1">
        <p className="text-blue-600 font-bold text-xs uppercase tracking-widest">Workspace Sync</p>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight leading-none">Calendar</h1>
      </div>

      <div className="bg-white rounded-[2rem] shadow-2xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
        
        {/* LEFT COLUMN: Date Info + List of Events */}
        <div className="p-8 w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-slate-100 bg-slate-50/40 flex flex-col">
          <div className="mb-8">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <CalendarDays className="w-5 h-5" />
              <span className="text-xs font-black font-bold uppercase tracking-widest">Events Scheduled For</span>
            </div>
            <h2 className="text-5xl font-black text-slate-900 leading-none">
              {format(selectedDate, 'dd')}
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <p className="text-xl font-bold text-slate-400 capitalize">{format(selectedDate, 'EEEE')}</p>
              <p className="text-blue-600 font-bold text-sm">{format(selectedDate, 'MMMM')}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3 min-h-[300px]">
            {loading ? (
               <div className="py-10 text-center"><p className="text-xs font-bold text-slate-400 animate-pulse">Syncing...</p></div>
            ) : selectedDateEvents.length > 0 ? (
              selectedDateEvents.map((event, i) => (
                <div 
                  key={i} 
                  onClick={() => setActiveEvent(event)}
                  className={clsx(
                    "p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group",
                    activeEvent?.id === event.id 
                      ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-200 text-white" 
                      : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className={clsx(
                      "text-[10px] font-black uppercase tracking-wider",
                      activeEvent?.id === event.id ? "text-blue-200" : "text-blue-500"
                    )}>
                      {formatEventTime(event)}
                    </span>
                    {activeEvent?.id === event.id && <div className="w-2 h-2 bg-white rounded-full animate-pulse" />}
                  </div>
                  <h4 className={clsx(
                    "text-sm font-bold leading-tight",
                    activeEvent?.id === event.id ? "text-white" : "text-slate-700"
                  )}>
                    {event.summary || '(No Title)'}
                  </h4>
                </div>
              ))
            ) : (
              <div className="py-10 text-center bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-2xl">
                <p className="text-sm font-bold text-slate-400">No events</p>
                <p className="text-xs text-slate-400 mt-1">Enjoy your free time!</p>
              </div>
            )}
          </div>
        </div>

        {/* MIDDLE COLUMN: Calendar Grid */}
        <div className="p-8 flex-1 bg-white border-r border-slate-100">
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => { setCurrentDate(subMonths(currentDate, 1)); setActiveEvent(null); }} 
                className="p-2 rounded-lg text-slate-600 hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={() => { setCurrentDate(addMonths(currentDate, 1)); setActiveEvent(null); }} 
                className="p-2 rounded-lg text-slate-600 hover:bg-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-4 text-center mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{day}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-4 gap-x-2">
            {days.map((day, idx) => {
              const isSelected = isSameDay(day, selectedDate);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const dayHasEvents = hasEvents(day);
              
              return (
                <div key={idx} className="relative flex justify-center">
                  <button
                    onClick={() => handleDateChange(day)}
                    className={clsx(
                      "w-14 h-14 rounded-2xl flex flex-col items-center justify-center relative transition-all",
                      isSelected 
                        ? "bg-slate-900 text-white font-bold shadow-xl shadow-slate-200 scale-105" 
                        : "text-slate-700 hover:bg-slate-50",
                      !isCurrentMonth && "text-slate-300 opacity-30 pointer-events-none"
                    )}
                  >
                    <span className="text-sm font-bold">{format(day, 'd')}</span>
                    {dayHasEvents && (
                        <span className={clsx(
                            "w-1.5 h-1.5 rounded-full mt-1.5",
                            isSelected ? "bg-blue-400" : "bg-blue-500"
                        )} />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Event Details Panel */}
        <div className="p-8 w-full lg:w-[400px] bg-slate-50/30 flex flex-col">
          {!activeEvent ? (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                    <MousePointerClick className="w-8 h-8 text-blue-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-600">No Event Selected</h3>
                <p className="text-sm text-slate-400 max-w-[200px] mt-2">
                    Click on an event from the list on the left to view its details here.
                </p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300 h-full flex flex-col">
              <div className="mb-6">
                 <span className="inline-block px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                    Event Details
                 </span>
                 <h2 className="text-2xl font-bold text-slate-900 leading-tight">
                    {activeEvent.summary || '(No Title)'}
                 </h2>
              </div>

              <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
                
                {/* Time */}
                <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Clock className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Time</p>
                        <p className="text-sm font-semibold text-slate-700 mt-0.5">
                            {format(selectedDate, 'EEEE, MMMM do')}
                            <br />
                            <span className="text-blue-600">{formatEventTime(activeEvent)}</span>
                        </p>
                    </div>
                </div>

                {/* Location */}
                {activeEvent.location && (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Location</p>
                            <p className="text-sm font-semibold text-slate-700 mt-0.5 break-words">
                                {activeEvent.location}
                            </p>
                        </div>
                    </div>
                )}

                {/* Description */}
                {activeEvent.description && (
                    <div className="flex gap-4 p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                            <AlignLeft className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Description</p>
                            <div 
                                className="text-sm text-slate-600 leading-relaxed overflow-hidden text-ellipsis"
                                dangerouslySetInnerHTML={{ __html: activeEvent.description }}
                            />
                        </div>
                    </div>
                )}

                {/* BUTTONS: Now directly below the description content */}
                <div className="space-y-3 pt-2">
                    {getMeetingLink(activeEvent) && (
                        <button 
                        onClick={() => window.open(getMeetingLink(activeEvent), '_blank')}
                        className="w-full bg-blue-600 text-white py-3.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                        >
                        <Video className="w-4 h-4" />
                        JOIN MEETING
                        </button>
                    )}
                    
                    <button 
                        onClick={() => window.open(activeEvent.htmlLink, '_blank')}
                        className="w-full bg-white border border-slate-200 text-slate-600 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <ExternalLink className="w-4 h-4" />
                        Open in Google Calendar
                    </button>
                </div>

              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default ModernGoogleCalendar;