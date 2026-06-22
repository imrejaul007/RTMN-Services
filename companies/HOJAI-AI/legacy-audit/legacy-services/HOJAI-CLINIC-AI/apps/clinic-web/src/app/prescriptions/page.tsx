'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Prescription, Patient, Doctor } from '@/types';
import { PlusIcon, DocumentTextIcon, PrinterIcon, EyeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetchPrescriptions();
    fetchPatients();
    fetchDoctors();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const response = await api.get('/prescriptions?limit=50');
      if (response.data.success) {
        setPrescriptions(response.data.data);
      }
    } catch (error) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const response = await api.get('/patients?limit=100');
      if (response.data.success) {
        setPatients(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch patients');
    }
  };

  const fetchDoctors = async () => {
    try {
      const response = await api.get('/doctors');
      if (response.data.success) {
        setDoctors(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch doctors');
    }
  };

  return (
    <div className="animate-fadeIn">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
          <p className="text-gray-500 mt-1">Manage patient prescriptions</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          New Prescription
        </button>
      </div>

      {/* Prescriptions Grid */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : prescriptions.length === 0 ? (
        <div className="card">
          <div className="card-body text-center py-12">
            <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300" />
            <p className="mt-2 text-gray-500">No prescriptions yet</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary mt-4">
              Create First Prescription
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prescriptions.map((prescription) => {
            const patient = prescription.patientId as Patient;
            const doctor = prescription.doctorId as Doctor;

            return (
              <div key={prescription._id} className="card hover:shadow-md transition-shadow">
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-secondary-100 flex items-center justify-center">
                        <span className="text-secondary-700 font-medium text-sm">
                          {(patient as any)?.firstName?.[0] || '?'}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {(patient as any)?.firstName} {(patient as any)?.lastName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(prescription.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 text-xs rounded-full bg-primary-50 text-primary-700">
                      {prescription.medications.length} meds
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  {prescription.diagnosis && (
                    <p className="text-sm text-gray-600 mb-2">
                      <span className="font-medium">Diagnosis:</span> {prescription.diagnosis}
                    </p>
                  )}
                  <div className="space-y-2 mb-4">
                    {prescription.medications.slice(0, 3).map((med, idx) => (
                      <div key={idx} className="flex items-center text-sm">
                        <span className="w-2 h-2 rounded-full bg-primary-400 mr-2"></span>
                        <span className="text-gray-700">{med.medicine}</span>
                        <span className="text-gray-400 mx-2">-</span>
                        <span className="text-gray-500">{med.dosage}</span>
                      </div>
                    ))}
                    {prescription.medications.length > 3 && (
                      <p className="text-xs text-gray-500">
                        +{prescription.medications.length - 3} more medications
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">
                      Dr. {(doctor as any)?.name}
                    </p>
                    <button
                      onClick={() => setSelectedPrescription(prescription)}
                      className="flex items-center text-sm text-primary-600 hover:text-primary-700"
                    >
                      <EyeIcon className="h-4 w-4 mr-1" />
                      View
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Prescription Modal */}
      {selectedPrescription && (
        <PrescriptionViewModal
          prescription={selectedPrescription}
          onClose={() => setSelectedPrescription(null)}
        />
      )}

      {/* New Prescription Modal */}
      {showModal && (
        <PrescriptionFormModal
          patients={patients}
          doctors={doctors}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchPrescriptions();
          }}
        />
      )}
    </div>
  );
}

function PrescriptionViewModal({
  prescription,
  onClose,
}: {
  prescription: Prescription;
  onClose: () => void;
}) {
  const patient = prescription.patientId as Patient;
  const doctor = prescription.doctorId as Doctor;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Prescription</h2>
            <div className="flex items-center space-x-2">
              <button className="btn btn-outline flex items-center">
                <PrinterIcon className="h-4 w-4 mr-2" />
                Print
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>
          </div>

          {/* Prescription Content */}
          <div className="border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">HOJAI Clinic</h3>
                <p className="text-sm text-gray-500">AI-Powered Healthcare</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Date</p>
                <p className="text-sm font-medium">{format(new Date(prescription.createdAt), 'MMMM d, yyyy')}</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-sm text-gray-600">Patient</p>
              <p className="text-base font-medium">{patient?.firstName} {patient?.lastName}</p>
              <p className="text-sm text-gray-500">Phone: {patient?.phone}</p>
            </div>

            {prescription.chiefComplaint && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">Chief Complaint</p>
                <p className="text-base">{prescription.chiefComplaint}</p>
              </div>
            )}

            {prescription.diagnosis && (
              <div className="mb-6">
                <p className="text-sm text-gray-600">Diagnosis</p>
                <p className="text-base font-medium">{prescription.diagnosis}</p>
              </div>
            )}

            <div className="mb-6">
              <p className="text-sm font-semibold text-gray-900 mb-3">Medications</p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 text-xs uppercase text-gray-500">Medicine</th>
                    <th className="text-left py-2 text-xs uppercase text-gray-500">Dosage</th>
                    <th className="text-left py-2 text-xs uppercase text-gray-500">Frequency</th>
                    <th className="text-left py-2 text-xs uppercase text-gray-500">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {prescription.medications.map((med, idx) => (
                    <tr key={idx} className="border-b border-gray-100">
                      <td className="py-2 text-sm">{med.medicine}</td>
                      <td className="py-2 text-sm">{med.dosage}</td>
                      <td className="py-2 text-sm">{med.frequency}</td>
                      <td className="py-2 text-sm">{med.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {prescription.advice && prescription.advice.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Advice</p>
                <ul className="list-disc list-inside text-sm">
                  {prescription.advice.map((advice, idx) => (
                    <li key={idx}>{advice}</li>
                  ))}
                </ul>
              </div>
            )}

            {prescription.tests && prescription.tests.length > 0 && (
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-2">Tests</p>
                <ul className="list-disc list-inside text-sm">
                  {prescription.tests.map((test, idx) => (
                    <li key={idx}>{test}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-sm font-medium">Dr. {doctor?.name}</p>
              <p className="text-xs text-gray-500">{doctor?.specialization}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrescriptionFormModal({
  patients,
  doctors,
  onClose,
  onSave,
}: {
  patients: Patient[];
  doctors: Doctor[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    patientId: '',
    doctorId: '',
    diagnosis: '',
    chiefComplaint: '',
    medications: [{ medicine: '', dosage: '', frequency: '', duration: '' }],
    advice: [''],
    tests: [''],
  });
  const [saving, setSaving] = useState(false);

  const addMedication = () => {
    setFormData({
      ...formData,
      medications: [...formData.medications, { medicine: '', dosage: '', frequency: '', duration: '' }],
    });
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...formData.medications];
    (updated[index] as any)[field] = value;
    setFormData({ ...formData, medications: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.post('/prescriptions', {
        ...formData,
        advice: formData.advice.filter(Boolean),
        tests: formData.tests.filter(Boolean),
      });
      toast.success('Prescription created successfully');
      onSave();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create prescription');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black opacity-30" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-4">New Prescription</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Patient</label>
                <select
                  required
                  value={formData.patientId}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select patient</option>
                  {patients.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.firstName} {p.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Doctor</label>
                <select
                  required
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  className="form-select"
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="form-label">Chief Complaint</label>
              <input
                type="text"
                value={formData.chiefComplaint}
                onChange={(e) => setFormData({ ...formData, chiefComplaint: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Diagnosis</label>
              <input
                type="text"
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                className="form-input"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="form-label mb-0">Medications</label>
                <button type="button" onClick={addMedication} className="text-sm text-primary-600">
                  + Add Medication
                </button>
              </div>
              {formData.medications.map((med, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Medicine"
                    required
                    value={med.medicine}
                    onChange={(e) => updateMedication(idx, 'medicine', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Dosage"
                    required
                    value={med.dosage}
                    onChange={(e) => updateMedication(idx, 'dosage', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Frequency"
                    required
                    value={med.frequency}
                    onChange={(e) => updateMedication(idx, 'frequency', e.target.value)}
                    className="form-input"
                  />
                  <input
                    type="text"
                    placeholder="Duration"
                    required
                    value={med.duration}
                    onChange={(e) => updateMedication(idx, 'duration', e.target.value)}
                    className="form-input"
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button type="button" onClick={onClose} className="btn btn-outline">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? 'Creating...' : 'Create Prescription'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
