import { Resend } from 'resend';
import { renderBattleResultsEmail } from '@/lib/email/templates/battle-results';
import { renderProfileAnalysisEmail } from '@/lib/email/templates/profile-analysis';
import { renderFeatureRequestEmail } from '@/lib/email/templates/feature-request';
import { renderBattleChallengeEmail } from '@/lib/email/templates/battle-challenge';
import { renderScorecardEmail } from '@/lib/email/templates/scorecard';
import { renderWrappedReadyEmail, renderWrappedGiftEmail } from '@/lib/email/templates/wrapped';

const resend = new Resend(process.env.RESEND_API_KEY);

export interface ProfileAnalysisEmailData {
  recipientEmail: string;
  recipientUsername: string;
  analyzerUsername: string;
  analyzerEmail?: string;
  profileData: {
    summary: string;
    overallScore?: number;
    topSkills?: string[];
    suggestions?: string[];
  };
}

export async function sendProfileAnalysisEmail(data: ProfileAnalysisEmailData) {
  const { recipientEmail, recipientUsername, analyzerUsername, profileData } = data;
  const html = renderProfileAnalysisEmail({ recipientUsername, analyzerUsername, profileData });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: recipientEmail,
      subject: `${analyzerUsername} analyzed your GitHub profile!`,
      html,
    });

    console.log('✅ Profile analysis email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send profile analysis email:', error);
    throw error;
  }
}

export async function sendFeatureRequestEmail(data: {
  userEmail: string;
  featureRequest: string;
}) {
  const { userEmail, featureRequest } = data;
  const html = renderFeatureRequestEmail({ userEmail, featureRequest });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: 'lantos1618@gmail.com', // Your email
      replyTo: userEmail,
      subject: `New Feature Request from ${userEmail}`,
      html,
    });

    console.log('✅ Feature request email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send feature request email:', error);
    throw error;
  }
}

export async function sendBattleResultsEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  opponentUsername: string;
  won: boolean;
  yourScore: number;
  opponentScore: number;
  eloChange: number;
  newElo: number;
  reason: string;
}) {
  const { recipientEmail, recipientUsername, opponentUsername, won, yourScore, opponentScore, eloChange, newElo, reason } = data;
  const html = renderBattleResultsEmail({
    recipientUsername,
    opponentUsername,
    won,
    yourScore,
    opponentScore,
    eloChange,
    newElo,
    reason,
  });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg Arena <arena@github.gg>',
      to: recipientEmail,
      subject: `${won ? '🏆 Victory!' : '💪 Battle Results'} You ${won ? 'defeated' : 'fought'} ${opponentUsername}`,
      html,
    });

    console.log('✅ Battle results email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send battle results email:', error);
    throw error;
  }
}

export async function sendBattleChallengeEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  challengerUsername: string;
  battleId: string;
}) {
  const { recipientEmail, recipientUsername, challengerUsername } = data;
  const html = renderBattleChallengeEmail({ recipientUsername, challengerUsername });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg Arena <arena@github.gg>',
      to: recipientEmail,
      subject: `⚔️ ${challengerUsername} challenged you to a coding battle!`,
      html,
    });

    console.log('✅ Battle challenge email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send battle challenge email:', error);
    throw error;
  }
}

export async function sendScorecardEmail(data: {
  recipientEmail: string;
  repoName: string;
  analyzerUsername: string;
  scorecard: {
    overallScore: number;
    markdown: string;
  };
}) {
  const { recipientEmail, repoName, analyzerUsername, scorecard } = data;
  const html = renderScorecardEmail({ repoName, analyzerUsername, overallScore: scorecard.overallScore });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: recipientEmail,
      subject: `${analyzerUsername} analyzed your repository ${repoName}!`,
      html,
    });

    console.log('✅ Scorecard email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send scorecard email:', error);
    throw error;
  }
}

export async function sendWrappedEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  year: number;
  wrappedUrl: string;
  stats: {
    totalCommits: number;
    topLanguage: string;
    longestStreak: number;
  };
}) {
  const { recipientEmail, recipientUsername, year, wrappedUrl, stats } = data;
  const html = renderWrappedReadyEmail({ recipientUsername, year, wrappedUrl, stats });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: recipientEmail,
      subject: `🎁 Your ${year} GitHub Wrapped is ready!`,
      html,
    });

    console.log('✅ Wrapped email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send wrapped email:', error);
    throw error;
  }
}

export async function sendWrappedGiftEmail(data: {
  recipientEmail: string;
  recipientUsername: string;
  senderUsername: string;
  year: number;
  personalMessage?: string;
  wrappedUrl: string;
  stats: {
    totalCommits: number;
    topLanguage: string;
    longestStreak: number;
  };
}) {
  const { recipientEmail, recipientUsername, senderUsername, year, personalMessage, wrappedUrl, stats } = data;
  const html = renderWrappedGiftEmail({ recipientUsername, senderUsername, year, personalMessage, wrappedUrl, stats });

  try {
    const response = await resend.emails.send({
      from: 'GitHub.gg <hello@github.gg>',
      to: recipientEmail,
      subject: `🎁 ${senderUsername} created a ${year} Wrapped for you!`,
      html,
    });

    console.log('✅ Wrapped gift email sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Failed to send wrapped gift email:', error);
    throw error;
  }
}
