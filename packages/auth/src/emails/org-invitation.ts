import { sendMail } from "@vieticket/utils/mailer";
import type { User } from "better-auth";
import type { Invitation, Member, Organization } from "better-auth/plugins";

export async function sendOrganizationInvitationEmail(data: {
	id: string;
	role: string;
	email: string;
	organization: Organization;
	invitation: Invitation;
	inviter: Member & {
		user: User;
	};
}) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://vieticket.io.vn";
    const inviteLink = `${baseUrl}/accept-invitation/${data.id}`;

    const subject = "You have been invited to join an organization on VieTicket";

    const inviterDisplay = data.inviter.user.name ?? data.inviter.user.email;

    const text = `
        You have been invited to join the organization "${data.organization.name}" on VieTicket.

        Invited by: ${inviterDisplay}

        To accept this invitation, click the link below:
        ${inviteLink}

        If you did not expect this invitation, you can safely ignore this email.
        `.trim();

            const html = `
        <p>You have been invited to join the organization <strong>${data.organization.name}</strong> on VieTicket.</p>
        <p>
        Invited by: <strong>${inviterDisplay}</strong>
        </p>
        <p>
        To accept this invitation, click the link below:
        </p>
        <p>
        <a href="${inviteLink}" target="_blank" rel="noopener noreferrer">Accept invitation</a>
        </p>
        <p>If you did not expect this invitation, you can safely ignore this email.</p>
        `;

    await sendMail({
        to: data.email,
        subject,
        text,
        html,
    });
}
