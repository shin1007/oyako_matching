-- Add DELETE policy for time_capsules table
-- Allow parents to delete their own time capsules

CREATE POLICY "Parents can delete their own time capsules" ON public.time_capsules
  FOR DELETE USING (auth.uid() = parent_id);
