-- Allow battle participants to view opponent equipped avatars
-- This policy enables users to see equipped avatars (is_equipped = true) of their opponents in battles

CREATE POLICY "Battle participants can view opponent equipped avatars"
ON user_unlocks FOR SELECT
USING (
  -- Only expose equipped items (avatars) to battle opponents
  is_equipped = true
  AND EXISTS (
    SELECT 1 FROM battles
    WHERE battles.status IN ('WAITING', 'IN_PROGRESS', 'FINISHED')
    AND (
      -- Current user is player1 and viewing player2's equipped items
      (battles.player1_id = auth.uid() AND battles.player2_id = user_unlocks.user_id)
      OR
      -- Current user is player2 and viewing player1's equipped items
      (battles.player2_id = auth.uid() AND battles.player1_id = user_unlocks.user_id)
    )
  )
);