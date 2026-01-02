import { Users } from 'lucide-react';

export default function Leads() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
        <p className="text-gray-600">Manage and track all your leads in one place.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-blue-50 p-6 rounded-full mb-4">
          <Users className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Leads Page</h2>
        <p className="text-gray-600 text-center max-w-md">
          This page is ready for your leads management features. Add tables, filters, and actions to manage your leads effectively.
        </p>
      </div>
    </div>
  );
}
