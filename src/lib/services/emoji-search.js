/**
 * Emoji Search Service
 * 
 * Provides emoji search functionality with:
 * - Unicode emojis (built-in)
 * - Custom emojis from user's emoji list (kind 10030)
 * - Custom emoji sets (kind 30030)
 * 
 * Based on Grimoire's implementation
 */

import { fetchEvents, fetchFirstEvent, SOCIAL_RELAYS } from '$lib/applesauce.js';

const KIND_USER_EMOJI_LIST = 10030;
const KIND_EMOJI_SET = 30030;

// Common Unicode emojis with shortcode mappings
// Based on common shortcodes used across platforms (Slack, Discord, GitHub)
export const UNICODE_EMOJIS = [
  // Smileys & Emotion
  { shortcode: "smile", emoji: "\u{1F604}" },
  { shortcode: "grinning", emoji: "\u{1F600}" },
  { shortcode: "joy", emoji: "\u{1F602}" },
  { shortcode: "rofl", emoji: "\u{1F923}" },
  { shortcode: "smiley", emoji: "\u{1F603}" },
  { shortcode: "sweat_smile", emoji: "\u{1F605}" },
  { shortcode: "laughing", emoji: "\u{1F606}" },
  { shortcode: "wink", emoji: "\u{1F609}" },
  { shortcode: "blush", emoji: "\u{1F60A}" },
  { shortcode: "yum", emoji: "\u{1F60B}" },
  { shortcode: "sunglasses", emoji: "\u{1F60E}" },
  { shortcode: "heart_eyes", emoji: "\u{1F60D}" },
  { shortcode: "kissing_heart", emoji: "\u{1F618}" },
  { shortcode: "kissing", emoji: "\u{1F617}" },
  { shortcode: "relaxed", emoji: "\u{263A}\u{FE0F}" },
  { shortcode: "stuck_out_tongue", emoji: "\u{1F61B}" },
  { shortcode: "stuck_out_tongue_winking_eye", emoji: "\u{1F61C}" },
  { shortcode: "stuck_out_tongue_closed_eyes", emoji: "\u{1F61D}" },
  { shortcode: "money_mouth_face", emoji: "\u{1F911}" },
  { shortcode: "hugs", emoji: "\u{1F917}" },
  { shortcode: "nerd_face", emoji: "\u{1F913}" },
  { shortcode: "smirk", emoji: "\u{1F60F}" },
  { shortcode: "unamused", emoji: "\u{1F612}" },
  { shortcode: "disappointed", emoji: "\u{1F61E}" },
  { shortcode: "pensive", emoji: "\u{1F614}" },
  { shortcode: "worried", emoji: "\u{1F61F}" },
  { shortcode: "confused", emoji: "\u{1F615}" },
  { shortcode: "slightly_frowning_face", emoji: "\u{1F641}" },
  { shortcode: "frowning_face", emoji: "\u{2639}\u{FE0F}" },
  { shortcode: "persevere", emoji: "\u{1F623}" },
  { shortcode: "confounded", emoji: "\u{1F616}" },
  { shortcode: "tired_face", emoji: "\u{1F62B}" },
  { shortcode: "weary", emoji: "\u{1F629}" },
  { shortcode: "cry", emoji: "\u{1F622}" },
  { shortcode: "sob", emoji: "\u{1F62D}" },
  { shortcode: "triumph", emoji: "\u{1F624}" },
  { shortcode: "angry", emoji: "\u{1F620}" },
  { shortcode: "rage", emoji: "\u{1F621}" },
  { shortcode: "no_mouth", emoji: "\u{1F636}" },
  { shortcode: "neutral_face", emoji: "\u{1F610}" },
  { shortcode: "expressionless", emoji: "\u{1F611}" },
  { shortcode: "hushed", emoji: "\u{1F62F}" },
  { shortcode: "flushed", emoji: "\u{1F633}" },
  { shortcode: "astonished", emoji: "\u{1F632}" },
  { shortcode: "open_mouth", emoji: "\u{1F62E}" },
  { shortcode: "scream", emoji: "\u{1F631}" },
  { shortcode: "fearful", emoji: "\u{1F628}" },
  { shortcode: "cold_sweat", emoji: "\u{1F630}" },
  { shortcode: "disappointed_relieved", emoji: "\u{1F625}" },
  { shortcode: "sweat", emoji: "\u{1F613}" },
  { shortcode: "sleeping", emoji: "\u{1F634}" },
  { shortcode: "sleepy", emoji: "\u{1F62A}" },
  { shortcode: "dizzy_face", emoji: "\u{1F635}" },
  { shortcode: "zipper_mouth_face", emoji: "\u{1F910}" },
  { shortcode: "mask", emoji: "\u{1F637}" },
  { shortcode: "thermometer_face", emoji: "\u{1F912}" },
  { shortcode: "head_bandage", emoji: "\u{1F915}" },
  { shortcode: "thinking", emoji: "\u{1F914}" },
  { shortcode: "rolling_eyes", emoji: "\u{1F644}" },
  { shortcode: "upside_down_face", emoji: "\u{1F643}" },
  { shortcode: "face_with_hand_over_mouth", emoji: "\u{1F92D}" },
  { shortcode: "shushing_face", emoji: "\u{1F92B}" },
  { shortcode: "exploding_head", emoji: "\u{1F92F}" },
  { shortcode: "cowboy_hat_face", emoji: "\u{1F920}" },
  { shortcode: "partying_face", emoji: "\u{1F973}" },
  { shortcode: "woozy_face", emoji: "\u{1F974}" },
  { shortcode: "pleading_face", emoji: "\u{1F97A}" },
  { shortcode: "skull", emoji: "\u{1F480}" },

  // Gestures & Body
  { shortcode: "thumbsup", emoji: "\u{1F44D}" },
  { shortcode: "+1", emoji: "\u{1F44D}" },
  { shortcode: "thumbsdown", emoji: "\u{1F44E}" },
  { shortcode: "-1", emoji: "\u{1F44E}" },
  { shortcode: "ok_hand", emoji: "\u{1F44C}" },
  { shortcode: "punch", emoji: "\u{1F44A}" },
  { shortcode: "fist", emoji: "\u{270A}" },
  { shortcode: "wave", emoji: "\u{1F44B}" },
  { shortcode: "hand", emoji: "\u{270B}" },
  { shortcode: "open_hands", emoji: "\u{1F450}" },
  { shortcode: "point_up", emoji: "\u{261D}\u{FE0F}" },
  { shortcode: "point_down", emoji: "\u{1F447}" },
  { shortcode: "point_left", emoji: "\u{1F448}" },
  { shortcode: "point_right", emoji: "\u{1F449}" },
  { shortcode: "clap", emoji: "\u{1F44F}" },
  { shortcode: "pray", emoji: "\u{1F64F}" },
  { shortcode: "muscle", emoji: "\u{1F4AA}" },
  { shortcode: "metal", emoji: "\u{1F918}" },
  { shortcode: "crossed_fingers", emoji: "\u{1F91E}" },
  { shortcode: "v", emoji: "\u{270C}\u{FE0F}" },
  { shortcode: "love_you_gesture", emoji: "\u{1F91F}" },
  { shortcode: "call_me_hand", emoji: "\u{1F919}" },
  { shortcode: "raised_back_of_hand", emoji: "\u{1F91A}" },
  { shortcode: "handshake", emoji: "\u{1F91D}" },
  { shortcode: "writing_hand", emoji: "\u{270D}\u{FE0F}" },
  { shortcode: "eyes", emoji: "\u{1F440}" },
  { shortcode: "eye", emoji: "\u{1F441}\u{FE0F}" },
  { shortcode: "brain", emoji: "\u{1F9E0}" },

  // Hearts & Symbols
  { shortcode: "heart", emoji: "\u{2764}\u{FE0F}" },
  { shortcode: "red_heart", emoji: "\u{2764}\u{FE0F}" },
  { shortcode: "orange_heart", emoji: "\u{1F9E1}" },
  { shortcode: "yellow_heart", emoji: "\u{1F49B}" },
  { shortcode: "green_heart", emoji: "\u{1F49A}" },
  { shortcode: "blue_heart", emoji: "\u{1F499}" },
  { shortcode: "purple_heart", emoji: "\u{1F49C}" },
  { shortcode: "black_heart", emoji: "\u{1F5A4}" },
  { shortcode: "broken_heart", emoji: "\u{1F494}" },
  { shortcode: "two_hearts", emoji: "\u{1F495}" },
  { shortcode: "sparkling_heart", emoji: "\u{1F496}" },
  { shortcode: "heartpulse", emoji: "\u{1F497}" },
  { shortcode: "heartbeat", emoji: "\u{1F493}" },
  { shortcode: "fire", emoji: "\u{1F525}" },
  { shortcode: "star", emoji: "\u{2B50}" },
  { shortcode: "star2", emoji: "\u{1F31F}" },
  { shortcode: "sparkles", emoji: "\u{2728}" },
  { shortcode: "zap", emoji: "\u{26A1}" },
  { shortcode: "boom", emoji: "\u{1F4A5}" },
  { shortcode: "100", emoji: "\u{1F4AF}" },
  { shortcode: "checkmark", emoji: "\u{2714}\u{FE0F}" },
  { shortcode: "white_check_mark", emoji: "\u{2705}" },
  { shortcode: "x", emoji: "\u{274C}" },
  { shortcode: "question", emoji: "\u{2753}" },
  { shortcode: "exclamation", emoji: "\u{2757}" },
  { shortcode: "warning", emoji: "\u{26A0}\u{FE0F}" },

  // Animals
  { shortcode: "dog", emoji: "\u{1F436}" },
  { shortcode: "cat", emoji: "\u{1F431}" },
  { shortcode: "mouse", emoji: "\u{1F42D}" },
  { shortcode: "rabbit", emoji: "\u{1F430}" },
  { shortcode: "bear", emoji: "\u{1F43B}" },
  { shortcode: "panda_face", emoji: "\u{1F43C}" },
  { shortcode: "lion", emoji: "\u{1F981}" },
  { shortcode: "pig", emoji: "\u{1F437}" },
  { shortcode: "frog", emoji: "\u{1F438}" },
  { shortcode: "monkey_face", emoji: "\u{1F435}" },
  { shortcode: "see_no_evil", emoji: "\u{1F648}" },
  { shortcode: "hear_no_evil", emoji: "\u{1F649}" },
  { shortcode: "speak_no_evil", emoji: "\u{1F64A}" },
  { shortcode: "chicken", emoji: "\u{1F414}" },
  { shortcode: "penguin", emoji: "\u{1F427}" },
  { shortcode: "bird", emoji: "\u{1F426}" },
  { shortcode: "eagle", emoji: "\u{1F985}" },
  { shortcode: "duck", emoji: "\u{1F986}" },
  { shortcode: "owl", emoji: "\u{1F989}" },
  { shortcode: "bat", emoji: "\u{1F987}" },
  { shortcode: "wolf", emoji: "\u{1F43A}" },
  { shortcode: "fox_face", emoji: "\u{1F98A}" },
  { shortcode: "unicorn", emoji: "\u{1F984}" },
  { shortcode: "bee", emoji: "\u{1F41D}" },
  { shortcode: "bug", emoji: "\u{1F41B}" },
  { shortcode: "butterfly", emoji: "\u{1F98B}" },
  { shortcode: "snail", emoji: "\u{1F40C}" },
  { shortcode: "turtle", emoji: "\u{1F422}" },
  { shortcode: "snake", emoji: "\u{1F40D}" },
  { shortcode: "dragon", emoji: "\u{1F409}" },
  { shortcode: "octopus", emoji: "\u{1F419}" },
  { shortcode: "whale", emoji: "\u{1F433}" },
  { shortcode: "dolphin", emoji: "\u{1F42C}" },
  { shortcode: "shark", emoji: "\u{1F988}" },
  { shortcode: "crab", emoji: "\u{1F980}" },
  { shortcode: "shrimp", emoji: "\u{1F990}" },

  // Food & Drink
  { shortcode: "apple", emoji: "\u{1F34E}" },
  { shortcode: "green_apple", emoji: "\u{1F34F}" },
  { shortcode: "banana", emoji: "\u{1F34C}" },
  { shortcode: "orange", emoji: "\u{1F34A}" },
  { shortcode: "lemon", emoji: "\u{1F34B}" },
  { shortcode: "watermelon", emoji: "\u{1F349}" },
  { shortcode: "grapes", emoji: "\u{1F347}" },
  { shortcode: "strawberry", emoji: "\u{1F353}" },
  { shortcode: "peach", emoji: "\u{1F351}" },
  { shortcode: "cherries", emoji: "\u{1F352}" },
  { shortcode: "pineapple", emoji: "\u{1F34D}" },
  { shortcode: "avocado", emoji: "\u{1F951}" },
  { shortcode: "tomato", emoji: "\u{1F345}" },
  { shortcode: "eggplant", emoji: "\u{1F346}" },
  { shortcode: "carrot", emoji: "\u{1F955}" },
  { shortcode: "corn", emoji: "\u{1F33D}" },
  { shortcode: "pizza", emoji: "\u{1F355}" },
  { shortcode: "hamburger", emoji: "\u{1F354}" },
  { shortcode: "fries", emoji: "\u{1F35F}" },
  { shortcode: "hotdog", emoji: "\u{1F32D}" },
  { shortcode: "taco", emoji: "\u{1F32E}" },
  { shortcode: "burrito", emoji: "\u{1F32F}" },
  { shortcode: "popcorn", emoji: "\u{1F37F}" },
  { shortcode: "sushi", emoji: "\u{1F363}" },
  { shortcode: "ramen", emoji: "\u{1F35C}" },
  { shortcode: "cookie", emoji: "\u{1F36A}" },
  { shortcode: "cake", emoji: "\u{1F370}" },
  { shortcode: "birthday", emoji: "\u{1F382}" },
  { shortcode: "ice_cream", emoji: "\u{1F368}" },
  { shortcode: "doughnut", emoji: "\u{1F369}" },
  { shortcode: "chocolate_bar", emoji: "\u{1F36B}" },
  { shortcode: "candy", emoji: "\u{1F36C}" },
  { shortcode: "coffee", emoji: "\u{2615}" },
  { shortcode: "tea", emoji: "\u{1F375}" },
  { shortcode: "beer", emoji: "\u{1F37A}" },
  { shortcode: "beers", emoji: "\u{1F37B}" },
  { shortcode: "wine_glass", emoji: "\u{1F377}" },
  { shortcode: "cocktail", emoji: "\u{1F378}" },
  { shortcode: "champagne", emoji: "\u{1F37E}" },

  // Activities & Objects
  { shortcode: "soccer", emoji: "\u{26BD}" },
  { shortcode: "basketball", emoji: "\u{1F3C0}" },
  { shortcode: "football", emoji: "\u{1F3C8}" },
  { shortcode: "baseball", emoji: "\u{26BE}" },
  { shortcode: "tennis", emoji: "\u{1F3BE}" },
  { shortcode: "golf", emoji: "\u{26F3}" },
  { shortcode: "trophy", emoji: "\u{1F3C6}" },
  { shortcode: "medal_sports", emoji: "\u{1F3C5}" },
  { shortcode: "guitar", emoji: "\u{1F3B8}" },
  { shortcode: "microphone", emoji: "\u{1F3A4}" },
  { shortcode: "headphones", emoji: "\u{1F3A7}" },
  { shortcode: "video_game", emoji: "\u{1F3AE}" },
  { shortcode: "dart", emoji: "\u{1F3AF}" },
  { shortcode: "game_die", emoji: "\u{1F3B2}" },
  { shortcode: "art", emoji: "\u{1F3A8}" },
  { shortcode: "movie_camera", emoji: "\u{1F3A5}" },
  { shortcode: "camera", emoji: "\u{1F4F7}" },
  { shortcode: "tv", emoji: "\u{1F4FA}" },
  { shortcode: "computer", emoji: "\u{1F4BB}" },
  { shortcode: "keyboard", emoji: "\u{2328}\u{FE0F}" },
  { shortcode: "iphone", emoji: "\u{1F4F1}" },
  { shortcode: "telephone", emoji: "\u{260E}\u{FE0F}" },
  { shortcode: "bulb", emoji: "\u{1F4A1}" },
  { shortcode: "flashlight", emoji: "\u{1F526}" },
  { shortcode: "wrench", emoji: "\u{1F527}" },
  { shortcode: "hammer", emoji: "\u{1F528}" },
  { shortcode: "gear", emoji: "\u{2699}\u{FE0F}" },
  { shortcode: "link", emoji: "\u{1F517}" },
  { shortcode: "lock", emoji: "\u{1F512}" },
  { shortcode: "unlock", emoji: "\u{1F513}" },
  { shortcode: "key", emoji: "\u{1F511}" },
  { shortcode: "mag", emoji: "\u{1F50D}" },
  { shortcode: "hourglass", emoji: "\u{231B}" },
  { shortcode: "alarm_clock", emoji: "\u{23F0}" },
  { shortcode: "stopwatch", emoji: "\u{23F1}\u{FE0F}" },
  { shortcode: "calendar", emoji: "\u{1F4C5}" },
  { shortcode: "memo", emoji: "\u{1F4DD}" },
  { shortcode: "pencil2", emoji: "\u{270F}\u{FE0F}" },
  { shortcode: "scissors", emoji: "\u{2702}\u{FE0F}" },
  { shortcode: "paperclip", emoji: "\u{1F4CE}" },
  { shortcode: "bookmark", emoji: "\u{1F516}" },
  { shortcode: "books", emoji: "\u{1F4DA}" },
  { shortcode: "book", emoji: "\u{1F4D6}" },
  { shortcode: "notebook", emoji: "\u{1F4D3}" },
  { shortcode: "newspaper", emoji: "\u{1F4F0}" },
  { shortcode: "envelope", emoji: "\u{2709}\u{FE0F}" },
  { shortcode: "email", emoji: "\u{1F4E7}" },
  { shortcode: "mailbox", emoji: "\u{1F4EB}" },
  { shortcode: "package", emoji: "\u{1F4E6}" },
  { shortcode: "gift", emoji: "\u{1F381}" },
  { shortcode: "balloon", emoji: "\u{1F388}" },
  { shortcode: "tada", emoji: "\u{1F389}" },
  { shortcode: "confetti_ball", emoji: "\u{1F38A}" },
  { shortcode: "ribbon", emoji: "\u{1F380}" },
  { shortcode: "medal_military", emoji: "\u{1F396}\u{FE0F}" },

  // Nature & Weather
  { shortcode: "sunny", emoji: "\u{2600}\u{FE0F}" },
  { shortcode: "cloud", emoji: "\u{2601}\u{FE0F}" },
  { shortcode: "rain_cloud", emoji: "\u{1F327}\u{FE0F}" },
  { shortcode: "thunder_cloud_and_rain", emoji: "\u{26C8}\u{FE0F}" },
  { shortcode: "rainbow", emoji: "\u{1F308}" },
  { shortcode: "snowflake", emoji: "\u{2744}\u{FE0F}" },
  { shortcode: "snowman", emoji: "\u{26C4}" },
  { shortcode: "wind_face", emoji: "\u{1F32C}\u{FE0F}" },
  { shortcode: "tornado", emoji: "\u{1F32A}\u{FE0F}" },
  { shortcode: "ocean", emoji: "\u{1F30A}" },
  { shortcode: "droplet", emoji: "\u{1F4A7}" },
  { shortcode: "sun_with_face", emoji: "\u{1F31E}" },
  { shortcode: "full_moon", emoji: "\u{1F315}" },
  { shortcode: "new_moon", emoji: "\u{1F311}" },
  { shortcode: "crescent_moon", emoji: "\u{1F319}" },
  { shortcode: "earth_americas", emoji: "\u{1F30E}" },
  { shortcode: "earth_africa", emoji: "\u{1F30D}" },
  { shortcode: "earth_asia", emoji: "\u{1F30F}" },
  { shortcode: "globe_with_meridians", emoji: "\u{1F310}" },
  { shortcode: "sun_behind_cloud", emoji: "\u{26C5}" },
  { shortcode: "rose", emoji: "\u{1F339}" },
  { shortcode: "sunflower", emoji: "\u{1F33B}" },
  { shortcode: "tulip", emoji: "\u{1F337}" },
  { shortcode: "cherry_blossom", emoji: "\u{1F338}" },
  { shortcode: "hibiscus", emoji: "\u{1F33A}" },
  { shortcode: "bouquet", emoji: "\u{1F490}" },
  { shortcode: "seedling", emoji: "\u{1F331}" },
  { shortcode: "evergreen_tree", emoji: "\u{1F332}" },
  { shortcode: "deciduous_tree", emoji: "\u{1F333}" },
  { shortcode: "palm_tree", emoji: "\u{1F334}" },
  { shortcode: "cactus", emoji: "\u{1F335}" },
  { shortcode: "herb", emoji: "\u{1F33F}" },
  { shortcode: "four_leaf_clover", emoji: "\u{1F340}" },
  { shortcode: "maple_leaf", emoji: "\u{1F341}" },
  { shortcode: "fallen_leaf", emoji: "\u{1F342}" },
  { shortcode: "mushroom", emoji: "\u{1F344}" },

  // Travel & Places
  { shortcode: "car", emoji: "\u{1F697}" },
  { shortcode: "taxi", emoji: "\u{1F695}" },
  { shortcode: "bus", emoji: "\u{1F68C}" },
  { shortcode: "truck", emoji: "\u{1F69A}" },
  { shortcode: "bike", emoji: "\u{1F6B2}" },
  { shortcode: "motorcycle", emoji: "\u{1F3CD}\u{FE0F}" },
  { shortcode: "airplane", emoji: "\u{2708}\u{FE0F}" },
  { shortcode: "rocket", emoji: "\u{1F680}" },
  { shortcode: "helicopter", emoji: "\u{1F681}" },
  { shortcode: "boat", emoji: "\u{26F5}" },
  { shortcode: "ship", emoji: "\u{1F6A2}" },
  { shortcode: "anchor", emoji: "\u{2693}" },
  { shortcode: "train", emoji: "\u{1F686}" },
  { shortcode: "metro", emoji: "\u{1F687}" },
  { shortcode: "house", emoji: "\u{1F3E0}" },
  { shortcode: "office", emoji: "\u{1F3E2}" },
  { shortcode: "hospital", emoji: "\u{1F3E5}" },
  { shortcode: "school", emoji: "\u{1F3EB}" },
  { shortcode: "church", emoji: "\u{26EA}" },
  { shortcode: "tent", emoji: "\u{26FA}" },
  { shortcode: "mountain", emoji: "\u{26F0}\u{FE0F}" },
  { shortcode: "camping", emoji: "\u{1F3D5}\u{FE0F}" },
  { shortcode: "beach_umbrella", emoji: "\u{1F3D6}\u{FE0F}" },
  { shortcode: "desert", emoji: "\u{1F3DC}\u{FE0F}" },
  { shortcode: "desert_island", emoji: "\u{1F3DD}\u{FE0F}" },
  { shortcode: "national_park", emoji: "\u{1F3DE}\u{FE0F}" },
  { shortcode: "stadium", emoji: "\u{1F3DF}\u{FE0F}" },
  { shortcode: "statue_of_liberty", emoji: "\u{1F5FD}" },
  { shortcode: "japan", emoji: "\u{1F5FE}" },
  { shortcode: "moyai", emoji: "\u{1F5FF}" },

  // Bitcoin/Crypto related
  { shortcode: "bitcoin", emoji: "\u{20BF}" },
  { shortcode: "moneybag", emoji: "\u{1F4B0}" },
  { shortcode: "money_with_wings", emoji: "\u{1F4B8}" },
  { shortcode: "dollar", emoji: "\u{1F4B5}" },
  { shortcode: "euro", emoji: "\u{1F4B6}" },
  { shortcode: "yen", emoji: "\u{1F4B4}" },
  { shortcode: "pound", emoji: "\u{1F4B7}" },
  { shortcode: "gem", emoji: "\u{1F48E}" },
  { shortcode: "chart", emoji: "\u{1F4C8}" },
  { shortcode: "chart_with_upwards_trend", emoji: "\u{1F4C8}" },
  { shortcode: "chart_with_downwards_trend", emoji: "\u{1F4C9}" },

  // Misc popular
  { shortcode: "zzz", emoji: "\u{1F4A4}" },
  { shortcode: "poop", emoji: "\u{1F4A9}" },
  { shortcode: "hankey", emoji: "\u{1F4A9}" },
  { shortcode: "ghost", emoji: "\u{1F47B}" },
  { shortcode: "alien", emoji: "\u{1F47D}" },
  { shortcode: "robot", emoji: "\u{1F916}" },
  { shortcode: "jack_o_lantern", emoji: "\u{1F383}" },
  { shortcode: "santa", emoji: "\u{1F385}" },
  { shortcode: "christmas_tree", emoji: "\u{1F384}" },
  { shortcode: "egg", emoji: "\u{1F95A}" },
  { shortcode: "crown", emoji: "\u{1F451}" },
  { shortcode: "ring", emoji: "\u{1F48D}" },
  { shortcode: "lipstick", emoji: "\u{1F484}" },
  { shortcode: "pill", emoji: "\u{1F48A}" },
  { shortcode: "syringe", emoji: "\u{1F489}" },
  { shortcode: "cigarette", emoji: "\u{1F6AC}" },
  { shortcode: "coffin", emoji: "\u{26B0}\u{FE0F}" },
];

