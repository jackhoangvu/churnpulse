<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto, invalidateAll } from "$app/navigation";
  import type { SubmitFunction } from "@sveltejs/kit";
  import Badge from "$lib/components/ui/Badge.svelte";
  import RingProgress from "$lib/components/ui/RingProgress.svelte";
  import { toast } from "$lib/stores/toast";
  import { colorHash } from "$lib/utils/colorHash";
  import { jsonHighlight } from "$lib/utils/jsonHighlight";
  import type { PageData } from "./$types";

  interface Props {
    data: PageData;
  }

  let { data }: Props = $props();
  let pendingAction = $state<string | null>(null);

  const avatar = $derived(
    colorHash(data.customerContext.email ?? data.customerContext.name ?? data.signal.id),
  );
  const initials = $derived.by(() => {
    const source =
      data.customerContext.name ??
      data.customerContext.email?.split("@")[0] ??
      "CP";

    return source
      .split(/[.\s_-]+/)
      .map((part) => part.slice(0, 1).toUpperCase())
      .join("")
      .slice(0, 2);
  });
  const riskTone = $derived(
    data.riskScore > 80
      ? "danger"
      : data.riskScore >= 60
        ? "warning"
        : "brand",
  );
  const providerLabel = $derived(
    data.signal.provider === "lemonsqueezy"
      ? "Lemon Squeezy"
      : data.signal.provider[0].toUpperCase() + data.signal.provider.slice(1),
  );

  function formatMoney(cents: number): string {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(cents / 100);
  }

  function formatDateTime(value: string | null): string {
    if (!value) {
      return "Not scheduled";
    }

    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  }

  function statusLabel(value: string): string {
    return value.replaceAll("_", " ");
  }

  function toneLabel(value: string): string {
    return value.replaceAll("_", " ");
  }

  function enhanceAction(
    actionName: string,
    options: { redirectToRecovery?: boolean } = {},
  ): SubmitFunction {
    return ({ submitter }) => {
      pendingAction =
        (submitter instanceof HTMLButtonElement && submitter.dataset.action) ||
        actionName;

      return async ({ result, update }) => {
        pendingAction = null;

        if (result.type === "success") {
          toast.success(result.data?.message ?? "Saved");
          await update({ reset: false, invalidateAll: true });

          if (options.redirectToRecovery) {
            await goto("/dashboard/recovery");
          }

          return;
        }

        if (result.type === "failure") {
          toast.error(result.data?.message ?? "The action could not be completed.");
          return;
        }

        toast.error("The action could not be completed.");
      };
    };
  }

  async function refreshAiAnalysis(): Promise<void> {
    await invalidateAll();
  }
</script>

<svelte:head>
  <title>{data.customerContext.name ?? data.customerContext.email ?? "Signal detail"} | ChurnPulse</title>
  <meta
    name="description"
    content="Review churn signal context, AI win-back analysis, sequence state, and recovery actions."
  />
</svelte:head>

