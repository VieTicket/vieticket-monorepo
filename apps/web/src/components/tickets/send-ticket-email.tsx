"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
// import { useToast } from "@/components/ui/toast/use-toast" // Temporarily removed due to import issues
import { sendTicketEmailAction } from "@/lib/actions/customer/order-actions"

interface SendTicketEmailProps {
  ticketId: string
}

export function SendTicketEmail({ ticketId }: SendTicketEmailProps) {
  // const { toast } = useToast() // Temporarily removed
  const [email, setEmail] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSendEmail = async () => {
    if (!email) return

    setIsSending(true)
    try {
      const result = await sendTicketEmailAction(ticketId, email)
      if (result.success) {
        alert(`Ticket sent to ${email} successfully`)
      } else {
        alert(`Failed to send email: ${result.error || "An error occurred"}`)
      }
    } catch (error) {
      alert("Failed to send ticket email")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mt-4 flex items-center space-x-2">
      <Input
        type="email"
        placeholder="Recipient email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="flex-1"
      />
      <Button
        size="sm"
        onClick={handleSendEmail}
        disabled={isSending}
      >
        {isSending ? "Sending..." : <><Send className="mr-2 h-4 w-4" /> Send</>}
      </Button>
    </div>
  )
}
