-- ============================================================
-- New Questions — Deep Connection Guide
-- 67 unique questions (15 duplicates excluded)
--
-- Run this against your Supabase database via the SQL editor.
-- Uses ON CONFLICT DO NOTHING on (text) to be safe against
-- re-runs or any questions that already exist.
--
-- NOTE: This requires a unique constraint on questions.text.
-- If you don't have one, uncomment the line below first:
-- ALTER TABLE questions ADD CONSTRAINT questions_text_unique UNIQUE (text);
-- ============================================================

INSERT INTO questions (text, category) VALUES

-- ============================================================
-- SET I — Warmup → category: deep (introspective) & playful
-- ============================================================
('Given the choice of anyone in the world, whom would you want as a dinner guest?', 'playful'),
('Would you like to be famous? In what way?', 'deep'),
('Before making a telephone call, do you ever rehearse what you are going to say? Why?', 'deep'),
('What would constitute a "perfect" day for you?', 'playful'),
('When did you last sing to yourself? To someone else?', 'playful'),
('If you were able to live to the age of 90 and retain either the mind or body of a 30-year-old for the last 60 years of your life, which would you want?', 'wildcard'),
('Do you have a secret hunch about how you will die?', 'wildcard'),
('Name three things you and your partner appear to have in common.', 'romantic'),
('For what in your life do you feel most grateful?', 'deep'),
('If you could change anything about the way you were raised, what would it be?', 'deep'),
('Take four minutes and tell your partner your life story in as much detail as possible.', 'deep'),
('If you could wake up tomorrow having gained any one quality or ability, what would it be?', 'wildcard'),

-- ============================================================
-- SET II — Getting Deeper → category: deep
-- ============================================================
('If a crystal ball could tell you the truth about yourself, your life, the future, or anything else, what would you want to know?', 'deep'),
('Is there something that you''ve dreamed of doing for a long time? Why haven''t you done it?', 'deep'),
('What is the greatest accomplishment of your life?', 'deep'),
('What do you value most in a friendship?', 'deep'),
('What is your most treasured memory?', 'memory'),
('What is your most terrible memory?', 'deep'),
('If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?', 'deep'),
('What does friendship mean to you?', 'deep'),
('What roles do love and affection play in your life?', 'deep'),
('How close and warm is your family? Do you feel your childhood was happier than most other people''s?', 'deep'),
('How do you feel about your relationship with your mother?', 'deep'),

-- ============================================================
-- SET III — Vulnerability → category: deep
-- ============================================================
('Complete this sentence: "I wish I had someone with whom I could share..."', 'deep'),
('If you were going to become a close friend with your partner, please share what would be important for him or her to know.', 'deep'),
('Tell your partner what you like about them; be very honest this time, saying things that you might not say to someone you''ve just met.', 'romantic'),
('Share with your partner an embarrassing moment in your life.', 'deep'),
('When did you last cry in front of another person? By yourself?', 'deep'),
('Tell your partner something that you like about them already.', 'romantic'),
('What, if anything, is too serious to be joked about?', 'deep'),
('If you were to die this evening with no opportunity to communicate with anyone, what would you most regret not having told someone? Why haven''t you told them yet?', 'deep'),
('Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?', 'wildcard'),
('Of all the people in your family, whose death would you find most disturbing? Why?', 'deep'),
('Share a personal problem and ask your partner''s advice on how he or she might handle it.', 'deep'),

-- ============================================================
-- Part 2 — Love Languages & Emotional Needs → deep / romantic
-- (Q6 excluded: similar to "When did you last feel truly understood by me?")
-- (Q8 excluded: similar to "What does emotional safety look like to you?")
-- ============================================================
('How do you feel most loved — through words, physical touch, gifts, acts of service, or quality time?', 'romantic'),
('What''s something small I could do each day that would make you feel really appreciated?', 'romantic'),
('When you''re feeling low, what do you need most from me — space, comfort, distraction, or reassurance?', 'deep'),
('What''s a way I show love that you might not always notice but actually means a lot to you?', 'romantic'),
('Is there something I do that accidentally makes you feel unloved or unseen, even if it''s unintentional?', 'deep'),
('Do you ever feel like you''re carrying emotional weight alone? What would help?', 'deep'),
('How do you prefer to receive apologies — through words, actions, or time?', 'deep'),
('What''s something I could say more often that would make you feel secure in this relationship?', 'romantic'),

