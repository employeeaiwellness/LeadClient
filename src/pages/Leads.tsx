import { Users, Plus, Trash2, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useForms } from '../contexts/FormsContext';
import { getLeads, createLead, deleteLead } from '../services/leadsService';
import type { Lead } from '../services/leadsService';

export default function Leads() {
  const { user, googleAccessToken } = useAuth();
  const { 
    selectedForm, 
    setSelectedForm, 
    selectedFormData, 
    selectedFormResponsesArray,
    selectedFormQuestionsBasedResponses,
    formsMap,
    loading: formsLoading,
    refreshForms
  } = useForms();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [newLead, setNewLead] = useState({ name: '', email: '', phone: '', company: '', status: 'new' });
  const [showForm, setShowForm] = useState(false);
  const [importingForms, setImportingForms] = useState(false);

  // Fetch leads only (not forms - they're now fetched in FormsContext)
  useEffect(() => {
    if (!user) return;

    const fetchLeads = async () => {
      try {
        const data = await getLeads(user.uid);
        setLeads(data);
      } catch (error) {
        console.error('Failed to fetch leads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeads();
  }, [user]);

  // Log available data for debugging
  console.log('📊 Selected Form Data:', selectedFormData);
  console.log('📋 Row-based Responses:', selectedFormResponsesArray);
  console.log('❓ Question-based Responses:', selectedFormQuestionsBasedResponses);

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

  // Import form responses as new leads
  const handleImportFormResponses = async () => {
    if (!user || !selectedFormResponsesArray || selectedFormResponsesArray.length === 0) {
      alert('No form responses available to import');
      return;
    }

    setImportingForms(true);
    try {
      let importedCount = 0;
      
      // Loop through each response row
      for (const responseRow of selectedFormResponsesArray) {
        // Extract data from form response
        const name = responseRow['Name'] || 'Unknown'; // Adjust field name based on your form
        const email = responseRow['Email'] || responseRow['email'] || undefined;
        const phone = responseRow['Phone'] || responseRow['phone'] || undefined;
        const company = responseRow['Company'] || responseRow['company'] || undefined;
        const notes = responseRow['I\'m here to…'] || responseRow['Notes'] || undefined; // Custom field

        // Create lead from form response
        const leadData = {
          user_id: user.uid,
          name,
          email,
          phone,
          company,
          notes,
          status: 'new',
          source: `${selectedForm} Form`, // Track which form it came from
        };

        try {
          const newLead = await createLead(leadData);
          setLeads(prev => [newLead, ...prev]);
          importedCount++;
        } catch (err) {
          console.error('Failed to import response as lead:', err);
        }
      }

      alert(`✅ Imported ${importedCount} lead(s) from form responses!`);
    } catch (error) {
      console.error('Error importing form responses:', error);
      alert('Failed to import form responses');
    } finally {
      setImportingForms(false);
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

      {/* Status Indicators & Form Import Section */}
      <div className="mb-6">
        <div className="flex gap-4 mb-4 flex-wrap">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${googleAccessToken ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {googleAccessToken ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {googleAccessToken ? 'Google Token Available' : 'Google Token Loading...'}
            </span>
          </div>
          
          <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${Object.keys(formsMap).length > 0 ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
            {Object.keys(formsMap).length > 0 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span className="text-sm font-medium">
              {Object.keys(formsMap).length > 0 ? `${Object.keys(formsMap).length} Form(s) Cached` : 'Forms Loading...'}
            </span>
          </div>
        </div>

        {/* Form Response Import Section */}
        {selectedFormResponsesArray.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-blue-900">Form Responses Available</h3>
                <p className="text-blue-700 text-sm">
                  Found {selectedFormResponsesArray.length} response(s) from "{selectedForm}"
                </p>
              </div>
              <button
                onClick={handleImportFormResponses}
                disabled={importingForms}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                {importingForms ? 'Importing...' : 'Import as Leads'}
              </button>
            </div>
          </div>
        )}
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
