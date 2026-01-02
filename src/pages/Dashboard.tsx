import { TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { getLeads } from '../services/leadsService';
import { getCalendarEvents } from '../services/calendarService';
import type { Lead } from '../services/leadsService';
import type { CalendarEvent } from '../services/calendarService';

export default function Dashboard() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const userName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [leadsData, eventsData] = await Promise.all([
          getLeads(user.id),
          getCalendarEvents(user.id),
        ]);
        setLeads(leadsData);
        setEvents(eventsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const todayLeads = leads.filter(lead => {
    const leadDate = new Date(lead.created_at).toDateString();
    return leadDate === new Date().toDateString();
  }).length;

  const stats = [
    { label: 'New Leads Today', value: todayLeads.toString(), change: '+5.2%', isPositive: true },
    { label: 'Total Leads', value: leads.length.toString(), change: '+2.1%', isPositive: true },
    { label: 'Upcoming Events', value: events.length.toString(), change: '-1.5%', isPositive: false },
  ];

  const upcomingCalls = events
    .filter(e => new Date(e.event_date) >= new Date())
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 4)
    .map(event => ({
      name: event.title,
      time: new Date(event.event_date).toLocaleString(),
      status: event.status === 'scheduled' ? 'Confirmed' : event.status,
      statusColor: event.status === 'scheduled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
    }));

  const chartData = [30, 45, 28, 55, 42, 70, 35, 65, 48, 75, 40, 50, 80];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Good Morning, {userName}!
        </h1>
        <p className="text-gray-600">Here's a summary of your activity today.</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">{stat.label}</p>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-bold text-gray-900">{stat.value}</p>
              <div className={`flex items-center gap-1 text-sm font-medium mb-1 ${
                stat.isPositive ? 'text-green-600' : 'text-red-600'
              }`}>
                {stat.isPositive ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Lead Generation: Last 7 Days</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-gray-900">84</span>
              <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                +15%
              </span>
            </div>
          </div>

          <div className="relative h-64">
            <svg className="w-full h-full" viewBox="0 0 700 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              <path
                d={`M 0 ${200 - chartData[0]} ${chartData.map((val, i) =>
                  `L ${(i * 700) / (chartData.length - 1)} ${200 - val}`
                ).join(' ')}`}
                fill="url(#gradient)"
                stroke="none"
              />

              <path
                d={`M 0 ${200 - chartData[0]} ${chartData.map((val, i) =>
                  `L ${(i * 700) / (chartData.length - 1)} ${200 - val}`
                ).join(' ')}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 mt-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Booked Calls</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View all
            </button>
          </div>

          <div className="space-y-4">
            {upcomingCalls.map((call, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                  {call.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{call.name}</p>
                  <p className="text-xs text-gray-500">{call.time}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${call.statusColor}`}>
                  {call.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
