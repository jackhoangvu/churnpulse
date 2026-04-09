import type { ChurnSignal } from '$lib/types';
import type { AIClassification } from './ai-classifier';

type EmailTemplateParams = {
	signal: ChurnSignal;
	step: number;
	classification: AIClassification;
	org_name: string;
	update_card_url?: string | undefined;
};

type EmailVariant = {
	subject: string;
	paragraphs: string[];
	ctaLabel?: string | undefined;
	ctaUrl?: string | undefined;
	footerNote?: string | undefined;
};

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&#39;');
}

function toSentenceCase(value: string): string {
	const trimmed = value.trim();

	if (!trimmed) {
		return '';
	}

	return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function buildFallbackCtaCopy(signal: ChurnSignal): string {
	return signal.signal_type === 'card_failed'
		? 'If the link does not work for you, reply to this email and we will help you get billing fixed right away.'
		: 'Reply to this email and we will take care of the next step with you directly.';
}

function buildProductUpdate(classification: AIClassification): string {
	const firstPoint = classification.key_talking_points[0];

	if (!firstPoint) {
		return 'We have made the product faster to adopt and easier to get value from.';
	}

	return `${toSentenceCase(firstPoint)} We have been tightening that part of the experience since you left.`;
}

function buildOfferLine(classification: AIClassification): string {
	return classification.recommended_tone === 'value_focused'
		? 'If cost is part of the decision, we can talk through a better-fit plan and make the economics easier to justify.'
		: 'If timing is the blocker, we can offer an early look at what is shipping next and help you evaluate whether it closes the gap.';
}

function createVariant(params: EmailTemplateParams): EmailVariant {
	const { signal, step, classification, org_name, update_card_url } = params;

	switch (`${signal.signal_type}:${step}`) {
		case 'card_failed:1':
			return {
				subject: "Your payment didn't go through — quick fix needed",
				paragraphs: [
					`We tried to process your subscription payment, but it did not go through. In most cases this is something simple like an expired card or a bank decline.`,
					`Your account is still here and nothing needs to turn into a bigger issue than it already is.`,
					`The fastest fix is to update your payment method now so billing can retry cleanly and your access stays uninterrupted.`,
					`Thanks for taking a minute to sort it out. ${org_name}`
				],
				ctaLabel: 'Update payment method ->',
				ctaUrl: update_card_url
			};
		case 'card_failed:2':
			return {
				subject: 'Still having trouble with your payment',
				paragraphs: [
					`A quick follow-up from us: your payment is still failing, so the subscription has not fully recovered yet.`,
					`This is usually easy to fix, but service will pause soon if the billing issue stays unresolved.`,
					`Use the link below to update your payment method and we will take care of the retry from there.`,
					buildFallbackCtaCopy(signal)
				],
				ctaLabel: 'Update payment method ->',
				ctaUrl: update_card_url
			};
		case 'card_failed:3':
			return {
				subject: 'Your account pauses tomorrow',
				paragraphs: [
					`Your latest payment still has not been completed.`,
					`Unless this is fixed today, your account will pause tomorrow.`,
					`Update your payment method now to keep everything active without interruption.`,
					buildFallbackCtaCopy(signal)
				],
				ctaLabel: 'Update payment now ->',
				ctaUrl: update_card_url
			};
		case 'disengaged:1':
			return {
				subject: "We noticed you haven't logged in — everything okay?",
				paragraphs: [
					`We noticed activity has dropped off recently, so we wanted to check in before momentum slips too far.`,
					`The biggest opportunity we see right now is ${classification.win_back_angle.toLowerCase()}.`,
					`If the product is not fitting the way you expected, tell us where the friction is and we will help you get to value faster.`,
					`${org_name}`
				]
			};
		case 'disengaged:2':
			return {
				subject: 'Quick question about your experience',
				paragraphs: [
					`Can we ask directly: what is not working well enough for you right now?`,
					`We would rather hear the honest answer than guess from the outside.`,
					`If it helps, we are happy to jump on a focused 15-minute call and work through the gap together.`,
					`${classification.key_talking_points[0]}`
				]
			};
		case 'disengaged:3':
			return {
				subject: "Thinking of leaving? We'd love to understand why.",
				paragraphs: [
					`If you are already leaning toward leaving, we would still value a candid answer about what is missing.`,
					`What we believe matters most here is ${classification.win_back_angle.toLowerCase()}.`,
					buildOfferLine(classification),
					`If you are open to it, reply here and we will make the next step straightforward.`
				]
			};
		case 'cancelled:1':
			return {
				subject: "We're sad to see you go — and we mean it",
				paragraphs: [
					`We saw the cancellation come through and wanted to say thank you for giving ${org_name} a real try.`,
					`We are not going to push if the timing or fit is not right.`,
					`Would you mind sharing what we could have done differently?`,
					`Your answer would help us improve the product in a meaningful way.`
				]
			};
		case 'cancelled:2':
			return {
				subject: 'One thing we fixed since you left',
				paragraphs: [
					`We wanted to follow up with one concrete change rather than a generic win-back email.`,
					buildProductUpdate(classification),
					`If that was close to the issue on your side, we would love to have you take another look.`,
					`Reply if you want a quick walkthrough before making a decision.`
				]
			};
		case 'cancelled:3':
			return {
				subject: '30% off if you give us another shot',
				paragraphs: [
					`Here is a straightforward offer: if you come back now, we will make the first term 30% off.`,
					`No long pitch, no games, and no confusing terms.`,
					`The offer is available for the next 7 days, and we will help you get reactivated quickly if you want in.`,
					`Reply to this email and we will set it up for you.`
				]
			};
		case 'downgraded:1':
			return {
				subject: 'We noticed you switched plans — want to tell us why?',
				paragraphs: [
					`We saw the move to a lower plan and wanted to check in without making assumptions.`,
					`Which features still matter most to you, and which ones are not pulling their weight right now?`,
					`From our side, the clearest angle is ${classification.win_back_angle.toLowerCase()}.`,
					`If you reply with a few honest lines, we will use that feedback well.`
				]
			};
		case 'paused:1':
			return {
				subject: 'Your account is still paused — still want access?',
				paragraphs: [
					`Your account is still paused, so we wanted to check whether you are planning to come back in soon.`,
					`If the timing is better now, reactivation is simple and you can pick up where you left off.`,
					`The main thing you are missing today is ${classification.win_back_angle.toLowerCase()}.`,
					`If you want access back, use the link below and we will make it easy.`
				],
				ctaLabel: 'Reactivate access ->',
				ctaUrl: update_card_url
			};
		case 'high_mrr_risk:1':
			return {
				subject: 'We need to talk — your account needs attention',
				paragraphs: [
					`I am reaching out directly because your account matters, and the current signal suggests we should not wait to compare notes.`,
					`What stands out to us is ${classification.churn_reason.toLowerCase()}`,
					`The best path back from here is ${classification.win_back_angle.toLowerCase()}.`,
					`Reply with a good time and we will make this a short, useful conversation.`
				]
			};
		default:
			return {
				subject: `A quick note from ${org_name}`,
				paragraphs: [
					`We noticed a churn-risk signal on your account and wanted to reach out before it turns into a bigger issue.`,
					`${classification.churn_reason}`,
					`${classification.win_back_angle}`,
					buildFallbackCtaCopy(signal)
				],
				ctaLabel: update_card_url ? 'Review account ->' : undefined,
				ctaUrl: update_card_url
			};
	}
}

function renderHtml(
	variant: EmailVariant,
	orgName: string
): string {
	const bodyHtml = variant.paragraphs
		.map(
			(paragraph) =>
				`<p style="margin:0 0 18px 0;font-family:Inter,Arial,sans-serif;font-size:16px;line-height:1.7;color:#F0F0F2;">${escapeHtml(paragraph)}</p>`
		)
		.join('');

	const ctaHtml =
		variant.ctaLabel && variant.ctaUrl
			? `<div style="margin:30px 0 34px 0;"><a href="${escapeHtml(variant.ctaUrl)}" style="display:inline-block;background:#00E5FF;color:#000000;text-decoration:none;padding:12px 28px;font-family:Inter,Arial,sans-serif;font-size:15px;font-weight:700;line-height:1;">${escapeHtml(variant.ctaLabel)}</a></div>`
			: '';

	const footerNote = variant.footerNote
		? `<p style="margin:0 0 14px 0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.7;color:#8A8A92;">${escapeHtml(variant.footerNote)}</p>`
		: '';

	return `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:32px 16px;background-color:#0A0A0B;color:#F0F0F2;">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:600px;border-collapse:collapse;background-color:#111113;border:1px solid rgba(255,255,255,0.10);">
            <tr>
              <td style="padding:36px 32px 18px 32px;">
                <div style="margin:0 0 24px 0;font-family:'IBM Plex Mono','SFMono-Regular',Consolas,monospace;font-size:18px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:#00E5FF;">ChurnPulse</div>
                ${bodyHtml}
                ${ctaHtml}
                ${footerNote}
                <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:32px 0 20px 0;" />
                <p style="margin:0 0 10px 0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.7;color:#8A8A92;">Sent by ChurnPulse on behalf of ${escapeHtml(orgName)}</p>
                <p style="margin:0;font-family:Inter,Arial,sans-serif;font-size:13px;line-height:1.7;color:#8A8A92;">Manage email preferences or unsubscribe <a href="{{unsubscribe_url}}" style="color:#8A8A92;text-decoration:underline;">here</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(variant: EmailVariant, orgName: string): string {
	const parts = [...variant.paragraphs];

	if (variant.ctaLabel && variant.ctaUrl) {
		parts.push(`${variant.ctaLabel} ${variant.ctaUrl}`);
	}

	parts.push(`Sent by ChurnPulse on behalf of ${orgName}`);
	parts.push('Unsubscribe: {{unsubscribe_url}}');

	return parts.join('\n\n');
}

export function generateEmailContent(params: EmailTemplateParams): {
	subject: string;
	html: string;
	text: string;
} {
	const variant = createVariant(params);

	return {
		subject: variant.subject,
		html: renderHtml(variant, params.org_name),
		text: renderText(variant, params.org_name)
	};
}
