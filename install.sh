#!/bin/bash

# RecCall Installer Script
# Downloads and installs RecCall MCP server for Cursor IDE
# Usage: curl -sfL https://reccaller.ai/install.sh | sh -

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/reccaller-ai/reccall"
INSTALL_DIR="$HOME/.reccall"
CURSOR_CONFIG_DIR=""
CURSOR_CONFIG_FILE=""

# Detect OS and set Cursor config path
detect_cursor_config() {
    case "$(uname -s)" in
        Darwin*)
            CURSOR_CONFIG_DIR="$HOME/.cursor"
            CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/mcp.json"
            ;;
        Linux*)
            CURSOR_CONFIG_DIR="$HOME/.cursor"
            CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/mcp.json"
            ;;
        CYGWIN*|MINGW32*|MSYS*|MINGW*)
            CURSOR_CONFIG_DIR="$APPDATA/Cursor/User/globalStorage/saoudrizwan.claude-dev/settings"
            CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/cline_mcp_settings.json"
            ;;
        *)
            echo -e "${RED}❌ Unsupported operating system: $(uname -s)${NC}"
            exit 1
            ;;
    esac
}

# Check prerequisites
check_prerequisites() {
    echo -e "${BLUE}🔍 Checking prerequisites...${NC}"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18 or higher.${NC}"
        echo -e "${YELLOW}   Visit: https://nodejs.org/${NC}"
        exit 1
    fi
    
    # Check Node.js version
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}❌ Node.js version $NODE_VERSION is too old. Please install Node.js 18 or higher.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Node.js $(node -v) detected${NC}"
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ npm is not installed. Please install npm.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ npm $(npm -v) detected${NC}"
}

# Download and install RecCall
install_reccall() {
    echo -e "${BLUE}📦 Installing RecCall...${NC}"
    
    # Create install directory
    mkdir -p "$INSTALL_DIR"
    cd "$INSTALL_DIR"
    
    # Clone repository
    echo -e "${BLUE}📥 Downloading RecCall from GitHub...${NC}"
    if [ -d ".git" ]; then
        echo -e "${YELLOW}⚠️  RecCall already exists, updating...${NC}"
        git pull origin main
    else
        git clone "$REPO_URL" .
    fi
    
    # Install dependencies
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    
    # Build the project
    echo -e "${BLUE}🔨 Building RecCall...${NC}"
    npm run build
    
    # Verify starter pack is included
    if [ -d "starter-pack" ] && [ -f "starter-pack/manifest.json" ]; then
        echo -e "${GREEN}✅ Starter pack included with ${NC}${BLUE}$(find starter-pack -name "*.json" | grep -v manifest.json | wc -l | tr -d ' ')${NC}${GREEN} common recipes${NC}"
    else
        echo -e "${YELLOW}⚠️  Starter pack not found - installation will continue without default recipes${NC}"
    fi
    
    echo -e "${GREEN}✅ RecCall installed successfully!${NC}"
}

# Backup existing config file
backup_config() {
    if [ -f "$CURSOR_CONFIG_FILE" ]; then
        BACKUP_FILE="${CURSOR_CONFIG_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$CURSOR_CONFIG_FILE" "$BACKUP_FILE"
        echo -e "${BLUE}📋 Backed up existing config to: $BACKUP_FILE${NC}"
    fi
}

# Check if jq is available for JSON manipulation
check_jq() {
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed. Installing jq for JSON manipulation...${NC}"
        
        case "$(uname -s)" in
            Darwin*)
                if command -v brew &> /dev/null; then
                    brew install jq
                else
                    echo -e "${RED}❌ Homebrew not found. Please install jq manually: https://stedolan.github.io/jq/download/${NC}"
                    return 1
                fi
                ;;
            Linux*)
                if command -v apt-get &> /dev/null; then
                    sudo apt-get update && sudo apt-get install -y jq
                elif command -v yum &> /dev/null; then
                    sudo yum install -y jq
                elif command -v dnf &> /dev/null; then
                    sudo dnf install -y jq
                else
                    echo -e "${RED}❌ Package manager not found. Please install jq manually: https://stedolan.github.io/jq/download/${NC}"
                    return 1
                fi
                ;;
            *)
                echo -e "${RED}❌ Please install jq manually: https://stedolan.github.io/jq/download/${NC}"
                return 1
                ;;
        esac
    fi
    return 0
}

# Update existing config with reccall server
update_existing_config() {
    local config_file="$1"
    local reccall_path="$2"
    
    echo -e "${BLUE}🔄 Updating existing Cursor configuration...${NC}"
    
    # Check if reccall server already exists
    if jq -e '.mcpServers.reccall' "$config_file" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  RecCall server already exists in config. Updating...${NC}"
        # Update existing reccall server configuration
        jq --arg path "$reccall_path" '.mcpServers.reccall = {"command": "node", "args": [$path]}' "$config_file" > "${config_file}.tmp" && mv "${config_file}.tmp" "$config_file"
    else
        echo -e "${BLUE}➕ Adding RecCall server to existing configuration...${NC}"
        # Add reccall server to existing mcpServers
        if jq -e '.mcpServers' "$config_file" > /dev/null 2>&1; then
            # mcpServers exists, add reccall to it
            jq --arg path "$reccall_path" '.mcpServers.reccall = {"command": "node", "args": [$path]}' "$config_file" > "${config_file}.tmp" && mv "${config_file}.tmp" "$config_file"
        else
            # mcpServers doesn't exist, create it with reccall
            jq --arg path "$reccall_path" '. + {"mcpServers": {"reccall": {"command": "node", "args": [$path]}}}' "$config_file" > "${config_file}.tmp" && mv "${config_file}.tmp" "$config_file"
        fi
    fi
    
    echo -e "${GREEN}✅ Configuration updated successfully!${NC}"
}

