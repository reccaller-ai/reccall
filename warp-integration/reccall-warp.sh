#!/bin/bash

# RecCall Warp Integration Script
# Refactored to use CLI commands which leverage the core engine
# Provides RecCall functionality within Warp terminal

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Find reccall CLI command
# Try multiple locations:
# 1. Global npm installation (reccall command)
# 2. Local installation in parent directory
# 3. Direct node execution of CLI
find_reccall_cli() {
    # Try global reccall command first
    if command -v reccall &> /dev/null; then
        echo "reccall"
        return 0
    fi

    # Try local node execution
    local script_dir
    script_dir="$(dirname "$0")"
    local parent_dir
    parent_dir="$(cd "$script_dir/.." && pwd)"
    local cli_path="$parent_dir/dist/src/cli.js"

    if [ -f "$cli_path" ]; then
        echo "node $cli_path"
        return 0
    fi

    # Fallback to JSON manipulation if CLI not available
    echo ""
    return 1
}

RECCALL_CMD=$(find_reccall_cli)
RECCALL_STORAGE="$HOME/.reccall.json"

# Fallback functions (used if CLI not available)
load_shortcuts_fallback() {
    if [ -f "$RECCALL_STORAGE" ]; then
        cat "$RECCALL_STORAGE"
    else
        echo "{}"
    fi
}

save_shortcuts_fallback() {
    echo "$1" > "$RECCALL_STORAGE"
}

get_shortcut_fallback() {
    local key="$1"
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required for fallback mode. Please install: brew install jq${NC}" >&2
        return 1
    fi
    load_shortcuts_fallback | jq -r --arg key "$key" '.[$key] // empty'
}

set_shortcut_fallback() {
    local key="$1"
    local value="$2"
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required for fallback mode. Please install: brew install jq${NC}" >&2
        return 1
    fi
    local shortcuts
    shortcuts=$(load_shortcuts_fallback)
    local updated
    updated=$(echo "$shortcuts" | jq --arg key "$key" --arg value "$value" '. + {($key): $value}')
    save_shortcuts_fallback "$updated"
}

delete_shortcut_fallback() {
    local key="$1"
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required for fallback mode. Please install: brew install jq${NC}" >&2
        return 1
    fi
    local shortcuts
    shortcuts=$(load_shortcuts_fallback)
    local updated
    updated=$(echo "$shortcuts" | jq --arg key "$key" 'del(.[$key])')
    save_shortcuts_fallback "$updated"
}

