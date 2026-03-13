/**
 * TECHOFFICE ERP v4.0 — المرحلة السادسة: مكونات الواجهة
 * ════════════════════════════════════════════════════════
 * يضاف هذا الملف إلى techoffice-erp-v4-phases4-5.jsx
 *
 * يتضمن:
 * ① ETABadge        — شارة حالة ETA في جدول المستخلصات
 * ② ETASubmitModal  — نافذة تأكيد وإرسال الفاتورة الإلكترونية
 * ③ ETAStatusCard   — بطاقة تتبع حالة الإرسال
 * ④ AIChatScreen    — شاشة المساعد الذكي الكاملة
 * ⑤ AIChatFAB       — زر عائم للوصول السريع
 */

import { useState, useRef, useEffect, useCallback } from "react"

// ═══════════════════════════════════════════════════════════════
// Design System (نسخة مختصرة من الأصل)
// ═══════════════════════════════════════════════════════════════
const C = {
  bg: "#040507", card: "#0b0d12", brand: "#f59e0b",
  success: "#22c55e", danger: "#ef4444", warning: "#f97316",
  info: "#38bdf8", purple: "#a78bfa", teal: "#2dd4bf",
  text: "#e4e8f0", textSub: "#7a859e", muted: "#40495e",
  border: "#1a1e2e",
}

const fmt = (n, d = 0) =>
  n == null || isNaN(n) ? "—"
    : new Intl.NumberFormat("ar-EG", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n)

