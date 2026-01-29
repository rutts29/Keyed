#!/bin/bash
# SolShare Deployment Checklist Script
# This script helps verify deployment readiness

# Don't exit on error - we want to check all items

echo "╔════════════════════════════════════════════════════════╗"
echo "║        SolShare Deployment Checklist                   ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1"
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check prerequisites
echo "📋 Checking Prerequisites..."
echo "─────────────────────────────────────────────────────────"

# Node.js
node --version > /dev/null 2>&1
check "Node.js installed: $(node --version 2>/dev/null || echo 'NOT FOUND')"

# Python
python3 --version > /dev/null 2>&1
check "Python installed: $(python3 --version 2>/dev/null || echo 'NOT FOUND')"

# Rust
rustc --version > /dev/null 2>&1
check "Rust installed: $(rustc --version 2>/dev/null || echo 'NOT FOUND')"

# Anchor
if anchor --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Anchor CLI installed: $(anchor --version)"
else
    echo -e "${YELLOW}⚠${NC} Anchor CLI: NOT FOUND (needed for Solana deployment)"
fi

# Solana
if solana --version > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Solana CLI installed: $(solana --version)"
else
    echo -e "${YELLOW}⚠${NC} Solana CLI: NOT FOUND (needed for Solana deployment)"
fi

echo ""
echo "📁 Checking Project Files..."
echo "─────────────────────────────────────────────────────────"

# Backend files
[ -f "backend/package.json" ]
check "backend/package.json exists"

[ -f "backend/Procfile" ]
check "backend/Procfile exists"

[ -f "backend/.env.example" ]
check "backend/.env.example exists"

[ -f "backend/railway.json" ]
check "backend/railway.json exists"

# Migrations
for file in backend/migrations/001_*.sql backend/migrations/002_*.sql backend/migrations/003_*.sql backend/migrations/004_*.sql backend/migrations/005_*.sql; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $(basename $file) exists"
    else
        echo -e "${RED}✗${NC} Migration $(echo $file | grep -o '00[0-9]') missing"
    fi
done

# AI Service files
[ -f "ai-service/requirements.txt" ]
check "ai-service/requirements.txt exists"

[ -f "ai-service/Dockerfile" ]
check "ai-service/Dockerfile exists"

[ -f "ai-service/.env.example" ]
check "ai-service/.env.example exists"

[ -f "ai-service/scripts/setup_qdrant.py" ]
check "ai-service/scripts/setup_qdrant.py exists"

# Solana files
[ -f "solshare/Anchor.toml" ]
check "solshare/Anchor.toml exists"

[ -d "solshare/programs/solshare-social" ]
check "solshare-social program exists"

[ -d "solshare/programs/solshare-payment" ]
check "solshare-payment program exists"

[ -d "solshare/programs/solshare-token-gate" ]
check "solshare-token-gate program exists"

# IDL files
[ -f "backend/idl/solshare_social.json" ]
check "backend/idl/solshare_social.json exists"

[ -f "backend/idl/solshare_payment.json" ]
check "backend/idl/solshare_payment.json exists"

[ -f "backend/idl/solshare_token_gate.json" ]
check "backend/idl/solshare_token_gate.json exists"

echo ""
echo "🔧 Environment Variables Needed..."
echo "─────────────────────────────────────────────────────────"

echo "Backend (.env):"
echo "  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY"
echo "  - UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN"
echo "  - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME"
echo "  - PINATA_API_KEY, PINATA_SECRET_KEY"
echo "  - JWT_SECRET"
echo "  - SOCIAL_PROGRAM_ID, PAYMENT_PROGRAM_ID, TOKEN_GATE_PROGRAM_ID"
echo "  - AI_SERVICE_URL"
echo ""
echo "AI Service (.env):"
echo "  - GEMINI_API_KEY"
echo "  - VOYAGE_API_KEY"
echo "  - QDRANT_URL, QDRANT_API_KEY"
echo "  - BACKEND_URL"
echo "  - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"

echo ""
echo "📝 Deployment Steps..."
echo "─────────────────────────────────────────────────────────"

echo "1. Create accounts on external services (Supabase, Upstash, Qdrant, etc.)"
echo "2. Run database migrations in Supabase SQL Editor"
echo "3. Setup Qdrant collection: cd ai-service && python scripts/setup_qdrant.py"
echo "4. Deploy Solana programs: cd solshare && anchor deploy --provider.cluster devnet"
echo "5. Deploy backend to Railway"
echo "6. Deploy AI service to Railway"
echo "7. Run integration tests: cd scripts/integration-tests && npm test"

echo ""
echo "─────────────────────────────────────────────────────────"
echo "Checklist complete!"
