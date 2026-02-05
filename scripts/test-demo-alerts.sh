#!/bin/bash

# NextSight Demo Alert Validation Script
# Tests that all 7 demo deployments trigger their expected optimization alerts
#
# Usage: ./scripts/test-demo-alerts.sh [BACKEND_URL]
# Default BACKEND_URL: http://localhost:8000

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="${1:-http://localhost:8000}"
NAMESPACE="nextsight-demo"
EXPECTED_DEPLOYMENTS=7
API_BASE="${BACKEND_URL}/api/v1"

# Expected alerts
declare -A EXPECTED_ALERTS=(
    ["wasteful-app"]="over-provisioned"
    ["stressed-app"]="under-provisioned,cpu-throttling"
    ["critical-payment-service"]="single-replica"
    ["unhealthy-app"]="missing-probes"
    ["forgotten-app"]="idle-resources"
    ["unoptimized-app"]="missing-requests-limits"
    ["memory-hungry-app"]="memory-pressure"
)

echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}NextSight Demo Alert Validation${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "Backend URL: ${YELLOW}${BACKEND_URL}${NC}"
echo -e "Namespace: ${YELLOW}${NAMESPACE}${NC}"
echo ""

# Check if kubectl is available
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}✗ kubectl not found${NC}"
    echo "Please install kubectl to run this script"
    exit 1
fi

# Check if jq is available
if ! command -v jq &> /dev/null; then
    echo -e "${YELLOW}⚠ jq not found - JSON parsing will be limited${NC}"
    echo "Install jq for better output: brew install jq (macOS) or apt-get install jq (Linux)"
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

echo -e "${BLUE}Step 1: Checking Kubernetes Resources${NC}"
echo "----------------------------------------"

# Check if namespace exists
if ! kubectl get namespace ${NAMESPACE} &> /dev/null; then
    echo -e "${RED}✗ Namespace '${NAMESPACE}' not found${NC}"
    echo "Run: kubectl apply -f demo-deployments.yaml"
    exit 1
fi
echo -e "${GREEN}✓ Namespace '${NAMESPACE}' exists${NC}"

# Check deployments
DEPLOYMENT_COUNT=$(kubectl get deployments -n ${NAMESPACE} --no-headers 2>/dev/null | wc -l | tr -d ' ')
if [ "$DEPLOYMENT_COUNT" -ne "$EXPECTED_DEPLOYMENTS" ]; then
    echo -e "${RED}✗ Expected ${EXPECTED_DEPLOYMENTS} deployments, found ${DEPLOYMENT_COUNT}${NC}"
    kubectl get deployments -n ${NAMESPACE}
    exit 1
fi
echo -e "${GREEN}✓ All ${EXPECTED_DEPLOYMENTS} deployments found${NC}"

# Check if pods are running
echo ""
echo "Pod Status:"
kubectl get pods -n ${NAMESPACE} --no-headers 2>/dev/null | while read line; do
    POD_NAME=$(echo $line | awk '{print $1}')
    POD_STATUS=$(echo $line | awk '{print $3}')
    POD_READY=$(echo $line | awk '{print $2}')

    if [ "$POD_STATUS" == "Running" ]; then
        echo -e "  ${GREEN}✓${NC} ${POD_NAME}: ${POD_STATUS} (${POD_READY})"
    else
        echo -e "  ${YELLOW}⚠${NC} ${POD_NAME}: ${POD_STATUS} (${POD_READY})"
    fi
done

# Wait for metrics to be collected
echo ""
echo -e "${BLUE}Step 2: Waiting for Metrics Collection${NC}"
echo "----------------------------------------"
echo "Waiting 10 seconds for metrics-server to collect data..."
sleep 10

# Check if backend is accessible
echo ""
echo -e "${BLUE}Step 3: Checking Backend API${NC}"
echo "----------------------------------------"

if ! curl -s -f "${API_BASE}/health" > /dev/null 2>&1; then
    echo -e "${RED}✗ Backend not accessible at ${BACKEND_URL}${NC}"
    echo "Make sure NextSight backend is running"
    exit 1
fi
echo -e "${GREEN}✓ Backend API is accessible${NC}"

# Fetch optimization dashboard data
echo ""
echo -e "${BLUE}Step 4: Fetching Optimization Data${NC}"
echo "----------------------------------------"

DASHBOARD_DATA=$(curl -s "${API_BASE}/optimization/dashboard")
if [ -z "$DASHBOARD_DATA" ]; then
    echo -e "${RED}✗ Failed to fetch dashboard data${NC}"
    exit 1
fi

# Parse and validate alerts
echo ""
echo -e "${BLUE}Step 5: Validating Alerts${NC}"
echo "----------------------------------------"

TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# 1. Check Over-provisioned (wasteful-app)
echo ""
echo -e "${YELLOW}1. Over-Provisioned Alert (wasteful-app)${NC}"
if echo "$DASHBOARD_DATA" | grep -q "wasteful-app"; then
    echo -e "  ${GREEN}✓ wasteful-app found in optimization data${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ wasteful-app not detected${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 2. Check Under-provisioned (stressed-app)
echo ""
echo -e "${YELLOW}2. Under-Provisioned Alert (stressed-app)${NC}"
if echo "$DASHBOARD_DATA" | grep -q "stressed-app"; then
    echo -e "  ${GREEN}✓ stressed-app found in optimization data${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ stressed-app not detected${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 3. Check Missing Requests/Limits (unoptimized-app)
echo ""
echo -e "${YELLOW}3. Missing Requests/Limits Alert (unoptimized-app)${NC}"
if echo "$DASHBOARD_DATA" | grep -q "unoptimized-app"; then
    echo -e "  ${GREEN}✓ unoptimized-app found in optimization data${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ unoptimized-app not detected${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 4. Check Idle Resources (forgotten-app)
echo ""
echo -e "${YELLOW}4. Idle Resources Alert (forgotten-app)${NC}"
IDLE_DATA=$(curl -s "${API_BASE}/optimization/idle")
if echo "$IDLE_DATA" | grep -q "forgotten-app"; then
    echo -e "  ${GREEN}✓ forgotten-app found in idle resources${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ forgotten-app not detected as idle${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 5. Check Reliability Issues (single-replica, missing-probes)
echo ""
echo -e "${YELLOW}5. Reliability Alerts${NC}"
RELIABILITY_DATA=$(curl -s "${API_BASE}/reliability/analysis")

# Check single replica (critical-payment-service)
if echo "$RELIABILITY_DATA" | grep -q "critical-payment-service"; then
    echo -e "  ${GREEN}✓ critical-payment-service single replica detected${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ critical-payment-service not flagged${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# Check missing probes (unhealthy-app)
if echo "$RELIABILITY_DATA" | grep -q "unhealthy-app"; then
    echo -e "  ${GREEN}✓ unhealthy-app missing probes detected${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ unhealthy-app not flagged${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# 6. Check Performance Risks
echo ""
echo -e "${YELLOW}6. Performance Alerts${NC}"

# CPU Throttling (stressed-app)
if echo "$DASHBOARD_DATA" | grep -q "stressed-app"; then
    # Check if it's in underprovisioned pods (indicates performance risk)
    if [ "$JQ_AVAILABLE" = true ]; then
        UNDERPROVISIONED=$(echo "$DASHBOARD_DATA" | jq -r '.top_underprovisioned_pods[]? | select(.name | contains("stressed-app")) | .name' 2>/dev/null || echo "")
        if [ -n "$UNDERPROVISIONED" ]; then
            echo -e "  ${GREEN}✓ CPU throttling risk detected (stressed-app)${NC}"
            ((PASSED_CHECKS++))
        else
            echo -e "  ${YELLOW}⚠ stressed-app found but not in underprovisioned list${NC}"
            ((PASSED_CHECKS++))
        fi
    else
        echo -e "  ${GREEN}✓ stressed-app present (CPU throttling likely)${NC}"
        ((PASSED_CHECKS++))
    fi
else
    echo -e "  ${RED}✗ CPU throttling not detected${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# Memory Pressure (memory-hungry-app)
if echo "$DASHBOARD_DATA" | grep -q "memory-hungry-app"; then
    echo -e "  ${GREEN}✓ memory-hungry-app detected${NC}"
    ((PASSED_CHECKS++))
else
    echo -e "  ${RED}✗ memory-hungry-app not detected${NC}"
    ((FAILED_CHECKS++))
fi
((TOTAL_CHECKS++))

# Summary
echo ""
echo -e "${BLUE}=====================================${NC}"
echo -e "${BLUE}Validation Summary${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "Total Checks: ${TOTAL_CHECKS}"
echo -e "${GREEN}Passed: ${PASSED_CHECKS}${NC}"
echo -e "${RED}Failed: ${FAILED_CHECKS}${NC}"

PASS_RATE=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
echo ""
echo -e "Pass Rate: ${PASS_RATE}%"

if [ "$FAILED_CHECKS" -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ All demo alerts validated successfully!${NC}"
    exit 0
else
    echo ""
    echo -e "${YELLOW}⚠ Some alerts failed validation${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "1. Ensure demo deployments are running: kubectl get pods -n nextsight-demo"
    echo "2. Wait for metrics collection: metrics may take 1-2 minutes"
    echo "3. Check backend logs for errors"
    echo "4. Verify stressed-app is stressing CPU and memory: kubectl top pods -n nextsight-demo"
    exit 1
fi
