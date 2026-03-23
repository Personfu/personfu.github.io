import json

tools_data = [
  {
    "category": "Hardware & RF Security",
    "tools": [
      {"name": "flipperzero-firmware", "path": "flipperdevices/flipperzero-firmware", "stars": 15711, "description": "Flipper Zero firmware source code"},
      {"name": "unleashed-firmware", "path": "DarkFlippers/unleashed-firmware", "stars": 21276, "description": "Flipper Zero Unleashed Firmware"},
      {"name": "HackRF-Treasure-Chest", "path": "RocketGod-git/HackRF-Treasure-Chest", "stars": 689, "description": "HackRF tools and resources"},
      {"name": "ProtoPirate", "path": "RocketGod-git/ProtoPirate", "stars": 464, "description": "Protocol research tool"},
      {"name": "ESP32-Bus-Pirate", "path": "geo-tp/ESP32-Bus-Pirate", "stars": 2983, "description": "Bus Pirate implementation for ESP32"}
    ]
  },
  {
    "category": "Reconnaissance & OSINT",
    "tools": [
      {"name": "nmap", "path": "nmap/nmap", "stars": 12588, "description": "Network exploration tool and security / port scanner"},
      {"name": "theHarvester", "path": "laramies/theHarvester", "stars": 15870, "description": "E-mails, subdomains and names Harvester - OSINT (Supports Shodan API)"},
      {"name": "wireshark", "path": "wireshark/wireshark", "stars": 9096, "description": "Network traffic analyzer"},
      {"name": "waymore", "path": "xnl-h4ck3r/waymore", "stars": 2571, "description": "Advanced URL enumeration from various sources"},
      {"name": "XSStrike", "path": "s0md3v/XSStrike", "stars": 14828, "description": "Advanced XSS detection suite"}
    ]
  },
  {
    "category": "Exploitation & Post-Exploitation",
    "tools": [
      {"name": "mimikatz", "path": "gentilkiwi/mimikatz", "stars": 21356, "description": "Credential extraction tool"},
      {"name": "sliver", "path": "BishopFox/sliver", "stars": 10883, "description": "General purpose cross-platform C2 framework"},
      {"name": "Havoc", "path": "HavocFramework/Havoc", "stars": 8253, "description": "Modern and malleable post-exploitation command and control framework"},
      {"name": "PowerSploit", "path": "PowerShellMafia/PowerSploit", "stars": 12918, "description": "A collection of Microsoft PowerShell modules that can be used to aid penetration testers"},
      {"name": "beef", "path": "beefproject/beef", "stars": 10781, "description": "The Browser Exploitation Framework Project"}
    ]
  },
  {
    "category": "NASA & Aerospace Systems",
    "tools": [
      {"name": "fprime", "path": "nasa/fprime", "stars": 10808, "description": "A component-oriented framework for flight software and embedded systems"},
      {"name": "cFS", "path": "nasa/cFS", "stars": 1210, "description": "Core Flight System"},
      {"name": "openmct", "path": "nasa/openmct", "stars": 12845, "description": "A next-generation mission control framework"},
      {"name": "astrobee", "path": "nasa/astrobee", "stars": 1261, "description": "Robot software for the International Space Station"}
    ]
  },
  {
    "category": "Security Engineering & Frameworks",
    "tools": [
      {"name": "cset", "path": "Personfu/cset", "stars": 1, "description": "Cyber Security Evaluation Tool"},
      {"name": "osquery", "path": "osquery/osquery", "stars": 23173, "description": "SQL powered operating system instrumentation, monitoring, and analytics"},
      {"name": "CSAF", "path": "cisagov/CSAF", "stars": 100, "description": "Common Security Advisory Framework"}
    ]
  }
]

def generate_tool_card(tool):
    return f"""
        <div class="tool-card" onclick="showToolDetail('{tool['name']}', '{tool['path']}', '{tool['description']}')">
            <div class="tool-icon">
                <img src="https://win98icons.alexmeub.com/icons/png/computer-0.png" width="32">
            </div>
            <div class="tool-info">
                <div class="tool-name">{tool['name']}</div>
                <div class="tool-meta">{tool['stars']} ★ | {tool['path']}</div>
                <div class="tool-desc">{tool['description']}</div>
            </div>
        </div>
    """

html_fragments = ""
for category in tools_data:
    html_fragments += f'<div class="category-header">{category["category"]}</div>'
    html_fragments += '<div class="tools-grid">'
    for tool in category["tools"]:
        html_fragments += generate_tool_card(tool)
    html_fragments += '</div>'

print(html_fragments)
