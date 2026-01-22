# Auto-Push to GitHub Setup

This document explains how to automatically push to GitHub after each commit.

## Method 1: Git Post-Commit Hook (Recommended)

A post-commit hook has been set up that automatically pushes to GitHub after every commit.

### How it works:
- After you run `git commit`, the hook automatically runs `git push`
- No additional commands needed!

### Usage:
```bash
git add .
git commit -m "Your commit message"
# Automatically pushes to GitHub!
```

### To disable:
```bash
rm .git/hooks/post-commit
```

### To re-enable:
```bash
chmod +x .git/hooks/post-commit
```

## Method 2: npm Scripts

You can use the npm scripts for convenience:

```bash
# Commit and push in one command
npm run commit-push "Your commit message"
```

## Method 3: Git Alias

Add this to your `~/.gitconfig`:

```bash
git config --global alias.apush '!git add . && git commit -m "$1" && git push'
```

Then use:
```bash
git apush "Your commit message"
```

## Notes

- The post-commit hook will only push if you're on a branch that has a remote tracking branch
- If push fails (e.g., authentication issues), you'll see an error message
- Make sure you have proper GitHub authentication set up (Personal Access Token or SSH)

