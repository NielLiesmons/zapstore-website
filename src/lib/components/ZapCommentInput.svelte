<script>
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { Editor, Node, mergeAttributes } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Mention from "@tiptap/extension-mention";
  import Placeholder from "@tiptap/extension-placeholder";
  import Suggestion from "@tiptap/suggestion";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import { hexToColor, rgbToCssString } from "$lib/utils/color.js";
  import * as nip19 from "nostr-tools/nip19";
  import { Camera, EmojiFill, Gif, Plus, Send, ChevronDown, Zap } from "$lib/components/icons";

  const dispatch = createEventDispatcher();

  /** @type {number} - Current zap amount in sats */
  export let amount = 0;

  /** @type {boolean} - Whether current amount is the top zap */
  export let isTopZap = false;

  /** @type {string} - Placeholder text */
  export let placeholder = "Add a message...";

  /** @type {(query: string) => Promise<Array<{ pubkey: string, name?: string, displayName?: string, picture?: string, nip05?: string }>>} */
  export let searchProfiles = async () => [];

  /** @type {(query: string) => Promise<Array<{ shortcode: string, url: string, source: 'unicode' | 'custom' }>>} */
  export let searchEmojis = async () => [];

  /** @type {() => void} - Camera button callback */
  export let onCameraTap = () => {};

  /** @type {() => void} - Emoji button callback */
  export let onEmojiTap = () => {};

  /** @type {() => void} - GIF button callback */
  export let onGifTap = () => {};

  /** @type {() => void} - Add button callback */
  export let onAddTap = () => {};

  /** @type {() => void} - Chevron button callback */
  export let onChevronTap = () => {};

  let editorElement;
  let editor;
  let suggestionPopup = null;
  let currentSuggestionType = null;
  let suggestionItems = [];
  let selectedIndex = 0;

  // Format amount for display
  function formatAmount(val) {
    if (val >= 1000000) return `${(val / 1000000).toFixed(val % 1000000 === 0 ? 0 : 1)}M`;
    if (val >= 1000) return `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}K`;
    return Math.round(val).toLocaleString();
  }

  // Create profile mention suggestion config
  function createProfileSuggestion() {
    return {
      char: "@",
      allowSpaces: false,
      items: async ({ query }) => {
        const results = await searchProfiles(query);
        return results.slice(0, 8);
      },
      render: () => {
        let popup;
        let container;

        return {
          onStart: (props) => {
            currentSuggestionType = "profile";
            suggestionItems = props.items || [];
            selectedIndex = 0;

            container = document.createElement("div");
            container.className = "suggestion-container";
            updateSuggestionContent(container, "profile", suggestionItems, selectedIndex, props.command);

            popup = tippy("body", {
              getReferenceClientRect: props.clientRect,
              appendTo: () => document.body,
              content: container,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "top-start",
              offset: [0, 8],
              arrow: false,
              animation: false,
            });

            suggestionPopup = popup[0];
          },

          onUpdate(props) {
            suggestionItems = props.items || [];
            selectedIndex = 0;
            updateSuggestionContent(container, "profile", suggestionItems, selectedIndex, props.command);

            if (props.clientRect) {
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
            }
          },

          onKeyDown(props) {
            if (props.event.key === "Escape") {
              popup[0]?.hide();
              return true;
            }
            if (props.event.key === "ArrowUp") {
              selectedIndex = (selectedIndex - 1 + suggestionItems.length) % suggestionItems.length;
              updateSuggestionContent(container, "profile", suggestionItems, selectedIndex, props.command, true);
              return true;
            }
            if (props.event.key === "ArrowDown") {
              selectedIndex = (selectedIndex + 1) % suggestionItems.length;
              updateSuggestionContent(container, "profile", suggestionItems, selectedIndex, props.command, true);
              return true;
            }
            if (props.event.key === "Enter" || props.event.key === "Tab") {
              if (suggestionItems[selectedIndex]) {
                props.command(suggestionItems[selectedIndex]);
              }
              return true;
            }
            return false;
          },

          onExit() {
            popup[0]?.destroy();
            suggestionPopup = null;
            currentSuggestionType = null;
          },
        };
      },
    };
  }

  // Update suggestion menu content
  function updateSuggestionContent(container, type, items, selected, command, isSelectionOnlyUpdate = false) {
    if (!container) return;

    if (isSelectionOnlyUpdate) {
      const btns = container.querySelectorAll(".suggestion-item");
      btns.forEach((btn, idx) => {
        btn.classList.toggle("selected", idx === selected);
      });
      return;
    }

    if (items.length === 0) {
      container.innerHTML = `
        <div class="suggestion-menu suggestion-menu-empty">
          <span class="suggestion-empty-text">No ${type === "profile" ? "profiles" : "emojis"} found</span>
        </div>
      `;
      return;
    }

    const itemsHtml = items.map((item, index) => {
      if (type === "profile") {
        const name = item.displayName || item.name || item.pubkey?.slice(0, 8);
        return `
          <button type="button" class="suggestion-item ${index === selected ? "selected" : ""}" data-index="${index}">
            <div class="suggestion-profile-pic">
              ${item.picture 
                ? `<img src="${item.picture}" alt="${name}" class="profile-img" />`
                : `<div class="profile-fallback">${name?.[0]?.toUpperCase() || "?"}</div>`
              }
            </div>
            <div class="suggestion-profile-info">
              <span class="suggestion-profile-name">${name}</span>
            </div>
          </button>
        `;
      } else {
        return `
          <button type="button" class="suggestion-item ${index === selected ? "selected" : ""}" data-index="${index}">
            ${item.source === "unicode" 
              ? `<span class="emoji-unicode">${item.url}</span>`
              : `<img src="${item.url}" alt="${item.shortcode}" class="emoji-img" />`
            }
            <span class="emoji-shortcode">${item.shortcode}</span>
          </button>
        `;
      }
    }).join("");

    container.innerHTML = `<div class="suggestion-menu suggestion-menu-${type}">${itemsHtml}</div>`;

    container.querySelectorAll(".suggestion-item").forEach((btn, idx) => {
      btn.addEventListener("click", () => command(items[idx]));
      btn.addEventListener("mouseenter", () => {
        selectedIndex = idx;
        updateSuggestionContent(container, type, items, idx, command, true);
      });
    });
  }

  // Emoji Node
  const EmojiNode = Node.create({
    name: "emoji",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes() {
      return {
        id: { default: null },
        url: { default: null },
        source: { default: null },
      };
    },
    parseHTML() { return [{ tag: 'span[data-emoji]' }]; },
    renderHTML({ HTMLAttributes }) {
      return ['span', mergeAttributes({ 'data-emoji': HTMLAttributes.id }, HTMLAttributes)];
    },
    renderText({ node }) {
      if (node.attrs.source === "unicode") return node.attrs.url || "";
      return `:${node.attrs.id}:`;
    },
    addNodeView() {
      return ({ node }) => {
        const { url, source, id } = node.attrs;
        const dom = document.createElement("span");
        dom.className = "emoji-node";
        dom.setAttribute("data-emoji", id || "");
        if (source === "unicode" && url) {
          dom.textContent = url;
          dom.title = `:${id}:`;
        } else if (url) {
          const img = document.createElement("img");
          img.src = url;
          img.alt = `:${id}:`;
          img.className = "inline-emoji";
          img.draggable = false;
          dom.appendChild(img);
        } else {
          dom.textContent = `:${id}:`;
        }
        return { dom };
      };
    },
  });

  // Emoji extension with suggestion
  function createEmojiExtension() {
    return EmojiNode.extend({
      addProseMirrorPlugins() {
        return [
          Suggestion({
            editor: this.editor,
            char: ":",
            allowSpaces: false,
            items: async ({ query }) => {
              if (query.length < 2) return [];
              const results = await searchEmojis(query);
              return results.slice(0, 12);
            },
            command: ({ editor, range, props }) => {
              editor.chain().focus().insertContentAt(range, [
                { type: "emoji", attrs: { id: props.shortcode, url: props.url, source: props.source } },
                { type: "text", text: " " },
              ]).run();
            },
            render: () => {
              let popup;
              let container;
              return {
                onStart: (props) => {
                  currentSuggestionType = "emoji";
                  suggestionItems = props.items || [];
                  selectedIndex = 0;
                  container = document.createElement("div");
                  container.className = "suggestion-container";
                  updateSuggestionContent(container, "emoji", suggestionItems, selectedIndex, props.command);
                  popup = tippy("body", {
                    getReferenceClientRect: props.clientRect,
                    appendTo: () => document.body,
                    content: container,
                    showOnCreate: true,
                    interactive: true,
                    trigger: "manual",
                    placement: "top-start",
                    offset: [0, 8],
                    arrow: false,
                    animation: false,
                  });
                  suggestionPopup = popup[0];
                },
                onUpdate(props) {
                  suggestionItems = props.items || [];
                  selectedIndex = 0;
                  updateSuggestionContent(container, "emoji", suggestionItems, selectedIndex, props.command);
                  if (props.clientRect) popup[0]?.setProps({ getReferenceClientRect: props.clientRect });
                },
                onKeyDown(props) {
                  if (props.event.key === "Escape") { popup[0]?.hide(); return true; }
                  if (props.event.key === "ArrowUp") {
                    selectedIndex = (selectedIndex - 1 + suggestionItems.length) % suggestionItems.length;
                    updateSuggestionContent(container, "emoji", suggestionItems, selectedIndex, props.command, true);
                    return true;
                  }
                  if (props.event.key === "ArrowDown") {
                    selectedIndex = (selectedIndex + 1) % suggestionItems.length;
                    updateSuggestionContent(container, "emoji", suggestionItems, selectedIndex, props.command, true);
                    return true;
                  }
                  if (props.event.key === "Enter" || props.event.key === "Tab") {
                    if (suggestionItems[selectedIndex]) props.command(suggestionItems[selectedIndex]);
                    return true;
                  }
                  return false;
                },
                onExit() { popup[0]?.destroy(); suggestionPopup = null; currentSuggestionType = null; },
              };
            },
          }),
        ];
      },
    });
  }

  onMount(() => {
    editor = new Editor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          heading: false,
          bulletList: false,
          orderedList: false,
          codeBlock: false,
          blockquote: false,
          horizontalRule: false,
        }),
        Placeholder.configure({ placeholder }),
        Mention.extend({
          addNodeView() {
            return ({ node }) => {
              const { id, label } = node.attrs;
              const dom = document.createElement("span");
              dom.className = "mention";
              dom.textContent = `@${label}`;
              if (id && id.length === 64) {
                try {
                  const color = hexToColor(id);
                  dom.style.color = rgbToCssString(color);
                } catch (e) {}
              }
              return { dom };
            };
          },
        }).configure({
          HTMLAttributes: { class: "mention" },
          suggestion: {
            ...createProfileSuggestion(),
            command: ({ editor, range, props }) => {
              editor.chain().focus().insertContentAt(range, [
                { type: "mention", attrs: { id: props.pubkey, label: props.displayName || props.name || props.pubkey?.slice(0, 8) } },
                { type: "text", text: " " },
              ]).run();
            },
          },
          renderLabel({ node }) { return `@${node.attrs.label}`; },
        }),
        createEmojiExtension(),
      ],
      editorProps: {
        attributes: { class: "zap-comment-editor-content" },
        handleKeyDown: (view, event) => {
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
            return true;
          }
          return false;
        },
      },
    });
  });

  onDestroy(() => {
    editor?.destroy();
    suggestionPopup?.destroy();
  });

  export function getContent() {
    return editor?.getText({ blockSeparator: "\n" }) || "";
  }

  export function getSerializedContent() {
    if (!editor) return { text: "", emojiTags: [], mentions: [] };
    let text = "";
    const emojiTags = [];
    const mentions = [];
    const seenEmojis = new Set();
    const json = editor.getJSON();
    json.content?.forEach((node) => {
      if (node.type === "paragraph") {
        node.content?.forEach((child) => {
          if (child.type === "text") text += child.text;
          else if (child.type === "hardBreak") text += "\n";
          else if (child.type === "mention") {
            const pubkey = child.attrs?.id;
            if (pubkey) {
              mentions.push(pubkey);
              try { text += `nostr:${nip19.npubEncode(pubkey)}`; }
              catch { text += `@${child.attrs?.label || "unknown"}`; }
            }
          } else if (child.type === "emoji") {
            const { id, url, source } = child.attrs;
            if (source === "unicode" && url) text += url;
            else if (id) {
              text += `:${id}:`;
              if (url && !seenEmojis.has(id)) { seenEmojis.add(id); emojiTags.push({ shortcode: id, url }); }
            }
          }
        });
        text += "\n";
      }
    });
    return { text: text.trim(), emojiTags, mentions };
  }

  export function clear() { editor?.commands.clearContent(); }
  export function focus() { editor?.commands.focus(); }
  export function isEmpty() { return editor?.isEmpty ?? true; }

  function handleSubmit() {
    if (isEmpty()) return;
    dispatch("submit", getSerializedContent());
  }
