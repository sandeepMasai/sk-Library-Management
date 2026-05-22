import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { TableScroll } from '../../components/ui/TableScroll';
import { createStudent, deleteStudent, fetchStudents, toggleBlockStudent, type StudentRow } from '../api/libraryApi';

export function AdminStudents() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [feeAmount, setFeeAmount] = useState('500');

  const load = () => {
    setLoading(true);
    fetchStudents()
      .then(setStudents)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createStudent({
        name: name.trim(),
        mobile: mobile.replace(/\D/g, '').slice(-10),
        username: username.trim().toLowerCase(),
        pin,
        feeAmount: Number(feeAmount) || 0,
        feeStatus: 'pending',
      });
      setShowForm(false);
      setName('');
      setMobile('');
      setUsername('');
      setPin('');
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add student');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-pad">
      <div className="mb-6 rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-slate-700 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-3">
        <span>
          After adding a student, share the app:{' '}
          <Link to="/download" className="font-semibold text-primary underline">
            Download SmartLibDesk
          </Link>
          . They check in via{' '}
          <Link to="/admin/attendance" className="font-semibold text-primary underline">
            Attendance QR
          </Link>
          .
        </span>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">Students</h1>
          <p className="text-sm text-muted">{students.length} registered</p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancel' : '+ Add student'}
        </Button>
      </div>

      {showForm ? (
        <form onSubmit={handleCreate} className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-2">
          <Input label="Full name *" required value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Mobile *" required value={mobile} onChange={(e) => setMobile(e.target.value)} />
          <Input label="Username *" required value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="PIN (4 digits) *" required maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))} />
          <Input label="Fee amount (₹)" type="number" value={feeAmount} onChange={(e) => setFeeAmount(e.target.value)} />
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={saving} fullWidth>
              {saving ? 'Saving…' : 'Create student'}
            </Button>
          </div>
        </form>
      ) : null}

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <p className="p-8 text-muted">Loading…</p>
        ) : (
          <TableScroll>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Fee</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{s.mobile}</td>
                  <td className="px-4 py-3">₹{s.feeAmount}</td>
                  <td className="px-4 py-3 capitalize">{s.feeStatus}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="mr-2 text-xs font-medium text-primary"
                      onClick={async () => {
                        await toggleBlockStudent(s.id);
                        load();
                      }}
                    >
                      {s.isBlocked ? 'Unblock' : 'Block'}
                    </button>
                    <button
                      type="button"
                      className="text-xs font-medium text-red-600"
                      onClick={async () => {
                        if (confirm('Delete this student?')) {
                          await deleteStudent(s.id);
                          load();
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </TableScroll>
        )}
      </div>
    </div>
  );
}
