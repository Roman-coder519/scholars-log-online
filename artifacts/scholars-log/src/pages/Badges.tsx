import { useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Lock, Star, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useListBadges,
  useCheckBadges,
  useMarkBadgeSeen,
  getListBadgesQueryKey,
} from "@workspace/api-client-react";
import type { Badge } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORY_ICONS: Record<string, string> = {
  first_task: "✅",
  focus_5: "🎯",
  focus_10: "🔥",
  focus_25: "⚡",
  streak_3: "🌱",
  streak_7: "🌟",
  streak_30: "💎",
  habit_week: "🏆",
  grade_a: "📚",
  note_taker: "📝",
  flashcard_10: "🃏",
  early_bird: "🌅",
};

export default function Badges() {
  const qc = useQueryClient();
  const { data: badges = [], isLoading } = useListBadges();
  const checkBadges = useCheckBadges({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBadgesQueryKey() }); } } });
  const markSeen = useMarkBadgeSeen({ mutation: { onSuccess: () => { qc.invalidateQueries({ queryKey: getListBadgesQueryKey() }); } } });

  // Auto-check on page load
  useEffect(() => { checkBadges.mutate(); }, []);

  // Auto-mark newly earned (unseen) badges as seen after a delay
  useEffect(() => {
    const unseen = badges.filter(b => b.earnedAt && !b.seen);
    if (unseen.length === 0) return;
    const t = setTimeout(() => {
      unseen.forEach(b => markSeen.mutate({ type: b.type }));
    }, 3000);
    return () => clearTimeout(t);
  }, [badges]);

  const earned = badges.filter(b => b.earnedAt);
  const unearned = badges.filter(b => !b.earnedAt);
  const newlyEarned = badges.filter(b => b.earnedAt && !b.seen);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Badges</h1>
          <p className="text-sm text-muted-foreground">{earned.length} / {badges.length} earned</p>
        </div>
        <Button variant="outline" size="sm" disabled={checkBadges.isPending} onClick={() => checkBadges.mutate()}>
          <Zap className="w-4 h-4 mr-2" /> Check Progress
        </Button>
      </div>

      {/* Newly earned banner */}
      {newlyEarned.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-primary flex-shrink-0" />
          <div>
            <p className="font-semibold text-primary text-sm">New badge{newlyEarned.length > 1 ? "s" : ""} earned!</p>
            <p className="text-xs text-muted-foreground">{newlyEarned.map(b => b.name).join(", ")}</p>
          </div>
        </motion.div>
      )}

      {/* Progress bar */}
      {badges.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-foreground">Overall Progress</p>
            <p className="text-sm text-muted-foreground">{Math.round((earned.length / badges.length) * 100)}%</p>
          </div>
          <div className="bg-muted rounded-full h-2.5">
            <motion.div className="bg-primary h-2.5 rounded-full" initial={{ width: 0 }}
              animate={{ width: `${(earned.length / badges.length) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
          </div>
        </div>
      )}

      {/* Earned Badges */}
      {earned.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Earned ({earned.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {earned.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} isNew={!badge.seen} />
            ))}
          </div>
        </div>
      )}

      {/* Locked Badges */}
      {unearned.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Locked ({unearned.length})</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {unearned.map((badge, i) => (
              <BadgeCard key={badge.id} badge={badge} index={i} locked />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {isLoading && badges.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Loading badges...</p>
        </div>
      )}
    </div>
  );
}

function BadgeCard({ badge, index, locked = false, isNew = false }: { badge: Badge; index: number; locked?: boolean; isNew?: boolean }) {
  const emoji = CATEGORY_ICONS[badge.type] ?? "🏅";
  return (
    <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn(
        "rounded-2xl border p-4 flex flex-col items-center text-center gap-2 relative transition-all",
        locked ? "bg-muted/30 border-border opacity-60" : "bg-card border-border hover:border-primary/40 hover:shadow-md",
        isNew && "border-primary/50 ring-2 ring-primary/20"
      )}>
      {isNew && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full px-1.5 py-0.5 uppercase tracking-wide">
          New!
        </div>
      )}
      <div className={cn(
        "w-14 h-14 rounded-2xl flex items-center justify-center text-3xl",
        locked ? "bg-muted" : "bg-primary/10"
      )}>
        {locked ? <Lock className="w-6 h-6 text-muted-foreground" /> : <span>{emoji}</span>}
      </div>
      <div>
        <p className={cn("font-semibold text-sm leading-tight", locked ? "text-muted-foreground" : "text-foreground")}>{badge.name}</p>
        <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{badge.description}</p>
      </div>
      {badge.earnedAt && (
        <p className="text-[10px] text-primary font-medium">
          {new Date(badge.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </p>
      )}
    </motion.div>
  );
}
