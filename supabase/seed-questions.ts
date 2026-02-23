/**
 * Seed Script — 315 Meaningful Questions
 *
 * Run: npx tsx supabase/seed-questions.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 * in your .env.local file.
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load env from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIndex = trimmed.indexOf("=");
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        process.env[key] = value;
      }
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

type Category = "deep" | "romantic" | "playful" | "future" | "memory" | "wildcard";

interface SeedQuestion {
  text: string;
  category: Category;
}

const questions: SeedQuestion[] = [
  // ============================================================
  // DEEP / VULNERABLE (100 questions)
  // ============================================================
  { text: "What are you afraid to tell me, but wish you could?", category: "deep" },
  { text: "When did you last feel truly understood by me?", category: "deep" },
  { text: "What part of your childhood still lives inside you?", category: "deep" },
  { text: "What's a wound you carry that I should know more about?", category: "deep" },
  { text: "When do you feel most emotionally safe with me?", category: "deep" },
  { text: "What's something you've never told anyone?", category: "deep" },
  { text: "What do you think I misunderstand about you?", category: "deep" },
  { text: "What emotion do you struggle to express the most?", category: "deep" },
  { text: "When was the last time you cried? What caused it?", category: "deep" },
  { text: "What's the loneliest you've ever felt?", category: "deep" },
  { text: "What belief about yourself do you wish you could let go of?", category: "deep" },
  { text: "What do you need from me that you haven't asked for?", category: "deep" },
  { text: "What's a fear that has shaped the way you love?", category: "deep" },
  { text: "When do you feel most vulnerable?", category: "deep" },
  { text: "What part of your past still affects your present?", category: "deep" },
  { text: "What do you think is the hardest thing about loving someone across distance?", category: "deep" },
  { text: "What's a truth about yourself that took you years to accept?", category: "deep" },
  { text: "What do you wish your parents had told you more often?", category: "deep" },
  { text: "How has our relationship changed who you are?", category: "deep" },
  { text: "What's the bravest thing you've ever done emotionally?", category: "deep" },
  { text: "What do you wish people knew about you without having to explain?", category: "deep" },
  { text: "What's one thing you want me to always remember about you?", category: "deep" },
  { text: "What does trust look like to you in its simplest form?", category: "deep" },
  { text: "When do you feel most like yourself?", category: "deep" },
  { text: "What's the heaviest thing on your mind right now?", category: "deep" },
  { text: "What's a moment from your past that you still think about often?", category: "deep" },
  { text: "What do you need to hear when you're at your lowest?", category: "deep" },
  { text: "What's a pattern in your life that you're trying to break?", category: "deep" },
  { text: "What's the most important lesson a heartbreak taught you?", category: "deep" },
  { text: "What would you want me to say at your most difficult moment?", category: "deep" },
  { text: "How do you know when you need to be alone?", category: "deep" },
  { text: "What's a question you're afraid to know the answer to?", category: "deep" },
  { text: "When have you felt most proud of who you are?", category: "deep" },
  { text: "What's something you've forgiven but not forgotten?", category: "deep" },
  { text: "What does home feel like to you?", category: "deep" },
  { text: "What's the most honest thing you can say about how you feel right now?", category: "deep" },
  { text: "What part of love scares you the most?", category: "deep" },
  { text: "What do you think makes someone truly brave?", category: "deep" },
  { text: "What would you tell your younger self about love?", category: "deep" },
  { text: "What's a boundary you've learned to set that changed your life?", category: "deep" },
  { text: "How do you handle sadness when it arrives?", category: "deep" },
  { text: "What do you wish you could apologize for?", category: "deep" },
  { text: "What's the most painful thing you've ever had to accept?", category: "deep" },
  { text: "What do you think I struggle with that I don't talk about?", category: "deep" },
  { text: "What's a part of you that only I get to see?", category: "deep" },
  { text: "How do you want to be held when everything falls apart?", category: "deep" },
  { text: "What do you think about late at night when you can't sleep?", category: "deep" },
  { text: "What does it mean to you to feel chosen?", category: "deep" },
  { text: "What's a conversation we haven't had yet that we should?", category: "deep" },
  { text: "What's the kindest thing someone has ever done for you?", category: "deep" },
  { text: "How do you know when you're not okay?", category: "deep" },
  { text: "What's the last thing that made you feel really understood?", category: "deep" },
  { text: "What does healing look like for you right now?", category: "deep" },
  { text: "What do you think I need more of from you?", category: "deep" },
  { text: "What's a secret hope you haven't said out loud?", category: "deep" },
  { text: "What scares you about the future?", category: "deep" },
  { text: "What's a truth about love that took you a long time to learn?", category: "deep" },
  { text: "When do you feel most disconnected from yourself?", category: "deep" },
  { text: "What's the hardest 'I love you' you've ever said?", category: "deep" },
  { text: "What do you think we should talk about more?", category: "deep" },
  { text: "What's a part of your identity you're still discovering?", category: "deep" },
  { text: "How does distance change the way you express love?", category: "deep" },
  { text: "What's an insecurity you've learned to live with?", category: "deep" },
  { text: "What's something you're still grieving?", category: "deep" },
  { text: "What do you wish I understood better about your silence?", category: "deep" },
  { text: "What does emotional safety look like to you?", category: "deep" },
  { text: "What's a promise you've made to yourself?", category: "deep" },
  { text: "How do you want to be loved on your hardest days?", category: "deep" },
  { text: "What's the most vulnerable thing you've ever shared with me?", category: "deep" },
  { text: "What do you think love requires that people rarely talk about?", category: "deep" },
  { text: "What's the biggest risk you've ever taken with your heart?", category: "deep" },
  { text: "How do you deal with feeling not enough?", category: "deep" },
  { text: "What's a part of your story that shaped your capacity to love?", category: "deep" },
  { text: "What's the difference between how you love me now and how you loved me at the start?", category: "deep" },
  { text: "What do you think is the hardest thing about being known?", category: "deep" },
  { text: "What does forgiveness mean to you in a relationship?", category: "deep" },
  { text: "What's an unspoken rule you have for yourself?", category: "deep" },
  { text: "When was the last time you felt completely at peace?", category: "deep" },
  { text: "What do you wish you had the courage to do?", category: "deep" },
  { text: "What's a question you wish I would ask you?", category: "deep" },
  { text: "What do you think about when you think about growing old?", category: "deep" },
  { text: "What's the most important thing you've learned about yourself this year?", category: "deep" },
  { text: "What's a moment when you realized you loved me deeper than before?", category: "deep" },
  { text: "What do you think we both avoid talking about?", category: "deep" },
  { text: "How has loving me changed the way you see yourself?", category: "deep" },
  { text: "What do you do with emotions you can't name?", category: "deep" },
  { text: "What's a version of yourself that you've had to let go of?", category: "deep" },
  { text: "What does presence mean to you when we can't be together physically?", category: "deep" },
  { text: "What's something you want to tell me but keep waiting for the right moment?", category: "deep" },
  { text: "What do you think about when you miss me most?", category: "deep" },
  { text: "What's the most honest conversation we've ever had?", category: "deep" },
  { text: "What does it look like when you're falling apart but no one can tell?", category: "deep" },
  { text: "What part of your heart do you protect the most?", category: "deep" },
  { text: "What do you think love owes us? Or does it owe us nothing?", category: "deep" },
  { text: "What's a small thing that carries enormous emotional weight for you?", category: "deep" },
  { text: "When do you feel most grateful for us?", category: "deep" },
  { text: "What's the hardest part about being honest with yourself?", category: "deep" },
  { text: "What would you want written on the last page of our story?", category: "deep" },
  { text: "What's a dream you've given up that still crosses your mind?", category: "deep" },
  { text: "How do you carry love when the distance feels unbearable?", category: "deep" },
  { text: "What do you think makes our love different from others?", category: "deep" },

  // ============================================================
  // ROMANTIC (50 questions)
  // ============================================================
  { text: "If we woke up together tomorrow, what would our morning look like?", category: "romantic" },
  { text: "What's the most beautiful thing I've ever said to you?", category: "romantic" },
  { text: "What song makes you think of us?", category: "romantic" },
  { text: "If you could relive one moment with me, which would it be?", category: "romantic" },
  { text: "What's your favorite way I show you love?", category: "romantic" },
  { text: "What do you miss most about being physically close to me?", category: "romantic" },
  { text: "If I could be anywhere with you right now, where would you take me?", category: "romantic" },
  { text: "What's a love letter you've never sent?", category: "romantic" },
  { text: "What does my love feel like to you?", category: "romantic" },
  { text: "When did you first realize you were falling for me?", category: "romantic" },
  { text: "What's the most romantic thing someone could do for you?", category: "romantic" },
  { text: "If you could freeze one moment of us in time, which one?", category: "romantic" },
  { text: "What's something small I do that makes your heart skip?", category: "romantic" },
  { text: "What's a date you've imagined for us but never told me about?", category: "romantic" },
  { text: "What would you whisper to me if I were lying next to you?", category: "romantic" },
  { text: "What's your favorite physical detail about me?", category: "romantic" },
  { text: "How do you feel when you hear my voice after a long day?", category: "romantic" },
  { text: "What's the most intimate non-physical moment we've shared?", category: "romantic" },
  { text: "What do you want to do the first minute we see each other again?", category: "romantic" },
  { text: "What's a movie scene that reminds you of us?", category: "romantic" },
  { text: "How do you carry me with you during the day?", category: "romantic" },
  { text: "What does my touch feel like in your memory?", category: "romantic" },
  { text: "What's the most beautiful thing about the way we love?", category: "romantic" },
  { text: "What's a promise you want to make to me but haven't yet?", category: "romantic" },
  { text: "If love had a scent, what would ours smell like?", category: "romantic" },
  { text: "What do you see when you close your eyes and think of me?", category: "romantic" },
  { text: "What's the perfect rainy day with me?", category: "romantic" },
  { text: "What would you write on a postcard if you sent one today?", category: "romantic" },
  { text: "When do you feel most connected to me across the distance?", category: "romantic" },
  { text: "What part of our story would you turn into a poem?", category: "romantic" },
  { text: "What does falling asleep thinking about me feel like?", category: "romantic" },
  { text: "What do you love about us that no one else would notice?", category: "romantic" },
  { text: "What would our love look like as a painting?", category: "romantic" },
  { text: "What's the sweetest dream you've had about us?", category: "romantic" },
  { text: "What word comes to mind when you think of me?", category: "romantic" },
  { text: "How do you feel when my name lights up your phone?", category: "romantic" },
  { text: "What's a slow dance song you'd pick for us?", category: "romantic" },
  { text: "What's a tiny ritual you want us to create together?", category: "romantic" },
  { text: "If our love had a season, which one would it be?", category: "romantic" },
  { text: "What's a text from me that you've reread more than once?", category: "romantic" },
  { text: "What do you imagine our home will feel like?", category: "romantic" },
  { text: "What's the most romantic sentence you can write right now?", category: "romantic" },
  { text: "When you picture us in ten years, what's the first image?", category: "romantic" },
  { text: "What's a gesture that would make you fall for me all over again?", category: "romantic" },
  { text: "What part of my personality makes you feel most loved?", category: "romantic" },
  { text: "What does love in the quiet moments look like to you?", category: "romantic" },
  { text: "What's a love language you wish you received more of?", category: "romantic" },
  { text: "What would the title of our love story be?", category: "romantic" },
  { text: "What do you daydream about when you think of being together?", category: "romantic" },
  { text: "If you could send me one feeling right now, what would it be?", category: "romantic" },

  // ============================================================
  // PLAYFUL (50 questions)
  // ============================================================
  { text: "If we were characters in a movie, what genre would it be?", category: "playful" },
  { text: "What's the most ridiculous thing you'd do to make me laugh?", category: "playful" },
  { text: "If we had a band, what would it be called?", category: "playful" },
  { text: "What's your guilty pleasure that you think I'd judge you for?", category: "playful" },
  { text: "If you could swap lives with me for a day, what would you do first?", category: "playful" },
  { text: "What's the weirdest thing you find attractive about me?", category: "playful" },
  { text: "If we could teleport anywhere for one hour, where?", category: "playful" },
  { text: "What's a dare you'd give me right now?", category: "playful" },
  { text: "If we had a couples' secret handshake, what would it look like?", category: "playful" },
  { text: "What would you name a star after us?", category: "playful" },
  { text: "What's the funniest thing that's happened to you this week?", category: "playful" },
  { text: "If we opened a shop together, what would we sell?", category: "playful" },
  { text: "What emoji best describes our relationship?", category: "playful" },
  { text: "If you could teach me one skill, what would it be?", category: "playful" },
  { text: "What's the most embarrassing song on your playlist?", category: "playful" },
  { text: "If we were animals, what would we be?", category: "playful" },
  { text: "What three items would you bring to a desert island with me?", category: "playful" },
  { text: "What's a conspiracy theory you kind of believe?", category: "playful" },
  { text: "If we wrote a children's book, what would it be about?", category: "playful" },
  { text: "What's the most adventurous thing on your bucket list?", category: "playful" },
  { text: "If we had a theme song, what would it be?", category: "playful" },
  { text: "What fictional couple reminds you of us?", category: "playful" },
  { text: "What's the worst pickup line you could use on me?", category: "playful" },
  { text: "If we had superpowers, what would yours be?", category: "playful" },
  { text: "What's a food you could eat every day and never get bored of?", category: "playful" },
  { text: "If we had to survive a zombie apocalypse, what's your strategy?", category: "playful" },
  { text: "What would your rapper name be?", category: "playful" },
  { text: "If you could instantly master one thing, what would it be?", category: "playful" },
  { text: "What's the silliest argument we've ever had?", category: "playful" },
  { text: "If we competed on a reality show, which one and would we win?", category: "playful" },
  { text: "What's a random fact about you that might surprise me?", category: "playful" },
  { text: "If you could invent a holiday for us, what would it celebrate?", category: "playful" },
  { text: "What's the weirdest food combination you secretly love?", category: "playful" },
  { text: "If our love had a flavor, what would it taste like?", category: "playful" },
  { text: "What's the last thing you laughed at out loud?", category: "playful" },
  { text: "If we time-traveled to any decade, where would we go?", category: "playful" },
  { text: "What's the most impulsive thing you've ever done?", category: "playful" },
  { text: "If you could prank me right now, what would you do?", category: "playful" },
  { text: "What's a board game or card game you'd destroy me at?", category: "playful" },
  { text: "If we got matching tattoos, what would they be?", category: "playful" },
  { text: "What's an unpopular opinion you'll defend forever?", category: "playful" },
  { text: "If you had to describe me to an alien, what would you say?", category: "playful" },
  { text: "What childhood cartoon character were you obsessed with?", category: "playful" },
  { text: "If we had a couples' YouTube channel, what would the content be?", category: "playful" },
  { text: "What's the most chaotic thing in your room right now?", category: "playful" },
  { text: "If you could send me a care package right now, what's in it?", category: "playful" },
  { text: "What's the most useless talent you have?", category: "playful" },
  { text: "If we ordered each other's coffee, what would you get me?", category: "playful" },
  { text: "What app on your phone would you be embarrassed if I saw?", category: "playful" },
  { text: "If we could live in any fictional universe, which one?", category: "playful" },

  // ============================================================
  // FUTURE-ORIENTED (50 questions)
  // ============================================================
  { text: "What does our dream home look like in your mind?", category: "future" },
  { text: "Where do you see us in five years?", category: "future" },
  { text: "What's a trip you want to take with me someday?", category: "future" },
  { text: "What kind of old couple do you want us to be?", category: "future" },
  { text: "What tradition do you want us to start when we're together?", category: "future" },
  { text: "What's a goal you want us to achieve together?", category: "future" },
  { text: "What does a perfect Sunday look like in our future?", category: "future" },
  { text: "What city or town do you imagine us living in?", category: "future" },
  { text: "What do you want to build together beyond a relationship?", category: "future" },
  { text: "What kind of partner do you want to grow into?", category: "future" },
  { text: "What's one thing you want to learn alongside me?", category: "future" },
  { text: "What's a dream for your life that you want me to be part of?", category: "future" },
  { text: "If we could design our perfect morning routine together, what would it be?", category: "future" },
  { text: "What values do you want at the center of our relationship?", category: "future" },
  { text: "What would our life look like if money weren't an issue?", category: "future" },
  { text: "What do you want to cook together when we live in the same place?", category: "future" },
  { text: "What adventure do you want to have before we turn 40?", category: "future" },
  { text: "What kind of parent (or life together) do you imagine for us?", category: "future" },
  { text: "What does retirement look like in your imagination?", category: "future" },
  { text: "What skill do you want us to learn together?", category: "future" },
  { text: "What does a life well-lived together look like to you?", category: "future" },
  { text: "What do you want our friends to say about us as a couple?", category: "future" },
  { text: "What's a project you want to work on with me?", category: "future" },
  { text: "What does celebration look like for us in the future?", category: "future" },
  { text: "What's a place you want to call home someday?", category: "future" },
  { text: "What does our anniversary celebration look like in ten years?", category: "future" },
  { text: "What's one promise you want to keep for the rest of our lives?", category: "future" },
  { text: "How do you imagine our holidays together?", category: "future" },
  { text: "What do you want to teach each other?", category: "future" },
  { text: "What kind of garden would you want us to grow?", category: "future" },
  { text: "What book do you want us to read together someday?", category: "future" },
  { text: "What do you want our daily ritual to look like when we're together?", category: "future" },
  { text: "Where would you want to travel on our first anniversary together?", category: "future" },
  { text: "What does growing old with someone mean to you?", category: "future" },
  { text: "What's a challenge you want us to face and overcome together?", category: "future" },
  { text: "What does a weeknight dinner look like in our future home?", category: "future" },
  { text: "What pet would you want us to have someday?", category: "future" },
  { text: "What does financial safety look like for us?", category: "future" },
  { text: "What do you want our bedtime routine to be?", category: "future" },
  { text: "What neighborhood vibe do you want us to live in?", category: "future" },
  { text: "What would you want written on a plaque outside our home?", category: "future" },
  { text: "What music do you imagine playing in our kitchen?", category: "future" },
  { text: "How do you want us to handle hard times in the future?", category: "future" },
  { text: "What's a silly dream for our future that you secretly want?", category: "future" },
  { text: "What do you want our Saturday mornings to look like?", category: "future" },
  { text: "If we threw a dinner party, who would we invite?", category: "future" },
  { text: "What does partnership mean to you in everyday life?", category: "future" },
  { text: "What's a legacy you want us to leave behind?", category: "future" },
  { text: "What does your heart imagine for the year we finally close the distance?", category: "future" },
  { text: "What's the first piece of furniture you'd want in our home?", category: "future" },

  // ============================================================
  // MEMORY-BASED (35 questions)
  // ============================================================
  { text: "What's the first thing you noticed about me?", category: "memory" },
  { text: "What's your favorite memory of us?", category: "memory" },
  { text: "What's a moment with me that changed your perspective?", category: "memory" },
  { text: "What was our best phone call or video chat?", category: "memory" },
  { text: "What's a small moment between us that you treasure?", category: "memory" },
  { text: "What's the first time you felt truly close to me?", category: "memory" },
  { text: "What's a time I made you laugh so hard you couldn't stop?", category: "memory" },
  { text: "What do you remember about the day we first talked?", category: "memory" },
  { text: "What's a challenge we faced together that made us stronger?", category: "memory" },
  { text: "What's a gift or gesture from me that you still think about?", category: "memory" },
  { text: "What's the best meal we've shared?", category: "memory" },
  { text: "What was your favorite trip or outing with me?", category: "memory" },
  { text: "What's a conversation with me that you replay in your mind?", category: "memory" },
  { text: "What's a photo of us that holds a special meaning?", category: "memory" },
  { text: "What's the most surprising thing I've ever done for you?", category: "memory" },
  { text: "What's a habit of mine you noticed early on?", category: "memory" },
  { text: "What was the first fight we had, and what did it teach you?", category: "memory" },
  { text: "What's a time you saw me in a new light?", category: "memory" },
  { text: "What's the most spontaneous thing we've done together?", category: "memory" },
  { text: "What's a movie, show, or song that became 'ours'?", category: "memory" },
  { text: "What's a night with me you wish you could relive?", category: "memory" },
  { text: "What's something I said that stuck with you?", category: "memory" },
  { text: "What do you remember about our first goodbye?", category: "memory" },
  { text: "What was a turning point in our relationship?", category: "memory" },
  { text: "What's a time I showed up for you when you didn't expect it?", category: "memory" },
  { text: "What's a silly inside joke we have and where did it come from?", category: "memory" },
  { text: "What's a time you felt proud to be with me?", category: "memory" },
  { text: "What's a holiday or birthday we spent together that stands out?", category: "memory" },
  { text: "What were your first impressions of me, and how have they changed?", category: "memory" },
  { text: "What's a time when distance made our bond stronger?", category: "memory" },
  { text: "What's the best surprise you've received from me?", category: "memory" },
  { text: "What's a difficult day I helped you get through?", category: "memory" },
  { text: "What song was playing during a special moment with me?", category: "memory" },
  { text: "What's a tradition we've accidentally started?", category: "memory" },
  { text: "What's the most 'us' thing we've ever done?", category: "memory" },

  // ============================================================
  // WILDCARD (30 questions)
  // ============================================================
  { text: "If our love was a color, what shade would it be today?", category: "wildcard" },
  { text: "Write a haiku about how you feel right now.", category: "wildcard" },
  { text: "If you could send me a scent through the screen, what would it be?", category: "wildcard" },
  { text: "What would you say to me if we only had one more conversation?", category: "wildcard" },
  { text: "If our relationship was a house, what room are we standing in?", category: "wildcard" },
  { text: "Describe the way you love me — without using the word 'love.'", category: "wildcard" },
  { text: "What would you name the chapter of our life right now?", category: "wildcard" },
  { text: "If I were a season, which would I be and why?", category: "wildcard" },
  { text: "Write me a sentence that starts with: 'In another life, we...'", category: "wildcard" },
  { text: "If our love story had a soundtrack, name three songs on it.", category: "wildcard" },
  { text: "What object in your room reminds you most of me?", category: "wildcard" },
  { text: "If you could paint our love, what would the canvas look like?", category: "wildcard" },
  { text: "What does the silence between us sound like?", category: "wildcard" },
  { text: "If you could bottle a feeling to give me, what feeling would it be?", category: "wildcard" },
  { text: "What planet does our love live on?", category: "wildcard" },
  { text: "Describe me in three words, then describe us in three words.", category: "wildcard" },
  { text: "What weather matches how you feel about us today?", category: "wildcard" },
  { text: "If you found a note from future-you about us, what does it say?", category: "wildcard" },
  { text: "What does my laughter sound like to you?", category: "wildcard" },
  { text: "If our love were a place in nature, what would it be?", category: "wildcard" },
  { text: "Write the opening line of our love story.", category: "wildcard" },
  { text: "What texture does thinking of me have?", category: "wildcard" },
  { text: "If you could dream any dream tonight about us, what happens?", category: "wildcard" },
  { text: "What constellation would you name after us?", category: "wildcard" },
  { text: "If our love had a taste, what would it be right now?", category: "wildcard" },
  { text: "What time of day do you feel closest to me?", category: "wildcard" },
  { text: "If you could leave a voicemail for future-us, what would you say?", category: "wildcard" },
  { text: "What's the kindest thought you had about me today?", category: "wildcard" },
  { text: "If we were a photograph, what moment would it capture?", category: "wildcard" },
  { text: "Write the last line of our love story.", category: "wildcard" },
];

async function seed() {
  console.log(`\nSeeding ${questions.length} questions...\n`);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;

  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const { error } = await supabase.from("questions").insert(batch);

    if (error) {
      console.error(`Error inserting batch at index ${i}:`, error.message);
    } else {
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${questions.length} questions`);
    }
  }

  // Count by category
  const categories: Category[] = ["deep", "romantic", "playful", "future", "memory", "wildcard"];
  console.log("\nCategory breakdown:");
  for (const cat of categories) {
    const count = questions.filter((q) => q.category === cat).length;
    console.log(`  ${cat}: ${count}`);
  }

  console.log(`\nDone. Total: ${inserted} questions seeded.\n`);
}

seed().catch(console.error);
