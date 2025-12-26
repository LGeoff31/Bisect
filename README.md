# Bisect

<img width="1919" height="902" alt="image" src="https://github.com/user-attachments/assets/c84e0d6d-cf5b-4a88-a224-c6ab9168b89e" />

## Table of Contents

- [Introduction](#introduction)
- [How to use](#how-to-use)
- [Architecture](#architecture)
- [Building process](#building-process)




## Backend endpoints (written by me)

Clones their github repo into a ```.repos/{repoId}``` directory.
```ts
// /api/repo/route.ts
export async function POST(request: NextRequest) {
   const {repoUrl, repoPath} = await request.json();
   const repoId = uuidv4();
   const repoDir = path.join(process.cwd(), ".repos");
   await fs.mkdir(repoDir, {recursive: true});

   const git = simpleGit();
   await git.clone(repoUrl, repoDir);

   return NextResponse.json({
      repoId,
      repoDir: path.relative(process.cwd(), repoDir),
      message: "Repository read"
   })
}
```