/**
 * Extract emoji tags from a Nostr event
 * @param {Object} event - Nostr event
 * @returns {Array<{shortcode: string, url: string}>}
 */
function getEmojiTags(event) {
  if (!event || !event.tags) return [];
  
  return event.tags
    .filter(tag => tag[0] === 'emoji' && tag[1] && tag[2])
    .map(tag => ({
      shortcode: tag[1],
      url: tag[2]
    }));
}

/**
 * Creates an emoji search service for a given user
 * @param {string} userPubkey - The logged-in user's pubkey (optional)
 * @returns {Object} Emoji search service
 */
export function createEmojiSearch(userPubkey = null) {
  // Map of shortcode -> emoji data
  const emojis = new Map();
  let isInitialized = false;
  let initPromise = null;

  // Add Unicode emojis immediately
  for (const e of UNICODE_EMOJIS) {
    emojis.set(e.shortcode.toLowerCase(), {
      shortcode: e.shortcode,
      url: e.emoji,
      source: 'unicode'
    });
  }

  /**
   * Add a custom emoji (from kind 10030 or 30030)
   * @param {string} shortcode 
   * @param {string} url 
   * @param {string} source - 'user' or 'set:<identifier>'
   */
  function addEmoji(shortcode, url, source = 'custom') {
    const normalized = shortcode.toLowerCase().replace(/^:|:$/g, '');
    
    // User emojis have priority over sets, and both have priority over unicode
    const existing = emojis.get(normalized);
    if (existing) {
      if (existing.source === 'user' && source !== 'user') {
        return; // Don't overwrite user emojis
      }
      if (existing.source !== 'unicode' && source === 'unicode') {
        return; // Don't overwrite custom with unicode
      }
    }
    
    emojis.set(normalized, {
      shortcode: normalized,
      url,
      source
    });
  }

  /**
   * Add emojis from user's emoji list (kind 10030)
   * @param {Object} event 
   */
  function addUserEmojiList(event) {
    if (!event || event.kind !== KIND_USER_EMOJI_LIST) return;
    
    const emojiTags = getEmojiTags(event);
    for (const emoji of emojiTags) {
      addEmoji(emoji.shortcode, emoji.url, 'user');
    }
    
    console.log('[EmojiSearch] Added', emojiTags.length, 'user emojis from kind 10030');
  }

  /**
   * Add emojis from an emoji set (kind 30030)
   * @param {Object} event 
   */
  function addEmojiSet(event) {
    if (!event || event.kind !== KIND_EMOJI_SET) return;
    
    const identifier = event.tags.find(t => t[0] === 'd')?.[1] || 'unnamed';
    const emojiTags = getEmojiTags(event);
    
    for (const emoji of emojiTags) {
      addEmoji(emoji.shortcode, emoji.url, `set:${identifier}`);
    }
    
    console.log('[EmojiSearch] Added', emojiTags.length, 'emojis from set:', identifier);
  }

  /**
   * Initialize the service by loading user's custom emojis
   */
  async function init() {
    if (isInitialized) return;
    if (initPromise) return initPromise;
    if (!userPubkey) {
      isInitialized = true;
      return;
    }

    initPromise = (async () => {
      try {
        console.log('[EmojiSearch] Initializing for user:', userPubkey);
        
        // Fetch user's emoji list (kind 10030) and their emoji sets (kind 30030) in parallel
        const [userEmojiListEvents, userEmojiSets] = await Promise.all([
          fetchEvents(SOCIAL_RELAYS, {
            kinds: [KIND_USER_EMOJI_LIST],
            authors: [userPubkey],
            limit: 1
          }, { timeout: 5000 }),
          fetchEvents(SOCIAL_RELAYS, {
            kinds: [KIND_EMOJI_SET],
            authors: [userPubkey],
            limit: 50
          }, { timeout: 5000 })
        ]);

        // Process user emoji list
        if (userEmojiListEvents && userEmojiListEvents.length > 0) {
          const userEmojiList = userEmojiListEvents[0];
          addUserEmojiList(userEmojiList);
          
          // Also fetch referenced emoji sets from "a" tags
          const aTags = userEmojiList.tags.filter(
            t => t[0] === 'a' && t[1]?.startsWith('30030:')
          );
          
          if (aTags.length > 0) {
            console.log('[EmojiSearch] Found', aTags.length, 'referenced emoji sets');
            
            // Fetch referenced emoji sets
            const setCoordinates = aTags.map(t => {
              const [, coordinate] = t;
              const parts = coordinate.split(':');
              return { kind: parseInt(parts[0]), pubkey: parts[1], identifier: parts[2] };
            }).filter(c => c.kind && c.pubkey && c.identifier !== undefined);
            
            // Fetch each referenced set
            for (const coord of setCoordinates) {
              try {
                const setEvents = await fetchEvents(SOCIAL_RELAYS, {
                  kinds: [coord.kind],
                  authors: [coord.pubkey],
                  '#d': [coord.identifier],
                  limit: 1
                }, { timeout: 3000 });
                
                if (setEvents && setEvents.length > 0) {
                  addEmojiSet(setEvents[0]);
                }
              } catch (e) {
                console.warn('[EmojiSearch] Failed to fetch emoji set:', coord, e);
              }
            }
          }
        }

        // Process user's own emoji sets
        if (userEmojiSets && userEmojiSets.length > 0) {
          console.log('[EmojiSearch] Found', userEmojiSets.length, 'user-authored emoji sets');
          for (const setEvent of userEmojiSets) {
            addEmojiSet(setEvent);
          }
        }

        console.log('[EmojiSearch] Total emojis:', emojis.size);
        isInitialized = true;
      } catch (err) {
        console.error('[EmojiSearch] Init error:', err);
        isInitialized = true;
      }
    })();

    return initPromise;
  }

  /**
   * Search emojis by shortcode
   * @param {string} query - Search query
   * @returns {Promise<Array>} Matching emojis
   */
  async function search(query) {
    // Ensure initialized
    await init();

    if (!query || query.length < 1) {
      // Return a mix: user emojis first, then popular unicode
      const results = [];
      const userEmojis = [];
      const customEmojis = [];
      const unicodeEmojis = [];
      
      for (const emoji of emojis.values()) {
        if (emoji.source === 'user') {
          userEmojis.push(emoji);
        } else if (emoji.source !== 'unicode') {
          customEmojis.push(emoji);
        } else {
          unicodeEmojis.push(emoji);
        }
      }
      
      // Prioritize: user > custom sets > unicode
      return [...userEmojis.slice(0, 12), ...customEmojis.slice(0, 6), ...unicodeEmojis.slice(0, 6)].slice(0, 24);
    }

    const normalizedQuery = query.toLowerCase().replace(/^:|:$/g, '');
    
    // Filter emojis that match the query
    const matches = [];
    
    for (const emoji of emojis.values()) {
      if (emoji.shortcode.includes(normalizedQuery)) {
        matches.push(emoji);
      }
    }

    // Sort by relevance and source priority
    matches.sort((a, b) => {
      // Source priority
      const sourcePriority = { user: 0 };
      const aPriority = a.source === 'user' ? 0 : (a.source === 'unicode' ? 2 : 1);
      const bPriority = b.source === 'user' ? 0 : (b.source === 'unicode' ? 2 : 1);
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by match position (starts with > contains)
      const aStarts = a.shortcode.startsWith(normalizedQuery);
      const bStarts = b.shortcode.startsWith(normalizedQuery);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return a.shortcode.localeCompare(b.shortcode);
    });

    return matches.slice(0, 24);
  }

  /**
   * Get total number of emojis
   */
  function getCount() {
    return emojis.size;
  }

  return { init, search, addEmoji, addUserEmojiList, addEmojiSet, getCount };
}

