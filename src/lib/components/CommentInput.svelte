<script>
  import { onMount, onDestroy, createEventDispatcher } from "svelte";
  import { Editor, Node, mergeAttributes } from "@tiptap/core";
  import StarterKit from "@tiptap/starter-kit";
  import Mention from "@tiptap/extension-mention";
  import Placeholder from "@tiptap/extension-placeholder";
  import Suggestion from "@tiptap/suggestion";
  import tippy from "tippy.js";
  import "tippy.js/dist/tippy.css";
  import ProfilePic from "./ProfilePic.svelte";
  import { hexToColor, rgbToCssString } from "$lib/utils/color.js";
  import * as nip19 from "nostr-tools/nip19";
  import { Camera, EmojiFill, Gif, Plus, Send, ChevronDown } from "$lib/components/icons";

  const dispatch = createEventDispatcher();

  /** @type {string} - Placeholder text */
  export let placeholder = "Write a comment...";

  /** @type {(query: string) => Promise<Array<{ pubkey: string, name?: string, displayName?: string, picture?: string, nip05?: string }>>} */
  export let searchProfiles = async () => [];

  /** @type {(query: string) => Promise<Array<{ shortcode: string, url: string, source: 'unicode' | 'custom' }>>} */
  export let searchEmojis = async () => [];

  /** @type {boolean} - Auto focus on mount */
  export let autoFocus = false;

  /** @type {'small' | 'medium' | 'large'} - Size preset */
  export let size = "small";

  /** @type {string} - Additional CSS classes */
  export let className = "";

  /** @type {boolean} - Show action row with buttons */
  export let showActionRow = true;

  /** @type {() => void} - Camera button callback */
  export let onCameraTap = () => {};

  /** @type {() => void} - Emoji button callback */
  export let onEmojiTap = () => {};

  /** @type {() => void} - GIF button callback */
  export let onGifTap = () => {};

  /** @type {() => void} - Add button callback */
  export let onAddTap = () => {};

  /** @type {() => void} - Chevron button callback (for send options) */
  export let onChevronTap = () => {};

  // Size mappings
  const sizeMap = {
    small: { minHeight: 40, maxHeight: 120 },
    medium: { minHeight: 80, maxHeight: 200 },
    large: { minHeight: 160, maxHeight: 400 },
  };

  $: dimensions = sizeMap[size] || sizeMap.small;

  let editorElement;
  let editor;
  let suggestionPopup = null;
  let suggestionComponent = null;
  let currentSuggestionType = null; // 'profile' | 'emoji'
  let suggestionItems = [];
  let selectedIndex = 0;
  let isScrollable = false;

  // Check if content is scrollable
  function checkScrollable() {
    if (editorElement) {
      const scrollContainer = editorElement.querySelector(".ProseMirror");
      if (scrollContainer) {
        isScrollable =
          scrollContainer.scrollHeight > scrollContainer.clientHeight;
      }
    }
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
            updateSuggestionContent(
              container,
              "profile",
              suggestionItems,
              selectedIndex,
              props.command,
            );

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
              popperOptions: {
                modifiers: [{ name: "flip", enabled: true }],
              },
            });

            suggestionPopup = popup[0];
          },

          onUpdate(props) {
            suggestionItems = props.items || [];
            selectedIndex = 0;
            updateSuggestionContent(
              container,
              "profile",
              suggestionItems,
              selectedIndex,
              props.command,
            );

            if (props.clientRect) {
              popup[0]?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            }
          },

          onKeyDown(props) {
            if (props.event.key === "Escape") {
              popup[0]?.hide();
              return true;
            }

            if (props.event.key === "ArrowUp") {
              selectedIndex =
                (selectedIndex - 1 + suggestionItems.length) %
                suggestionItems.length;
              updateSuggestionContent(
                container,
                "profile",
                suggestionItems,
                selectedIndex,
                props.command,
                true,
              );
              return true;
            }

            if (props.event.key === "ArrowDown") {
              selectedIndex = (selectedIndex + 1) % suggestionItems.length;
              updateSuggestionContent(
                container,
                "profile",
                suggestionItems,
                selectedIndex,
                props.command,
                true,
              );
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

  // Update suggestion menu content (vanilla JS for tippy)
  function updateSuggestionContent(container, type, items, selected, command, isSelectionOnlyUpdate = false) {
    if (!container) return;

    // If only updating selection, just toggle classes without rebuilding DOM
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

    const itemsHtml = items
      .map((item, index) => {
        if (type === "profile") {
          const name =
            item.displayName || item.name || item.pubkey?.slice(0, 8);
          return `
            <button 
              type="button" 
              class="suggestion-item ${index === selected ? "selected" : ""}"
              data-index="${index}"
            >
              <div class="suggestion-profile-pic">
                ${
                  item.picture
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
          // Emoji - show shortcode without colons
          return `
            <button 
              type="button" 
              class="suggestion-item ${index === selected ? "selected" : ""}"
              data-index="${index}"
            >
              ${
                item.source === "unicode"
                  ? `<span class="emoji-unicode">${item.url}</span>`
                  : `<img src="${item.url}" alt="${item.shortcode}" class="emoji-img" />`
              }
              <span class="emoji-shortcode">${item.shortcode}</span>
            </button>
          `;
        }
      })
      .join("");

    container.innerHTML = `
      <div class="suggestion-menu suggestion-menu-${type}">
        ${itemsHtml}
      </div>
    `;

    // Add click handlers
    container.querySelectorAll(".suggestion-item").forEach((btn, idx) => {
      btn.addEventListener("click", () => {
        command(items[idx]);
      });
      btn.addEventListener("mouseenter", () => {
        selectedIndex = idx;
        // Only update selection classes, don't rebuild entire DOM
        updateSuggestionContent(container, type, items, idx, command, true);
      });
    });
  }

  // Create a standalone emoji Node (not extending Mention to avoid conflicts)
  const EmojiNode = Node.create({
    name: "emoji",
    group: "inline",
    inline: true,
    atom: true, // Treat as a single unit for selection/deletion

    addAttributes() {
      return {
        id: { default: null },
        url: { default: null },
        source: { default: null },
      };
    },

    parseHTML() {
      return [{ tag: 'span[data-emoji]' }];
    },

    renderHTML({ HTMLAttributes }) {
      return ['span', mergeAttributes({ 'data-emoji': HTMLAttributes.id }, HTMLAttributes)];
    },

    renderText({ node }) {
      if (node.attrs.source === "unicode") {
        return node.attrs.url || "";
      }
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

  // Create emoji suggestion plugin
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
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: "emoji",
                    attrs: {
                      id: props.shortcode,
                      url: props.url,
                      source: props.source,
                    },
                  },
                  { type: "text", text: " " },
                ])
                .run();
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
                  updateSuggestionContent(
                    container,
                    "emoji",
                    suggestionItems,
                    selectedIndex,
                    props.command,
                  );

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
                  updateSuggestionContent(
                    container,
                    "emoji",
                    suggestionItems,
                    selectedIndex,
                    props.command,
                  );

                  if (props.clientRect) {
                    popup[0]?.setProps({
                      getReferenceClientRect: props.clientRect,
                    });
                  }
                },

                onKeyDown(props) {
                  if (props.event.key === "Escape") {
                    popup[0]?.hide();
                    return true;
                  }

                  if (props.event.key === "ArrowUp") {
                    selectedIndex =
                      (selectedIndex - 1 + suggestionItems.length) %
                      suggestionItems.length;
                    updateSuggestionContent(
                      container,
                      "emoji",
                      suggestionItems,
                      selectedIndex,
                      props.command,
                      true,
                    );
                    return true;
                  }

                  if (props.event.key === "ArrowDown") {
                    selectedIndex =
                      (selectedIndex + 1) % suggestionItems.length;
                    updateSuggestionContent(
                      container,
                      "emoji",
                      suggestionItems,
                      selectedIndex,
                      props.command,
                      true,
                    );
                    return true;
                  }

                  if (
                    props.event.key === "Enter" ||
                    props.event.key === "Tab"
                  ) {
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
        Placeholder.configure({
          placeholder,
        }),
        Mention.extend({
          // Add custom node view for profile-colored mentions
          addNodeView() {
            return ({ node }) => {
              const { id, label } = node.attrs;
              const dom = document.createElement("span");
              dom.className = "mention";
              dom.textContent = `@${label}`;

              // Apply profile color based on pubkey
              if (id && id.length === 64) {
                try {
                  const color = hexToColor(id);
                  dom.style.color = rgbToCssString(color);
                } catch (e) {
                  // Fallback to default color
                }
              }

              return { dom };
            };
          },
        }).configure({
          HTMLAttributes: { class: "mention" },
          suggestion: {
            ...createProfileSuggestion(),
            command: ({ editor, range, props }) => {
              editor
                .chain()
                .focus()
                .insertContentAt(range, [
                  {
                    type: "mention",
                    attrs: {
                      id: props.pubkey,
                      label:
                        props.displayName ||
                        props.name ||
                        props.pubkey?.slice(0, 8),
                    },
                  },
                  { type: "text", text: " " },
                ])
                .run();
            },
          },
          renderLabel({ node }) {
            return `@${node.attrs.label}`;
          },
        }),
        createEmojiExtension(),
      ],
      editorProps: {
        attributes: {
          class: "comment-editor-content",
        },
        handleKeyDown: (view, event) => {
          // Ctrl/Cmd + Enter to submit
          if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
            return true;
          }
          return false;
        },
      },
      autofocus: autoFocus,
      onUpdate: () => {
        checkScrollable();
        dispatch("change", { content: getContent() });
      },
    });

    // Initial scroll check
    setTimeout(checkScrollable, 100);
  });

  onDestroy(() => {
    editor?.destroy();
    suggestionPopup?.destroy();
  });

  // Public methods
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
          if (child.type === "text") {
            text += child.text;
          } else if (child.type === "hardBreak") {
            text += "\n";
          } else if (child.type === "mention") {
            const pubkey = child.attrs?.id;
            if (pubkey) {
              mentions.push(pubkey);
              // Encode pubkey to npub for nostr: URI
              try {
                const npub = nip19.npubEncode(pubkey);
                text += `nostr:${npub}`;
              } catch {
                // Fallback to display name if encoding fails
                text += `@${child.attrs?.label || "unknown"}`;
              }
            }
          } else if (child.type === "emoji") {
            const { id, url, source } = child.attrs;
            if (source === "unicode" && url) {
              text += url;
            } else if (id) {
              text += `:${id}:`;
              if (url && !seenEmojis.has(id)) {
                seenEmojis.add(id);
                emojiTags.push({ shortcode: id, url });
              }
            }
          }
        });
        text += "\n";
      }
    });

    return {
      text: text.trim(),
      emojiTags,
      mentions,
    };
  }

  export function clear() {
    editor?.commands.clearContent();
  }

  export function focus() {
    editor?.commands.focus();
  }

  export function isEmpty() {
    return editor?.isEmpty ?? true;
  }

  function handleSubmit() {
    if (isEmpty()) return;
    const serialized = getSerializedContent();
    dispatch("submit", serialized);
  }
</script>

<div
  class="comment-input {className}"
  class:scrollable={isScrollable}
  style="--min-height: {dimensions.minHeight}px; --max-height: {dimensions.maxHeight}px;"
>
  <div class="editor-wrapper">
    <div class="shader-top"></div>
    <div bind:this={editorElement} class="editor-container"></div>
    <div class="shader-bottom"></div>
  </div>

  {#if showActionRow}
    <div class="action-row">
      <!-- Left buttons -->
      <div class="action-buttons-left">
        <button
          type="button"
          class="action-btn"
          on:click={onCameraTap}
          aria-label="Add photo"
        >
          <Camera variant="fill" color="hsl(var(--white33))" size={20} />
        </button>
        
        <button
          type="button"
          class="action-btn"
          on:click={onEmojiTap}
          aria-label="Add emoji"
        >
          <EmojiFill variant="fill" color="hsl(var(--white33))" size={20} />
        </button>
        
        <button
          type="button"
          class="action-btn"
          on:click={onGifTap}
          aria-label="Add GIF"
        >
          <Gif variant="fill" color="hsl(var(--white33))" size={20} />
        </button>
        
        <button
          type="button"
          class="action-btn"
          on:click={onAddTap}
          aria-label="Add attachment"
        >
          <Plus variant="outline" color="hsl(var(--white33))" size={16} strokeWidth={2.8} />
        </button>
      </div>

      <!-- Send button with chevron -->
      <div class="send-button-container">
        <button
          type="button"
          class="send-btn"
          on:click={handleSubmit}
          aria-label="Send"
        >
          <Send variant="fill" color="white" size={16} />
        </button>
        <div class="send-divider"></div>
        <button
          type="button"
          class="chevron-btn"
          on:click={onChevronTap}
          aria-label="Send options"
        >
          <ChevronDown variant="outline" color="rgba(255, 255, 255, 0.66)" size={8} strokeWidth={2.8} />
        </button>
      </div>
    </div>
  {/if}
</div>

<style>
  .comment-input {
    position: relative;
    background: hsl(var(--black33));
    border-radius: var(--radius-16);
    border: 0.33px solid hsl(var(--white33));
  }

  .editor-wrapper {
    position: relative;
    min-height: var(--min-height);
    max-height: var(--max-height);
    overflow: hidden;
  }

  .editor-container {
    min-height: var(--min-height);
    max-height: var(--max-height);
    overflow-y: auto;
    padding: 12px 16px;
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

  /* Shader gradients for scroll indication - always visible */
  .shader-top,
  .shader-bottom {
    position: absolute;
    left: 0;
    right: 4px;
    height: 8px;
    pointer-events: none;
    z-index: 1;
  }

  .shader-top {
    top: 0;
    background: linear-gradient(
      to bottom,
      hsl(var(--black33)) 0%,
      hsl(var(--black33) / 0) 100%
    );
    border-radius: var(--radius-16) var(--radius-16) 0 0;
  }

  .shader-bottom {
    bottom: 0;
    background: linear-gradient(
      to top,
      hsl(var(--black33)) 0%,
      hsl(var(--black33) / 0) 100%
    );
    border-radius: 0 0 var(--radius-16) var(--radius-16);
  }

  /* Editor content styles */
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

  .editor-container
    :global(.ProseMirror p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    color: hsl(var(--white33));
    pointer-events: none;
    float: left;
    height: 0;
  }

  /* Mention styles - color is set dynamically by nodeView based on pubkey */
  .editor-container :global(.mention) {
    font-weight: 500;
  }

  /* Emoji styles */
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

  /* Suggestion menu styles (tippy content) */
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

  /* Hide the pointer - we're not using it */
  :global(.suggestion-pointer) {
    display: none;
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
    transition: background-color 0.1s ease;
    text-align: left;
  }

  :global(.suggestion-item:hover),
  :global(.suggestion-item.selected) {
    background: hsl(var(--white16));
  }

  :global(.suggestion-item:not(:last-child)) {
    border-bottom: 0.33px solid hsl(var(--white8));
  }

  /* Profile suggestion styles */
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

  /* Emoji suggestion styles */
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

  /* Tippy customization - hide default styling */
  :global(.tippy-box) {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :global(.tippy-box[data-theme~="light"]) {
    background: transparent !important;
  }

  :global(.tippy-content) {
    padding: 0 !important;
  }

  :global(.tippy-arrow) {
    display: none !important;
  }

  :global(.tippy-box::before),
  :global(.tippy-box::after) {
    display: none !important;
  }

  /* Action Row Styles */
  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px 8px 12px;
    gap: 8px;
  }

  .action-buttons-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Small square action buttons */
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

  /* Send button container with chevron */
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
</style>
