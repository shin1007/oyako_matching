-- RLS policies for target_people table

-- Enable RLS on target_people table
ALTER TABLE public.target_people ENABLE ROW LEVEL SECURITY;

-- Searching children policies
DROP POLICY IF EXISTS "Users can view their own searching children" ON public.target_people;
CREATE POLICY "Users can view their own searching children" ON public.target_people
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own searching children" ON public.target_people;
CREATE POLICY "Users can insert their own searching children" ON public.target_people
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own searching children" ON public.target_people;
CREATE POLICY "Users can update their own searching children" ON public.target_people
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own searching children" ON public.target_people;
CREATE POLICY "Users can delete their own searching children" ON public.target_people
  FOR DELETE USING (auth.uid() = user_id);
