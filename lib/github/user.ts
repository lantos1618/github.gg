import { createOctokit } from "./client";
import { getPublicRepos } from "./repository";

// Helper function to validate GitHub username format
function isValidGitHubUsername(username: string): boolean {
  // GitHub usernames can only contain alphanumeric characters and hyphens
  // They cannot have multiple consecutive hyphens
  // They cannot begin or end with a hyphen
  // They can be up to 39 characters long
  const validUsernameRegex = /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
  return validUsernameRegex.test(username);
}

export async function getUserData(user: string, accessToken?: string) {
  // Validate username format to avoid unnecessary API calls
  if (!user || !isValidGitHubUsername(user)) {
    throw new Error("Invalid GitHub username format");
  }

  try {
    const octokit = createOctokit(accessToken);
    const { data } = await octokit.rest.users.getByUsername({
      username: user,
    });

    // Fetch public repos data
    const public_repos_data = await getPublicRepos(user, accessToken);

    return {
      ...data,
      public_repos_data,
    };
  } catch (error) {
    console.error("Error fetching user data:", error);
    return null;
  }
}
