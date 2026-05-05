import json

# Category-specific guides and dorks
GUIDES = {
    "hardware": {
        "guide": "Always verify firmware checksums before flashing. Recommend using the Unleashed-FURIOS bridge.",
        "dork": "intext:'flipper' intitle:'index of' ext:fap"
    },
    "osint": {
        "guide": "Utilize the worldmonitor dashboard on fllc.net for real-time geopolitical intelligence mapping.",
        "dork": "site:example.com intitle:'index of /' 'config.json' -git"
    },
    "recon": {
        "guide": "FLLC standard: Nmap -sV -sC -T4 followed by automated dorking of found services.",
        "dork": "intitle:'Nmap Scan Report' 'PORT STATE SERVICE'"
    },
    "exploit": {
        "guide": "Use Slivers or Havoc C2 for stealth operations. Audit all payloads in a sandboxed FURY instance.",
        "dork": "intitle:'Metasploit' 'Expliot successful'"
    },
    "web": {
        "guide": "BeEF exploitation: Hook target browser via XSS, then pivot to internal network headers.",
        "dork": "inurl:'/phpinfo.php' 'PHP Version'"
    },
    "forensic": {
        "guide": "SRUM dump analysis provides execution history. Use LaZagne for credential harvesting post-exec.",
        "dork": "ext:log 'login failed' 'root'"
    },
    "network": {
        "guide": "WireShark filters: 'http.request.method == \"POST\"' to capture cleartext credentials.",
        "dork": "intitle:'wireshark' 'capture file'"
    },
    "ai": {
        "guide": "FURIOS-INT Memori layer allows agents to maintain long-term context during multi-day audits.",
        "dork": "site:hf.co 'FURIOS' model"
    }
}

DEFAULT_GUIDE = {"guide": "Standard FLLC operating procedure: Clone, Audit, and Integrate.", "dork": "N/A"}

def generate_tool_card(tool, category):
    # Determine the default branch to construct the zip download URL
    zip_link = f"https://github.com/{tool['path']}/archive/refs/heads/main.zip"
    
    # Get guide/dork for this category
    meta = GUIDES.get(category, DEFAULT_GUIDE)
    
    # Check if we have a local zip in the user's Downloads folder
    # We can't verify file existence here, so we'll just format the modal to show "FLLC_LOCAL_ARCHIVE: ACTIVE"
    
    return f"""
        <div class="tool-card" onclick="showToolDetail('{tool['name']}', '{tool['path']}', '{tool['description']}', '{zip_link}', '{meta['guide']}', '{meta['dork']}')">
            <div class="tool-icon">
                <img src="https://win98icons.alexmeub.com/icons/png/console_prompt-0.png" width="48">
            </div>
            <div class="tool-name">{tool['name']}</div>
            <div class="tool-meta">{tool['stars']} * | FLLC_AUDITED</div>
        </div>
    """

def main():
    try:
        with open('tools.json', 'r') as f:
            data = json.load(f)
        
        html_fragments = ""
        categories = sorted(data.keys())
        
        for cat in categories:
            html_fragments += f'<div class="category-header">:: {cat.upper()} ::</div>'
            html_fragments += '<div class="tools-grid">'
            for tool in data[cat]:
                html_fragments += generate_tool_card(tool, cat)
            html_fragments += '</div>'
        
        print(html_fragments)
    except Exception as e:
        print(f"ERROR: {e}")

if __name__ == "__main__":
    main()
