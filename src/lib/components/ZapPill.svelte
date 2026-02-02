<script>
  import ZapIcon from "./icons/Zap.svelte";
  import ProfilePic from "./ProfilePic.svelte";

  /**
   * ZapPill - A compact zap display component
   *
   * Shows a zap amount with the sender's profile picture
   * Based on Flutter's LabZapPill design
   */

  /** @type {number} - Zap amount in sats */
  export let amount = 0;

  /** @type {{ pictureUrl?: string, name?: string, pubkey?: string } | null} - Sender profile */
  export let profile = null;

  /** @type {boolean} - Whether this is an outgoing zap (uses gold background) */
  export let isOutgoing = false;

  /** @type {() => void} - Click handler */
  export let onClick = () => {};

  // Format amount for display
  function formatAmount(val) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return Math.round(val).toLocaleString();
  }
</script>

<button
  type="button"
  class="zap-pill"
  class:outgoing={isOutgoing}
  on:click={onClick}
>
  <div class="zap-info">
    <ZapIcon
      variant="fill"
      size={12}
      color={isOutgoing ? "hsl(var(--black))" : "hsl(var(--white66))"}
    />
    <span class="zap-amount" class:outgoing={isOutgoing}>
      {formatAmount(amount)}
    </span>
  </div>
  <ProfilePic
    pictureUrl={profile?.pictureUrl}
    name={profile?.name}
    pubkey={profile?.pubkey}
    size="xs"
    onClick={() => {}}
  />
</button>

<style>
  .zap-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 4px 4px 8px;
    background: hsl(var(--gray66));
    border: none;
    border-radius: var(--radius-16);
    cursor: pointer;
    transition: transform 0.15s ease, background-color 0.15s ease;
    flex-shrink: 0;
  }

  .zap-pill:hover {
    transform: scale(1.04);
    background: hsl(var(--white8));
  }

  .zap-pill:active {
    transform: scale(0.98);
  }

  .zap-pill.outgoing {
    background: var(--gradient-gold);
  }

  .zap-pill.outgoing:hover {
    background: var(--gradient-gold-hover);
  }

  .zap-info {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .zap-amount {
    font-size: 12px;
    font-weight: 500;
    color: hsl(var(--white66));
    line-height: 1;
  }

  .zap-amount.outgoing {
    color: hsl(var(--black));
  }
</style>
