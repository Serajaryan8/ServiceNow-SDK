from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

output_path = "git_basics_cheatsheet.pdf"

styles = getSampleStyleSheet()
styleH = styles['Heading1']
styleN = styles['BodyText']
styleH2 = styles['Heading2']

doc = SimpleDocTemplate(output_path, pagesize=letter)
story = []

story.append(Paragraph("Git Basics — Pull / Commit / Push", styleH))
story.append(Spacer(1, 12))

sections = [
    ("Quick Notes", "These are concise commands for common Git workflows on a local repo with a remote origin."),
    ("Check status", "`git status` — shows changed files, staged files, and current branch."),
    ("Fetch from remote", "`git fetch origin` — update local refs from remote without merging."),
    ("Pull changes (fetch+merge)", "`git pull origin <branch>` — fetch and merge remote branch into current branch. Commonly `git pull origin main`."),
    ("Add files (stage)", "`git add <file>` or `git add .` — stage one or more files for commit."),
    ("Commit staged changes", "`git commit -m \"Your message\"` — create a commit with a short message."),
    ("Amend last commit", "`git commit --amend -m \"New message\"` — modify the last commit (use with care if already pushed)."),
    ("Push commits", "`git push origin <branch>` — push local commits to the remote branch (e.g., `git push origin main`)."),
    ("Create new branch", "`git checkout -b <branch-name>` — create and switch to a new branch."),
    ("Switch branches", "`git checkout <branch-name>` or `git switch <branch-name>` — change branches."),
    ("Merge branch", "`git merge <branch>` — merge another branch into the current one."),
    ("View log", "`git log --oneline --graph --decorate` — compact visual commit history."),
    ("View changes", "`git diff` (unstaged), `git diff --staged` (staged) — show diffs."),
    ("Stash changes", "`git stash` and `git stash pop` — temporarily save and later restore uncommitted changes."),
    ("Undo local changes", "`git checkout -- <file>` (discard unstaged) and `git reset HEAD <file>` (unstage). Use with caution."),
]

for title, text in sections:
    story.append(Paragraph(title, styleH2))
    story.append(Paragraph(text, styleN))
    story.append(Spacer(1, 8))

# Short workflow example
story.append(Paragraph("Simple daily workflow", styleH2))
workflow = (
    "1. `git pull origin main` — bring remote changes.\n"
    "2. Make edits locally.\n"
    "3. `git add .` — stage edits.\n"
    "4. `git commit -m \"Describe changes\"` — commit.\n"
    "5. `git push origin main` — upload changes to remote."
)
story.append(Paragraph(workflow, styleN))
story.append(Spacer(1, 12))

story.append(Paragraph("Tips", styleH2))
story.append(Paragraph("- Use clear commit messages.\n- Pull before you start working to reduce merge conflicts.\n- Prefer feature branches for larger changes.", styleN))

try:
    doc.build(story)
    print(f"PDF generated: {output_path}")
except Exception as e:
    print("Error generating PDF:", e)
