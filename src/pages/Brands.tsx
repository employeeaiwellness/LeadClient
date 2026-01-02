import { Store } from 'lucide-react';

export default function Brands() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Brands</h1>
        <p className="text-gray-600">View and manage brand partnerships and offers.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
        <div className="bg-blue-50 p-6 rounded-full mb-4">
          <Store className="w-12 h-12 text-blue-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Brands Page</h2>
        <p className="text-gray-600 text-center max-w-md">
          This page is ready for your brand management features. Track partnerships, offers, and collaboration opportunities.
        </p>
      </div>
    </div>
  );
}
