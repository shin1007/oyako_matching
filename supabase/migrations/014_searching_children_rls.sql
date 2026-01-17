-- RLS policies for searching_children table

-- Enable RLS on searching_children table
ALTER TABLE public.searching_children ENABLE ROW LEVEL SECURITY;

-- Searching children policies
CREATE POLICY "Users can view their own searching children" ON public.searching_children
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searching children" ON public.searching_children
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searching children" ON public.searching_children
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searching children" ON public.searching_children
  FOR DELETE USING (auth.uid() = user_id);