// ═══════════════════════════════════════════════════════════════
// ① ETABadge — شارة حالة ETA
// ═══════════════════════════════════════════════════════════════
export function ETABadge({ status, submissionId }) {
  const map = {
    null: { label: "لم تُرسل", color: C.muted, bg: "#40495e22" },
    undefined: { label: "لم تُرسل", color: C.muted, bg: "#40495e22" },
    SUBMITTED: { label: "قيد المعالجة ⏳", color: C.info, bg: C.info + "22" },
    Valid: { label: "مقبولة ✓", color: C.success, bg: C.success + "22" },
    Invalid: { label: "مرفوضة ✗", color: C.danger, bg: C.danger + "22" },
    Cancelled: { label: "ملغية", color: C.muted, bg: "#40495e22" },
  }

  const { label, color, bg } = map[status] ?? map[null]

  return (
    <span
      style={{
        background: bg, color, borderRadius: 4, padding: "2px 8px",
        fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
        cursor: submissionId ? "pointer" : "default",
      }}
      title={submissionId ? `Submission ID: ${submissionId}` : ""}
    >
      {label}
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// ② ETASubmitModal — نافذة إرسال الفاتورة الإلكترونية
// ═══════════════════════════════════════════════════════════════
export function ETASubmitModal({ extract, project, onClose, onSuccess }) {
  const [step, setStep] = useState("confirm") // confirm | submitting | success | error
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // حساب ملخص الفاتورة
  const vatBase = Math.max(0,
    extract.grossTotal - extract.retentionThisExtract -
    extract.advanceRecoveryActual - extract.fines
  )
  const vat = vatBase * 0.14
  const total = vatBase + vat

  async function handleSubmit() {
    setStep("submitting")
    setError(null)
    try {
      const res = await fetch("/api/eta/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ extractId: extract.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setResult(data)
      setStep("success")
      onSuccess?.(data)
    } catch (err) {
      setError(err.message)
      setStep("error")
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "#000000cc",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999, padding: 24,
    }}>
      <div style={{
        background: C.card, borderRadius: 16, padding: 32,
        width: "100%", maxWidth: 520, border: `1px solid ${C.border}`,
      }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>
              🧾 إرسال فاتورة إلكترونية
            </div>
            <div style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>
              هيئة الضرائب المصرية (ETA e-Invoice)
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: C.textSub, fontSize: 22, cursor: "pointer" }}
          >×</button>
        </div>

        {step === "confirm" && (
          <>
            {/* ملخص المستخلص */}
            <div style={{
              background: "#ffffff08", borderRadius: 10, padding: 16,
              marginBottom: 20, border: `1px solid ${C.border}`,
            }}>
              <Row label="المشروع" value={project.code + " — " + project.name.slice(0, 30)} />
              <Row label="رقم المستخلص" value={`مستخلص ${extract.number}`} />
              <Row label="الإجمالي الخاضع للضريبة" value={fmt(vatBase) + " ج.م"} />
              <Row label="ضريبة القيمة المضافة (14%)" value={fmt(vat) + " ج.م"} color={C.warning} />
              <div style={{ borderTop: `1px solid ${C.border}`, marginTop: 12, paddingTop: 12 }}>
                <Row label="إجمالي الفاتورة" value={fmt(total) + " ج.م"} color={C.brand} bold />
              </div>
            </div>

            {/* تحذير */}
            <div style={{
              background: C.warning + "15", border: `1px solid ${C.warning}44`,
              borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 13, color: C.warning,
            }}>
              ⚠️ بعد الإرسال لا يمكن التراجع — تأكد من صحة البيانات قبل المتابعة
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${C.border}`,
                  background: "none", color: C.textSub, cursor: "pointer", fontSize: 14,
                }}
              >إلغاء</button>
              <button
                onClick={handleSubmit}
                style={{
                  flex: 2, padding: "10px 0", borderRadius: 8, border: "none",
                  background: C.brand, color: "#000", cursor: "pointer", fontSize: 14,
                  fontWeight: 700,
                }}
              >إرسال إلى ETA ←</button>
            </div>
          </>
        )}

        {step === "submitting" && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⏳</div>
            <div style={{ color: C.text, fontWeight: 600 }}>جاري الإرسال إلى هيئة الضرائب...</div>
            <div style={{ color: C.textSub, fontSize: 13, marginTop: 8 }}>
              OAuth2 → بناء المستند → التوقيع → الإرسال
            </div>
            <SpinnerDots />
          </div>
        )}

        {step === "success" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <div style={{ color: C.success, fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              تم الإرسال بنجاح!
            </div>
            <div style={{ color: C.textSub, fontSize: 13, marginBottom: 20 }}>
              {result?.message}
            </div>

            {/* تفاصيل النتيجة */}
            <div style={{
              background: "#ffffff08", borderRadius: 8, padding: 12,
              textAlign: "right", fontSize: 12,
            }}>
              <Row label="Submission ID" value={result?.submissionId?.slice(0, 20) + "..."} />
              <Row label="UUID" value={result?.uuid?.slice(0, 20) + "..."} />
            </div>

            {result?.etaUrl && (
              <a
                href={result.etaUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "block", marginTop: 16, padding: "10px 0",
                  background: C.teal + "22", color: C.teal, borderRadius: 8,
                  textDecoration: "none", fontSize: 13, fontWeight: 600,
                }}
              >
                🔗 فتح الفاتورة على بوابة ETA ↗
              </a>
            )}

            <button
              onClick={onClose}
              style={{
                marginTop: 16, width: "100%", padding: "10px 0",
                borderRadius: 8, border: `1px solid ${C.border}`,
                background: "none", color: C.textSub, cursor: "pointer",
              }}
            >إغلاق</button>
          </div>
        )}

        {step === "error" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>❌</div>
            <div style={{ color: C.danger, fontWeight: 700, fontSize: 16, marginBottom: 12 }}>
              فشل الإرسال
            </div>
            <div style={{
              background: C.danger + "15", borderRadius: 8, padding: 12,
              color: C.danger, fontSize: 13, marginBottom: 20, textAlign: "right",
            }}>
              {error}
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={onClose}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8,
                  border: `1px solid ${C.border}`, background: "none",
                  color: C.textSub, cursor: "pointer",
                }}
              >إغلاق</button>
              <button
                onClick={() => { setStep("confirm"); setError(null) }}
                style={{
                  flex: 1, padding: "10px 0", borderRadius: 8, border: "none",
                  background: C.danger, color: "#fff", cursor: "pointer", fontWeight: 600,
                }}
              >إعادة المحاولة</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ④ AIChatScreen — شاشة المساعد الذكي الكاملة
// ═══════════════════════════════════════════════════════════════
export function AIChatScreen({ projects, user }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `مرحباً ${user?.name ?? ""}! 👋\n\nأنا المساعد الذكي لـ TECHOFFICE ERP. يمكنني مساعدتك في:\n• تحليل أداء مشاريعك الحالية\n• شرح المعادلة المصرية للمستخلصات\n• التنبيه بالمخاطر (ضمانات، مراسلات)\n• صياغة مراسلات احترافية\n• الإجابة على أسئلة حسابية\n\nكيف أستطيع مساعدتك؟`,
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedProject, setSelectedProject] = useState(null)
  const [rateLimitInfo, setRateLimitInfo] = useState({ used: 0, limit: 20 })
  const [streamingText, setStreamingText] = useState("")
  const messagesEndRef = useRef(null)
  const abortRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, streamingText])

  const suggestedQueries = [
    "ما هي المشاريع المتأخرة عن الخطة؟",
    "اشرح لي المعادلة المصرية للمستخلصات",
    "ما الضمانات التي ستنتهي قريباً؟",
    "حلل أداء المشروع الأول",
    "اكتب خطاباً بتمديد العقد 30 يوم",
    "ما الفرق بين نسبة الاحتجاز وسقفها؟",
  ]

  async function sendMessage() {
    const text = input.trim()
    if (!text || isLoading) return

    // إضافة رسالة المستخدم
    const userMsg = { role: "user", content: text }
    const newHistory = [...messages, userMsg]
    setMessages(newHistory)
    setInput("")
    setIsLoading(true)
    setStreamingText("")

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          message: text,
          projectId: selectedProject,
          conversationHistory: newHistory
            .slice(-10)
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (res.status === 429) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ وصلت الحد الأقصى (20 رسالة/ساعة) — حاول لاحقاً" },
        ])
        return
      }

      // قراءة SSE stream
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split("\n")

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") break

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) {
              setMessages((prev) => [
                ...prev,
                { role: "assistant", content: `❌ ${parsed.error}` },
              ])
              setStreamingText("")
              return
            }
            if (parsed.text) {
              fullText += parsed.text
              setStreamingText(fullText)
            }
          } catch {}
        }
      }

      // إضافة الرسالة الكاملة
      setMessages((prev) => [...prev, { role: "assistant", content: fullText }])
      setStreamingText("")

      // تحديث الـ rate limit
      const remaining = parseInt(res.headers.get("X-RateLimit-Remaining") ?? "20")
      setRateLimitInfo({ used: 20 - remaining, limit: 20 })
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ حدث خطأ في الاتصال — يرجى المحاولة مجدداً" },
      ])
      setStreamingText("")
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function clearChat() {
    setMessages([{
      role: "assistant",
      content: "تم مسح المحادثة. كيف أستطيع مساعدتك؟",
    }])
  }

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "calc(100vh - 80px)",
      maxWidth: 900, margin: "0 auto",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        marginBottom: 16,
      }}>
        <div>
          <h2 style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 700 }}>
            🤖 المساعد الذكي
          </h2>
          <div style={{ color: C.textSub, fontSize: 13, marginTop: 4 }}>
            مدعوم بـ Claude claude-sonnet-4-6 — يعرف بيانات مشاريعك الحقيقية
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* فلتر المشروع */}
          {projects?.length > 0 && (
            <select
              value={selectedProject ?? ""}
              onChange={(e) => setSelectedProject(e.target.value || null)}
              style={{
                background: C.card, border: `1px solid ${C.border}`,
                borderRadius: 8, padding: "6px 12px", color: C.text,
                fontSize: 13, cursor: "pointer",
              }}
            >
              <option value="">جميع المشاريع</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.code}</option>
              ))}
            </select>
          )}

          {/* Rate Limit */}
          <div style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, padding: "6px 12px", fontSize: 12, color: C.textSub,
          }}>
            {rateLimitInfo.used}/{rateLimitInfo.limit} رسالة
          </div>

          <button
            onClick={clearChat}
            style={{
              background: "none", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "6px 12px", color: C.textSub,
              cursor: "pointer", fontSize: 12,
            }}
          >مسح المحادثة</button>
        </div>
      </div>

      {/* Messages Area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0 4px",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}

        {/* Streaming bubble */}
        {streamingText && (
          <ChatBubble
            message={{ role: "assistant", content: streamingText }}
            isStreaming
          />
        )}

        {isLoading && !streamingText && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 16px" }}>
            <div style={{
              width: 32, height: 32, borderRadius: "50%",
              background: C.purple + "33",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}>🤖</div>
            <SpinnerDots color={C.purple} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Queries */}
      {messages.length <= 1 && (
        <div style={{ padding: "12px 0", display: "flex", flexWrap: "wrap", gap: 8 }}>
          {suggestedQueries.map((q, i) => (
            <button
              key={i}
              onClick={() => { setInput(q) }}
              style={{
                background: C.brand + "15", border: `1px solid ${C.brand}33`,
                borderRadius: 20, padding: "6px 14px", color: C.brand,
                cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >{q}</button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
        padding: 12, display: "flex", gap: 12, alignItems: "flex-end",
        marginTop: 12,
      }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="اكتب سؤالك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)"
          rows={2}
          style={{
            flex: 1, background: "none", border: "none", resize: "none",
            color: C.text, fontSize: 14, outline: "none", lineHeight: 1.6,
            fontFamily: "inherit", direction: "rtl",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            background: input.trim() && !isLoading ? C.brand : C.muted,
            border: "none", borderRadius: 10, width: 44, height: 44,
            cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
            fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.2s", flexShrink: 0,
          }}
        >↑</button>
      </div>

      <div style={{ fontSize: 11, color: C.muted, textAlign: "center", marginTop: 8 }}>
        البيانات محمية ومشفرة — لا تشارك معلومات حساسة كأرقام الضريبة أو كلمات المرور
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// مكون فقاعة الرسالة
// ═══════════════════════════════════════════════════════════════
function ChatBubble({ message, isStreaming }) {
  const isUser = message.role === "user"

  // تحويل markdown بسيط إلى عناصر React
  const renderContent = (text) => {
    const lines = text.split("\n")
    return lines.map((line, i) => {
      if (line.startsWith("• ") || line.startsWith("- ")) {
        return (
          <div key={i} style={{ padding: "2px 0 2px 8px" }}>
            {line}
          </div>
        )
      }
      if (line.startsWith("#")) {
        return (
          <div key={i} style={{ fontWeight: 700, fontSize: 15, margin: "8px 0 4px" }}>
            {line.replace(/^#+\s/, "")}
          </div>
        )
      }
      if (line === "") return <div key={i} style={{ height: 8 }} />
      return <div key={i}>{line}</div>
    })
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: isUser ? "row-reverse" : "row",
      gap: 10, alignItems: "flex-start",
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: isUser ? C.brand + "33" : C.purple + "33",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }}>
        {isUser ? "👤" : "🤖"}
      </div>

      {/* Bubble */}
      <div style={{
        maxWidth: "75%",
        background: isUser
          ? C.brand + "20"
          : "#ffffff08",
        border: `1px solid ${isUser ? C.brand + "33" : C.border}`,
        borderRadius: isUser ? "16px 4px 16px 16px" : "4px 16px 16px 16px",
        padding: "12px 16px",
        fontSize: 14,
        color: C.text,
        lineHeight: 1.6,
        direction: "rtl",
        textAlign: "right",
      }}>
        {renderContent(message.content)}
        {isStreaming && (
          <span style={{
            display: "inline-block", width: 6, height: 14,
            background: C.purple, borderRadius: 2,
            animation: "blink 0.8s step-end infinite",
            verticalAlign: "middle", marginRight: 4,
          }} />
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// ⑤ AIChatFAB — زر عائم
// ═══════════════════════════════════════════════════════════════
export function AIChatFAB({ onOpen }) {
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    const t = setInterval(() => setPulse((p) => !p), 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <button
      onClick={onOpen}
      style={{
        position: "fixed", bottom: 24, left: 24,
        width: 56, height: 56, borderRadius: "50%",
        background: `linear-gradient(135deg, ${C.purple}, #7c3aed)`,
        border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, boxShadow: `0 4px 24px ${C.purple}66`,
        transition: "transform 0.2s",
        transform: pulse ? "scale(1.08)" : "scale(1)",
        zIndex: 100,
      }}
      title="المساعد الذكي (AI)"
    >
      🤖
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════
// مكونات مساعدة
// ═══════════════════════════════════════════════════════════════
function Row({ label, value, color, bold }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "4px 0", fontSize: 13,
    }}>
      <span style={{ color: C.textSub }}>{label}</span>
      <span style={{ color: color ?? C.text, fontWeight: bold ? 700 : 400 }}>{value}</span>
    </div>
  )
}

function SpinnerDots({ color = C.brand }) {
  return (
    <div style={{ display: "flex", gap: 6, padding: "8px 4px" }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: 8, height: 8, borderRadius: "50%", background: color,
            animation: `bounce 1.2s ${i * 0.2}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-8px) }
        }
        @keyframes blink {
          0%, 100% { opacity: 1 }
          50% { opacity: 0 }
        }
      `}</style>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Sidebar Item لـ AI Chat
// ═══════════════════════════════════════════════════════════════
export const AI_SIDEBAR_ITEM = {
  id: "ai",
  label: "المساعد الذكي",
  icon: "🤖",
  badge: null,
  badgeColor: C.purple,
}

// ═══════════════════════════════════════════════════════════════
// Demo/Test Component — لاختبار الشاشات
// ═══════════════════════════════════════════════════════════════
export default function Phase6Demo() {
  const [screen, setScreen] = useState("chat")
  const [showETAModal, setShowETAModal] = useState(false)

  const mockUser = {
    name: "خالد إبراهيم",
    role: "ADMIN",
    companyName: "شركة نيل رودز للطرق",
  }

  const mockProjects = [
    { id: "p1", code: "NR-2024-01", name: "طريق القاهرة الإسكندرية الصحراوي" },
    { id: "p2", code: "NR-2024-02", name: "رصف طريق الفيوم الجديد" },
  ]

  const mockExtract = {
    id: "extract-demo-001",
    number: "M-07",
    grossTotal: 9150000,
    retentionThisExtract: 456500,
    advanceRecoveryActual: 340000,
    fines: 0,
    status: "APPROVED",
    etaStatus: null,
    etaSubmissionId: null,
  }

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", padding: 24,
      fontFamily: "'Segoe UI', Tahoma, sans-serif", direction: "rtl",
    }}>
      {/* Nav */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        {[
          { id: "chat", label: "🤖 AI Chat" },
          { id: "eta", label: "🧾 ETA Modal" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setScreen(tab.id)}
            style={{
              padding: "8px 20px", borderRadius: 8, border: "none", cursor: "pointer",
              background: screen === tab.id ? C.brand : C.card,
              color: screen === tab.id ? "#000" : C.textSub,
              fontWeight: screen === tab.id ? 700 : 400,
            }}
          >{tab.label}</button>
        ))}
      </div>

      {screen === "chat" && (
        <AIChatScreen projects={mockProjects} user={mockUser} />
      )}

      {screen === "eta" && (
        <div>
          {/* جدول مستخلصات مصغر */}
          <div style={{
            background: C.card, borderRadius: 12, padding: 20,
            border: `1px solid ${C.border}`,
          }}>
            <h3 style={{ margin: "0 0 16px", color: C.text }}>المستخلصات المعتمدة — جاهزة للإرسال</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "12px 8px", color: C.text }}>مستخلص M-07</td>
                  <td style={{ padding: "12px 8px", color: C.text }}>{fmt(9150000)} ج.م</td>
                  <td style={{ padding: "12px 8px" }}>
                    <ETABadge status={null} />
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <button
                      onClick={() => setShowETAModal(true)}
                      style={{
                        background: C.teal + "22", border: `1px solid ${C.teal}44`,
                        borderRadius: 6, padding: "4px 12px", color: C.teal,
                        cursor: "pointer", fontSize: 12, fontWeight: 600,
                      }}
                    >إرسال ETA</button>
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "12px 8px", color: C.text }}>مستخلص M-06</td>
                  <td style={{ padding: "12px 8px", color: C.text }}>{fmt(7620000)} ج.م</td>
                  <td style={{ padding: "12px 8px" }}>
                    <ETABadge status="Valid" />
                  </td>
                  <td style={{ padding: "12px 8px" }}>
                    <button
                      style={{
                        background: C.muted + "22", border: `1px solid ${C.muted}44`,
                        borderRadius: 6, padding: "4px 12px", color: C.muted,
                        cursor: "not-allowed", fontSize: 12,
                      }}
                    >تم الإرسال</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {showETAModal && (
            <ETASubmitModal
              extract={mockExtract}
              project={mockProjects[0]}
              onClose={() => setShowETAModal(false)}
              onSuccess={(res) => console.log("ETA Success:", res)}
            />
          )}
        </div>
      )}

      <AIChatFAB onOpen={() => setScreen("chat")} />
    </div>
  )
}
