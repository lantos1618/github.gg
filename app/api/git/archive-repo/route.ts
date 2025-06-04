import { NextResponse } from "next/server";
import { Octokit } from "@octokit/rest";
import JSZip from "jszip";

const PUBLIC_GITHUB_TOKEN = process.env.PUBLIC_GITHUB_TOKEN || "";

export async function POST(request: Request) {
  const { owner, repo, branch, accessToken } = await request.json();

  if (!owner || !repo) {
    return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
  }

  try {
    const octokit = new Octokit({
      auth: accessToken || process.env.GITHUB_TOKEN || PUBLIC_GITHUB_TOKEN,
    });

    let ref = branch;
    if (!ref) {
      const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
      ref = repoInfo.default_branch;
    }

    // Download repository archive
    const response = await octokit.request("GET /repos/{owner}/{repo}/zipball/{ref}", {
      owner,
      repo,
      ref,
    });

    const buffer = Buffer.from(response.data as ArrayBuffer);
    const zip = await JSZip.loadAsync(buffer);
    const files: Array<{ path: string; name: string; size: number; type: string; content: string }> = [];

    await Promise.all(
      Object.keys(zip.files).map(async (key) => {
        const file = zip.files[key];
        if (file.dir) return;
        const content = await file.async("string");
        const pathParts = key.split("/");
        pathParts.shift(); // remove repo-name-branch prefix
        const filePath = pathParts.join("/");
        files.push({
          path: filePath,
          name: pathParts[pathParts.length - 1] || "",
          size: content.length,
          type: "file",
          content,
        });
      })
    );

    return NextResponse.json({ branch: ref, files, fileCount: files.length });
  } catch (error: any) {
    console.error("Error fetching repository archive:", error);
    return NextResponse.json(
      { error: "Failed to fetch repository archive", message: error.message || String(error) },
      { status: 500 },
    );
  }
}
