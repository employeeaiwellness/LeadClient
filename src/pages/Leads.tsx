import { Users, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getLeads, createLead, deleteLead } from '../services/leadsService';
import type { Lead } from '../services/leadsService';

export default function Leads() {
  const { user, googleAccessToken } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', company: '', status: 'new' });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchLeads = async () => {
      try {
        const data = await getLeads(user.uid);
        setLeads(data);
        
        // Fetch ALL Google Forms and their response data
        if (googleAccessToken) {
          await fetchAllGoogleFormsAndResponses();
        }
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [user, googleAccessToken]);

  const fetchAllGoogleFormsAndResponses = async () => {
    if (!googleAccessToken) {
      console.warn('No Google access token available');
      return;
    }

    try {
      console.log('\n🔍 Fetching Google Forms from your Drive...\n');
      
      // Get all Google Forms from Drive
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.form'&spaces=drive&fields=files(id,name,description)&pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        console.error('Google Drive API error:', searchResponse.status);
        return;
      }

      const searchData = await searchResponse.json();
      const forms = searchData.files || [];
      
      console.log(`✅ Found ${forms.length} Google Forms\n`);

      if (forms.length === 0) {
        console.log('No Google Forms found in your Drive');
        return;
      }

      // Find the "Contact Information" form
      const contactForm = forms.find((form: any) => form.name === 'Contact Information');

      if (!contactForm) {
        console.log('❌ "Contact Information" form not found');
        console.log('Available forms:', forms.map((f: any) => f.name).join(', '));
        return;
      }

      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Form Name: ${contactForm.name}`);
      console.log(`Form ID: ${contactForm.id}`);
      console.log(`${'='.repeat(60)}\n`);

      // Fetch responses for this specific form
      try {
        const responsesResponse = await fetch(
          `https://forms.googleapis.com/v1/forms/${contactForm.id}/responses`,
          {
            headers: {
              Authorization: `Bearer ${googleAccessToken}`,
            },
          }
        );

        if (responsesResponse.ok) {
          const responsesData = await responsesResponse.json();
          console.log(`📊 Form Responses (Total: ${responsesData.responses?.length || 0}):`);
          console.log(responsesData);
        } else {
          console.error(`Error fetching responses: ${responsesResponse.status}`, responsesResponse.statusText);
          const errorData = await responsesResponse.json().catch(() => ({}));
          console.error('Error details:', errorData);
        }
      } catch (error) {
        console.error(`Error fetching form responses:`, error);
      }
    } catch (error) {
      console.error('Error fetching Google Forms:', error);
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newLead.name) return;

    try {
      const lead = await createLead({
        user_id: user.uid,
        ...newLead,
      });
      setLeads([lead, ...leads]);
      setNewLead({ name: '', email: '', phone: '', company: '', status: 'new' });
      setShowForm(false);
      
      // Fetch forms again when a new lead is created
      if (googleAccessToken) {
        await fetchAllGoogleFormsAndResponses();
      }
    } catch (error) {
      console.error('Failed to create lead:', error);
    }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      await deleteLead(id);
      setLeads(leads.filter(lead => lead.id !== id));
    } catch (error) {
      console.error('Failed to delete lead:', error);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Leads</h1>
          <p className="text-gray-600">Manage and track all your leads in one place.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">Loading leads...</div>
      ) : leads.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 flex flex-col items-center justify-center min-h-[400px]">
          <div className="bg-blue-50 p-6 rounded-full mb-4">
            <Users className="w-12 h-12 text-blue-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Leads Yet</h2>
          <p className="text-gray-600 text-center max-w-md">
            Create your first lead to get started managing your sales pipeline.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Company</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Status</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900">{lead.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.email || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{lead.company || '-'}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
