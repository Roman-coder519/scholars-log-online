import { useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateSettings, getGetSettingsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { COUNTRIES } from "@/lib/countries";

interface LoginProps {
  onComplete: () => void;
}

export default function Login({ onComplete }: LoginProps) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("United States");
  const [step, setStep] = useState<"welcome" | "setup">("welcome");
  const updateSettings = useUpdateSettings();

  function handleStart() {
    if (!name.trim()) return;
    updateSettings.mutate({
      data: {
        userName: name.trim(),
        country,
        city: COUNTRIES.find(c => c.name === country)?.city ?? "New York",
        prayerCalculationMethod: 2,
        showPrayerTimes: true,
        weekStartsOn: "monday",
        theme: "light",
      }
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        onComplete();
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        className="w-full max-w-md">

        {step === "welcome" && (
          <motion.div key="welcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="text-center space-y-8">
            {/* Logo */}
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1, duration: 0.4 }}
              className="flex flex-col items-center gap-4">
              <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-2xl shadow-primary/30">
                <BookOpen className="w-10 h-10 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-display font-bold text-foreground">Scholar's Log</h1>
                <p className="text-muted-foreground mt-1">Your personal student productivity hub</p>
              </div>
            </motion.div>

            {/* Features list */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="grid grid-cols-2 gap-3 text-left">
              {[
                { emoji: "✅", label: "Tasks & Deadlines" },
                { emoji: "🔥", label: "Habit Tracking" },
                { emoji: "📊", label: "Grade Book" },
                { emoji: "🕌", label: "Prayer Times" },
                { emoji: "🃏", label: "Flashcards" },
                { emoji: "🏆", label: "Badges & Goals" },
              ].map((f) => (
                <div key={f.label} className="flex items-center gap-2.5 bg-card border border-border rounded-xl px-3 py-2.5">
                  <span className="text-lg">{f.emoji}</span>
                  <span className="text-sm font-medium text-foreground/80">{f.label}</span>
                </div>
              ))}
            </motion.div>

            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <Button size="lg" className="w-full h-12 text-base font-semibold gap-2" onClick={() => setStep("setup")}>
                Get Started <ArrowRight className="w-5 h-5" />
              </Button>
            </motion.div>
          </motion.div>
        )}

        {step === "setup" && (
          <motion.div key="setup" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }}
            className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">Set up your profile</h2>
                <p className="text-sm text-muted-foreground">Just two quick things</p>
              </div>
            </div>

            <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
              {/* Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Your Name</label>
                <Input
                  placeholder="e.g. Ahmad, Sara, Mohammed..."
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && name.trim() && handleStart()}
                  autoFocus
                  className="h-11"
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Your Country</label>
                <p className="text-xs text-muted-foreground">Used to calculate accurate prayer times</p>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {COUNTRIES.map(c => (
                      <SelectItem key={c.name} value={c.name}>{c.flag} {c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button size="lg" className="w-full h-11 font-semibold gap-2 mt-2"
                disabled={!name.trim() || updateSettings.isPending}
                onClick={handleStart}>
                {updateSettings.isPending ? "Setting up..." : "Enter Scholar's Log"} <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            <button onClick={() => setStep("welcome")} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back
            </button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
