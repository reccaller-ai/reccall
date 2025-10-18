#!/bin/bash

# RecCall Warp Integration Script
# This script provides RecCall functionality within Warp terminal

RECCALL_STORAGE="$HOME/.reccall.json"
RECCALL_STARTER_PACK="$(dirname "$0")/../starter-pack"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Load shortcuts from storage
load_shortcuts() {
    if [ -f "$RECCALL_STORAGE" ]; then
        cat "$RECCALL_STORAGE"
    else
        echo "{}"
    fi
}

# Save shortcuts to storage
save_shortcuts() {
    echo "$1" > "$RECCALL_STORAGE"
}

# Get shortcut value by key
get_shortcut() {
    local key="$1"
    load_shortcuts | jq -r --arg key "$key" '.[$key] // empty'
}

# Set shortcut key-value pair
set_shortcut() {
    local key="$1"
    local value="$2"
    local shortcuts
    shortcuts=$(load_shortcuts)
    local updated
    updated=$(echo "$shortcuts" | jq --arg key "$key" --arg value "$value" '. + {($key): $value}')
    save_shortcuts "$updated"
}

# Delete shortcut by key
delete_shortcut() {
    local key="$1"
    local shortcuts
    shortcuts=$(load_shortcuts)
    local updated
    updated=$(echo "$shortcuts" | jq --arg key "$key" 'del(.[$key])')
    save_shortcuts "$updated"
}

# List all shortcuts
list_shortcuts() {
    local shortcuts
    shortcuts=$(load_shortcuts)
    local count
    count=$(echo "$shortcuts" | jq 'length')
    
    if [ "$count" -eq 0 ]; then
        echo -e "${YELLOW}No shortcuts stored yet.${NC}"
        echo "Use: reccall rec <shortcut> <context> to create your first shortcut."
        return
    fi
    
    echo -e "${BLUE}📋 Stored shortcuts ($count):${NC}"
    echo
    
    echo "$shortcuts" | jq -r 'to_entries[] | "• \(.key): \(.value | if length > 100 then .[0:100] + "..." else . end)"'
}

# Search shortcuts
search_shortcuts() {
    local query="$1"
    local shortcuts
    shortcuts=$(load_shortcuts)
    local results
    results=$(echo "$shortcuts" | jq --arg query "$query" 'to_entries[] | select(.key | test($query; "i")) or select(.value | test($query; "i"))')
    
    if [ -z "$results" ]; then
        echo -e "${YELLOW}No shortcuts found matching \"$query\".${NC}"
        return
    fi
    
    echo -e "${BLUE}🔍 Found shortcuts matching \"$query\":${NC}"
    echo
    
    echo "$results" | jq -r '"• \(.key): \(.value | if length > 100 then .[0:100] + "..." else . end)"'
}

# Load starter pack
load_starter_pack() {
    if [ ! -d "$RECCALL_STARTER_PACK" ]; then
        echo -e "${RED}❌ Starter pack directory not found: $RECCALL_STARTER_PACK${NC}"
        return 1
    fi
    
    local manifest_file="$RECCALL_STARTER_PACK/manifest.json"
    if [ ! -f "$manifest_file" ]; then
        echo -e "${RED}❌ Starter pack manifest not found: $manifest_file${NC}"
        return 1
    fi
    
    local shortcuts="{}"
    
    while IFS= read -r recipe_file; do
        local recipe_path="$RECCALL_STARTER_PACK/$recipe_file"
        if [ -f "$recipe_path" ]; then
            local shortcut_name
            shortcut_name=$(jq -r '.shortcut' "$recipe_path")
            local context
            context=$(jq -r '.context' "$recipe_path")
            shortcuts=$(echo "$shortcuts" | jq --arg key "$shortcut_name" --arg value "$context" '. + {($key): $value}')
        fi
    done < <(jq -r '.recipes[].file' "$manifest_file")
    
    save_shortcuts "$shortcuts"
    local count
    count=$(echo "$shortcuts" | jq 'length')
    echo -e "${GREEN}✅ Starter pack loaded successfully! $count recipes loaded.${NC}"
}

