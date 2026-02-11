import sys
import json
import subprocess
import re
from datetime import datetime

def format_date(date_str):
    try:
        # Handle 2018-03-21T16:35:32Z
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime("%B %d, %Y at %H:%M")
    except Exception as e:
        return date_str

def get_issue_details(owner, repo, issue_number):
    repo_full = f"{owner}/{repo}"
    cmd = [
        "gh", "issue", "view", issue_number,
        "--repo", repo_full,
        "--json", "title,body,author,createdAt,url"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def get_comments(owner, repo, issue_number):
    # Use gh api to get all comments with pagination
    endpoint = f"repos/{owner}/{repo}/issues/{issue_number}/comments"
    cmd = [
        "gh", "api", endpoint,
        "--paginate",
        "--method", "GET"
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout)

def generate_markdown(issue, comments):
    md = []
    
    # Header
    md.append(f"# {issue['title']}")
    md.append(f"**{issue['author']['login']}** opened this issue on {format_date(issue['createdAt'])}")
    md.append(f"[View on GitHub]({issue['url']})")
    md.append("\n---\n")
    
    # Main Body
    md.append(issue['body'])
    md.append("\n")
    
    # Comments
    md.append(f"## Comments ({len(comments)})")
    
    for i, comment in enumerate(comments, 1):
        md.append("\n---\n")
        user = comment.get('user')
        author = user['login'] if user else "Ghost"
        created_at = comment.get('created_at', comment.get('createdAt'))
        date = format_date(created_at)
        url = comment.get('html_url', '#')
        
        md.append(f"### Comment {i} by **{author}** on {date}")
        md.append(f"[Link]({url})")
        md.append("\n")
        md.append(comment['body'])
        md.append("\n")
        
    return "\n".join(md)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python extract_gh_issue.py <issue_url>")
        sys.exit(1)
        
    url = sys.argv[1]
    
    # Extract info
    match = re.search(r'github\.com/([^/]+)/([^/]+)/issues/(\d+)', url)
    if not match:
        print("Error: Invalid GitHub issue URL")
        sys.exit(1)
        
    owner, repo, issue_number = match.groups()
    
    print(f"Fetching issue #{issue_number} from {owner}/{repo}...", file=sys.stderr)
    
    try:
        issue = get_issue_details(owner, repo, issue_number)
        comments = get_comments(owner, repo, issue_number)
        
        markdown_content = generate_markdown(issue, comments)
        print(markdown_content)
        
    except subprocess.CalledProcessError as e:
        print(f"Error running gh command: {e.stderr}", file=sys.stderr)
        sys.exit(1)
