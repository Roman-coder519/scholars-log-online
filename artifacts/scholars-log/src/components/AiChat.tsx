import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useGetOpenaiConversation,
  useDeleteOpenaiConversation,
  getListOpenaiConversationsQueryKey,
  getGetOpenaiConversationQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

function MessageBubble({ msg }: { msg: Message }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
    >
      <div className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
        msg.role === "user"
          ? "bg-primary text-primary-foreground rounded-tr-sm"
          : "bg-muted text-foreground rounded-tl-sm"
      )}>
        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
        {msg.streaming && <span className="inline-block w-1.5 h-4 bg-current animate-pulse ml-0.5 align-text-bottom rounded-sm" />}
      </div>
    </motion.div>
  );
}

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const abortRef = useRef<AbortController | null>(null);

  const { data: convList = [] } = useListOpenaiConversations({ query: { queryKey: getListOpenaiConversationsQueryKey() } });
  const { data: convData } = useGetOpenaiConversation(activeConvId!, {
    query: { queryKey: getGetOpenaiConversationQueryKey(activeConvId!), enabled: !!activeConvId },
  });
  const createConv = useCreateOpenaiConversation();
  const deleteConv = useDeleteOpenaiConversation();

  useEffect(() => {
    if (convData) {
      setLocalMessages(convData.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })));
    }
  }, [convData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  async function ensureConversation(): Promise<number> {
    if (activeConvId) return activeConvId;
    return new Promise((resolve) => {
      createConv.mutate({ data: { title: "New Chat" } }, {
        onSuccess: (conv) => {
          setActiveConvId(conv.id);
          queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
          resolve(conv.id);
        },
      });
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const convId = await ensureConversation();

    setLocalMessages(prev => [...prev, { role: "user", content: text }]);
    setLocalMessages(prev => [...prev, { role: "assistant", content: "", streaming: true }]);
    setStreaming(true);

    const abort = new AbortController();
    abortRef.current = abort;

    try {
      const res = await fetch(`/api/openai/conversations/${convId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
        signal: abort.signal,
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (!reader) throw new Error("No stream");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const evt = JSON.parse(line.slice(6));
            if (evt.content) {
              setLocalMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) updated[updated.length - 1] = { ...last, content: last.content + evt.content };
                return updated;
              });
            }
            if (evt.done) {
              setLocalMessages(prev => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
                return updated;
              });
              queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(convId) });
            }
          } catch {}
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setLocalMessages(prev => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.streaming) updated[updated.length - 1] = { role: "assistant", content: "Sorry, something went wrong. Please try again.", streaming: false };
          return updated;
        });
      }
    } finally {
      setStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function newChat() {
    setActiveConvId(null);
    setLocalMessages([]);
    setInput("");
  }

  function handleDeleteConv(id: number) {
    deleteConv.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
        if (activeConvId === id) newChat();
      },
    });
  }

  const suggestedPrompts = [
    "Help me prioritize today's tasks",
    "How can I improve my study habits?",
    "Create a study schedule for my deadlines",
    "Tips for remembering what I study",
  ];

  return (
    <>
      {/* Floating button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center"
        data-testid="button-open-chat"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-5 h-5" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}>
              <MessageSquare className="w-5 h-5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-80 h-[520px] flex flex-col bg-card border border-border rounded-2xl shadow-xl overflow-hidden"
            data-testid="chat-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div>
                <p className="font-semibold text-sm">Study Assistant</p>
                <p className="text-xs text-muted-foreground">Powered by AI</p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={newChat} data-testid="button-new-chat">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {localMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center gap-4">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-primary opacity-60" />
                    <p className="text-sm font-medium">Your AI study assistant</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask anything about your studies</p>
                  </div>
                  <div className="w-full space-y-1.5">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                        className="w-full text-left text-xs px-3 py-2 rounded-lg border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        data-testid={`prompt-suggestion-${i}`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {localMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="p-3 border-t border-border">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your study assistant..."
                  rows={1}
                  className="flex-1 resize-none text-sm bg-muted/50 rounded-xl px-3 py-2 border border-border focus:outline-none focus:ring-1 focus:ring-primary max-h-24 min-h-[36px]"
                  style={{ height: "auto" }}
                  data-testid="input-chat-message"
                />
                <Button
                  size="icon"
                  className="h-9 w-9 flex-shrink-0"
                  onClick={sendMessage}
                  disabled={!input.trim() || streaming}
                  data-testid="button-send-message"
                >
                  {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
