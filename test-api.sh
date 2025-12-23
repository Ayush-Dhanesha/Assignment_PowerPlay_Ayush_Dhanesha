#!/bin/bash

# TicketBoss API Test Script
# This script demonstrates all API endpoints

BASE_URL="http://localhost:3000"

echo "🎫 TicketBoss API Test Script"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}1. Testing Health Check${NC}"
echo "GET $BASE_URL/health"
curl -s "$BASE_URL/health" | json_pp || curl -s "$BASE_URL/health"
echo ""
echo ""

# Test 2: Get Initial Event Summary
echo -e "${BLUE}2. Getting Initial Event Summary${NC}"
echo "GET $BASE_URL/reservations"
curl -s "$BASE_URL/reservations" | json_pp || curl -s "$BASE_URL/reservations"
echo ""
echo ""

# Test 3: Make a Valid Reservation
echo -e "${BLUE}3. Making a Valid Reservation (5 seats)${NC}"
echo "POST $BASE_URL/reservations"
RESERVATION_RESPONSE=$(curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-1", "seats": 5}')
echo "$RESERVATION_RESPONSE" | json_pp 2>/dev/null || echo "$RESERVATION_RESPONSE"
RESERVATION_ID=$(echo "$RESERVATION_RESPONSE" | grep -o '"reservationId":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Reservation ID: $RESERVATION_ID${NC}"
echo ""
echo ""

# Test 4: Check Updated Summary
echo -e "${BLUE}4. Checking Updated Event Summary${NC}"
echo "GET $BASE_URL/reservations"
curl -s "$BASE_URL/reservations" | json_pp || curl -s "$BASE_URL/reservations"
echo ""
echo ""

# Test 5: Make Another Reservation
echo -e "${BLUE}5. Making Another Reservation (3 seats)${NC}"
echo "POST $BASE_URL/reservations"
RESERVATION_RESPONSE_2=$(curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-2", "seats": 3}')
echo "$RESERVATION_RESPONSE_2" | json_pp 2>/dev/null || echo "$RESERVATION_RESPONSE_2"
RESERVATION_ID_2=$(echo "$RESERVATION_RESPONSE_2" | grep -o '"reservationId":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✓ Reservation ID: $RESERVATION_ID_2${NC}"
echo ""
echo ""

# Test 6: Try Invalid Reservation (too many seats)
echo -e "${BLUE}6. Testing Invalid Reservation (11 seats - should fail)${NC}"
echo "POST $BASE_URL/reservations"
curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-3", "seats": 11}' | json_pp 2>/dev/null || \
  curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-3", "seats": 11}'
echo -e "${RED}✓ Should show error: 'seats must not exceed 10 per request'${NC}"
echo ""
echo ""

# Test 7: Try Invalid Reservation (0 seats)
echo -e "${BLUE}7. Testing Invalid Reservation (0 seats - should fail)${NC}"
echo "POST $BASE_URL/reservations"
curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-4", "seats": 0}' | json_pp 2>/dev/null || \
  curl -s -X POST "$BASE_URL/reservations" \
  -H "Content-Type: application/json" \
  -d '{"partnerId": "test-partner-4", "seats": 0}'
echo -e "${RED}✓ Should show error: 'seats must be greater than 0'${NC}"
echo ""
echo ""

# Test 8: Cancel First Reservation
if [ -n "$RESERVATION_ID" ]; then
  echo -e "${BLUE}8. Canceling First Reservation${NC}"
  echo "DELETE $BASE_URL/reservations/$RESERVATION_ID"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE_URL/reservations/$RESERVATION_ID")
  if [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✓ Cancellation successful (HTTP 204)${NC}"
  else
    echo -e "${RED}✗ Unexpected response code: $HTTP_CODE${NC}"
  fi
  echo ""
  echo ""
fi

# Test 9: Check Final Summary
echo -e "${BLUE}9. Checking Final Event Summary${NC}"
echo "GET $BASE_URL/reservations"
curl -s "$BASE_URL/reservations" | json_pp || curl -s "$BASE_URL/reservations"
echo ""
echo ""

# Test 10: Try to Cancel Already Cancelled Reservation
if [ -n "$RESERVATION_ID" ]; then
  echo -e "${BLUE}10. Trying to Cancel Already Cancelled Reservation (should fail)${NC}"
  echo "DELETE $BASE_URL/reservations/$RESERVATION_ID"
  HTTP_CODE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/reservations/$RESERVATION_ID")
  echo "$HTTP_CODE" | head -1 | json_pp 2>/dev/null || echo "$HTTP_CODE" | head -1
  echo -e "${RED}✓ Should show 404 Not Found${NC}"
  echo ""
  echo ""
fi

echo -e "${GREEN}=============================="
echo "✅ API Test Script Completed"
echo "==============================${NC}"