// Cache for emoji search instances per user
const emojiSearchCache = new Map();

/**
 * Gets or creates an emoji search service for a user
 * @param {string} userPubkey - The logged-in user's pubkey (optional)
 * @returns {Object} Emoji search service
 */
export function getEmojiSearch(userPubkey = null) {
  const cacheKey = userPubkey || '__anonymous__';
  
  if (!emojiSearchCache.has(cacheKey)) {
    const service = createEmojiSearch(userPubkey);
    emojiSearchCache.set(cacheKey, service);
  }
  
  return emojiSearchCache.get(cacheKey);
}

/**
 * Clear the emoji search cache (call when user logs out)
 */
export function clearEmojiSearchCache() {
  emojiSearchCache.clear();
}

/**
 * Convenience function to create a search function for use with CommentInput
 * @param {string} userPubkey - The logged-in user's pubkey (optional)
 * @returns {Function} Search function
 */
export function createSearchEmojisFunction(userPubkey = null) {
  const service = getEmojiSearch(userPubkey);
  
  return async (query) => {
    return service.search(query);
  };
}

/**
 * Simple search function that uses Unicode emojis only (no user context)
 * @param {string} query - Search query
 * @returns {Promise<Array>} Matching emojis
 */
export async function searchEmojis(query) {
  const service = getEmojiSearch();
  return service.search(query);
}
