import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2, Plus } from 'lucide-react';
import ModuleForm from './ModuleForm';

export default function ModulesPage() {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null=closed, {}=new, {id,...}=edit

  useEffect(() => { fetchModules(); }, []);

  const fetchModules = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) console.error(error);
    setModules(data || []);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu modulu silmək istədiyinizə əminsiniz?')) return;
    const { error } = await supabase.from('modules').delete().eq('id', id);
    if (error) { console.error(error); alert('Xəta baş verdi'); return; }
    setModules(prev => prev.filter(m => m.id !== id));
  };

  const handleSaved = (newId) => {
    setEditing(null);
    if (newId) navigate(`/admin/modules/${newId}`);
    else fetchModules();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/admin')}
              className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            <h1 className="text-xl font-bold text-gray-800">Modullar</h1>
          </div>
          <button
            onClick={() => setEditing({})}
            className="flex items-center gap-2 px-4 py-2 bg-[#069494] text-white text-sm font-bold rounded-xl hover:bg-[#057a7a] transition-colors"
          >
            <Plus size={16} /> Modul əlavə et
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-400 text-sm">Yüklənir...</p>
            </div>
          ) : modules.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-400 text-sm">Hələ heç bir modul yoxdur.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ad</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Keçid faizi</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sertifikat (gün)</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tarix</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modules.map(m => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-800">{m.title}</p>
                      {m.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{m.description}</p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-700">{m.pass_threshold}%</td>
                    <td className="px-5 py-4 text-sm text-gray-700">{m.certificate_validity_days}</td>
                    <td className="px-5 py-4 text-sm text-gray-400">
                      {new Date(m.created_at).toLocaleDateString('az-AZ')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => navigate(`/admin/modules/${m.id}`)}
                          className="p-2 rounded-lg hover:bg-[#069494]/10 text-[#069494] transition-colors"
                          title="Redaktə et"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing !== null && (
        <ModuleForm
          module={editing}
          onSaved={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}