</script>

<div class="zap-comment-input">
  <!-- Amount Header -->
  <div class="amount-header">
    <div class="amount-display">
      <Zap variant="fill" size={20} color="hsl(var(--goldColor))" />
      <span class="amount-value">{formatAmount(amount)}</span>
      <span class="amount-unit">sats</span>
    </div>
    {#if isTopZap}
      <div class="top-zap-badge">Top Zap</div>
    {/if}
  </div>

  <!-- Divider -->
  <div class="divider"></div>

  <!-- Text Input -->
  <div bind:this={editorElement} class="editor-container"></div>

  <!-- Action Row -->
  <div class="action-row">
    <div class="action-buttons-left">
      <button type="button" class="action-btn" on:click={onCameraTap} aria-label="Add photo">
        <Camera variant="fill" color="hsl(var(--white33))" size={16} />
      </button>
      <button type="button" class="action-btn" on:click={onEmojiTap} aria-label="Add emoji">
        <EmojiFill variant="fill" color="hsl(var(--white33))" size={18} />
      </button>
      <button type="button" class="action-btn" on:click={onGifTap} aria-label="Add GIF">
        <Gif variant="fill" color="hsl(var(--white33))" size={16} />
      </button>
      <button type="button" class="action-btn" on:click={onAddTap} aria-label="Add attachment">
        <Plus variant="outline" color="hsl(var(--white33))" size={16} strokeWidth={2.8} />
      </button>
    </div>

    <div class="send-button-container">
      <button type="button" class="send-btn" on:click={handleSubmit} aria-label="Send zap">
        <Send variant="fill" color="white" size={16} />
      </button>
      <div class="send-divider"></div>
      <button type="button" class="chevron-btn" on:click={onChevronTap} aria-label="Send options">
        <ChevronDown variant="outline" color="rgba(255, 255, 255, 0.66)" size={8} strokeWidth={2.8} />
      </button>
    </div>
  </div>
</div>

<style>
  .zap-comment-input {
    display: flex;
    flex-direction: column;
  }

  /* Amount Header */
  .amount-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 12px 4px;
  }

  .amount-display {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .amount-value {
    font-size: 24px;
    font-weight: 600;
    color: hsl(var(--white));
  }

  .amount-unit {
    font-size: 14px;
    font-weight: 500;
    color: hsl(var(--white33));
    margin-left: 2px;
  }

  .top-zap-badge {
    display: flex;
    align-items: center;
    height: 22px;
    padding: 0 10px;
    background: var(--gradient-gold);
    border-radius: 11px;
    font-size: 11px;
    font-weight: 600;
    color: hsl(var(--black));
  }

  /* Divider */
  .divider {
    width: 100%;
    height: 1.4px;
    background-color: hsl(var(--white11));
    margin-bottom: 12px;
  }

  /* Editor */
  .editor-container {
    min-height: 40px;
    max-height: 120px;
    overflow-y: auto;
    padding: 0 4px 8px 4px;
    scrollbar-width: thin;
    scrollbar-color: hsl(var(--white16)) transparent;
  }

  .editor-container::-webkit-scrollbar {
    width: 4px;
  }

  .editor-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .editor-container::-webkit-scrollbar-thumb {
    background: hsl(var(--white16));
    border-radius: 2px;
  }

  .editor-container :global(.ProseMirror) {
    outline: none;
    min-height: inherit;
  }

  .editor-container :global(.ProseMirror p) {
    margin: 0;
    font-size: 16px;
    line-height: 1.5;
    color: hsl(var(--white));
  }

  .editor-container :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: hsl(var(--white33));
    pointer-events: none;
    float: left;
    height: 0;
  }

  .editor-container :global(.mention) {
    font-weight: 500;
  }

  .editor-container :global(.emoji-node) {
    display: inline;
    vertical-align: middle;
  }

  .editor-container :global(.inline-emoji) {
    width: 1.25em;
    height: 1.25em;
    vertical-align: -0.2em;
    margin: 0 2px;
    display: inline;
  }

  /* Action Row */
  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px;
    gap: 8px;
  }

  .action-buttons-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .action-btn {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: hsl(var(--white8));
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .action-btn:active {
    transform: scale(0.97);
  }

  .send-button-container {
    display: flex;
    align-items: center;
    height: 32px;
    background: var(--gradient-blurple);
    border-radius: 8px;
    overflow: hidden;
  }

  .send-btn {
    height: 100%;
    padding: 0 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .send-btn:active {
    opacity: 0.8;
  }

  .send-divider {
    width: 1px;
    height: 100%;
    background: rgba(255, 255, 255, 0.33);
  }

  .chevron-btn {
    height: 100%;
    padding: 0 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    cursor: pointer;
  }

  .chevron-btn:active {
    opacity: 0.8;
  }

  /* Suggestion menu styles */
  :global(.suggestion-menu) {
    background: hsl(var(--gray33));
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 0.33px solid hsl(var(--white33));
    border-radius: 12px;
    overflow: hidden;
    min-width: 200px;
    max-width: 280px;
    max-height: 200px;
    overflow-y: auto;
  }

  :global(.suggestion-menu-empty) {
    padding: 12px 16px;
    text-align: center;
  }

  :global(.suggestion-empty-text) {
    font-size: 13px;
    color: hsl(var(--white33));
  }

  :global(.suggestion-item) {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    padding: 8px 12px;
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  :global(.suggestion-item.selected) {
    background: hsl(var(--white16));
  }

  :global(.suggestion-item:not(:last-child)) {
    border-bottom: 0.33px solid hsl(var(--white8));
  }

  :global(.suggestion-profile-pic) {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    overflow: hidden;
    flex-shrink: 0;
    background: hsl(var(--gray66));
  }

  :global(.suggestion-profile-pic .profile-img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.suggestion-profile-pic .profile-fallback) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
    color: hsl(var(--white66));
    background: hsl(var(--white16));
  }

  :global(.suggestion-profile-info) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  :global(.suggestion-profile-name) {
    font-size: 14px;
    font-weight: 500;
    color: hsl(var(--white));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.suggestion-profile-nip05) {
    font-size: 12px;
    color: hsl(var(--white33));
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.suggestion-menu-emoji) {
    min-width: 220px;
  }

  :global(.suggestion-menu-emoji .suggestion-item) {
    gap: 10px;
  }

  :global(.emoji-unicode) {
    font-size: 20px;
    line-height: 1;
    width: 24px;
    text-align: center;
  }

  :global(.emoji-img) {
    width: 24px;
    height: 24px;
    object-fit: contain;
  }

  :global(.emoji-shortcode) {
    font-size: 13px;
    color: hsl(var(--white66));
  }

  :global(.tippy-box) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :global(.tippy-content) {
    padding: 0 !important;
  }

  :global(.tippy-arrow) {
    display: none !important;
  }
</style>
