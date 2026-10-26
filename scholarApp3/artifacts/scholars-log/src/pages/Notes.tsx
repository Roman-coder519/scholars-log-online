import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, Pin, PinOff, Search, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useListNotes,
  useCreateNote,
  useUpdateNote,
  useDeleteNote,
  getListNotesQueryKey,
} from "@workspace/api-client-react";
import type { Note } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const NOTE_COLORS = [
  { key: "default", label: "Default", bg: "bg-card", border: "border-border" },
  { key: "yellow", label: "Yellow", bg: "bg-yellow-50 dark:bg-yellow-950/30", border: "border-yellow-200 dark:border-yellow-800" },
  { key: "blue", label: "Blue", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800" },
  { key: "green", label: "Green", bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800" },
  { key: "pink", label: "Pink", bg: "bg-pink-50 dark:bg-pink-950/30", border: "border-pink-200 dark:border-pink-800" },
  { key: "purple", label: "Purple", bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800" },
];

function colorStyle(color: string) {
  return NOTE_COLORS.find(c => c.key === color) ?? NOTE_COLORS[0];
}

export default function Notes() {
  const qc = useQueryClient();
  const { data: notes = [] } = useListNotes();

  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");
  const [color, setColor] = useState("default");

  const createNote = useCreateNote({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotesQueryKey() }); resetForm(); } } });
  const updateNote = useUpdateNote({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotesQueryKey() }); resetForm(); } } });
  const deleteNote = useDeleteNote({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotesQueryKey() }); } } });

  function resetForm() {
    setShowForm(false);
    setEditing(null);
    setTitle("");
    setContent("");
    setSubject("");
    setColor("default");
  }

  function openEdit(note: Note) {
    setEditing(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject ?? "");
    setColor(note.color);
    setShowForm(true);
  }

  function openNew() {
    setEditing(null);
    setTitle("");
    setContent("");
    setSubject("");
    setColor("default");
    setShowForm(true);
  }

  function handleSave() {
    if (!title.trim()) return;
    const data = { title, content, subject: subject || undefined, color, pinned: editing?.pinned ?? false };
    if (editing) {
      updateNote.mutate({ id: editing.id, data });
    } else {
      createNote.mutate({ data });
    }
  }

  function togglePin(note: Note) {
    updateNote.mutate({ id: note.id, data: { title: note.title, content: note.content, subject: note.subject ?? undefined, color: note.color, pinned: !note.pinned } });
    qc.invalidateQueries({ queryKey: getListNotesQueryKey() });
  }

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    (n.subject ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const pinned = filtered.filter(n => n.pinned);
  const unpinned = filtered.filter(n => !n.pinned);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground">{notes.length} note{notes.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" /> New Note
        </Button>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search notes..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      )}

      {/* Note Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 16 }}
              className="bg-background border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 space-y-4">
              <h3 className="font-display font-semibold text-lg">{editing ? "Edit Note" : "New Note"}</h3>
              <Input placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Write your note here..." value={content} onChange={e => setContent(e.target.value)} rows={6} className="resize-none" />
              <Input placeholder="Subject (optional)" value={subject} onChange={e => setSubject(e.target.value)} />
              {/* Color picker */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Color</p>
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map(c => (
                    <button key={c.key} onClick={() => setColor(c.key)}
                      className={cn("w-7 h-7 rounded-full border-2 transition-all", c.bg, color === c.key ? "border-primary scale-110" : "border-border hover:scale-105")}
                      title={c.label} />
                  ))}
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" size="sm" onClick={resetForm}>Cancel</Button>
                <Button size="sm" disabled={!title.trim() || createNote.isPending || updateNote.isPending} onClick={handleSave}>
                  {editing ? "Save" : "Create"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {notes.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notes yet</p>
          <p className="text-sm">Click "New Note" to capture your thoughts</p>
        </div>
      )}

      {/* Pinned notes */}
      {pinned.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Pinned</p>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {pinned.map(note => <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={id => deleteNote.mutate({ id })} onTogglePin={togglePin} />)}
          </div>
        </div>
      )}

      {/* All notes */}
      {unpinned.length > 0 && (
        <div>
          {pinned.length > 0 && <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Other Notes</p>}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {unpinned.map(note => <NoteCard key={note.id} note={note} onEdit={openEdit} onDelete={id => deleteNote.mutate({ id })} onTogglePin={togglePin} />)}
          </div>
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onEdit, onDelete, onTogglePin }: { note: Note; onEdit: (n: Note) => void; onDelete: (id: number) => void; onTogglePin: (n: Note) => void }) {
  const style = colorStyle(note.color);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className={cn("break-inside-avoid rounded-xl border p-4 group relative cursor-pointer hover:shadow-md transition-all", style.bg, style.border)}
      onClick={() => onEdit(note)}>
      {/* Actions */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={() => onTogglePin(note)} className="p-1.5 rounded-lg bg-background/70 text-muted-foreground hover:text-primary transition-colors">
          {note.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        </button>
        <button onClick={() => onEdit(note)} className="p-1.5 rounded-lg bg-background/70 text-muted-foreground hover:text-primary transition-colors">
          <Edit2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onDelete(note.id)} className="p-1.5 rounded-lg bg-background/70 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-start gap-2 mb-2 pr-16">
        <p className="font-semibold text-sm text-foreground leading-tight">{note.title}</p>
        {note.pinned && <Pin className="w-3 h-3 text-primary flex-shrink-0 mt-0.5" />}
      </div>
      {note.content && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">{note.content}</p>}
      {note.subject && <Badge variant="secondary" className="mt-3 text-[10px]">{note.subject}</Badge>}
      <p className="text-[10px] text-muted-foreground/50 mt-2">
        {new Date(note.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
      </p>
    </motion.div>
  );
}
