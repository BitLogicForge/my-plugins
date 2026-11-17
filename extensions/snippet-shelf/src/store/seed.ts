/** Starter snippets file, also the source for "Add Example Snippets". */
export const SEED = `// Snippet Shelf: your snippets. Keys are categories, values are lists of snippets.
//
//   name         shown in the list
//   body         a string, or an array of lines
//   description  optional
//   action       "run" (default: send to terminal and run), "paste" (terminal, no Enter),
//                "insert" (into the editor at the cursor), "copy" (clipboard),
//                "open" (open the body as a URL in the browser)
//   when         optional: only show the snippet while git is in this state, pinned at the top:
//                "rebase", "merge", "cherry-pick", "revert", "bisect", "am",
//                "in-progress" (any of those), "conflicts", or "idle" (nothing in progress).
//                A string or a list.
//
// Variables (filled in automatically; spaces/case don't matter, {{currentBranch}} also works).
// "Snippet Shelf: Show Variable Values" shows them all with their current values.
//   git:     {{current branch}} {{default branch}} {{previous branch}} {{upstream}}
//            {{upstream branch}} {{remote}} {{remote url}} {{repo web url}} {{repo owner}}
//            {{repo name}} {{repo root}} {{repo file}} {{head sha}} {{short sha}}
//            {{branch ticket}} {{branch prefix}} {{branch topic}} {{latest tag}}
//            {{next patch tag}} {{next minor tag}} {{next major tag}} {{git operation}}
//            {{conflicted files}} {{user name}} {{user email}}
//   pickers: {{pick branch}} {{pick remote branch}} {{pick tag}} {{pick stash}}
//            {{pick commit}} {{pick conflicted file}} {{pick remote}}
//   editor:  {{workspace folder}} {{workspace name}} {{file}} {{file name}} {{file dir}}
//            {{relative file}} {{line}} {{selection}} {{clipboard}} {{date}} {{time}} {{uuid}}
//
// Anything else is asked for when the snippet runs:
//   {{repo url}}            free text
//   {{branch=main}}         free text, prefilled with "main"
//   {{type=feat|fix|chore}} pick one
// The same name used twice is asked once. Write \\{{ for a literal {{.
{
  "Git": [
    {
      "name": "Init repo from existing remote",
      "description": "git init + merge a remote with unrelated history",
      "body": [
        "git init",
        "git remote add origin {{repo url}}",
        "git fetch origin",
        "git merge origin/{{remote branch=main}} --allow-unrelated-histories"
      ]
    }
  ],
  "Git: in progress": [
    {
      "name": "Continue rebase",
      "body": "git rebase --continue",
      "when": "rebase"
    },
    {
      "name": "Skip this commit (rebase)",
      "body": "git rebase --skip",
      "action": "paste",
      "when": "rebase"
    },
    {
      "name": "Abort rebase",
      "body": "git rebase --abort",
      "action": "paste",
      "when": "rebase"
    },
    {
      "name": "Continue merge",
      "body": "git merge --continue",
      "when": "merge"
    },
    {
      "name": "Abort merge",
      "body": "git merge --abort",
      "action": "paste",
      "when": "merge"
    },
    {
      "name": "Continue cherry-pick",
      "body": "git cherry-pick --continue",
      "when": "cherry-pick"
    },
    {
      "name": "Skip this commit (cherry-pick)",
      "body": "git cherry-pick --skip",
      "action": "paste",
      "when": "cherry-pick"
    },
    {
      "name": "Abort cherry-pick",
      "body": "git cherry-pick --abort",
      "action": "paste",
      "when": "cherry-pick"
    },
    {
      "name": "Continue revert",
      "body": "git revert --continue",
      "when": "revert"
    },
    {
      "name": "Abort revert",
      "body": "git revert --abort",
      "action": "paste",
      "when": "revert"
    },
    {
      "name": "Bisect: good / bad / skip",
      "body": "git bisect {{result=good|bad|skip}}",
      "when": "bisect"
    },
    {
      "name": "Bisect: reset",
      "body": "git bisect reset",
      "when": "bisect"
    },
    {
      "name": "List conflicted files",
      "body": "git diff --name-only --diff-filter=U",
      "when": "conflicts"
    },
    {
      "name": "Open a conflicted file",
      "body": "code {{pick conflicted file}}",
      "when": "conflicts"
    },
    {
      "name": "Mark a file as resolved",
      "body": "git add {{pick conflicted file}}",
      "when": "conflicts"
    },
    {
      "name": "Take one side for a file",
      "description": "during a REBASE ours = branch you rebase onto, theirs = your commits",
      "body": [
        "git checkout --{{side=ours|theirs}} -- {{pick conflicted file}}",
        "git add {{pick conflicted file}}"
      ],
      "action": "paste",
      "when": "conflicts"
    },
    {
      "name": "Show what is in progress",
      "body": "git status",
      "when": "in-progress"
    }
  ],
  "Git: sync": [
    {
      "name": "Update from default branch (rebase)",
      "body": ["git fetch origin", "git rebase origin/{{default branch}}"],
      "action": "paste"
    },
    {
      "name": "Update from default branch (merge)",
      "body": ["git fetch origin", "git merge origin/{{default branch}}"]
    },
    {
      "name": "Pull current branch (rebase)",
      "body": "git pull --rebase origin {{current branch}}"
    },
    {
      "name": "Push current branch",
      "body": "git push -u origin {{current branch}}"
    },
    {
      "name": "Force push after rebase (safe)",
      "description": "--force-with-lease refuses if someone else pushed",
      "body": "git push --force-with-lease origin {{current branch}}",
      "action": "paste"
    },
    {
      "name": "Go to default branch and update",
      "body": ["git switch {{default branch}}", "git pull --ff-only"]
    }
  ],
  "Git: rebase & merge": [
    {
      "name": "Merge a branch into current",
      "body": "git merge {{pick branch}}",
      "action": "paste"
    },
    {
      "name": "Rebase current onto a branch",
      "body": "git rebase {{pick branch}}",
      "action": "paste"
    },
    {
      "name": "Interactive rebase of my branch",
      "description": "all commits since branching off the default branch",
      "body": "git rebase -i $(git merge-base HEAD origin/{{default branch}})",
      "action": "paste"
    },
    {
      "name": "Squash last N commits",
      "body": "git rebase -i HEAD~{{how many=3}}",
      "action": "paste"
    },
    {
      "name": "Fixup a recent commit",
      "description": "stage changes first; then autosquash",
      "body": [
        "git commit --fixup={{pick commit}}",
        "git rebase -i --autosquash origin/{{default branch}}"
      ],
      "action": "paste"
    },
    {
      "name": "Squash-merge a branch into current",
      "body": ["git merge --squash {{pick branch}}", "git commit"],
      "action": "paste"
    },
    {
      "name": "Cherry-pick a commit",
      "body": "git cherry-pick {{commit}}",
      "action": "paste"
    }
  ],
  "Git: commit": [
    {
      "name": "Commit with ticket from branch",
      "description": "e.g. branch feat/ABC-123-login -> 'ABC-123: message'",
      "body": "git commit -m '{{branch ticket}}: {{message}}'"
    },
    {
      "name": "Commit with type from branch",
      "description": "e.g. branch feat/login -> 'feat: message'",
      "body": "git commit -m '{{branch prefix}}: {{message}}'"
    },
    {
      "name": "Amend last commit (keep message)",
      "body": "git commit --amend --no-edit",
      "action": "paste"
    }
  ],
  "Git: inspect": [
    {
      "name": "What I'd push (ahead of upstream)",
      "body": "git log --oneline --graph {{upstream}}..HEAD"
    },
    {
      "name": "What I'd add to default (ahead of default)",
      "body": "git log --oneline --graph origin/{{default branch}}..HEAD"
    },
    {
      "name": "What I'm missing (behind default)",
      "body": ["git fetch origin", "git log --oneline HEAD..origin/{{default branch}}"]
    },
    {
      "name": "Changed files vs default branch",
      "body": "git diff --stat origin/{{default branch}}...HEAD"
    },
    {
      "name": "History of current file",
      "body": "git log --oneline --follow -- {{repo file}}"
    },
    {
      "name": "Branch graph",
      "body": "git log --oneline --graph --decorate -n {{how many=30}} --all"
    },
    {
      "name": "Reflog (find lost commits)",
      "body": "git reflog -n {{how many=20}}"
    }
  ],
  "Git: undo": [
    {
      "name": "Undo last commit, keep changes",
      "body": "git reset --soft HEAD~1",
      "action": "paste"
    },
    {
      "name": "Undo the rebase/merge I just did",
      "description": "ORIG_HEAD = where you were before it; use right after",
      "body": "git reset --hard ORIG_HEAD",
      "action": "paste"
    },
    {
      "name": "Reset branch to the remote version",
      "description": "DISCARDS local commits and changes",
      "body": "git reset --hard {{upstream}}",
      "action": "paste"
    },
    {
      "name": "Discard changes in current file",
      "body": "git restore {{repo file}}",
      "action": "paste"
    }
  ],
  "Git: branches & stash": [
    {
      "name": "Switch to a branch",
      "description": "recently used first",
      "body": "git switch {{pick branch}}"
    },
    {
      "name": "Switch to previous branch",
      "body": "git switch {{previous branch}}"
    },
    {
      "name": "Check out a remote branch",
      "body": "git switch --track {{pick remote branch}}"
    },
    {
      "name": "New branch from up-to-date default",
      "body": [
        "git fetch origin",
        "git switch -c {{type=feat|fix|chore}}/{{branch name}} origin/{{default branch}}"
      ]
    },
    {
      "name": "Rename current branch",
      "body": "git branch -m {{new name}}",
      "action": "paste"
    },
    {
      "name": "Delete a branch",
      "body": "git branch -d {{pick branch}}",
      "action": "paste"
    },
    {
      "name": "Delete merged local branches",
      "body": [
        "git fetch --prune",
        "git branch --merged origin/{{default branch}} | grep -vE '^\\\\*|^\\\\s*{{default branch}}$' | xargs -r git branch -d"
      ],
      "action": "paste"
    },
    {
      "name": "Stash everything (incl. untracked)",
      "body": "git stash push -u -m '{{message}}'"
    },
    {
      "name": "Apply a stash",
      "body": "git stash apply {{pick stash}}"
    },
    {
      "name": "Pop latest stash",
      "body": "git stash pop"
    },
    {
      "name": "Drop a stash",
      "body": "git stash drop {{pick stash}}",
      "action": "paste"
    }
  ],
  "Git: tags": [
    {
      "name": "Tag next patch release",
      "description": "latest vX.Y.Z tag + 0.0.1",
      "body": ["git tag -a {{next patch tag}} -m 'Release {{next patch tag}}'", "git push origin {{next patch tag}}"],
      "action": "paste"
    },
    {
      "name": "Tag next minor release",
      "body": ["git tag -a {{next minor tag}} -m 'Release {{next minor tag}}'", "git push origin {{next minor tag}}"],
      "action": "paste"
    },
    {
      "name": "Changes since latest tag",
      "body": "git log --oneline {{latest tag}}..HEAD"
    },
    {
      "name": "Check out a tag",
      "body": "git switch --detach {{pick tag}}",
      "action": "paste"
    }
  ],
  "Git: browser": [
    {
      "name": "Open repo in browser",
      "body": "{{repo web url}}",
      "action": "open"
    },
    {
      "name": "Open current file in browser",
      "body": "{{repo web url}}/blob/{{current branch}}/{{repo file}}#L{{line}}",
      "action": "open"
    },
    {
      "name": "Open pull request for this branch (GitHub)",
      "body": "{{repo web url}}/compare/{{default branch}}...{{current branch}}?expand=1",
      "action": "open"
    },
    {
      "name": "Open merge request for this branch (GitLab)",
      "body": "{{repo web url}}/-/merge_requests/new?merge_request[source_branch]={{current branch}}",
      "action": "open"
    },
    {
      "name": "Open branch commits in browser",
      "body": "{{repo web url}}/commits/{{current branch}}",
      "action": "open"
    }
  ],
  "Test (safe)": [
    {
      "name": "Show git variables",
      "description": "only echoes, changes nothing",
      "body": [
        "echo 'current branch: {{current branch}}'",
        "echo 'default branch: {{default branch}}'",
        "echo 'remote url:     {{remote url}}'",
        "echo 'repo web url:   {{repo web url}}'",
        "echo 'repo name:      {{repo name}}'",
        "echo 'short sha:      {{short sha}}'"
      ]
    },
    {
      "name": "Git status",
      "body": "git status --short --branch"
    },
    {
      "name": "Last commits on current branch",
      "body": "git log --oneline -n {{how many=5}} {{current branch}}"
    },
    {
      "name": "Pick a branch (just echo it)",
      "body": "echo 'you picked {{pick branch}}'"
    },
    {
      "name": "Prompt demo",
      "description": "text, prefilled and pick prompts; {{name}} is asked once",
      "body": [
        "echo 'Hello {{name}}!'",
        "echo 'Color: {{color=red|green|blue}}, size: {{size=M}}'",
        "echo 'Bye {{name}}.'"
      ]
    },
    {
      "name": "Paste demo (does not run)",
      "body": ["echo 'line one'", "echo 'line two'"],
      "action": "paste"
    },
    {
      "name": "Current file info",
      "body": "echo '{{repo file}} line {{line}} in {{repo name}}'",
      "action": "copy"
    }
  ],
  "Text": [
    {
      "name": "Today's date",
      "body": "{{date}}",
      "action": "insert"
    }
  ]
}
`;