<section class="page signal-detail-page">
  <header class="page__header signal-detail-page__header">
    <div class="signal-detail-hero">
      <span class="signal-detail-hero__avatar" style={`background:${avatar.gradient}`}>
        {initials}
      </span>

      <div class="signal-detail-hero__copy">
        <div class="signal-detail-hero__title-row">
          <h1 class="page__title">
            {data.customerContext.name ?? "Unknown customer"}
          </h1>
          <Badge type={data.signal.signal_type} />
          <span class="badge badge-muted">{providerLabel}</span>
        </div>

        <p class="page__subtitle">
          {data.customerContext.email ?? "No email on file"} · Detected {formatDateTime(data.signal.detected_at)}
        </p>

        <div class="signal-detail-hero__meta">
          <span class="signal-detail-hero__meta-item">
            <strong>{formatMoney(data.signal.mrr_amount)}</strong>
            Monthly value
          </span>
          <span class="signal-detail-hero__meta-item">
            <strong>{statusLabel(data.signal.status)}</strong>
            Current status
          </span>
          {#if data.customerContext.customerSince}
            <span class="signal-detail-hero__meta-item">
              <strong>{formatDateTime(data.customerContext.customerSince)}</strong>
              Customer since
            </span>
          {/if}
        </div>
      </div>
    </div>

    <div class="signal-detail-page__risk card">
      <RingProgress
        value={data.riskScore}
        size={72}
        stroke={6}
        label={`Risk score ${data.riskScore}`}
        tone={riskTone}
      />
      <div>
        <p class="page-kicker">Risk score</p>
        <p class="signal-detail-page__risk-copy">
          {data.riskScore >= 80 ? "Immediate manual follow-up recommended." : "Automated recovery motion is active."}
        </p>
      </div>
    </div>
  </header>

  <div class="grid-2 signal-detail-page__top-grid">
    <article class="card signal-detail-card">
      <div class="signal-detail-card__header">
        <div>
          <p class="page-kicker">AI analysis</p>
          <h2 class="signal-detail-card__title">Win-back strategy</h2>
        </div>
        <form method="POST" use:enhance={enhanceAction("runAiAnalysis")} action="?/runAiAnalysis">
          <button
            class="btn btn-secondary btn-sm"
            type="submit"
            data-action="runAiAnalysis"
            aria-busy={pendingAction === "runAiAnalysis"}
            onclick={() => void refreshAiAnalysis()}
          >
            {pendingAction === "runAiAnalysis" ? "Refreshing..." : "Refresh AI"}
          </button>
        </form>
      </div>

      <div class="signal-detail-analysis">
        <section>
          <h3>Churn reason</h3>
          <p>{data.classification.churn_reason}</p>
        </section>
        <section>
          <h3>Win-back angle</h3>
          <p>{data.classification.win_back_angle}</p>
        </section>
        <div class="signal-detail-analysis__grid">
          <section class="card signal-detail-analysis__stat">
            <p class="page-kicker">Urgency</p>
            <strong>{data.classification.urgency_score}/10</strong>
          </section>
          <section class="card signal-detail-analysis__stat">
            <p class="page-kicker">Recommended tone</p>
            <strong>{toneLabel(data.classification.recommended_tone)}</strong>
          </section>
        </div>
        <section>
          <h3>Key talking points</h3>
          <ul class="signal-detail-list">
            {#each data.classification.key_talking_points as point}
              <li>{point}</li>
            {/each}
          </ul>
        </section>
      </div>
    </article>

    <aside class="card signal-detail-card">
      <div class="signal-detail-card__header">
        <div>
          <p class="page-kicker">Actions</p>
          <h2 class="signal-detail-card__title">Operator controls</h2>
        </div>
      </div>

      <div class="signal-detail-actions">
        <form method="POST" use:enhance={enhanceAction("markRecovered", { redirectToRecovery: true })} action="?/markRecovered">
          <button class="btn btn-success btn-full" type="submit" data-action="markRecovered" aria-busy={pendingAction === "markRecovered"}>
            {pendingAction === "markRecovered" ? "Marking..." : "Mark recovered"}
          </button>
        </form>

        <form method="POST" use:enhance={enhanceAction("dismissSignal", { redirectToRecovery: true })} action="?/dismissSignal">
          <button class="btn btn-danger btn-full" type="submit" data-action="dismissSignal" aria-busy={pendingAction === "dismissSignal"}>
            {pendingAction === "dismissSignal" ? "Dismissing..." : "Dismiss signal"}
          </button>
        </form>

        <form method="POST" use:enhance={enhanceAction("stopSequence")} action="?/stopSequence">
          <button class="btn btn-secondary btn-full" type="submit" data-action="stopSequence" aria-busy={pendingAction === "stopSequence"}>
            {pendingAction === "stopSequence" ? "Stopping..." : "Stop sequence"}
          </button>
        </form>

        <form method="POST" use:enhance={enhanceAction("sendNow")} action="?/sendNow">
          <button class="btn btn-primary btn-full" type="submit" data-action="sendNow" aria-busy={pendingAction === "sendNow"}>
            {pendingAction === "sendNow" ? "Sending..." : "Send next email now"}
          </button>
        </form>

        {#if data.customerContext.stripeUrl}
          <a class="btn btn-ghost btn-full" href={data.customerContext.stripeUrl} target="_blank" rel="noreferrer">
            View in Stripe
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 4h6v6" />
              <path d="M10 14 20 4" />
              <path d="M20 14v6h-6" />
              <path d="M4 10 14 20" />
            </svg>
          </a>
        {/if}
      </div>
    </aside>
  </div>

  <article class="card signal-detail-card">
    <div class="signal-detail-card__header">
      <div>
        <p class="page-kicker">Sequence timeline</p>
        <h2 class="signal-detail-card__title">Scheduled recovery steps</h2>
      </div>
    </div>

    <div class="signal-detail-timeline">
      {#if data.emails.length === 0}
        <p class="signal-detail-empty">No sequence steps are scheduled for this signal yet.</p>
      {:else}
        {#each data.emails as email (email.id)}
          <article class="signal-detail-step">
            <div class="signal-detail-step__rail" aria-hidden="true"></div>
            <div class="signal-detail-step__marker">
              <span>{email.step}</span>
            </div>
            <div class="signal-detail-step__body">
              <div class="signal-detail-step__head">
                <div>
                  <p class="page-kicker">Step {email.step}</p>
                  <h3>{email.subject ?? "Untitled email"}</h3>
                </div>
                <span class={`badge ${email.status === "sent" ? "badge-success" : email.status === "failed" ? "badge-danger" : "badge-muted"}`}>
                  {statusLabel(email.status)}
                </span>
              </div>

              <p class="signal-detail-step__meta">
                {email.email_to} · {formatDateTime(email.scheduled_for ?? email.created_at)}
              </p>

              {#if email.body}
                <p class="signal-detail-step__excerpt">{email.body.slice(0, 220)}{email.body.length > 220 ? "..." : ""}</p>
              {/if}

              {#if email.status === "pending"}
                <form method="POST" action="?/sendNow" use:enhance={enhanceAction(`sendNow-${email.id}`)}>
                  <input type="hidden" name="emailId" value={email.id} />
                  <button class="btn btn-secondary btn-sm" type="submit" data-action={`sendNow-${email.id}`} aria-busy={pendingAction === `sendNow-${email.id}`}>
                    {pendingAction === `sendNow-${email.id}` ? "Sending..." : "Send now"}
                  </button>
                </form>
              {/if}
            </div>
          </article>
        {/each}
      {/if}
    </div>
  </article>

  <article class="card signal-detail-card">
    <div class="signal-detail-card__header">
      <div>
        <p class="page-kicker">Customer metadata</p>
        <h2 class="signal-detail-card__title">Normalized event payload</h2>
      </div>
    </div>

    <pre class="docs-code signal-detail-json"><code>{@html jsonHighlight(data.signal.metadata ?? {})}</code></pre>
  </article>
</section>
