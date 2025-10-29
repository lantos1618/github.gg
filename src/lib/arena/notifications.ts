import { db } from '@/db';
import { developerEmails } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sendBattleResultsEmail, sendBattleChallengeEmail } from '@/lib/email/resend';

export async function sendBattleResultsToParticipants(
  challengerUsername: string,
  opponentUsername: string,
  challengerWon: boolean,
  battleAnalysis: {
    challengerScore: { total: number };
    opponentScore: { total: number };
    reason: string;
  },
  eloChanges: {
    challenger: { change: number; newRating: number };
    opponent: { change: number; newRating: number };
  }
) {
  try {
    const [challengerEmail, opponentEmail] = await Promise.all([
      db.select().from(developerEmails).where(eq(developerEmails.username, challengerUsername)).limit(1),
      db.select().from(developerEmails).where(eq(developerEmails.username, opponentUsername)).limit(1),
    ]);

    const emailPromises = [];

    // Send email to challenger
    if (challengerEmail[0]?.email) {
      emailPromises.push(
        sendBattleResultsEmail({
          recipientEmail: challengerEmail[0].email,
          recipientUsername: challengerUsername,
          opponentUsername: opponentUsername,
          won: challengerWon,
          yourScore: battleAnalysis.challengerScore.total,
          opponentScore: battleAnalysis.opponentScore.total,
          eloChange: eloChanges.challenger.change,
          newElo: eloChanges.challenger.newRating,
          reason: battleAnalysis.reason,
        })
      );
    }

    // Send email to opponent
    if (opponentEmail[0]?.email) {
      emailPromises.push(
        sendBattleResultsEmail({
          recipientEmail: opponentEmail[0].email,
          recipientUsername: opponentUsername,
          opponentUsername: challengerUsername,
          won: !challengerWon,
          yourScore: battleAnalysis.opponentScore.total,
          opponentScore: battleAnalysis.challengerScore.total,
          eloChange: eloChanges.opponent.change,
          newElo: eloChanges.opponent.newRating,
          reason: battleAnalysis.reason,
        })
      );
    }

    await Promise.all(emailPromises);
  } catch (emailError) {
    // Log but don't fail if email fails
    console.error('Failed to send battle results emails:', emailError);
  }
}

export async function sendBattleChallengeNotification(
  opponentUsername: string,
  challengerUsername: string,
  battleId: string
) {
  try {
    const opponentEmail = await db
      .select()
      .from(developerEmails)
      .where(eq(developerEmails.username, opponentUsername.toLowerCase()))
      .limit(1);

    if (opponentEmail[0]?.email) {
      await sendBattleChallengeEmail({
        recipientEmail: opponentEmail[0].email,
        recipientUsername: opponentUsername,
        challengerUsername,
        battleId,
      });
    }
  } catch (emailError) {
    // Log but don't fail if email fails
    console.error('Failed to send battle challenge email:', emailError);
  }
}
