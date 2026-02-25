-- =============================================
-- AETHERIA DATABASE SCHEMA — Phase 1
-- =============================================
-- Ejecutar en: Supabase Dashboard > SQL Editor > New Query
-- =============================================


-- 1. PROFILES (extiende auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-crear profile cuando se registra un user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Aetherian'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. REGENMONS (criatura principal)
CREATE TABLE public.regenmons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Identidad
  name TEXT NOT NULL,
  type TEXT NOT NULL,                -- 'fuego' | 'hielo' | 'sombra'
  stats JSONB NOT NULL DEFAULT '{}', -- { hp, atk, def, spd }

  -- Care stats (0-100)
  hunger REAL DEFAULT 70,
  energy REAL DEFAULT 80,
  happiness REAL DEFAULT 75,
  health REAL DEFAULT 90,

  -- Timestamp del ultimo tick de decay
  last_tick TIMESTAMPTZ DEFAULT now(),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_regenmons_user ON public.regenmons(user_id);


-- 3. CHAT SESSIONS
CREATE TABLE public.chat_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  regenmon_id UUID REFERENCES public.regenmons(id) ON DELETE CASCADE NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_regenmon ON public.chat_sessions(regenmon_id);


-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regenmons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Regenmons
CREATE POLICY "Users can view their own regenmons"
  ON public.regenmons FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own regenmons"
  ON public.regenmons FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own regenmons"
  ON public.regenmons FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own regenmons"
  ON public.regenmons FOR DELETE USING (auth.uid() = user_id);

-- Chat sessions (acceso via ownership del regenmon)
CREATE POLICY "Users can view their chat sessions"
  ON public.chat_sessions FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.regenmons
      WHERE regenmons.id = chat_sessions.regenmon_id
      AND regenmons.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert chat sessions"
  ON public.chat_sessions FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.regenmons
      WHERE regenmons.id = chat_sessions.regenmon_id
      AND regenmons.user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update their chat sessions"
  ON public.chat_sessions FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.regenmons
      WHERE regenmons.id = chat_sessions.regenmon_id
      AND regenmons.user_id = auth.uid()
    )
  );


-- =============================================
-- AUTO-UPDATE updated_at
-- =============================================

CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_regenmons_timestamp
  BEFORE UPDATE ON public.regenmons
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_profiles_timestamp
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

CREATE TRIGGER update_chat_timestamp
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();


-- =============================================
-- PVP BATTLES — Phase 2
-- =============================================

-- Matchmaking queue
CREATE TABLE public.matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  regenmon_id UUID REFERENCES public.regenmons(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_battle_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Battles
CREATE TABLE public.battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  player1_id UUID REFERENCES public.profiles(id) NOT NULL,
  player1_regenmon_id UUID REFERENCES public.regenmons(id) NOT NULL,
  player2_id UUID REFERENCES public.profiles(id) NOT NULL,
  player2_regenmon_id UUID REFERENCES public.regenmons(id) NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'finished', 'abandoned')),
  current_turn UUID,
  turn_number INTEGER DEFAULT 1,
  player1_hp INTEGER NOT NULL,
  player2_hp INTEGER NOT NULL,
  winner_id UUID REFERENCES public.profiles(id),
  battle_log JSONB DEFAULT '[]'::jsonb,
  reward_amount INTEGER DEFAULT 0,
  reward_claimed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_battles_players ON public.battles(player1_id, player2_id);
CREATE INDEX idx_battles_status ON public.battles(status);
CREATE INDEX idx_matchmaking_status ON public.matchmaking_queue(status);

-- RLS for matchmaking
ALTER TABLE public.matchmaking_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view queue"
  ON public.matchmaking_queue FOR SELECT USING (true);
CREATE POLICY "Users can join queue"
  ON public.matchmaking_queue FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own queue"
  ON public.matchmaking_queue FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave queue"
  ON public.matchmaking_queue FOR DELETE USING (auth.uid() = user_id);

-- RLS for battles (both players can read/update)
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Players can view their battles"
  ON public.battles FOR SELECT USING (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can insert battles"
  ON public.battles FOR INSERT WITH CHECK (auth.uid() = player1_id OR auth.uid() = player2_id);
CREATE POLICY "Players can update their battles"
  ON public.battles FOR UPDATE USING (auth.uid() = player1_id OR auth.uid() = player2_id);

-- Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.matchmaking_queue;

-- Auto-update timestamp
CREATE TRIGGER update_battles_timestamp
  BEFORE UPDATE ON public.battles
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- Add NFT tracking to regenmons
ALTER TABLE public.regenmons ADD COLUMN IF NOT EXISTS token_id INTEGER;
ALTER TABLE public.regenmons ADD COLUMN IF NOT EXISTS nft_tx_hash TEXT;