# Create new config file
create_new_config() {
    local config_file="$1"
    local reccall_path="$2"
    
    echo -e "${BLUE}📝 Creating new Cursor configuration...${NC}"
    cat > "$config_file" << EOF
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["$reccall_path"]
    }
  }
}
EOF
    echo -e "${GREEN}✅ Configuration created successfully!${NC}"
}

# Configure Cursor IDE
configure_cursor() {
    echo -e "${BLUE}⚙️  Configuring Cursor IDE...${NC}"
    
    # Create Cursor config directory if it doesn't exist
    mkdir -p "$CURSOR_CONFIG_DIR"
    
    # Get absolute path to the installed RecCall
    RECCALL_PATH="$(pwd)/index.js"
    
    # Check if config file exists
    if [ -f "$CURSOR_CONFIG_FILE" ]; then
        echo -e "${BLUE}📋 Found existing Cursor configuration.${NC}"
        
        # Check if jq is available
        if check_jq; then
            # Backup existing config
            backup_config
            
            # Validate JSON format
            if jq empty "$CURSOR_CONFIG_FILE" 2>/dev/null; then
                # Valid JSON, update it
                update_existing_config "$CURSOR_CONFIG_FILE" "$RECCALL_PATH"
            else
                echo -e "${RED}❌ Invalid JSON in existing config file. Creating backup and new config...${NC}"
                backup_config
                create_new_config "$CURSOR_CONFIG_FILE" "$RECCALL_PATH"
            fi
        else
            echo -e "${YELLOW}⚠️  Cannot automatically update config without jq.${NC}"
            echo -e "${YELLOW}   Please manually add the following to your Cursor config:${NC}"
            echo ""
            echo -e "${BLUE}   \"mcpServers\": {${NC}"
            echo -e "${BLUE}     \"reccall\": {${NC}"
            echo -e "${BLUE}       \"command\": \"node\",${NC}"
            echo -e "${BLUE}       \"args\": [\"$RECCALL_PATH\"]${NC}"
            echo -e "${BLUE}     }${NC}"
            echo -e "${BLUE}   }${NC}"
            echo ""
            echo -e "${YELLOW}   Config file location: $CURSOR_CONFIG_FILE${NC}"
        fi
    else
        echo -e "${BLUE}📝 No existing configuration found.${NC}"
        create_new_config "$CURSOR_CONFIG_FILE" "$RECCALL_PATH"
    fi
}

# Show completion message
show_completion() {
    echo ""
    echo -e "${GREEN}🎉 RecCall installation completed successfully!${NC}"
    echo ""
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo -e "   1. ${YELLOW}Restart Cursor IDE completely${NC}"
    echo -e "   2. ${YELLOW}Open a new chat in Cursor${NC}"
    echo -e "   3. ${YELLOW}Try: 'Save a shortcut called test with context: Hello World'${NC}"
    echo ""
    echo -e "${BLUE}📚 Usage examples:${NC}"
    echo -e "   • ${YELLOW}List all my shortcuts${NC}"
    echo -e "   • ${YELLOW}Call the 'react-component' shortcut${NC}"
    echo -e "   • ${YELLOW}Save a new shortcut called 'my-shortcut' with context: 'My custom instructions'${NC}"
    echo -e "   • ${YELLOW}Reload starter pack recipes${NC}"
    echo ""
    echo -e "${BLUE}🔧 Installation details:${NC}"
    echo -e "   • ${YELLOW}Installed to: $INSTALL_DIR${NC}"
    echo -e "   • ${YELLOW}Cursor config: $CURSOR_CONFIG_FILE${NC}"
    if [ -f "$CURSOR_CONFIG_FILE" ] && [ -f "${CURSOR_CONFIG_FILE}.backup."* ] 2>/dev/null; then
        echo -e "   • ${YELLOW}Config backup: ${CURSOR_CONFIG_FILE}.backup.*${NC}"
    fi
    echo ""
    echo -e "${GREEN}✨ Configuration automatically updated! No manual setup required.${NC}"
    echo -e "${GREEN}🚀 Happy coding with RecCall!${NC}"
}

# Main installation process
main() {
    echo -e "${BLUE}🚀 RecCall Installer${NC}"
    echo -e "${BLUE}===================${NC}"
    echo ""
    
    detect_cursor_config
    check_prerequisites
    install_reccall
    configure_cursor
    show_completion
}

# Run main function
main "$@"
