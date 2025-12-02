-- Allow battle participants to view opponent profiles
-- This policy enables users to see basic profile info (name, avatar) of their opponents in battles

CREATE POLICY "Battle participants can view opponent profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM battles
    WHERE battles.status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')
    AND (
      -- Current user is player1 and viewing player2's profile
      (battles.player1_id = auth.uid() AND battles.player2_id = profiles.id)
      OR
      -- Current user is player2 and viewing player1's profile
      (battles.player2_id = auth.uid() AND battles.player1_id = profiles.id)
    )
  )
);