# List all shortcuts
list_shortcuts() {
    if [ -n "$RECCALL_CMD" ]; then
        # Use CLI command
        local output
        output=$($RECCALL_CMD list 2>&1)
        if [ $? -eq 0 ]; then
            echo "$output"
            return 0
        fi
    fi
    
    # Fallback to JSON manipulation
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required. Please install: brew install jq${NC}" >&2
        return 1
    fi
    
    local shortcuts
    shortcuts=$(load_shortcuts_fallback)
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
    
    if [ -n "$RECCALL_CMD" ]; then
        # Use CLI command
        local output
        output=$($RECCALL_CMD search "$query" 2>&1)
        if [ $? -eq 0 ]; then
            echo "$output"
            return 0
        fi
    fi
    
    # Fallback to JSON manipulation
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required. Please install: brew install jq${NC}" >&2
        return 1
    fi
    
    local shortcuts
    shortcuts=$(load_shortcuts_fallback)
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
    if [ -n "$RECCALL_CMD" ]; then
        # Use CLI command
        local output
        output=$($RECCALL_CMD reload-starter-pack 2>&1)
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Starter pack reloaded successfully!${NC}"
            echo "$output"
            return 0
        fi
    fi
    
    # Fallback to JSON manipulation
    local script_dir
    script_dir="$(dirname "$0")"
    local starter_pack_dir="$script_dir/../starter-pack"
    
    if [ ! -d "$starter_pack_dir" ]; then
        echo -e "${RED}❌ Starter pack directory not found: $starter_pack_dir${NC}"
        return 1
    fi
    
    local manifest_file="$starter_pack_dir/manifest.json"
    if [ ! -f "$manifest_file" ]; then
        echo -e "${RED}❌ Starter pack manifest not found: $manifest_file${NC}"
        return 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${RED}❌ jq is required for fallback mode. Please install: brew install jq${NC}" >&2
        return 1
    fi
    
    local shortcuts="{}"
    
    while IFS= read -r recipe_file; do
        local recipe_path="$starter_pack_dir/$recipe_file"
        if [ -f "$recipe_path" ]; then
            local shortcut_name
            shortcut_name=$(jq -r '.shortcut' "$recipe_path")
            local context
            context=$(jq -r '.context' "$recipe_path")
            shortcuts=$(echo "$shortcuts" | jq --arg key "$shortcut_name" --arg value "$context" '. + {($key): $value}')
        fi
    done < <(jq -r '.recipes[].file' "$manifest_file")
    
    save_shortcuts_fallback "$shortcuts"
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
            
            if [ -n "$RECCALL_CMD" ]; then
                # Use CLI command
                local output
                output=$($RECCALL_CMD rec "$shortcut" "$context" 2>&1)
                local exit_code=$?
                if [ $exit_code -eq 0 ]; then
                    echo -e "${GREEN}✅ Shortcut '$shortcut' has been recorded successfully!${NC}"
                    return 0
                else
                    # Handle duplicate error
                    if echo "$output" | grep -q "already exists\|DUPLICATE"; then
                        echo -e "${YELLOW}⚠️  Warning: Shortcut '$shortcut' already exists!${NC}"
                        echo "To update it, use: reccall update $shortcut <new_context>"
                        return 1
                    else
                        echo -e "${RED}❌ Error: $output${NC}"
                        return 1
                    fi
                fi
            fi
            
            # Fallback to JSON manipulation
            local existing
            existing=$(get_shortcut_fallback "$shortcut")
            if [ -n "$existing" ]; then
                echo -e "${YELLOW}⚠️  Warning: Shortcut '$shortcut' already exists!${NC}"
                echo "Current context: $existing"
                echo "To update it, use: reccall update $shortcut <new_context>"
                return 1
            fi
            
            set_shortcut_fallback "$shortcut" "$context"
            echo -e "${GREEN}✅ Shortcut '$shortcut' has been recorded successfully!${NC}"
            echo "Stored context: $context"
            ;;
            
        "call")
            if [ $# -lt 2 ]; then
                echo -e "${RED}Usage: reccall call <shortcut>${NC}"
                return 1
            fi
            
            local shortcut="$2"
            
            if [ -n "$RECCALL_CMD" ]; then
                # Use CLI command
                local output
                output=$($RECCALL_CMD call "$shortcut" 2>&1)
                if [ $? -eq 0 ]; then
                    echo -e "${BLUE}📋 Context for '$shortcut':${NC}"
                    echo
                    echo "$output"
                    return 0
                else
                    echo -e "${RED}❌ Shortcut '$shortcut' not found.${NC}"
                    return 1
                fi
            fi
            
            # Fallback to JSON manipulation
            local context
            context=$(get_shortcut_fallback "$shortcut")
            
            if [ -z "$context" ]; then
                echo -e "${RED}❌ Shortcut '$shortcut' not found.${NC}"
                if command -v jq &> /dev/null; then
                    echo "Available shortcuts: $(load_shortcuts_fallback | jq -r 'keys[]' | tr '\n' ' ')"
                fi
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
            
            if [ -n "$RECCALL_CMD" ]; then
                # Use CLI command
                local output
                output=$($RECCALL_CMD update "$shortcut" "$new_context" 2>&1)
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Shortcut '$shortcut' has been updated successfully!${NC}"
                    return 0
                else
                    echo -e "${RED}❌ Error: $output${NC}"
                    return 1
                fi
            fi
            
            # Fallback to JSON manipulation
            local existing
            existing=$(get_shortcut_fallback "$shortcut")
            
            if [ -z "$existing" ]; then
                echo -e "${RED}❌ Shortcut '$shortcut' not found.${NC}"
                if command -v jq &> /dev/null; then
                    echo "Available shortcuts: $(load_shortcuts_fallback | jq -r 'keys[]' | tr '\n' ' ')"
                fi
                return 1
            fi
            
            set_shortcut_fallback "$shortcut" "$new_context"
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
            
            if [ -n "$RECCALL_CMD" ]; then
                # Use CLI command
                local output
                output=$($RECCALL_CMD delete "$shortcut" 2>&1)
                if [ $? -eq 0 ]; then
                    echo -e "${GREEN}✅ Shortcut '$shortcut' has been deleted successfully!${NC}"
                    return 0
                else
                    # Handle not found (idempotent operation)
                    if echo "$output" | grep -q "not found\|NOT_FOUND"; then
                        echo -e "${YELLOW}⚠️  Shortcut '$shortcut' not found. Nothing to delete.${NC}"
                        return 0
                    else
                        echo -e "${RED}❌ Error: $output${NC}"
                        return 1
                    fi
                fi
            fi
            
            # Fallback to JSON manipulation
            local existing
            existing=$(get_shortcut_fallback "$shortcut")
            
            if [ -z "$existing" ]; then
                echo -e "${YELLOW}⚠️  Shortcut '$shortcut' not found. Nothing to delete.${NC}"
                return 0
            fi
            
            delete_shortcut_fallback "$shortcut"
            echo -e "${GREEN}✅ Shortcut '$shortcut' has been deleted successfully!${NC}"
            ;;
            
        "reload-starter-pack")
            load_starter_pack
            ;;
            
        "info")
            if [ -n "$RECCALL_CMD" ]; then
                # Use CLI command if available
                $RECCALL_CMD stats 2>/dev/null || {
                    # Fallback to basic info
                    echo -e "${BLUE}📊 RecCall Information${NC}"
                    echo "===================="
                    echo "Version: 1.0.0"
                    echo "Storage file: $RECCALL_STORAGE"
                    echo "CLI: Available"
                }
                return 0
            fi
            
            # Fallback to JSON manipulation
            if ! command -v jq &> /dev/null; then
                echo -e "${YELLOW}⚠️  jq is required for info command in fallback mode.${NC}"
                return 1
            fi
            
            local shortcuts
            shortcuts=$(load_shortcuts_fallback)
            local count
            count=$(echo "$shortcuts" | jq 'length')
            
            echo -e "${BLUE}📊 RecCall Information${NC}"
            echo "===================="
            echo "Version: 1.0.0"
            echo "Storage file: $RECCALL_STORAGE"
            echo "Total shortcuts: $count"
            echo "Mode: Fallback (CLI not available)"
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
