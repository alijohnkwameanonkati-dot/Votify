import { AlertCircle, CheckCircle2, FileText, ImagePlus, Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import type { CandidateResult } from '../types/election';
import { CandidatePortrait } from './CandidatePortrait';

interface CandidateManagerProps {
  adminToken: string;
  candidates: CandidateResult[];
  onChanged: () => Promise<void> | void;
}

interface EncodedFile {
  dataBase64: string;
  mimeType: string;
  fileName: string;
}

function readFileAsBase64(file: File): Promise<EncodedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to read file.'));
        return;
      }
      resolve({
        dataBase64: reader.result,
        mimeType: file.type,
        fileName: file.name,
      });
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
}

export function CandidateManager({ adminToken, candidates, onChanged }: CandidateManagerProps) {
  // Add Candidate state
  const [newName, setNewName] = useState('');
  const [newManifestoText, setNewManifestoText] = useState('');
  const [newPhoto, setNewPhoto] = useState<EncodedFile | null>(null);
  const [newManifestoFile, setNewManifestoFile] = useState<EncodedFile | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit Candidate modal/inline state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editManifestoText, setEditManifestoText] = useState('');
  const [editPhoto, setEditPhoto] = useState<EncodedFile | null>(null);
  const [clearEditPhoto, setClearEditPhoto] = useState(false);
  const [editManifestoFile, setEditManifestoFile] = useState<EncodedFile | null>(null);
  const [clearEditManifestoFile, setClearEditManifestoFile] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Remove confirmation state
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);

  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const startEditing = (c: CandidateResult) => {
    setStatusMessage(null);
    setConfirmRemoveId(null);
    setEditingId(c.id);
    setEditName(c.name);
    setEditManifestoText(c.manifestoText || '');
    setEditPhoto(null);
    setClearEditPhoto(false);
    setEditManifestoFile(null);
    setClearEditManifestoFile(false);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditPhoto(null);
    setEditManifestoFile(null);
  };

  const handleAddCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    const trimmed = newName.trim();
    if (!trimmed) {
      setStatusMessage({ type: 'error', text: 'Candidate name cannot be empty.' });
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch('/api/admin/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: trimmed,
          manifestoText: newManifestoText,
          photo: newPhoto ? { dataBase64: newPhoto.dataBase64, mimeType: newPhoto.mimeType } : undefined,
          manifestoFile: newManifestoFile
            ? {
                dataBase64: newManifestoFile.dataBase64,
                mimeType: newManifestoFile.mimeType,
                fileName: newManifestoFile.fileName,
              }
            : undefined,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setStatusMessage({ type: 'error', text: data.message || 'Could not add candidate.' });
        return;
      }

      setNewName('');
      setNewManifestoText('');
      setNewPhoto(null);
      setNewManifestoFile(null);
      setStatusMessage({ type: 'success', text: `Added candidate "${trimmed}" to the ballot.` });
      await onChanged();
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while adding candidate.' });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent, candidateId: string) => {
    e.preventDefault();
    setStatusMessage(null);
    if (!editName.trim()) {
      setStatusMessage({ type: 'error', text: 'Candidate name cannot be empty.' });
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          name: editName.trim(),
          manifestoText: editManifestoText,
          clearPhoto: clearEditPhoto,
          clearManifestoFile: clearEditManifestoFile,
          photo: editPhoto ? { dataBase64: editPhoto.dataBase64, mimeType: editPhoto.mimeType } : undefined,
          manifestoFile: editManifestoFile
            ? {
                dataBase64: editManifestoFile.dataBase64,
                mimeType: editManifestoFile.mimeType,
                fileName: editManifestoFile.fileName,
              }
            : undefined,
        }),
      });

      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setStatusMessage({ type: 'error', text: data.message || 'Could not update candidate.' });
        return;
      }

      setEditingId(null);
      setStatusMessage({ type: 'success', text: `Updated profile and manifesto for "${editName.trim()}".` });
      await onChanged();
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while updating candidate.' });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRemoveCandidate = async (candidateId: string, name: string) => {
    setStatusMessage(null);
    setIsRemovingId(candidateId);
    try {
      const response = await fetch(`/api/admin/candidates/${encodeURIComponent(candidateId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setStatusMessage({ type: 'error', text: data.message || 'Could not remove candidate.' });
        return;
      }
      setConfirmRemoveId(null);
      if (editingId === candidateId) setEditingId(null);
      setStatusMessage({ type: 'success', text: `Removed candidate "${name}" from the ballot.` });
      await onChanged();
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error while removing candidate.' });
    } finally {
      setIsRemovingId(null);
    }
  };

  return (
    <section aria-label="Candidate Roster, Photos & Manifestos" className="rounded-xl border border-slate-800/90 bg-[#0B1120] p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-4">
        <div>
          <h2 className="font-[Outfit] text-xl font-semibold text-white">
            Manage Candidates, Photos &amp; Manifestos
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Add or remove candidates, upload candidate photographs (PNG/JPG/WEBP), and publish candidate manifestos.
          </p>
        </div>
        <span className="font-mono text-xs text-slate-400 tabular-nums">
          {candidates.length} on ballot
        </span>
      </div>

      {statusMessage && (
        <div
          role={statusMessage.type === 'success' ? 'status' : 'alert'}
          className={`flex items-start gap-2.5 rounded-lg border px-4 py-3 text-sm ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-100'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Add New Candidate Form */}
      <form onSubmit={handleAddCandidate} className="rounded-xl border border-slate-800 bg-[#070B16] p-5 space-y-4">
        <h3 className="font-[Outfit] text-base font-semibold text-white flex items-center gap-2">
          <Plus className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          <span>Add New Candidate</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="new-candidate-name" className="block text-xs font-medium text-slate-300">
              Candidate Name
            </label>
            <input
              id="new-candidate-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter full candidate name"
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label htmlFor="new-candidate-photo" className="block text-xs font-medium text-slate-300">
              Candidate Photo (Optional · PNG, JPG, WEBP)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label
                htmlFor="new-candidate-photo"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white"
              >
                <ImagePlus className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                <span>{newPhoto ? newPhoto.fileName : 'Choose Photo'}</span>
              </label>
              <input
                id="new-candidate-photo"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const encoded = await readFileAsBase64(file);
                    setNewPhoto(encoded);
                  } catch {
                    setStatusMessage({ type: 'error', text: 'Could not read selected photo file.' });
                  }
                }}
              />
              {newPhoto && (
                <button
                  type="button"
                  onClick={() => setNewPhoto(null)}
                  className="text-xs text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="new-candidate-manifesto" className="block text-xs font-medium text-slate-300">
              Candidate Manifesto Text (Optional)
            </label>
            <textarea
              id="new-candidate-manifesto"
              rows={3}
              value={newManifestoText}
              onChange={(e) => setNewManifestoText(e.target.value)}
              placeholder="Write or paste the candidate's manifesto platform..."
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          <div>
            <label htmlFor="new-candidate-manifesto-file" className="block text-xs font-medium text-slate-300">
              Upload Manifesto Document (Optional · PDF, TXT, MD)
            </label>
            <div className="mt-1.5 flex items-center gap-3">
              <label
                htmlFor="new-candidate-manifesto-file"
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white"
              >
                <Upload className="h-4 w-4 text-blue-400" aria-hidden="true" />
                <span>{newManifestoFile ? newManifestoFile.fileName : 'Upload Manifesto File'}</span>
              </label>
              <input
                id="new-candidate-manifesto-file"
                type="file"
                accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const encoded = await readFileAsBase64(file);
                    setNewManifestoFile(encoded);
                  } catch {
                    setStatusMessage({ type: 'error', text: 'Could not read selected manifesto file.' });
                  }
                }}
              />
              {newManifestoFile && (
                <button
                  type="button"
                  onClick={() => setNewManifestoFile(null)}
                  className="text-xs text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Text or Markdown uploads automatically populate the manifesto text preview when left blank.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isAdding}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
          >
            {isAdding && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
            <span>{isAdding ? 'Adding Candidate...' : 'Add Candidate to Ballot'}</span>
          </button>
        </div>
      </form>

      {/* Existing Candidates List */}
      <div className="space-y-3">
        {candidates.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-800 bg-[#060914] p-8 text-center text-sm text-slate-400">
            No candidates are currently registered on the ballot. Add a candidate above to begin.
          </div>
        ) : (
          candidates.map((candidate) => {
            const isEditing = editingId === candidate.id;
            const isConfirmingRemove = confirmRemoveId === candidate.id;

            return (
              <div
                key={candidate.id}
                className="rounded-xl border border-slate-800/90 bg-[#070B16] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4 min-w-0">
                    <CandidatePortrait
                      name={candidate.name}
                      photoUrl={candidate.photoUrl}
                      ballotNumber={candidate.ballotNumber}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-mono tabular-nums">Ballot #0{candidate.ballotNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{candidate.votes} votes</span>
                      </div>
                      <h3 className="mt-0.5 font-[Outfit] text-lg font-semibold text-white truncate">
                        {candidate.name}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 truncate">
                        {candidate.manifestoText
                          ? `Manifesto: ${candidate.manifestoText.slice(0, 72)}${candidate.manifestoText.length > 72 ? '...' : ''}`
                          : candidate.manifestoOriginalName
                            ? `Manifesto file: ${candidate.manifestoOriginalName}`
                            : 'No manifesto uploaded yet'}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => (isEditing ? cancelEditing() : startEditing(candidate))}
                      className="rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 hover:text-white cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {isEditing ? 'Cancel Edit' : 'Photo & Manifesto'}
                    </button>

                    {!isConfirmingRemove ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRemoveId(candidate.id)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-950/20 px-3 py-2 text-xs font-medium text-rose-200 hover:bg-rose-950/40 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Remove</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isRemovingId === candidate.id}
                          onClick={() => handleRemoveCandidate(candidate.id, candidate.name)}
                          className="rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                        >
                          {isRemovingId === candidate.id ? 'Removing...' : 'Confirm Remove'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRemoveId(null)}
                          className="rounded-lg border border-slate-700 px-2.5 py-2 text-xs text-slate-300 hover:text-white cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Edit Drawer for Photo & Manifesto */}
                {isEditing && (
                  <form
                    onSubmit={(e) => handleSaveEdit(e, candidate.id)}
                    className="mt-5 border-t border-slate-800 pt-5 space-y-4"
                  >
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label htmlFor={`edit-name-${candidate.id}`} className="block text-xs font-medium text-slate-300">
                          Candidate Name
                        </label>
                        <input
                          id={`edit-name-${candidate.id}`}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label htmlFor={`edit-photo-${candidate.id}`} className="block text-xs font-medium text-slate-300">
                          Upload / Replace Candidate Photo (PNG, JPG, WEBP)
                        </label>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
                          <label
                            htmlFor={`edit-photo-${candidate.id}`}
                            className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                          >
                            <ImagePlus className="h-3.5 w-3.5 text-indigo-400" aria-hidden="true" />
                            <span>{editPhoto ? editPhoto.fileName : 'Upload Photo'}</span>
                          </label>
                          <input
                            id={`edit-photo-${candidate.id}`}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="sr-only"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const encoded = await readFileAsBase64(file);
                              setEditPhoto(encoded);
                              setClearEditPhoto(false);
                            }}
                          />
                          {(candidate.photoUrl || editPhoto) && !clearEditPhoto && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditPhoto(null);
                                setClearEditPhoto(true);
                              }}
                              className="text-xs text-rose-300 hover:text-rose-200 cursor-pointer"
                            >
                              Remove Photo
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label htmlFor={`edit-manifesto-${candidate.id}`} className="block text-xs font-medium text-slate-300">
                        Candidate Manifesto
                      </label>
                      <textarea
                        id={`edit-manifesto-${candidate.id}`}
                        rows={4}
                        value={editManifestoText}
                        onChange={(e) => setEditManifestoText(e.target.value)}
                        placeholder="Enter the candidate's full manifesto text..."
                        className="mt-1.5 w-full rounded-lg border border-slate-700 bg-[#060914] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-3">
                        <label
                          htmlFor={`edit-manifesto-file-${candidate.id}`}
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500"
                        >
                          <FileText className="h-3.5 w-3.5 text-blue-400" aria-hidden="true" />
                          <span>
                            {editManifestoFile
                              ? editManifestoFile.fileName
                              : candidate.manifestoOriginalName
                                ? `Replace (${candidate.manifestoOriginalName})`
                                : 'Upload Manifesto File (PDF/TXT/MD)'}
                          </span>
                        </label>
                        <input
                          id={`edit-manifesto-file-${candidate.id}`}
                          type="file"
                          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
                          className="sr-only"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const encoded = await readFileAsBase64(file);
                            setEditManifestoFile(encoded);
                            setClearEditManifestoFile(false);
                          }}
                        />
                        {(candidate.manifestoUrl || editManifestoFile) && !clearEditManifestoFile && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditManifestoFile(null);
                              setClearEditManifestoFile(true);
                            }}
                            className="text-xs text-rose-300 hover:text-rose-200 cursor-pointer"
                          >
                            Remove Document
                          </button>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isSavingEdit}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2 text-xs font-semibold text-white hover:from-indigo-500 hover:to-blue-500 disabled:opacity-60 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        {isSavingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        <span>{isSavingEdit ? 'Saving...' : 'Save Candidate Profile'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
