import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Edit2, ChevronLeft, ChevronRight, CreditCard, BookOpen, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  useListFlashcardSets,
  useCreateFlashcardSet,
  useDeleteFlashcardSet,
  useGetFlashcardSet,
  useCreateFlashcard,
  useUpdateFlashcard,
  useDeleteFlashcard,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListFlashcardSetsQueryKey, getGetFlashcardSetQueryKey } from "@workspace/api-client-react";

type View = "sets" | "cards" | "study";

export default function Flashcards() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("sets");
  const [selectedSetId, setSelectedSetId] = useState<number | null>(null);
  const [studyIndex, setStudyIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Set creation
  const [showSetForm, setShowSetForm] = useState(false);
  const [setTitle, setSetTitle] = useState("");
  const [setSubject, setSetSubject] = useState("");

  // Card creation/edit
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<{ id: number; front: string; back: string } | null>(null);
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  const { data: sets = [] } = useListFlashcardSets();
  const { data: selectedSet } = useGetFlashcardSet(selectedSetId ?? 0, { query: { enabled: selectedSetId !== null, queryKey: getGetFlashcardSetQueryKey(selectedSetId ?? 0) } });

  const createSet = useCreateFlashcardSet({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() }); setShowSetForm(false); setSetTitle(""); setSetSubject(""); } } });
  const deleteSet = useDeleteFlashcardSet({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() }); setView("sets"); setSelectedSetId(null); } } });
  const createCard = useCreateFlashcard({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetFlashcardSetQueryKey(selectedSetId ?? 0) }); qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() }); setShowCardForm(false); setCardFront(""); setCardBack(""); } } });
  const updateCard = useUpdateFlashcard({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetFlashcardSetQueryKey(selectedSetId ?? 0) }); setEditingCard(null); setCardFront(""); setCardBack(""); } } });
  const deleteCard = useDeleteFlashcard({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetFlashcardSetQueryKey(selectedSetId ?? 0) }); qc.invalidateQueries({ queryKey: getListFlashcardSetsQueryKey() }); } } });

  const cards = selectedSet?.cards ?? [];
  const currentCard = cards[studyIndex];

  function openSet(id: number) {
    setSelectedSetId(id);
    setView("cards");
    setStudyIndex(0);
    setFlipped(false);
  }

  function startStudy() {
    if (cards.length === 0) return;
    setStudyIndex(0);
    setFlipped(false);
    setView("study");
  }

  function handleSaveCard() {
    if (!cardFront.trim() || !cardBack.trim() || !selectedSetId) return;
    if (editingCard) {
      updateCard.mutate({ setId: selectedSetId, cardId: editingCard.id, data: { front: cardFront, back: cardBack } });
    } else {
      createCard.mutate({ id: selectedSetId, data: { front: cardFront, back: cardBack } });
    }
  }

  function openEditCard(card: { id: number; front: string; back: string }) {
    setEditingCard(card);
    setCardFront(card.front);
    setCardBack(card.back);
    setShowCardForm(true);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {view !== "sets" && (
            <button onClick={() => { setView(view === "study" ? "cards" : "sets"); setFlipped(false); }} className="text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {view === "sets" ? "Flashcards" : view === "cards" ? selectedSet?.title ?? "Set" : "Study Mode"}
            </h1>
            {view === "sets" && <p className="text-sm text-muted-foreground">{sets.length} set{sets.length !== 1 ? "s" : ""}</p>}
            {view === "cards" && <p className="text-sm text-muted-foreground">{cards.length} card{cards.length !== 1 ? "s" : ""}</p>}
            {view === "study" && <p className="text-sm text-muted-foreground">{studyIndex + 1} / {cards.length}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          {view === "cards" && cards.length > 0 && (
            <Button variant="outline" size="sm" onClick={startStudy}>
              <BookOpen className="w-4 h-4 mr-2" /> Study
            </Button>
          )}
          {view === "sets" && (
            <Button size="sm" onClick={() => setShowSetForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> New Set
            </Button>
          )}
          {view === "cards" && (
            <Button size="sm" onClick={() => { setEditingCard(null); setCardFront(""); setCardBack(""); setShowCardForm(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Add Card
            </Button>
          )}
        </div>
      </div>

      {/* Create Set Form */}
      <AnimatePresence>
        {showSetForm && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-foreground">New Flashcard Set</h3>
            <Input placeholder="Title (e.g. Biology Chapter 3)" value={setTitle} onChange={e => setSetTitle(e.target.value)} />
            <Input placeholder="Subject (optional)" value={setSubject} onChange={e => setSetSubject(e.target.value)} />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowSetForm(false)}>Cancel</Button>
              <Button size="sm" disabled={!setTitle.trim() || createSet.isPending} onClick={() => createSet.mutate({ data: { title: setTitle, subject: setSubject || undefined } })}>
                Create Set
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sets Grid */}
      {view === "sets" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sets.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No flashcard sets yet</p>
              <p className="text-sm">Create a set to start studying</p>
            </div>
          )}
          {sets.map(set => (
            <motion.div key={set.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              onClick={() => openSet(set.id)}
              className="bg-card border border-border rounded-xl p-5 cursor-pointer hover:border-primary/40 hover:shadow-md transition-all group relative">
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={e => { e.stopPropagation(); deleteSet.mutate({ id: set.id }); }}
                  className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-foreground leading-tight">{set.title}</p>
              {set.subject && <p className="text-xs text-muted-foreground mt-0.5">{set.subject}</p>}
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">{set.cardCount} card{set.cardCount !== 1 ? "s" : ""}</Badge>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Cards View */}
      {view === "cards" && (
        <div className="space-y-3">
          {/* Add/Edit Card Form */}
          <AnimatePresence>
            {showCardForm && (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-foreground">{editingCard ? "Edit Card" : "New Card"}</h3>
                <Textarea placeholder="Front (question/term)" value={cardFront} onChange={e => setCardFront(e.target.value)} rows={2} />
                <Textarea placeholder="Back (answer/definition)" value={cardBack} onChange={e => setCardBack(e.target.value)} rows={2} />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => { setShowCardForm(false); setEditingCard(null); }}>Cancel</Button>
                  <Button size="sm" disabled={!cardFront.trim() || !cardBack.trim()} onClick={handleSaveCard}>
                    {editingCard ? "Save" : "Add Card"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {cards.length === 0 && !showCardForm && (
            <div className="text-center py-16 text-muted-foreground">
              <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No cards yet</p>
              <p className="text-sm">Add your first card to this set</p>
            </div>
          )}
          {cards.map((card, i) => (
            <motion.div key={card.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="bg-card border border-border rounded-xl p-4 flex items-start gap-4 group">
              <div className="flex-1 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Front</p>
                  <p className="text-sm text-foreground">{card.front}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Back</p>
                  <p className="text-sm text-foreground">{card.back}</p>
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <button onClick={() => openEditCard(card)} className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => deleteCard.mutate({ setId: selectedSetId!, cardId: card.id })} className="p-1.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Study Mode */}
      {view === "study" && currentCard && (
        <div className="flex flex-col items-center gap-6 py-4">
          {/* Progress bar */}
          <div className="w-full max-w-lg bg-muted rounded-full h-1.5">
            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${((studyIndex + 1) / cards.length) * 100}%` }} />
          </div>

          {/* Flashcard */}
          <div className="w-full max-w-lg" style={{ perspective: 1200 }}>
            <motion.div
              onClick={() => setFlipped(!flipped)}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
              className="relative w-full cursor-pointer"
              style={{ transformStyle: "preserve-3d", minHeight: 260 }}
            >
              {/* Front */}
              <div className="absolute inset-0 bg-card border-2 border-border rounded-2xl flex flex-col items-center justify-center p-8 text-center"
                style={{ backfaceVisibility: "hidden" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Question</p>
                <p className="text-xl font-semibold text-foreground leading-snug">{currentCard.front}</p>
                <p className="text-xs text-muted-foreground mt-6">Click to reveal answer</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 bg-primary/5 border-2 border-primary/30 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
                style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mb-4">Answer</p>
                <p className="text-xl font-semibold text-foreground leading-snug">{currentCard.back}</p>
              </div>
            </motion.div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" disabled={studyIndex === 0} onClick={() => { setStudyIndex(i => i - 1); setFlipped(false); }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground font-medium">{studyIndex + 1} / {cards.length}</span>
            {studyIndex < cards.length - 1 ? (
              <Button variant="outline" size="sm" onClick={() => { setStudyIndex(i => i + 1); setFlipped(false); }}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => { setStudyIndex(0); setFlipped(false); }}>
                <Check className="w-4 h-4 mr-2" /> Restart
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