# Main command handler
reccall() {
    case "$1" in
        "rec")
            if [ $# -lt 3 ]; then
                echo -e "${RED}Usage: reccall rec <shortcut> <context>${NC}"
                return 1
            fi
            
            local shortcut="$2"
            local context="$3"
            
            # Check if shortcut already exists
            local existing
            existing=$(get_shortcut "$shortcut")
            if [ -n "$existing" ]; then
                echo -e "${YELLOW}⚠️  Warning: Shortcut '$shortcut' already exists!${NC}"
                echo "Current context: $existing"
                echo "To update it, use: reccall update $shortcut <new_context>"
                return 1
            fi
            
            set_shortcut "$shortcut" "$context"
            echo -e "${GREEN}✅ Shortcut '$shortcut' has been recorded successfully!${NC}"
            echo "Stored context: $context"
            ;;
            
        "call")
            if [ $# -lt 2 ]; then
                echo -e "${RED}Usage: reccall call <shortcut>${NC}"
                return 1
            fi
            
            local shortcut="$2"
            local context
            context=$(get_shortcut "$shortcut")
            
            if [ -z "$context" ]; then
                echo -e "${RED}❌ Shortcut '$shortcut' not found.${NC}"
                echo "Available shortcuts: $(load_shortcuts | jq -r 'keys[]' | tr '\n' ' ')"
                return 1
            fi
            
            echo -e "${BLUE}📋 Context for '$shortcut':${NC}"
            echo
            echo "$context"
            ;;
            
        "list"|"ls")
            list_shortcuts
            ;;
            
        "search")
            if [ $# -lt 2 ]; then
                echo -e "${RED}Usage: reccall search <query>${NC}"
                return 1
            fi
            
            search_shortcuts "$2"
            ;;
            
        "update")
            if [ $# -lt 3 ]; then
                echo -e "${RED}Usage: reccall update <shortcut> <new_context>${NC}"
                return 1
            fi
            
            local shortcut="$2"
            local new_context="$3"
            local existing
            existing=$(get_shortcut "$shortcut")
            
            if [ -z "$existing" ]; then
                echo -e "${RED}❌ Shortcut '$shortcut' not found.${NC}"
                echo "Available shortcuts: $(load_shortcuts | jq -r 'keys[]' | tr '\n' ' ')"
                return 1
            fi
            
            set_shortcut "$shortcut" "$new_context"
            echo -e "${GREEN}✅ Shortcut '$shortcut' has been updated successfully!${NC}"
            echo "Previous context: $existing"
            echo "New context: $new_context"
            ;;
            
        "delete"|"rm")
            if [ $# -lt 2 ]; then
                echo -e "${RED}Usage: reccall delete <shortcut>${NC}"
                return 1
            fi
            
            local shortcut="$2"
            local existing
            existing=$(get_shortcut "$shortcut")
            
            if [ -z "$existing" ]; then
                echo -e "${YELLOW}⚠️  Shortcut '$shortcut' not found. Nothing to delete.${NC}"
                return 0
            fi
            
            delete_shortcut "$shortcut"
            echo -e "${GREEN}✅ Shortcut '$shortcut' has been deleted successfully!${NC}"
            ;;
            
        "reload-starter-pack")
            load_starter_pack
            ;;
            
        "info")
            local shortcuts
            shortcuts=$(load_shortcuts)
            local count
            count=$(echo "$shortcuts" | jq 'length')
            
            echo -e "${BLUE}📊 RecCall Information${NC}"
            echo "===================="
            echo "Version: 1.0.0"
            echo "Storage file: $RECCALL_STORAGE"
            echo "Total shortcuts: $count"
            echo
            
            if [ "$count" -gt 0 ]; then
                echo "📁 Categories:"
                echo "$shortcuts" | jq -r 'keys[]' | cut -d'-' -f1 | sort | uniq -c | while read -r count category; do
                    echo "  • $category: $count shortcuts"
                done
            fi
            ;;
            
        "help"|"--help"|"-h"|"")
            echo -e "${BLUE}RecCall - Record and call context shortcuts${NC}"
            echo "=============================================="
            echo
            echo "Usage: reccall <command> [arguments]"
            echo
            echo "Commands:"
            echo "  rec <shortcut> <context>     Record a new shortcut"
            echo "  call <shortcut>              Call (retrieve) a shortcut"
            echo "  list                         List all shortcuts"
            echo "  search <query>               Search shortcuts by name or content"
            echo "  update <shortcut> <context>  Update an existing shortcut"
            echo "  delete <shortcut>            Delete a shortcut"
            echo "  reload-starter-pack          Reload starter pack recipes"
            echo "  info                         Show RecCall information"
            echo "  help                         Show this help message"
            echo
            echo "Examples:"
            echo "  reccall rec react-component 'Create React components with TypeScript'"
            echo "  reccall call react-component"
            echo "  reccall search api"
            echo "  reccall list"
            ;;
            
        *)
            echo -e "${RED}Unknown command: $1${NC}"
            echo "Use 'reccall help' for available commands."
            return 1
            ;;
    esac
}

# Export the function for use in Warp
export -f reccall

# If script is run directly, execute the command
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    reccall "$@"
fi
