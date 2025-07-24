"use client"

import { useState, useEffect, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send, Loader2, AlertCircle } from "lucide-react"
import {
  sendTicketEmailAction,
  getTicketEmailStatusAction,
} from "@/lib/actions/customer/order-actions"
import { toast } from "sonner"

interface SendTicketEmailProps {
  ticketId: string
}

interface EmailLog {
  recipientEmail: string
  sentAt: Date
}

interface EmailStatus {
  logs: EmailLog[]
  sentCount: number
  maxSends: number
  cooldownMinutes: number
  lastSentAt?: Date
}

export function SendTicketEmail({ ticketId }: SendTicketEmailProps) {
  const [email, setEmail] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState<EmailStatus | null>(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)

  const fetchStatus = useCallback(async () => {
    try {
      const result = await getTicketEmailStatusAction(ticketId)
      if (result.success && result.data) {
        setStatus(result.data)
      } else {
        toast.error(`Failed to get email status: ${result.error}`)
      }
    } catch (error) {
      toast.error("Failed to fetch email status.")
    } finally {
      setIsLoadingStatus(false)
    }
  }, [ticketId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  const handleSendEmail = async () => {
    if (!email) return

    setIsSending(true)
    try {
      const result = await sendTicketEmailAction(ticketId, email)
      if (result.success) {
        toast(`Ticket sent to ${email} successfully`)
        setEmail("")
        fetchStatus() // Refresh status after sending
      } else {
        toast.error(`Failed to send email: ${result.error || "An error occurred"}`)
      }
    } catch (error) {
      toast.error("Failed to send ticket email")
    } finally {
      setIsSending(false)
    }
  }

  if (isLoadingStatus) {
    return (
      <div className="mt-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!status) {
    return (
      <div className="mt-4 flex items-center space-x-2 text-destructive">
        <AlertCircle className="h-4 w-4" />
        <p>Could not load email sending status.</p>
      </div>
    )
  }

  const { logs, sentCount, maxSends, cooldownMinutes, lastSentAt } = status
  const sendsRemaining = maxSends - sentCount
  const globalLimitReached = sentCount >= maxSends

  // Global cooldown check (applies to any email for this ticket)
  const globalCooldownActive = lastSentAt 
    ? new Date() < new Date(lastSentAt.getTime() + cooldownMinutes * 60 * 1000)
    : false

  return (
    <div className="mt-6 space-y-4">
      <h3 className="text-lg font-semibold">Send Ticket via Email</h3>

      {!globalLimitReached && (
        <div className="flex items-center space-x-2">
          <Input
            type="email"
            placeholder="Recipient email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            disabled={isSending || globalCooldownActive}
          />
          <Button
            size="sm"
            onClick={handleSendEmail}
            disabled={isSending || !email || globalCooldownActive}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </div>
      )}

      {globalCooldownActive && (
        <p className="text-sm text-orange-500">
          You must wait before sending another email for this ticket.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          You can send this ticket {sendsRemaining > 0 ? `${sendsRemaining} more times` : "no more times"}. 
          (Max: {maxSends} sends)
        </p>
        {logs.length > 0 && (
          <div className="rounded-md border bg-muted/50 p-3">
            <h4 className="mb-2 font-medium">Email History</h4>
            <ul className="space-y-1 text-sm">
              {logs.map((log, index) => (
                <li key={index} className="flex justify-between">
                  <span>{log.recipientEmail}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.sentAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