-- ============================================================
-- Part 3 — Future, Goals & Dreams → future
-- (Q2 excluded: similar to "What's a dream you've given up...")
-- (Q4 excluded: similar to "What would our life look like if money weren't an issue?")
-- (Q5 excluded: similar to "What kind of old couple do you want us to be?")
-- (Q10 excluded: similar to "Where do you see us in five years?")
-- ============================================================
('Where do you see yourself in 10 years, and where do I fit in that picture?', 'future'),
('What does your ideal life look like — not just for us, but for you individually?', 'future'),
('What are your non-negotiables for the future — things that must be part of your life no matter what?', 'future'),
('How important is career or personal achievement to your sense of identity?', 'deep'),
('Do you want children (or more children)? What kind of parent do you imagine yourself being?', 'future'),
('What''s a place in the world you feel called to live or visit before you die?', 'future'),

-- ============================================================
-- Part 4 — Conflict, Needs & Expectations → deep
-- (Q1 excluded: similar to "What's a fear that has shaped the way you love?")
-- (Q3 excluded: similar to "What are you afraid to tell me, but wish you could?")
-- ============================================================
('What does a healthy argument look like to you?', 'deep'),
('What''s something I do during conflict that makes it harder to resolve?', 'deep'),
('When you''re frustrated with me, what''s the most effective way to bring it up?', 'deep'),
('What expectations do you have of me that you''ve never explicitly said out loud?', 'deep'),
('Do you ever feel like you compromise more than I do? In what areas?', 'deep'),
('What''s a deal-breaker for you in a relationship?', 'deep'),
('How do you know when you need space, and how should I recognize it without taking it personally?', 'deep'),
('What''s something you''ve been tolerating that you''d actually like to change?', 'deep'),

-- ============================================================
-- Part 5 — Intimacy, Desires & Sexuality → romantic / deep
-- ============================================================
('What makes you feel most desired and attractive?', 'romantic'),
('Is there something you''ve always wanted to try or explore but never felt comfortable asking?', 'deep'),
('How important is physical intimacy in your overall happiness in a relationship?', 'deep'),
('What''s the difference between sex and intimacy to you?', 'deep'),
('What environment or mood makes you feel most open and comfortable being intimate?', 'romantic'),
('What''s something that makes you feel deeply connected during or after intimacy?', 'romantic'),

-- ============================================================
-- Part 6 — Identity, Values & Beliefs → deep
-- ============================================================
('What''s a value or belief you hold that most people wouldn''t expect from you?', 'deep'),
('Has your relationship with religion or spirituality changed over your life? Where are you now?', 'deep'),
('What political or social issue do you care about most deeply and why?', 'deep'),
('How has your upbringing shaped the kind of partner you are?', 'deep'),
('Is there a part of your personality or past that you feel I still don''t fully understand?', 'deep'),
('What''s something you''re proud of that has nothing to do with your career or relationships?', 'deep'),
('What does integrity look like in a relationship for you?', 'deep'),
('Do you think people can fundamentally change? Has your own experience confirmed or challenged that?', 'deep'),
('What''s the most important lesson your parents taught you — intentionally or not?', 'deep'),
('How do you define success, and does that definition feel aligned with how we live?', 'future'),

-- ============================================================
-- Part 7 — Growth, Healing & Self-Awareness → deep
-- (Q3 excluded: similar to "What's a pattern in your life that you're trying to break?")
-- (Q4 excluded: similar to "When do you feel most like yourself?")
-- (Q5 excluded: similar to "How has our relationship changed who you are?")
-- (Q6 excluded: similar to "What's a version of yourself that you've had to let go of?")
-- ============================================================
('What''s something you''re currently working on about yourself?', 'deep'),
('Is there something from your past that still affects how you show up in relationships?', 'deep'),
('How do you take care of yourself emotionally when things are hard?', 'deep'),
('What''s something you forgave me for that you''ve never really said out loud?', 'deep'),
('Do you feel like we encourage each other''s growth, or do we sometimes hold each other back?', 'deep'),
('If our relationship were a living thing, what would it need more of right now?', 'wildcard'),

-- ============================================================
-- Part 8 — Fun, Curiosity & Playfulness → playful / memory
-- (Q2 excluded: similar to "What's a movie, show, or song that became 'ours'?")
-- (Q3 excluded: similar to "If you could relive one moment with me, which would it be?")
-- (Q8 excluded: similar to "What's a tiny ritual you want us to create together?")
-- ============================================================
('What''s a hobby or interest of mine that you''d genuinely like to understand better?', 'playful'),
('What''s the funniest or most embarrassing thing that''s happened to us together?', 'memory'),
('If we could switch roles for a day, what do you think you''d discover?', 'playful'),
('What''s something you want us to try together that we haven''t yet?', 'future'),
('What''s your favorite version of us — early on, right now, or a future version?', 'romantic'),
('What''s a compliment you want me to give you more often?', 'romantic'),
('What would your ideal date night look like, no budget limits?', 'romantic')

ON CONFLICT (text) DO NOTHING;
