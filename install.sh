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
            CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/config.json"
            ;;
        Linux*)
            CURSOR_CONFIG_DIR="$HOME/.cursor"
            CURSOR_CONFIG_FILE="$CURSOR_CONFIG_DIR/config.json"
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
    
    echo -e "${GREEN}✅ RecCall installed successfully!${NC}"
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
        echo -e "${YELLOW}⚠️  Cursor config file already exists.${NC}"
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
    else
        echo -e "${BLUE}📝 Creating Cursor configuration...${NC}"
        cat > "$CURSOR_CONFIG_FILE" << EOF
{
  "mcpServers": {
    "reccall": {
      "command": "node",
      "args": ["$RECCALL_PATH"]
    }
  }
}
EOF
        echo -e "${GREEN}✅ Cursor configuration created!${NC}"
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
    echo -e "   • ${YELLOW}Save a shortcut called 'react' with context: 'Create React components with TypeScript'${NC}"
    echo -e "   • ${YELLOW}List all my shortcuts${NC}"
    echo -e "   • ${YELLOW}Call the 'react' shortcut${NC}"
    echo ""
    echo -e "${BLUE}🔧 Installation details:${NC}"
    echo -e "   • ${YELLOW}Installed to: $INSTALL_DIR${NC}"
    echo -e "   • ${YELLOW}Cursor config: $CURSOR_CONFIG_FILE${NC}"
    echo ""
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
