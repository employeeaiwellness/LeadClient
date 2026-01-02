import { useState } from 'react';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Brands from '../pages/Brands';
import Calendar from '../pages/Calendar';
import Settings from '../pages/Settings';

export type PageType = 'dashboard' | 'leads' | 'brands' | 'calendar' | 'settings';

interface RouterProps {
  currentPage: PageType;
}

export default function Router({ currentPage }: RouterProps) {
  switch (currentPage) {
    case 'dashboard':
      return <Dashboard />;
    case 'leads':
      return <Leads />;
    case 'brands':
      return <Brands />;
    case 'calendar':
      return <Calendar />;
    case 'settings':
      return <Settings />;
    default:
      return <Dashboard />;
  }
}

export function useRouter() {
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  const navigate = (page: PageType) => {
    setCurrentPage(page);
  };

  return { currentPage, navigate };
}
