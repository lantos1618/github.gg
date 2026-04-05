import { Resend } from 'resend';
import { renderProfileAnalysisEmail } from '@/lib/email/templates/profile-analysis';
import { renderFeatureRequestEmail } from '@/lib/email/templates/feature-request';
import { renderScorecardEmail } from '@/lib/email/templates/scorecard';


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

